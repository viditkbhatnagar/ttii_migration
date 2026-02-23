# Phase 15 Test Report

## Environment

- date: 2026-02-23
- branch: main
- commit: e8a5c96c
- node: v24.10.0
- npm: 11.6.0

## Commands Run

1. `npm run lint -w @ttii/api`
2. `npm run test -w @ttii/api`
3. `npm run build -w @ttii/api`
4. `npm run lint -w @ttii/web`
5. `npm run test -w @ttii/web` (initial sandbox run failed with localhost bind EPERM)
6. `npm run test -w @ttii/web` (rerun with elevated execution; passed)
7. `npm run build -w @ttii/web`
8. `npm run lint -w @ttii/frontend-core`
9. `npm run test -w @ttii/frontend-core`
10. `npm run build -w @ttii/frontend-core`
11. `npm run lint -w @ttii/ui`
12. `npm run test -w @ttii/ui`
13. `npm run build -w @ttii/ui`
14. `npm run ci` (elevated run for reliable e2e localhost binding)
15. `npm audit --audit-level=high`
16. API health performance smoke (50 repeated requests against `/api/health` on local built API)

## Results

1. API lint passed.
2. API tests passed: 39/39 (16 files).
3. API build passed.
4. Web lint passed with warnings only (0 errors, 9 warnings).
5. Web tests passed after elevated rerun: 11/11 (5 files), including role-shell/student/centre/admin e2e suites.
6. Web build passed.
7. Frontend-core lint/test/build passed (8 tests).
8. UI lint/test/build passed (3 tests).
9. Root CI gate passed (`lint`, `test`, `build` across workspaces).
10. Security audit reported 10 high-severity vulnerabilities (transitive ESLint/typescript-eslint/minimatch chain).
11. API performance smoke passed: 50/50 successful requests; avg latency `0.001053s`, p95 `0.001514s`, max `0.007186s`.

## Coverage Notes

- areas covered
  - Full workspace regression gates including API contract/integration tests and all React portal e2e suites.
  - Security baseline scan with `npm audit` evidence artifact.
  - Build artifact verification and bundle output for web production build.
  - Basic API runtime latency smoke under local cutover-like binary (`apps/api/dist/index.js`).
- areas not covered
  - Live production/staging traffic canary telemetry execution (documented in cutover runbook; requires environment operations access).
  - Legacy PHP hash compatibility migration remains policy-based residual risk (forced reset path), not code-level compatibility in this phase.
  - Production traffic validation for decommissioned legacy-only endpoint families remains pending (`ISSUE-0014`).

## Defects Found

1. Sandbox environment blocks localhost bindings used by web e2e harness (`listen EPERM` on `127.0.0.1:4311-4314`); resolved by elevated rerun for artifact-grade test execution.
2. `npm audit` still reports 10 high vulnerabilities; tracked as residual hardening backlog (`ISSUE-0003`, `RISK-0006`).

## Artifacts

1. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-15/api-lint.log
2. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-15/api-test.log
3. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-15/api-build.log
4. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-15/web-lint.log
5. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-15/web-test.log
6. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-15/web-build.log
7. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-15/frontend-core-lint.log
8. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-15/frontend-core-test.log
9. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-15/frontend-core-build.log
10. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-15/ui-lint.log
11. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-15/ui-test.log
12. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-15/ui-build.log
13. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-15/ci.log
14. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-15/npm-audit.txt
15. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-15/api-perf-smoke.txt
