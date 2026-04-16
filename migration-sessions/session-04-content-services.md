# Session 04: Fix content services

## Context
Fix the content domain service files:
- `apps/api/src/content/content-service.ts` (~167 errors)
- `apps/api/src/content/content-asset-service.ts` (~27 errors)
- `apps/api/src/content/offering-service.ts` (~23 errors)
- `apps/api/src/content/certificate-service.ts` (~20 errors)
- `apps/api/src/content/program-service.ts` (~18 errors)

Total target: ~255 errors resolved.

**Prerequisites:** Sessions 01–03 completed.

## Before you start
1. Read memory files: `mysql-migration-status.md`, `mysql-field-mappings.md`
2. Verify state: on `mysql-migration` branch, local MariaDB running

## The task
Apply the established patterns to all 5 content service files:
- ID boundary conversion (String external / Int at DB)
- Field renames per memory
- Remove non-existent fields
- Handle NOT NULL where it was nullable

## Tables this session touches
- `course`, `course_subjects`, `course_chapter`, `course_lessons`, `course_fees`
- `lessons_content`, `lesson_video_log`, `video_progress_status`
- `offering`, `offering_mappings` (if exist)
- `certificate`, `certificate_templates`
- `program`, `program_courses` (if exist)
- `content_assets`, `books`, `books_chapters`

## Progress check
```
cd apps/api
DATABASE_URL="mysql://lms_ttii:ttii_dev_pass@localhost:3307/lms_ttii" npx tsc -p tsconfig.json --noEmit 2>&1 | grep -E "content-service|content-asset|offering-service|certificate-service|program-service" | wc -l
```
Target: 0.

## Definition of done
- All 5 content files type-check
- Commit: `fix(mysql-migration): content services domain`
- Update `migration-sessions/README.md`

## Not in scope
- Routes (pick up in Session 06)
- Frontend
