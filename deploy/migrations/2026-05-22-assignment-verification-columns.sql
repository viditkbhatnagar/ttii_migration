-- Naji UAT 2026-05-22 — three-state Assignment Evaluation workflow.
-- Adds verification columns to assignment_submissions so admins can
-- approve instructor evaluations before they publish to students.
--
-- Apply on prod once:
--   mysql --defaults-file=/root/.my.cnf -u root lms_ttii < add-assignment-verification-columns.sql

ALTER TABLE assignment_submissions
  ADD COLUMN verified_at DATETIME NULL DEFAULT NULL AFTER remarks,
  ADD COLUMN verified_by INT NULL DEFAULT NULL AFTER verified_at;
