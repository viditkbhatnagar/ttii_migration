import { describe, expect, test } from 'vitest';

import {
  EMPTY_STUDENT_FILTERS,
  displayEmail,
  distinctValues,
  filterStudents,
  initialsOf,
  sortStudents,
  studentCsvRows,
  tabCounts,
  toStudentRows,
  ymdDaysAgo,
} from '../src/admin/pages/students/students-list-model';

const rows = toStudentRows(
  [
    { id: 1, student_id: 'TTS0001', name: 'ANANYA RAO', user_email: 'ananya@x.in', phone: '9000000001', course_title: 'Diploma', enrolment_count: 2, status_label: 'Active', fee_status: 'Paid', disabled_at: null },
    { id: 2, student_id: 'TTS0002', name: 'ravi kumar', user_email: '', email: '+919000000002', phone: '9000000002', course_title: 'PG Diploma', status_label: 'Inactive', fee_status: 'Overdue', disabled_at: null },
    { id: 3, student_id: 'TTS0003', name: 'Meera', user_email: '', email: 'meera@legacy.in', phone: '9000000003', course_title: '', status_label: 'Active', disabled_at: '2026-09-01T00:00:00Z' },
  ],
  [
    { id: '1', gender: 'Female', city: 'Kochi', offering: 'May 2026', owner: 'Asha', joined: '2026-10-10' },
    { id: '2', gender: 'Male', city: 'Pune', offering: '', owner: 'Ravi', joined: '2026-06-01' },
  ],
);

describe('toStudentRows', () => {
  test('merges the directory extras and title-cases legacy names', () => {
    expect(rows[0]).toMatchObject({ id: '1', name: 'Ananya Rao', gender: 'Female', city: 'Kochi', owner: 'Asha', joined: '2026-10-10', enrolments: 2 });
    expect(rows[2]).toMatchObject({ gender: '', city: '', joined: '', enrolments: 0 });
  });

  test('a disabled login always reads Inactive; otherwise the server label stands', () => {
    expect(rows[2]!.statusLabel).toBe('Inactive');
    expect(rows[2]!.isInactive).toBe(true);
    // users.status says Inactive but the login is NOT disabled: badge keeps the
    // label, yet the Active/Inactive split is disabled_at only (as before).
    expect(rows[1]!.statusLabel).toBe('Inactive');
    expect(rows[1]!.isInactive).toBe(false);
  });
});

describe('displayEmail', () => {
  test('never shows a phone number stored in the legacy email column', () => {
    expect(displayEmail({ user_email: '', email: '+919000000002' })).toBe('');
    expect(displayEmail({ user_email: '', email: 'a@b.in' })).toBe('a@b.in');
    expect(displayEmail({ user_email: 'real@x.in', email: 'a@b.in' })).toBe('real@x.in');
  });
});

describe('filterStudents', () => {
  const now = new Date(2026, 9, 12);

  test('tabs split on the login toggle', () => {
    expect(tabCounts(rows)).toEqual({ all: 3, Active: 2, Inactive: 1 });
    expect(filterStudents(rows, { ...EMPTY_STUDENT_FILTERS, tab: 'Inactive' }, now).map((r) => r.id)).toEqual(['3']);
  });

  test('searches name, student ID, email and phone', () => {
    const f = (search: string) => filterStudents(rows, { ...EMPTY_STUDENT_FILTERS, search }, now).map((r) => r.id);
    expect(f('ravi')).toEqual(['2']);
    expect(f('tts0003')).toEqual(['3']);
    expect(f('ananya@')).toEqual(['1']);
    expect(f('0000002')).toEqual(['2']);
  });

  test('gender / city / owner / offering and the joined range', () => {
    expect(filterStudents(rows, { ...EMPTY_STUDENT_FILTERS, city: 'Pune' }, now).map((r) => r.id)).toEqual(['2']);
    expect(filterStudents(rows, { ...EMPTY_STUDENT_FILTERS, owner: 'Asha', gender: 'Female', offering: 'May 2026' }, now).map((r) => r.id)).toEqual(['1']);
    // Last 7 days drops the June joiner and the student with no join date.
    expect(filterStudents(rows, { ...EMPTY_STUDENT_FILTERS, range: '7' }, now).map((r) => r.id)).toEqual(['1']);
  });
});

describe('sortStudents', () => {
  test('sorts either way and keeps blanks at the bottom', () => {
    expect(sortStudents(rows, 'joined', 'desc').map((r) => r.id)).toEqual(['1', '2', '3']);
    expect(sortStudents(rows, 'joined', 'asc').map((r) => r.id)).toEqual(['2', '1', '3']);
    expect(sortStudents(rows, 'name', 'asc').map((r) => r.id)).toEqual(['1', '3', '2']);
  });
});

describe('helpers', () => {
  test('ymdDaysAgo builds a local date without a UTC parse', () => {
    expect(ymdDaysAgo(new Date(2026, 0, 3), 7)).toBe('2025-12-27');
  });

  test('initials and distinct values', () => {
    expect(initialsOf('Ananya Rao')).toBe('AR');
    expect(initialsOf('')).toBe('?');
    expect(distinctValues(rows, (r) => r.city)).toEqual(['Kochi', 'Pune']);
  });

  test('CSV carries the visible columns with dd/mm/yyyy dates', () => {
    const csv = studentCsvRows([rows[0]!], (ymd) => ymd.split('-').reverse().join('/'));
    expect(csv[0]).toContain('Fee Status');
    expect(csv[1]).toEqual(['TTS0001', 'Ananya Rao', '9000000001', 'ananya@x.in', 'Diploma', 2, 'May 2026', 'Kochi', 'Female', 'Asha', '10/10/2026', 'Paid', 'Active']);
  });
});
