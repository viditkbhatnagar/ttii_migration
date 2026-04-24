-- =============================================================
-- Migration: post-meeting Teams artifacts (recordings + attendance)
-- Date: 2026-04-24
-- Additive only. Safe for dual-LMS operation (old PHP LMS ignores
-- unknown columns / tables).
--
-- Adds:
--   - Recording + attendance sync tracking columns on live_class
--   - New live_class_attendance table — per-participant join/leave
--     data pulled from the Microsoft Graph attendanceReports endpoint
--     after each Teams meeting ends. Feeds the
--     completion_policies.min_attendance_pct certificate rule.
--
-- NOT reused:
--   - The existing `live_class.video_url` (VARCHAR 225) is too short for
--     real SharePoint/OneDrive content URLs and is referenced by the
--     legacy PHP LMS. Leave it in place; the new `recording_url` is the
--     canonical URL used by the new LMS.
--   - The `admission.attendance` LongText is admission-level cumulative
--     data, unrelated to per-class Teams attendance.
-- =============================================================

USE lms_ttii;

-- 1. live_class additions — sync state for recording + attendance
ALTER TABLE live_class
  ADD COLUMN IF NOT EXISTS recording_url TEXT NULL
    COMMENT 'Public/CDN URL of the Teams recording MP4 copied to our storage (DO Spaces). Null until the sync job finds + downloads the recording.',
  ADD COLUMN IF NOT EXISTS recording_storage_key VARCHAR(500) NULL
    COMMENT 'Object key inside the Spaces bucket, e.g. recordings/2026/04/123/abc.mp4',
  ADD COLUMN IF NOT EXISTS recording_graph_id VARCHAR(255) NULL
    COMMENT 'Graph recording.id (meeting can have multiple; we store the most recent)',
  ADD COLUMN IF NOT EXISTS recording_size_bytes BIGINT NULL,
  ADD COLUMN IF NOT EXISTS recording_duration_seconds INT NULL,
  ADD COLUMN IF NOT EXISTS recording_fetched_at DATETIME NULL
    COMMENT 'When our sync job successfully uploaded the MP4 to Spaces',
  ADD COLUMN IF NOT EXISTS recording_fetch_error VARCHAR(500) NULL
    COMMENT 'Last sync error if the download/upload failed. Cleared on success.',
  ADD COLUMN IF NOT EXISTS attendance_fetched_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS attendance_fetch_error VARCHAR(500) NULL;

-- Index so the cron query ("ended Teams meeting, not yet fully synced,
-- within retry window") is cheap. Includes toDate so the date-range
-- predicate can use it.
CREATE INDEX IF NOT EXISTS idx_live_class_teams_sync
  ON live_class (platform, toDate, recording_fetched_at, attendance_fetched_at);

-- 2. live_class_attendance — one row per (meeting, participant)
CREATE TABLE IF NOT EXISTS live_class_attendance (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  live_class_id     INT NOT NULL
    COMMENT 'FK-style link to live_class.id (no constraint; matches existing conventions)',
  user_id           INT UNSIGNED NULL
    COMMENT 'Matched to users.id by email; null when the participant is not a registered student (guest, instructor, external)',
  email             VARCHAR(255) NOT NULL
    COMMENT 'Email address Microsoft Graph reported for the participant',
  display_name      VARCHAR(255) NULL,
  role              VARCHAR(30) NULL
    COMMENT 'Graph-reported role: organizer | presenter | attendee',
  total_seconds     INT NOT NULL DEFAULT 0
    COMMENT 'Sum of all attendanceIntervals for this participant',
  percent_attended  DECIMAL(5,2) NULL
    COMMENT '0-100, total_seconds divided by meeting duration × 100; null if meeting duration unknown',
  first_joined_at   DATETIME NULL,
  last_left_at      DATETIME NULL,
  intervals_json    LONGTEXT NULL
    COMMENT 'Raw Graph attendanceIntervals for audit (JSON array of {joinDateTime, leaveDateTime, durationInSeconds})',
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_meeting_email (live_class_id, email),
  INDEX idx_live_class (live_class_id),
  INDEX idx_user (user_id),
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Verify
SHOW COLUMNS FROM live_class WHERE Field LIKE 'recording_%' OR Field LIKE 'attendance_%';
SHOW CREATE TABLE live_class_attendance\G
