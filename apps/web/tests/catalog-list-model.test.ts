import { describe, expect, test } from 'vitest';

import {
  allSelected,
  compareText,
  distinctOptions,
  envelopeMessage,
  formatDmy,
  matchesSearch,
  pageSlice,
  plainText,
  rowsToExport,
  sortRows,
  statusLabel,
  statusPills,
  statusTone,
  togglePage,
  toggleId,
} from '../src/admin/pages/course/catalog-list-model';
import { courseCsvRows, filterCourses, sortCourses, toCourseRows } from '../src/admin/pages/course/course-list-model';
import { filterPrograms, sortPrograms, toProgramRows } from '../src/admin/pages/program/program-list-model';
import { filterSubjects, sortSubjects, subjectTypeOptions, toSubjectRows } from '../src/admin/pages/course/subject-list-model';
import {
  builderHref, filterLessons, lessonSubjectOptions, sortLessons, toLessonRows,
} from '../src/admin/pages/course_new/lesson-list-model';

describe('catalog list helpers', () => {
  test('natural compare puts blanks last', () => {
    expect(['MTT10', '', 'MTT2', 'mtt1'].sort(compareText)).toEqual(['mtt1', 'MTT2', 'MTT10', '']);
  });

  test('sortRows is stable and never mutates', () => {
    const input = [{ k: 2, n: 'a' }, { k: 1, n: 'b' }, { k: 2, n: 'c' }];
    const out = sortRows(input, (a, b) => a.k - b.k, 'desc');
    expect(out.map((r) => r.n)).toEqual(['a', 'c', 'b']);
    expect(input.map((r) => r.n)).toEqual(['a', 'b', 'c']);
  });

  test('blank values stay last in both directions and ties keep input order', () => {
    const input = [{ v: '' , n: 'a' }, { v: '2', n: 'b' }, { v: '1', n: 'c' }, { v: '', n: 'd' }, { v: '2', n: 'e' }];
    const cmp = (x: { v: string }, y: { v: string }) => compareText(x.v, y.v);
    const blank = (x: { v: string }) => !x.v;
    expect(sortRows(input, cmp, 'asc', blank).map((r) => r.n)).toEqual(['c', 'b', 'e', 'a', 'd']);
    expect(sortRows(input, cmp, 'desc', blank).map((r) => r.n)).toEqual(['b', 'e', 'c', 'a', 'd']);
  });

  test('pageSlice clamps a page that fell off the end', () => {
    const s = pageSlice([1, 2, 3, 4, 5], 9, 2);
    expect(s).toEqual({ page: 3, pages: 3, current: [5] });
    expect(pageSlice([], 1, 10)).toEqual({ page: 1, pages: 1, current: [] });
  });

  test('search is case-insensitive and blank matches all', () => {
    expect(matchesSearch('  ', ['x'])).toBe(true);
    expect(matchesSearch('MONT', ['Diploma in Montessori'])).toBe(true);
    expect(matchesSearch('zzz', ['a', 'b'])).toBe(false);
  });

  test('status pills list only statuses present, preferred order first', () => {
    const pills = statusPills(['draft', 'Published', 'active', 'published', '', 'legacy'], ['published', 'active', 'draft', 'archived']);
    expect(pills).toEqual([
      { key: 'published', label: 'Published', count: 2 },
      { key: 'active', label: 'Active', count: 1 },
      { key: 'draft', label: 'Draft', count: 1 },
      { key: 'legacy', label: 'Legacy', count: 1 },
    ]);
    expect(statusLabel('')).toBe('—');
    expect(statusTone('PUBLISHED')).toBe('emerald');
    expect(statusTone('weird')).toBe('slate');
  });

  test('distinct options dedupe by id and sort by label', () => {
    expect(distinctOptions([{ id: '2', title: 'B' }, { id: '1', title: 'A' }, { id: '2', title: 'B again' }, { id: '', title: 'x' }]))
      .toEqual([{ value: '1', label: 'A' }, { value: '2', label: 'B' }]);
  });

  test('plainText strips tags and entities for display', () => {
    expect(plainText('<p>Hello&nbsp;<b>world</b></p>\n<script>x</script>')).toBe('Hello world x');
  });

  test('formatDmy reads a bare date as a calendar date', () => {
    expect(formatDmy('2026-06-01')).toBe('01/06/2026');
    expect(formatDmy('')).toBe('');
    expect(formatDmy('not a date')).toBe('');
    // 18:29 UTC is 23:59 IST (same day); 18:31 UTC is already the next IST day.
    expect(formatDmy('2026-05-09T18:29:00.000Z')).toBe('09/05/2026');
    expect(formatDmy('2026-05-09T18:31:00.000Z')).toBe('10/05/2026');
  });

  test('selection: page toggle, export selected or all', () => {
    let sel = togglePage(new Set(), ['1', '2']);
    expect(allSelected(sel, ['1', '2'])).toBe(true);
    sel = toggleId(sel, '2', false);
    expect(allSelected(sel, ['1', '2'])).toBe(false);
    expect(togglePage(new Set(['1', '2']), ['1', '2']).size).toBe(0);
    const rows = [{ id: '1' }, { id: '2' }];
    expect(rowsToExport(rows, new Set())).toEqual(rows);
    expect(rowsToExport(rows, new Set(['2']))).toEqual([{ id: '2' }]);
  });

  test('envelope message ignores the success sentinel', () => {
    expect(envelopeMessage({ status: 1, message: 'Course archived' }, 'x')).toBe('Course archived');
    expect(envelopeMessage({ status: 1, message: 'success' }, 'Saved.')).toBe('Saved.');
    expect(envelopeMessage(null, 'Saved.')).toBe('Saved.');
  });
});

describe('programs', () => {
  const rows = toProgramRows([
    { id: '3', code: 'PGD', title: 'Post Graduate Diploma', description: 'Advanced', course_count: 2, course_titles: ['PG Diploma', 'QA'], status: 'active' },
    { id: '1', code: 'CER', title: 'Certification', description: 'Short', course_titles: ['Cert A'] },
  ]);

  test('maps counts, falling back to the title list', () => {
    expect(rows[1]).toMatchObject({ courseCount: 1, status: 'active' });
  });

  test('filters by course and search; sorts by course count', () => {
    expect(filterPrograms(rows, { search: '', status: '', course: 'QA' }).map((p) => p.id)).toEqual(['3']);
    expect(filterPrograms(rows, { search: 'short', status: '', course: '' }).map((p) => p.id)).toEqual(['1']);
    expect(sortPrograms(rows, 'courseCount', 'desc').map((p) => p.id)).toEqual(['3', '1']);
  });
});

describe('courses', () => {
  const rows = toCourseRows([
    { id: 7, course_code: 'DMTT', title: 'Diploma', level: 'Advanced', duration: '6 Months', status: 'published' },
    { id: 8, course_code: '', title: 'Primary Test', level: '', duration: '2 Weeks', status: '' },
    { id: 9, course_code: 'PG', title: 'PG Diploma', level: 'Advanced', duration: '1 Year', status: 'active' },
  ]);

  test('blank status reads as draft; filters by status and level', () => {
    expect(rows[1]!.status).toBe('draft');
    expect(filterCourses(rows, { search: '', status: 'active', level: '' }).map((c) => c.id)).toEqual(['9']);
    expect(filterCourses(rows, { search: 'dmtt', status: '', level: 'Advanced' }).map((c) => c.id)).toEqual(['7']);
  });

  test('duration sorts by length, not text', () => {
    expect(sortCourses(rows, 'duration', 'asc').map((c) => c.id)).toEqual(['8', '7', '9']);
  });

  test('csv has a header row', () => {
    expect(courseCsvRows(rows.slice(0, 1))[0]![0]).toBe('Course Code');
  });
});

describe('subjects (shared across courses)', () => {
  const rows = toSubjectRows([
    { id: 1, subject_code: 'MTT102', title: 'Practical Work', subject_type: 'Core', duration_hours: 50, status: 'active', courses: [{ id: 16, title: 'Diploma' }, { id: 18, title: 'PG Diploma' }] },
    { id: 2, subject_code: 'MTT110', title: 'IT', subject_type: 'Practical', duration_hours: null, status: 'draft', course_id: 18, course_title: 'PG Diploma' },
    { id: 3, subject_code: '', title: 'Standalone', status: 'draft', courses: [] },
  ]);

  test('a shared subject matches every linked course; fallback to course_id', () => {
    expect(filterSubjects(rows, { search: '', status: '', course: '18', type: '' }).map((s) => s.id)).toEqual(['1', '2']);
    expect(filterSubjects(rows, { search: '', status: '', course: '16', type: '' }).map((s) => s.id)).toEqual(['1']);
  });

  test('a subject with no course still lists', () => {
    expect(rows[2]!.courses).toEqual([]);
    expect(filterSubjects(rows, { search: 'stand', status: '', course: '', type: '' })).toHaveLength(1);
  });

  test('search reaches course titles; null hours sort last', () => {
    expect(filterSubjects(rows, { search: 'pg dip', status: '', course: '', type: '' }).map((s) => s.id)).toEqual(['1', '2']);
    expect(sortSubjects(rows, 'hours', 'asc').map((s) => s.hours)).toEqual([50, null, null]);
  });

  test('type options keep Core/Elective and add stored extras', () => {
    expect(subjectTypeOptions(rows)).toEqual(['Core', 'Elective', 'Practical']);
  });
});

describe('lessons', () => {
  const rows = toLessonRows([
    { id: 10, title: 'Internet', summary: '<p>Basics</p>', course_id: 18, course_title: 'PG', courses: [{ id: 18, title: 'PG' }, { id: 16, title: 'Diploma' }], subject_id: 45, subject_title: 'IT', files_count: 2, free: 'off', order: 3 },
    { id: 11, title: 'Stages', summary: '', courses: [{ id: 16, title: 'Diploma' }], course_id: 16, subject_id: 30, subject_title: 'Child Psychology', files_count: 3, free: 'on', order: 1 },
    { id: 12, title: 'Intro', summary: '', courses: [], course_id: null, subject_id: 45, subject_title: 'IT', files_count: 0, order: 1 },
  ]);

  test('summary is plain text; free flag from on/off', () => {
    expect(rows[0]).toMatchObject({ summary: 'Basics', free: false, files: 2 });
    expect(rows[1]!.free).toBe(true);
  });

  test('course, subject and access filters', () => {
    expect(filterLessons(rows, { search: '', course: '16', subject: '', access: '' }).map((l) => l.id)).toEqual(['10', '11']);
    expect(filterLessons(rows, { search: '', course: '', subject: '', access: 'free' }).map((l) => l.id)).toEqual(['11']);
    expect(lessonSubjectOptions(rows, '18')).toEqual([{ value: '45', label: 'IT' }]);
  });

  test('subject sort keeps curriculum order inside a subject', () => {
    expect(sortLessons(rows, 'subject', 'asc').map((l) => l.id)).toEqual(['11', '12', '10']);
  });

  test('builder deep-link uses the first course, else the bare builder', () => {
    expect(builderHref(rows[0]!)).toBe('/admin/course_new/builder?course_id=18&subject_id=45');
    expect(builderHref(rows[2]!)).toBe('/admin/course_new/builder');
  });
});
