import type { AuthSession } from './auth-api.js';

export const DEFAULT_AUTH_STORAGE_KEY = 'ttii.auth.session';

function storageAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function readStoredSession(storageKey = DEFAULT_AUTH_STORAGE_KEY): AuthSession | null {
  if (!storageAvailable()) {
    return null;
  }

  const rawValue = window.localStorage.getItem(storageKey);
  if (!rawValue) {
    return null;
  }

  try {
    // AuthSession.userId is a string (legacy LMS returns it as such), but
    // the original guard checked for `number` and silently dropped every
    // stored session on page reload, forcing a login. Coerce userId to a
    // string from whatever the JSON holds; reject only when token /
    // roleId are missing or malformed (Naji UAT 2026-05-13 — bug report
    // from Risha: Edit Enrolment save bounced her to /login).
    const parsed = JSON.parse(rawValue) as Partial<AuthSession> & { userId?: unknown };
    if (typeof parsed.token !== 'string' || parsed.token === '') return null;
    if (typeof parsed.roleId !== 'number') return null;
    const userId = typeof parsed.userId === 'string'
      ? parsed.userId
      : typeof parsed.userId === 'number'
        ? String(parsed.userId)
        : '';
    if (!userId) return null;

    return {
      token: parsed.token,
      userId,
      roleId: parsed.roleId,
    };
  } catch {
    return null;
  }
}

export function writeStoredSession(session: AuthSession, storageKey = DEFAULT_AUTH_STORAGE_KEY): void {
  if (!storageAvailable()) {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(session));
}

export function clearStoredSession(storageKey = DEFAULT_AUTH_STORAGE_KEY): void {
  if (!storageAvailable()) {
    return;
  }

  window.localStorage.removeItem(storageKey);
}
