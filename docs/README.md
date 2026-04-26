# TTII LMS — Documentation Pack

This directory contains the legal, security, compliance, and end-user documentation for the TTII LMS platform (admin / learn / admissions portals at `*.teachersindia.in`).

> **These documents are working drafts.** They are grounded in the actual codebase and Indian regulatory framework (DPDP Act 2023, IT Rules 2011, Aadhaar Act 2016, Consumer Protection Rules 2020, POSH Act 2013) but **must be reviewed by qualified legal counsel before publication.** They are a starting point, not a substitute for advice.

> **Before publishing, fill in every `{{PLACEHOLDER}}` token** — see [PLACEHOLDERS.md](PLACEHOLDERS.md) for the full list. A `grep -r "{{" docs/` should return zero results before any document is published.

---

## How to use this pack

| Audience | Start with |
|---|---|
| **Learners / Centres / Public** | [legal/](legal/) — privacy policy, terms, refund, grievance |
| **Security auditors / B2B prospects** | [security/security-overview-whitepaper.md](security/security-overview-whitepaper.md) |
| **Internal IT / DevOps / engineering** | [security/](security/) — full ISMS policy set |
| **Legal / DPO / Compliance team** | [compliance/](compliance/) — DPDP readiness, ROPA, DPA template |
| **New admin / centre / student users** | [user-guides/](user-guides/) |
| **Anyone filling in the placeholders** | [PLACEHOLDERS.md](PLACEHOLDERS.md) |

---

## Index

### Legal — public-facing (`legal/`)

| Document | Purpose |
|---|---|
| [privacy-policy.md](legal/privacy-policy.md) | DPDP-compliant notice of personal data collection, processing, sharing, and rights |
| [terms-of-service.md](legal/terms-of-service.md) | Contractual terms governing use of the three portals |
| [acceptable-use-policy.md](legal/acceptable-use-policy.md) | Conduct rules for live classes, feed comments, chat, uploads |
| [refund-cancellation-policy.md](legal/refund-cancellation-policy.md) | Course-fee refunds, withdrawal windows, GST reversal |
| [cookie-policy.md](legal/cookie-policy.md) | Essential auth cookies / local storage usage |
| [grievance-redressal-policy.md](legal/grievance-redressal-policy.md) | IT Rules 2011 Rule 3(11) mandatory grievance officer mechanism |
| [childrens-privacy-notice.md](legal/childrens-privacy-notice.md) | DPDP §9 minor-data handling and parental consent |
| [parental-consent-form.md](legal/parental-consent-form.md) | Printable consent form for under-18 enrolments |
| [disclaimer.md](legal/disclaimer.md) | Course content, third-party links, certification disclosure |
| [dpdp-rights-request-form.md](legal/dpdp-rights-request-form.md) | Standard intake for DPDP §11–14 rights requests |

### Security — internal & B2B-shareable (`security/`)

| Document | Purpose |
|---|---|
| [information-security-policy.md](security/information-security-policy.md) | Top-level ISMS policy |
| [data-protection-policy.md](security/data-protection-policy.md) | Data classification, handling rules per class |
| [access-control-policy.md](security/access-control-policy.md) | Six-role RBAC, least-privilege, joiner/mover/leaver |
| [authentication-policy.md](security/authentication-policy.md) | Password rules, session, OTP, rate limits |
| [cryptography-policy.md](security/cryptography-policy.md) | Approved algorithms, key management |
| [data-retention-deletion-policy.md](security/data-retention-deletion-policy.md) | Retention windows by data class |
| [incident-response-plan.md](security/incident-response-plan.md) | DPDP §8(6) breach notification runbook |
| [vulnerability-disclosure-policy.md](security/vulnerability-disclosure-policy.md) | Public security@ contact, scope, safe harbour |
| [vendor-risk-management-policy.md](security/vendor-risk-management-policy.md) | Third-party due diligence, DPA tracking |
| [backup-policy.md](security/backup-policy.md) | MariaDB and object-storage backup posture |
| [business-continuity-disaster-recovery.md](security/business-continuity-disaster-recovery.md) | RTO/RPO targets, failover steps |
| [secure-sdlc-policy.md](security/secure-sdlc-policy.md) | Code review, dependency hygiene, secrets management |
| [logging-monitoring-policy.md](security/logging-monitoring-policy.md) | What is and isn't logged today |
| [acceptable-asset-use-policy.md](security/acceptable-asset-use-policy.md) | Staff laptop, BYOD, removable-media rules |
| [security-overview-whitepaper.md](security/security-overview-whitepaper.md) | Sanitised summary for prospects/auditors |

### Compliance — frameworks & registers (`compliance/`)

| Document | Purpose |
|---|---|
| [dpdp-act-readiness.md](compliance/dpdp-act-readiness.md) | Section-by-section DPDP Act 2023 mapping with owner per gap |
| [it-rules-2011-mapping.md](compliance/it-rules-2011-mapping.md) | Rule-by-rule mapping of "reasonable security practices" |
| [aadhaar-handling-policy.md](compliance/aadhaar-handling-policy.md) | Lawful basis, masking, encryption, deletion of Aadhaar numbers |
| [posh-policy.md](compliance/posh-policy.md) | Internal Committee, complaint mechanism for live classes / feed |
| [data-processing-agreement-template.md](compliance/data-processing-agreement-template.md) | DPA for centre franchisees and B2B customers |
| [subprocessor-list.md](compliance/subprocessor-list.md) | Live register of every third party + region + purpose |
| [records-of-processing-activities.md](compliance/records-of-processing-activities.md) | DPDP-aligned ROPA |
| [dpia-template.md](compliance/dpia-template.md) | Data Protection Impact Assessment template for new features |

### User Guides (`user-guides/`)

| Document | Audience |
|---|---|
| [getting-started.md](user-guides/getting-started.md) | First-day onboarding for any role |
| [admin-user-manual.md](user-guides/admin-user-manual.md) | Super Admin, Admin (Sub-admin), Counsellor |
| [student-user-manual.md](user-guides/student-user-manual.md) | Student (role 2) |
| [centre-admissions-manual.md](user-guides/centre-admissions-manual.md) | Centre (role 7), Associate (role 10) |
| [instructor-guide.md](user-guides/instructor-guide.md) | Instructor (role 3) |
| [counsellor-quickstart.md](user-guides/counsellor-quickstart.md) | Counsellor (role 9) |
| [faqs.md](user-guides/faqs.md) | All roles |
| [troubleshooting.md](user-guides/troubleshooting.md) | All roles |

### Maintenance

- [PLACEHOLDERS.md](PLACEHOLDERS.md) — every `{{TOKEN}}` and what to fill in
- [CHANGELOG.md](CHANGELOG.md) — version history for every document

---

## Document conventions

- **Versioning:** every doc starts at `1.0` and bumps the minor on substantive edits, the major on rewrites. Bump in [CHANGELOG.md](CHANGELOG.md) when you ship.
- **Effective dates:** filled in at publication via `{{EFFECTIVE_DATE}}`. Until then, drafts are "Not yet effective."
- **Review cycle:** all policies are reviewed at least annually, or sooner on regulatory change or material incident. The owner per doc is named in its header.
- **Source-of-truth:** when a doc and the running code disagree, **the code is the truth.** Open a CHANGELOG entry to update the doc; do not change behaviour to match the doc.
- **Known gaps** are flagged in-line with `> ⚠️ Known gap` callouts so that a reader can see exactly where current implementation is below stated policy. These are work items, not embarrassments — the alternative (overstating controls) is far worse from a regulatory standpoint.

## Out of scope (intentional)

This pack does **not** cover GDPR / UK GDPR (no evidence of EU/UK targeting), COPPA (no US targeting), full PCI-DSS RoC (Razorpay is the merchant of record), or formal ISO 27001 / SOC 2 certification artefacts. The security policies are structured to be ISO-27001-friendly should certification be pursued later. Translations (Hindi / regional) are also out of scope; English only for v1.

## Reporting issues with the docs

- **Factual error** (a doc says X, code does Y): open a PR with the correction.
- **Drafting concern** (clarity, tone, legal interpretation): {{LEGAL_REVIEW_EMAIL}}.
- **Security disclosure**: see [security/vulnerability-disclosure-policy.md](security/vulnerability-disclosure-policy.md) — do **not** open a public issue.
