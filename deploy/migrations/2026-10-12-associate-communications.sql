-- associate_communications — Admin → Associate Management → Communications
--
-- Naji's Associate Management prototype (2026-10-12) has a Communications page:
-- every call, WhatsApp, email and note with an associate. This table holds the
-- MANUAL log: staff record a conversation that already happened. The LMS
-- never sends anything from it (the prototype's "Send Message" is not built).
--
-- Additive only: a NEW table, no ALTER of any existing table. Safe to re-run.
-- No FK (this schema has none anywhere). Soft delete via deleted_at, though no
-- delete action exists yet.
--
-- Until this runs, the Communications page shows an empty list with a
-- "not set up yet" note and Log Communication is refused (Prisma P2021), so
-- the API can be deployed before or after this file.
USE lms_ttii;

CREATE TABLE IF NOT EXISTS associate_communications (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  associate_id INT UNSIGNED NOT NULL,
  channel VARCHAR(20) NOT NULL,
  direction VARCHAR(20) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  created_by INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  INDEX idx_assoc_comm_associate (associate_id, created_at),
  INDEX idx_assoc_comm_created (created_at),
  INDEX idx_assoc_comm_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Verification: the table exists and is empty on a first run.
-- SHOW CREATE TABLE associate_communications;
-- SELECT COUNT(*) AS rows_logged FROM associate_communications;
