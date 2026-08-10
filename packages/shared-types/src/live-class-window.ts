// Naji UAT 2026-08-08 — single source of truth for "is this live class
// joinable yet". It lives in the shared package because BOTH the API (which
// decides whether to hand a student the Teams join URL) and the student portal
// (which decides whether to enable the Join button) have to agree. Two private
// copies of this arithmetic would drift, and the failure mode of drift is a
// whole cohort locked out of its own class.
//
// WHY the gate exists: a Teams join URL is live from the moment the meeting is
// created, the lobby bypass is 'everyone' and recordAutomatically is on (see
// integrations/teams-meeting-service.ts). One early click therefore STARTS the
// meeting and burns a throwaway recording against the class — on 5 Aug 2026
// someone opened the link for a 6 Aug class a day early and the 239 KB stub
// landed on the row instead of the real session. Microsoft Graph's
// onlineMeetings resource has no time-based lobby setting (lobbyBypassSettings
// only takes a *scope*, never a "not before T-10"), so the only place the door
// can be held shut is here.
//
// TIMEZONE — the part that must not be got wrong: live_class.date is @db.Date
// and fromTime/toTime are @db.Time, and they hold an IST WALL CLOCK while the
// server runs UTC. Prisma hands the TIME columns back as 1970-01-01T<hh:mm>Z,
// so they are read with the UTC getters and re-anchored with Date.UTC(...)
// minus the IST offset — identical arithmetic to computeClassWindowUtc
// (apps/api/src/jobs/teams-artifacts-sync.ts) and examStartInstant
// (apps/api/src/jobs/exam-reminders.ts). A 5h30m slip here locks every student
// out of every class.

/** IST is UTC+5:30 — an IST wall clock of 10:00 is 04:30 UTC. */
export const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

/** Naji 2026-08-08: "block allowing anyone to enter the session before 10 minutes of the session". */
export const LIVE_CLASS_JOIN_LEAD_MINUTES = 10;

/**
 * How long after the scheduled end the join door stays open. 15 minutes is not
 * arbitrary: it is DEFAULT_POST_CLASS_GRACE_MINUTES from the Teams artifacts
 * sync job, i.e. the exact moment that job starts pulling the recording. Closing
 * at the same instant means no LMS-driven join can spawn a fresh (and therefore
 * competing) recording after the sync has begun looking. It also never ejects
 * anyone: the gate only decides whether a Join control is offered, so a class
 * that overruns keeps every participant already inside it.
 */
export const LIVE_CLASS_JOIN_GRACE_MINUTES = 15;

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_DAY = 24 * 60 * MS_PER_MINUTE;

/** A live class's IST calendar day plus its IST wall-clock start/end. */
export interface LiveClassScheduleParts {
  year: number;
  /** 1-12, not the 0-based JS month. */
  month: number;
  day: number;
  fromHour: number;
  fromMinute: number;
  fromSecond: number;
  toHour: number;
  toMinute: number;
  toSecond: number;
}

/** All four boundaries as UTC epoch milliseconds. */
export interface LiveClassJoinWindow {
  /** Scheduled start. */
  startMs: number;
  /** Scheduled end. */
  endMs: number;
  /** startMs minus the 10-minute lead — when the Join control unlocks. */
  opensAtMs: number;
  /** endMs plus the grace — when it locks again. */
  closesAtMs: number;
}

export type LiveClassJoinState =
  /** Row has no usable date/time, so it cannot be gated at all. */
  | 'unknown'
  /** Before the window — this is the case Naji asked us to block. */
  | 'too_early'
  | 'open'
  /** Class ended more than the grace period ago. */
  | 'closed';

function parseIstDateParts(value: string): { year: number; month: number; day: number } | null {
  // Deliberately hand-parsed: `new Date('2026-08-06')` is UTC midnight, which
  // reads back as the previous day for anyone at or behind UTC.
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!match) return null;
  const year = Number.parseInt(match[1] ?? '', 10);
  const month = Number.parseInt(match[2] ?? '', 10);
  const day = Number.parseInt(match[3] ?? '', 10);
  if (!Number.isFinite(year) || year <= 0) return null;
  if (!Number.isFinite(month) || month < 1 || month > 12) return null;
  if (!Number.isFinite(day) || day < 1 || day > 31) return null;
  return { year, month, day };
}

function parseIstTimeParts(value: string): { hour: number; minute: number; second: number } | null {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(value.trim());
  if (!match) return null;
  const hour = Number.parseInt(match[1] ?? '', 10);
  const minute = Number.parseInt(match[2] ?? '', 10);
  const rawSecond = match[3];
  const second = rawSecond === undefined ? 0 : Number.parseInt(rawSecond, 10);
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return null;
  if (!Number.isFinite(minute) || minute < 0 || minute > 59) return null;
  if (!Number.isFinite(second) || second < 0 || second > 59) return null;
  return { hour, minute, second };
}

/**
 * Builds schedule parts from the string shape the portals receive:
 * date "YYYY-MM-DD", times "HH:MM" or "HH:MM:SS" (both IST wall clock).
 * Returns null when any piece is missing or unparseable.
 */
export function liveClassScheduleFromStrings(
  date: string,
  fromTime: string,
  toTime: string,
): LiveClassScheduleParts | null {
  const day = parseIstDateParts(date);
  const from = parseIstTimeParts(fromTime);
  const to = parseIstTimeParts(toTime);
  if (!day || !from || !to) return null;
  return {
    year: day.year,
    month: day.month,
    day: day.day,
    fromHour: from.hour,
    fromMinute: from.minute,
    fromSecond: from.second,
    toHour: to.hour,
    toMinute: to.minute,
    toSecond: to.second,
  };
}

/**
 * Builds schedule parts straight from the Prisma columns — live_class.date
 * (@db.Date) and fromTime/toTime (@db.Time). Read with the UTC getters: Prisma
 * anchors a TIME at 1970-01-01T<hh:mm>Z, and the local getters would re-read it
 * through the process timezone.
 */
export function liveClassScheduleFromColumns(
  date: Date | null | undefined,
  fromTime: Date | null | undefined,
  toTime: Date | null | undefined,
): LiveClassScheduleParts | null {
  if (!date || !fromTime || !toTime) return null;
  if (Number.isNaN(date.getTime()) || Number.isNaN(fromTime.getTime()) || Number.isNaN(toTime.getTime())) {
    return null;
  }
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    fromHour: fromTime.getUTCHours(),
    fromMinute: fromTime.getUTCMinutes(),
    fromSecond: fromTime.getUTCSeconds(),
    toHour: toTime.getUTCHours(),
    toMinute: toTime.getUTCMinutes(),
    toSecond: toTime.getUTCSeconds(),
  };
}

/** Turns IST schedule parts into the four UTC instants that bound the join door. */
export function liveClassJoinWindow(parts: LiveClassScheduleParts): LiveClassJoinWindow {
  const startMs =
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.fromHour, parts.fromMinute, parts.fromSecond) -
    IST_OFFSET_MS;
  let endMs =
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.toHour, parts.toMinute, parts.toSecond) -
    IST_OFFSET_MS;
  // An end at or before the start means the class runs past IST midnight —
  // same correction computeClassWindowUtc makes in the artifacts sync job.
  if (endMs <= startMs) endMs += MS_PER_DAY;

  return {
    startMs,
    endMs,
    opensAtMs: startMs - LIVE_CLASS_JOIN_LEAD_MINUTES * MS_PER_MINUTE,
    closesAtMs: endMs + LIVE_CLASS_JOIN_GRACE_MINUTES * MS_PER_MINUTE,
  };
}

/** Convenience wrapper for callers holding the string row shape. */
export function liveClassJoinWindowFromStrings(
  date: string,
  fromTime: string,
  toTime: string,
): LiveClassJoinWindow | null {
  const parts = liveClassScheduleFromStrings(date, fromTime, toTime);
  return parts === null ? null : liveClassJoinWindow(parts);
}

/** Convenience wrapper for callers holding the raw Prisma columns. */
export function liveClassJoinWindowFromColumns(
  date: Date | null | undefined,
  fromTime: Date | null | undefined,
  toTime: Date | null | undefined,
): LiveClassJoinWindow | null {
  const parts = liveClassScheduleFromColumns(date, fromTime, toTime);
  return parts === null ? null : liveClassJoinWindow(parts);
}

export function liveClassJoinState(
  joinWindow: LiveClassJoinWindow | null,
  nowMs: number,
): LiveClassJoinState {
  if (joinWindow === null) return 'unknown';
  if (nowMs < joinWindow.opensAtMs) return 'too_early';
  if (nowMs > joinWindow.closesAtMs) return 'closed';
  return 'open';
}

/**
 * Whether a Join control should be offered. Note the deliberate fail-OPEN on
 * 'unknown': a legacy row with no usable date/time cannot be gated, and hiding
 * a link a student legitimately needs is worse than the accidental-early-start
 * problem this guards against. This is a guard rail, not an access boundary —
 * anyone already holding the raw Teams URL is unaffected either way.
 */
export function isLiveClassJoinOpen(joinWindow: LiveClassJoinWindow | null, nowMs: number): boolean {
  const state = liveClassJoinState(joinWindow, nowMs);
  return state === 'open' || state === 'unknown';
}

/**
 * Renders an epoch instant as an IST time of day, e.g. "02:20 PM". Formatted by
 * hand off the IST-shifted UTC getters rather than through Intl+timeZone so the
 * result is identical on the server, in a browser in any timezone, and in the
 * older webviews our students use on cheap Android handsets.
 */
export function formatIstTimeOfDay(epochMs: number): string {
  if (!Number.isFinite(epochMs)) return '';
  const shifted = new Date(epochMs + IST_OFFSET_MS);
  const hour24 = shifted.getUTCHours();
  const minute = String(shifted.getUTCMinutes()).padStart(2, '0');
  const suffix = hour24 < 12 ? 'AM' : 'PM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${String(hour12).padStart(2, '0')}:${minute} ${suffix}`;
}

/** The exact sentence a student sees on a not-yet-joinable class. */
export function liveClassJoinOpensLabel(joinWindow: LiveClassJoinWindow): string {
  return `Opens ${LIVE_CLASS_JOIN_LEAD_MINUTES} minutes before, at ${formatIstTimeOfDay(joinWindow.opensAtMs)}`;
}
