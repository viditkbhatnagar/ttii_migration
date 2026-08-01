-- Exam reminder dedupe table (Naji 2026-08-01).
--
-- Run this ONCE against the production database. Until it exists, the exam
-- 24-hour and 1-hour reminder emails stay switched OFF — deliberately: the row
-- inserted here is what claims the right to send, so without it there is no
-- protection against mailing every student on every cron tick.
--
-- The application's DB user (lms_ttii) has no CREATE privilege, so this needs
-- an admin connection to the managed MariaDB instance (10.122.0.2, db lms_ttii)
-- — e.g. from the DigitalOcean console or any client with admin credentials.
--
-- Additive and idempotent: creates one new table, touches nothing existing, and
-- is safe to run more than once. The job re-checks for the table on every sweep,
-- so reminders start working within a few minutes of this running — no deploy
-- or restart needed.
--
-- Shape mirrors the existing live_class_reminders table.

CREATE TABLE IF NOT EXISTS exam_reminders (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  exam_id       INT          NOT NULL,
  user_id       INT          NOT NULL,
  reminder_type VARCHAR(16)  NOT NULL,   -- '24h' | '1h'
  sent_at       DATETIME     NOT NULL,
  created_at    DATETIME     NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_exam_reminder (exam_id, user_id, reminder_type),
  KEY idx_exam_reminders_exam (exam_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Verify:
--   SHOW COLUMNS FROM exam_reminders;
--   SELECT COUNT(*) FROM exam_reminders;
