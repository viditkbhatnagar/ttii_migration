-- Counsellor Management → Groups and Teams (Naji 2026-10-12 prototype:
-- TeamsModule / TeamProfile / GroupsModule / GroupProfile).
--
-- A GROUP has a manager and holds teams; a TEAM has a leader, optionally sits
-- in one group, and holds counsellors (users.role_id = 9).
--
-- ORGANISATIONAL ONLY. Nothing reads these tables to decide what a counsellor
-- can see in the counsellor portal — that visibility rule is still owed by the
-- product owner.
--
-- Additive only: three NEW tables, no ALTER of any existing table, no foreign
-- keys (this schema has none anywhere), indexes instead. Safe to re-run.
--
-- counsellor_team_members:
--   * composite PK (team_id, user_id);
--   * UNIQUE (user_id) — a counsellor is in at most ONE team. The API inserts
--     and lets this index refuse a second membership (claim-safe under races);
--   * NO deleted_at — removal is a DELETE (like cohort_courses), so a removed
--     counsellor can be added again without a dead row holding the key.
--
-- Until this runs, /admin/teams/* and /admin/groups/* list endpoints answer
-- with an empty list and a "not set up yet" message instead of a 500.
USE lms_ttii;

CREATE TABLE IF NOT EXISTS counsellor_groups (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  code VARCHAR(40) NOT NULL DEFAULT '',
  description TEXT NULL,
  manager_user_id INT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_by INT NULL,
  updated_by INT NULL,
  deleted_by INT NULL,
  created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  INDEX idx_counsellor_groups_deleted (deleted_at),
  INDEX idx_counsellor_groups_manager (manager_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS counsellor_teams (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  code VARCHAR(40) NOT NULL DEFAULT '',
  group_id INT NULL,
  leader_user_id INT NULL,
  description TEXT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_by INT NULL,
  updated_by INT NULL,
  deleted_by INT NULL,
  created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  INDEX idx_counsellor_teams_deleted (deleted_at),
  INDEX idx_counsellor_teams_group (group_id),
  INDEX idx_counsellor_teams_leader (leader_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS counsellor_team_members (
  team_id INT NOT NULL,
  user_id INT NOT NULL,
  joined_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  created_by INT NULL,
  PRIMARY KEY (team_id, user_id),
  UNIQUE KEY uq_counsellor_team_members_user (user_id),
  INDEX idx_counsellor_team_members_team (team_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Verification (all three tables exist and start empty on a first run):
-- SHOW TABLES LIKE 'counsellor\_%';
-- SELECT COUNT(*) FROM counsellor_groups;
-- SELECT COUNT(*) FROM counsellor_teams;
-- SELECT COUNT(*) FROM counsellor_team_members;
-- SHOW INDEX FROM counsellor_team_members;  -- expect PRIMARY + uq_..._user + idx_..._team
