import { asNumber, asString } from '../../shared/utils/admin-data-utils.js';
import {
  compareNumber, compareText, distinctOptions, matchesSearch, plainText, sortRows, type CourseRef, type SortDir,
} from '../course/catalog-list-model.js';

// Lessons list (Naji's LessonsModule) over GET /admin/course/lessons/all. A
// lesson belongs to ONE subject, and that subject can be shared by several
// courses (course_subject), so a lesson shows under every linked course.
// `order` is the lesson's position inside its subject — display only here;
// reordering stays drag-and-drop (save on drop) in the Lesson Builder.

export interface LessonRow {
  id: string;
  title: string;
  summary: string;
  courses: CourseRef[];
  /** First linked course — what the builder deep-link has always used. */
  primaryCourseId: string;
  subjectId: string;
  subjectTitle: string;
  files: number;
  free: boolean;
  order: number;
}

export type LessonSortKey = 'title' | 'summary' | 'course' | 'subject' | 'files' | 'access' | 'order';
export type AccessFilter = '' | 'free' | 'paid';

export interface LessonFilters {
  search: string;
  course: string;
  subject: string;
  access: AccessFilter;
}

export const EMPTY_LESSON_FILTERS: LessonFilters = { search: '', course: '', subject: '', access: '' };

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

export function toLessonRows(raw: Record<string, unknown>[]): LessonRow[] {
  return raw.map((r) => ({
    id: asString(r.id),
    title: asString(r.title),
    summary: plainText(asString(r.summary)),
    courses: courseRefs(r),
    primaryCourseId: asString(r.course_id),
    subjectId: asString(r.subject_id),
    subjectTitle: asString(r.subject_title),
    files: asNumber(r.files_count),
    free: asString(r.free).toLowerCase() === 'on',
    order: asNumber(r.order),
  }));
}

export function lessonCourseOptions(rows: readonly LessonRow[]): Array<{ value: string; label: string }> {
  return distinctOptions(rows.flatMap((l) => l.courses));
}

/** Subjects for the dependent picker — only those under the chosen course. */
export function lessonSubjectOptions(rows: readonly LessonRow[], course: string): Array<{ value: string; label: string }> {
  const scoped = course ? rows.filter((l) => l.courses.some((c) => c.id === course)) : rows;
  return distinctOptions(scoped.map((l) => ({ id: l.subjectId, title: l.subjectTitle })));
}

export function filterLessons(rows: readonly LessonRow[], f: LessonFilters): LessonRow[] {
  return rows.filter((l) => {
    if (f.course && !l.courses.some((c) => c.id === f.course)) return false;
    if (f.subject && l.subjectId !== f.subject) return false;
    if (f.access === 'free' && !l.free) return false;
    if (f.access === 'paid' && l.free) return false;
    return matchesSearch(f.search, [l.title, l.subjectTitle, l.summary, ...l.courses.map((c) => c.title)]);
  });
}

export function sortLessons(rows: readonly LessonRow[], key: LessonSortKey, dir: SortDir): LessonRow[] {
  const byPlace = (a: LessonRow, b: LessonRow): number => compareText(a.subjectTitle, b.subjectTitle) || compareNumber(a.order, b.order);
  const cmp = (a: LessonRow, b: LessonRow): number => {
    switch (key) {
      case 'subject': return byPlace(a, b);
      case 'order': return compareNumber(a.order, b.order) || compareText(a.subjectTitle, b.subjectTitle);
      case 'files': return compareNumber(a.files, b.files);
      case 'access': return Number(b.free) - Number(a.free);
      case 'course': return compareText(a.courses.map((c) => c.title).join(', '), b.courses.map((c) => c.title).join(', '));
      default: return compareText(a[key], b[key]);
    }
  };
  return sortRows(rows, cmp, dir);
}

/** The Lesson Builder deep-link this list has always opened. */
export function builderHref(l: LessonRow): string {
  if (l.subjectId && l.primaryCourseId) {
    return `/admin/course_new/builder?course_id=${encodeURIComponent(l.primaryCourseId)}&subject_id=${encodeURIComponent(l.subjectId)}`;
  }
  return '/admin/course_new/builder';
}

export function lessonCsvRows(rows: readonly LessonRow[]): Array<Array<string | number>> {
  return [
    ['Lesson', 'Summary', 'Courses', 'Subject', 'Files', 'Access', 'Order'],
    ...rows.map((l) => [l.title, l.summary, l.courses.map((c) => c.title).join('; '), l.subjectTitle, l.files, l.free ? 'Free' : 'Paid', l.order]),
  ];
}
