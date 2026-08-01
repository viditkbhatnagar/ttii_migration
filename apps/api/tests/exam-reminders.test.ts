import { describe, expect, test } from 'vitest';

import { examStartInstant } from '../src/jobs/exam-reminders.js';

// The reminder windows are decided entirely by examStartInstant, so an error
// here mails every allocated student at the wrong time (or not at all).
// Prisma reads a DATE and a TIME as separate epoch-anchored UTC Dates; the
// stored wall-clock is IST while the server runs UTC.

describe('examStartInstant', () => {
  test('combines an IST date and time into the correct UTC instant', () => {
    const fromDate = new Date(Date.UTC(2026, 7, 12)); // 12 Aug 2026
    const fromTime = new Date(Date.UTC(1970, 0, 1, 10, 0)); // 10:00 IST
    const start = examStartInstant(fromDate, fromTime);
    // 10:00 IST == 04:30 UTC
    expect(start?.toISOString()).toBe('2026-08-12T04:30:00.000Z');
  });

  test('renders back as the original IST wall clock', () => {
    const start = examStartInstant(
      new Date(Date.UTC(2026, 7, 12)),
      new Date(Date.UTC(1970, 0, 1, 19, 30)),
    );
    expect(start?.toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
    })).toBe('7:30 PM');
    expect(start?.toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
    })).toBe('12 Aug 2026');
  });

  test('an early-morning IST slot stays on its own IST day', () => {
    // 01:00 IST on 12 Aug is 19:30 UTC on 11 Aug — the day must not slip.
    const start = examStartInstant(
      new Date(Date.UTC(2026, 7, 12)),
      new Date(Date.UTC(1970, 0, 1, 1, 0)),
    );
    expect(start?.toISOString()).toBe('2026-08-11T19:30:00.000Z');
    expect(start?.toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
    })).toBe('12 Aug 2026');
  });

  test('treats a missing time as midnight IST', () => {
    const start = examStartInstant(new Date(Date.UTC(2026, 7, 12)), null);
    expect(start?.toISOString()).toBe('2026-08-11T18:30:00.000Z');
  });

  test('returns null without a date', () => {
    expect(examStartInstant(null, new Date(Date.UTC(1970, 0, 1, 10, 0)))).toBeNull();
  });
});

// Mirrors the window arithmetic in sendDueExamReminders, so a change to the
// bounds has to be deliberate.
describe('reminder window selection', () => {
  const WINDOW = 15 * 60 * 1000;
  const pick = (msUntil: number): '24h' | '1h' | null => {
    if (msUntil > 24 * 60 * 60 * 1000 - WINDOW && msUntil <= 24 * 60 * 60 * 1000) return '24h';
    if (msUntil > 60 * 60 * 1000 - WINDOW && msUntil <= 60 * 60 * 1000) return '1h';
    return null;
  };

  test('fires 24h exactly at the boundary and just inside it', () => {
    expect(pick(24 * 60 * 60 * 1000)).toBe('24h');
    expect(pick(24 * 60 * 60 * 1000 - WINDOW + 1)).toBe('24h');
  });

  test('fires 1h exactly at the boundary and just inside it', () => {
    expect(pick(60 * 60 * 1000)).toBe('1h');
    expect(pick(60 * 60 * 1000 - WINDOW + 1)).toBe('1h');
  });

  test('stays silent between and outside the windows', () => {
    expect(pick(12 * 60 * 60 * 1000)).toBeNull();          // mid-gap
    expect(pick(25 * 60 * 60 * 1000)).toBeNull();          // too early
    expect(pick(30 * 60 * 1000)).toBeNull();               // past the 1h window
    expect(pick(-60 * 1000)).toBeNull();                   // already started
  });
});
