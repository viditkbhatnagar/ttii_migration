-- Counsellor Management → Groups: counsellors filed DIRECTLY under a group
-- (Naji 2026-10-14: "when creating group ... only teams we can add, give an
-- option to add the counselors too even if they are not a part of any teams").
--
-- Rule: a counsellor belongs to at most ONE group — through their team
-- (counsellor_team_members → counsellor_teams.group_id) or directly here.
--   * Only counsellors in NO team are added here (the API checks it).
--   * UNIQUE(user_id): at most one direct group per counsellor; moving to
--     another group deletes the old row and inserts the new one in one
--     transaction.
--   * Joining a team deletes the counsellor's row here in the same
--     transaction as the team insert.
--   * Removal is a hard DELETE (like counsellor_team_members), so a removed
--     counsellor can be added again; deleting a group releases its rows.
--
-- ORGANISATIONAL ONLY: nothing reads this to scope the counsellor portal.
--
-- Additive only: ONE new table, no ALTER, no foreign keys (none in this
-- schema). Safe to re-run. Until it runs, the app behaves as before (no
-- direct members) and adding one answers "not set up yet".
USE lms_ttii;

CREATE TABLE IF NOT EXISTS counsellor_group_members (
  group_id INT NOT NULL,
  user_id INT NOT NULL,
  joined_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  created_by INT NULL,
  PRIMARY KEY (group_id, user_id),
  UNIQUE KEY uq_counsellor_group_members_user (user_id),
  INDEX idx_counsellor_group_members_group (group_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Verification (a first run starts empty):
-- SHOW TABLES LIKE 'counsellor\_group\_members';
-- SHOW INDEX FROM counsellor_group_members;  -- PRIMARY + uq_..._user + idx_..._group
-- SELECT COUNT(*) FROM counsellor_group_members;
