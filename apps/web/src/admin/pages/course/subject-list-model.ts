import { asNumber, asString } from '../../shared/utils/admin-data-utils.js';
import { compareNumber, compareText, matchesSearch, sortRows, statusKey, type CourseRef, type SortDir } from './catalog-list-model.js';

// Subjects list (Naji's SubjectsModule) over GET /admin/course/subjects/all.
// A subject is shared across courses through `course_subject`, so `courses` is
// the full M:N list; `course_id`/`course_title` is only the first link and is a
// fallback for rows that predate the pivot. A subject with no course still
// lists (Naji UAT 2026-05-22) and shows "—".

export interface SubjectRow {
  id: string;
  code: string;
  title: string;
  shortName: string;
  type: string;
  hours: number | null;
  version: string;
  status: string;
  courses: CourseRef[];
  /** The API row, kept for the edit form and the unlock-partner picker. */
  raw: Record<string, unknown>;
}

export type SubjectSortKey = 'code' | 'title' | 'courses' | 'type' | 'hours' | 'version' | 'status';

export interface SubjectFilters {
  search: string;
  status: string;
  course: string;
  type: string;
}

export const EMPTY_SUBJECT_FILTERS: SubjectFilters = { search: '', status: '', course: '', type: '' };
export const SUBJECT_STATUS_ORDER = ['active', 'draft', 'archived'];
/** The types the form offers; any other stored value is added to the filter. */
export const SUBJECT_TYPES = ['Core', 'Elective'];

function courseRefs(r: Record<string, unknown>): CourseRef[] {
  const list = Array.isArray(r.courses) ? (r.courses as unknown[]) : [];
  const refs = list
    .map((c) => (c && typeof c === 'object' ? (c as Record<string, unknown>) : {}))
    .map((c) => ({ id: asString(c.id), title: asString(c.title) }))
    .filter((c) => c.title);
  if (refs.length > 0) return refs;
  const title = asString(r.course_title);
  return title ? [{ id: asString(r.course_id), title }] : [];
}

export function toSubjectRows(raw: Record<string, unknown>[]): SubjectRow[] {
  return raw.map((r) => ({
    id: asString(r.id),
    code: asString(r.subject_code),
    title: asString(r.title),
    shortName: asString(r.short_name),
    type: asString(r.subject_type),
    hours: r.duration_hours == null || r.duration_hours === '' ? null : asNumber(r.duration_hours),
    version: asString(r.version),
    status: asString(r.status) || 'draft',
    courses: courseRefs(r),
    raw: r,
  }));
}

export function filterSubjects(rows: readonly SubjectRow[], f: SubjectFilters): SubjectRow[] {
  return rows.filter((s) => {
    if (f.type && s.type.toLowerCase() !== f.type.toLowerCase()) return false;
    if (f.status && statusKey(s.status) !== f.status) return false;
    if (f.course && !s.courses.some((c) => c.id === f.course)) return false;
    return matchesSearch(f.search, [s.title, s.code, s.shortName, ...s.courses.map((c) => c.title)]);
  });
}

export function subjectTypeOptions(rows: readonly SubjectRow[]): string[] {
  const extra = rows.map((s) => s.type).filter((t) => t && !SUBJECT_TYPES.some((k) => k.toLowerCase() === t.toLowerCase()));
  return [...SUBJECT_TYPES, ...new Set(extra)];
}

export function sortSubjects(rows: readonly SubjectRow[], key: SubjectSortKey, dir: SortDir): SubjectRow[] {
  const cmp = (a: SubjectRow, b: SubjectRow): number => {
    switch (key) {
      case 'hours': return compareNumber(a.hours, b.hours);
      case 'courses': return compareText(a.courses.map((c) => c.title).join(', '), b.courses.map((c) => c.title).join(', '));
      default: return compareText(a[key], b[key]);
    }
  };
  return sortRows(rows, cmp, dir);
}

export function subjectCsvRows(rows: readonly SubjectRow[]): Array<Array<string | number>> {
  return [
    ['Code', 'Subject Title', 'Short Name', 'Courses', 'Type', 'Hours', 'Version', 'Status'],
    ...rows.map((s) => [s.code, s.title, s.shortName, s.courses.map((c) => c.title).join('; '), s.type, s.hours ?? '', s.version, s.status]),
  ];
}
