import { describe, expect, test } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import { CommerceService } from '../../src/commerce/commerce-service.js';

// TTII 2026-09-01 — "the payment status of enrolled students (Installment
// payment) has not been updated in the LMS despite the payments having been
// successfully made through the platform."
//
// A checkout payment was recorded ONLY by /payment/complete_order, which the
// student's BROWSER calls after paying. Close the tab, lose signal, or never
// get the redirect back and the money moved while nothing was written: the
// order stayed 'pending', no payment_info row was created and the instalment
// stayed unpaid. Production had 72 of 90 orders stuck like that, with students
// visibly retrying — one raised four orders in 31 minutes.
//
// The webhook is the authoritative path because it does not depend on the
// student's device. These tests pin the two things that matter for money:
// a stranded payment IS recorded, and nothing is EVER credited twice.

const ORDER_ID = 'order_TVYFlQqhaViaz6';
const PAYMENT_ID = 'pay_TVYFabc123';
const USER_ID = 314;
const COURSE_ID = 16;
const SP_ID = 637;

interface Recorder {
  paymentInfoCreates: Record<string, unknown>[];
  orderUpdates: number;
  rawUpdates: unknown[][];
  enrolCreates: number;
}

function makeService(opts: {
  orderStatus?: string;
  notes?: string | null;
  duplicatePayment?: boolean;
  orderMissing?: boolean;
} = {}): { service: CommerceService; rec: Recorder } {
  const rec: Recorder = { paymentInfoCreates: [], orderUpdates: 0, rawUpdates: [], enrolCreates: 0 };
  const orderStatus = opts.orderStatus ?? 'pending';

  const tx = {
    payment_info: {
      count: () => Promise.resolve(opts.duplicatePayment ? 1 : 0),
      create: ({ data }: { data: Record<string, unknown> }) => {
        rec.paymentInfoCreates.push(data);
        return Promise.resolve({ id: 1 });
      },
    },
    create_order: {
      updateMany: () => {
        // Mirrors the real guard: only a row still 'pending' is flipped.
        const count = orderStatus === 'pending' ? 1 : 0;
        rec.orderUpdates += count;
        return Promise.resolve({ count });
      },
    },
    enrol: {
      count: () => Promise.resolve(1),
      create: () => { rec.enrolCreates += 1; return Promise.resolve({ id: 1 }); },
    },
    $executeRaw: (...args: unknown[]) => { rec.rawUpdates.push(args); return Promise.resolve(1); },
  };

  const prisma = {
    $transaction: (fn: (t: typeof tx) => Promise<boolean>) => fn(tx),
    create_order: {
      findFirst: () => Promise.resolve(
        opts.orderMissing
          ? null
          : {
              order_id: ORDER_ID,
              user_id: USER_ID,
              course_id: COURSE_ID,
              amount: 4000,
              order_status: orderStatus,
              notes: opts.notes === undefined ? JSON.stringify({ sp_id: SP_ID }) : opts.notes,
            },
      ),
    },
    course: { findFirst: () => Promise.resolve({ sale_price: 0 }) },
    users: {
      findFirst: () => Promise.resolve({
        id: USER_ID, user_email: 'student@example.com', email: null, phone: '9800000000',
      }),
    },
  } as unknown as PrismaClient;

  return { service: new CommerceService({ prisma }), rec };
}

describe('reconciling a Razorpay payment from the webhook', () => {
  test('records a payment the browser never reported back', async () => {
    const { service, rec } = makeService();

    const result = await service.reconcileWebhookOrderPayment(ORDER_ID, PAYMENT_ID);

    expect(result.reconciled).toBe(true);
    expect(result.reason).toBe('recorded');
    // The ledger row the student was missing.
    expect(rec.paymentInfoCreates).toHaveLength(1);
    expect(rec.paymentInfoCreates[0]?.razorpay_payment_id).toBe(PAYMENT_ID);
    expect(rec.paymentInfoCreates[0]?.razorpay_order_id).toBe(ORDER_ID);
    // The order is closed out...
    expect(rec.orderUpdates).toBe(1);
    // ...and the specific instalment is marked paid.
    expect(rec.rawUpdates).toHaveLength(1);
  });

  test('an order already completed is left alone — no double credit', async () => {
    const { service, rec } = makeService({ orderStatus: 'completed' });

    const result = await service.reconcileWebhookOrderPayment(ORDER_ID, PAYMENT_ID);

    expect(result.reconciled).toBe(false);
    expect(result.reason).toBe('already_recorded');
    // Nothing written at all. Razorpay retries for hours, so this path runs often.
    expect(rec.paymentInfoCreates).toHaveLength(0);
    expect(rec.rawUpdates).toHaveLength(0);
  });

  test('a payment id already in the ledger is not written twice', async () => {
    // The browser callback won the race; the webhook must not duplicate it.
    const { service, rec } = makeService({ duplicatePayment: true });

    const result = await service.reconcileWebhookOrderPayment(ORDER_ID, PAYMENT_ID);

    expect(result.reconciled).toBe(false);
    expect(rec.paymentInfoCreates).toHaveLength(0);
    expect(rec.rawUpdates).toHaveLength(0);
  });

  test('a full-payment order does not touch the instalment ledger', async () => {
    const { service, rec } = makeService({ notes: JSON.stringify({ status: 'created' }) });

    const result = await service.reconcileWebhookOrderPayment(ORDER_ID, PAYMENT_ID);

    expect(result.reconciled).toBe(true);
    expect(rec.paymentInfoCreates).toHaveLength(1);
    // No sp_id → nothing in student_payments may be marked.
    expect(rec.rawUpdates).toHaveLength(0);
  });

  test('legacy non-JSON notes are tolerated rather than throwing', async () => {
    const { service, rec } = makeService({ notes: 'not json at all' });

    const result = await service.reconcileWebhookOrderPayment(ORDER_ID, PAYMENT_ID);

    expect(result.reconciled).toBe(true);
    expect(rec.rawUpdates).toHaveLength(0);
  });

  test('an unknown order is reported, not invented', async () => {
    const { service, rec } = makeService({ orderMissing: true });

    const result = await service.reconcileWebhookOrderPayment(ORDER_ID, PAYMENT_ID);

    expect(result.reconciled).toBe(false);
    expect(result.reason).toBe('order_not_found');
    expect(rec.paymentInfoCreates).toHaveLength(0);
  });

  test('missing ids are refused before any lookup', async () => {
    const { service, rec } = makeService();

    expect((await service.reconcileWebhookOrderPayment('', PAYMENT_ID)).reason).toBe('missing_ids');
    expect((await service.reconcileWebhookOrderPayment(ORDER_ID, '')).reason).toBe('missing_ids');
    expect(rec.paymentInfoCreates).toHaveLength(0);
  });
});

describe('reading the ids out of a Razorpay webhook', () => {
  test('order.paid nests the order alongside the payment', async () => {
    const { extractRazorpayOrderPayment } = await import('../../src/routes/commerce.js');

    expect(extractRazorpayOrderPayment({
      event: 'order.paid',
      payload: {
        order: { entity: { id: ORDER_ID } },
        payment: { entity: { id: PAYMENT_ID, order_id: ORDER_ID } },
      },
    })).toEqual({ orderId: ORDER_ID, paymentId: PAYMENT_ID });
  });

  test('payment.captured has no order node — the order id comes off the payment', async () => {
    const { extractRazorpayOrderPayment } = await import('../../src/routes/commerce.js');

    // Getting this shape wrong is the difference between the fix working and
    // it silently doing nothing, which is how we got here.
    expect(extractRazorpayOrderPayment({
      event: 'payment.captured',
      payload: { payment: { entity: { id: PAYMENT_ID, order_id: ORDER_ID } } },
    })).toEqual({ orderId: ORDER_ID, paymentId: PAYMENT_ID });
  });

  test('a malformed or empty payload yields empty ids rather than throwing', async () => {
    const { extractRazorpayOrderPayment } = await import('../../src/routes/commerce.js');

    expect(extractRazorpayOrderPayment({})).toEqual({ orderId: '', paymentId: '' });
    expect(extractRazorpayOrderPayment({ payload: { payment: {} } })).toEqual({ orderId: '', paymentId: '' });
    // Non-string ids must not be coerced into junk.
    expect(extractRazorpayOrderPayment({
      payload: { payment: { entity: { id: 12345, order_id: null } } },
    })).toEqual({ orderId: '', paymentId: '' });
  });
});
