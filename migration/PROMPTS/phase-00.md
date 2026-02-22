# Prompt: Phase 00

You are executing **Phase 00 (Security Stabilization + Migration Controls)** for TTII.

## Workspace
- Root: `/Users/viditkbhatnagar/codes/ttii_app`

## Mandatory Read First
1. `/Users/viditkbhatnagar/codes/ttii_app/migration/MASTER_CONTEXT.md`
2. `/Users/viditkbhatnagar/codes/ttii_app/migration/PHASE_STATUS.yaml`
3. `/Users/viditkbhatnagar/codes/ttii_app/migration/PARITY_MATRIX.csv`
4. `/Users/viditkbhatnagar/codes/ttii_app/migration/DECISIONS.md`
5. `/Users/viditkbhatnagar/codes/ttii_app/migration/RISKS.md`
6. `/Users/viditkbhatnagar/codes/ttii_app/migration/OPEN_ISSUES.md`

## Phase Goal
Stabilize the legacy app for safe migration runway and lock migration governance artifacts.

## In Scope
1. Rotate and externalize all secrets found in repo.
2. Patch highest-risk exploit paths in legacy app without broad refactors.
3. Add/strengthen baseline smoke checks for auth, payment, and file access critical paths.
4. Finalize migration controls in `/migration`.

## Out of Scope
1. No feature migrations to Node/React yet.
2. No DB redesign.
3. No cosmetic refactors.

## Required Outputs
1. Update `/Users/viditkbhatnagar/codes/ttii_app/migration/PHASE_STATUS.yaml`
2. Write `/Users/viditkbhatnagar/codes/ttii_app/migration/HANDOFFS/phase-00.md`
3. Write `/Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/phase-00.md`
4. Update decisions/risks/issues files if changed.

## Exit Gate
- Leaked secrets rotated and removed from tracked code.
- Critical security fixes merged for reset/payment/zoom/file paths.
- Smoke tests present and passing for P0 flows.

## Stop Rule
Stop after Phase 00 only. Do not start Phase 01.

## Final Response Must Include
1. Completed items
2. Deferred items
3. Files changed
4. Tests run with outcomes
5. Open blockers
6. Exact instructions for Phase 01
