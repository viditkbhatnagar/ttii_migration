import { describe, expect, test } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import { AssessmentService } from '../../src/assessment/assessment-service.js';
import type { EmailProvider } from '../../src/integrations/contracts.js';

// TTII 2026-08-19 — "many students are unable to submit their assignment".
//
// While chasing that, the submit path turned out to have a way to lock a
// student out permanently. The multipart route silently drops a file part that
// yields zero bytes, so the service was called with no files at all; it then
// happily wrote an assignment_submissions row with assignment_files = null and
// answered "success". From that moment the student was finished: the duplicate
// check at the top of submitAssignment saw the row and told every later attempt
// "Assignment already submitted", while nothing had actually been submitted and
// the instructor had nothing to mark.
//
// These run against a hand-rolled Prisma stub, the same way
// result-publication-gate.test.ts does — the database-backed contract suites
// are skipped in CI, so this is the assertion that actually holds the line.

const emailStub = {
  name: 'stub',
  sendEmail: () => Promise.resolve({ id: 'stub' }),
} as unknown as EmailProvider;

const ASSIGNMENT_ID = 4101;
const STUDENT_ID = 137;

interface CreatedRow {
  assignment_files: string | null;
}

/**
 * Prisma stub covering the reads/writes submitAssignment makes. `alreadySubmitted`
 * models a student who has a row already; `created` captures what we tried to write.
 */
function makeService(alreadySubmitted: boolean): {
  service: AssessmentService;
  created: CreatedRow[];
} {
  const created: CreatedRow[] = [];

  const prisma = {
    assignment_submissions: {
      count: () => Promise.resolve(alreadySubmitted ? 1 : 0),
      create: ({ data }: { data: CreatedRow }) => {
        created.push(data);
        return Promise.resolve({ ...data, id: 9001 });
      },
    },
    assignment: {
      findFirst: () =>
        Promise.resolve({
          id: ASSIGNMENT_ID,
          cohort_id: 12,
          course_id: 16,
          title: 'Child Care & Health',
        }),
    },
    course: { findFirst: () => Promise.resolve({ title: 'NTT' }) },
    users: { findFirst: () => Promise.resolve(null) },
  } as unknown as PrismaClient;

  return {
    service: new AssessmentService({ prisma, integrations: { email: emailStub } }),
    created,
  };
}

describe('assignment submission — an empty submission must never be recorded', () => {
  test('a submit carrying no files is refused instead of written', async () => {
    const { service, created } = makeService(false);

    const result = await service.submitAssignment(String(STUDENT_ID), {
      assignmentId: String(ASSIGNMENT_ID),
      answerFiles: [],
    });

    // Refused...
    expect(result.status).toBe(0);
    expect(String(result.message)).toMatch(/no file was received/i);

    // ...and, the load-bearing part: NOTHING was written. A row here is what
    // used to lock the student out of their own assignment for good.
    expect(created).toHaveLength(0);
  });

  test('undefined answerFiles is refused too — that is the shape the multipart route produced', async () => {
    const { service, created } = makeService(false);

    // When every file part read as zero bytes, the route left answerFiles
    // undefined and called through anyway.
    const result = await service.submitAssignment(String(STUDENT_ID), {
      assignmentId: String(ASSIGNMENT_ID),
      answerFiles: undefined,
    });

    expect(result.status).toBe(0);
    expect(created).toHaveLength(0);
  });

  test('a real submission is still written, with its file recorded', async () => {
    const { service, created } = makeService(false);

    const result = await service.submitAssignment(String(STUDENT_ID), {
      assignmentId: String(ASSIGNMENT_ID),
      answerFiles: ['https://cdn.example/public/assignment-submissions/137-4101.pdf'],
    });

    expect(result.status).toBe(1);
    expect(created).toHaveLength(1);
    expect(String(created[0]?.assignment_files)).toContain('137-4101.pdf');
  });

  test('the duplicate check still answers first, so a genuine re-submit is named correctly', async () => {
    const { service, created } = makeService(true);

    // No files AND already submitted: the student must be told it is already
    // submitted, not "no file received" — the empty-file guard deliberately
    // sits after the duplicate check.
    const result = await service.submitAssignment(String(STUDENT_ID), {
      assignmentId: String(ASSIGNMENT_ID),
      answerFiles: [],
    });

    expect(result.status).toBe(0);
    expect(String(result.message)).toMatch(/already submitted/i);
    expect(created).toHaveLength(0);
  });
});
