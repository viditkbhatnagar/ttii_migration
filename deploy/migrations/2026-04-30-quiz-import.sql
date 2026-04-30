-- Legacy quiz import — Phase 4 of Naji's Content Library round.
-- The old PHP LMS stored quizzes as a peculiar shape:
--   * a row in `lesson_files` (lesson_type = 'other') acts as the quiz
--     container, supplying the title.
--   * each row in the `quiz` table is one question, joined by
--     `quiz.lesson_file_id` to that container, with `answers` as a JSON
--     array of options and `answer_id` as the 1-based index of the
--     correct option.
--
-- We mirror those into the new shape:
--   content_asset (asset_type = 'quiz', title from lesson_files)
--     └─ quiz_question rows (option_a..option_d, correct_answer A-D)
--
-- Idempotent — uses tags='legacy:quiz_lesson_file:<lesson_files.id>' on
-- the content_asset so re-running is a no-op.
--
-- Conservative on shape:
--   * Only questions with 2-4 options are imported
--   * Questions whose answer_id falls outside their option count are
--     dropped (data noise from the legacy form)
USE lms_ttii;

START TRANSACTION;

-- 1. Ensure a content_asset shell exists for every lesson_files row that
--    has at least one active quiz question. Tag with the legacy id so we
--    can find it again on re-runs and on the question import below.
INSERT INTO content_asset (
  title, summary, asset_type, subject_tag, lesson_tag, language, duration,
  provider, video_url, download_url, attachment, audio_file, thumbnail, tags,
  attempts_allowed, pass_marks, shuffle_questions,
  created_by, updated_by, created_at, updated_at, deleted_at
)
SELECT
  COALESCE(NULLIF(TRIM(lf.title), ''), CONCAT('Quiz #', lf.id)) AS title,
  NULL AS summary,
  'quiz' AS asset_type,
  s.title AS subject_tag,
  l.title AS lesson_tag,
  NULLIF(TRIM(IFNULL(lf.languages, '')), '') AS language,
  NULL AS duration,
  NULL AS provider,
  NULL AS video_url,
  NULL AS download_url,
  NULL AS attachment,
  NULL AS audio_file,
  CASE WHEN lf.thumbnail = '' THEN NULL ELSE LEFT(lf.thumbnail, 500) END AS thumbnail,
  CONCAT('legacy:quiz_lesson_file:', lf.id) AS tags,
  1 AS attempts_allowed,
  0 AS pass_marks,
  0 AS shuffle_questions,
  lf.created_by,
  lf.updated_by,
  COALESCE(lf.created_at, NOW()),
  COALESCE(lf.updated_at, NOW()),
  NULL AS deleted_at
FROM lesson_files lf
JOIN lesson l ON l.id = lf.lesson_id
LEFT JOIN subject s ON s.id = l.subject_id
WHERE lf.deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM quiz q WHERE q.lesson_file_id = lf.id AND q.deleted_at IS NULL
  )
  AND NOT EXISTS (
    SELECT 1 FROM content_asset ca
    WHERE ca.tags = CONCAT('legacy:quiz_lesson_file:', lf.id)
  );

-- 2. Insert one quiz_question per legacy quiz row, parsing the answers
--    JSON array. JSON_LENGTH gives the option count; JSON_UNQUOTE +
--    JSON_EXTRACT pulls each option safely (NULL when out of range).
INSERT INTO quiz_question (
  asset_id, question, option_a, option_b, option_c, option_d,
  correct_answer, sort_order, created_at, updated_at
)
SELECT
  ca.id AS asset_id,
  q.question,
  CASE WHEN JSON_LENGTH(q.answers) >= 1 THEN JSON_UNQUOTE(JSON_EXTRACT(q.answers, '$[0]')) END AS option_a,
  CASE WHEN JSON_LENGTH(q.answers) >= 2 THEN JSON_UNQUOTE(JSON_EXTRACT(q.answers, '$[1]')) END AS option_b,
  CASE WHEN JSON_LENGTH(q.answers) >= 3 THEN JSON_UNQUOTE(JSON_EXTRACT(q.answers, '$[2]')) END AS option_c,
  CASE WHEN JSON_LENGTH(q.answers) >= 4 THEN JSON_UNQUOTE(JSON_EXTRACT(q.answers, '$[3]')) END AS option_d,
  CASE
    WHEN q.answer_id = 1 THEN 'A'
    WHEN q.answer_id = 2 THEN 'B'
    WHEN q.answer_id = 3 THEN 'C'
    WHEN q.answer_id = 4 THEN 'D'
    ELSE 'A'
  END AS correct_answer,
  q.id AS sort_order,
  COALESCE(q.created_at, NOW()),
  COALESCE(q.updated_at, NOW())
FROM quiz q
JOIN content_asset ca
  ON ca.tags = CONCAT('legacy:quiz_lesson_file:', q.lesson_file_id)
 AND ca.asset_type = 'quiz'
 AND ca.deleted_at IS NULL
WHERE q.deleted_at IS NULL
  AND q.answers IS NOT NULL
  AND JSON_VALID(q.answers) = 1
  AND JSON_LENGTH(q.answers) BETWEEN 2 AND 4
  AND q.answer_id BETWEEN 1 AND 4
  AND q.answer_id <= JSON_LENGTH(q.answers)
  AND NOT EXISTS (
    SELECT 1 FROM quiz_question qq
    WHERE qq.asset_id = ca.id AND qq.sort_order = q.id
  );

-- 3. Sanity output.
SELECT '== AFTER IMPORT ==' AS section;
SELECT COUNT(*) AS quiz_assets_total FROM content_asset
  WHERE asset_type = 'quiz' AND deleted_at IS NULL;
SELECT COUNT(*) AS quiz_questions_total FROM quiz_question;
SELECT '== sample quiz with question count ==' AS section;
SELECT ca.id, ca.title, COUNT(qq.id) AS questions
FROM content_asset ca
LEFT JOIN quiz_question qq ON qq.asset_id = ca.id
WHERE ca.asset_type = 'quiz' AND ca.deleted_at IS NULL
GROUP BY ca.id, ca.title
ORDER BY questions DESC
LIMIT 5;

COMMIT;
