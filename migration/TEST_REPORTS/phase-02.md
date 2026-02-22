# Phase 02 Test Report

## Environment

- date: 2026-02-22
- branch: n/a (workspace does not expose a `.git` directory)
- commit: n/a
- node: v24.10.0
- npm: 11.6.0

## Commands Run

1. `npm install`
2. `npm run format`
3. `npm run ci`
4. `docker compose config` (with temporary `.env` copied from `.env.example`)
5. `API_HOST=127.0.0.1 API_PORT=4100 node apps/api/dist/index.js` + `curl http://127.0.0.1:4100/api/health`
6. `WEB_PORT=5174 npm run dev -w @ttii/web -- --host 127.0.0.1` + `curl http://127.0.0.1:5174`
7. `npm audit --audit-level=high`

## Results

1. `npm run format`: pass (scoped monorepo files are Prettier-compliant).
2. `npm run ci`: pass.
   - lint: pass
   - tests: pass (4 test files / 4 tests)
   - build: pass (API TS build, shared package builds, Vite web build)
3. `docker compose config`: pass (compose file validates).
4. API boot smoke: pass (`/api/health` responded with status `ok`).
5. Web boot smoke: pass (index HTML served on configured port).
6. `npm audit`: reported 10 high-severity transitive vulnerabilities.

## Coverage Notes

- areas covered
  - Monorepo dependency install and workspace script execution.
  - Static checks (lint/format), test scaffolding, and build pipeline behavior.
  - Runtime startup smoke for API and web entry points.
  - Docker compose structural validation.
- areas not covered
  - No domain/business behavior parity tests (explicitly out of Phase 02 scope).
  - No end-to-end flow against migrated business features.
  - No production deployment validation.

## Defects Found

1. `npm audit` reported high-severity transitive dependency advisories; tracked as `RISK-0006` and `ISSUE-0003`.

## Artifacts

1. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-02/ci.log
2. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-02/docker-compose.config.txt
3. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-02/api-boot.log
4. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-02/api-health.json
5. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-02/web-boot.log
6. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-02/web-index.html
7. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-02/npm-audit.txt
