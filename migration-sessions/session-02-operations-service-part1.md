# Session 02: Fix operations-service.ts — Part 1 (admin CRUD core)

## Context
Part 1 of 2 for `apps/api/src/operations/operations-service.ts` — the biggest file in the migration (~545 errors). This session handles the first half.

**Prerequisites:** Session 01 must be completed first (auth-service fixed, committed on `mysql-migration` branch).

## Before you start
1. Read memory files:
   - `mysql-migration-status.md`
   - `mysql-field-mappings.md`
2. Verify state:
   ```
   git branch --show-current  # mysql-migration
   docker ps | grep ttii-mysql  # running on 3307
   git log --oneline -5  # last commit should be session 01's auth fix
   ```
3. Get the error count for context:
   ```
   cd apps/api
   DATABASE_URL="mysql://lms_ttii:ttii_dev_pass@localhost:3307/lms_ttii" npx tsc -p tsconfig.json --noEmit 2>&1 | grep "operations-service.ts" | wc -l
   ```

## The task (Part 1)
Fix errors in `operations-service.ts` functions related to:
- Users (listUsers, createUser, updateUser, etc.)
- Students (listStudents, createStudent, updateStudent)
- Centres (listCentres, getCentre, createCentre, updateCentre)
- Counsellors, Associates, Instructors (similar CRUD)
- Applications
- Any method that operates primarily on `users`, `students`, `centres` tables

Leave for Part 2 (next session):
- Cohorts
- Batches  
- Course-related operations
- Fee/payment admin operations
- Anything else

## Apply the same patterns as Session 01
- ID boundary conversions (String outside, Int at Prisma)
- Field renames per `mysql-field-mappings.md` memory
- Remove non-existent field references
- Handle NOT NULL fields that were nullable in Mongo

## Known schema gotchas for this session
- `users.centre_id` is `String @db.VarChar(255)` in MySQL (not ObjectId!)
- `students` table exists separately from `users` — some admin operations use `users` with `role_id=2`, others use `students` table; follow the existing code's pattern
- `centres` has no `deleted_at`; use the existing `status` field if soft-delete logic exists

## Progress check
```
cd apps/api
DATABASE_URL="mysql://lms_ttii:ttii_dev_pass@localhost:3307/lms_ttii" npx tsc -p tsconfig.json --noEmit 2>&1 | grep "operations-service.ts" | wc -l
```
Aim to reduce errors by ~250 (roughly half). Remaining errors go to Part 2.

## Definition of done
- Users/students/centres/counsellors/associates/instructors/applications CRUD methods all type-check
- Commit: `fix(mysql-migration): operations-service users/students/centres/etc`
- Update `migration-sessions/README.md`

## Not in scope
- Cohort/batch/course operations (Session 03)
- Routes file (those will be fixed later)
- Frontend
