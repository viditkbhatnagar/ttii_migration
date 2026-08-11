import { describe, expect, test } from 'vitest';

import { nextSessionExpiry } from '../../src/auth/session-sliding.js';

// Naji UAT 2026-08-11 — AUTH_SESSION_TTL_SECONDS is 3600 on production and was
// a hard wall: a student who signed in at 7:30 PM was 401ed at 8:30 PM, fifteen
// minutes before their 75-minute exam ended. This decides when an active
// session earns more time. Getting it wrong either leaves the wall in place
// (students locked out mid-exam again) or, far worse, resurrects a dead session.

const TTL = 3600;
const now = new Date('2026-08-10T14:00:00.000Z');

function inSeconds(seconds: number): Date {
  return new Date(now.getTime() + seconds * 1000);
}

describe('nextSessionExpiry', () => {
  test('extends a session that is past the half-way point of its TTL', () => {
    // 20 minutes left on a 60-minute TTL — a student mid-exam.
    const extended = nextSessionExpiry(inSeconds(20 * 60), now, TTL);
    expect(extended?.toISOString()).toBe(inSeconds(TTL).toISOString());
  });

  test('extends by a full TTL from now, not from the old expiry', () => {
    const extended = nextSessionExpiry(inSeconds(60), now, TTL);
    expect(extended?.getTime()).toBe(now.getTime() + TTL * 1000);
  });

  test('leaves a fresh session alone so the hot read path stays a read', () => {
    // 59 minutes left: more than half the TTL, so no write.
    expect(nextSessionExpiry(inSeconds(59 * 60), now, TTL)).toBeNull();
  });

  test('extends exactly at the half-way boundary', () => {
    expect(nextSessionExpiry(inSeconds(TTL / 2), now, TTL)).not.toBeNull();
  });

  test('never resurrects an expired session', () => {
    expect(nextSessionExpiry(inSeconds(-1), now, TTL)).toBeNull();
    expect(nextSessionExpiry(inSeconds(-24 * 60 * 60), now, TTL)).toBeNull();
  });

  test('treats an expiry exactly at now as expired, matching the `expires_at > now` lookup', () => {
    expect(nextSessionExpiry(new Date(now.getTime()), now, TTL)).toBeNull();
  });

  test('returns null for a missing or unusable expiry rather than inventing one', () => {
    expect(nextSessionExpiry(null, now, TTL)).toBeNull();
    expect(nextSessionExpiry(undefined, now, TTL)).toBeNull();
    expect(nextSessionExpiry(new Date('nonsense'), now, TTL)).toBeNull();
  });

  test('returns null for a nonsensical TTL instead of stamping an expiry in the past', () => {
    expect(nextSessionExpiry(inSeconds(60), now, 0)).toBeNull();
    expect(nextSessionExpiry(inSeconds(60), now, -1)).toBeNull();
    expect(nextSessionExpiry(inSeconds(60), now, Number.NaN)).toBeNull();
  });
});
