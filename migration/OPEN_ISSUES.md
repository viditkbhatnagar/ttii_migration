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
- Status: open
