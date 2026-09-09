-- Re-file the 8 Child Psychology items orphaned by this morning's renames.
--
-- Risha 2026-09-09 renamed two chapters in subject 27 while investigating, and
-- because Content Library rows were attached by NAME rather than by FK, every
-- row still carrying the OLD name came loose and stopped rendering anywhere —
-- for her AND for students. That is her "the whole content is getting
-- rearranged or misplaced".
--
-- The mapping is EVIDENCED, not guessed. Two rows she created this morning are
-- FK-linked and still carry the pre-rename name, which pins each old name to a
-- specific chapter:
--   content_asset 435 -> lesson_id 41, lesson_tag 'STAGES OF CHILD DEVELOPMENT'
--                        (lesson 41 now reads 'ASPECTS OF CHILD DEVELOPMENT')
--   content_asset 437 -> lesson_id 42, lesson_tag 'CHARACTERISTICS OF NEWLY BORN INFANT'
--                        (lesson 42 now reads 'NEW BORN')
-- created_at 07:54 and 07:57 today, i.e. before the rename and hours before the
-- backfill, so the tag records the chapter name at the moment the row was made.
--
-- Re-filing restores exactly the state that existed before this morning's
-- renames. It also immunises these rows: once held by lesson_id they are
-- resolved by FK, so the duplicate name that lesson 41 now shares with lesson 43
-- can no longer serve them under both chapters.
--
-- Scoped to explicit ids so nothing else can be caught. Safe to re-run.
--
-- NOT INCLUDED — no evidence exists for these, so a human must place them. They
-- are now listed on the Subject page in a red "not attached to any chapter"
-- panel instead of being invisible:
--   323  Foundation To Information Technology / 'Microsoft Powerpoint'
--   321  Parent Teacher Relationship          / 'Heredity & Environment'
--   360  Teacher Education and Practice       / 'LESSON PLANNING'
-- The 5 AMBIGUOUS rows tagged 'ASPECTS OF CHILD DEVELOPMENT' are also left
-- alone: lessons 41 and 43 both carry that name, so choosing one would remove
-- the content from the other for students. Rename one chapter first — the app
-- now refuses duplicate chapter names and adopts content on rename.
USE lms_ttii;

-- 'STAGES OF CHILD DEVELOPMENT' -> lesson 41
UPDATE content_asset
SET lesson_id = 41, updated_at = NOW()
WHERE id IN (46, 80, 89, 267)
  AND deleted_at IS NULL
  AND lesson_id IS NULL
  AND subject_tag = 'Child Psychology'
  AND lesson_tag = 'STAGES OF CHILD DEVELOPMENT';

-- 'CHARACTERISTICS OF NEWLY BORN INFANT' -> lesson 42
UPDATE content_asset
SET lesson_id = 42, updated_at = NOW()
WHERE id IN (48, 81, 94, 268)
  AND deleted_at IS NULL
  AND lesson_id IS NULL
  AND subject_tag = 'Child Psychology'
  AND lesson_tag = 'CHARACTERISTICS OF NEWLY BORN INFANT';

-- Verify: both must report 4, and no Child Psychology orphans should remain.
-- SELECT lesson_id, COUNT(*) FROM content_asset
--   WHERE id IN (46,80,89,267,48,81,94,268) AND deleted_at IS NULL GROUP BY lesson_id;

-- ROLLBACK:
-- UPDATE content_asset SET lesson_id = NULL WHERE id IN (46,80,89,267,48,81,94,268);
