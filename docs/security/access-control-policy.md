# Access Control Policy

**Version:** 1.0 (draft) | **Effective Date:** {{EFFECTIVE_DATE}} | **Owner:** Engineering Lead
**Last reviewed:** {{LAST_REVIEW_DATE}} | **Next review:** {{NEXT_REVIEW_DATE}}

This policy defines who gets access to what on the TTII Platform and how access is provisioned, reviewed, and revoked. It supports the [Information Security Policy](information-security-policy.md) and is enforced in code via the legacy role middleware in [`apps/api/src/auth/middleware.ts`](../../apps/api/src/auth/middleware.ts) and the role table in [`apps/api/src/auth/roles.ts`](../../apps/api/src/auth/roles.ts).

## 1. Principles

1. **Least privilege.** A user has only the permissions needed for their job.
2. **Separation of duties.** No single user should be able to commit, deploy, and audit a change unsupervised in production-affecting actions.
3. **Joiner–Mover–Leaver (JML).** Access changes when role changes; access is removed promptly when a person leaves.
4. **Need-to-know.** Even within a role, access to specific records (e.g., a particular cohort) is granted only when the user genuinely needs it.

## 2. Roles in the Platform

The Platform uses six legacy role IDs, hard-coded in [`apps/api/src/auth/roles.ts`](../../apps/api/src/auth/roles.ts):

| Role ID | Constant | Portal | Typical permissions |
|---|---|---|---|
| 1 | `ADMIN` | `admin.teachersindia.in` | Full access; user/role management; system settings; all data |
| 2 | `STUDENT` | `learn.teachersindia.in` | Own profile, own enrolments, own payments, own certificates, support |
| 3 | `INSTRUCTOR` | (Instructor pages) | Live classes assigned to the instructor; grading; attendance marking |
| 4 | `TEAM_LEAD` | (Legacy / unused) | Reserved; not currently issued |
| 7 | `CENTRE` | `admissions.teachersindia.in` | The centre's own applications, students, cohorts, wallet, live classes |
| 8 | `SUBADMIN` | `admin.teachersindia.in` | All admin pages, no user / role management |
| 9 | `COUNSELLOR` | `admin.teachersindia.in` (scoped) | Dashboard, applications, students, counsellor target, referrals |
| 10 | `ASSOCIATE` | `admissions.teachersindia.in` (scoped) | Centre features at a field-agent level |

Portal mapping is enforced at login by `resolveLegacyPortalPath` in [`apps/api/src/auth/roles.ts`](../../apps/api/src/auth/roles.ts).

> **Note for documentation reviewers:** an older note in the repository's `CLAUDE.md` lists "Centre = 4". The authoritative source is [`roles.ts`](../../apps/api/src/auth/roles.ts), which assigns `CENTRE = 7`. The `roles.ts` value is the truth; `CLAUDE.md` is being corrected separately.

## 3. RBAC enforcement

Role checks are applied at the API layer. The pattern is:

```ts
// Every protected route uses requireLegacyAuth
app.get('/admin/students', { preHandler: requireLegacyAuth(authService) }, ...);

// Routes that need a specific role chain in requireLegacyRoles
app.post('/admin/users/delete', {
  preHandler: [requireLegacyAuth(authService), requireLegacyRoles(authService, [LEGACY_ROLE.ADMIN])],
}, ...);
```

Frontend route guards mirror these checks but are not the security boundary — the API is. Any fix to permissions must be applied at the API.

### 3.1 Centre / Counsellor / Associate scoping

`CENTRE`, `COUNSELLOR`, and `ASSOCIATE` users see only data **owned by their scope** (their centre, their assigned applications). Scoping is enforced in service-layer queries (e.g., `where: { centre_id: authContext.user.centre_id }`). Engineers must apply scoping in **every** new query touching user / application / payment data.

## 4. User lifecycle (Joiner–Mover–Leaver)

### 4.1 Joiner (provisioning)

For TTII staff:

1. The hiring manager raises a request to {{SUPPORT_EMAIL}} with the new joiner's role, start date, and required role ID.
2. Engineering / Operations creates the account on the day before start date.
3. The new joiner sets their password on first login (no shared default).
4. Induction includes this policy + the [Information Security Policy](information-security-policy.md) + the [Acceptable Asset Use Policy](acceptable-asset-use-policy.md).

For partner-centre staff:

1. The centre administrator raises a request through the centre portal or by email to {{ADMISSIONS_EMAIL}}.
2. The TTII Operations team verifies authorisation against the centre contract.
3. The account is created scoped to the centre.

For external sub-processors / vendors needing platform access:

1. A signed [Data Processing Agreement](../compliance/data-processing-agreement-template.md) is in place.
2. Access is time-bound (default 30 days) and reviewed before extension.

### 4.2 Mover

When someone changes role:

1. The hiring manager raises a request with the new role and the change date.
2. The previous role's access is **removed** before the new role's access is granted, where the roles overlap.
3. Default for ambiguous cases: revoke the higher privilege; grant only what the new role needs.

### 4.3 Leaver

When someone leaves:

1. HR notifies Operations on the day notice is served (not the last working day).
2. **All accounts are disabled by 18:00 IST on the last working day.** This includes the platform login, the email, version-control access, the cloud account, the password manager, the SSO IdP, and the chat tool.
3. Active sessions are invalidated (force-logout from auth tables).
4. Personal data of the leaver is retained per the [Data Retention & Deletion Policy](data-retention-deletion-policy.md). Work product remains the property of TTII.
5. Hardware is collected and wiped per the [Acceptable Asset Use Policy](acceptable-asset-use-policy.md).

## 5. Access reviews

| Group | Frequency | Reviewer |
|---|---|---|
| `ADMIN` (role 1) accounts | **Monthly** | Engineering Lead |
| `SUBADMIN` (role 8) accounts | Quarterly | Engineering Lead |
| `INSTRUCTOR` and `COUNSELLOR` accounts | Quarterly | Head of Operations |
| `CENTRE` and `ASSOCIATE` accounts | Quarterly | Head of Operations |
| Sub-processor / vendor accounts | Quarterly | DPO |
| Production database direct access | **Monthly** | Engineering Lead |
| Cloud-provider console (DigitalOcean) | Quarterly | Engineering Lead |
| Source-control admins (GitHub) | Quarterly | Engineering Lead |

Each review checks: is the account still needed? Is the role still appropriate? Has the user logged in in the past period? Findings are recorded in the Risk Register.

## 6. Privileged access

Privileged actions — direct database access, cloud console, ability to disable other users, ability to deploy — require:

- A named individual (no shared accounts);
- Multi-factor authentication on the underlying identity (cloud SSO, GitHub, etc.);
- A documented business reason for each session that touches production data;
- A logged audit trail of what was done.

Production database access via shell or Prisma Studio is restricted to two named engineers. The MariaDB root password and `/etc/cyberpanel/mysqlPassword` are accessible only on the production droplet via key-based SSH; copies of these credentials are not stored locally on engineer laptops.

## 7. Authentication

This policy defers to the [Authentication Policy](authentication-policy.md) for password, session, OTP, and rate-limit standards. Highlights:

- All staff platform logins use the same `users` table — there is no separate "staff" identity store today;
- Passwords are hashed with **scrypt** (`apps/api/src/auth/password.ts`);
- Session tokens are opaque 48-byte random values, hashed at rest, with a TTL of {{SESSION_TTL_DESCRIPTION}};
- Rate limiting is in effect on login, password-reset, and OTP endpoints (in-memory; see accepted gap in the [Information Security Policy](information-security-policy.md)).

## 8. Token transport

> ⚠️ **Known gap:** the auth middleware in [`apps/api/src/auth/middleware.ts`](../../apps/api/src/auth/middleware.ts) accepts the auth token from the `auth_token` query parameter, the request body, **or** the `Authorization: Bearer` header. Tokens in the URL leak via reverse-proxy access logs and `Referer` headers. Acceptance via query / body is being phased out; new endpoints must accept the token only via the header.

## 9. Session management

- Sessions automatically expire after {{SESSION_TTL_DESCRIPTION}} of issuance (`AUTH_SESSION_TTL_SECONDS=3600` in `.env`). On expiry, the user must re-authenticate.
- Logging out invalidates the session token at the server, not just on the client.
- Concurrent sessions are permitted (web + mobile), but each is independently revocable.

## 10. Audit logging of access

The `auth_audit_log` table records:

- Successful and failed authentications (with reason codes: `missing_auth_token`, `invalid_or_expired_auth_token`);
- RBAC denials when a user attempts an action above their role.

The DPO reviews the audit log monthly for anomalies (e.g., off-hours logins, geographic outliers, repeat denials).

## 11. Physical access

- The TTII office is access-controlled. Visitors are signed in and accompanied.
- Workstations lock automatically after 5 minutes of inactivity.
- Centre offices follow the centre's own physical security; partner-centre staff are reminded that any printed personal data must be securely destroyed when no longer needed.

## 12. Third-party access

Where a third party (e.g., an auditor, a contractor) needs temporary access:

- Access is granted for a documented purpose;
- A signed NDA + DPA is in place where personal data is involved;
- Access is time-bound and revoked at the end of the engagement;
- Privileges are minimal — read-only where possible.

## 13. Exceptions

Any deviation requires written approval from the Engineering Lead, recorded in the Risk Register with an expiry date.

---

## Revision history

| Version | Date | Author | Notes |
|---|---|---|---|
| 1.0 (draft) | {{LAST_REVIEW_DATE}} | Initial draft | Pre-publication. |
