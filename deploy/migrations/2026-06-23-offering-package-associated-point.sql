-- Naji 2026-06-23 — Certificate packages can carry an "Associated Point"
-- value. Each time a counsellor enrols a student into that package, the points
-- are credited to the counsellor's "Points" target (counsellor_target.type=4);
-- a refunded/cancelled enrolment drops them again. Add the column the Add/Edit
-- Certificate Package dialog writes and the target maths reads. Existing rows
-- default to 0 (no points), so this is a no-op for current data.
--
-- Apply on prod (PHP/DB droplet, root creds) BEFORE deploying the code:
--   ssh root@143.110.240.210 'bash -s' <<'EOF'
--   PASS=$(tr -d '[:space:]' < /etc/cyberpanel/mysqlPassword)
--   TMPCNF=$(mktemp); chmod 600 "$TMPCNF"
--   printf '[client]\nuser=root\npassword=%s\n' "$PASS" > "$TMPCNF"
--   mysql --defaults-file="$TMPCNF" lms_ttii < /path/2026-06-23-offering-package-associated-point.sql
--   rm -f "$TMPCNF"
--   EOF

ALTER TABLE offering_certificate_packages
  ADD COLUMN associated_point INT NOT NULL DEFAULT 0 AFTER gst_percent;
