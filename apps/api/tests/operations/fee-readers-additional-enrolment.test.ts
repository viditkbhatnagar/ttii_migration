import { describe, expect, test } from 'vitest';

import type { PrismaClient } from '@prisma/client';

// The admin fee views must list an ADDITIONAL enrolment's per-enrolment plan
// (TTII 2026-10-16). Its course often has no price of its own (course 25:
// sale_price 0, total_amount NULL) — the plan lives only in student_payments —
// so where no price resolves, the views bill what the schedule says. Courses
// that DO resolve a price keep their numbers.

const { OperationsService } = await import('../../src/operations/operations-service.js');

const EMPTY_MODEL = {
  findMany: () => Promise.resolve([]),
  findFirst: () => Promise.resolve(null),
  count: () => Promise.resolve(0),
  groupBy: () => Promise.resolve([]),
};

/** A Prisma stand-in: configured models answer, every other model is empty. */
function fakePrisma(models: Record<string, unknown>): PrismaClient {
  return new Proxy({}, { get: (_t, key) => (typeof key === 'string' && key in models ? models[key] : EMPTY_MODEL) }) as unknown as PrismaClient;
}

const day = (s: string): Date => new Date(`${s}T00:00:00.000Z`);

describe('Fee Installments: expected fee per enrolment', () => {
  test("a priced course is no longer marked fully added by another course's plan", async () => {
    const service = new OperationsService(fakePrisma({
      student_payments: {
        groupBy: () => Promise.resolve([
          { user_id: 228, course_id: 16, _sum: { amount: 15000 } },
          { user_id: 228, course_id: 25, _sum: { amount: 10000 } },
          { user_id: 353, course_id: 25, _sum: { amount: 8000 } },
        ]),
        findMany: () => Promise.resolve([{ id: 1, user_id: 228, installment_details: 'Registration Fee' }, { id: 2, user_id: 353, installment_details: 'Course Fee' }]),
      },
      users: { findMany: () => Promise.resolve([{ id: 228, name: 'VIDHYA SHANKAR KS', student_id: 'TTS0052', phone: '1' }, { id: 353, name: 'Ansy Mol V K', student_id: 'TTS0090', phone: '2' }]) },
      enrol: {
        findMany: () => Promise.resolve([
          { user_id: 228, course_id: 16, discount_perc: null },
          { user_id: 228, course_id: 25, discount_perc: null },
          { user_id: 353, course_id: 25, discount_perc: null },
        ]),
      },
      course: { findMany: () => Promise.resolve([{ id: 16, title: 'Diploma', total_amount: 25000 }, { id: 25, title: 'AI Educator', total_amount: null }]) },
    }));

    const res = await service.listFeeInstallments({});
    const items = res.items as Array<Record<string, unknown>>;
    // 15,000 of 25,000 on course 16 + the full 10,000 plan on course 25.
    expect(items.find((i) => i.user_id === 228)).toMatchObject({ total_fee: 35000, installments_added: 25000, fee_plan_status: 'partially_added' });
    // A student whose only course has no price: the plan IS the fee.
    expect(items.find((i) => i.user_id === 353)).toMatchObject({ total_fee: 8000, installments_added: 8000, fee_plan_status: 'fully_added' });
    expect(res.counts).toEqual({ fully_added: 1, partially_added: 1, not_added: 0 });
  });
});

describe('Fee Summary: per enrolment', () => {
  test('an unpriced enrolment shows its schedule; a package-priced one keeps the package fee', async () => {
    const service = new OperationsService(fakePrisma({
      enrol: {
        findMany: () => Promise.resolve([
          { id: 253, user_id: 228, course_id: 25, enrollment_id: 'TIDMTT26100228', enrollment_status: 'Active', package_id: null },
          { id: 252, user_id: 228, course_id: 16, enrollment_id: 'TIDMTT26060228', enrollment_status: 'Active', package_id: null },
        ]),
      },
      users: { findMany: () => Promise.resolve([{ id: 228, name: 'VIDHYA SHANKAR KS', student_id: 'TTS0052', user_email: 'vidhya@example.com', email: null }]) },
      course: { findMany: () => Promise.resolve([{ id: 25, title: 'AI Educator' }, { id: 16, title: 'Diploma' }]) },
      applications: { findMany: () => Promise.resolve([{ id: 100, user_email: 'vidhya@example.com', course_id: 16, offering_id: 60, certificate_combination_id: 1 }]) },
      offerings: { findMany: () => Promise.resolve([{ id: 60, title: 'Diploma - May 2026', offering_code: null, offered_fee: null, base_fee: null, pricing_amount: null }]) },
      offering_certificate_packages: {
        findMany: () => Promise.resolve([{ offering_id: 60, combination_id: 1, fee_category: 'paid', base_fee: 25000, discount: 0, offered_fee: null, registration_fee: null, gst_percent: 18 }]),
      },
      $queryRaw: () => Promise.resolve([
        { user_id: 228, course_id: 25, total: 10000, paid: 4000, overdue: 0 },
        { user_id: 228, course_id: 16, total: 29500, paid: 29500, overdue: 0 },
      ]),
    }));

    const rows = await service.listFeeSummary();
    expect(rows.find((r) => r.enrol_id === 253)).toMatchObject({ course_fee_inc_gst: 10000, fee_paid: 4000, balance_fee: 6000 });
    expect(rows.find((r) => r.enrol_id === 252)).toMatchObject({ course_fee_inc_gst: 29500, fee_paid: 29500, balance_fee: 0 });
  });
});

describe('View Student: Fee Summary rows and the original course', () => {
  test("the added course is priced by its own plan; the original keeps its offering fee", async () => {
    const service = new OperationsService(fakePrisma({
      users: {
        findFirst: () => Promise.resolve({
          id: 228, role_id: 2, name: 'VIDHYA SHANKAR KS', user_email: 'vidhya@example.com', application_id: 100, student_id: 'TTS0052',
          gender: '', image: '', profile_picture: '', status: 1, dob: null, phone: '1', course_id: 16, disabled_at: null,
        }),
      },
      enrol: {
        findMany: () => Promise.resolve([
          { id: 252, user_id: 228, course_id: 16, batch_id: null, enrollment_id: 'TIDMTT26060228', discount_perc: null, enrollment_status: 'Active' },
          { id: 253, user_id: 228, course_id: 25, batch_id: null, enrollment_id: 'TIDMTT26100228', discount_perc: null, enrollment_status: 'Active' },
        ]),
      },
      applications: {
        findFirst: () => Promise.resolve({ id: 100, course_id: 16, offering_id: 60, certificate_combination_id: 1, stage: 'enrolled', is_converted: 1, payment_plan: null }),
      },
      course: { findMany: () => Promise.resolve([{ id: 16, title: 'Diploma', total_amount: 25000, fee_structure: null }, { id: 25, title: 'AI Educator', total_amount: null, fee_structure: null }]) },
      offerings: { findFirst: () => Promise.resolve({ id: 60, title: 'Diploma - May 2026', offering_code: null, course_id: 16, base_fee: null, discount: null, offered_fee: null }) },
      offering_certificate_packages: {
        findMany: () => Promise.resolve([{ combination_id: 1, fee_category: 'paid', base_fee: 25000, discount: 0, offered_fee: null, gst_percent: 18, registration_fee: null }]),
      },
      certificate_combinations: { findFirst: () => Promise.resolve({ id: 1, combination_code: 'TTII' }) },
      $queryRaw: () => Promise.resolve([
        { id: 1, user_id: 228, course_id: 16, installment_details: 'Course Fee', amount: 29500, payment_mode: 'UPI', payment_to: 'ttii', status: 'Paid', due_date: day('2026-06-01'), paid_date: day('2026-06-01') },
        { id: 2, user_id: 228, course_id: 25, installment_details: 'Installment 1', amount: 4000, payment_mode: 'UPI', payment_to: 'ttii', status: 'Paid', due_date: day('2026-10-20'), paid_date: day('2026-10-20') },
        { id: 3, user_id: 228, course_id: 25, installment_details: 'Installment 2', amount: 6000, payment_mode: null, payment_to: 'ttii', status: 'Pending', due_date: day('2026-11-20'), paid_date: null },
      ]),
    }));

    const res = await service.getStudentDetail('228');
    expect((res.student as Record<string, unknown>).application_course_id).toBe(16);
    const fees = res.studentFees as Array<Record<string, unknown>>;
    expect(fees.find((f) => f.enrol_id === 252)).toMatchObject({
      course_id: 16, fee_source: 'offering', offering_title: 'Diploma - May 2026', combination_title: 'TTII',
      base_fee: 25000, gst_percent: 18, course_fee_inc_gst: 29500, paid_amount: 29500, pending_amount: 0,
    });
    expect(fees.find((f) => f.enrol_id === 253)).toMatchObject({
      course_id: 25, fee_source: 'schedule', offering_title: null, combination_title: null,
      course_fee_inc_gst: 10000, total_fee: 10000, paid_amount: 4000, pending_amount: 6000,
    });
  });
});
