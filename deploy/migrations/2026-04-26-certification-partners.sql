-- 2026-04-26: Certification Partners + Certificate Combinations
--
-- Per Naji's TTII LMS Correction_new_corrections doc, two new modules under
-- Admin → Course:
--   • Certification Partners — institutions that co-issue certificates
--   • Certificate Combination — which partners issue what for a Program × Course
--
-- Three new tables, all additive. Safe to run on the live DB while both
-- old PHP LMS and new Node.js LMS keep running.

CREATE TABLE IF NOT EXISTS `certification_partners` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `partner_code` VARCHAR(40) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `short_name` VARCHAR(100) NULL,
  `country` VARCHAR(100) NULL,
  `description` TEXT NULL,
  `logo` VARCHAR(500) NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'active',
  `created_by` INT NULL,
  `updated_by` INT NULL,
  `deleted_by` INT NULL,
  `created_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_certification_partners_code` (`partner_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `certificate_combinations` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `program_id` INT NULL,
  `course_id` INT NULL,
  `combination_code` VARCHAR(40) NOT NULL,
  `gst_applicable` TINYINT(1) NOT NULL DEFAULT 1,
  `gst_percent` DECIMAL(5,2) NULL DEFAULT 18.00,
  `status` VARCHAR(20) NOT NULL DEFAULT 'active',
  `created_by` INT NULL,
  `updated_by` INT NULL,
  `deleted_by` INT NULL,
  `created_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_certificate_combinations_code` (`combination_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `certificate_combination_partners` (
  `combination_id` INT NOT NULL,
  `partner_id` INT NOT NULL,
  `created_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` INT NULL,
  PRIMARY KEY (`combination_id`, `partner_id`),
  KEY `idx_ccp_combination` (`combination_id`),
  KEY `idx_ccp_partner` (`partner_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
