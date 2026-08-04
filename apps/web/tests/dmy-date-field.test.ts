import { describe, expect, test } from 'vitest';

import { formatDmyInput } from '../src/lib/dmy-date';

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
