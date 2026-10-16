import { describe, expect, test } from 'vitest';

import {
  allocationError,
  emptyDraft,
  extractTime,
  filterStudents,
  firstScheduleError,
  formatMinutes,
  minutesBetween,
  parseFlag,
  patchScheduleRow,
  scheduleRowErrors,
  suggestedScheduleRow,
  toScheduleRow,
  validateStep1,
  windowDays,
  type ExamWindow,
  type ScheduleRow,
} from '../src/admin/pages/exam/wizard/wizard-model';
import {
  componentsPayload,
  subjectSetupIssues,
  summariseSubject,
  type ComponentRow,
} from '../src/admin/pages/exam/wizard/question-setup-model';
import {
  autoFillSelection,
  bankCounts,
  buildSections,
  orderBySections,
  planPickFor,
  preferFresh,
  reusedCount,
  sectionStats,
  type QuestionOption,
  type SubjectPlan,
} from '../src/admin/pages/exam/wizard/question-assign-model';
import { buildReviewSummary, publishConfirmMessage } from '../src/admin/pages/exam/wizard/review-model';

const win: ExamWindow = { from_date: '2026-10-28', to_date: '2026-10-30', from_time: '10:00', to_time: '13:00' };

const row = (patch: Partial<ScheduleRow> = {}): ScheduleRow => ({
  id: 1, subject_id: 5, subject_title: 'Child Psychology', course_ids: '16', available_courses: 'Diploma',
  exam_date: '2026-10-28', start_time: '10:00', end_time: '13:00', duration_minutes: 180, total_marks: 100, pass_marks: 40,
  ...patch,
});

describe('step 1', () => {
  test('validateStep1 names the first missing field', () => {
    expect(validateStep1(emptyDraft)).toBe('Exam title is required.');
    const ok = { ...emptyDraft, title: 'T', course_ids: ['16'], from_date: '2026-10-28', to_date: '2026-10-30', from_time: '10:00', to_time: '13:00', duration_minutes: 10 };
    expect(validateStep1(ok)).toBeNull();
    expect(validateStep1({ ...ok, course_ids: [] })).toBe('Pick at least one course.');
    expect(validateStep1({ ...ok, duration_minutes: 0 })).toBe('End time must be after start time.');
  });

  test('minutesBetween spans days and refuses blanks', () => {
    expect(minutesBetween('2026-10-28', '10:00', '2026-10-28', '13:00')).toBe(180);
    expect(minutesBetween('2026-10-28', '10:00', '2026-10-29', '10:00')).toBe(1440);
    expect(minutesBetween('2026-10-28', '13:00', '2026-10-28', '10:00')).toBe(0);
    expect(minutesBetween('', '10:00', '2026-10-28', '13:00')).toBeNull();
  });

  test('extractTime reads the API time and parseFlag tolerates the legacy driver', () => {
    expect(extractTime('1970-01-01T09:30:00.000Z')).toBe('09:30');
    expect(extractTime('2026-10-28')).toBe('');
    expect([true, 1, '1', 'true'].map(parseFlag)).toEqual([true, true, true, true]);
    expect([false, 0, '0', null, undefined].map(parseFlag)).toEqual([false, false, false, false, false]);
  });

  test('formatMinutes', () => {
    expect(formatMinutes(0)).toBe('');
    expect(formatMinutes(45)).toBe('45 min');
    expect(formatMinutes(120)).toBe('2 h');
    expect(formatMinutes(90)).toBe('1 h 30 min');
  });
});

describe('step 2 scheduling', () => {
  test('windowDays is inclusive, timezone-proof and empty for a reversed window', () => {
    expect(windowDays('2026-10-30', '2026-11-02')).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
    expect(windowDays('2026-11-02', '2026-10-30')).toEqual([]);
    expect(windowDays('', '2026-10-30')).toEqual([]);
  });

  test('a suggested row starts on the next window day at the Step 1 session times', () => {
    const s = { subject_id: 7, subject_title: 'Sensorial', course_ids: '16', available_courses: 'Diploma' };
    expect(suggestedScheduleRow(s, 0, win)).toMatchObject({ exam_date: '2026-10-28', start_time: '10:00', end_time: '13:00', duration_minutes: 180, total_marks: 100, pass_marks: 40 });
    expect(suggestedScheduleRow(s, 1, win).exam_date).toBe('2026-10-29');
    // More subjects than days: the rest go on the last day.
    expect(suggestedScheduleRow(s, 9, win).exam_date).toBe('2026-10-30');
    // A window ending earlier in the day than it starts gives no same-day session.
    expect(suggestedScheduleRow(s, 0, { ...win, from_time: '14:00', to_time: '10:00' })).toMatchObject({ start_time: '', end_time: '', duration_minutes: 0 });
    expect(suggestedScheduleRow(s, 0, { ...win, from_date: '' })).toMatchObject({ exam_date: '', duration_minutes: 0 });
  });

  test('patchScheduleRow recomputes duration only from a complete date + times', () => {
    expect(patchScheduleRow(row(), { end_time: '11:30' }).duration_minutes).toBe(90);
    expect(patchScheduleRow(row(), { total_marks: 50 }).duration_minutes).toBe(180);
    expect(patchScheduleRow(row(), { exam_date: '' }).duration_minutes).toBe(180);
  });

  test('scheduleRowErrors: window, end after start, pass within total; blanks allowed', () => {
    expect(scheduleRowErrors(row(), win)).toEqual([]);
    expect(scheduleRowErrors(row({ exam_date: '' , start_time: '', end_time: '' }), win)).toEqual([]);
    expect(scheduleRowErrors(row({ exam_date: '2026-10-31' }), win)).toEqual(['Date is outside the exam window.']);
    expect(scheduleRowErrors(row({ exam_date: '2026-10-27' }), win)).toEqual(['Date is outside the exam window.']);
    expect(scheduleRowErrors(row({ end_time: '09:00' }), win)).toEqual(['End time must be after start time.']);
    expect(scheduleRowErrors(row({ pass_marks: 120 }), win)).toEqual(['Pass marks cannot exceed total marks.']);
    // No Step 1 window known: the date isn't judged.
    expect(scheduleRowErrors(row({ exam_date: '2030-01-01' }), { ...win, from_date: '' })).toEqual([]);
    expect(firstScheduleError([row(), row({ subject_title: 'Language', pass_marks: 101 })], win)).toBe('Language: Pass marks cannot exceed total marks.');
    expect(firstScheduleError([row()], win)).toBeNull();
  });

  test('toScheduleRow maps the saved schedule', () => {
    expect(toScheduleRow({ id: 3, subject_id: 0, subject_title: 'X', exam_date: '2026-10-28T00:00:00.000Z', start_time: '1970-01-01T10:00:00.000Z', end_time: '1970-01-01T12:00:00.000Z', duration_minutes: 120, total_marks: 50, pass_marks: 20 }))
      .toMatchObject({ id: 3, subject_id: null, exam_date: '2026-10-28', start_time: '10:00', end_time: '12:00' });
  });
});

describe('step 5 allocation', () => {
  const students = [
    { user_id: 1, student_id: 'TTS0058', name: 'Shifa', email: 'shifa@x.in', courses: 'Diploma' },
    { user_id: 2, student_id: 'TTS0088', name: 'Sophia', email: '9876543210', courses: 'PG Diploma' },
  ];
  test('search covers name, email, student id and course', () => {
    expect(filterStudents(students, '').length).toBe(2);
    expect(filterStudents(students, 'tts0088').map((s) => s.user_id)).toEqual([2]);
    expect(filterStudents(students, 'pg dip').map((s) => s.user_id)).toEqual([2]);
    expect(filterStudents(students, '98765').map((s) => s.user_id)).toEqual([2]);
  });
  test('at least one student is required to move on', () => {
    expect(allocationError(0)).toMatch(/at least one student/);
    expect(allocationError(3)).toBeNull();
  });
});

const comp = (patch: Partial<ComponentRow>): ComponentRow => ({
  uid: 'u', exam_subject_id: 1, subject_title: 'S', component_type: 'mcq', configured: true, num_questions: 10, marks_each: 2,
  negative_marks: 0, shuffle_questions: false, shuffle_options: false, word_limit: 0, default_questions: 50, ...patch,
});

describe('step 3 question setup', () => {
  test('an unconfigured row counts (and saves) as its default', () => {
    const rows = [comp({ configured: false, num_questions: 99 }), comp({ component_type: 'descriptive', num_questions: 2, marks_each: 5 })];
    expect(summariseSubject(rows)).toEqual({ mcqCount: 50, descriptiveCount: 2, questions: 52, plannedMarks: 110 });
    expect(componentsPayload(rows)[0]).toEqual({ exam_subject_id: 1, component_type: 'mcq', num_questions: 50, marks_each: 2, negative_marks: 0, shuffle_questions: 0, shuffle_options: 0, word_limit: 0 });
  });

  test('flags marks that miss the Step 2 total and a short bank', () => {
    const summary = summariseSubject([comp({ num_questions: 40, marks_each: 2 })]);
    expect(subjectSetupIssues(summary, 80, { mcq: 60, descriptive: 0 })).toEqual({ marksMismatch: null, bankShort: [] });
    const issues = subjectSetupIssues(summary, 90, { mcq: 30, descriptive: 0 });
    expect(issues.marksMismatch).toMatch(/80.*90/);
    expect(issues.bankShort).toEqual(['Only 30 MCQ questions in the bank (planned 40).']);
    // No total marks or no bank listing: nothing to compare against.
    expect(subjectSetupIssues(summary, 0, null)).toEqual({ marksMismatch: null, bankShort: [] });
  });
});

const opt = (id: number, patch: Partial<QuestionOption> = {}): QuestionOption => ({
  id, title: `Q${id}`, subject_id: 5, subject_title: 'Child Psychology', exam_subject_id: 1, q_type: 0, in_scheduled_subject: true, ...patch,
});
const plan = (patch: Partial<SubjectPlan> = {}): SubjectPlan => ({
  exam_subject_id: 1, subject_id: 5, subject_title: 'Child Psychology', mcq_target: 2, descriptive_target: 1, total_target: 3,
  total_marks: 5, mcq_marks_each: 1, mcq_negative_marks: 0, ...patch,
});

describe('step 4 assign questions', () => {
  const options = [opt(1), opt(2), opt(3, { q_type: 1 }), opt(4), opt(9, { exam_subject_id: null, subject_id: 77, in_scheduled_subject: false })];

  test('sections follow the plan and strays get their own bucket', () => {
    const sections = buildSections(options, [plan()]);
    expect(sections.map((s) => s.key)).toEqual(['plan-1', 'not-scheduled']);
    expect(sections[0]?.items.map((o) => o.id)).toEqual([1, 2, 3, 4]);
    expect(bankCounts(sections[0]?.items ?? [])).toEqual({ mcq: 3, descriptive: 1 });
  });

  test('plan pick takes the first N per type and reports a shortfall', () => {
    const [s] = buildSections(options, [plan({ descriptive_target: 2 })]);
    const pick = planPickFor(s!, 1);
    expect(pick.ids).toEqual([1, 2, 3]);
    expect(pick.parts).toEqual([{ label: 'MCQ', wanted: 2, got: 2 }, { label: 'descriptive', wanted: 2, got: 1 }]);
    const filled = autoFillSelection(buildSections(options, [plan({ descriptive_target: 2 })]), 1);
    expect(filled).toMatchObject({ picked: 3, shortfall: 1 });
  });

  test('orderBySections keeps Step 2 order and parks unknown ids at the end', () => {
    const sections = buildSections(options, [plan()]);
    const ordered = orderBySections(sections, new Map([[4, 1], [999, 2], [1, 1]]));
    expect([...ordered.keys()]).toEqual([1, 4, 999]);
    expect(sectionStats(sections[0]!, ordered)).toEqual({ count: 2, marks: 2 });
  });

  // TTII 2026-10-16 — a supplementary exam should not repeat the regular paper.
  test('a supplementary exam auto-fills questions NOT on the regular paper first', () => {
    const regularPaper = new Set([1, 2]);
    const fresh = preferFresh(options, regularPaper);
    expect(fresh.map((o) => o.id)).toEqual([3, 4, 9, 1, 2]);
    const filled = autoFillSelection(buildSections(fresh, [plan()]), 1);
    // 2 MCQ wanted: only one fresh MCQ (4) exists, so one regular-paper question (1) is used — and counted.
    expect([...filled.selection.keys()].sort()).toEqual([1, 3, 4]);
    expect(reusedCount(filled.selection, regularPaper)).toBe(1);
  });

  test('without a regular paper to avoid, the order is untouched', () => {
    expect(preferFresh(options, new Set())).toBe(options);
    expect(reusedCount(new Map([[1, 1]]), new Set())).toBe(0);
  });
});

describe('review summary', () => {
  const base = {
    schedule: [row({ id: 1 }), row({ id: 2, subject_title: 'Language', exam_date: '', start_time: '' })],
    plans: [plan(), plan({ exam_subject_id: 2, subject_id: 6, subject_title: 'Language', total_target: 0, mcq_target: 0, descriptive_target: 0 })],
    options: [opt(1), opt(2), opt(3, { q_type: 1 })],
    assigned: [{ question_id: 1, deleted: false }, { question_id: 2, deleted: false }, { question_id: 50, deleted: true }],
    allocatedCount: 12,
    notifyEmail: true,
    notifyInapp: true,
    isPublished: false,
    resendNotification: false,
  };

  test('summarises subjects, questions and who gets emailed, with issues', () => {
    const s = buildReviewSummary(base);
    expect(s.subjects.map((r) => [r.title, r.planned, r.assigned])).toEqual([['Child Psychology', 3, 2], ['Language', 0, 0]]);
    expect(s).toMatchObject({ totalMarks: 200, plannedQuestions: 3, assignedQuestions: 2, deletedQuestions: 1, allocatedCount: 12, emailRecipients: 12 });
    expect(s.issues).toEqual([
      'Missing date or time for Language — publishing will be refused until Step 2 is complete.',
      'Child Psychology: 2 of 3 planned questions assigned.',
      '1 saved question was deleted from the Question Bank — re-run Auto-fill in Step 4.',
    ]);
  });

  test('a re-publish emails only when re-send is on', () => {
    expect(buildReviewSummary({ ...base, isPublished: true }).emailRecipients).toBe(0);
    expect(buildReviewSummary({ ...base, isPublished: true, resendNotification: true }).emailRecipients).toBe(12);
    expect(buildReviewSummary({ ...base, notifyEmail: false }).emailRecipients).toBe(0);
  });

  test('the publish confirmation says exactly who is emailed', () => {
    const s = buildReviewSummary(base);
    expect(publishConfirmMessage(s, false, true)).toBe('This makes the exam live as 2 subject sittings for 12 allocated students. 12 students will be emailed the exam schedule now. This cannot be undone.');
    const re = buildReviewSummary({ ...base, isPublished: true });
    expect(publishConfirmMessage(re, true, true)).toMatch(/^This updates the live exam and its 2 subject sittings\. No emails will be sent/);
    expect(publishConfirmMessage(buildReviewSummary({ ...base, notifyEmail: false }), false, false)).toMatch(/Email notification is off/);
    expect(publishConfirmMessage(buildReviewSummary({ ...base, allocatedCount: 0 }), false, true)).toMatch(/No students are allocated/);
  });
});
