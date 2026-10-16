import { describe, expect, test } from 'vitest';

import {
  canPayCourse,
  courseStatusPill,
  filterAccounts,
  normalizeCourse,
} from '../src/student/pages/payments/student-payments-model';

// TTII 2026-10-16 — VIDHYA SHANKAR KS's added course 25 (a PAID course with no
// fee rows yet) showed "Free / N/A — No Payment Required" because any zero
// total read as free. Free now comes only from the API's fee_status.

const scheduled = normalizeCourse({
  course_id: 16, title: 'Diploma', total_fee: 10000, amount_paid: 5000, balance: 5000, status: 'Pending', fee_status: 'scheduled',
  installments: [
    { id: 1, installment_details: 'Registration', amount: 5000, due_date: '2026-07-01', status: 'Paid' },
    { id: 2, installment_details: 'Installment 1', amount: 5000, due_date: '2026-12-01', status: 'Due' },
  ],
});
const pending = normalizeCourse({ course_id: 25, title: 'AI Educator', total_fee: 0, amount_paid: 0, balance: 0, status: 'completed', fee_status: 'pending', installments: [] });
const free = normalizeCourse({ course_id: 30, title: 'Orientation', total_fee: 0, amount_paid: 0, balance: 0, status: 'completed', fee_status: 'free', is_free: 1, installments: [] });
const cleared = normalizeCourse({ course_id: 18, title: 'PG Diploma', total_fee: 30000, amount_paid: 30000, balance: 0, status: 'completed', fee_status: 'scheduled', installments: [] });

describe('free vs fee pending', () => {
  test('a zero-total paid course is pending, not free, and cannot be paid', () => {
    expect(pending).toMatchObject({ isFree: false, feePending: true });
    expect(courseStatusPill(pending)).toEqual({ label: 'Awaiting fee', tone: 'muted' });
    expect(canPayCourse(pending)).toBe(false);
  });

  test('only fee_status=free is free', () => {
    expect(free).toMatchObject({ isFree: true, feePending: false });
    expect(courseStatusPill(free)).toEqual({ label: 'N/A', tone: 'muted' });
    expect(canPayCourse(free)).toBe(false);
  });

  test('without fee_status (older API) a zero total is pending, never free', () => {
    const legacy = normalizeCourse({ course_id: 25, total_fee: 0, balance: 0, installments: [] });
    expect(legacy).toMatchObject({ isFree: false, feePending: true });
    const priced = normalizeCourse({ course_id: 16, total_fee: 25000, balance: 25000, installments: [] });
    expect(priced).toMatchObject({ isFree: false, feePending: false });
  });

  test('scheduled courses keep their numbers, status and Pay Now', () => {
    expect(scheduled).toMatchObject({ totalFee: 10000, amountPaid: 5000, balance: 5000, paidCount: 1, pendingCount: 1, percentPaid: 50 });
    expect(scheduled.nextDue?.details).toBe('Installment 1');
    expect(courseStatusPill(scheduled)).toEqual({ label: 'On Track', tone: 'success' });
    expect(canPayCourse(scheduled)).toBe(true);
    expect(courseStatusPill(cleared)).toEqual({ label: 'Cleared', tone: 'success' });
    expect(canPayCourse(cleared)).toBe(false);
    expect(courseStatusPill({ ...scheduled, status: 'Overdue' })).toEqual({ label: 'Overdue', tone: 'danger' });
  });
});

describe('course tabs', () => {
  const all = [scheduled, pending, free, cleared];
  const ids = (tab: Parameters<typeof filterAccounts>[1], q = '') => filterAccounts(all, tab, q).map((a) => a.courseId);

  test('a pending course is a paid course, but neither active nor completed', () => {
    expect(ids('all')).toEqual(['16', '25', '30', '18']);
    expect(ids('paid')).toEqual(['16', '25', '18']);
    expect(ids('free')).toEqual(['30']);
    expect(ids('active')).toEqual(['16']);
    expect(ids('completed')).toEqual(['30', '18']);
  });

  test('search matches the title', () => {
    expect(ids('all', '  diploma ')).toEqual(['16', '18']);
  });
});
