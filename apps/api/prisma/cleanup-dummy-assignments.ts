/**
 * Naji UAT 2026-05-22 — delete the dummy assignment row(s) that surface on
 * the Cohort > Assignments table and the Assignment Evaluation list.
 *
 * Targets assignments with no title AND no course/cohort linkage — the
 * genuinely empty placeholder rows. Real assignments always have either
 * a title or at least a course/cohort association.
 *
 * Dry-run by default (prints rows that would be deleted). Pass `--apply`
 * to actually soft-delete them (sets deleted_at = NOW(), preserves audit
 * trail consistent with the rest of the codebase).
 *
 * Usage:
 *   cd apps/api && npx tsx prisma/cleanup-dummy-assignments.ts
 *   cd apps/api && npx tsx prisma/cleanup-dummy-assignments.ts --apply
 */
import { createPrismaClient } from '../src/data/prisma-client.js';

const DATABASE_URL = process.env.DATABASE_URL ?? '';
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set. Refusing to run.');
  process.exit(1);
}
const prisma = createPrismaClient(DATABASE_URL);

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');

  // Pull every live (not soft-deleted) assignment so we can inspect the
  // dummy candidates by hand. The filter is intentionally strict — we
  // only drop rows where BOTH title is empty AND there's no course/cohort
  // association. A title-less row attached to a real cohort is still
  // legitimate work for the instructor.
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
    return titleEmpty && noLinkage;
  });

  if (candidates.length === 0) {
    console.log('No dummy assignments found. Nothing to clean up.');
    return;
  }

  console.log(`Found ${candidates.length} dummy assignment row(s):`);
  for (const a of candidates) {
    console.log(`  - id=${a.id} title=${JSON.stringify(a.title)} course_id=${a.course_id ?? '-'} cohort_id=${a.cohort_id ?? '-'} created_at=${a.created_at?.toISOString?.() ?? '-'}`);
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
  console.log(`\nSoft-deleted ${result.count} dummy assignment row(s).`);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
