-- 2026-04-26: Application form expansion per TTII LMS Correction_new_corrections doc.
-- Additive only — safe on prod while old PHP LMS keeps running.

ALTER TABLE `applications`
  ADD COLUMN `offering_id` INT NULL AFTER `converted_at`,
  ADD COLUMN `certificate_combination_id` INT NULL AFTER `offering_id`,
  ADD COLUMN `lead_source` VARCHAR(120) NULL AFTER `certificate_combination_id`,
  ADD COLUMN `current_occupation` VARCHAR(120) NULL AFTER `lead_source`,
  ADD COLUMN `application_discount` DECIMAL(10,2) NULL AFTER `current_occupation`,
  ADD COLUMN `application_gst_percent` DECIMAL(5,2) NULL AFTER `application_discount`,
  ADD COLUMN `application_final_fee` DECIMAL(10,2) NULL AFTER `application_gst_percent`,
  ADD INDEX `idx_applications_offering` (`offering_id`),
  ADD INDEX `idx_applications_combo` (`certificate_combination_id`);

CREATE TABLE IF NOT EXISTS `application_education_pathway` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `application_id` INT NOT NULL,
  `qualification` VARCHAR(255) NOT NULL,
  `specialization` VARCHAR(255) NULL,
  `institution` VARCHAR(255) NULL,
  `year_passed` VARCHAR(10) NULL,
  `marks` VARCHAR(50) NULL,
  `board` VARCHAR(255) NULL,
  `position` INT NULL DEFAULT 0,
  `created_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` INT NULL,
  `updated_by` INT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_aep_application` (`application_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
