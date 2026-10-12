import { describe, expect, test } from 'vitest';

import {
  EMPTY_ENROLMENT_FILTERS,
  enrolmentCsvRows,
  filterEnrolments,
  normalizeStatus,
  scopedOptions,
  sortEnrolments,
  statusCounts,
  toEnrolmentRows,
  toYmd,
} from '../src/admin/pages/enrollments/enrollments-list-model';

const rows = toEnrolmentRows([
  { id: 10, enrollment_id: 'TIDMTT1', enrollment_date: '2026-09-01', student_id: 1, student_name: 'Ananya', course_title: 'Diploma', course_offering: 'May 2026', combination_title: 'C1', course_fee: 25000, progress_percent: 40, enrollment_status: 'Active' },
  { id: 11, enrollment_id: 'TIDMTT2', enrollment_date: '', created_at: '2026-06-15T09:00:00', student_id: 2, student_name: 'Ravi', course_title: 'Diploma', course_offering: 'Jan 2026', combination_title: 'C2', course_fee: 0, progress_percent: 150, enrollment_status: 'dropped' },
  { id: 12, enrollment_id: 'TIDMTT3', enrollment_date: '03/10/2026', student_id: 3, student_name: 'Meera', course_title: 'PG Diploma', course_offering: '', combination_title: '', course_fee: null, progress_percent: null, enrollment_status: '' },
]);

describe('toEnrolmentRows', () => {
  test('normalises status, fee, progress and the free-text date', () => {
    expect(rows.map((r) => r.status)).toEqual(['Active', 'Dropout', 'Active']);
    expect(rows.map((r) => r.fee)).toEqual([25000, null, null]);
    expect(rows.map((r) => r.progress)).toEqual([40, 100, 0]);
    expect(rows.map((r) => r.date)).toEqual(['2026-09-01', '2026-06-15', '2026-10-03']);
  });
});

describe('toYmd', () => {
  test('never shifts a bare ISO date a day back', () => {
    expect(toYmd('2026-09-01')).toBe('2026-09-01');
    expect(toYmd('1-9-2026')).toBe('2026-09-01');
    expect(toYmd('garbage')).toBe('');
    expect(toYmd(null)).toBe('');
  });
});

describe('normalizeStatus', () => {
  test('maps legacy spellings onto the five labels', () => {
    expect(normalizeStatus('hold')).toBe('On Hold');
    expect(normalizeStatus('inactive')).toBe('Dropout');
    expect(normalizeStatus('graduate')).toBe('Graduated');
    expect(normalizeStatus('weird')).toBeNull();
  });
});

describe('filterEnrolments', () => {
  test('status tab, course and inclusive date bounds', () => {
    const f = (patch: Partial<typeof EMPTY_ENROLMENT_FILTERS>) => filterEnrolments(rows, { ...EMPTY_ENROLMENT_FILTERS, ...patch }).map((r) => r.id);
    expect(f({ tab: 'Dropout' })).toEqual(['11']);
    expect(f({ course: 'Diploma' })).toEqual(['10', '11']);
    expect(f({ from: '2026-09-01', to: '2026-10-03' })).toEqual(['10', '12']);
    expect(f({ search: 'tidmtt3' })).toEqual(['12']);
  });

  test('counts every status', () => {
    expect(statusCounts(rows)).toEqual({ all: 3, Active: 2, 'On Hold': 0, Dropout: 1, Completed: 0, Graduated: 0 });
  });

  test('offering options follow the course', () => {
    expect(scopedOptions(rows, { course: 'Diploma', offering: '' }).offerings).toEqual(['Jan 2026', 'May 2026']);
    expect(scopedOptions(rows, { course: 'Diploma', offering: 'May 2026' }).combinations).toEqual(['C1']);
  });
});

describe('sort + export', () => {
  test('numeric columns sort numerically, blanks last for text', () => {
    expect(sortEnrolments(rows, 'progress', 'desc').map((r) => r.id)).toEqual(['11', '10', '12']);
    expect(sortEnrolments(rows, 'offering', 'asc').map((r) => r.id)).toEqual(['11', '10', '12']);
  });

  test('CSV rows', () => {
    const csv = enrolmentCsvRows([rows[0]!], (ymd) => ymd);
    expect(csv[1]).toEqual(['TIDMTT1', '2026-09-01', 'Ananya', 'Diploma', 'May 2026', 'C1', 25000, 40, 'Active']);
  });
});
