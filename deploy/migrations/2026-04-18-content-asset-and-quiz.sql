-- Session 11, Phase I — Content Library + Quiz subsystem
-- Additive only. These tables do not exist in production as of 2026-04-18.
USE lms_ttii;

CREATE TABLE IF NOT EXISTS content_asset (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  summary TEXT NULL,
  asset_type VARCHAR(30) NOT NULL,
  subject_tag VARCHAR(100) NULL,
  lesson_tag VARCHAR(100) NULL,
  language VARCHAR(50) NULL,
  duration VARCHAR(30) NULL,
  provider VARCHAR(30) NULL,
  video_url VARCHAR(500) NULL,
  download_url VARCHAR(500) NULL,
  attachment VARCHAR(500) NULL,
  audio_file VARCHAR(500) NULL,
  thumbnail VARCHAR(500) NULL,
  tags VARCHAR(500) NULL,
  -- Quiz-specific (only used when asset_type='quiz')
  time_limit_seconds INT NULL,
  attempts_allowed INT NULL,
  pass_marks INT NULL,
  shuffle_questions TINYINT(1) NULL DEFAULT 0,
  created_by INT NULL,
  updated_by INT NULL,
  deleted_by INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  INDEX idx_asset_type (asset_type),
  INDEX idx_subject_tag (subject_tag)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS quiz_question (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  asset_id INT UNSIGNED NOT NULL,
  question TEXT NOT NULL,
  option_a TEXT NULL,
  option_b TEXT NULL,
  option_c TEXT NULL,
  option_d TEXT NULL,
  correct_answer VARCHAR(1) NOT NULL,
  sort_order INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_asset (asset_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
