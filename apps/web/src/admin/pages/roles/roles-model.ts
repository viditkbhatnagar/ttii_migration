import { asNumber, asString } from '../../shared/utils/admin-data-utils.js';
import type { Tone } from '../../shared/components/ui-kit.js';

// Admin → Roles & Permissions in Naji's design (RolesModule), on OUR role model:
//   - roles are the fixed users.role_id values — there is no role table to
//     create, rename, duplicate or deactivate roles, so none of that is offered;
//   - permissions are granted PER ADMIN USER (user_permission), not per role;
//   - Super Admin holds every permission; other roles are role-based.
// The server does not check those per-user grants on any route yet
// (requirePermission has no callers), so the page must say so — a grant is a
// record of intent, not an access control.

/** Shown wherever per-admin grants are displayed or edited. */
export const GRANTS_NOT_ENFORCED =
  'Recorded only: the server does not check these permissions yet, so every Admin currently has full admin-portal access. Saving still records your choice.';

export type AccessModel = 'all' | 'grants' | 'role';

export interface RoleDef {
  roleId: number;
  name: string;
  description: string;
  portal: string;
  access: AccessModel;
  /** Where the people holding this role are managed. */
  directoryHref: string;
  directoryLabel: string;
}

export const ROLE_DEFS: readonly RoleDef[] = [
  { roleId: 1, name: 'Super Admin', description: 'Runs the admin portal; holds every admin permission.', portal: 'Admin portal (admin.teachersindia.in)', access: 'all', directoryHref: '/admin/sub_admin/index', directoryLabel: 'Admin Users' },
  { roleId: 8, name: 'Admin', description: 'Runs the admin portal; permission grants are recorded per user.', portal: 'Admin portal (admin.teachersindia.in)', access: 'grants', directoryHref: '/admin/sub_admin/index', directoryLabel: 'Admin Users' },
  { roleId: 3, name: 'Instructor', description: 'Teaches cohorts in the faculty portal: live sessions and assignment grading.', portal: 'Faculty portal (admin.teachersindia.in)', access: 'role', directoryHref: '/admin/instructor/index', directoryLabel: 'Instructors Directory' },
  { roleId: 9, name: 'Counsellor', description: 'Works leads and applications in the counsellor portal.', portal: 'Counsellor portal (admissions.teachersindia.in)', access: 'role', directoryHref: '/admin/counsellor/index', directoryLabel: 'Counsellors Directory' },
  { roleId: 7, name: 'Centre', description: 'A partner centre managing its own applications and students.', portal: 'Centre portal (admissions.teachersindia.in)', access: 'role', directoryHref: '/admin/centres/index', directoryLabel: 'Centre Directory' },
  { roleId: 10, name: 'Associate', description: 'A referral partner working through the centre portal.', portal: 'Centre portal (admissions.teachersindia.in)', access: 'role', directoryHref: '/admin/associates/index', directoryLabel: 'Associates Directory' },
  { roleId: 2, name: 'Student', description: 'A learner in the student portal.', portal: 'Student portal (learn.teachersindia.in)', access: 'role', directoryHref: '/admin/students/index', directoryLabel: 'Students' },
];

export const ACCESS_LABEL: Record<AccessModel, string> = {
  all: 'All permissions',
  grants: 'Per-user grants',
  role: 'Role-based',
};

export const ACCESS_TONE: Record<AccessModel, Tone> = { all: 'emerald', grants: 'amber', role: 'blue' };

export interface RoleRow extends RoleDef {
  code: string;
  users: number;
  disabled: number;
}

/** "ROLE-01" style code from the real role id (the id IS the role's identity). */
export const roleCode = (roleId: number) => `ROLE-${String(roleId).padStart(2, '0')}`;

export function toRoleRows(summary: Array<{ roleId: number; total: number; disabled: number }>): RoleRow[] {
  const byId = new Map(summary.map((s) => [s.roleId, s]));
  return ROLE_DEFS.map((d) => ({
    ...d,
    code: roleCode(d.roleId),
    users: byId.get(d.roleId)?.total ?? 0,
    disabled: byId.get(d.roleId)?.disabled ?? 0,
  }));
}

export interface RoleFilters {
  search: string;
  access: '' | AccessModel;
  /** Only roles somebody holds. */
  assignedOnly: boolean;
}

export const EMPTY_ROLE_FILTERS: RoleFilters = { search: '', access: '', assignedOnly: false };

export function filterRoles(rows: RoleRow[], f: RoleFilters): RoleRow[] {
  const q = f.search.trim().toLowerCase();
  return rows.filter((r) => {
    if (f.access && r.access !== f.access) return false;
    if (f.assignedOnly && r.users === 0) return false;
    return !q || r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q);
  });
}

// ── Per-admin permission grants (/admin/roles/permissions-overview) ─────────

export interface GrantRow {
  userId: number;
  name: string;
  email: string;
  roleId: number;
  roleLabel: string;
  /** users.status: null counts as active (the old page's rule). */
  active: boolean;
  granted: number;
  /** Only role 8 holds per-user grants; Super Admin has all, the rest are role-based. */
  managed: boolean;
}

export function toGrantRows(users: Array<Record<string, unknown>>): GrantRow[] {
  return users.map((r) => {
    const status = r.status === null || r.status === undefined ? null : asNumber(r.status);
    return {
      userId: asNumber(r.user_id),
      name: asString(r.name),
      email: asString(r.email),
      roleId: asNumber(r.role_id),
      roleLabel: asString(r.role_label),
      active: status === 1 || status === null,
      granted: asNumber(r.granted_count),
      managed: Boolean(r.permission_managed),
    };
  });
}

export function filterGrantRows(rows: GrantRow[], search: string, roleId: string): GrantRow[] {
  const q = search.trim().toLowerCase();
  return rows.filter((r) => {
    if (roleId && String(r.roleId) !== roleId) return false;
    return !q || r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q);
  });
}

export function roleCsvRows(rows: RoleRow[]): Array<Array<string | number>> {
  return [
    ['Role Code', 'Role Name', 'Description', 'Access', 'Assigned Users', 'Disabled Users', 'Signs in to'],
    ...rows.map((r) => [r.code, r.name, r.description, ACCESS_LABEL[r.access], r.users, r.disabled, r.portal]),
  ];
}
