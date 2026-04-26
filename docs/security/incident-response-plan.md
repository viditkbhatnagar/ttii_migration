# Incident Response Plan

**Version:** 1.0 (draft) | **Effective Date:** {{EFFECTIVE_DATE}} | **Owner:** Engineering Lead, with {{DPO_NAME}} for personal-data incidents
**Last reviewed:** {{LAST_REVIEW_DATE}} | **Next review:** {{NEXT_REVIEW_DATE}}

This is the playbook {{LEGAL_ENTITY_NAME}} ("TTII") follows when a security or privacy incident is detected. It implements DPDP Act §8(6) (notification of personal-data breach) and CERT-In Cybersecurity Directions, 2022 (incident reporting within 6 hours).

> If you are reading this **right now** because something is on fire: **page the on-call** at {{INCIDENT_HOTLINE}}, then come back to §3 (Detect) and follow the steps in order.

## 1. Definitions

- **Event** — a thing that happened (a failed login, a 5xx, a vendor outage). Most events are not incidents.
- **Incident** — an event that compromises, or might compromise, the confidentiality, integrity, or availability of TTII information assets, **or** the personal data of any data principal.
- **Personal-data breach (DPDP §2(t))** — any unauthorised processing or accidental disclosure, acquisition, sharing, use, alteration, destruction, loss of access to, or loss of personal data, that compromises the confidentiality, integrity, or availability of personal data.
- **Cyber incident (CERT-In)** — broader: ransomware, data leak, identity theft, large-scale fraud, denial of service, unauthorised access, etc.

## 2. Severity levels

| Level | Examples | Time-to-respond | Escalation |
|---|---|---|---|
| **SEV-1 (critical)** | Confirmed personal-data breach affecting >100 users; unauthorised admin access; ransomware; payment-data exposure | **15 minutes** | Engineering Lead + DPO + CEO + Board within 1 hour |
| **SEV-2 (high)** | Suspected breach; exposed credentials; widespread service outage; targeted attack | **1 hour** | Engineering Lead + DPO |
| **SEV-3 (medium)** | Localised outage; suspicious activity in audit logs; phishing attempt against a staff account | **4 hours** | Engineering Lead |
| **SEV-4 (low)** | Single failed-login burst; vendor-side blip; non-prod issue with no learner impact | Same business day | Engineering on-call |

Severity is **assigned on initial assessment** and can be raised or lowered as the investigation proceeds.

## 3. The flow

### Phase 1 — Detect

Triggers:

- Alert from logs / monitoring (auth-audit anomalies, error spikes);
- Report from a learner / centre / instructor (e.g., "I see another user's data");
- Vulnerability report via the [Vulnerability Disclosure Policy](vulnerability-disclosure-policy.md);
- Vendor breach notification;
- Internal staff observation.

Action: any TTII person who suspects an incident emails {{SECURITY_EMAIL}} and pages {{INCIDENT_HOTLINE}}. **Don't sit on it. False alarms are cheap; missed incidents are expensive.**

### Phase 2 — Triage (first 30 minutes for SEV-1)

The on-call:

1. Opens an **incident channel** (Slack / chat) named `inc-YYYYMMDD-<short-name>`.
2. Assigns an **Incident Commander (IC)** — usually the on-call themselves; may pass to the Engineering Lead for SEV-1.
3. Identifies a **scribe** to keep an in-channel timeline.
4. Sets the initial severity.
5. Pages the DPO if any personal-data dimension is plausible.

### Phase 3 — Contain

The IC's first goal is **stop the bleeding**, not find root cause. Possible containment actions:

- Disable the affected account / session / API key;
- Roll a leaked secret (HMAC key, vendor token);
- Block an offending IP at the reverse proxy;
- Take a feature offline behind a flag;
- Take the service offline if the trade-off justifies it (rare; needs Engineering Lead authorisation).

Containment actions are recorded in the channel timeline.

### Phase 4 — Investigate

Investigation, in parallel where capacity allows:

- **Scope** — what data is affected, who is affected, how many records.
- **Timeline** — when it started, when it was detected, when each containment step landed.
- **Cause** — vulnerability exploited, configuration error, vendor compromise, insider, social engineering.
- **Spread** — were credentials stolen? Is a backdoor in place? Are downstream systems affected?

Forensics is preserved from minute one — copy logs, take database snapshots, save server images. No log-trimming, no DB-cleanup, no `git push --force` until the IC says so.

### Phase 5 — Notify

This is where regulatory clocks run.

#### 5.1 CERT-In notification (Cybersecurity Directions, April 2022)

For a "cyber incident" listed in Annexure I of the directions (which includes data breaches, identity theft, unauthorised access to social media accounts, server compromise, etc.):

- **Within 6 hours of becoming aware of the incident**, notify the Indian Computer Emergency Response Team via email to `incident@cert-in.org.in` with the prescribed information.
- The Engineering Lead drafts; the DPO reviews; the IC sends.

#### 5.2 DPDP Act §8(6) notification

For personal-data breaches:

- Notify the **Data Protection Board of India** (when constituted) **as soon as possible** — TTII commits to **{{BREACH_NOTIFICATION_HOURS}} hours** of confirming the breach.
- Notify **affected data principals** with the information prescribed in the DPDP Act / Rules: nature of breach, likely consequences, mitigation taken, contact for follow-up.

#### 5.3 Vendor / partner notification

- If the breach involves a sub-processor, that processor's escalation contact is paged.
- Co-branded certification partners are notified if their issued certificates may be affected.
- The payment processor (Razorpay) is notified if payment-trail data is involved.

#### 5.4 Customer / centre notification

- For SEV-1 and SEV-2 incidents that affect Platform availability or learner data, post a public status update at https://teachersindia.in (or a status page once established) and email affected centres / learners.
- The wording is plain, factual, and non-blaming. The DPO reviews before sending.

#### 5.5 Insurance notification

If we hold cyber-liability cover ({{CYBER_LIABILITY_INSURER}}, limit {{CYBER_LIABILITY_LIMIT_INR}}), the insurer is notified per the policy timelines, typically within 72 hours.

#### 5.6 Law enforcement

Where the incident appears to involve a criminal offence (unauthorised access §66 IT Act, identity theft §66C, child safety, fraud), file a complaint at https://cybercrime.gov.in and / or the local police, in consultation with the Engineering Lead and external counsel.

### Phase 6 — Eradicate

Once contained and notified, remove the cause:

- Patch the vulnerability;
- Rotate compromised secrets per the [Cryptography Policy](cryptography-policy.md);
- Reset affected user sessions / passwords;
- Remove malicious artefacts from systems;
- Re-image affected hosts if integrity is in doubt.

### Phase 7 — Recover

- Bring services back to normal in a controlled rollout (see [BC / DR Plan](business-continuity-disaster-recovery.md)).
- Monitor for recurrence — heightened observation for at least 7 days after closure.
- Apply data fixes where records were tampered.

### Phase 8 — Post-mortem

Within 5 business days of closure for SEV-1 / SEV-2:

- The IC writes a blameless post-mortem covering the timeline, the impact, the contributing factors, what worked, what didn't, and a list of action items;
- Action items have an owner and a deadline; they enter the Risk Register;
- The post-mortem is reviewed by the Security Working Group;
- A redacted summary is shared internally; a further-redacted public summary may be shared with affected centres / learners on request.

## 4. Roles during an incident

| Role | Responsibility |
|---|---|
| **Incident Commander (IC)** | Single decision-maker. Owns the timeline. Authorises containment actions. Escalates as needed. |
| **Scribe** | Keeps the chronological log in the incident channel: every action with a timestamp. |
| **Communications lead** | Drafts external messages (regulator, learners, partners). Liaises with PR if the matter is public. |
| **Investigator** | Looks at logs, code, infrastructure. Reports findings back to the IC. |
| **DPO** | Owns personal-data assessment, regulator notification, data-principal notifications. Approves external messaging that contains personal-data details. |
| **Engineering Lead** | Authorises invasive containment (downtime, secret rotation), secures additional resources. |
| **CEO** | Owns reputational risk and the highest-impact external communications. Engaged for SEV-1. |
| **External counsel** | Engaged for serious incidents to advise on liability and disclosure. |

## 5. Templates

### 5.1 Initial regulator notification (within {{BREACH_NOTIFICATION_HOURS}} hours)

> "We are writing to notify the Data Protection Board of a personal-data breach affecting {{LEGAL_ENTITY_NAME}}. The breach was identified on [date / time]. The categories of personal data affected are [list]. The number of data principals affected is approximately [n]. We have taken the following containment steps: [steps]. We are continuing to investigate and will provide a full report within 14 days. The point of contact is {{DPO_NAME}}, {{DPO_EMAIL}}, {{INCIDENT_HOTLINE}}."

### 5.2 Initial data-principal notification

> "Dear [user], we are writing to inform you of a recent security incident at {{LEGAL_ENTITY_NAME}}. On [date], we identified [brief description]. The personal data affected may include [list]. We have taken the following steps to contain the issue and protect your data: [steps]. We recommend that you [action — change password / monitor / etc.]. If you have questions, please contact {{DPO_EMAIL}} or {{GRIEVANCE_OFFICER_EMAIL}}. We are sorry for any concern this may cause."

The actual content is reviewed by the DPO and external counsel before sending.

## 6. Drills

- A **table-top exercise** is held at least once a year. The Engineering Lead runs a simulated SEV-1 scenario (e.g., "an admin password was found on a paste site") and the team works through the playbook. Findings update this plan.
- A **technical drill** (e.g., a controlled credential rotation) is run every 6 months.

## 7. Cross-references

- [Vulnerability Disclosure Policy](vulnerability-disclosure-policy.md) — how external researchers reach us;
- [Logging & Monitoring Policy](logging-monitoring-policy.md) — what we have visibility on;
- [Backup Policy](backup-policy.md) — how we recover;
- [Vendor Risk Management Policy](vendor-risk-management-policy.md) — vendor-incident escalation;
- [Privacy Policy](../legal/privacy-policy.md) — what users are told about breaches;
- [DPDP Act Readiness](../compliance/dpdp-act-readiness.md) — section-by-section compliance.

---

## Revision history

| Version | Date | Author | Notes |
|---|---|---|---|
| 1.0 (draft) | {{LAST_REVIEW_DATE}} | Initial draft | Pre-publication. Templates require legal review before use. |
