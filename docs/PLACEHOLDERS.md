# Placeholder Tokens

Every legal, security, compliance, and user-guide document in this pack uses `{{PLACEHOLDER}}` tokens for entity-specific facts that we cannot invent. **Fill in every token in this file once, then run `grep -rl "{{TOKEN_NAME}}" docs/ | xargs sed -i ''` (or your editor's project-wide find/replace) to substitute across all docs.**

A `grep -r "{{" docs/` should return zero results before any document is published.

---

## A. Entity & legal

| Token | What to fill in | Source |
|---|---|---|
| `{{LEGAL_ENTITY_NAME}}` | The full registered legal name of the operating company. Example: `Teacher Training Institute of India Pvt. Ltd.` | Certificate of Incorporation |
| `{{LEGAL_ENTITY_SHORT}}` | Trading / brand name used in user-facing copy. Example: `TTII` | Marketing decision |
| `{{REGISTERED_ADDRESS}}` | Full registered office address (street, city, state, PIN, country) | Certificate of Incorporation |
| `{{CIN}}` | Corporate Identification Number issued by MCA | MCA filings |
| `{{GST_NUMBER}}` | GSTIN of the entity issuing tax invoices | GST registration |
| `{{PAN}}` | Permanent Account Number of the entity | Income Tax records |
| `{{JURISDICTION_CITY}}` | City whose courts have exclusive jurisdiction over disputes. Example: `Mumbai`, `New Delhi`, `Bengaluru` | Board decision |
| `{{GOVERNING_LAW}}` | Governing law clause body. Default: `the laws of the Republic of India` | — |

## B. Roles & contacts (mandated by IT Rules 2011 / DPDP Act)

| Token | What to fill in | Mandatory under |
|---|---|---|
| `{{GRIEVANCE_OFFICER_NAME}}` | Full name of the appointed Grievance Officer | IT Rules 2011 Rule 3(11) |
| `{{GRIEVANCE_OFFICER_DESIGNATION}}` | Job title. Example: `Head of Customer Operations` | Best practice |
| `{{GRIEVANCE_OFFICER_EMAIL}}` | Direct email. Example: `grievance@teachersindia.in` | IT Rules 2011 |
| `{{GRIEVANCE_OFFICER_PHONE}}` | Direct phone (working hours OK) | IT Rules 2011 |
| `{{GRIEVANCE_POSTAL_ADDRESS}}` | Postal address for written grievances (can equal `{{REGISTERED_ADDRESS}}`) | IT Rules 2011 |
| `{{DPO_NAME}}` | Data Protection Officer (mandatory once notified as Significant Data Fiduciary; recommended now) | DPDP §10 |
| `{{DPO_EMAIL}}` | DPO direct email. Example: `dpo@teachersindia.in` | DPDP §10 |
| `{{NODAL_OFFICER_NAME}}` | Nodal Officer for law-enforcement liaison (sometimes the same as Grievance Officer in smaller orgs) | IT Rules 2021 |
| `{{NODAL_OFFICER_EMAIL}}` | Direct email | IT Rules 2021 |
| `{{POSH_IC_PRESIDING_OFFICER}}` | Internal Committee Presiding Officer (must be senior woman employee) | POSH Act 2013 §4 |
| `{{POSH_IC_MEMBERS}}` | Other IC members — at least 2 employees + 1 external NGO/legal member | POSH Act 2013 §4 |
| `{{POSH_IC_EMAIL}}` | Group email or PO's direct email | POSH Act 2013 |

## C. Public contact channels

| Token | What to fill in |
|---|---|
| `{{SUPPORT_EMAIL}}` | General customer support. Example: `support@teachersindia.in` |
| `{{SECURITY_EMAIL}}` | Vulnerability disclosure inbox. Example: `security@teachersindia.in` |
| `{{LEGAL_REVIEW_EMAIL}}` | Legal team / external counsel intake |
| `{{ACCOUNTS_EMAIL}}` | Billing / refund / GST queries |
| `{{ADMISSIONS_EMAIL}}` | Centre / admissions queries |
| `{{INCIDENT_HOTLINE}}` | 24×7 number for security incidents |

## D. Dates & windows

| Token | What to fill in |
|---|---|
| `{{EFFECTIVE_DATE}}` | Document effective date (one per doc, set on publication) |
| `{{LAST_REVIEW_DATE}}` | Last review date (today's date on publication) |
| `{{NEXT_REVIEW_DATE}}` | Next scheduled review (typically `LAST_REVIEW_DATE + 12 months`) |
| `{{REFUND_WINDOW_DAYS}}` | Course-fee refund window. Recommended: `7` (calendar days from purchase, before content access) |
| `{{COURSE_WITHDRAWAL_DAYS}}` | Withdrawal window after course start. Recommended: `14` |
| `{{DATA_RETENTION_ACTIVE_USERS_YEARS}}` | How long active-user data is retained. Recommended: `7` (matching IT/GST audit windows) |
| `{{DATA_RETENTION_INACTIVE_USERS_YEARS}}` | How long inactive-user data is retained before purge. Recommended: `3` |
| `{{DATA_RETENTION_AUDIT_LOGS_YEARS}}` | Audit log retention. Recommended: `5` |
| `{{BREACH_NOTIFICATION_HOURS}}` | DPDP §8(6) sets "as soon as possible" — TTII commits to: `72` hours |

## E. Infrastructure & vendors (verified facts — change only if infrastructure changes)

| Token | Current value | Source |
|---|---|---|
| `{{HOSTING_REGION}}` | `Bangalore (BLR1), India` | DigitalOcean droplet location |
| `{{HOSTING_PROVIDER}}` | `DigitalOcean LLC` | DEPLOYMENT.md |
| `{{DB_PROVIDER}}` | `MariaDB on DigitalOcean (private VPC)` | DEPLOYMENT.md |
| `{{OBJECT_STORAGE_PROVIDER}}` | `DigitalOcean Spaces (S3-compatible), Singapore (sgp1)` | Memory: ttii-lms-recordings |
| `{{PAYMENT_PROCESSOR}}` | `Razorpay Software Pvt. Ltd.` | `apps/api/src/integrations/payment-gateway.ts` |
| `{{EMAIL_PROVIDER}}` | `Brevo (Sendinblue SAS, France)` and / or `Microsoft 365 (Microsoft Graph API)` | `.env.example` |
| `{{SMS_PROVIDER}}` | (configured per-deployment via `OTP_HTTP_ENDPOINT`) | `.env.example` |
| `{{CONFERENCING_VENDORS}}` | `Microsoft Teams (Microsoft Ireland Operations Ltd.)` and `Zoom Video Communications, Inc.` | `apps/api/src/integrations/teams-meeting-service.ts`, `zoom-provider.ts` |
| `{{AI_VENDOR}}` | `OpenAI, L.L.C.` (used for the AI Mentor feature) | `apps/api/src/integrations/openai-provider.ts` |
| `{{VIDEO_HOSTING}}` | `Vimeo, Inc.` (pre-recorded course videos) | Memory: video-storage-policy |

## F. Service & support windows

| Token | Recommended value |
|---|---|
| `{{SUPPORT_HOURS}}` | `Monday to Saturday, 09:00 – 18:00 IST (excluding public holidays)` |
| `{{GRIEVANCE_ACK_HOURS}}` | `48` (mandatory acknowledgement under IT Rules 2011) |
| `{{GRIEVANCE_RESOLUTION_DAYS}}` | `15` (mandatory under IT Rules 2011 Rule 3(11)) |
| `{{SLA_UPTIME_PERCENT}}` | `99.5%` (current single-droplet posture; raise on HA migration) |
| `{{SESSION_TTL_DESCRIPTION}}` | `1 hour` (matches `AUTH_SESSION_TTL_SECONDS=3600`; update if config changes) |

## G. Insurance & financial (optional but recommended)

| Token | Source |
|---|---|
| `{{CYBER_LIABILITY_INSURER}}` | Insurance certificate |
| `{{CYBER_LIABILITY_LIMIT_INR}}` | Insurance certificate |

## H. Known-gap acceptance flags

These are not strings — they are acknowledgements. Before publishing, the named owner must confirm in writing that the gap is a **known accepted risk** until remediation is scheduled.

| Flag | Owner |
|---|---|
| `{{ACCEPT_GAP_CORS_PERMISSIVE}}` | Engineering Lead — current CORS allows all origins; restrict before publishing security whitepaper |
| `{{ACCEPT_GAP_CSP_DISABLED}}` | Engineering Lead — Helmet CSP currently disabled |
| `{{ACCEPT_GAP_AADHAAR_PLAINTEXT}}` | DPO — `applications.aadhar_no` stored without column-level encryption |
| `{{ACCEPT_GAP_TOKEN_IN_QUERY}}` | Engineering Lead — auth tokens accepted in query / body (leakage in logs / referrers) |
| `{{ACCEPT_GAP_NO_USER_DATA_EXPORT_API}}` | DPO — no self-serve "download my data" endpoint yet (DPDP §11) |
| `{{ACCEPT_GAP_NO_SELF_DELETE}}` | DPO — no self-serve account-deletion endpoint (DPDP §12) |
| `{{ACCEPT_GAP_RATE_LIMIT_IN_MEMORY}}` | Engineering Lead — rate limiter is in-memory, resets on restart |

---

## Suggested fill-in workflow

1. **Print this file** and fill in handwritten values during a session with Legal + Engineering + the founder. Don't try to fill it in solo — three of these tokens have legal liability (Grievance Officer, DPO, POSH IC).
2. **Type the values into a spreadsheet** (single column: token → value).
3. **Run a project-wide find-and-replace** across `docs/` only. The grep check at the top of this file is your validator.
4. **Commit the resulting state** as `chore(docs): populate v1 placeholders`. Tag the commit `docs-v1.0`.
5. **Schedule the next review** — every doc has `{{NEXT_REVIEW_DATE}}`. Add a calendar reminder.
