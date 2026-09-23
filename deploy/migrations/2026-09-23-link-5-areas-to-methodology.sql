-- DATA change (not schema): 5 Areas of Practical Work unlocks with Montessori
-- Methodology. Run AFTER 2026-09-23-subject-unlock-with.sql (the column must exist).
--
-- Risha/Majida 2026-09-23: "5 Areas of Practical Work – Montessori Records" is
-- the practical component of "Montessori Methodology in Modern Education";
-- students in any Methodology cohort must reach both at once, before their live
-- session, without restructuring the course.
--
-- Verified on production 2026-09-23 before writing this:
--   subject 30 = "Montessori Methodology in Modern Education" (active)
--   subject 31 = "5 Areas of Practical Work - Montessori Records" (active)
--   both linked to course 16 (Diploma) and course 18 (PG Diploma) via course_subject
--   Methodology cohorts: 70 "MM - FEB 2026", 98 "MMAUG26", 102 "MMSEP26" (current,
--   course 18) — 67 distinct learners. Learners on a Full offering already see
--   everything; this only changes what Cohort Based learners (e.g. PG Diploma
--   offering 12) see.
--
-- Same effect is available from the admin UI: Subjects → Edit "5 Areas…" →
-- "Unlocks together with" = Montessori Methodology in Modern Education.
--
-- Safe to re-run. Reversible: see the rollback at the bottom.
USE lms_ttii;

UPDATE subject
SET unlock_with_subject_id = 30, updated_at = NOW()
WHERE id = 31
  AND deleted_at IS NULL
  AND EXISTS (SELECT 1 FROM (SELECT id FROM subject WHERE id = 30 AND deleted_at IS NULL) AS partner);

-- Verification — one row: 31 | 5 Areas… | 30
-- SELECT id, title, unlock_with_subject_id FROM subject WHERE unlock_with_subject_id IS NOT NULL;

-- ROLLBACK (restores the exact prior state of this change):
-- UPDATE subject SET unlock_with_subject_id = NULL WHERE id = 31;
