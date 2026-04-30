-- Lesson files type backfill (Naji 2026-04-30 — "the updated feature in
-- different type of content, not visible in this section").
--
-- Legacy lesson_files used lesson_type = 'video' or 'other'. The new
-- admin UI's +Audio / +Article / +Document / +Quiz buttons store the
-- correct lesson_type ('audio' / 'article' / 'document' / 'quiz') going
-- forward, but everything created on the old PHP LMS sits as 'other' so
-- the Files-for-lesson list can't tell them apart.
--
-- Same mapping rules as the Content Library import:
--   audio_file populated   → 'audio'
--   attachment populated   → 'document'
--   video_url populated    → 'video'
--   has rows in `quiz`     → 'quiz'
--   else                   → 'article'
USE lms_ttii;

UPDATE lesson_files lf
SET lf.lesson_type = CASE
  WHEN lf.audio_file IS NOT NULL AND lf.audio_file <> '' THEN 'audio'
  WHEN lf.attachment IS NOT NULL AND lf.attachment <> '' THEN 'document'
  WHEN lf.video_url IS NOT NULL AND lf.video_url <> '' THEN 'video'
  WHEN EXISTS (SELECT 1 FROM quiz q WHERE q.lesson_file_id = lf.id AND q.deleted_at IS NULL) THEN 'quiz'
  ELSE 'article'
END,
lf.updated_at = NOW()
WHERE lf.lesson_type = 'other' AND lf.deleted_at IS NULL;

SELECT '== AFTER ==' AS x;
SELECT lesson_type, COUNT(*) AS n FROM lesson_files WHERE deleted_at IS NULL GROUP BY lesson_type ORDER BY lesson_type;
