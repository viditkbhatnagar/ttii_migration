# Session 11: Complete Correction2.docx admin QA corrections (remainder)

## Context

QA tester delivered `TTII LMS Correction2.docx` on 2026-04-18. Session 10 (see memory files) shipped 4 of the required phases:

- **Phase A** — double-`+` global fix (`c4dbf85d`)
- **Phase B** — Course Directory field expansion (`0ccd423a`)
- **Phase C** — Subjects management overhaul (`0bbaaae5`)
- **Phase E** — View Student placeholders, Enrollments filters+View, Cohort Assignments column (`75e26ce7`)

This session (11) completes the remainder — 5 phases — without missing anything from the doc.

**Prerequisites**
- Session 10 merged. Run `git log --oneline -6 main` and confirm you see `75e26ce7 feat(admin): Phase E quick wins`.
- Production DB already has the course + subject migrations applied (via `deploy/migrations/2026-04-18-course-fields.sql` and `2026-04-18-subject-fields.sql`).
- CI + Deploy green; production healthy at `https://admin.teachersindia.in/api/health` (200).
- Read `CLAUDE.md`, `DEPLOYMENT.md`, `DEPLOYMENT.local.md`, and the memory files (`MEMORY.md`, `digitalocean-production.md`, `mysql-migration-status.md`, `webq-dns-vendor.md`).

**Reference spec source**: `/Users/viditkbhatnagar/codes/ttii_app/TTII LMS Correction2.docx` + `TTII LMS QA Corrections Report.docx` (round 1 reference). Convert to text with pandoc if needed (`pandoc -f docx -t plain "TTII LMS Correction2.docx" -o /tmp/c2.txt`). Extract images with `unzip`.

---

## Safety rules (all phases)

1. **Additive schema only.** No renames, no drops on production MariaDB. PHP LMS still runs against the same DB.
2. **Apply migrations to local docker MariaDB first** (`docker exec ttii-mysql mysql -ulms_ttii -pttii_dev_pass lms_ttii < migration.sql`), verify with `DESCRIBE`, THEN apply to production via `scp` + `ssh root@143.110.240.210 'mysql -u root -p"$(cat /etc/cyberpanel/mysqlPassword)" lms_ttii < /tmp/migration.sql'`. Get explicit user approval before touching production.
3. **Commit per phase.** Each phase = one PR-shaped commit. Auto-deploy ships on push to main.
4. **Verify before push:** `npm run build -w @ttii/api`, `VITE_API_BASE_URL="" VITE_BASE_DOMAIN="teachersindia.in" npm run build -w @ttii/web`, `npm run lint`. Zero errors required (warnings OK).
5. **After each push**, confirm `gh run list --limit 2` shows CI + Deploy green before moving to next phase.
6. **Store SQL in `deploy/migrations/YYYY-MM-DD-*.sql`.** `.gitignore` already allows `deploy/migrations/*.sql` despite the blanket `*.sql` rule.
7. **Sync branches:** `main` and `mysql-migration` should always be at the same commit. After each push to main, `git checkout mysql-migration && git merge --ff-only main && git push origin mysql-migration && git checkout main`.

---

## The 5 remaining phases

### Phase F — Programs enhancement (est. 45 min)

**Goal:** Programs Directory table shows Description column; View Program page lists linked courses as cards.

**Investigation first**
```bash
ssh root@143.110.240.210 'PASS=$(cat /etc/cyberpanel/mysqlPassword); mysql -u root -p"$PASS" -B lms_ttii -e "SELECT table_name FROM information_schema.tables WHERE table_schema=\"lms_ttii\" AND table_name LIKE \"%program%\" OR table_name LIKE \"%categor%\";"'
```

`ProgramDirectoryPage.tsx` uses `api.listPrograms()` → `/admin/programs/index`. Find the backend handler in `apps/api/src/routes/content.ts` and `apps/api/src/content/program-service.ts`. Determine which table backs it (likely `category` — Programs may be mapped to top-level categories in the PHP LMS).

**Schema (if needed)**
- If the backing table has no `description` column, add it via additive migration.
- File: `deploy/migrations/2026-04-18-program-description.sql`.

**Frontend**
- `apps/web/src/admin/pages/program/ProgramDirectoryPage.tsx`:
  - Add `{ key: 'description', label: 'Description', render: v => asString(v) || '-' }` to columns array.
  - Ensure form's Description field persists (already present per memory).
- New `apps/web/src/admin/pages/program/ViewProgramPage.tsx`:
  - Route param `:id`
  - Calls `api.getProgram(id)` (exists) + `api.listProgramCourses(id)` (may need to add)
  - Renders program metadata + courses as a responsive grid of `<Card>` elements with course thumbnail + title + level + short description.
- `apps/web/src/admin/routing/admin-routes.ts`: register `/admin/programs/view/:id`.
- `ProgramDirectoryPage` View action: route to `/admin/programs/view/:id`.

**Backend (if `listProgramCourses` missing)**
- `apps/api/src/content/program-service.ts` → `listProgramCourses(programId)` joining `course.category_id = <programId>`.
- `apps/api/src/routes/content.ts` → `GET /admin/programs/courses/:id`.

**Commit msg template**
```
feat(admin): Programs description column + View Program with courses card grid

Part 5 of Correction2.docx (Phase F). ProgramDirectoryPage table now
shows Description; new ViewProgramPage renders linked courses as a
card grid per QA spec.

(list schema changes if any)
```

---

### Phase G — Cohorts Add form: Language dropdown + multi-select Offerings (est. 1.5 hr)

**Goal:**
- Add Cohort form has a Language dropdown (wired to the real languages table)
- Add Cohort form has multi-select for Offerings (a cohort can span multiple offerings of the same course)
- Cohort Name auto-generates from Course + Subject + Month when empty

**Investigation first**
```bash
ssh root@143.110.240.210 'PASS=$(cat /etc/cyberpanel/mysqlPassword); mysql -u root -p"$PASS" -B lms_ttii -e "SHOW TABLES LIKE \"%language%\"; SHOW TABLES LIKE \"%offering%\"; SHOW COLUMNS FROM cohorts;"'
```

- Confirm `languages` table exists + its column names
- Confirm `offerings` table exists
- `cohorts` table currently has `language_id INT` (single) and no offering ref. Decide: pivot table OR store CSV. Recommend **pivot table** `cohort_offerings (cohort_id INT, offering_id INT, PRIMARY KEY (cohort_id, offering_id))`.

**Schema migration**
File: `deploy/migrations/2026-04-18-cohort-offerings-pivot.sql`
```sql
USE lms_ttii;
CREATE TABLE IF NOT EXISTS cohort_offerings (
  cohort_id INT NOT NULL,
  offering_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (cohort_id, offering_id),
  INDEX idx_cohort (cohort_id),
  INDEX idx_offering (offering_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Backend**
- Update `apps/api/prisma/schema.prisma`: add `model cohort_offerings` + relation on `cohorts`.
- `apps/api/src/operations/operations-service.ts`:
  - Extend `addAdminCohort` / `editAdminCohort` to accept `offeringIds: number[]` and write pivot rows.
  - Extend `listAdminCohorts` to return `offering_ids: number[]` + `offering_titles: string[]` via batch lookup.
- Route updates in `apps/api/src/routes/operations.ts`.

**Frontend**
- `apps/web/src/admin/pages/cohorts/AddCohortPage.tsx`:
  - Load offerings list via `api.listOfferings({ status: 'active' })` (add this frontend API method if missing).
  - Render a **multi-select** for Offerings (use existing pattern from `AssignmentsPage` or similar — likely a checkbox-grid modal like `CourseSubjectsPage`'s "Link Existing Subject").
  - Load languages via `api.loadLanguages()` (add frontend API method). Render as a `<select>` of `{ id, name }`.
  - Auto-compute Cohort Name from Course + Subject + Start-Month when user leaves title field empty.

**Commit msg**
```
feat(admin): Cohorts Add — Language dropdown + multi-select Offerings

Part 6 of Correction2.docx (Phase G). Introduces cohort_offerings
pivot so a single cohort can span multiple offerings of the same
course (e.g., self-paced + cohort-based offering running in parallel).
```

---

### Phase H — Course Offerings: Access Control + Academic Rules sections (est. 1 hr)

**Goal:** `AddOfferingPage` form has two new sections matching QA spec:
- **Access Control**: Course Expiry (self-paced only, integer days), Content Release Strategy enum (Full / Cohort Based / Subject Based)
- **Academic Rules**: Completion Policy (FK to `completion_policies` table), Certificate Rule Mapping (FK to `certificate_templates`)

**Investigation first**
```bash
ssh root@143.110.240.210 'PASS=$(cat /etc/cyberpanel/mysqlPassword); mysql -u root -p"$PASS" -B lms_ttii -e "SHOW COLUMNS FROM offerings; SHOW TABLES LIKE \"%completion%\"; SHOW TABLES LIKE \"%certificate%\";"'
```
Confirm tables exist — CompletionPoliciesPage + CertificatesPage already manage them per admin nav.

**Schema migration**
File: `deploy/migrations/2026-04-18-offering-rules.sql`
```sql
USE lms_ttii;
ALTER TABLE offerings
  ADD COLUMN IF NOT EXISTS course_expiry_days INT NULL,
  ADD COLUMN IF NOT EXISTS content_release_strategy VARCHAR(30) NULL DEFAULT 'full',
  ADD COLUMN IF NOT EXISTS completion_policy_id INT NULL,
  ADD COLUMN IF NOT EXISTS certificate_template_id INT NULL;
```

**Backend**
- `apps/api/prisma/schema.prisma`: add 4 fields on `offerings` model.
- `apps/api/src/content/offering-service.ts`:
  - Extend `OfferingInput` type + create/update/list methods to include the new fields.
  - Include foreign-key names in list response (join completion_policies.name and certificate_templates.name via batch lookup).

**Frontend**
- `apps/web/src/admin/pages/offering/AddOfferingPage.tsx`: add two new form sections after Pricing:
  - Access Control (conditional on delivery_mode): Course Expiry in days (self-paced), Content Release Strategy (select Full/Cohort/Subject).
  - Academic Rules: Completion Policy select (fetch list via `api.listCompletionPolicies()`), Certificate Template select (fetch via `api.listCertificateTemplates()`).
- `apps/web/src/admin/pages/offering/OfferingsPage.tsx`: reorder columns per spec: `# / Offering / Course / Mode / Start Date / End Date / Enrolments Ends / Pricing Type / Enrollments / Status`.

**Commit msg**
```
feat(admin): Course Offerings — Access Control + Academic Rules

Part 7 of Correction2.docx (Phase H). Four new offering fields:
course_expiry_days, content_release_strategy, completion_policy_id,
certificate_template_id. Form restructured to match QA spec layout.
```

---

### Phase I — Content Library + Quiz subsystem (est. 3–4 hrs — BIGGEST)

**Goal:** Build Content Library on a real backend (production has NO `content_asset` table; current service is a stub).

**Scope**
- New tables: `content_asset`, `quiz_question`
- Full CRUD backend service (replace the stub at `apps/api/src/content/content-asset-service.ts`)
- Extend `ContentLibraryPage` with all QA-spec fields (Subject Tag, Lesson Tag, Language) + Quiz-specific form (questions editor with 4 options, correct answer, time limit, attempts, pass marks, shuffle)
- Optional two-way: when uploading inside a lesson, auto-create a `content_asset` row so it appears in the library

**Schema migration**
File: `deploy/migrations/2026-04-18-content-asset-and-quiz.sql`
```sql
USE lms_ttii;

CREATE TABLE IF NOT EXISTS content_asset (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  summary TEXT NULL,
  asset_type VARCHAR(30) NOT NULL,  -- 'video'|'audio'|'document'|'article'|'quiz'
  subject_tag VARCHAR(100) NULL,
  lesson_tag VARCHAR(100) NULL,
  language VARCHAR(50) NULL,
  duration VARCHAR(30) NULL,
  provider VARCHAR(30) NULL,
  video_url VARCHAR(500) NULL,
  download_url VARCHAR(500) NULL,
  attachment VARCHAR(500) NULL,
  audio_file VARCHAR(500) NULL,
  thumbnail VARCHAR(500) NULL,
  tags VARCHAR(500) NULL,
  -- Quiz-specific (only used when asset_type='quiz')
  time_limit_seconds INT NULL,
  attempts_allowed INT NULL,
  pass_marks INT NULL,
  shuffle_questions TINYINT(1) NULL DEFAULT 0,
  created_by INT NULL,
  updated_by INT NULL,
  deleted_by INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  INDEX idx_asset_type (asset_type),
  INDEX idx_subject_tag (subject_tag)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS quiz_question (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  asset_id INT UNSIGNED NOT NULL,
  question TEXT NOT NULL,
  option_a TEXT NULL,
  option_b TEXT NULL,
  option_c TEXT NULL,
  option_d TEXT NULL,
  correct_answer VARCHAR(1) NOT NULL,  -- 'A'|'B'|'C'|'D'
  sort_order INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_asset (asset_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Backend**
- `apps/api/prisma/schema.prisma`: add `model content_asset` and `model quiz_question`.
- Rewrite `apps/api/src/content/content-asset-service.ts`:
  - `listAssets(filters)` — filter by asset_type, subject_tag, lesson_tag, language, search. Include question_count for quizzes via groupBy.
  - `getAsset(id)` — include nested quiz_question[] when asset_type='quiz'.
  - `createAsset(actor, input)` — insert content_asset; if asset_type='quiz', also insert provided questions.
  - `updateAsset(actor, id, input)` — update asset + replace-all semantics for questions.
  - `deleteAsset(actor, id)` — soft-delete via `deleted_at`; cascade-delete questions.
- `apps/api/src/routes/content.ts` — routes are already registered; they were calling the stub, so they work now with the real impl.

**Frontend**
- `apps/web/src/admin/pages/content_library/ContentLibraryPage.tsx`:
  - New shared fields on every asset form: Subject Tag (text), Lesson Tag (text), Language (select).
  - When `asset_type === 'quiz'`: render Quiz section with:
    - Questions array editor (add/remove/reorder). Each question: text + 4 options + radio for correct answer.
    - Auto-count shown in summary ("5 questions").
    - Time Limit (minutes), Attempts Allowed, Pass Marks, Shuffle Questions toggle.
  - For `asset_type === 'document'`: explicit "Download" button in preview dialog.
  - Table columns: `Content ID / Preview / Title / Type / Subject Tag / Lesson Tag / Duration / Created By / Created On / Action`.
- Frontend API client `apps/web/src/admin/admin-portal-api.ts`:
  - Extend create/update asset methods to accept questions array.

**Commit msg**
```
feat(admin): Content Library + Quiz subsystem (real backend + full UI)

Part 8 of Correction2.docx (Phase I). Replaces the content_asset
stub with a real implementation backed by two new production tables
(content_asset, quiz_question). Full CRUD + Quiz questions editor
with 4 options, correct answer selection, time limit, attempts,
pass marks, shuffle.

(Schema: deploy/migrations/2026-04-18-content-asset-and-quiz.sql)
```

---

### Phase J — View Student: wire 5 placeholder sections to real backend data (est. 2–3 hrs)

**Goal:** Replace the 5 placeholder cards shipped in Phase E (Documents, Performance Analytics, Certification, Communication, Activity Log) with real data.

**Per-section guidance**

**1. Documents**
- Query: `uploaded_document` / `user_uploads` / similar table. Check `/user_uploads` or `uploaded_files` via:
  `ssh ... mysql -e "SELECT table_name FROM information_schema.tables WHERE table_schema='lms_ttii' AND (table_name LIKE '%upload%' OR table_name LIKE '%document%');"`
- Render as table: filename, type, uploaded at, view/download actions.

**2. Performance Analytics**
- Aggregate: quiz avg score, assignment avg score, attendance %, course completion %.
- Source queries:
  - Quiz scores: `SELECT AVG(score) FROM quiz_attempts WHERE user_id = ?`
  - Assignment scores: `SELECT AVG(score) FROM assignment_submissions WHERE user_id = ?`
  - Attendance: from `live_class_attendance` table
- Render as 4 stat cards + a small chart if time allows (reuse existing chart lib if one is used elsewhere).

**3. Certification**
- Query `certificates` table for records where `user_id = ?`.
- Render as card grid: cert image/title + issue date + download button.

**4. Communication**
- Query `email_log`, `notification_log`, `whatsapp_log` — unified table OR 3 separate queries merged by timestamp.
- Render as timeline with icon per channel + subject + sent-at + status.

**5. Activity Log**
- Query `auth_audit_log` (this table exists — we created it in deploy session 08) filtered by `user_id`.
- Render as timeline: event (LOGIN, PASSWORD_RESET, etc.), IP, user agent, timestamp.

**Backend additions**
- New service: `apps/api/src/operations/student-analytics-service.ts` OR extend `getStudentDetail` in `operations-service.ts` to include these sections.
- New route: `GET /admin/students/:id/analytics` returning `{ documents, performance, certificates, communication, activity }`.

**Frontend**
- `apps/web/src/admin/pages/students/ViewStudentPage.tsx`:
  - Replace each placeholder card body with a `useAdminPageData` fetch + proper rendering.
  - Handle empty state per section (shown when no data).

**Commit msg**
```
feat(admin): wire ViewStudent 5 sections to real backend data

Part 9 of Correction2.docx (Phase J). Replaces the "Coming soon"
placeholders in Documents / Performance Analytics / Certification /
Communication / Activity Log with live queries.

- Documents: student document uploads
- Performance: aggregated quiz/assignment/attendance scores
- Certificates: certificates table filtered by user
- Communication: email + notification + whatsapp logs
- Activity: auth_audit_log filtered by user_id
```

---

## Definition of done

For the overall session:
- All 5 phases (F, G, H, I, J) shipped to main
- CI + Deploy green on all commits (`gh run list --limit 10` — all success)
- Production healthy: `curl https://admin.teachersindia.in/api/health` → 200
- Browser smoke test:
  - Programs list shows Description; View Program shows courses as cards
  - Add Cohort form has Language dropdown + Offerings multi-select
  - Add Offering form has Access Control + Academic Rules sections
  - Content Library creates video/document/quiz assets; Quiz asset can be saved with questions
  - View Student shows real data in the 5 sections
- Branches `main` and `mysql-migration` synced at the final commit
- Update `migration-sessions/README.md` marking session 11 done
- Update memory files (`MEMORY.md`) with Correction2.docx round marked complete

## Do NOT without explicit user approval

- Modify production DB (apply migrations only after showing user the SQL and getting approval)
- Push force or delete anything
- Run any lint/test/build bypass (`--no-verify`, etc.)
- Change production `.env` values
- Touch the existing PHP LMS (`lms.teachersindia.in` → `143.110.240.210`)
- Skip the CI green check before moving to the next phase

## Pattern to follow per phase

1. **Explore** — read current relevant files, confirm assumption.
2. **Schema** — write migration SQL, show user, apply to local docker MariaDB (`ttii-mysql` on port 3307), verify with `DESCRIBE`, show user the prod command, apply to prod after approval.
3. **Prisma** — update `schema.prisma`, run `npx prisma generate --schema prisma/schema.prisma` in `apps/api`.
4. **Backend** — update service + routes. Local build: `npm run build -w @ttii/api` must pass.
5. **Frontend** — update pages + API client. Local build: `VITE_API_BASE_URL="" VITE_BASE_DOMAIN="teachersindia.in" npm run build -w @ttii/web` must pass.
6. **Lint** — `npm run lint` must exit 0.
7. **Commit** — use the template from the phase; mention schema changes and gotchas.
8. **Push** — `git push origin main`; wait for CI + Deploy green before next phase.
9. **Sync** — `git checkout mysql-migration && git merge --ff-only main && git push && git checkout main`.

## Useful commands cheatsheet

```bash
# Investigate prod schema (read-only)
ssh root@143.110.240.210 'PASS=$(cat /etc/cyberpanel/mysqlPassword); mysql -u root -p"$PASS" -B lms_ttii -e "<SQL>"'

# Apply migration to local
docker start ttii-mysql
docker cp deploy/migrations/<file>.sql ttii-mysql:/tmp/m.sql
docker exec ttii-mysql mysql -ulms_ttii -pttii_dev_pass lms_ttii -e "SOURCE /tmp/m.sql"

# Apply migration to production (AFTER USER APPROVAL)
scp deploy/migrations/<file>.sql root@143.110.240.210:/tmp/m.sql
ssh root@143.110.240.210 'PASS=$(cat /etc/cyberpanel/mysqlPassword); mysql -u root -p"$PASS" lms_ttii < /tmp/m.sql; rm /tmp/m.sql'

# Verify CI green
gh run list --workflow=ci.yml --branch=main --limit 1 --json conclusion,displayTitle

# Verify deploy succeeded
gh run list --workflow=deploy.yml --branch=main --limit 1 --json conclusion,displayTitle
```

---

*Session 11 superprompt — written 2026-04-18. Paste the full contents of this file as the first message in a new Claude Code chat in plan mode to continue.*
