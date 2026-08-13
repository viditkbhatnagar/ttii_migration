import { describe, expect, test } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import { EngagementService } from '../../src/engagement/engagement-service.js';

// TTII 2026-08-13 — "exam scores are visible to students even before they are
// published". The student Dashboard's Recent Activity listed "Attempted Child
// Care and Health, Score: 69" straight off exam_attempt.score with no gate at
// all, while the assignment branch of the SAME feed was already gated on
// verified_at.
//
// `exam.publish_result` and `exam.result_published_at` both exist and both have
// a live admin action behind them (the Exams table row action and Evaluation →
// "Publish results" respectively), and neither back-fills the other — so the
// feed treats a result as published when EITHER is set.
//
// Pure test against a Prisma stub: the DB-backed engagement parity suite does
// not run in CI, so the load-bearing assertions live here.

const STUDENT_ID = 137;
const EXAM_ID = 10;

interface ExamRow {
  id: number;
  title: string;
  publish_result: boolean;
  result_published_at: Date | null;
}

/**
 * Prisma stub covering exactly the reads listStudentRecentActivity makes. Only
 * the exam attempt is populated — the other sources return empty so the
 * assertions below are unambiguous about which item they are looking at.
 */
function makeService(exam: ExamRow): EngagementService {
  const prisma = {
    assignment_submissions: { findMany: () => Promise.resolve([]) },
    $queryRaw: () => Promise.resolve([]),
    exam_attempt: {
      findMany: () =>
        Promise.resolve([
          {
            id: 5001,
            exam_id: EXAM_ID,
            score: 69,
            end_time: new Date('2026-08-12T15:15:00Z'),
            created_at: new Date('2026-08-12T14:00:00Z'),
          },
        ]),
    },
    live_class_attendance: { findMany: () => Promise.resolve([]) },
    video_progress_status: { findMany: () => Promise.resolve([]) },
    assignment: { findMany: () => Promise.resolve([]) },
    exam: { findMany: () => Promise.resolve([exam]) },
    live_class: { findMany: () => Promise.resolve([]) },
    lesson_files: { findMany: () => Promise.resolve([]) },
    cohorts: { findMany: () => Promise.resolve([]) },
    subject: { findMany: () => Promise.resolve([]) },
  } as unknown as PrismaClient;

  return new EngagementService(prisma);
}

function unpublished(): ExamRow {
  return { id: EXAM_ID, title: 'Child Care and Health', publish_result: false, result_published_at: null };
}

async function examItem(exam: ExamRow): Promise<{ title: string; detail: string }> {
  const items = await makeService(exam).listStudentRecentActivity(String(STUDENT_ID));
  const item = items.find((i) => i.type === 'exam');
  expect(item).toBeDefined();
  return { title: item?.title ?? '', detail: item?.detail ?? '' };
}

describe('recent activity — exam scores stay sealed until the exam is published', () => {
  test('an attempt on an UNPUBLISHED exam exposes no score anywhere in the item', async () => {
    const item = await examItem(unpublished());

    expect(item.detail).not.toContain('69');
    expect(item.detail).not.toMatch(/score/i);
    expect(item.title).not.toContain('69');
  });

  test('the learner still sees the attempt, reading as awaiting result', async () => {
    const item = await examItem(unpublished());

    // Not an error, not a zero, not a vanished attempt.
    expect(item.title).toBe('Attempted Child Care and Health');
    expect(item.detail).toBe('Result awaited');
  });

  test('publish_result alone publishes the score (Exams table row action)', async () => {
    const item = await examItem({ ...unpublished(), publish_result: true });
    expect(item.detail).toBe('Score: 69');
  });

  test('result_published_at alone publishes the score (Evaluation → Publish results)', async () => {
    const item = await examItem({
      ...unpublished(),
      result_published_at: new Date('2026-08-13T05:00:00Z'),
    });
    expect(item.detail).toBe('Score: 69');
  });

  test('mobile contract — detail is always a string, never null', async () => {
    for (const exam of [unpublished(), { ...unpublished(), publish_result: true }]) {
      const item = await examItem(exam);
      expect(typeof item.detail).toBe('string');
    }
  });
});

describe('recent activity — the assignment branch keeps its existing verified_at gate', () => {
  function makeAssignmentService(verifiedAt: Date | null): EngagementService {
    const prisma = {
      assignment_submissions: {
        findMany: () =>
          Promise.resolve([
            {
              id: 8001,
              assignment_id: 4101,
              marks: '25.5',
              created_at: new Date('2026-08-12T09:00:00Z'),
              verified_at: verifiedAt,
            },
          ]),
      },
      $queryRaw: () => Promise.resolve([]),
      exam_attempt: { findMany: () => Promise.resolve([]) },
      live_class_attendance: { findMany: () => Promise.resolve([]) },
      video_progress_status: { findMany: () => Promise.resolve([]) },
      assignment: {
        findMany: () => Promise.resolve([{ id: 4101, title: 'Case Study', cohort_id: null }]),
      },
      exam: { findMany: () => Promise.resolve([]) },
      live_class: { findMany: () => Promise.resolve([]) },
      lesson_files: { findMany: () => Promise.resolve([]) },
      cohorts: { findMany: () => Promise.resolve([]) },
      subject: { findMany: () => Promise.resolve([]) },
    } as unknown as PrismaClient;

    return new EngagementService(prisma);
  }

  test('an unverified submission emits the submission only — no grade item, no marks', async () => {
    const items = await makeAssignmentService(null).listStudentRecentActivity(String(STUDENT_ID));

    expect(items.some((i) => i.type === 'grade')).toBe(false);
    expect(items.some((i) => i.type === 'assignment')).toBe(true);
    expect(items.every((i) => !i.detail.includes('25.5'))).toBe(true);
  });

  test('a verified submission emits the grade item with its marks', async () => {
    const items = await makeAssignmentService(
      new Date('2026-08-13T06:30:00Z'),
    ).listStudentRecentActivity(String(STUDENT_ID));

    const grade = items.find((i) => i.type === 'grade');
    expect(grade?.detail).toBe('Marks: 25.5');
  });
});
