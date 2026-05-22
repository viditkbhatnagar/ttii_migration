/**
 * Naji UAT 2026-05-22 — clean up the dummy / test-course assignment rows
 * that pollute the Cohort > Assignments table, the master Assignment
 * Summary list, and the Assignment Evaluation queue.
 *
 * Targets:
 *   1. Empty rows — no title AND no course/cohort linkage (placeholder garbage).
 *   2. "Primary Course - Test" assignments — Naji explicitly asked to
 *      delete every assignment tied to this test course (rows 11–17 in
 *      the screenshot). Matched by the course title rather than a
 *      hard-coded id so it's portable across environments.
 *
 * Dry-run by default (prints rows that would be deleted). Pass `--apply`
 * to actually soft-delete them (sets deleted_at = NOW() so an audit
 * record remains, mirroring the rest of the codebase).
 *
 * Usage:
 *   cd apps/api && npx tsx prisma/cleanup-dummy-assignments.ts
 *   cd apps/api && npx tsx prisma/cleanup-dummy-assignments.ts --apply
 */
import { createPrismaClient } from '../src/data/prisma-client.js';

const TEST_COURSE_TITLES = ['Primary Course - Test'];

const DATABASE_URL = process.env.DATABASE_URL ?? '';
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set. Refusing to run.');
  process.exit(1);
}
const prisma = createPrismaClient(DATABASE_URL);

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');

  // 1. Find the test courses (so we can match by id, not by string later).
  const testCourses = await prisma.course.findMany({
    where: { title: { in: TEST_COURSE_TITLES } },
    select: { id: true, title: true },
  });
  const testCourseIds = new Set(testCourses.map((c) => c.id));
  if (testCourses.length > 0) {
    console.log('Test courses to purge:');
    for (const c of testCourses) console.log(`  - id=${c.id} title=${JSON.stringify(c.title)}`);
  } else {
    console.log('No "Primary Course - Test" course found — skipping that filter.');
  }

  // 2. Pull every live assignment so we can inspect candidates by hand.
  const live = await prisma.assignment.findMany({
    where: { deleted_at: null },
    select: {
      id: true,
      title: true,
      description: true,
      course_id: true,
      cohort_id: true,
      created_at: true,
    },
  });

  const candidates = live.filter((a) => {
    const titleEmpty = !a.title || a.title.trim() === '';
    const noLinkage = !a.course_id && !a.cohort_id;
    const isEmpty = titleEmpty && noLinkage;
    const isTestCourse = a.course_id != null && testCourseIds.has(a.course_id);
    return isEmpty || isTestCourse;
  });

  if (candidates.length === 0) {
    console.log('\nNo dummy or test-course assignments found. Nothing to clean up.');
    return;
  }

  console.log(`\nFound ${candidates.length} assignment row(s) to clean up:`);
  for (const a of candidates) {
    const reason = (!a.title || a.title.trim() === '') && !a.course_id && !a.cohort_id
      ? 'empty placeholder'
      : `test course (course_id=${a.course_id ?? '-'})`;
    console.log(`  - id=${a.id} title=${JSON.stringify(a.title)} cohort_id=${a.cohort_id ?? '-'} reason=${reason}`);
  }

  if (!apply) {
    console.log('\nDry-run mode. Re-run with --apply to soft-delete these rows.');
    return;
  }

  const now = new Date();
  const result = await prisma.assignment.updateMany({
    where: { id: { in: candidates.map((c) => c.id) }, deleted_at: null },
    data: { deleted_at: now },
  });
  console.log(`\nSoft-deleted ${result.count} assignment row(s).`);

  // Also soft-delete any submissions tied to those assignments so the
  // Assignment Evaluation queue stops showing them.
  const subResult = await prisma.assignment_submissions.updateMany({
    where: { assignment_id: { in: candidates.map((c) => c.id) }, deleted_at: null },
    data: { deleted_at: now },
  });
  console.log(`Soft-deleted ${subResult.count} related assignment submission(s).`);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
