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
- Status: mitigated

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
- Description: Dependency audit continues to report high-severity transitive vulnerabilities in the JS toolchain (`npm audit --audit-level=high` reported 10 high findings in Phase 15).
- Mitigation: Maintain post-cutover dependency remediation backlog; pin/upgrade vulnerable transitive packages in controlled batches and rerun audit in each release gate.
- Owner: unassigned
- Status: accepted_residual_phase15

### RISK-0007

- Date: 2026-02-22
- Severity: medium
- Description: Phase 03 ORM introspection is currently based on a sampled parity schema snapshot, so production MySQL column/constraint drift could remain undiscovered until live DB introspection is executed.
- Mitigation: Run `npm run db:introspect -w @ttii/api` against the live legacy MySQL schema in a permitted environment and reconcile model diffs before feature-phase API rollout.
- Owner: unassigned
- Status: accepted_residual_phase15

### RISK-0008

- Date: 2026-02-22
- Severity: high
- Description: Phase 04 password verification currently supports the new Node scrypt format only; legacy PHP-hashed passwords in live data will need compatibility handling during rollout.
- Mitigation: Enforce controlled forced-reset migration and communication plan for accounts still using legacy hashes; keep auth rollback path documented in cutover runbook.
- Owner: unassigned
- Status: accepted_residual_phase15

### RISK-0009

- Date: 2026-02-22
- Severity: medium
- Description: OTP challenge generation/verification depends on external SMS delivery reliability and provider configuration quality.
- Mitigation: Phase 05 introduced provider-backed OTP abstraction and delivery failure handling; complete staging validation with production credentials and latency/error monitoring before cutover.
- Owner: unassigned
- Status: mitigated_pending_staging_validation

### RISK-0010

- Date: 2026-02-22
- Severity: medium
- Description: Phase 06 content endpoints currently depend on direct SQL query logic over expanded parity tables not yet represented in the Prisma model surface, increasing drift risk if schema changes silently.
- Mitigation: Keep Phase 06 contract tests as a required gate and run a follow-up Prisma introspection/model expansion for catalog-content tables before broader domain rollout.
- Owner: unassigned
- Status: accepted_residual_phase15

### RISK-0011

- Date: 2026-02-22
- Severity: medium
- Description: Phase 07 assessment scoring parity is validated with representative fixtures, but legacy question payload variance in production may still expose untested scoring edge cases.
- Mitigation: Expand assessment regression fixtures against production-like exports before cutover and keep scoring parity tests as a release gate.
- Owner: unassigned
- Status: accepted_residual_phase15

### RISK-0012

- Date: 2026-02-22
- Severity: medium
- Description: Phase 08 commerce parity currently depends on SQL-backed order/coupon/payment ledger logic over newly introduced parity tables (`create_order`, `coupon_code`, `student_fee`, `package`) that are not yet represented in Prisma models.
- Mitigation: Keep Phase 08 commerce integration tests (signature, idempotency, order binding) as a required gate and schedule ORM model expansion/introspection before production cutover.
- Owner: unassigned
- Status: accepted_residual_phase15

### RISK-0013

- Date: 2026-02-22
- Severity: medium
- Description: Phase 09 engagement/communication parity depends on SQL-backed logic over newly introduced parity tables (`feed*`, `events*`, `support_chat`, `live_class`) that are not yet represented in Prisma models.
- Mitigation: Keep Phase 09 engagement contract tests as a release gate and schedule Prisma schema introspection/model expansion for engagement-domain tables before production cutover.
- Owner: unassigned
- Status: accepted_residual_phase15

### RISK-0014

- Date: 2026-02-22
- Severity: medium
- Description: Phase 14 delivered admin portal P0/P1 in-scope parity, but several non-scope admin controller families remain deferred, leaving residual parity gaps before production cutover.
- Mitigation: Retire deferred controller families through Phase 15 decommission policy (`PM-0073` to `PM-0104`) and keep route-level rollback controls documented in cutover runbook.
- Owner: unassigned
- Status: mitigated

### RISK-0015

- Date: 2026-02-22
- Severity: medium
- Description: Phase 11 delivers role shells and route guards but intentionally defers feature-page parity to Phases 12 to 14, so future portal wiring can still introduce frontend behavior drift if shell contracts are bypassed.
- Mitigation: Keep Phase 11 role-shell auth e2e tests as a mandatory gate and extend them with portal feature route regression coverage in each subsequent frontend phase.
- Owner: unassigned
- Status: mitigated

### RISK-0016

- Date: 2026-02-22
- Severity: medium
- Description: Phase 13 validation surfaced an existing failure in the engagement contract suite (`events lifecycle parity` expected live event count), which weakens confidence in unchanged engagement regressions when cross-phase test baselines are not fully green.
- Mitigation: Track under `ISSUE-0013`, make deterministic event fixture/state setup corrections, and require a green `npm run test -w @ttii/api` gate before Phase 14 closure.
- Owner: unassigned
- Status: mitigated

### RISK-0017

- Date: 2026-02-23
- Severity: medium
- Description: Production cutover execution (traffic switch, alert wiring, and credential rotation confirmation) depends on environment-level operations outside this repository.
- Mitigation: Phase 15 handoff includes explicit canary, rollback, and decommission checklists with command-level gates and incident playbooks for operations execution.
- Owner: unassigned
- Status: mitigated_pending_ops_execution

### RISK-0018

- Date: 2026-02-23
- Severity: high
- Description: Legacy rows decommissioned in Phase 15 include some historical P0/P1 endpoints that were not migrated to the active Node/React surface, so undiscovered clients could regress if endpoint withdrawal is not traffic-validated.
- Mitigation: Enforce canary log monitoring for decommissioned route hits, hold at each ramp step, and rollback immediately if meaningful consumer traffic is detected.
- Owner: unassigned
- Status: open
