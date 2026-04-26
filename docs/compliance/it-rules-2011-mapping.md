# IT Act 2000 / SPDI Rules 2011 Mapping

**Version:** 1.0 (draft) | **Effective Date:** {{EFFECTIVE_DATE}} | **Owner:** {{DPO_NAME}}, Data Protection Officer
**Last reviewed:** {{LAST_REVIEW_DATE}} | **Next review:** {{NEXT_REVIEW_DATE}}

This document maps {{LEGAL_ENTITY_NAME}} ("TTII") against the obligations of the **Information Technology Act, 2000** and the **Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011** ("**SPDI Rules**"). The DPDP Act 2023, on its full enforcement, supersedes much of this regime — but the SPDI Rules remain operative until then, and the IT Act provisions on "reasonable security practices" (§43A) continue to apply alongside DPDP.

For DPDP-specific mapping see [DPDP Act Readiness](dpdp-act-readiness.md).

## 1. Sensitive personal data or information (SPDI Rule 3)

The SPDI Rules define **"Sensitive Personal Data or Information" ("SPDI")** as personal information that consists of:

- Passwords;
- Financial information (bank account / card / payment-instrument detail);
- Physical, physiological, and mental-health condition;
- Sexual orientation;
- Medical records and history;
- Biometric information;
- Any of the above, when received by a body corporate for processing.

### TTII's SPDI footprint

| SPDI category | Where it lives | Treatment |
|---|---|---|
| Passwords | `users.password_hash` | scrypt-hashed; never logged; reset bound to current hash |
| Financial information | `student_payments`, `payment_info` | Razorpay order / payment IDs only; raw card / UPI data is **never** received by TTII |
| Physical / mental health | `user_details.learning_disabilities`, `user_details.accessibility_needs` | Self-declared; access restricted to staff providing accommodation |
| Biometric | None — we do not generate biometric templates | Profile photos are stored as ordinary images, not biometric vectors |
| Sexual orientation, medical records | None collected | — |

## 2. Rule 4 — Privacy policy

| Requirement | TTII evidence |
|---|---|
| A clear and easily accessible privacy policy on the website | [Privacy Policy](../legal/privacy-policy.md) — to be linked from the footer of every portal |
| Disclose type of personal information collected | §3 of the Privacy Policy |
| Purpose of collection and usage | §5 of the Privacy Policy |
| Disclosure of information per Rule 6 | §6 of the Privacy Policy |
| Reasonable security practices and procedures | §11 of the Privacy Policy + [Information Security Policy](../security/information-security-policy.md) |

## 3. Rule 5 — Consent and lawful purpose

| Sub-rule | Requirement | TTII evidence |
|---|---|---|
| 5(1) | Obtain consent in writing before collection of SPDI | Account-creation flow, application form, parental consent form |
| 5(2) | Collect SPDI only for a lawful purpose connected with a function of TTII and necessary for that purpose | [ROPA](records-of-processing-activities.md) — every purpose documented |
| 5(3) | Inform the data subject before collection: that the information is being collected, the purpose, the intended recipients, and the agency that retains the information | [Privacy Policy](../legal/privacy-policy.md), application-form notices |
| 5(4) | Hold the information only for as long as necessary | [Data Retention & Deletion Policy](../security/data-retention-deletion-policy.md) |
| 5(5) | Use the information only for the purposes for which it has been collected | Service code paths reviewed for purpose-creep during PR review |
| 5(6) | Permit the data subject to review the information | Via the [DPDP Rights Request Form](../legal/dpdp-rights-request-form.md) |
| 5(7) | Permit correction of inaccurate or out-of-date information | Same form |
| 5(8) | Allow opt-out of providing the information at any stage prior to collection | Where relying on consent, the user may decline (and accept a reduced service); operational fields tied to contractual necessity (name, email) cannot be opted out without ending the service |
| 5(9) | Designate a Grievance Officer; resolve grievances within one month | [Grievance Redressal Policy](../legal/grievance-redressal-policy.md); SLA {{GRIEVANCE_RESOLUTION_DAYS}} days (within statutory month) |

## 4. Rule 6 — Disclosure of information

| Sub-rule | Requirement | TTII evidence |
|---|---|---|
| 6(1) | Disclosure to a third party requires prior consent or compliance with a legal obligation | [Privacy Policy](../legal/privacy-policy.md) §6; [Subprocessor List](subprocessor-list.md) |
| 6(2) | The body corporate or any person on its behalf shall not publish the SPDI | No public publication of SPDI |
| 6(3) | The third party receiving such information shall not disclose it further | Imposed via DPA flow-down on every subprocessor |

## 5. Rule 7 — Transfer of information

A body corporate may transfer SPDI only if the same level of data protection is ensured by the receiver. TTII relies on contractually-mandated security measures (DPA + EU-style SCCs where the recipient is overseas) — see [Vendor Risk Management Policy](../security/vendor-risk-management-policy.md).

## 6. Rule 8 — Reasonable security practices and procedures

Rule 8 effectively recognises **ISO/IEC 27001** as a "reasonable security practice and procedure" if implemented. TTII does not currently hold ISO 27001 certification but has structured the [Information Security Policy](../security/information-security-policy.md) to align with ISO 27001 Annex A controls so that:

- Annex A.5 (Information security policies) — addressed by the Information Security Policy + supporting policy set;
- A.6 (Organization) — addressed by the roles in the Information Security Policy and Engineering Lead / DPO appointments;
- A.7 (Asset management) — addressed by the [Acceptable Asset Use Policy](../security/acceptable-asset-use-policy.md);
- A.8 (Access control) — addressed by the [Access Control Policy](../security/access-control-policy.md) and [Authentication Policy](../security/authentication-policy.md);
- A.10 (Cryptography) — addressed by the [Cryptography Policy](../security/cryptography-policy.md);
- A.11 (Physical security) — addressed by the office and centre rules in the Acceptable Asset Use Policy;
- A.12 (Operations) — addressed by [Logging & Monitoring](../security/logging-monitoring-policy.md) and the [Backup Policy](../security/backup-policy.md);
- A.13 (Communications) — addressed by the same plus the [Cryptography Policy](../security/cryptography-policy.md);
- A.14 (System acquisition / development) — addressed by the [Secure SDLC Policy](../security/secure-sdlc-policy.md);
- A.15 (Supplier relationships) — addressed by the [Vendor Risk Management Policy](../security/vendor-risk-management-policy.md);
- A.16 (Incident management) — addressed by the [Incident Response Plan](../security/incident-response-plan.md);
- A.17 (Continuity) — addressed by the [BC / DR Plan](../security/business-continuity-disaster-recovery.md);
- A.18 (Compliance) — addressed by this document and the [DPDP Act Readiness](dpdp-act-readiness.md).

## 7. IT Act 2000 — Other relevant sections

| § | Requirement | TTII status |
|---|---|---|
| **§43A** | Compensation for failure to protect data; "reasonable security practices" | Reasonable security practices in place per Rule 8; gaps tracked |
| **§66, 66B–66F** | Cyber crimes — unauthorised access, identity theft, etc. | We will not engage in any such conduct; we report any attack to law enforcement |
| **§67, 67A, 67B** | Publishing obscene / sexually explicit material; child sexual abuse material | Zero-tolerance; explicit prohibition in [Acceptable Use Policy](../legal/acceptable-use-policy.md) §2.1; reporting protocol in [Children's Privacy Notice](../legal/childrens-privacy-notice.md) |
| **§69, 69A, 69B** | Government decryption / blocking / monitoring orders | We comply with valid lawful orders; documented in [Privacy Policy](../legal/privacy-policy.md) §6.4 |
| **§70B** | CERT-In and reporting of cyber-incidents | 6-hour reporting window honoured per [Incident Response Plan](../security/incident-response-plan.md) §5.1 |
| **§79** | Intermediary safe-harbour, conditional on observing IT Rules 2021 | We follow IT Rules 2021 obligations: Grievance Officer (Rule 3(11)), takedown SLAs, transparency report |
| **§79A** | Examination of electronic evidence | Cooperation with notified examiners |

## 8. IT Rules 2021 (Intermediary Guidelines and Digital Media Ethics Code) — Relevant items

| Rule | Requirement | TTII evidence |
|---|---|---|
| 3(1)(a) | Publish rules and regulations, privacy policy and user agreement | [Terms of Service](../legal/terms-of-service.md), [Privacy Policy](../legal/privacy-policy.md), [Acceptable Use Policy](../legal/acceptable-use-policy.md) |
| 3(1)(b) | Inform users not to host / publish unlawful content | [Acceptable Use Policy](../legal/acceptable-use-policy.md) §2 |
| 3(1)(c) | Inform users at least once a year and at the time of registration of these obligations | At signup + annual reminder by email (target state) |
| 3(1)(d) | Take down unlawful content within 36 hours of court / government notification | [Grievance Redressal Policy](../legal/grievance-redressal-policy.md) §4 |
| 3(2)(a) | Acknowledge complaint within 24 hours; resolve within 15 days | Same — {{GRIEVANCE_ACK_HOURS}} hours / {{GRIEVANCE_RESOLUTION_DAYS}} days |
| 3(11) | Appoint a Grievance Officer who is an Indian resident | {{GRIEVANCE_OFFICER_NAME}} appointed |
| 3(2)(b) | Take-down of obviously unlawful images within 24 hours | [Grievance Redressal Policy](../legal/grievance-redressal-policy.md) §4 |
| 4 (significant social media intermediaries) | Additional obligations on SSMI | TTII is **not** a Significant Social Media Intermediary — we are a closed LMS, not a social-media platform |

## 9. Summary status

| Area | Status |
|---|---|
| Privacy notice (Rule 4) | ✅ |
| Consent and lawful purpose (Rule 5) | ✅ — improvements on consent UI in roadmap |
| Disclosure (Rule 6) | ✅ |
| Cross-border transfer (Rule 7) | ✅ — DPAs in place |
| Reasonable security (Rule 8) | 🟡 — ISO 27001-aligned but not certified |
| IT Act §43A "reasonable security" | 🟡 — same |
| CERT-In §70B reporting | ✅ — 6-hour SLA in IR plan |
| §79 / IT Rules 2021 intermediary obligations | ✅ |
| §67B (CSAM) | ✅ — zero tolerance, reporting protocol in place |

---

## Revision history

| Version | Date | Author | Notes |
|---|---|---|---|
| 1.0 (draft) | {{LAST_REVIEW_DATE}} | Initial draft | Pre-publication. |
