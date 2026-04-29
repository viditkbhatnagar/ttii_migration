-- Subject merge — Phase 1: course_subject pivot (additive, zero-break)
-- Adds a many-to-many join table between course and subject so a single subject
-- row can be linked to multiple courses. Backfills from existing subject.course_id
-- so reads via the new pivot return the same data as today.
-- Safe to run multiple times (CREATE TABLE IF NOT EXISTS + ON DUPLICATE KEY UPDATE).
USE lms_ttii;

CREATE TABLE IF NOT EXISTS course_subject (
  course_id  INT NOT NULL,
  subject_id INT NOT NULL,
  position   INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by INT NULL,
  updated_at DATETIME NULL,
  updated_by INT NULL,
  deleted_at DATETIME NULL,
  PRIMARY KEY (course_id, subject_id),
  INDEX idx_cs_course (course_id),
  INDEX idx_cs_subject (subject_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Backfill from active subjects with a non-null course_id.
INSERT INTO course_subject (course_id, subject_id, position, created_at)
SELECT s.course_id, s.id, s.`order`, NOW()
FROM subject s
WHERE s.deleted_at IS NULL
  AND s.course_id IS NOT NULL
ON DUPLICATE KEY UPDATE
  position = VALUES(position),
  updated_at = NOW();
