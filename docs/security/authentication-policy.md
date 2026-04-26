# Authentication Policy

**Version:** 1.0 (draft) | **Effective Date:** {{EFFECTIVE_DATE}} | **Owner:** Engineering Lead
**Last reviewed:** {{LAST_REVIEW_DATE}} | **Next review:** {{NEXT_REVIEW_DATE}}

This policy defines how users prove their identity to the TTII Platform. It supports the [Information Security Policy](information-security-policy.md) and the [Access Control Policy](access-control-policy.md). Specific implementation details are anchored to the source files cited.

## 1. Scope

All identity-bearing interactions with the Platform: web sign-in on the three portals, password reset, OTP-based recovery, and any future API key or service-account access.

## 2. Password requirements

### 2.1 Composition

User-chosen passwords must:

- Be at least **10 characters** long (12+ recommended);
- Not be a known-leaked password (we plan to integrate a HIBP-style check on next major auth update);
- Not be the user's email, phone, name, date of birth, or other obvious value;
- Not be a previously used password by the same user (last 4 enforced).

### 2.2 Storage

Passwords are hashed using **scrypt** with parameters `N=16384, r=8, p=1, key length 64 bytes, salt length 16 bytes`, implemented in [`apps/api/src/auth/password.ts`](../../apps/api/src/auth/password.ts). Each password has an independent random salt. Storage format is `scrypt$<N>$<r>$<p>$<saltHex>$<hashHex>`.

Legacy bcrypt hashes (from the previous PHP application: `$2a$`, `$2y$`, `$2b$`) are accepted for verification only. On any successful login against a bcrypt hash, the password is **rehashed with scrypt** and the new hash stored — silently migrating users to the modern scheme without a forced reset.

> ⚠️ **Known gap:** passwords are not currently checked against the Have-I-Been-Pwned k-anonymity API. This is on the roadmap.

### 2.3 Lifecycle

- New users set a password at first login or via an OTP-verified flow.
- A password change requires the current password (or a valid reset token).
- After a successful password change, all existing session tokens for the user are invalidated and re-login is required.

## 3. Sessions

### 3.1 Token format

Session tokens are **opaque** — they carry no information and cannot be parsed by an attacker. They are 48 bytes of cryptographic randomness, base64url-encoded, generated in [`apps/api/src/auth/session-token.ts`](../../apps/api/src/auth/session-token.ts):

```ts
export function generateOpaqueAuthToken(): string {
  return randomBytes(48).toString('base64url');
}
```

### 3.2 Storage at rest

The token is hashed with SHA-256 before being stored. The plaintext token is never written to the database. This means a database compromise alone does not yield usable session tokens.

### 3.3 Lifetime

Sessions expire **{{SESSION_TTL_DESCRIPTION}}** after issuance (`AUTH_SESSION_TTL_SECONDS=3600`, i.e. 1 hour, in `.env`). A session can be explicitly logged out by the user; logout invalidates the server-side record.

### 3.4 Transport

> ⚠️ **Known gap:** the middleware accepts the token from `auth_token` query parameter, request body, or `Authorization: Bearer` header (see [`apps/api/src/auth/middleware.ts`](../../apps/api/src/auth/middleware.ts)). Tokens in the URL leak via reverse-proxy access logs and `Referer` headers. Header-only acceptance is the target state.

### 3.5 Concurrent sessions

A user may have multiple active sessions (e.g., laptop and phone). Each session is an independent token; revoking one does not revoke the others. A "log out everywhere" function is on the roadmap.

## 4. Password reset

Password reset is handled by signed tokens generated in [`apps/api/src/auth/reset-token.ts`](../../apps/api/src/auth/reset-token.ts). The token is an HMAC-SHA256-signed JWT-like envelope containing:

- `uid` — user ID;
- `eh` — SHA-256 of the user's normalised email;
- `pwh` — first 24 hex chars of SHA-256 of the user's *current* password hash (so the reset token becomes invalid as soon as the password changes — preventing reuse of an old reset link after a password change);
- `iat`, `exp` — issued and expiry timestamps;
- `jti` — random 16-byte JTI (defence against caching).

Tokens are valid for `PASSWORD_RESET_TOKEN_TTL_SECONDS=1800` (30 minutes). The signing key is `PASSWORD_RESET_TOKEN_KEY`, distinct from any other application key.

## 5. One-Time Password (OTP)

OTP is offered for account recovery and (where configured) sensitive operations. Implementation:

- **Length:** 6 digits (`OTP_LENGTH=6`)
- **TTL:** 5 minutes (`OTP_TTL_SECONDS=300`)
- **Maximum attempts:** 5 (`OTP_MAX_ATTEMPTS=5`); on the 6th wrong attempt the OTP is invalidated and a fresh one must be requested
- **Storage:** OTPs are stored as a hash in the `otp_challenge` table, never in plaintext
- **Delivery:** SMS (via the configured `OTP_PROVIDER`) and / or email; fallback to console in development
- **Rate-limiting:** 5 OTP-request attempts and 10 OTP-verify attempts per 15-minute window per identifier

## 6. Rate limiting

Rate limiting is implemented in [`apps/api/src/auth/rate-limit.ts`](../../apps/api/src/auth/rate-limit.ts) as a fixed-window counter:

| Endpoint | Limit | Window |
|---|---|---|
| Login (`AUTH_LOGIN_RATE_LIMIT_MAX`) | 5 attempts | 15 minutes |
| Password reset request (`AUTH_PASSWORD_RESET_RATE_LIMIT_MAX`) | 5 attempts | 15 minutes |
| OTP request (`AUTH_OTP_REQUEST_RATE_LIMIT_MAX`) | 5 attempts | 15 minutes |
| OTP verify (`AUTH_OTP_VERIFY_RATE_LIMIT_MAX`) | 10 attempts | 15 minutes |

When a limit is hit, the API returns `429 Too Many Requests` with a `retryAfterSeconds` value.

> ⚠️ **Known gap:** the limiter is **in-memory** (`Map` in process). In a multi-replica deployment it does not coordinate across replicas, and on process restart it resets. Migration to a shared store (Redis or DB-backed) is on the roadmap.

## 7. Multi-Factor Authentication (MFA)

The Platform does not currently enforce TOTP or hardware-key MFA on regular logins. OTP-based step-up is available in some flows. **MFA roll-out** for staff (`ADMIN`, `SUBADMIN`) accounts is on the roadmap and is a precondition for ISO 27001 alignment. Once rolled out, this policy will be updated.

## 8. Account lockout

After 5 consecutive failed login attempts inside the rate-limit window, further attempts are rejected with `429`. The account itself is **not** disabled (to prevent an attacker locking out a legitimate user). The user must wait or use the password reset flow.

## 9. Auth audit log

The `auth_audit_log` table records every authentication denial with: `event` (`logAuthDenied` or `logRbacDenied`), `identifier`, `ip_address`, `user_agent`, `path`, `details` (JSON, including the reason: `missing_auth_token`, `invalid_or_expired_auth_token`, etc.), and `created_at`. Successful logins are also recorded.

The DPO and Engineering Lead review this log monthly. Anomalies (e.g., unusual geographies, after-hours admin logins, persistent RBAC denials from a specific user) are investigated.

## 10. Service accounts and API keys

The Platform does not currently expose a public API for third-party programmatic access. Internal service-to-service calls (e.g., the cron worker calling Microsoft Graph) use OAuth client credentials configured via environment variables and not via shared user accounts.

## 11. Single sign-on (SSO)

Not currently used inside the Platform; planned for staff-facing tools.

## 12. Cryptographic keys

All keys referenced in this policy (`PASSWORD_RESET_TOKEN_KEY`, `OTP_SIGNING_KEY`, `STORAGE_LOCAL_SIGNING_KEY`) are managed per the [Cryptography Policy](cryptography-policy.md). Distinct keys are used for distinct purposes.

## 13. Updates

This policy is updated when authentication mechanisms change in the codebase. The CHANGELOG records the change and the engineering lead signs off.

---

## Revision history

| Version | Date | Author | Notes |
|---|---|---|---|
| 1.0 (draft) | {{LAST_REVIEW_DATE}} | Initial draft | Reflects auth implementation at commit `fc089507`. |
