-- TTII 2026-10-16: fee mapping fix for TIDMTT26100347 (MINI JOY, user 347) and
-- TIDMTT26100353 (Ansy Mol V K, user 353).
--
-- APPLIED 2026-10-16 via a guarded Prisma transaction (each statement asserted
-- exactly 1 row; any mismatch rolled everything back). This file is the
-- equivalent SQL, kept for the record. DO NOT re-run.
--
-- Cause: both applications were saved with course 23 (Certified Ai Educator -
-- Montessori) although the chosen intake, offering 27 "Certification in Ai for
-- Early Years Educator - October 2026", belongs to course 25 (Certification in
-- Ai - Early Childhood Educator). On approval they were enrolled into 23, paid
-- the full fee under 23, and were later added to 25 + cohort 106 by hand. These
-- were the ONLY two applications whose course differed from their offering's.
USE lms_ttii;

UPDATE student_payments SET course_id = 25, updated_at = NOW()
WHERE id IN (851, 860) AND user_id IN (347, 353) AND course_id = 23 AND deleted_at IS NULL;

UPDATE applications SET course_id = 25, updated_at = NOW()
WHERE id IN (310, 313) AND course_id = 23 AND offering_id = 27 AND student_id IN (347, 353);

UPDATE enrol SET deleted_at = NOW(), updated_at = NOW(), enrollment_status = 'Inactive'
WHERE id IN (245, 248) AND user_id IN (347, 353) AND course_id = 23 AND deleted_at IS NULL;

-- + application_events 'course_corrected' rows for applications 310 and 313.
-- Verified after: each student has ONE live enrolment (course 25), the Course
-- Fee Rs 3,539 Paid under course 25, cohort 106 unchanged, 16/16 lessons open.
