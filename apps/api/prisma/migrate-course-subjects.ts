/**
 * Migration script: Populates course_subjects junction table from existing subject.course_id values.
 *
 * For every subject that has a non-null course_id and is not soft-deleted,
 * creates a course_subjects row linking that subject to its course.
 * Skips duplicates (idempotent — safe to run multiple times).
 *
 * Usage:  cd apps/api && npx tsx prisma/migrate-course-subjects.ts
 */
import { createPrismaClient } from '../src/data/prisma-client.js';

const DATABASE_URL = process.env.DATABASE_URL ?? 'mongodb://localhost:27017/ttii_lms';
const prisma = createPrismaClient(DATABASE_URL);

async function main(): Promise<void> {
  console.log('Starting course_subjects migration...');

  // Fetch all subjects that have a course_id set
  const subjects = await prisma.subject.findMany({
    where: {
      course_id: { not: null },
      deleted_at: null,
    },
    select: {
      id: true,
      course_id: true,
      order: true,
    },
  });

  console.log(`Found ${subjects.length} subjects with course_id to migrate.`);

  let created = 0;
  let skipped = 0;

  for (const subject of subjects) {
    if (!subject.course_id) continue;

    try {
      // Check if junction row already exists
      const existing = await prisma.course_subjects.findFirst({
        where: {
          course_id: subject.course_id,
          subject_id: subject.id,
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await prisma.course_subjects.create({
        data: {
          course_id: subject.course_id,
          subject_id: subject.id,
          order: subject.order ?? 0,
          is_mandatory: 1,
          created_at: new Date(),
        },
      });

      created++;
    } catch (err) {
      // Unique constraint violation means it already exists — skip
      if (err instanceof Error && err.message.includes('Unique constraint')) {
        skipped++;
      } else {
        console.error(`Error migrating subject ${subject.id}:`, err);
      }
    }
  }

  console.log(`Migration complete. Created: ${created}, Skipped (already exists): ${skipped}`);

  // Verify counts
  const totalJunctions = await prisma.course_subjects.count();
  const totalSubjects = await prisma.subject.count({ where: { course_id: { not: null }, deleted_at: null } });
  console.log(`Verification: ${totalJunctions} junction rows for ${totalSubjects} subjects with course_id.`);
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
