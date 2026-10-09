import type { PrismaClient } from '@prisma/client';

// Is this exam_attempt row really a paper of this exam?
//
// exam_attempt is shared with the legacy lesson quizzes (startQuizAttempt),
// which wrote a lesson_file id into exam_id and locked that lesson's `quiz`
// ids in question_id — and lesson_file ids collide with exam ids.
//
// The test is POSITIVE: an attempt is a quiz only when every id it locked is a
// quiz question of the lesson whose id it carries. Matching against the exam's
// own questions instead drops genuine papers: the exam editor hard-deletes and
// re-inserts exam_questions, and on production (2026-10-09) six real papers
// lock questions their exam no longer lists. No quiz attempt currently sits on
// an exam id; this keeps one from ever counting as a paper.

/** Quiz question ids per lesson_file id, for the given ids (deleted quizzes included). */
export async function lessonQuizIds(prisma: PrismaClient, ids: number[]): Promise<Map<number, Set<string>>> {
  const result = new Map<number, Set<string>>();
  if (ids.length === 0) return result;
  const rows = await prisma.quiz.findMany({
    where: { lesson_file_id: { in: ids } },
    select: { id: true, lesson_file_id: true },
  });
  for (const row of rows) {
    const set = result.get(row.lesson_file_id) ?? new Set<string>();
    set.add(String(row.id));
    result.set(row.lesson_file_id, set);
  }
  return result;
}

/** False only for an attempt that locked nothing but that lesson's quiz questions. */
export function isExamPaper(lockedQuestionIds: string | null | undefined, quizIdsForSameId: Set<string> | undefined): boolean {
  if (!quizIdsForSameId || quizIdsForSameId.size === 0) return true;
  let locked: string[] = [];
  try {
    const parsed = JSON.parse(lockedQuestionIds ?? '[]') as unknown;
    if (Array.isArray(parsed)) locked = parsed.map((q) => String(q));
  } catch {
    return true;
  }
  if (locked.length === 0) return true;
  return !locked.every((q) => quizIdsForSameId.has(q));
}
