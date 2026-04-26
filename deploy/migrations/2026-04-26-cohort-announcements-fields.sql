-- 2026-04-26: Cohort Announcements module per Naji's correction doc
-- Adds audience targeting, delivery channels, attachment, draft/sent status.

ALTER TABLE `cohort_announcements`
  ADD COLUMN `audience_type` VARCHAR(20) NULL DEFAULT 'all' AFTER `description`,
  ADD COLUMN `audience_user_ids` TEXT NULL AFTER `audience_type`,
  ADD COLUMN `delivery_channels` VARCHAR(50) NULL DEFAULT 'in_app' AFTER `audience_user_ids`,
  ADD COLUMN `attachment_url` VARCHAR(500) NULL AFTER `delivery_channels`,
  ADD COLUMN `status` VARCHAR(20) NULL DEFAULT 'draft' AFTER `attachment_url`,
  ADD COLUMN `sent_at` DATETIME NULL AFTER `status`,
  ADD INDEX `idx_cohort_announcements_cohort` (`cohort_id`),
  ADD INDEX `idx_cohort_announcements_status` (`status`);
