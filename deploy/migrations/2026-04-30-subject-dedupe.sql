-- Subject merge — Phase 2: collapse duplicate-title subjects into canonical rows.
-- Canonical pick: prefer the row in course 16 (Diploma in Montessori), then 18
-- (PG Diploma), then lowest id. For each non-canonical dupe we add a pivot
-- row linking the dupe's course to the canonical subject, then soft-delete
-- the dupe pivot row, the dupe subject, its lessons, and lesson_files.
--
-- Pre-checked on 2026-04-30: every dupe lesson title has a matching titled
-- lesson in its canonical, so no unique content is lost. The Diploma row is
-- always either equal or a strict superset of the dupe (e.g. School
-- Management has 2 extra videos in Diploma that PG Diploma was missing —
-- after merge both Diploma and PG students see those 2 videos).
--
-- Wrap in a transaction so a failure rolls back cleanly.
USE lms_ttii;

START TRANSACTION;

DROP TEMPORARY TABLE IF EXISTS _subject_merge_map;
CREATE TEMPORARY TABLE _subject_merge_map (
  dupe_id        INT NOT NULL PRIMARY KEY,
  canonical_id   INT NOT NULL,
  dupe_course_id INT NOT NULL
);

INSERT INTO _subject_merge_map (dupe_id, canonical_id, dupe_course_id)
SELECT s.id, CAST(canon.canonical_id_str AS UNSIGNED), s.course_id
FROM subject s
JOIN course c ON c.id = s.course_id
JOIN (
  SELECT LOWER(TRIM(s2.title)) AS norm_title,
         SUBSTRING_INDEX(
           GROUP_CONCAT(s2.id ORDER BY (s2.course_id = 16) DESC, (s2.course_id = 18) DESC, s2.id ASC),
           ',', 1
         ) AS canonical_id_str,
         COUNT(*) AS cnt
  FROM subject s2
  JOIN course c2 ON c2.id = s2.course_id
  WHERE s2.deleted_at IS NULL AND c2.deleted_at IS NULL
  GROUP BY LOWER(TRIM(s2.title))
  HAVING cnt > 1
) canon ON LOWER(TRIM(s.title)) = canon.norm_title
WHERE s.deleted_at IS NULL AND c.deleted_at IS NULL
  AND s.id <> CAST(canon.canonical_id_str AS UNSIGNED);

SELECT '== merge_map (rows about to be merged) ==' AS section;
SELECT * FROM _subject_merge_map ORDER BY canonical_id, dupe_id;

-- 1. Add pivot rows linking each dupe's course to the canonical subject.
INSERT IGNORE INTO course_subject (course_id, subject_id, position, created_at)
SELECT m.dupe_course_id, m.canonical_id, NULL, NOW()
FROM _subject_merge_map m;

-- 2. Soft-delete the pivot rows that linked the dupe course → dupe subject.
UPDATE course_subject cs
JOIN _subject_merge_map m
  ON cs.course_id = m.dupe_course_id AND cs.subject_id = m.dupe_id
SET cs.deleted_at = NOW(), cs.updated_at = NOW();

-- 3. Soft-delete the dupe subject rows.
UPDATE subject s
JOIN _subject_merge_map m ON s.id = m.dupe_id
SET s.deleted_at = NOW(), s.updated_at = NOW();

-- 4. Soft-delete the dupe lessons (their content lives on the canonical).
UPDATE lesson l
JOIN _subject_merge_map m ON l.subject_id = m.dupe_id
SET l.deleted_at = NOW(), l.updated_at = NOW()
WHERE l.deleted_at IS NULL;

-- 5. Soft-delete the dupe lesson_files.
UPDATE lesson_files lf
JOIN lesson l ON l.id = lf.lesson_id
JOIN _subject_merge_map m ON l.subject_id = m.dupe_id
SET lf.deleted_at = NOW(), lf.updated_at = NOW()
WHERE lf.deleted_at IS NULL;

-- Verification.
SELECT '== AFTER MERGE ==' AS section;
SELECT COUNT(*) AS dupes_merged FROM _subject_merge_map;
SELECT COUNT(*) AS active_subjects FROM subject WHERE deleted_at IS NULL;
SELECT COUNT(*) AS active_pivot_rows FROM course_subject WHERE deleted_at IS NULL;
SELECT COUNT(*) AS remaining_active_dupe_groups
FROM (
  SELECT LOWER(TRIM(s.title)) AS t
  FROM subject s WHERE s.deleted_at IS NULL
  GROUP BY t HAVING COUNT(*) > 1
) x;

DROP TEMPORARY TABLE _subject_merge_map;

COMMIT;
