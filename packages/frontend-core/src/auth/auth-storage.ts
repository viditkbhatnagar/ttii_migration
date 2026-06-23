import type { AuthSession } from './auth-api.js';

export const DEFAULT_AUTH_STORAGE_KEY = 'ttii.auth.session';

// In-memory fallback for browsers where localStorage is unavailable or blocked.
// iOS Safari Private Browsing (and some strict-privacy / low-storage mobile
// browsers) expose `window.localStorage` but THROW on setItem — the old code
// called setItem directly, so the throw bubbled up and login failed on those
// phones even with correct credentials (works on desktop/tablet). With this
// fallback the session is kept in memory for the tab's lifetime, so the student
// can sign in and use the app (a hard browser refresh would require re-login).
const memoryStore = new Map<string, string>();

// localStorage can be DEFINED but throw on write (private mode / quota). Probe
// it for real read+write+remove once, lazily, and cache the verdict.
let usableLocalStorage: Storage | null | undefined;
function getLocalStorage(): Storage | null {
  if (usableLocalStorage !== undefined) return usableLocalStorage;
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      usableLocalStorage = null;
      return null;
    }
    const probeKey = '__ttii_storage_probe__';
    window.localStorage.setItem(probeKey, '1');
    window.localStorage.removeItem(probeKey);
    usableLocalStorage = window.localStorage;
  } catch {
    usableLocalStorage = null;
  }
  return usableLocalStorage;
}

function readRaw(key: string): string | null {
  const ls = getLocalStorage();
  if (ls) {
    try {
      return ls.getItem(key);
    } catch {
      // fall through to memory
    }
  }
  return memoryStore.get(key) ?? null;
}

function writeRaw(key: string, value: string): void {
  const ls = getLocalStorage();
  if (ls) {
    try {
      ls.setItem(key, value);
      return;
    } catch {
      // fall through to memory
    }
  }
  memoryStore.set(key, value);
}

function removeRaw(key: string): void {
  const ls = getLocalStorage();
  if (ls) {
    try {
      ls.removeItem(key);
    } catch {
      // ignore
    }
  }
  memoryStore.delete(key);
}

export function readStoredSession(storageKey = DEFAULT_AUTH_STORAGE_KEY): AuthSession | null {
  const rawValue = readRaw(storageKey);
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
  writeRaw(storageKey, JSON.stringify(session));
}

export function clearStoredSession(storageKey = DEFAULT_AUTH_STORAGE_KEY): void {
  removeRaw(storageKey);
}
