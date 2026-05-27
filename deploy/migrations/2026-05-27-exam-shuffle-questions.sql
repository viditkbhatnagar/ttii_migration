-- Risha UAT 2026-05-27 — per-exam "shuffle questions" toggle.
-- When ON, exam_questions are randomized per student at attempt-start;
-- the order is then locked into exam_attempt.question_id so resuming
-- shows the same order to the same student.
--
-- Apply on prod (PHP droplet, root creds):
--   ssh root@143.110.240.210
--   PASS=$(tr -d '[:space:]' < /etc/cyberpanel/mysqlPassword)
--   TMPCNF=$(mktemp); chmod 600 "$TMPCNF"
--   printf '[client]\nuser=root\npassword=%s\n' "$PASS" > "$TMPCNF"
--   mysql --defaults-file="$TMPCNF" lms_ttii < 2026-05-27-exam-shuffle-questions.sql
--   rm -f "$TMPCNF"

ALTER TABLE exam
  ADD COLUMN shuffle_questions TINYINT(1) NOT NULL DEFAULT 0 AFTER publish_result;
