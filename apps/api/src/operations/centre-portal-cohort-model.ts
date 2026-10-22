import { IST_OFFSET_MS, dateYmd, istYmd } from './centre-dashboard-model.js';

// Centre portal → Cohorts (Naji's centre login design, 2026-10-22). Pure
// helpers for centre-portal-cohort-service.ts: cohort status on the IST
// calendar, live-class times read with UTC getters (@db.Time / @db.Date come
// back as UTC instants that carry the IST wall clock), and the meeting
// platform named from what is stored.

export type CohortStatus = 'upcoming' | 'running' | 'completed';
export type SessionState = 'scheduled' | 'completed';

/** Today's IST calendar day. */
export function istToday(now: Date): string {
  return istYmd(now);
}

/** Upcoming before the start day, Completed after the end day, else Running (IST calendar days). */
export function cohortStatus(startYmd: string, endYmd: string, todayYmd: string): CohortStatus {
  if (startYmd && startYmd > todayYmd) return 'upcoming';
  if (endYmd && endYmd < todayYmd) return 'completed';
  return 'running';
}

/** "HH:MM" of a @db.Time value (UTC getters), '' when missing. */
export function hhmm(value: Date | null | undefined): string {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return '';
  return `${String(value.getUTCHours()).padStart(2, '0')}:${String(value.getUTCMinutes()).padStart(2, '0')}`;
}

/** The instant an IST wall-clock day + time happens (ms), or null when either does not parse. */
export function istInstant(ymd: string, time: string): number | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  const t = /^(\d{1,2}):(\d{2})/.exec(time);
  if (!d || !t) return null;
  return Date.UTC(Number(d[1]), Number(d[2]) - 1, Number(d[3]), Number(t[1]), Number(t[2])) - IST_OFFSET_MS;
}

/** Completed once the class's end (IST wall clock) has passed; a class without a date stays Scheduled. */
export function sessionState(dayYmd: string, toTime: string, fromTime: string, nowMs: number): SessionState {
  const end = istInstant(dayYmd, toTime || fromTime || '23:59');
  return end !== null && nowMs > end ? 'completed' : 'scheduled';
}

const PLATFORM_NAMES: Record<string, string> = { teams: 'Microsoft Teams', zoom: 'Zoom' };

/** The platform as people know it; for a pasted link, named from the link itself. */
export function platformLabel(platform: string | null | undefined, joinUrl: string | null | undefined): string {
  const p = (platform ?? '').trim().toLowerCase();
  if (PLATFORM_NAMES[p]) return PLATFORM_NAMES[p] ?? '';
  const url = (joinUrl ?? '').toLowerCase();
  if (url.includes('teams.microsoft.com') || url.includes('teams.live.com')) return 'Microsoft Teams';
  if (url.includes('zoom.us')) return 'Zoom';
  if (url.includes('meet.google.com')) return 'Google Meet';
  return url ? 'Meeting link' : p === '' ? 'Zoom' : 'Meeting link';
}

/** Only http(s) links reach the page. */
export function httpLink(value: string | null | undefined): string {
  const url = (value ?? '').trim();
  return /^https?:\/\//i.test(url) ? url : '';
}

/** A @db.Date as YYYY-MM-DD ('' when missing). */
export const dayOf = dateYmd;

/** Rich-text (HTML) fields as plain text. */
export function plainText(value: string | null | undefined): string {
  return (value ?? '')
    .replace(/<\/?[a-zA-Z][^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}
