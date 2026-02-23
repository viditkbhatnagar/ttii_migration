# Phase 10 Test Report

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

1. API lint pass after Phase 10 operations route and service integration.
2. API tests pass: 39/39 tests green including new Phase 10 operations contract coverage.
3. API build pass (`tsc -p tsconfig.build.json`).
4. Workspace CI pass (lint test build across API web and shared packages).

## Coverage Notes

- areas covered
  - Admin and centre operational API parity for applications students centres cohorts live resources settings and reporting exports.
  - Admin and centre role-gate enforcement on `/api/admin/*` and `/api/centre/*` operations endpoints.
  - Export parity for `/api/admin/reports/export` including summary CSV and live report CSV response flows.
  - Reporting parity for `/api/admin/live_report/index`, `/api/admin/global_calender/index`, and `/api/admin/reports/index`.
  - Phase 10 parity schema and reset updates in `apps/api/prisma/core-schema.sql` and `apps/api/tests/data/test-db.ts`.
- areas not covered
  - Deferred admin and centre controller groups marked `deferred_phase10` in parity rows (`PM-0063`, `PM-0066`, `PM-0070` to `PM-0076`, `PM-0079` to `PM-0088`, `PM-0091`, `PM-0092`, `PM-0094` to `PM-0104`).
  - Portal UI migration remains out of backend Phase 10 scope.

## Defects Found

1. Initial global calendar query used `exam.date`; fixed to `exam.from_date` for schema parity before final green test run.
2. No remaining Phase 10 exit-gate blocker in the backend scope.

## Artifacts

1. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-10/api-lint.log
2. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-10/api-test.log
3. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-10/api-build.log
4. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-10/ci.log
