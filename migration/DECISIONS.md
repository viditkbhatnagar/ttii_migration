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

### DEC-0009

- Date: 2026-02-22
- Phase: 03
- Decision: Use Prisma as the Node ORM foundation and generate models through `db pull` from a parity schema snapshot for sampled entities (`users`, `enrol`, `notification`, `notification_read`).
- Rationale: Provides an introspection-backed model contract and typed client while keeping Phase 03 scoped to parity-safe data access foundations.
- Impact: `apps/api` now contains an introspected Prisma schema, repeatable introspection script (`npm run db:introspect -w @ttii/api`), and a reusable ORM client layer.
- Alternatives considered: handwritten ORM entities without introspection (rejected).

### DEC-0010

- Date: 2026-02-22
- Phase: 03
- Decision: Mirror legacy data semantics in repositories by defaulting to `deleted_at IS NULL`, explicit timestamp writes, soft-delete (`deleted_at`/`deleted_by`) and restore behavior.
- Rationale: Legacy `Base_model` behavior is heavily relied on by controllers and must remain stable before endpoint migration.
- Impact: Core repositories enforce parity-safe behavior and data-layer tests assert soft-delete/read-write/transaction semantics.
- Alternatives considered: normalize to hard-deletes and strict ORM defaults in Phase 03 (rejected).

### DEC-0011

- Date: 2026-02-22
- Phase: 04
- Decision: Implement API authentication as DB-backed opaque session tokens (stored hashed) with explicit logout revocation, expiry checks, and auth audit logging.
- Rationale: Matches legacy `auth_token` transport while enabling server-side revocation and better forensic visibility for auth/rate-limit/RBAC failures.
- Impact: Protected API routes now enforce active session records, logout immediately revokes tokens, and auth events are persisted in `auth_audit_log`.
- Alternatives considered: stateless JWT-only validation without session persistence (rejected for weak revocation control).

### DEC-0012

- Date: 2026-02-22
- Phase: 04
- Decision: Enforce password reset and OTP as signed/hashed challenge records with expiry, one-time-use, and rate limits.
- Rationale: Removes legacy reset/OTP replay and bypass risk while preserving compatibility-oriented route contracts.
- Impact: Reset links require valid signature plus unused DB token state; OTP verification uses hashed challenges with attempt limits and no backdoor values.
- Alternatives considered: purely stateless reset/OTP tokens without persistence (rejected because one-time semantics and replay detection are weaker).

### DEC-0013

- Date: 2026-02-22
- Phase: 05
- Decision: Introduce a typed integration registry (`IntegrationRegistry`) and enforce provider access through explicit contracts only.
- Rationale: Domain services must remain decoupled from provider SDKs/endpoints to preserve parity-safe behavior while allowing provider swaps.
- Impact: Node services now consume integrations via these contracts:
  - `EmailProvider.sendEmail` for transactional email dispatch.
  - `OtpProvider.sendOtp` for SMS/OTP delivery.
  - `StorageProvider.uploadObject|deleteObject|createSignedDownloadUrl` for local/S3-compatible file operations.
  - `PaymentGateway.createOrder|verifyPaymentSignature|verifyWebhookSignature` for payment order/signature workflows.
  - `ZoomProvider.generateSdkSignature` for server-side Zoom SDK signature generation.
  - `OpenAiProvider.createChatCompletion` for OpenAI chat calls with retry/safe logging.
- Alternatives considered: direct provider SDK usage inside each domain service (rejected due tight coupling and testing overhead).

### DEC-0014

- Date: 2026-02-22
- Phase: 05
- Decision: Default integration providers to non-network-safe adapters (`console`/`mock`/`local`) and require explicit env selection for live providers (`brevo`, `http otp`, `s3`, `razorpay`, `openai`).
- Rationale: Keeps local/test runs deterministic and secure while preserving production opt-in for real external services.
- Impact: Auth reset/OTP flows now dispatch through integration interfaces with delivery failure handling; payment/zoom/openai/storage providers can be switched by environment without domain code changes.
- Alternatives considered: fail startup without live provider credentials in all environments (rejected because local/test ergonomics and parity tests would be blocked).

### DEC-0015

- Date: 2026-02-22
- Phase: 06
- Decision: Implement Phase 06 catalog/content parity endpoints through a dedicated `ContentService` backed by SQL queries over parity tables, while preserving legacy response shapes and GET-based progress mutations.
- Rationale: Current Prisma model coverage is intentionally limited to earlier phases, so parity-safe content delivery required direct query access without expanding typed model dependency surface during this phase.
- Impact: `/api/category/*`, `/api/course/*` (catalog + subject/lesson), `/api/lesson/index`, and `/api/lesson_file/*` (content retrieval + progress + streak) now run in Node with legacy-compatible contracts and side effects.
- Alternatives considered: full Prisma model regeneration for all catalog/content tables before route migration (deferred to avoid widening schema-change risk during parity-first API delivery).

### DEC-0016

- Date: 2026-02-22
- Phase: 07
- Decision: Deliver assessment API parity through a dedicated `AssessmentService` with SQL-backed scoring and attempt persistence for exams, quiz, practice, and assignment flows.
- Rationale: Assessment parity requires strict legacy scoring formulas and side effects across tables that are not yet fully represented by the current Prisma model surface.
- Impact: `/api/exams/*`, `/api/quiz/*`, `/api/practice/*`, and `/api/assignment/*` now run in Node with legacy-compatible scoring behavior, persistence side effects, and regression coverage.
- Alternatives considered: defer assessment migration until full Prisma assessment model generation (rejected due Phase 07 gate and parity regression risk).

### DEC-0017

- Date: 2026-02-22
- Phase: 08
- Decision: Implement commerce/enrollment parity through a dedicated SQL-backed `CommerceService` that enforces strict `create_order` ownership/course/status binding and gateway signature checks before payment completion side effects.
- Rationale: Legacy payment completion relies on fragile request context and must fail closed against order hijack, course mismatch, and replay/duplicate payment completion risks while preserving route contracts.
- Impact: `/api/packages/index` and `/api/payment/*` Phase 08 endpoints now run in Node with parity response envelopes, coupon/payment math, enrollment/payment ledger side effects, and integration tests for signature validation + idempotency.
- Alternatives considered: reuse mock gateway verification only and rely on post-payment reconciliation (rejected due weak anti-tampering guarantees at API boundary).

### DEC-0018

- Date: 2026-02-22
- Phase: 09
- Decision: Deliver engagement and communication parity through a dedicated SQL-backed `EngagementService` and grouped engagement routes preserving legacy contracts (including GET-based mutations and mixed status payload conventions).
- Rationale: Feed/events/review/notification/support flows span tables not yet represented in Prisma models and include legacy response quirks that must be preserved for client compatibility at this stage.
- Impact: `/api/feed/*`, `/api/review/*`, `/api/home/get_notification*`, `/api/events/*`, `/api/my_task/index`, and `/api/support/*` now run in Node with parity-safe side effects and dedicated Phase 09 contract tests.
- Alternatives considered: delay engagement migration until full Prisma model expansion for engagement tables (rejected due Phase 09 gate and parity schedule).

### DEC-0019

- Date: 2026-02-22
- Phase: 10
- Decision: Deliver Phase 10 admin and centre backend operations parity through a dedicated SQL-backed `OperationsService` and grouped role-gated routes for applications students centres cohorts live resources settings and reporting/export workflows.
- Rationale: Admin and centre operational APIs span tables with limited Prisma model coverage and require preserving legacy response contracts and side effects while enforcing stricter role gating at the API boundary.
- Impact: `/api/admin/*` and `/api/centre/*` operational endpoints in Phase 10 now run in Node with parity-safe side effects and contract tests; non-phase controller groups are explicitly deferred and tracked.
- Alternatives considered: full admin and centre controller migration in one phase (rejected due scope risk and regression likelihood).

### DEC-0020

- Date: 2026-02-22
- Phase: 11
- Decision: Introduce a shared frontend foundation package (`@ttii/frontend-core`) for legacy API client/auth state/error handling and implement guarded student/centre/admin role shells in React before feature-page migration.
- Rationale: Phases 12 to 14 require consistent auth/session/RBAC behavior and reusable shell/layout primitives so portal feature work does not duplicate infrastructure or drift from API auth contracts.
- Impact: Web foundation now routes role shells through `/student`, `/centre`, and `/admin`; each shell checks `/api/auth/me` and `/api/auth/portal/*` guards, and shared UI primitives/layouts are consumed from `@ttii/ui`.
- Alternatives considered: separate app implementations per role in this phase with duplicated auth client and guard logic (rejected due avoidable drift and higher migration cost).

### DEC-0021

- Date: 2026-02-22
- Phase: 12
- Decision: Deliver student portal UI parity through one guarded React route surface (`/student/*`) composed of section routes (dashboard, profile, learning, assessments, payments, notifications, support) backed by a dedicated `StudentPortalApi`.
- Rationale: A single route surface with explicit section loading keeps auth/routing behavior consistent with Phase 11 shells while enabling parity-safe migration of student workflows without introducing multiple ad hoc state models.
- Impact: Student-facing P0/P1 workflows in scope now run through React with shared API contract handling and end-to-end student portal regression coverage.
- Alternatives considered: migrate each student legacy page as isolated route modules with duplicated API wiring (rejected due higher regression and maintenance risk).

### DEC-0022

- Date: 2026-02-22
- Phase: 13
- Decision: Deliver centre portal parity through a single guarded React route surface (`/centre/*`) backed by a dedicated `CentrePortalApi` and extend operations routes for deferred centre dashboard, courses, wallet, support, and training endpoints.
- Rationale: Consolidating centre workflows under one route surface keeps role guard behavior consistent with Phase 11 shells, while dedicated API adapters and missing operations endpoints close the remaining centre P0/P1 parity gaps without coupling UI state directly to route handlers.
- Impact: Centre P0/P1 workflows (dashboard, applications, students, cohorts, live class, resources, wallet, support/training) now run through React with route-level parity tests, and backend operations now includes centre wallet/support/training APIs and required parity tables.
- Alternatives considered: keep mixed legacy Centre/index rendering while only adding isolated React pages (rejected due inconsistent guards, fragmented state, and higher regression risk).

### DEC-0023

- Date: 2026-02-22
- Phase: 14
- Decision: Deliver admin portal parity through one guarded React route surface (`/admin/*`) with section modules (dashboard, users, content, assessments, reports, settings) backed by a dedicated `AdminPortalApi` over legacy-compatible operations endpoints.
- Rationale: Admin parity requires a coordinated route shell and shared API adapter so high-volume table and form workflows can migrate without duplicating auth/error/session handling or diverging from legacy response contracts.
- Impact: Admin P0/P1 in-scope workflows now run in React with e2e regression coverage, report exports are exercised through the portal, and operations SQL responses are normalized for JSON compatibility (including BigInt-safe serialization).
- Alternatives considered: migrate admin pages one controller at a time with mixed legacy view rendering (rejected due fragmented navigation state and higher parity regression risk).

### DEC-0024

- Date: 2026-02-23
- Phase: 15
- Decision: Execute production cutover using explicit route-switch modes (`legacy`, `canary`, `node`) with progressive traffic weights and hard rollback triggers.
- Rationale: Final migration cutover needs low-blast-radius rollout and deterministic rollback criteria to avoid prolonged mixed-runtime incident windows.
- Impact: Phase 15 handoff now defines canary steps (5% -> 25% -> 50% -> 100%), route-switch controls, SLO/alert thresholds, and rollback execution order for API/web traffic.
- Alternatives considered: single-step big-bang cutover with manual rollback only (rejected for high operational risk).

### DEC-0025

- Date: 2026-02-23
- Phase: 15
- Decision: Retire deferred legacy admin controller families by decommission policy instead of implementing new parity code during final phase.
- Rationale: Phase 15 scope excludes new feature development; deferred controllers are outside active React+Node portal workflows and are removed with legacy PHP runtime shutdown.
- Impact: Legacy-only parity rows are marked `decommissioned_phase15` (including deferred admin families `PM-0073` to `PM-0104` and unmigrated legacy web/mobile utility surfaces), `ISSUE-0012` is closed by retirement, and decommission checklist now enforces route removal and rollback fallback plan.
- Alternatives considered: migrate all deferred admin families to Node in final phase (rejected due scope violation and regression risk).

### DEC-0026

- Date: 2026-02-23
- Phase: 15
- Decision: Carry forward unresolved dependency/security and model-introspection debt as explicit residual risk register items after cutover.
- Rationale: `npm audit` still reports high-severity advisories and Prisma model expansion tasks are not prerequisite for currently validated SQL-backed parity behavior.
- Impact: `ISSUE-0003`, `ISSUE-0004`, and `ISSUE-0008` to `ISSUE-0011` are reclassified as post-cutover hardening backlog with monitoring and scheduled follow-up ownership required.
- Alternatives considered: block Phase 15 completion until all dependency and model debt is eliminated (rejected due final-phase stop rule and larger migration timeline risk).
