import type { Prisma, PrismaClient } from '@prisma/client';

// Supplementary exam links (TTII 2026-10-16): which exams are supplementary,
// and which exam each was created from (exam_supplementary). A leaf module so
// every exam reader can ask without depending on the supplementary service.
//
// Before deploy/migrations/2026-10-16-exam-supplementary.sql runs the table is
// missing (Prisma P2021): every read here answers "no supplementary exams", so
// lists and results load exactly as before, and creating one is refused with
// SUPPLEMENTARY_NOT_SET_UP_MESSAGE.

export const SUPPLEMENTARY_NOT_SET_UP_MESSAGE =
  'Supplementary exams are not set up yet: the database migration 2026-10-16-exam-supplementary.sql has not been run.';

export interface SupplementaryLink {
  examId: number;
  sourceExamId: number;
  createdBy: number | null;
  createdAt: Date | null;
}

type Db = PrismaClient | Prisma.TransactionClient;

interface LinkRow {
  exam_id: number;
  source_exam_id: number;
  created_by: number | null;
  created_at: Date | null;
}

interface LinkDelegate {
  findMany: (args: {
    where: { exam_id?: { in: number[] }; source_exam_id?: { in: number[] } };
    select: { exam_id: true; source_exam_id: true; created_by: true; created_at: true };
  }) => Promise<LinkRow[]>;
}

/** Prisma P2021: the table does not exist (the migration has not run yet). */
export function isMissingTable(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'P2021';
}

// A client generated before this table existed has no delegate for it; that
// is the same "not set up" state as the missing table.
function delegate(db: Db): LinkDelegate | null {
  const d = (db as unknown as { exam_supplementary?: LinkDelegate }).exam_supplementary;
  return d && typeof d.findMany === 'function' ? d : null;
}

const linkSelect = { exam_id: true, source_exam_id: true, created_by: true, created_at: true } as const;

async function findLinks(db: Db, where: { exam_id?: { in: number[] }; source_exam_id?: { in: number[] } }): Promise<SupplementaryLink[]> {
  const d = delegate(db);
  if (!d) return [];
  try {
    const rows = await d.findMany({ where, select: linkSelect });
    return rows.map((r) => ({ examId: r.exam_id, sourceExamId: r.source_exam_id, createdBy: r.created_by, createdAt: r.created_at }));
  } catch (error: unknown) {
    if (isMissingTable(error)) return [];
    throw error;
  }
}

/** True once the exam_supplementary table exists. */
export async function supplementaryReady(db: Db): Promise<boolean> {
  const d = delegate(db);
  if (!d) return false;
  try {
    await d.findMany({ where: { exam_id: { in: [0] } }, select: linkSelect });
    return true;
  } catch (error: unknown) {
    if (isMissingTable(error)) return false;
    throw error;
  }
}

/** The links of the given supplementary exams (exam ids that are not supplementary are simply absent). */
export async function linksForExams(db: Db, examIds: number[]): Promise<SupplementaryLink[]> {
  const ids = [...new Set(examIds.filter((id) => Number.isInteger(id) && id > 0))];
  return ids.length === 0 ? [] : findLinks(db, { exam_id: { in: ids } });
}

/** The supplementary exams created from the given exams. */
export async function linksFromSources(db: Db, sourceExamIds: number[]): Promise<SupplementaryLink[]> {
  const ids = [...new Set(sourceExamIds.filter((id) => Number.isInteger(id) && id > 0))];
  return ids.length === 0 ? [] : findLinks(db, { source_exam_id: { in: ids } });
}

/** The ids, out of `examIds`, that are supplementary exams. */
export async function supplementaryExamIds(db: Db, examIds: number[]): Promise<Set<number>> {
  return new Set((await linksForExams(db, examIds)).map((l) => l.examId));
}

export async function isSupplementaryExam(db: Db, examId: number): Promise<boolean> {
  return (await supplementaryExamIds(db, [examId])).has(examId);
}
