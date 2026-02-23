# Phase 11 Test Report

## Environment

- date: 2026-02-22
- branch: main
- commit: e8a5c96c
- node: v24.10.0
- npm: 11.6.0

## Commands Run

1. `npm run lint -w @ttii/web`
2. `npm run test -w @ttii/web`
3. `npm run build -w @ttii/web`
4. `npm run lint -w @ttii/frontend-core`
5. `npm run test -w @ttii/frontend-core`
6. `npm run build -w @ttii/frontend-core`
7. `npm run lint -w @ttii/ui`
8. `npm run test -w @ttii/ui`
9. `npm run build -w @ttii/ui`
10. `npm run ci`

## Results

1. Web lint/test/build pass with new role shells and route-guarded auth bridge.
2. Web tests pass: 5/5, including Phase 11 e2e auth guards for student, centre, admin shells and forbidden cross-role check.
3. Frontend-core lint/test/build pass with shared API client/auth/error/guard modules.
4. Frontend-core tests pass: 6/6.
5. UI lint/test/build pass with new scaffold and primitive components.
6. UI tests pass: 3/3.
7. Workspace CI pass (lint + test + build across API/web/frontend-core/shared-types/ui).

## Coverage Notes

- areas covered
  - Role-based shell routing for `/student`, `/centre`, `/admin`.
  - Guard flow backed by `/api/auth/me` and `/api/auth/portal/*` auth routes.
  - Shared frontend API client envelope/error handling.
  - Shared auth provider/session persistence and logout/login path behavior.
  - Shared UI layout primitives for shell composition.
- areas not covered
  - Full portal feature-page migration (explicitly out of Phase 11 scope).
  - Legacy module-level UI parity for student/centre/admin feature screens (Phases 12 to 14).

## Defects Found

1. Web e2e auth test requires local server bind permissions; sandbox run initially failed with `EPERM` and was rerun with approved elevated execution.
2. No remaining Phase 11 exit-gate blocker after rerun and CI verification.

## Artifacts

1. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-11/web-lint.log
2. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-11/web-test.log
3. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-11/web-build.log
4. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-11/frontend-core-lint.log
5. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-11/frontend-core-test.log
6. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-11/frontend-core-build.log
7. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-11/ui-lint.log
8. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-11/ui-test.log
9. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-11/ui-build.log
10. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-11/ci.log
