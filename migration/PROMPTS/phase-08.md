# Prompt: Phase 08

You are executing **Phase 08 (Domain API C: Commerce + Enrollment)** for TTII.

## Mandatory Read First
1. `/Users/viditkbhatnagar/codes/ttii_app/migration/MASTER_CONTEXT.md`
2. `/Users/viditkbhatnagar/codes/ttii_app/migration/PHASE_STATUS.yaml`
3. `/Users/viditkbhatnagar/codes/ttii_app/migration/PARITY_MATRIX.csv`
4. `/Users/viditkbhatnagar/codes/ttii_app/migration/DECISIONS.md`
5. `/Users/viditkbhatnagar/codes/ttii_app/migration/RISKS.md`
6. `/Users/viditkbhatnagar/codes/ttii_app/migration/OPEN_ISSUES.md`
7. `/Users/viditkbhatnagar/codes/ttii_app/migration/HANDOFFS/phase-07.md`

## Phase Goal
Migrate payment, coupon, order completion, and enrollment logic with anti-tampering controls.

## In Scope
1. Order creation/completion APIs.
2. Coupon application and amount calculation.
3. Enrollment side effects and fee/payment views.
4. Idempotency and signature validation tests.

## Out of Scope
1. Feed/notifications and remaining admin modules.

## Required Outputs
1. Update parity matrix statuses for commerce rows.
2. Update phase status and phase-08 handoff/test report.

## Exit Gate
- Commerce and enrollment parity verified with integration tests.
- No known order-course mismatch vulnerability in new API.

## Stop Rule
Stop after Phase 08 only. Do not start Phase 09.
