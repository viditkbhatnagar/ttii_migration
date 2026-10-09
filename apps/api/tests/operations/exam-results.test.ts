import { describe, expect, test } from 'vitest';

import {
  computeExamResults,
  overallResult,
  type ResultAttempt,
  type ResultReExam,
  type ResultSitting,
  type ResultStudent,
} from '../../src/operations/exam-results.js';

// TTII 2026-10-08 — the Diploma Regular exam (10–14 Aug) had marks for every
// sitting but no result: no pass/fail, no absent, no overall outcome. The cases
// below are the shapes production actually holds (pass mark 25 of 70).

const sitting = (examId: number, closed = true, passMarks: number | null = 25): ResultSitting => ({
  examId, subjectTitle: `Subject ${examId}`, date: '2026-08-10', totalMarks: 70, passMarks, closed,
});

const student = (userId: number): ResultStudent => ({ userId, name: `Student ${userId}`, studentCode: `TTS${userId}` });

let nextAttemptId = 100;
const attempt = (userId: number, examId: number, score: number, opts: Partial<ResultAttempt> = {}): ResultAttempt => ({
  attemptId: nextAttemptId++,
  examId,
  userId,
  score,
  questionCount: 70,
  skipped: 10,
  submitted: true,
  startTime: new Date('2026-08-10T14:00:00Z'),
  endTime: new Date('2026-08-10T14:40:00Z'),
  createdAt: new Date('2026-08-10T14:00:00Z'),
  ...opts,
});

describe('a student result across subject sittings', () => {
  const sittings = [sitting(23), sitting(24), sitting(25)];

  test('passes only when every subject reaches its pass mark', () => {
    const sheet = computeExamResults(sittings, [student(1)], [attempt(1, 23, 70), attempt(1, 24, 25), attempt(1, 25, 64)]);

    const r = sheet.students[0];
    expect(r?.overall).toBe('passed');
    expect(r?.subjectsPassed).toBe(3);
    expect(r?.obtained).toBe(159);
    expect(r?.maxMarks).toBe(210);
  });

  test('one subject below the pass mark fails the exam (Archana: 17 of 70)', () => {
    const sheet = computeExamResults(sittings, [student(1)], [attempt(1, 23, 50), attempt(1, 24, 52), attempt(1, 25, 17)]);

    expect(sheet.students[0]?.overall).toBe('failed');
    expect(sheet.students[0]?.sittings.map((s) => s.status)).toEqual(['pass', 'pass', 'fail']);
  });

  test('a missed sitting after it closed is absent, and the exam is incomplete (Sameera)', () => {
    const sheet = computeExamResults(sittings, [student(1)], [attempt(1, 23, 70), attempt(1, 24, 66)]);

    expect(sheet.students[0]?.sittings[2]?.status).toBe('absent');
    expect(sheet.students[0]?.overall).toBe('incomplete');
  });

  test('a sitting that has not closed yet is pending, never absent (PG exam mid-way)', () => {
    const running = [sitting(29), sitting(30), sitting(32, false)];
    const sheet = computeExamResults(running, [student(1)], [attempt(1, 29, 67), attempt(1, 30, 66)]);

    expect(sheet.students[0]?.sittings[2]?.status).toBe('pending');
    expect(sheet.students[0]?.overall).toBe('pending');
    expect(sheet.allSittingsClosed).toBe(false);
  });

  test('missing every sitting is absent', () => {
    const sheet = computeExamResults(sittings, [student(1)], []);
    expect(sheet.students[0]?.overall).toBe('absent');
  });

  test('an opened-but-never-submitted paper counts as absent once the sitting closes', () => {
    const sheet = computeExamResults([sitting(23)], [student(1)], [attempt(1, 23, 0, { submitted: false })]);
    expect(sheet.students[0]?.sittings[0]?.status).toBe('absent');
  });

  test('the newest submitted attempt counts, so a re-sit replaces the first paper', () => {
    const first = attempt(1, 23, 0, { skipped: 70 });
    const resit = attempt(1, 23, 61);
    const sheet = computeExamResults([sitting(23)], [student(1)], [resit, first].reverse());

    expect(sheet.students[0]?.sittings[0]?.score).toBe(61);
    expect(sheet.students[0]?.sittings[0]?.status).toBe('pass');
  });

  test('without a pass mark the sitting shows marks only, never a guessed pass', () => {
    const sheet = computeExamResults([sitting(2, true, null)], [student(1)], [attempt(1, 2, 12)]);
    expect(sheet.students[0]?.sittings[0]?.status).toBe('marks_only');
    expect(sheet.students[0]?.overall).toBe('marks_only');
  });
});

describe('flagging papers that look like a technical failure', () => {
  test('0 answers in 2 minutes is flagged (Sheba, Child Psychology)', () => {
    const a = attempt(1, 24, 0, { skipped: 70, startTime: new Date('2026-08-11T14:02:47Z'), endTime: new Date('2026-08-11T14:04:54Z') });
    const cell = computeExamResults([sitting(24)], [student(1)], [a]).students[0]?.sittings[0];

    expect(cell?.flag).toBe('Only 0 of 70 answers saved in 2 min — possible technical issue');
    expect(cell?.status).toBe('fail');
  });

  test('0 answers after 83 minutes is still flagged (lost answers before autosave)', () => {
    const a = attempt(1, 23, 0, { skipped: 70, startTime: new Date('2026-08-10T14:40:09Z'), endTime: new Date('2026-08-10T16:03:00Z') });
    expect(computeExamResults([sitting(23)], [student(1)], [a]).students[0]?.sittings[0]?.flag).toMatch(/Only 0 of 70/);
  });

  test('a genuine weak paper is not flagged (16 of 70 answered)', () => {
    const a = attempt(1, 23, 7, { skipped: 54 });
    expect(computeExamResults([sitting(23)], [student(1)], [a]).students[0]?.sittings[0]?.flag).toBeNull();
  });
});

describe('exam totals and subject summary', () => {
  test('counts each outcome and the pass rate excludes the absent', () => {
    const sittings = [sitting(23), sitting(24)];
    const sheet = computeExamResults(
      sittings,
      [student(1), student(2), student(3), student(4)],
      [
        attempt(1, 23, 60), attempt(1, 24, 60),
        attempt(2, 23, 10), attempt(2, 24, 60),
        attempt(3, 23, 60),
      ],
    );

    expect(sheet.totals).toMatchObject({ students: 4, passed: 1, failed: 1, incomplete: 1, absent: 1, pending: 0 });
    expect(sheet.totals.passPercentage).toBe(33);
    expect(sheet.subjects[0]).toMatchObject({ passed: 2, failed: 1, absent: 1, averageMarks: 43.3, passPercentage: 67 });
    expect(sheet.allSittingsClosed).toBe(true);
  });
});

describe('overallResult precedence', () => {
  test('pending wins over everything; a fail outranks a miss', () => {
    expect(overallResult(['pass', 'pending', 'fail'])).toBe('pending');
    expect(overallResult(['fail', 'absent'])).toBe('failed');
    expect(overallResult([])).toBe('pending');
  });
});

describe('a re-exam replaces the original paper for that subject', () => {
  // Sheba sat Child Psychology on 11 Aug and saved 0 answers; TTII schedules a
  // re-exam on 20 Aug, decided on the 15th.
  const reExam = (closed = false): ResultReExam => ({
    id: 7, examId: 24, userId: 1, scheduledAt: new Date('2026-08-15T06:00:00Z'),
    date: '2026-08-20', startTime: '10:00', endTime: '11:30', closed,
  });
  const original = (): ResultAttempt => attempt(1, 24, 0, { skipped: 70 });
  const reExamPaper = (score: number): ResultAttempt => attempt(1, 24, score, {
    startTime: new Date('2026-08-20T04:30:00Z'),
    endTime: new Date('2026-08-20T05:30:00Z'),
    createdAt: new Date('2026-08-20T04:30:00Z'),
  });

  test('until it is sat the subject is re-exam pending, not the old fail', () => {
    const sheet = computeExamResults([sitting(23), sitting(24)], [student(1)], [attempt(1, 23, 68), original()], [reExam()]);
    const cell = sheet.students[0]?.sittings[1];

    expect(cell).toMatchObject({ status: 'reexam', score: null, previousScore: 0, reExam: { state: 'scheduled', date: '2026-08-20' } });
    expect(sheet.students[0]?.overall).toBe('reexam');
    expect(sheet.totals.reexam).toBe(1);
    expect(sheet.subjects[1]?.reexam).toBe(1);
  });

  test('once sat, the re-exam mark counts and the original is kept as the previous mark', () => {
    const sheet = computeExamResults([sitting(24)], [student(1)], [original(), reExamPaper(66)], [reExam()]);
    const cell = sheet.students[0]?.sittings[0];

    expect(cell).toMatchObject({ status: 'pass', score: 66, previousScore: 0, reExam: { state: 'completed' } });
    expect(cell?.flag).toBeNull();
    expect(sheet.students[0]?.overall).toBe('passed');
  });

  test('a re-exam window that passes unused is absent', () => {
    const sheet = computeExamResults([sitting(24)], [student(1)], [original()], [reExam(true)]);

    expect(sheet.students[0]?.sittings[0]).toMatchObject({ status: 'absent', reExam: { state: 'missed' }, previousScore: 0 });
  });

  test('another student on the same subject is unaffected', () => {
    const sheet = computeExamResults([sitting(24)], [student(1), student(2)], [original(), attempt(2, 24, 50)], [reExam()]);

    expect(sheet.students[1]?.sittings[0]).toMatchObject({ status: 'pass', reExam: null, previousScore: null });
  });
});
