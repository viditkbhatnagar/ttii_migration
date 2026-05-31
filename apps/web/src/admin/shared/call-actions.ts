// Admin click-to-call (server-side). The Call button asks our API to place the
// call: Ainvox rings the admin's callback phone, then Dials the student and
// records both legs. No embedded softphone, no per-browser Ainvox login.
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

// The admin's callback number ("ring me on") — asked once per browser, stored.
const AGENT_PHONE_KEY = 'ttii.callback_phone';

export function getStoredAgentPhone(): string | null {
  try {
    return window.localStorage.getItem(AGENT_PHONE_KEY);
  } catch {
    return null;
  }
}

export function setStoredAgentPhone(phone: string): void {
  try {
    window.localStorage.setItem(AGENT_PHONE_KEY, phone);
  } catch {
    /* localStorage unavailable — fall back to per-call prompt */
  }
}

// Orchestrates a click-to-call: resolves the student number + the admin's
// callback number (prompting once per browser), then asks the API to place
// the call. Surfaces all outcomes via toast.
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
  let agent = getStoredAgentPhone();
  if (!agent) {
    const entered = window.prompt(
      'Enter your phone number with country code. We will ring you, then connect you to the student.',
      '+91',
    );
    if (entered === null) return; // cancelled
    agent = toDialableNumber(entered);
    if (!agent) {
      toast.error('Please enter a valid phone number with country code.');
      return;
    }
    setStoredAgentPhone(agent);
  }
  try {
    await api.startServerCall(authToken, studentPhone, agent);
    toast.success(`Calling you on ${agent} — answer your phone to connect to the student.`);
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Could not start the call.');
  }
}
