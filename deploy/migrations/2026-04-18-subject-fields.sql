-- =============================================================
-- Migration: add Subject management fields for QA Correction2.docx round
-- Date: 2026-04-18
-- Additive only. Safe for dual-LMS operation.
-- =============================================================

USE lms_ttii;

-- Subject Info additions
ALTER TABLE subject
  ADD COLUMN IF NOT EXISTS subject_code VARCHAR(50) NULL AFTER title,
  ADD COLUMN IF NOT EXISTS short_name VARCHAR(100) NULL AFTER subject_code,
  ADD COLUMN IF NOT EXISTS subject_type VARCHAR(20) NULL AFTER short_name,  -- 'core' | 'elective'
  ADD COLUMN IF NOT EXISTS duration_hours INT NULL AFTER subject_type,
  ADD COLUMN IF NOT EXISTS version VARCHAR(20) NULL AFTER duration_hours;

-- Learning Design additions
ALTER TABLE subject
  ADD COLUMN IF NOT EXISTS learning_outcomes TEXT NULL,
  ADD COLUMN IF NOT EXISTS skills_covered TEXT NULL;

-- Assessment Configuration (per component max + pass marks)
ALTER TABLE subject
  ADD COLUMN IF NOT EXISTS assignment_max_marks INT NULL,
  ADD COLUMN IF NOT EXISTS assignment_pass_marks INT NULL,
  ADD COLUMN IF NOT EXISTS examination_max_marks INT NULL,
  ADD COLUMN IF NOT EXISTS examination_pass_marks INT NULL,
  ADD COLUMN IF NOT EXISTS project_max_marks INT NULL,
  ADD COLUMN IF NOT EXISTS project_pass_marks INT NULL,
  ADD COLUMN IF NOT EXISTS viva_max_marks INT NULL,
  ADD COLUMN IF NOT EXISTS viva_pass_marks INT NULL;

-- Status
ALTER TABLE subject
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NULL DEFAULT 'draft';  -- 'draft' | 'active' | 'archived'

-- Verify
SHOW COLUMNS FROM subject WHERE Field IN (
  'subject_code','short_name','subject_type','duration_hours','version',
  'learning_outcomes','skills_covered',
  'assignment_max_marks','assignment_pass_marks',
  'examination_max_marks','examination_pass_marks',
  'project_max_marks','project_pass_marks',
  'viva_max_marks','viva_pass_marks',
  'status'
);
