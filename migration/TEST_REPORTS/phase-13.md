# Phase 13 Test Report

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
4. `npm run lint -w @ttii/web`
5. `npm run test -w @ttii/web`
6. `npm run build -w @ttii/web`

## Results

1. API lint passed.
2. API build passed.
3. API tests failed with 1 known carryover failure:
   - `tests/engagement/engagement-contract.test.ts`
   - `Phase 09 engagement and communication parity contracts > supports events lifecycle parity including registration and feedback`
   - assertion: `expected +0 to be 1`
4. Web lint passed with warnings only (0 errors, 6 warnings).
5. Web tests passed: 9/9 (4 files), including:
   - Phase 11 role-shell e2e regression.
   - Phase 12 student portal e2e regression.
   - Phase 13 centre portal e2e for in-scope P0/P1 workflows.
6. Web build passed.

## Coverage Notes

- areas covered
  - Centre React portal route sections: dashboard, applications, students, courses, cohorts, live, resources, wallet, support/training.
  - Centre mutation workflows: application conversion, cohort and student assignment, live class creation, resource folder/file upload, wallet fund request, support messaging.
  - Role-shell and student portal cross-phase regression suites.
- areas not covered
  - Admin portal React migration and admin-specific feature workflows (Phase 14 scope).
  - Non-phase-13 backend hardening/model-expansion tasks tracked in open issues.

## Defects Found

1. Existing API engagement contract test failure (`ISSUE-0013`) remains unresolved and is retargeted to Phase 14.
2. Web e2e suites require localhost bind permissions; sandbox test runs may fail with `listen EPERM`, requiring approved elevated execution for reliable artifact runs.

## Artifacts

1. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-13/api-lint.log
2. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-13/api-test.log
3. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-13/api-build.log
4. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-13/web-lint.log
5. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-13/web-test.log
6. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-13/web-build.log
