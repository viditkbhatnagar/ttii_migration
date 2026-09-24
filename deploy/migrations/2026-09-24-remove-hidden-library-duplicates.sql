-- DATA change (not schema): remove the hidden Content Library duplicates.
--
-- APPLIED 2026-09-24 04:42:53 (DB clock) as root on 143.110.240.210, after 66af95ab
-- deployed and a re-run classification matched these 290 ids exactly. Result:
-- 290 -> 0 live, 4 held rows untouched, live content_asset 403 -> 113, and the
-- student view of all 8 subjects unchanged (59 chapters / 339 items, 0 diffs).
--
-- Risha 2026-09-24: "do we have an option to delete all duplicates that exist
-- across the entire number of subjects?"
--
-- WHAT: the 2026-04-30 content-library import copied every Lesson Builder
-- (lesson_files) item into content_asset. The student player hides a copy while
-- a Lesson Builder item in the same chapter has the same title, so students have
-- never seen these rows; they only double the admin Subject Detail lists (the
-- amber "Duplicate - not shown to students" chip). Soft delete only.
--
-- Classified on production 2026-09-24 (read-only), 294 hidden copies across 8
-- subjects, all FK-attached (content_asset.lesson_id), none name-attached:
--   167 identical copy of the Lesson Builder item (same file / same body / same question count)
--   103 videos pointing at an OLDER Vimeo id (1126..-1169..); every Lesson Builder original
--       was re-linked to the 1203.. batch, which is what students watch
--   19 quizzes one question short (the 2026-04-30 quiz import skipped option-A rows)
--   1 empty quiz (0 questions)
--   = 290 removed here.
-- HELD BACK (NOT touched): 353, 354, 356, 357 — Foundation To Information
-- Technology "Chapter 1/2/4/5" PDFs uploaded 2026-07-16, NEWER than the Lesson
-- Builder PDFs (2026-06-12/13) that students actually see. Waiting on Risha.
--
-- quiz_question rows under removed quizzes are left as they are (their parent
-- is soft-deleted, which is what deleteAsset does for a single row too).
--
-- Safe to re-run (guarded on deleted_at IS NULL). Reversible: see the rollback.
USE lms_ttii;

-- Before: expect 290 live rows.
SELECT COUNT(*) AS live_before FROM content_asset
WHERE deleted_at IS NULL AND id IN (
  3,4,5,6,7,8,9,10,11,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,
  31,32,33,34,35,36,37,38,39,40,41,42,43,45,47,50,51,52,53,54,55,56,57,58,59,
  60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,
  85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,
  107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,
  126,127,128,129,130,131,132,133,134,135,136,137,138,140,141,145,149,150,151,
  152,153,154,155,156,158,159,160,161,162,163,164,165,166,167,168,169,170,171,
  172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,
  191,192,193,194,195,196,197,198,199,201,202,203,204,205,206,207,208,209,210,
  211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,
  230,231,234,235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,
  251,252,253,254,258,259,260,261,262,263,264,265,266,270,271,272,273,274,275,
  276,277,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292,293,294,
  295,296,297,298,299,300,301,302,303,304,305,306,307,308,309,310,311,312,313,
  314
);

UPDATE content_asset
SET deleted_at = NOW(), updated_at = NOW()
WHERE deleted_at IS NULL AND id IN (
  3,4,5,6,7,8,9,10,11,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,
  31,32,33,34,35,36,37,38,39,40,41,42,43,45,47,50,51,52,53,54,55,56,57,58,59,
  60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,
  85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,
  107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,
  126,127,128,129,130,131,132,133,134,135,136,137,138,140,141,145,149,150,151,
  152,153,154,155,156,158,159,160,161,162,163,164,165,166,167,168,169,170,171,
  172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,
  191,192,193,194,195,196,197,198,199,201,202,203,204,205,206,207,208,209,210,
  211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,
  230,231,234,235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,
  251,252,253,254,258,259,260,261,262,263,264,265,266,270,271,272,273,274,275,
  276,277,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292,293,294,
  295,296,297,298,299,300,301,302,303,304,305,306,307,308,309,310,311,312,313,
  314
);

-- After: expect 0 live rows in the list, and the 4 held rows still live.
SELECT COUNT(*) AS live_after FROM content_asset
WHERE deleted_at IS NULL AND id IN (
  3,4,5,6,7,8,9,10,11,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,
  31,32,33,34,35,36,37,38,39,40,41,42,43,45,47,50,51,52,53,54,55,56,57,58,59,
  60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,
  85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,
  107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,
  126,127,128,129,130,131,132,133,134,135,136,137,138,140,141,145,149,150,151,
  152,153,154,155,156,158,159,160,161,162,163,164,165,166,167,168,169,170,171,
  172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,
  191,192,193,194,195,196,197,198,199,201,202,203,204,205,206,207,208,209,210,
  211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,
  230,231,234,235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,
  251,252,253,254,258,259,260,261,262,263,264,265,266,270,271,272,273,274,275,
  276,277,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292,293,294,
  295,296,297,298,299,300,301,302,303,304,305,306,307,308,309,310,311,312,313,
  314
);
SELECT id, title, deleted_at FROM content_asset WHERE id IN (353, 354, 356, 357);

-- ROLLBACK (restores exactly these rows):
-- UPDATE content_asset SET deleted_at = NULL
-- WHERE deleted_at = '2026-09-24 04:42:53' AND id IN (<the same 290 ids as above>);
