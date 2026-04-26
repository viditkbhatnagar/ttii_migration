# Admin Portal User Manual

**Audience:** Super Admin (role 1), Sub-admin (role 8), Counsellor (role 9) using `admin.teachersindia.in`
**Last reviewed:** {{LAST_REVIEW_DATE}}

This is the day-to-day reference for the admin portal. The portal has 50+ pages grouped under 15 functional areas. Counsellors see a scoped subset of the navigation; Sub-admins see most pages but cannot manage roles / users; Super Admins see everything.

> **Counsellor scope.** A Counsellor (role 9) only sees Dashboard, Applications, Students, Counsellor Targets, and Student Referrals in the sidebar. The full guide below applies to Super Admin / Sub-admin.

## Layout

After login you land on the **Admin Dashboard**. The left sidebar groups pages under areas. Use the global search (top bar) to jump straight to a page.

---

## A. Learner Management

### A.1 Applications

CRUD for incoming applications. Filter by status, programme, intake, source, centre. Open to view a 3-tab detail. Convert to Student once fees are received and documents are verified. Reject with a written reason.

### A.2 Students

Master list of enrolled learners. Search by name, phone, email, enrolment ID. Open a student to see the full 3-tab profile (Profile / Enrolments / Payments). Useful sub-actions: Change Username, Change Password (with reason), Change Enrolment ID. Each action is audit-logged.

### A.3 Enrollments

A platform-wide view of all enrolments. Useful for reconciliation and reporting.

### A.4 Intakes (Batch)

Cohort-intake cycles. An intake defines when admissions open / close and which programmes are accepting students.

### A.5 Assignment Submissions

Aggregate view of all assignment submissions across courses. Useful for academic-integrity review.

---

## B. Centres

### B.1 Centres directory

CRUD for partner centres. Each centre has a 4-section form: identity, contact, programmes, settings. Add or edit a centre, mark active / inactive.

### B.2 Centre Cohort Detail

Centre-by-centre view: cohorts, students, payments, performance.

### B.3 Centre Payments & Wallet

Approve or reject offline payments. Top up centre wallets manually. View wallet balances and transaction history.

### B.4 Resources (centre-facing)

Upload and manage the resources visible in centres' Resources tab.

### B.5 Training Videos

Upload, edit, and organise training videos for centre staff.

---

## C. Courses & Content

### C.1 Programs

Programme catalogue (a programme is typically a multi-course bundle with a co-branded certificate). CRUD plus pricing, eligibility, and certification partner.

### C.2 Courses

Course directory. CRUD; rich-text editor for descriptions; pricing; certification policy. Use the Course Subjects sub-page to add / edit subjects and their lessons.

### C.3 Course Offerings

An "offering" is a specific instance of a course (when, where, who teaches, what fee). The same course can have multiple concurrent offerings.

### C.4 Content Library

Master library of content assets (videos, PDFs, audios, articles). Reusable across courses.

### C.5 Books Library / Short Content

Standalone learning material (books, short articles) not tied to a specific course.

### C.6 Add / Edit Lesson

The lesson builder. Drag-reorder lessons, add multiple types (video, document, audio, article, quiz), upload assets, set pre-requisites.

---

## D. Certification

### D.1 Certificate Templates

Design templates with placeholders (`{{learner_name}}`, `{{course_title}}`, etc.). Add signatories.

### D.2 Certificate Combinations

Bundle multiple certificates into a single combination (useful for programmes that issue several certificates at completion).

### D.3 Completion Policies

The rules a learner must meet to receive the certificate. Configurable: minimum attendance percentage, minimum exam score percentage, all assignments required, manual approval required.

### D.4 Certificates

Issue, view, revoke certificates. Auto-issuance happens when a completion policy is met (and `manual_approval = 0`); else the certificate sits in a queue here for manual approval.

### D.5 Certification Partners

Co-branding partners that appear on certificates.

---

## E. Cohorts & Live Delivery

### E.1 Cohorts

Cohort directory. Create, edit, archive. View student roster.

### E.2 Live Classes

Schedule, edit, and monitor live classes across the platform. Filter by date, instructor, course, status.

### E.3 Integrations (Live)

Configure Microsoft Teams hosts and Zoom credentials. Verify the integration is healthy.

---

## F. Fees & Payments

### F.1 Course Fee Status (Fee)

Pricing master. Set fees per offering, including GST, discount, instalment options.

### F.2 Fee Installments

The instalment plans. Edit number of instalments, due-date offset, late-payment fee.

### F.3 Payments (admin view)

The platform-wide list of all payments with filters (online / offline / coupon, status, date range). Approve offline payments. Send reminders. Mark refunds.

### F.4 Student Payments

Per-student transaction audit.

### F.5 Scholarships

Scholarship rules and assignments. Apply at the application or student level.

---

## G. Staff Management

### G.1 Instructors

Instructor directory. CRUD profile. Configure Teams / Zoom credentials per instructor.

### G.2 Counsellors

CRUD; assign sales targets. Counsellor activity dashboard.

### G.3 Associates

CRUD field-agent associates (role 10). Associates work under a centre.

### G.4 Admin Users

Super Admin / Sub-admin user management. Only the Super Admin can edit this.

### G.5 Roles & Permissions

The RBAC matrix. Read-only for most admins; write access only for the Super Admin. The matrix is also enforced in code — do not expect changes here to bypass server-side checks.

---

## H. Assessments

### H.1 Exams

Exam directory. CRUD; scheduling; proctoring rules; question bank linkage.

### H.2 Question Bank

Question library by subject and difficulty.

### H.3 Exam Evaluation

Manual marking workflow for subjective questions.

### H.4 Exam Results

Bulk publish results. Generate transcripts.

### H.5 Re-Examinations

Configure re-examination policies and registrations.

### H.6 Entrance Exams

A separate exam track used for admission tests; has its own registration and results flow.

---

## I. Engagement & Communications

### I.1 Notifications

Send platform notifications to learners (single, group, or broadcast).

### I.2 Circulars

Long-form announcements. Assign target audience.

### I.3 Events

On-campus / online events.

### I.4 Chat Support

Two-panel UI: list of conversations on the left, the active one on the right. Reply, escalate, transfer to another agent.

### I.5 Feeds

Social-style post feed. Create, pin, edit, delete posts. Moderate comments.

### I.6 FAQs and User Feedbacks (Reviews)

Edit FAQs. View and respond to user feedback / reviews.

---

## J. Documents & Records

### J.1 Documents Requests

Student-initiated requests for transcripts, certificates, official letters.

### J.2 Documents Issued (Documents)

Audit trail of issued documents.

### J.3 Document Delivery

Postal-tracking helper for documents that need to be physically delivered.

---

## K. CRM & Enquiries

### K.1 Enquiries

Lead-tracking pipeline. Add, qualify, convert (or reject) enquiries.

### K.2 Student Referrals

Track learner referral programmes and rewards.

---

## L. AI & Mentorship

### L.1 Mentorship History

Read-only view of conversations between learners and the AI Mentor (where the learner has opted in). Subject to the [Privacy Policy](../legal/privacy-policy.md) — access by named admins only, audit-logged.

### L.2 Mentorship Analysis

Aggregate analytics over AI-mentor usage.

---

## M. Marketing & Public

### M.1 Banners

Manage homepage / portal banners.

### M.2 Testimonials

Edit the public testimonials shown on marketing pages.

### M.3 Packages

Marketing packages / bundles.

---

## N. Settings

### N.1 Settings

Application-level settings: branding, contact info, defaults.

### N.2 Language

UI language preferences.

### N.3 Integrations

Configure / verify third-party integrations (Razorpay, Brevo, Microsoft 365, Zoom, OpenAI, S3 / Spaces, Vimeo).

### N.4 Calendar

Global academic calendar.

### N.5 App Enrollments

Track signups via mobile / external app channels.

---

## Common admin tasks

| Task | Where |
|---|---|
| Approve an offline payment | Payments → filter by `status=pending offline` → Approve |
| Issue a manual certificate | Certificates → + Issue |
| Bulk send a circular to a centre | Circulars → + New → target audience = "Centre X" |
| Disable a student account | Students → Open → ⋯ → Disable |
| Reset a student's password | Students → Open → Change Password (you must enter a reason — audit-logged) |
| Run an admissions report | Applications → Filters → Export CSV |
| Add a new instructor | Staff → Instructors → + Add |
| Update GST percentage on a course | Courses → Open → Pricing tab |
| Schedule a live class | Cohorts → Open → + Add session |
| Replace a co-branded certificate template | Certification → Templates → Open → Edit |

---

## Permissions in summary

| Action | Super Admin (1) | Sub-admin (8) | Counsellor (9) |
|---|---|---|---|
| User / role management | ✅ | ❌ | ❌ |
| Centres CRUD | ✅ | ✅ | ❌ |
| Courses, Programs, Offerings | ✅ | ✅ | ❌ |
| Applications, Students | ✅ | ✅ | ✅ (assigned only) |
| Counsellor Targets, Referrals | ✅ | ✅ | ✅ (own) |
| Payments | ✅ | ✅ | View-only |
| Certificates | ✅ | ✅ | ❌ |
| Settings & Integrations | ✅ | ❌ | ❌ |
| AI Mentorship history | ✅ | view by exception | ❌ |

The authoritative permission source is [`apps/api/src/auth/middleware.ts`](../../apps/api/src/auth/middleware.ts) and the route-level guards. UI restrictions mirror these but are not the security boundary.

---

## Things to know

### Audit logging

Every mutation by an admin (delete, password reset, role change, payment approval, certificate issuance) is recorded in `auth_audit_log`. The DPO reviews monthly. Do not use admin powers for personal curiosity.

### Personal data discipline

- **Need-to-know.** Open a learner's record only when your task requires it.
- **No exports off-platform.** Never paste learner personal data into an external chat / email / spreadsheet outside TTII.
- **Aadhaar.** Default-masked; click-to-reveal is logged. See the [Aadhaar Handling Policy](../compliance/aadhaar-handling-policy.md).
- **Minors.** Programmes admitting under-18s are flagged. Treat their data per the [Children's Privacy Notice](../legal/childrens-privacy-notice.md).

### Production discipline

- Do **not** delete records to "clean up". Use the soft-delete (which sets `deleted_at`); the [Data Retention & Deletion Policy](../security/data-retention-deletion-policy.md) handles purge.
- Do **not** edit data in the database directly. All changes go through the UI / API so they are audit-logged.

### Reporting concerns

- Suspected security incident → {{SECURITY_EMAIL}} + {{INCIDENT_HOTLINE}};
- Suspected privacy incident → {{DPO_EMAIL}};
- Grievance from a learner / centre → {{GRIEVANCE_OFFICER_EMAIL}};
- POSH complaint → {{POSH_IC_EMAIL}}.

---

## Where to go next

- [FAQs](faqs.md)
- [Troubleshooting](troubleshooting.md)
- [Information Security Policy](../security/information-security-policy.md)
- [Acceptable Use Policy](../legal/acceptable-use-policy.md)
- [Acceptable Asset Use Policy](../security/acceptable-asset-use-policy.md)
