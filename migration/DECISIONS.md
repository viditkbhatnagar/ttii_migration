# DECISIONS

## Format

- ID: DEC-XXXX
- Date: YYYY-MM-DD
- Phase: XX
- Decision
- Rationale
- Impact
- Alternatives considered

## Decisions

### DEC-0001

- Date: 2026-02-22
- Phase: 00
- Decision: Use phase-by-phase migration with persistent on-disk context in `/migration`.
- Rationale: Multiple separate chats must preserve continuity without relying on chat memory.
- Impact: Lower context loss risk and clearer auditability.
- Alternatives considered: ad-hoc per-chat prompts only.

### DEC-0002

- Date: 2026-02-22
- Phase: 00
- Decision: Enforce parity-first migration before modernization.
- Rationale: Reduces behavior regression and production risk.
- Impact: Longer initial effort, safer cutover.
- Alternatives considered: big-bang rewrite with simultaneous redesign.

### DEC-0003

- Date: 2026-02-22
- Phase: 00
- Decision: Replace password reset links with signed, expiring tokens bound to user identity and current password hash.
- Rationale: Previous reset URLs were forgeable by user ID and non-expiring.
- Impact: Reset links now expire and auto-invalidate after password change.
- Alternatives considered: database-backed one-time reset token table (deferred to parity phase if required).

### DEC-0004

- Date: 2026-02-22
- Phase: 00
- Decision: Move Zoom SDK signature generation to server-side endpoints and remove browser/API exposure of zoom secret.
- Rationale: Client-side signature generation leaked sensitive signing material.
- Impact: Existing Zoom start flows now request short-lived signatures from server APIs.
- Alternatives considered: external JWT proxy service carrying secret as query params (rejected).

### DEC-0005

- Date: 2026-02-22
- Phase: 00
- Decision: Enforce server-side order-user-course binding checks before payment completion.
- Rationale: Prevent order hijack/mismatch abuse in payment completion endpoint.
- Impact: `complete_order` now fails closed for mismatched ownership, course, or non-pending orders.
- Alternatives considered: defer check to downstream enrollment logic (rejected).

### DEC-0006

- Date: 2026-02-22
- Phase: 00
- Decision: Externalize committed credentials to environment variables and scrub hardcoded secrets from source.
- Rationale: Static keys in repository violate baseline security and rotation policy.
- Impact: Deployment now requires populated env keys for email/SMS/S3/OpenAI/YouTube/reset token configuration.
- Alternatives considered: leave placeholders in code with runtime overrides (rejected).

### DEC-0007

- Date: 2026-02-22
- Phase: 02
- Decision: Use npm workspaces monorepo layout with `apps/api`, `apps/web`, `packages/shared-types`, and `packages/ui`.
- Rationale: Creates a clear migration target topology while preserving isolated package boundaries and shared contracts.
- Impact: Fresh clones can bootstrap the JS platform foundation from a single root `npm ci`.
- Alternatives considered: single-package codebase or `pnpm`/`turbo` introduction in the same phase.

### DEC-0008

- Date: 2026-02-22
- Phase: 02
- Decision: Standardize baseline platform checks on strict TypeScript configs, ESLint, Prettier, Vitest, and GitHub Actions (`lint` + `test` + `build`).
- Rationale: Establishes enforceable quality gates before any business logic migration begins.
- Impact: CI validates scaffold integrity and catches contract/tooling regressions early.
- Alternatives considered: defer quality gates to later phases (rejected).
