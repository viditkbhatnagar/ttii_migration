-- Attach Content Library rows to their chapter by FK instead of by name.
--
-- Risha 2026-09-09: "the chapter heading is different from the content added
-- inside it", "when I tried changing the heading name, the whole content is
-- getting rearranged or misplaced", "why not able to sort".
--
-- All three are the same root cause. `content_asset.lesson_id` only arrived on
-- 2026-05-30 and was never backfilled, so a Content Library row is attached to
-- its chapter by MATCHING `lesson_tag` AGAINST THE CHAPTER TITLE — in the admin
-- tree AND in the live student player. Consequences:
--   * rename the chapter and every name-matched row detaches instantly (the
--     Lesson Builder items stay, because those are FK-linked — hence "some of
--     it moved");
--   * reorderLessonAssets scopes its UPDATE on `lesson_id`, so for a row with
--     lesson_id NULL it matches zero rows and the drag saves nothing;
--   * two chapters sharing a name both serve the same rows to students.
--
-- Production before this ran: 301 rows name-matched vs 81 FK-linked repo-wide;
-- in subject 27 ("Child Psychology") 63 of 72.
--
-- This is DISPLAY-NEUTRAL by construction. Both readers resolve a row through
-- ONE query with ONE ordering — content-service.ts getContentAssetFilesForLesson
-- does `OR: [{ lesson_id }, { lesson_id: null, lesson_tag, subject_tag }]` — so
-- a row moving from the second branch to the first comes back identical, in the
-- same position. The duplicate filter runs after the query, on title, and never
-- reads lesson_id.
--
-- DELIBERATELY NOT TOUCHED:
--   * ambiguous rows — where two live chapters in the subject share the tagged
--     name (subject 27 has exactly one such pair, "ASPECTS OF CHILD
--     DEVELOPMENT", lessons 41 and 43). Picking one would REMOVE that content
--     from the other chapter for students. A human must rename one first; the
--     app now refuses to create or rename into a duplicate name, and the
--     Subject page shows an amber banner naming the collision.
--   * orphaned rows — where the tag matches no live chapter (11 repo-wide, 8 of
--     them in Child Psychology). We must not guess which chapter they belong to.
--     The Subject page now lists them in a red "not attached to any chapter"
--     panel so staff can re-file them.
--   * `lesson_tag` / `subject_tag` — left intact. They are the only provenance
--     the readers and the duplicate filters match on, and the 2026-04-30 import
--     marker depends on them.
--
-- COLLATION: content_asset.lesson_tag is utf8mb4_general_ci and lesson.title is
-- utf8mb4_unicode_ci — joining them without COLLATE fails with "Illegal mix of
-- collations". Forced to _general_ci below, which is also the comparison the
-- application performs.
--
-- Additive, guarded and safe to re-run. Rollback at the bottom.
USE lms_ttii;

-- ── 1. AUDIT (run first, keep the output) ────────────────────────────────────
-- Bucket 1 already FK-linked; 2 will be linked by this script; 3 ambiguous;
-- 4 orphaned. Bucket 2 must equal the rows_to_link reported in step 3.
SELECT 'before' AS phase,
  SUM(ca.lesson_id IS NOT NULL)                                      AS b1_fk_linked,
  SUM(ca.lesson_id IS NULL AND m.match_count = 1)                    AS b2_will_link,
  SUM(ca.lesson_id IS NULL AND m.match_count > 1)                    AS b3_ambiguous,
  SUM(ca.lesson_id IS NULL AND m.match_count IS NULL)                AS b4_orphaned
FROM content_asset ca
LEFT JOIN (
  SELECT s.title COLLATE utf8mb4_general_ci AS s_title,
         l.title COLLATE utf8mb4_general_ci AS l_title,
         COUNT(*) AS match_count,
         MIN(l.id) AS only_lesson_id
  FROM lesson l
  JOIN subject s ON s.id = l.subject_id AND s.deleted_at IS NULL
  WHERE l.deleted_at IS NULL
  GROUP BY s_title, l_title
) m ON m.s_title = ca.subject_tag COLLATE utf8mb4_general_ci
   AND m.l_title = ca.lesson_tag  COLLATE utf8mb4_general_ci
WHERE ca.deleted_at IS NULL
  AND ca.lesson_tag IS NOT NULL AND ca.lesson_tag <> ''
  AND ca.subject_tag IS NOT NULL AND ca.subject_tag <> '';

-- ── 2. THE WORKLIST staff must resolve by hand (ambiguous + orphaned) ────────
SELECT ca.id, ca.title, ca.subject_tag, ca.lesson_tag,
       CASE WHEN m.match_count > 1 THEN 'AMBIGUOUS - two chapters share this name'
            ELSE 'ORPHANED - no chapter has this name' END AS problem
FROM content_asset ca
LEFT JOIN (
  SELECT s.title COLLATE utf8mb4_general_ci AS s_title,
         l.title COLLATE utf8mb4_general_ci AS l_title,
         COUNT(*) AS match_count
  FROM lesson l
  JOIN subject s ON s.id = l.subject_id AND s.deleted_at IS NULL
  WHERE l.deleted_at IS NULL
  GROUP BY s_title, l_title
) m ON m.s_title = ca.subject_tag COLLATE utf8mb4_general_ci
   AND m.l_title = ca.lesson_tag  COLLATE utf8mb4_general_ci
WHERE ca.deleted_at IS NULL AND ca.lesson_id IS NULL
  AND ca.lesson_tag IS NOT NULL AND ca.lesson_tag <> ''
  AND (m.match_count IS NULL OR m.match_count > 1)
ORDER BY problem, ca.subject_tag, ca.lesson_tag, ca.id;

-- ── 3. THE BACKFILL — unambiguous matches only ───────────────────────────────
UPDATE content_asset ca
JOIN (
  SELECT s.title COLLATE utf8mb4_general_ci AS s_title,
         l.title COLLATE utf8mb4_general_ci AS l_title,
         MIN(l.id) AS lesson_id
  FROM lesson l
  JOIN subject s ON s.id = l.subject_id AND s.deleted_at IS NULL
  WHERE l.deleted_at IS NULL
  GROUP BY s_title, l_title
  HAVING COUNT(*) = 1          -- unambiguous: exactly one chapter with this name
) m ON m.s_title = ca.subject_tag COLLATE utf8mb4_general_ci
   AND m.l_title = ca.lesson_tag  COLLATE utf8mb4_general_ci
SET ca.lesson_id = m.lesson_id,
    ca.updated_at = NOW()
WHERE ca.deleted_at IS NULL
  AND ca.lesson_id IS NULL;    -- never re-home a row another chapter already owns

-- ── 4. VERIFY ────────────────────────────────────────────────────────────────
-- b2_will_link must now be 0; b1_fk_linked must have grown by exactly that
-- amount; b3_ambiguous and b4_orphaned must be UNCHANGED.
-- Re-run the query in step 1 with phase 'after' and compare.
--
-- This must return zero rows — no row may point at a chapter whose name it does
-- not carry:
-- SELECT ca.id, ca.lesson_tag, l.title FROM content_asset ca
--   JOIN lesson l ON l.id = ca.lesson_id
--   WHERE ca.deleted_at IS NULL AND ca.lesson_id IS NOT NULL
--     AND ca.lesson_tag IS NOT NULL AND ca.lesson_tag <> ''
--     AND l.title COLLATE utf8mb4_general_ci <> ca.lesson_tag COLLATE utf8mb4_general_ci;

-- ── ROLLBACK ─────────────────────────────────────────────────────────────────
-- Only the rows this script set are reversible, and only if nothing has since
-- re-linked them by hand. Restrict by updated_at to the run window:
-- UPDATE content_asset SET lesson_id = NULL
--   WHERE lesson_id IS NOT NULL AND deleted_at IS NULL
--     AND lesson_tag IS NOT NULL AND lesson_tag <> ''
--     AND updated_at BETWEEN '<run start>' AND '<run end>';
