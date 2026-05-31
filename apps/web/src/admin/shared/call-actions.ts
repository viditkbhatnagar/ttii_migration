// Admin click-to-call (server-side). The Call button asks our API to place the
// call: Ainvox rings the admin's callback phone (resolved server-side from the
// admin's profile phone), then Dials the student and records both legs. No
// embedded softphone, no per-browser Ainvox login, no per-call prompt.
import { toast } from 'sonner';

import type { AdminPortalApi } from '../admin-portal-api.js';

// Normalise a raw, possibly-messy phone string to E.164 (defaults to India).
export function toDialableNumber(raw: string, defaultCountryCode = '91'): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.startsWith('+')) {
    const digits = trimmed.slice(1).replace(/\D/g, '');
    return digits.length >= 10 ? `+${digits}` : null;
  }
  const digits = trimmed.replace(/\D/g, '').replace(/^0+/, '');
  if (!digits) return null;
  if (digits.length === 10) return `+${defaultCountryCode}${digits}`;
  if (digits.length > 10) return `+${digits}`;
  return null;
}

// Place a click-to-call. The server resolves which phone to ring the admin on
// (their profile phone), so there is nothing to prompt for here.
export async function startAdminCall(
  api: Pick<AdminPortalApi, 'startServerCall'>,
  authToken: string,
  rawStudentPhone: string | null | undefined,
): Promise<void> {
  const studentPhone = toDialableNumber(rawStudentPhone ?? '');
  if (!studentPhone) {
    toast.error('No valid phone number for this contact.');
    return;
  }
  try {
    await api.startServerCall(authToken, studentPhone);
    toast.success('Calling you now — answer your phone to connect to the student.');
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Could not start the call.');
  }
}
