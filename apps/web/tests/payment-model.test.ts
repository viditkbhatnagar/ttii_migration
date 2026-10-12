import { describe, expect, test } from 'vitest';

import {
  EMPTY_APPROVAL_FILTERS,
  applicationIdOf,
  approvalAmount,
  approvalCsvRows,
  filterApprovals,
  filterPayments,
  istDate,
  istDateTime,
  localTodayYmd,
  paymentColumns,
  paymentCsvRows,
  paymentRowAction,
  sortApprovals,
  sortPayments,
  toApprovalRows,
  toPaymentRows,
} from '../src/admin/pages/fee/payment-model';

describe('Payment Status', () => {
  const rows = toPaymentRows([
    { id: 101, user_name: 'Asha', student_id: 'TTS0001', course_title: 'Diploma', installment_details: 'Installment 2', amount: 5000, due_date: '2026-09-01T00:00:00.000Z', paid_date: null, computed_status: 'overdue', enrolment_status: 'Active', payment_mode: 'UPI', payment_to: 'ttii' },
    { id: 102, user_name: 'Bina', student_id: 'TTS0002', course_title: 'Diploma', installment_details: null, installment_no: 3, amount: 7000, due_date: '2026-10-05T00:00:00.000Z', paid_date: '2026-10-02T00:00:00.000Z', computed_status: 'paid', enrolment_status: 'Dropout' },
    { id: 'app-44-0', user_name: 'Chitra', student_id: 'c@x.in', course_title: 'AI Cert', installment_details: 'Registration', amount: 2999, due_date: '2026-10-20T00:00:00.000Z', computed_status: 'due', enrolment_status: 'Application' },
  ]);

  test('maps rows: @db.Date read without a timezone shift, default instalment label', () => {
    expect(rows[0]).toMatchObject({ id: '101', dueYmd: '2026-09-01', paidYmd: '', status: 'overdue', mode: 'UPI', applicationId: null });
    expect(rows[1]?.details).toBe('Installment 3');
    expect(rows[1]?.paidYmd).toBe('2026-10-02');
    expect(rows[2]?.applicationId).toBe('44');
  });

  test('applicationIdOf only matches synthesised application rows', () => {
    expect(applicationIdOf('app-12-3')).toBe('12');
    expect(applicationIdOf('12')).toBeNull();
  });

  test('tab + enrolment status filters', () => {
    expect(filterPayments(rows, 'all', '')).toHaveLength(3);
    expect(filterPayments(rows, 'paid', '').map((r) => r.name)).toEqual(['Bina']);
    expect(filterPayments(rows, 'all', 'Application').map((r) => r.name)).toEqual(['Chitra']);
  });

  test('columns per tab match the old page (Naji UAT 2026-05-14)', () => {
    expect(paymentColumns('paid')).toEqual(['enrolmentStatus', 'studentId', 'name', 'course', 'details', 'amount', 'dueDate', 'paidDate', 'mode', 'status']);
    expect(paymentColumns('overdue')).toEqual(['enrolmentStatus', 'studentId', 'name', 'course', 'details', 'amount', 'dueDate', 'status', 'action']);
    expect(paymentColumns('all')).toEqual(['enrolmentStatus', 'studentId', 'name', 'course', 'details', 'amount', 'dueDate', 'paidDate', 'status', 'mode', 'to', 'action']);
  });

  test('row actions: application rows open the application; Remind only on All; nothing for paid on All', () => {
    const [overdue, paid, app] = rows as [typeof rows[0], typeof rows[0], typeof rows[0]];
    expect(paymentRowAction(app, 'due')).toBe('view_application');
    expect(paymentRowAction(app, 'all')).toBe('view_application');
    expect(paymentRowAction(overdue, 'overdue')).toBe('mark_paid');
    expect(paymentRowAction(overdue, 'all')).toBe('mark_paid_and_remind');
    expect(paymentRowAction(paid, 'all')).toBe('none');
  });

  test('sorts by due date and amount; CSV uses dd/mm/yyyy', () => {
    expect(sortPayments(rows, 'dueDate', 'desc').map((r) => r.name)).toEqual(['Chitra', 'Bina', 'Asha']);
    expect(sortPayments(rows, 'amount', 'asc').map((r) => r.amount)).toEqual([2999, 5000, 7000]);
    expect(paymentCsvRows(rows)[2]?.[6]).toBe('05/10/2026');
    expect(paymentCsvRows(rows)[2]?.[7]).toBe('02/10/2026');
  });

  test('localTodayYmd uses local calendar parts', () => {
    expect(localTodayYmd(new Date(2026, 0, 5, 1, 30))).toBe('2026-01-05');
  });
});

describe('Payment Approval', () => {
  const rows = toApprovalRows([
    { id: '44', application_id: 'TTA0044', name: 'Asha', email: 'a@x.in', course_title: 'Diploma', instalment: 'Registration', amount: 2999, mode: 'UPI', reference: 'UTR123', receipt_url: 'https://x/r.pdf', note: '', paid_date: '2026-10-01', marked_at: '2026-10-01T20:00:00.000Z' },
    { id: '45-2', application_id: 'TTA0045', name: 'Bina', email: '', course_title: 'AI Cert', instalment: 'Instalment 2', amount: null, mode: 'Cash', reference: '', receipt_url: '', note: 'Paid on 2026-09-30', paid_date: '2026-09-30', marked_at: '2026-09-30T04:00:00.000Z' },
  ]);

  test('amount keeps the old format; unknown reads a dash', () => {
    expect(approvalAmount(rows[0]?.amount ?? null)).toBe('₹2,999');
    expect(approvalAmount(rows[1]?.amount ?? null)).toBe('—');
  });

  test('recorded timestamps are shown in IST', () => {
    // 20:00 UTC on 1 Oct is 01:30 IST on 2 Oct.
    expect(istDate('2026-10-01T20:00:00.000Z')).toBe('02/10/2026');
    expect(istDate('2026-10-01')).toBe('01/10/2026');
    expect(istDate('')).toBe('');
    expect(istDateTime('2026-10-01T20:00:00.000Z')).toMatch(/^02\/10\/2026, 1:30/);
  });

  test('filters by mode, course and search; sorts newest recorded first', () => {
    expect(filterApprovals(rows, { ...EMPTY_APPROVAL_FILTERS, mode: 'Cash' }).map((r) => r.id)).toEqual(['45-2']);
    expect(filterApprovals(rows, { ...EMPTY_APPROVAL_FILTERS, search: 'utr1' }).map((r) => r.id)).toEqual(['44']);
    expect(filterApprovals(rows, { ...EMPTY_APPROVAL_FILTERS, course: 'AI Cert' })).toHaveLength(1);
    expect(sortApprovals(rows, 'recorded', 'desc').map((r) => r.id)).toEqual(['44', '45-2']);
  });

  test('CSV row', () => {
    expect(approvalCsvRows(rows)[1]).toEqual(['TTA0044', 'Asha', 'a@x.in', 'Diploma', 'Registration', 2999, '01/10/2026', 'UPI', 'UTR123', 'https://x/r.pdf', '02/10/2026']);
    expect(approvalCsvRows(rows)[2]?.[5]).toBe('');
  });
});
