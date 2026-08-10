import { describe, expect, it } from 'vitest';

import {
  LIVE_CLASS_JOIN_GRACE_MINUTES,
  LIVE_CLASS_JOIN_LEAD_MINUTES,
  formatIstTimeOfDay,
  isLiveClassJoinOpen,
  liveClassJoinOpensLabel,
  liveClassJoinState,
  liveClassJoinWindowFromColumns,
  liveClassJoinWindowFromStrings,
} from '../src/index';

/** Prisma hands a @db.Time back anchored at the unix epoch, in UTC. */
function timeColumn(hhmmss: string): Date {
  return new Date(`1970-01-01T${hhmmss}Z`);
}

/** Prisma hands a @db.Date back as UTC midnight of the stored calendar day. */
function dateColumn(ymd: string): Date {
  return new Date(`${ymd}T00:00:00Z`);
}

describe('live class join window — IST wall clock vs UTC server', () => {
  // The canonical case from the 2026-08-08 brief: a class on 2026-08-06 running
  // 14:30–15:30 IST must open at 14:20 IST, which is 08:50 UTC.
  const window = liveClassJoinWindowFromStrings('2026-08-06', '14:30:00', '15:30:00');

  it('anchors the scheduled start at the IST wall clock, not the server clock', () => {
    expect(window).not.toBeNull();
    expect(new Date(window!.startMs).toISOString()).toBe('2026-08-06T09:00:00.000Z');
    expect(new Date(window!.endMs).toISOString()).toBe('2026-08-06T10:00:00.000Z');
  });

  it('opens 10 minutes before — 14:20 IST = 08:50 UTC', () => {
    expect(new Date(window!.opensAtMs).toISOString()).toBe('2026-08-06T08:50:00.000Z');
    expect(window!.startMs - window!.opensAtMs).toBe(LIVE_CLASS_JOIN_LEAD_MINUTES * 60_000);
  });

  it('closes at the scheduled end plus the grace period', () => {
    expect(new Date(window!.closesAtMs).toISOString()).toBe('2026-08-06T10:15:00.000Z');
    expect(window!.closesAtMs - window!.endMs).toBe(LIVE_CLASS_JOIN_GRACE_MINUTES * 60_000);
  });

  it('produces the identical window from the raw Prisma columns', () => {
    const fromColumns = liveClassJoinWindowFromColumns(
      dateColumn('2026-08-06'),
      timeColumn('14:30:00'),
      timeColumn('15:30:00'),
    );
    expect(fromColumns).toEqual(window);
  });
});

describe('liveClassJoinState', () => {
  const window = liveClassJoinWindowFromStrings('2026-08-06', '14:30:00', '15:30:00')!;
  const at = (iso: string): number => new Date(iso).getTime();

  it('blocks the day-early click that caused the incident', () => {
    // 5 Aug, the day before — the click that started the meeting and burned a
    // 239 KB recording against the 6 Aug class.
    expect(liveClassJoinState(window, at('2026-08-05T10:00:00Z'))).toBe('too_early');
    expect(isLiveClassJoinOpen(window, at('2026-08-05T10:00:00Z'))).toBe(false);
  });

  it('is still shut one minute before the window opens', () => {
    expect(liveClassJoinState(window, at('2026-08-06T08:49:00Z'))).toBe('too_early');
  });

  it('opens exactly at T-10 and stays open through the class', () => {
    expect(liveClassJoinState(window, at('2026-08-06T08:50:00Z'))).toBe('open');
    expect(liveClassJoinState(window, at('2026-08-06T09:30:00Z'))).toBe('open');
    expect(liveClassJoinState(window, at('2026-08-06T10:00:00Z'))).toBe('open');
  });

  it('stays open through the grace period, then closes', () => {
    expect(liveClassJoinState(window, at('2026-08-06T10:15:00Z'))).toBe('open');
    expect(liveClassJoinState(window, at('2026-08-06T10:16:00Z'))).toBe('closed');
    expect(isLiveClassJoinOpen(window, at('2026-08-06T10:16:00Z'))).toBe(false);
  });

  it('fails OPEN when the row has no usable date/time', () => {
    expect(liveClassJoinWindowFromStrings('', '14:30:00', '15:30:00')).toBeNull();
    expect(liveClassJoinWindowFromColumns(null, null, null)).toBeNull();
    expect(liveClassJoinState(null, Date.now())).toBe('unknown');
    expect(isLiveClassJoinOpen(null, Date.now())).toBe(true);
  });
});

describe('classes that run past IST midnight', () => {
  it('rolls the end forward a day instead of producing a negative window', () => {
    const window = liveClassJoinWindowFromStrings('2026-08-06', '23:30:00', '00:30:00')!;
    expect(window.endMs - window.startMs).toBe(60 * 60_000);
    expect(new Date(window.startMs).toISOString()).toBe('2026-08-06T18:00:00.000Z');
    expect(new Date(window.endMs).toISOString()).toBe('2026-08-06T19:00:00.000Z');
  });
});

describe('student-facing wording', () => {
  it('renders the opening time in IST regardless of the viewer timezone', () => {
    const window = liveClassJoinWindowFromStrings('2026-08-06', '14:30:00', '15:30:00')!;
    expect(formatIstTimeOfDay(window.opensAtMs)).toBe('02:20 PM');
    expect(liveClassJoinOpensLabel(window)).toBe('Opens 10 minutes before, at 02:20 PM');
  });

  it('formats midnight and noon without rolling to 00 / 12 the wrong way', () => {
    const midnight = liveClassJoinWindowFromStrings('2026-08-06', '00:10:00', '01:10:00')!;
    expect(formatIstTimeOfDay(midnight.opensAtMs)).toBe('12:00 AM');
    const noon = liveClassJoinWindowFromStrings('2026-08-06', '12:10:00', '13:10:00')!;
    expect(formatIstTimeOfDay(noon.opensAtMs)).toBe('12:00 PM');
  });

  it('accepts HH:MM as well as HH:MM:SS', () => {
    expect(liveClassJoinWindowFromStrings('2026-08-06', '14:30', '15:30')).toEqual(
      liveClassJoinWindowFromStrings('2026-08-06', '14:30:00', '15:30:00'),
    );
  });
});
