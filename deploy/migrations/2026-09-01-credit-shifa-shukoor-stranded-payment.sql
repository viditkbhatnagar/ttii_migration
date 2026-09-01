-- DATA fix (not schema): credit one payment the LMS never recorded.
--
-- TTII 2026-09-01. Shifa Shukoor (user 235) paid Rs 5,000 on 28 Aug 2026 at
-- 6:17 pm IST by UPI via Google Pay. Her Razorpay checkout order was created at
-- 12:47:12 UTC = 6:17 pm IST — the same minute — but /payment/complete_order was
-- never called, so nothing was written and her instalment still reads Pending.
-- Root cause and permanent fix: 445a49f2 (payments are now reconciled from the
-- Razorpay webhook instead of depending on the student's browser returning).
--
-- Evidence, all four independently corroborating:
--   * Google Pay receipt: Rs 5,000, "Completed", 28 Aug 2026 6:17 pm,
--     UPI transaction ID 624022541114, paid to Razorpay's VPA
--     teacherstrainin236633.rzp@rxairtel
--   * create_order id 85 (order_TVC99hfRPMJxgr): user 235, course 18,
--     amount 5000, notes {"sp_id":466}, created 2026-08-28 12:47:12, still 'pending'
--   * The receipt names "PG Diploma in Montessori Teacher Training" = course 18
--   * student_payments 466: user 235, course 18, Rs 5,000, due 2026-08-10, Pending
--
-- Verified before writing: Shifa has ZERO payment_info rows, so there is no
-- possibility of double-crediting her.
--
-- razorpay_payment_id carries the UPI reference, deliberately prefixed so it is
-- obvious this was reconciled by hand and is not a Razorpay pay_* id. Flipping
-- create_order 85 to 'completed' also protects her: if the real Razorpay event
-- ever arrives, reconcileWebhookOrderPayment refuses any order that is not
-- 'pending', so she cannot be credited twice.
--
-- Every statement is guarded, so this is safe to re-run.
USE lms_ttii;

-- 1. The audit trail for the money.
INSERT INTO payment_info
  (user_id, amount_paid, coupon_id, course_id, razorpay_payment_id, user_phone,
   user_email, razorpay_order_id, razorpay_signature, payment_date,
   created_at, updated_at, created_by, updated_by)
SELECT 235, 5000, NULL, 18, 'upi_624022541114', u.phone,
       COALESCE(NULLIF(u.user_email,''), u.email, ''), 'order_TVC99hfRPMJxgr', '',
       '2026-08-28 12:47:12', NOW(), NOW(), 235, 235
FROM users u
WHERE u.id = 235
  AND NOT EXISTS (
    SELECT 1 FROM payment_info p
    WHERE p.razorpay_order_id = 'order_TVC99hfRPMJxgr' AND p.deleted_at IS NULL
  );

-- 2. Mark the instalment paid — same shape completeOrder would have written.
UPDATE student_payments
SET status = 'Paid', paid_date = '2026-08-28', payment_mode = 'Online',
    updated_by = 235, updated_at = NOW()
WHERE id = 466
  AND user_id = 235
  AND course_id = 18
  AND deleted_at IS NULL
  AND (status IS NULL OR LOWER(TRIM(status)) <> 'paid');

-- 3. Close the order, so a later webhook cannot credit this a second time.
UPDATE create_order
SET order_status = 'completed', updated_by = 235, updated_at = NOW()
WHERE order_id = 'order_TVC99hfRPMJxgr' AND order_status = 'pending';

-- Verification:
-- SELECT id,status,paid_date,payment_mode FROM student_payments WHERE id=466;
-- SELECT order_status FROM create_order WHERE order_id='order_TVC99hfRPMJxgr';
-- SELECT razorpay_payment_id,amount_paid,payment_date FROM payment_info WHERE user_id=235;

-- ROLLBACK:
-- DELETE FROM payment_info WHERE razorpay_order_id='order_TVC99hfRPMJxgr' AND razorpay_payment_id='upi_624022541114';
-- UPDATE student_payments SET status='Pending', paid_date=NULL WHERE id=466;
-- UPDATE create_order SET order_status='pending' WHERE order_id='order_TVC99hfRPMJxgr';
