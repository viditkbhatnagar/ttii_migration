# Documentation Changelog

A version log for every document in this pack. New entries go at the **top**.

The version numbers here are independent of application releases. A document moves to `1.0` only when it has been published (placeholders filled, legal counsel review complete). All entries below are pre-publication drafts.

---

## [Unreleased] — initial drafts (full pack)

### Added — Foundation
- `docs/README.md` — index and conventions
- `docs/PLACEHOLDERS.md` — master list of `{{TOKEN}}` substitutions
- `docs/CHANGELOG.md` — this file

### Added — Legal (`docs/legal/`)
- `privacy-policy.md` — keystone DPDP-compliant notice
- `terms-of-service.md`
- `acceptable-use-policy.md`
- `refund-cancellation-policy.md`
- `cookie-policy.md`
- `grievance-redressal-policy.md`
- `childrens-privacy-notice.md`
- `parental-consent-form.md`
- `disclaimer.md`
- `dpdp-rights-request-form.md`

### Added — Security (`docs/security/`)
- `information-security-policy.md` — umbrella ISMS
- `data-protection-policy.md`
- `access-control-policy.md`
- `authentication-policy.md`
- `cryptography-policy.md`
- `data-retention-deletion-policy.md`
- `incident-response-plan.md`
- `vulnerability-disclosure-policy.md`
- `vendor-risk-management-policy.md`
- `backup-policy.md`
- `business-continuity-disaster-recovery.md`
- `secure-sdlc-policy.md`
- `logging-monitoring-policy.md`
- `acceptable-asset-use-policy.md`
- `security-overview-whitepaper.md`

### Added — Compliance (`docs/compliance/`)
- `dpdp-act-readiness.md`
- `it-rules-2011-mapping.md`
- `aadhaar-handling-policy.md`
- `posh-policy.md`
- `data-processing-agreement-template.md`
- `subprocessor-list.md`
- `records-of-processing-activities.md`
- `dpia-template.md`

### Added — User Guides (`docs/user-guides/`)
- `getting-started.md`
- `admin-user-manual.md`
- `student-user-manual.md`
- `centre-admissions-manual.md`
- `instructor-guide.md`
- `counsellor-quickstart.md`
- `faqs.md`
- `troubleshooting.md`

### Notes
- Drafts are grounded in code at commit `fc089507` (`feat(applications): wire Certificate Combination picker on Add Application form`).
- Verified facts (read directly from source) — scrypt password hashing (`apps/api/src/auth/password.ts`), 48-byte opaque tokens (`apps/api/src/auth/session-token.ts`), 1-hour session TTL (`AUTH_SESSION_TTL_SECONDS=3600` in `.env.example`), HMAC-SHA256 password-reset tokens with 30-min TTL (`apps/api/src/auth/reset-token.ts`), in-memory rate limiter (`apps/api/src/auth/rate-limit.ts`), Helmet+CORS posture (`apps/api/src/app.ts`), six-role RBAC with CENTRE=7 / SUBADMIN=8 (`apps/api/src/auth/roles.ts`).
- Stale fact corrected — the project's `CLAUDE.md` lists "Centre=4". The code says CENTRE=7 (TEAM_LEAD=4). The docs reflect the code; `CLAUDE.md` should be corrected separately.
- "Known gap" callouts in the security and compliance docs are deliberately public-honest. They list controls that fall below stated standard (CORS allow-all, CSP disabled, auth tokens accepted via query/body, Aadhaar plaintext, in-memory rate limiter, no self-serve data export / delete, logs not centralised). Each has an owner.
- **Pending before publication**: (a) legal counsel review of every legal doc; (b) Board approval of the Information Security Policy; (c) DPO sign-off on the Risk Register; (d) appointment + naming of Grievance Officer, DPO, POSH Internal Committee; (e) placeholder fill-in for all `{{TOKEN}}` values.
- Total: **44 documents** drafted.

---

## How to write a changelog entry

When you ship a doc change, prepend a section in this order:

```
## [doc-name vX.Y] — YYYY-MM-DD

### Added | Changed | Removed | Fixed
- one-line description
```

A change is **Added** if the doc is new, **Changed** for substantive edits, **Removed** for deletions, **Fixed** for typos / link-fixes that don't alter meaning.

When a doc moves to `1.0` (publication), tag the commit `docs/<doc-slug>-v1.0` so we can find the published version later.
