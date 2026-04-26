# DPDP Act 2023 Readiness Mapping

**Version:** 1.0 (draft) | **Effective Date:** {{EFFECTIVE_DATE}} | **Owner:** {{DPO_NAME}}, Data Protection Officer
**Last reviewed:** {{LAST_REVIEW_DATE}} | **Next review:** {{NEXT_REVIEW_DATE}}

This document maps {{LEGAL_ENTITY_NAME}} ("TTII") against the **Digital Personal Data Protection Act, 2023** ("DPDP Act") section by section, stating what is in place today, what is pending, and the owner of each item. It is a working document — gaps are listed honestly and tracked to remediation.

The DPDP Act categorises us as a **Data Fiduciary** (we determine the purpose and means of processing the personal data of our learners, applicants, centres, and staff). Once notified by the Government, we may also become a **Significant Data Fiduciary** if our volume of processing crosses prescribed thresholds; the controls below assume that posture as the target state.

## 1. Status legend

- ✅ **In place** — implemented and operating;
- 🟡 **Partial** — implemented in part; documented gap remains;
- 🔴 **Pending** — not implemented; remediation owner and target date set.

## 2. Section-by-section mapping

### Chapter II — Obligations of a Data Fiduciary

| § | Requirement | Status | Evidence | Gap & owner |
|---|---|---|---|---|
| **§5** | Notice to data principal stating personal data, purposes, and rights | ✅ | [Privacy Policy](../legal/privacy-policy.md), in-product consent at signup (where applicable) | Consent banner & granular toggles roll-out — Engineering Lead |
| **§6(1)** | Consent must be free, specific, informed, unconditional, unambiguous, with clear affirmative action | 🟡 | Account creation requires acceptance of Terms + Privacy | UI does not yet present DPDP-style consent ledger — Engineering Lead |
| **§6(3)** | Consent should be limited to the personal data necessary for the specified purpose | 🟡 | Forms collect only fields with a stated purpose | Aadhaar collection should be optional with a clear consent toggle — DPO |
| **§6(4)** | Right to withdraw consent | 🟡 | Available via {{DPO_EMAIL}} | Self-serve withdrawal in-product UI — Engineering Lead |
| **§6(7)** | Notice in English and other languages on demand | 🔴 | English only today | Hindi + 1–2 regional translations — Operations |
| **§7** | Legitimate uses (specified employment, public-interest, response to medical emergency, etc.) | ✅ | Mapped in [Records of Processing Activities](records-of-processing-activities.md) — most TTII processing relies on consent or contractual necessity |  |
| **§8(1)** | Be responsible for compliance and ensure processors comply | ✅ | DPAs in place with Critical / High vendors — see [Subprocessor List](subprocessor-list.md) | Audit cadence formalised — DPO |
| **§8(3)** | Implement appropriate technical and organisational measures | ✅ | [Information Security Policy](../security/information-security-policy.md) and supporting controls | Several gaps noted in the Risk Register, all under remediation |
| **§8(4)** | Take reasonable security safeguards to prevent personal data breach | 🟡 | scrypt password hashing, RBAC, audit log, TLS, rate limits | Column-level encryption for Aadhaar, central log aggregation — Engineering Lead |
| **§8(5)** | Inform Data Protection Board and affected data principals of breach | ✅ | [Incident Response Plan](../security/incident-response-plan.md) §5 | Templates require legal review — {{LEGAL_REVIEW_EMAIL}} |
| **§8(6)** | Notify breach as soon as possible | ✅ | TTII commits to {{BREACH_NOTIFICATION_HOURS}} hours |  |
| **§8(7)** | Erase personal data upon withdrawal of consent or when purpose is met (subject to retention) | 🟡 | Soft-delete in place; manual hard-purge on request | Scheduled hard-purge job — Engineering Lead |
| **§9** | Children: verifiable parental consent; no behavioural tracking; no detrimental effect; no targeted advertising | 🟡 | [Children's Privacy Notice](../legal/childrens-privacy-notice.md) and [Parental Consent Form](../legal/parental-consent-form.md) | Verifiable parental consent flow operationalised in centres — Operations |
| **§10** | Significant Data Fiduciary obligations: appoint DPO, conduct DPIA, audit, etc. | 🟡 | DPO appointed ({{DPO_NAME}}); [DPIA Template](dpia-template.md) drafted | Periodic DPIA on existing high-risk processing (live-class recordings, AI Mentor) — DPO |

### Chapter III — Rights and duties of data principal

| § | Right | Status | Evidence |
|---|---|---|---|
| **§11** | Right to information about personal data | ✅ | [DPDP Rights Request Form](../legal/dpdp-rights-request-form.md); 30-day SLA |
| **§12** | Right to correction and erasure | 🟡 | Same form; manual handling | Self-serve UI on roadmap |
| **§13** | Right of grievance redressal | ✅ | [Grievance Redressal Policy](../legal/grievance-redressal-policy.md) |
| **§14** | Right to nominate | ✅ | Same form |
| **§15** | Duties of data principal — provide accurate data, not impersonate, not file false grievances | ✅ | [Acceptable Use Policy](../legal/acceptable-use-policy.md) §2.4 + §6 |

### Chapter IV — Special provisions

| § | Requirement | Status | Notes |
|---|---|---|---|
| **§16** | Cross-border transfer — to such territories as the Central Government may notify | 🟡 | Vendors in EU & USA today | Will adapt as Government notifies the negative list |
| **§17** | Exemptions (national security, court orders, research, etc.) | N/A | We rely on the standard exemption for legal compliance only |

### Chapter V — Data Protection Board

| § | Requirement | Status |
|---|---|---|
| **§18–24** | Constitution of the Board, powers, complaints | 🟡 | We will cooperate with the Board once constituted |
| **§29–31** | Penalties — up to ₹250 crore for breach of significant obligations | — | Awareness baked into the Risk Register |

## 3. Operational artefacts

We maintain the following operational artefacts in support of the above:

| Artefact | Where |
|---|---|
| Privacy notice | [legal/privacy-policy.md](../legal/privacy-policy.md) |
| Children's privacy notice | [legal/childrens-privacy-notice.md](../legal/childrens-privacy-notice.md) |
| Parental consent form | [legal/parental-consent-form.md](../legal/parental-consent-form.md) |
| Cookie / local-storage policy | [legal/cookie-policy.md](../legal/cookie-policy.md) |
| Records of Processing Activities (ROPA) | [compliance/records-of-processing-activities.md](records-of-processing-activities.md) |
| Sub-processor register | [compliance/subprocessor-list.md](subprocessor-list.md) |
| Data Processing Agreement template | [compliance/data-processing-agreement-template.md](data-processing-agreement-template.md) |
| Aadhaar handling policy | [compliance/aadhaar-handling-policy.md](aadhaar-handling-policy.md) |
| DPIA template | [compliance/dpia-template.md](dpia-template.md) |
| Grievance redressal policy | [legal/grievance-redressal-policy.md](../legal/grievance-redressal-policy.md) |
| Rights request form | [legal/dpdp-rights-request-form.md](../legal/dpdp-rights-request-form.md) |
| Incident response plan (with breach-notification templates) | [security/incident-response-plan.md](../security/incident-response-plan.md) |

## 4. Roadmap (12 months)

| Item | Owner | Target |
|---|---|---|
| Self-serve "download my data" endpoint (DPDP §11) | Engineering Lead | Q3 |
| Self-serve "delete my account" endpoint (DPDP §12) | Engineering Lead | Q3 |
| In-product consent ledger and granular toggles (§6) | Engineering Lead + DPO | Q3 |
| Hindi translation of all data-principal notices (§6(7)) | Operations | Q4 |
| Column-level encryption for Aadhaar / passport | Engineering Lead | Q3 |
| Scheduled hard-purge job for soft-deleted rows | Engineering Lead | Q2 |
| Central log aggregation (SIEM) | Engineering Lead | Q4 |
| Annual DPIA refresh on live-class recordings, AI Mentor, Aadhaar | DPO | Q2 |
| External penetration test | Engineering Lead | Q3 |
| Annual DPDP / privacy audit by external counsel | DPO + {{LEGAL_REVIEW_EMAIL}} | Q4 |
| MFA roll-out for staff (`ADMIN`, `SUBADMIN` roles) | Engineering Lead | Q3 |

Quarter labels are relative to the publication date and updated each review cycle.

## 5. Sign-off

This readiness mapping is reviewed and signed off by:

| Role | Name | Date |
|---|---|---|
| Data Protection Officer | {{DPO_NAME}} | {{LAST_REVIEW_DATE}} |
| Engineering Lead | _______________ | {{LAST_REVIEW_DATE}} |
| CEO / Founder | _______________ | {{LAST_REVIEW_DATE}} |

---

## Revision history

| Version | Date | Author | Notes |
|---|---|---|---|
| 1.0 (draft) | {{LAST_REVIEW_DATE}} | Initial draft | Pre-publication. |
