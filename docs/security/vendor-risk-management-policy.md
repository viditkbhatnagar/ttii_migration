# Vendor Risk Management Policy

**Version:** 1.0 (draft) | **Effective Date:** {{EFFECTIVE_DATE}} | **Owner:** {{DPO_NAME}}, Data Protection Officer
**Last reviewed:** {{LAST_REVIEW_DATE}} | **Next review:** {{NEXT_REVIEW_DATE}}

This policy governs how {{LEGAL_ENTITY_NAME}} ("TTII") evaluates, onboards, monitors, and offboards third parties that process TTII or learner data. It supports the [Information Security Policy](information-security-policy.md) and DPDP Act §8(7) (the data fiduciary's responsibility for processors).

## 1. Why this matters

TTII does not deliver every part of the service ourselves. Hosting, payments, email, conferencing, video, AI, and storage are delegated to specialist providers. Our learners trust **us**, but their data flows through these providers. We are accountable for ensuring those providers meet at least our security and privacy standard.

## 2. Tiers

A vendor is assigned a tier based on the data they touch and the criticality of the service:

| Tier | Description | Examples |
|---|---|---|
| **Critical** | Touches Restricted data, or hosts the Platform itself | DigitalOcean (hosting), DO Spaces (recordings), Razorpay (payments), Microsoft Graph (Teams), Zoom |
| **High** | Touches Confidential personal data | Brevo / Microsoft 365 (email), OpenAI (AI Mentor — opt-in), SMS providers, Vimeo |
| **Medium** | Touches Internal / limited Confidential data | Analytics platforms (none today), monitoring tools, support tools |
| **Low** | No personal data | Marketing tools, internal collaboration |

Each tier has a different due-diligence and review cadence (§6).

## 3. Onboarding due diligence

Before a new vendor is engaged for **Critical** or **High** tier work, the requesting team submits a vendor request to the DPO with:

1. **Why this vendor?** Use case, alternatives considered, why this one was chosen.
2. **What data flows to them?** Categories (per the [Data Protection Policy](data-protection-policy.md)), volume, frequency.
3. **Where do they process it?** Countries / regions; cross-border implications under DPDP §16.
4. **Security posture.** SOC 2 Type II report? ISO 27001 certification? Independent pen-test summary? Public security page?
5. **Privacy posture.** Their published privacy policy, DPA terms, retention defaults, deletion mechanism.
6. **Sub-processors.** Their own list of subprocessors.
7. **Operational fit.** SLAs, support, escalation paths, incident-notification windows.

The DPO and Engineering Lead jointly approve or reject. For **Critical** vendors, the Board is informed.

## 4. Contractual minimums

Every Critical and High vendor must sign:

- A **Data Processing Agreement** ([template](../compliance/data-processing-agreement-template.md)) covering: scope of processing, confidentiality, security measures, sub-processor flow-down, audit rights, breach notification (≤24h), deletion / return at end of contract;
- An **NDA** if not already part of master terms;
- **EU Standard Contractual Clauses** (or India-specific equivalent if notified by the Government) where the vendor processes data outside India;
- An **Indemnity** for losses caused by the vendor's breach.

For Razorpay we additionally rely on its PCI-DSS attestation; we do not handle card data ourselves and Razorpay is the merchant of record where applicable.

## 5. Current vendors (live register)

The full list is the [Subprocessor List](../compliance/subprocessor-list.md). Snapshot at this writing:

| Vendor | Tier | Region | Data | Contract status |
|---|---|---|---|---|
| DigitalOcean LLC | Critical | India (BLR1), Singapore (SGP1) | All hosted data | Master agreement in place; DPA via DigitalOcean's published terms |
| Razorpay Software Pvt. Ltd. | Critical | India | Payment metadata, customer email/phone | Razorpay merchant agreement |
| Microsoft Ireland Operations Ltd. (Teams + Microsoft Graph email) | Critical | EU / USA | Trainer email, meeting metadata, recordings, attendance | Microsoft Customer Agreement + DPA |
| Zoom Video Communications, Inc. | Critical | USA | Meeting metadata, attendance | Zoom DPA |
| Brevo (Sendinblue SAS) | High | France | Recipient email and content | Brevo DPA + SCCs |
| OpenAI, L.L.C. | High | USA | AI Mentor prompts (opt-in) | OpenAI DPA + SCCs |
| Vimeo, Inc. | High | USA | Pre-recorded course video playback | Vimeo terms + privacy policy |
| {{SMS_PROVIDER}} | High | India | Mobile numbers for OTP / operational SMS | Vendor-specific |
| Let's Encrypt (Internet Security Research Group) | Low | USA | Certificate metadata only | ACME terms (no PII) |

## 6. Ongoing monitoring

| Tier | Review cadence | Trigger for ad-hoc review |
|---|---|---|
| Critical | Annual + on any material change | Vendor breach disclosure; change in subprocessor list; change in region; pricing or terms change |
| High | Annual | As above |
| Medium | Every 18 months | As above |
| Low | Every 24 months | Material change |

The annual review checks:

1. The vendor's current SOC 2 / ISO 27001 / pen-test reports;
2. Their published list of subprocessors against ours;
3. Any incidents disclosed during the year;
4. Whether their service is still required;
5. Whether the data they touch has expanded.

## 7. Vendor-side incidents

If a vendor experiences a breach affecting TTII data:

1. They are required by DPA to notify {{DPO_EMAIL}} and {{SECURITY_EMAIL}} within **24 hours**;
2. We trigger our [Incident Response Plan](incident-response-plan.md) and follow the §5 notification flow;
3. We assess whether to transition off the vendor.

## 8. Offboarding

When a vendor relationship ends (or a vendor is replaced):

1. Inbound and outbound data flows are cut at the API layer;
2. The vendor is instructed in writing to delete all TTII data within their published deletion window (typically 30–90 days);
3. We obtain a **deletion confirmation** in writing;
4. We update the [Subprocessor List](../compliance/subprocessor-list.md);
5. Where the vendor was used for personal data, the [Privacy Policy](../legal/privacy-policy.md) is updated to reflect the change;
6. Where the vendor processed payment data, the change is also reflected in user-facing receipts / invoices.

## 9. Sub-processor changes

A new sub-processor or material change is announced to learners through:

- A `docs/CHANGELOG.md` entry;
- An update to the [Privacy Policy](../legal/privacy-policy.md) and [Subprocessor List](../compliance/subprocessor-list.md);
- An email or in-product banner where the change materially affects how data is processed.

We provide enrolled centres / B2B customers reasonable advance notice (target: **30 days**) before adding a new sub-processor for Critical or High data.

## 10. Exceptions

A vendor may be onboarded without a fully-executed DPA only where:

- The vendor is in the **Low** tier (no personal data);
- A short-term proof-of-concept is needed and only synthetic / non-production data is used;
- The DPO grants a written exception, time-bound to ≤30 days, recorded in the Risk Register.

Any other onboarding without a DPA is a policy violation and must be unwound.

## 11. Audit

- Sub-processor audits are performed on a sample basis annually for Critical-tier vendors. The auditor is the DPO or a qualified third party.
- Findings feed into the annual security report to the Board.

## 12. Cross-references

- [Subprocessor List](../compliance/subprocessor-list.md) — live register
- [Data Processing Agreement template](../compliance/data-processing-agreement-template.md)
- [Privacy Policy](../legal/privacy-policy.md) — what we tell learners about vendors
- [Incident Response Plan](incident-response-plan.md) — vendor-incident handling

---

## Revision history

| Version | Date | Author | Notes |
|---|---|---|---|
| 1.0 (draft) | {{LAST_REVIEW_DATE}} | Initial draft | Pre-publication. |
