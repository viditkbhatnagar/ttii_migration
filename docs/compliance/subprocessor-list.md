# Sub-processor List

**Version:** 1.0 (draft) | **Effective Date:** {{EFFECTIVE_DATE}} | **Owner:** {{DPO_NAME}}, Data Protection Officer
**Last reviewed:** {{LAST_REVIEW_DATE}} | **Next review:** {{NEXT_REVIEW_DATE}}

This is the live register of sub-processors that {{LEGAL_ENTITY_NAME}} ("TTII") engages to process personal data on its behalf. It is referenced from the [Privacy Policy](../legal/privacy-policy.md), the [Data Processing Agreement template](data-processing-agreement-template.md), and the [Vendor Risk Management Policy](../security/vendor-risk-management-policy.md).

We give learners and B2B customers reasonable advance notice (target: **30 days**) before adding a new sub-processor that materially changes how data is processed.

---

## 1. Critical-tier sub-processors

| Sub-processor | Country / Region | Purpose | Data categories | DPA / safeguard | Notes |
|---|---|---|---|---|---|
| **DigitalOcean LLC** | India (BLR1) — compute & DB | Application and database hosting | All categories at the infrastructure level | DigitalOcean DPA + provider-managed disk encryption | Production application droplet `68.183.94.1`; DB at `10.122.0.2` on private VPC |
| **DigitalOcean LLC — Spaces** | Singapore (SGP1) | Object storage of recordings, course content, uploaded documents | Live-class recordings (incl. minors), uploaded ID copies, profile photos | Same DPA + provider-managed object encryption + TTII-issued client-side AES-256-GCM for sensitive backups | Bucket `ttii-lms-recordings`; private + signed URLs only |
| **Razorpay Software Pvt. Ltd.** | India | Online payments, refunds, webhooks | Customer name, email, phone, payment metadata, order / payment / signature IDs | Razorpay merchant agreement; PCI-DSS Level 1 attestation | Merchant of record for payment cryptography; we never receive raw card data |
| **Microsoft Ireland Operations Ltd. (Microsoft 365 / Microsoft Graph)** | EU + USA | Live classes via Teams; email via Microsoft Graph; trainer attendance & recording sync | Trainer email (UPN), meeting metadata, attendance reports, recording artefacts | Microsoft Online Services Terms + DPA + EU SCCs | Used per `EMAIL_PROVIDER=msgraph` and Teams integration |
| **Zoom Video Communications, Inc.** | USA | Alternative live-class platform | Participant identifiers, attendance | Zoom DPA + EU SCCs | Used where a programme uses Zoom rather than Teams |

## 2. High-tier sub-processors

| Sub-processor | Country / Region | Purpose | Data categories | DPA / safeguard | Notes |
|---|---|---|---|---|---|
| **Sendinblue SAS (Brevo)** | France | Transactional email (OTPs, receipts, certificate notifications) | Recipient name & email; email content | Brevo DPA + EU SCCs | Default email provider where `EMAIL_PROVIDER=brevo` |
| **Vimeo, Inc.** | USA | Hosting and streaming pre-recorded course videos | Aggregate playback metrics; user IP for delivery | Vimeo terms + privacy policy | Pre-recorded videos only — recordings of live classes do **not** go to Vimeo (they go to DO Spaces) |
| **OpenAI, L.L.C.** | USA | Powering the AI Mentor feature when a learner opts in and submits a prompt | The text of the user's prompt; an internal opaque user identifier | OpenAI DPA + EU SCCs; data not used by OpenAI for training | Opt-in only; no Aadhaar / payment / minor-direct data is sent |
| **{{SMS_PROVIDER}}** | India | OTP and operational SMS | Mobile number + OTP / message content | Vendor-specific DPA | Configured via `OTP_HTTP_ENDPOINT` |

## 3. Low-tier / no-personal-data sub-processors (for transparency)

| Sub-processor | Region | Purpose | Personal data |
|---|---|---|---|
| Let's Encrypt (Internet Security Research Group) | USA | TLS certificate issuance | Certificate metadata only (domain names, not user data) |
| GitHub, Inc. (Microsoft) | USA | Source-control hosting | No production data; only TTII source code and CI logs |
| WebQ | India | DNS hosting for `teachersindia.in` | DNS records only; no learner data |

## 4. Centres as sub-processors

Each TTII partner centre that uses the `admissions.teachersindia.in` portal acts as a **sub-processor** of TTII for the limited purpose of supporting admissions and delivery of programmes for learners enrolled at that centre. Centres are bound by:

- The centre's Master Service Agreement with TTII;
- A Data Processing Agreement following the [DPA template](data-processing-agreement-template.md);
- Centre-specific access scoping in the platform (a centre cannot see data from another centre).

A centre is not on the public sub-processor list above; instead, the sub-processor is "centres collectively". On request, TTII can disclose to a learner the specific centre(s) that hold their data.

## 5. Change log

When a sub-processor is added, removed, or has a material change (region, scope, ownership), the change is recorded here and in the [docs CHANGELOG](../CHANGELOG.md), and where the change materially affects how a learner's personal data is processed, an in-product banner / email notice is sent.

| Date | Change | Reason |
|---|---|---|
| {{LAST_REVIEW_DATE}} | Initial publication | First version of the register |

---

## Revision history

| Version | Date | Author | Notes |
|---|---|---|---|
| 1.0 (draft) | {{LAST_REVIEW_DATE}} | Initial draft | Reflects integrations active at commit `fc089507`. |
