# Data Retention & Deletion Policy

**Version:** 1.0 (draft) | **Effective Date:** {{EFFECTIVE_DATE}} | **Owner:** {{DPO_NAME}}, Data Protection Officer
**Last reviewed:** {{LAST_REVIEW_DATE}} | **Next review:** {{NEXT_REVIEW_DATE}}

This policy sets how long {{LEGAL_ENTITY_NAME}} ("TTII") keeps each category of data and how it is deleted at the end of the retention period. It supports the [Privacy Policy](../legal/privacy-policy.md), the [Data Protection Policy](data-protection-policy.md), and DPDP Act §17(d) (the duty to delete personal data once the purpose is met, unless retention is required by law).

## 1. Principles

1. **Purpose limitation.** Data is kept only for the specific purpose for which it was collected.
2. **Minimisation.** When the purpose ends, the data is deleted or anonymised — not retained "just in case".
3. **Statutory floors.** Where a law requires longer retention (Income Tax, GST, Companies Act, IT Act), we comply with the floor and delete at the end of that period.
4. **Honest defaults.** Where the codebase currently retains beyond purpose, we document the gap and remediate.

## 2. Retention schedule

The codebase implements **soft deletes** via a `deleted_at` timestamp column on most tables (~103 of 124 tables). Soft delete removes the record from listings but preserves the row for legitimate operational and audit purposes. **A hard purge** removes the row entirely.

| Category | Tables (illustrative) | Active retention | Hard-purge trigger |
|---|---|---|---|
| **Account profile** | `users`, `user_details` | While the account is active + {{DATA_RETENTION_ACTIVE_USERS_YEARS}} years from the last interaction | Inactive over {{DATA_RETENTION_INACTIVE_USERS_YEARS}} years OR explicit erasure request |
| **Application (lead) data** | `applications` | While the application is in pipeline + {{DATA_RETENTION_INACTIVE_USERS_YEARS}} years if not converted | Annual purge of unconverted applications older than the threshold |
| **Aadhaar / passport numbers** | `applications.aadhar_no`, `user_details.aadhar_no`, equivalents | Only as long as required for KYC + 1 year | First annual review after KYC need ends |
| **Academic records** | `students`, `student_grades`, `cohort_students`, certificate tables | Long-term (academic history is permanent) | Erasure on parent / data-principal request, subject to certification-partner obligations |
| **Live-class recordings** | object storage + metadata in DB | {{DATA_RETENTION_AUDIT_LOGS_YEARS}} years from the session date | Quarterly purge of recordings past the window |
| **Live-class attendance** | `live_class_attendance` | {{DATA_RETENTION_AUDIT_LOGS_YEARS}} years | Same as recordings |
| **Payment records** | `student_payments`, `payment_info` | **{{DATA_RETENTION_ACTIVE_USERS_YEARS}} years** (statutory: §44AA Income Tax, §35 CGST) | Annual purge after the statutory floor |
| **Auth audit log** | `auth_audit_log` | {{DATA_RETENTION_AUDIT_LOGS_YEARS}} years | Quarterly purge of older rows |
| **OTP challenge** | `otp_challenge` | Until consumed or expired; aggregate fraud-monitoring counts retained {{DATA_RETENTION_AUDIT_LOGS_YEARS}} years | Daily purge of expired rows |
| **Chat support** | `chat_support`, equivalents | 3 years from the last message | Annual purge |
| **Feed / comments** | feed tables | While the author's account is active + {{DATA_RETENTION_INACTIVE_USERS_YEARS}} years; or until removed by the author / moderation | Annual; immediate on author erasure |
| **Marketing-consent log** | consent records | While consent is in force + 1 year (to evidence compliance) | Annual |
| **Application logs (server-side)** | filesystem / log shipper | 90 days | Log rotation policy on the droplet |
| **Backups** | object storage / DigitalOcean snapshots | Per the [Backup Policy](backup-policy.md) — 30 days for daily, 12 months for monthly | Backup-rotation schedule |
| **Staff HR records** | HR system | Per the Companies Act and Income Tax Act — minimum 8 years | HR purge cycle |

## 3. Deletion mechanics

### 3.1 Soft delete

A user-driven or admin-driven delete sets `deleted_at = NOW()`. The record is hidden from all queries except those that explicitly include soft-deleted rows (e.g., audit / restoration). Application code must always include `where: { deleted_at: null }` in user-facing queries.

### 3.2 Hard purge

A scheduled job (target: monthly) removes rows whose `deleted_at` is older than the retention window. The purge:

- Selects rows from `users`, `applications`, etc. where the criteria are met;
- Removes attached object-storage files via the S3 / DO Spaces API;
- Removes downstream rows that reference the purged record (cohort assignments, attendance entries, grades) where DPDP §12 erasure requires it;
- Logs the purge in the `auth_audit_log` table with the count of rows removed;
- Preserves only the **anonymised aggregate** statistics that are non-identifying (e.g., "course X had Y completions" with no individual identifiers).

> ⚠️ **Known gap:** the scheduled hard-purge job is not yet implemented. Today, soft-deleted rows remain in the database indefinitely. Implementing the purge job is on the roadmap and is required for full DPDP §12 compliance. Until it ships, hard-deletion is performed manually on user request.

### 3.3 Anonymisation as an alternative

For data that cannot be deleted without harming legitimate downstream records (for example, aggregate enrolment statistics or instructor performance metrics), we **anonymise** the personal identifiers — replacing names, emails, and phones with stable hashes — so the individual is no longer identifiable, while preserving the analytical value.

## 4. User-driven deletion

A user (or, for a minor, the parent / guardian) may request erasure via the [DPDP Rights Request Form](../legal/dpdp-rights-request-form.md). The DPO reviews the request and:

1. Confirms identity;
2. Identifies and segregates legally-required retentions (e.g., the user's tax invoices for the past 7 years);
3. Soft-deletes everything else immediately;
4. Schedules the segregated set for hard-purge once the statutory floor expires;
5. Notifies our subprocessors that downstream copies must be deleted;
6. Confirms completion to the user in writing.

The end-to-end SLA is **30 days** from a complete request.

## 5. Backups and deletion

A user-driven hard delete cannot remove data from backups taken before the deletion request — backups are immutable copies. We do, however:

- Set a **maximum backup retention of 12 months** for monthly snapshots (see [Backup Policy](backup-policy.md));
- Treat backups as read-only and access-controlled, used only for recovery;
- On restoration from backup, immediately re-apply pending erasure requests against the restored dataset.

This approach is consistent with the EDPB / DPDP guidance that backups need not be individually edited; they must be access-controlled and aged out within a reasonable window.

## 6. Object-storage (file) deletion

Files in DO Spaces / S3 referenced by deleted records (uploaded documents, profile photos, recordings) are deleted via the storage provider's delete API. Versioning is **disabled by default** on user-uploaded buckets so a delete is final after backup retention.

## 7. Hardware and physical media

- Decommissioned production hardware is decommissioned by the cloud provider (DigitalOcean handles disk wipe before re-allocation).
- TTII-issued laptops with personal data are wiped per the [Acceptable Asset Use Policy](acceptable-asset-use-policy.md) before re-issue or disposal.
- Physical paper records (printed consent forms, ID-verification slips at centres) are shredded by the centre at the end of the retention window; centre staff sign a destruction certificate retained at the centre for 3 years.

## 8. Sub-processor deletion

Each sub-processor in the [Subprocessor List](../compliance/subprocessor-list.md) has a contractual obligation to delete TTII data within a defined window after the end of services or on TTII's instruction. The DPO verifies this by:

- Sampling deletion-confirmation receipts for high-risk processors (Aadhaar / payments / recordings);
- Including deletion in annual vendor reviews.

## 9. Audit and reporting

- The DPO reviews retention compliance quarterly and reports findings to the Engineering Lead.
- An annual report summarises the count of soft deletes, hard purges, anonymisations, and erasure requests.
- Findings are reported to the Board.

## 10. Exceptions

A retention exception may be granted by the DPO (a) where a current legal hold (litigation, regulator demand) requires preservation, or (b) where a security incident is under investigation. Exceptions are time-bound and documented.

---

## Revision history

| Version | Date | Author | Notes |
|---|---|---|---|
| 1.0 (draft) | {{LAST_REVIEW_DATE}} | Initial draft | Pre-publication. Pending implementation of the scheduled hard-purge job. |
