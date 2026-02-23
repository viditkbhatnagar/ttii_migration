# OPEN_ISSUES

Track unresolved blockers across phases.

## Format

- ISSUE-ID
- Phase discovered
- Description
- Dependency
- Owner
- Target phase
- Status

## Open Issues

### ISSUE-0001

- Phase discovered: 00
- Description: Operational credential rotation (DB/OpenAI/Brevo/SMS/S3/YouTube/JWT/reset key) must be completed in the target environments after code-level secret scrubbing.
- Dependency: Infrastructure/Secrets manager access
- Owner: unassigned
- Target phase: 00
- Status: open

### ISSUE-0002

- Phase discovered: 00
- Description: PHP runtime is not installed in this execution environment, blocking execution of Phase 00 PHPUnit smoke checks.
- Dependency: Runtime provisioning
- Owner: unassigned
- Target phase: 00
- Status: waived_for_phase00

### ISSUE-0003

- Phase discovered: 02
- Description: New JS monorepo dependencies currently surface high-severity advisories in `npm audit`; remediation plan must be executed before production phases.
- Dependency: Dependency upgrade compatibility review
- Owner: unassigned
- Target phase: 03
- Status: accepted_residual_phase15

### ISSUE-0004

- Phase discovered: 03
- Description: Live MySQL schema introspection for Node ORM models has not yet been run in an environment with direct access to the legacy database; current Phase 03 models are based on a sampled parity snapshot.
- Dependency: Environment with legacy MySQL connectivity and permissions to introspect schema metadata
- Owner: unassigned
- Target phase: 04
- Status: accepted_residual_phase15

### ISSUE-0005

- Phase discovered: 03
- Description: Legacy auth paths inconsistently reference `users.user_email` and `users.email`; final canonical usage and nullability rules need SME confirmation before auth endpoint parity migration.
- Dependency: Legacy SME validation on identity fields and login flows
- Owner: unassigned
- Target phase: 04
- Status: resolved_phase04

### ISSUE-0006

- Phase discovered: 04
- Description: Node auth currently verifies only the new scrypt password format; legacy PHP password hash compatibility (or forced reset strategy) is still required for production parity rollout.
- Dependency: Legacy password hash migration strategy and/or compatibility implementation
- Owner: unassigned
- Target phase: 15
- Status: accepted_residual_phase15

### ISSUE-0007

- Phase discovered: 04
- Description: OTP flow is challenge-secure but SMS provider delivery wiring is pending integration-phase implementation.
- Dependency: External SMS provider integration and credentials in target environments
- Owner: unassigned
- Target phase: 05
- Status: resolved_phase05

### ISSUE-0008

- Phase discovered: 06
- Description: Catalog/content parity endpoints currently rely on direct SQL query logic because Prisma models do not yet include the full content table surface (`category`, `course`, `subject`, `lesson`, `lesson_files`, and related progress tables).
- Dependency: Schema introspection/model expansion and compatibility validation for content-domain tables
- Owner: unassigned
- Target phase: 15
- Status: accepted_residual_phase15

### ISSUE-0009

- Phase discovered: 07
- Description: Assessment scoring parity is covered by representative fixtures, but broader production-like question payload variants still need regression coverage expansion.
- Dependency: Access to production-like anonymized assessment datasets for fixture generation
- Owner: unassigned
- Target phase: 15
- Status: accepted_residual_phase15

### ISSUE-0010

- Phase discovered: 08
- Description: Commerce/enrollment parity endpoints currently rely on SQL query logic over parity tables (`create_order`, `coupon_code`, `package`, `subject_package`, `student_fee`) that are not yet represented in Prisma models.
- Dependency: Commerce-domain schema introspection/model expansion with compatibility validation for payment/coupon/order flows
- Owner: unassigned
- Target phase: 15
- Status: accepted_residual_phase15

### ISSUE-0011

- Phase discovered: 09
- Description: Engagement/communication parity endpoints rely on SQL query logic over newly introduced parity tables (`feed`, `feed_like`, `feed_watched`, `feed_comments`, `events`, `event_registration`, `recorded_events`, `support_chat`, `live_class`) that are not yet represented in Prisma models.
- Dependency: Engagement-domain schema introspection/model expansion with compatibility validation for feed/events/notification/support flows
- Owner: unassigned
- Target phase: 15
- Status: accepted_residual_phase15

### ISSUE-0012

- Phase discovered: 10
- Description: After Phase 14 admin portal migration, deferred non-scope admin controller families were retired through Phase 15 legacy decommission policy (`PM-0073` to `PM-0104`).
- Dependency: Legacy runtime decommission execution and route withdrawal confirmation
- Owner: unassigned
- Target phase: 15
- Status: resolved_phase15_decommissioned

### ISSUE-0013

- Phase discovered: 13
- Description: API engagement contract regression (`supports events lifecycle parity including registration and feedback`) was failing in Phase 13 baseline and required deterministic fixture/state corrections before Phase 14 closure.
- Dependency: Engagement fixture/state investigation and deterministic assertion/data setup correction
- Owner: unassigned
- Target phase: 14
- Status: resolved_phase14

### ISSUE-0014

- Phase discovered: 15
- Description: Decommissioned legacy endpoints (including P0/P1 legacy-only rows) require production traffic validation to confirm there are no undiscovered active consumers before permanent runtime shutdown.
- Dependency: Production access logs/metrics and canary observability during route withdrawal
- Owner: unassigned
- Target phase: 15
- Status: open
