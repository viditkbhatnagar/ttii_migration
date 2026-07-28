import { describe, expect, test } from 'vitest';

import { isImplausibleClassTime, toPmEquivalent, toTimeDisplay } from '../src/lib/class-time';

// Guards the AM/PM slip that made live_class 738 save as 02:00 instead of 14:00
// (28 Jul 2026 — "2.00pm session not showing as Ongoing").

describe('isImplausibleClassTime', () => {
  test('flags midnight through 06:59 as a likely AM/PM slip', () => {
    expect(isImplausibleClassTime('00:00')).toBe(true);
    expect(isImplausibleClassTime('02:00')).toBe(true);
    expect(isImplausibleClassTime('06:59')).toBe(true);
  });

  test('accepts the hours TTII actually teaches', () => {
    expect(isImplausibleClassTime('07:00')).toBe(false);
    expect(isImplausibleClassTime('14:00')).toBe(false);
    expect(isImplausibleClassTime('19:30')).toBe(false);
  });

  test('does not flag an empty or malformed value', () => {
    expect(isImplausibleClassTime('')).toBe(false);
    expect(isImplausibleClassTime('not-a-time')).toBe(false);
  });
});

describe('toPmEquivalent', () => {
  test('shifts a morning time by twelve hours', () => {
    expect(toPmEquivalent('02:00')).toBe('14:00');
    expect(toPmEquivalent('06:45')).toBe('18:45');
  });

  test('preserves seconds when present', () => {
    expect(toPmEquivalent('02:00:30')).toBe('14:00:30');
  });

  test('leaves afternoon times and malformed input untouched', () => {
    expect(toPmEquivalent('14:00')).toBe('14:00');
    expect(toPmEquivalent('12:30')).toBe('12:30');
    expect(toPmEquivalent('')).toBe('');
  });
});

describe('toTimeDisplay', () => {
  test('renders 12-hour clock labels', () => {
    expect(toTimeDisplay('02:00')).toBe('2:00 AM');
    expect(toTimeDisplay('14:00')).toBe('2:00 PM');
    expect(toTimeDisplay('00:15')).toBe('12:15 AM');
    expect(toTimeDisplay('12:05')).toBe('12:05 PM');
  });
});
