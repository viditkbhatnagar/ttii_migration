-- DATA fix (not schema): credit a third payment the LMS never recorded.
--
-- TTII 2026-09-01. NAJUMA N NIZAR (user 241) paid her Rs 4,000 August instalment
-- on 31 Aug 2026 at 6:16 pm as TWO separate UPI transfers of Rs 2,000, both
-- "Completed" to Teachers Training Institute of India:
--   * UPI transaction 110563886301  Rs 2,000
--   * UPI transaction 110563889040  Rs 2,000
--
-- This is why she looked unexplained earlier and was deliberately held back: her
-- only checkout orders are two failed attempts on 27 Aug 19:57, and there is no
-- order at all on 31 Aug. She did not use the portal checkout that day — she
-- paid by direct UPI, which creates no create_order row. So there is no order to
-- close here, only the ledger to correct.
--
-- Verified before writing: student_payments 487 is exactly that instalment
-- (user 241, course 16, Rs 4,000, due 2026-08-15, still Pending), and she has
-- ZERO payment_info rows, so she cannot be double-credited.
--
-- Recorded as two rows of Rs 2,000 rather than one of Rs 4,000, so the ledger
-- matches the two transfers she actually made. The ids are prefixed 'upi_' so it
-- is obvious these were reconciled by hand and are not Razorpay pay_* ids.
--
-- Her two failed 27 Aug orders are deliberately LEFT pending — they are genuine
-- failures, and the instalment update below is guarded on not-already-paid, so
-- even if one of them somehow settled later she cannot be credited twice.
--
-- Every statement is guarded, so this is safe to re-run.
USE lms_ttii;

-- 1. Audit trail for both transfers.
INSERT INTO payment_info
  (user_id, amount_paid, coupon_id, course_id, razorpay_payment_id, user_phone,
   user_email, razorpay_order_id, razorpay_signature, payment_date,
   created_at, updated_at, created_by, updated_by)
SELECT 241, 2000, NULL, 16, 'upi_110563886301', u.phone,
       COALESCE(NULLIF(u.user_email,''), u.email, ''), '', '',
       '2026-08-31 12:46:00', NOW(), NOW(), 241, 241
FROM users u
WHERE u.id = 241
  AND NOT EXISTS (SELECT 1 FROM payment_info p
                  WHERE p.razorpay_payment_id = 'upi_110563886301' AND p.deleted_at IS NULL);

INSERT INTO payment_info
  (user_id, amount_paid, coupon_id, course_id, razorpay_payment_id, user_phone,
   user_email, razorpay_order_id, razorpay_signature, payment_date,
   created_at, updated_at, created_by, updated_by)
SELECT 241, 2000, NULL, 16, 'upi_110563889040', u.phone,
       COALESCE(NULLIF(u.user_email,''), u.email, ''), '', '',
       '2026-08-31 12:46:00', NOW(), NOW(), 241, 241
FROM users u
WHERE u.id = 241
  AND NOT EXISTS (SELECT 1 FROM payment_info p
                  WHERE p.razorpay_payment_id = 'upi_110563889040' AND p.deleted_at IS NULL);

-- 2. Mark the instalment paid.
UPDATE student_payments
SET status = 'Paid', paid_date = '2026-08-31', payment_mode = 'Online',
    updated_by = 241, updated_at = NOW()
WHERE id = 487
  AND user_id = 241
  AND course_id = 16
  AND deleted_at IS NULL
  AND (status IS NULL OR LOWER(TRIM(status)) <> 'paid');

-- Verification:
-- SELECT id,status,paid_date,payment_mode FROM student_payments WHERE id=487;
-- SELECT razorpay_payment_id,amount_paid FROM payment_info WHERE user_id=241;

-- ROLLBACK:
-- DELETE FROM payment_info WHERE razorpay_payment_id IN ('upi_110563886301','upi_110563889040');
-- UPDATE student_payments SET status='Pending', paid_date=NULL WHERE id=487;
