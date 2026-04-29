-- Admin permission system — Phase 3 of Naji's QA round (2026-04-30).
-- Today's admin-side gating uses raw role_id checks (e.g. requireLegacyRoles
-- ([1, 8])). Naji wants one "Admin" role with assignable permissions instead.
-- Per DEPLOYMENT.md and project memory, the legacy PHP LMS still runs
-- against the same DB and uses role_id 1/8 directly — so we can't repurpose
-- the role_id column. This migration adds an additive permission layer:
-- permissions live in their own table, users get fine-grained grants, and
-- the new requirePermission() middleware checks the grant set instead of
-- the role number.
--
-- Existing PHP `permission` and `user_permission` tables are reused. We
-- only ADD missing columns (description, category) and seed the rows the
-- new admin app expects. user_permission columns already match.
--
-- Existing Super Admin (role_id=1) and Admin (role_id=8) users are
-- backfilled with all currently-defined permissions — no admin loses
-- access on the day the new gates land. The actor that granted each row
-- is recorded as 0 (system seed) so it's distinguishable from manual
-- grants.
USE lms_ttii;

-- 1. Extend the legacy permission table with description + category.
ALTER TABLE permission
  ADD COLUMN IF NOT EXISTS description TEXT NULL AFTER slug,
  ADD COLUMN IF NOT EXISTS category VARCHAR(50) NULL AFTER description;

-- Make slug a unique key so ON DUPLICATE works deterministically.
-- (Some MariaDB builds need the DROP-then-add dance; ignore failures
--  if the index doesn't yet exist.)
ALTER TABLE permission
  ADD UNIQUE INDEX IF NOT EXISTS uk_permission_slug (slug);

-- 2. Seed the catalogue. `slug` is the stable identifier code references
--    (e.g. 'learners.manage'); `title` is the human label shown in the
--    permission toggle UI; `category` groups them visually.
INSERT INTO permission (slug, title, description, category)
VALUES
  ('learners.manage',          'Manage Learners',           'Add, edit, delete student records and applications',  'Learner Management'),
  ('learners.export',          'Export Learner Data',       'Download student rosters and reports',                 'Learner Management'),
  ('courses.manage',           'Manage Courses',            'Create / edit / archive courses, subjects, lessons',   'Course Management'),
  ('cohorts.manage',           'Manage Cohorts',            'Create cohorts, schedule live classes, assign students', 'Cohort Management'),
  ('content_library.manage',   'Manage Content Library',    'Upload + edit shared content assets and quizzes',      'Content Management'),
  ('assessments.manage',       'Manage Assessments',        'Create exams, assignments, grading rules',             'Assessment Management'),
  ('fees.view',                'View Fees',                 'See fee structures, payment status, installments',     'Fee Management'),
  ('fees.manage',              'Manage Fees',               'Edit fee structures, mark paid, send reminders',       'Fee Management'),
  ('fees.refund',              'Approve Refunds',           'Approve and process student refund requests',          'Fee Management'),
  ('centres.manage',           'Manage Centres',            'Add / edit centre records, assign plans',              'Centre Management'),
  ('users.manage_admins',      'Manage Admin Users',        'Add / edit / delete other admin users',                'User Management'),
  ('users.manage_counsellors', 'Manage Counsellors',        'Add / edit / delete counsellor users',                 'User Management'),
  ('users.manage_associates',  'Manage Associates',         'Add / edit / delete associate users',                  'User Management'),
  ('users.manage_instructors', 'Manage Instructors',        'Add / edit / delete instructor users',                 'User Management'),
  ('communications.manage',    'Manage Communications',     'Send announcements, notifications, emails',            'Communications'),
  ('reports.view',             'View Reports',              'Access dashboards, analytics and exports',             'Reports'),
  ('settings.manage',          'Manage Settings',           'Edit integrations, branding, system configuration',    'Settings')
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  description = VALUES(description),
  category = VALUES(category);

-- 3. Backfill: grant every defined permission to every existing Super Admin
--    (role_id=1) and Admin (role_id=8). Idempotent — INSERT IGNORE.
INSERT IGNORE INTO user_permission (user_id, permission_id, granted_by)
SELECT u.id, p.id, 0
FROM users u
CROSS JOIN permission p
WHERE u.role_id IN (1, 8)
  AND u.deleted_at IS NULL
  AND p.category IN (
    'Learner Management','Course Management','Cohort Management','Content Management',
    'Assessment Management','Fee Management','Centre Management','User Management',
    'Communications','Reports','Settings'
  );

-- 4. Sanity output.
SELECT '== Permissions catalogue ==' AS section;
SELECT category, COUNT(*) AS count_in_category
FROM permission
WHERE category IS NOT NULL
GROUP BY category
ORDER BY category;

SELECT '== Backfilled grants ==' AS section;
SELECT u.role_id, COUNT(DISTINCT u.id) AS users, COUNT(*) AS total_grants
FROM user_permission up
JOIN users u ON u.id = up.user_id
JOIN permission p ON p.id = up.permission_id
WHERE up.deleted_at IS NULL
  AND u.role_id IN (1, 8)
  AND p.category IS NOT NULL
GROUP BY u.role_id;
