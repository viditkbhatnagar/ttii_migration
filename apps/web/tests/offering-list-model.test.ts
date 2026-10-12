import { describe, expect, test } from 'vitest';

import {
  EMPTY_OFFERING_FILTERS,
  filterOfferings,
  modeOptions,
  offeringCsvRows,
  offeringTotals,
  sortOfferings,
  toOfferingRows,
} from '../src/admin/pages/offering/offering-list-model';

const rows = toOfferingRows([
  { id: '3', title: 'Diploma Aug 2026', offering_code: 'DMTT-AUG26', course_id: '16', course_title: 'Diploma', delivery_mode: 'cohort', start_date: '2026-08-01T00:00:00.000Z', end_date: '2027-07-31T00:00:00.000Z', enrollment_end: '2026-07-25T00:00:00.000Z', fee_category: 'paid', enrolled_count: 40, status: 'active' },
  { id: '4', title: 'AI Cert May 2026', offering_code: '', course_id: '20', course_title: 'AI Cert', delivery_mode: 'self_paced', start_date: null, end_date: null, enrollment_end: null, fee_category: 'free', enrolled_count: 12, status: 'draft', course_expiry_days: 365 },
  { id: '5', title: 'Old batch', course_id: '16', course_title: 'Diploma', delivery_mode: 'cohort', fee_category: null, enrolled_count: 0, status: '' },
]);

describe('Course Offerings list model', () => {
  test('maps rows: dates without a timezone shift, labels, defaults', () => {
    expect(rows[0]).toMatchObject({ startYmd: '2026-08-01', enrolEndYmd: '2026-07-25', modeLabel: 'Cohort', pricing: 'Paid' });
    expect(rows[1]).toMatchObject({ startYmd: '', modeLabel: 'Self-Paced', pricing: 'Free', expiryDays: 365 });
    expect(rows[2]?.status).toBe('draft');
  });

  test('totals match the old KPI cards', () => {
    expect(offeringTotals(rows)).toEqual({ total: 3, active: 1, enrolled: 52 });
  });

  test('filters: status, course id, mode, pricing, search on code', () => {
    expect(filterOfferings(rows, { ...EMPTY_OFFERING_FILTERS, status: 'draft' })).toHaveLength(2);
    expect(filterOfferings(rows, { ...EMPTY_OFFERING_FILTERS, courseId: '16' })).toHaveLength(2);
    expect(filterOfferings(rows, { ...EMPTY_OFFERING_FILTERS, mode: 'self_paced' }).map((r) => r.id)).toEqual(['4']);
    expect(filterOfferings(rows, { ...EMPTY_OFFERING_FILTERS, pricing: 'Free' }).map((r) => r.id)).toEqual(['4']);
    expect(filterOfferings(rows, { ...EMPTY_OFFERING_FILTERS, search: 'aug26' }).map((r) => r.id)).toEqual(['3']);
  });

  test('sorts and lists modes; CSV uses dd/mm/yyyy', () => {
    expect(sortOfferings(rows, 'enrolled', 'desc').map((r) => r.id)).toEqual(['3', '4', '5']);
    expect(modeOptions(rows)).toEqual([{ value: 'cohort', label: 'Cohort' }, { value: 'self_paced', label: 'Self-Paced' }]);
    expect(offeringCsvRows(rows)[1]).toEqual(['Diploma Aug 2026', 'DMTT-AUG26', 'Diploma', 'Cohort', '01/08/2026', '31/07/2027', '25/07/2026', 'Paid', 40, 'active']);
  });
});
