import { describe, expect, test } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import { AssessmentService } from '../../src/assessment/assessment-service.js';
import type { EmailProvider } from '../../src/integrations/contracts.js';

// TTII 2026-08-13 — "assignment grades are visible to students even before they
// are published".
//
// assignment_submissions carries a three-state evaluation workflow on the
// column itself: the instructor saves marks (→ Pending Verification, which
// CLEARS verified_at) and the admin clicks Verify (→ Result Published, which
// stamps it). The student read derived "reviewed" from `marks !== null &&
// remarks !== null`, i.e. from the instructor's own keystrokes, so the learner
// saw "Graded 25.5/30" the moment an instructor typed it and the admin's Verify
// step published nothing.
//
// Runs against a hand-rolled Prisma stub rather than a live database (same
// pattern as exam-autosave.test.ts): the logic under test is one boolean and
// the fields that hang off it, and a stub keeps the exact rows visible in the
// test itself. These assertions are the load-bearing ones — the database-backed
// parity suites do not run in CI.

const emailStub = {
  name: 'stub',
  sendEmail: () => Promise.resolve({ id: 'stub' }),
} as unknown as EmailProvider;

const ASSIGNMENT_ID = 4101;
const STUDENT_ID = 137;

/** The assignment row, exactly as Prisma hands the columns back. */
function assignmentRow(): Record<string, unknown> {
  return {
    id: ASSIGNMENT_ID,
    title: 'Child Care and Health — Case Study',
    description: 'Submit a 1500-word case study.',
    total_marks: '30',
    instructions: 'Cite at least three sources.',
    due_date: new Date('2026-08-20T00:00:00Z'),
    from_time: null,
    to_time: null,
    file: null,
  };
}

/**
 * A submission the instructor has already evaluated. `verified` decides the ONE
 * thing under test: whether the admin has since verified it.
 */
function submissionRow(verified: boolean): Record<string, unknown> {
  return {
    assignment_files: JSON.stringify(['public/assignment-submissions/137-4101.pdf']),
    marks: '25.5',
    remarks: 'Good structure, thin on referencing.',
    created_at: new Date('2026-08-12T09:00:00Z'),
    verified_at: verified ? new Date('2026-08-13T06:30:00Z') : null,
  };
}

/**
 * Prisma stub covering exactly the reads toAssignmentData makes. Passing
 * `submission: null` models a student who has not submitted at all.
 */
function makeService(submission: Record<string, unknown> | null): AssessmentService {
  const prisma = {
    saved_assignments: { count: () => Promise.resolve(0) },
    assignment_submissions: {
      count: () => Promise.resolve(submission ? 1 : 0),
      findFirst: () => Promise.resolve(submission),
    },
    assignment: {
      findFirst: () => Promise.resolve(assignmentRow()),
    },
  } as unknown as PrismaClient;

  return new AssessmentService({ prisma, integrations: { email: emailStub } });
}

async function readDetails(
  submission: Record<string, unknown> | null,
): Promise<Record<string, unknown>> {
  const details = await makeService(submission).getAssignmentDetails(
    String(STUDENT_ID),
    String(ASSIGNMENT_ID),
  );
  expect(details).not.toBeNull();
  return details as Record<string, unknown>;
}

describe('student assignment read — marks stay sealed until the admin verifies', () => {
  test('an evaluated-but-UNVERIFIED submission exposes no marks, no remarks, no graded flag', async () => {
    const details = await readDetails(submissionRow(false));

    // The graded flag. Every derived signal in the portal keys off this one:
    // the "Graded" pill, the score cell, the Grades page bars and its average.
    expect(details.is_reviewed).toBe(0);

    // The number itself, in either of the two fields that carry it.
    expect(details.marks).toBe('/30');
    expect(String(details.marks)).not.toContain('25.5');

    // Instructor feedback is a derived signal of the grade — it gives away the
    // verdict even without the number.
    expect(details.remarks).toBe('');
  });

  test('the learner still sees that their work was received', async () => {
    const details = await readDetails(submissionRow(false));

    // Not an error, not a zero, not a missing assignment: submitted, with the
    // paper's max marks and the student's own uploaded file intact.
    expect(details.is_submitted).toBe(1);
    expect(details.status).toBe('Completed');
    expect(details.total_marks).toBe('30');
    expect(Array.isArray(details.submitted_file)).toBe(true);
    expect((details.submitted_file as unknown[]).length).toBe(1);
  });

  test('a VERIFIED submission publishes marks and remarks', async () => {
    const details = await readDetails(submissionRow(true));

    expect(details.is_reviewed).toBe(1);
    expect(details.marks).toBe('25.5/30');
    expect(details.remarks).toBe('Good structure, thin on referencing.');
  });

  test('an unsubmitted assignment is unchanged — same shape, no leak', async () => {
    const details = await readDetails(null);

    expect(details.is_submitted).toBe(0);
    expect(details.is_reviewed).toBe(0);
    expect(details.marks).toBe('/30');
    expect(details.remarks).toBe('');
  });

  test('mobile contract — marks/remarks stay strings and submitted_file stays an array', async () => {
    // A null in any of these crashes the Flutter parse (String / List), so the
    // gate must blank them, never drop them.
    for (const submission of [submissionRow(false), submissionRow(true), null]) {
      const details = await readDetails(submission);
      expect(typeof details.marks).toBe('string');
      expect(typeof details.remarks).toBe('string');
      expect(Array.isArray(details.submitted_file)).toBe(true);
      expect(typeof details.is_reviewed).toBe('number');
    }
  });

  test('the list read is gated too — /assignment/index is the screen that leaked', async () => {
    // listAssignments funnels through the same toAssignmentData, but the report
    // was filed against the Assignments TAB, so assert the list explicitly
    // rather than trusting the shared helper.
    const prisma = {
      saved_assignments: { count: () => Promise.resolve(0) },
      assignment_submissions: {
        count: () => Promise.resolve(1),
        findFirst: () => Promise.resolve(submissionRow(false)),
      },
      assignment: { findMany: () => Promise.resolve([assignmentRow()]) },
    } as unknown as PrismaClient;
    const service = new AssessmentService({ prisma, integrations: { email: emailStub } });

    const buckets = await service.listAssignments(String(STUDENT_ID), { cohortId: '7001' });

    const completed = buckets.completed as Record<string, unknown>[];
    expect(completed).toHaveLength(1);
    expect(completed[0]?.is_reviewed).toBe(0);
    expect(completed[0]?.marks).toBe('/30');
    expect(completed[0]?.remarks).toBe('');
  });
});
