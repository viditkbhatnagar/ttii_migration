import type { Prisma, PrismaClient } from '@prisma/client';

// Question Bank helpers shared by OperationsService (add / edit / delete / bulk
// upload / the exam wizard picker) and QuestionBankService (Naji's rebuilt
// list, bulk move, bulk delete). Moved here unchanged from OperationsService
// (TTII 2026-10-12) so every path applies the SAME published-exam guard and
// the SAME course scope.

export interface QuestionUsage {
  /** Top-level exams (a sitting counts as its parent) that link the question. */
  exams: Set<number>;
  /** Codes (or titles) of those exams that are published. */
  published: string[];
}

/**
 * Where each question is used: the top-level exams that link it, and which of
 * those are published. A published exam is graded against the question's
 * CURRENT row at submit time, so editing its answer, moving it or deleting it
 * silently changes a live paper — callers refuse exactly that.
 */
export async function questionUsage(prisma: PrismaClient, questionIds: number[]): Promise<Map<number, QuestionUsage>> {
  const usage = new Map<number, QuestionUsage>();
  if (questionIds.length === 0) return usage;
  const links = await prisma.exam_questions.findMany({
    where: { question_id: { in: questionIds }, deleted_at: null },
    select: { exam_id: true, question_id: true },
  });
  const examIds = [...new Set(links.map((l) => l.exam_id).filter((v): v is number => v !== null))];
  if (examIds.length === 0) return usage;
  const exams = await prisma.exam.findMany({
    where: { id: { in: examIds }, deleted_at: null },
    select: { id: true, parent_exam_id: true },
  });
  const topOf = new Map(exams.map((e) => [e.id, e.parent_exam_id ?? e.id]));
  const tops = await prisma.exam.findMany({
    where: { id: { in: [...new Set(topOf.values())] }, deleted_at: null },
    select: { id: true, status: true, exam_code: true, title: true },
  });
  const topById = new Map(tops.map((t) => [t.id, t]));
  for (const link of links) {
    if (link.question_id === null || link.exam_id === null) continue;
    const topId = topOf.get(link.exam_id);
    const top = topId === undefined ? undefined : topById.get(topId);
    if (!top) continue;
    const entry = usage.get(link.question_id) ?? { exams: new Set<number>(), published: [] };
    if (!entry.exams.has(top.id)) {
      entry.exams.add(top.id);
      if (top.status === 'published') entry.published.push(top.exam_code || top.title || `Exam ${top.id}`);
    }
    usage.set(link.question_id, entry);
  }
  return usage;
}

/**
 * Prisma filter for "questions that belong to these courses".
 *
 * Risha 2026-10-01 — a question_bank row carries ONE course_id, but subjects
 * are shared between courses through course_subject (the Montessori Diploma
 * and PG Diploma share five subjects, every question filed under the Diploma).
 * A question belongs to a course when its own course_id matches OR its subject
 * is linked to that course. `extraSubjectIds` lets the exam picker also admit
 * the subjects it is scheduled for.
 */
export async function questionBankCourseScope(
  prisma: PrismaClient,
  courseIds: number[],
  extraSubjectIds: number[] = [],
): Promise<Prisma.question_bankWhereInput> {
  const links = courseIds.length > 0
    ? await prisma.course_subject.findMany({
        where: { course_id: { in: courseIds }, deleted_at: null },
        select: { subject_id: true },
      })
    : [];
  const subjectIds = [...new Set([...links.map((l) => l.subject_id), ...extraSubjectIds])];
  const or: Prisma.question_bankWhereInput[] = [];
  if (courseIds.length > 0) or.push({ course_id: { in: courseIds } });
  if (subjectIds.length > 0) or.push({ subject_id: { in: subjectIds } });
  // No course and no subject: match nothing rather than everything.
  return or.length > 0 ? { OR: or } : { id: { in: [] } };
}

/** "This question is in 2 published exams (A, B)." — or '' when in none. */
export function publishedSentence(published: string[]): string {
  if (published.length === 0) return '';
  return `This question is in ${published.length} published exam${published.length === 1 ? '' : 's'} (${published.join(', ')}).`;
}
