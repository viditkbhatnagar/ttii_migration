# Privacy Policy

**Version:** 1.0 (draft) | **Effective Date:** {{EFFECTIVE_DATE}} | **Owner:** {{DPO_NAME}}, Data Protection Officer
**Last reviewed:** {{LAST_REVIEW_DATE}} | **Next review:** {{NEXT_REVIEW_DATE}}

> This Privacy Policy describes how {{LEGAL_ENTITY_NAME}} ("**TTII**", "**we**", "**us**", "**our**") collects, uses, shares, retains, and protects personal data when you use the websites, applications, and services made available at `admin.teachersindia.in`, `learn.teachersindia.in`, `admissions.teachersindia.in` and any related domains (collectively, the "**Platform**").
>
> This policy is issued under and in compliance with the **Digital Personal Data Protection Act, 2023** ("**DPDP Act**"), the **Information Technology Act, 2000** and rules made thereunder (including the **Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011** ("**SPDI Rules**"), and where applicable the **Aadhaar (Targeted Delivery of Financial and Other Subsidies, Benefits and Services) Act, 2016**.

---

## 1. Who we are

| Field | Value |
|---|---|
| Data Fiduciary (DPDP Act) / Body Corporate (SPDI Rules) | {{LEGAL_ENTITY_NAME}} |
| Registered office | {{REGISTERED_ADDRESS}} |
| CIN | {{CIN}} |
| GSTIN | {{GST_NUMBER}} |
| Website | https://teachersindia.in |
| Data Protection Officer | {{DPO_NAME}} — {{DPO_EMAIL}} |
| Grievance Officer (IT Rules 2011 Rule 3(11)) | {{GRIEVANCE_OFFICER_NAME}} — {{GRIEVANCE_OFFICER_EMAIL}}, {{GRIEVANCE_OFFICER_PHONE}} |

You may write to either officer using the postal address above. The Grievance Officer's responsibilities are described in our [Grievance Redressal Policy](grievance-redressal-policy.md).

## 2. Scope and applicability

This policy applies to:

- All learners, applicants, and prospective students using `learn.teachersindia.in`;
- All institutional users (centres, franchisees, counsellors, associates) using `admissions.teachersindia.in`;
- All TTII staff, instructors, and administrators using `admin.teachersindia.in`;
- Visitors to TTII marketing sites and anyone whose personal data is shared with us by a centre, employer, or referee.

This policy does **not** apply to third-party websites we link to. Those sites have their own policies; please read them.

## 3. Personal data we collect

We collect the following categories of personal data. The specific fields referenced below correspond to columns in our application database; we name them so this disclosure is concrete rather than generic.

### 3.1 Identity and contact data

- Full name, gender, date of birth, age, nationality, marital status
- Mobile phone number (and country code), WhatsApp number, email address
- Postal address, native address, district, state, PIN code
- Profile photograph

> Tables: `users`, `user_details`, `applications`, `students`.

### 3.2 Government identifiers (sensitive personal data)

- **Aadhaar number** — collected only when explicitly required by a programme partner or for KYC under applicable law. See our [Aadhaar Handling Policy](../compliance/aadhaar-handling-policy.md).
- **Passport number** — for international or partner-issued certifications that require it.

> Field: `applications.aadhar_no`, `applications.passport_no`, `user_details.aadhar_no`, `user_details.passport_no`.
>
> ⚠️ **Known gap:** these fields are currently stored without column-level encryption. Remediation is tracked under our [Information Security Policy](../security/information-security-policy.md). Until remediation, access is restricted by role and audited.

### 3.3 Family and emergency contact data

- Names of father, mother, guardian
- Emergency contact name, relationship, and phone number

> Field set: `user_details.father_name`, `mother_name`, `guardian_name`, `emergency_name`, `emergency_relation`, `emergency_phone`.

### 3.4 Educational and employment data

- Highest qualification, board/university, year of passing, percentage / grade
- Previous school / college, course of study
- Current employment status, organisation name, designation, industry sector, teaching experience

### 3.5 Health, accessibility and language data (sensitive personal data)

- Self-declared learning disabilities and accessibility needs
- Languages spoken

> Field: `user_details.learning_disabilities`, `user_details.accessibility_needs`, `users.languages_spoken`.
>
> We collect this **only** to provide reasonable accommodations during instruction and assessment. It is not used for any other purpose, never shared with marketing partners, and is processed only by staff who need it to fulfil the accommodation.

### 3.6 Authentication and account data

- Username, password (always stored as a salted **scrypt** hash — we never see your plaintext password)
- One-time passwords (OTPs) sent during login or account recovery
- Device identifier, last-login timestamp
- Auth audit log (login success / failure, IP address, user agent, role-based access denials)

> Tables: `users`, `auth_audit_log`, `otp_challenge`.

### 3.7 Academic and engagement data

- Course enrolments, batch / cohort, intake
- Lesson progress, attendance (including for live classes)
- Assignment submissions and the files you upload as part of them
- Examination registrations, attempts, scores, evaluations, and certificates issued
- Live-class attendance reports and recordings (see §3.10)
- Forum / feed posts, likes, comments, chat-support conversations
- Notifications and circulars you receive

### 3.8 Payment and financial data

- Payment amount, payment mode (online via Razorpay, offline, or coupon), payment timestamp
- Razorpay order, payment, and signature identifiers (we **never** see or store your full card number, UPI VPA, or bank account number — these are handled directly by Razorpay)
- Invoice number, GST treatment, applicable discounts

> Tables: `student_payments`, `payment_info`, `applications.application_discount`, `application_gst_percent`.
>
> ⚠️ Refunds and chargebacks are governed by our [Refund & Cancellation Policy](refund-cancellation-policy.md).

### 3.9 Documents and credentials

- Documents you upload as proof (qualification certificates, ID copies, photographs)
- Certificates and transcripts we issue to you (and the records we keep of issuance)

> Tables: `student_document`, `applications` (image fields), certificate-related tables.

### 3.10 Live-class data

- Microsoft Teams or Zoom meeting metadata (join time, leave time, role in the meeting)
- **Live-class recordings**, where the session is recorded (recording is enabled by default for instructional sessions; the trainer is informed at session start)
- Attendance reports synced from Microsoft Graph for sessions hosted on Teams

> Recordings are stored in private object storage in {{OBJECT_STORAGE_PROVIDER}} and served via short-lived signed URLs. Direct download by learners is disabled by default.

### 3.11 Technical data

- IP address, user-agent string, request timestamps
- Authentication audit events (success / failure, reason)
- Application error logs (which may incidentally include user identifiers)

We do **not** currently use third-party analytics, advertising trackers, or behavioural-profiling services on the Platform. If we add any in future, this policy will be updated and (where required by law) consent will be requested before the tracker activates. See our [Cookie Policy](cookie-policy.md).

### 3.12 Data we do **not** collect

For clarity:

- We do not collect biometric templates (fingerprints, iris scans, face vectors). Profile photographs you upload are stored as ordinary images, not converted into biometric vectors.
- We do not collect raw payment-instrument data (card numbers, CVV, full bank account numbers, UPI PINs). These remain with Razorpay.
- We do not knowingly collect data from children under the age of consent without verifiable parental consent. See §10 below and our [Children's Privacy Notice](childrens-privacy-notice.md).

## 4. How we collect personal data

We collect personal data:

1. **Directly from you** — when you fill in an application, register, log in, take an exam, submit an assignment, make a payment, or contact support.
2. **From a centre or franchisee** — where a TTII partner centre enrols you on our behalf (with your consent) and uploads your details.
3. **From service providers** — for example, Razorpay returns payment-status data; Microsoft Graph returns attendance reports for sessions you joined.
4. **Automatically** — your device sends your IP address and user-agent to our servers when you use the Platform.

## 5. Why we use your personal data — purposes and lawful bases

Under the DPDP Act, personal data may be processed where the data principal has given **consent**, or where processing is for a **legitimate use** specified in §7 of the Act (including performance of a contract, compliance with law, employment, or response to medical emergencies). We rely on the following lawful bases:

| Purpose | Categories used | Lawful basis |
|---|---|---|
| Registering and maintaining your account | §3.1, §3.6 | Consent / contractual necessity |
| Delivering the courses, exams, and certifications you have enrolled in | §3.1, §3.4, §3.7 | Contractual necessity |
| Verifying your identity for KYC / programme requirements | §3.1, §3.2 | Compliance with law / contractual necessity (for partner programmes) |
| Hosting and recording live classes | §3.10 | Contractual necessity (instruction quality, attendance, replay) |
| Processing fees, refunds, and tax invoices | §3.8 | Contractual necessity / compliance with the GST and IT laws |
| Issuing certificates and transcripts | §3.7, §3.9 | Contractual necessity |
| Sending operational communications (OTPs, payment receipts, course updates, certificate issuance) | §3.1, §3.6 | Contractual necessity |
| Sending non-essential marketing communications | §3.1 | Consent (you may opt out at any time without affecting the service) |
| Accommodating learning disabilities | §3.5 | Consent and substantial public-interest grounds |
| Providing the AI Mentor feature | §3.7 + your prompt | Consent (the AI Mentor is opt-in) |
| Detecting fraud, abuse, and security incidents | §3.6, §3.11 | Legitimate use under DPDP §7(g) (security incidents and fraud) |
| Defending legal claims, regulatory inquiries, audits | All categories | Compliance with law |

### 5.1 No automated decision-making with legal effects

We do not use your personal data to make automated decisions that produce legal or similarly significant effects on you. Where a completion policy is applied automatically (e.g., issuing a certificate when attendance and exam thresholds are met), a human reviewer can audit and override the outcome on request.

## 6. Who we share your personal data with

We share personal data only as described below, and only to the extent necessary. Each of our processors is bound by a written agreement (Data Processing Agreement) requiring confidentiality and equivalent security standards.

### 6.1 Service providers (data processors)

| Recipient | Country / Region | Purpose | Categories shared |
|---|---|---|---|
| **{{HOSTING_PROVIDER}}** | India (BLR1) | Application and database hosting | All — at the infrastructure level |
| **{{OBJECT_STORAGE_PROVIDER}}** | Singapore (sgp1) | Storing course content, uploaded documents, live-class recordings | §3.7, §3.9, §3.10 |
| **{{PAYMENT_PROCESSOR}}** | India | Processing online payments and refunds | §3.1 (name, email, phone), §3.8 (amount, order ID) |
| **{{EMAIL_PROVIDER}}** | France (Brevo) and / or Ireland & USA (Microsoft) | Transactional emails (OTPs, receipts, certificate notifications) | §3.1 (name, email) |
| **{{CONFERENCING_VENDORS}}** | Ireland & USA (Microsoft Teams), USA (Zoom) | Hosting live classes; attendance reports; recording | §3.1 (name, email), §3.10 |
| **{{AI_VENDOR}}** | USA | Powering the AI Mentor feature (only when you opt in and submit a prompt) | The text of your prompt; an internal user identifier |
| **{{VIDEO_HOSTING}}** | USA | Hosting pre-recorded course videos for streaming | Aggregate playback metrics; no PII other than IP for delivery |
| {{SMS_PROVIDER}} | India | Delivering OTPs and operational SMS | §3.1 (mobile number) |

A live, version-controlled list of every subprocessor we use is published at [compliance/subprocessor-list.md](../compliance/subprocessor-list.md). We will give learners reasonable advance notice (via email or in-product banner) before adding a new subprocessor that materially changes how data is processed.

### 6.2 Centres and partner institutions

If you enrol through a TTII partner centre (a `role=Centre` user), the centre administrator can see your identity and academic data limited to the cohorts they manage. They cannot see learners outside their centre, your payment-instrument data, or other learners' assignment files. This access is required for the centre to deliver the programme and is disclosed to you at the point of enrolment.

### 6.3 Co-branded certification partners

When you complete a programme co-issued with a certification partner (a `certification_partners` record in our database), we share your name, programme details, and completion date with that partner so they can validate your certificate. We do not share your Aadhaar, payment details, or non-essential personal data with these partners.

### 6.4 Legal disclosures

We may disclose personal data:

- in response to a valid legal process (a court order, summons, search warrant, or written request from a duly authorised law-enforcement agency under the IT Act, CrPC, or other applicable law);
- to protect our rights, property, or safety, or those of our learners, staff, or the public;
- to comply with a regulator's lawful direction (including the Data Protection Board of India once constituted);
- in connection with a corporate transaction (merger, acquisition, financing) — in which case we will use reasonable efforts to ensure the recipient is bound by privacy obligations no less protective than this policy.

### 6.5 We do not sell your personal data

We do not sell, rent, or trade your personal data to advertising networks, data brokers, or any other third party for their own commercial purposes.

## 7. International transfers

Some of our processors are located outside India (Brevo in France, Microsoft and Zoom in the USA, OpenAI in the USA, Vimeo in the USA). We rely on contractual safeguards (Data Processing Agreements with EU-style Standard Contractual Clauses or equivalent) to protect your data when it is transferred outside India. The Government of India may, from time to time, notify additional restrictions on international transfers under DPDP §16; we will comply with those restrictions when notified.

## 8. How long we keep your personal data

The default retention windows below apply unless a longer period is required by law (e.g., the Income Tax Act, the GST Act, the Companies Act) or a shorter period is needed to honour a deletion request:

| Category | Retention |
|---|---|
| Active-user account data | For as long as your account is active, plus {{DATA_RETENTION_ACTIVE_USERS_YEARS}} years from your last interaction |
| Inactive-user account data | Up to {{DATA_RETENTION_INACTIVE_USERS_YEARS}} years from last login, after which it is anonymised or deleted |
| Payment and tax records | {{DATA_RETENTION_ACTIVE_USERS_YEARS}} years (statutory retention under the Income Tax Act / GST Act) |
| Academic records and certificates | Retained on a long-term basis; certificates are part of your permanent academic history |
| Authentication audit logs | {{DATA_RETENTION_AUDIT_LOGS_YEARS}} years |
| OTP challenge records | Until the OTP expires or is consumed; aggregate counts retained for fraud monitoring |
| Live-class recordings | {{DATA_RETENTION_AUDIT_LOGS_YEARS}} years from the session date, unless the cohort owner extends this for academic-integrity reasons |
| Marketing-consent records | Until you withdraw consent + 1 year (to evidence compliance) |

When the retention period ends, we either delete the data or, where deletion would impair downstream records (e.g., aggregate enrolment statistics), anonymise it so you can no longer be identified. The full schedule lives in our [Data Retention & Deletion Policy](../security/data-retention-deletion-policy.md).

> ⚠️ **Soft deletes:** when an account is "deleted" through the admin interface, our system today marks it with a `deleted_at` timestamp and removes it from listings. A hard purge runs at the end of the retention window. If you need an immediate hard delete, contact {{DPO_EMAIL}}.

## 9. Your rights

Under the DPDP Act, you have the right to:

- **Access** — obtain a summary of your personal data and the processing we perform.
- **Correction and erasure** — correct inaccurate or misleading data, and request deletion (subject to retention obligations under §8).
- **Grievance redressal** — raise a complaint with our Grievance Officer (acknowledged within {{GRIEVANCE_ACK_HOURS}} hours; resolved within {{GRIEVANCE_RESOLUTION_DAYS}} days). See our [Grievance Redressal Policy](grievance-redressal-policy.md).
- **Nominate** — nominate another individual who can exercise these rights on your behalf in the event of your death or incapacity.
- **Withdraw consent** — withdraw any consent you have given. Withdrawal does not affect the lawfulness of processing before withdrawal.

To exercise any of these rights, please use our [DPDP Rights Request Form](dpdp-rights-request-form.md), or write to {{DPO_EMAIL}}. We will respond as soon as possible and in any case within 30 days.

If you are not satisfied with our response, you may complain to the **Data Protection Board of India** (when notified) or the Ministry of Electronics and Information Technology under the IT Rules.

## 10. Children's data

We provide programmes to a mixed audience. Some programmes are for adult teachers in training and are not directed at children; others are delivered through partner schools where minors may be enrolled.

- For programmes targeted at adult learners, we do not knowingly collect personal data from children under 18. If we learn that we have inadvertently done so, we will delete it.
- For programmes delivered through partner schools or centres in which minors participate, we collect and process minors' data **only with verifiable parental or guardian consent**. The consent flow, required information, and the additional protections (no behavioural tracking, no targeted advertising, restricted access by staff) are described in our [Children's Privacy Notice](childrens-privacy-notice.md) and the [Parental Consent Form](parental-consent-form.md).

## 11. How we protect your personal data

We have implemented reasonable security practices and procedures as required under §43A of the IT Act and the SPDI Rules. The full set of technical and organisational measures is described in our [Information Security Policy](../security/information-security-policy.md). Highlights:

- **Encryption in transit**: all traffic between your device and our servers is encrypted using TLS (HTTPS).
- **Encryption at rest**: object storage uses provider-managed encryption.
- **Password handling**: passwords are never stored in plaintext; we use the **scrypt** key-derivation function with per-password random salts.
- **Authentication**: opaque session tokens (48 bytes of cryptographic randomness, hashed at rest), session timeout {{SESSION_TTL_DESCRIPTION}}, OTP-based account recovery, login rate-limiting, and tamper-evident audit logs.
- **Access control**: role-based access (six roles, least-privilege defaults). All admin actions on PII pass through guard middleware that records the user, role, IP and request path.
- **Network**: production database sits inside a private VPC; the API binds to a non-public address behind a reverse proxy.
- **Vendor security**: every processor we use is bound by a written Data Processing Agreement and reviewed against our [Vendor Risk Management Policy](../security/vendor-risk-management-policy.md).

No system is perfectly secure. If we identify a personal-data breach affecting you, we will notify you and the Data Protection Board (when constituted) **within {{BREACH_NOTIFICATION_HOURS}} hours** of confirming the breach, in line with our [Incident Response Plan](../security/incident-response-plan.md).

## 12. Cookies and similar technologies

We use only essential storage (HTTP cookies, browser `localStorage`, `sessionStorage`) for keeping you signed in, remembering your portal preference, and maintaining session security. We do not use advertising cookies, behavioural-tracking cookies, or third-party analytics cookies. Our full disclosure is in the [Cookie Policy](cookie-policy.md).

## 13. Changes to this policy

We may update this policy from time to time. The "**Last reviewed**" and "**Effective Date**" lines at the top of this document indicate the current version. Where the change is material (for example, adding a new category of processing or a new processor), we will notify you in advance through email or an in-product banner. Continued use of the Platform after the effective date of an updated policy means you accept the change. Older versions of this policy are preserved in the [docs CHANGELOG](../CHANGELOG.md) and on request from {{DPO_EMAIL}}.

## 14. How to contact us

| Type of question | Contact |
|---|---|
| Privacy / data protection | {{DPO_NAME}}, Data Protection Officer — {{DPO_EMAIL}} |
| Grievance under IT Rules 2011 | {{GRIEVANCE_OFFICER_NAME}} — {{GRIEVANCE_OFFICER_EMAIL}}, {{GRIEVANCE_OFFICER_PHONE}} |
| Security vulnerability report | {{SECURITY_EMAIL}} (see [Vulnerability Disclosure Policy](../security/vulnerability-disclosure-policy.md)) |
| Billing / refunds | {{ACCOUNTS_EMAIL}} |
| General support | {{SUPPORT_EMAIL}} |
| Postal | {{LEGAL_ENTITY_NAME}}, {{REGISTERED_ADDRESS}} |

---

## Revision history

| Version | Date | Author | Notes |
|---|---|---|---|
| 1.0 (draft) | {{LAST_REVIEW_DATE}} | Initial draft | Pre-publication. Pending placeholder fill-in and legal review. |
