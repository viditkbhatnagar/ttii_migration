-- Session 11, Phase H — Create offerings + completion_policies + certificate_templates
-- Additive only. These tables do not exist in production as of 2026-04-18.
USE lms_ttii;

CREATE TABLE IF NOT EXISTS completion_policies (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  course_id INT NULL,
  offering_id INT NULL,
  min_progress_pct INT NULL,
  min_exam_score_pct INT NULL,
  require_all_assignments TINYINT(1) NULL DEFAULT 0,
  require_all_exams TINYINT(1) NULL DEFAULT 0,
  min_attendance_pct INT NULL,
  require_manual_approval TINYINT(1) NULL DEFAULT 0,
  created_by INT NULL,
  updated_by INT NULL,
  deleted_by INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  INDEX idx_course (course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS certificate_templates (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  template VARCHAR(500) NULL,
  signatory VARCHAR(255) NULL,
  course_id INT NULL,
  program_id INT NULL,
  created_by INT NULL,
  updated_by INT NULL,
  deleted_by INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS offerings (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  title VARCHAR(255) NULL,
  offering_code VARCHAR(100) NULL,
  delivery_mode VARCHAR(30) NOT NULL DEFAULT 'cohort',
  academic_year VARCHAR(20) NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  enrollment_start DATE NULL,
  enrollment_end DATE NULL,
  max_enrollment INT NULL,
  pricing_amount DECIMAL(10,2) NULL,
  language_id INT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  -- Pricing (QA spec)
  fee_category VARCHAR(10) NULL DEFAULT 'paid',
  base_fee DECIMAL(10,2) NULL,
  discount DECIMAL(10,2) NULL,
  offered_fee DECIMAL(10,2) NULL,
  -- Access Control + Academic Rules (QA spec)
  course_expiry_days INT NULL,
  content_release_strategy VARCHAR(30) NULL DEFAULT 'full',
  completion_policy_id INT NULL,
  certificate_template_id INT NULL,
  publish_type VARCHAR(10) NULL DEFAULT 'public',
  created_by INT NULL,
  updated_by INT NULL,
  deleted_by INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  INDEX idx_course (course_id),
  INDEX idx_status (status),
  INDEX idx_delivery (delivery_mode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
