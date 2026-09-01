-- DATA fix (not schema): credit a second payment the LMS never recorded.
--
-- TTII 2026-09-01. Naji confirmed with the students: "Athira and Najuma paid fee
-- yesterday. Thasmiya tried but couldn't." Yesterday = 31 Aug 2026.
--
-- ATHIRA C KURUP (user 224) matches that exactly:
--   * create_order 89 (order_TWKOQuuH2kkAPe): user 224, course 18, Rs 3,000,
--     notes {"sp_id":410}, raised 2026-08-31 09:30:13 UTC = 31 Aug 3:00 pm IST,
--     still 'pending'
--   * student_payments 410: user 224, course 18, Rs 3,000, due 2026-08-14, Pending
--   * She has NO payment_info row for this order, so she cannot be double-credited
--
-- Same root cause as Shifa Shukoor (9dc5391f): recording depended on the
-- student's browser calling /payment/complete_order after checkout, and it never
-- did. Permanent fix is 445a49f2.
--
-- Deliberately NOT covered here:
--   * NAJUMA N NIZAR — Naji says she also paid yesterday, but she has NO payment
--     of any kind on record and her only attempts are two orders on 27 Aug
--     19:57. The data contradicts "yesterday", so she is left alone until her
--     receipt or the Razorpay report confirms the date and amount.
--   * THASMIYA K V — "tried but couldn't", i.e. no money moved. Her two pending
--     orders on 29 Aug are correctly left unpaid. This is also the proof that a
--     pending order does NOT by itself mean a payment was taken.
--
-- Basis: the institute's own confirmation plus an exactly matching order. Unlike
-- Shifa's, this one has no bank receipt attached, so if Razorpay later shows the
-- attempt did not capture, roll it back with the block at the end.
--
-- APPLIED to production 2026-09-01 and verified: student_payments 410 now Paid
-- (31 Aug, Online), create_order 89 closed to 'completed', payment_info row
-- written. Her Sep/Oct/Nov instalments correctly remain pending.
--
-- Every statement is guarded, so this is safe to re-run.
USE lms_ttii;

-- 1. The audit trail for the money.
INSERT INTO payment_info
  (user_id, amount_paid, coupon_id, course_id, razorpay_payment_id, user_phone,
   user_email, razorpay_order_id, razorpay_signature, payment_date,
   created_at, updated_at, created_by, updated_by)
SELECT 224, 3000, NULL, 18, 'manual_recon_TWKOQuuH2kkAPe', u.phone,
       COALESCE(NULLIF(u.user_email,''), u.email, ''), 'order_TWKOQuuH2kkAPe', '',
       '2026-08-31 09:30:13', NOW(), NOW(), 224, 224
FROM users u
WHERE u.id = 224
  AND NOT EXISTS (
    SELECT 1 FROM payment_info p
    WHERE p.razorpay_order_id = 'order_TWKOQuuH2kkAPe' AND p.deleted_at IS NULL
  );

-- 2. Mark the instalment paid — same shape completeOrder would have written.
UPDATE student_payments
SET status = 'Paid', paid_date = '2026-08-31', payment_mode = 'Online',
    updated_by = 224, updated_at = NOW()
WHERE id = 410
  AND user_id = 224
  AND course_id = 18
  AND deleted_at IS NULL
  AND (status IS NULL OR LOWER(TRIM(status)) <> 'paid');

-- 3. Close the order, so a later webhook cannot credit this a second time.
UPDATE create_order
SET order_status = 'completed', updated_by = 224, updated_at = NOW()
WHERE order_id = 'order_TWKOQuuH2kkAPe' AND order_status = 'pending';

-- Verification:
-- SELECT id,status,paid_date,payment_mode FROM student_payments WHERE id=410;
-- SELECT order_status FROM create_order WHERE order_id='order_TWKOQuuH2kkAPe';

-- ROLLBACK:
-- DELETE FROM payment_info WHERE razorpay_order_id='order_TWKOQuuH2kkAPe' AND razorpay_payment_id='manual_recon_TWKOQuuH2kkAPe';
-- UPDATE student_payments SET status='Pending', paid_date=NULL WHERE id=410;
-- UPDATE create_order SET order_status='pending' WHERE order_id='order_TWKOQuuH2kkAPe';
