-- Lead → Enrolment workflow (Naji's 8-step plan, locked 2026-05-05).
-- Additive only. Reuses the existing `applications` table.
--
-- Apply manually via SSH after the GHA deploy:
--   ssh root@68.183.94.1 'mysql -h 10.122.0.2 -u lms_ttii \
--     -p"$(awk -F= "/^MYSQL_PASSWORD=/{print \$2}" /opt/ttii-lms/.env)" \
--     lms_ttii < deploy/migrations/2026-05-05-lead-to-enrolment.sql'

ALTER TABLE applications
  ADD COLUMN stage VARCHAR(40) DEFAULT 'lead',
  ADD COLUMN payment_plan LONGTEXT NULL,
  ADD COLUMN payment_link_url VARCHAR(500) NULL,
  ADD COLUMN payment_link_id VARCHAR(120) NULL,
  ADD COLUMN payment_link_expires_at DATETIME NULL,
  ADD COLUMN payment_status VARCHAR(40) NULL,
  ADD COLUMN payment_method VARCHAR(40) NULL,
  ADD COLUMN payment_marked_paid_at DATETIME NULL,
  ADD COLUMN payment_marked_paid_by INT NULL,
  ADD COLUMN signature_data LONGTEXT NULL,
  ADD COLUMN counsellor_approved_at DATETIME NULL,
  ADD COLUMN counsellor_approved_by INT NULL,
  ADD COLUMN admin_approved_at DATETIME NULL,
  ADD COLUMN admin_approved_by INT NULL,
  ADD COLUMN rejected_at DATETIME NULL,
  ADD COLUMN rejected_by INT NULL,
  ADD COLUMN rejection_reason TEXT NULL,
  ADD INDEX idx_applications_stage (stage);

-- Magic-link tokens for the public application form.
CREATE TABLE IF NOT EXISTS application_form_tokens (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  application_id INT UNSIGNED NOT NULL,
  token VARCHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  draft_data LONGTEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_aft_application (application_id),
  INDEX idx_aft_token (token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Backfill stage on existing rows. Anything previously marked `converted`
-- is now `enrolled`; `rejected` stays. Everything else is treated as a
-- legacy lead so the new pipeline doesn't show stale data as Approved.
UPDATE applications SET stage = 'enrolled' WHERE status = 'converted' AND stage IS NULL;
UPDATE applications SET stage = 'rejected' WHERE status = 'rejected' AND stage IS NULL;
UPDATE applications SET stage = 'lead' WHERE stage IS NULL;
