/**
 * Migration script: Creates course_offering records from existing enrollment data.
 *
 * Groups existing `enrol` records by (course_id, batch_id) and creates one
 * course_offering per unique combination. Then backfills offering_id on
 * enrol and cohorts records.
 *
 * Usage:  cd apps/api && npx tsx prisma/migrate-offerings.ts
 */
import { createPrismaClient } from '../src/data/prisma-client.js';

const DATABASE_URL = process.env.DATABASE_URL ?? 'mongodb://localhost:27017/ttii_lms';
const prisma = createPrismaClient(DATABASE_URL);

async function main(): Promise<void> {
  console.log('Starting course_offering migration...');

  // Step 1: Get all distinct (course_id, batch_id) combinations from enrol
  const enrollments = await prisma.enrol.findMany({
    where: { deleted_at: null },
    select: { course_id: true, batch_id: true },
  });

  const courseGroups = new Map<string, Set<string>>();
  for (const enrol of enrollments) {
    const key = `${enrol.course_id}::${enrol.batch_id ?? ''}`;
    if (!courseGroups.has(key)) {
      courseGroups.set(key, new Set());
    }
  }

  console.log(`Found ${courseGroups.size} unique (course, batch) combinations from ${enrollments.length} enrollments.`);

  // Step 2: Fetch course titles for naming
  const courseIds = [...new Set(enrollments.map((e) => e.course_id))];
  const courses = courseIds.length > 0
    ? await prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } })
    : [];
  const courseNameMap = new Map(courses.map((c) => [c.id, c.title]));

  let offeringsCreated = 0;

  // Step 3: Create offerings and backfill
  for (const key of courseGroups.keys()) {
    const [courseId, batchId] = key.split('::');
    if (!courseId) continue;

    // Check if offering already exists for this course
    const existing = await prisma.course_offering.findFirst({
      where: { course_id: courseId, deleted_at: null },
    });

    let offeringId: string;
    if (existing) {
      offeringId = existing.id;
    } else {
      const courseName = courseNameMap.get(courseId) ?? 'Unknown';
      const offering = await prisma.course_offering.create({
        data: {
          course_id: courseId,
          title: `${courseName} — Default Offering`,
          delivery_mode: 'cohort',
          status: 'active',
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
      offeringId = offering.id;
      offeringsCreated++;
    }

    // Backfill enrol records
    const updateFilter: Record<string, unknown> = {
      course_id: courseId,
      offering_id: null,
      deleted_at: null,
    };
    if (batchId) updateFilter.batch_id = batchId;

    await prisma.enrol.updateMany({
      where: updateFilter as Parameters<typeof prisma.enrol.updateMany>[0]['where'],
      data: { offering_id: offeringId },
    });
  }

  // Step 4: Backfill cohorts
  const cohorts = await prisma.cohorts.findMany({
    where: { offering_id: null, course_id: { not: null }, deleted_at: null },
    select: { id: true, course_id: true },
  });

  let cohortsUpdated = 0;
  for (const cohort of cohorts) {
    if (!cohort.course_id) continue;
    const offering = await prisma.course_offering.findFirst({
      where: { course_id: cohort.course_id, deleted_at: null },
      select: { id: true },
    });
    if (offering) {
      await prisma.cohorts.update({
        where: { id: cohort.id },
        data: { offering_id: offering.id },
      });
      cohortsUpdated++;
    }
  }

  console.log(`Migration complete.`);
  console.log(`  Offerings created: ${offeringsCreated}`);
  console.log(`  Cohorts backfilled: ${cohortsUpdated}`);

  // Verify
  const totalOfferings = await prisma.course_offering.count();
  const enrolWithOffering = await prisma.enrol.count({ where: { offering_id: { not: null } } });
  const totalEnrol = await prisma.enrol.count({ where: { deleted_at: null } });
  console.log(`  Total offerings: ${totalOfferings}`);
  console.log(`  Enrollments with offering_id: ${enrolWithOffering}/${totalEnrol}`);
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
