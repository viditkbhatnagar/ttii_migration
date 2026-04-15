# Session 03: Fix operations-service.ts — Part 2 (cohorts/batches/courses)

## Context
Part 2 of 2 for `operations-service.ts`. Continues from Session 02 which handled users/students/centres.

**Prerequisites:** Session 02 must be completed.

## Before you start
1. Read memory files: `mysql-migration-status.md`, `mysql-field-mappings.md`
2. Verify state:
   ```
   git branch --show-current  # mysql-migration
   docker ps | grep ttii-mysql
   git log --oneline -5  # last commit should be Session 02's ops part 1
   cd apps/api
   DATABASE_URL="mysql://lms_ttii:ttii_dev_pass@localhost:3307/lms_ttii" npx tsc -p tsconfig.json --noEmit 2>&1 | grep "operations-service.ts" | wc -l
   ```

## The task (Part 2)
Fix remaining errors in `operations-service.ts`:
- Cohorts (cohorts, cohort_students, cohort_announcements)
- Batches (batch, batch_students)
- Course admin operations (course, course_fees, course_subjects, course_plans)
- Fee/payment admin operations (centre_course_plans, fee_installments)
- Any remaining methods

## Apply the established patterns
Same as Session 02 — ID boundary conversion, field renames, nullability fixes.

## Known gotchas
- `cohort_students` is a join table with no FK relations — manual merge via Map after fetching both sides
- `batch_students` similar
- `course_fees` likely has integer IDs for `course_id`

## Progress check
Target: `operations-service.ts` errors → 0

## Definition of done
- `operations-service.ts` fully type-checks
- Any routes in `apps/api/src/routes/operations.ts` that directly break also fixed  
- Commit: `fix(mysql-migration): operations-service cohorts/batches/courses`
- Update `migration-sessions/README.md`

## Not in scope
- Other service files
- Frontend
