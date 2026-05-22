-- Naji UAT 2026-05-22 — three-state Assignment Evaluation workflow.
-- Adds verification columns to assignment_submissions so admins can
-- approve instructor evaluations before they publish to students.
--
-- Apply on prod (PHP droplet, root creds):
--   ssh root@143.110.240.210
--   PASS=$(tr -d '[:space:]' < /etc/cyberpanel/mysqlPassword)
--   TMPCNF=$(mktemp); chmod 600 "$TMPCNF"
--   printf '[client]\nuser=root\npassword=%s\n' "$PASS" > "$TMPCNF"
--   mysql --defaults-file="$TMPCNF" lms_ttii < 2026-05-22-assignment-verification-columns.sql
--   rm -f "$TMPCNF"

ALTER TABLE assignment_submissions
  ADD COLUMN verified_at DATETIME NULL DEFAULT NULL AFTER remarks,
  ADD COLUMN verified_by INT NULL DEFAULT NULL AFTER verified_at;

-- Backfill: any submission that already had marks before the column existed
-- was treated as "Result Published" in the old logic. Preserve that state
-- so coordinators don't have to re-verify 90+ historical rows. New
-- evaluations after this point follow the three-state flow naturally
-- (evaluateSubmission clears verified_at, admin clicks Verify to set it).
UPDATE assignment_submissions
SET verified_at = COALESCE(updated_at, created_at, NOW())
WHERE deleted_at IS NULL
  AND marks IS NOT NULL
  AND TRIM(marks) != ''
  AND verified_at IS NULL;
