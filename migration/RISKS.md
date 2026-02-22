# RISKS

## Format

- ID
- Date
- Severity (critical/high/medium/low)
- Description
- Mitigation
- Owner
- Status

## Risk Register

### RISK-0001

- Date: 2026-02-22
- Severity: critical
- Description: Committed secrets and API keys in legacy repository.
- Mitigation: Rotate all credentials, remove hardcoded values, enforce secret scanning in CI.
- Owner: unassigned
- Status: mitigated_pending_rotation_confirmation

### RISK-0002

- Date: 2026-02-22
- Severity: critical
- Description: Current password reset flow appears predictable or forgeable.
- Mitigation: Implement signed expiring reset tokens and invalidate on use.
- Owner: unassigned
- Status: mitigated

### RISK-0003

- Date: 2026-02-22
- Severity: high
- Description: Payment completion path may allow order/course mismatch abuse.
- Mitigation: Enforce strict server-side order ownership and amount/course binding.
- Owner: unassigned
- Status: mitigated

### RISK-0004

- Date: 2026-02-22
- Severity: high
- Description: Large rewrite could lose legacy edge behaviors.
- Mitigation: Build and maintain parity matrix and contract tests.
- Owner: unassigned
- Status: open

### RISK-0005

- Date: 2026-02-22
- Severity: high
- Description: Phase 00 smoke checks cannot be executed in this environment because PHP runtime is unavailable.
- Mitigation: Install PHP + required extensions and run PHPUnit smoke suite before phase closeout.
- Owner: unassigned
- Status: accepted_with_waiver

### RISK-0006

- Date: 2026-02-22
- Severity: high
- Description: Phase 02 dependency audit reports high-severity transitive vulnerabilities in the new JS toolchain.
- Mitigation: Run `npm audit`, triage vulnerable packages, and apply pinned upgrades before production hardening phases.
- Owner: unassigned
- Status: open
