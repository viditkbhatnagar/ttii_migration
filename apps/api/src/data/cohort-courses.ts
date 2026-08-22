import type { PrismaClient } from '@prisma/client';

/**
 * Helpers for cohorts that serve more than one program.
 *
 * Naji 2026-08-19 — "we want to create common cohorts for both PG and Diploma
 * students". `cohorts.course_id` still holds the PRIMARY course and is read in
 * ~40 places that stay untouched; `cohort_courses` holds the FULL set and is a
 * strict superset of it (see deploy/migrations/2026-08-19-cohort-courses-pivot.sql).
 *
 * So any reader that used to match `cohorts.course_id = X` widens to
 * "primary course is X OR the pivot links this cohort to X" — the same idiom
 * already used for exams, where a child exam built from a shared subject could
 * only carry one course_id and was hidden from the other course's students
 * (assessment-service.ts, exam_courses).
 */

/** Cohort ids linked to this course through the pivot. Empty array if none. */
export async function cohortIdsForCourse(
  prisma: PrismaClient,
  courseId: number | null,
): Promise<number[]> {
  if (courseId === null || courseId <= 0) return [];
  const rows = await prisma.cohort_courses.findMany({
    where: { course_id: courseId },
    select: { cohort_id: true },
  });
  return [...new Set(rows.map((r) => r.cohort_id))];
}

/**
 * A Prisma `where` fragment matching cohorts that serve `courseId`, by primary
 * course or by pivot. Returns null when there is no course to filter on, so
 * callers can spread it and keep "no filter" behaviour.
 */
export async function cohortsServingCourseWhere(
  prisma: PrismaClient,
  courseId: number | null,
): Promise<{ OR: Array<Record<string, unknown>> } | null> {
  if (courseId === null || courseId <= 0) return null;
  const pivotCohortIds = await cohortIdsForCourse(prisma, courseId);
  const or: Array<Record<string, unknown>> = [{ course_id: courseId }];
  if (pivotCohortIds.length > 0) or.push({ id: { in: pivotCohortIds } });
  return { OR: or };
}

/**
 * The full course set for each of the given cohorts, keyed by cohort id.
 *
 * Falls back to the cohort's own `course_id` when it has no pivot rows, so a
 * cohort created before the pivot existed (or by a path that does not write it)
 * still reports its one program rather than none.
 */
export async function cohortCourseIdMap(
  prisma: PrismaClient,
  cohorts: Array<{ id: number; course_id: number | null }>,
): Promise<Map<number, number[]>> {
  const result = new Map<number, number[]>();
  if (cohorts.length === 0) return result;

  const rows = await prisma.cohort_courses.findMany({
    where: { cohort_id: { in: cohorts.map((c) => c.id) } },
    select: { cohort_id: true, course_id: true },
  });

  for (const row of rows) {
    const existing = result.get(row.cohort_id);
    if (existing) existing.push(row.course_id);
    else result.set(row.cohort_id, [row.course_id]);
  }

  for (const cohort of cohorts) {
    if (!result.has(cohort.id) && cohort.course_id !== null && cohort.course_id > 0) {
      result.set(cohort.id, [cohort.course_id]);
    }
  }

  return result;
}
