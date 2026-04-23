-- =============================================================
-- Migration: add Microsoft Teams meeting support to live classes
-- Date: 2026-04-19
-- Additive only. Safe for dual-LMS operation (old PHP LMS ignores
-- unknown columns / tables).
--
-- Adds:
--   - 4 new columns on live_class (platform, join_url, external_meeting_id, host_email)
--   - New teams_meeting_hosts table — explicit allowlist of trainers
--     whose Teams calendar the backend can create meetings on
-- =============================================================

USE lms_ttii;

-- 1. live_class additions
ALTER TABLE live_class
  ADD COLUMN IF NOT EXISTS platform VARCHAR(20) NULL AFTER live_type,  -- 'teams' | 'zoom' | 'manual' | 'other'
  ADD COLUMN IF NOT EXISTS join_url VARCHAR(500) NULL AFTER zoom_id,
  ADD COLUMN IF NOT EXISTS external_meeting_id VARCHAR(255) NULL AFTER join_url,
  ADD COLUMN IF NOT EXISTS host_email VARCHAR(255) NULL AFTER external_meeting_id;

-- 2. teams_meeting_hosts — allowlist of trainers that our Graph app
--    is permitted (via Azure Cloud Communications Access Policy) to
--    create Teams meetings on behalf of.
CREATE TABLE IF NOT EXISTS teams_meeting_hosts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NULL,                  -- optional FK-style link to users.id (no constraint; kept loose to match existing conventions)
  teams_email VARCHAR(255) NOT NULL UNIQUE,   -- the trainer's @teachersindia.in UPN in M365
  display_name VARCHAR(255) NULL,             -- friendly label shown in the dropdown
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  policy_verified_at DATETIME NULL,           -- set by the "test" button after a successful meeting creation
  last_error TEXT NULL,                       -- last Graph error if meeting creation failed
  created_by INT NULL,
  updated_by INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  INDEX idx_teams_email (teams_email),
  INDEX idx_is_active (is_active, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Verify
SHOW COLUMNS FROM live_class WHERE Field IN ('platform','join_url','external_meeting_id','host_email');
SHOW CREATE TABLE teams_meeting_hosts\G
