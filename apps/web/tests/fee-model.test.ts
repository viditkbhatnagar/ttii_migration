import { describe, expect, test } from 'vitest';

import {
  EMPTY_FEE_STRUCTURE_FILTERS,
  EMPTY_FEE_SUMMARY_FILTERS,
  feeStructureCsvRows,
  feeSummaryTotals,
  filterFeeStructure,
  filterFeeSummary,
  inr,
  inr2,
  installmentCsvRows,
  numOrNull,
  rowNo,
  searchInstallments,
  sortFeeStructure,
  sortFeeSummary,
  sortInstallments,
  statusCounts,
  toFeeStructureRows,
  toFeeSummaryRows,
  toInstallmentRows,
} from '../src/admin/pages/fee/fee-model';

describe('money + small helpers', () => {
  test('numOrNull keeps zero but drops blanks and junk', () => {
    expect(numOrNull(0)).toBe(0);
    expect(numOrNull('25000')).toBe(25000);
    expect(numOrNull(null)).toBeNull();
    expect(numOrNull('')).toBeNull();
    expect(numOrNull('abc')).toBeNull();
  });

  test('inr keeps each screen rounding; inr2 always shows paise', () => {
    expect(inr(29500, 2)).toBe('₹29,500');
    expect(inr(2999.5, 2)).toBe('₹2,999.5');
    expect(inr(2999.5, 0)).toBe('₹3,000');
    expect(inr(null, 2)).toBe('—');
    expect(inr2(1500)).toBe('₹1,500.00');
    expect(inr2(undefined)).toBe('₹0.00');
  });

  test('rowNo pads and continues across pages', () => {
    expect(rowNo(1, 10, 0)).toBe('01');
    expect(rowNo(2, 10, 3)).toBe('14');
  });

  test('statusCounts puts All first, then known statuses in order, then the rest', () => {
    expect(statusCounts(['inactive', 'active', 'active', 'paused'], ['active', 'draft', 'inactive'])).toEqual([
      { id: 'all', count: 4 },
      { id: 'active', count: 2 },
      { id: 'inactive', count: 1 },
      { id: 'paused', count: 1 },
    ]);
  });
});

describe('Course Fee Structure', () => {
  const rows = toFeeStructureRows([
    {
      row_id: 'p-1', offering_id: '7', combination_code: 'TTII + KHDA', course_title: 'Diploma', offering_title: 'Diploma Aug 2026',
      fee_category: 'paid', base_fee: 35000, discount: 10000, final_before_tax: 25000, gst_applicable: true, gst_percent: 18, fee_inc_tax: 29500, status: 'active',
    },
    {
      row_id: 'p-2', offering_id: '7', combination_code: 'TTII + MSU', course_title: 'Diploma', offering_title: 'Diploma Aug 2026',
      fee_category: 'paid', base_fee: 35000, discount: 10000, final_before_tax: 25000, gst_applicable: false, gst_percent: 18, fee_inc_tax: 25000, status: 'active',
    },
    {
      row_id: 'o-9', offering_id: '9', combination_code: '', course_title: 'AI Cert', offering_title: '', offering_code: 'AI-MAY26',
      fee_category: 'free', base_fee: null, discount: null, final_before_tax: 0, gst_applicable: true, gst_percent: null, fee_inc_tax: 0, status: '',
    },
  ]);

  test('maps the server row without recomputing any amount', () => {
    expect(rows[0]).toMatchObject({ id: 'p-1', packageCode: 'TTII + KHDA', type: 'Paid', beforeTax: 25000, gstLabel: '18%', incTax: 29500 });
    expect(rows[1]?.gstLabel).toBe('—');
    expect(rows[1]?.gstPercent).toBeNull();
    // GST defaults to 18% when the server sends none (old page behaviour).
    expect(rows[2]).toMatchObject({ offering: 'AI-MAY26', type: 'Free', baseFee: null, gstLabel: '18%', status: 'draft' });
  });

  test('filters by status, course, type and search across package code', () => {
    expect(filterFeeStructure(rows, { ...EMPTY_FEE_STRUCTURE_FILTERS, status: 'active' })).toHaveLength(2);
    expect(filterFeeStructure(rows, { ...EMPTY_FEE_STRUCTURE_FILTERS, type: 'Free' }).map((r) => r.id)).toEqual(['o-9']);
    expect(filterFeeStructure(rows, { ...EMPTY_FEE_STRUCTURE_FILTERS, search: 'msu' }).map((r) => r.id)).toEqual(['p-2']);
    expect(filterFeeStructure(rows, { ...EMPTY_FEE_STRUCTURE_FILTERS, course: 'AI Cert' })).toHaveLength(1);
  });

  test('sorts numerically with missing amounts first ascending', () => {
    expect(sortFeeStructure(rows, 'incTax', 'desc').map((r) => r.id)).toEqual(['p-1', 'p-2', 'o-9']);
    expect(sortFeeStructure(rows, 'baseFee', 'asc')[0]?.id).toBe('o-9');
  });

  test('CSV leaves blanks for missing amounts and GST-off rows', () => {
    const csv = feeStructureCsvRows(rows);
    expect(csv[0]?.[0]).toBe('Course');
    expect(csv[2]?.[7]).toBe('');
    expect(csv[3]?.[4]).toBe('');
  });
});

describe('Fee Summary', () => {
  const rows = toFeeSummaryRows([
    { enrol_id: 1, enrollment_id: 'E1', user_id: 11, student_name: 'Asha', email: 'a@x.in', course_title: 'Diploma', offering_title: 'Aug', combination_title: 'TTII', course_fee_inc_gst: 30000, fee_paid: 10000, balance_fee: 20000, fee_due: 5000, course_status: 'Active' },
    { enrol_id: 2, enrollment_id: 'E2', user_id: 12, student_name: 'Bina', email: 'b@x.in', course_title: 'Diploma', offering_title: 'Aug', combination_title: 'TTII + MSU', course_fee_inc_gst: 25000, fee_paid: 25000, balance_fee: 0, fee_due: 0, course_status: 'Dropout' },
    { enrol_id: 3, enrollment_id: 'E3', user_id: 13, student_name: 'Chitra', email: '', course_title: 'AI Cert', offering_title: 'May', combination_title: '', course_fee_inc_gst: 2999, fee_paid: 0, balance_fee: 2999, fee_due: 0, course_status: '' },
  ]);

  test('a blank course status reads Active, as the old badge did', () => {
    expect(rows[2]?.status).toBe('Active');
  });

  test('keeps the old Has Balance / Has Due / Fully Cleared semantics', () => {
    const ids = (feeState: '' | 'has_balance' | 'has_due' | 'cleared') =>
      filterFeeSummary(rows, { ...EMPTY_FEE_SUMMARY_FILTERS, feeState }).map((r) => r.enrollmentId);
    expect(ids('has_balance')).toEqual(['E1', 'E3']);
    expect(ids('has_due')).toEqual(['E1']);
    expect(ids('cleared')).toEqual(['E2']);
  });

  test('status pill, course and search filters', () => {
    expect(filterFeeSummary(rows, { ...EMPTY_FEE_SUMMARY_FILTERS, status: 'Active' })).toHaveLength(2);
    expect(filterFeeSummary(rows, { ...EMPTY_FEE_SUMMARY_FILTERS, course: 'AI Cert' })).toHaveLength(1);
    expect(filterFeeSummary(rows, { ...EMPTY_FEE_SUMMARY_FILTERS, search: 'msu' }).map((r) => r.name)).toEqual(['Bina']);
  });

  test('totals cover every enrolment, sorting is numeric', () => {
    expect(feeSummaryTotals(rows)).toEqual({ fee: 57999, paid: 35000, balance: 22999, due: 5000 });
    expect(sortFeeSummary(rows, 'balance', 'desc').map((r) => r.enrollmentId)).toEqual(['E1', 'E3', 'E2']);
  });
});

describe('Fee Installments', () => {
  const rows = toInstallmentRows([
    { id: 5, user_id: 5, student_id: 'TTS0005', student_name: 'Devi', installment_details: 'Installment 1', course_title: 'Diploma, PG Diploma', total_fee: 60000, fee_plan_status: 'partially_added' },
    { id: 6, user_id: null, student_course_id: 66, student_id: 'TTS0006', student_name: 'Eshan', installment_details: null, course_title: 'AI Cert', total_fee: 2999 },
  ]);

  test('splits multiple courses and keeps the old View Installments target', () => {
    expect(rows[0]?.courses).toEqual(['Diploma', 'PG Diploma']);
    expect(rows[0]?.viewId).toBe('5');
    expect(rows[1]?.viewId).toBe('66');
  });

  test('search, sort and CSV', () => {
    expect(searchInstallments(rows, 'pg dip').map((r) => r.name)).toEqual(['Devi']);
    expect(sortInstallments(rows, 'totalFee', 'asc').map((r) => r.name)).toEqual(['Eshan', 'Devi']);
    expect(installmentCsvRows(rows)[1]).toEqual(['TTS0005', 'Devi', 'Installment 1', 'Diploma, PG Diploma', 60000]);
  });
});
