# Phase 12 Test Report

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
10. `npm run lint -w @ttii/api`
11. `npm run test -w @ttii/api`
12. `npm run build -w @ttii/api`
13. `npm run ci`

## Results

1. Web lint passed with warnings only (no errors).
2. Web tests passed: 7/7, including:
   - Phase 11 role-shell e2e regression.
   - Phase 12 student portal e2e for P0/P1 in-scope workflows.
3. Web build passed after fixing exact optional property typing in student API request helpers.
4. Frontend-core lint/test/build passed.
5. Frontend-core tests passed: 8/8, including legacy human-readable success status handling.
6. UI lint/test/build passed.
7. UI tests passed: 3/3.
8. API lint/test/build passed.
9. API tests passed: 39/39.
10. Workspace CI passed.

## Coverage Notes

- areas covered
  - Student React portal sections: dashboard, profile, learning, assessments, payments, notifications, support.
  - Student profile update and password flows over `/api/profile/*`.
  - Assignment save + submit, exam/quiz/practice attempts, coupon + order, notification read/token save, support message submit.
  - Guarded role-shell routing regression for student/centre/admin.
- areas not covered
  - Live class web screens (`/app/live*`) not in explicit Phase 12 scope.
  - Events/calendar web screens (`/app/events*`, `/app/calendar*`) not in explicit Phase 12 scope.
  - Legacy feed web screen (`/app/feed/index`) not in explicit Phase 12 scope.

## Defects Found

1. Web e2e tests require local port bind permissions; sandbox runs fail with `EPERM` and were rerun with approved elevated execution.
2. Initial web build failed due `exactOptionalPropertyTypes` (`query/body` passed as explicit `undefined` in `StudentPortalApi`); fixed by conditional property spread in request helpers.
3. No remaining Phase 12 blocker after fixes and rerun.

## Artifacts

1. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-12/web-lint.log
2. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-12/web-test.log
3. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-12/web-build.log
4. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-12/frontend-core-lint.log
5. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-12/frontend-core-test.log
6. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-12/frontend-core-build.log
7. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-12/ui-lint.log
8. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-12/ui-test.log
9. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-12/ui-build.log
10. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-12/api-lint.log
11. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-12/api-test.log
12. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-12/api-build.log
13. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-12/ci.log
