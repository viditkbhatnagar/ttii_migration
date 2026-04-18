-- Session 11, Phase G — cohort_offerings pivot
-- Links cohorts to multiple offerings of the same course.
-- Additive only. Requires Phase H's offerings table.
USE lms_ttii;

CREATE TABLE IF NOT EXISTS cohort_offerings (
  cohort_id INT NOT NULL,
  offering_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by INT NULL,
  PRIMARY KEY (cohort_id, offering_id),
  INDEX idx_cohort (cohort_id),
  INDEX idx_offering (offering_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
