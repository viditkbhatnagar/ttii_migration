import { describe, expect, test } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import { OperationsService } from '../../src/operations/operations-service.js';

// TTII 2026-08-13 — the other half of the result-publication gate.
//
// Sealing marks and scores from STUDENTS before publication is only correct if
// the people who do the publishing can still see them: an instructor grades
// before verification and an admin verifies by reading the marks. These tests
// pin that side of the contract, so a later tightening of the student read
// cannot quietly cripple the evaluation workflow it exists to serve.
//
// Pure tests against a Prisma stub — no database, so they run in CI alongside
// the student-side gates in tests/assessment and tests/engagement.

const UNPUBLISHED_EXAM = {
  id: 10,
  title: 'Child Care and Health',
  mark: 100,
  course_id: 3101,
  batch_id: null,
  // Neither publish flag is set: from a student's point of view this exam's
  // result does not exist yet.
  publish_result: false,
  result_published_at: null,
};

const SUBMITTED_ATTEMPT = {
  id: 5001,
  user_id: 137,
  exam_id: 10,
  score: 69,
  correct: 34,
  incorrect: 6,
  skip: 0,
  submit_status: true,
  deleted_at: null,
};

function makeExamService(): OperationsService {
  const prisma = {
    exam: {
      findMany: () => Promise.resolve([UNPUBLISHED_EXAM]),
      findFirst: () => Promise.resolve({ title: UNPUBLISHED_EXAM.title, mark: UNPUBLISHED_EXAM.mark }),
    },
    exam_attempt: { findMany: () => Promise.resolve([SUBMITTED_ATTEMPT]) },
    users: {
      findMany: () => Promise.resolve([{ id: 137, name: 'Test Learner', student_id: 'TTII26001' }]),
    },
  } as unknown as PrismaClient;

  return new OperationsService(prisma);
}

describe('admin exam reads are unaffected by the student publication gate', () => {
  test('Exam Results shows the score on an UNPUBLISHED exam', async () => {
    const { results } = await makeExamService().listAdminExamResults({ examId: '10' });

    expect(results).toHaveLength(1);
    expect(results[0]?.score).toBe(69);
    expect(results[0]?.student_name).toBe('Test Learner');
  });

  test('Exam Evaluation shows the score on an UNPUBLISHED exam', async () => {
    // This is the screen the admin uses to DECIDE whether to publish, so it
    // must read the raw attempt regardless of either publish flag.
    const { pendingEvaluations } = await makeExamService().listExamEvaluations({ examId: '10' });

    expect(pendingEvaluations).toHaveLength(1);
    expect(pendingEvaluations[0]?.score).toBe(69);
    expect(pendingEvaluations[0]?.correct).toBe(34);
  });
});

describe('admin assignment evaluation is unaffected by the student publication gate', () => {
  function makeAssignmentService(verifiedAt: Date | null): OperationsService {
    const prisma = {
      assignment_submissions: {
        findMany: () =>
          Promise.resolve([
            {
              id: 8001,
              user_id: 137,
              assignment_id: 4101,
              assignment_files: JSON.stringify(['public/assignment-submissions/137-4101.pdf']),
              marks: '25.5',
              remarks: 'Good structure, thin on referencing.',
              verified_at: verifiedAt,
              created_at: new Date('2026-08-12T09:00:00Z'),
              updated_at: new Date('2026-08-12T11:00:00Z'),
            },
          ]),
      },
      users: {
        findMany: () =>
          Promise.resolve([
            { id: 137, name: 'Test Learner', student_id: 'TTII26001', user_email: 'l@example.test', image: null, profile_picture: null, application_id: null },
          ]),
      },
      assignment: {
        findMany: () =>
          Promise.resolve([
            { id: 4101, title: 'Case Study', total_marks: '30', due_date: new Date('2026-08-20T00:00:00Z'), course_id: 3101, cohort_id: null, file: null },
          ]),
      },
      cohorts: { findMany: () => Promise.resolve([]) },
      course: { findMany: () => Promise.resolve([]) },
      subject: { findMany: () => Promise.resolve([]) },
      course_subject: { findMany: () => Promise.resolve([]) },
      applications: { findMany: () => Promise.resolve([]) },
      offerings: { findMany: () => Promise.resolve([]) },
    } as unknown as PrismaClient;

    return new OperationsService(prisma);
  }

  test('an UNVERIFIED submission still shows its marks, flagged pending_verification', async () => {
    const rows = await makeAssignmentService(null).listAdminAssignmentEvaluations();

    expect(rows).toHaveLength(1);
    // The admin must see the number to decide whether to publish it.
    expect(rows[0]?.marks).toBe('25.5');
    expect(rows[0]?.remarks).toBe('Good structure, thin on referencing.');
    // ...and must be told it is NOT yet published, which is the same signal the
    // student read now keys off.
    expect(rows[0]?.status).toBe('pending_verification');
    expect(rows[0]?.verified_at).toBeNull();
  });

  test('a VERIFIED submission reports result_published', async () => {
    const verifiedAt = new Date('2026-08-13T06:30:00Z');
    const rows = await makeAssignmentService(verifiedAt).listAdminAssignmentEvaluations();

    expect(rows[0]?.status).toBe('result_published');
    expect(rows[0]?.verified_at).toEqual(verifiedAt);
    expect(rows[0]?.marks).toBe('25.5');
  });
});
