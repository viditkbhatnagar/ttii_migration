import { describe, expect, test } from 'vitest';

import {
  NO_MONEY_ELSEWHERE,
  agreedPayableOf,
  checkoutRowIdsFromNotes,
  classifyScheduleRow,
  computePayable,
  dueDateWindow,
  feeWithScheduleFallback,
  isFreeByPricing,
  isPaidRow,
  istToday,
  ownPlanFee,
  pickPricingPackage,
  planBlockReason,
  planHasSchedule,
  resolveFeePrefill,
  studentCourseFeeStatus,
  usesOwnFeePlan,
  validateEnrolmentPlan,
  ymdToUtcMidnight,
  type OfferingPricing,
  type PackagePricing,
  type PlanInput,
  type ScheduleRow,
} from '../../src/operations/enrolment-fee-model.js';

const TODAY = '2026-10-16';
const validate = (input: PlanInput, kept: ReadonlyArray<{ amount: number }>) => validateEnrolmentPlan(input, kept, TODAY);

const row = (over: Partial<ScheduleRow>): ScheduleRow => ({
  id: 1, label: 'Installment 1', amount: 5000, status: 'Pending', dueDate: '2026-11-01', paidDate: '',
  paymentMode: '', referenceNumber: '', receiptUrl: '', ...over,
});

const pkg = (over: Partial<PackagePricing>): PackagePricing => ({
  combination_id: 1, fee_category: 'paid', base_fee: 20000, discount: 0, offered_fee: null, gst_percent: 18, ...over,
});

const offering = (over: Partial<OfferingPricing>): OfferingPricing => ({
  id: 70, course_id: 25, title: 'AI Educator - Oct 2026', fee_category: 'paid', base_fee: null, discount: null,
  offered_fee: null, pricing_amount: null, packages: [], ...over,
});

describe('payable total (same composition as the application plan dialog)', () => {
  test('GST is added on top of the fee after discount, rounded once to whole rupees', () => {
    expect(computePayable(25000, 0, 18)).toMatchObject({ afterDiscount: 25000, gstAmount: 4500, payable: 29500 });
    expect(computePayable(2999, 0, 18)).toMatchObject({ gstAmount: 539.82, payable: 3539 });
    expect(computePayable(30000, 5000, 0)).toMatchObject({ afterDiscount: 25000, payable: 25000 });
  });

  test('invalid inputs are refused with a reason', () => {
    expect(computePayable(0, 0, 0)).toEqual({ error: 'Enter the total fee.' });
    expect(computePayable(Number.NaN, 0, 0)).toEqual({ error: 'Enter the total fee.' });
    expect(computePayable(1000, 1500, 0)).toEqual({ error: 'The discount cannot be more than the total fee.' });
    expect(computePayable(1000, -1, 0)).toEqual({ error: 'The discount cannot be negative.' });
    expect(computePayable(1000, 0, 101)).toEqual({ error: 'GST must be between 0 and 100%.' });
    expect(computePayable(1000, 1000, 0)).toEqual({ error: 'The payable total must be at least ₹1.' });
  });
});

describe('which schedule rows a plan save must keep', () => {
  test('paid by status (any case) or by a paid date', () => {
    expect(isPaidRow({ status: ' PAID ', paidDate: '' })).toBe(true);
    expect(isPaidRow({ status: 'Pending', paidDate: '2026-10-01' })).toBe(true);
    expect(isPaidRow({ status: 'Pending', paidDate: '' })).toBe(false);
  });

  test('only a Pending row with no payment against it is replaceable', () => {
    const checkout = new Set([4]);
    expect(classifyScheduleRow(row({ id: 1, status: 'Paid' }), checkout)).toMatchObject({ locked: true, lockReason: 'paid' });
    expect(classifyScheduleRow(row({ id: 2, referenceNumber: 'UTR9' }), checkout)).toMatchObject({ locked: true, lockReason: 'payment_recorded' });
    expect(classifyScheduleRow(row({ id: 3, receiptUrl: 'uploads/r.pdf' }), checkout)).toMatchObject({ lockReason: 'payment_recorded' });
    // A counsellor's Add Enrolment cash collection: Pending, mode set, waiting for Finance.
    expect(classifyScheduleRow(row({ id: 7, paymentMode: 'Cash' }), checkout)).toMatchObject({ locked: true, lockReason: 'payment_recorded' });
    expect(classifyScheduleRow(row({ id: 4 }), checkout)).toMatchObject({ locked: true, lockReason: 'checkout' });
    expect(classifyScheduleRow(row({ id: 5, status: 'Waived' }), checkout)).toMatchObject({ locked: true, lockReason: 'status' });
    for (const status of ['Pending', 'pending', 'Overdue', 'Due', '']) {
      expect(classifyScheduleRow(row({ id: 6, status }), checkout)).toMatchObject({ locked: false, lockReason: null });
    }
  });

  test('checkout notes name the instalment they pay; legacy notes name none', () => {
    expect([...checkoutRowIdsFromNotes(['{"sp_id":637}', '{"status":"created"}', 'not json', null, '{"sp_id":"12"}', '{"sp_id":0}'])]).toEqual([637, 12]);
  });
});

describe('validating a per-enrolment plan', () => {
  const base = { totalFee: 10000, discount: 0, gstPercent: 0 };

  test('full payment: one row for the whole payable total, labelled Course Fee by default', () => {
    const v = validate({ ...base, mode: 'full', rows: [{ label: '  ', amount: 10000, dueDate: '2026-11-01' }] }, []);
    expect(v).toMatchObject({ ok: true, remaining: 10000, keptTotal: 0 });
    if (!v.ok) throw new Error('expected ok');
    expect(v.rows).toEqual([{ label: 'Course Fee', amount: 10000, dueDate: new Date(Date.UTC(2026, 10, 1)) }]);
  });

  test('kept (paid) rows count toward the total; the new rows cover only the rest', () => {
    const kept = [{ amount: 2000 }];
    const v = validate({
      ...base,
      mode: 'installment',
      rows: [
        { label: 'Installment 2', amount: 4000, dueDate: '2026-11-01' },
        { label: 'Installment 3', amount: 4000, dueDate: '2026-12-01' },
      ],
    }, kept);
    expect(v).toMatchObject({ ok: true, keptTotal: 2000, remaining: 8000 });
  });

  test('totals that do not add up to the rupee are refused', () => {
    const v = validate({ ...base, mode: 'installment', rows: [{ label: 'A', amount: 4000, dueDate: '2026-11-01' }, { label: 'B', amount: 5999, dueDate: '2026-12-01' }] }, []);
    expect(v).toEqual({ ok: false, message: 'The rows add up to ₹9,999 but ₹10,000 is left to schedule (payable ₹10,000).' });
    const withKept = validate({ ...base, mode: 'full', rows: [{ label: '', amount: 8001, dueDate: '2026-11-01' }] }, [{ amount: 2000 }]);
    expect(withKept).toEqual({ ok: false, message: 'The rows add up to ₹8,001 but ₹8,000 is left to schedule (payable ₹10,000 after ₹2,000 already kept).' });
  });

  test('kept rows above the new total are refused', () => {
    expect(validate({ ...base, mode: 'full', rows: [] }, [{ amount: 12000 }])).toEqual({
      ok: false, message: 'The instalments that must be kept already total ₹12,000, more than the payable ₹10,000.',
    });
  });

  test('when the kept rows already cover the total, no new rows are allowed', () => {
    expect(validate({ ...base, mode: 'full', rows: [] }, [{ amount: 10000 }])).toMatchObject({ ok: true, remaining: 0, rows: [] });
    expect(validate({ ...base, mode: 'full', rows: [{ label: '', amount: 1, dueDate: '2026-11-01' }] }, [{ amount: 10000 }])).toMatchObject({ ok: false });
  });

  test('amounts are whole rupees of at least 1; due dates must be real calendar dates', () => {
    expect(validate({ ...base, mode: 'full', rows: [{ label: '', amount: 9999.5, dueDate: '2026-11-01' }] }, [])).toEqual({
      ok: false, message: 'Row 1: the amount must be a whole number of rupees, at least ₹1.',
    });
    expect(validate({ ...base, mode: 'installment', rows: [{ label: '', amount: 10000, dueDate: '2026-02-30' }] }, [])).toEqual({
      ok: false, message: 'Row 1: enter a valid due date.',
    });
    expect(validate({ ...base, mode: 'installment', rows: [{ label: '', amount: 10000, dueDate: '01/11/2026' }] }, [])).toMatchObject({ ok: false });
    expect(validate({ ...base, mode: 'installment', rows: [{ label: '', amount: 0, dueDate: '2026-11-01' }, { label: '', amount: 10000, dueDate: '2026-11-01' }] }, [])).toMatchObject({ ok: false });
  });

  test('shape limits: full payment is one row, at most 24 instalments, rows are required', () => {
    expect(validate({ ...base, mode: 'full', rows: [{ label: '', amount: 5000, dueDate: '2026-11-01' }, { label: '', amount: 5000, dueDate: '2026-12-01' }] }, [])).toEqual({
      ok: false, message: 'Full payment has exactly one row.',
    });
    const many = Array.from({ length: 25 }, () => ({ label: '', amount: 400, dueDate: '2026-11-01' }));
    expect(validate({ ...base, mode: 'installment', rows: many }, [])).toEqual({ ok: false, message: 'A plan can have at most 24 instalments.' });
    expect(validate({ ...base, mode: 'installment', rows: [] }, [])).toEqual({ ok: false, message: 'Add the instalments for the remaining ₹10,000.' });
  });

  test('labels are trimmed, capped at 200 characters and default to Installment N', () => {
    const v = validate({
      ...base,
      mode: 'installment',
      rows: [{ label: ` ${'x'.repeat(250)} `, amount: 5000, dueDate: '2026-11-01' }, { label: '', amount: 5000, dueDate: '2026-12-01' }],
    }, []);
    if (!v.ok) throw new Error(v.message);
    expect(v.rows.map((r) => r.label.length)).toEqual([200, 'Installment 2'.length]);
    expect(v.rows[1]?.label).toBe('Installment 2');
  });

  test('ymdToUtcMidnight never shifts the day', () => {
    expect(ymdToUtcMidnight('2026-03-31')?.toISOString()).toBe('2026-03-31T00:00:00.000Z');
    expect(ymdToUtcMidnight('2026-13-01')).toBeNull();
    expect(ymdToUtcMidnight('0000-00-00')).toBeNull();
  });
});

describe('pricing and the free signal', () => {
  test('package pick: paid first, the held combination first, else the first package', () => {
    const free = pkg({ combination_id: 1, fee_category: 'free', base_fee: 0 });
    const paidA = pkg({ combination_id: 2, base_fee: 20000 });
    const paidB = pkg({ combination_id: 3, base_fee: 25000 });
    expect(pickPricingPackage([free, paidA, paidB], 3)).toBe(paidB);
    expect(pickPricingPackage([free, paidA, paidB], 1)).toBe(paidA);
    expect(pickPricingPackage([free, paidA, paidB], null)).toBe(paidA);
    expect(pickPricingPackage([free], null)).toBe(free);
    expect(pickPricingPackage([], 1)).toBeNull();
  });

  test('a course is free only on a free offering package, never on a zero price alone', () => {
    const freeOffering = offering({ packages: [pkg({ combination_id: 1, fee_category: 'free' })] });
    const paidOffering = offering({ id: 71, packages: [pkg({ combination_id: 1 })] });
    expect(isFreeByPricing({ enrolmentOffering: freeOffering, combinationId: 1, courseOfferings: [] })).toBe(true);
    expect(isFreeByPricing({ enrolmentOffering: paidOffering, combinationId: 1, courseOfferings: [] })).toBe(false);
    // The held combination decides; with no match, every package must be free.
    const mixed = offering({ packages: [pkg({ combination_id: 1, fee_category: 'free' }), pkg({ combination_id: 2 })] });
    expect(isFreeByPricing({ enrolmentOffering: mixed, combinationId: 1, courseOfferings: [] })).toBe(true);
    expect(isFreeByPricing({ enrolmentOffering: mixed, combinationId: 9, courseOfferings: [] })).toBe(false);
    // An offering without packages uses its own fee category.
    expect(isFreeByPricing({ enrolmentOffering: offering({ fee_category: 'free' }), combinationId: null, courseOfferings: [] })).toBe(true);
    // No offering chosen: every offering of the course must be free.
    expect(isFreeByPricing({ enrolmentOffering: null, combinationId: null, courseOfferings: [freeOffering] })).toBe(true);
    expect(isFreeByPricing({ enrolmentOffering: null, combinationId: null, courseOfferings: [freeOffering, paidOffering] })).toBe(false);
    // A course with no offerings at all is NOT free (course 25: price 0, no fee yet).
    expect(isFreeByPricing({ enrolmentOffering: null, combinationId: null, courseOfferings: [] })).toBe(false);
  });

  test('student fee state: schedule, then a legacy price, then free only on the real signal, else pending', () => {
    expect(studentCourseFeeStatus(10000, 0, true)).toBe('scheduled');
    expect(studentCourseFeeStatus(0, 30000, false)).toBe('priced');
    expect(studentCourseFeeStatus(0, 0, true)).toBe('free');
    expect(studentCourseFeeStatus(0, 0, false)).toBe('pending');
  });

  test('admin fee views fall back to the schedule only when no price resolves', () => {
    expect(feeWithScheduleFallback(29500, 10000)).toEqual({ fee: 29500, fromSchedule: false });
    expect(feeWithScheduleFallback(0, 10000)).toEqual({ fee: 10000, fromSchedule: true });
    expect(feeWithScheduleFallback(0, 0)).toEqual({ fee: 0, fromSchedule: false });
  });
});

describe('prefill from the course offering or fee structure', () => {
  const none = { enrolmentOffering: null, combinationId: null, combinationGst: null, courseOfferings: [], courseFee: null, course: null };

  test("the enrolment's own offering package wins", () => {
    const own = offering({ packages: [pkg({ combination_id: 4, base_fee: 20000, discount: 2000, gst_percent: 18 })] });
    expect(resolveFeePrefill({ ...none, enrolmentOffering: own, combinationId: 4 })).toEqual({
      totalFee: 20000, discount: 2000, gstPercent: 18, source: 'offering', sourceLabel: 'the course offering "AI Educator - Oct 2026"',
    });
    // offered_fee below base becomes the discount, like the plan dialog.
    const offered = offering({ packages: [pkg({ base_fee: 20000, discount: null, offered_fee: 17000, gst_percent: null })] });
    expect(resolveFeePrefill({ ...none, enrolmentOffering: offered })).toMatchObject({ totalFee: 20000, discount: 3000, gstPercent: 0 });
  });

  test("an offering without packages uses its own pricing and the combination's GST", () => {
    const scalar = offering({ base_fee: 15000, discount: 1000 });
    expect(resolveFeePrefill({ ...none, enrolmentOffering: scalar, combinationGst: 18 })).toMatchObject({ totalFee: 15000, discount: 1000, gstPercent: 18, source: 'offering' });
  });

  test("with no offering chosen, a course fee structure with ONE price is used; two prices are ambiguous", () => {
    const one = offering({ id: 80, packages: [pkg({ base_fee: 12000, gst_percent: 18 }), pkg({ combination_id: 2, base_fee: 12000, gst_percent: 18 })] });
    expect(resolveFeePrefill({ ...none, courseOfferings: [one] })).toEqual({
      totalFee: 12000, discount: 0, gstPercent: 18, source: 'fee_structure', sourceLabel: "the course's fee structure",
    });
    const two = offering({ id: 81, packages: [pkg({ base_fee: 15000 })] });
    expect(resolveFeePrefill({ ...none, courseOfferings: [one, two], courseFee: { base_fee: 9000, discount: 500 } })).toMatchObject({
      totalFee: 9000, discount: 500, source: 'course',
    });
  });

  test('a free offering prefills nothing from itself', () => {
    const freeOwn = offering({ packages: [pkg({ fee_category: 'free', base_fee: 0 })] });
    expect(resolveFeePrefill({ ...none, enrolmentOffering: freeOwn, courseOfferings: [freeOwn] })).toMatchObject({ totalFee: null, source: null });
  });

  test('legacy course price, then blank (course 25: price 0, total NULL)', () => {
    expect(resolveFeePrefill({ ...none, course: { total_amount: 30000, sale_price: 0 } })).toMatchObject({ totalFee: 30000, source: 'course' });
    expect(resolveFeePrefill({ ...none, course: { total_amount: null, sale_price: 25000 } })).toMatchObject({ totalFee: 25000, source: 'course' });
    expect(resolveFeePrefill({ ...none, course: { total_amount: null, sale_price: 0 } })).toEqual({
      totalFee: null, discount: 0, gstPercent: 0, source: null, sourceLabel: '',
    });
  });

  test('the agreed payable is the recorded final fee in whole rupees, else nothing', () => {
    expect(agreedPayableOf(15000)).toBe(15000);
    expect(agreedPayableOf(3538.82)).toBe(3539);
    expect(agreedPayableOf(null)).toBeNull();
    expect(agreedPayableOf(0)).toBeNull();
  });
});

describe('due dates', () => {
  test('a year back to three years ahead of today (IST), clamping 29 Feb', () => {
    expect(dueDateWindow('2026-10-16')).toEqual({ from: '2025-10-16', to: '2029-10-16' });
    expect(dueDateWindow('2028-02-29')).toEqual({ from: '2027-02-28', to: '2031-02-28' });
    // 20:00 UTC on 15 Oct is already 16 Oct in India.
    expect(istToday(new Date('2026-10-15T20:00:00.000Z'))).toBe('2026-10-16');
  });

  test('rows outside the window are refused', () => {
    const plan = (dueDate: string): PlanInput => ({ mode: 'full', totalFee: 1000, discount: 0, gstPercent: 0, rows: [{ label: '', amount: 1000, dueDate }] });
    expect(validate(plan('2025-10-16'), [])).toMatchObject({ ok: true });
    expect(validate(plan('2029-10-16'), [])).toMatchObject({ ok: true });
    expect(validate(plan('2025-10-15'), [])).toEqual({ ok: false, message: 'Row 1: the due date must be between 16/10/2025 and 16/10/2029.' });
    expect(validate(plan('2029-10-17'), [])).toMatchObject({ ok: false });
  });
});

describe('which plan governs an enrolment', () => {
  const INSTALMENT_PLAN = JSON.stringify({ mode: 'installment', installments: [{ label: 'Reg', amountMinor: 100000 }] });
  const LEDGER_ONLY = JSON.stringify({ instalment_payments: [{ index: 0, status: 'approved', amount_minor: 1888000 }] });

  test('a plan has a schedule when it holds instalments, full mode or a total', () => {
    expect(planHasSchedule(INSTALMENT_PLAN)).toBe(true);
    expect(planHasSchedule(JSON.stringify({ mode: 'full' }))).toBe(true);
    expect(planHasSchedule(JSON.stringify({ total_amount_minor: 100 }))).toBe(true);
    expect(planHasSchedule(LEDGER_ONLY)).toBe(false);
    expect(planHasSchedule(null)).toBe(false);
    expect(planHasSchedule('not json')).toBe(false);
    expect(planHasSchedule('42')).toBe(false);
  });

  test("only the users.application_id course with a scheduled plan keeps the application-wide plan", () => {
    const original = { course_id: 16, payment_plan: INSTALMENT_PLAN };
    expect(usesOwnFeePlan(16, original)).toBe(false);
    expect(usesOwnFeePlan(25, original)).toBe(true);
    // Jayasree S: her original course 16 holds only a recorded payment — plan it here.
    expect(usesOwnFeePlan(16, { course_id: 16, payment_plan: LEDGER_ONLY })).toBe(true);
    expect(usesOwnFeePlan(16, { course_id: 16, payment_plan: null })).toBe(true);
    // users.application_id = 0: no original course at all.
    expect(usesOwnFeePlan(16, null)).toBe(true);
  });

  test('a fully paid own-plan schedule below the AGREED payable leaves a balance to schedule', () => {
    expect(ownPlanFee({ scheduleTotal: 18880, paidTotal: 18880, agreedPayable: 23600 })).toEqual({ fee: 23600, balancePending: true });
    // Something is still scheduled and unpaid: the schedule is the fee.
    expect(ownPlanFee({ scheduleTotal: 20000, paidTotal: 18880, agreedPayable: 23600 })).toEqual({ fee: 20000, balancePending: false });
    expect(ownPlanFee({ scheduleTotal: 23600, paidTotal: 23600, agreedPayable: 23600 })).toEqual({ fee: 23600, balancePending: false });
  });

  test('the probe: a Rs.15,000 plan, fully paid, against a Rs.21,240 package (20,000 - 2,000 + 18%) shows NO balance without an agreed fee', () => {
    // The package list price is never an input; with no agreed fee the schedule is the fee.
    expect(ownPlanFee({ scheduleTotal: 15000, paidTotal: 15000, agreedPayable: null })).toEqual({ fee: 15000, balancePending: false });
    // An agreed fee equal to the plan (what a plan save records) shows none either.
    expect(ownPlanFee({ scheduleTotal: 15000, paidTotal: 15000, agreedPayable: agreedPayableOf(15000) })).toEqual({ fee: 15000, balancePending: false });
  });
});

describe('money recorded outside the schedule blocks a plan', () => {
  const money = (over: Partial<typeof NO_MONEY_ELSEWHERE>) => ({ ...NO_MONEY_ELSEWHERE, applicationCode: 'TTII260300', ...over });

  test('nothing elsewhere: no block', () => {
    expect(planBlockReason(NO_MONEY_ELSEWHERE, 0)).toBeNull();
  });

  test('an online checkout paid on the course price must be covered by Paid rows', () => {
    expect(planBlockReason(money({ online: 25000 }), 0)).toBe(
      'This student has already paid ₹25,000 online for this course, but the schedule shows ₹0 paid; record it as a Paid instalment first.',
    );
    expect(planBlockReason(money({ online: 25000 }), 25000)).toBeNull();
  });

  test('application money is compared by amount, not just existence; both sources add up', () => {
    expect(planBlockReason(money({ application: 15000 }), 5000)).toContain('₹15,000 on this enrolment\'s application (TTII260300)');
    expect(planBlockReason(money({ application: 15000, online: 5000 }), 15000)).toBe(
      "This student has already paid ₹5,000 online and ₹15,000 on this enrolment's application (TTII260300) for this course, but the schedule shows ₹15,000 paid; record it as a Paid instalment first.",
    );
    expect(planBlockReason(money({ application: 15000, online: 5000 }), 20000)).toBeNull();
    expect(planBlockReason(money({ applicationPaidUnknown: true }), 0)).toContain('is marked paid');
    expect(planBlockReason(money({ applicationPaidUnknown: true }), 100)).toBeNull();
  });

  test('a payment awaiting Finance or an open payment link blocks until it settles', () => {
    expect(planBlockReason(money({ pendingApproval: true }), 99999)).toContain('waiting for Finance approval');
    expect(planBlockReason(money({ linkOutstanding: true, linkExpiresOn: '2026-10-23' }), 99999)).toBe(
      "A payment link from this enrolment's application (TTII260300) can still be paid until 23/10/2026. Cancel the payment link first, or wait until it is paid (the payment is then recorded automatically) or has expired.",
    );
  });
});
