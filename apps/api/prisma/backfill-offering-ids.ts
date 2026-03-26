/**
 * Backfill offering_id on enrol records.
 * Usage: cd apps/api && npx tsx prisma/backfill-offering-ids.ts
 */
import { createPrismaClient } from '../src/data/prisma-client.js';

const DATABASE_URL = process.env.DATABASE_URL ?? 'mongodb://localhost:27017/ttii_lms';
const prisma = createPrismaClient(DATABASE_URL);

async function main(): Promise<void> {
  // Count all offerings (no filter, since deleted_at might not exist on docs)
  const offerings = await prisma.course_offering.findMany({
    select: { id: true, course_id: true },
  });
  console.log(`Found ${offerings.length} offerings total.`);

  let updated = 0;
  for (const off of offerings) {
    const result = await prisma.enrol.updateMany({
      where: { course_id: off.course_id },
      data: { offering_id: off.id },
    });
    updated += result.count;
  }
  console.log(`Enrollments backfilled: ${updated}`);

  // Also backfill cohorts
  let cohortsUpdated = 0;
  for (const off of offerings) {
    const result = await prisma.cohorts.updateMany({
      where: { course_id: off.course_id },
      data: { offering_id: off.id },
    });
    cohortsUpdated += result.count;
  }
  console.log(`Cohorts backfilled: ${cohortsUpdated}`);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
