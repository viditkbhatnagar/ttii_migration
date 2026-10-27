import { describe, expect, test } from 'vitest';

import type { Sitting, StudentResult, StudentSitting } from '../src/admin/pages/exam_result/exam-results-model';
import {
  buildBatchItems, canSubmit, eligibleSubjects, errorsByExam, initialDrafts, subjectProblem, tickedStudentCount,
  toggleStudent, updateDraft,
} from '../src/admin/pages/re_exam/create-re-exam-model';

// Naji 2026-10-27 — Create Re-exam for the whole exam: which subjects are listed,
// what is pre-ticked, and when the form may be submitted.

const sitting = (examId: number, closed = true): Sitting => ({ examId, subjectTitle: `Subject ${examId}`, date: '2026-08-11', totalMarks: 70, passMarks: 25, closed });
const cell = (examId: number, over: Partial<StudentSitting>): StudentSitting => ({
  examId, status: 'pass', score: 60, totalMarks: 70, passMarks: 25, answered: 60, questionCount: 70, minutesTaken: 40,
  flag: null, reExam: null, previousScore: null, ...over,
});
const student = (userId: number, cells: StudentSitting[]): StudentResult => ({
  userId, name: `Student ${userId}`, studentCode: `TTS${userId}`, sittings: cells,
  obtained: 0, maxMarks: 140, percentage: 0, subjectsPassed: 0, subjectsTotal: cells.length,
} as unknown as StudentResult);

const sittings = [sitting(1), sitting(2), sitting(3, false), sitting(4)];
const students = [
  student(10, [cell(1, { status: 'absent', score: null }), cell(2, { status: 'pass' }), cell(3, { status: 'absent', score: null }), cell(4, { status: 'pass' })]),
  student(11, [cell(1, { status: 'pass' }), cell(2, { status: 'fail', score: 10 }), cell(3, { status: 'pass' }), cell(4, { status: 'pass' })]),
];

describe('eligibleSubjects', () => {
  test('lists closed subjects that have a candidate, skipping open sittings and clean subjects', () => {
    const subjects = eligibleSubjects(sittings, students);
    expect(subjects.map((s) => s.examId)).toEqual([1, 2]);
    expect(subjects[1]?.candidates.map((c) => c.userId)).toEqual([11]);
  });

  test('nothing eligible gives an empty list', () => {
    expect(eligibleSubjects([sitting(1, false)], students)).toEqual([]);
  });
});

describe('drafts', () => {
  const subjects = eligibleSubjects(sittings, students);

  test('a subject is ticked by default only when it has a pre-ticked candidate (a plain fail is not)', () => {
    const drafts = initialDrafts(subjects);
    expect(drafts[1]?.included).toBe(true);
    expect([...(drafts[1]?.selected ?? [])]).toEqual([10]);
    expect(drafts[2]?.included).toBe(false);
    expect(drafts[2]?.selected.size).toBe(0);
  });

  test('the count is ticked students across ticked subjects only', () => {
    let drafts = initialDrafts(subjects);
    expect(tickedStudentCount(subjects, drafts)).toBe(1);
    drafts = toggleStudent(updateDraft(drafts, 2, { included: true }), 2, 11);
    expect(tickedStudentCount(subjects, drafts)).toBe(2);
    drafts = updateDraft(drafts, 1, { included: false });
    expect(tickedStudentCount(subjects, drafts)).toBe(1);
  });

  test('submit needs every ticked subject to have students and a complete, ordered window', () => {
    let drafts = initialDrafts(subjects);
    expect(canSubmit(subjects, drafts)).toBe(false);
    drafts = updateDraft(drafts, 1, { date: '2026-11-02', startTime: '10:00', endTime: '09:00' });
    expect(subjectProblem(drafts[1]!)).toContain('end time');
    expect(canSubmit(subjects, drafts)).toBe(false);
    drafts = updateDraft(drafts, 1, { endTime: '11:30' });
    expect(canSubmit(subjects, drafts)).toBe(true);
    // Untick everything: nothing to submit.
    expect(canSubmit(subjects, updateDraft(drafts, 1, { included: false }))).toBe(false);
  });

  test('the payload carries ticked subjects and students, with the shared note only when given', () => {
    let drafts = updateDraft(initialDrafts(subjects), 1, { date: '2026-11-02', startTime: '10:00', endTime: '11:30' });
    expect(buildBatchItems(subjects, drafts, '  ')).toEqual([
      { exam_id: 1, user_ids: [10], date: '2026-11-02', start_time: '10:00', end_time: '11:30' },
    ]);
    drafts = updateDraft(drafts, 2, { included: true, selected: new Set([11]), date: '2026-11-03', startTime: '10:00', endTime: '11:30' });
    const items = buildBatchItems(subjects, drafts, ' Free re-exam ');
    expect(items.map((i) => i.exam_id)).toEqual([1, 2]);
    expect(items[1]).toMatchObject({ user_ids: [11], notes: 'Free re-exam' });
  });
});

describe('errorsByExam', () => {
  test('maps server errors to their subject and tolerates junk', () => {
    expect(errorsByExam([{ examId: 2, subjectTitle: 'x', message: 'Too short.' }, { examId: 2, message: 'Overlap.' }, null, { examId: 'z' }]))
      .toEqual({ 2: 'Too short. Overlap.' });
    expect(errorsByExam(undefined)).toEqual({});
  });
});
