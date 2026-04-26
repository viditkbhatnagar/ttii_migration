# Backup Policy

**Version:** 1.0 (draft) | **Effective Date:** {{EFFECTIVE_DATE}} | **Owner:** Engineering Lead
**Last reviewed:** {{LAST_REVIEW_DATE}} | **Next review:** {{NEXT_REVIEW_DATE}}

This policy defines how {{LEGAL_ENTITY_NAME}} ("TTII") backs up production data, how long backups are retained, how they are protected, and how they are tested. It supports the [Business Continuity & Disaster Recovery Plan](business-continuity-disaster-recovery.md) and the [Data Retention & Deletion Policy](data-retention-deletion-policy.md).

## 1. What we back up

| Asset | Source | Frequency | Retention |
|---|---|---|---|
| MariaDB (`lms_ttii` database, `10.122.0.2:3306`) | Production database | **Daily logical dump** + **DigitalOcean snapshot** of the DB droplet daily | 30 days for daily; 12 months for the first-of-month snapshot |
| Object storage (DO Spaces, `ttii-lms-recordings` and any course-content bucket) | Production object storage | Provider-managed redundancy + monthly out-of-band copy to a second bucket | Per object, until purged by [Data Retention & Deletion Policy](data-retention-deletion-policy.md) |
| Application configuration (`/etc/.../app.env`, nginx config, certbot state, systemd units) | Production droplet | Configuration is in version control (`git`) plus a manual snapshot before any infra change | Permanent in version control; snapshots retained 30 days |
| Source code | GitHub `viditkbhatnagar/ttii_app` | Mirrored to a private S3 bucket weekly | 12 months |
| Build artefacts | CI / GitHub Actions | Standard 90-day GHA retention | 90 days |

> ⚠️ **Known gap:** the daily logical dump and the secondary out-of-band Spaces copy are configured manually today — see [DEPLOYMENT.md](../../DEPLOYMENT.md). Migration to a fully scripted, monitored backup pipeline is on the roadmap. Until then, the on-call engineer verifies success weekly.

## 2. Where backups live

- **Primary** — DigitalOcean snapshots in the same region as the droplet (BLR1).
- **Secondary** — Logical dumps in DO Spaces in a **different region** (`sgp1`) so a regional failure does not lose us both copies.
- **Tertiary (offline)** — Quarterly, the Engineering Lead exports a verified database dump to an encrypted external drive held in TTII's office safe, providing a true offline copy as protection against ransomware affecting cloud accounts.

## 3. Encryption

- DigitalOcean snapshots use the provider's default at-rest encryption.
- DO Spaces objects are encrypted at rest by the provider.
- Logical dumps written to Spaces are additionally encrypted client-side using AES-256-GCM with a key managed under the [Cryptography Policy](cryptography-policy.md). The decryption key is held only by the Engineering Lead and stored in the same secrets store as production keys.
- The offline drive is encrypted with full-disk encryption; the passphrase is in the founder's safe.

## 4. Access control

- Only **two named engineers** (the Engineering Lead and one designated deputy) hold credentials to read backups. Access is logged.
- A backup may be **read** without escalation; **restoration** to a non-production environment is permitted; **restoration to production** requires the Engineering Lead's explicit written authorisation.
- Vendor support staff (DigitalOcean, etc.) cannot read TTII application data even if they have infrastructure access — application-level encryption applies.

## 5. Integrity

- Each daily logical dump is followed by a **checksum** that is recorded and compared on the next day's run. A failed checksum triggers an alert to {{SECURITY_EMAIL}}.
- The size of the daily dump is monitored; a >20% deviation triggers investigation.

## 6. Restoration testing

- **Quarterly** — a full restoration of the most recent backup into a non-production sandbox, verified by:
  1. Schema integrity (Prisma `migrate status`);
  2. Spot-check of canonical records (a known student, a known payment, a known certificate);
  3. Application boot against the restored DB using a development-mode container.
- **Semi-annually** — a partial restoration drill of a single table to validate point-in-time recovery.
- **Annually** — a full disaster-recovery exercise as part of the [BC / DR Plan](business-continuity-disaster-recovery.md).

Test results are documented in the Risk Register. A failed restoration is treated as a SEV-2 incident and triggers the [Incident Response Plan](incident-response-plan.md).

## 7. Retention windows and the right to erasure

A user's right to erasure under DPDP §12 cannot reach into immutable backups taken before the erasure request. Our approach:

- Backups are immutable copies — we do not modify them;
- Backups are access-controlled and aged out within 12 months;
- On any restoration of a dataset that contains data we have committed to delete, the deletion is **re-applied immediately** against the restored copy.

This is consistent with the EDPB / DPDP-aligned guidance.

## 8. Backup of audit / log data

- The `auth_audit_log` table is included in the standard MariaDB backup.
- Server logs (nginx, application) are not currently shipped to long-term storage; on-droplet logs are subject to logrotate at 90 days. Centralised log shipping is on the roadmap (see [Logging & Monitoring Policy](logging-monitoring-policy.md)).

## 9. Compliance and audit

- The DPO reviews backup compliance annually.
- Restoration drill outcomes feed the annual security report.
- A full audit trail of restoration operations is maintained.

## 10. Cross-references

- [Business Continuity & Disaster Recovery Plan](business-continuity-disaster-recovery.md)
- [Data Retention & Deletion Policy](data-retention-deletion-policy.md)
- [Cryptography Policy](cryptography-policy.md)
- [Incident Response Plan](incident-response-plan.md)
- [DEPLOYMENT.md](../../DEPLOYMENT.md) — operational runbook

---

## Revision history

| Version | Date | Author | Notes |
|---|---|---|---|
| 1.0 (draft) | {{LAST_REVIEW_DATE}} | Initial draft | Reflects current single-droplet posture; gaps flagged. |
