/**
 * Fix: Sets deleted_at=null on all junction table rows that were created
 * without it (MongoDB doesn't match null filter on missing fields).
 *
 * Usage: cd apps/api && npx tsx prisma/fix-deleted-at.ts
 */
import { createPrismaClient } from '../src/data/prisma-client.js';

const DATABASE_URL = process.env.DATABASE_URL ?? 'mongodb://localhost:27017/ttii_lms';
const prisma = createPrismaClient(DATABASE_URL);

async function main(): Promise<void> {
  const tables = [
    { name: 'course_subjects', model: prisma.course_subjects },
    { name: 'program_courses', model: prisma.program_courses },
    { name: 'course_offering', model: prisma.course_offering },
    { name: 'content_asset', model: prisma.content_asset },
    { name: 'lesson_content', model: prisma.lesson_content },
    { name: 'completion_policy', model: prisma.completion_policy },
    { name: 'certificate_template', model: prisma.certificate_template },
    { name: 'certificate', model: prisma.certificate },
  ] as { name: string; model: { updateMany: (args: { where: object; data: object }) => Promise<{ count: number }> } }[];

  for (const { name, model } of tables) {
    const result = await model.updateMany({
      where: {},
      data: { deleted_at: null },
    });
    console.log(`${name}: updated ${result.count} rows with deleted_at=null`);
  }
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
