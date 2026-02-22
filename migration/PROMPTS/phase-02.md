# Prompt: Phase 02

You are executing **Phase 02 (Monorepo + Platform Foundation)** for TTII.

## Workspace
- Root: `/Users/viditkbhatnagar/codes/ttii_app`

## Mandatory Read First
1. `/Users/viditkbhatnagar/codes/ttii_app/migration/MASTER_CONTEXT.md`
2. `/Users/viditkbhatnagar/codes/ttii_app/migration/PHASE_STATUS.yaml`
3. `/Users/viditkbhatnagar/codes/ttii_app/migration/PARITY_MATRIX.csv`
4. `/Users/viditkbhatnagar/codes/ttii_app/migration/DECISIONS.md`
5. `/Users/viditkbhatnagar/codes/ttii_app/migration/RISKS.md`
6. `/Users/viditkbhatnagar/codes/ttii_app/migration/OPEN_ISSUES.md`
7. `/Users/viditkbhatnagar/codes/ttii_app/migration/HANDOFFS/phase-01.md`

## Phase Goal
Create production-grade JS monorepo foundation without migrating business logic.

## In Scope
1. Monorepo structure for API and web apps.
2. TypeScript strict configs, lint, format, test scaffolding.
3. Dockerized local stack and env convention.
4. CI pipeline: lint/test/build.
5. Shared packages skeleton (`shared-types`, `ui`, etc.).

## Out of Scope
1. No domain feature migration.
2. No parity claims for business logic.

## Required Outputs
1. Update `/Users/viditkbhatnagar/codes/ttii_app/migration/PHASE_STATUS.yaml`
2. Write `/Users/viditkbhatnagar/codes/ttii_app/migration/HANDOFFS/phase-02.md`
3. Write `/Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/phase-02.md`
4. Update decisions/risks as needed.

## Exit Gate
- Fresh clone boots locally with documented commands.
- CI passes baseline checks.

## Stop Rule
Stop after Phase 02 only. Do not start Phase 03.
