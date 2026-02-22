# Prompt: Phase 01

You are executing **Phase 01 (Legacy Inventory + Parity Contract)** for TTII.

## Workspace
- Root: `/Users/viditkbhatnagar/codes/ttii_app`

## Mandatory Read First
1. `/Users/viditkbhatnagar/codes/ttii_app/migration/MASTER_CONTEXT.md`
2. `/Users/viditkbhatnagar/codes/ttii_app/migration/PHASE_STATUS.yaml`
3. `/Users/viditkbhatnagar/codes/ttii_app/migration/PARITY_MATRIX.csv`
4. `/Users/viditkbhatnagar/codes/ttii_app/migration/DECISIONS.md`
5. `/Users/viditkbhatnagar/codes/ttii_app/migration/RISKS.md`
6. `/Users/viditkbhatnagar/codes/ttii_app/migration/OPEN_ISSUES.md`
7. `/Users/viditkbhatnagar/codes/ttii_app/migration/HANDOFFS/phase-00.md`

## Phase Goal
Build complete migration contract for feature parity.

## In Scope
1. Inventory all legacy modules/endpoints/screens by domain.
2. Populate `PARITY_MATRIX.csv` with P0/P1/P2 tagging.
3. Capture auth rules, input/output contracts, side effects, entities.
4. Define first OpenAPI draft surface based on legacy behavior.

## Out of Scope
1. No Node/React implementation.
2. No schema change.

## Required Outputs
1. Update `/Users/viditkbhatnagar/codes/ttii_app/migration/PARITY_MATRIX.csv`
2. Update `/Users/viditkbhatnagar/codes/ttii_app/migration/PHASE_STATUS.yaml`
3. Write `/Users/viditkbhatnagar/codes/ttii_app/migration/HANDOFFS/phase-01.md`
4. Write `/Users/viditkbhatnagar/codes/ttii_app/migration/TEST_REPORTS/phase-01.md`

## Exit Gate
- Every major feature represented in parity matrix.
- P0/P1 feature scope agreed and tagged.

## Stop Rule
Stop after Phase 01 only. Do not start Phase 02.

## Final Response Must Include
1. Parity matrix completion summary
2. Any unknown behavior requiring SME input
3. Next-phase setup instructions
