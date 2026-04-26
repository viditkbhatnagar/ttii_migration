-- 2026-04-26: Link new offerings to legacy batch (Intake) rows
--
-- Naji confirmed that "Intake from Old LMS = Course Offering from New LMS" and
-- we need to mirror them. Adding an optional, unique foreign-key column to
-- offerings so each new offering can point back to the legacy batch row it was
-- imported from. This keeps both LMSes coexisting during the dual-run period.
--
-- The actual backfill (creating offerings rows for each existing batch row) is
-- driven by a one-time TS script at apps/api/prisma/seeds/backfill-batch-to-offerings.ts
-- once Naji sends the offering name + course mapping for the 7 active intakes.

ALTER TABLE `offerings`
  ADD COLUMN `legacy_batch_id` INT NULL AFTER `publish_type`,
  ADD UNIQUE INDEX `uniq_offerings_legacy_batch_id` (`legacy_batch_id`);
