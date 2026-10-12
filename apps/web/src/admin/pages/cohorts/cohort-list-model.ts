import { asNumber, asString } from '../../shared/utils/admin-data-utils.js';
import type { Tone } from '../../shared/components/ui-tones.js';
import { matchesSearch, monthLabel, sortRows, ymdOf, type SortDir } from './list-model.js';

// Cohorts list view model (TTII 2026-10-12, Naji's CohortsModule). Rows come
// from GET /admin/centres/cohorts (operations-service listAdminCohorts).
//
// Every filter is applied HERE, on the loaded rows. The old page sent
// cohort_month / language_id / instructor_id / status to the server, but the
// route never read them — those four filters silently did nothing.

export type CohortStatus = 'active' | 'completed' | 'upcoming';
export type CohortTab = 'active' | 'completed' | 'all';

export interface CohortRow {
  id: string;
  /** "C75" — derived from the row id; the legacy "C-75" hyphen is stripped (Naji 2026-05-04). */
  cohortId: string;
  /** The editable cohort code (cohorts.cohort_id, e.g. "CPMAY26"); falls back to the title. */
  code: string;
  title: string;
  startYmd: string;
  endYmd: string;
  /** "Jul 2026". */
  month: string;
  subjectId: string;
  subject: string;
  /** Every program the cohort serves (cohort_courses), primary first. */
  courseIds: string[];
  courses: string[];
  languageId: string;
  language: string;
  instructorId: string;
  instructor: string;
  students: number;
  liveClasses: number;
  status: CohortStatus;
}

export interface CohortFilters {
  tab: CohortTab;
  search: string;
  /** YYYY-MM of the start date. */
  month: string;
  courseId: string;
  subjectId: string;
  languageId: string;
  instructorId: string;
  status: '' | CohortStatus;
}

export const EMPTY_COHORT_FILTERS: CohortFilters = {
  tab: 'active', search: '', month: '', courseId: '', subjectId: '', languageId: '', instructorId: '', status: '',
};

export type CohortSortKey = 'status' | 'cohortId' | 'code' | 'month' | 'subject' | 'course' | 'language' | 'instructor' | 'students' | 'liveClasses';

export const STATUS_LABEL: Record<CohortStatus, string> = { active: 'Active', completed: 'Completed', upcoming: 'Upcoming' };
export const STATUS_TONE: Record<CohortStatus, Tone> = { active: 'emerald', completed: 'slate', upcoming: 'blue' };

/** "C-75" → "C75"; codes that are not the legacy pattern ("MMJUL26") pass through. */
export function formatCohortCode(value: unknown): string {
  return asString(value).trim().replace(/^([A-Za-z]+)-(\d+)$/, '$1$2');
}

function toStatus(raw: string): CohortStatus {
  const s = raw.toLowerCase();
  return s === 'completed' || s === 'upcoming' ? s : 'active';
}

function strList(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => asString(x)).filter(Boolean) : [];
}

export function toCohortRow(r: Record<string, unknown>): CohortRow {
  const id = asString(r.id) || asString(r._id);
  const courseIds = strList(r.course_ids);
  const primaryCourse = asString(r.course_id);
  const titles = strList(r.course_titles);
  const startYmd = ymdOf(r.start_date);
  return {
    id,
    cohortId: formatCohortCode(asString(r.cohort_row_id) || `C${id}`),
    code: formatCohortCode(r.cohort_id) || asString(r.title),
    title: asString(r.title),
    startYmd,
    endYmd: ymdOf(r.end_date),
    month: monthLabel(asString(r.cohort_date) || asString(r.cohort_month) || startYmd),
    subjectId: asString(r.subject_id),
    subject: asString(r.subject_title),
    courseIds: courseIds.length > 0 ? courseIds : primaryCourse ? [primaryCourse] : [],
    courses: titles.length > 0 ? titles : asString(r.course_title) ? [asString(r.course_title)] : [],
    languageId: asString(r.language_id),
    language: asString(r.language_title) || asString(r.language),
    instructorId: asString(r.instructor_id),
    instructor: asString(r.instructor_name),
    students: asNumber(r.student_count),
    liveClasses: asNumber(r.live_class_count) || asNumber(r.live_sessions_count),
    status: toStatus(asString(r.derived_status) || asString(r.status)),
  };
}

export function toCohortRows(data: unknown): CohortRow[] {
  return Array.isArray(data)
    ? data.filter((r): r is Record<string, unknown> => !!r && typeof r === 'object').map(toCohortRow).filter((r) => r.id)
    : [];
}

/** Every filter except the tab (the tab counts are computed from this). */
export function filterCohortsIgnoringTab(rows: CohortRow[], f: CohortFilters): CohortRow[] {
  return rows.filter((c) => {
    if (f.status && c.status !== f.status) return false;
    if (f.month && !c.startYmd.startsWith(f.month)) return false;
    if (f.courseId && !c.courseIds.includes(f.courseId)) return false;
    if (f.subjectId && c.subjectId !== f.subjectId) return false;
    if (f.languageId && c.languageId !== f.languageId) return false;
    if (f.instructorId && c.instructorId !== f.instructorId) return false;
    return matchesSearch(f.search, [c.cohortId, c.code, c.title, c.subject, c.instructor, ...c.courses]);
  });
}

export function filterCohorts(rows: CohortRow[], f: CohortFilters): CohortRow[] {
  const base = filterCohortsIgnoringTab(rows, f);
  return f.tab === 'all' ? base : base.filter((c) => c.status === f.tab);
}

export function cohortTabCounts(rows: CohortRow[]): Record<CohortTab, number> {
  return {
    active: rows.filter((c) => c.status === 'active').length,
    completed: rows.filter((c) => c.status === 'completed').length,
    all: rows.length,
  };
}

export function sortCohorts(rows: CohortRow[], key: CohortSortKey, dir: SortDir): CohortRow[] {
  const pick = (c: CohortRow): string | number => {
    switch (key) {
      case 'cohortId': return Number(c.cohortId.replace(/\D/g, '')) || 0;
      case 'month': return c.startYmd;
      case 'course': return c.courses.join(', ');
      case 'students': return c.students;
      case 'liveClasses': return c.liveClasses;
      default: return c[key];
    }
  };
  return sortRows(rows, pick, dir);
}

/** Distinct {id, label} options present in the loaded rows, sorted by label. */
export function optionsFrom(rows: CohortRow[], id: (c: CohortRow) => string, label: (c: CohortRow) => string): Array<{ id: string; label: string }> {
  const map = new Map<string, string>();
  for (const c of rows) {
    const k = id(c);
    const l = label(c);
    if (k && l && !map.has(k)) map.set(k, l);
  }
  return [...map.entries()].map(([k, l]) => ({ id: k, label: l })).sort((a, b) => a.label.localeCompare(b.label));
}

export function cohortCsvRows(rows: CohortRow[]): Array<Array<string | number>> {
  return [
    ['Status', 'Cohort ID', 'Cohort Code', 'Cohort Name', 'Cohort Date', 'Subject', 'Programs', 'Language', 'Instructor', 'No. of Students', 'Live Classes'],
    ...rows.map((c) => [STATUS_LABEL[c.status], c.cohortId, c.code, c.title, c.month, c.subject, c.courses.join('; '), c.language, c.instructor, c.students, c.liveClasses]),
  ];
}
