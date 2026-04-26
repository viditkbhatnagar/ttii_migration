# Centre / Admissions Portal Manual

**Audience:** Centre administrators (role 7) and Associates (role 10) using `admissions.teachersindia.in`
**Last reviewed:** {{LAST_REVIEW_DATE}}

This manual covers every section of the Centre Portal. New to TTII? Start with [Getting Started](getting-started.md).

## Layout

After login you land on the **Centre Dashboard**. The left sidebar gives you nine sections:

1. **Dashboard**
2. **Applications**
3. **Students**
4. **Courses**
5. **Cohorts**
6. **Live Classes**
7. **Resources**
8. **Wallet**
9. **Support**

Everything you see is **scoped to your centre**. You cannot view or modify data belonging to other centres.

---

## 1. Dashboard

A summary of your centre's metrics:

- **Active students**, **pending applications**, **applications converted this month**;
- **Wallet balance** and any pending dues;
- **Upcoming live classes** at your centre;
- **Recent payments** and invoices;
- **Unread notifications and circulars** from TTII.

This is where most centre admins start their day.

---

## 2. Applications

The pipeline of prospective learners who applied through your centre.

### Listing

Search by name, phone, email, or status. Filter by date range, programme, or status (`pending`, `under review`, `converted`, `rejected`).

### Adding a new application

Click **+ Add Application**. The four-tab form covers:

1. **Personal** — name, gender, DOB, phone, email, address.
2. **Education / Employment** — qualification, school, employer.
3. **Programme** — course/offering, certificate combination, intake, fee.
4. **Documents** — upload ID copies, photographs, parental consent (for minors). The [Parental Consent Form](../legal/parental-consent-form.md) is required for any applicant under 18.

> **Aadhaar.** Only collect if the programme requires it. Use the explicit toggle. See the [Aadhaar Handling Policy](../compliance/aadhaar-handling-policy.md).

### Viewing an application

The detail page has three tabs:

- **Application** — read-only summary;
- **Documents** — uploaded proofs;
- **Status & history** — every state change with timestamp and operator.

### Converting an application

Once the applicant pays their first instalment (or full fee) and you have all documents, click **Convert to Student**. The system creates the student account and enrols them into the chosen cohort.

### Rejecting / closing

Use **Reject** with a written reason; the applicant is informed by email.

---

## 3. Students

Your enrolled students.

- **Search and filter** by name, course, intake, or status.
- **Open a student** to see profile, enrolments, payments, certificates, and assignment status.
- **Bulk upload** (where available) to enrol many students at once via CSV. Use the template provided. Mistakes are reversible — wrong rows can be soft-deleted from the listing.
- **Change** the student's username, password (with reason), or enrolment ID using the dedicated buttons. Each action is audit-logged.
- **Document requests** — a student can request a transcript or certificate; you can fulfil from the same page.

---

## 4. Courses

Courses your centre is authorised to deliver. You cannot create new courses (TTII admin does that), but you can:

- View the catalogue;
- See the offering (price, GST, instalment plan, intake dates) for each course assigned to your centre;
- Mark interest in additional courses (the request goes to TTII admin for approval).

---

## 5. Cohorts

The actual classes / batches at your centre.

### Viewing a cohort

Four tabs:

- **Students** — who is in this cohort;
- **Schedule** — class dates and times;
- **Live classes** — list of all sessions, with status (upcoming / live / past), recording link if past;
- **Performance** — aggregate progress (lessons completed, exam scores, attendance percentage).

### Adding a session

Click **+ Add session**, pick the course, instructor, platform (Teams / Zoom / manual link), date, and duration. The platform creates the meeting and emails the invite to all enrolled students.

### Attendance

For Teams sessions, attendance is **synced automatically** from the Microsoft attendance report ~2 minutes after the session ends. For Zoom and manual sessions, mark attendance manually.

---

## 6. Live Classes

A direct view of all live classes at your centre, across all cohorts. Filter by date / instructor / status. Useful for daily operations.

For each session: join link (during), recording link (after), attendance summary.

---

## 7. Resources

Centralised library of materials shared by TTII for centre staff:

- Marketing collateral (brochures, banners);
- Operations runbooks;
- Training videos for centre staff;
- Compliance documents (TTII centre agreement, this documentation pack, etc.).

You can also upload centre-specific documents that your team can refer to.

---

## 8. Wallet

Your centre's prepaid balance with TTII.

- **Current balance**;
- **Top-up** via Razorpay or via offline payment to TTII (NEFT / cheque); offline top-ups are added by TTII Accounts after verification;
- **Transaction history** — every debit (course fee shared with TTII, services purchased) and credit (top-up, refunds);
- **Statements** — monthly downloadable PDF.

If your wallet runs low, the system warns you on the Dashboard. New enrolments may be blocked if the wallet hits zero.

---

## 9. Support

Two-way chat with TTII admin.

- Raise tickets for: technical issues, billing queries, course-content requests, escalations.
- Wait time: first response within {{SUPPORT_HOURS}}.
- For grievances, escalate to {{GRIEVANCE_OFFICER_EMAIL}} per the [Grievance Redressal Policy](../legal/grievance-redressal-policy.md).

---

## Common tasks

| Task | Where |
|---|---|
| Add a new applicant | Applications → + Add |
| Convert an applicant to a student | Applications → Open → Convert |
| Schedule a live class | Cohorts → Open → + Add session |
| Mark attendance manually | Live Classes → Open session → Attendance |
| Top up the wallet | Wallet → Top-up |
| Find a student's payment status | Students → Open → Payments tab |
| Issue a transcript / certificate | Students → Open → Documents → Request fulfilment |
| Raise a support ticket | Support → New conversation |
| Read a TTII circular | Notifications |

---

## Things to know

### Data scope and confidentiality

You can see data only for **your centre**. Trying to access another centre's URL is logged and may result in suspension under the [Acceptable Use Policy](../legal/acceptable-use-policy.md).

### Personal data of learners

You are a **sub-processor** under TTII's contract. The [Data Processing Agreement template](../compliance/data-processing-agreement-template.md) governs your handling. Specifically:

- Do not export learner data to personal devices, personal email, or third-party tools.
- Do not share Aadhaar numbers via WhatsApp / Telegram / email.
- Shred printed personal data when no longer required.
- Follow the [Acceptable Asset Use Policy](../security/acceptable-asset-use-policy.md).

### Minors

For any applicant under 18, you must collect a signed [Parental Consent Form](../legal/parental-consent-form.md) and verify the parent's identity in person. The form stays at your centre; do not photograph it for the central record.

### Security

If you suspect compromise of your centre account or accidental disclosure, email {{SECURITY_EMAIL}} immediately and inform your TTII account manager.

---

## Where to go next

- [FAQs](faqs.md)
- [Troubleshooting](troubleshooting.md)
- [Privacy Policy](../legal/privacy-policy.md)
- [Children's Privacy Notice](../legal/childrens-privacy-notice.md)
- [Acceptable Use Policy](../legal/acceptable-use-policy.md)
