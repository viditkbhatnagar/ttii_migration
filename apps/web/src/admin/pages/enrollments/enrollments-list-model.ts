import { asNumber, asString } from '../../shared/utils/admin-data-utils.js';
import type { Tone } from '../../shared/components/ui-tones.js';

// Admin → Enrollments in Naji's design (TTII 2026-10-12). Pure list logic over
// /admin/enrol/index rows. Status labels and the legacy-spelling map are
// unchanged from the old page (Naji UAT 2026-05-13): unmarked rows count as
// Active so the totals add up.

export const ENROLMENT_STATUSES = ['Active', 'On Hold', 'Dropout', 'Completed', 'Graduated'] as const;
export type EnrolmentStatus = (typeof ENROLMENT_STATUSES)[number];
export type EnrolmentTab = 'all' | EnrolmentStatus;
export type EnrolmentSortKey = 'enrollmentId' | 'date' | 'student' | 'course' | 'offering' | 'combination' | 'fee' | 'progress' | 'status';

export function normalizeStatus(raw: string): EnrolmentStatus | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  if (s === 'active') return 'Active';
  if (s === 'on hold' || s === 'onhold' || s === 'hold' || s === 'pending') return 'On Hold';
  if (s === 'dropout' || s === 'drop out' || s === 'dropped' || s === 'inactive') return 'Dropout';
  if (s === 'completed' || s === 'complete') return 'Completed';
  if (s === 'graduated' || s === 'graduate') return 'Graduated';
  return null;
}

export const STATUS_TONE: Record<EnrolmentStatus, Tone> = {
  Active: 'emerald', 'On Hold': 'amber', Dropout: 'rose', Completed: 'primary', Graduated: 'blue',
};

export interface EnrolmentRow {
  /** enrol primary key (what /admin/enrol/update takes). */
  id: string;
  enrollmentId: string;
  /** YYYY-MM-DD, '' when unknown. */
  date: string;
  studentId: string;
  student: string;
  email: string;
  course: string;
  offering: string;
  combination: string;
  batch: string;
  /** null when the server has no fee (shown as "-"). */
  fee: number | null;
  progress: number;
  status: EnrolmentStatus;
  raw: Record<string, unknown>;
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * A date-ish value as YYYY-MM-DD. enrol.enrollment_date is free text (legacy):
 * ISO dates are read by their parts (never `new Date('YYYY-MM-DD')`, which is
 * UTC midnight), dd/mm/yyyy and dd-mm-yyyy are accepted, anything else is
 * parsed as an instant and read in local time.
 */
export function toYmd(value: unknown): string {
  const s = asString(value).trim();
  if (!s) return '';
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T ])/.exec(s);
  if (iso && !/[T ]\d/.test(s.slice(10))) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(s);
  if (dmy) return `${dmy[3]}-${pad(Number(dmy[2]))}-${pad(Number(dmy[1]))}`;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function toEnrolmentRows(rows: Record<string, unknown>[]): EnrolmentRow[] {
  return rows.map((r) => {
    const fee = Number(r.course_fee);
    return {
      id: asString(r.id),
      enrollmentId: asString(r.enrollment_id),
      date: toYmd(r.enrollment_date) || toYmd(r.created_at),
      studentId: asString(r.student_id),
      student: asString(r.student_name),
      email: asString(r.student_email),
      course: asString(r.course_title),
      offering: asString(r.course_offering),
      combination: asString(r.combination_title),
      batch: asString(r.batch_title),
      fee: Number.isFinite(fee) && fee > 0 ? fee : null,
      progress: Math.max(0, Math.min(100, asNumber(r.progress_percent))),
      status: normalizeStatus(asString(r.enrollment_status)) ?? 'Active',
      raw: r,
    };
  });
}

export interface EnrolmentFilters {
  tab: EnrolmentTab;
  search: string;
  course: string;
  offering: string;
  combination: string;
  /** YYYY-MM-DD bounds, inclusive. */
  from: string;
  to: string;
}

export const EMPTY_ENROLMENT_FILTERS: EnrolmentFilters = {
  tab: 'all', search: '', course: '', offering: '', combination: '', from: '', to: '',
};

export function filterEnrolments(rows: EnrolmentRow[], f: EnrolmentFilters): EnrolmentRow[] {
  const q = f.search.trim().toLowerCase();
  return rows.filter((r) => {
    if (f.tab !== 'all' && r.status !== f.tab) return false;
    if (f.course && r.course !== f.course) return false;
    if (f.offering && r.offering !== f.offering) return false;
    if (f.combination && r.combination !== f.combination) return false;
    if (f.from || f.to) {
      if (!r.date) return false;
      if (f.from && r.date < f.from) return false;
      if (f.to && r.date > f.to) return false;
    }
    if (!q) return true;
    return [r.student, r.enrollmentId, r.course, r.offering].some((v) => v.toLowerCase().includes(q));
  });
}

export function statusCounts(rows: EnrolmentRow[]): Record<EnrolmentTab, number> {
  const counts: Record<EnrolmentTab, number> = { all: rows.length, Active: 0, 'On Hold': 0, Dropout: 0, Completed: 0, Graduated: 0 };
  for (const r of rows) counts[r.status] += 1;
  return counts;
}

/** Offerings scoped to the chosen course; combinations to course + offering. */
export function scopedOptions(rows: EnrolmentRow[], f: Pick<EnrolmentFilters, 'course' | 'offering'>): {
  courses: string[]; offerings: string[]; combinations: string[];
} {
  const uniq = (list: string[]) => [...new Set(list.filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const inCourse = rows.filter((r) => !f.course || r.course === f.course);
  const inOffering = inCourse.filter((r) => !f.offering || r.offering === f.offering);
  return {
    courses: uniq(rows.map((r) => r.course)),
    offerings: uniq(inCourse.map((r) => r.offering)),
    combinations: uniq(inOffering.map((r) => r.combination)),
  };
}

export function sortEnrolments(rows: EnrolmentRow[], key: EnrolmentSortKey, dir: 'asc' | 'desc'): EnrolmentRow[] {
  const sign = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (key === 'fee' || key === 'progress') {
      const va = a[key] ?? -1;
      const vb = b[key] ?? -1;
      return sign * (va - vb);
    }
    const va = a[key];
    const vb = b[key];
    if (!va && vb) return 1;
    if (va && !vb) return -1;
    return sign * va.localeCompare(vb, undefined, { numeric: true, sensitivity: 'base' });
  });
}

export function enrolmentCsvRows(rows: EnrolmentRow[], formatDmy: (ymd: string) => string): Array<Array<string | number>> {
  return [
    ['Enrollment ID', 'Date of Enrollment', 'Student', 'Course Name', 'Course Offering', 'Combination', 'Course Fee', 'Progress %', 'Status'],
    ...rows.map((r) => [r.enrollmentId, formatDmy(r.date), r.student, r.course, r.offering, r.combination, r.fee ?? '', r.progress, r.status]),
  ];
}
