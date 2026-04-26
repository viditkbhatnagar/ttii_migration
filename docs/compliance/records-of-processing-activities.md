# Records of Processing Activities (ROPA)

**Version:** 1.0 (draft) | **Effective Date:** {{EFFECTIVE_DATE}} | **Owner:** {{DPO_NAME}}, Data Protection Officer
**Last reviewed:** {{LAST_REVIEW_DATE}} | **Next review:** {{NEXT_REVIEW_DATE}}

This document is the **Records of Processing Activities** maintained by {{LEGAL_ENTITY_NAME}} ("TTII") as the **Data Fiduciary** under the **Digital Personal Data Protection Act, 2023** ("DPDP Act"). It is the authoritative reference for what we process, why, on what lawful basis, with whom, where, and for how long.

When a new processing activity is introduced, an entry is added here **before** the feature ships. When a processing activity is changed materially, the entry is updated. When an activity ends, the entry is marked Closed (not deleted) for historical reference.

## 1. Reading this document

Each row in §3 is one **processing activity** — a single, coherent purpose for which we process personal data. The columns are:

- **Activity** — short name;
- **Description** — what happens;
- **Categories of data principal** — whose data;
- **Categories of personal data** — what data;
- **Lawful basis** — DPDP Act §6 (consent) or §7 (legitimate use);
- **Recipients / sub-processors** — who else receives the data;
- **Storage location** — primary location;
- **Retention** — see [Data Retention & Deletion Policy](../security/data-retention-deletion-policy.md);
- **Security measures** — see [Information Security Policy](../security/information-security-policy.md);
- **Owner** — who is accountable;
- **Status** — Active / Pending / Closed.

## 2. Master glossary

- "Identity & contact" = name, gender, DOB, phone, email, address, profile photograph;
- "Education / employment" = qualification, school / college, employer, designation, teaching experience;
- "Family" = parent / guardian / emergency contact details;
- "Health / accessibility" = self-declared learning disabilities and accessibility needs;
- "Government IDs" = Aadhaar, passport;
- "Authentication" = password (hashed), OTP (hashed), session token (hashed);
- "Academic" = enrolment, attendance, grades, certificates;
- "Financial" = payment metadata; we do **not** receive raw card / UPI data;
- "Engagement" = feed posts, comments, chat-support messages, in-product notifications;
- "Live-class" = meeting metadata, attendance, recordings;
- "Technical" = IP address, user-agent, request logs, audit logs.

## 3. Processing activities

### 3.1 Identity, account, and authentication

| Field | Value |
|---|---|
| Activity | Account registration and login |
| Description | Creation and authentication of user accounts on the three portals |
| Data principals | Learners, applicants, centre staff, instructors, TTII employees |
| Categories | Identity & contact; authentication |
| Lawful basis | Contractual necessity + legitimate use (security) |
| Recipients | None outside TTII for the auth itself; OTP delivery uses {{EMAIL_PROVIDER}} / {{SMS_PROVIDER}} |
| Storage | MariaDB on `10.122.0.2` (BLR1, India) |
| Retention | Active life of account + {{DATA_RETENTION_ACTIVE_USERS_YEARS}} years; auth_audit_log {{DATA_RETENTION_AUDIT_LOGS_YEARS}} years |
| Security | scrypt password hashing; opaque tokens hashed at rest; TLS in transit; rate limits; audit log |
| Owner | Engineering Lead |
| Status | Active |

### 3.2 Application processing

| Field | Value |
|---|---|
| Activity | Programme application intake |
| Description | Collecting and reviewing applications for a TTII programme |
| Data principals | Applicants (may include minors) |
| Categories | Identity & contact; education / employment; family; financial (application fee); government IDs (where required) |
| Lawful basis | Consent + contractual necessity (towards a future enrolment contract) |
| Recipients | The applying centre (sub-processor); certification partner (for accepted applications, where required) |
| Storage | MariaDB |
| Retention | Until decision + {{DATA_RETENTION_INACTIVE_USERS_YEARS}} years for unconverted leads |
| Security | RBAC; audit log; centre-scoped access |
| Owner | Operations Head |
| Status | Active |

### 3.3 Course enrolment and academic delivery

| Field | Value |
|---|---|
| Activity | Delivering enrolled programmes |
| Description | Enrolment, lesson delivery, attendance, examinations, assignment review, certification |
| Data principals | Enrolled learners (may include minors) |
| Categories | Identity & contact; academic |
| Lawful basis | Contractual necessity |
| Recipients | Centre (their cohort); instructor (their classes); certification partner (for issuance) |
| Storage | MariaDB; assignment files in DO Spaces |
| Retention | Long-term for academic records and certificates; assignments retained per programme rules |
| Security | RBAC; signed-URL access for files |
| Owner | Operations Head |
| Status | Active |

### 3.4 Live-class hosting

| Field | Value |
|---|---|
| Activity | Conducting and recording live classes |
| Description | Scheduling, hosting (Teams or Zoom), recording, attendance sync |
| Data principals | Enrolled learners (may include minors); instructors; trainers |
| Categories | Identity & contact (name, email); live-class (attendance, recordings) |
| Lawful basis | Contractual necessity (instruction and integrity) + consent (from minors via parent) |
| Recipients | Microsoft Teams (Microsoft Ireland) **or** Zoom (USA) for the call; DO Spaces (Singapore) for recordings |
| Storage | DO Spaces (`ttii-lms-recordings`, SGP1); metadata in MariaDB |
| Retention | {{DATA_RETENTION_AUDIT_LOGS_YEARS}} years from the session date |
| Security | Recording is auto-enabled; signed URLs only; download disabled; no third-party players |
| Owner | Engineering Lead + Operations Head |
| Status | Active |

### 3.5 Payments

| Field | Value |
|---|---|
| Activity | Receiving fees and processing refunds |
| Description | Online (Razorpay), offline, coupon |
| Data principals | Learners, centres |
| Categories | Identity & contact; financial (metadata only) |
| Lawful basis | Contractual necessity + compliance (tax) |
| Recipients | Razorpay (India); banking system; tax authorities for invoices |
| Storage | MariaDB (`student_payments`, `payment_info`); Razorpay holds the source-of-truth payment record |
| Retention | {{DATA_RETENTION_ACTIVE_USERS_YEARS}} years (statutory under §44AA Income Tax / §35 CGST) |
| Security | HMAC-verified webhooks; audit log; no raw card / UPI data |
| Owner | Accounts |
| Status | Active |

### 3.6 Aadhaar collection (where applicable)

| Field | Value |
|---|---|
| Activity | Collecting Aadhaar where the programme requires KYC |
| Description | Targeted collection per the [Aadhaar Handling Policy](aadhaar-handling-policy.md) |
| Data principals | Selected applicants and learners |
| Categories | Government IDs (Aadhaar) |
| Lawful basis | Consent + compliance with law (where the partner programme is statutorily underpinned) |
| Recipients | Partner programme body (where they require it) — no other party |
| Storage | MariaDB columns `applications.aadhar_no`, `user_details.aadhar_no` |
| Retention | KYC purpose duration + 1 year |
| Security | RBAC + audit log; column-level encryption planned (currently a tracked gap) |
| Owner | DPO |
| Status | Active (limited) |

### 3.7 Communications (operational)

| Field | Value |
|---|---|
| Activity | Sending operational emails, SMS, in-product notifications |
| Description | OTP, receipts, certificate notifications, course updates, circulars |
| Data principals | Learners, centres, staff |
| Categories | Identity & contact |
| Lawful basis | Contractual necessity |
| Recipients | {{EMAIL_PROVIDER}} (Brevo / Microsoft); {{SMS_PROVIDER}} for SMS |
| Storage | Provider-side per their retention; TTII keeps in-product notifications in MariaDB |
| Retention | Per [Data Retention & Deletion Policy](../security/data-retention-deletion-policy.md) |
| Security | Per the providers' DPAs |
| Owner | Operations Head |
| Status | Active |

### 3.8 Communications (marketing — opt-in only)

| Field | Value |
|---|---|
| Activity | Sending marketing emails to opted-in users |
| Description | Promotional content, new programme launches |
| Data principals | Learners who have opted in |
| Categories | Identity & contact |
| Lawful basis | Consent |
| Recipients | {{EMAIL_PROVIDER}} |
| Storage | MariaDB consent ledger (target state — currently held as a flag on `users`) |
| Retention | Active opt-in + 1 year of withdrawal evidence |
| Security | Standard email-provider safeguards |
| Owner | Operations Head |
| Status | 🟡 Partial — opt-in toggle UI on roadmap |

### 3.9 AI Mentor (opt-in)

| Field | Value |
|---|---|
| Activity | Generating AI responses to learner prompts |
| Description | Learner submits a prompt; the platform sends prompt + opaque ID to OpenAI; response is shown to the learner |
| Data principals | Learners who have opted in |
| Categories | Whatever the learner types in (instructions explicitly say not to include sensitive data); opaque internal ID |
| Lawful basis | Consent |
| Recipients | OpenAI (USA) |
| Storage | OpenAI per their retention; TTII keeps prompt/response history in MariaDB |
| Retention | 12 months in TTII; OpenAI per their DPA |
| Security | Disclosure in [Privacy Policy](../legal/privacy-policy.md); prompt warning in UI |
| Owner | Engineering Lead |
| Status | Active (opt-in) |

### 3.10 Customer support

| Field | Value |
|---|---|
| Activity | Handling support tickets and chat messages |
| Description | In-product chat-support; email support |
| Data principals | Learners, centres |
| Categories | Identity & contact; engagement (the message itself) |
| Lawful basis | Contractual necessity (delivering support) |
| Recipients | TTII staff with the support role |
| Storage | MariaDB |
| Retention | 3 years from last message |
| Security | RBAC; audit log |
| Owner | Operations Head |
| Status | Active |

### 3.11 Security and audit logging

| Field | Value |
|---|---|
| Activity | Logging authentication events, errors, and access for security monitoring |
| Description | `auth_audit_log`, application logs, nginx logs |
| Data principals | All users |
| Categories | Technical; partial identifiers (user ID) |
| Lawful basis | Legitimate use (DPDP §7(g) — security) |
| Recipients | TTII Engineering Lead and on-call |
| Storage | MariaDB + production droplet filesystem |
| Retention | {{DATA_RETENTION_AUDIT_LOGS_YEARS}} years for `auth_audit_log`; 90 days for app / nginx logs |
| Security | Read access restricted; immutable append |
| Owner | Engineering Lead |
| Status | Active |

### 3.12 Backups

| Field | Value |
|---|---|
| Activity | Backing up production data for recovery |
| Description | Daily DB snapshots + cross-region logical dump |
| Data principals | All |
| Categories | All |
| Lawful basis | Legitimate use (DPDP §7(g) — operational continuity) |
| Recipients | None — internal |
| Storage | DO snapshots (BLR1); DO Spaces (SGP1); offline drive (TTII office) |
| Retention | 30 days daily; 12 months monthly |
| Security | Encrypted at rest; encrypted with TTII-managed key for the off-droplet logical copies |
| Owner | Engineering Lead |
| Status | Active |

### 3.13 HR / staff data

| Field | Value |
|---|---|
| Activity | Employment lifecycle management |
| Description | Hiring, onboarding, payroll inputs, performance reviews, exit |
| Data principals | TTII employees and contractors |
| Categories | Identity; education / employment; financial (salary); ID copies for KYC |
| Lawful basis | Contractual necessity + compliance |
| Recipients | Payroll provider (where engaged); statutory authorities |
| Storage | HR system + secure document storage |
| Retention | Per Companies Act / Income Tax / EPFO requirements (minimum 8 years) |
| Security | Restricted to HR + leadership |
| Owner | Head of Operations |
| Status | Active |

## 4. Cross-border transfers summary

The following processing activities involve cross-border transfer:

| Activity | Receiving country | Vendor |
|---|---|---|
| 3.4 Live classes (Teams) + 3.7 email (Microsoft Graph) | EU + USA | Microsoft Ireland Operations Ltd. |
| 3.4 Live classes (Zoom) | USA | Zoom Video Communications, Inc. |
| 3.7 email (Brevo) | France | Sendinblue SAS |
| 3.7 SMS — depends on the provider | India | {{SMS_PROVIDER}} (typically India) |
| 3.4 + 3.5 + 3.7 — object storage of recordings | Singapore (sgp1) | DigitalOcean LLC |
| 3.9 AI Mentor | USA | OpenAI, L.L.C. |
| 3.x — pre-recorded video playback | USA | Vimeo, Inc. |

DPAs and EU-style SCCs (or India-equivalent once notified) are in place with each. See the [Subprocessor List](subprocessor-list.md).

## 5. Review

The DPO reviews this ROPA at least quarterly. Significant changes are flagged in the [docs CHANGELOG](../CHANGELOG.md).

---

## Revision history

| Version | Date | Author | Notes |
|---|---|---|---|
| 1.0 (draft) | {{LAST_REVIEW_DATE}} | Initial draft | Reflects processing as of commit `fc089507`. |
