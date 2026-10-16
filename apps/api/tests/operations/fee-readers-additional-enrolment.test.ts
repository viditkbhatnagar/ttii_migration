import { describe, expect, test } from 'vitest';

import type { PrismaClient } from '@prisma/client';

// The admin fee views must list an enrolment's own plan (TTII 2026-10-16).
// The application-wide plan governs only the course of the application
// users.application_id names, and only while that plan has a schedule; every
// other enrolment is billed by its own student_payments schedule — exactly as
// the student portal shows it — and a fully paid schedule below the AGREED fee
// (application_final_fee; never a list price) is a balance still to be
// scheduled, never "cleared".

const { OperationsService } = await import('../../src/operations/operations-service.js');
const { agreedPayableByCourse, agreedPayableByStudentCourse } = await import('../../src/operations/enrolment-fee-data.js');

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
const SCHEDULED_PLAN = JSON.stringify({ mode: 'installment', installments: [{ label: 'Registration Fee', amountMinor: 500000 }] });
const LEDGER_ONLY = JSON.stringify({ instalment_payments: [{ index: 0, status: 'approved', amount_minor: 1888000 }] });

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
  function summaryService(opts: {
    originalPlan: string | null;
    applicationId: number;
    schedule: Array<{ user_id: number; course_id: number; total: number; paid: number; overdue: number }>;
    /** application_final_fee on the course-16 application (the agreed payable). */
    agreedFee?: number | null;
    /** Extra applications the agreed-fee lookup sees (newest first). */
    extraApps?: Array<Record<string, unknown>>;
  }) {
    return new OperationsService(fakePrisma({
      enrol: {
        findMany: () => Promise.resolve([
          { id: 253, user_id: 228, course_id: 25, enrollment_id: 'TIDMTT26100228', enrollment_status: 'Active', package_id: null },
          { id: 252, user_id: 228, course_id: 16, enrollment_id: 'TIDMTT26060228', enrollment_status: 'Active', package_id: null },
        ]),
      },
      users: { findMany: () => Promise.resolve([{ id: 228, name: 'VIDHYA SHANKAR KS', student_id: 'TTS0052', user_email: 'vidhya@example.com', email: null, application_id: opts.applicationId }]) },
      course: { findMany: () => Promise.resolve([{ id: 25, title: 'AI Educator' }, { id: 16, title: 'Diploma' }]) },
      applications: {
        // By id: the users.application_id rows. OR: the agreed-fee lookup.
        // By email + course: the offering match.
        findMany: ({ where }: { where: { id?: unknown; OR?: unknown } }) => Promise.resolve(where.id
          ? [{ id: 100, course_id: 16, payment_plan: opts.originalPlan }]
          : where.OR
            ? [
                ...(opts.extraApps ?? []),
                { id: 300, course_id: 25, student_id: 228, user_email: 'vidhya@example.com', stage: 'enrolled', is_converted: 1, application_final_fee: null },
                { id: 100, course_id: 16, student_id: 228, user_email: 'vidhya@example.com', stage: 'enrolled', is_converted: 1, application_final_fee: opts.agreedFee ?? null },
              ]
            : [
                { id: 300, user_email: 'vidhya@example.com', course_id: 25, offering_id: 70, certificate_combination_id: 4 },
                { id: 100, user_email: 'vidhya@example.com', course_id: 16, offering_id: 60, certificate_combination_id: 1 },
              ]),
      },
      offerings: {
        findMany: () => Promise.resolve([
          { id: 60, title: 'Diploma - May 2026', offering_code: null, offered_fee: null, base_fee: null, pricing_amount: null },
          { id: 70, title: 'AI Educator - Oct 2026', offering_code: null, offered_fee: null, base_fee: null, pricing_amount: null },
        ]),
      },
      offering_certificate_packages: {
        findMany: () => Promise.resolve([
          { offering_id: 60, combination_id: 1, fee_category: 'paid', base_fee: 25000, discount: 0, offered_fee: null, registration_fee: null, gst_percent: 18 },
          { offering_id: 70, combination_id: 4, fee_category: 'paid', base_fee: 2999, discount: null, offered_fee: 2999, registration_fee: null, gst_percent: 18 },
        ]),
      },
      $queryRaw: () => Promise.resolve(opts.schedule),
    }));
  }

  test("an enrolment on its own plan is billed by its schedule, even when its offering has a price", async () => {
    const service = summaryService({
      originalPlan: SCHEDULED_PLAN,
      applicationId: 100,
      schedule: [
        { user_id: 228, course_id: 25, total: 3200, paid: 1000, overdue: 0 },
        { user_id: 228, course_id: 16, total: 29500, paid: 29500, overdue: 0 },
      ],
    });
    const rows = await service.listFeeSummary();
    // Course 25's package says 3,539 but its own plan says 3,200: the plan wins.
    expect(rows.find((r) => r.enrol_id === 253)).toMatchObject({ course_fee_inc_gst: 3200, fee_paid: 1000, balance_fee: 2200 });
    // The original course keeps its package fee (its application plan has a schedule).
    expect(rows.find((r) => r.enrol_id === 252)).toMatchObject({ course_fee_inc_gst: 29500, fee_paid: 29500, balance_fee: 0 });
  });

  test('a fully paid own-plan schedule: no balance from the package list price, a balance only from an agreed fee', async () => {
    // Jayasree's shape: the original plan holds only a recorded payment.
    const settled = [{ user_id: 228, course_id: 16, total: 18880, paid: 18880, overdue: 0 }];
    const listPriceOnly = await summaryService({ originalPlan: LEDGER_ONLY, applicationId: 100, schedule: settled }).listFeeSummary();
    expect(listPriceOnly.find((r) => r.enrol_id === 252)).toMatchObject({ course_fee_inc_gst: 18880, fee_paid: 18880, balance_fee: 0 });

    const agreed = await summaryService({ originalPlan: LEDGER_ONLY, applicationId: 100, schedule: settled, agreedFee: 29500 }).listFeeSummary();
    expect(agreed.find((r) => r.enrol_id === 252)).toMatchObject({ course_fee_inc_gst: 29500, fee_paid: 18880, balance_fee: 10620 });
  });

  test("a newer application that is not the student's enrolment never sets the agreed fee", async () => {
    // A fresh lead under the same email for the same course, not enrolled and
    // not linked: the student portal ignores it, so the Fee Summary must too.
    const rows = await summaryService({
      originalPlan: LEDGER_ONLY,
      applicationId: 100,
      schedule: [{ user_id: 228, course_id: 16, total: 18880, paid: 18880, overdue: 0 }],
      extraApps: [{ id: 640, course_id: 16, student_id: null, user_email: 'vidhya@example.com', stage: 'form_submitted', is_converted: 0, application_final_fee: 29500 }],
    }).listFeeSummary();
    expect(rows.find((r) => r.enrol_id === 252)).toMatchObject({ course_fee_inc_gst: 18880, fee_paid: 18880, balance_fee: 0 });
  });
});

describe('the agreed fee is read from the same application on every screen', () => {
  // A minimal where-evaluator for the two lookups (field equality, `in`, OR).
  function matches(row: Record<string, unknown>, where: Record<string, unknown>): boolean {
    return Object.entries(where).every(([key, cond]) => {
      if (key === 'OR') return (cond as Array<Record<string, unknown>>).some((w) => matches(row, w));
      if (cond !== null && typeof cond === 'object' && 'in' in cond) return (cond as { in: unknown[] }).in.includes(row[key]);
      return row[key] === cond;
    });
  }
  const app = (over: Record<string, unknown>): Record<string, unknown> => ({
    application_id: 'TTII26', offering_id: null, certificate_combination_id: null, payment_plan: null, payment_status: null,
    payment_link_url: null, payment_link_id: null, payment_link_expires_at: null, deleted_at: null, ...over,
  });
  const APPS = [
    // Course 16: linked (rank 0) beats a NEWER enrolled application found by email (rank 2) and a newer lead (never).
    app({ id: 640, course_id: 16, student_id: null, user_email: 'vidhya@example.com', stage: 'form_submitted', is_converted: 0, application_final_fee: 99999 }),
    app({ id: 500, course_id: 16, student_id: null, user_email: 'vidhya@example.com', stage: 'enrolled', is_converted: 1, application_final_fee: 29500 }),
    app({ id: 120, course_id: 16, student_id: 228, user_email: 'vidhya@example.com', stage: 'enrolled', is_converted: 1, application_final_fee: 18880 }),
    // Course 18: the users.application_id application (rank 1) beats one found by email.
    app({ id: 410, course_id: 18, student_id: null, user_email: 'vidhya@example.com', stage: 'enrolled', is_converted: 1, application_final_fee: 40000 }),
    app({ id: 100, course_id: 18, student_id: null, user_email: 'vidhya@example.com', stage: 'approval_waiting', is_converted: 0, application_final_fee: 35400 }),
    // Course 25: found by email only; the newest enrolled one.
    app({ id: 310, course_id: 25, student_id: null, user_email: 'vidhya@example.com', stage: 'enrolled', is_converted: 0, application_final_fee: 3539 }),
    app({ id: 300, course_id: 25, student_id: null, user_email: 'vidhya@example.com', stage: 'enrolled', is_converted: 1, application_final_fee: 3000 }),
    // Another student's applications.
    app({ id: 800, course_id: 25, student_id: 353, user_email: 'ansy@example.com', stage: 'enrolled', is_converted: 1, application_final_fee: 15000 }),
    app({ id: 801, course_id: 30, student_id: 353, user_email: 'ansy@example.com', stage: 'enrolled', is_converted: 1, application_final_fee: 0 }),
  ];
  const db = fakePrisma({
    applications: {
      findMany: ({ where }: { where: Record<string, unknown> }) => Promise.resolve(
        APPS.filter((a) => matches(a, where)).sort((a, b) => Number(b.id) - Number(a.id)),
      ),
    },
  });
  const VIDHYA = { id: 228, user_email: 'vidhya@example.com', application_id: 100 };
  const ANSY = { id: 353, user_email: 'ansy@example.com', application_id: 0 };

  test('the Fee Summary batch picks what the student portal and the plan tool pick', async () => {
    const courses = [16, 18, 25, 30];
    const batch = await agreedPayableByStudentCourse(db, [VIDHYA, ANSY], courses);
    expect(Object.fromEntries(batch)).toEqual({ '228:16': 18880, '228:18': 35400, '228:25': 3539, '353:25': 15000, '353:30': null });
    for (const student of [VIDHYA, ANSY]) {
      const single = await agreedPayableByCourse(db, student, courses);
      for (const c of courses) expect(batch.get(`${student.id}:${c}`) ?? null).toBe(single.get(c) ?? null);
    }
  });
});

describe('View Student: Fee Summary rows and the original course', () => {
  function detailService(opts: { applicationId: number; originalPlan: string | null; schedule: Array<Record<string, unknown>>; pricingApps?: Array<Record<string, unknown>> }) {
    return new OperationsService(fakePrisma({
      users: {
        findFirst: () => Promise.resolve({
          id: 228, role_id: 2, name: 'VIDHYA SHANKAR KS', user_email: 'vidhya@example.com', application_id: opts.applicationId, student_id: 'TTS0052',
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
        findFirst: () => Promise.resolve({ id: 100, course_id: 16, offering_id: 60, certificate_combination_id: 1, stage: 'enrolled', is_converted: 1, payment_plan: opts.originalPlan }),
        // loadCoursePricing (only for a settled own-plan course).
        findMany: () => Promise.resolve(opts.pricingApps ?? []),
      },
      course: { findMany: () => Promise.resolve([{ id: 16, title: 'Diploma', total_amount: 25000, fee_structure: null, sale_price: 25000 }, { id: 25, title: 'AI Educator', total_amount: null, fee_structure: null, sale_price: 0 }]) },
      offerings: {
        findFirst: () => Promise.resolve({ id: 60, title: 'Diploma - May 2026', offering_code: null, course_id: 16, base_fee: null, discount: null, offered_fee: null }),
        findMany: () => Promise.resolve([{ id: 60, course_id: 16, title: 'Diploma - May 2026', offering_code: null, fee_category: 'paid', base_fee: null, discount: null, offered_fee: null, pricing_amount: null }]),
      },
      offering_certificate_packages: {
        findMany: () => Promise.resolve([{ offering_id: 60, combination_id: 1, fee_category: 'paid', base_fee: 25000, discount: 0, offered_fee: null, gst_percent: 18, registration_fee: null }]),
      },
      certificate_combinations: {
        findFirst: () => Promise.resolve({ id: 1, combination_code: 'TTII' }),
        findMany: () => Promise.resolve([{ id: 1, gst_applicable: true, gst_percent: 18 }]),
      },
      $queryRaw: () => Promise.resolve(opts.schedule),
    }));
  }

  const COURSE_16_PAID = { id: 1, user_id: 228, course_id: 16, installment_details: 'Course Fee', amount: 29500, payment_mode: 'UPI', payment_to: 'ttii', status: 'Paid', due_date: day('2026-06-01'), paid_date: day('2026-06-01') };
  const COURSE_25_PLAN = [
    { id: 2, user_id: 228, course_id: 25, installment_details: 'Installment 1', amount: 4000, payment_mode: 'UPI', payment_to: 'ttii', status: 'Paid', due_date: day('2026-10-20'), paid_date: day('2026-10-20') },
    { id: 3, user_id: 228, course_id: 25, installment_details: 'Installment 2', amount: 6000, payment_mode: null, payment_to: 'ttii', status: 'Pending', due_date: day('2026-11-20'), paid_date: null },
  ];

  test('the added course is priced by its own plan; the original keeps its offering fee', async () => {
    const res = await detailService({ applicationId: 100, originalPlan: SCHEDULED_PLAN, schedule: [COURSE_16_PAID, ...COURSE_25_PLAN] }).getStudentDetail('228');
    const enrolments = res.enrolments as Array<Record<string, unknown>>;
    expect(enrolments.map((e) => [e.id, e.own_fee_plan])).toEqual([[252, false], [253, true]]);
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

  test('users.application_id = 0: the email-matched application never makes a course original', async () => {
    const res = await detailService({ applicationId: 0, originalPlan: SCHEDULED_PLAN, schedule: [COURSE_16_PAID, ...COURSE_25_PLAN] }).getStudentDetail('228');
    const enrolments = res.enrolments as Array<Record<string, unknown>>;
    expect(enrolments.map((e) => e.own_fee_plan)).toEqual([true, true]);
  });

  test("Jayasree's shape: a ledger-only original plan, fully paid, shows a balance only once an agreed fee exists", async () => {
    const jayasree = (agreedFee: number | null) => detailService({
      applicationId: 100,
      originalPlan: LEDGER_ONLY,
      schedule: [{ ...COURSE_16_PAID, amount: 18880 }],
      pricingApps: [{ id: 100, application_id: 'TTII260100', course_id: 16, student_id: 228, offering_id: 60, certificate_combination_id: 1, application_final_fee: agreedFee, payment_plan: LEDGER_ONLY, payment_status: 'paid', payment_link_url: null, payment_link_id: null, payment_link_expires_at: null }],
    }).getStudentDetail('228');

    // Production today: application_final_fee NULL — the package list price
    // (25,000 + 18%) is ignored and the schedule is the fee, as before.
    const before = await jayasree(null);
    expect((before.enrolments as Array<Record<string, unknown>>).find((e) => e.id === 252)?.own_fee_plan).toBe(true);
    expect((before.studentFees as Array<Record<string, unknown>>).find((f) => f.enrol_id === 252)).toMatchObject({
      fee_source: 'schedule', total_fee: 18880, paid_amount: 18880, pending_amount: 0,
    });

    // Once TTII records the agreed fee (a plan save does), the balance shows.
    const agreed = await jayasree(29500);
    expect((agreed.studentFees as Array<Record<string, unknown>>).find((f) => f.enrol_id === 252)).toMatchObject({
      fee_source: 'balance_pending', total_fee: 29500, paid_amount: 18880, pending_amount: 10620,
    });
  });
});

describe('Payment Status: Mark Paid', () => {
  test('marking a row that a new plan replaced reports failure instead of success', async () => {
    let updated = 0;
    const service = new OperationsService(fakePrisma({
      student_payments: { updateMany: () => Promise.resolve({ count: updated }) },
    }));
    expect(await service.markInstallmentPaid('1', '1002')).toEqual({
      status: 0,
      message: 'This instalment no longer exists (it may have been replaced by a new payment plan). Reload and record the payment against the current schedule.',
    });
    updated = 1;
    expect(await service.markInstallmentPaid('1', '1003')).toEqual({ status: 1, message: 'Installment marked as paid.' });
  });
});
