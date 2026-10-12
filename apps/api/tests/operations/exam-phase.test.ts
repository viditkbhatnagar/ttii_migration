import { describe, expect, test } from 'vitest';

import { examPhase } from '../../src/operations/exam-phase.js';

const at = (iso: string): number => new Date(iso).getTime();
// PG Diploma sittings: 5 Oct 07:30 PM IST (14:00Z) … 15 Oct 08:45 PM IST (15:15Z).
const sittings = [
  { openMs: at('2026-10-05T14:00:00Z'), closeMs: at('2026-10-05T15:15:00Z') },
  { openMs: at('2026-10-15T14:00:00Z'), closeMs: at('2026-10-15T15:15:00Z') },
];

describe('examPhase', () => {
  test('an unpublished exam is a draft whatever its dates', () => {
    expect(examPhase('draft', sittings, at('2026-10-10T00:00:00Z'))).toBe('draft');
  });

  test('before the first sitting opens it is upcoming', () => {
    expect(examPhase('published', sittings, at('2026-10-05T13:59:00Z'))).toBe('upcoming');
  });

  test('between the first opening and the last close it is in progress', () => {
    expect(examPhase('published', sittings, at('2026-10-10T06:00:00Z'))).toBe('in_progress');
  });

  test('after the last sitting closes it is completed', () => {
    expect(examPhase('published', sittings, at('2026-10-15T15:16:00Z'))).toBe('completed');
  });

  test('IST, not the UTC date: 01:00 IST on the exam day is the same day, still upcoming before 07:30 PM', () => {
    // 2026-10-04T19:30Z is 05 Oct 01:00 IST — the UTC date is still the 4th.
    expect(examPhase('published', sittings, at('2026-10-04T19:30:00Z'))).toBe('upcoming');
  });

  test('a sitting that never closes keeps the exam in progress', () => {
    expect(examPhase('published', [{ openMs: at('2026-01-01T00:00:00Z'), closeMs: null }], at('2027-01-01T00:00:00Z'))).toBe('in_progress');
  });
});
