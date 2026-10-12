import type { PrismaClient } from '@prisma/client';

import { answerHasWork } from './exam-submissions.js';

// Written-answer (descriptive) marking for Exam Submissions: which submitted
// papers hold answered descriptive questions, how many are graded in
// exam_descriptive_grades, and the grades themselves. Graded marks are NOT
// added to exam_attempt.score yet — callers show them separately.

export interface DescriptiveProgress {
  answered: number;
  graded: number;
  marks: number;
}

export interface DescriptiveGrade {
  attemptId: number;
  questionId: number;
  question: string;
  score: number | null;
  remarks: string;
  gradedAt: string | null;
  gradedBy: string;
}

function iso(value: Date | null | undefined): string | null {
  return value instanceof Date && !Number.isNaN(value.getTime()) ? value.toISOString() : null;
}

/** Per submitted paper: answered descriptive questions, how many are graded, and the graded marks. */
export async function loadDescriptiveProgress(prisma: PrismaClient, attemptIds: number[]): Promise<Map<number, DescriptiveProgress>> {
  const result = new Map<number, DescriptiveProgress>();
  if (attemptIds.length === 0) return result;
  const answerKeys = await prisma.exam_answer.findMany({
    where: { attempt_id: { in: attemptIds }, deleted_at: null },
    select: { question_id: true },
    distinct: ['question_id'],
  });
  const questionIds = answerKeys.map((a) => a.question_id).filter((v): v is number => v !== null);
  const descriptive = questionIds.length > 0
    ? (await prisma.question_bank.findMany({ where: { id: { in: questionIds }, q_type: 1, deleted_at: null }, select: { id: true } })).map((q) => q.id)
    : [];
  if (descriptive.length === 0) return result;
  const [answers, grades] = await Promise.all([
    prisma.exam_answer.findMany({
      where: { attempt_id: { in: attemptIds }, question_id: { in: descriptive }, deleted_at: null },
      select: { attempt_id: true, question_id: true, answer_submitted: true },
    }),
    prisma.exam_descriptive_grades.findMany({
      where: { attempt_id: { in: attemptIds } },
      select: { attempt_id: true, question_id: true, score: true },
    }),
  ]);
  const answered = new Map<number, Set<number>>();
  for (const a of answers) {
    if (a.attempt_id === null || a.question_id === null || !answerHasWork(a.answer_submitted)) continue;
    const set = answered.get(a.attempt_id) ?? new Set<number>();
    set.add(a.question_id);
    answered.set(a.attempt_id, set);
  }
  for (const [attemptId, set] of answered) result.set(attemptId, { answered: set.size, graded: 0, marks: 0 });
  for (const g of grades) {
    const entry = result.get(g.attempt_id);
    if (!entry || !answered.get(g.attempt_id)?.has(g.question_id)) continue;
    result.set(g.attempt_id, { ...entry, graded: entry.graded + 1, marks: entry.marks + Number(g.score ?? 0) });
  }
  return result;
}

/** Every written-answer grade on the given papers, with the question text and the grader's name. */
export async function loadDescriptiveGrades(prisma: PrismaClient, attemptIds: number[]): Promise<DescriptiveGrade[]> {
  if (attemptIds.length === 0) return [];
  const rows = await prisma.exam_descriptive_grades.findMany({
    where: { attempt_id: { in: attemptIds } },
    orderBy: [{ attempt_id: 'desc' }, { question_id: 'asc' }],
  });
  if (rows.length === 0) return [];
  const [questions, graders] = await Promise.all([
    prisma.question_bank.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.question_id))] } }, select: { id: true, title: true } }),
    prisma.users.findMany({
      where: { id: { in: [...new Set(rows.map((r) => r.graded_by).filter((v): v is number => v !== null))] } },
      select: { id: true, name: true },
    }),
  ]);
  const questionText = new Map(questions.map((q) => [q.id, (q.title ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()]));
  const graderName = new Map(graders.map((g) => [g.id, (g.name ?? '').trim()]));
  return rows.map((r) => ({
    attemptId: r.attempt_id,
    questionId: r.question_id,
    question: questionText.get(r.question_id) ?? '',
    score: r.score === null ? null : Number(r.score),
    remarks: (r.remarks ?? '').trim(),
    gradedAt: iso(r.graded_at),
    gradedBy: r.graded_by !== null ? graderName.get(r.graded_by) ?? '' : '',
  }));
}
