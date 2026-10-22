import { describe, expect, test } from 'vitest';

import {
  DEFAULT_FILTERS, EMPTY_FORM, filterApplications, parseApplicationBoard, parseApplicationOptions, sortApplications, stateCounts,
  validateForm, wantsNewApplication,
} from '../src/centre/pages/applications/centre-applications-model';
import {
  DEFAULT_STUDENT_FILTERS, filterStudents, parseStudentBoard, parseStudentProfile, profileStatus, sortStudents, statusCounts, studentKpis, studentsCsv,
} from '../src/centre/pages/students/centre-students-model';
import { filterCourses, parseCourseBoard, parseCourseDetail, sortCourses } from '../src/centre/pages/courses/centre-courses-model';
import { addDaysYmd, fmtYmd, inr, pageSlice, pathId, sortBy, withinRange } from '../src/centre/pages/list-kit/list-kit-model';

const appRows = parseApplicationBoard({
  rows: [
    { id: 1, applicationId: 'APP-1', date: '2026-10-20', name: 'Asha', state: 'pending', courseId: 5, course: 'Diploma', offeringId: 9, offering: 'Oct', fee: null },
    { id: 2, applicationId: 'APP-2', date: '2026-09-01', name: 'Bilal', state: 'enrolled', courseId: 5, course: 'Diploma', offeringId: 9, offering: 'Oct', fee: '3,200', paid: 1000, studentCode: 'TTS1' },
    { id: 3, applicationId: 'APP-3', date: '2026-10-21', name: 'Chen', state: 'rejected', courseId: 6, course: 'PG', offeringId: 10, offering: 'Nov' },
    { name: 'no id' },
  ],
});

describe('centre applications model', () => {
  test('parses rows, drops id-less ones and keeps unknown fees null', () => {
    expect(appRows).toHaveLength(3);
    expect(appRows[0]?.fee).toBeNull();
    expect(appRows[1]?.fee).toBe(3200);
  });

  test('counts, filters and sorts on the real states', () => {
    expect(stateCounts(appRows)).toEqual({ all: 3, pending: 1, enrolled: 1, rejected: 1 });
    expect(filterApplications(appRows, { ...DEFAULT_FILTERS, stage: 'enrolled' }, '2026-10-22').map((r) => r.id)).toEqual(['2']);
    expect(filterApplications(appRows, { ...DEFAULT_FILTERS, query: 'tts1' }, '2026-10-22')).toHaveLength(1);
    expect(filterApplications(appRows, { ...DEFAULT_FILTERS, range: '7' }, '2026-10-22').map((r) => r.id)).toEqual(['1', '3']);
    expect(filterApplications(appRows, { ...DEFAULT_FILTERS, course: '6' }, '2026-10-22')).toHaveLength(1);
    expect(sortApplications(appRows, 'fee', 'desc').map((r) => r.id)).toEqual(['2', '1', '3']);
    expect(sortApplications(appRows, 'date', 'asc').map((r) => r.id)).toEqual(['2', '1', '3']);
  });

  test('?new=1 opens the add dialog', () => {
    expect(wantsNewApplication('?new=1')).toBe(true);
    expect(wantsNewApplication('?x=1')).toBe(false);
  });

  test('add form validation checks offering and combination belong to the course', () => {
    const courses = parseApplicationOptions({
      courses: [{
        id: 5, title: 'Diploma', planStatus: 'active',
        offerings: [{ id: 9, title: 'Oct', combinations: [{ id: 3, code: 'C1', partners: [] }] }],
      }],
    });
    const base = { ...EMPTY_FORM, name: 'Asha', phone: '9876543210', email: 'a@b.co', courseId: '5', offeringId: '9', combinationId: '3' };
    expect(validateForm(base, courses)).toBe('');
    expect(validateForm({ ...base, offeringId: '99' }, courses)).not.toBe('');
    expect(validateForm({ ...base, combinationId: '77' }, courses)).not.toBe('');
    expect(validateForm({ ...base, email: 'nope' }, courses)).not.toBe('');
    expect(validateForm({ ...base, courseId: '404' }, courses)).not.toBe('');
  });
});

const studentRows = parseStudentBoard({
  rows: [
    { id: 1, studentCode: 'TTS1', name: 'Asha', course: 'Diploma', offering: 'Oct', enrolledOn: '2026-10-01', fee: 3000, paid: 1000, balance: 2000, feeState: 'partial', status: 'Active' },
    { id: 2, studentCode: 'TTS2', name: 'Bilal', course: 'PG', offering: 'Nov', enrolledOn: '2026-05-01', fee: 0, paid: 0, feeState: 'no_plan', status: 'Graduated' },
    { id: 3, studentCode: 'TTS3', name: 'Chen', course: 'Diploma', offering: 'Oct', enrolledOn: '2026-10-10', fee: 5000, paid: 5000, feeState: 'paid', status: 'Dropout' },
  ],
});

describe('centre students model', () => {
  test('status tabs roll Graduated into Completed', () => {
    expect(statusCounts(studentRows)).toEqual({ all: 3, Active: 1, 'On Hold': 0, Dropout: 1, Completed: 1 });
    expect(studentKpis(studentRows)).toMatchObject({ total: 3, active: 1, completed: 1, paid: 6000 });
  });

  test('filters and sorts; unknown fees sort last', () => {
    expect(filterStudents(studentRows, { ...DEFAULT_STUDENT_FILTERS, tab: 'Completed' }, '2026-10-22').map((r) => r.id)).toEqual(['2']);
    expect(filterStudents(studentRows, { ...DEFAULT_STUDENT_FILTERS, course: 'Diploma', query: 'chen' }, '2026-10-22')).toHaveLength(1);
    expect(sortStudents(studentRows, 'fee', 'asc').map((r) => r.id)).toEqual(['1', '3', '2']);
    expect(sortStudents(studentRows, 'fee', 'desc').map((r) => r.id)).toEqual(['3', '1', '2']);
  });

  test('csv quotes commas', () => {
    const rows = parseStudentBoard({ rows: [{ id: 1, name: 'Doe, Jo', feeState: 'paid', status: 'Active' }] });
    expect(studentsCsv(rows).split('\n')[1]).toContain('"Doe, Jo"');
  });

  test('profile parses and rolls up enrolment status', () => {
    const p = parseStudentProfile({
      id: 1, name: 'Asha', enrolments: [{ id: 1, course: 'A', status: 'Completed' }, { id: 2, course: 'B', status: 'Active' }],
      payments: { fee: 100, paid: 40, balance: 60, status: 'partial', lines: [{ label: 'I1', amount: 100, status: 'due' }] },
    });
    expect(p?.payments.lines).toHaveLength(1);
    expect(p && profileStatus(p.enrolments)).toBe('Active');
    expect(parseStudentProfile({})).toBeNull();
  });
});

describe('centre courses model', () => {
  const rows = parseCourseBoard({
    rows: [
      { planId: 1, courseId: 5, course: 'Diploma', category: 'Teaching', centreFee: '12,000', status: 'active', combinations: [{ id: 1, code: 'CMB-A', partners: ['MSU'] }] },
      { planId: 2, courseId: 6, course: 'PG', category: 'Teaching', centreFee: null, status: 'expired', combinations: [] },
    ],
  });

  test('keeps the assigned amount and real combinations only', () => {
    expect(rows[0]?.centreFee).toBe(12000);
    expect(rows[1]?.centreFee).toBeNull();
    expect(rows[0]?.combinations[0]?.partners).toEqual(['MSU']);
  });

  test('filters and sorts', () => {
    expect(filterCourses(rows, 'cmb-a', 'all', 'all')).toHaveLength(1);
    expect(filterCourses(rows, '', 'all', 'expired').map((r) => r.courseId)).toEqual(['6']);
    expect(sortCourses(rows, 'centreFee', 'desc').map((r) => r.courseId)).toEqual(['5', '6']);
  });

  test('detail needs a course id', () => {
    expect(parseCourseDetail({})).toBeNull();
    expect(parseCourseDetail({ courseId: 5, course: 'X', planStatus: 'upcoming', plans: [{ planId: 1, centreFee: 10 }], offerings: [{ id: 1, open: true, capacity: 0 }] })?.offerings[0]?.capacity).toBeNull();
  });
});

describe('list kit helpers', () => {
  test('dates are IST calendar days, never UTC-shifted', () => {
    expect(addDaysYmd('2026-03-01', -1)).toBe('2026-02-28');
    expect(fmtYmd('2026-10-02')).toBe('02 Oct 2026');
    expect(withinRange('2026-10-16', '7', '2026-10-22')).toBe(true);
    expect(withinRange('2026-10-15', '7', '2026-10-22')).toBe(false);
    expect(withinRange('', 'all', '2026-10-22')).toBe(true);
  });
  test('misc', () => {
    expect(inr(null)).toBe('—');
    expect(inr(1234567)).toBe('₹12,34,567');
    expect(pathId('/centre/students/view/42/')).toBe('42');
    expect(pathId('/centre/students/view/x')).toBe('');
    expect(pageSlice([1, 2, 3], 9, 2)).toEqual({ page: 2, totalPages: 2, rows: [3] });
    expect(sortBy([{ v: null }, { v: 2 }, { v: 1 }], (r) => r.v, 'desc').map((r) => r.v)).toEqual([2, 1, null]);
  });
});
