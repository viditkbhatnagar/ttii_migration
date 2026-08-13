import { describe, expect, test } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import { EngagementService } from '../../src/engagement/engagement-service.js';
import { OperationsService } from '../../src/operations/operations-service.js';

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

interface ExamRowUpdate {
  where: { OR?: Array<Record<string, unknown>>; id?: number; parent_exam_id?: number; deleted_at: null };
  data: Record<string, unknown>;
}

/**
 * Prisma stub for the publish write. Models the real table well enough to know
 * WHICH rows an updateMany would touch: one parent plus its two sittings.
 */
function makePublishService(): { service: OperationsService; updated: () => number[]; calls: ExamRowUpdate[] } {
  const rows = [
    { id: PARENT_ID, parent_exam_id: null },
    { id: CHILD_IDS[0], parent_exam_id: PARENT_ID },
    { id: CHILD_IDS[1], parent_exam_id: PARENT_ID },
    // An unrelated exam that must never be caught by the cascade.
    { id: 99, parent_exam_id: null },
  ];
  const calls: ExamRowUpdate[] = [];
  const touched: number[] = [];

  const matches = (where: ExamRowUpdate['where'], row: { id: number; parent_exam_id: number | null }): boolean => {
    const clauses = where.OR ?? [where as Record<string, unknown>];
    return clauses.some((c) => {
      if ('id' in c && c.id !== undefined) return row.id === c.id;
      if ('parent_exam_id' in c && c.parent_exam_id !== undefined) return row.parent_exam_id === c.parent_exam_id;
      return false;
    });
  };

  const prisma = {
    exam: {
      updateMany: (args: ExamRowUpdate) => {
        calls.push(args);
        const hit = rows.filter((r) => matches(args.where, r));
        touched.push(...hit.map((r) => r.id));
        return Promise.resolve({ count: hit.length });
      },
    },
  } as unknown as PrismaClient;

  return { service: new OperationsService(prisma), updated: () => touched, calls };
}

describe('publishExamResult — publishing a subject-wise exam reaches its sittings', () => {
  test('publishing the PARENT publishes every child sitting, not just the parent row', async () => {
    const { service, updated } = makePublishService();

    await service.publishExamResult('1', String(PARENT_ID));

    // The whole point: before the fix this was [PARENT_ID] alone and no student
    // could ever see a result.
    expect(updated().sort()).toEqual([PARENT_ID, ...CHILD_IDS].sort());
  });

  test('it writes publish_result = true, the column the student read gates on', async () => {
    const { service, calls } = makePublishService();

    await service.publishExamResult('1', String(PARENT_ID));

    expect(calls).toHaveLength(1);
    expect(calls[0]?.data).toMatchObject({ publish_result: true });
    // Soft-deleted sittings must stay out of it.
    expect(calls[0]?.where.deleted_at).toBeNull();
  });

  test('it never touches an unrelated exam', async () => {
    const { service, updated } = makePublishService();

    await service.publishExamResult('1', String(PARENT_ID));

    expect(updated()).not.toContain(99);
  });

  test('the admin is told how many sittings were published', async () => {
    const { service } = makePublishService();

    const res = await service.publishExamResult('1', String(PARENT_ID));

    expect(res.status).toBe(1);
    expect(String(res.message)).toContain('2 subject sittings');
  });

  test('a single-sitting (legacy) exam still publishes, with the plain message', async () => {
    const { service, updated } = makePublishService();

    const res = await service.publishExamResult('1', '99');

    expect(updated()).toEqual([99]);
    expect(res.status).toBe(1);
    expect(res.message).toBe('Exam results published.');
  });

  test('an unknown exam id reports failure instead of a false success', async () => {
    const { service } = makePublishService();

    const res = await service.publishExamResult('1', '4242');

    expect(res.status).toBe(0);
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
