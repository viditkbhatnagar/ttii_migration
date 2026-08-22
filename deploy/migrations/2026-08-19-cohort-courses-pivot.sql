-- cohort_courses pivot — one cohort can serve several programs
--
-- Naji 2026-08-19: "We want to create common cohorts for both PG and Diploma
-- students... could you pls add cohort creation page has such options like
-- multiple programs in one cohort."
--
-- A cohort carried a single cohorts.course_id, so ticking two programs on the
-- Add Cohort page created TWO cohort rows sharing a title, code and dates —
-- two schedules, two attendance sheets, the class split in half. This pivot
-- lets one cohort row serve several courses.
--
-- cohorts.course_id is KEPT and still holds the PRIMARY (first) course: around
-- forty readers depend on it. The backfill below makes this table a strict
-- superset of that column, which is what lets the widened readers match on
-- `course_id = X OR cohort_id IN (pivot for X)` without special cases.
--
-- Deliberately NOT derived from cohort_offerings: offerings are optional on
-- create, so a course with no intake row yet would silently vanish.
--
-- Additive only. Safe to re-run. Mirrors 2026-04-18-cohort-offerings-pivot.sql:
-- composite PK, one index per side, no FK (this schema has none anywhere), and
-- NO deleted_at — edits replace links with DELETE + INSERT, and a soft-deleted
-- row would hold the composite PK and block the re-insert.
USE lms_ttii;

CREATE TABLE IF NOT EXISTS cohort_courses (
  cohort_id INT NOT NULL,
  course_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by INT NULL,
  PRIMARY KEY (cohort_id, course_id),
  INDEX idx_cohort_courses_cohort (cohort_id),
  INDEX idx_cohort_courses_course (course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Backfill every existing cohort from its primary course.
INSERT IGNORE INTO cohort_courses (cohort_id, course_id, created_at, created_by)
SELECT c.id, c.course_id, NOW(), c.created_by
FROM cohorts c
WHERE c.deleted_at IS NULL
  AND c.course_id IS NOT NULL
  AND c.course_id > 0;

-- Verification. (1) and (2) must match on a first run; (3) must be 0 until
-- someone actually creates a multi-program cohort.
-- SELECT COUNT(*) AS pivot_rows FROM cohort_courses;
-- SELECT COUNT(*) AS live_cohorts_with_course FROM cohorts
--   WHERE deleted_at IS NULL AND course_id IS NOT NULL AND course_id > 0;
-- SELECT COUNT(*) AS multi_program_cohorts FROM (
--   SELECT cohort_id FROM cohort_courses GROUP BY cohort_id HAVING COUNT(*) > 1
-- ) x;
