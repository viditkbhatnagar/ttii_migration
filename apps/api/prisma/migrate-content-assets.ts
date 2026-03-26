/**
 * Migration script: Creates content_asset records from existing lesson_files,
 * and lesson_content junction rows to link them.
 *
 * Usage:  cd apps/api && npx tsx prisma/migrate-content-assets.ts
 */
import { createPrismaClient } from '../src/data/prisma-client.js';

const DATABASE_URL = process.env.DATABASE_URL ?? 'mongodb://localhost:27017/ttii_lms';
const prisma = createPrismaClient(DATABASE_URL);

function inferAssetType(lessonType: string | null, attachmentType: string | null): string {
  if (lessonType === 'video' || attachmentType === 'url') return 'video';
  if (lessonType === 'audio') return 'audio';
  if (lessonType === 'article') return 'article';
  if (lessonType === 'quiz') return 'quiz';
  if (lessonType === 'document' || attachmentType === 'document' || attachmentType === 'pdf') return 'document';
  return 'video'; // default
}

async function main(): Promise<void> {
  console.log('Starting content_asset migration from lesson_files...');

  const lessonFiles = await prisma.lesson_files.findMany({
    where: { deleted_at: null },
  });

  console.log(`Found ${lessonFiles.length} lesson_files to migrate.`);

  let assetsCreated = 0;
  let junctionsCreated = 0;
  let skipped = 0;

  for (const lf of lessonFiles) {
    const title = lf.title || lf.sub_title || `Untitled (${lf.id})`;
    const assetType = inferAssetType(lf.lesson_type, lf.attachment_type);

    try {
      const asset = await prisma.content_asset.create({
        data: {
          title,
          summary: lf.summary ?? null,
          asset_type: assetType,
          duration: lf.duration ?? null,
          provider: lf.lesson_provider ?? null,
          video_url: lf.video_url ?? null,
          download_url: lf.download_url ?? null,
          attachment: lf.attachment ?? null,
          audio_file: lf.audio_file ?? null,
          thumbnail: lf.thumbnail ?? null,
          created_by: lf.created_by ?? null,
          created_at: lf.created_at ?? new Date(),
          updated_at: lf.updated_at ?? new Date(),
        },
      });
      assetsCreated++;

      // Create junction row
      await prisma.lesson_content.create({
        data: {
          lesson_id: lf.lesson_id,
          asset_id: asset.id,
          order: lf.order ?? 0,
          free: lf.free ?? 'off',
          created_by: lf.created_by ?? null,
          created_at: new Date(),
        },
      });
      junctionsCreated++;
    } catch (err) {
      if (err instanceof Error && err.message.includes('Unique constraint')) {
        skipped++;
      } else {
        console.error(`Error migrating lesson_file ${lf.id}:`, err);
      }
    }
  }

  console.log(`Migration complete.`);
  console.log(`  Content assets created: ${assetsCreated}`);
  console.log(`  Lesson↔Asset junctions created: ${junctionsCreated}`);
  console.log(`  Skipped (duplicates): ${skipped}`);

  // Verify
  const totalAssets = await prisma.content_asset.count();
  const totalJunctions = await prisma.lesson_content.count();
  console.log(`  Total content_asset records: ${totalAssets}`);
  console.log(`  Total lesson_content junctions: ${totalJunctions}`);
}

main()
  .catch((err) => { console.error('Migration failed:', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
