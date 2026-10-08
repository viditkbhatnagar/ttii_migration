-- TTII 2026-10-08 — "Shifa Shukoor paid only 26000 but in LMS it shows 31000."
--
-- Razorpay delivers order.paid and payment.captured for the same payment at the
-- same moment. Both webhook deliveries wrote a payment_info row before either
-- committed, so three checkout payments were credited twice:
--
--   ids 41 / 42  user 235 SHIFA SHUKOOR       (TTS0058)  Rs.5,000  2026-09-30  Installment 4
--   ids 45 / 46  user 313 SOPHIA MARY JOSEPH  (TTS0088)  Rs.5,000  2026-10-03  Installment 2 of 8
--   ids 47 / 48  user 313 SOPHIA MARY JOSEPH  (TTS0088)  Rs.5,000  2026-10-03  Installment 3 of 8
--
-- Each pair shares razorpay_payment_id, razorpay_order_id, user, course, amount
-- and payment_date to the second. The writer is fixed in the same commit; this
-- soft-deletes the later row of each pair (42, 46, 48) and keeps the first.
-- student_payments is untouched — it was always right (one Paid row each).
--
-- Guarded: a row is removed only while its earlier twin is still live and
-- identical, so re-running is a no-op and nothing else can be caught.

UPDATE payment_info AS dup
JOIN payment_info AS keep
  ON  keep.razorpay_payment_id = dup.razorpay_payment_id
  AND keep.razorpay_order_id   = dup.razorpay_order_id
  AND keep.user_id             = dup.user_id
  AND keep.course_id           = dup.course_id
  AND keep.amount_paid         = dup.amount_paid
  AND keep.id < dup.id
  AND keep.deleted_at IS NULL
SET dup.deleted_at = '2026-10-08 06:00:00',
    dup.updated_at = '2026-10-08 06:00:00'
WHERE dup.id IN (42, 46, 48)
  AND dup.deleted_at IS NULL
  AND keep.id IN (41, 45, 47);

-- Expect 3 rows affected. Verify:
--   SELECT razorpay_order_id, COUNT(*) FROM payment_info
--   WHERE deleted_at IS NULL AND razorpay_order_id <> ''
--   GROUP BY razorpay_order_id HAVING COUNT(*) > 1;   -- expect 0 rows
