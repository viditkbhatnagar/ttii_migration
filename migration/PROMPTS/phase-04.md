# Prompt: Phase 04

You are executing **Phase 04 (Auth + RBAC + Security Core)** for TTII.

## Mandatory Read First
1. `/Users/viditkbhatnagar/codes/ttii_app/migration/MASTER_CONTEXT.md`
2. `/Users/viditkbhatnagar/codes/ttii_app/migration/PHASE_STATUS.yaml`
3. `/Users/viditkbhatnagar/codes/ttii_app/migration/PARITY_MATRIX.csv`
4. `/Users/viditkbhatnagar/codes/ttii_app/migration/DECISIONS.md`
5. `/Users/viditkbhatnagar/codes/ttii_app/migration/RISKS.md`
6. `/Users/viditkbhatnagar/codes/ttii_app/migration/OPEN_ISSUES.md`
7. `/Users/viditkbhatnagar/codes/ttii_app/migration/HANDOFFS/phase-03.md`

## Phase Goal
Deliver secure and parity-aligned authentication, authorization, and account recovery.

## In Scope
1. Login/logout/session or token model.
2. RBAC middleware aligned with legacy role behavior.
3. Secure password reset token flow (signed + expiring + one-time use).
4. OTP flow without bypass backdoors.
5. Auth audit logs and rate limiting.

## Out of Scope
1. Non-auth domain features.

## Required Outputs
1. Update phase status and phase-04 handoff/test report.
2. Update risks if any auth parity/security gaps remain.

## Exit Gate
- Auth and RBAC parity tests pass.
- No insecure reset flow remains.

## Stop Rule
Stop after Phase 04 only. Do not start Phase 05.
