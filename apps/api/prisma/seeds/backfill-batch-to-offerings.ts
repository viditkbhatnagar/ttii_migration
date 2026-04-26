/**
 * One-time backfill: legacy `batch` (Intake) rows → new `offerings` rows.
 *
 * Naji confirmed (2026-04-26) that "Intake from old LMS = Course Offering
 * from new LMS" and we need to mirror them so the new admin's Course
 * Offerings page surfaces the existing intakes. This script is the
 * one-shot import.
 *
 * HOW TO USE:
 *   1. Naji sends the mapping: for each active Intake (legacy batch row),
 *      what's the offering name + which course does it belong to.
 *   2. Fill in MAPPING below with one entry per intake. Use the legacy
 *      batch.id (visible from `SELECT id, title FROM batch WHERE deleted_at IS NULL`).
 *   3. Run: `cd apps/api && npx tsx prisma/seeds/backfill-batch-to-offerings.ts`
 *   4. The script is idempotent — re-running skips intakes that already
 *      have an offering linked via `legacy_batch_id`.
 *
 * The script copies title/dates/status from `batch` and lets the admin team
 * fill in the richer offering fields (pricing, certificate template,
 * completion policy) afterwards via the admin UI.
 */
import { getPrismaClient } from '../../src/data/prisma-client.js';

interface IntakeMapping {
  /** Legacy `batch.id` */
  batchId: number;
  /** What the new offering should be called. */
  offeringName: string;
  /** Which course this intake belongs to (`course.id`). */
  courseId: number;
  /** "cohort" (default) or "self_paced". */
  deliveryMode?: 'cohort' | 'self_paced';
  /** "paid" (default) or "free". */
  feeCategory?: 'paid' | 'free';
  /** Base fee in INR (or whatever the platform currency is). */
  baseFee?: number;
}

// ─── Naji's mapping ────────────────────────────────────────────────
// Fill in as Naji confirms each intake. The script is idempotent so
// you can run partial mappings and add more later.
const MAPPING: IntakeMapping[] = [
  // Example shape (uncomment + edit):
  // {
  //   batchId: 7,
  //   offeringName: 'PG Diploma in Pediatric Nutrition – September 2025',
  //   courseId: 1,
  //   deliveryMode: 'cohort',
  //   feeCategory: 'paid',
  //   baseFee: 25000,
  // },
];

async function main(): Promise<void> {
  if (MAPPING.length === 0) {
    console.log('No mapping configured — populate MAPPING in this file before running.');
    process.exit(1);
  }

  const prisma = getPrismaClient();
  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const entry of MAPPING) {
    try {
      const batch = await prisma.batch.findFirst({
        where: { id: entry.batchId, deleted_at: null },
      });
      if (!batch) {
        console.warn(`✗ batch.id=${entry.batchId} not found or deleted — skipping`);
        failed += 1;
        continue;
      }

      const existing = await prisma.offerings.findFirst({
        where: { legacy_batch_id: entry.batchId },
      });
      if (existing) {
        console.log(`• batch.id=${entry.batchId} already linked to offerings.id=${existing.id} — skip`);
        skipped += 1;
        continue;
      }

      const created = await prisma.offerings.create({
        data: {
          course_id: entry.courseId,
          title: entry.offeringName,
          delivery_mode: entry.deliveryMode ?? 'cohort',
          fee_category: entry.feeCategory ?? 'paid',
          base_fee: entry.baseFee ?? null,
          offered_fee: entry.baseFee ?? null,
          start_date: batch.start_date,
          end_date: batch.end_date,
          status: batch.status ? 'active' : 'inactive',
          publish_type: 'public',
          legacy_batch_id: entry.batchId,
          created_by: 1,
          updated_by: 1,
        },
      });
      console.log(`✓ batch.id=${entry.batchId} (${batch.title}) → offerings.id=${created.id} (${created.title})`);
      imported += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`✗ batch.id=${entry.batchId} import failed: ${message}`);
      failed += 1;
    }
  }

  console.log(`\nDone. imported=${imported} skipped=${skipped} failed=${failed}`);
  await prisma.$disconnect();
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
