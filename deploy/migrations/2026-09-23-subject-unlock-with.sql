-- SCHEMA change: subject.unlock_with_subject_id ("Unlocks together with").
--
-- RUN THIS BEFORE DEPLOYING the code that ships it. Prisma selects every model
-- column by default (e.g. listAllSubjects, getLessons), so once the new field is
-- in the client every subject read fails with "Unknown column" until it exists.
-- The app user lms_ttii has no ALTER privilege: run as root on the PHP droplet
-- (143.110.240.210) with the defaults-file form.
--
-- Why (Risha/Majida 2026-09-23): "5 Areas of Practical Work – Montessori
-- Records" is the practical component of "Montessori Methodology in Modern
-- Education". Students in a Methodology cohort must reach both at once, without
-- restructuring the course into sub-sections. PG Diploma learners are still on a
-- Cohort Based offering, so a subject opens only when a cohort covers it, and
-- no current cohort covers 5 Areas.
--
-- Semantics: when a subject names a partner here, a cohort that covers the
-- partner also covers this subject — the subject padlock AND the lesson
-- padlocks, web and mobile alike (content-service getCohortIdForSubject). One
-- hop only; NULL means no partner (every existing row).
--
-- Safe to re-run (IF NOT EXISTS). Reversible: see the rollback at the bottom.
USE lms_ttii;

ALTER TABLE subject
  ADD COLUMN IF NOT EXISTS unlock_with_subject_id INT NULL DEFAULT NULL AFTER master_subject_id;

-- Verification — one row, Type int(11), Null YES, Default NULL:
-- SHOW COLUMNS FROM subject LIKE 'unlock_with_subject_id';

-- ROLLBACK — ONLY after the code that reads the column has been reverted and
-- deployed, for the same reason this must run before the deploy:
-- ALTER TABLE subject DROP COLUMN unlock_with_subject_id;
