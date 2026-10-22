-- Centres module v2 (Naji 2026-10-22 Lovable export: Centre Onboarding,
-- Affiliation & Agreements, Centre profile with KYC + bank details,
-- Centre documents).
--
-- Additive only: six NEW tables, no ALTER of any existing table, no foreign
-- keys (this schema has none anywhere), indexes instead. Safe to re-run.
--
-- Why a separate centre_kyc table instead of new columns on `centres`:
--   * most code reads `centres` without an explicit select, so new columns on
--     that model would 500 every centre query until this DDL ran;
--   * listCentres/getCentre return whole `centres` rows to every admin-surface
--     role (counsellors included). Aadhaar / PAN / bank details live apart and
--     are served only by the Admin/Subadmin-only centre profile endpoint.
--
-- Location (country / state / district NAMES) reuses the existing Text columns
-- centres.country_id / state_id / district_id; designation reuses
-- centres.contact_person_designation; the registration document reuses
-- centres.registraion_certificate (sic). No new columns are needed for those.
--
-- Statuses that depend on dates (agreement Active / Pending Renewal / Expired,
-- affiliation fee Due Soon / Overdue) are DERIVED when read, never stored.
--
-- Until this runs, the new /admin/centres/* endpoints answer with an empty
-- list and a "not set up yet" message instead of a 500.
USE lms_ttii;

-- 1:1 with centres (centre_id = centres.id). Identity, tax and bank details.
CREATE TABLE IF NOT EXISTS centre_kyc (
  centre_id INT NOT NULL,
  legal_entity_name VARCHAR(250) NULL,
  entity_type VARCHAR(40) NULL,
  city VARCHAR(120) NULL,
  pincode VARCHAR(12) NULL,
  gstin VARCHAR(20) NULL,
  pan VARCHAR(12) NULL,
  id_number VARCHAR(40) NULL,
  id_doc VARCHAR(500) NULL,
  pan_doc VARCHAR(500) NULL,
  bank_account_name VARCHAR(150) NULL,
  bank_account_number VARCHAR(30) NULL,
  bank_ifsc VARCHAR(15) NULL,
  bank_name VARCHAR(150) NULL,
  bank_branch VARCHAR(150) NULL,
  logo VARCHAR(500) NULL,
  created_by INT NULL,
  updated_by INT NULL,
  created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  PRIMARY KEY (centre_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Extra documents uploaded on the centre profile's Documents tab.
CREATE TABLE IF NOT EXISTS centre_documents (
  id INT NOT NULL AUTO_INCREMENT,
  centre_id INT NOT NULL,
  title VARCHAR(250) NOT NULL,
  doc_type VARCHAR(60) NOT NULL DEFAULT 'Uploaded Document',
  file_url VARCHAR(500) NOT NULL,
  created_by INT NULL,
  deleted_by INT NULL,
  created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  INDEX idx_centre_documents_centre (centre_id, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- A prospective centre, from first contact to onboarded.
-- stage: lead | under_review | agreement_pending | certificate_pending | onboarded | rejected
--   ("Form Sent" is a lead with link_sent_at set — a display label, not a stage.)
-- link_token_hash: sha256 hex of the public form token; the raw token only
--   ever exists in the emailed / copied link. UNIQUE so a token maps to one lead.
-- form_json: the submitted centre application (LONGTEXT, not JSON — MariaDB's
--   JSON alias adds a json_valid CHECK that has bitten this schema before).
-- verification_json: {"entity":"verified","address":"flagged",...}
-- centre_code: reserved at approval; UNIQUE so two leads can never hold the
--   same code (NULLs never clash).
CREATE TABLE IF NOT EXISTS centre_onboarding (
  id INT NOT NULL AUTO_INCREMENT,
  ref_no VARCHAR(20) NULL,
  centre_name VARCHAR(250) NOT NULL,
  contact_name VARCHAR(150) NOT NULL,
  mobile VARCHAR(20) NOT NULL DEFAULT '',
  email VARCHAR(150) NOT NULL,
  country VARCHAR(80) NULL,
  state VARCHAR(80) NULL,
  district VARCHAR(80) NULL,
  source VARCHAR(40) NULL,
  assigned_to INT NULL,
  notes TEXT NULL,
  stage VARCHAR(30) NOT NULL DEFAULT 'lead',
  stage_since DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  link_token_hash CHAR(64) NULL,
  link_sent_at DATETIME NULL,
  link_expired TINYINT(1) NOT NULL DEFAULT 0,
  form_json LONGTEXT NULL,
  form_submitted_at DATETIME NULL,
  verification_json TEXT NULL,
  remarks TEXT NULL,
  centre_code VARCHAR(30) NULL,
  centre_id INT NULL,
  reject_reason TEXT NULL,
  rejected_at DATETIME NULL,
  rejected_by INT NULL,
  created_by INT NULL,
  updated_by INT NULL,
  deleted_by INT NULL,
  created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_centre_onboarding_ref (ref_no),
  UNIQUE KEY uq_centre_onboarding_token (link_token_hash),
  UNIQUE KEY uq_centre_onboarding_code (centre_code),
  INDEX idx_centre_onboarding_stage (stage, deleted_at),
  INDEX idx_centre_onboarding_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Activity timeline of an onboarding record (who did what, when).
CREATE TABLE IF NOT EXISTS centre_onboarding_events (
  id INT NOT NULL AUTO_INCREMENT,
  onboarding_id INT NOT NULL,
  event_type VARCHAR(40) NOT NULL,
  message VARCHAR(500) NOT NULL,
  actor_user_id INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_centre_onboarding_events_onb (onboarding_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Signed affiliation agreement. centre_id is NULL while the centre is still in
-- onboarding (set when it is onboarded); onboarding_id is NULL for agreements
-- recorded directly against an existing centre.
-- fee_amount / fee_paid RECORD the affiliation fee; nothing is charged here.
CREATE TABLE IF NOT EXISTS centre_agreements (
  id INT NOT NULL AUTO_INCREMENT,
  agreement_no VARCHAR(30) NOT NULL,
  centre_id INT NULL,
  onboarding_id INT NULL,
  effective_date DATE NOT NULL,
  term_years INT NOT NULL,
  expiry_date DATE NOT NULL,
  signed_on DATE NULL,
  ttii_signatory VARCHAR(150) NULL,
  centre_signatory VARCHAR(150) NULL,
  file_url VARCHAR(500) NOT NULL,
  fee_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  fee_paid TINYINT(1) NOT NULL DEFAULT 0,
  fee_paid_on DATE NULL,
  notes TEXT NULL,
  created_by INT NULL,
  updated_by INT NULL,
  deleted_by INT NULL,
  created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_centre_agreements_no (agreement_no),
  INDEX idx_centre_agreements_centre (centre_id, deleted_at),
  INDEX idx_centre_agreements_onb (onboarding_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Affiliation certificate issued to a centre. status: valid | revoked
-- ("Expired" is derived from valid_to).
CREATE TABLE IF NOT EXISTS centre_affiliation_certificates (
  id INT NOT NULL AUTO_INCREMENT,
  certificate_no VARCHAR(30) NOT NULL,
  centre_id INT NULL,
  agreement_id INT NULL,
  onboarding_id INT NULL,
  valid_from DATE NOT NULL,
  valid_to DATE NOT NULL,
  file_url VARCHAR(500) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'valid',
  revoke_reason TEXT NULL,
  revoked_at DATETIME NULL,
  revoked_by INT NULL,
  created_by INT NULL,
  created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_centre_aff_cert_no (certificate_no),
  INDEX idx_centre_aff_cert_centre (centre_id, deleted_at),
  INDEX idx_centre_aff_cert_agreement (agreement_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
