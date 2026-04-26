# Logging & Monitoring Policy

**Version:** 1.0 (draft) | **Effective Date:** {{EFFECTIVE_DATE}} | **Owner:** Engineering Lead
**Last reviewed:** {{LAST_REVIEW_DATE}} | **Next review:** {{NEXT_REVIEW_DATE}}

This policy describes what TTII logs, where logs go, how long they are kept, what is monitored, and how alerts are handled. It supports the [Information Security Policy](information-security-policy.md), the [Incident Response Plan](incident-response-plan.md), and the [Data Protection Policy](data-protection-policy.md).

## 1. Logging principles

1. **Log enough to investigate.** A reader six months later should be able to reconstruct what happened.
2. **Log no more than necessary.** Logs are themselves a place where personal data lives — minimise.
3. **Never log secrets.** Passwords, tokens, OTPs, API keys, signed-URL signatures must not appear in logs at any level.
4. **Mask personal identifiers.** Where a user identifier is needed, prefer the user ID (not name or full email).

## 2. What we log today

| Source | Data | Retention | Where |
|---|---|---|---|
| **Application logs** (Fastify, `apps/api/src/app.ts` logger) | HTTP requests (method, path, status, duration), errors with stack traces, structured info-level events | 90 days on the production droplet (logrotate) | Production droplet filesystem |
| **`auth_audit_log`** (DB table) | Authentication denials (`logAuthDenied`) and RBAC denials (`logRbacDenied`) — user_id, event, identifier, success, ip_address, user_agent, details (JSON), created_at | {{DATA_RETENTION_AUDIT_LOGS_YEARS}} years | MariaDB |
| **`otp_challenge`** (DB table) | OTP attempts: hashed OTP, attempt count, expires_at, request IP, user agent | Until consumed or expired; aggregate retained {{DATA_RETENTION_AUDIT_LOGS_YEARS}} years | MariaDB |
| **nginx access logs** | Per-request log including IP, path, status, user-agent | 90 days (logrotate) | Production droplet |
| **nginx error logs** | TLS handshake failures, upstream errors | 90 days | Production droplet |
| **systemd / journalctl** | Application start / stop / crash | 90 days | Production droplet |
| **DigitalOcean droplet logs** | Provider-side events | Per provider retention | DO console |
| **GitHub Actions** | CI run logs | 90 days standard | GitHub |
| **Razorpay webhooks** | Payment events received (with HMAC verified) | Stored in `payment_info` indefinitely | MariaDB |
| **Microsoft Graph integration logs** | Teams meeting creation, attendance sync, recording sync results | 90 days application logs + DB-side records of synced artefacts | Filesystem + MariaDB |

> ⚠️ **Known gap:** logs are **not currently centralised**. They live on the production droplet only. If the droplet is lost we lose unshipped logs. Centralised log shipping (to a SIEM or a log-aggregation service) is on the roadmap.

## 3. What we do NOT log

- Plaintext passwords;
- Plaintext OTPs (only the hashed challenge is stored);
- Session tokens (only their SHA-256 fingerprint is stored);
- HMAC keys, API keys, vendor credentials;
- Aadhaar / passport numbers in plaintext at any log level;
- Raw payment-instrument data (we never receive these);
- Live-class video / audio content;
- Private content of chat-support messages at INFO level (the message itself is stored in the DB; logs reference the message_id, not the content).

## 4. Log levels

| Level | Use |
|---|---|
| `error` | An unhandled exception, a critical failure, an integrity violation |
| `warn` | A handled-but-suspicious condition (e.g., a user attempted an action above their role) |
| `info` | Routine operations: request completed, cron job ran, integration succeeded |
| `debug` | Verbose, dev-only — disabled in production |

In production, level is `info` (`apps/api/src/app.ts`). Switching to `debug` is a deliberate decision and is reset on the next deploy.

## 5. Time, format, and identifiers

- All timestamps are **UTC**, ISO 8601, with millisecond precision.
- Logs are **JSON-structured** where Fastify outputs them (default for the Fastify logger in production).
- Each request has a request-id; correlated across DB writes where feasible.
- User identifiers in logs are **internal IDs**, not emails / names. Where displaying contact identifiers is unavoidable, redact: `vidit****@example.com`.

## 6. Monitoring & alerting

| Signal | What we look at | Action |
|---|---|---|
| 5xx error rate | Application error responses per minute | Alert if sustained spike |
| 4xx auth-denial spike | Spike in `logAuthDenied` for a single identifier or IP | Alert; possible brute force or token leak |
| 4xx RBAC-denial spike | Spike in `logRbacDenied` for a single user | Alert; possible insider misuse |
| OTP request volume | Sustained increase in OTP requests | Alert; possible abuse / SMS pumping |
| Razorpay webhook signature failures | Mismatched HMAC | Alert; possible replay attempt |
| Cron job last-run time | Microsoft Graph attendance / recording sync | Alert if not run in last 24h |
| Disk free on production droplet | <15% free | Alert |
| Memory & CPU saturation | Sustained >90% | Alert |
| TLS certificate expiry | <30 days | Alert (Let's Encrypt usually renews automatically; certbot timer monitored) |
| External health-check on the three portals | HTTP 200 from an external prober | Alert on failure |

> ⚠️ **Known gap:** alerting is currently delivered manually via review of the production droplet. A monitoring service (e.g. UptimeRobot for the external probe; a self-hosted Prometheus + Grafana for application metrics) is on the roadmap.

## 7. Personal data in logs (DPDP / GDPR principle)

Logs that contain personal data are themselves subject to the [Data Protection Policy](data-protection-policy.md). They count as Confidential, are access-controlled, and are aged out per the retention table above.

A request from a data principal under DPDP §11 (access) does **not** typically include log data in the response, because:

- Logs are operational records, not the principal's primary data;
- Producing logs in response would itself increase exposure;
- Where the principal specifically asks about authentication events on their account, we provide a summary (not raw logs).

A right-to-erasure request (DPDP §12) extends to log data **only where retention beyond the request is not necessary for security or legal-hold purposes**. The DPO determines this case-by-case.

## 8. Access to logs

- Production server logs: read access for the Engineering Lead and the on-call engineer only.
- `auth_audit_log` and `otp_challenge`: read access for the same group; write access by the application only.
- nginx logs: read access for ops engineers as needed for diagnostics.
- All access is itself logged (who, when) where the underlying tooling supports it.

## 9. Tamper-evidence

- Database tables are protected by application-level RBAC and DB-level access control.
- Filesystem logs are append-only by configuration; logrotate moves files but does not allow editing.
- Any forensic investigation captures a copy of the relevant logs immediately to prevent tampering.

## 10. Audit

- Engineering Lead reviews monitoring alerts weekly.
- DPO reviews `auth_audit_log` for anomalies monthly.
- Annual security review covers the logging configuration.

## 11. Cross-references

- [Information Security Policy](information-security-policy.md)
- [Incident Response Plan](incident-response-plan.md)
- [Data Protection Policy](data-protection-policy.md)
- [Data Retention & Deletion Policy](data-retention-deletion-policy.md)

---

## Revision history

| Version | Date | Author | Notes |
|---|---|---|---|
| 1.0 (draft) | {{LAST_REVIEW_DATE}} | Initial draft | Reflects current logging posture; centralised aggregation pending. |
