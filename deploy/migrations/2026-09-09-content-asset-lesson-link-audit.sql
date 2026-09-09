-- READ-ONLY AUDIT (no DDL, no DML, no temp tables) — Content Library rows that
-- hang off a lesson TITLE STRING instead of content_asset.lesson_id.
--
-- Risha, 2026-09-09, admin/subjects/view/27 "Child Psychology":
--   "The chapter heading is different from the content added inside it."
--   "When I tried changing the heading name, the whole content is getting
--    rearranged or misplaced."
--
-- WHY that happens. A lesson's content list is assembled from two live tables
-- and one of them is attached by NAME:
--   * content_asset.lesson_id set  -> a real link (survives a rename)
--   * content_asset.lesson_id NULL -> resolved by matching
--       TRIM(content_asset.subject_tag) = TRIM(subject.title)  AND
--       TRIM(content_asset.lesson_tag)  = TRIM(lesson.title)
--     ...so the instant someone edits the chapter heading, every one of those
--     rows detaches. ContentService.editLessonAdmin
--     (apps/api/src/content/content-service.ts:4154) writes lesson.title and
--     NOTHING else — it never touches content_asset.lesson_tag.
--
-- The same title match is done in TWO places, and they disagree:
--   * admin tree   apps/api/src/content/content-asset-service.ts:518-530,592
--     builds lessonIdByTitle FIRST-TITLE-WINS, so when two lessons in a subject
--     share a heading only the first one ever shows the tag-matched rows.
--   * student player apps/api/src/content/content-service.ts:670-673, called
--     once PER LESSON with that lesson's own title (content-service.ts:2164 and
--     :2504) — no first-wins map. So duplicate-titled lessons show the SAME
--     content under BOTH headings to students while the admin sees it once.
--
-- COLLATION TRAP: content_asset.lesson_tag is utf8mb4_general_ci and
-- lesson.title is utf8mb4_unicode_ci. Joining them raw fails with
--   ERROR 1267 Illegal mix of collations
-- Every comparison below is forced to utf8mb4_bin, because the application
-- compares these as plain JS strings after .trim() — exact, case-SENSITIVE.
-- Using a _ci collation here would report matches the app does not make.
--
-- Run it (PHP droplet, root creds — the app user lms_ttii cannot read
-- information_schema.columns for other schemas, but SELECT here is fine):
--   ssh root@143.110.240.210 'bash -s' <<'EOF'
--   PASS=$(tr -d '[:space:]' < /etc/cyberpanel/mysqlPassword)
--   TMPCNF=$(mktemp); chmod 600 "$TMPCNF"
--   printf '[client]\nuser=root\npassword=%s\n' "$PASS" > "$TMPCNF"
--   mysql --defaults-file="$TMPCNF" -t lms_ttii < /path/2026-09-09-content-asset-lesson-link-audit.sql
--   rm -f "$TMPCNF"
--   EOF
-- Add --batch instead of -t to get TSV you can paste into a sheet for staff.

USE lms_ttii;

-- ===========================================================================
-- CHANGE THIS ONE NUMBER. 27 = Child Psychology.
-- ===========================================================================
SET @subject_id = 27;


SELECT '== 0. collation sanity check (expect utf8mb4 on all four) ==' AS section;
SELECT table_name, column_name, character_set_name, collation_name
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND (   (table_name = 'content_asset' AND column_name IN ('subject_tag','lesson_tag'))
       OR (table_name = 'lesson'        AND column_name = 'title')
       OR (table_name = 'subject'       AND column_name = 'title'))
ORDER BY table_name, column_name;


SELECT '== 1. the subject ==' AS section;
SELECT s.id, s.title, s.subject_code, s.status, s.course_id
FROM subject s
WHERE s.id = @subject_id AND s.deleted_at IS NULL;


-- Per chapter: how much content is really linked, how much is only name-tagged,
-- whether the heading is duplicated, and whether the admin tree can even show
-- the name-tagged rows for this chapter.
SELECT '== 2. lessons in this subject ==' AS section;
SELECT
  l.id                                                   AS lesson_id,
  l.`order`                                              AS lesson_order,
  l.title                                                AS lesson_title,
  (SELECT COUNT(*) FROM lesson l2
     WHERE l2.subject_id = l.subject_id AND l2.deleted_at IS NULL
       AND CONVERT(TRIM(l2.title) USING utf8mb4) COLLATE utf8mb4_bin
         = CONVERT(TRIM(l.title)  USING utf8mb4) COLLATE utf8mb4_bin
  )                                                      AS lessons_with_this_title,
  -- the app keeps the FIRST lesson in (order, id) order for a duplicated title
  CASE WHEN NOT EXISTS (
         SELECT 1 FROM lesson l3
          WHERE l3.subject_id = l.subject_id AND l3.deleted_at IS NULL
            AND CONVERT(TRIM(l3.title) USING utf8mb4) COLLATE utf8mb4_bin
              = CONVERT(TRIM(l.title)  USING utf8mb4) COLLATE utf8mb4_bin
            AND (l3.`order` < l.`order` OR (l3.`order` = l.`order` AND l3.id < l.id)))
       THEN 'yes' ELSE 'NO - admin tree sends its tagged rows to the other lesson'
  END                                                    AS admin_tree_shows_tagged_rows,
  (SELECT COUNT(*) FROM content_asset ca
     WHERE ca.deleted_at IS NULL AND ca.lesson_id = l.id) AS library_fk_linked,
  (SELECT COUNT(*) FROM content_asset ca
     WHERE ca.deleted_at IS NULL AND ca.lesson_id IS NULL
       AND CONVERT(TRIM(ca.subject_tag) USING utf8mb4) COLLATE utf8mb4_bin
         = CONVERT(TRIM(s.title)        USING utf8mb4) COLLATE utf8mb4_bin
       AND CONVERT(TRIM(ca.lesson_tag)  USING utf8mb4) COLLATE utf8mb4_bin
         = CONVERT(TRIM(l.title)        USING utf8mb4) COLLATE utf8mb4_bin
  )                                                      AS library_title_matched,
  (SELECT COUNT(*) FROM lesson_files lf
     WHERE lf.deleted_at IS NULL AND lf.lesson_id = l.id) AS lesson_builder_rows
FROM lesson l
JOIN subject s ON s.id = l.subject_id
WHERE l.subject_id = @subject_id AND l.deleted_at IS NULL
ORDER BY l.`order`, l.id;


SELECT '== 3. duplicate chapter headings in this subject (the rename trap) ==' AS section;
SELECT
  CONVERT(TRIM(l.title) USING utf8mb4) COLLATE utf8mb4_bin AS lesson_title,
  COUNT(*)                                                 AS lessons_sharing_it,
  GROUP_CONCAT(l.id ORDER BY l.`order`, l.id)              AS lesson_ids,
  GROUP_CONCAT(l.`order` ORDER BY l.`order`, l.id)         AS lesson_orders
FROM lesson l
WHERE l.subject_id = @subject_id AND l.deleted_at IS NULL
GROUP BY CONVERT(TRIM(l.title) USING utf8mb4) COLLATE utf8mb4_bin
HAVING COUNT(*) > 1
ORDER BY lessons_sharing_it DESC, lesson_title;


SELECT '== 4. headline counts for this subject ==' AS section;
SELECT
  (SELECT COUNT(*) FROM content_asset ca
     JOIN lesson l ON l.id = ca.lesson_id AND l.deleted_at IS NULL
    WHERE ca.deleted_at IS NULL AND l.subject_id = @subject_id
  ) AS fk_linked,
  (SELECT COUNT(*) FROM content_asset ca
    WHERE ca.deleted_at IS NULL AND ca.lesson_id IS NULL
      AND CONVERT(TRIM(ca.subject_tag) USING utf8mb4) COLLATE utf8mb4_bin
        = CONVERT(TRIM((SELECT s2.title FROM subject s2 WHERE s2.id = @subject_id)) USING utf8mb4) COLLATE utf8mb4_bin
      AND EXISTS (SELECT 1 FROM lesson l WHERE l.subject_id = @subject_id AND l.deleted_at IS NULL
                    AND CONVERT(TRIM(l.title) USING utf8mb4) COLLATE utf8mb4_bin
                      = CONVERT(TRIM(ca.lesson_tag) USING utf8mb4) COLLATE utf8mb4_bin)
  ) AS title_matched,
  (SELECT COUNT(*) FROM content_asset ca
    WHERE ca.deleted_at IS NULL AND ca.lesson_id IS NULL
      AND CONVERT(TRIM(ca.subject_tag) USING utf8mb4) COLLATE utf8mb4_bin
        = CONVERT(TRIM((SELECT s2.title FROM subject s2 WHERE s2.id = @subject_id)) USING utf8mb4) COLLATE utf8mb4_bin
      AND NOT EXISTS (SELECT 1 FROM lesson l WHERE l.subject_id = @subject_id AND l.deleted_at IS NULL
                    AND CONVERT(TRIM(l.title) USING utf8mb4) COLLATE utf8mb4_bin
                      = CONVERT(TRIM(ca.lesson_tag) USING utf8mb4) COLLATE utf8mb4_bin)
  ) AS orphaned_tag_matches_no_chapter,
  (SELECT COUNT(*) FROM lesson_files lf
     JOIN lesson l ON l.id = lf.lesson_id AND l.deleted_at IS NULL
    WHERE lf.deleted_at IS NULL AND l.subject_id = @subject_id
  ) AS lesson_builder_rows;


-- These rows exist, students may or may not be able to reach them, and NOBODY
-- can see them in the admin Subject Detail page. This is the list Risha needs.
SELECT '== 5. ORPHANED rows in this subject (invisible in the admin tree) ==' AS section;
SELECT
  ca.id            AS asset_id,
  ca.asset_type,
  ca.title,
  ca.lesson_tag    AS tagged_chapter_that_no_longer_exists,
  CASE WHEN ca.tags LIKE 'legacy:lesson_files:%' THEN 'legacy mirror of a Lesson Builder row'
       ELSE 'authored in the Content Library' END AS provenance,
  ca.created_at,
  ca.updated_at
FROM content_asset ca
WHERE ca.deleted_at IS NULL
  AND ca.lesson_id IS NULL
  AND CONVERT(TRIM(ca.subject_tag) USING utf8mb4) COLLATE utf8mb4_bin
    = CONVERT(TRIM((SELECT s2.title FROM subject s2 WHERE s2.id = @subject_id)) USING utf8mb4) COLLATE utf8mb4_bin
  AND TRIM(COALESCE(ca.lesson_tag,'')) <> ''
  AND NOT EXISTS (
        SELECT 1 FROM lesson l
         WHERE l.subject_id = @subject_id AND l.deleted_at IS NULL
           AND CONVERT(TRIM(l.title) USING utf8mb4) COLLATE utf8mb4_bin
             = CONVERT(TRIM(ca.lesson_tag) USING utf8mb4) COLLATE utf8mb4_bin)
ORDER BY ca.lesson_tag, ca.id;


-- Why an orphan is an orphan. A case- or whitespace-only difference means
-- somebody retyped the heading; anything else means the chapter was renamed or
-- deleted and a human has to say where the content belongs.
SELECT '== 6. near-miss diagnosis for the orphans above ==' AS section;
SELECT
  ca.id          AS asset_id,
  ca.title       AS asset_title,
  ca.lesson_tag  AS orphan_tag,
  l.id           AS candidate_lesson_id,
  l.title        AS candidate_lesson_title,
  'differs only by letter case and/or spacing' AS near_miss_kind
FROM content_asset ca
JOIN lesson l
  ON l.subject_id = @subject_id AND l.deleted_at IS NULL
 AND CONVERT(REPLACE(TRIM(l.title),' ','')        USING utf8mb4) COLLATE utf8mb4_general_ci
   = CONVERT(REPLACE(TRIM(ca.lesson_tag),' ','')  USING utf8mb4) COLLATE utf8mb4_general_ci
WHERE ca.deleted_at IS NULL
  AND ca.lesson_id IS NULL
  AND CONVERT(TRIM(ca.subject_tag) USING utf8mb4) COLLATE utf8mb4_bin
    = CONVERT(TRIM((SELECT s2.title FROM subject s2 WHERE s2.id = @subject_id)) USING utf8mb4) COLLATE utf8mb4_bin
  AND NOT EXISTS (
        SELECT 1 FROM lesson l4
         WHERE l4.subject_id = @subject_id AND l4.deleted_at IS NULL
           AND CONVERT(TRIM(l4.title) USING utf8mb4) COLLATE utf8mb4_bin
             = CONVERT(TRIM(ca.lesson_tag) USING utf8mb4) COLLATE utf8mb4_bin)
ORDER BY ca.id, l.`order`, l.id;


-- Ambiguity is evaluated REPO-WIDE, not per subject: the student reader matches
-- on the (subject_tag, lesson_tag) pair alone, so two subjects sharing a title
-- widen the match exactly like two lessons do. reachable_lessons > 1 means the
-- row is ALREADY served under more than one heading and no migration may guess
-- which one is right.
--
-- `pair_reach` below is the reusable building block: one non-correlated pass
-- over lesson x subject giving every (subject title, lesson title) pair and how
-- many active lessons answer to it. Sections 7 and 8 both join to it.
SELECT '== 7. ambiguous tag pairs, repo-wide (leave these for a human) ==' AS section;
SELECT
  ca.subject_tag,
  ca.lesson_tag,
  COUNT(*)          AS unlinked_rows_with_this_pair,
  MAX(m.reachable)  AS reachable_lessons,
  MAX(m.lesson_ids) AS candidate_lesson_ids
FROM content_asset ca
JOIN (
  SELECT CONVERT(TRIM(s.title) USING utf8mb4) COLLATE utf8mb4_bin AS st,
         CONVERT(TRIM(l.title) USING utf8mb4) COLLATE utf8mb4_bin AS lt,
         COUNT(*) AS reachable,
         GROUP_CONCAT(CONCAT(l.id, '@subject', l.subject_id) ORDER BY l.id) AS lesson_ids
  FROM lesson l
  JOIN subject s ON s.id = l.subject_id AND s.deleted_at IS NULL
  WHERE l.deleted_at IS NULL
  GROUP BY st, lt
) m
  ON m.st = CONVERT(TRIM(ca.subject_tag) USING utf8mb4) COLLATE utf8mb4_bin
 AND m.lt = CONVERT(TRIM(ca.lesson_tag)  USING utf8mb4) COLLATE utf8mb4_bin
WHERE ca.deleted_at IS NULL
  AND ca.lesson_id IS NULL
  AND m.reachable > 1
GROUP BY ca.subject_tag, ca.lesson_tag
ORDER BY reachable_lessons DESC, unlinked_rows_with_this_pair DESC;


SELECT '== 8. repo-wide exposure, one row per bucket ==' AS section;
SELECT
  x.bucket,
  COUNT(*)                                                            AS rows_count,
  SUM(CASE WHEN x.tags LIKE 'legacy:lesson_files:%' THEN 1 ELSE 0 END) AS of_which_legacy_mirrors
FROM (
  SELECT
    ca.id,
    ca.tags,
    CASE
      WHEN ca.lesson_id IS NOT NULL                     THEN '1 fk_linked'
      WHEN TRIM(COALESCE(ca.subject_tag,'')) = ''
        OR TRIM(COALESCE(ca.lesson_tag,''))  = ''       THEN '4 untagged (unreachable)'
      WHEN COALESCE(m.reachable, 0) = 1                 THEN '2 title_matched_unambiguous (backfillable)'
      WHEN COALESCE(m.reachable, 0) > 1                 THEN '3 title_matched_AMBIGUOUS (human)'
      ELSE                                                   '5 orphaned (human)'
    END AS bucket
  FROM content_asset ca
  LEFT JOIN (
    SELECT CONVERT(TRIM(s.title) USING utf8mb4) COLLATE utf8mb4_bin AS st,
           CONVERT(TRIM(l.title) USING utf8mb4) COLLATE utf8mb4_bin AS lt,
           COUNT(*) AS reachable
    FROM lesson l
    JOIN subject s ON s.id = l.subject_id AND s.deleted_at IS NULL
    WHERE l.deleted_at IS NULL
    GROUP BY st, lt
  ) m
    ON m.st = CONVERT(TRIM(ca.subject_tag) USING utf8mb4) COLLATE utf8mb4_bin
   AND m.lt = CONVERT(TRIM(ca.lesson_tag)  USING utf8mb4) COLLATE utf8mb4_bin
  WHERE ca.deleted_at IS NULL
) x
GROUP BY x.bucket
ORDER BY x.bucket;


-- Which subjects are worst hit — this ranks the cleanup queue for staff.
-- Every aggregate is a non-correlated derived table joined on subject id;
-- MySQL cannot correlate a derived table in FROM without LATERAL.
SELECT '== 9. every subject ranked by title-matched exposure ==' AS section;
SELECT
  s.id                            AS subject_id,
  s.title                         AS subject_title,
  COALESCE(les.lessons, 0)        AS lessons,
  COALESCE(dup.duplicate_headings, 0) AS duplicate_headings,
  COALESCE(fk.fk_linked, 0)       AS fk_linked,
  COALESCE(tag.tagged_by_name, 0) AS tagged_by_name
FROM subject s
LEFT JOIN (
  SELECT l.subject_id, COUNT(*) AS lessons
  FROM lesson l WHERE l.deleted_at IS NULL GROUP BY l.subject_id
) les ON les.subject_id = s.id
LEFT JOIN (
  SELECT d.subject_id, COUNT(*) AS duplicate_headings
  FROM (
    SELECT l.subject_id, CONVERT(TRIM(l.title) USING utf8mb4) COLLATE utf8mb4_bin AS t
    FROM lesson l WHERE l.deleted_at IS NULL
    GROUP BY l.subject_id, t
    HAVING COUNT(*) > 1
  ) d GROUP BY d.subject_id
) dup ON dup.subject_id = s.id
LEFT JOIN (
  SELECT l.subject_id, COUNT(*) AS fk_linked
  FROM content_asset ca
  JOIN lesson l ON l.id = ca.lesson_id AND l.deleted_at IS NULL
  WHERE ca.deleted_at IS NULL
  GROUP BY l.subject_id
) fk ON fk.subject_id = s.id
LEFT JOIN (
  SELECT CONVERT(TRIM(ca.subject_tag) USING utf8mb4) COLLATE utf8mb4_bin AS st,
         COUNT(*) AS tagged_by_name
  FROM content_asset ca
  WHERE ca.deleted_at IS NULL AND ca.lesson_id IS NULL
    AND TRIM(COALESCE(ca.subject_tag,'')) <> ''
  GROUP BY st
) tag ON tag.st = CONVERT(TRIM(s.title) USING utf8mb4) COLLATE utf8mb4_bin
WHERE s.deleted_at IS NULL
ORDER BY tagged_by_name DESC, duplicate_headings DESC, s.id;


-- ===========================================================================
-- 10. STAFF WORKLIST EXPORT. Run with `mysql --batch` and paste into a sheet.
--     One row per Content Library item nobody can currently place, with the
--     evidence a human needs to decide. Never guessed, never auto-assigned.
-- ===========================================================================
SELECT
  ca.id                                    AS asset_id,
  ca.asset_type,
  ca.title,
  ca.subject_tag                           AS tagged_subject,
  ca.lesson_tag                            AS tagged_chapter,
  CASE WHEN COALESCE(m.reachable,0) > 1 THEN 'AMBIGUOUS - shown under every chapter with this name'
       ELSE 'ORPHANED - chapter renamed or deleted, invisible in admin' END AS problem,
  COALESCE(m.reachable, 0)                 AS chapters_it_currently_reaches,
  COALESCE(m.lesson_ids, '')               AS chapter_ids,
  CASE WHEN ca.tags LIKE 'legacy:lesson_files:%' THEN 'legacy mirror - safe to delete if the Lesson Builder row still exists'
       ELSE 'authored in the Content Library - do NOT delete' END          AS provenance,
  ca.created_at,
  ca.updated_at
FROM content_asset ca
LEFT JOIN (
  SELECT CONVERT(TRIM(s.title) USING utf8mb4) COLLATE utf8mb4_bin AS st,
         CONVERT(TRIM(l.title) USING utf8mb4) COLLATE utf8mb4_bin AS lt,
         COUNT(*) AS reachable,
         GROUP_CONCAT(CONCAT(l.id, '@subject', l.subject_id) ORDER BY l.id) AS lesson_ids
  FROM lesson l
  JOIN subject s ON s.id = l.subject_id AND s.deleted_at IS NULL
  WHERE l.deleted_at IS NULL
  GROUP BY st, lt
) m
  ON m.st = CONVERT(TRIM(ca.subject_tag) USING utf8mb4) COLLATE utf8mb4_bin
 AND m.lt = CONVERT(TRIM(ca.lesson_tag)  USING utf8mb4) COLLATE utf8mb4_bin
WHERE ca.deleted_at IS NULL
  AND ca.lesson_id IS NULL
  AND TRIM(COALESCE(ca.subject_tag,'')) <> ''
  AND TRIM(COALESCE(ca.lesson_tag,''))  <> ''
  AND COALESCE(m.reachable, 0) <> 1
ORDER BY problem, ca.subject_tag, ca.lesson_tag, ca.id;
