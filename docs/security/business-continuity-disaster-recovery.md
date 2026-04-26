# Business Continuity & Disaster Recovery Plan

**Version:** 1.0 (draft) | **Effective Date:** {{EFFECTIVE_DATE}} | **Owner:** Engineering Lead, with CEO sign-off
**Last reviewed:** {{LAST_REVIEW_DATE}} | **Next review:** {{NEXT_REVIEW_DATE}}

This plan describes how {{LEGAL_ENTITY_NAME}} ("TTII") keeps operating through disruptions and recovers from disasters. It complements the [Backup Policy](backup-policy.md) and the [Incident Response Plan](incident-response-plan.md).

## 1. Scope

Service disruptions in scope:

- Loss of the production droplet (cloud failure, accidental termination);
- Loss of the production database;
- Loss of object storage (recordings, course content);
- Vendor outage (Razorpay, Microsoft Graph, Brevo, Zoom, Vimeo);
- Cyber incidents (ransomware, account compromise);
- Regional outage of DigitalOcean Bangalore (BLR1);
- Office unavailability (fire, civil disturbance, pandemic);
- Key-personnel unavailability (engineering lead, founder).

Out of scope (handled elsewhere):

- Personal-data breach response — see [Incident Response Plan](incident-response-plan.md);
- Routine maintenance and on-call — see internal on-call runbook.

## 2. Recovery objectives

These targets reflect the **current single-droplet posture**. They will be revised when we move to a high-availability deployment.

| System | RPO (max data loss) | RTO (max downtime) |
|---|---|---|
| Web platform (admin / learn / admissions) | 24 hours (since last DB snapshot) | 8 hours |
| MariaDB | 24 hours | 8 hours |
| Object storage (recordings, course content) | 24 hours (between cross-region copies) | 24 hours |
| Razorpay payments | 0 — provider-managed | Provider SLA |
| Live classes (Microsoft Teams) | Not applicable — provider-managed | Provider SLA |
| Email (Brevo / Microsoft 365) | Not applicable — provider-managed | Provider SLA |

Targets are aspirational at this writing. Achievement requires the gaps in the [Backup Policy](backup-policy.md) and below to be closed.

## 3. Continuity strategies

### 3.1 Application & API

The Node.js application is stateless except for the in-memory rate limiter. Recovery from droplet loss involves provisioning a new droplet, restoring the latest database snapshot, deploying the latest code from `main`, and pointing DNS at the new droplet's IP.

- DNS is managed at WebQ (the registrar). DNS changes can take 5–60 minutes to propagate; TTL is set to 5 minutes on production records to minimise this.
- Let's Encrypt re-issues automatically via certbot.
- The full provisioning runbook is in [DEPLOYMENT.md](../../DEPLOYMENT.md).

### 3.2 Database

MariaDB lives at `10.122.0.2:3306` on a private VPC, accessed only from the application droplet. Recovery options, in order:

1. **Restore the latest DigitalOcean snapshot** to a new DB droplet.
2. **Restore the latest logical dump** from DO Spaces (`sgp1`) onto a fresh MariaDB instance.
3. **Restore the offline encrypted copy** if both online sources are unavailable.

Once restored, application configuration is updated to point at the new DB host.

### 3.3 Object storage

Live-class recordings and course content live in DO Spaces (`ttii-lms-recordings`, `sgp1`). Recovery options:

1. **DigitalOcean's bucket-level redundancy** handles common provider failures transparently.
2. **Monthly out-of-band copy** to a second bucket — restoration is a re-mirror.
3. **Vimeo holds the master copies** of pre-recorded course videos; recordings re-uploaded from local trainer copies if needed.

### 3.4 Payments

Razorpay is the source of truth for payment status. If our DB is restored from an older snapshot, payments not yet reflected in the DB are reconciled via Razorpay's transaction API and webhook replay.

### 3.5 Live classes

Live classes run on Microsoft Teams or Zoom. If our application is unavailable but a class is scheduled to start in <2 hours:

1. The on-call engineer creates a Teams meeting directly through Outlook / Teams admin and emails the meeting link to the affected cohort;
2. Attendance is captured manually by the trainer and reconciled into the platform after recovery.

### 3.6 Email & SMS

If Brevo or Microsoft 365 fails, we fail over to the alternate (TTII has both configured). If both fail, OTP and operational emails fall back to the manual queue handled by Operations.

## 4. Personnel continuity

- The **Engineering Lead** is the primary technical decision-maker. The **deputy** (named in the Risk Register) is the backup; the deputy holds duplicate credentials to the production droplet.
- The **CEO** is the ultimate authority on customer-facing communications and cross-functional decisions. The **founder** is the secondary authority.
- The **DPO** ({{DPO_NAME}}) handles regulator communications. The **Grievance Officer** ({{GRIEVANCE_OFFICER_NAME}}) handles individual complaints.
- A **runbook for engineering basics** lives in [DEPLOYMENT.md](../../DEPLOYMENT.md). Any senior engineer with droplet SSH access and DB credentials can keep the lights on for a 24-hour window.

## 5. Office continuity

- The Platform is **fully cloud-hosted** — no operations depend on a TTII office being online.
- Staff laptops are configured for remote work. Communication tools (chat, video calls, ticketing) are SaaS.
- In an extended office outage, the team works remotely indefinitely.

## 6. Communication during a disaster

| Audience | Channel |
|---|---|
| Internal | Pre-designated Slack / chat channel; phone tree if chat is also down |
| Learners | Email blast (or in-product banner once recovered); a status page when established |
| Centres | Direct phone calls from Operations + email |
| Partners | Email + dedicated relationship manager |
| Press / public | Only via a single spokesperson, briefed by the CEO and {{LEGAL_REVIEW_EMAIL}} |
| Regulators | DPO, per the [Incident Response Plan](incident-response-plan.md) |

A single source of truth (the Slack channel) is maintained throughout the disaster, with status updates at least every hour.

## 7. Recovery procedures

### 7.1 Total droplet loss

1. Provision a new droplet in BLR1 (or, if BLR1 is unavailable, BLR2 / SGP1) using the Terraform / shell provisioning script in `infra/`.
2. Install nginx, certbot, Node.js per [DEPLOYMENT.md](../../DEPLOYMENT.md).
3. Pull the latest `main` branch and run `npm ci && npm run build`.
4. Provision a new MariaDB droplet (per §3.2) and restore the latest backup.
5. Install secrets from the secure store onto the new droplet.
6. Update DNS A records to point to the new droplet IP.
7. Smoke-test the three portals (`admin.`, `learn.`, `admissions.`).
8. Announce restoration in the customer channel.

### 7.2 Database corruption

1. Take the current DB **read-only** to prevent further damage.
2. Restore the latest known-good backup into a sandbox DB droplet.
3. Identify the delta between the corrupted DB and the restore (transaction logs where available).
4. Either: replace the corrupted DB with the restored copy + manually replay the recoverable delta, **or** patch the corruption in place if scope is narrow.
5. Resume normal operation.
6. Run a full backup post-recovery.

### 7.3 Region outage (BLR1 unavailable)

1. Provision in a different region (BLR2 or SGP1).
2. Restore from the cross-region SGP1 backup.
3. Update DNS — accept the higher latency until BLR1 returns.
4. Failback to BLR1 once it is healthy, during a maintenance window.

### 7.4 Ransomware / account compromise

1. **Immediately rotate all credentials** — DigitalOcean account, GitHub access, vendor API keys, SSH keys.
2. Verify backups are intact and from a known-clean point in time (i.e., before compromise).
3. Provision a clean environment from the offline backup if the cloud account is suspected compromised.
4. Trigger the [Incident Response Plan](incident-response-plan.md) — including CERT-In and DPDP notifications.

## 8. Drills and testing

| Drill | Frequency | Owner |
|---|---|---|
| Backup restore to sandbox | Quarterly | Engineering Lead |
| Failover of a single environment to a secondary droplet | Semi-annually | Engineering Lead |
| Full disaster simulation (table-top) | Annually | Engineering Lead + Security Working Group |
| Vendor-failure drill (e.g., simulated Razorpay outage) | Annually | Operations |

Drill outcomes feed back into this plan and the Risk Register.

## 9. Insurance

Cyber-liability insurance is in place with {{CYBER_LIABILITY_INSURER}}, limit {{CYBER_LIABILITY_LIMIT_INR}}. The policy covers incident-response costs, regulatory fines (where insurable), data-restoration, business interruption, and third-party claims for breach.

## 10. Plan review

This plan is reviewed at least annually, after any major incident, and on any material infrastructure change (e.g., move to high-availability, multi-region).

## 11. Cross-references

- [Backup Policy](backup-policy.md)
- [Incident Response Plan](incident-response-plan.md)
- [Vendor Risk Management Policy](vendor-risk-management-policy.md)
- [DEPLOYMENT.md](../../DEPLOYMENT.md) — operational runbook

---

## Revision history

| Version | Date | Author | Notes |
|---|---|---|---|
| 1.0 (draft) | {{LAST_REVIEW_DATE}} | Initial draft | Reflects current single-droplet posture. Targets to be revised on HA migration. |
