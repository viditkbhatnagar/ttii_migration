# TTII LMS — Security Overview Whitepaper

**Version:** 1.0 (draft) | **Effective Date:** {{EFFECTIVE_DATE}} | **Owner:** Engineering Lead, with DPO sign-off
**Last reviewed:** {{LAST_REVIEW_DATE}} | **Audience:** prospects, B2B customers, auditors, security questionnaires

> This is a **shareable** summary of the security posture of the TTII Platform. It is the document we send when a B2B customer or auditor asks "how do you protect data?". Every claim here is backed by a more detailed internal policy linked from the document. Where current implementation has known gaps, we say so honestly rather than overstate.

## 1. About TTII

{{LEGAL_ENTITY_NAME}} ("TTII") operates a Learning Management System for teacher training, with three portals served from `*.teachersindia.in`:

- `learn.teachersindia.in` — learner portal;
- `admissions.teachersindia.in` — partner-centre / franchisee portal;
- `admin.teachersindia.in` — internal staff portal.

The platform processes personal data of learners (including, in some programmes, minors) and is subject to the **Digital Personal Data Protection Act, 2023** ("DPDP Act") as a Data Fiduciary, the **IT Act 2000** and rules thereunder, the **Aadhaar Act 2016** where Aadhaar is collected, and applicable consumer-protection law.

## 2. Hosting and data residency

| Layer | Provider | Region | Notes |
|---|---|---|---|
| Compute | DigitalOcean LLC | Bangalore (BLR1), India | Application droplet binds to private VPC |
| Database | DigitalOcean Managed MariaDB | Bangalore (BLR1), India | `10.122.0.2:3306`, accessible only from the application droplet over the private VPC |
| Object storage | DigitalOcean Spaces | Singapore (SGP1) | Used for live-class recordings (`ttii-lms-recordings`) and uploaded files |
| Email | Brevo (FR) and / or Microsoft 365 (Microsoft Graph) | EU / USA | OTP, transactional |
| Live classes | Microsoft Teams (EU / USA) and Zoom (USA) | International | Per session host |
| Payments | Razorpay | India | Razorpay is the merchant of record for payment cryptography |
| AI Mentor | OpenAI | USA | Opt-in feature only |
| Pre-recorded video | Vimeo | USA | Streaming only |

A complete list with data classes shared is in the [Subprocessor List](../compliance/subprocessor-list.md).

## 3. Application security

### 3.1 Authentication

- Passwords are hashed with **scrypt** (`N=16384, r=8, p=1, 64-byte key, 16-byte random salt`) per [`apps/api/src/auth/password.ts`](../../apps/api/src/auth/password.ts).
- Legacy bcrypt hashes from the predecessor PHP application are accepted for verification only and silently re-hashed on first successful login.
- Session tokens are opaque 48-byte cryptographically-random values, stored at rest only as a SHA-256 fingerprint, with a default lifetime of 1 hour.
- Password-reset tokens are HMAC-SHA256 signed and bound to the current password hash so that a stale link cannot be reused after a password change. TTL: 30 minutes.
- OTPs are 6 digits, valid for 5 minutes, with a 5-attempt cap per challenge, stored hashed.
- Rate limits: 5 login / 5 password-reset / 5 OTP-request / 10 OTP-verify attempts per 15-minute window per identifier.

### 3.2 Authorisation

Six-role RBAC, enforced in middleware ([`apps/api/src/auth/middleware.ts`](../../apps/api/src/auth/middleware.ts)) and tenant-scoping in service queries:

- Role 1 — Admin (full access)
- Role 2 — Student (own data only)
- Role 3 — Instructor (assigned classes only)
- Role 7 — Centre (centre-scoped)
- Role 8 — Sub-admin (admin without user / role management)
- Role 9 — Counsellor (scoped to applications, students, targets)
- Role 10 — Associate (centre-scoped at field-agent level)

RBAC denials are recorded in the `auth_audit_log` table.

### 3.3 Transport

All learner-facing traffic is TLS-encrypted. nginx terminates TLS using a Let's Encrypt SAN certificate covering all three portals; certbot renews automatically every 60–90 days. The application binds to `127.0.0.1:4000` behind nginx and is not directly exposed.

### 3.4 At-rest encryption

- DigitalOcean managed-disk encryption applies to compute and database volumes.
- DO Spaces objects use provider-side server-side encryption.
- Logical database backups exported to Spaces are additionally encrypted client-side with AES-256-GCM (TTII-managed key).

> **Known gap (transparency):** Aadhaar and passport number columns are stored in MariaDB without column-level application encryption. A column-level encryption rollout is on the security roadmap. Today, access to those columns is restricted by RBAC and audit-logged.

### 3.5 Input handling

The API uses Fastify with `@fastify/helmet` for default security headers, `@fastify/multipart` with a 50 MB upload cap, and Prisma Client for all database access (no raw SQL concatenation). The codebase mandates Prisma-only queries.

> **Known gap (transparency):** the current configuration leaves `contentSecurityPolicy: false` and `cors.origin: true`. Tightening CSP and restricting CORS to known TTII domains is on the security roadmap.

### 3.6 Secrets management

All secrets are environment-driven on the production droplet, read-only by the application user. `.env.example` lists the schema with placeholder values; production values are never in the repository. Repository scanning catches accidental commits.

### 3.7 Audit logging

The `auth_audit_log` table records every authentication denial with reason codes, IP, user-agent, and path. RBAC denials are similarly recorded. The DPO reviews monthly.

## 4. Personal data and DPDP compliance

We act as the **Data Fiduciary** under DPDP Act 2023.

- A published [Privacy Policy](../legal/privacy-policy.md) names every category of data we collect, every processor we use, and every learner right.
- Lawful basis for each purpose is documented in [Records of Processing Activities](../compliance/records-of-processing-activities.md).
- A [Grievance Redressal](../legal/grievance-redressal-policy.md) channel acknowledges complaints within {{GRIEVANCE_ACK_HOURS}} hours and resolves within {{GRIEVANCE_RESOLUTION_DAYS}} days, in line with IT Rules 2011 Rule 3(11).
- A [DPDP Rights Request Form](../legal/dpdp-rights-request-form.md) handles access, correction, erasure, withdrawal, and nomination requests.
- Children's data is handled per the [Children's Privacy Notice](../legal/childrens-privacy-notice.md), with verifiable parental consent for under-18 enrolments.
- Aadhaar handling is governed by a dedicated [Aadhaar Handling Policy](../compliance/aadhaar-handling-policy.md).

A DPDP §8(6) **breach notification** to the Data Protection Board and to affected data principals will be issued within **{{BREACH_NOTIFICATION_HOURS}} hours** of confirmed breach, per the [Incident Response Plan](incident-response-plan.md).

## 5. Vendor management

Every Critical and High-tier processor is bound by a written Data Processing Agreement covering: scope, confidentiality, security measures, subprocessor flow-down, audit rights, breach notification (≤24h), deletion at end of contract. Cross-border transfers (Brevo in France, Microsoft / Zoom / OpenAI / Vimeo in the USA) rely on contractual safeguards equivalent to the EU Standard Contractual Clauses.

## 6. Backups and continuity

- Daily database snapshots and a daily logical dump exported to a different region (SGP1) — see [Backup Policy](backup-policy.md);
- Quarterly restoration tests to a sandbox;
- An offline encrypted backup held in TTII's office safe as a final fallback;
- Recovery objectives: RPO 24 hours, RTO 8 hours for the web platform — see [BC / DR Plan](business-continuity-disaster-recovery.md);
- Cyber-liability insurance with {{CYBER_LIABILITY_INSURER}} (limit {{CYBER_LIABILITY_LIMIT_INR}}).

## 7. Software development

- Source in GitHub; PR review required; `main` is protected.
- Dependencies pinned and audited; security patches monthly or sooner.
- All endpoints touching personal data, payments, auth, or RBAC require the DPO + Engineering Lead as reviewers.
- An external penetration test is conducted at least every 12 months.
- See [Secure SDLC Policy](secure-sdlc-policy.md) for full detail.

## 8. People

- Joiner / Mover / Leaver with same-day account de-provisioning on departure;
- Quarterly access reviews for staff roles, monthly for administrators;
- Annual security and privacy training; annual POSH refresher;
- BYOD and acceptable-use rules in the [Acceptable Asset Use Policy](acceptable-asset-use-policy.md).

## 9. Incident response

- Severity-graded playbook in the [Incident Response Plan](incident-response-plan.md);
- CERT-In notification within 6 hours for in-scope cyber incidents;
- DPDP regulator and data-principal notification within {{BREACH_NOTIFICATION_HOURS}} hours for personal-data breaches;
- Annual table-top drill, semi-annual technical drill.

## 10. Independent assurance

- We do **not** currently hold ISO 27001 or SOC 2 Type II certification. Our policies are written to ISO 27001 Annex A structure so that a future certification project starts from a strong base.
- Razorpay (our payment processor) holds PCI-DSS Level 1; we never receive raw card data.
- Microsoft, Zoom, and DigitalOcean each hold relevant industry certifications.

## 11. Known gaps (transparency, in summary)

These are listed in the [Information Security Policy](information-security-policy.md) Risk Register and tracked to remediation. Listing them here is deliberate — it is far better to be honest with auditors than discover a gap mid-audit:

| Gap | Mitigation today |
|---|---|
| CORS allows all origins | Reverse-proxied; TLS-only; auth required for all sensitive endpoints |
| CSP disabled | Default Helmet headers cover most XSS-adjacent risks; CSP rollout planned in report-only mode first |
| Auth tokens accepted via query / body | Acceptance via `Authorization` header is preferred; legacy code paths being migrated |
| Aadhaar / passport stored without column-level encryption | RBAC + audit log + DB on private VPC |
| In-memory rate limiter | Single-replica deployment today; shared-store migration planned with HA |
| No self-serve "download my data" / "delete account" endpoint | DPO-mediated handling per the [DPDP Rights Request Form](../legal/dpdp-rights-request-form.md) — same outcome, slower SLA |
| Logs not centrally aggregated | Logs live on the production droplet with 90-day rotation |

## 12. Contact

| Type | Contact |
|---|---|
| Security questions | {{SECURITY_EMAIL}} |
| Vulnerability reports | {{SECURITY_EMAIL}} (also see [Vulnerability Disclosure Policy](vulnerability-disclosure-policy.md)) |
| Privacy / DPO | {{DPO_EMAIL}} |
| Grievance | {{GRIEVANCE_OFFICER_EMAIL}} |
| General | {{SUPPORT_EMAIL}} |

---

## Revision history

| Version | Date | Author | Notes |
|---|---|---|---|
| 1.0 (draft) | {{LAST_REVIEW_DATE}} | Initial draft | Pre-publication. Sanitised summary of internal policies. |
