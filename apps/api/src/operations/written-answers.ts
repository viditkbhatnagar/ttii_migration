import type { PrismaClient } from '@prisma/client';

// Papers holding written (descriptive) answers (TTII 2026-10-12). The scorer
// never marks a descriptive answer (it scores 0 until graded), and graded marks
// are not yet added to exam_attempt.score, so such a paper's score is MCQ-only.
// Exam → Result refuses to publish while any exist; Exam → Dashboard counts
// them as "awaiting marking". One rule, shared by both.

/** An answer counts when it holds any non-blank text (JSON array, JSON string or plain text). */
export function hasAnswerText(raw: string | null | undefined): boolean {
  const text = (raw ?? '').trim();
  if (text === '') return false;
  try {
    const parsed = JSON.parse(text) as unknown;
    if (Array.isArray(parsed)) return parsed.some((v) => typeof v === 'string' && v.trim() !== '');
    return typeof parsed === 'string' ? parsed.trim() !== '' : parsed !== null;
  } catch {
    return true;
  }
}

/** The submitted papers (attempt ids) among `paperIds` with an answered descriptive question. */
export async function papersWithWrittenAnswers(prisma: PrismaClient, paperIds: number[]): Promise<Set<number>> {
  if (paperIds.length === 0) return new Set();
  const answers = await prisma.exam_answer.findMany({
    where: { attempt_id: { in: paperIds }, deleted_at: null },
    select: { attempt_id: true, question_id: true, answer_submitted: true },
  });
  const answered = answers.filter((a) => a.attempt_id !== null && a.question_id !== null && hasAnswerText(a.answer_submitted));
  if (answered.length === 0) return new Set();
  const descriptive = new Set(
    (await prisma.question_bank.findMany({
      where: { id: { in: [...new Set(answered.map((a) => a.question_id as number))] }, q_type: 1, deleted_at: null },
      select: { id: true },
    })).map((q) => q.id),
  );
  return new Set(answered.filter((a) => descriptive.has(a.question_id as number)).map((a) => a.attempt_id as number));
}
