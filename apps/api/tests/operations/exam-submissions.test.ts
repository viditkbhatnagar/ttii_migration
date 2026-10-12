import { describe, expect, test } from 'vitest';

import {
  ACTIVE_HEARTBEAT_MS,
  answerHasWork,
  autoSubmitKind,
  classifySubmission,
  countDraftAnswered,
  evaluationState,
  isPendingStatus,
  resultState,
  timeOfDaySeconds,
  type SubmissionAttempt,
} from '../../src/operations/exam-submissions.js';

// TTII 2026-10-12 — Exam Submissions. Where one student stands on one sitting,
// decided from rows already loaded. The sitting below is 5 Oct 2026,
// 10:00–11:30 AM IST, a 60-minute paper.

const IST = (5 * 60 + 30) * 60 * 1000;
/** An IST wall-clock instant. */
const ist = (y: number, mo: number, d: number, h: number, m = 0, s = 0): Date => new Date(Date.UTC(y, mo - 1, d, h, m, s) - IST);

const window = {
  from_date: new Date('2026-10-05T00:00:00Z'),
  from_time: new Date('1970-01-01T10:00:00Z'),
  to_date: new Date('2026-10-05T00:00:00Z'),
  to_time: new Date('1970-01-01T11:30:00Z'),
  duration: '60',
};

let nextId = 500;
function paper(over: Partial<SubmissionAttempt> = {}): SubmissionAttempt {
  const start = over.startTime ?? ist(2026, 10, 5, 10, 5);
  return {
    id: nextId++,
    createdAt: start,
    startTime: start,
    endTime: null,
    timeTakenSeconds: null,
    submitted: false,
    questionCount: 50,
    skipped: 0,
    draftAnswered: 0,
    lastSeenAt: null,
    ...over,
  };
}

/** A paper the student finished `minutes` after starting, with end_time `endLagSeconds` after that. */
function submitted(minutes: number, endLagSeconds = 0, over: Partial<SubmissionAttempt> = {}): SubmissionAttempt {
  const start = over.startTime ?? ist(2026, 10, 5, 10, 5);
  return paper({
    startTime: start,
    createdAt: start,
    submitted: true,
    timeTakenSeconds: minutes * 60,
    endTime: new Date(start.getTime() + minutes * 60_000 + endLagSeconds * 1000),
    skipped: 8,
    ...over,
  });
}

const classify = (attempts: SubmissionAttempt[], now: Date, reExamPending = false) =>
  classifySubmission({ window, attempts, reExamPending, nowMs: now.getTime() });

describe('before and during the window, with no paper', () => {
  test('allocated and the window has not opened → Scheduled', () => {
    const c = classify([], ist(2026, 10, 4, 18));
    expect(c).toMatchObject({ status: 'scheduled', missedReason: null, attempt: null });
    expect(new Date(c.openMs ?? 0).toISOString()).toBe('2026-10-05T04:30:00.000Z');
  });

  test('window open but not started is still Scheduled, not Missed', () => {
    expect(classify([], ist(2026, 10, 5, 11, 15)).status).toBe('scheduled');
  });

  test('window closed with no paper → Missed, never opened', () => {
    expect(classify([], ist(2026, 10, 5, 11, 31))).toMatchObject({ status: 'missed', missedReason: 'never_opened' });
  });

  test('…unless a re-exam for the sitting is still to come', () => {
    expect(classify([], ist(2026, 10, 6, 9), true)).toMatchObject({ status: 'reexam_pending', missedReason: 'never_opened' });
  });
});

describe('a paper still open', () => {
  test('running with a heartbeat in the last minute → In progress, active, answers counted from the draft', () => {
    const now = ist(2026, 10, 5, 10, 30);
    const p = paper({ lastSeenAt: new Date(now.getTime() - 20_000), draftAnswered: 12 });
    expect(classify([p], now)).toMatchObject({ status: 'in_progress', activity: 'active', answered: 12, questionCount: 50 });
  });

  test('no heartbeat for over a minute → idle', () => {
    const now = ist(2026, 10, 5, 10, 30);
    const p = paper({ lastSeenAt: new Date(now.getTime() - ACTIVE_HEARTBEAT_MS - 1000) });
    expect(classify([p], now).activity).toBe('idle');
    expect(classify([paper()], now).activity).toBe('idle');
  });

  test('stays In progress through the server auto-submit grace past its own deadline (11:05)', () => {
    const c = classify([paper({ draftAnswered: 3 })], ist(2026, 10, 5, 11, 9));
    expect(c.status).toBe('in_progress');
    expect(new Date(c.deadlineMs ?? 0).toISOString()).toBe(ist(2026, 10, 5, 11, 5).toISOString());
  });

  test('past deadline + grace with nothing answered → Missed, opened but nothing answered', () => {
    expect(classify([paper()], ist(2026, 10, 5, 11, 11))).toMatchObject({ status: 'missed', missedReason: 'nothing_answered' });
  });

  test('past deadline + grace with answers never finalised → Missed, not submitted', () => {
    expect(classify([paper({ draftAnswered: 9 })], ist(2026, 10, 5, 11, 11))).toMatchObject({ status: 'missed', missedReason: 'not_submitted', answered: 9 });
  });

  test('an unsubmitted attempt from March 2025 is NOT in progress', () => {
    const old = {
      from_date: new Date('2025-03-10T00:00:00Z'), from_time: new Date('1970-01-01T10:00:00Z'),
      to_date: new Date('2025-03-10T00:00:00Z'), to_time: new Date('1970-01-01T12:00:00Z'), duration: '90',
    };
    const p = paper({ startTime: ist(2025, 3, 10, 10, 10) });
    expect(classifySubmission({ window: old, attempts: [p], reExamPending: false, nowMs: ist(2026, 10, 12, 12).getTime() }).status).toBe('missed');
  });

  test('an untimed paper (no duration, no closing date) never expires', () => {
    const untimed = { ...window, to_date: null, to_time: null, duration: '' };
    const c = classifySubmission({ window: untimed, attempts: [paper()], reExamPending: false, nowMs: ist(2027, 1, 1, 0).getTime() });
    expect(c).toMatchObject({ status: 'in_progress', deadlineMs: null });
  });

  test('the newest paper decides: a live paper beats an older submitted one', () => {
    const older = submitted(30, 0, { id: 1 });
    const live = paper({ id: 2, startTime: ist(2026, 10, 5, 10, 50) });
    expect(classify([older, live], ist(2026, 10, 5, 11)).status).toBe('in_progress');
  });

  test('a stale open paper does not hide an older submitted one', () => {
    const older = submitted(30, 0, { id: 1 });
    const stale = paper({ id: 2 });
    const c = classify([older, stale], ist(2026, 10, 5, 12));
    expect(c).toMatchObject({ status: 'submitted' });
    expect(c.attempt?.id).toBe(1);
  });
});

describe('submitted papers and the auto-submit heuristic', () => {
  test('finished well before the deadline → Submitted; answered = issued − skipped', () => {
    expect(classify([submitted(40)], ist(2026, 10, 5, 12))).toMatchObject({ status: 'submitted', autoKind: null, answered: 42, questionCount: 50 });
  });

  test('end_time more than 90s after start + time_taken → Auto submitted (server)', () => {
    // Time taken clamps to the 11:05 deadline; the sweep finalised it at 11:12.
    expect(classify([submitted(60, 7 * 60)], ist(2026, 10, 5, 12))).toMatchObject({ status: 'auto_submitted', autoKind: 'server' });
  });

  test('a 90s gap is still within the late-submit grace', () => {
    expect(autoSubmitKind(window, submitted(40, 90))).toBeNull();
    expect(autoSubmitKind(window, submitted(40, 91))).toBe('server');
  });

  test('ran to its own deadline (start + duration) → Auto submitted (time up)', () => {
    expect(classify([submitted(60, 3)], ist(2026, 10, 5, 12))).toMatchObject({ status: 'auto_submitted', autoKind: 'time_up' });
    // Within 10s of the deadline counts as time up; a minute early does not.
    expect(autoSubmitKind(window, submitted(60, 0, { timeTakenSeconds: 3595 }))).toBe('time_up');
    expect(autoSubmitKind(window, submitted(59, 0))).toBeNull();
  });

  test('ran to the WINDOW close when that comes before start + duration → time up', () => {
    const late = ist(2026, 10, 5, 11, 0);
    expect(autoSubmitKind(window, submitted(30, 1, { startTime: late, createdAt: late }))).toBe('time_up');
  });

  test('papers before 2026-08-11 (no autosave or auto-submit yet) are always plain Submitted', () => {
    const aug = {
      from_date: new Date('2026-08-10T00:00:00Z'), from_time: new Date('1970-01-01T19:30:00Z'),
      to_date: new Date('2026-08-10T00:00:00Z'), to_time: new Date('1970-01-01T20:45:00Z'), duration: '75',
    };
    const start = ist(2026, 8, 10, 19, 30);
    const p = submitted(75, 600, { startTime: start, createdAt: start });
    expect(classifySubmission({ window: aug, attempts: [p], reExamPending: false, nowMs: ist(2026, 10, 1, 0).getTime() }))
      .toMatchObject({ status: 'submitted', autoKind: null });
  });

  test('missing timing data cannot be called auto submitted', () => {
    expect(autoSubmitKind(window, submitted(40, 0, { timeTakenSeconds: null }))).toBeNull();
    expect(autoSubmitKind(window, submitted(40, 0, { endTime: null }))).toBeNull();
  });

  test('a submitted paper is never reported as pending a re-exam', () => {
    expect(classify([submitted(40)], ist(2026, 10, 6, 0), true).status).toBe('submitted');
  });
});

describe('draft answer counting', () => {
  test('the player sends a row per question, blanks included — only answers count', () => {
    const draft = JSON.stringify([
      { question_id: '1', answer: ['2'] },
      { question_id: '2', answer: [] },
      { question_id: '3', answer: [''] },
      { question_id: '4', answer: ['A long written answer'] },
    ]);
    expect(countDraftAnswered(draft)).toBe(2);
  });

  test('reads the { writer, answers } envelope and the { id: answer } map', () => {
    expect(countDraftAnswered(JSON.stringify({ writer: 'abc.def', answers: [{ question_id: '1', answer: ['0'] }] }))).toBe(1);
    expect(countDraftAnswered(JSON.stringify({ 1: ['0'], 2: [], 3: 'text' }))).toBe(2);
  });

  test('later rows for the same question win; junk is zero', () => {
    expect(countDraftAnswered(JSON.stringify([{ question_id: '1', answer: ['1'] }, { question_id: '1', answer: [] }]))).toBe(0);
    expect(countDraftAnswered('not json')).toBe(0);
    expect(countDraftAnswered(null)).toBe(0);
    expect(countDraftAnswered('')).toBe(0);
  });

  test('answerHasWork reads stored JSON answer arrays', () => {
    expect(answerHasWork('["", " "]')).toBe(false);
    expect(answerHasWork('["essay"]')).toBe(true);
    expect(answerHasWork('[]')).toBe(false);
    expect(answerHasWork('plain text')).toBe(true);
    expect(answerHasWork(null)).toBe(false);
  });
});

describe('evaluation and result', () => {
  test('only submitted papers are evaluated; MCQ-only papers are auto-marked', () => {
    expect(evaluationState('missed', 0, 0)).toBe('none');
    expect(evaluationState('submitted', 0, 0)).toBe('auto');
    expect(evaluationState('auto_submitted', 2, 1)).toBe('pending');
    expect(evaluationState('submitted', 2, 2)).toBe('evaluated');
  });

  test('pass / fail only once results are published', () => {
    expect(resultState('submitted', 40, 25, false)).toBe('not_published');
    expect(resultState('submitted', 40, 25, true)).toBe('pass');
    expect(resultState('auto_submitted', 24.5, 25, true)).toBe('fail');
    expect(resultState('submitted', 40, null, true)).toBe('marks_only');
    expect(resultState('missed', null, 25, true)).toBe('absent');
    expect(resultState('reexam_pending', null, 25, true)).toBe('pending');
  });

  test('pending statuses', () => {
    expect(isPendingStatus('scheduled')).toBe(true);
    expect(isPendingStatus('in_progress')).toBe(true);
    expect(isPendingStatus('missed')).toBe(false);
  });

  test('time_taken is a @db.Time read with UTC getters', () => {
    expect(timeOfDaySeconds(new Date('1970-01-01T01:15:30Z'))).toBe(4530);
    expect(timeOfDaySeconds(null)).toBeNull();
  });
});
