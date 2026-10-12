import { asNumber, asString } from '../../shared/utils/admin-data-utils.js';
import { istDaysAgo, istYmd } from '../../shared/utils/ist-date.js';
import type { Tone } from '../../shared/components/ui-tones.js';

// Admin → Instructors Directory in Naji's design (InstructorsModule): rows from
// /admin/instructor/index, then status pills, filters, sort and CSV export.
// Pure — the page only wires these to React state.

export type InstructorStatus = 'Active' | 'Inactive' | 'Disabled';
export type InstructorTab = 'all' | InstructorStatus;
export type CohortFilter = '' | '0' | '1' | '2+';
export type JoinedRange = '7' | '30' | '90' | 'all';
export type InstructorSortKey = 'name' | 'phone' | 'email' | 'qualification' | 'cohorts' | 'joined' | 'status';

export interface InstructorRow {
  id: string;
  name: string;
  phone: string;
  email: string;
  qualification: string;
  cohorts: number;
  /** IST calendar day the account was created (YYYY-MM-DD), '' when unknown. */
  joined: string;
  photo: string;
  status: InstructorStatus;
  /** users.disabled_at is set — sign-in blocked (drives Enable / Disable). */
  isDisabled: boolean;
  /** The list row as the API returned it (the edit form reads it). */
  raw: Record<string, unknown>;
}

export interface InstructorFilters {
  tab: InstructorTab;
  search: string;
  qualification: string;
  cohorts: CohortFilter;
  range: JoinedRange;
}

export const EMPTY_INSTRUCTOR_FILTERS: InstructorFilters = { tab: 'all', search: '', qualification: '', cohorts: '', range: 'all' };

export const INSTRUCTOR_STATUS_TONE: Record<InstructorStatus, Tone> = { Active: 'emerald', Inactive: 'slate', Disabled: 'rose' };

/**
 * Disabled (users.disabled_at, sign-in blocked) wins over users.status, which
 * is the Active / Inactive flag the edit form sets.
 */
export function instructorStatus(raw: Record<string, unknown>): InstructorStatus {
  if (raw.disabled_at) return 'Disabled';
  return asNumber(raw.status) === 1 ? 'Active' : 'Inactive';
}

export function toInstructorRows(records: Record<string, unknown>[]): InstructorRow[] {
  return records.map((r) => {
    const status = instructorStatus(r);
    return {
      id: asString(r._id) || asString(r.id),
      name: asString(r.name).trim(),
      phone: asString(r.phone).trim(),
      email: asString(r.user_email).trim(),
      qualification: asString(r.highest_qualification).trim(),
      cohorts: asNumber(r.cohort_count),
      joined: istYmd(asString(r.created_at)),
      photo: asString(r.image) || asString(r.profile_picture),
      status,
      isDisabled: status === 'Disabled',
      raw: r,
    };
  });
}

export function qualificationOptions(rows: InstructorRow[]): string[] {
  return [...new Set(rows.map((r) => r.qualification).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function matchesCohorts(n: number, f: CohortFilter): boolean {
  if (f === '0') return n === 0;
  if (f === '1') return n === 1;
  if (f === '2+') return n >= 2;
  return true;
}

/** Every filter except the status tab (the tab counts are taken over this). */
function matchesNonTab(r: InstructorRow, f: InstructorFilters, cutoff: string): boolean {
  if (f.qualification && r.qualification !== f.qualification) return false;
  if (!matchesCohorts(r.cohorts, f.cohorts)) return false;
  if (cutoff && (!r.joined || r.joined < cutoff)) return false;
  const q = f.search.trim().toLowerCase();
  if (!q) return true;
  return r.name.toLowerCase().includes(q)
    || r.email.toLowerCase().includes(q)
    || r.phone.toLowerCase().includes(q)
    || r.qualification.toLowerCase().includes(q);
}

export function filterInstructors(rows: InstructorRow[], f: InstructorFilters, now: Date = new Date()): InstructorRow[] {
  const cutoff = f.range === 'all' ? '' : istDaysAgo(now, Number(f.range));
  return rows.filter((r) => (f.tab === 'all' || r.status === f.tab) && matchesNonTab(r, f, cutoff));
}

export function instructorTabCounts(rows: InstructorRow[], f: InstructorFilters, now: Date = new Date()): Record<InstructorTab, number> {
  const base = filterInstructors(rows, { ...f, tab: 'all' }, now);
  return {
    all: base.length,
    Active: base.filter((r) => r.status === 'Active').length,
    Inactive: base.filter((r) => r.status === 'Inactive').length,
    Disabled: base.filter((r) => r.status === 'Disabled').length,
  };
}

export function sortInstructors(rows: InstructorRow[], key: InstructorSortKey, dir: 'asc' | 'desc'): InstructorRow[] {
  const sign = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const cmp = key === 'cohorts' ? a.cohorts - b.cohorts : String(a[key]).localeCompare(String(b[key]));
    return cmp * sign;
  });
}

export function instructorCsvRows(rows: InstructorRow[], formatDmy: (ymd: string) => string): Array<Array<string | number>> {
  return [
    ['Name', 'Phone', 'Email', 'Highest Qualification', 'No of Cohorts', 'Joined', 'Status'],
    ...rows.map((r) => [r.name, r.phone, r.email, r.qualification, r.cohorts, formatDmy(r.joined), r.status]),
  ];
}

/** Digits-only WhatsApp link target, '' when there is no usable number. */
export function waNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 8 ? digits : '';
}
