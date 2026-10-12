import { describe, expect, test } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import { ExamSubmissionsService } from '../../src/operations/exam-submissions-service.js';

// TTII 2026-10-12 — Exam Submissions, service wiring: which sittings produce
// rows, whose rows, which attempts count, and how re-exams split a student's
// sitting into a Regular and a Re-exam row.

const IST = (5 * 60 + 30) * 60 * 1000;
const ist = (y: number, mo: number, d: number, h: number, m = 0): Date => new Date(Date.UTC(y, mo - 1, d, h, m) - IST);
const NOW = ist(2026, 10, 12, 12);
const day = (ymd: string): Date => new Date(`${ymd}T00:00:00Z`);
const time = (hm: string): Date => new Date(`1970-01-01T${hm}:00Z`);

function exam(over: Record<string, unknown>): Record<string, unknown> {
  return {
    exam_code: '', title: '', course_id: null, parent_exam_id: null, exam_subject_id: null, status: 'published',
    is_practice: 0, mark: null, duration: '60', from_date: null, from_time: null, to_date: null, to_time: null,
    publish_result: false, result_published_at: null, deleted_at: null, ...over,
  };
}

const EXAMS = [
  exam({ id: 22, exam_code: 'TTIIEXM2600022', title: 'Diploma Regular', course_id: 5 }),
  exam({ id: 23, parent_exam_id: 22, exam_subject_id: 48, title: 'Diploma Regular — Child Psychology', mark: 70,
    from_date: day('2026-10-05'), from_time: time('10:00'), to_date: day('2026-10-05'), to_time: time('11:30') }),
  exam({ id: 24, parent_exam_id: 22, exam_subject_id: 49, title: 'Diploma Regular — Montessori', mark: 70,
    from_date: day('2026-10-14'), from_time: time('10:00'), to_date: day('2026-10-14'), to_time: time('11:30') }),
  exam({ id: 30, title: 'Single paper', from_date: day('2026-10-06'), from_time: time('10:00'), to_date: day('2026-10-06'), to_time: time('11:00') }),
  exam({ id: 40, title: 'Practice', is_practice: 1, from_date: day('2026-10-06') }),
  exam({ id: 50, title: 'Draft', status: 'draft', from_date: day('2026-10-07'), to_date: day('2026-10-07') }),
];

const ALLOCATIONS = [
  { exam_id: 22, user_id: 101 }, // the parent's own row — parents are never sat
  { exam_id: 23, user_id: 101 },
  { exam_id: 23, user_id: 102 },
  { exam_id: 23, user_id: 900 }, // a staff account trying the paper
  { exam_id: 24, user_id: 101 },
  { exam_id: 30, user_id: 103 },
  { exam_id: 50, user_id: 103 },
];

const USERS = [
  { id: 101, name: 'Ananya Sharma', student_id: 'TTS0101', role_id: 2, user_email: 'ananya@example.com', email: null, phone: '9800000001' },
  { id: 102, name: 'Rahul Verma', student_id: 'TTS0102', role_id: 2, user_email: null, email: '9800000002', phone: '9800000002' },
  { id: 103, name: 'Meera Iyer', student_id: 'TTS0103', role_id: 2, user_email: null, email: null, phone: null },
  { id: 900, name: 'Staff', student_id: null, role_id: 1, user_email: null, email: null, phone: null },
];

const ATTEMPTS = [
  // Ananya: submitted Child Psychology by hand at 10:45.
  { id: 7001, exam_id: 23, user_id: 101, submit_status: true, question_id: '["9001","9002"]', question_no: 50, skip: 5, correct: 30,
    incorrect: 15, score: 30, start_time: ist(2026, 10, 5, 10, 5), end_time: ist(2026, 10, 5, 10, 45), time_taken: new Date(40 * 60_000),
    created_at: ist(2026, 10, 5, 10, 5), last_seen_at: ist(2026, 10, 5, 10, 44), draft_answers: null },
  // Meera: a legacy lesson-quiz row on lesson_file 30 (ids collide) — not a paper.
  { id: 7002, exam_id: 30, user_id: 103, submit_status: true, question_id: '["77"]', question_no: 1, skip: 0, correct: 1,
    incorrect: 0, score: 1, start_time: ist(2026, 10, 6, 10, 5), end_time: ist(2026, 10, 6, 10, 6), time_taken: new Date(60_000),
    created_at: ist(2026, 10, 6, 10, 5), last_seen_at: null, draft_answers: null },
];

const RE_EXAMS = [
  { id: 3, exam_id: 23, user_id: 102, status: 'scheduled', new_date: day('2026-10-15'), new_start_time: time('10:00'),
    new_end_time: time('11:30'), created_at: ist(2026, 10, 8, 9) },
];

const inIds = (want: unknown, v: number | null): boolean => {
  if (want === undefined) return true;
  if (typeof want === 'number') return want === v;
  const list = (want as { in?: number[] }).in;
  return !list || (v !== null && list.includes(v));
};

function makeService(): ExamSubmissionsService {
  const exams = EXAMS as Array<Record<string, unknown> & { id: number }>;
  const prisma = {
    exam: {
      findMany: ({ where }: { where: Record<string, unknown> }) => {
        if (where.parent_exam_id) {
          return Promise.resolve(exams.filter((e) => inIds(where.parent_exam_id, e.parent_exam_id as number | null) && e.parent_exam_id !== null)
            .map((e) => ({ parent_exam_id: e.parent_exam_id })));
        }
        if (where.id) {
          return Promise.resolve(exams.filter((e) => inIds(where.id, e.id)
            && (where.is_practice === undefined || e.is_practice === where.is_practice)));
        }
        return Promise.resolve(exams.filter((e) => e.is_practice === 0 && e.from_date !== null));
      },
      findFirst: ({ where }: { where: { id: number } }) => Promise.resolve(exams.find((e) => e.id === where.id && e.is_practice === 0) ?? null),
    },
    exam_re_examinations: {
      findMany: ({ where }: { where: { exam_id?: unknown } }) =>
        Promise.resolve(RE_EXAMS.filter((r) => inIds(where.exam_id, r.exam_id)).sort((a, b) => b.id - a.id)),
    },
    exam_courses: { findMany: () => Promise.resolve([{ exam_id: 22, course_id: 5 }, { exam_id: 22, course_id: 6 }]) },
    exam_subjects: {
      findMany: () => Promise.resolve([
        { id: 48, exam_id: 22, subject_title: 'Child Psychology', total_marks: 70, pass_marks: 25 },
        { id: 49, exam_id: 22, subject_title: 'Montessori Philosophy', total_marks: 70, pass_marks: 25 },
      ]),
    },
    course: { findMany: () => Promise.resolve([{ id: 5, title: 'Diploma in Montessori' }, { id: 6, title: 'PG Diploma' }]) },
    exam_student_allocations: {
      findMany: ({ where }: { where: { exam_id: unknown; user_id?: number } }) =>
        Promise.resolve(ALLOCATIONS.filter((a) => inIds(where.exam_id, a.exam_id) && inIds(where.user_id, a.user_id))),
    },
    users: {
      findMany: ({ where }: { where: { id: unknown; role_id?: number } }) =>
        Promise.resolve(USERS.filter((u) => inIds(where.id, u.id) && (where.role_id === undefined || u.role_id === where.role_id))),
      findFirst: ({ where }: { where: { id: number } }) => Promise.resolve(USERS.find((u) => u.id === where.id) ?? null),
    },
    exam_attempt: {
      findMany: ({ where }: { where: { exam_id: unknown; user_id: unknown; submit_status?: boolean } }) =>
        Promise.resolve(ATTEMPTS.filter((a) => inIds(where.exam_id, a.exam_id) && inIds(where.user_id, a.user_id)
          && (where.submit_status === true ? a.submit_status === true : a.submit_status !== true))),
    },
    quiz: { findMany: () => Promise.resolve([{ id: 77, lesson_file_id: 30 }]) },
    exam_answer: {
      findMany: ({ where, distinct }: { where: { attempt_id: unknown; question_id?: unknown }; distinct?: string[] }) => {
        const answers = [
          { attempt_id: 7001, question_id: 9001, answer_submitted: '["1"]' },
          { attempt_id: 7001, question_id: 9002, answer_submitted: '["My written answer"]' },
        ].filter((a) => inIds(where.attempt_id, a.attempt_id) && inIds(where.question_id, a.question_id));
        return Promise.resolve(distinct ? answers.map((a) => ({ question_id: a.question_id })) : answers);
      },
    },
    question_bank: {
      findMany: ({ where }: { where: { id: unknown; q_type?: number } }) =>
        Promise.resolve([{ id: 9001, q_type: 0, title: '<p>MCQ</p>' }, { id: 9002, q_type: 1, title: '<p>Explain play</p>' }]
          .filter((q) => inIds(where.id, q.id) && (where.q_type === undefined || q.q_type === where.q_type))),
    },
    exam_descriptive_grades: { findMany: () => Promise.resolve([]) },
  } as unknown as PrismaClient;
  return new ExamSubmissionsService(prisma, { now: () => NOW });
}

describe('the submissions list', () => {
  test('one row per allocated STUDENT per real sitting, plus re-exam rows', async () => {
    const { rows, from, to } = await makeService().list();

    expect(from).toBe('2026-09-12');
    expect(to).toBe('');
    // Parent 22, practice 40, draft 50 and the staff account produce nothing.
    expect(rows.map((r) => r.key).sort()).toEqual(['23:101:o', '23:102:o', '23:102:r3', '24:101:o', '30:103:o']);
  });

  test('a submitted paper: subject, courses, marks, answered, and an evaluation still owed on the written answer', async () => {
    const row = (await makeService().list()).rows.find((r) => r.key === '23:101:o');

    expect(row).toMatchObject({
      type: 'regular', examId: 22, examCode: 'TTIIEXM2600022', subject: 'Child Psychology',
      courses: ['Diploma in Montessori', 'PG Diploma'], status: 'submitted', autoKind: null,
      answered: 45, questionCount: 50, score: 30, totalMarks: 70, passMarks: 25, timeTakenSeconds: 2400,
      evaluation: 'pending', descriptiveAnswered: 1, descriptiveGraded: 0, result: 'not_published',
      date: '2026-10-05', startTime: '10:00', endTime: '11:30',
    });
  });

  test('a missed sitting with a re-exam to come is pending, and the re-exam row is scheduled in its own window', async () => {
    const rows = (await makeService().list()).rows;

    expect(rows.find((r) => r.key === '23:102:o')).toMatchObject({ status: 'reexam_pending', missedReason: 'never_opened' });
    expect(rows.find((r) => r.key === '23:102:r3')).toMatchObject({
      type: 'reexam', attemptNo: 2, status: 'scheduled', date: '2026-10-15', startTime: '10:00',
    });
  });

  test('a legacy quiz row on a colliding id is not a paper: the student never opened the exam', async () => {
    const row = (await makeService().list()).rows.find((r) => r.key === '30:103:o');
    expect(row).toMatchObject({ status: 'missed', missedReason: 'never_opened', attemptId: null });
  });

  test('upcoming sittings are Scheduled; filters by exam and course', async () => {
    const service = makeService();
    expect((await service.list()).rows.find((r) => r.key === '24:101:o')?.status).toBe('scheduled');
    expect((await service.list({ examId: 22 })).rows).toHaveLength(4);
    expect((await service.list({ examId: 30 })).rows).toHaveLength(1);
    expect((await service.list({ courseId: 6 })).rows).toHaveLength(4);
  });

  test('a range that ends before it starts is empty', async () => {
    expect((await makeService().list({ from: '2026-10-10', to: '2026-10-01' })).rows).toEqual([]);
  });

  test('a range wider than a year is refused', async () => {
    await expect(makeService().list({ from: '2020-01-01', to: '2026-10-01' })).rejects.toThrow(RangeError);
    expect((await makeService().list({ from: '2025-10-12', to: '2026-10-12' })).from).toBe('2025-10-12');
  });
});

describe('the submission detail', () => {
  test('both rows of a re-examined student, with contact details', async () => {
    const detail = await makeService().detail(23, 102);
    expect(detail?.rows.map((r) => r.type)).toEqual(['regular', 'reexam']);
    expect(detail?.studentEmail).toBe('');
    expect(detail?.studentPhone).toBe('9800000002');
  });

  test('a submitted student\'s attempt history', async () => {
    const detail = await makeService().detail(23, 101);
    expect(detail?.attempts).toEqual([expect.objectContaining({ attemptId: 7001, type: 'regular', submitted: true, score: 30 })]);
    expect(detail?.studentEmail).toBe('ananya@example.com');
  });

  test('unknown sitting or a student not allocated → null', async () => {
    expect(await makeService().detail(999, 101)).toBeNull();
    expect(await makeService().detail(23, 103)).toBeNull();
    expect(await makeService().detail(22, 101)).toBeNull();
  });
});
