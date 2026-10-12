import { asString } from '../../shared/utils/admin-data-utils.js';
import { titleCaseEachWord } from '@/lib/text-format';
import type { Tone } from '../../shared/components/ui-tones.js';

// Admin → Students in Naji's design (TTII 2026-10-12). Pure list logic: rows
// from /admin/students/index merged with the read-only directory extras
// (gender / city / offering / owner / joined), then filter, sort and export.
//
// Status semantics are unchanged from the old page (Naji UAT 2026-05-13): the
// Active / Inactive split is the universal disabled_at login toggle, NOT the
// legacy users.status (which auth flips to 1 on every login).

export type StudentTab = 'all' | 'Active' | 'Inactive';
export type StudentSortKey =
  | 'studentId' | 'name' | 'course' | 'offering' | 'city' | 'gender'
  | 'phone' | 'owner' | 'joined' | 'feeStatus' | 'status';
export type RangeFilter = 'all' | '7' | '30' | '90';

export interface StudentRow {
  id: string;
  studentId: string;
  name: string;
  email: string;
  phone: string;
  photo: string;
  course: string;
  enrolments: number;
  offering: string;
  city: string;
  gender: string;
  owner: string;
  /** YYYY-MM-DD (IST) the account was created; '' when unknown. */
  joined: string;
  feeStatus: string;
  isInactive: boolean;
  /** The badge text: Inactive when disabled, else the server status label. */
  statusLabel: string;
  raw: Record<string, unknown>;
}

export interface StudentFilters {
  tab: StudentTab;
  search: string;
  offering: string;
  gender: string;
  city: string;
  owner: string;
  range: RangeFilter;
}

export const EMPTY_STUDENT_FILTERS: StudentFilters = {
  tab: 'all', search: '', offering: '', gender: '', city: '', owner: '', range: 'all',
};

/**
 * The address to show as "Email". Naji 2026-05-12: the legacy users.email
 * column was repurposed to hold phone-with-country-code; the real address is
 * user_email. Fall back to `email` only when it actually looks like one.
 */
export function displayEmail(row: Record<string, unknown>): string {
  const userEmail = asString(row.user_email);
  if (userEmail) return userEmail;
  const legacy = asString(row.email);
  return legacy.includes('@') ? legacy : '';
}

export function toStudentRows(
  students: Record<string, unknown>[],
  extras: Record<string, unknown>[],
): StudentRow[] {
  const extraById = new Map(extras.map((e) => [asString(e.id), e]));
  return students.map((row) => {
    const id = asString(row._id) || asString(row.id);
    const extra = extraById.get(id);
    const rawName = asString(row.name) || asString(row.student_name);
    const isInactive = Boolean(row.disabled_at);
    const count = Number(row.enrolment_count ?? row.enrollment_count);
    return {
      id,
      studentId: asString(row.student_id) || asString(row.unique_student_id),
      // Naji 2026-07-09 — legacy names are stored ALL-CAPS; always show Title Case.
      name: rawName ? titleCaseEachWord(rawName) : '',
      email: displayEmail(row),
      phone: asString(row.phone),
      photo: asString(row.image),
      course: asString(row.course_title),
      enrolments: Number.isFinite(count) ? count : 0,
      offering: asString(extra?.offering),
      city: asString(extra?.city),
      gender: asString(extra?.gender),
      owner: asString(extra?.owner),
      joined: asString(extra?.joined),
      feeStatus: asString(row.fee_status),
      isInactive,
      statusLabel: isInactive ? 'Inactive' : asString(row.status_label) || 'Active',
      raw: row,
    };
  });
}

export function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).map((p) => p[0]).join('').slice(0, 2).toUpperCase() || '?';
}

/** Local YYYY-MM-DD for `days` days before `now` (never via a UTC string parse). */
export function ymdDaysAgo(now: Date, days: number): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Distinct non-empty values, sorted, for a filter dropdown. */
export function distinctValues(rows: StudentRow[], pick: (r: StudentRow) => string): string[] {
  return [...new Set(rows.map(pick).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function matchesTab(row: StudentRow, tab: StudentTab): boolean {
  if (tab === 'Active') return !row.isInactive;
  if (tab === 'Inactive') return row.isInactive;
  return true;
}

export function filterStudents(rows: StudentRow[], f: StudentFilters, now: Date = new Date()): StudentRow[] {
  const q = f.search.trim().toLowerCase();
  const cutoff = f.range === 'all' ? '' : ymdDaysAgo(now, Number(f.range));
  return rows.filter((r) => {
    if (!matchesTab(r, f.tab)) return false;
    if (f.offering && r.offering !== f.offering) return false;
    if (f.gender && r.gender !== f.gender) return false;
    if (f.city && r.city !== f.city) return false;
    if (f.owner && r.owner !== f.owner) return false;
    if (cutoff && (!r.joined || r.joined < cutoff)) return false;
    if (!q) return true;
    return (
      r.name.toLowerCase().includes(q)
      || r.studentId.toLowerCase().includes(q)
      || r.email.toLowerCase().includes(q)
      || r.phone.toLowerCase().includes(q)
    );
  });
}

export function tabCounts(rows: StudentRow[]): Record<StudentTab, number> {
  const inactive = rows.filter((r) => r.isInactive).length;
  return { all: rows.length, Active: rows.length - inactive, Inactive: inactive };
}

function sortValue(r: StudentRow, k: StudentSortKey): string {
  if (k === 'status') return r.statusLabel;
  return r[k];
}

export function sortStudents(rows: StudentRow[], key: StudentSortKey, dir: 'asc' | 'desc'): StudentRow[] {
  const sign = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = sortValue(a, key);
    const vb = sortValue(b, key);
    // Blanks always sink to the bottom, whichever way the column is sorted.
    if (!va && vb) return 1;
    if (va && !vb) return -1;
    return sign * va.localeCompare(vb, undefined, { numeric: true, sensitivity: 'base' });
  });
}

export const FEE_STATUS_TONE: Record<string, Tone> = {
  Paid: 'emerald', Partial: 'amber', Pending: 'slate', Overdue: 'rose',
};

export function statusTone(label: string): Tone {
  const s = label.toLowerCase();
  if (s === 'active') return 'emerald';
  if (s === 'inactive' || s === 'dropped') return 'slate';
  if (s === 'graduated') return 'primary';
  return 'slate';
}

export function studentCsvRows(rows: StudentRow[], formatDmy: (ymd: string) => string): Array<Array<string | number>> {
  return [
    ['Student ID', 'Student Name', 'Phone', 'Email', 'Course', 'Enrollments', 'Offering', 'City', 'Gender', 'Owner', 'Joined', 'Fee Status', 'Status'],
    ...rows.map((r) => [
      r.studentId, r.name, r.phone, r.email, r.course, r.enrolments, r.offering, r.city, r.gender, r.owner,
      formatDmy(r.joined), r.feeStatus, r.statusLabel,
    ]),
  ];
}

