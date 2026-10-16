import { describe, expect, test } from 'vitest';

import {
  addMonthsYmd,
  generateRows,
  initialDraft,
  instalmentLabelOffset,
  isValidYmd,
  lockReasonLabel,
  parsePlanData,
  payableOf,
  scopeToCourse,
  splitEvenly,
  summarizeDraft,
  toSaveBody,
  todayYmd,
  usesOwnFeePlan,
  type EnrolmentPlanData,
  type PlanDraft,
} from '../src/admin/pages/students/student-view/enrolment-fee-plan-model';

// Per-enrolment payment plan (TTII 2026-10-16). The server re-checks
// everything; these mirror its rules so the dialog can explain a problem
// before Save.

const RAW = {
  enrol_id: 253,
  course_title: 'Certification in Ai - Early Childhood Educator',
  enrollment_id: 'TIDMTT26100228',
  student_name: 'VIDHYA SHANKAR KS',
  prefill: { total_fee: 20000, discount: 2000, gst_percent: 18, source: 'offering', source_label: 'the course offering "AI Educator - Oct 2026"' },
  agreed_fee: 15000,
  free_offering: false,
  money: { application_code: 'TTII260300', application: 0, online: 0, schedule_paid: 0, pending_approval: false, link_outstanding: false, link_expires_on: '' },
  block_reason: null,
  today: '2026-10-16',
  due_from: '2025-10-16',
  due_to: '2029-10-16',
  rows: [],
};

const withRows = (rows: Array<Record<string, unknown>>): EnrolmentPlanData => parsePlanData({ ...RAW, rows });

describe('reading the plan payload', () => {
  test('parses prefill, references, money, the block reason, the due window and rows', () => {
    const data = parsePlanData({
      ...RAW,
      money: { ...RAW.money, online: 18000 },
      block_reason: 'This student has already paid ₹18,000 online for this course, but the schedule shows ₹0 paid; record it as a Paid instalment first.',
      rows: [{ id: 1001, label: 'Registration Fee', amount: 2000, due_date: '2026-10-01', paid_date: '2026-10-01', status: 'Paid', locked: true, lock_reason: 'paid' }],
    });
    expect(data).toMatchObject({
      enrolId: '253',
      prefill: { totalFee: 20000, discount: 2000, gstPercent: 18 },
      agreedFee: 15000,
      money: { code: 'TTII260300', online: 18000, pendingApproval: false, linkOutstanding: false },
      dueFrom: '2025-10-16',
      dueTo: '2029-10-16',
      rows: [{ id: '1001', amount: 2000, locked: true, lockReason: 'paid' }],
    });
    expect(data.blockReason).toContain('₹18,000 online');
    const blank = parsePlanData({ ...RAW, prefill: { total_fee: null }, agreed_fee: null, block_reason: '' });
    expect(blank.prefill.totalFee).toBeNull();
    expect(blank.blockReason).toBeNull();
    expect(lockReasonLabel('checkout')).toBe('Checkout in progress');
  });
});

describe('money helpers mirror the server', () => {
  test('payable = (fee - discount) + GST, whole rupees', () => {
    expect(payableOf(25000, 0, 18)).toEqual({ afterDiscount: 25000, gstAmount: 4500, payable: 29500 });
    expect(payableOf(2999, 0, 18)).toMatchObject({ payable: 3539 });
    expect(payableOf(0, 0, 0)).toEqual({ error: 'Enter the total fee.' });
    expect(payableOf(1000, 2000, 0)).toEqual({ error: 'The discount cannot be more than the total fee.' });
  });

  test('even split in whole rupees, remainder on the last row', () => {
    expect(splitEvenly(11000, 2)).toEqual([5500, 5500]);
    expect(splitEvenly(10000, 3)).toEqual([3333, 3333, 3334]);
    expect(splitEvenly(0, 3)).toEqual([]);
    expect(splitEvenly(100, 0)).toEqual([]);
  });

  test('monthly due dates clamp to the month end; today is built from LOCAL parts', () => {
    expect(addMonthsYmd('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsYmd('2028-01-31', 1)).toBe('2028-02-29');
    expect(addMonthsYmd('2026-11-15', 2)).toBe('2027-01-15');
    expect(addMonthsYmd('not-a-date', 1)).toBe('not-a-date');
    expect(todayYmd(new Date(2026, 9, 16, 23, 45))).toBe('2026-10-16');
    expect(isValidYmd('2026-02-29')).toBe(false);
    expect(isValidYmd('2028-02-29')).toBe(true);
  });

  test('generated instalments continue the kept numbering', () => {
    const offset = instalmentLabelOffset([{ label: 'Installment 1' }, { label: 'Registration Fee' }]);
    expect(offset).toBe(1);
    expect(generateRows(11000, 2, '2026-11-10', offset)).toEqual([
      { key: 'gen-0', label: 'Installment 2', amount: '5500', dueDate: '2026-11-10' },
      { key: 'gen-1', label: 'Installment 3', amount: '5500', dueDate: '2026-12-10' },
    ]);
  });
});

describe('starting point of the dialog', () => {
  test('Generate: prefilled fee, full payment due today', () => {
    expect(initialDraft(withRows([]), '2026-10-16')).toEqual({
      mode: 'full', totalFee: '20000', discount: '2000', gstPercent: '18', fromSchedule: false,
      rows: [{ key: 'full', label: 'Course Fee', amount: '', dueDate: '2026-10-16' }],
    });
    // Nothing resolvable: blank fee.
    const blank = initialDraft(parsePlanData({ ...RAW, prefill: { total_fee: null, discount: 0, gst_percent: 0 } }), '2026-10-16');
    expect(blank).toMatchObject({ totalFee: '', discount: '0', gstPercent: '0' });
  });

  test('Edit: the current schedule total, with only the replaceable rows editable', () => {
    const data = withRows([
      { id: 1001, label: 'Installment 1', amount: 2000, due_date: '2026-10-01', paid_date: '2026-10-01', status: 'Paid', locked: true, lock_reason: 'paid' },
      { id: 1002, label: 'Installment 2', amount: 8000, due_date: '2026-11-01', paid_date: '', status: 'Pending', locked: false, lock_reason: null },
    ]);
    expect(initialDraft(data, '2026-10-16')).toEqual({
      mode: 'installment', totalFee: '10000', discount: '0', gstPercent: '0', fromSchedule: true,
      rows: [{ key: 'cur-1002', label: 'Installment 2', amount: '8000', dueDate: '2026-11-01' }],
    });
    const single = withRows([{ id: 7, label: 'Course Fee', amount: 9000, due_date: '2026-11-01', status: 'Pending', locked: false, lock_reason: null }]);
    expect(initialDraft(single, '2026-10-16')).toMatchObject({ mode: 'full', totalFee: '9000', rows: [{ label: 'Course Fee', dueDate: '2026-11-01' }] });
  });
});

describe('checking a draft before Save', () => {
  const full = (over: Partial<PlanDraft> = {}): PlanDraft => ({
    mode: 'full', totalFee: '10000', discount: '0', gstPercent: '18', fromSchedule: false,
    rows: [{ key: 'full', label: 'Course Fee', amount: '', dueDate: '2026-10-31' }], ...over,
  });

  test('full payment is one row for exactly what is left', () => {
    expect(summarizeDraft(full(), [])).toEqual({ payable: 11800, afterDiscount: 10000, gstAmount: 1800, keptTotal: 0, remaining: 11800, planned: 11800, problem: null });
    expect(summarizeDraft(full(), [{ amount: 1800 }])).toMatchObject({ remaining: 10000, planned: 10000, problem: null });
    expect(toSaveBody('253', full(), 10000)).toEqual({
      enrol_id: '253', mode: 'full', total_fee: 10000, discount: 0, gst_percent: 18,
      installments: [{ label: 'Course Fee', amount: 10000, due_date: '2026-10-31' }],
    });
  });

  test('instalments must add up to the rupee, with valid whole amounts and dates', () => {
    const rows = [
      { key: 'a', label: 'Installment 1', amount: '5000', dueDate: '2026-11-10' },
      { key: 'b', label: 'Installment 2', amount: '4999', dueDate: '2026-12-10' },
    ];
    const draft: PlanDraft = { mode: 'installment', totalFee: '10000', discount: '0', gstPercent: '0', fromSchedule: false, rows };
    expect(summarizeDraft(draft, []).problem).toBe('The rows add up to ₹9,999 but ₹10,000 is left to schedule.');
    expect(summarizeDraft({ ...draft, rows: [rows[0]!, { ...rows[1]!, amount: '5000' }] }, []).problem).toBeNull();
    expect(summarizeDraft({ ...draft, rows: [rows[0]!, { ...rows[1]!, amount: '' }] }, []).problem).toBe('Row 2: the amount must be a whole number of rupees, at least ₹1.');
    expect(summarizeDraft({ ...draft, rows: [rows[0]!, { ...rows[1]!, amount: '5000', dueDate: '' }] }, []).problem).toBe('Row 2: enter a valid due date.');
    expect(summarizeDraft({ ...draft, rows: [] }, []).problem).toBe('Add the instalments for the remaining ₹10,000.');
  });

  test('kept rows: above the total is refused; exactly covering it saves only when something is replaced', () => {
    expect(summarizeDraft(full({ gstPercent: '0' }), [{ amount: 12000 }]).problem).toBe(
      'The instalments that must be kept already total ₹12,000, more than the payable ₹10,000.',
    );
    expect(summarizeDraft(full({ gstPercent: '0' }), [{ amount: 10000 }], 0).problem).toBe('Nothing to change: the kept instalments already cover the payable total.');
    expect(summarizeDraft(full({ gstPercent: '0' }), [{ amount: 10000 }], 2).problem).toBeNull();
    expect(toSaveBody('253', full({ gstPercent: '0' }), 0).installments).toEqual([]);
  });

  test('a missing fee is reported first', () => {
    expect(summarizeDraft(full({ totalFee: '' }), []).problem).toBe('Enter the total fee.');
  });

  test("due dates outside the server's window are reported like the server does", () => {
    const window = { from: '2025-10-16', to: '2029-10-16' };
    expect(summarizeDraft(full(), [], 0, window).problem).toBeNull();
    expect(summarizeDraft(full({ rows: [{ key: 'full', label: 'Course Fee', amount: '', dueDate: '2030-01-01' }] }), [], 0, window).problem).toBe(
      'Row 1: the due date must be between 16/10/2025 and 16/10/2029.',
    );
  });
});

describe('which enrolments get their own plan', () => {
  test('the server decides (own_fee_plan); a display-only enrolment never does', () => {
    expect(usesOwnFeePlan({ id: 253, course_id: 25, own_fee_plan: true })).toBe(true);
    expect(usesOwnFeePlan({ id: 252, course_id: 16, own_fee_plan: false })).toBe(false);
    expect(usesOwnFeePlan({ id: 252, course_id: 16 })).toBe(false);
    // The display-only enrolment synthesised when a student has no enrol row.
    expect(usesOwnFeePlan({ id: 0, course_id: 25, own_fee_plan: true })).toBe(false);
  });

  test('the Payments sub-tab shows only the selected enrolment course', () => {
    const rows = [{ id: 1, course_id: 16 }, { id: 2, course_id: 25 }, { id: 3, course_id: '25' }];
    expect(scopeToCourse(rows, 25).map((r) => r.id)).toEqual([2, 3]);
    expect(scopeToCourse(rows, 0)).toHaveLength(3);
  });
});
