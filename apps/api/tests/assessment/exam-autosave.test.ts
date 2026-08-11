import { afterEach, describe, expect, test, vi } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import {
  AssessmentService,
  examEffectiveEndMs,
  examWindowSnapshot,
} from '../../src/assessment/assessment-service.js';
import type { EmailProvider } from '../../src/integrations/contracts.js';

// Naji UAT 2026-08-11 — the 10 Aug 07:30–08:45 PM IST sitting.
//
// Three things failed at once and all three are exercised here: answers lived
// only in the browser (so a mid-exam 401 erased them), nothing autosaved them,
// and submitExamAttempt performed no window check at all, so one student
// submitted after 9 PM on an 08:45 PM window.
//
// Everything below runs against a hand-rolled Prisma stub rather than a live
// database (same pattern as tests/jobs/teams-artifacts-sync.test.ts): the logic
// under test is arithmetic and branching, and a stub makes the exact rows
// visible in the test itself.

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

/** The 10 Aug 2026 sitting, exactly as Prisma hands the columns back. */
function examWindowRow(overrides: Record<string, unknown> = {}) {
  return {
    // @db.Date and @db.Time come back anchored at UTC; the values are an IST
    // wall clock. 19:30–20:45 IST == 14:00–15:15 UTC.
    from_date: new Date('2026-08-10T00:00:00Z'),
    from_time: new Date('1970-01-01T19:30:00Z'),
    to_date: new Date('2026-08-10T00:00:00Z'),
    to_time: new Date('1970-01-01T20:45:00Z'),
    duration: '75',
    ...overrides,
  };
}

/** An IST wall clock on 10 Aug 2026 as a real UTC instant. */
function istOn10Aug(hour: number, minute: number, second = 0): Date {
  return new Date(Date.UTC(2026, 7, 10, hour, minute, second) - IST_OFFSET_MS);
}

/**
 * Adversarial review 2026-08-11 — pin the process clock to an IST wall clock.
 *
 * Every late-submit test in the original suite started on 10 Aug and ran
 * against the real Date.now() of 11 Aug, i.e. roughly ten hours past the
 * deadline: always outside LATE_SUBMIT_GRACE_MS, so the whole
 * [deadline, deadline + 90s] interval — where the autosave used to score a
 * paper ZERO — was never executed. Only `Date` is faked; the stub's promises
 * are plain resolved values and must keep settling normally.
 */
function freezeAt(hour: number, minute: number, second = 0): void {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(istOn10Aug(hour, minute, second));
}

/**
 * Adversarial review round 3 — the same, at an exact instant. The whole-second
 * helper cannot express `deadline - 900ms`, which is where the window used to
 * close early: Math.floor(0.9) is 0, so a paper with most of a second left
 * reported itself shut.
 */
function freezeAtInstant(instantMs: number): void {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(instantMs));
}

afterEach(() => {
  vi.useRealTimers();
});

const emailStub = {
  name: 'stub',
  sendEmail: () => Promise.resolve({ id: 'stub' }),
} as unknown as EmailProvider;

interface AttemptRow {
  id: number;
  user_id: number;
  exam_id: number;
  question_id: string;
  start_time: Date;
  submit_status: boolean;
  draft_answers: string | null;
  last_seen_at: Date | null;
  correct?: number | null;
  incorrect?: number | null;
  skip?: number | null;
  score?: number | null;
  time_taken?: Date | null;
}

interface StubState {
  attempt: AttemptRow;
  exam: Record<string, unknown>;
  attemptUpdates: Array<Record<string, unknown>>;
  answersWritten: Array<Record<string, unknown>>;
}

/**
 * Minimal Prisma stub covering exactly the reads and writes the autosave and
 * submit paths make. `question_bank` answers are 0-BASED repo-wide, so the
 * fixtures below use "0"/"1" and never "1"/"2".
 */
function makeService(state: StubState): AssessmentService {
  const prisma = {
    exam_attempt: {
      findFirst: (args: { where: Record<string, unknown> }) => {
        const where = args.where;
        if (where.id !== undefined && where.id !== state.attempt.id) return Promise.resolve(null);
        if (where.user_id !== undefined && where.user_id !== state.attempt.user_id)
          return Promise.resolve(null);
        if (where.submit_status === false && state.attempt.submit_status)
          return Promise.resolve(null);
        return Promise.resolve({ ...state.attempt });
      },
      count: () => Promise.resolve(state.attempt.submit_status ? 1 : 0),
      update: (args: { data: Record<string, unknown> }) => {
        state.attemptUpdates.push(args.data);
        Object.assign(state.attempt, args.data);
        return Promise.resolve({ ...state.attempt });
      },
    },
    exam: {
      findFirst: () => Promise.resolve({ ...state.exam }),
      // findParentExamIds — no child rows, so this exam is a real sitting and
      // not a subject-wise parent.
      findMany: () => Promise.resolve([]),
    },
    exam_student_allocations: { count: () => Promise.resolve(1) },
    exam_questions: {
      findMany: () =>
        Promise.resolve([
          { id: 1, question_id: 9001, question_no: 1, mark: 1, negative_mark: null },
          { id: 2, question_id: 9002, question_no: 2, mark: 1, negative_mark: null },
        ]),
    },
    question_bank: {
      // One row set for both readers: the scorer selects correct_answers/q_type
      // and buildExamQuestions (the resume path) selects title/options, so a
      // row that omits either silently produces an EMPTY paper — which
      // getExamForTaking reacts to by abandoning the attempt and starting a new
      // one. Answers are 0-BASED repo-wide, so "0"/"1" and never "1"/"2".
      findMany: () =>
        Promise.resolve([
          {
            id: 9001,
            title: 'Q1',
            q_type: 0,
            number_of_options: 2,
            options: JSON.stringify(['A', 'B']),
            correct_answers: JSON.stringify(['0']),
          },
          {
            id: 9002,
            title: 'Q2',
            q_type: 0,
            number_of_options: 2,
            options: JSON.stringify(['A', 'B']),
            correct_answers: JSON.stringify(['1']),
          },
        ]),
    },
    exam_answer: {
      deleteMany: () => Promise.resolve({ count: 0 }),
      create: (args: { data: Record<string, unknown> }) => {
        state.answersWritten.push(args.data);
        return Promise.resolve({});
      },
    },
    // Returning no user short-circuits the submission receipt before it reaches
    // the integration registry, so no mail is attempted.
    users: { findFirst: () => Promise.resolve(null) },
  } as unknown as PrismaClient;

  return new AssessmentService({ prisma, integrations: { email: emailStub } });
}

function baseState(overrides: Partial<AttemptRow> = {}): StubState {
  return {
    attempt: {
      id: 5001,
      user_id: 137,
      exam_id: 10,
      question_id: JSON.stringify(['9001', '9002']),
      start_time: istOn10Aug(19, 30),
      submit_status: false,
      draft_answers: null,
      last_seen_at: null,
      ...overrides,
    },
    exam: {
      // id/status/is_practice/shuffle_questions are what resolveExamForAttempt
      // gates on; the scoring path reads the rest off the same row.
      id: 10,
      status: 'published',
      title: 'Child Development',
      mark: 2,
      shuffle_questions: false,
      is_practice: 0,
      have_minus_mark: 0,
      minus_mark: null,
      ...examWindowRow(),
    },
    attemptUpdates: [],
    answersWritten: [],
  };
}

describe('examEffectiveEndMs — the server owns the deadline', () => {
  test('honours the EARLIER of start + duration and the window close', () => {
    // Started on time at 19:30: 19:30 + 75min == 20:45 == the window close.
    expect(examEffectiveEndMs(examWindowRow(), istOn10Aug(19, 30))).toBe(
      istOn10Aug(20, 45).getTime(),
    );

    // Started 30 minutes late: duration would run to 21:15, but the window
    // shuts at 20:45 and the window wins.
    expect(examEffectiveEndMs(examWindowRow(), istOn10Aug(20, 0))).toBe(
      istOn10Aug(20, 45).getTime(),
    );

    // A generous window (closes 22:00) with a 75-minute paper: duration wins.
    expect(
      examEffectiveEndMs(
        examWindowRow({ to_time: new Date('1970-01-01T22:00:00Z') }),
        istOn10Aug(19, 30),
      ),
    ).toBe(istOn10Aug(20, 45).getTime());
  });

  test('converts the stored IST wall clock, not the raw UTC columns', () => {
    // 20:45 IST is 15:15 UTC. Reading the columns naively would put the
    // deadline at 20:45 UTC — 5h30m of extra exam time.
    const endMs = examEffectiveEndMs(examWindowRow({ duration: null }), istOn10Aug(19, 30));
    expect(new Date(endMs ?? 0).toISOString()).toBe('2026-08-10T15:15:00.000Z');
  });

  test('falls back to end of the closing day when the exam has no to_time', () => {
    const endMs = examEffectiveEndMs(
      examWindowRow({ to_time: null, duration: null }),
      istOn10Aug(19, 30),
    );
    // 23:59:59 IST on 10 Aug == 18:29:59 UTC.
    expect(new Date(endMs ?? 0).toISOString()).toBe('2026-08-10T18:29:59.000Z');
  });

  test('parses duration written as HH:MM:SS, not just plain minutes', () => {
    expect(
      examEffectiveEndMs(
        examWindowRow({ duration: '01:15:00', to_time: null, to_date: null }),
        istOn10Aug(19, 30),
      ),
    ).toBe(istOn10Aug(20, 45).getTime());
  });

  test('an untimed paper with no window has no deadline at all', () => {
    expect(
      examEffectiveEndMs(
        examWindowRow({ duration: null, to_date: null, to_time: null }),
        istOn10Aug(19, 30),
      ),
    ).toBeNull();
  });
});

describe('examWindowSnapshot', () => {
  test('reports remaining seconds against the effective end', () => {
    const snapshot = examWindowSnapshot(
      examWindowRow(),
      istOn10Aug(19, 30),
      istOn10Aug(20, 0).getTime(),
    );
    expect(snapshot.remainingSeconds).toBe(45 * 60);
    expect(snapshot.windowState).toBe('open');
  });

  test('warns before it closes, then closes', () => {
    expect(
      examWindowSnapshot(examWindowRow(), istOn10Aug(19, 30), istOn10Aug(20, 44).getTime())
        .windowState,
    ).toBe('closing');
    expect(
      examWindowSnapshot(examWindowRow(), istOn10Aug(19, 30), istOn10Aug(20, 46).getTime())
        .windowState,
    ).toBe('closed');
  });

  test('an untimed paper reports null, never a number a player could count down', () => {
    // 0 would end the exam instantly and a negative sentinel would end it a
    // second ago; both readers stamp `deadline = now + remaining * 1000`.
    const snapshot = examWindowSnapshot(
      examWindowRow({ duration: null, to_date: null, to_time: null }),
      istOn10Aug(19, 30),
      istOn10Aug(20, 0).getTime(),
    );
    expect(snapshot.remainingSeconds).toBeNull();
    expect(snapshot.windowState).toBe('open');
  });
});

describe('saveExamProgress', () => {
  const answers = [{ question_id: '9001', answer: ['0'] }];

  test('stores the draft and returns the server-authoritative countdown', async () => {
    const state = baseState({ start_time: new Date(Date.now() - 10 * 60 * 1000) });
    // Take the window out of the picture so "now" governs: a 75-minute paper
    // started 10 minutes ago has ~65 minutes left.
    state.exam = { ...state.exam, to_date: null, to_time: null };
    const service = makeService(state);

    const result = await service.saveExamProgress('137', {
      attemptId: '5001',
      userAnswers: answers,
    });

    expect(result.status).toBe(1);
    expect(result.data.saved).toBe(true);
    expect(result.data.window_state).toBe('open');
    expect(result.data.remaining_seconds).toBeGreaterThan(64 * 60);
    expect(result.data.remaining_seconds).toBeLessThanOrEqual(65 * 60);
    expect(Number.isNaN(Date.parse(result.data.server_time))).toBe(false);

    const saved = state.attemptUpdates.at(-1);
    expect(JSON.parse(String(saved?.draft_answers))).toEqual(answers);
    expect(saved?.last_seen_at).toBeInstanceOf(Date);
    // An autosave scores nothing.
    expect(state.answersWritten).toHaveLength(0);
  });

  test('rejects an attempt that is not yours and never confirms it exists', async () => {
    const state = baseState();
    const service = makeService(state);

    const result = await service.saveExamProgress('999', {
      attemptId: '5001',
      userAnswers: answers,
    });

    expect(result.status).toBe(0);
    expect(result.data.saved).toBe(false);
    expect(state.attemptUpdates).toHaveLength(0);
  });

  test('rejects an attempt that is already submitted', async () => {
    const state = baseState({ submit_status: true });
    const service = makeService(state);

    const result = await service.saveExamProgress('137', {
      attemptId: '5001',
      userAnswers: answers,
    });

    expect(result.status).toBe(0);
    expect(result.message).toMatch(/already been submitted/i);
    expect(state.attemptUpdates).toHaveLength(0);
  });

  test('a rejection never reports "no time left" — that would auto-submit a live paper', async () => {
    const state = baseState();
    const service = makeService(state);

    const result = await service.saveExamProgress('999', {
      attemptId: '5001',
      userAnswers: answers,
    });

    expect(result.data.remaining_seconds).toBeNull();
    expect(result.data.window_state).toBe('open');
  });

  test('discards answers to questions this attempt never locked in', async () => {
    const state = baseState({ start_time: new Date(Date.now() - 60 * 1000) });
    state.exam = { ...state.exam, to_date: null, to_time: null };
    const service = makeService(state);

    await service.saveExamProgress('137', {
      attemptId: '5001',
      userAnswers: [...answers, { question_id: '424242', answer: ['x'] }],
    });

    expect(JSON.parse(String(state.attemptUpdates.at(-1)?.draft_answers))).toEqual(answers);
  });

  test('past the deadline it stores nothing and finalises what the student had', async () => {
    // Started 19:30, autosaved through 20:40, autosave lands at 21:00 — the
    // "still working at 9 PM" case Naji flagged.
    const state = baseState({
      start_time: istOn10Aug(19, 30),
      draft_answers: JSON.stringify([
        { question_id: '9001', answer: ['0'] },
        { question_id: '9002', answer: ['1'] },
      ]),
    });
    const service = makeService(state);

    const result = await service.saveExamProgress('137', {
      attemptId: '5001',
      // A post-deadline answer sheet that must be ignored.
      userAnswers: [{ question_id: '9001', answer: ['1'] }],
    });

    expect(result.data.saved).toBe(false);
    expect(result.data.window_state).toBe('closed');
    expect(result.data.remaining_seconds).toBe(0);
    // Finalised, and on the DRAFT: both questions right.
    expect(state.attempt.submit_status).toBe(true);
    expect(state.attempt.correct).toBe(2);
    expect(state.attempt.incorrect).toBe(0);
  });
});

describe('submitExamAttempt — window enforcement', () => {
  test('accepts an on-time submission at face value', async () => {
    const state = baseState({
      start_time: new Date(Date.now() - 5 * 60 * 1000),
      draft_answers: JSON.stringify([{ question_id: '9001', answer: ['1'] }]),
    });
    state.exam = { ...state.exam, to_date: null, to_time: null };
    const service = makeService(state);

    const summary = await service.submitExamAttempt('137', {
      attemptId: '5001',
      userAnswers: [
        { question_id: '9001', answer: ['0'] },
        { question_id: '9002', answer: ['1'] },
      ],
    });

    // Scored on the live payload (both right), not the stale draft.
    expect(summary.correct).toBe(2);
    expect(summary.incorrect).toBe(0);
  });

  test('a late submission is finalised from the draft, not the late payload', async () => {
    const state = baseState({
      start_time: istOn10Aug(19, 30),
      // What the student had at the deadline: one right, one skipped.
      draft_answers: JSON.stringify([{ question_id: '9001', answer: ['0'] }]),
    });
    const service = makeService(state);

    const summary = await service.submitExamAttempt('137', {
      attemptId: '5001',
      // Turned up at 9 PM with both answered.
      userAnswers: [
        { question_id: '9001', answer: ['0'] },
        { question_id: '9002', answer: ['1'] },
      ],
    });

    expect(summary.correct).toBe(1);
    expect(summary.skip).toBe(1);
  });

  test('a late submission with an empty draft is graded on the payload, never zeroed', async () => {
    // A student on an older build, or one whose every autosave failed: the late
    // payload is the only work that exists, and losing it is the one outcome
    // that is never acceptable.
    const state = baseState({ start_time: istOn10Aug(19, 30), draft_answers: null });
    const service = makeService(state);

    const summary = await service.submitExamAttempt('137', {
      attemptId: '5001',
      userAnswers: [
        { question_id: '9001', answer: ['0'] },
        { question_id: '9002', answer: ['1'] },
      ],
    });

    expect(summary.correct).toBe(2);
  });

  test('caps time_taken at the deadline rather than at the moment of finalising', async () => {
    const state = baseState({
      start_time: istOn10Aug(19, 30),
      draft_answers: JSON.stringify([{ question_id: '9001', answer: ['0'] }]),
    });
    const service = makeService(state);

    const summary = await service.submitExamAttempt('137', { attemptId: '5001', userAnswers: [] });

    // 19:30 -> 20:45 is 75 minutes, however many hours later this ran.
    expect(summary.timeTaken).toBe('01:15:00');
  });

  test('an empty payload past the deadline is never scored over a stored draft', async () => {
    // Defence in depth for the bug above, one layer down: whatever calls
    // submitExamAttempt with nothing in hand, at any point past the deadline —
    // inside the grace or outside it — must be given the draft rather than
    // allowed to write a zero over the student's saved sheet.
    freezeAt(20, 45, 30);
    const state = baseState({
      start_time: istOn10Aug(19, 30),
      draft_answers: JSON.stringify([
        { question_id: '9001', answer: ['0'] },
        { question_id: '9002', answer: ['1'] },
      ]),
    });
    const service = makeService(state);

    const summary = await service.submitExamAttempt('137', { attemptId: '5001', userAnswers: [] });

    expect(summary.correct).toBe(2);
    expect(summary.skip).toBe(0);
  });

  test('an empty payload BEFORE the deadline stays the student\'s own answer', async () => {
    // The mirror image, and the reason the substitution is scoped to
    // past-the-deadline: while the paper is live the student may clear an
    // answer and hand in a blank sheet, and the draft must not resurrect it.
    freezeAt(20, 0);
    const state = baseState({
      start_time: istOn10Aug(19, 30),
      draft_answers: JSON.stringify([{ question_id: '9001', answer: ['0'] }]),
    });
    const service = makeService(state);

    const summary = await service.submitExamAttempt('137', { attemptId: '5001', userAnswers: [] });

    expect(summary.correct).toBe(0);
    expect(summary.skip).toBe(2);
  });

  test('a second submit reports the stored result instead of rescoring', async () => {
    const state = baseState({
      start_time: new Date(Date.now() - 5 * 60 * 1000),
      submit_status: true,
      correct: 2,
      incorrect: 0,
      skip: 0,
      score: 2,
      time_taken: new Date('1970-01-01T00:05:00Z'),
    });
    state.exam = { ...state.exam, to_date: null, to_time: null };
    const service = makeService(state);

    const summary = await service.submitExamAttempt('137', { attemptId: '5001', userAnswers: [] });

    expect(summary).toEqual({ correct: 2, incorrect: 0, skip: 0, score: 2, timeTaken: '00:05:00' });
    // Nothing was rewritten — the stored answer rows survive.
    expect(state.answersWritten).toHaveLength(0);
    expect(state.attemptUpdates).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Adversarial review 2026-08-11 — the 90-second grace window.
//
// LATE_SUBMIT_GRACE_MS exists so a phone that spends a few seconds getting its
// final POST out is not failed. Everything in this block runs INSIDE that
// interval, which the original suite never reached: its late-submit cases all
// started on 10 Aug and ran against the real clock of 11 Aug, i.e. ~10 hours
// past the deadline and always outside the grace.
// ---------------------------------------------------------------------------

const FULL_SHEET = [
  { question_id: '9001', answer: ['0'] },
  { question_id: '9002', answer: ['1'] },
];

/** The sheet the last successful autosave parked on the row: both right. */
const SAVED_DRAFT = JSON.stringify(FULL_SHEET);

/**
 * Adversarial review round 3 — THE SHAPE THE WEB PLAYER ACTUALLY POSTS.
 *
 * buildUserAnswers maps over every question and emits `{ question_id, answer:
 * [] }` for the unanswered ones, so a real draft is a row per question with the
 * blanks included. Every fixture above is hand-made and answered-only, which is
 * precisely why two rounds of guards that counted ROWS looked correct in tests
 * and inverted in production. Everything below uses this instead.
 */
function playerSheet(answered: Record<string, string[]> = {}): Array<{ question_id: string; answer: string[] }> {
  return ['9001', '9002'].map((id) => ({ question_id: id, answer: answered[id] ?? [] }));
}

/** 25 seconds into the paper: two rows, nothing answered. NOT an empty array. */
const BLANK_PLAYER_SHEET = playerSheet();
const FULL_PLAYER_SHEET = playerSheet({ '9001': ['0'], '9002': ['1'] });
/** Q1 answered, Q2 still blank — what a half-finished paper looks like. */
const HALF_PLAYER_SHEET = playerSheet({ '9001': ['0'] });

describe('an autosave landing inside the 90s grace', () => {
  test('grades the paper from the draft, never as an empty sheet', async () => {
    // The trigger Naji's students will actually hit: a phone locks near the
    // end, timers stop, and the visibilitychange flush gets an autosave out a
    // few seconds after 20:45. This used to finalise the attempt on the EMPTY
    // payload saveExamProgress passed to submitExamAttempt — every question
    // skipped, answer_submitted "[]", score 0, submit_status true — because
    // the draft substitution only fired past the grace.
    freezeAt(20, 45, 10);
    const state = baseState({ start_time: istOn10Aug(19, 30), draft_answers: SAVED_DRAFT });
    const service = makeService(state);

    const result = await service.saveExamProgress('137', {
      attemptId: '5001',
      userAnswers: FULL_SHEET,
    });

    expect(result.data.window_state).toBe('closed');
    expect(result.data.saved).toBe(false);

    expect(state.attempt.submit_status).toBe(true);
    expect(state.attempt.correct).toBe(2);
    expect(state.attempt.skip).toBe(0);
    expect(state.attempt.score).toBe(2);
    // The stored rows carry the student's options, not two empty arrays.
    expect(state.answersWritten.map((row) => row.answer_submitted)).toEqual(['["0"]', '["1"]']);
  });

  test('does not swallow the student\'s own submit a second later', async () => {
    // The player reacts to window_state "closed" by zeroing its countdown and
    // auto-submitting, so this pair is the ordinary sequence, not a rare race.
    // With zeros on the row the idempotency branch handed those zeros straight
    // back and the completion modal showed a successful submission over them —
    // invisible until results published.
    freezeAt(20, 45, 10);
    const state = baseState({ start_time: istOn10Aug(19, 30), draft_answers: SAVED_DRAFT });
    const service = makeService(state);

    await service.saveExamProgress('137', { attemptId: '5001', userAnswers: FULL_SHEET });

    vi.setSystemTime(istOn10Aug(20, 45, 11));
    const summary = await service.submitExamAttempt('137', {
      attemptId: '5001',
      userAnswers: FULL_SHEET,
    });

    expect(summary.correct).toBe(2);
    expect(summary.skip).toBe(0);
    expect(summary.score).toBe(2);
  });

  test('grades a student with no draft on the sheet the flush was carrying', async () => {
    // The student whose every autosave failed. There is no stored sheet, so the
    // one this request is carrying is the only work that exists — and it
    // arrived inside the grace, which submitExamAttempt already accepts at face
    // value. Round 3: this used to throw the payload away and leave the attempt
    // open, betting on the player's own submit to follow. It usually does; when
    // it does not (the flush WAS the dying tab's last act), the paper was lost.
    freezeAt(20, 45, 10);
    const state = baseState({ start_time: istOn10Aug(19, 30), draft_answers: null });
    const service = makeService(state);

    const result = await service.saveExamProgress('137', {
      attemptId: '5001',
      userAnswers: FULL_SHEET,
    });

    expect(result.data.window_state).toBe('closed');
    expect(state.attempt.submit_status).toBe(true);
    expect(state.attempt.correct).toBe(2);
    expect(result.message).toMatch(/have been submitted/i);

    // ...and the student's own submit a few seconds later still reports their
    // real result rather than rescoring or zeroing it.
    vi.setSystemTime(istOn10Aug(20, 45, 20));
    const summary = await service.submitExamAttempt('137', {
      attemptId: '5001',
      userAnswers: FULL_SHEET,
    });
    expect(summary.correct).toBe(2);
  });

  test('leaves the paper open when NOTHING has been answered anywhere', async () => {
    // The genuine "nothing to grade" case: a blank stored sheet and a blank
    // payload. The attempt must stay unsubmitted and resumable rather than
    // becoming a graded zero with a receipt in the student's inbox.
    freezeAt(20, 45, 10);
    const state = baseState({
      start_time: istOn10Aug(19, 30),
      draft_answers: JSON.stringify(BLANK_PLAYER_SHEET),
    });
    const service = makeService(state);

    const result = await service.saveExamProgress('137', {
      attemptId: '5001',
      userAnswers: BLANK_PLAYER_SHEET,
    });

    expect(result.data.window_state).toBe('closed');
    expect(state.attempt.submit_status).toBe(false);
    expect(state.answersWritten).toHaveLength(0);
    // ...and the message must not claim a submission that never happened.
    expect(result.message).not.toMatch(/have been submitted/i);
  });

  test('never overwrites a live submit that landed first', async () => {
    // Reverse order: the student submits on time, then a heartbeat already in
    // flight arrives. The stored result is theirs and nothing may touch it.
    freezeAt(20, 44, 50);
    const state = baseState({ start_time: istOn10Aug(19, 30), draft_answers: SAVED_DRAFT });
    const service = makeService(state);

    const summary = await service.submitExamAttempt('137', {
      attemptId: '5001',
      userAnswers: FULL_SHEET,
    });
    expect(summary.correct).toBe(2);
    const rowsAfterSubmit = state.answersWritten.length;
    const updatesAfterSubmit = state.attemptUpdates.length;

    vi.setSystemTime(istOn10Aug(20, 45, 10));
    const result = await service.saveExamProgress('137', {
      attemptId: '5001',
      userAnswers: [{ question_id: '9001', answer: ['1'] }],
    });

    expect(result.status).toBe(0);
    expect(result.message).toMatch(/already been submitted/i);
    expect(state.attempt.correct).toBe(2);
    expect(state.answersWritten).toHaveLength(rowsAfterSubmit);
    expect(state.attemptUpdates).toHaveLength(updatesAfterSubmit);
  });

  test('still finalises from the draft once the grace has run out', async () => {
    // The behaviour that already worked, kept working: a heartbeat well past
    // the deadline finalises on what was saved by then.
    freezeAt(20, 46, 40);
    const state = baseState({ start_time: istOn10Aug(19, 30), draft_answers: SAVED_DRAFT });
    const service = makeService(state);

    await service.saveExamProgress('137', { attemptId: '5001', userAnswers: FULL_SHEET });

    expect(state.attempt.submit_status).toBe(true);
    expect(state.attempt.correct).toBe(2);
  });
});

describe('the stranded-attempt sweep', () => {
  // getExamForTaking creates the attempt row as soon as the INSTRUCTIONS screen
  // loads, so "an unsubmitted attempt with no draft" is also what a student who
  // opened the exam and never sat it looks like. Finalising that wrote a
  // permanent 0, emailed them a submission receipt, and locked them out behind
  // "You have already submitted this exam" — while submitExamAttempt refuses
  // to zero the very same empty draft one layer down.

  test('does not score a draftless attempt zero — the student stays absent', async () => {
    freezeAt(22, 0);
    const state = baseState({ start_time: istOn10Aug(19, 30), draft_answers: null });
    const service = makeService(state);

    const result = await service.getExamForTaking('137', '10');

    expect(state.attempt.submit_status).toBe(false);
    expect(state.answersWritten).toHaveLength(0);
    expect(state.attemptUpdates).toHaveLength(0);
    // Closed, not "already submitted" — nothing was ever handed in.
    expect(result.status).toBe(0);
    expect(result.message).toMatch(/closed/i);
  });

  test('still finalises a stranded attempt that DOES have a draft', async () => {
    // The sweep's whole purpose: a laptop that died at 08:44 comes back graded
    // on the sheet it had at 08:45 rather than lost.
    freezeAt(22, 0);
    const state = baseState({ start_time: istOn10Aug(19, 30), draft_answers: SAVED_DRAFT });
    const service = makeService(state);

    const result = await service.getExamForTaking('137', '10');

    expect(state.attempt.submit_status).toBe(true);
    expect(state.attempt.correct).toBe(2);
    expect(result.message).toMatch(/already submitted/i);
  });
});

// ---------------------------------------------------------------------------
// Adversarial review round 3 — the six findings, each driven by the payload the
// WEB PLAYER actually sends (a row per question, blanks included) rather than a
// hand-made answered-only sheet. That shape is the root cause: every guard the
// earlier rounds added counted ROWS, the scorer counts ANSWERS, and a real
// draft is a full set of rows with nothing in them 25 seconds into any paper.
// ---------------------------------------------------------------------------

describe('F1 — a blank heartbeat must not become a graded zero', () => {
  test('the stranded sweep leaves an all-blank draft absent and resumable', async () => {
    // The 10 Aug aftermath, exactly: a student's connection dies 25 seconds in,
    // after ONE heartbeat has parked a full set of empty rows. Reopening the
    // exam later ran the sweep, which saw two rows, scored the paper 0, set
    // submit_status, emailed a receipt and then told them "You have already
    // submitted this exam" — with no re-attempt and no remedy.
    freezeAt(22, 0);
    const state = baseState({
      start_time: istOn10Aug(19, 30),
      draft_answers: JSON.stringify(BLANK_PLAYER_SHEET),
    });
    const service = makeService(state);

    const result = await service.getExamForTaking('137', '10');

    expect(state.attempt.submit_status).toBe(false);
    expect(state.answersWritten).toHaveLength(0);
    expect(state.attemptUpdates).toHaveLength(0);
    expect(result.message).toMatch(/closed/i);
    expect(result.message).not.toMatch(/already submitted/i);
  });

  test('one answer among the blanks is still real work and IS finalised', async () => {
    // The other side of the same predicate: "nothing answered" must not swallow
    // a paper that has something in it.
    freezeAt(22, 0);
    const state = baseState({
      start_time: istOn10Aug(19, 30),
      draft_answers: JSON.stringify(HALF_PLAYER_SHEET),
    });
    const service = makeService(state);

    const result = await service.getExamForTaking('137', '10');

    expect(state.attempt.submit_status).toBe(true);
    expect(state.attempt.correct).toBe(1);
    expect(state.attempt.skip).toBe(1);
    expect(result.message).toMatch(/already submitted/i);
  });
});

describe('F2 — a blank draft must never beat the work the student actually did', () => {
  test('a late payload is scored when the stored sheet holds nothing', async () => {
    // Blank draft (one heartbeat, no answers) + the student's complete sheet
    // arriving late. Counting rows made the blank draft win: correct 0, skip 2,
    // and answer_submitted stored as "[]" for every question.
    freezeAt(22, 0);
    const state = baseState({
      start_time: istOn10Aug(19, 30),
      draft_answers: JSON.stringify(BLANK_PLAYER_SHEET),
    });
    const service = makeService(state);

    const summary = await service.submitExamAttempt('137', {
      attemptId: '5001',
      userAnswers: FULL_PLAYER_SHEET,
    });

    expect(summary.correct).toBe(2);
    expect(summary.skip).toBe(0);
    expect(state.answersWritten.map((row) => row.answer_submitted)).toEqual(['["0"]', '["1"]']);
  });

  test('a draft that DOES hold work still beats a late payload', async () => {
    // Unchanged, and the reason the predicate is "has an answer" rather than
    // "was sent": past the grace the deadline has to mean something.
    freezeAt(22, 0);
    const state = baseState({
      start_time: istOn10Aug(19, 30),
      draft_answers: JSON.stringify(HALF_PLAYER_SHEET),
    });
    const service = makeService(state);

    const summary = await service.submitExamAttempt('137', {
      attemptId: '5001',
      userAnswers: FULL_PLAYER_SHEET,
    });

    expect(summary.correct).toBe(1);
    expect(summary.skip).toBe(1);
  });
});

describe('F3 — a blank payload past the deadline must not overwrite a saved sheet', () => {
  test('the saved sheet wins over a blank player payload inside the grace', async () => {
    // The backstop the previous round added could never fire: it tested
    // `payloadMap.size === 0`, and a real player payload always has one entry
    // per question. So a blank sheet flushed at deadline+10s overwrote a 2/2
    // draft with zeros — and the idempotency branch then handed those zeros
    // back to the student's own submit.
    freezeAt(20, 45, 10);
    const state = baseState({ start_time: istOn10Aug(19, 30), draft_answers: SAVED_DRAFT });
    const service = makeService(state);

    const summary = await service.submitExamAttempt('137', {
      attemptId: '5001',
      userAnswers: BLANK_PLAYER_SHEET,
    });

    expect(summary.correct).toBe(2);
    expect(summary.skip).toBe(0);
  });

  test('a blank player payload BEFORE the deadline is still the student\'s own answer', async () => {
    // The mirror image, unchanged: while the paper is live, handing in a blank
    // sheet is a choice the student is allowed to make.
    freezeAt(20, 0);
    const state = baseState({ start_time: istOn10Aug(19, 30), draft_answers: SAVED_DRAFT });
    const service = makeService(state);

    const summary = await service.submitExamAttempt('137', {
      attemptId: '5001',
      userAnswers: BLANK_PLAYER_SHEET,
    });

    expect(summary.correct).toBe(0);
    expect(summary.skip).toBe(2);
  });
});

describe('F4 — the window must not close before the deadline', () => {
  const deadlineMs = istOn10Aug(20, 45).getTime();

  test('900ms before the end the exam is still open', () => {
    // Math.floor((endMs - nowMs) / 1000) is 0 for anything under a second, and
    // the state was derived from that floored second, so the last 999ms of
    // every paper reported itself shut.
    const snapshot = examWindowSnapshot(examWindowRow(), istOn10Aug(19, 30), deadlineMs - 900);
    expect(snapshot.windowState).not.toBe('closed');
    // The DISPLAYED number stays floored — it is a countdown, not a gate.
    expect(snapshot.remainingSeconds).toBe(0);
  });

  test('it closes at the deadline itself, not before and not after', () => {
    expect(examWindowSnapshot(examWindowRow(), istOn10Aug(19, 30), deadlineMs - 1).windowState)
      .not.toBe('closed');
    expect(examWindowSnapshot(examWindowRow(), istOn10Aug(19, 30), deadlineMs).windowState)
      .toBe('closed');
    expect(examWindowSnapshot(examWindowRow(), istOn10Aug(19, 30), deadlineMs + 1).windowState)
      .toBe('closed');
  });

  test('an autosave delivered inside the last second is stored, not finalised', async () => {
    // End to end: the student answers both questions and the debounced save
    // lands 900ms before time. It used to be discarded AND to trigger a
    // finalise from the 25-second-stale draft — 1/2 instead of 2/2.
    freezeAtInstant(deadlineMs - 900);
    const state = baseState({
      start_time: istOn10Aug(19, 30),
      draft_answers: JSON.stringify(HALF_PLAYER_SHEET),
    });
    const service = makeService(state);

    const result = await service.saveExamProgress('137', {
      attemptId: '5001',
      userAnswers: FULL_PLAYER_SHEET,
    });

    expect(result.data.saved).toBe(true);
    expect(result.data.window_state).not.toBe('closed');
    expect(state.attempt.submit_status).toBe(false);
    expect(JSON.parse(String(state.attemptUpdates.at(-1)?.draft_answers))).toEqual(FULL_PLAYER_SHEET);
  });
});

describe('F5 — a post-deadline finalise merges rather than discards', () => {
  test('a flush arriving at deadline+2s contributes its answers', async () => {
    // The residual loss the previous round called "accepted": the draft was 25
    // seconds stale, the flush carried both answers, and the flush was thrown
    // away. submitExamAttempt takes the very same payload at face value
    // anywhere in [deadline, deadline+90s], so this was inconsistent as well as
    // lossy. The union loses nothing on either side.
    freezeAt(20, 45, 2);
    const state = baseState({
      start_time: istOn10Aug(19, 30),
      draft_answers: JSON.stringify(HALF_PLAYER_SHEET),
    });
    const service = makeService(state);

    const result = await service.saveExamProgress('137', {
      attemptId: '5001',
      userAnswers: FULL_PLAYER_SHEET,
    });

    expect(result.data.window_state).toBe('closed');
    expect(state.attempt.submit_status).toBe(true);
    expect(state.attempt.correct).toBe(2);
    expect(state.attempt.skip).toBe(0);
  });

  test('a blank entry in the flush never clears a stored answer', async () => {
    // A sheet from a tab that has been out of touch cannot be told apart from a
    // deliberate clear, so the merge keeps the answer. Losing work is the one
    // outcome that is never acceptable; resurrecting a cleared answer is not in
    // the same class.
    freezeAt(20, 45, 2);
    const state = baseState({ start_time: istOn10Aug(19, 30), draft_answers: SAVED_DRAFT });
    const service = makeService(state);

    await service.saveExamProgress('137', {
      attemptId: '5001',
      userAnswers: BLANK_PLAYER_SHEET,
    });

    expect(state.attempt.correct).toBe(2);
    expect(state.attempt.skip).toBe(0);
  });

  test('past the grace the payload is genuinely late work and does not count', async () => {
    // The deadline still means something: at deadline+2min only what was saved
    // by the deadline is graded. The merge does not weaken that — it hands
    // submitExamAttempt a union, and submitExamAttempt's own late rule (the ONE
    // place that owns the deadline policy) overrules it with the stored draft.
    freezeAt(20, 47);
    const state = baseState({
      start_time: istOn10Aug(19, 30),
      draft_answers: JSON.stringify(HALF_PLAYER_SHEET),
    });
    const service = makeService(state);

    await service.saveExamProgress('137', {
      attemptId: '5001',
      userAnswers: FULL_PLAYER_SHEET,
    });

    expect(state.attempt.submit_status).toBe(true);
    expect(state.attempt.correct).toBe(1);
    expect(state.attempt.skip).toBe(1);
  });

  test('...but a student with NO saved sheet is still graded on what they sent', async () => {
    // The corner where a second copy of the grace rule silently differed. With
    // nothing stored, the late payload is the only work in existence, and
    // submitExamAttempt already grades a late submit on it for exactly that
    // reason. A finalise refusing to do the same left the student unsubmitted
    // and their paper resting on a submit their dying tab may never send.
    freezeAt(20, 47);
    const state = baseState({
      start_time: istOn10Aug(19, 30),
      draft_answers: JSON.stringify(BLANK_PLAYER_SHEET),
    });
    const service = makeService(state);

    await service.saveExamProgress('137', {
      attemptId: '5001',
      userAnswers: FULL_PLAYER_SHEET,
    });

    expect(state.attempt.submit_status).toBe(true);
    expect(state.attempt.correct).toBe(2);
  });
});

describe('F6 — the draft writer token', () => {
  /** Open the paper and take the token /exams/exam_take handed this "tab". */
  async function openExam(service: AssessmentService): Promise<string> {
    const result = await service.getExamForTaking('137', '10');
    const token = result.data?.draft_token;
    return typeof token === 'string' ? token : '';
  }

  test('an abandoned tab cannot overwrite the sheet the student is working on', async () => {
    // The exact aftermath of the 10 Aug incident: the student resumes on a
    // phone while the frozen laptop tab is still in_progress. Both drive the
    // same attempt on the same token, and the laptop's heartbeat "runs whether
    // or not anything changed", so it replaced the good sheet with its own
    // stale blank one every 25 seconds.
    freezeAt(19, 40);
    const state = baseState({ start_time: istOn10Aug(19, 30) });
    const service = makeService(state);

    const laptopToken = await openExam(service);
    // The phone is opened a minute later, so its token is minted later.
    vi.setSystemTime(istOn10Aug(19, 41));
    const phoneToken = await openExam(service);
    expect(phoneToken).not.toBe(laptopToken);

    const onPhone = await service.saveExamProgress('137', {
      attemptId: '5001',
      userAnswers: FULL_PLAYER_SHEET,
      draftToken: phoneToken,
    });
    expect(onPhone.data.saved).toBe(true);

    const onLaptop = await service.saveExamProgress('137', {
      attemptId: '5001',
      userAnswers: BLANK_PLAYER_SHEET,
      draftToken: laptopToken,
    });

    expect(onLaptop.data.saved).toBe(false);
    // The phone's work is untouched, and comes back on the next resume.
    const resumed = await service.getExamForTaking('137', '10');
    expect(resumed.data?.draft_answers).toEqual(FULL_PLAYER_SHEET);
  });

  test('a rejected save says nothing a student mid-exam could see', async () => {
    // No error, no countdown: "0 seconds left" would make the tab auto-submit a
    // paper that is still running, and any visible warning would panic a
    // student who may still be sitting at this very window.
    freezeAt(19, 40);
    const state = baseState({ start_time: istOn10Aug(19, 30) });
    const service = makeService(state);

    const laptopToken = await openExam(service);
    vi.setSystemTime(istOn10Aug(19, 41));
    const phoneToken = await openExam(service);
    await service.saveExamProgress('137', {
      attemptId: '5001',
      userAnswers: FULL_PLAYER_SHEET,
      draftToken: phoneToken,
    });

    const rejected = await service.saveExamProgress('137', {
      attemptId: '5001',
      userAnswers: BLANK_PLAYER_SHEET,
      draftToken: laptopToken,
    });

    expect(rejected.status).toBe(0);
    expect(rejected.data.remaining_seconds).toBeNull();
    expect(rejected.data.window_state).toBe('open');
  });

  test('the same tab keeps saving for as long as it holds the claim', async () => {
    freezeAt(19, 40);
    const state = baseState({ start_time: istOn10Aug(19, 30) });
    const service = makeService(state);
    const token = await openExam(service);

    for (const sheet of [HALF_PLAYER_SHEET, FULL_PLAYER_SHEET]) {
      const result = await service.saveExamProgress('137', {
        attemptId: '5001',
        userAnswers: sheet,
        draftToken: token,
      });
      expect(result.data.saved).toBe(true);
    }

    expect(state.attempt.submit_status).toBe(false);
    const resumed = await service.getExamForTaking('137', '10');
    expect(resumed.data?.draft_answers).toEqual(FULL_PLAYER_SHEET);
  });

  test('a client that sends no token keeps working exactly as before', async () => {
    // The Flutter app will not send one. A token-less save must never be
    // rejected — and must not release the claim either, or the abandoned tab
    // would simply grab it back on its next heartbeat.
    freezeAt(19, 40);
    const state = baseState({ start_time: istOn10Aug(19, 30) });
    const service = makeService(state);

    const laptopToken = await openExam(service);
    vi.setSystemTime(istOn10Aug(19, 41));
    const phoneToken = await openExam(service);
    await service.saveExamProgress('137', {
      attemptId: '5001',
      userAnswers: HALF_PLAYER_SHEET,
      draftToken: phoneToken,
    });

    const mobile = await service.saveExamProgress('137', {
      attemptId: '5001',
      userAnswers: FULL_PLAYER_SHEET,
    });
    expect(mobile.data.saved).toBe(true);

    const stillRejected = await service.saveExamProgress('137', {
      attemptId: '5001',
      userAnswers: BLANK_PLAYER_SHEET,
      draftToken: laptopToken,
    });
    expect(stillRejected.data.saved).toBe(false);
  });

  test('a superseded tab does not drag its stale sheet into a finalise', async () => {
    // Past the deadline the merge is what protects the student — but merging a
    // sheet we have just decided not to trust could overwrite a newer answer
    // with the abandoned tab's older one.
    freezeAt(19, 40);
    const state = baseState({ start_time: istOn10Aug(19, 30) });
    const service = makeService(state);

    const laptopToken = await openExam(service);
    vi.setSystemTime(istOn10Aug(19, 41));
    const phoneToken = await openExam(service);
    await service.saveExamProgress('137', {
      attemptId: '5001',
      userAnswers: FULL_PLAYER_SHEET,
      draftToken: phoneToken,
    });

    // The laptop wakes up after the close carrying two WRONG answers.
    vi.setSystemTime(istOn10Aug(20, 45, 5));
    await service.saveExamProgress('137', {
      attemptId: '5001',
      userAnswers: playerSheet({ '9001': ['1'], '9002': ['0'] }),
      draftToken: laptopToken,
    });

    expect(state.attempt.submit_status).toBe(true);
    expect(state.attempt.correct).toBe(2);
    expect(state.attempt.incorrect).toBe(0);
  });

  test('a legacy draft with no writer can still be claimed', async () => {
    // Rows written before the token existed (and by any token-less client) have
    // no claim on them; the first tab to present a token adopts them.
    freezeAt(19, 40);
    const state = baseState({
      start_time: istOn10Aug(19, 30),
      draft_answers: JSON.stringify(HALF_PLAYER_SHEET),
    });
    const service = makeService(state);
    const token = await openExam(service);

    const result = await service.saveExamProgress('137', {
      attemptId: '5001',
      userAnswers: FULL_PLAYER_SHEET,
      draftToken: token,
    });

    expect(result.data.saved).toBe(true);
    const resumed = await service.getExamForTaking('137', '10');
    expect(resumed.data?.draft_answers).toEqual(FULL_PLAYER_SHEET);
  });
});

describe("examEffectiveEndMs — a stored to_time of '00:00:00'", () => {
  // Latent: production has zero such rows today, but a legacy import or a hand
  // edit would produce one and lock out a whole final day of students.
  function multiDayRow(toTime: unknown) {
    return examWindowRow({
      from_date: new Date('2026-08-01T00:00:00Z'),
      from_time: new Date('1970-01-01T09:00:00Z'),
      to_date: new Date('2026-08-10T00:00:00Z'),
      to_time: toTime,
      duration: null,
    });
  }

  test('keeps a multi-day window open through its final day', () => {
    // The midnight-crossing correction only fires when close <= start, which a
    // multi-day row never satisfies, so this used to close at 2026-08-10
    // 00:00 IST — a day early — and refuse every student sitting on 10 Aug.
    // 23:59:59 IST on 10 Aug == 18:29:59 UTC.
    expect(
      new Date(examEffectiveEndMs(multiDayRow(new Date('1970-01-01T00:00:00Z')), null) ?? 0)
        .toISOString(),
    ).toBe('2026-08-10T18:29:59.000Z');
  });

  test('handles the string form the same way', () => {
    expect(
      new Date(examEffectiveEndMs(multiDayRow('00:00:00'), null) ?? 0).toISOString(),
    ).toBe('2026-08-10T18:29:59.000Z');
  });

  test('leaves a real to_time alone', () => {
    // The fix must not swallow a genuine closing time on a multi-day window.
    expect(
      new Date(examEffectiveEndMs(multiDayRow(new Date('1970-01-01T20:45:00Z')), null) ?? 0)
        .toISOString(),
    ).toBe('2026-08-10T15:15:00.000Z');
  });

  test('a single-day row closes at the end of its day, exactly like a NULL to_time', () => {
    const zeroTime = examEffectiveEndMs(
      examWindowRow({ to_time: new Date('1970-01-01T00:00:00Z'), duration: null }),
      istOn10Aug(19, 30),
    );
    const nullTime = examEffectiveEndMs(
      examWindowRow({ to_time: null, duration: null }),
      istOn10Aug(19, 30),
    );
    expect(zeroTime).toBe(nullTime);
    expect(new Date(zeroTime ?? 0).toISOString()).toBe('2026-08-10T18:29:59.000Z');
  });
});
