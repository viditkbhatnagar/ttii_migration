-- Credential Manager (Naji 2026-11-14 Lovable export: Ready to Issue, Issued,
-- Delivery Tracking, Scan History, Reports, Settings, public verification,
-- learner/centre certificate pages, per-user permissions).
--
-- Additive only: NEW tables + seed rows + 5 permission slugs. No ALTER of any
-- existing table, no foreign keys (this schema has none), indexes instead.
-- Safe to re-run (CREATE TABLE IF NOT EXISTS, INSERT IGNORE / ON DUPLICATE).
--
-- Design notes:
--  * Statuses that depend on dates (overdue parcels, "ready waiting") are
--    DERIVED on read, never stored.
--  * Learner eligibility is COMPUTED from LMS data (exam results, fees,
--    progress, assignments, attendance); only holds, overrides, the learner's
--    name/address confirmation and history are stored.
--  * Issued documents are immutable rows: a correction is a NEW version row,
--    a duplicate/print/download is an EVENT, revoke/restore flips status.
--  * PDFs are stored PRIVATE (storage_key + sha256), served through the API.
--  * Settings that are versioned or list-like (completion rules, templates,
--    signatories, grading schemes, hold reasons, couriers, delivery
--    settings) share credential_config: category + JSON payload + version.
--
-- Until this runs, the Credential Manager endpoints answer with an empty
-- result and a "not set up yet" message instead of a 500.
USE lms_ttii;

-- Per-offering switch: does TTII issue the credentials for this intake?
CREATE TABLE IF NOT EXISTS credential_offering_settings (
  offering_id INT NOT NULL,
  issued_by_ttii TINYINT(1) NOT NULL DEFAULT 0,
  default_delivery_mode VARCHAR(30) NOT NULL DEFAULT 'digital',
  level VARCHAR(40) NULL,
  updated_by INT NULL,
  updated_at DATETIME NULL,
  PRIMARY KEY (offering_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Settings rows: category IN ('rule','template','signatory','grading',
-- 'hold_reason','courier','delivery'). data = JSON text (LONGTEXT, not JSON:
-- MariaDB's JSON alias adds a json_valid CHECK that has bitten this schema).
CREATE TABLE IF NOT EXISTS credential_config (
  id INT NOT NULL AUTO_INCREMENT,
  category VARCHAR(30) NOT NULL,
  name VARCHAR(200) NOT NULL DEFAULT '',
  offering_id INT NULL,
  version INT NOT NULL DEFAULT 1,
  effective_from DATE NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  data LONGTEXT NULL,
  created_by INT NULL,
  updated_by INT NULL,
  deleted_by INT NULL,
  created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  INDEX idx_credential_config_cat (category, deleted_at),
  INDEX idx_credential_config_offering (offering_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- One number series per document type. Allocation is an atomic
-- UPDATE ... next_number = next_number + 1 inside the issuing transaction.
CREATE TABLE IF NOT EXISTS credential_number_series (
  id INT NOT NULL AUTO_INCREMENT,
  doc_type VARCHAR(40) NOT NULL,
  prefix VARCHAR(60) NOT NULL,
  year INT NOT NULL,
  padding INT NOT NULL DEFAULT 6,
  next_number INT NOT NULL DEFAULT 1,
  reset_yearly TINYINT(1) NOT NULL DEFAULT 1,
  updated_by INT NULL,
  updated_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_credential_series_doc (doc_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Append-only settings audit (before/after snapshots).
CREATE TABLE IF NOT EXISTS credential_settings_audit (
  id INT NOT NULL AUTO_INCREMENT,
  actor_user_id INT NULL,
  action VARCHAR(30) NOT NULL,
  entity VARCHAR(40) NOT NULL,
  entity_id INT NULL,
  before_json LONGTEXT NULL,
  after_json LONGTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_credential_settings_audit_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Per-enrolment stored state (enrol_id = enrol.id): learner-confirmed printed
-- name + address, and the manual override.
CREATE TABLE IF NOT EXISTS credential_learner_state (
  enrol_id INT NOT NULL,
  user_id INT NOT NULL,
  offering_id INT NULL,
  printed_name VARCHAR(250) NULL,
  address TEXT NULL,
  confirmed_at DATETIME NULL,
  override_reason TEXT NULL,
  override_by INT NULL,
  override_at DATETIME NULL,
  updated_at DATETIME NULL,
  PRIMARY KEY (enrol_id),
  INDEX idx_credential_learner_state_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS credential_holds (
  id INT NOT NULL AUTO_INCREMENT,
  enrol_id INT NOT NULL,
  reason VARCHAR(200) NOT NULL,
  remarks TEXT NULL,
  placed_by INT NULL,
  placed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  released_by INT NULL,
  released_at DATETIME NULL,
  PRIMARY KEY (id),
  INDEX idx_credential_holds_enrol (enrol_id, released_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Eligibility history: Place hold, Release hold, Override, Name and address confirmed…
CREATE TABLE IF NOT EXISTS credential_eligibility_events (
  id INT NOT NULL AUTO_INCREMENT,
  enrol_id INT NOT NULL,
  action VARCHAR(60) NOT NULL,
  reason TEXT NULL,
  actor_user_id INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_credential_elig_events_enrol (enrol_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Issued documents. One row per VERSION. status: valid | revoked | superseded.
-- doc_type: certificate | marksheet | provisional | transcript.
CREATE TABLE IF NOT EXISTS credential_documents (
  id INT NOT NULL AUTO_INCREMENT,
  enrol_id INT NOT NULL,
  user_id INT NOT NULL,
  offering_id INT NULL,
  course_id INT NULL,
  centre_id INT NULL,
  doc_type VARCHAR(30) NOT NULL,
  version INT NOT NULL DEFAULT 1,
  document_no VARCHAR(80) NOT NULL,
  verification_id VARCHAR(40) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'valid',
  issue_date DATE NOT NULL,
  printed_name VARCHAR(250) NOT NULL,
  snapshot LONGTEXT NOT NULL,
  storage_key VARCHAR(500) NULL,
  sha256 CHAR(64) NULL,
  replaces_id INT NULL,
  replaced_by_id INT NULL,
  revoked_at DATETIME NULL,
  revoke_reason TEXT NULL,
  scan_count INT NOT NULL DEFAULT 0,
  last_scanned_at DATETIME NULL,
  issued_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_credential_doc_no (document_no),
  UNIQUE KEY uq_credential_verification (verification_id),
  UNIQUE KEY uq_credential_doc_version (enrol_id, doc_type, version),
  INDEX idx_credential_docs_user (user_id),
  INDEX idx_credential_docs_status (status, issue_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Issue | Download | Print | Duplicate | Revoke | Restore | Resend | Correction
CREATE TABLE IF NOT EXISTS credential_document_events (
  id INT NOT NULL AUTO_INCREMENT,
  document_id INT NOT NULL,
  action VARCHAR(30) NOT NULL,
  copy_type VARCHAR(20) NULL,
  reason TEXT NULL,
  before_status VARCHAR(20) NULL,
  after_status VARCHAR(20) NULL,
  actor_user_id INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_credential_doc_events_doc (document_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Dispatch batches: type to_centre | to_learner | office_collection.
CREATE TABLE IF NOT EXISTS credential_dispatch_batches (
  id INT NOT NULL AUTO_INCREMENT,
  batch_no VARCHAR(40) NOT NULL,
  type VARCHAR(30) NOT NULL,
  centre_id INT NULL,
  enrol_id INT NULL,
  address TEXT NULL,
  courier_id INT NULL,
  awb_no VARCHAR(80) NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'packed',
  packing_list_key VARCHAR(500) NULL,
  packed_by INT NULL,
  dispatched_at DATETIME NULL,
  acknowledged_at DATETIME NULL,
  acknowledged_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_credential_batch_no (batch_no),
  INDEX idx_credential_batches_centre (centre_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Physical items (one per valid non-digital document).
CREATE TABLE IF NOT EXISTS credential_delivery_items (
  id INT NOT NULL AUTO_INCREMENT,
  document_id INT NOT NULL,
  enrol_id INT NOT NULL,
  batch_id INT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'print_queued',
  paper_serial VARCHAR(60) NULL,
  delivered_at DATETIME NULL,
  received_by_name VARCHAR(200) NULL,
  proof_key VARCHAR(500) NULL,
  remarks TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_credential_paper_serial (paper_serial),
  INDEX idx_credential_items_doc (document_id),
  INDEX idx_credential_items_batch (batch_id),
  INDEX idx_credential_items_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Digital availability per document version.
CREATE TABLE IF NOT EXISTS credential_digital_deliveries (
  document_id INT NOT NULL,
  available_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  email_status VARCHAR(20) NOT NULL DEFAULT 'not_sent',
  email_sent_at DATETIME NULL,
  first_download_at DATETIME NULL,
  PRIMARY KEY (document_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS credential_delivery_events (
  id INT NOT NULL AUTO_INCREMENT,
  entity_type VARCHAR(20) NOT NULL,
  entity_id INT NOT NULL,
  action VARCHAR(60) NOT NULL,
  before_status VARCHAR(30) NULL,
  after_status VARCHAR(30) NULL,
  reason TEXT NULL,
  actor_user_id INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_credential_delivery_events (entity_type, entity_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Every public verification lookup (QR or manual), found or not.
CREATE TABLE IF NOT EXISTS credential_scans (
  id INT NOT NULL AUTO_INCREMENT,
  verification_id VARCHAR(80) NOT NULL,
  document_id INT NULL,
  status VARCHAR(20) NOT NULL,
  method VARCHAR(10) NOT NULL,
  ip VARCHAR(64) NULL,
  user_agent VARCHAR(300) NULL,
  device VARCHAR(40) NULL,
  city VARCHAR(120) NULL,
  country VARCHAR(80) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_credential_scans_doc (document_id, created_at),
  INDEX idx_credential_scans_ip (ip, created_at),
  INDEX idx_credential_scans_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Alerts: type revoked_scan | superseded_scan | multiple_countries | not_found_attempts.
-- alert_key UNIQUE dedupes; a review is final (note required).
CREATE TABLE IF NOT EXISTS credential_scan_alerts (
  id INT NOT NULL AUTO_INCREMENT,
  alert_key VARCHAR(160) NOT NULL,
  type VARCHAR(30) NOT NULL,
  document_id INT NULL,
  scan_id INT NULL,
  details TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_by INT NULL,
  reviewed_at DATETIME NULL,
  note TEXT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_credential_alert_key (alert_key),
  INDEX idx_credential_alerts_open (reviewed_at, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- In-app notices (learner / centre / credential admins / management), deduped.
CREATE TABLE IF NOT EXISTS credential_notifications (
  id INT NOT NULL AUTO_INCREMENT,
  dedupe_key VARCHAR(200) NOT NULL,
  audience VARCHAR(30) NOT NULL,
  recipient_user_id INT NULL,
  centre_id INT NULL,
  title VARCHAR(200) NOT NULL,
  body TEXT NULL,
  link VARCHAR(300) NULL,
  read_at DATETIME NULL,
  email_status VARCHAR(20) NOT NULL DEFAULT 'not_sent',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_credential_notice_key (dedupe_key),
  INDEX idx_credential_notice_recipient (recipient_user_id, read_at),
  INDEX idx_credential_notice_audience (audience, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Seeds (Naji's defaults) ──────────────────────────────────────────────
INSERT IGNORE INTO credential_number_series (doc_type, prefix, year, padding, next_number, reset_yearly) VALUES
  ('certificate', 'TTII/CERT', 2026, 6, 1, 1),
  ('marksheet', 'TTII/MARK', 2026, 6, 1, 1),
  ('transcript', 'TTII/TRANS', 2026, 6, 1, 1),
  ('provisional', 'TTII/PROV', 2026, 6, 1, 1);

INSERT INTO credential_config (category, name, data)
SELECT 'hold_reason', r.name, NULL FROM (
  SELECT 'Fee dues' AS name UNION ALL SELECT 'Documents pending' UNION ALL SELECT 'Malpractice' UNION ALL SELECT 'Name verification'
) r
WHERE NOT EXISTS (SELECT 1 FROM credential_config c WHERE c.category = 'hold_reason' AND c.name = r.name AND c.deleted_at IS NULL);

INSERT INTO credential_config (category, name, data)
SELECT 'grading', 'TTII 10-point scale',
  '{"scaleMax":10,"passMinimum":40,"passRule":"every_mandatory_subject","cgpaMethod":"credit_weighted","offeringIds":[],"bands":[{"min":90,"max":100,"grade":"O","points":10},{"min":80,"max":89.99,"grade":"A+","points":9},{"min":70,"max":79.99,"grade":"A","points":8},{"min":60,"max":69.99,"grade":"B+","points":7},{"min":50,"max":59.99,"grade":"B","points":6},{"min":40,"max":49.99,"grade":"C","points":5},{"min":0,"max":39.99,"grade":"F","points":0}]}'
WHERE NOT EXISTS (SELECT 1 FROM credential_config c WHERE c.category = 'grading' AND c.deleted_at IS NULL);

INSERT INTO credential_config (category, name, data)
SELECT 'delivery', 'Delivery settings', '{"overdueDays":10,"readyDays":3,"centreModes":{}}'
WHERE NOT EXISTS (SELECT 1 FROM credential_config c WHERE c.category = 'delivery' AND c.deleted_at IS NULL);

-- ── Permissions (Naji's five per-user switches) ──────────────────────────
INSERT INTO permission (slug, title, description, category)
VALUES
  ('credentials.access',   'Credential Manager access',      'Open the Credential Manager, issue, print, deliver and track credentials', 'Credential Manager'),
  ('credentials.revoke',   'Revoke / restore credentials',   'Revoke an issued credential or restore a revoked one',                    'Credential Manager'),
  ('credentials.override', 'Override eligibility',           'Mark a learner Ready despite unmet criteria (reason required)',           'Credential Manager'),
  ('credentials.settings', 'Credential settings',            'Edit completion rules, templates, number series, signatories, grading',   'Credential Manager'),
  ('credentials.reports',  'Credential reports & audit',     'View credential reports and the audit log',                               'Credential Manager')
ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description), category = VALUES(category);

-- Backfill like 2026-04-30: every live Admin (role 8) gets the five, so nobody
-- loses access at deploy time; a Super Admin (role 1) always passes anyway.
-- Grants can then be removed per user in User Management.
INSERT IGNORE INTO user_permission (user_id, permission_id, granted_by)
SELECT u.id, p.id, 0
FROM users u
CROSS JOIN permission p
WHERE u.role_id IN (1, 8)
  AND u.deleted_at IS NULL
  AND p.category = 'Credential Manager';
