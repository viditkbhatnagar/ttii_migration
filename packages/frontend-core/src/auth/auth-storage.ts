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
    const parsed = JSON.parse(rawValue) as Partial<AuthSession>;
    if (
      typeof parsed.token !== 'string'
      || typeof parsed.userId !== 'number'
      || typeof parsed.roleId !== 'number'
    ) {
      return null;
    }

    return {
      token: parsed.token,
      userId: parsed.userId,
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
