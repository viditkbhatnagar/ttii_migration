import { describe, expect, test } from 'vitest';

import {
  EMPTY_TARGET_FILTERS,
  activeTargetFor,
  filterTargets,
  formFromRow,
  monthLabel,
  monthRange,
  parsePeriod,
  sortTargets,
  targetCounts,
  targetCsvRows,
  targetMonths,
  targetPayload,
  targetPhase,
  toTargetRows,
  withoutActiveTarget,
  yearOptions,
} from '../src/admin/pages/counsellor/counsellor-target-model';

const TODAY = '2026-10-12';
const rows = toTargetRows([
  { id: 5, user_id: 12, counsellor_name: 'Asha', counsellor_email: 'asha@ttii.in', target_type: 'Points', target_value: 20, achieved_value: 5, period: '2026-10-01 to 2026-10-31', remarks: 'Diwali push' },
  { _id: '4', user_id: 7, counsellor_name: 'Ravi', target_type: 'Applications', target_value: 10, achieved_value: 12, period: '2026-09-01 to 2026-09-30' },
  { id: 6, user_id: 7, counsellor_name: 'Ravi', target_type: 'Enrolments', target_value: 0, achieved_value: 3, period: '2026-11-01 to 2026-11-30' },
  { id: 9, user_id: 3, counsellor_name: 'Zoya', target_type: 'Revenue', target_value: 50000, achieved_value: 2, period: '' },
], TODAY);

describe('period semantics (unchanged from the old page)', () => {
  test('a month maps to its first and last day, leap years included', () => {
    expect(monthRange('2026', '02')).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(monthRange('2028', '02')).toEqual({ from: '2028-02-01', to: '2028-02-29' });
    expect(monthRange('2026', '12')).toEqual({ from: '2026-12-01', to: '2026-12-31' });
    expect(monthRange('', '01')).toEqual({ from: '', to: '' });
    expect(parsePeriod('2026-10-01 to 2026-10-31')).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    expect(parsePeriod(null)).toEqual({ from: '', to: '' });
  });

  test('payload: same fields as before, null while a required field is empty', () => {
    expect(targetPayload({ userId: '12', type: 'Points', value: '20', month: '10', year: '2026', remarks: '' })).toEqual({
      user_id: '12', target_type: 'Points', target_value: 20, period_from: '2026-10-01', period_to: '2026-10-31', remarks: undefined,
    });
    expect(targetPayload({ userId: '12', type: 'Points', value: '', month: '10', year: '2026', remarks: '' })).toBeNull();
    expect(targetPayload({ userId: '', type: 'Points', value: '3', month: '10', year: '2026', remarks: '' })).toBeNull();
  });

  test('edit prefills month + year from the stored from_date', () => {
    const r = rows[0];
    if (!r) throw new Error('row missing');
    expect(formFromRow(r)).toEqual({ userId: '12', type: 'Points', value: '20', month: '10', year: '2026', remarks: 'Diwali push' });
  });

  test('year options keep an out-of-range stored year', () => {
    expect(yearOptions(new Date(2026, 5, 1))).toEqual(['2025', '2026', '2027', '2028', '2029']);
    expect(yearOptions(new Date(2026, 5, 1), '2022')).toEqual(['2022', '2025', '2026', '2027', '2028', '2029']);
  });
});

describe('rows and state', () => {
  test('progress and phase against today (IST)', () => {
    expect(rows.map((r) => [r.id, r.pct, r.phase, r.monthKey])).toEqual([
      ['5', 25, 'Active', '2026-10'],
      ['4', 120, 'Ended', '2026-09'],
      ['6', 0, 'Upcoming', '2026-11'],
      ['9', 0, null, ''],
    ]);
    expect(targetPhase('2026-10-01', '2026-10-12', TODAY)).toBe('Active');
    expect(targetPhase('2026-10-13', '2026-10-31', TODAY)).toBe('Upcoming');
    expect(monthLabel('2026-10')).toBe('October 2026');
    expect(monthLabel('')).toBe('');
  });

  test('filters, counts and month options', () => {
    expect(targetCounts(rows)).toEqual({ all: 4, Active: 1, Upcoming: 1, Ended: 1 });
    expect(filterTargets(rows, { ...EMPTY_TARGET_FILTERS, tab: 'Ended' }).map((r) => r.id)).toEqual(['4']);
    expect(filterTargets(rows, { ...EMPTY_TARGET_FILTERS, counsellor: '7' }).map((r) => r.id)).toEqual(['4', '6']);
    expect(filterTargets(rows, { ...EMPTY_TARGET_FILTERS, month: '2026-11' }).map((r) => r.id)).toEqual(['6']);
    expect(filterTargets(rows, { ...EMPTY_TARGET_FILTERS, type: 'Revenue' }).map((r) => r.id)).toEqual(['9']);
    expect(filterTargets(rows, { ...EMPTY_TARGET_FILTERS, search: 'diwali' }).map((r) => r.id)).toEqual(['5']);
    // The "no target" view leaves the target list unfiltered by state.
    expect(filterTargets(rows, { ...EMPTY_TARGET_FILTERS, tab: 'none' })).toHaveLength(4);
    expect(targetMonths(rows).map((m) => m.value)).toEqual(['2026-11', '2026-10', '2026-09']);
  });

  test('sorting and the current target per counsellor', () => {
    expect(sortTargets(rows, 'month', 'desc').map((r) => r.id)).toEqual(['6', '5', '4', '9']);
    expect(sortTargets(rows, 'progress', 'desc').map((r) => r.id)[0]).toBe('4');
    expect(activeTargetFor(rows, '12')?.id).toBe('5');
    expect(activeTargetFor(rows, '7')).toBeNull();
    expect(withoutActiveTarget([{ id: '12' }, { id: '7' }, { id: '3' }], rows).map((c) => c.id)).toEqual(['7', '3']);
  });

  test('csv export', () => {
    const csv = targetCsvRows(rows.slice(0, 1));
    expect(csv[0]?.[0]).toBe('Target ID');
    expect(csv[1]).toEqual(['5', 'Asha', 'asha@ttii.in', 'Points', 'October 2026', '2026-10-01', '2026-10-31', 20, 5, 25, 'Active', 'Diwali push']);
  });
});
