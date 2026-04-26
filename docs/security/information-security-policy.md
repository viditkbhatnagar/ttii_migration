# Information Security Policy

**Version:** 1.0 (draft) | **Effective Date:** {{EFFECTIVE_DATE}} | **Owner:** Engineering Lead with sign-off from {{LEGAL_ENTITY_NAME}} Board
**Last reviewed:** {{LAST_REVIEW_DATE}} | **Next review:** {{NEXT_REVIEW_DATE}}

This is the umbrella Information Security Policy ("**ISP**") of {{LEGAL_ENTITY_NAME}} ("TTII"). It is written to be aligned with the **ISO/IEC 27001:2022 Annex A** control set, the **"reasonable security practices and procedures"** standard under §43A of the IT Act and the SPDI Rules, and the **DPDP Act 2023** Data Fiduciary obligations.

It is not a certification artefact. It is the operational policy that everyone who works on or with the TTII Platform must comply with. Specific control areas are detailed in the policies linked from §6.

## 1. Purpose

To protect the confidentiality, integrity, and availability of TTII information assets — most importantly the personal data of our learners, applicants, centres, and staff — and to set the minimum security standard that everyone working with or for TTII must meet.

## 2. Scope

This ISP applies to:

- All **TTII personnel**: directors, full-time employees, contract staff, interns, instructors;
- All **partner centre staff** and **associates** with access to the Platform;
- All **service providers and processors** (subject to additional contractual flow-down via Data Processing Agreements);
- All **information assets**: source code, production and non-production systems, databases, object storage, recordings, paper records, employee laptops, and any device used to access TTII systems;
- All **locations**: TTII offices, partner centres, hosted environments, third-party SaaS, work-from-home, travel.

## 3. Principles

1. **Confidentiality.** Personal data and business-confidential information is accessible only to those with a job-specific need.
2. **Integrity.** Information is accurate, complete, and protected from unauthorised modification.
3. **Availability.** Information is accessible to those who legitimately need it, when they need it.
4. **Least privilege.** Every account, process, and integration is granted the minimum access required.
5. **Defence in depth.** No single control is relied on for protection. Failures in one layer are caught by another.
6. **Privacy by design.** New features are designed with privacy and security as default settings.
7. **Transparency.** Where a control is not yet at the desired standard, we document the gap honestly and remediate on a timeline rather than overstate.

## 4. Roles and responsibilities

| Role | Accountabilities |
|---|---|
| **Board** | Approves this ISP and major investment in security. Reviews the security posture annually. |
| **Engineering Lead (CTO equivalent)** | Owns this ISP and the day-to-day security programme. Chairs the Security Working Group. |
| **{{DPO_NAME}}, Data Protection Officer** | Owns DPDP Act compliance, Data Processing Agreements, ROPA, breach notifications. |
| **{{GRIEVANCE_OFFICER_NAME}}, Grievance Officer** | Owns intake and resolution of complaints from data principals and the public. |
| **Security Working Group** | Quarterly review of incidents, risks, vendor changes, and remediation progress. Membership: Engineering Lead, DPO, Head of Operations, an independent advisor (where engaged). |
| **Every employee, instructor, contractor, centre administrator** | Reads, understands, and follows this ISP and the supporting policies. Reports incidents and suspected violations promptly. |

## 5. Risk management

### 5.1 Identification

We maintain a **Risk Register** that lists known risks to confidentiality, integrity, and availability. Each risk has an owner, a likelihood and impact rating (1–5), a target treatment, and a remediation deadline.

### 5.2 Treatment

For each risk we choose one of:

- **Mitigate** — apply controls to reduce likelihood or impact.
- **Transfer** — through cyber-liability insurance ({{CYBER_LIABILITY_INSURER}}, limit {{CYBER_LIABILITY_LIMIT_INR}}) or by contractually offloading to a vendor.
- **Accept** — formally documented; signed off by the Engineering Lead and (for personal-data risks) the DPO.
- **Avoid** — change the design so the risk no longer applies.

### 5.3 Currently accepted risks (transparency)

These items are below desired standard and are tracked for remediation. They are listed publicly so that auditors and partners can see the gap honestly.

| Gap | Owner | Target |
|---|---|---|
| CORS allows all origins (`origin: true, credentials: true` in [`apps/api/src/app.ts`](../../apps/api/src/app.ts)) | Engineering Lead | Restrict to known TTII domains before publishing the security overview |
| Helmet Content-Security-Policy is disabled (`contentSecurityPolicy: false`) | Engineering Lead | Roll out a CSP starting with report-only mode |
| Auth tokens accepted via query string and request body in addition to `Authorization` header (in [`apps/api/src/auth/middleware.ts`](../../apps/api/src/auth/middleware.ts)) | Engineering Lead | Move to header-only acceptance; tokens in the URL are logged by reverse proxies and may leak via referrers |
| Aadhaar and passport numbers stored without column-level encryption | DPO + Engineering Lead | Implement application-level encryption for these columns |
| In-memory rate limiter (`apps/api/src/auth/rate-limit.ts`) — resets on process restart and does not span replicas | Engineering Lead | Move to a shared store (Redis or DB-backed) on next infra change |
| No self-serve "download my data" or "delete my account" endpoints | DPO + Engineering Lead | Implement per DPDP §11–12 once the rights-request volume justifies automation |

## 6. Control areas

The detailed controls live in the following policies. Each is owned by a named individual and reviewed annually.

| Area | Policy |
|---|---|
| Data classification and handling | [Data Protection Policy](data-protection-policy.md) |
| Access management (provisioning, RBAC, JML) | [Access Control Policy](access-control-policy.md) |
| Authentication, passwords, sessions, OTP, rate limits | [Authentication Policy](authentication-policy.md) |
| Approved cryptography and key management | [Cryptography Policy](cryptography-policy.md) |
| Retention windows and deletion | [Data Retention & Deletion Policy](data-retention-deletion-policy.md) |
| Incident response and breach notification | [Incident Response Plan](incident-response-plan.md) |
| Vulnerability disclosure | [Vulnerability Disclosure Policy](vulnerability-disclosure-policy.md) |
| Vendor / sub-processor risk management | [Vendor Risk Management Policy](vendor-risk-management-policy.md) |
| Backups | [Backup Policy](backup-policy.md) |
| Business continuity and disaster recovery | [BC / DR Plan](business-continuity-disaster-recovery.md) |
| Secure software development | [Secure SDLC Policy](secure-sdlc-policy.md) |
| Logging and monitoring | [Logging & Monitoring Policy](logging-monitoring-policy.md) |
| Staff devices and acceptable use | [Acceptable Asset Use Policy](acceptable-asset-use-policy.md) |
| Customer-facing security overview | [Security Overview Whitepaper](security-overview-whitepaper.md) |

## 7. Compliance and audits

- We conduct an **internal security review** at least annually, against this ISP and ISO 27001 Annex A.
- An **external penetration test** of the Platform is conducted at least once every 12 months by a qualified third party. Findings are tracked in the Risk Register through to remediation.
- A **DPDP / privacy audit** is conducted at least annually by the DPO or a qualified third party, covering the [ROPA](../compliance/records-of-processing-activities.md), DPAs, consent flows, and rights-request handling.
- Audit findings are reported to the Board.

## 8. Training

- All new joiners complete a security and privacy induction within 30 days of joining.
- All staff complete an annual refresher.
- Engineers receive additional secure-coding training keyed to the [Secure SDLC Policy](secure-sdlc-policy.md).
- POSH training is delivered annually under the [POSH Policy](../compliance/posh-policy.md).

## 9. Exceptions

Any deviation from this ISP must be documented as an exception, justified in writing, time-bound, signed off by the Engineering Lead (and the DPO where personal data is involved), and tracked in the Risk Register. Exceptions are reviewed quarterly.

## 10. Enforcement

Violations of this ISP may result in disciplinary action up to and including termination of employment / engagement, and where applicable, civil or criminal proceedings. For learners and external users, violations are handled through the [Acceptable Use Policy](../legal/acceptable-use-policy.md) and the [Terms of Service](../legal/terms-of-service.md).

## 11. Document control

- Version updates are recorded in [docs/CHANGELOG.md](../CHANGELOG.md).
- The current version of every policy lives in this `docs/` tree in the source repository.
- Distribution to staff: the canonical link to this policy is shared at induction. Printed or off-system copies are not authoritative.

---

## Revision history

| Version | Date | Author | Notes |
|---|---|---|---|
| 1.0 (draft) | {{LAST_REVIEW_DATE}} | Initial draft | Pre-publication. Pending Board approval and DPO sign-off on the listed accepted risks. |
