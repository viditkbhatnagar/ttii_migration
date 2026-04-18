-- =============================================================
-- Migration: add Course Directory fields for QA Correction2.docx round
-- Date: 2026-04-18
-- Additive only — no renames / drops. Safe to apply while old PHP LMS
-- and new Node.js LMS both run against the same DB.
--
-- Production DB: 10.122.0.2:3306, database `lms_ttii`
-- Apply via:  ssh root@143.110.240.210 'PASS=$(cat /etc/cyberpanel/mysqlPassword); mysql -u root -p"$PASS" lms_ttii < /tmp/2026-04-18-course-fields.sql'
-- =============================================================

USE lms_ttii;

-- Course Code: unique code like "PGDTT-001"
ALTER TABLE course
  ADD COLUMN IF NOT EXISTS course_code VARCHAR(50) NULL AFTER title;

-- Version: e.g. "2.0", "v1.1"
ALTER TABLE course
  ADD COLUMN IF NOT EXISTS version VARCHAR(20) NULL AFTER level;

-- Total Learning Hours: sum of lesson durations (editable)
ALTER TABLE course
  ADD COLUMN IF NOT EXISTS total_learning_hours INT NULL AFTER duration;

-- Verify
SHOW COLUMNS FROM course WHERE Field IN ('course_code','version','total_learning_hours');
