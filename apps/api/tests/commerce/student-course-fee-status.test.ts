import { afterEach, describe, expect, test, vi } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import { CommerceService } from '../../src/commerce/commerce-service.js';

// GET /payment/get_student_courses feeds the web Payments page and the mobile
// app. TTII 2026-10-16: VIDHYA SHANKAR KS's added course 25 (sale_price 0,
// total_amount NULL, no fee rows yet) showed "Free / No Payment Required"
// because the page called any course with a zero total free.
//
// course.is_free_course is not a usable signal — the admin course form saves
// it as 1 on every course — so the API now reports `fee_status` from the real
// signal (a free offering package) and `is_free` as an int for the app:
//   scheduled — the student's own schedule (unchanged numbers)
//   priced    — a legacy course total (unchanged numbers)
//   free      — a free offering
//   pending   — a paid course whose fee is not set up yet

interface Sp { course_id: number; amount: number; status: string; due_date: Date | null }

function makeService(opts: { failPricing?: boolean } = {}) {
  const pricingCalls: string[] = [];
  const schedule: Sp[] = [
    { course_id: 16, amount: 5000, status: 'Paid', due_date: new Date('2026-07-01T00:00:00.000Z') },
    { course_id: 16, amount: 5000, status: 'Pending', due_date: new Date('2026-12-01T00:00:00.000Z') },
  ];
  const prisma = {
    enrol: {
      findMany: () => Promise.resolve([
        { id: 252, user_id: 228, course_id: 16, discount_perc: null, created_at: new Date('2026-06-01T00:00:00.000Z') },
        { id: 253, user_id: 228, course_id: 25, discount_perc: null, created_at: new Date('2026-10-10T00:00:00.000Z') },
        { id: 254, user_id: 228, course_id: 30, discount_perc: null, created_at: new Date('2026-10-11T00:00:00.000Z') },
        { id: 255, user_id: 228, course_id: 18, discount_perc: '10', created_at: new Date('2026-10-12T00:00:00.000Z') },
      ]),
    },
    course: {
      findMany: () => Promise.resolve([
        { id: 16, title: 'Diploma in Montessori Teacher Training', total_amount: 25000 },
        { id: 25, title: 'Certification in Ai - Early Childhood Educator', total_amount: null },
        { id: 30, title: 'Free Orientation', total_amount: null },
        { id: 18, title: 'PG Diploma', total_amount: 30000 },
      ]),
    },
    users: { findFirst: () => Promise.resolve({ id: 228, application_id: 100, user_email: 'vidhya@example.com' }) },
    // Both schedule reads pass (user, course, ...) as their first values.
    $queryRaw: (_s: TemplateStringsArray, ...values: unknown[]) => Promise.resolve(
      schedule
        .filter((r) => r.course_id === Number(values[1]))
        .map((r, i) => ({ id: i + 1, installment_details: `Row ${i + 1}`, amount: r.amount, payment_mode: null, payment_to: null, status: r.status, due_date: r.due_date, paid_date: null })),
    ),
    applications: {
      findMany: () => {
        pricingCalls.push('applications');
        if (opts.failPricing) return Promise.reject(new Error('db down'));
        return Promise.resolve([
          { id: 400, application_id: 'TTII260400', course_id: 30, student_id: 228, offering_id: 90, certificate_combination_id: 1, application_final_fee: null, payment_plan: null, payment_status: null, payment_link_url: null },
        ]);
      },
    },
    offerings: {
      findMany: () => Promise.resolve([
        { id: 90, course_id: 30, title: 'Orientation', offering_code: null, fee_category: 'free', base_fee: null, discount: null, offered_fee: null, pricing_amount: null },
      ]),
    },
    offering_certificate_packages: { findMany: () => Promise.resolve([]) },
  } as unknown as PrismaClient;
  return { service: new CommerceService({ prisma, integrations: { payment: {} } as never }), pricingCalls };
}

afterEach(() => { vi.restoreAllMocks(); });

describe('student course fee state', () => {
  test('free only on a free offering; a paid course with no fee yet is pending, not free', async () => {
    const { service } = makeService();
    const rows = await service.getStudentCourses('228');
    const byCourse = new Map(rows.map((r) => [Number(r.course_id), r]));

    expect(byCourse.get(16)).toMatchObject({ fee_status: 'scheduled', is_free: 0, total_fee: 10000, amount_paid: 5000, balance: 5000 });
    expect(byCourse.get(25)).toMatchObject({ fee_status: 'pending', is_free: 0, total_fee: 0, amount_paid: 0, balance: 0, installments: [] });
    expect(byCourse.get(30)).toMatchObject({ fee_status: 'free', is_free: 1, total_fee: 0, balance: 0 });
    // Legacy course total with the enrolment discount — numbers unchanged.
    expect(byCourse.get(18)).toMatchObject({ fee_status: 'priced', is_free: 0, total_fee: 27000, balance: 27000 });
  });

  test('the existing fields keep their shape for the mobile app', async () => {
    const { service } = makeService();
    const [first] = await service.getStudentCourses('228');
    expect(Object.keys(first ?? {}).sort()).toEqual([
      'amount_paid', 'balance', 'course_id', 'enroled_on', 'fee_status', 'id', 'installments', 'is_free',
      'payment_percentage', 'status', 'title', 'total_fee', 'user_id',
    ]);
  });

  // A course on its own plan (Jayasree S's original application holds only her
  // approved payment) whose schedule is fully paid. The package below is a LIST
  // price (20,000 - 2,000 + 18% = 21,240) and must never create a balance; only
  // an agreed fee (application_final_fee) can.
  async function settledOwnPlan(opts: { paid: number; agreedFee: number | null }) {
    const ledgerOnly = JSON.stringify({ instalment_payments: [{ index: 0, status: 'approved', amount_minor: opts.paid * 100 }] });
    const prisma = {
      enrol: { findMany: () => Promise.resolve([{ id: 260, user_id: 187, course_id: 16, discount_perc: null, created_at: new Date('2026-07-12T00:00:00.000Z') }]) },
      course: { findMany: () => Promise.resolve([{ id: 16, title: 'Diploma in Montessori Teacher Training', total_amount: null, sale_price: 25000 }]) },
      users: { findFirst: () => Promise.resolve({ id: 187, application_id: 187, user_email: 'jayasree@example.com' }) },
      $queryRaw: () => Promise.resolve([{ id: 1, installment_details: 'Course Fee', amount: opts.paid, payment_mode: 'UPI', payment_to: 'ttii', status: 'Paid', due_date: null, paid_date: new Date('2026-07-11T00:00:00.000Z') }]),
      applications: {
        findFirst: () => Promise.resolve({ id: 187, course_id: 16, payment_plan: ledgerOnly }),
        findMany: () => Promise.resolve([{ id: 187, application_id: 'TTII260187', course_id: 16, student_id: 187, offering_id: 17, certificate_combination_id: 2, application_final_fee: opts.agreedFee, payment_plan: ledgerOnly, payment_status: 'paid', payment_link_url: null, payment_link_id: null, payment_link_expires_at: null }]),
      },
      offerings: { findMany: () => Promise.resolve([{ id: 17, course_id: 16, title: 'Diploma - Jul 2026', offering_code: null, fee_category: 'paid', base_fee: null, discount: null, offered_fee: null, pricing_amount: null }]) },
      offering_certificate_packages: { findMany: () => Promise.resolve([{ offering_id: 17, combination_id: 2, fee_category: 'paid', base_fee: 20000, discount: 2000, offered_fee: null, gst_percent: 18 }]) },
      course_fees: { findMany: () => Promise.resolve([]) },
      certificate_combinations: { findMany: () => Promise.resolve([]) },
    } as unknown as PrismaClient;
    const [row] = await new CommerceService({ prisma, integrations: { payment: {} } as never }).getStudentCourses('187');
    return row;
  }

  test('with no agreed fee (production: application_final_fee NULL) a fully paid schedule reads as before', async () => {
    expect(await settledOwnPlan({ paid: 18880, agreedFee: null })).toMatchObject({
      course_id: 16, fee_status: 'scheduled', total_fee: 18880, amount_paid: 18880, balance: 0, status: 'completed',
    });
  });

  test('the probe: a Rs.15,000 plan fully paid against a Rs.21,240 package shows no phantom balance', async () => {
    expect(await settledOwnPlan({ paid: 15000, agreedFee: null })).toMatchObject({ fee_status: 'scheduled', total_fee: 15000, balance: 0 });
    expect(await settledOwnPlan({ paid: 15000, agreedFee: 15000 })).toMatchObject({ fee_status: 'scheduled', total_fee: 15000, balance: 0 });
  });

  test('an agreed fee above the paid schedule reads "balance to be scheduled", never cleared', async () => {
    expect(await settledOwnPlan({ paid: 18880, agreedFee: 23600 })).toMatchObject({
      course_id: 16, fee_status: 'balance_pending', is_free: 0,
      total_fee: 23600, amount_paid: 18880, balance: 4720, status: 'Pending', payment_percentage: 80,
    });
  });

  test('if the free lookup fails, zero-fee courses show as pending — never as free', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { service } = makeService({ failPricing: true });
    const rows = await service.getStudentCourses('228');
    expect(rows.find((r) => Number(r.course_id) === 30)).toMatchObject({ fee_status: 'pending', is_free: 0 });
    expect(rows.find((r) => Number(r.course_id) === 16)).toMatchObject({ fee_status: 'scheduled' });
  });
});
