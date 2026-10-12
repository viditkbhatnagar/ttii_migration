import { asNumber, asString } from '../../shared/utils/admin-data-utils.js';
import { istYmd } from '../../shared/utils/ist-date.js';

// Admin → Admin Users in Naji's design (UserManagementModule). Rows come from
// the two existing lists (/admin/admin/index = Super Admin, /admin/sub_admin/index
// = Admin). Neither returns role_id, so the role is taken from WHICH list a row
// came from (the old page read a missing role_id and labelled everyone "Admin").

export type AccountStatus = 'Active' | 'Inactive' | 'Disabled';
export type AccountTab = 'all' | AccountStatus;
export type AdminRoleFilter = '' | '1' | '8';
export type AdminSortKey = 'name' | 'phone' | 'role' | 'created' | 'lastSignIn' | 'status';

export const ADMIN_ROLE_LABEL: Record<number, string> = { 1: 'Super Admin', 8: 'Admin' };

/** What "Last Sign-in" is (auth audit log), so the column never claims more than that. */
export const LAST_SIGN_IN_HINT =
  'Latest successful password, Google/Microsoft or OTP sign-in. Role switches are not counted; "None on record" means no sign-in was logged.';

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  roleId: 1 | 8;
  roleLabel: string;
  photo: string;
  status: AccountStatus;
  isDisabled: boolean;
  /** IST day the account was created (YYYY-MM-DD), '' when unknown. */
  created: string;
  /** ISO instant of the newest logged sign-in (role switches excluded), '' when none is on record. */
  lastSignIn: string;
  raw: Record<string, unknown>;
}

export interface AdminUserFilters {
  tab: AccountTab;
  search: string;
  role: AdminRoleFilter;
  /** Created between these IST days (YYYY-MM-DD, inclusive); '' = open. */
  from: string;
  to: string;
}

export const EMPTY_ADMIN_FILTERS: AdminUserFilters = { tab: 'all', search: '', role: '', from: '', to: '' };

export function accountStatus(raw: Record<string, unknown>): AccountStatus {
  if (raw.disabled_at) return 'Disabled';
  return asNumber(raw.status) === 1 ? 'Active' : 'Inactive';
}

export function toAdminUserRows(
  supers: Record<string, unknown>[],
  admins: Record<string, unknown>[],
  lastSignIns: Record<string, string>,
): AdminUserRow[] {
  const build = (r: Record<string, unknown>, roleId: 1 | 8): AdminUserRow => {
    const id = asString(r._id) || asString(r.id);
    const status = accountStatus(r);
    return {
      id,
      name: asString(r.name).trim(),
      email: asString(r.user_email).trim(),
      phone: asString(r.phone).trim(),
      roleId,
      roleLabel: ADMIN_ROLE_LABEL[roleId] ?? 'Admin',
      photo: asString(r.image) || asString(r.profile_picture),
      status,
      isDisabled: status === 'Disabled',
      created: istYmd(asString(r.created_at)),
      lastSignIn: lastSignIns[id] ?? '',
      // The edit flow and the old page key on role_id; give it the real one.
      raw: { ...r, role_id: roleId },
    };
  };
  return [...supers.map((r) => build(r, 1)), ...admins.map((r) => build(r, 8))];
}

function matchesNonTab(r: AdminUserRow, f: AdminUserFilters): boolean {
  if (f.role && String(r.roleId) !== f.role) return false;
  if (f.from && (!r.created || r.created < f.from)) return false;
  if (f.to && (!r.created || r.created > f.to)) return false;
  const q = f.search.trim().toLowerCase();
  if (!q) return true;
  return r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || r.phone.toLowerCase().includes(q);
}

export function filterAdminUsers(rows: AdminUserRow[], f: AdminUserFilters): AdminUserRow[] {
  return rows.filter((r) => (f.tab === 'all' || r.status === f.tab) && matchesNonTab(r, f));
}

/** KPI counts over every filter except the status one, so the tiles stay comparable. */
export function adminStatusCounts(rows: AdminUserRow[], f: AdminUserFilters): Record<AccountTab, number> {
  const base = rows.filter((r) => matchesNonTab(r, f));
  return {
    all: base.length,
    Active: base.filter((r) => r.status === 'Active').length,
    Inactive: base.filter((r) => r.status === 'Inactive').length,
    Disabled: base.filter((r) => r.status === 'Disabled').length,
  };
}

export function sortAdminUsers(rows: AdminUserRow[], key: AdminSortKey, dir: 'asc' | 'desc'): AdminUserRow[] {
  const sign = dir === 'asc' ? 1 : -1;
  const value = (r: AdminUserRow): string => (key === 'role' ? r.roleLabel : r[key]);
  return [...rows].sort((a, b) => {
    const va = value(a);
    const vb = value(b);
    // Never-signed-in / unknown dates sort last either way.
    if (!va || !vb) return va === vb ? 0 : va ? -1 : 1;
    return va.localeCompare(vb) * sign;
  });
}

export function adminUserCsvRows(
  rows: AdminUserRow[],
  formatDmy: (ymd: string) => string,
  formatInstant: (iso: string) => string,
): Array<Array<string | number>> {
  return [
    ['Name', 'Email', 'Mobile', 'Role', 'Status', 'Created', 'Last Sign-in'],
    ...rows.map((r) => [r.name, r.email, r.phone, r.roleLabel, r.status, formatDmy(r.created), formatInstant(r.lastSignIn)]),
  ];
}
