import { describe, expect, test } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import {
  QuestionBankService,
  isTrueFalseOptions,
  parseQuestionCode,
  questionCode,
  toIdList,
} from '../../src/operations/question-bank-service.js';

// TTII 2026-10-12 — Question Bank in Naji's design. Stubbed Prisma: every
// table is an in-memory array filtered by a small evaluator of the where
// shapes the service uses (equality, null, in, contains, gte, AND / OR / NOT).

type Row = Record<string, unknown>;

const text = (v: unknown): string => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '');

function matches(row: Row, where: Row | undefined): boolean {
  if (!where) return true;
  return Object.entries(where).every(([key, cond]) => {
    if (key === 'AND') return (cond as Row[]).every((w) => matches(row, w));
    if (key === 'OR') return (cond as Row[]).some((w) => matches(row, w));
    if (key === 'NOT') return !matches(row, cond as Row);
    const value = row[key];
    if (cond === null) return value === null || value === undefined;
    if (cond instanceof Date) return value instanceof Date && value.getTime() === cond.getTime();
    if (typeof cond !== 'object') return value === cond;
    const c = cond as { in?: unknown[]; contains?: string; gte?: Date };
    if (c.in !== undefined && !c.in.includes(value)) return false;
    if (c.contains !== undefined && !text(value).toLowerCase().includes(c.contains.toLowerCase())) return false;
    if (c.gte !== undefined && !(value instanceof Date && value >= c.gte)) return false;
    return true;
  });
}

function table(rows: Row[]) {
  return {
    rows,
    findMany: ({ where, orderBy }: { where?: Row; orderBy?: Row | Row[] } = {}) => {
      const out = rows.filter((r) => matches(r, where));
      const first = Array.isArray(orderBy) ? orderBy[0] : orderBy;
      const key = first ? Object.keys(first)[0] : undefined;
      if (key) out.sort((a, b) => text(a[key]).localeCompare(text(b[key])));
      return Promise.resolve(out);
    },
    findFirst: ({ where }: { where?: Row }) => Promise.resolve(rows.find((r) => matches(r, where)) ?? null),
    updateMany: ({ where, data }: { where: Row; data: Row }) => {
      const hit = rows.filter((r) => matches(r, where));
      for (const r of hit) Object.assign(r, data);
      return Promise.resolve({ count: hit.length });
    },
  };
}

const NOW = new Date('2026-10-12T06:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);

// Subjects: 36 shared by Diploma (16) and PG (18); 40 Diploma only; 41 PG only
// with NO questions; 50 deleted. Exam 22 (published) uses question 501 via its
// sitting 23; draft exam 40 uses 502.
function makeWorld() {
  const q = (id: number, subject: number, qType: number, title: string, extra: Row = {}): Row => ({
    id, subject_id: subject, course_id: 16, lesson_id: null, q_type: qType, title, options: qType === 1 ? '[]' : '["A","B"]',
    created_by: 7, created_at: daysAgo(30), updated_at: daysAgo(30), deleted_at: null, ...extra,
  });
  const bank = table([
    q(501, 36, 0, 'Who founded the Casa dei Bambini?', { updated_at: daysAgo(2) }),
    q(502, 36, 0, 'Practical life exercises', { lesson_id: 900 }),
    q(503, 36, 1, 'Explain sensitive periods.', { created_by: 8, created_at: daysAgo(1), updated_at: daysAgo(1) }),
    q(504, 40, 0, 'The prepared environment is child-centred.', { options: '["True","False"]' }),
    q(505, 40, 1, 'Describe the role of the directress.'),
    q(506, 50, 0, 'Question in a deleted subject'),
    q(507, 36, 0, 'Deleted question', { deleted_at: daysAgo(3) }),
  ]);
  const prisma = {
    question_bank: bank,
    subject: table([
      { id: 36, title: 'Montessori Philosophy', subject_code: 'MP-101', status: 'active', course_id: 16, deleted_at: null },
      { id: 40, title: 'Child Psychology', subject_code: 'CP-102', status: 'active', course_id: 16, deleted_at: null },
      { id: 41, title: 'Classroom Management', subject_code: 'PG-201', status: null, course_id: 18, deleted_at: null },
      { id: 50, title: 'Old subject', subject_code: 'OLD', status: 'active', course_id: 16, deleted_at: daysAgo(100) },
    ]),
    course_subject: table([
      { course_id: 16, subject_id: 36, position: 1, deleted_at: null },
      { course_id: 18, subject_id: 36, position: 1, deleted_at: null },
      { course_id: 16, subject_id: 40, position: 2, deleted_at: null },
      { course_id: 18, subject_id: 41, position: 2, deleted_at: null },
    ]),
    course: table([
      { id: 16, title: 'Diploma in Montessori', deleted_at: null },
      { id: 18, title: 'PG Diploma in Montessori', deleted_at: null },
    ]),
    lesson: table([{ id: 900, subject_id: 36 }]),
    users: table([{ id: 7, name: 'Risha' }, { id: 8, name: 'Naji' }]),
    exam_questions: table([
      { exam_id: 23, question_id: 501, deleted_at: null },
      { exam_id: 40, question_id: 502, deleted_at: null },
    ]),
    exam: table([
      { id: 23, parent_exam_id: 22, status: 'published', exam_code: 'TTIIEXM2600007-S47', title: 'Sitting', deleted_at: null },
      { id: 22, parent_exam_id: null, status: 'published', exam_code: 'TTIIEXM2600007', title: 'Diploma Regular', deleted_at: null },
      { id: 40, parent_exam_id: null, status: 'draft', exam_code: 'TTIIEXM2600009', title: 'Draft exam', deleted_at: null },
    ]),
  };
  const service = new QuestionBankService(prisma as unknown as PrismaClient, { now: () => NOW });
  return { service, bank: bank.rows };
}

describe('question codes and ids', () => {
  test('Q-00123 round-trips and plain numbers are accepted', () => {
    expect(questionCode(123)).toBe('Q-00123');
    expect(parseQuestionCode('Q-00123')).toBe(123);
    expect(parseQuestionCode(' q123 ')).toBe(123);
    expect(parseQuestionCode('123')).toBe(123);
    expect(parseQuestionCode('practical')).toBeNull();
    expect(parseQuestionCode('Q-0')).toBeNull();
  });

  test('bulk ids are positive, unique integers', () => {
    expect(toIdList([3, '4', '4', -1, 'x', 0, 2.5])).toEqual([3, 4]);
    expect(toIdList('5,6')).toEqual([5, 6]);
    expect(toIdList(undefined)).toEqual([]);
  });

  test('True / False is read the same way as the page: any case or spacing, true then false', () => {
    expect(isTrueFalseOptions('["True","False"]')).toBe(true);
    expect(isTrueFalseOptions('[" true ","FALSE"]')).toBe(true);
    expect(isTrueFalseOptions('["False","True"]')).toBe(false);
    expect(isTrueFalseOptions('["True","False","Maybe"]')).toBe(false);
    expect(isTrueFalseOptions('not json')).toBe(false);
  });
});

describe('the subject list', () => {
  test('lists every live subject, including one with no questions yet', async () => {
    const { service } = makeWorld();
    const res = await service.overview();

    expect(res.subjects.map((s) => s.id)).toEqual([40, 41, 36]); // by title
    const empty = res.subjects.find((s) => s.id === 41);
    expect(empty).toMatchObject({ total: 0, mcq: 0, descriptive: 0, lastUpdated: null, status: 'draft', courses: [{ id: 18, title: 'PG Diploma in Montessori' }] });
    const shared = res.subjects.find((s) => s.id === 36);
    expect(shared).toMatchObject({ total: 3, mcq: 2, descriptive: 1, recent: 1, matching: null });
    expect(shared?.courses.map((c) => c.id)).toEqual([16, 18]);
    expect(shared?.lastUpdated).toBe(daysAgo(1).toISOString());
  });

  test('KPIs count live questions in live subjects only', async () => {
    const { service } = makeWorld();
    const res = await service.overview();

    expect(res.kpis).toEqual({ subjects: 3, questions: 5, mcq: 3, descriptive: 2, recent: 1 });
    expect(res.authors).toEqual([{ id: 8, name: 'Naji' }, { id: 7, name: 'Risha' }]);
  });

  test('a course shows its linked subjects — shared ones with every question', async () => {
    const { service } = makeWorld();
    const res = await service.overview({ courseId: 18 });

    expect(res.subjects.map((s) => s.id).sort()).toEqual([36, 41]);
    expect(res.subjects.find((s) => s.id === 36)?.total).toBe(3);
    expect(res.kpis.questions).toBe(3);
  });

  test('type, author and recent filters keep only subjects with a match', async () => {
    const { service } = makeWorld();

    expect((await service.overview({ qType: 'descriptive' })).subjects.map((s) => [s.id, s.matching])).toEqual([[40, 1], [36, 1]]);
    expect((await service.overview({ qType: 'tf' })).subjects.map((s) => s.id)).toEqual([40]);
    expect((await service.overview({ createdBy: 8 })).subjects.map((s) => s.id)).toEqual([36]);
    expect((await service.overview({ recent: true })).subjects.map((s) => s.id)).toEqual([36]);
  });

  test('search finds a subject by name or code, or by a question text or Q-id', async () => {
    const { service } = makeWorld();

    expect((await service.overview({ q: 'classroom' })).subjects.map((s) => s.id)).toEqual([41]);
    expect((await service.overview({ q: 'CP-102' })).subjects.map((s) => s.id)).toEqual([40]);
    expect((await service.overview({ q: 'sensitive' })).subjects.map((s) => [s.id, s.matching])).toEqual([[36, 1]]);
    expect((await service.overview({ q: 'Q-00505' })).subjects.map((s) => s.id)).toEqual([40]);
    // A subject matched by name is still narrowed by the other filters.
    expect((await service.overview({ q: 'classroom', qType: 'mcq' })).subjects).toEqual([]);
  });

  test('one subject header works with no questions, and a deleted subject is not found', async () => {
    const { service } = makeWorld();

    expect((await service.subject(41))?.subject).toMatchObject({ id: 41, total: 0, code: 'PG-201' });
    expect(await service.subject(50)).toBeNull();
    expect((await service.subject(36))?.authors.map((a) => a.name)).toEqual(['Naji', 'Risha']);
  });
});

describe('bulk move', () => {
  test('moves what it can and reports every question it kept', async () => {
    const { service, bank } = makeWorld();
    const res = await service.bulkMove(1, [501, 502, 503, 504, 999], 41);

    expect(res.status).toBe(1);
    expect(res.message).toBe('3 questions moved to Classroom Management. 2 skipped.');
    const skipped = (res.data as { skipped: Array<{ id: number; reason: string }> }).skipped;
    expect(skipped.find((s) => s.id === 501)?.reason).toContain('TTIIEXM2600007');
    expect(skipped.find((s) => s.id === 999)?.reason).toContain('Not found');

    const moved = bank.find((r) => r.id === 502);
    // Course 16 does not have subject 41, so it is filed under 41's course; the
    // lesson belonged to the old subject and is dropped.
    expect(moved).toMatchObject({ subject_id: 41, course_id: 18, lesson_id: null, updated_by: 1 });
    expect(bank.find((r) => r.id === 501)?.subject_id).toBe(36);
  });

  test('keeps the course when it has the target subject, and skips duplicates and no-ops', async () => {
    const { service, bank } = makeWorld();
    const q = bank.find((r) => r.id === 505);
    if (q) q.title = 'Practical  LIFE exercises'; // same as 502 in subject 36
    const res = await service.bulkMove(1, [505, 503, 504], 36);

    const skipped = (res.data as { skipped: Array<{ id: number; reason: string }> }).skipped;
    expect(skipped.map((s) => s.id).sort()).toEqual([503, 505]);
    expect(bank.find((r) => r.id === 504)).toMatchObject({ subject_id: 36, course_id: 16 });
  });

  test('refuses without a live target subject or a selection', async () => {
    const { service } = makeWorld();
    expect((await service.bulkMove(1, [502], 50)).status).toBe(0);
    expect((await service.bulkMove(1, [], 36)).status).toBe(0);
  });

  test('nothing movable is a refusal, not a success', async () => {
    const { service } = makeWorld();
    const res = await service.bulkMove(1, [501], 40);
    expect(res.status).toBe(0);
    expect(res.message).toBe('0 questions moved to Child Psychology. 1 skipped.');
  });
});

describe('bulk delete', () => {
  test('soft-deletes the rest and keeps a question in a published exam', async () => {
    const { service, bank } = makeWorld();
    const res = await service.bulkDelete(1, [501, 502, 503]);

    expect(res.message).toBe('2 questions deleted. 1 kept.');
    expect(bank.find((r) => r.id === 501)?.deleted_at).toBeNull();
    expect(bank.find((r) => r.id === 502)).toMatchObject({ deleted_by: 1, deleted_at: NOW });
    // A draft exam does not protect a question.
    expect(bank.find((r) => r.id === 503)?.deleted_at).toBe(NOW);
  });

  test('only published questions selected → refused with the reason', async () => {
    const { service } = makeWorld();
    const res = await service.bulkDelete(1, [501]);
    expect(res.status).toBe(0);
    expect((res.data as { skipped: Array<{ reason: string }> }).skipped[0]?.reason).toContain('cannot be deleted');
  });
});
