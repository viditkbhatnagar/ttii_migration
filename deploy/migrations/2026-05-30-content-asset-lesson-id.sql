-- Risha UAT 2026-05-30 — link a Content Library asset to a specific lesson.
-- The Content Library form previously only had free-text subject_tag /
-- lesson_tag fields, so there was no way to actually associate an article
-- (or any asset) with a real lesson. This adds a nullable lesson_id FK-ish
-- column so the admin can pick a lesson from a searchable dropdown; the
-- denormalized subject_tag / lesson_tag labels are still kept for display,
-- filtering, and back-compat with legacy rows.
--
-- Apply on prod (PHP droplet, root creds):
--   ssh root@143.110.240.210
--   PASS=$(tr -d '[:space:]' < /etc/cyberpanel/mysqlPassword)
--   TMPCNF=$(mktemp); chmod 600 "$TMPCNF"
--   printf '[client]\nuser=root\npassword=%s\n' "$PASS" > "$TMPCNF"
--   mysql --defaults-file="$TMPCNF" lms_ttii < 2026-05-30-content-asset-lesson-id.sql
--   rm -f "$TMPCNF"

ALTER TABLE content_asset
  ADD COLUMN lesson_id INT NULL AFTER lesson_tag,
  ADD INDEX idx_content_asset_lesson_id (lesson_id);
