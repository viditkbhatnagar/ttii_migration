import { describe, expect, test, vi } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import { CommerceService } from '../../src/commerce/commerce-service.js';
import type { PaymentOrderRequest } from '../../src/integrations/contracts.js';

// Pay Now (GET /payment/create_order) resolves the amount SERVER-SIDE from the
// student's own student_payments schedule; course.sale_price applies only to a
// genuine full-payment course where the student has no schedule at all.
//
// TTII 2026-10-16 — money cases:
//   - an additional enrolment (course 25, sale_price 0) whose per-enrolment
//     plan was just generated must be charged its earliest-due instalment;
//   - a student whose rows for a course are ALL Paid used to fall through to
//     the full sale_price (Rs.25,000 on course 16) — a double charge. That is
//     refused, with "Balance to be scheduled by TTII" when the offering says
//     the course costs more than the schedule;
//   - the instalment picked may be replaced by a plan save while Razorpay
//     creates the order: it is re-checked before the order is recorded.

interface ScheduleRow { id: number; amount: number | null; status: string | null; paid: boolean; due: string | null }

function makeService(opts: {
  salePrice: number;
  rows: ScheduleRow[];
  /** Simulate a plan save replacing the picked row while Razorpay works. */
  replacedDuringCheckout?: boolean;
  /** The offering package of the student's own application for the course. */
  packageFee?: { base: number; gst: number } | null;
}) {
  const gatewayOrders: PaymentOrderRequest[] = [];
  const createdOrders: Array<Record<string, unknown>> = [];

  // Models the reads createOrder makes against student_payments.
  const nextPayable = (): Array<{ id: number; amount: number | null }> => opts.rows
    .filter((r) => !r.paid && (r.status ?? '').trim().toLowerCase() !== 'paid' && r.amount != null && r.amount >= 1)
    .sort((a, b) => (a.due ?? '').localeCompare(b.due ?? '') || a.id - b.id)
    .slice(0, 1)
    .map((r) => ({ id: r.id, amount: r.amount }));

  const prisma = {
    course: {
      findFirst: () => Promise.resolve({ id: 25, sale_price: opts.salePrice, title: 'Certification in AI - Early Childhood Educator' }),
      findMany: () => Promise.resolve([{ id: 25, title: 'AI Educator', total_amount: null, sale_price: opts.salePrice }]),
    },
    users: {
      findFirst: ({ select }: { select: Record<string, boolean> }) => Promise.resolve(
        select.application_id
          ? { id: 353, application_id: 0, user_email: 'ansy@example.com' }
          : { name: 'Ansy', student_id: 'TTS0090', user_email: 'ansy@example.com', phone: '9800000000', whatsapp: null },
      ),
    },
    $queryRaw: (strings: TemplateStringsArray) => {
      const text = strings.join('?');
      // The re-check right before the order is recorded.
      if (text.includes('WHERE id =')) return Promise.resolve(opts.replacedDuringCheckout ? [] : nextPayable().map((r) => ({ id: r.id })));
      return Promise.resolve(nextPayable());
    },
    student_payments: {
      count: ({ where }: { where: { amount?: { gte?: number } } }) => Promise.resolve(
        opts.rows.filter((r) => r.amount != null && r.amount >= (where.amount?.gte ?? Number.NEGATIVE_INFINITY)).length,
      ),
      aggregate: () => Promise.resolve({ _sum: { amount: opts.rows.reduce((sum, r) => sum + (r.amount ?? 0), 0) } }),
    },
    applications: {
      findFirst: () => Promise.resolve(null),
      findMany: () => Promise.resolve(opts.packageFee
        ? [{ id: 300, application_id: 'TTII260300', course_id: 25, student_id: 353, offering_id: 70, certificate_combination_id: 4, application_final_fee: null, payment_plan: null, payment_status: null, payment_link_url: null, payment_link_id: null, payment_link_expires_at: null }]
        : []),
    },
    offerings: { findMany: () => Promise.resolve(opts.packageFee ? [{ id: 70, course_id: 25, title: 'AI Educator', offering_code: null, fee_category: 'paid', base_fee: null, discount: null, offered_fee: null, pricing_amount: null }] : []) },
    offering_certificate_packages: {
      findMany: () => Promise.resolve(opts.packageFee
        ? [{ offering_id: 70, combination_id: 4, fee_category: 'paid', base_fee: opts.packageFee.base, discount: null, offered_fee: opts.packageFee.base, gst_percent: opts.packageFee.gst }]
        : []),
    },
    course_fees: { findMany: () => Promise.resolve([]) },
    certificate_combinations: { findMany: () => Promise.resolve([]) },
    create_order: {
      create: ({ data }: { data: Record<string, unknown> }) => { createdOrders.push(data); return Promise.resolve({ id: 1 }); },
    },
  } as unknown as PrismaClient;

  const payment = {
    name: 'fake',
    createOrder: (input: PaymentOrderRequest) => {
      gatewayOrders.push(input);
      return Promise.resolve({ orderId: 'order_fake1', amountMinor: input.amountMinor, currency: input.currency, providerPayload: {} });
    },
    verifyPaymentSignature: () => true,
    verifyWebhookSignature: () => true,
  };

  const service = new CommerceService({ prisma, integrations: { payment } as never });
  return { service, gatewayOrders, createdOrders };
}

const ORDER = { courseId: '25', receipt: 'r1', currency: 'INR' };

describe('createOrder against a student fee schedule', () => {
  test('an additional enrolment is charged its earliest-due pending instalment, never sale_price', async () => {
    const { service, gatewayOrders, createdOrders } = makeService({
      salePrice: 0,
      rows: [
        { id: 901, amount: 5000, status: 'Pending', paid: false, due: '2026-11-10' },
        { id: 900, amount: 5000, status: 'Pending', paid: false, due: '2026-10-20' },
      ],
    });
    const order = await service.createOrder('228', ORDER);
    expect(order.amount).toBe(500000);
    expect(gatewayOrders[0]?.amountMinor).toBe(500000);
    // The order remembers which instalment it pays, so completion marks exactly that row.
    expect(createdOrders[0]?.notes).toBe(JSON.stringify({ sp_id: 900 }));
  });

  test('an instalment replaced while Razorpay created the order is caught before the order is recorded', async () => {
    const { service, createdOrders } = makeService({
      salePrice: 0,
      rows: [{ id: 900, amount: 5000, status: 'Pending', paid: false, due: '2026-10-20' }],
      replacedDuringCheckout: true,
    });
    await expect(service.createOrder('228', ORDER)).rejects.toThrow('Your fee schedule was just updated. Please refresh the page and try again.');
    expect(createdOrders).toHaveLength(0);
  });

  test('a student whose rows are all Paid is refused instead of being offered the full sale_price', async () => {
    const { service, gatewayOrders, createdOrders } = makeService({
      salePrice: 25000,
      rows: [{ id: 950, amount: 2999, status: 'Paid', paid: true, due: null }],
    });
    await expect(service.createOrder('353', ORDER)).rejects.toThrow('All instalments for this course are already paid.');
    expect(gatewayOrders).toHaveLength(0);
    expect(createdOrders).toHaveLength(0);
  });

  test('...and told the balance is to be scheduled when the offering fee is larger than the schedule', async () => {
    const { service, gatewayOrders } = makeService({
      salePrice: 25000,
      rows: [{ id: 950, amount: 2999, status: 'Paid', paid: true, due: null }],
      packageFee: { base: 2999, gst: 18 }, // payable 3,539
    });
    await expect(service.createOrder('353', ORDER)).rejects.toThrow('Balance to be scheduled by TTII. You can pay it here once your instalments are set up.');
    expect(gatewayOrders).toHaveLength(0);
  });

  test('normal full-payment checkout is unchanged: no schedule at all charges sale_price', async () => {
    const { service, gatewayOrders, createdOrders } = makeService({ salePrice: 25000, rows: [] });
    const order = await service.createOrder('353', ORDER);
    expect(order.amount).toBe(2500000);
    expect(gatewayOrders[0]?.amountMinor).toBe(2500000);
    expect(createdOrders[0]?.notes).toBe(JSON.stringify({}));
  });

  test('a schedule of only Rs.0 rows still behaves as before (sale_price, or the existing refusal)', async () => {
    const zeroRows = [{ id: 1, amount: 0, status: 'Pending', paid: false, due: null }];
    const withPrice = makeService({ salePrice: 25000, rows: zeroRows });
    expect((await withPrice.service.createOrder('353', ORDER)).amount).toBe(2500000);
    const noPrice = makeService({ salePrice: 0, rows: zeroRows });
    await expect(noPrice.service.createOrder('353', ORDER)).rejects.toThrow('No pending installment found to pay for this course.');
  });
});

// The payment landed but the instalment it was raised for is no longer
// payable (replaced by a plan save, paid by a second checkout on the same row,
// or a late webhook on an old order). The money must be credited somewhere or
// reported — never dropped silently.
describe('recording a payment whose instalment is no longer payable', () => {
  function makeCompletion(opts: { candidate: number | null }) {
    const executes: string[] = [];
    const events: Array<Record<string, unknown>> = [];
    const tx = {
      create_order: { updateMany: () => Promise.resolve({ count: 1 }) },
      payment_info: { count: () => Promise.resolve(0), create: () => Promise.resolve({ id: 1 }) },
      enrol: { count: () => Promise.resolve(1), create: () => Promise.resolve({ id: 1 }) },
      // First UPDATE: the order's own row (gone); second: the credited row.
      $executeRaw: (strings: TemplateStringsArray, ...values: unknown[]) => {
        executes.push(`${strings.join('?')} | ${values.join(',')}`);
        return Promise.resolve(executes.length === 1 ? 0 : 1);
      },
      $queryRaw: () => Promise.resolve(opts.candidate === null ? [] : [{ id: opts.candidate }]),
    };
    const prisma = {
      $transaction: (fn: (t: typeof tx) => Promise<boolean>) => fn(tx),
      create_order: {
        findFirst: () => Promise.resolve({ order_id: 'order_X', user_id: 228, course_id: 25, amount: 5500, order_status: 'pending', notes: JSON.stringify({ sp_id: 1002 }) }),
      },
      course: { findFirst: () => Promise.resolve({ sale_price: 0 }) },
      users: {
        findFirst: ({ select }: { select?: Record<string, boolean> }) => Promise.resolve(
          select?.application_id && !select.user_email ? { application_id: 100 } : { id: 228, user_email: 's@example.com', email: null, phone: '1', application_id: 100 },
        ),
      },
      application_events: { create: ({ data }: { data: Record<string, unknown> }) => { events.push(data); return Promise.resolve({ id: 1 }); } },
    } as unknown as PrismaClient;
    return { service: new CommerceService({ prisma }), executes, events };
  }

  test('credits the earliest unpaid live row of the same amount', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { service, executes, events } = makeCompletion({ candidate: 1005 });
    expect((await service.reconcileWebhookOrderPayment('order_X', 'pay_X')).reconciled).toBe(true);
    expect(executes).toHaveLength(2);
    expect(executes[1]).toContain('1005');
    expect(events).toHaveLength(0);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('credited instalment 1005'));
    warn.mockRestore();
  });

  test('with no matching row it is reported as unreconciled, on the log and the application timeline', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { service, executes, events } = makeCompletion({ candidate: null });
    expect((await service.reconcileWebhookOrderPayment('order_X', 'pay_X')).reconciled).toBe(true);
    expect(executes).toHaveLength(1);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('UNRECONCILED PAYMENT for user 228'));
    expect(events).toEqual([expect.objectContaining({ application_id: 100, event_type: 'payment_unreconciled', actor_user_id: 228 })]);
    expect(String(events[0]?.description)).toContain('Rs.5500 (order order_X, payment pay_X)');
    error.mockRestore();
  });
});
