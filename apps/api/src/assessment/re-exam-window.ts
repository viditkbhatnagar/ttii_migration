import type { PrismaClient } from '@prisma/client';

// Re-exam windows (TTII 2026-10-09). A re-exam is NOT a new exam: it re-opens
// one subject sitting for one student, in a window of its own
// (exam_re_examinations.new_date / new_start_time / new_end_time — the same
// IST wall-clock shape as the exam's own columns, so the existing window maths
// applies unchanged).
//
// Two rules make it safe, and every exam-time check applies both through here:
//
//   1. An attempt belongs to the re-exam when it was STARTED on or after the
//      re-exam was scheduled. Only those attempts count as "already submitted",
//      only those are resumed, and only those get the re-exam window. The
//      original paper keeps its own window and stays on record.
//   2. The re-exam window replaces the exam's window for those attempts and
//      nowhere else. Without it the original sitting — closed weeks ago — would
//      refuse the re-exam, auto-submit it the moment it opened, and grade an
//      on-time submit as late.
//
// The newest row that is not cancelled governs a (sitting, student) pair, so a
// second re-exam after a failed first one simply supersedes it.

export interface ActiveReExam {
  id: number;
  examId: number;
  userId: number;
  date: Date;
  startTime: Date;
  endTime: Date;
  /** The attempt floor: attempts started at or after this belong to the re-exam. */
  scheduledAt: Date;
}

/** The five exam columns the window maths reads (ExamWindowRow). */
interface WindowColumns {
  from_date: unknown;
  from_time: unknown;
  to_date: unknown;
  to_time: unknown;
  duration: unknown;
}

const reExamSelect = {
  id: true,
  exam_id: true,
  user_id: true,
  new_date: true,
  new_start_time: true,
  new_end_time: true,
  created_at: true,
} as const;

interface ReExamRow {
  id: number;
  exam_id: number;
  user_id: number;
  new_date: Date | null;
  new_start_time: Date | null;
  new_end_time: Date | null;
  created_at: Date | null;
}

/** Status NULL predates the column default and means scheduled. */
export const NOT_CANCELLED = { OR: [{ status: null }, { status: { not: 'cancelled' } }] };

function toActive(row: ReExamRow): ActiveReExam | null {
  if (!row.new_date || !row.new_start_time || !row.new_end_time || !row.created_at) return null;
  return {
    id: row.id,
    examId: row.exam_id,
    userId: row.user_id,
    date: row.new_date,
    startTime: row.new_start_time,
    endTime: row.new_end_time,
    scheduledAt: row.created_at,
  };
}

/** Newest non-cancelled re-exam per sitting, for one student. */
export async function findActiveReExams(
  prisma: PrismaClient,
  userId: number,
  examIds: number[],
): Promise<Map<number, ActiveReExam>> {
  const result = new Map<number, ActiveReExam>();
  if (userId <= 0 || examIds.length === 0) return result;
  const rows = await prisma.exam_re_examinations.findMany({
    where: { user_id: userId, exam_id: { in: examIds }, ...NOT_CANCELLED },
    select: reExamSelect,
    orderBy: { id: 'desc' },
  });
  for (const row of rows) {
    if (result.has(row.exam_id)) continue;
    const active = toActive(row);
    if (active) result.set(row.exam_id, active);
  }
  return result;
}

export async function findActiveReExam(
  prisma: PrismaClient,
  userId: number,
  examId: number,
): Promise<ActiveReExam | null> {
  return (await findActiveReExams(prisma, userId, [examId])).get(examId) ?? null;
}

/** Newest non-cancelled re-exam per (student, sitting) across many sittings. */
export async function findActiveReExamsForExams(
  prisma: PrismaClient,
  examIds: number[],
): Promise<Map<string, ActiveReExam>> {
  const result = new Map<string, ActiveReExam>();
  if (examIds.length === 0) return result;
  const rows = await prisma.exam_re_examinations.findMany({
    where: { exam_id: { in: examIds }, ...NOT_CANCELLED },
    select: reExamSelect,
    orderBy: { id: 'desc' },
  });
  for (const row of rows) {
    const key = reExamKey(row.user_id, row.exam_id);
    if (result.has(key)) continue;
    const active = toActive(row);
    if (active) result.set(key, active);
  }
  return result;
}

export function reExamKey(userId: number, examId: number): string {
  return `${userId}:${examId}`;
}

/** The exam row with its window swapped for the re-exam's. Duration is unchanged. */
export function withReExamWindow<T extends WindowColumns>(exam: T, reExam: ActiveReExam): T {
  return {
    ...exam,
    from_date: reExam.date,
    from_time: reExam.startTime,
    to_date: reExam.date,
    to_time: reExam.endTime,
  };
}

function asDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string' && value.trim() !== '') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** Rule 1: started on or after the re-exam was scheduled. */
export function attemptBelongsToReExam(attemptCreatedAt: unknown, reExam: ActiveReExam): boolean {
  const created = asDate(attemptCreatedAt);
  return created !== null && created.getTime() >= reExam.scheduledAt.getTime();
}

/** Prisma filter restricting attempts to those that belong to the re-exam. */
export function reExamAttemptFloor(reExam: ActiveReExam | null): { created_at?: { gte: Date } } {
  return reExam ? { created_at: { gte: reExam.scheduledAt } } : {};
}

/**
 * The window an existing attempt is judged by: the re-exam's when the attempt
 * belongs to it, the exam's own otherwise.
 */
export function windowForAttempt<T extends WindowColumns>(
  exam: T,
  attemptCreatedAt: unknown,
  reExam: ActiveReExam | null,
): T {
  return reExam && attemptBelongsToReExam(attemptCreatedAt, reExam) ? withReExamWindow(exam, reExam) : exam;
}
