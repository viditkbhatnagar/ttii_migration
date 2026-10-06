-- DATA change (not schema): remove the student accounts that Google/Microsoft
-- sign-in created on its own.
--
-- APPLIED 2026-10-06 04:53:37 (DB clock) as root on 143.110.240.210, after
-- d907ce2f deployed. Live role-2 users 137 -> 131; 0 of the 6 left live; 0 open
-- sessions left for them.
--
-- Majida 2026-10-05: "Anyone who logs in using the Sign in with Google option
-- is directly appearing in the enrollments list, without any manual or
-- approved enrollment." d907ce2f stops SSO from creating accounts; this removes
-- the 6 it had already created that are still live (5 earlier ones were
-- already deleted by admins).
--
-- Verified read-only on production 2026-10-06 before writing this: each row is
-- role 2, empty password, application_id 0, student_id TT0000<id>; none has an
-- application, an enrol row, a cohort, a payment, a checkout order or a phone.
-- One shares its email with an instructor (role 3) account, which is a
-- separate row and is NOT touched.
--
-- Soft delete (deleted_at) + revoke their sessions. Every guard below must
-- still hold at apply time, so a row that has since been enrolled is skipped.
-- Safe to re-run. Reversible: see the rollback at the bottom.
USE lms_ttii;

SELECT id, student_id, name, user_email, created_at FROM users
WHERE id IN (330, 336, 342, 350, 351, 352) AND deleted_at IS NULL;

UPDATE users u
SET u.deleted_at = NOW(), u.updated_at = NOW()
WHERE u.id IN (330, 336, 342, 350, 351, 352)
  AND u.deleted_at IS NULL
  AND u.role_id = 2
  AND u.application_id = 0
  AND (u.password = '' OR u.password IS NULL)
  AND u.student_id = CONCAT('TT0000', u.id)
  AND NOT EXISTS (SELECT 1 FROM enrol e WHERE e.user_id = u.id)
  AND NOT EXISTS (SELECT 1 FROM cohort_students c WHERE c.user_id = u.id AND c.deleted_at IS NULL);

UPDATE auth_session SET revoked_at = NOW()
WHERE user_id IN (SELECT id FROM users WHERE id IN (330, 336, 342, 350, 351, 352) AND deleted_at IS NOT NULL)
  AND revoked_at IS NULL;

-- Verification: expect 0 live rows.
SELECT COUNT(*) AS still_live FROM users WHERE id IN (330, 336, 342, 350, 351, 352) AND deleted_at IS NULL;

-- ROLLBACK (restores the accounts; sessions stay revoked, the person signs in again):
-- UPDATE users SET deleted_at = NULL WHERE id IN (330, 336, 342, 350, 351, 352) AND deleted_at = '2026-10-06 04:53:37';
