# Secure Software Development Lifecycle (SDLC) Policy

**Version:** 1.0 (draft) | **Effective Date:** {{EFFECTIVE_DATE}} | **Owner:** Engineering Lead
**Last reviewed:** {{LAST_REVIEW_DATE}} | **Next review:** {{NEXT_REVIEW_DATE}}

This policy defines how the TTII Platform is designed, built, reviewed, tested, and shipped — with security baked into each phase. It supports the [Information Security Policy](information-security-policy.md) and aligns with **OWASP SAMM** and **ISO/IEC 27001 A.14**.

## 1. Principles

1. **Shift left.** It is far cheaper to spot a security issue at design or PR review than after it ships.
2. **Default deny.** New endpoints, new fields, new integrations start without access until explicitly granted.
3. **Trust no input.** Validate at the boundary; never trust query parameters, request bodies, headers, or third-party callbacks.
4. **No secrets in source.** Secrets live in environment variables / a secrets store. Hard-coded credentials are an immediate revert.
5. **Visibility.** Every change is reviewable in the commit history. Production-affecting changes are auditable.

## 2. Source control

- Code lives in **GitHub** at `viditkbhatnagar/ttii_app`.
- The `main` branch is the integration trunk. **All changes go through pull requests**; no direct pushes to `main`.
- Branch protection requires: at least one approving review, all CI checks green, no merge conflicts.
- Force-push is disabled on `main`.
- Signed commits are encouraged; required for releases (target state).

## 3. Pull requests

Every PR includes:

- A clear title and description (the "**why**", not just the "what");
- Reference to the issue / ticket / regulatory requirement it addresses;
- Tests for new behaviour;
- A self-review note from the author flagging anything risky.

For changes touching personal data, payments, authentication, or RBAC, the author additionally:

- Adds **DPO + Engineering Lead** as reviewers;
- States the data classes affected (per the [Data Protection Policy](data-protection-policy.md));
- States any [ROPA](../compliance/records-of-processing-activities.md) entries that need updating;
- States any new sub-processor introduced.

## 4. Code review

The reviewer's job is to catch what tests cannot. Reviewers consider:

- **Authentication** — does this endpoint use `requireLegacyAuth`? Are roles checked with `requireLegacyRoles`?
- **Authorisation** — does this query scope to the user / centre / cohort? IDOR is the #1 risk in multi-tenant LMS.
- **Input validation** — every body field validated; never trust IDs that came from the client.
- **SQL** — only Prisma Client queries, no raw SQL strings concatenated with user input. (CLAUDE.md mandates this.)
- **Logging** — no PII in application logs; hash where used as a key; mask emails / phones in development logs as needed.
- **Errors** — error responses must not leak stack traces or internal paths in production.
- **Crypto** — uses approved primitives only (see [Cryptography Policy](cryptography-policy.md)).
- **Race conditions** — concurrent requests against the same record handled correctly.
- **Backwards compatibility** — schema changes are additive; no column rename without coordination with the legacy PHP application.

A PR that touches `apps/api/src/auth/` or `apps/api/prisma/schema.prisma` requires Engineering Lead sign-off.

## 5. Dependency management

- All dependencies are pinned in `package-lock.json`.
- Dependencies are updated **monthly** (security patches sooner) using Dependabot / Renovate-style PRs.
- A **dependency audit** (`npm audit`) runs in CI; blocking CVE severity is set to High.
- New dependencies require a brief justification in the PR description: why this library, why not the existing options, what is the maintenance posture.

## 6. Secrets

- No secret is committed to the repository.
- `.env.example` lists every secret name with placeholder values; production secrets live on the production droplet.
- The git history is regularly scanned for accidentally-committed secrets (e.g., `gitleaks`); any hit triggers immediate rotation per the [Cryptography Policy](cryptography-policy.md).
- Secrets in CI use GitHub repository secrets, scoped narrowly.

## 7. Testing

- **Unit tests** — for service-layer business logic. Aim for high coverage on auth, payment, and certificate-issuance code.
- **Integration tests** — for API routes touching auth and RBAC.
- **End-to-end tests** — for critical flows (signup, login, enrolment, payment, certificate issuance).
- **Security-specific tests** — IDOR tests for every new resource (does `GET /resource/:id` reject IDs the caller shouldn't see?).

A failing test in CI blocks the merge.

## 8. Static analysis

- **ESLint** + **TypeScript strict mode** for general code quality.
- A linting rule blocks `eval`, dynamic `Function`, and string-templated SQL.
- A pre-commit hook runs `prettier --check` and `eslint`.
- Static security scanning (`semgrep` or equivalent) is on the roadmap.

## 9. Build and deploy

- CI runs on every PR and on every push to `main`. The CI matrix runs lint, type-check, tests, and build.
- Deploys to production happen via the documented runbook in [DEPLOYMENT.md](../../DEPLOYMENT.md).
- Each deploy is tagged with the commit SHA; rollback is "redeploy the prior tag".
- Deploys outside business hours require an Engineering Lead authorisation.

## 10. Configuration management

- Application configuration is environment-driven via `apps/api/src/env.ts`.
- All required env vars have a typed schema; the application refuses to start if a required value is missing.
- Configuration changes go through PR review like code changes.

## 11. Logging and observability

- See [Logging & Monitoring Policy](logging-monitoring-policy.md) for details.
- New endpoints add log statements at INFO level for normal flow and ERROR for failures, with enough context to debug without leaking PII.

## 12. Vulnerability management lifecycle

- Vulnerabilities reported via the [Vulnerability Disclosure Policy](vulnerability-disclosure-policy.md), or surfaced by `npm audit` / pen-test, are tracked in the Risk Register.
- Severity-driven SLAs: Critical fixed in 7 days; High in 30; Medium in 90; Low in best-effort.
- Each fix lands behind a PR with a regression test where possible.

## 13. Pen-testing

- An external penetration test is conducted at least once every 12 months.
- Findings enter the Risk Register and are remediated per §12.

## 14. Threat modelling

For new features touching personal data, payments, auth, or third-party integrations, the engineer writes a brief **threat model** before implementation, covering:

- The trust boundaries crossed;
- The assets at risk;
- The classes of attack to mitigate (STRIDE: spoofing, tampering, repudiation, info disclosure, DoS, elevation);
- The controls applied.

The threat model is attached to the PR. It does not have to be long — a 15-minute exercise is far better than nothing.

## 15. Privacy by design

- New features that collect personal data require a quick **DPIA** (see [DPIA Template](../compliance/dpia-template.md)) before development starts;
- The DPO signs off on the DPIA;
- The [ROPA](../compliance/records-of-processing-activities.md) is updated when the feature ships.

## 16. Cross-references

- [Information Security Policy](information-security-policy.md)
- [Cryptography Policy](cryptography-policy.md)
- [Logging & Monitoring Policy](logging-monitoring-policy.md)
- [Vulnerability Disclosure Policy](vulnerability-disclosure-policy.md)
- [DPIA Template](../compliance/dpia-template.md)
- [DEPLOYMENT.md](../../DEPLOYMENT.md)

---

## Revision history

| Version | Date | Author | Notes |
|---|---|---|---|
| 1.0 (draft) | {{LAST_REVIEW_DATE}} | Initial draft | Pre-publication. |
