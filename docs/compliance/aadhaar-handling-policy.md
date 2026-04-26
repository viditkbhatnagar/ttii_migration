# Aadhaar Handling Policy

**Version:** 1.0 (draft) | **Effective Date:** {{EFFECTIVE_DATE}} | **Owner:** {{DPO_NAME}}, Data Protection Officer
**Last reviewed:** {{LAST_REVIEW_DATE}} | **Next review:** {{NEXT_REVIEW_DATE}}

This policy governs how {{LEGAL_ENTITY_NAME}} ("TTII") collects, stores, uses, and disposes of **Aadhaar numbers**. It supplements the [Privacy Policy](../legal/privacy-policy.md) and the [Data Protection Policy](../security/data-protection-policy.md) and aligns with the **Aadhaar (Targeted Delivery of Financial and Other Subsidies, Benefits and Services) Act, 2016**, the **Aadhaar (Sharing of Information) Regulations, 2016**, the **Aadhaar (Authentication) Regulations, 2016**, the UIDAI **Master Circular** on Aadhaar usage, and the DPDP Act 2023.

> Aadhaar is the most sensitive identifier we hold. Mishandling carries criminal exposure under the Aadhaar Act. This policy is non-negotiable.

## 1. The principle

We collect Aadhaar numbers **only when genuinely required** for a specific lawful purpose, with explicit consent, and we hold them no longer than that purpose requires. We do **not** use Aadhaar as our default identifier; the internal user ID does that.

## 2. Where Aadhaar lives in the codebase

| Location | Field | Purpose | Tier |
|---|---|---|---|
| `applications.aadhar_no` | Aadhaar number of an applicant | KYC for programmes that require it; partner-issued certifications | Restricted |
| `user_details.aadhar_no` | Aadhaar number of an enrolled user (carried over from application) | Same | Restricted |

The `applications.passport_no` field follows similar handling, though governed by the Passports Act and not the Aadhaar Act.

> ⚠️ **Known gap:** these fields are currently stored without column-level application encryption. Remediation: AES-256-GCM application-level encryption with a dedicated key managed under the [Cryptography Policy](../security/cryptography-policy.md). Until that ships, access is RBAC-restricted and audit-logged.

## 3. When TTII may collect an Aadhaar number

Aadhaar may be collected only if **at least one** of the following applies:

1. The programme is run in partnership with a body where Aadhaar collection is mandated by law (for example, certain government-funded teacher-training schemes that require beneficiary KYC under §7 of the Aadhaar Act);
2. A partner certification body genuinely requires Aadhaar for issuing the certificate (and the requirement is documented in the partnership contract);
3. The user has voluntarily offered Aadhaar as an identity proof and a less-sensitive alternative was offered first.

If none of the above applies, the field is **not** collected. Engineers and Operations staff must remove the field from any new collection form by default; adding it back requires DPO sign-off.

## 4. Consent

Before collecting an Aadhaar number we obtain **specific, informed consent** that includes:

- The purpose for which Aadhaar is collected;
- That this purpose is a lawful one falling within §3 above;
- That the user may decline and we will offer an alternative (a different ID proof) where the law allows;
- The retention period;
- The user's right to withdraw consent (which results in deletion of the Aadhaar number, not the entire account, where possible);
- The contact details of the [Grievance Officer](../legal/grievance-redressal-policy.md) and the [DPO](../legal/privacy-policy.md).

For minors, the parent / legal guardian gives consent — see the [Children's Privacy Notice](../legal/childrens-privacy-notice.md) and the [Parental Consent Form](../legal/parental-consent-form.md).

## 5. Display and masking

When the Aadhaar number is shown back to the user or to staff:

- **Default display is masked**: only the last 4 digits are shown (`XXXX-XXXX-1234`);
- The full number is revealed only on an explicit user action (a "show" button), and the action is logged;
- Bulk lists (e.g., a centre's list of applicants) **never** display the Aadhaar number, masked or otherwise;
- Aadhaar numbers must not appear in error messages, alerts, emails, SMS, log files, or analytics events.

## 6. Storage and access

- Aadhaar values are stored in the database row of the user / application record. The column is access-controlled at the application layer.
- Read access is limited to a named list of staff approved by the DPO + Engineering Lead; access is audit-logged.
- Backups inherit the Restricted classification (see [Backup Policy](../security/backup-policy.md)).
- Aadhaar must not be exported into spreadsheets, CSVs, presentations, or shared drives. Where a working file is unavoidable (e.g., for a partner upload), it is encrypted with AES-256, transmitted via a secure channel, and securely deleted after use.

## 7. Use

The Aadhaar number is used only for the purpose for which it was collected. Specifically:

- It is **not** used as a learner identifier in any internal system; the internal user ID does that;
- It is **not** used for marketing, profiling, or analytics;
- It is **not** shared with any third party except the partner whose KYC requirement justified collection, and only under a written DPA + a documented purpose.

## 8. Disclosure to third parties

A third party may receive an Aadhaar number from TTII only if:

- A signed Data Processing Agreement covers Aadhaar handling expressly;
- The disclosure is necessary for the documented purpose;
- The third party gives us a written acknowledgement of the same masking, access-control, and retention obligations as this policy.

We do **not** disclose Aadhaar numbers in response to social-engineering requests by phone or unverified email; staff are trained to escalate to the DPO.

## 9. Government / law-enforcement requests

A request from law enforcement for an Aadhaar number is honoured only with a **valid written order** under the IT Act, CrPC, or other applicable law. The DPO reviews each request before disclosure and records the disclosure in the audit log.

## 10. Retention and deletion

| Stage | Retention |
|---|---|
| Application stage, before enrolment | Until the application decision + 1 year, then deleted |
| Enrolment stage | While the KYC purpose is live + the period required by the partner / law (typically the duration of the programme + 1 year), then deleted |
| User-driven erasure request | Aadhaar deleted within 7 days of identity verification, even where other account data is retained for tax / academic-history purposes |

Deletion of Aadhaar is recorded in the audit log with the user ID, the date, and the operator.

## 11. Aadhaar authentication API

TTII does **not** currently invoke the UIDAI Aadhaar authentication API directly (we are not an Authentication User Agency / Authentication Service Agency). If we begin to do so in future, this policy is updated and additional UIDAI-mandated controls (registered devices for biometrics, audit reporting) are implemented.

## 12. Training and awareness

Every staff member with Aadhaar access reads this policy and signs an acknowledgement. The DPO refreshes the training annually.

## 13. Audit

- Quarterly access review of staff with Aadhaar read access — DPO;
- Quarterly sample review of `auth_audit_log` entries for Aadhaar reveal events — DPO;
- Annual deletion-compliance check — DPO.

## 14. Penalties

- **Internal**: Non-compliance with this policy can result in disciplinary action, including termination.
- **External**: §29 Aadhaar Act 2016 makes unauthorised disclosure a criminal offence punishable by imprisonment of up to 3 years and a fine. §47 makes contravention by a body corporate punishable. The DPDP Act adds civil penalties on top.

## 15. Cross-references

- [Privacy Policy](../legal/privacy-policy.md)
- [Data Protection Policy](../security/data-protection-policy.md)
- [Cryptography Policy](../security/cryptography-policy.md)
- [Children's Privacy Notice](../legal/childrens-privacy-notice.md)
- [Records of Processing Activities](records-of-processing-activities.md)

---

## Revision history

| Version | Date | Author | Notes |
|---|---|---|---|
| 1.0 (draft) | {{LAST_REVIEW_DATE}} | Initial draft | Pre-publication. Column-level encryption of `aadhar_no` to be implemented. |
