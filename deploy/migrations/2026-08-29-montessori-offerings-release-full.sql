-- DATA change (not schema): open the remaining Montessori intakes.
--
-- Naji/Risha 2026-08-29 chose "option 1" — switch the remaining Cohort Based
-- intakes to Full (all at once) — after d9d10df7 made
-- offerings.content_release_strategy actually drive the content locks. Until
-- that commit the column was written by the admin UI and read by nothing, so
-- these learners sat under sequential lesson gating: first lesson open, the rest
-- padlocked until the previous one was completed.
--
-- Scope: course 16 (Diploma in Montessori Teacher Training), ONLY the offerings
-- that are still 'cohort' AND actually have enrolled learners — 71 in total.
-- Offering 24 (October 2026) is deliberately EXCLUDED: it has no learners yet,
-- so its release policy is a live decision for the institute rather than
-- something to change on their behalf.
--
-- Offerings 17 (July 2026) and 22 (September 2026) were already 'full'.
--
-- Safe to re-run. Reversible: see the rollback at the bottom.
USE lms_ttii;

UPDATE offerings
SET content_release_strategy = 'full'
WHERE course_id = 16
  AND content_release_strategy = 'cohort'
  AND id IN (1, 2, 4, 6, 8, 9, 11, 13, 20);

-- Verification — every course-16 offering with learners should now read 'full',
-- and offering 24 should still read 'cohort'.
-- SELECT id, title, status, content_release_strategy FROM offerings
--   WHERE course_id = 16 ORDER BY id;

-- ROLLBACK (restores the exact prior state of this change):
-- UPDATE offerings SET content_release_strategy = 'cohort'
--   WHERE id IN (1, 2, 4, 6, 8, 9, 11, 13, 20);
