-- Naji 2026-06-23 — new course hierarchy structure. Courses can be either
-- Subject-wise (Course→Subject→Lesson→Content, the existing default) or
-- Lesson-wise (Course→Lesson→Content, no subjects — for short certification
-- programs). Add the discriminator column the admin course form writes and the
-- student/admin rendering reads. Default 1 retro-classifies EVERY existing
-- course as Subject-wise → zero behavioral change. Kept SEPARATE from
-- course_type (which already means cohort vs self-study).
--
-- Apply on prod (PHP/DB droplet, root creds) BEFORE deploying the code:
--   ssh root@143.110.240.210 'bash -s' <<'EOF'
--   PASS=$(tr -d '[:space:]' < /etc/cyberpanel/mysqlPassword)
--   TMPCNF=$(mktemp); chmod 600 "$TMPCNF"
--   printf '[client]\nuser=root\npassword=%s\n' "$PASS" > "$TMPCNF"
--   mysql --defaults-file="$TMPCNF" lms_ttii < /path/2026-06-23-course-structure-type.sql
--   rm -f "$TMPCNF"
--   EOF

ALTER TABLE course
  ADD COLUMN IF NOT EXISTS structure_type TINYINT NOT NULL DEFAULT 1 AFTER course_type;
