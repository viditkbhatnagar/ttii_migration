import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { PaymentGateway, PaymentLinkState } from '../../src/integrations/contracts.js';
import { MockPaymentGateway, RazorpayPaymentGateway } from '../../src/integrations/payment-gateway.js';
import { EnrolmentFeePlanService } from '../../src/operations/enrolment-fee-plan-service.js';
import { OperationsService } from '../../src/operations/operations-service.js';
import { makeFakePrisma, type FakeApp, type World } from './enrolled-payments-fake.js';

// TTII 2026-10-17 — SANEESA C N's plan could not be saved while her 13-Oct Add
// Enrolment link was open, the reason was scrolled out of view, and Add
// Instalment was used instead while the full-fee link could still be paid (a
// double charge). Links can now be cancelled from the enrolment (checked at
// Razorpay first), and Add Instalment refuses while a link is open.

const NOW = new Date('2026-10-17T06:00:00.000Z');
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const OPEN_LINK_MESSAGE = "A payment link from this enrolment's application (TTII267661) can still be paid until 20/10/2026. Cancel the payment link first, or wait until it is paid (the payment is then recorded automatically) or has expired.";

const app = (over: Partial<FakeApp> = {}): FakeApp => ({
  id: 332,
  application_id: 'TTII267661',
  course_id: 25,
  student_id: null,
  user_email: 'saneesa@example.com',
  stage: 'enrolled',
  is_converted: 1,
  offering_id: null,
  certificate_combination_id: null,
  application_final_fee: 3536,
  payment_plan: JSON.stringify({ mode: 'full', total_amount_minor: 353600, installments: [] }),
  payment_status: null,
  payment_method: 'razorpay',
  payment_link_url: 'https://rzp.io/l/ttii332',
  payment_link_id: 'plink_332',
  payment_link_expires_at: new Date('2026-10-20T06:00:00.000Z'),
  deleted_at: null,
  ...over,
});

const world = (apps: FakeApp[] = [app()]): World => ({
  users: [
    { id: 1, role_id: 1, name: 'Admin', email: 'admin@example.com', user_email: 'admin@example.com', application_id: 0, deleted_at: null },
    { id: 154, role_id: 2, name: 'SANEESA C N', email: null, user_email: 'saneesa@example.com', application_id: 90, deleted_at: null },
  ],
  enrols: [{ id: 251, user_id: 154, course_id: 25, enrollment_id: 'TIDMTT26100154', deleted_at: null }],
  apps,
  rows: [],
});

const linkState = (over: Partial<PaymentLinkState> = {}): PaymentLinkState => ({
  paymentLinkId: 'plink_332', status: 'created', amountMinor: 353600, amountPaidMinor: 0, paymentCount: 0, ...over,
});

function gatewayWith(state: PaymentLinkState, cancelled: PaymentLinkState | Error = linkState({ status: 'cancelled' })) {
  const fetchPaymentLink = vi.fn<(id: string) => Promise<PaymentLinkState>>(() => Promise.resolve(state));
  const cancelPaymentLink = vi.fn<(id: string) => Promise<PaymentLinkState>>(() => (cancelled instanceof Error ? Promise.reject(cancelled) : Promise.resolve(cancelled)));
  const gateway = { name: 'test', fetchPaymentLink, cancelPaymentLink } as unknown as PaymentGateway;
  return { gateway, fetchPaymentLink, cancelPaymentLink };
}

function planService(w: World, gateway: PaymentGateway) {
  const fake = makeFakePrisma(w);
  return { ...fake, service: new EnrolmentFeePlanService(fake.prisma, () => Promise.resolve(gateway)) };
}

describe('Cancel payment link (admin, per enrolment)', () => {
  test('an open, unpaid link is cancelled at Razorpay, closed here and logged once', async () => {
    const w = world();
    const g = gatewayWith(linkState());
    const t = planService(w, g.gateway);
    const res = await t.service.cancelPaymentLink('1', '251');
    expect(res).toMatchObject({ status: 1, message: 'Payment link on TTII267661 cancelled.', data: { cancelled_now: true } });
    expect(g.fetchPaymentLink).toHaveBeenCalledWith('plink_332');
    expect(g.cancelPaymentLink).toHaveBeenCalledWith('plink_332');
    expect(w.apps[0]).toMatchObject({ payment_link_expires_at: NOW, updated_by: 1 });
    expect(t.calls.events).toEqual([expect.objectContaining({
      application_id: 332, event_type: 'payment_link_cancelled', actor_user_id: 1, actor_role_id: 1,
    })]);
    expect(JSON.parse(String(t.calls.events[0]?.metadata))).toMatchObject({ link_id: 'plink_332', enrol_id: 251, course_id: 25 });

    // The plan tool now reads the link as closed.
    const plan = (await t.service.getPlan('251')).data as Record<string, unknown>;
    expect(plan.money).toMatchObject({ link_outstanding: false });
    expect(plan.block_reason).toBeNull();
  });

  test.each([
    ['paid', linkState({ status: 'paid', amountPaidMinor: 353600, paymentCount: 1 })],
    ['partly paid', linkState({ status: 'partially_paid', amountPaidMinor: 100000 })],
    ['a listed payment', linkState({ paymentCount: 1 })],
  ])('a link with any payment (%s) is refused and nothing changes', async (_label, state) => {
    const w = world();
    const g = gatewayWith(state);
    const t = planService(w, g.gateway);
    const res = await t.service.cancelPaymentLink('1', '251');
    expect(res).toEqual({ status: 0, message: 'The payment link on TTII267661 has already been paid; the payment will be recorded automatically. Nothing was cancelled.' });
    expect(g.cancelPaymentLink).not.toHaveBeenCalled();
    expect(w.apps[0]?.payment_link_expires_at).toEqual(new Date('2026-10-20T06:00:00.000Z'));
    expect(t.calls.events).toEqual([]);
  });

  test('idempotent: a link already cancelled or expired is success with no new event', async () => {
    // Already closed here too (as TTII's 17-Oct cancellations left them).
    const closed = world([app({ payment_link_expires_at: new Date('2026-10-17T05:00:00.000Z') })]);
    const g1 = gatewayWith(linkState({ status: 'cancelled' }));
    const t1 = planService(closed, g1.gateway);
    expect(await t1.service.cancelPaymentLink('1', '251')).toMatchObject({ status: 1, data: { link_status: 'cancelled', cancelled_now: false } });
    expect(g1.cancelPaymentLink).not.toHaveBeenCalled();
    expect(t1.calls.appWrites).toEqual([]);
    expect(t1.calls.events).toEqual([]);

    // Cancelled at Razorpay but still open here: closed here, still no event.
    const open = world();
    const g2 = gatewayWith(linkState({ status: 'expired' }));
    const t2 = planService(open, g2.gateway);
    expect(await t2.service.cancelPaymentLink('1', '251')).toMatchObject({ status: 1, message: 'The payment link on TTII267661 is already expired.' });
    expect(open.apps[0]?.payment_link_expires_at).toEqual(NOW);
    expect(t2.calls.events).toEqual([]);
  });

  test('Razorpay refusing or not confirming the cancel changes nothing here', async () => {
    const w1 = world();
    const t1 = planService(w1, gatewayWith(linkState(), new Error('Razorpay cancel payment link failed (400): {"error":{"description":"paid"}}')).gateway);
    const res1 = await t1.service.cancelPaymentLink('1', '251');
    expect(res1.status).toBe(0);
    expect(String(res1.message)).toContain('Razorpay did not cancel the payment link');
    expect(w1.apps[0]?.payment_link_expires_at).toEqual(new Date('2026-10-20T06:00:00.000Z'));

    const w2 = world();
    const t2 = planService(w2, gatewayWith(linkState(), linkState({ status: 'created' })).gateway);
    expect((await t2.service.cancelPaymentLink('1', '251')).status).toBe(0);
    expect(w2.apps[0]?.payment_link_expires_at).toEqual(new Date('2026-10-20T06:00:00.000Z'));
    expect(t2.calls.events).toEqual([]);
  });

  test('no link, an unknown enrolment or no user is refused', async () => {
    const t = planService(world([app({ payment_link_id: null, payment_link_url: null })]), gatewayWith(linkState()).gateway);
    expect(await t.service.cancelPaymentLink('1', '251')).toEqual({ status: 0, message: "This enrolment's application has no payment link." });
    expect((await t.service.cancelPaymentLink('1', '999')).status).toBe(0);
    expect(await t.service.cancelPaymentLink('', '251')).toEqual({ status: 0, message: 'Invalid user.' });
  });
});

describe('Add Instalment refuses while the course\'s application has an open link', () => {
  function opsService(w: World) {
    const fake = makeFakePrisma(w);
    return { ...fake, service: new OperationsService(fake.prisma) };
  }

  test('refused with the plan tool\'s message, whatever the status; nothing written', async () => {
    const w = world();
    const t = opsService(w);
    for (const status of ['Pending', 'Paid']) {
      const res = await t.service.addInstallment('1', { userId: '154', courseId: '25', amount: '1000', status, paymentMode: 'Cash' });
      expect(res).toEqual({
        status: 0, code: 'payment_link_open', message: OPEN_LINK_MESSAGE,
        data: { application_id: 332, application_code: 'TTII267661' },
      });
    }
    expect(w.rows).toEqual([]);
  });

  test('allowed once the link is cancelled (or paid, or expired)', async () => {
    const w = world([app({ payment_link_expires_at: NOW })]);
    const t = opsService(w);
    expect((await t.service.addInstallment('1', { userId: '154', courseId: '25', amount: '1000', status: 'Paid', paymentMode: 'Cash', paidDate: '2026-10-13' })).status).toBe(1);
    const paid = world([app({ payment_status: 'paid' })]);
    expect((await opsService(paid).service.addInstallment('1', { userId: '154', courseId: '25', amount: '2536' })).status).toBe(1);
  });

  test('a Pending row gets no default payment mode; a chosen one is kept', async () => {
    const w = world([app({ payment_link_id: null, payment_link_url: null })]);
    const t = opsService(w);
    await t.service.addInstallment('1', { userId: '154', courseId: '25', amount: '2536', status: 'Pending', paymentMode: '' });
    await t.service.addInstallment('1', { userId: '154', courseId: '25', amount: '1000', status: 'Paid', paymentMode: 'UPI', paidDate: '2026-10-13' });
    expect(w.rows.map((r) => [r.status, r.payment_mode])).toEqual([['Pending', null], ['Paid', 'UPI']]);
  });
});

describe('payment gateway: fetch and cancel a payment link', () => {
  const config = { apiKeyId: 'rzp_test_key', apiKeySecret: 'secret', webhookSecret: undefined, apiBaseUrl: 'https://api.razorpay.com/v1/' };
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() } as never;

  test('Razorpay: GET /payment_links/{id} and POST /payment_links/{id}/cancel', async () => {
    const calls: Array<{ url: string; method: string; auth: string; body: unknown }> = [];
    const fetchImpl = vi.fn((url: string, init: RequestInit) => {
      calls.push({ url, method: String(init.method), auth: String((init.headers as Record<string, string>).authorization), body: init.body });
      const cancelled = url.endsWith('/cancel');
      return Promise.resolve(new Response(JSON.stringify({
        id: 'plink_332', status: cancelled ? 'cancelled' : 'created', amount: 353600, amount_paid: 0, payments: null,
      }), { status: 200 }));
    });
    const gateway = new RazorpayPaymentGateway(config, logger, fetchImpl as unknown as typeof fetch);
    expect(await gateway.fetchPaymentLink('plink_332')).toMatchObject({ paymentLinkId: 'plink_332', status: 'created', amountMinor: 353600, amountPaidMinor: 0, paymentCount: 0 });
    expect(await gateway.cancelPaymentLink('plink_332')).toMatchObject({ status: 'cancelled' });
    expect(calls.map((c) => [c.method, c.url])).toEqual([
      ['GET', 'https://api.razorpay.com/v1/payment_links/plink_332'],
      ['POST', 'https://api.razorpay.com/v1/payment_links/plink_332/cancel'],
    ]);
    expect(calls[0]?.auth).toBe(`Basic ${Buffer.from('rzp_test_key:secret').toString('base64')}`);
  });

  test('Razorpay: payments listed against a link are counted; an error response throws', async () => {
    const paid = new RazorpayPaymentGateway(config, logger, (() => Promise.resolve(new Response(JSON.stringify({
      id: 'plink_9', status: 'paid', amount: 100, amount_paid: 100, payments: [{ payment_id: 'pay_1' }],
    }), { status: 200 }))) as unknown as typeof fetch);
    expect(await paid.fetchPaymentLink('plink_9')).toMatchObject({ status: 'paid', amountPaidMinor: 100, paymentCount: 1 });

    const failing = new RazorpayPaymentGateway(config, logger, (() => Promise.resolve(new Response('{"error":{"description":"bad"}}', { status: 400 }))) as unknown as typeof fetch);
    await expect(failing.cancelPaymentLink('plink_9')).rejects.toThrow('Razorpay cancel payment link failed (400): {"error":{"description":"bad"}}');
  });

  test('Razorpay: a call that does not answer in time is aborted with a clear error', async () => {
    // Never answers; rejects only when the request's signal aborts.
    const hanging = ((_url: string, init: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => { reject(init.signal?.reason instanceof Error ? init.signal.reason : new Error('aborted')); });
    })) as unknown as typeof fetch;
    const gateway = new RazorpayPaymentGateway(config, logger, hanging, 20);
    await expect(gateway.fetchPaymentLink('plink_9')).rejects.toThrow('Razorpay fetch payment link timed out after 0s');
    await expect(gateway.cancelPaymentLink('plink_9')).rejects.toThrow('Razorpay cancel payment link timed out');
  });

  test('a Razorpay timeout on cancel is a refusal that leaves the database untouched', async () => {
    const w = world();
    const t = planService(w, gatewayWith(linkState(), new Error('Razorpay cancel payment link timed out after 15s')).gateway);
    const res = await t.service.cancelPaymentLink('1', '251');
    expect(res).toEqual({
      status: 0,
      message: 'Razorpay did not cancel the payment link: Razorpay cancel payment link timed out after 15s. If it was just paid, the payment will be recorded automatically.',
    });
    expect(t.calls.appWrites).toEqual([]);
    expect(t.calls.events).toEqual([]);
  });

  test('Mock: a link is open until cancelled', async () => {
    const gateway = new MockPaymentGateway();
    expect((await gateway.fetchPaymentLink('plink_x')).status).toBe('created');
    expect((await gateway.cancelPaymentLink('plink_x')).status).toBe('cancelled');
    expect((await gateway.fetchPaymentLink('plink_x')).status).toBe('cancelled');
  });
});
