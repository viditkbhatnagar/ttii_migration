-- Content Library — one-shot import of legacy lesson_files into content_asset.
-- The new Content Library reads from content_asset (Phase J), but existing
-- course lesson assets all live in lesson_files. This script copies every
-- active lesson_files row into content_asset so the Library reflects the
-- real state of the production catalogue. lesson_files is left intact —
-- the Lessons UI keeps reading from there. Going forward, new assets are
-- created directly in content_asset.
--
-- Mapping rules:
--   asset_type:
--     lesson_files.lesson_type='video'        → 'video'
--     audio_file populated                    → 'audio'
--     attachment populated                    → 'document'
--     video_url populated (non-video type)    → 'video'
--     otherwise                               → 'article'
--   subject_tag = parent lesson's subject title (via lesson.subject_id)
--   lesson_tag  = parent lesson's title
--   tags        = 'legacy:lesson_files:<lesson_files.id>' so we can audit
--                 and re-run idempotently.
--
-- Idempotent: skips rows already imported (matched by the legacy tag).
USE lms_ttii;

START TRANSACTION;

INSERT INTO content_asset (
  title, summary, asset_type, subject_tag, lesson_tag, language, duration, provider,
  video_url, download_url, attachment, audio_file, thumbnail, tags,
  created_by, updated_by, created_at, updated_at, deleted_at
)
SELECT
  COALESCE(NULLIF(TRIM(lf.title), ''), 'Untitled') AS title,
  lf.summary,
  CASE
    WHEN lf.lesson_type = 'video' THEN 'video'
    WHEN lf.audio_file IS NOT NULL AND lf.audio_file <> '' THEN 'audio'
    WHEN lf.attachment IS NOT NULL AND lf.attachment <> '' THEN 'document'
    WHEN lf.video_url IS NOT NULL AND lf.video_url <> '' THEN 'video'
    ELSE 'article'
  END AS asset_type,
  s.title AS subject_tag,
  l.title AS lesson_tag,
  NULLIF(TRIM(IFNULL(lf.languages, '')), '') AS language,
  NULLIF(lf.duration, '') AS duration,
  CASE
    WHEN lf.lesson_provider IS NULL OR lf.lesson_provider = '' THEN NULL
    ELSE LEFT(lf.lesson_provider, 30)
  END AS provider,
  NULLIF(lf.video_url, '') AS video_url,
  NULLIF(lf.download_url, '') AS download_url,
  NULLIF(lf.attachment, '') AS attachment,
  NULLIF(lf.audio_file, '') AS audio_file,
  CASE
    WHEN lf.thumbnail IS NULL OR lf.thumbnail = '' THEN NULL
    ELSE LEFT(lf.thumbnail, 500)
  END AS thumbnail,
  CONCAT('legacy:lesson_files:', lf.id) AS tags,
  lf.created_by,
  lf.updated_by,
  COALESCE(lf.created_at, NOW()),
  COALESCE(lf.updated_at, NOW()),
  NULL AS deleted_at
FROM lesson_files lf
LEFT JOIN lesson l ON l.id = lf.lesson_id
LEFT JOIN subject s ON s.id = l.subject_id
WHERE lf.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM content_asset ca
    WHERE ca.tags = CONCAT('legacy:lesson_files:', lf.id)
  );

SELECT '== AFTER IMPORT ==' AS section;
SELECT COUNT(*) AS active_content_assets FROM content_asset WHERE deleted_at IS NULL;
SELECT asset_type, COUNT(*) AS rows_count
FROM content_asset
WHERE deleted_at IS NULL AND tags LIKE 'legacy:lesson_files:%'
GROUP BY asset_type
ORDER BY rows_count DESC;

COMMIT;
