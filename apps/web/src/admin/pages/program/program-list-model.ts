import { asNumber, asString } from '../../shared/utils/admin-data-utils.js';
import { compareNumber, compareText, matchesSearch, sortRows, statusKey, type SortDir } from '../course/catalog-list-model.js';

// Programs list (Naji's ProgramsModule) over GET /admin/programs. A program is
// a top-level `category`; its courses are the courses filed under it.

export interface ProgramRow {
  id: string;
  code: string;
  title: string;
  description: string;
  courseCount: number;
  courses: string[];
  status: string;
}

export type ProgramSortKey = 'code' | 'title' | 'description' | 'courseCount' | 'courses' | 'status';

export interface ProgramFilters {
  search: string;
  status: string;
  course: string;
}

export const EMPTY_PROGRAM_FILTERS: ProgramFilters = { search: '', status: '', course: '' };

export function toProgramRows(raw: Record<string, unknown>[]): ProgramRow[] {
  return raw.map((r) => {
    const courses = Array.isArray(r.course_titles) ? r.course_titles.map((t) => asString(t)).filter(Boolean) : [];
    return {
      id: asString(r.id),
      code: asString(r.code),
      title: asString(r.title),
      description: asString(r.description),
      courseCount: r.course_count == null ? courses.length : asNumber(r.course_count),
      courses,
      status: asString(r.status) || 'active',
    };
  });
}

export function filterPrograms(rows: readonly ProgramRow[], f: ProgramFilters): ProgramRow[] {
  return rows.filter((p) => {
    if (f.status && statusKey(p.status) !== f.status) return false;
    if (f.course && !p.courses.includes(f.course)) return false;
    return matchesSearch(f.search, [p.title, p.code, p.description]);
  });
}

export function sortPrograms(rows: readonly ProgramRow[], key: ProgramSortKey, dir: SortDir): ProgramRow[] {
  const cmp = (a: ProgramRow, b: ProgramRow): number => {
    switch (key) {
      case 'courseCount': return compareNumber(a.courseCount, b.courseCount);
      case 'courses': return compareText(a.courses.join(', '), b.courses.join(', '));
      default: return compareText(a[key], b[key]);
    }
  };
  return sortRows(rows, cmp, dir);
}

export function programCsvRows(rows: readonly ProgramRow[]): Array<Array<string | number>> {
  return [
    ['Code', 'Program Name', 'Description', 'No of Courses', 'Courses', 'Status'],
    ...rows.map((p) => [p.code, p.title, p.description, p.courseCount, p.courses.join('; '), p.status]),
  ];
}
