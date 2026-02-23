# Phase 14 Test Report

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
2. API tests passed: 39/39 (16 files).
3. API build passed.
4. Web lint passed with warnings only (0 errors, 9 warnings).
5. Web tests passed: 11/11 (5 files), including:
   - Phase 11 role-shell e2e regression.
   - Phase 12 student portal e2e regression.
   - Phase 13 centre portal e2e regression.
   - Phase 14 admin portal e2e for in-scope P0/P1 workflows.
6. Web build passed.

## Coverage Notes

- areas covered
  - Admin React portal route sections: dashboard, users, content, assessments, reports, settings.
  - Admin mutation workflows: centre onboarding, centre plan assignment, application conversion, resource folder/file operations, live class creation, settings updates.
  - Admin reporting workflows: summary and live report loading plus CSV export generation.
  - Cross-phase regression suites for role-shell guards and student/centre portals.
- areas not covered
  - Deferred non-scope admin controller families tracked in `ISSUE-0012` (Phase 15 target).
  - Prisma model expansion tasks tracked in `ISSUE-0008` to `ISSUE-0011`.

## Defects Found

1. During Phase 14 validation, admin centres listing initially failed with `Do not know how to serialize a BigInt`; fixed by normalizing SQL rows in `OperationsService.queryMany` before JSON responses.
2. Web e2e suites can fail in sandboxed runs with localhost bind permission errors (`listen EPERM`); artifact-grade web test execution required approved elevated run.

## Artifacts

1. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-14/api-lint.log
2. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-14/api-test.log
3. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-14/api-build.log
4. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-14/web-lint.log
5. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-14/web-test.log
6. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-14/web-build.log
