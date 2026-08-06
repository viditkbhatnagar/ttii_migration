-- Risha UAT 2026-08-06 — repair the seeded Practice Exam questions (exam id 8).
--
-- WHY
-- ---
-- prisma/seed-practice-exam.ts created the permanent Practice Exam
-- (exam_code TTIIPRACTICE01) on 2026-08-01 with two defects in its ten
-- questions. Both were dormant then and both bite now:
--
--   1. correct_answers was written 1-BASED — every row stored '["1"]' meaning
--      "the first option". That column is 0-BASED everywhere else in this
--      codebase: the CSV importer maps letter A to 0 (charCodeAt(0) - 65 in
--      QuestionBankPage, feeding operations-service bulkAddQuestions, whose
--      type reads "indexes into options"), QuestionBankPage and
--      ViewSubjectQuestionsPage both persist the render index, and the API
--      parity fixture seeds ["0"]. The exam player was ALSO submitting a
--      1-based index, which accidentally cancelled the seed's error out — the
--      player has now been fixed to submit 0-based, so this seed is the odd
--      one out. assessment-service grades by exact string equality, so every
--      practice answer would be marked WRONG.
--
--   2. q_type was 1 (= Descriptive) on all ten, even though each carries four
--      options — they are MCQs. Nothing read q_type when the exam was seeded;
--      everything does now. The player renders a textarea for q_type 1 and the
--      server routes the answer to manual grading (exam_descriptive_grades)
--      instead of scoring it, so the practice exam would show ten essay boxes
--      and score nothing.
--
-- The seed script itself has been fixed, but that does NOT help production: it
-- is a create-if-absent guard, not an upsert. It returns as soon as an exam
-- with this exam_code exists, so re-running it neither repairs the existing
-- questions nor duplicates them — it simply prints "Nothing to do". The
-- already-seeded rows can only be repaired here.
--
-- SAFETY
-- ------
-- * Scoped to exactly the ten seeded rows: a question_bank row must BOTH be
--   attached to the TTIIPRACTICE01 exam through exam_questions AND carry one of
--   the ten seeded titles verbatim. No other question_bank row is reachable.
-- * Statement 1 only touches rows still holding the bad PAIR (q_type = 1 with
--   correct_answers = '["1"]'). A question an admin has since re-authored in
--   the wizard always saves q_type = 0, so this can never rewrite a legitimate
--   0-based answer that happens to be ["1"] (i.e. option B is correct).
-- * Statement 2 only touches rows statement 1 has already rebased to '["0"]'.
--   The two are therefore self-sequencing: running them out of order, or
--   running only one of them, is a no-op rather than a half-repair.
-- * Both are idempotent — a second run matches zero rows and changes nothing
--   (updated_at is bumped only on rows actually rewritten).
-- * No row is inserted or deleted. No schema change. Safe on a live DB.
--
-- HOW TO RUN (on the droplet, against the production MariaDB)
--   mysql -h <host> -u <admin_user> -p"$PASS" ttii_lms < fix-practice-exam-questions.sql
--
-- Verify afterwards with the two queries at the foot of this file: the listing
-- must show ten rows, all q_type = 0 and all correct_answers = '["0"]', and the
-- leftover count must be 0.

-- Resolve the practice exam once. If it is missing (or soft-deleted) this stays
-- NULL, both statements match zero rows, and the file is a harmless no-op.
SET @practice_exam_id = (
  SELECT `id` FROM `exam`
  WHERE `exam_code` = 'TTIIPRACTICE01' AND `deleted_at` IS NULL
  ORDER BY `id`
  LIMIT 1
);

-- 1) Rebase the correct answer from 1-based to 0-based. All ten seeded
--    questions list the correct option FIRST, so 1-based "1" becomes 0-based
--    "0" for every one of them — there is no per-row arithmetic to get wrong.
UPDATE `question_bank`
SET `correct_answers` = '["0"]',
    `updated_at` = UTC_TIMESTAMP()
WHERE `deleted_at` IS NULL
  AND `q_type` = 1
  AND `correct_answers` = '["1"]'
  AND `id` IN (
    SELECT `question_id` FROM `exam_questions`
    WHERE `exam_id` = @practice_exam_id AND `deleted_at` IS NULL
  )
  AND `title` IN (
    '<p>Which button do you use to move to the next question during an exam?</p>',
    '<p>What happens if you close the exam window before submitting?</p>',
    '<p>How many answers can you select for a single-choice question?</p>',
    '<p>Where can you see how much time is left in a timed exam?</p>',
    '<p>What should you do once you have answered every question?</p>',
    '<p>Can you return to a previous question before submitting?</p>',
    '<p>Is this practice exam graded or recorded against your results?</p>',
    '<p>How many times may you take this practice exam?</p>',
    '<p>Who should you contact if the exam screen does not load?</p>',
    '<p>Before a real exam begins, what is the best preparation?</p>'
  );

-- 2) Relabel them as MCQ. Gated on the rebased answer from statement 1 (so the
--    order above is enforced by the data itself) and on the row actually having
--    options, so a genuinely descriptive question can never be flipped to MCQ.
UPDATE `question_bank`
SET `q_type` = 0,
    `updated_at` = UTC_TIMESTAMP()
WHERE `deleted_at` IS NULL
  AND `q_type` = 1
  AND `correct_answers` = '["0"]'
  AND `number_of_options` > 0
  AND `id` IN (
    SELECT `question_id` FROM `exam_questions`
    WHERE `exam_id` = @practice_exam_id AND `deleted_at` IS NULL
  )
  AND `title` IN (
    '<p>Which button do you use to move to the next question during an exam?</p>',
    '<p>What happens if you close the exam window before submitting?</p>',
    '<p>How many answers can you select for a single-choice question?</p>',
    '<p>Where can you see how much time is left in a timed exam?</p>',
    '<p>What should you do once you have answered every question?</p>',
    '<p>Can you return to a previous question before submitting?</p>',
    '<p>Is this practice exam graded or recorded against your results?</p>',
    '<p>How many times may you take this practice exam?</p>',
    '<p>Who should you contact if the exam screen does not load?</p>',
    '<p>Before a real exam begins, what is the best preparation?</p>'
  );

-- VERIFY (run these after; they read only).
--
-- a) The ten practice questions. Expect 10 rows, every q_type = 0 and every
--    correct_answers = '["0"]', number_of_options = 4.
--
--   SELECT qb.`id`, qb.`q_type`, qb.`number_of_options`, qb.`correct_answers`,
--          LEFT(qb.`title`, 70) AS title
--   FROM `question_bank` qb
--   JOIN `exam_questions` eq ON eq.`question_id` = qb.`id` AND eq.`deleted_at` IS NULL
--   JOIN `exam` e           ON e.`id` = eq.`exam_id` AND e.`deleted_at` IS NULL
--   WHERE e.`exam_code` = 'TTIIPRACTICE01' AND qb.`deleted_at` IS NULL
--   ORDER BY eq.`question_no`;
--
-- b) Leftovers. Expect 0. A non-zero result means the repair did not apply —
--    most likely the exam row is missing/soft-deleted or a title was edited in
--    the wizard, in which case fix that row by hand from the admin question
--    bank rather than widening this file.
--
--   SELECT COUNT(*) AS still_broken
--   FROM `question_bank` qb
--   JOIN `exam_questions` eq ON eq.`question_id` = qb.`id` AND eq.`deleted_at` IS NULL
--   JOIN `exam` e           ON e.`id` = eq.`exam_id` AND e.`deleted_at` IS NULL
--   WHERE e.`exam_code` = 'TTIIPRACTICE01' AND qb.`deleted_at` IS NULL
--     AND (qb.`q_type` = 1 OR qb.`correct_answers` = '["1"]');
--
-- c) Sanity: the exam row itself is still the practice exam.
--
--   SELECT `id`, `exam_code`, `is_practice`, `status` FROM `exam`
--   WHERE `exam_code` = 'TTIIPRACTICE01' AND `deleted_at` IS NULL;
