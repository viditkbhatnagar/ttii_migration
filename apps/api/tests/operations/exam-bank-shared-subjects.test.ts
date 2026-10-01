import { describe, expect, test } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import { OperationsService } from '../../src/operations/operations-service.js';

// Risha 2026-10-01 — "We have added Question bank for all subjects including
// common subjects. But when I try to create PG exam — it's showing that we are
// short of questions."
//
// A question_bank row carries ONE course_id. The Montessori Diploma (course 16)
// and PG Diploma (course 18) SHARE five subjects through course_subject, and on
// production every one of those subjects' questions was filed under 16. The
// exam picker selected questions by `course_id IN (exam courses)`, so the PG
// exam saw "bank has 0 of 70" for all five while the Question Bank page — which
// counts by subject — showed 100+ each.
//
// The same exam (28) also carried 149 saved questions that had since been
// DELETED from the bank. Publishing copies each subject's questions into its own
// sitting and the student player silently drops deleted questions, so three
// sittings would have opened empty on exam day. Publishing now refuses that.

const DIPLOMA = 16;
const PG = 18;
const CHILD_PSYCHOLOGY = 27; // shared by 16 and 18, questions filed under 16
const FOUNDATION_IT = 44; // PG only, questions filed under 18
const DIPLOMA_ONLY = 99; // linked to 16 only — must never leak into a PG exam

interface BankRow { id: number; subject_id: number | null; course_id: number | null; q_type: number; deleted_at: Date | null }

const BANK: BankRow[] = [
  { id: 1, subject_id: CHILD_PSYCHOLOGY, course_id: DIPLOMA, q_type: 0, deleted_at: null },
  { id: 2, subject_id: FOUNDATION_IT, course_id: PG, q_type: 0, deleted_at: null },
  { id: 3, subject_id: DIPLOMA_ONLY, course_id: DIPLOMA, q_type: 0, deleted_at: null },
];

// Just enough of Prisma's where semantics for the filters these readers build.
function matchesWhere(row: BankRow, where: Record<string, unknown>): boolean {
  for (const [key, cond] of Object.entries(where)) {
    if (key === 'OR') {
      if (!(cond as Record<string, unknown>[]).some((c) => matchesWhere(row, c))) return false;
      continue;
    }
    const value = (row as unknown as Record<string, unknown>)[key];
    if (cond !== null && typeof cond === 'object' && 'in' in cond) {
      if (!(cond as { in: unknown[] }).in.includes(value)) return false;
    } else if (cond !== value) {
      return false;
    }
  }
  return true;
}

describe('the exam question picker', () => {
  function makeService(): { service: OperationsService; bankWhere: Record<string, unknown>[] } {
    const bankWhere: Record<string, unknown>[] = [];
    const prisma = {
      exam_courses: { findMany: () => Promise.resolve([{ course_id: PG }]) },
      exam: { findUnique: () => Promise.resolve({ course_id: PG }) },
      exam_subjects: {
        findMany: () => Promise.resolve([
          { id: 53, subject_id: CHILD_PSYCHOLOGY },
          { id: 59, subject_id: FOUNDATION_IT },
        ]),
      },
      course_subject: {
        findMany: ({ where }: { where: { course_id: { in: number[] } } }) => Promise.resolve(
          // course_subject pivot: 27 is linked to both courses, 44 to PG, 99 to Diploma.
          [
            { course_id: DIPLOMA, subject_id: CHILD_PSYCHOLOGY },
            { course_id: PG, subject_id: CHILD_PSYCHOLOGY },
            { course_id: PG, subject_id: FOUNDATION_IT },
            { course_id: DIPLOMA, subject_id: DIPLOMA_ONLY },
          ].filter((l) => where.course_id.in.includes(l.course_id)),
        ),
      },
      question_bank: {
        findMany: ({ where }: { where: Record<string, unknown> }) => {
          bankWhere.push(where);
          return Promise.resolve(BANK.filter((r) => matchesWhere(r, where)).map((r) => ({ ...r, title: `Q${r.id}`, number_of_options: 4 })));
        },
      },
      subject: {
        findMany: () => Promise.resolve([
          { id: CHILD_PSYCHOLOGY, title: 'Child Psychology' },
          { id: FOUNDATION_IT, title: 'Foundation To Information Technology' },
        ]),
      },
    } as unknown as PrismaClient;
    return { service: new OperationsService(prisma), bankWhere };
  }

  test('offers a shared subject\'s questions to a PG exam even when they are filed under the Diploma', async () => {
    const { service } = makeService();
    const options = await service.listExamQuestionOptions('28');
    const ids = options.map((o) => o.id);

    expect(ids).toContain(1); // Child Psychology, course 16 — the bug: this was missing
    expect(ids).toContain(2); // Foundation To IT, course 18
    expect(options.find((o) => o.id === 1)).toMatchObject({ exam_subject_id: 53, in_scheduled_subject: true });
  });

  test('never offers a subject that only belongs to the other course', async () => {
    const { service } = makeService();
    const ids = (await service.listExamQuestionOptions('28')).map((o) => o.id);
    expect(ids).not.toContain(3);
  });

  test('still excludes deleted questions', async () => {
    const { service, bankWhere } = makeService();
    await service.listExamQuestionOptions('28');
    expect(bankWhere[0]).toMatchObject({ deleted_at: null });
  });
});

describe('the Question Bank course filter', () => {
  test('counts a shared subject under every course it is linked to', async () => {
    let groupWhere: Record<string, unknown> = {};
    const prisma = {
      course_subject: {
        findMany: ({ where }: { where: { course_id?: { in: number[] }; subject_id?: { in: number[] } } }) => {
          if (where.course_id) return Promise.resolve([{ subject_id: CHILD_PSYCHOLOGY }, { subject_id: FOUNDATION_IT }]);
          return Promise.resolve([]);
        },
      },
      question_bank: {
        groupBy: ({ where }: { where: Record<string, unknown> }) => {
          groupWhere = where;
          return Promise.resolve([]);
        },
      },
    } as unknown as PrismaClient;
    await new OperationsService(prisma).listQuestionBankSubjects({ courseId: String(PG) });

    expect(groupWhere).toMatchObject({
      deleted_at: null,
      OR: [{ course_id: { in: [PG] } }, { subject_id: { in: [CHILD_PSYCHOLOGY, FOUNDATION_IT] } }],
    });
  });
});

describe('deleting a subject\'s questions from the course-filtered Question Bank list', () => {
  test('removes exactly the rows the list counted for that course', async () => {
    let listWhere: Record<string, unknown> = {};
    let deleteWhere: Record<string, unknown> = {};
    const prisma = {
      course_subject: { findMany: () => Promise.resolve([{ subject_id: CHILD_PSYCHOLOGY }, { subject_id: FOUNDATION_IT }]) },
      question_bank: {
        groupBy: ({ where }: { where: Record<string, unknown> }) => { listWhere = where; return Promise.resolve([]); },
        updateMany: ({ where }: { where: Record<string, unknown> }) => {
          deleteWhere = where;
          return Promise.resolve({ count: BANK.filter((r) => matchesWhere(r, where)).length });
        },
      },
    } as unknown as PrismaClient;
    const service = new OperationsService(prisma);
    await service.listQuestionBankSubjects({ courseId: String(PG), subjectId: String(CHILD_PSYCHOLOGY) });
    const res = await service.deleteQuestionsBySubject('7', String(CHILD_PSYCHOLOGY), String(PG));

    // Same filter both ways, so the PG-filtered "Delete all" reaches the
    // shared subject's questions filed under the Diploma instead of deleting 0.
    expect(deleteWhere).toMatchObject({ subject_id: CHILD_PSYCHOLOGY, OR: listWhere.OR });
    expect(res.message).toBe('1 question(s) deleted.');
  });
});

describe('saved exam questions', () => {
  test('flag the ones deleted from the Question Bank since they were saved', async () => {
    const prisma = {
      exam_questions: {
        findMany: () => Promise.resolve([
          { id: 1, question_id: 5, question_no: 1, mark: 1 },
          { id: 2, question_id: 6, question_no: 2, mark: 1 },
        ]),
      },
      question_bank: { findMany: () => Promise.resolve([{ id: 5 }]) }, // 6 is deleted
    } as unknown as PrismaClient;
    const rows = await new OperationsService(prisma).getExamQuestions('28');

    expect(rows.find((r) => r.question_id === 5)).toMatchObject({ question_deleted: false });
    expect(rows.find((r) => r.question_id === 6)).toMatchObject({ question_deleted: true });
  });
});

describe('publishing a subject-wise exam', () => {
  const day = new Date('2026-10-05T00:00:00Z');
  const t = new Date('1970-01-01T09:30:00Z');
  const schedule = [
    { id: 53, subject_id: CHILD_PSYCHOLOGY, subject_title: 'Child Psychology', exam_date: day, start_time: t, end_time: t, course_ids: String(PG), total_marks: 70, duration_minutes: 90 },
    { id: 59, subject_id: FOUNDATION_IT, subject_title: 'Foundation To Information Technology', exam_date: day, start_time: t, end_time: t, course_ids: String(PG), total_marks: 70, duration_minutes: 90 },
  ];

  function makePublish(opts: {
    questions: Array<{ question_id: number; subject_id: number; deleted: boolean }>;
    plan?: Array<{ exam_subject_id: number; num_questions: number }>;
    attemptedChildFor59?: boolean;
  }): OperationsService {
    const prisma = {
      exam: {
        findFirst: () => Promise.resolve({ id: 28, title: 'PG exam', exam_code: 'TTIIEXM2600008', course_id: PG, published_at: null, instructions: null }),
        findMany: () => Promise.resolve(opts.attemptedChildFor59 ? [{ id: 300, title: 'sitting', exam_subject_id: 59 }] : []),
      },
      exam_subjects: { findMany: () => Promise.resolve(schedule) },
      exam_attempt: {
        groupBy: () => Promise.resolve(opts.attemptedChildFor59 ? [{ exam_id: 300, _count: { id: 3 } }] : []),
      },
      exam_student_allocations: { findMany: () => Promise.resolve([]) },
      exam_questions: {
        findMany: () => Promise.resolve(opts.questions.map((q) => ({ question_id: q.question_id, mark: 1, negative_mark: null }))),
      },
      question_bank: {
        findMany: () => Promise.resolve(opts.questions.map((q) => ({
          id: q.question_id, subject_id: q.subject_id, course_id: q.subject_id === FOUNDATION_IT ? PG : DIPLOMA,
          deleted_at: q.deleted ? new Date('2026-09-30T10:00:00Z') : null,
        }))),
      },
      exam_subject_components: {
        findMany: () => Promise.resolve(opts.plan ?? [{ exam_subject_id: 53, num_questions: 70 }, { exam_subject_id: 59, num_questions: 70 }]),
      },
      // Reaching the write transaction means the guard let the publish through.
      $transaction: () => Promise.reject(new Error('REACHED_TRANSACTION')),
    } as unknown as PrismaClient;
    return new OperationsService(prisma);
  }

  const input = { notifyEmail: false, notifyInapp: false };

  test('refuses when a sitting\'s questions were deleted from the Question Bank, and names it', async () => {
    const service = makePublish({
      questions: [
        { question_id: 1, subject_id: CHILD_PSYCHOLOGY, deleted: false },
        { question_id: 2, subject_id: FOUNDATION_IT, deleted: true },
        { question_id: 3, subject_id: FOUNDATION_IT, deleted: true },
      ],
    });
    const res = await service.publishExam('7', '28', input);

    expect(res.status).toBe(0);
    expect(String(res.message)).toMatch(/Foundation To Information Technology \(2 of its saved questions were deleted/);
    expect(String(res.message)).not.toMatch(/Child Psychology/);
    expect(String(res.message)).toMatch(/Step 4 \(Assign Questions\)/);
  });

  test('refuses when a planned sitting has no questions at all', async () => {
    const service = makePublish({ questions: [{ question_id: 2, subject_id: FOUNDATION_IT, deleted: false }] });
    const res = await service.publishExam('7', '28', input);

    expect(res.status).toBe(0);
    expect(String(res.message)).toMatch(/no questions assigned but Step 3 plans some: Child Psychology/);
    // Auto-fill cannot fix an empty bank, so the advice must not stop at it.
    expect(String(res.message)).toMatch(/Question Bank|set their count to 0/);
  });

  test('lets a clean exam through to the publish itself', async () => {
    const service = makePublish({
      questions: [
        { question_id: 1, subject_id: CHILD_PSYCHOLOGY, deleted: false },
        { question_id: 2, subject_id: FOUNDATION_IT, deleted: false },
      ],
    });
    await expect(service.publishExam('7', '28', input)).rejects.toThrow('REACHED_TRANSACTION');
  });

  test('does not check a sitting students have already attempted (it is never re-sliced)', async () => {
    const service = makePublish({
      questions: [
        { question_id: 1, subject_id: CHILD_PSYCHOLOGY, deleted: false },
        { question_id: 2, subject_id: FOUNDATION_IT, deleted: true },
      ],
      attemptedChildFor59: true,
    });
    await expect(service.publishExam('7', '28', input)).rejects.toThrow('REACHED_TRANSACTION');
  });

  test('allows an empty sitting whose plan asks for no MCQ or descriptive questions', async () => {
    const service = makePublish({
      questions: [{ question_id: 2, subject_id: FOUNDATION_IT, deleted: false }],
      plan: [{ exam_subject_id: 59, num_questions: 70 }], // Child Psychology planned with none
    });
    await expect(service.publishExam('7', '28', input)).rejects.toThrow('REACHED_TRANSACTION');
  });
});
