import type { PrismaClient } from '@prisma/client';

// Is this exam_attempt row really a paper of this exam?
//
// exam_attempt is shared with the legacy lesson quizzes, which wrote a
// lesson_file id into exam_id — and those ids collide with exam ids. On
// production (2026-10-09) six quiz attempts sit on exam ids, one of them on a
// live PG Diploma sitting (exam 34). A paper is recognised by what it locked:
// an exam attempt's question_id holds that exam's question_bank ids.

export async function examQuestionIds(prisma: PrismaClient, examIds: number[]): Promise<Map<number, Set<string>>> {
  const result = new Map<number, Set<string>>();
  if (examIds.length === 0) return result;
  const rows = await prisma.exam_questions.findMany({
    where: { exam_id: { in: examIds } },
    select: { exam_id: true, question_id: true },
  });
  for (const row of rows) {
    if (row.exam_id === null || row.question_id === null) continue;
    const set = result.get(row.exam_id) ?? new Set<string>();
    set.add(String(row.question_id));
    result.set(row.exam_id, set);
  }
  return result;
}

/** True unless the attempt locked questions and none of them belong to the exam. */
export function isExamPaper(lockedQuestionIds: string | null | undefined, examQuestions: Set<string> | undefined): boolean {
  let locked: string[] = [];
  try {
    const parsed = JSON.parse(lockedQuestionIds ?? '[]') as unknown;
    if (Array.isArray(parsed)) locked = parsed.map((q) => String(q));
  } catch {
    return true;
  }
  // Nothing to compare (no lock, or an exam with no question rows left): keep it.
  if (locked.length === 0 || !examQuestions || examQuestions.size === 0) return true;
  return locked.some((q) => examQuestions.has(q));
}
