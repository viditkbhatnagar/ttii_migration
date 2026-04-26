# Data Processing Agreement — Template

**Version:** 1.0 (draft) | **Effective Date:** {{EFFECTIVE_DATE}} | **Owner:** {{LEGAL_REVIEW_EMAIL}}
**Last reviewed:** {{LAST_REVIEW_DATE}} | **Next review:** {{NEXT_REVIEW_DATE}}

> This is a **template** Data Processing Agreement ("**DPA**") to be entered into between {{LEGAL_ENTITY_NAME}} ("**TTII**" or the "**Data Fiduciary**") and a counter-party that processes personal data on TTII's instructions (a "**Data Processor**"). The template covers both inbound (TTII as Fiduciary engaging a Processor) and outbound (TTII as Processor for a B2B customer / centre) variations — see §1 below.
>
> **Always have this reviewed by external counsel before signing.** It is a starting point grounded in DPDP Act 2023 and IT Rules 2011, but a real DPA must reflect the specific service, data flows, and commercial terms.

---

## 1. Variation

Tick which variation this instance is being executed as:

- ☐ **Variation A — TTII engages a Processor.** TTII is the Data Fiduciary; the counter-party is the Processor. (E.g., a centre that provides last-mile admissions support; a vendor processing data on TTII's instruction.)
- ☐ **Variation B — TTII processes for a B2B Fiduciary.** A B2B customer (e.g., a large school chain) is the Data Fiduciary; TTII is the Processor delivering the platform.

Where the wording differs by variation, the variation-specific clauses are marked accordingly.

## 2. Parties

This DPA is entered into between:

| Party | Detail |
|---|---|
| **{{LEGAL_ENTITY_NAME}}** ("TTII") | {{REGISTERED_ADDRESS}}; CIN {{CIN}}; GSTIN {{GST_NUMBER}} |
| **[Counter-party legal name]** ("Counter-party") | [Address]; [CIN / equivalent]; [Tax ID] |

## 3. Definitions

- **"Personal Data"** has the meaning given in §2(t) of the DPDP Act 2023.
- **"Processing"** has the meaning given in §2(x) of the DPDP Act.
- **"Sub-processor"** means a third party engaged by the Processor to process Personal Data on the Processor's behalf, with the Fiduciary's authorisation.
- **"Personal Data Breach"** means any incident leading to accidental or unlawful destruction, loss, alteration, unauthorised disclosure of, or access to, Personal Data.

## 4. Subject matter and duration

| Item | Description |
|---|---|
| Subject matter | The processing described in **Annex 1** below |
| Duration | The term of the underlying Master Services Agreement, or such period as the Fiduciary directs in writing |
| Categories of data principals | [Learners / applicants / centres / employees / minors / etc.] |
| Categories of Personal Data | [List from Annex 1] |
| Special categories (sensitive personal data, including children's data) | [List or "None"] |

## 5. Roles and instructions

- **Variation A:** The Processor processes Personal Data only on the documented instructions of TTII as the Fiduciary. The instructions are set out in the underlying contract and in this DPA. Any further instruction must be in writing.
- **Variation B:** The Customer (Fiduciary) instructs TTII (Processor) through the Platform itself (configuration choices, data uploaded, content created), and through written communication where applicable. TTII shall act only on documented instructions.

The Processor shall promptly inform the Fiduciary if, in its opinion, an instruction infringes the DPDP Act or any applicable law.

## 6. Confidentiality

The Processor ensures that any individual authorised to process Personal Data is bound by confidentiality obligations equivalent to those in this DPA, whether by contract or by statutory obligation.

## 7. Security measures

The Processor shall implement appropriate technical and organisational measures to ensure a level of security appropriate to the risk, including, as relevant:

- Pseudonymisation and encryption of Personal Data in transit and at rest;
- Ongoing confidentiality, integrity, availability, and resilience of processing systems and services;
- The ability to restore the availability and access to Personal Data in a timely manner in the event of a physical or technical incident;
- A process for regularly testing, assessing, and evaluating the effectiveness of these measures.

For TTII as Processor (Variation B), the security measures are those described in the [Information Security Policy](../security/information-security-policy.md) and the [Security Overview Whitepaper](../security/security-overview-whitepaper.md).

## 8. Sub-processors

- The Processor may engage Sub-processors only with the Fiduciary's prior written authorisation. The current list of authorised Sub-processors is in **Annex 2**.
- The Processor shall give the Fiduciary at least **30 days'** notice before adding or replacing a Sub-processor. The Fiduciary may object on reasonable grounds; if the parties cannot resolve the objection, the Fiduciary may terminate the affected services without penalty.
- The Processor shall impose contractual obligations on every Sub-processor that are no less protective than those in this DPA, and shall remain fully liable to the Fiduciary for the Sub-processor's performance.

## 9. Data principal rights

The Processor shall, taking into account the nature of the processing, assist the Fiduciary by appropriate technical and organisational measures, insofar as possible, to fulfil the Fiduciary's obligation to respond to data principal rights under DPDP §11–14 (access, correction, erasure, nomination, grievance).

## 10. Personal Data Breach notification

The Processor shall notify the Fiduciary of any Personal Data Breach **without undue delay and, in any event, within 24 hours** of becoming aware. The notification shall include:

- The nature of the breach (categories and approximate number of data principals and records affected);
- Likely consequences;
- Measures taken or proposed to address the breach;
- A point of contact at the Processor.

The Processor shall cooperate with the Fiduciary in fulfilling the Fiduciary's own breach-notification obligations under DPDP §8(6).

## 11. Data Protection Impact Assessments

The Processor shall, on request, provide reasonable assistance to the Fiduciary in carrying out DPIAs and prior consultations with the Data Protection Board, where the processing is likely to result in a high risk to data principals.

## 12. Audit

The Fiduciary may, on **30 days'** prior written notice, audit the Processor's compliance with this DPA. The audit may be conducted by the Fiduciary or a qualified independent auditor (subject to confidentiality). The Processor shall provide reasonable cooperation. Audit costs are borne by the Fiduciary unless the audit reveals material non-compliance.

In place of an audit, the Processor may provide an up-to-date independent attestation (SOC 2 Type II, ISO 27001 certificate, or equivalent), which the Fiduciary will accept where reasonably appropriate.

## 13. Cross-border transfer

- The Processor shall not transfer Personal Data outside India except to a destination notified by the Government as permissible under DPDP §16, or as expressly authorised by the Fiduciary in writing.
- For transfers to jurisdictions outside India, the parties shall execute the **EU Standard Contractual Clauses** or equivalent contractual safeguards as may be required by Indian law.

## 14. Termination, return and deletion

On termination of the underlying contract or on the Fiduciary's written instruction:

- The Processor shall, at the Fiduciary's option, return or delete all Personal Data, and delete any existing copies, within **30 days**;
- The Processor shall provide a written confirmation of deletion;
- The Processor may retain Personal Data only as required by law (and for as long as required by law), and only with the same security measures applicable during the term.

## 15. Liability and indemnity

- Each party is responsible for any damages caused by its own breach of this DPA.
- The Processor shall indemnify the Fiduciary against any third-party claim, regulatory penalty, or loss arising from the Processor's breach of this DPA.
- Limitation of liability is governed by the underlying Master Services Agreement, save that liability for personal-data breaches caused by gross negligence or wilful misconduct shall not be limited.

## 16. Governing law and jurisdiction

This DPA is governed by {{GOVERNING_LAW}}. The courts at {{JURISDICTION_CITY}} have exclusive jurisdiction.

## 17. Order of precedence

In case of conflict between this DPA and the underlying contract, this DPA prevails on data-protection matters.

## 18. Annexes

### Annex 1 — Description of processing

| Field | Value |
|---|---|
| Subject matter | [e.g., admissions support; transcript fulfilment] |
| Nature of processing | [e.g., collection, storage, transmission, deletion] |
| Purpose | [e.g., to support the delivery of TTII programmes through the centre] |
| Categories of data principals | [Learners / applicants / centres / employees / minors] |
| Categories of Personal Data | [Identity & contact / educational / financial / health / Aadhaar / other] |
| Special categories (sensitive) | [List or "None"] |
| Duration | [Per the underlying contract, or specify] |
| Frequency of processing | [Real-time / batch / on-demand] |
| Geographic location of processing | [India / EU / USA] |

### Annex 2 — Authorised Sub-processors

| Sub-processor | Region | Service |
|---|---|---|
| (To be filled in for the specific instance — refer to the [Subprocessor List](subprocessor-list.md) where TTII is the Processor) |  |  |

### Annex 3 — Technical and organisational measures

(For Variation B — where TTII is the Processor — the [Security Overview Whitepaper](../security/security-overview-whitepaper.md) is incorporated by reference.)

For other Processors, complete the following minimum table:

| Control area | Description |
|---|---|
| Encryption in transit | (e.g., TLS 1.2+) |
| Encryption at rest | (e.g., AES-256, provider-managed) |
| Authentication | (e.g., MFA on all administrative accounts) |
| Access control | (e.g., RBAC, JML, monthly reviews) |
| Logging and monitoring | (e.g., access logs retained ≥90 days) |
| Incident response | (e.g., 24/7 incident contact, ≤24h breach notification) |
| Personnel | (e.g., background-checked, NDA, annual training) |
| Physical security | (e.g., ISO 27001-certified data centres) |
| Backup | (e.g., daily backups in a second region) |

---

## Signature

| For TTII | For [Counter-party] |
|---|---|
| Name: ________________________________ | Name: ________________________________ |
| Designation: ________________________________ | Designation: ________________________________ |
| Date: ________________________________ | Date: ________________________________ |
| Signature: ________________________________ | Signature: ________________________________ |

---

## Revision history

| Version | Date | Author | Notes |
|---|---|---|---|
| 1.0 (draft) | {{LAST_REVIEW_DATE}} | Initial draft | Template for legal counsel review. |
