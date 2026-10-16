import { describe, expect, test } from 'vitest';

// buildStudentPaymentRowsFromPlan maps an application's payment_plan JSON to
// the student_payments rows written at conversion (and by the one-off
// backfill). These fixtures pin the outputs for every plan shape that produced
// rows before TTII 2026-10-16, so the ledger-only change below provably leaves
// them byte-identical.

const { buildStudentPaymentRowsFromPlan } = await import('../../src/operations/operations-service.js');

const NOW = new Date('2026-10-16T06:00:00.000Z'); // 11:30 IST, same calendar day
const CTX = { studentUserId: 228, courseId: 25, actorUserId: 1, now: NOW };
const utcDay = (y: number, m: number, d: number): Date => new Date(Date.UTC(y, m - 1, d));

/** The columns every row carries regardless of the plan. */
const BASE = {
  user_id: 228,
  course_id: 25,
  payment_to: 'ttii',
  created_by: 1,
  updated_by: 1,
  created_at: NOW,
  updated_at: NOW,
};

const INSTALMENT_PLAN = {
  mode: 'installment',
  total_amount_minor: 3000000,
  registration_fee_minor: 500000,
  installments: [
    { label: 'Registration Fee — Due Now', amountMinor: 500000, dueDate: '2026-07-10', gstPercent: 0 },
    { label: 'Course Fee Installment 1 of 2', amountMinor: 1250000, dueDate: '2026-08-10', gstPercent: 0 },
    { label: 'Course Fee Installment 2 of 2', amountMinor: 1250000, dueDate: '2026-09-10', gstPercent: 0 },
  ],
  instalment_payments: [
    {
      index: 0, mode: 'UPI', reference: 'UTR123', receipt_url: 'uploads/receipt.pdf', note: '', amount_minor: 500000,
      paid_date: '2026-07-11', marked_at: '2026-07-11T04:00:00.000Z', marked_by: 9, status: 'approved',
      decided_at: '2026-07-11T20:00:00.000Z', decided_by: 1,
    },
    {
      index: 1, mode: 'Cash', reference: 'C1', receipt_url: '', note: '', amount_minor: 1250000,
      paid_date: null, marked_at: '2026-08-10T04:00:00.000Z', marked_by: 9, status: 'pending_approval',
    },
  ],
};

describe('plans that already produced rows stay byte-identical', () => {
  test('instalment plan: approved registration is Paid, the rest Pending, ledger metadata carried', () => {
    const rows = buildStudentPaymentRowsFromPlan(JSON.stringify(INSTALMENT_PLAN), 'pending_approval', CTX);
    expect(rows).toEqual([
      {
        ...BASE, installment_details: 'Registration Fee — Due Now', amount: 5000, payment_mode: 'UPI', status: 'Paid',
        due_date: utcDay(2026, 7, 10), paid_date: utcDay(2026, 7, 11), reference_number: 'UTR123', receipt_url: 'uploads/receipt.pdf',
      },
      {
        ...BASE, installment_details: 'Course Fee Installment 1 of 2', amount: 12500, payment_mode: 'Cash', status: 'Pending',
        due_date: utcDay(2026, 8, 10), paid_date: null, reference_number: 'C1', receipt_url: null,
      },
      {
        ...BASE, installment_details: 'Course Fee Installment 2 of 2', amount: 12500, payment_mode: null, status: 'Pending',
        due_date: utcDay(2026, 9, 10), paid_date: null, reference_number: null, receipt_url: null,
      },
    ]);
  });

  test('legacy manual mirror (no ledger array) settles index 0 from payment_status=paid; snake_case keys read', () => {
    const plan = {
      mode: 'installment',
      installments: [
        { label: 'Registration Fee', amountMinor: 299900, dueDate: '2026-06-01' },
        { label: 'Installment 2', amount_minor: 1000000, due_date: '2026-07-01' },
      ],
      manual_payment: {
        mode: 'Bank Transfer', reference: 'NEFT9', receipt_url: '', note: '', amount_minor: 299900, paid_date: null,
        marked_at: '2026-06-01T18:45:00.000Z', marked_by: 9,
      },
    };
    // 19:00Z on 2 June is 00:30 IST on 3 June — the IST day must win.
    const rows = buildStudentPaymentRowsFromPlan(JSON.stringify(plan), 'paid', { ...CTX, settledAt: '2026-06-02T19:00:00.000Z' });
    expect(rows).toEqual([
      {
        ...BASE, installment_details: 'Registration Fee', amount: 2999, payment_mode: 'Bank Transfer', status: 'Paid',
        due_date: utcDay(2026, 6, 1), paid_date: utcDay(2026, 6, 3), reference_number: 'NEFT9', receipt_url: null,
      },
      {
        ...BASE, installment_details: 'Installment 2', amount: 10000, payment_mode: null, status: 'Pending',
        due_date: utcDay(2026, 7, 1), paid_date: null, reference_number: null, receipt_url: null,
      },
    ]);
  });

  test('registration paid online via the link (no ledger, payment_status=paid) falls back to the conversion day', () => {
    const plan = { mode: 'installment', installments: [{ label: 'Registration Fee — Due Now', amountMinor: 300000, dueDate: '2026-07-01' }] };
    expect(buildStudentPaymentRowsFromPlan(JSON.stringify(plan), 'paid', CTX)).toEqual([
      {
        ...BASE, installment_details: 'Registration Fee — Due Now', amount: 3000, payment_mode: null, status: 'Paid',
        due_date: utcDay(2026, 7, 1), paid_date: utcDay(2026, 10, 16), reference_number: null, receipt_url: null,
      },
    ]);
  });

  test('a rejected registration stays Pending but keeps the recorded mode and reference', () => {
    const plan = {
      installments: [{ label: 'Registration Fee', amountMinor: 299900 }],
      instalment_payments: [
        { index: 0, mode: 'UPI', reference: 'BAD', receipt_url: '', note: '', amount_minor: 299900, paid_date: '2026-10-01', marked_at: '2026-10-01T10:00:00.000Z', marked_by: 9, status: 'rejected', decided_at: '2026-10-02T10:00:00.000Z', decided_by: 1, reject_reason: 'no money' },
      ],
    };
    expect(buildStudentPaymentRowsFromPlan(JSON.stringify(plan), 'payment_rejected', CTX)).toEqual([
      {
        ...BASE, installment_details: 'Registration Fee', amount: 2999, payment_mode: 'UPI', status: 'Pending',
        due_date: null, paid_date: null, reference_number: 'BAD', receipt_url: null,
      },
    ]);
  });

  test('the payment-approval-claim fixture (pending registration) maps to one Pending row', () => {
    const plan = {
      installments: [{ label: 'Registration Fee', amountMinor: 299900 }],
      instalment_payments: [
        { index: 0, mode: 'UPI', reference: 'UTR1', receipt_url: '', note: '', amount_minor: 299900, paid_date: '2026-10-01', marked_at: '2026-10-01T10:00:00.000Z', marked_by: 9, status: 'pending_approval' },
      ],
    };
    expect(buildStudentPaymentRowsFromPlan(JSON.stringify(plan), 'pending_approval', CTX)).toEqual([
      {
        ...BASE, installment_details: 'Registration Fee', amount: 2999, payment_mode: 'UPI', status: 'Pending',
        due_date: null, paid_date: null, reference_number: 'UTR1', receipt_url: null,
      },
    ]);
  });

  test('full-payment plan: one Course Fee row from the total, Paid when settled', () => {
    const plan = { mode: 'full', total_amount_minor: 2500000, registration_fee_minor: null, installments: [], additional_discounts: [] };
    expect(buildStudentPaymentRowsFromPlan(JSON.stringify(plan), 'paid', { ...CTX, settledAt: new Date('2026-09-30T10:00:00.000Z') })).toEqual([
      {
        ...BASE, installment_details: 'Course Fee', amount: 25000, payment_mode: null, status: 'Paid',
        due_date: null, paid_date: utcDay(2026, 9, 30), reference_number: null, receipt_url: null,
      },
    ]);
    expect(buildStudentPaymentRowsFromPlan(JSON.stringify(plan), 'sent', CTX)).toEqual([
      {
        ...BASE, installment_details: 'Course Fee', amount: 25000, payment_mode: null, status: 'Pending',
        due_date: null, paid_date: null, reference_number: null, receipt_url: null,
      },
    ]);
  });

  test('no instalments but a total (any mode) still synthesises the Course Fee row, even with an approved ledger', () => {
    const plan = {
      total_amount_minor: 1500000,
      instalment_payments: [
        { index: 0, mode: 'UPI', reference: 'U9', receipt_url: '', note: '', amount_minor: 299900, paid_date: '2026-07-11', marked_at: '', marked_by: 9, status: 'approved' },
      ],
    };
    expect(buildStudentPaymentRowsFromPlan(JSON.stringify(plan), 'paid', CTX)).toEqual([
      {
        ...BASE, installment_details: 'Course Fee', amount: 15000, payment_mode: 'UPI', status: 'Paid',
        due_date: null, paid_date: utcDay(2026, 7, 11), reference_number: 'U9', receipt_url: null,
      },
    ]);
  });

  test('full mode without a total produces nothing, even with an approved payment', () => {
    const plan = {
      mode: 'full',
      instalment_payments: [
        { index: 0, mode: 'UPI', reference: 'U1', receipt_url: '', note: '', amount_minor: 299900, paid_date: '2026-07-11', marked_at: '', marked_by: 9, status: 'approved' },
      ],
    };
    expect(buildStudentPaymentRowsFromPlan(JSON.stringify(plan), 'paid', CTX)).toEqual([]);
  });

  test('no plan, an empty plan or malformed JSON produce nothing', () => {
    expect(buildStudentPaymentRowsFromPlan(null, 'paid', CTX)).toEqual([]);
    expect(buildStudentPaymentRowsFromPlan(undefined, null, CTX)).toEqual([]);
    expect(buildStudentPaymentRowsFromPlan('', 'paid', CTX)).toEqual([]);
    expect(buildStudentPaymentRowsFromPlan('{not json', 'paid', CTX)).toEqual([]);
    expect(buildStudentPaymentRowsFromPlan('{}', 'sent', CTX)).toEqual([]);
    // payment_status=paid with no plan content synthesises an approved index 0
    // with no amount — there is no money to record.
    expect(buildStudentPaymentRowsFromPlan('{}', 'paid', CTX)).toEqual([]);
  });
});

// TTII 2026-10-16 — an application whose payment_plan holds ONLY an approved
// manual payment (no installments[], no total, not full mode) materialised
// nothing at conversion. Applications 187 (Jayasree S, course 16), 227 (RUBY VP)
// and 228 (JASMINE AZEES, course 23) were enrolled with Finance-approved money
// and an empty fee ledger, so the portal showed "Free" or offered the full
// course price again. Each APPROVED ledger entry now becomes one Paid row.
describe('ledger-only plans (no installments, no total, not full mode)', () => {
  const PROD_SHAPE = {
    instalment_payments: [
      {
        index: 0, mode: 'UPI', reference: 'T2607111234', receipt_url: 'uploads/payment_receipts/r187.jpg', note: '',
        amount_minor: 299900, paid_date: '2026-07-11', marked_at: '2026-07-11T05:10:00.000Z', marked_by: 193,
        status: 'approved', decided_at: '2026-07-12T04:00:00.000Z', decided_by: 1,
      },
    ],
    manual_payment: {
      mode: 'UPI', reference: 'T2607111234', receipt_url: 'uploads/payment_receipts/r187.jpg', note: '',
      amount_minor: 299900, paid_date: '2026-07-11', marked_at: '2026-07-11T05:10:00.000Z', marked_by: 193,
    },
  };

  test('the production shape becomes one Paid Registration Fee row dated the day it was paid', () => {
    expect(buildStudentPaymentRowsFromPlan(JSON.stringify(PROD_SHAPE), 'paid', { ...CTX, settledAt: '2026-07-12T04:00:00.000Z' })).toEqual([
      {
        ...BASE, installment_details: 'Registration Fee', amount: 2999, payment_mode: 'UPI', status: 'Paid',
        due_date: null, paid_date: utcDay(2026, 7, 11), reference_number: 'T2607111234', receipt_url: 'uploads/payment_receipts/r187.jpg',
      },
    ]);
  });

  test('without a paid_date the IST day of the approval is used', () => {
    const plan = {
      instalment_payments: [
        // 20:00Z on 11 July is 01:30 IST on 12 July.
        { index: 0, mode: 'Cash', reference: '', receipt_url: '', note: '', amount_minor: 100000, paid_date: null, marked_at: '', marked_by: 9, status: 'approved', decided_at: '2026-07-11T20:00:00.000Z', decided_by: 1 },
      ],
    };
    expect(buildStudentPaymentRowsFromPlan(JSON.stringify(plan), 'paid', CTX)).toEqual([
      {
        ...BASE, installment_details: 'Registration Fee', amount: 1000, payment_mode: 'Cash', status: 'Paid',
        due_date: null, paid_date: utcDay(2026, 7, 12), reference_number: null, receipt_url: null,
      },
    ]);
  });

  test('one Paid row per APPROVED entry; pending and rejected entries create nothing', () => {
    const plan = {
      mode: 'installment',
      installments: [],
      instalment_payments: [
        { index: 0, mode: 'UPI', reference: 'A', receipt_url: '', note: '', amount_minor: 299900, paid_date: '2026-07-11', marked_at: '', marked_by: 9, status: 'approved' },
        { index: 1, mode: 'UPI', reference: 'B', receipt_url: '', note: '', amount_minor: 500050, paid_date: '2026-08-11', marked_at: '', marked_by: 9, status: 'approved' },
        { index: 2, mode: 'UPI', reference: 'C', receipt_url: '', note: '', amount_minor: 500000, paid_date: '2026-09-11', marked_at: '', marked_by: 9, status: 'pending_approval' },
        { index: 3, mode: 'UPI', reference: 'D', receipt_url: '', note: '', amount_minor: 500000, paid_date: '2026-09-12', marked_at: '', marked_by: 9, status: 'rejected' },
      ],
    };
    expect(buildStudentPaymentRowsFromPlan(JSON.stringify(plan), 'pending_approval', CTX)).toEqual([
      {
        ...BASE, installment_details: 'Registration Fee', amount: 2999, payment_mode: 'UPI', status: 'Paid',
        due_date: null, paid_date: utcDay(2026, 7, 11), reference_number: 'A', receipt_url: null,
      },
      {
        // 500050 paise rounds to whole rupees like every other row.
        ...BASE, installment_details: 'Instalment 1', amount: 5001, payment_mode: 'UPI', status: 'Paid',
        due_date: null, paid_date: utcDay(2026, 8, 11), reference_number: 'B', receipt_url: null,
      },
    ]);
  });

  test('nothing approved means nothing written', () => {
    const pending = {
      instalment_payments: [
        { index: 0, mode: 'UPI', reference: 'A', receipt_url: '', note: '', amount_minor: 299900, paid_date: '2026-07-11', marked_at: '', marked_by: 9, status: 'pending_approval' },
      ],
    };
    expect(buildStudentPaymentRowsFromPlan(JSON.stringify(pending), 'pending_approval', CTX)).toEqual([]);
    const rejected = { manual_payment: { mode: 'UPI', reference: 'A', amount_minor: 299900 } };
    expect(buildStudentPaymentRowsFromPlan(JSON.stringify(rejected), 'payment_rejected', CTX)).toEqual([]);
  });

  test('an approved entry with no recorded amount is skipped (there is no money to record)', () => {
    const plan = {
      instalment_payments: [
        { index: 0, mode: 'UPI', reference: 'A', receipt_url: '', note: '', amount_minor: null, paid_date: '2026-07-11', marked_at: '', marked_by: 9, status: 'approved' },
      ],
    };
    expect(buildStudentPaymentRowsFromPlan(JSON.stringify(plan), 'paid', CTX)).toEqual([]);
  });

  test('a legacy manual mirror approved via payment_status=paid becomes one Paid row', () => {
    const plan = { manual_payment: { mode: 'Cheque', reference: 'CHQ1', receipt_url: '', note: '', amount_minor: 1500000, paid_date: null, marked_at: '2026-06-01T05:00:00.000Z', marked_by: 9 } };
    expect(buildStudentPaymentRowsFromPlan(JSON.stringify(plan), 'paid', { ...CTX, settledAt: '2026-06-02T05:00:00.000Z' })).toEqual([
      {
        ...BASE, installment_details: 'Registration Fee', amount: 15000, payment_mode: 'Cheque', status: 'Paid',
        due_date: null, paid_date: utcDay(2026, 6, 2), reference_number: 'CHQ1', receipt_url: null,
      },
    ]);
  });
});
