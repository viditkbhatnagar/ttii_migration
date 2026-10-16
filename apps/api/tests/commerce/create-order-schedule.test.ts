import { describe, expect, test } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import { CommerceService } from '../../src/commerce/commerce-service.js';
import type { PaymentOrderRequest } from '../../src/integrations/contracts.js';

// Pay Now (GET /payment/create_order) resolves the amount SERVER-SIDE from the
// student's own student_payments schedule; course.sale_price applies only to a
// genuine full-payment course where the student has no schedule at all.
//
// TTII 2026-10-16 — two money cases:
//   - an additional enrolment (course 25, sale_price 0) whose per-enrolment
//     plan was just generated must be charged its earliest-due instalment;
//   - a student whose rows for a course are ALL Paid (e.g. a registration
//     approved by Finance) used to fall through to the full sale_price
//     (Rs.25,000 on course 16) — a double charge. That is now refused.

interface ScheduleRow { id: number; amount: number | null; status: string | null; paid: boolean; due: string | null }

function makeService(opts: { salePrice: number; rows: ScheduleRow[] }) {
  const gatewayOrders: PaymentOrderRequest[] = [];
  const createdOrders: Array<Record<string, unknown>> = [];

  // Models the two reads createOrder makes against student_payments.
  const nextPayable = (): Array<{ id: number; amount: number | null }> => opts.rows
    .filter((r) => !r.paid && (r.status ?? '').trim().toLowerCase() !== 'paid' && r.amount != null && r.amount >= 1)
    .sort((a, b) => (a.due ?? '').localeCompare(b.due ?? '') || a.id - b.id)
    .slice(0, 1)
    .map((r) => ({ id: r.id, amount: r.amount }));

  const prisma = {
    course: { findFirst: () => Promise.resolve({ id: 25, sale_price: opts.salePrice, title: 'Certification in AI - Early Childhood Educator' }) },
    users: { findFirst: () => Promise.resolve({ name: 'Vidhya', student_id: 'TTS0052', user_email: 'v@example.com', phone: '9800000000', whatsapp: null }) },
    $queryRaw: () => Promise.resolve(nextPayable()),
    student_payments: {
      count: ({ where }: { where: { amount?: { gte?: number } } }) => Promise.resolve(
        opts.rows.filter((r) => r.amount != null && r.amount >= (where.amount?.gte ?? Number.NEGATIVE_INFINITY)).length,
      ),
    },
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

  test('a student whose rows are all Paid is refused instead of being offered the full sale_price', async () => {
    const { service, gatewayOrders, createdOrders } = makeService({
      salePrice: 25000,
      rows: [{ id: 950, amount: 2999, status: 'Paid', paid: true, due: null }],
    });
    await expect(service.createOrder('353', ORDER)).rejects.toThrow(/already paid/i);
    expect(gatewayOrders).toHaveLength(0);
    expect(createdOrders).toHaveLength(0);
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
