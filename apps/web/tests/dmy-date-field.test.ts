import { describe, expect, test } from 'vitest';

import { daysInMonth, firstWeekday, formatDmyInput, parseIsoParts, partsToIso } from '../src/lib/dmy-date';

// Risha 2026-08-03 — students could not submit the application form on a phone:
// the numeric keypad has no "/" key, so the mask has to insert the separators.

describe('formatDmyInput', () => {
  test('inserts the separators as digits are typed', () => {
    expect(formatDmyInput('2')).toBe('2');
    expect(formatDmyInput('21')).toBe('21');
    expect(formatDmyInput('210')).toBe('21/0');
    expect(formatDmyInput('2105')).toBe('21/05');
    expect(formatDmyInput('21052')).toBe('21/05/2');
    expect(formatDmyInput('21052000')).toBe('21/05/2000');
  });

  test('never appends a trailing slash, so backspace can delete', () => {
    // A trailing slash would be re-added on every delete and trap the caret.
    expect(formatDmyInput('21')).toBe('21');
    expect(formatDmyInput('2105')).toBe('21/05');
  });

  test('backspacing through a separator removes it with the digit', () => {
    // The browser hands us the raw value after the delete; we re-mask it.
    expect(formatDmyInput('21/0')).toBe('21/0');   // deleted the '5'
    expect(formatDmyInput('21/')).toBe('21');      // deleted the '0' -> slash goes too
    expect(formatDmyInput('2')).toBe('2');
    expect(formatDmyInput('')).toBe('');
  });

  test('is idempotent on already-formatted input', () => {
    expect(formatDmyInput('21/05/2000')).toBe('21/05/2000');
  });

  test('ignores stray non-digits, including a typed slash', () => {
    // Desktop users may still type the slashes themselves.
    expect(formatDmyInput('21/05/2000')).toBe('21/05/2000');
    expect(formatDmyInput('21-05-2000')).toBe('21/05/2000');
    expect(formatDmyInput('21 05 2000')).toBe('21/05/2000');
    expect(formatDmyInput('abc')).toBe('');
  });

  test('caps at eight digits so a long paste cannot overflow the mask', () => {
    expect(formatDmyInput('2105200099')).toBe('21/05/2000');
  });
});

// --- calendar maths behind the picker (Naji 2026-08-03) ---

describe('calendar maths', () => {
  test('parses and rebuilds an ISO date without shifting a day', () => {
    const parts = parseIsoParts('2000-05-21');
    expect(parts).toEqual({ y: 2000, m: 4, d: 21 });
    expect(partsToIso(parts!.y, parts!.m, parts!.d)).toBe('2000-05-21');
  });

  test('round-trips the 1st of January, the classic UTC-shift victim', () => {
    // A Date-based round-trip through UTC would land on 31 Dec of the year before.
    expect(partsToIso(1996, 0, 1)).toBe('1996-01-01');
    expect(parseIsoParts('1996-01-01')).toEqual({ y: 1996, m: 0, d: 1 });
  });

  test('rejects malformed input', () => {
    expect(parseIsoParts('')).toBeNull();
    expect(parseIsoParts('21/05/2000')).toBeNull();
    expect(parseIsoParts('2000-5-1')).toBeNull();
  });

  test('counts days per month, leap years included', () => {
    expect(daysInMonth(2001, 1)).toBe(28);  // Feb, common year
    expect(daysInMonth(2000, 1)).toBe(29);  // Feb 2000 — divisible by 400
    expect(daysInMonth(1900, 1)).toBe(28);  // Feb 1900 — divisible by 100, NOT a leap year
    expect(daysInMonth(2024, 1)).toBe(29);
    expect(daysInMonth(2026, 3)).toBe(30);  // April
    expect(daysInMonth(2026, 11)).toBe(31); // December
  });

  test('finds the weekday the month starts on', () => {
    expect(firstWeekday(2026, 0)).toBe(new Date(2026, 0, 1).getDay());
    // 1 Jan 2000 was a Saturday.
    expect(firstWeekday(2000, 0)).toBe(6);
  });
});
