-- Risha UAT 2026-05-30 — Subject Detail page: drag-to-sort content within a
-- lesson. content_asset rows linked to a lesson (via lesson_id) need a
-- per-lesson display order; add a sort_order column the reorder endpoint
-- writes to. Existing rows default to 0 and fall back to id ordering.
--
-- Apply on prod (PHP droplet, root creds):
--   ssh root@143.110.240.210 'bash -s' <<'EOF'
--   PASS=$(tr -d '[:space:]' < /etc/cyberpanel/mysqlPassword)
--   TMPCNF=$(mktemp); chmod 600 "$TMPCNF"
--   printf '[client]\nuser=root\npassword=%s\n' "$PASS" > "$TMPCNF"
--   mysql --defaults-file="$TMPCNF" lms_ttii < /path/2026-05-30-content-asset-sort-order.sql
--   rm -f "$TMPCNF"
--   EOF

ALTER TABLE content_asset
  ADD COLUMN sort_order INT NULL DEFAULT 0 AFTER lesson_id;
