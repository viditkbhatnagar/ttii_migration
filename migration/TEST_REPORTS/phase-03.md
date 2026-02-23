# Phase 03 Test Report

## Environment

- date: 2026-02-22
- branch: n/a (workspace does not expose a `.git` directory)
- commit: n/a
- node: v24.10.0
- npm: 11.6.0

## Commands Run

1. `npm install -w @ttii/api prisma@6.16.2 @prisma/client@6.16.2 @prisma/adapter-better-sqlite3@6.16.2 mysql2 better-sqlite3`
2. `npm run db:introspect -w @ttii/api`
3. `npm run test -w @ttii/api`
4. `npm run lint -w @ttii/api`
5. `npm run build -w @ttii/api`
6. `npm run ci`

## Results

1. Prisma introspection pass: sampled parity schema introspected into 4 ORM models and Prisma client generated.
2. API data-layer tests pass: 6/6 tests green (health + repository parity + transaction rollback/error mapping).
3. API lint/build pass.
4. Workspace CI pass (lint + test + build across all workspaces).

## Coverage Notes

- areas covered
  - ORM model generation from introspected schema snapshot (`users`, `enrol`, `notification`, `notification_read`).
  - Repository soft-delete/timestamp semantics aligned to legacy `Base_model` behavior.
  - Transaction wrapper behavior and mapped data-layer error contract.
  - Read/write parity checks for sampled core entities (create/update/soft-delete/restore/unread-count).
- areas not covered
  - Live legacy MySQL introspection in this environment.
  - Full schema/entity coverage beyond sampled Phase 03 core tables.
  - Domain endpoint migrations (Phase 04+ scope).

## Defects Found

1. Prisma 7 CLI/config behavior conflicted with existing workflow and sandbox cache constraints; resolved in-phase by pinning Prisma to 6.16.2 and using driver-adapter mode for SQLite parity tests.
2. Legacy user identity columns remain ambiguous (`email` vs `user_email`), tracked as `ISSUE-0005`.

## Artifacts

1. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-03/db-introspect.log
2. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-03/ci.log
3. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-03/core-schema.sql
4. /Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/artifacts/phase-03/introspected-schema.prisma
