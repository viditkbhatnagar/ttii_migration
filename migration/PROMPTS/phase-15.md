# Prompt: Phase 15

You are executing **Phase 15 (Hardening + Cutover + Decommission)** for TTII.

## Mandatory Read First
1. `/Users/viditkbhatnagar/codes/ttii_app/migration/MASTER_CONTEXT.md`
2. `/Users/viditkbhatnagar/codes/ttii_app/migration/PHASE_STATUS.yaml`
3. `/Users/viditkbhatnagar/codes/ttii_app/migration/PARITY_MATRIX.csv`
4. `/Users/viditkbhatnagar/codes/ttii_app/migration/DECISIONS.md`
5. `/Users/viditkbhatnagar/codes/ttii_app/migration/RISKS.md`
6. `/Users/viditkbhatnagar/codes/ttii_app/migration/OPEN_ISSUES.md`
7. `/Users/viditkbhatnagar/codes/ttii_app/migration/HANDOFFS/phase-14.md`

## Phase Goal
Production hardening, traffic cutover, and retirement of legacy PHP runtime.

## In Scope
1. Full regression and security/performance testing.
2. Canary rollout and route-switch controls.
3. Monitoring, alerting, incident playbooks.
4. Cutover and rollback runbooks.
5. Legacy decommission checklist and execution.

## Out of Scope
1. New feature development.

## Required Outputs
1. Final update to phase status.
2. `/Users/viditkbhatnagar/codes/ttii_app/migration/HANDOFFS/phase-15.md`
3. `/Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/phase-15.md`
4. Final migration summary with residual risks.

## Exit Gate
- P0/P1 parity complete in production.
- Rollback path validated.
- Legacy PHP runtime decommissioned safely.

## Stop Rule
This is the final phase.
