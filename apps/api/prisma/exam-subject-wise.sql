-- Risha UAT 2026-08-06 — subject-wise exam sittings + half-mark scoring.
--
-- WHY
-- ---
-- The exam wizard's Step 2 lets an admin schedule one row per subject, each
-- with its own date, start/end time, duration, total marks and pass marks.
-- Those rows were stored in `exam_subjects` but NOTHING downstream ever read
-- them: the student portal rendered the single umbrella `exam` row, so five
-- subjects scheduled across 10–14 Aug showed up as ONE card spanning the whole
-- range (5835 minutes, 167 marks).
--
-- Publishing now materialises one CHILD `exam` row per `exam_subjects` row.
-- The wizard's own row becomes the PARENT: it keeps the course links, the
-- question pool and the student allocation, and is hidden from every
-- student-facing read. Children carry the real sitting: own date/time,
-- own duration, own marks, own slice of the questions, own attempts.
--
-- These two columns are what links a child back to its parent and to the
-- schedule row it was built from, so re-publishing UPDATES the existing
-- children instead of duplicating them.
--
-- SAFETY
-- ------
-- * Both ADDs are nullable with no default → every existing row stays valid
--   and every existing exam keeps behaving exactly as it does today
--   (parent_exam_id IS NULL means "not part of a subject-wise set").
-- * The exam_attempt.score widening INT → FLOAT is a lossless widening.
--   Existing integer scores are preserved exactly.
-- * No data is rewritten. No row is deleted. Safe to run on a live DB.
--
-- HOW TO RUN (on the droplet, against the production MariaDB)
--   mysql -h <host> -u <admin_user> -p"$PASS" ttii_lms < exam-subject-wise.sql
--
-- Verify afterwards:
--   SHOW COLUMNS FROM exam LIKE 'parent\_exam\_id';
--   SHOW COLUMNS FROM exam LIKE 'exam\_subject\_id';
--   SHOW COLUMNS FROM exam_attempt LIKE 'score';   -- expect: float
--   SHOW INDEX FROM exam WHERE Key_name IN ('idx_exam_parent_exam','idx_exam_subject_link');

ALTER TABLE `exam`
  ADD COLUMN `parent_exam_id`  INT NULL DEFAULT NULL AFTER `batch_id`,
  ADD COLUMN `exam_subject_id` INT UNSIGNED NULL DEFAULT NULL AFTER `parent_exam_id`;

-- NB: deliberately NOT named `idx_exam_subject` — the legacy schema used that
-- name for an index on a since-dropped `exam.subject_id` column, and a stale
-- one may still exist on this database.
CREATE INDEX `idx_exam_parent_exam`  ON `exam` (`parent_exam_id`);
CREATE INDEX `idx_exam_subject_link` ON `exam` (`exam_subject_id`);

-- Step 4 of the wizard offers marks in 0.5 steps (<Input step="0.5">) and
-- exam_questions.mark is already FLOAT, but exam_attempt.score was INT — so a
-- half-mark exam produced a fractional total that the INT column rejected and
-- the student's submission failed outright. Widen to match.
ALTER TABLE `exam_attempt`
  MODIFY COLUMN `score` FLOAT NULL DEFAULT NULL;
