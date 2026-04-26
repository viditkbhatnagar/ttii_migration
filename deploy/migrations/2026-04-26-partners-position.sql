-- 2026-04-26: Custom display order for Certification Partners
-- Naji wants partners to render in TTII → MSU → KHDA → AGI order across the
-- listing table, the multi-select picker on Certificate Combination, and the
-- Partners badge column on the Combinations table. Adding a position INT and
-- backfilling Naji's preferred order; new partners default to position=0
-- (which the admin can edit on create/edit to reorder).

ALTER TABLE `certification_partners`
  ADD COLUMN `position` INT NOT NULL DEFAULT 0 AFTER `status`,
  ADD INDEX `idx_certification_partners_position` (`position`);

-- Backfill the 4 existing rows to Naji's order (id values from prod query)
UPDATE `certification_partners` SET `position` = 10 WHERE `partner_code` = 'TTII';
UPDATE `certification_partners` SET `position` = 20 WHERE `partner_code` = 'MSU';
UPDATE `certification_partners` SET `position` = 30 WHERE `partner_code` = 'KHDA';
UPDATE `certification_partners` SET `position` = 40 WHERE `partner_code` = 'AGI';
