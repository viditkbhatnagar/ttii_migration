import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import { AssessmentService } from '../../src/assessment/assessment-service.js';
import type { EmailProvider } from '../../src/integrations/contracts.js';

// TTII 2026-10-26 — "students are unable to do practice exam". The practice
// exam (id 8: no dates, 15 minutes) resumed a student's UNSUBMITTED attempt
// from days ago. Its own 15 minutes had long run out, so the player opened on
// 0 seconds — "This exam has closed" — on every visit. Practice skips the gate
// that finalises expired attempts and the sweep skips practice, so nothing ever
// cleared it (21 students stuck). An expired practice attempt is now graded
// (if anything was answered) or discarded, and a fresh run starts.

interface Attempt {
  id: number; user_id: number; exam_id: number; question_id: string; start_time: Date;
  submit_status: boolean; draft_answers: string | null; deleted_at: Date | null; last_seen_at: Date | null;
}

const NOW = new Date('2026-10-26T05:30:00.000Z');
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(NOW); });
afterEach(() => { vi.useRealTimers(); });

const emailStub: EmailProvider = { name: 'stub', sendEmail: () => Promise.resolve({ id: 'stub' }) };

const PRACTICE = {
  id: 8, status: 'published', title: 'Practice Exam', mark: 2, shuffle_questions: false, is_practice: 1,
  have_minus_mark: 0, minus_mark: null, from_date: null, from_time: null, to_date: null, to_time: null, duration: '15',
};

function world(attempts: Attempt[], exam: Record<string, unknown> = PRACTICE) {
  const matches = (a: Attempt, where: Record<string, unknown>) =>
    (where.id === undefined || where.id === a.id)
    && (where.user_id === undefined || where.user_id === a.user_id)
    && (where.exam_id === undefined || where.exam_id === a.exam_id)
    && (where.submit_status === undefined || where.submit_status === a.submit_status)
    && (!('deleted_at' in where) || where.deleted_at !== null || a.deleted_at === null);
  const prisma = {
    exam: { findFirst: () => Promise.resolve({ ...exam }), findMany: () => Promise.resolve([]) },
    exam_student_allocations: { count: () => Promise.resolve(0) },
    exam_re_examinations: { findMany: () => Promise.resolve([]) },
    exam_attempt: {
      findFirst: ({ where }: { where: Record<string, unknown> }) =>
        Promise.resolve([...attempts].reverse().find((a) => matches(a, where)) ?? null),
      count: ({ where }: { where: Record<string, unknown> }) => Promise.resolve(attempts.filter((a) => matches(a, where)).length),
      update: ({ where, data }: { where: { id: number }; data: Partial<Attempt> }) => {
        const row = attempts.find((a) => a.id === where.id);
        if (row) Object.assign(row, data);
        return Promise.resolve(row);
      },
      updateMany: ({ where, data }: { where: Record<string, unknown>; data: Partial<Attempt> }) => {
        const rows = attempts.filter((a) => matches(a, where));
        rows.forEach((a) => Object.assign(a, data));
        return Promise.resolve({ count: rows.length });
      },
      create: ({ data }: { data: Partial<Attempt> }) => {
        const row: Attempt = {
          id: Math.max(0, ...attempts.map((a) => a.id)) + 1, user_id: Number(data.user_id), exam_id: Number(data.exam_id),
          question_id: String(data.question_id ?? '[]'), start_time: (data.start_time as Date) ?? new Date(),
          submit_status: false, draft_answers: null, deleted_at: null, last_seen_at: null,
        };
        attempts.push(row);
        return Promise.resolve(row);
      },
    },
    exam_questions: {
      findMany: () => Promise.resolve([
        { id: 1, question_id: 9001, question_no: 1, mark: 1, negative_mark: null },
        { id: 2, question_id: 9002, question_no: 2, mark: 1, negative_mark: null },
      ]),
    },
    question_bank: {
      findMany: () => Promise.resolve([
        { id: 9001, title: 'Q1', q_type: 0, number_of_options: 2, options: JSON.stringify(['A', 'B']), correct_answers: JSON.stringify(['0']) },
        { id: 9002, title: 'Q2', q_type: 0, number_of_options: 2, options: JSON.stringify(['A', 'B']), correct_answers: JSON.stringify(['1']) },
      ]),
    },
    exam_answer: { deleteMany: () => Promise.resolve({ count: 0 }), create: () => Promise.resolve({}) },
    users: { findFirst: () => Promise.resolve(null) },
  } as unknown as PrismaClient;
  return new AssessmentService({ prisma, integrations: { email: emailStub } });
}

const stale = (over: Partial<Attempt> = {}): Attempt => ({
  id: 240, user_id: 220, exam_id: 8, question_id: JSON.stringify(['9001', '9002']),
  start_time: new Date('2026-10-22T05:00:26.000Z'), submit_status: false, draft_answers: null, deleted_at: null, last_seen_at: null, ...over,
});

describe('practice exam: an expired unsubmitted attempt is never resumed', () => {
  test('an empty expired attempt is discarded and a fresh 15-minute run starts', async () => {
    const attempts = [stale()];
    const res = await world(attempts).getExamForTaking('220', '8');
    expect(res.status).toBe(1);
    expect(attempts[0]?.deleted_at).toBeInstanceOf(Date);
    expect(res.data?.attempt_id).not.toBe('240');
    expect(res.data?.remaining_seconds).toBe(15 * 60);
  });

  test('an expired attempt with answers is graded (submitted), then a fresh run starts', async () => {
    const draft = JSON.stringify([{ question_id: '9001', answer: ['0'] }, { question_id: '9002', answer: [] }]);
    const attempts = [stale({ draft_answers: draft })];
    const res = await world(attempts).getExamForTaking('220', '8');
    expect(res.status).toBe(1);
    expect(attempts[0]?.submit_status).toBe(true);
    expect(attempts[0]?.deleted_at).toBeNull();
    expect(res.data?.attempt_id).not.toBe('240');
    expect(res.data?.remaining_seconds).toBe(15 * 60);
  });

  test('a practice attempt still inside its 15 minutes resumes as before', async () => {
    const attempts = [stale({ start_time: new Date(NOW.getTime() - 5 * 60 * 1000) })];
    const res = await world(attempts).getExamForTaking('220', '8');
    expect(res.data?.attempt_id).toBe('240');
    expect(res.data?.remaining_seconds).toBe(10 * 60);
    expect(attempts[0]?.deleted_at).toBeNull();
  });

  test('a REAL exam is untouched by this rule (its own gate handles expiry)', async () => {
    const real = { ...PRACTICE, id: 10, is_practice: 0 };
    const attempts = [stale({ exam_id: 10 })];
    const svc = world(attempts, real);
    // Allocation gate refuses (count 0) before any attempt handling — nothing deleted.
    const res = await svc.getExamForTaking('220', '10');
    expect(res.status).toBe(0);
    expect(attempts[0]?.deleted_at).toBeNull();
  });
});
