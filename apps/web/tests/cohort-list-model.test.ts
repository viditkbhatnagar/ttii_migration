import { describe, expect, test } from 'vitest';

import {
  EMPTY_COHORT_FILTERS,
  cohortCsvRows,
  cohortTabCounts,
  filterCohorts,
  formatCohortCode,
  sortCohorts,
  toCohortRows,
  type CohortFilters,
} from '../src/admin/pages/cohorts/cohort-list-model';
import {
  dayMonthYear,
  dmy,
  hhmmOf,
  istInstantMs,
  istTodayYmd,
  monthLabel,
  nextSort,
  pageSlice,
  to12h,
  ymdOf,
} from '../src/admin/pages/cohorts/list-model';

const rows = toCohortRows([
  {
    id: 94, cohort_row_id: 'C-94', cohort_id: 'SMOJUL26', title: 'School Management - July 2026', start_date: '2026-07-01T00:00:00.000Z', end_date: '2026-07-31T00:00:00.000Z',
    subject_id: 5, subject_title: 'School Management', course_id: 16, course_ids: [16, 18], course_titles: ['Diploma', 'PG Diploma'],
    language_id: 1, language_title: 'Malayalam', instructor_id: 7, instructor_name: 'Sabitha M', student_count: 4, live_class_count: 13, derived_status: 'active',
  },
  {
    id: 80, cohort_row_id: 'C-80', cohort_id: 'C-80', title: 'Child Care - Dec 2025', start_date: '2025-12-01T00:00:00.000Z', end_date: '2025-12-31T00:00:00.000Z',
    subject_id: 6, subject_title: 'Child Care', course_id: 16, course_titles: ['Diploma'],
    language_id: 2, language_title: 'English', instructor_id: 8, instructor_name: 'Thasneem', student_count: 20, live_class_count: 9, derived_status: 'completed',
  },
  { id: 101, cohort_id: 'NEWAUG26', title: 'Next', start_date: '2026-11-01', derived_status: 'upcoming', student_count: 0 },
  { title: 'no id' },
]);
const none: CohortFilters = { ...EMPTY_COHORT_FILTERS, tab: 'all' };

describe('cohort list model', () => {
  test('rows: hyphen stripped from legacy ids, month label, programs, rows without an id dropped', () => {
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ cohortId: 'C94', code: 'SMOJUL26', month: 'Jul 2026', courseIds: ['16', '18'], courses: ['Diploma', 'PG Diploma'] });
    expect(rows[1]?.code).toBe('C80');
    expect(rows[2]).toMatchObject({ cohortId: 'C101', status: 'upcoming', courseIds: [] });
    expect(formatCohortCode('MMJUL26')).toBe('MMJUL26');
  });

  test('a program filter matches a cohort shared by several programs', () => {
    expect(filterCohorts(rows, { ...none, courseId: '18' }).map((c) => c.id)).toEqual(['94']);
    expect(filterCohorts(rows, { ...none, courseId: '16' }).map((c) => c.id)).toEqual(['94', '80']);
  });

  test('language, instructor, month, status and search filters actually filter (they were ignored server-side)', () => {
    expect(filterCohorts(rows, { ...none, languageId: '2' }).map((c) => c.id)).toEqual(['80']);
    expect(filterCohorts(rows, { ...none, instructorId: '7' }).map((c) => c.id)).toEqual(['94']);
    expect(filterCohorts(rows, { ...none, month: '2025-12' }).map((c) => c.id)).toEqual(['80']);
    expect(filterCohorts(rows, { ...none, status: 'upcoming' }).map((c) => c.id)).toEqual(['101']);
    expect(filterCohorts(rows, { ...none, search: 'thasneem' }).map((c) => c.id)).toEqual(['80']);
    expect(filterCohorts(rows, { ...none, search: 'pg diploma' }).map((c) => c.id)).toEqual(['94']);
  });

  test('tabs: upcoming cohorts only appear under All', () => {
    expect(cohortTabCounts(rows)).toEqual({ active: 1, completed: 1, all: 3 });
    expect(filterCohorts(rows, { ...none, tab: 'active' }).map((c) => c.id)).toEqual(['94']);
  });

  test('cohort id sorts numerically', () => {
    expect(sortCohorts(rows, 'cohortId', 'asc').map((c) => c.id)).toEqual(['80', '94', '101']);
    expect(sortCohorts(rows, 'students', 'desc').map((c) => c.id)).toEqual(['80', '94', '101']);
  });

  test('csv lists every program', () => {
    expect(cohortCsvRows(rows.slice(0, 1))[1]).toContain('Diploma; PG Diploma');
  });
});

describe('shared list helpers', () => {
  test('dates are read from their digits, never shifted by timezone', () => {
    expect(ymdOf('2026-09-01T00:00:00.000Z')).toBe('2026-09-01');
    expect(ymdOf(null)).toBe('');
    expect(dmy('2026-09-01')).toBe('01/09/2026');
    expect(monthLabel('2026-07')).toBe('Jul 2026');
    expect(dayMonthYear('2026-03-14T00:00:00.000Z')).toBe('14 Mar 2026');
  });

  test('TIME columns read as IST wall clock', () => {
    expect(hhmmOf('1970-01-01T19:30:00.000Z')).toBe('19:30');
    expect(hhmmOf('9:05:00')).toBe('09:05');
    expect(to12h('19:30')).toBe('7:30 PM');
    expect(to12h('00:15')).toBe('12:15 AM');
  });

  test('IST instants and today', () => {
    expect(istInstantMs('2026-07-14', '19:30')).toBe(Date.UTC(2026, 6, 14, 14, 0));
    expect(istInstantMs('bad', '19:30')).toBeNull();
    // 20:00 UTC on 13 Jul is already 14 Jul in India.
    expect(istTodayYmd(Date.UTC(2026, 6, 13, 20, 0))).toBe('2026-07-14');
  });

  test('sorting and paging', () => {
    expect(nextSort({ key: 'a', dir: 'asc' }, 'a')).toEqual({ key: 'a', dir: 'desc' });
    expect(nextSort<'a' | 'b'>({ key: 'a', dir: 'desc' }, 'b')).toEqual({ key: 'b', dir: 'asc' });
    expect(pageSlice([1, 2, 3, 4, 5], 9, 2)).toEqual({ current: [5], page: 3, pages: 3 });
    expect(pageSlice([], 1, 10)).toEqual({ current: [], page: 1, pages: 1 });
  });
});
