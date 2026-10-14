-- TTII 2026-10-14: remove leftover self-created student accounts flagged by TTII
-- (WhatsApp, 14 Oct: "these students also logged in directly using sign in with
-- mail. Kindly remove").
--
-- Why the 2026-10-06 cleanup missed them: it matched student_id = 'TT0000<id>',
-- but 300/303/305 had since been renumbered to TTS00xx. The fix itself holds:
-- 0 SSO_REGISTER_SUCCESS events after 2026-10-06.
--
--   277  "$name" / email "$code$phone"  created 2026-05-21 with unfilled
--        template placeholders (no audit trail; likely a test call to the
--        mobile register endpoint)
--   300  Indraja Indhu (Google, 2026-06-24). DUPLICATE: her real enrolled
--        account is 236, which has user_email = indhu4267@gmail.com and a
--        password, so her password and Google sign-in both keep working.
--   303  Appu Appu (Google, 2026-06-30)
--   305  Shyni Rajesh (Google, 2026-07-01). The course/city shown in the list
--        came from lead TTII260107 ("ARCHANA RAJESH") sharing the email; that
--        lead is NOT touched.
--
-- NOT removed: 304 Anusree Sabu, also Google-created on 2026-07-01, but a real
-- student (enrol, 4 cohort rows, payments, assignment submissions).
--
-- Verified 2026-10-14: none of 277/300/303/305 has a row in any user_id table
-- (enrol, cohort_students, payment_info, student_payments, create_order,
-- exam_attempt, assignment_submissions, ...). Soft delete only, reversible
-- with deleted_at = NULL.
USE lms_ttii;

SELECT id, student_id, name, email, user_email, created_at FROM users
WHERE id IN (277, 300, 303, 305) AND deleted_at IS NULL;

UPDATE users u
SET u.deleted_at = NOW(), u.updated_at = NOW()
WHERE u.id IN (277, 300, 303, 305)
  AND u.deleted_at IS NULL
  AND u.role_id = 2
  AND (u.application_id = 0 OR u.application_id IS NULL)
  AND NOT EXISTS (SELECT 1 FROM enrol e WHERE e.user_id = u.id)
  AND NOT EXISTS (SELECT 1 FROM cohort_students c WHERE c.user_id = u.id)
  AND NOT EXISTS (SELECT 1 FROM payment_info p WHERE p.user_id = u.id)
  AND NOT EXISTS (SELECT 1 FROM student_payments s WHERE s.user_id = u.id)
  AND NOT EXISTS (SELECT 1 FROM create_order o WHERE o.user_id = u.id)
  AND NOT EXISTS (SELECT 1 FROM exam_attempt a WHERE a.user_id = u.id);

UPDATE auth_session SET revoked_at = NOW()
WHERE user_id IN (SELECT id FROM users WHERE id IN (277, 300, 303, 305) AND deleted_at IS NOT NULL)
  AND revoked_at IS NULL;

SELECT id, name, deleted_at FROM users WHERE id IN (236, 277, 300, 303, 304, 305);
SELECT COUNT(*) AS live_students FROM users WHERE role_id = 2 AND deleted_at IS NULL;
