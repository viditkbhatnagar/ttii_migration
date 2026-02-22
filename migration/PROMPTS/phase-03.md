# Prompt: Phase 03

You are executing **Phase 03 (Data Layer Parity Foundation)** for TTII.

## Mandatory Read First
1. `/Users/viditkbhatnagar/codes/ttii_app/migration/MASTER_CONTEXT.md`
2. `/Users/viditkbhatnagar/codes/ttii_app/migration/PHASE_STATUS.yaml`
3. `/Users/viditkbhatnagar/codes/ttii_app/migration/PARITY_MATRIX.csv`
4. `/Users/viditkbhatnagar/codes/ttii_app/migration/DECISIONS.md`
5. `/Users/viditkbhatnagar/codes/ttii_app/migration/RISKS.md`
6. `/Users/viditkbhatnagar/codes/ttii_app/migration/OPEN_ISSUES.md`
7. `/Users/viditkbhatnagar/codes/ttii_app/migration/HANDOFFS/phase-02.md`

## Phase Goal
Connect Node data layer to existing schema with parity-safe behavior.

## In Scope
1. Introspect existing schema into ORM models.
2. Implement repository layer mirroring soft-delete/timestamps semantics.
3. Implement transaction and error patterns.
4. Add data-access tests for core entities.

## Out of Scope
1. No schema redesign.
2. No full feature migration.

## Required Outputs
1. Update phase status and handoff/test report files for phase-03.
2. Record data-layer decisions and unresolved data anomalies.

## Exit Gate
- Core read/write behavior matches legacy for sampled entities.

## Stop Rule
Stop after Phase 03 only. Do not start Phase 04.
