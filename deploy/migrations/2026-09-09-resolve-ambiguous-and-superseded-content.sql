-- Resolve the two items left for a human by the 2026-09-09 backfill.
--
-- ── PART 1: Child Psychology (subject 27) — the duplicate chapter name ───────
--
-- Lessons 41 and 43 are BOTH named "ASPECTS OF CHILD DEVELOPMENT", which left 5
-- Content Library rows unplaceable: choosing a chapter by name would have put
-- them in the wrong one and taken them away from the right one for students.
--
-- The Lesson Builder content settles which chapter is which. It does NOT match
-- the current names:
--   lesson 41 holds: "Development Stages", "HOW ENVIRONMENT SHAPES THE MIND OF
--                     A CHILD", "ASSESSMENT LESSON 2"      -> STAGES OF CHILD DEVELOPMENT
--   lesson 43 holds: "Part 1", "Part 2", "How AI Companions and Smart Devices
--                     Are Shaping Young Minds", "ASSESSMENT LESSON 4"
--                                                          -> ASPECTS OF CHILD DEVELOPMENT
--
-- Corroborated three ways: (a) the 5 unplaced rows tagged "ASPECTS OF CHILD
-- DEVELOPMENT" are Part 1, Part 2, How AI Companions, ASSESSMENT LESSON 4 x2 —
-- an exact match for lesson 43's Lesson Builder items; (b) the rows already
-- FK-linked to lesson 41 are all tagged "STAGES OF CHILD DEVELOPMENT" and match
-- lesson 41's items exactly; (c) content_asset 435, created 2026-09-09 07:54
-- while FK-linked to lesson 41, still carries lesson_tag "STAGES OF CHILD
-- DEVELOPMENT".
--
-- So lesson 41 is the one that was misnamed this morning, NOT lesson 43. It is
-- renamed back to its real name, and the 5 rows go to lesson 43 where their
-- content belongs. Renaming 43 instead would have filed all 5 into lesson 41 —
-- the wrong chapter — and left 43 with no Library content at all.
--
-- Renaming 41 by SQL is safe here: every Library row of lesson 41 is already
-- FK-linked (the backfill did that), so nothing detaches. The 5 rows below are
-- assigned by explicit id, so the rename cannot affect them either.
--
-- ── PART 2: Teacher Education and Practice (subject 46) — superseded row ─────
--
-- Risha: "Why it showing like this? We have already done all of this in old
-- LMS... do we need to manually add them back?" No — it is already there.
--
-- content_asset 360 "Chapter 5", tagged "LESSON PLANNING" (a chapter name that
-- no longer exists after the subject was reorganised into 5 thematic chapters),
-- was created 2026-07-16 17:13. Seventy minutes later, at 18:23, the same
-- chapter was added again correctly as content_asset 370 "Chapter 5 - Lesson
-- Planning", FK-linked to lesson 361 "Instructional Design and Practical
-- Training", where it still sits and where students see it.
--
-- The two rows point at different upload URLs but the FILES ARE BYTE-IDENTICAL
-- (sha256 4a89821db507bbd87904f59dcc269780f741fb5dab57e7ef4d153bffb6687e9e,
-- 2,889,663 bytes each) — the same PDF uploaded twice. Row 360 is therefore a
-- superseded first attempt, not lost content, and is soft-deleted. Nothing is
-- removed from any student: row 360 is attached to no chapter, so it has never
-- been served.
--
-- Soft delete only — fully reversible. Safe to re-run.
USE lms_ttii;

-- PART 1a — restore lesson 41's real name.
UPDATE lesson
SET title = 'STAGES OF CHILD DEVELOPMENT', updated_at = NOW()
WHERE id = 41
  AND subject_id = 27
  AND deleted_at IS NULL
  AND title = 'ASPECTS OF CHILD DEVELOPMENT';

-- PART 1b — file the 5 previously-ambiguous rows onto lesson 43.
UPDATE content_asset
SET lesson_id = 43, updated_at = NOW()
WHERE id IN (49, 82, 83, 110, 269)
  AND deleted_at IS NULL
  AND lesson_id IS NULL
  AND subject_tag = 'Child Psychology'
  AND lesson_tag = 'ASPECTS OF CHILD DEVELOPMENT';

-- PART 2 — retire the superseded duplicate.
UPDATE content_asset
SET deleted_at = NOW(), updated_at = NOW()
WHERE id = 360
  AND deleted_at IS NULL
  AND lesson_id IS NULL
  AND subject_tag = 'Teacher Education and Practice'
  AND lesson_tag = 'LESSON PLANNING';

-- Verify:
-- SELECT id, title FROM lesson WHERE id IN (41,43);              -- two DIFFERENT names
-- SELECT lesson_id, COUNT(*) FROM content_asset
--   WHERE id IN (49,82,83,110,269) AND deleted_at IS NULL GROUP BY lesson_id;  -- 43 -> 5
-- SELECT COUNT(*) FROM content_asset WHERE deleted_at IS NULL AND lesson_id IS NULL
--   AND subject_tag IN ('Child Psychology','Teacher Education and Practice');  -- 0

-- ROLLBACK:
-- UPDATE lesson SET title='ASPECTS OF CHILD DEVELOPMENT' WHERE id=41;
-- UPDATE content_asset SET lesson_id=NULL WHERE id IN (49,82,83,110,269);
-- UPDATE content_asset SET deleted_at=NULL WHERE id=360;
