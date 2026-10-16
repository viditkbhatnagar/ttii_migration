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
