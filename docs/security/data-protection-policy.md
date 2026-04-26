# Data Protection Policy

**Version:** 1.0 (draft) | **Effective Date:** {{EFFECTIVE_DATE}} | **Owner:** {{DPO_NAME}}, Data Protection Officer
**Last reviewed:** {{LAST_REVIEW_DATE}} | **Next review:** {{NEXT_REVIEW_DATE}}

This policy classifies the data {{LEGAL_ENTITY_NAME}} ("TTII") handles and sets the minimum handling standard for each class. It supports the [Information Security Policy](information-security-policy.md), [Privacy Policy](../legal/privacy-policy.md), [Aadhaar Handling Policy](../compliance/aadhaar-handling-policy.md), and [DPDP Act Readiness](../compliance/dpdp-act-readiness.md).

## 1. Data classes

| Class | Definition | Examples in TTII |
|---|---|---|
| **Public** | Information intentionally published to anyone | Marketing pages on `teachersindia.in`, programme catalogue, course descriptions |
| **Internal** | Operational information not intended for the public but with low harm if disclosed | Internal documents, non-personal aggregates, anonymised statistics |
| **Confidential** | Personal data and business-confidential information whose disclosure would harm an individual or TTII | Most fields in `users`, `student_payments`, `applications`, `auth_audit_log`, contracts, vendor pricing |
| **Restricted** | Sensitive personal data, secrets, and regulated data with severe consequences if disclosed | Aadhaar / passport numbers, government IDs, signed consent forms, private cryptographic keys, payment-instrument identifiers, recordings of minors, health / accessibility data |

Where a record contains data of multiple classes, it is treated at the **highest** class.

## 2. Mapping to the database

The schema in [`apps/api/prisma/schema.prisma`](../../apps/api/prisma/schema.prisma) is classified as follows. This list is illustrative — the [ROPA](../compliance/records-of-processing-activities.md) is the authoritative reference.

### 2.1 Restricted (highest sensitivity)

| Where | Field(s) |
|---|---|
| `applications`, `user_details` | `aadhar_no`, `passport_no` |
| `users` | `password_hash` (yes — even hashed, the column is restricted; never expose) |
| `users` | `zoom_id`, `zoom_password` (Zoom credentials) |
| `student_document` (file URLs) | uploaded ID copies, photographs, signed consent forms |
| `live_class_recordings` | recordings, especially where minors participate |
| Object storage | files containing any restricted data |
| `.env` / secrets | `PASSWORD_RESET_TOKEN_KEY`, `OTP_SIGNING_KEY`, `STORAGE_LOCAL_SIGNING_KEY`, `S3_SECRET_ACCESS_KEY`, `PAYMENT_RAZORPAY_KEY_SECRET`, `EMAIL_BREVO_API_KEY`, `EMAIL_MSGRAPH_CLIENT_SECRET`, `OPENAI_API_KEY`, `ZOOM_SDK_SECRET` |

### 2.2 Confidential

| Where | Field(s) |
|---|---|
| `users` | name, phone, email, gender, DOB, image, role, languages |
| `user_details` | family contacts, emergency contacts, education and employment history, learning disabilities, accessibility needs |
| `applications` | full applicant PII, fees, GST, discounts |
| `student_payments`, `payment_info` | payment metadata (amount, mode, Razorpay order/payment IDs, signatures) |
| `auth_audit_log`, `otp_challenge` | authentication telemetry with user identifiers |
| `live_class_attendance` | attendance per learner |
| Direct messages, chat support, feed posts authored by a learner | the content + the author |

### 2.3 Internal

- Aggregated, anonymised statistics (course completion rate, average score)
- Application logs and metrics that do not contain personal data
- Internal runbooks, design documents, vendor-comparison spreadsheets

### 2.4 Public

- Course catalogue, marketing pages
- This documentation pack once published (with placeholders filled)
- Press releases, public announcements

## 3. Handling rules per class

### 3.1 Confidentiality (who may see)

| Class | Read access |
|---|---|
| Public | Anyone |
| Internal | TTII staff, on-demand |
| Confidential | TTII staff with a documented job-specific need; learners can see their own |
| Restricted | A short, named list of staff approved by the Engineering Lead and the DPO. Access is logged. |

### 3.2 At rest

| Class | At-rest standard |
|---|---|
| Public | No specific control |
| Internal | Stored on TTII or approved processor systems |
| Confidential | Stored on TTII or approved processor systems with provider-managed encryption (DigitalOcean managed disk encryption; S3-compatible object encryption) |
| Restricted | Provider-managed encryption + **column-level / object-level encryption** with TTII-managed keys, where technically feasible. Aadhaar / passport columns are tracked for application-level encryption (currently a documented gap — see [Aadhaar Handling Policy](../compliance/aadhaar-handling-policy.md)) |

### 3.3 In transit

| Class | In-transit standard |
|---|---|
| Public | TLS where served by us, but no requirement |
| Internal | TLS in transit |
| Confidential | **TLS 1.2 or higher** end-to-end; all browser-to-server traffic is HTTPS via the nginx reverse proxy |
| Restricted | TLS 1.2 or higher; never sent in URL query parameters; never logged in plaintext; never sent over unencrypted email |

### 3.4 Authentication and access control

| Class | Authentication required |
|---|---|
| Public | None |
| Internal | TTII SSO / Platform login |
| Confidential | Platform login + role check; for staff, a TTII corporate identity. Joiner-Mover-Leaver per the [Access Control Policy](access-control-policy.md). |
| Restricted | All of the above, plus **dual control** (two-person authorisation) for any bulk export; access reviewed monthly |

### 3.5 Logging

| Class | Logging |
|---|---|
| Public | Access logs at the proxy |
| Internal | Application logs |
| Confidential | Application logs + auth audit log; the *content* of the data is not written into application logs (only identifiers) |
| Restricted | Auth audit log + dedicated access log; access events are alerted on |

### 3.6 Display

- **Restricted** values are masked by default in admin UI screens (e.g., Aadhaar shown as `XXXX-XXXX-1234`); full reveal requires explicit user action and is logged.
- **Confidential** values may be shown in full to staff with the appropriate role. Bulk listing screens may mask phone / email by default.
- Recordings involving minors are not embeddable in third-party players; signed-URL playback only.

### 3.7 Backups, exports, copies

- **Restricted** data may not be exported to personal devices, personal email, or third-party file-sharing services under any circumstance.
- **Confidential** exports require Engineering Lead or DPO approval; exports are logged with purpose, requester, and destination.
- All backups inherit the source data's class.

### 3.8 Disposal

- **Restricted** physical media (hard drives, USB sticks) are destroyed by physical shredding before disposal; certificate of destruction retained.
- **Confidential** files are deleted using OS-level secure deletion or a wipe utility before disk re-purposing.
- Database records follow the [Data Retention & Deletion Policy](data-retention-deletion-policy.md).

### 3.9 Sharing

- **Restricted** sharing requires a signed Data Processing Agreement and is logged in the [Subprocessor List](../compliance/subprocessor-list.md).
- **Confidential** sharing follows the same DPA standard for processors; minimal-data principle applies.
- **Public** sharing is unrestricted.

## 4. The minimisation principle

We collect and retain only the data required to deliver the service or comply with the law. Before adding a new field to any form or table, the engineer must answer:

1. What service or legal obligation requires this field?
2. What harm does collecting it cause if it leaks?
3. How long do we need to retain it?
4. Where does it appear in the [ROPA](../compliance/records-of-processing-activities.md)?

A new field that has no clear answer to all four questions is not added.

## 5. Pseudonymisation and anonymisation

Where data is needed for analytics, training, or testing, we prefer:

- **Pseudonymisation** — replace identifiers with stable hashes (e.g., when feeding learner activity into a dashboard);
- **Anonymisation** — strip identifiers entirely so re-identification is not reasonably possible.

Test environments must not contain unredacted production personal data. Where production-like data is required for debugging, it is sanitised first.

## 6. Personal data of staff

All controls in this policy apply equally to data about TTII personnel (HR records, payroll, ID copies). The custodian for staff data is the Head of Operations, working with the DPO.

## 7. Cross-references

- [Privacy Policy](../legal/privacy-policy.md) — data principal–facing notice
- [Access Control Policy](access-control-policy.md) — RBAC and joiner-mover-leaver
- [Cryptography Policy](cryptography-policy.md) — approved algorithms and key management
- [Data Retention & Deletion Policy](data-retention-deletion-policy.md) — when data is purged
- [Records of Processing Activities](../compliance/records-of-processing-activities.md) — authoritative purpose register

---

## Revision history

| Version | Date | Author | Notes |
|---|---|---|---|
| 1.0 (draft) | {{LAST_REVIEW_DATE}} | Initial draft | Pre-publication. |
