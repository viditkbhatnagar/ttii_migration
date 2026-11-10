import { describe, expect, test } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import { AssessmentService } from '../../src/assessment/assessment-service.js';
import {
  correctIndexes,
  elapsedToTimeColumn,
  gradeQuiz,
  isTrustedQuizAttempt,
  type QuizKeyRow,
  type QuizSelection,
} from '../../src/assessment/quiz-grader.js';

// TTII 2026-11-10 — AI Educator quizzes: "scores of the completed quiz are not
// updated". The quiz table keys are 0-based; the old grader did answer_id - 1.

const single = (id: number, answer: number | null): QuizKeyRow => ({ id, question_type: 0, answer_id: answer, answer_ids: null });
const multi = (id: number, answers: number[]): QuizKeyRow => ({ id, question_type: 1, answer_id: null, answer_ids: JSON.stringify(answers) });
const picks = (entries: Array<[number, QuizSelection]>): Map<number, QuizSelection> => new Map(entries);

describe('gradeQuiz', () => {
  test('single answer is 0-based: picking index 2 is correct when answer_id is 2', () => {
    const g = gradeQuiz([single(1, 2)], picks([[1, 2]]));
    expect(g.correct).toBe(1);
    expect(g.incorrect).toBe(0);
  });

  test('option A (index 0) can be the correct answer', () => {
    const g = gradeQuiz([single(1, 0)], picks([[1, 0]]));
    expect(g.correct).toBe(1);
    expect(g.review[0]?.isCorrect).toBe(true);
  });

  test('the off-by-one neighbour is wrong', () => {
    const g = gradeQuiz([single(1, 2)], picks([[1, 1]]));
    expect(g.incorrect).toBe(1);
    expect(g.correct).toBe(0);
  });

  test('multi answer needs the exact set, in any order', () => {
    const q = multi(1, [0, 2]);
    expect(gradeQuiz([q], picks([[1, [2, 0]]])).correct).toBe(1);
    expect(gradeQuiz([q], picks([[1, [0]]])).incorrect).toBe(1);
    expect(gradeQuiz([q], picks([[1, [0, 1, 2]]])).incorrect).toBe(1);
  });

  test('unanswered and empty selections are skipped, not incorrect', () => {
    const g = gradeQuiz([single(1, 1), multi(2, [1])], picks([[2, []]]));
    expect(g.skip).toBe(2);
    expect(g.incorrect).toBe(0);
    expect(g.score).toBe(0);
  });

  test('score is a whole-number percentage over keyed questions, with marks', () => {
    const qs = [single(1, 0), single(2, 1), single(3, 2)];
    const g = gradeQuiz(qs, picks([[1, 0], [2, 0]]));
    expect(g).toMatchObject({ correct: 1, incorrect: 1, skip: 1, score: 33, percentage: 33, marks_obtained: 1, total_marks: 3, total_questions: 3 });
  });

  test('a question with no stored key is ungradable and not penalised', () => {
    const g = gradeQuiz([single(1, 0), single(2, null)], picks([[1, 0], [2, 3]]));
    expect(g.ungraded).toBe(1);
    expect(g.gradable).toBe(1);
    expect(g.score).toBe(100);
    expect(g.review[1]?.isCorrect).toBeNull();
  });

  test('all wrong scores 0 with the counts the student saw (0 correct / 7 incorrect)', () => {
    const qs = Array.from({ length: 7 }, (_, i) => single(i + 1, 1));
    const g = gradeQuiz(qs, new Map(qs.map((q) => [q.id, 0] as [number, QuizSelection])));
    expect(g).toMatchObject({ correct: 0, incorrect: 7, skip: 0, score: 0 });
  });

  test('multi question falls back to answer_id when answer_ids is empty', () => {
    expect(correctIndexes({ id: 1, question_type: 1, answer_id: 3, answer_ids: null })).toEqual([3]);
    expect(correctIndexes({ id: 1, question_type: 0, answer_id: null, answer_ids: '[1]' })).toEqual([1]);
    expect(correctIndexes({ id: 1, question_type: 1, answer_id: null, answer_ids: 'not json' })).toEqual([]);
  });
});

describe('legacy attempt trust', () => {
  test('attempts without time_taken or from before the fix are untrusted', () => {
    const after = new Date('2026-11-12T10:00:00Z');
    expect(isTrustedQuizAttempt({ time_taken: null, end_time: after })).toBe(false);
    expect(isTrustedQuizAttempt({ time_taken: new Date(0), end_time: new Date('2026-10-01T00:00:00Z') })).toBe(false);
    expect(isTrustedQuizAttempt({ time_taken: new Date(0), end_time: after })).toBe(true);
  });

  test('elapsed time is capped to fit a TIME column', () => {
    const start = new Date('2026-11-12T10:00:00Z');
    expect(elapsedToTimeColumn(start, new Date('2026-11-12T10:01:30Z')).getTime()).toBe(90_000);
    expect(elapsedToTimeColumn(start, new Date('2026-11-14T10:00:00Z')).getTime()).toBeLessThan(86_400_000);
    expect(elapsedToTimeColumn(null, start).getTime()).toBe(0);
  });
});

describe('quiz endpoints', () => {
  function service(opts: { latest: Record<string, unknown> | null; quizRows?: QuizKeyRow[] }) {
    const updates: Array<Record<string, unknown>> = [];
    const prisma = {
      lesson_files: { findFirst: () => Promise.resolve({ id: 47, lesson_id: 1, title: 'Q', attachment_type: null, summary: '' }) },
      quiz: {
        findMany: () => Promise.resolve((opts.quizRows ?? [single(1, 0), single(2, 2)]).map((q) => ({ ...q, question: 'q', answers: '["a","b","c"]' }))),
      },
      practice_attempt: {
        findFirst: ({ where }: { where: Record<string, unknown> }) =>
          Promise.resolve(where.submit_status === true ? opts.latest : { id: 9, submit_status: false, start_time: new Date(Date.now() - 60_000) }),
        update: ({ data }: { data: Record<string, unknown> }) => { updates.push(data); return Promise.resolve({}); },
      },
    } as unknown as PrismaClient;
    return { svc: new AssessmentService({ prisma, integrations: { email: { name: 'stub', sendEmail: () => Promise.reject(new Error('unused')) } } as never }), updates };
  }

  test('submit grades 0-based, stores a percentage and time_taken, returns marks', async () => {
    const { svc, updates } = service({ latest: null });
    const r = await svc.submitStudentQuizAttempt('354', {
      lessonFileId: '47', attemptId: '9',
      answers: [{ question_id: 1, selected: 0 }, { question_id: 2, selected: 2 }],
    });
    expect(r.data).toMatchObject({ total_questions: 2, correct: 2, incorrect: 0, skip: 0, score: 100, total_marks: 2, marks_obtained: 2 });
    expect(updates[0]).toMatchObject({ correct: 2, score: 100, submit_status: true });
    expect(updates[0]?.time_taken).toBeInstanceOf(Date);
  });

  test('index returns the latest attempt as graded only when it came from the fixed grader', async () => {
    const trusted = service({
      latest: { id: 5, end_time: new Date('2026-11-12T10:00:00Z'), time_taken: new Date(0), correct: 1, incorrect: 1, skip: 0, score: 50, question_no: 2 },
    });
    const t = await trusted.svc.getStudentQuizForLessonFile('354', '47');
    expect(t.data?.last_attempt).toMatchObject({ graded: true, correct: 1, incorrect: 1, score: 50, total_questions: 2 });

    const legacy = service({
      latest: { id: 4, end_time: new Date('2026-10-20T10:00:00Z'), time_taken: null, correct: 0, incorrect: 7, skip: 0, score: 0, question_no: 10 },
    });
    const l = await legacy.svc.getStudentQuizForLessonFile('354', '47');
    expect(l.data?.last_attempt).toEqual({ attempt_id: 4, submitted_at: '2026-10-20T10:00:00.000Z', graded: false });

    const none = await service({ latest: null }).svc.getStudentQuizForLessonFile('354', '47');
    expect(none.data?.last_attempt).toBeNull();
  });
});
