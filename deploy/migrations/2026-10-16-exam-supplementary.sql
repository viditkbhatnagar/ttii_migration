-- Supplementary examinations (Risha, TTII 2026-10-16): "Can we create a
-- supplementary exam from an existing exam, with an editable name? ... It
-- should automatically pick only the subjects where students failed, and
-- assign only the students who failed each subject."
--
-- One row per supplementary exam, linking it to the exam it was created from:
--   * exam_id        = the supplementary's own (parent) exam row
--   * source_exam_id = the exam whose results it was created from
-- The supplementary itself is an ordinary exam (parent + one child sitting per
-- subject). What makes it different is that each child sitting keeps its OWN
-- allocation (only the students of that subject); publishing reads this table
-- to know it must not copy the parent's student list onto every sitting.
--
-- Additive only: ONE new table, no ALTER of `exam`, no foreign keys (none in
-- this schema). Safe to re-run. Until it runs the app behaves as before: no
-- exam is supplementary, the Exams list and results load normally, and
-- "Create Supplementary Exam" answers "not set up yet".
--
-- ROLLBACK WARNING: API code older than the commit that added this file does
-- not know these rows. Publishing a supplementary exam with that code copies
-- the exam's whole student list onto EVERY subject sitting (and Step 5 can do
-- the same), entering students for subjects they passed. Do not roll the API
-- back across that commit while any supplementary exam is still a DRAFT;
-- publish or delete those drafts first. A PUBLISHED one keeps its per-subject
-- students, but older code must not re-publish it (same copy) and its Result
-- page there shows students "Absent" in subjects they were never entered for.
USE lms_ttii;

CREATE TABLE IF NOT EXISTS exam_supplementary (
  exam_id INT NOT NULL PRIMARY KEY,
  source_exam_id INT NOT NULL,
  created_by INT NULL,
  created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX (source_exam_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Verification (a first run starts empty):
-- SHOW TABLES LIKE 'exam\_supplementary';
-- SHOW INDEX FROM exam_supplementary;  -- PRIMARY (exam_id) + source_exam_id
-- SELECT COUNT(*) FROM exam_supplementary;
