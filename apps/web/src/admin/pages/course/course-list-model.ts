import { asNumber, asString } from '../../shared/utils/admin-data-utils.js';
import { compareText, matchesSearch, sortRows, statusKey, type SortDir } from './catalog-list-model.js';

// Course Directory (Naji's CoursesModule) over GET /admin/course/index.
// `course.status` defaults to 'active' in the DB, so a course can carry it even
// though the form only offers draft / published / archived.

export interface CourseRow {
  id: string;
  code: string;
  title: string;
  level: string;
  duration: string;
  status: string;
  category: string;
  subjectCount: number;
  enrolled: number;
}

export type CourseSortKey = 'code' | 'title' | 'level' | 'duration' | 'status';

export interface CourseFilters {
  search: string;
  status: string;
  level: string;
}

export const EMPTY_COURSE_FILTERS: CourseFilters = { search: '', status: '', level: '' };
export const COURSE_STATUS_ORDER = ['published', 'active', 'draft', 'archived'];

export function toCourseRows(raw: Record<string, unknown>[]): CourseRow[] {
  return raw.map((r) => ({
    id: asString(r.id),
    code: asString(r.course_code),
    title: asString(r.title),
    level: asString(r.level),
    duration: asString(r.duration),
    status: asString(r.status) || 'draft',
    category: asString(r.category_name),
    subjectCount: asNumber(r.subject_count),
    enrolled: asNumber(r.enrolled_students),
  }));
}

export function filterCourses(rows: readonly CourseRow[], f: CourseFilters): CourseRow[] {
  return rows.filter((c) => {
    if (f.status && statusKey(c.status) !== f.status) return false;
    if (f.level && c.level !== f.level) return false;
    return matchesSearch(f.search, [c.title, c.code]);
  });
}

/** Leading number of a duration string ("6 Months" → 6) so 2 Weeks sorts before 10 Weeks. */
function durationDays(raw: string): number | null {
  const m = /^(\d+(?:\.\d+)?)\s*([A-Za-z]*)/.exec(raw.trim());
  if (!m) return null;
  const n = Number(m[1]);
  const unit = (m[2] ?? '').toLowerCase().replace(/s$/, '');
  const per: Record<string, number> = { hour: 1 / 24, h: 1 / 24, day: 1, week: 7, month: 30, year: 365 };
  return n * (per[unit] ?? 1);
}

export function sortCourses(rows: readonly CourseRow[], key: CourseSortKey, dir: SortDir): CourseRow[] {
  const cmp = (a: CourseRow, b: CourseRow): number => {
    if (key === 'duration') {
      const da = durationDays(a.duration);
      const db = durationDays(b.duration);
      if (da !== null && db !== null && da !== db) return da - db;
      return compareText(a.duration, b.duration);
    }
    return compareText(a[key], b[key]);
  };
  return sortRows(rows, cmp, dir);
}

export function courseCsvRows(rows: readonly CourseRow[]): Array<Array<string | number>> {
  return [
    ['Course Code', 'Course Title', 'Course Level', 'Course Duration', 'Status', 'Program', 'Subjects', 'Enrolled'],
    ...rows.map((c) => [c.code, c.title, c.level, c.duration, c.status, c.category, c.subjectCount, c.enrolled]),
  ];
}
