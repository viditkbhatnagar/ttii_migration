import { describe, expect, test } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import { AssessmentService } from '../../src/assessment/assessment-service.js';

// TTII 2026-08-14, verbatim: "The exam should be automatically submitted once
// the allotted time expires, regardless of whether the student is online or
// offline at that time. The submission should be triggered by the server."
//
// The browser already auto-submits at zero; a student who is offline or has
// closed the tab submitted nothing, so the paper sat unsubmitted forever even
// though their answers were on the server via the 25s autosave.
//
// The failure modes here are severe and asymmetric, so they are pinned first:
//   - submitting a paper a student is STILL WRITING (the IST/UTC skew that once
//     locked students out would do exactly this, unattended), and
//   - writing a permanent ZERO for someone who never answered. On 2026-08-14
//     production held 39 unsubmitted attempts back to March 2025 with no
//     draft_answers at all (the column shipped 2026-08-11) — 25 of them on a
//     real exam. A sweeper without a floor would have graded that whole
//     backlog zero on its first tick.

const EXAM_ID = 42;
const ATTEMPT_ID = 9001;
const USER_ID = 137;

/** 2026-08-14 09:00:00 IST == 03:30 UTC. Exam runs 09:00-10:00 IST. */
const EXAM_DATE = new Date(Date.UTC(2026, 7, 14));
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
/** A @db.Time column: Prisma hands these back as 1970-01-01T<hh:mm>Z. */
const time = (h: number, m = 0): Date => new Date(Date.UTC(1970, 0, 1, h, m, 0));
/** The UTC instant of an IST wall-clock time on the exam date. */
const istInstant = (h: number, m = 0): number => Date.UTC(2026, 7, 14, h, m, 0) - IST_OFFSET_MS;

interface ExamRow {
  id: number;
  from_date: Date | null;
  from_time: Date | null;
  to_date: Date | null;
  to_time: Date | null;
  duration: string | null;
  is_practice?: number;
  parent_exam_id?: number | null;
}

interface AttemptRow {
  id: number;
  user_id: number | null;
  exam_id: number | null;
  start_time: Date | null;
  submit_status: boolean | null;
  draft_answers: string | null;
}

/** A draft with real answers, in the shape the player actually sends. */
const ANSWERED = JSON.stringify([
  { question_id: 1, answer: ['0'] },
  { question_id: 2, answer: ['2'] },
]);
/**
 * The shape that broke this twice before: buildUserAnswers emits a row per
 * question INCLUDING unanswered ones, so a draft is a non-empty array of empty
 * answers 25s into every paper. Row count means the opposite of what it reads.
 */
const NOTHING_ANSWERED = JSON.stringify([
  { question_id: 1, answer: [] },
  { question_id: 2, answer: [] },
]);

interface Harness {
  service: AssessmentService;
  finalized: string[];
  examFindManyArgs: Record<string, unknown>[];
  attemptFindManyArgs: Record<string, unknown>[];
}

function makeHarness(exams: ExamRow[], attempts: AttemptRow[]): Harness {
  const finalized: string[] = [];
  const examFindManyArgs: Record<string, unknown>[] = [];
  const attemptFindManyArgs: Record<string, unknown>[] = [];

  const matchesFloor = (value: unknown, floor: unknown): boolean =>
    !(floor instanceof Date) || (value instanceof Date && value.getTime() >= floor.getTime());

  const prisma = {
    exam: {
      findMany: (args: { where: Record<string, unknown>; select?: unknown }) => {
        const w = args.where;
        // findParentExamIds issues its own findMany keyed on parent_exam_id:
        // a row is a PARENT when some other row points at it.
        const parentFilter = w.parent_exam_id as { in?: number[] } | undefined;
        if (parentFilter?.in) {
          const ids = parentFilter.in;
          return Promise.resolve(
            exams
              .filter((e) => e.parent_exam_id != null && ids.includes(e.parent_exam_id))
              .map((e) => ({ parent_exam_id: e.parent_exam_id })),
          );
        }
        examFindManyArgs.push(w);
        const floor = (w.from_date as { gte?: unknown } | undefined)?.gte;
        return Promise.resolve(
          exams
            .filter((e) => (w.is_practice === undefined ? true : (e.is_practice ?? 0) === w.is_practice))
            .filter((e) => matchesFloor(e.from_date, floor))
            .map(({ is_practice: _p, parent_exam_id: _q, ...row }) => row),
        );
      },
    },
    exam_attempt: {
      findMany: (args: { where: Record<string, unknown> }) => {
        attemptFindManyArgs.push(args.where);
        const w = args.where;
        const examIds = (w.exam_id as { in?: number[] } | undefined)?.in ?? [];
        const floor = (w.start_time as { gte?: unknown } | undefined)?.gte;
        return Promise.resolve(
          attempts
            .filter((a) => a.exam_id != null && examIds.includes(a.exam_id))
            .filter((a) => a.submit_status === w.submit_status)
            .filter((a) => (w.draft_answers === undefined ? true : a.draft_answers !== null))
            .filter((a) => (w.user_id === undefined ? true : a.user_id !== null))
            .filter((a) => matchesFloor(a.start_time, floor))
            .sort((x, y) => y.id - x.id),
        );
      },
      findUnique: (args: { where: { id: number } }) =>
        Promise.resolve(attempts.find((a) => a.id === args.where.id) ?? null),
    },
  } as unknown as PrismaClient;

  const service = new AssessmentService({ prisma });
  // Stand in for the real finalise: it is exercised by its own suite, and here
  // we care about WHICH attempts get finalised, not how they score.
  (service as unknown as {
    finalizeAttemptFromDraft: (u: string, a: string, d: unknown) => Promise<boolean>;
  }).finalizeAttemptFromDraft = (userId, attemptId, draft) => {
    const rows = JSON.parse(typeof draft === 'string' ? draft : '[]') as { answer: string[] }[];
    const hasWork = rows.some((r) => (r.answer ?? []).length > 0);
    if (!hasWork) return Promise.resolve(false);
    finalized.push(`${userId}:${attemptId}`);
    return Promise.resolve(true);
  };

  return { service, finalized, examFindManyArgs, attemptFindManyArgs };
}

function liveExam(over: Partial<ExamRow> = {}): ExamRow {
  return {
    id: EXAM_ID,
    from_date: EXAM_DATE,
    from_time: time(9),
    to_date: EXAM_DATE,
    to_time: time(10),
    duration: '60',
    is_practice: 0,
    parent_exam_id: null,
    ...over,
  };
}

function attempt(over: Partial<AttemptRow> = {}): AttemptRow {
  return {
    id: ATTEMPT_ID,
    user_id: USER_ID,
    exam_id: EXAM_ID,
    // Started at 09:00 IST, so with duration 60 the deadline is 10:00 IST.
    start_time: new Date(istInstant(9)),
    submit_status: false,
    draft_answers: ANSWERED,
    ...over,
  };
}

describe('exam auto-submit — never takes a paper off a student who is still writing', () => {
  test('mid-exam (09:30 IST, deadline 10:00) the attempt is untouched', async () => {
    const h = makeHarness([liveExam()], [attempt()]);

    const res = await h.service.sweepExpiredExamAttempts({ now: new Date(istInstant(9, 30)) });

    expect(h.finalized).toEqual([]);
    expect(res.graded).toBe(0);
  });

  test('one minute AFTER the deadline it is still untouched — the grace has not elapsed', async () => {
    const h = makeHarness([liveExam()], [attempt()]);

    const res = await h.service.sweepExpiredExamAttempts({ now: new Date(istInstant(10, 1)) });

    // A student's own submit is still in flight in this window.
    expect(h.finalized).toEqual([]);
    expect(res.graded).toBe(0);
  });

  test('past the deadline AND the grace, it is finalised', async () => {
    const h = makeHarness([liveExam()], [attempt()]);

    const res = await h.service.sweepExpiredExamAttempts({ now: new Date(istInstant(10, 6)) });

    expect(h.finalized).toEqual([`${USER_ID}:${ATTEMPT_ID}`]);
    expect(res.graded).toBe(1);
  });

  test('IST is honoured — at the UTC reading of the deadline the student is mid-paper', async () => {
    // 10:00 UTC is 15:30 IST: hours AFTER this exam. But the deadline instant
    // is 04:30 UTC. If the deadline were parsed as UTC rather than IST, "now =
    // 04:40 UTC" (= 10:10 IST... no: 04:40 UTC IS 10:10 IST) — the honest probe
    // is a moment that is BEFORE the true deadline but AFTER a naively-parsed
    // one. 03:45 UTC is 09:15 IST: mid-exam, yet past a UTC-parsed 03:30 start
    // and well past a UTC-parsed nothing. Nothing may be finalised here.
    const h = makeHarness([liveExam()], [attempt()]);

    const res = await h.service.sweepExpiredExamAttempts({ now: new Date(Date.UTC(2026, 7, 14, 3, 45)) });

    expect(h.finalized).toEqual([]);
    expect(res.graded).toBe(0);
  });

  test('a shorter DURATION wins over a later window close', async () => {
    // Window closes 12:00 IST but the paper is 60 minutes from a 09:00 start.
    const h = makeHarness([liveExam({ to_time: time(12) })], [attempt()]);

    const early = await h.service.sweepExpiredExamAttempts({ now: new Date(istInstant(9, 45)) });
    expect(early.graded).toBe(0);

    const late = await h.service.sweepExpiredExamAttempts({ now: new Date(istInstant(10, 6)) });
    expect(late.graded).toBe(1);
  });
});

describe('exam auto-submit — never writes a zero for someone who never answered', () => {
  test('a draft of all-empty answers is LEFT OPEN, not graded', async () => {
    const h = makeHarness([liveExam()], [attempt({ draft_answers: NOTHING_ANSWERED })]);

    const res = await h.service.sweepExpiredExamAttempts({ now: new Date(istInstant(11)) });

    expect(h.finalized).toEqual([]);
    expect(res.graded).toBe(0);
    // Reported honestly rather than silently: "absent / did not attempt".
    expect(res.skippedNoWork).toBe(1);
  });

  test('the pre-autosave backlog is excluded — no draft means nothing to grade', async () => {
    // The real production shape: 39 attempts, oldest March 2025, draft_answers
    // NULL because the column did not exist yet.
    const h = makeHarness(
      [liveExam()],
      [attempt({ draft_answers: null })],
    );

    const res = await h.service.sweepExpiredExamAttempts({ now: new Date(istInstant(11)) });

    expect(h.finalized).toEqual([]);
    expect(res.graded).toBe(0);
  });

  test('an old attempt is outside the lookback floor even if it somehow has a draft', async () => {
    const h = makeHarness(
      [liveExam({ from_date: new Date(Date.UTC(2025, 2, 18)) })],
      [attempt({ start_time: new Date(Date.UTC(2025, 2, 18, 11, 30)) })],
    );

    const res = await h.service.sweepExpiredExamAttempts({ now: new Date(istInstant(11)) });

    expect(h.finalized).toEqual([]);
    expect(res.graded).toBe(0);
  });
});

describe('exam auto-submit — scope', () => {
  test('a PRACTICE exam is never swept', async () => {
    // Practice has a duration but its window gate is skipped and retakes are
    // unlimited: sweeping would end a student's practice mid-question, forever.
    const h = makeHarness([liveExam({ is_practice: 1 })], [attempt()]);

    const res = await h.service.sweepExpiredExamAttempts({ now: new Date(istInstant(11)) });

    expect(h.finalized).toEqual([]);
    expect(res.graded).toBe(0);
  });

  test('a PARENT exam is never swept — students only sit children', async () => {
    const parent = liveExam({ id: 100 });
    const child = liveExam({ id: 101, parent_exam_id: 100 });
    const h = makeHarness([parent, child], [attempt({ exam_id: 100 })]);

    const res = await h.service.sweepExpiredExamAttempts({ now: new Date(istInstant(11)) });

    expect(h.finalized).toEqual([]);
    expect(res.graded).toBe(0);
  });

  test('an UNTIMED paper (no duration, no window close) is skipped, not force-ended', async () => {
    const h = makeHarness(
      [liveExam({ duration: null, to_date: null, to_time: null })],
      [attempt()],
    );

    const res = await h.service.sweepExpiredExamAttempts({ now: new Date(istInstant(23)) });

    expect(h.finalized).toEqual([]);
    expect(res.graded).toBe(0);
  });

  test('an attempt the student already submitted is skipped', async () => {
    const h = makeHarness([liveExam()], [attempt({ submit_status: true })]);

    await h.service.sweepExpiredExamAttempts({ now: new Date(istInstant(11)) });

    expect(h.finalized).toEqual([]);
  });

  test('the student wins a race decided between the scan and the write', async () => {
    const rows = [attempt()];
    const h = makeHarness([liveExam()], rows);
    // Submitted after the scan listed it, before the finalise.
    const original = (h.service as unknown as { prisma: { exam_attempt: { findUnique: unknown } } }).prisma;
    (original.exam_attempt as { findUnique: unknown }).findUnique = () =>
      Promise.resolve({ submit_status: true, draft_answers: ANSWERED });

    const res = await h.service.sweepExpiredExamAttempts({ now: new Date(istInstant(11)) });

    expect(h.finalized).toEqual([]);
    expect(res.skippedSubmitted).toBe(1);
  });

  test('only the NEWEST attempt per student+exam is finalised', async () => {
    // The evaluation list shows the highest id, so grading an older attempt
    // would leave the graded paper invisible to the evaluator.
    const h = makeHarness(
      [liveExam()],
      [attempt({ id: 9001 }), attempt({ id: 9002 })],
    );

    const res = await h.service.sweepExpiredExamAttempts({ now: new Date(istInstant(11)) });

    expect(res.graded).toBe(1);
    expect(h.finalized).toEqual([`${USER_ID}:9002`]);
  });
});
