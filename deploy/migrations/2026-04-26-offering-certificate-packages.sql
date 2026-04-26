-- 2026-04-26: Certificate Package sub-section on Course Offerings
-- Per Naji's correction doc, an offering can have N certificate packages,
-- each pointing at a certificate_combination with its own pricing tier.

CREATE TABLE IF NOT EXISTS `offering_certificate_packages` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `offering_id` INT NOT NULL,
  `combination_id` INT NOT NULL,
  `fee_category` VARCHAR(10) NOT NULL DEFAULT 'paid',
  `base_fee` DECIMAL(10,2) NULL,
  `discount` DECIMAL(10,2) NULL,
  `offered_fee` DECIMAL(10,2) NULL,
  `position` INT NOT NULL DEFAULT 0,
  `created_by` INT NULL,
  `updated_by` INT NULL,
  `created_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ocp_offering` (`offering_id`),
  KEY `idx_ocp_combination` (`combination_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
