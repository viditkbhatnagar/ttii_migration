import { asNumber, asString } from '../../shared/utils/admin-data-utils.js';
import { statesFor } from '@/lib/location-tree';
import { dayMonthYear, matchesSearch, sortRows, type SortDir } from '../cohorts/list-model.js';
import { centreStatusOf, type CentreStatus } from './centre-list-model.js';

// Centre Directory view model (Naji 2026-10-22, CentreDirectoryModule). Rows
// come from GET /admin/centres/index (listCentres). Pure: filters, the three
// KPI cards, the affiliation-expiry chip, sorting, CSV and the URL state that
// lets the profile's Back link return to the same filtered page.

export type { CentreStatus } from './centre-list-model.js';

export const DIRECTORY_PAGE_SIZE = 8;
/** Directory and Profile: expired (< 0 days) is red; 90 days or fewer is amber. */
export const EXPIRY_WARN_DAYS = 90;

export interface DirectoryRow {
  /** centres.id — what view / edit / delete take. */
  id: string;
  /** centres.centre_id, the "Centre Code" ("TTC0001", "28"). */
  code: string;
  name: string;
  country: string;
  state: string;
  district: string;
  contact: string;
  designation: string;
  phone: string;
  email: string;
  students: number;
  walletBalance: number;
  /** Affiliation expiry, YYYY-MM-DD ('' when not set or unreadable). */
  expiry: string;
  status: CentreStatus;
  linkedUserId: string;
  linkedUserEmail: string;
}

/** A location NAME; legacy rows hold numeric ids that name nothing. */
function nameOf(named: unknown, legacy: unknown): string {
  const n = asString(named).trim();
  if (n) return n;
  const l = asString(legacy).trim();
  return l && !/^\d+$/.test(l) ? l : '';
}

function validYmd(y: number, m: number, d: number): boolean {
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** "2026-12-31", or a legacy "31-12-2026" / "31/12/2026", as YYYY-MM-DD; '' when unreadable. */
export function expiryYmd(value: unknown): string {
  const s = asString(value).trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m && validYmd(Number(m[1]), Number(m[2]), Number(m[3]))) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{2})[-/](\d{2})[-/](\d{4})$/.exec(s);
  if (m && validYmd(Number(m[3]), Number(m[2]), Number(m[1]))) return `${m[3]}-${m[2]}-${m[1]}`;
  return '';
}

export function toDirectoryRow(r: Record<string, unknown>): DirectoryRow {
  return {
    id: asString(r.id),
    code: asString(r.centre_id),
    name: asString(r.centre_name),
    country: nameOf(r.country_name, r.country_id),
    state: nameOf(r.state_name, r.state_id),
    district: nameOf(r.district_name, r.district_id),
    contact: asString(r.contact_person),
    designation: asString(r.contact_person_designation),
    phone: asString(r.phone),
    email: asString(r.email),
    students: asNumber(r.students_count),
    walletBalance: asNumber(r.wallet_balance),
    expiry: expiryYmd(r.date_of_expiry),
    status: centreStatusOf(r.status),
    linkedUserId: asString(r.linked_user_id),
    linkedUserEmail: asString(r.linked_user_email),
  };
}

export function toDirectoryRows(data: unknown): DirectoryRow[] {
  return Array.isArray(data)
    ? data.filter((r): r is Record<string, unknown> => !!r && typeof r === 'object').map(toDirectoryRow).filter((c) => c.id)
    : [];
}

// ─── Affiliation expiry ─────────────────────────────────────────────────────

/** Whole days from `todayYmd` to `ymd` (both IST calendar dates); null when there is no date. */
export function daysUntil(ymd: string, todayYmd: string): number | null {
  if (!ymd || !todayYmd) return null;
  const toUtc = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1);
  };
  return Math.round((toUtc(ymd) - toUtc(todayYmd)) / 86_400_000);
}

export type ExpiryTone = 'expired' | 'soon' | 'ok' | 'none';

export interface ExpiryInfo {
  tone: ExpiryTone;
  days: number | null;
  /** "22 Oct 2026", or "—". */
  label: string;
  /** The chip: "Expired", "{n}d" within 90 days, '' otherwise. */
  chip: string;
}

export function expiryInfo(ymd: string, todayYmd: string): ExpiryInfo {
  const days = daysUntil(ymd, todayYmd);
  const label = ymd ? dayMonthYear(ymd) : '—';
  if (days === null) return { tone: 'none', days, label, chip: '' };
  if (days < 0) return { tone: 'expired', days, label, chip: 'Expired' };
  if (days <= EXPIRY_WARN_DAYS) return { tone: 'soon', days, label, chip: `${days}d` };
  return { tone: 'ok', days, label, chip: '' };
}

export function isExpired(row: Pick<DirectoryRow, 'expiry'>, todayYmd: string): boolean {
  return expiryInfo(row.expiry, todayYmd).tone === 'expired';
}

// ─── KPIs, filters, sorting ─────────────────────────────────────────────────

export interface DirectoryKpis {
  active: number;
  inactive: number;
  expired: number;
}

export function directoryKpis(rows: DirectoryRow[], todayYmd: string): DirectoryKpis {
  return {
    active: rows.filter((c) => c.status === 'active').length,
    inactive: rows.filter((c) => c.status === 'inactive').length,
    expired: rows.filter((c) => isExpired(c, todayYmd)).length,
  };
}

export interface DirectoryFilters {
  search: string;
  country: string;
  state: string;
  status: '' | CentreStatus;
  expiredOnly: boolean;
}

export const EMPTY_DIRECTORY_FILTERS: DirectoryFilters = { search: '', country: '', state: '', status: '', expiredOnly: false };

/** How many filters are on (the mobile filter button's badge and the clear "X"). */
export function activeFilterCount(f: DirectoryFilters): number {
  return [f.country, f.state, f.status].filter(Boolean).length + (f.search.trim() ? 1 : 0) + (f.expiredOnly ? 1 : 0);
}

export function filterDirectory(rows: DirectoryRow[], f: DirectoryFilters, todayYmd: string): DirectoryRow[] {
  return rows.filter((c) => {
    if (f.country && c.country !== f.country) return false;
    if (f.state && c.state !== f.state) return false;
    if (f.status && c.status !== f.status) return false;
    if (f.expiredOnly && !isExpired(c, todayYmd)) return false;
    return matchesSearch(f.search, [c.code, c.name, c.contact, c.phone, c.email, c.district, c.state]);
  });
}

export type DirectorySortKey =
  | 'code' | 'name' | 'district' | 'contact' | 'email' | 'students' | 'walletBalance' | 'expiry' | 'status';

export const DIRECTORY_SORT_KEYS: readonly DirectorySortKey[] = [
  'code', 'name', 'district', 'contact', 'email', 'students', 'walletBalance', 'expiry', 'status',
];

/** The prototype's sort values: "district state", phone digits, an empty expiry last. */
export function directorySortValue(c: DirectoryRow, key: DirectorySortKey): string | number {
  switch (key) {
    case 'district': return `${c.district} ${c.state}`.trim().toLowerCase();
    case 'contact': return c.contact.toLowerCase();
    case 'students': return c.students;
    case 'walletBalance': return c.walletBalance;
    case 'expiry': return c.expiry || '9999-12-31';
    case 'status': return c.status === 'active' ? 'Active' : 'Inactive';
    default: return c[key].toLowerCase();
  }
}

export function sortDirectory(rows: DirectoryRow[], key: DirectorySortKey, dir: SortDir): DirectoryRow[] {
  return sortRows(rows, (c) => directorySortValue(c, key), dir);
}

/** Countries present on the centres, A–Z (rows without a country name are left out). */
export function countryOptions(rows: DirectoryRow[]): string[] {
  return [...new Set(rows.map((c) => c.country).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

/** A chosen country lists its known states plus any state its centres carry; otherwise the centres' states. */
export function stateOptions(rows: DirectoryRow[], country: string): string[] {
  const present = rows.filter((c) => !country || c.country === country).map((c) => c.state).filter(Boolean);
  const known = country ? statesFor(country) : [];
  return [...new Set([...known, ...present])].sort((a, b) => a.localeCompare(b));
}

export function directoryCsvRows(rows: DirectoryRow[]): Array<Array<string | number>> {
  return [
    ['Centre Code', 'Centre Name', 'District', 'State', 'Country', 'Contact Name', 'Mobile', 'Email ID', 'Total Enrollment', 'Wallet Balance', 'Affiliation Expiry', 'Status'],
    ...rows.map((c) => [
      c.code, c.name, c.district, c.state, c.country, c.contact, c.phone, c.email, c.students, c.walletBalance,
      c.expiry, c.status === 'active' ? 'Active' : 'Inactive',
    ]),
  ];
}

// ─── URL state (Back from the profile returns to the same list) ─────────────

export interface DirectoryViewState {
  filters: DirectoryFilters;
  sort: { key: DirectorySortKey; dir: SortDir };
  page: number;
}

export const DEFAULT_DIRECTORY_VIEW: DirectoryViewState = {
  filters: EMPTY_DIRECTORY_FILTERS,
  sort: { key: 'name', dir: 'asc' },
  page: 1,
};

/** The query string for a view state ('' for the default view). */
export function viewStateToQuery(state: DirectoryViewState): string {
  const p = new URLSearchParams();
  const f = state.filters;
  if (f.search.trim()) p.set('q', f.search.trim());
  if (f.country) p.set('country', f.country);
  if (f.state) p.set('state', f.state);
  if (f.status) p.set('status', f.status);
  if (f.expiredOnly) p.set('expired', '1');
  if (state.sort.key !== 'name' || state.sort.dir !== 'asc') p.set('sort', `${state.sort.key}.${state.sort.dir}`);
  if (state.page > 1) p.set('page', String(state.page));
  return p.toString();
}

export function viewStateFromQuery(search: string): DirectoryViewState {
  const p = new URLSearchParams(search);
  const status = p.get('status');
  const [key, dir] = (p.get('sort') ?? '').split('.');
  const page = Number.parseInt(p.get('page') ?? '1', 10);
  return {
    filters: {
      search: p.get('q') ?? '',
      country: p.get('country') ?? '',
      state: p.get('state') ?? '',
      status: status === 'active' || status === 'inactive' ? status : '',
      expiredOnly: p.get('expired') === '1',
    },
    sort: {
      key: (DIRECTORY_SORT_KEYS as readonly string[]).includes(key ?? '') ? (key as DirectorySortKey) : 'name',
      dir: dir === 'desc' ? 'desc' : 'asc',
    },
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

/** sessionStorage key holding the directory's last query, for the profile's Back link. */
export const DIRECTORY_QUERY_KEY = 'admin:centres:directory:query';

export function directoryHref(query: string): string {
  return query ? `/admin/centres/index?${query}` : '/admin/centres/index';
}
