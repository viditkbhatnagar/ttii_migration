import { describe, expect, it } from 'vitest';
import {
  addableStudents, autoNameAndCode, cohortFormError, cohortStatusOf, filterCohorts, monthTag, sessionFormError, sortCohorts,
  subjectsForCourse, toCohortDetail, toCohortOptions, toCohortRows, ymdOf, EMPTY_COHORT_FILTERS, EMPTY_COHORT_FORM, EMPTY_SESSION_FORM,
} from '../src/centre/pages/cohorts/cohort-model';

describe('cohort status (IST calendar days)', () => {
  it('is upcoming before the start, completed after the end, else running', () => {
    expect(cohortStatusOf('2026-11-01', '2026-12-01', '2026-10-22')).toBe('upcoming');
    expect(cohortStatusOf('2026-09-01', '2026-10-21', '2026-10-22')).toBe('completed');
    expect(cohortStatusOf('2026-10-22', '2026-10-22', '2026-10-22')).toBe('running');
    expect(cohortStatusOf('', '', '2026-10-22')).toBe('running');
  });
  it('reads a stored date without timezone shifts', () => expect(ymdOf('2026-10-17T00:00:00.000Z')).toBe('2026-10-17'));
});

describe('cohort rows', () => {
  const rows = toCohortRows(
    [
      { id: 9, cohort_id: 'COH-9', title: 'Nursery - OCT26', course_name: 'Montessori', subject_name: 'Nursery', language_id: 2, instructor_name: 'Laila', start_date: '2026-10-01T00:00:00.000Z', end_date: '2026-12-01T00:00:00.000Z', students_count: 4, lives_classes_count: 2 },
      { id: 10, cohort_id: 'COH-10', title: 'Early Years', course_name: 'Early Years', subject_name: '', language_id: null, instructor_name: '', start_date: '2027-01-01T00:00:00.000Z', end_date: '2027-03-01T00:00:00.000Z', students_count: 0, lives_classes_count: 0 },
    ],
    [{ id: '2', title: 'Malayalam' }],
    '2026-10-22',
  );
  it('maps names, language and status', () => {
    expect(rows[0]).toMatchObject({ cid: 'C9', language: 'Malayalam', status: 'running', students: 4, liveClasses: 2 });
    expect(rows[1]).toMatchObject({ status: 'upcoming', language: '' });
  });
  it('filters by tab, search, instructor', () => {
    const f = (patch: object) => filterCohorts(rows, { ...EMPTY_COHORT_FILTERS, ...patch }).map((r) => r.id);
    expect(f({ tab: 'upcoming' })).toEqual(['10']);
    expect(f({ search: 'laila nursery' })).toEqual(['9']);
    expect(f({ instructor: 'Laila' })).toEqual(['9']);
  });
  it('sorts the cohort id numerically', () => {
    expect(sortCohorts(rows, 'cid', 'desc').map((r) => r.id)).toEqual(['10', '9']);
    expect(sortCohorts(rows, 'cid', 'asc').map((r) => r.id)).toEqual(['9', '10']);
  });
});

describe('Add Cohort form', () => {
  const options = toCohortOptions({
    courses: [{ id: 1, title: 'Montessori' }, { id: 2, title: 'EYE' }],
    subjects: [{ id: 5, title: 'Nursery', courseIds: [1] }, { id: 6, title: 'Art', courseIds: [2] }],
    instructors: [], languages: [],
  });
  it('offers only the subjects of the chosen course', () => {
    expect(subjectsForCourse(options, '1').map((s) => s.id)).toEqual(['5']);
    expect(subjectsForCourse(options, '').length).toBe(2);
  });
  it('generates the design name and code', () => {
    expect(monthTag('2026-10-17')).toBe('OCT26');
    expect(monthTag('bad')).toBe('');
    expect(autoNameAndCode('Child Development Basics', '2026-10-17')).toEqual({ name: 'Child Development Basics – OCT26', code: 'CDBOCT26' });
    expect(autoNameAndCode('', '2026-10-17')).toEqual({ name: '', code: '' });
  });
  it('validates required fields and date order', () => {
    const base = { ...EMPTY_COHORT_FORM, courseId: '1', subjectId: '5', instructorId: '3', languageId: '2', startDate: '2026-10-01', endDate: '2026-12-01' };
    expect(cohortFormError(base)).toBeNull();
    expect(cohortFormError({ ...base, courseId: '' })).toMatch(/course/i);
    expect(cohortFormError({ ...base, subjectId: '' })).toMatch(/subject/i);
    expect(cohortFormError({ ...base, type: 'course', subjectId: '' })).toBeNull();
    expect(cohortFormError({ ...base, endDate: '2026-09-01' })).toMatch(/on or after/i);
  });
});

describe('live session form', () => {
  const ok = { ...EMPTY_SESSION_FORM, title: 'Week 1', dateYmd: '2026-10-25', from: '14:00', to: '15:00', link: 'https://teams.microsoft.com/l/x' };
  it('accepts a valid session and refuses past dates, bad times and bad links', () => {
    expect(sessionFormError(ok, '2026-10-22')).toBeNull();
    expect(sessionFormError({ ...ok, dateYmd: '2026-10-21' }, '2026-10-22')).toMatch(/past/i);
    expect(sessionFormError({ ...ok, to: '13:00' }, '2026-10-22')).toMatch(/after/i);
    expect(sessionFormError({ ...ok, link: 'javascript:1' }, '2026-10-22')).toMatch(/link/i);
    expect(sessionFormError({ ...ok, platform: 'teams', link: '' }, '2026-10-22')).toBeNull();
  });
});

describe('cohort detail', () => {
  it('parses the view payload and drops non-http join links', () => {
    const d = toCohortDetail({
      today: '2026-10-22',
      cohort: { id: 9, cid: 'C9', status: 'upcoming', courses: ['A'], hasInstructor: true },
      learners: [{ id: 1, name: 'Asha', studentCode: 'TTS1' }],
      liveClasses: [{ id: 4, title: 'W1', joinUrl: 'javascript:alert(1)', state: 'completed' }, { id: 5, title: 'W2', joinUrl: 'https://z.us/j/1' }],
      assignments: [{ id: 1, title: 'T', totalMarks: 10, submissions: 3 }],
      announcements: [],
    });
    expect(d.status).toBe('upcoming');
    expect(d.sessions[0]).toMatchObject({ joinUrl: '', state: 'completed' });
    expect(d.sessions[1]).toMatchObject({ joinUrl: 'https://z.us/j/1', state: 'scheduled' });
    expect(d.assignments[0]?.totalMarks).toBe(10);
  });
  it('lists only centre students not already in the cohort, once each', () => {
    const out = addableStudents(
      [{ id: 1, name: 'Asha' }, { id: 2, name: 'Bina', student_id: 'TTS2' }, { id: 2, name: 'Bina' }, { id: 3, name: 'Cara' }],
      [{ id: '1', name: 'Asha', studentCode: '' }],
    );
    expect(out.map((s) => s.id)).toEqual(['2', '3']);
  });
});
