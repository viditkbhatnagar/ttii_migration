import { describe, expect, test } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import { EngagementService } from '../../src/engagement/engagement-service.js';
import type { EmailProvider } from '../../src/integrations/contracts.js';
import { ExamResultsService } from '../../src/operations/exam-results-service.js';

// Naji UAT 2026-08-13 — the MIRROR IMAGE of the result-publication gate, found
// by reviewing that gate rather than from a report. Sealing scores until
// publication is only safe if publication actually reaches the row the student
// sat, and for a subject-wise exam it did not:
//
//   listAdminExams pins parent_exam_id = null, so the Exams table lists PARENTS
//   -> its "Publish Result" row action therefore always sends the PARENT id
//   -> publishExamResult updated that one row and did not cascade
//   -> publishExam materialises children WITHOUT copying either publish flag
//   -> a student only ever sits a CHILD, so exam_attempt.exam_id is the child
//   -> the child stays unpublished forever.
//
// The failure was silent in the worst way: the row badge reads the PARENT's own
// publish_result, so the admin saw a green "Published" while every learner sat
// on "Result awaited" indefinitely, with nothing anywhere reporting a problem.
//
// Two independent defences are pinned below, because either alone leaves a hole:
//   1. the WRITE cascades parent -> sittings (fixes every future publish), and
//   2. the READ treats a child as published when its parent is (covers exams
//      published BEFORE the cascade existed, so production needs no back-fill).

const PARENT_ID = 10;
const CHILD_IDS = [11, 12] as const;

// TTII 2026-10-08 — publishing now lives in ExamResultsService, the single
// action behind Exam → Result and both older routes. The cascade above is still
// the contract; on top of it the action refuses to publish while a sitting is
// still open, refuses to publish twice, and emails each student once.

const NOW = new Date('2026-08-20T06:00:00Z');

interface StubExamRow {
  id: number;
  parent_exam_id: number | null;
  exam_subject_id: number | null;
  status: string;
  is_practice: number;
  publish_result: boolean;
  result_published_at: Date | null;
  to_date: Date | null;
}

interface ExamRowUpdate {
  where: Record<string, unknown> & { deleted_at: null };
  data: Record<string, unknown>;
}

function examRow(id: number, overrides: Partial<StubExamRow> = {}): Record<string, unknown> {
  return {
    id,
    exam_code: `EX${id}`,
    title: `Exam ${id}`,
    course_id: null,
    parent_exam_id: null,
    exam_subject_id: null,
    status: 'published',
    is_practice: 0,
    mark: 70,
    duration: '75',
    from_date: new Date('2026-08-10T00:00:00Z'),
    from_time: new Date('1970-01-01T19:30:00Z'),
    to_date: new Date('2026-08-10T00:00:00Z'),
    to_time: new Date('1970-01-01T20:45:00Z'),
    publish_result: false,
    result_published_at: null,
    result_published_by: null,
    ...overrides,
  };
}

function makePublishService(opts: { childOpen?: boolean; alreadyPublished?: boolean; now?: Date } = {}): {
  service: ExamResultsService;
  updated: () => number[];
  calls: ExamRowUpdate[];
  mailed: string[];
} {
  const rows = [
    examRow(PARENT_ID, opts.alreadyPublished ? { publish_result: true } : {}),
    examRow(CHILD_IDS[0], { parent_exam_id: PARENT_ID, exam_subject_id: 1 }),
    examRow(CHILD_IDS[1], {
      parent_exam_id: PARENT_ID,
      exam_subject_id: 2,
      // Still to be sat when the admin presses Publish.
      ...(opts.childOpen ? { from_date: new Date('2026-08-25T00:00:00Z'), to_date: new Date('2026-08-25T00:00:00Z') } : {}),
    }),
    // An unrelated exam that must never be caught by the cascade.
    examRow(99),
  ];
  const calls: ExamRowUpdate[] = [];
  const touched: number[] = [];
  const mailed: string[] = [];

  // Models the real WHERE: every listed column must match (null and false
  // included), so the "not yet published" guard on the claim is honoured.
  const matches = (where: Record<string, unknown>, row: Record<string, unknown>): boolean =>
    Object.entries(where).every(([col, want]) => col === 'deleted_at' || row[col] === want);

  const prisma = {
    exam: {
      findFirst: ({ where }: { where: { id: number } }) => Promise.resolve(rows.find((r) => r.id === where.id) ?? null),
      findMany: ({ where }: { where: { parent_exam_id: number } }) =>
        Promise.resolve(rows.filter((r) => r.parent_exam_id === where.parent_exam_id)),
      updateMany: (args: ExamRowUpdate) => {
        calls.push(args);
        const hit = rows.filter((r) => matches(args.where, r));
        for (const r of hit) Object.assign(r, args.data);
        touched.push(...hit.map((r) => r.id as number));
        return Promise.resolve({ count: hit.length });
      },
    },
    exam_subjects: {
      findMany: () => Promise.resolve([
        { id: 1, subject_title: 'Child Psychology', total_marks: 70, pass_marks: 25 },
        { id: 2, subject_title: 'Child Care and Health', total_marks: 70, pass_marks: 25 },
      ]),
    },
    exam_student_allocations: { findMany: () => Promise.resolve([{ user_id: 142 }, { user_id: 143 }, { user_id: 137 }]) },
    exam_courses: { findMany: () => Promise.resolve([]) },
    course: { findMany: () => Promise.resolve([]) },
    users: {
      // role_id 2 filter applied by the service — 137 (staff) is never returned.
      findMany: () => Promise.resolve([
        { id: 142, name: 'Asha K', student_id: 'TTS0001', user_email: 'asha@example.com', email: null },
        { id: 143, name: 'Bindu R', student_id: 'TTS0002', user_email: null, email: '9847000000' },
      ]),
      findFirst: () => Promise.resolve({ name: 'Admin' }),
    },
    exam_attempt: { findMany: () => Promise.resolve([]) },
    exam_re_examinations: { findMany: () => Promise.resolve([]) },
    quiz: { findMany: () => Promise.resolve([]) },
  } as unknown as PrismaClient;

  const email = {
    name: 'stub',
    sendEmail: ({ to }: { to: string }) => { mailed.push(to); return Promise.resolve({ accepted: true }); },
  } as unknown as EmailProvider;

  return { service: new ExamResultsService(prisma, { email, now: () => opts.now ?? NOW }), updated: () => touched, calls, mailed };
}

describe('publishing results — the whole exam at once', () => {
  test('publishing the PARENT publishes every child sitting, not just the parent row', async () => {
    const { service, updated } = makePublishService();

    const res = await service.publish(1, PARENT_ID);

    expect(res.status).toBe(1);
    // Before 2026-08-13 this was [PARENT_ID] alone and no student could ever see a result.
    expect(updated().sort()).toEqual([PARENT_ID, ...CHILD_IDS].sort());
    expect(updated()).not.toContain(99);
  });

  test('a SITTING id publishes its whole exam — subjects are never published one by one', async () => {
    const { service, updated } = makePublishService();

    await service.publish(1, CHILD_IDS[0]);

    expect(updated().sort()).toEqual([PARENT_ID, ...CHILD_IDS].sort());
  });

  test('both columns the student reads are written, soft-deleted sittings excluded', async () => {
    const { service, calls } = makePublishService();

    await service.publish(7, PARENT_ID);

    // The guarded claim on the exam itself, then its sittings.
    expect(calls).toHaveLength(2);
    expect(calls[0]?.where).toMatchObject({ id: PARENT_ID, publish_result: false, result_published_at: null });
    for (const call of calls) {
      expect(call.data).toMatchObject({ publish_result: true, result_published_at: NOW, result_published_by: 7 });
      expect(call.where.deleted_at).toBeNull();
    }
  });

  test('a double-click publishes and emails once', async () => {
    const { service, mailed } = makePublishService();

    const [a, b] = await Promise.all([service.publish(1, PARENT_ID), service.publish(1, PARENT_ID)]);

    expect([a.status, b.status].sort()).toEqual([0, 1]);
    expect(mailed).toEqual(['asha@example.com']);
  });

  test('refused inside the auto-submit window after the last sitting closes', async () => {
    // Both sittings close 10 Aug 08:45 PM IST (15:15Z). A paper still running
    // then is finalised by the server up to 5 minutes later.
    const { service, calls } = makePublishService({ now: new Date('2026-08-10T15:17:00Z') });

    const res = await service.publish(1, PARENT_ID);

    expect(res.status).toBe(0);
    expect(calls).toHaveLength(0);
  });

  test('each student is emailed once; a phone number in the email column is skipped', async () => {
    const { service, mailed } = makePublishService();

    const res = await service.publish(1, PARENT_ID);

    expect(mailed).toEqual(['asha@example.com']);
    expect(res.message).toContain('2 subject sittings');
    expect(res.message).toContain('1 student notified');
  });

  test('refused while a sitting is still to be held — nothing written, nobody emailed', async () => {
    const { service, calls, mailed } = makePublishService({ childOpen: true });

    const res = await service.publish(1, PARENT_ID);

    expect(res.status).toBe(0);
    expect(res.message).toContain('2026-08-25');
    expect(calls).toHaveLength(0);
    expect(mailed).toHaveLength(0);
  });

  test('refused when already published, so students are not emailed twice', async () => {
    const { service, calls, mailed } = makePublishService({ alreadyPublished: true });

    const res = await service.publish(1, PARENT_ID);

    expect(res.status).toBe(0);
    expect(calls).toHaveLength(0);
    expect(mailed).toHaveLength(0);
  });

  test('an unknown exam id reports failure instead of a false success', async () => {
    const { service } = makePublishService();

    expect((await service.publish(1, 4242)).status).toBe(0);
  });
});

// ─── Read side: a child inherits its parent's published state ────────────────

const ATTEMPT_SCORE = 69;

interface StubExam {
  id: number;
  title: string;
  publish_result: boolean;
  result_published_at: Date | null;
  parent_exam_id: number | null;
  is_practice: number;
}

/**
 * Stub for listStudentRecentActivity. `exam.findMany` is WHERE-AWARE because the
 * gate now issues a second lookup for parent rows — a stub that returned the
 * same array to both calls would test nothing.
 */
function makeFeedService(exams: StubExam[], attemptExamId: number): EngagementService {
  const prisma = {
    assignment_submissions: { findMany: () => Promise.resolve([]) },
    $queryRaw: () => Promise.resolve([]),
    exam_attempt: {
      findMany: () =>
        Promise.resolve([
          {
            id: 5001,
            exam_id: attemptExamId,
            score: ATTEMPT_SCORE,
            end_time: new Date('2026-08-12T15:15:00Z'),
            created_at: new Date('2026-08-12T14:00:00Z'),
          },
        ]),
    },
    live_class_attendance: { findMany: () => Promise.resolve([]) },
    video_progress_status: { findMany: () => Promise.resolve([]) },
    assignment: { findMany: () => Promise.resolve([]) },
    exam: {
      findMany: (args: { where: { id: { in: number[] } } }) =>
        Promise.resolve(exams.filter((e) => args.where.id.in.includes(e.id))),
    },
    live_class: { findMany: () => Promise.resolve([]) },
    lesson_files: { findMany: () => Promise.resolve([]) },
    cohorts: { findMany: () => Promise.resolve([]) },
    subject: { findMany: () => Promise.resolve([]) },
  } as unknown as PrismaClient;

  return new EngagementService(prisma);
}

function parentRow(overrides: Partial<StubExam> = {}): StubExam {
  return {
    id: PARENT_ID,
    title: 'Montessori Teacher Training',
    publish_result: false,
    result_published_at: null,
    parent_exam_id: null,
    is_practice: 0,
    ...overrides,
  };
}

function childRow(overrides: Partial<StubExam> = {}): StubExam {
  return {
    id: CHILD_IDS[0],
    title: 'Child Care and Health',
    publish_result: false,
    result_published_at: null,
    parent_exam_id: PARENT_ID,
    is_practice: 0,
    ...overrides,
  };
}

async function detailFor(exams: StubExam[], attemptExamId: number): Promise<string> {
  const items = await makeFeedService(exams, attemptExamId).listStudentRecentActivity('137');
  return items.find((i) => i.type === 'exam')?.detail ?? '';
}

describe('recent activity — a sitting counts as published when its parent is', () => {
  test('parent published, child flags unset: the score IS shown', async () => {
    const detail = await detailFor(
      [childRow(), parentRow({ publish_result: true })],
      CHILD_IDS[0],
    );

    // Without the parent fallback this read "Result awaited" forever.
    expect(detail).toBe(`Score: ${ATTEMPT_SCORE}`);
  });

  test('the parent fallback accepts result_published_at too (Evaluation path)', async () => {
    const detail = await detailFor(
      [childRow(), parentRow({ result_published_at: new Date('2026-08-13T05:00:00Z') })],
      CHILD_IDS[0],
    );

    expect(detail).toBe(`Score: ${ATTEMPT_SCORE}`);
  });

  test('parent NOT published: the child still seals the score', async () => {
    const detail = await detailFor([childRow(), parentRow()], CHILD_IDS[0]);

    expect(detail).toBe('Result awaited');
    expect(detail).not.toContain(String(ATTEMPT_SCORE));
  });

  test('a published SIBLING does not leak this sitting', async () => {
    // Sibling published on its own row; the sat child and the parent are not.
    const detail = await detailFor(
      [childRow(), childRow({ id: CHILD_IDS[1], publish_result: true }), parentRow()],
      CHILD_IDS[0],
    );

    expect(detail).toBe('Result awaited');
  });
});

describe('recent activity — a practice paper is self-assessment, not an institute result', () => {
  test('an unpublished PRACTICE exam still shows the score', async () => {
    // The practice exam is seeded with publish_result = false and nothing ever
    // publishes it, so gating it promised a result that could never arrive —
    // on production that was 48 of the submitted attempts.
    const detail = await detailFor([parentRow({ title: 'Practice Exam', is_practice: 1 })], PARENT_ID);

    expect(detail).toBe(`Score: ${ATTEMPT_SCORE}`);
  });

  test('a REAL unpublished exam is still sealed (the practice exemption is narrow)', async () => {
    const detail = await detailFor([parentRow({ is_practice: 0 })], PARENT_ID);

    expect(detail).toBe('Result awaited');
  });
});
