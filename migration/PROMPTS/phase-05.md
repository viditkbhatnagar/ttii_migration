# Prompt: Phase 05

You are executing **Phase 05 (Integrations Layer)** for TTII.

## Mandatory Read First
1. `/Users/viditkbhatnagar/codes/ttii_app/migration/MASTER_CONTEXT.md`
2. `/Users/viditkbhatnagar/codes/ttii_app/migration/PHASE_STATUS.yaml`
3. `/Users/viditkbhatnagar/codes/ttii_app/migration/PARITY_MATRIX.csv`
4. `/Users/viditkbhatnagar/codes/ttii_app/migration/DECISIONS.md`
5. `/Users/viditkbhatnagar/codes/ttii_app/migration/RISKS.md`
6. `/Users/viditkbhatnagar/codes/ttii_app/migration/OPEN_ISSUES.md`
7. `/Users/viditkbhatnagar/codes/ttii_app/migration/HANDOFFS/phase-04.md`

## Phase Goal
Implement integration wrappers to decouple domain logic from providers.

## In Scope
1. Email provider abstraction.
2. SMS/OTP provider abstraction.
3. Storage abstraction for local/S3.
4. Payment gateway abstraction with signature checks.
5. Zoom abstraction with server-side signature generation.
6. OpenAI abstraction with safe logging and retry policy.

## Out of Scope
1. Full domain API migration.

## Required Outputs
1. Update phase status and phase-05 handoff/test report.
2. Document provider contracts in decisions.

## Exit Gate
- Domain modules can consume integrations through typed interfaces only.

## Stop Rule
Stop after Phase 05 only. Do not start Phase 06.
