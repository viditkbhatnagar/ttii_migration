import { describe, expect, test } from 'vitest';

import { parseFee, validatePlanForm } from '../src/admin/pages/centres/centre-plan-form-model.js';

const ok = { courseId: '16', fee: '10,000', start: '2026-10-01', end: '2027-03-31' };

describe('centre plan form', () => {
  test('parses the fee to a plain number string', () => {
    expect(parseFee('10,000')).toBe('10000');
    expect(parseFee('0')).toBe('0');
    expect(parseFee('2500.5')).toBe('2500.5');
    for (const bad of ['', 'abc', '-1', '1e3', '1.234']) expect(parseFee(bad)).toBeNull();
  });

  test('accepts a complete form', () => {
    expect(validatePlanForm(ok, 'add')).toEqual({});
  });

  test('requires a course on add only', () => {
    expect(validatePlanForm({ ...ok, courseId: '' }, 'add').courseId).toBeDefined();
    expect(validatePlanForm({ ...ok, courseId: '' }, 'edit')).toEqual({});
  });

  test('checks the dates', () => {
    expect(validatePlanForm({ ...ok, start: '' }, 'add').start).toBeDefined();
    expect(validatePlanForm({ ...ok, end: '2026-02-30' }, 'add').end).toBeDefined();
    expect(validatePlanForm({ ...ok, end: '2026-09-30' }, 'add').end).toBe('The end date cannot be before the start date.');
    expect(validatePlanForm({ ...ok, end: ok.start }, 'add')).toEqual({});
  });
});
