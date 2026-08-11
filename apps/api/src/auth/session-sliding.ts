/**
 * Naji UAT 2026-08-11 — sliding session expiry.
 *
 * AUTH_SESSION_TTL_SECONDS is 3600 on production and, until now, it was a HARD
 * wall: `createSession` stamped `expires_at = login + 1h` and nothing ever
 * moved it. A student who signed in at 7:30 PM for a 75-minute exam was 401ed
 * at 8:30 PM — fifteen minutes before their paper ended — and got the "Session
 * Expired" modal on top of the exam (SessionExpiredDialog fires on ANY
 * authenticated 401, which is why the copy's "due to inactivity" is misleading:
 * there is no idle timer, only that fixed hour).
 *
 * The fix is to let an ACTIVE session earn more time rather than to raise the
 * TTL — raising it would weaken every session in the product to paper over one
 * flow. Two invariants make that safe:
 *
 *   1. Only a still-valid session slides. An expired or revoked session is
 *      never resurrected; the caller's UPDATE re-asserts `expires_at > now`
 *      and `revoked_at IS NULL` in its WHERE clause so even a race cannot
 *      revive one.
 *   2. The write is throttled. `auth_session` is read on every authenticated
 *      request (a dashboard load fires ~8 in parallel); writing on each would
 *      turn a hot read path into a hot write path. A session only slides once
 *      less than half its TTL remains, i.e. at most once per TTL/2 — roughly
 *      one row write per 30 minutes per signed-in user.
 */

/**
 * The new `expires_at` for a session being touched now, or null to leave it
 * alone. Pure so the decision is unit-testable without a database.
 *
 * @param expiresAt  the session's current expiry
 * @param now        the instant of the request being served
 * @param ttlSeconds AUTH_SESSION_TTL_SECONDS
 */
export function nextSessionExpiry(
  expiresAt: Date | null | undefined,
  now: Date,
  ttlSeconds: number,
): Date | null {
  if (!(expiresAt instanceof Date) || Number.isNaN(expiresAt.getTime())) {
    return null;
  }

  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
    return null;
  }

  const nowMs = now.getTime();

  // Already expired — this is the resurrection guard. An expired session must
  // fail authentication, not quietly gain another hour because a stale tab
  // retried. Equality counts as expired: the lookup uses `expires_at > now`.
  if (expiresAt.getTime() <= nowMs) {
    return null;
  }

  const ttlMs = ttlSeconds * 1000;
  const remainingMs = expiresAt.getTime() - nowMs;

  // Still in the first half of its life: nothing to gain, and skipping the
  // write is what keeps this off the hot path.
  if (remainingMs > ttlMs / 2) {
    return null;
  }

  return new Date(nowMs + ttlMs);
}
