# Phase 07 Test Report

## Environment

- date: 2026-02-22
- branch: main
- commit: e8a5c96c
- node: v24.10.0
- npm: 11.6.0

## Commands Run

1. `npm run lint -w @ttii/api`
2. `npm run test -w @ttii/api`
3. `npm run build -w @ttii/api`
4. `npm run ci`

## Results

1. API lint pass after Phase 07 assessment route and service integration.
2. API tests pass: 27/27 tests green including Phase 07 assessment contract tests.
3. API build pass (`tsc -p tsconfig.build.json`).
4. Workspace CI pass (lint/test/build across API/web/shared packages).

## Coverage Notes

- areas covered
  - Exam listing and calendar parity for `/api/exams/index` and `/api/exams/exam_calendar`.
  - Exam lifecycle parity for `/api/exams/exam_save_start` and `/api/exams/exam_save_result` including attempt and answer side effects.
  - Quiz and practice scoring parity for `/api/quiz/start_quiz`, `/api/quiz/save_quiz_result`, `/api/practice/start_practice`, and `/api/practice/save_practice_result`.
  - Assignment parity for `/api/assignment/index`, `/api/assignment/get_assignment_details`, `/api/assignment/get_assignment_evaluation`, `/api/assignment/submit_assignment`, and `/api/assignment/save_assignment`.
  - Assessment schema/bootstrap updates in `apps/api/prisma/core-schema.sql` and deterministic reset ordering in `apps/api/tests/data/test-db.ts`.
- areas not covered
  - Legacy public web assessment flows (`/exam/*`, `/quiz/*`) remain outside this API phase scope.
  - Expanded production-scale scoring fixtures are not yet complete (tracked in `ISSUE-0009`).

## Defects Found

1. Exam listing SQL filter assembly initially produced invalid query text under optional numeric filters; fixed by explicit parameterized SQL construction.
2. Date coercion mismatch in assessment date classification caused incorrect upcoming/expired tagging in SQLite-backed tests; fixed with explicit `Date` handling in service helpers.
3. Follow-up test/type defects (BigInt count assertion and strict null guard for exam iteration) were fixed; no remaining Phase 07 gate blockers.

## Artifacts

1. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-07/api-lint.log
2. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-07/api-test.log
3. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-07/api-build.log
4. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-07/ci.log
