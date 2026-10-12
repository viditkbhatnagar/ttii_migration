import { describe, expect, test } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import { OperationsService } from '../../src/operations/operations-service.js';

// TTII 2026-10-12 — the Question Bank must not silently change a live paper.
// A published exam is graded against the question's CURRENT row at submit, so
// an answer edit regraded only later submitters and a delete dropped the
// question from papers already in students' hands.

const IN_PUBLISHED = 501; // used by exam 23 (a sitting of published exam 22)
const IN_DRAFT = 502; // used by draft exam 40 only
const UNUSED = 503;

interface QRow {
  id: number;
  subject_id: number;
  course_id: number | null;
  q_type: number;
  title: string;
  options: string;
  correct_answers: string;
  title_file: string | null;
  deleted_at: Date | null;
}

function makeWorld() {
  const bank: QRow[] = [
    { id: IN_PUBLISHED, subject_id: 36, course_id: 16, q_type: 0, title: 'Who founded the Casa dei Bambini?', options: '["Montessori","Froebel"]', correct_answers: '[0]', title_file: 'img/q501.png', deleted_at: null },
    { id: IN_DRAFT, subject_id: 36, course_id: 16, q_type: 0, title: 'Practical life', options: '["A","B"]', correct_answers: '[1]', title_file: null, deleted_at: null },
    { id: UNUSED, subject_id: 36, course_id: 16, q_type: 1, title: 'Explain sensitive periods.', options: '[]', correct_answers: '[]', title_file: null, deleted_at: null },
  ];
  const updates: Array<{ where: Record<string, unknown>; data: Record<string, unknown> }> = [];
  const created: Array<Record<string, unknown>> = [];
  const prisma = {
    question_bank: {
      findFirst: ({ where }: { where: { id: number } }) => Promise.resolve(bank.find((q) => q.id === where.id && !q.deleted_at) ?? null),
      findMany: ({ where }: { where: Record<string, unknown> }) => {
        const subjectIn = (where.subject_id as { in?: number[] } | undefined)?.in;
        const subjectEq = typeof where.subject_id === 'number' ? where.subject_id : undefined;
        return Promise.resolve(bank.filter((q) => !q.deleted_at
          && (subjectIn ? subjectIn.includes(q.subject_id) : true)
          && (subjectEq !== undefined ? q.subject_id === subjectEq : true)));
      },
      updateMany: (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        updates.push(args);
        const notIn = ((args.where.NOT as { id?: { in?: number[] } } | undefined)?.id?.in) ?? [];
        const hit = bank.filter((q) => !q.deleted_at
          && (typeof args.where.id === 'number' ? q.id === args.where.id : true)
          && (typeof args.where.subject_id === 'number' ? q.subject_id === args.where.subject_id : true)
          && !notIn.includes(q.id));
        for (const q of hit) Object.assign(q, args.data);
        return Promise.resolve({ count: hit.length });
      },
      create: ({ data }: { data: Record<string, unknown> }) => { created.push(data); return Promise.resolve({ id: 900 + created.length }); },
    },
    exam_questions: {
      findMany: ({ where }: { where: { question_id: { in: number[] } } }) => Promise.resolve(
        [{ exam_id: 23, question_id: IN_PUBLISHED }, { exam_id: 40, question_id: IN_DRAFT }]
          .filter((l) => where.question_id.in.includes(l.question_id)),
      ),
    },
    exam: {
      findMany: ({ where }: { where: { id: { in: number[] } } }) => Promise.resolve(
        [
          { id: 23, parent_exam_id: 22, status: 'published', exam_code: 'TTIIEXM2600007-S47', title: 'Sitting' },
          { id: 22, parent_exam_id: null, status: 'published', exam_code: 'TTIIEXM2600007', title: 'Diploma Regular' },
          { id: 40, parent_exam_id: null, status: 'draft', exam_code: 'TTIIEXM2600009', title: 'Draft exam' },
        ].filter((e) => where.id.in.includes(e.id)),
      ),
    },
  } as unknown as PrismaClient;
  return { service: new OperationsService(prisma), bank, updates, created };
}

describe('a question in a published exam', () => {
  test('cannot have its answer changed', async () => {
    const w = makeWorld();
    const res = await w.service.editQuestion('1', String(IN_PUBLISHED), { correctAnswers: '[1]' });

    expect(res.status).toBe(0);
    expect(String(res.message)).toContain('TTIIEXM2600007');
    expect(w.bank[0]?.correct_answers).toBe('[0]');
  });

  test('can still have a typo in its wording fixed', async () => {
    const w = makeWorld();
    const res = await w.service.editQuestion('1', String(IN_PUBLISHED), {
      title: 'Who founded the Casa dei Bambini in Rome?',
      // The form re-sends the unchanged answer: that is not a grading change.
      options: '["Montessori","Froebel"]',
      correctAnswers: '[0]',
    });

    expect(res.status).toBe(1);
    expect(w.bank[0]?.title).toBe('Who founded the Casa dei Bambini in Rome?');
  });

  test('cannot be deleted, alone or with its subject', async () => {
    const w = makeWorld();
    expect((await w.service.deleteQuestion('1', String(IN_PUBLISHED))).status).toBe(0);

    const res = await w.service.deleteQuestionsBySubject('1', '36');
    expect(res.message).toBe('2 question(s) deleted. 1 kept because they are in published exams.');
    expect(w.bank.find((q) => q.id === IN_PUBLISHED)?.deleted_at).toBeNull();
  });
});

describe('ordinary edits', () => {
  test('a draft-only question may change its answer', async () => {
    const w = makeWorld();
    expect((await w.service.editQuestion('1', String(IN_DRAFT), { correctAnswers: '[0]' })).status).toBe(1);
  });

  test('an edit writes only what was sent — legacy images survive', async () => {
    const w = makeWorld();
    await w.service.editQuestion('1', String(IN_PUBLISHED), { title: 'Who founded the Casa dei Bambini?' });

    const data = w.updates.at(-1)?.data ?? {};
    expect(Object.keys(data)).not.toContain('title_file');
    expect(w.bank[0]?.title_file).toBe('img/q501.png');
  });

  test('a legacy question in an odd stored shape can still have its wording fixed when in use', async () => {
    const w = makeWorld();
    // Stored with spaces the validator would trim — the form re-sends the
    // normalised options, which is NOT a grading change.
    const q = w.bank[0];
    if (q) q.options = '[" Montessori ","Froebel"]';
    const res = await w.service.editQuestion('1', String(IN_PUBLISHED), {
      title: 'Who founded the first Casa dei Bambini?',
      options: '["Montessori","Froebel"]',
      correctAnswers: '[0]',
    });

    expect(res.status).toBe(1);
  });

  test('an invalid answer is refused before anything is written', async () => {
    const w = makeWorld();
    const res = await w.service.editQuestion('1', String(UNUSED), { qType: 0, options: '["A","B"]', correctAnswers: '[5]' });

    expect(res).toMatchObject({ status: 0, message: 'The correct answer must be one of the options.' });
    expect(w.updates).toHaveLength(0);
  });
});

describe('bulk upload', () => {
  const rows = [
    { subjectId: '36', qType: 0, title: 'who founded the casa dei bambini?', options: ['Montessori', 'Froebel'], correctAnswers: [0] },
    { subjectId: '36', qType: 0, title: 'New question', options: ['A', '', 'C'], correctAnswers: [2] },
    { subjectId: '36', qType: 0, title: 'Another new one', options: ['A', 'B', 'C'], correctAnswers: [2] },
    { subjectId: '36', qType: 0, title: 'Another  NEW one', options: ['A', 'B'], correctAnswers: [0] },
  ];

  test('a preview reports every row and writes nothing', async () => {
    const w = makeWorld();
    const res = await w.service.bulkAddQuestions('1', rows, { dryRun: true });

    expect(res.data).toMatchObject({ ready: 1, duplicates: 2, invalid: 1 });
    expect(w.created).toHaveLength(0);
  });

  test('the upload inserts only the valid, new rows', async () => {
    const w = makeWorld();
    const res = await w.service.bulkAddQuestions('1', rows);

    expect(w.created).toHaveLength(1);
    expect(w.created[0]).toMatchObject({ title: 'Another new one', correct_answers: '[2]', number_of_options: 3 });
    expect(res.message).toBe('1 question uploaded, 2 duplicates skipped, 1 with errors skipped.');
  });
});
