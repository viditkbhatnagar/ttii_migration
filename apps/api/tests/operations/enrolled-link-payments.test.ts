import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { EnrolmentFeePlanService } from '../../src/operations/enrolment-fee-plan-service.js';
import { OperationsService } from '../../src/operations/operations-service.js';
import { makeFakePrisma, type FakeApp, type FakePaymentRow, type World } from './enrolled-payments-fake.js';

// Money settled on the application of an ALREADY-ENROLLED student (TTII
// 2026-10-17). Add Enrolment on 13-Oct created applications such as TTII267661
// (id 332, course 25, student_id NULL) for five enrolled students and sent each
// a Razorpay link of about Rs.3,538. Paying it wrote only the application, so
// the portal kept the fee pending and the plan tool kept blocking. The webhook,
// Finance approval and instalment links now also record the payment in the
// student's fee schedule, in the same transaction — never for a lead.

const NOW = new Date('2026-10-17T06:00:00.000Z');
// 2026-10-16 20:00 UTC is 01:30 on 17 Oct in India: the IST day is the 17th.
const PAID_AT_UNIX = Math.floor(Date.UTC(2026, 9, 16, 20, 0, 0) / 1000);
const day = (ymd: string): Date => new Date(`${ymd}T00:00:00.000Z`);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const FULL_PLAN = JSON.stringify({ mode: 'full', total_amount_minor: 353882, registration_fee_minor: null, installments: [], additional_discounts: [] });

const app = (over: Partial<FakeApp> = {}): FakeApp => ({
  id: 332,
  application_id: 'TTII267661',
  course_id: 25,
  student_id: null,
  user_email: 'vidhya@example.com',
  stage: 'enrolled',
  is_converted: 1,
  offering_id: null,
  certificate_combination_id: null,
  application_final_fee: 3538.82,
  payment_plan: FULL_PLAN,
  payment_status: null,
  payment_method: 'razorpay',
  payment_link_url: 'https://rzp.io/l/ttii332',
  payment_link_id: 'plink_332',
  payment_link_expires_at: new Date('2026-10-20T06:00:00.000Z'),
  deleted_at: null,
  ...over,
});

const row = (over: Partial<FakePaymentRow> & Pick<FakePaymentRow, 'id' | 'amount'>): FakePaymentRow => ({
  user_id: 228,
  course_id: 25,
  installment_details: 'Course Fee',
  status: 'Pending',
  due_date: day('2026-10-20'),
  paid_date: null,
  payment_mode: null,
  reference_number: null,
  receipt_url: null,
  payment_to: 'ttii',
  created_by: 1,
  updated_by: 1,
  deleted_at: null,
  ...over,
});

function world(over: Partial<World> = {}): World {
  return {
    users: [
      { id: 1, role_id: 1, name: 'Admin', email: 'admin@example.com', user_email: 'admin@example.com', application_id: 0, deleted_at: null },
      { id: 228, role_id: 2, name: 'VIDHYA SHANKAR KS', email: null, user_email: 'vidhya@example.com', application_id: 100, deleted_at: null },
    ],
    enrols: [
      { id: 252, user_id: 228, course_id: 16, enrollment_id: 'TIDMTT26060228', deleted_at: null },
      { id: 253, user_id: 228, course_id: 25, enrollment_id: 'TIDMTT26100228', deleted_at: null },
    ],
    apps: [app()],
    rows: [],
    ...over,
  };
}

function linkPaid(linkId: string, amount: number, opts: { paymentId?: string; instalmentIndex?: number; applicationRef?: string } = {}): Record<string, unknown> {
  return {
    event: 'payment_link.paid',
    payload: {
      payment_link: {
        entity: {
          id: linkId, amount, amount_paid: amount, status: 'paid',
          notes: {
            application_ref: opts.applicationRef ?? 'TTII267661',
            ...(opts.instalmentIndex ? { instalment_index: String(opts.instalmentIndex) } : {}),
          },
        },
      },
      payment: { entity: { id: opts.paymentId ?? 'pay_A1', amount, status: 'captured', method: 'upi', created_at: PAID_AT_UNIX } },
    },
  };
}

function setup(w: World) {
  const fake = makeFakePrisma(w);
  const service = new OperationsService(fake.prisma);
  const events: Array<{ type: string; description: string; metadata: Record<string, unknown> | undefined }> = [];
  vi.spyOn(service, 'recordEvent').mockImplementation((_id, type, description, _actor, metadata) => {
    events.push({ type, description, metadata });
    return Promise.resolve();
  });
  const notify = vi.spyOn(service as unknown as { notifyApplicationEvent: () => Promise<void> }, 'notifyApplicationEvent').mockResolvedValue();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const schedule = () => w.rows.filter((r) => r.user_id === 228 && r.course_id === 25 && r.deleted_at === null);
  return { ...fake, service, events, notify, schedule, world: w };
}

describe('a paid Add Enrolment link lands in the enrolled student\'s fee schedule', () => {
  test('one Paid row, in the same transaction as the ledger; a webhook retry adds none', async () => {
    const t = setup(world());
    await t.service.handleRazorpayWebhook('payment_link.paid', linkPaid('plink_332', 353882));

    expect(t.schedule()).toEqual([expect.objectContaining({
      installment_details: 'Course Fee', amount: 3539, status: 'Paid', paid_date: day('2026-10-17'),
      payment_mode: 'Online', reference_number: 'pay_A1', payment_to: 'ttii', due_date: null,
    })]);
    expect(t.calls.transactions).toBe(1);
    expect(t.calls.appWrites).toEqual([expect.objectContaining({ op: 'update', inTx: true })]);
    // The application ledger write is unchanged: an enrolled stage is kept.
    expect(t.world.apps[0]).toMatchObject({ payment_status: 'paid', stage: 'enrolled', payment_method: 'razorpay' });
    expect(t.notify).not.toHaveBeenCalled();
    expect(t.events.map((e) => e.type)).toEqual(['payment_received_razorpay', 'student_payment_recorded']);
    expect(t.events[1]?.metadata).toMatchObject({ user_id: 228, course_id: 25, via: 'email', matched_pending_row: false, amount: 3539, reference: 'pay_A1' });

    await t.service.handleRazorpayWebhook('payment_link.paid', linkPaid('plink_332', 353882));
    expect(t.schedule()).toHaveLength(1);
    expect(t.events.filter((e) => e.type === 'student_payment_recorded')).toHaveLength(1);
  });

  test('two deliveries of the same payment at once still record it once', async () => {
    const t = setup(world());
    await Promise.all([
      t.service.handleRazorpayWebhook('payment_link.paid', linkPaid('plink_332', 353882)),
      t.service.handleRazorpayWebhook('payment_link.paid', linkPaid('plink_332', 353882)),
    ]);
    expect(t.schedule()).toHaveLength(1);
  });

  test('a Pending row of the same amount is marked Paid instead of adding one (earliest due first)', async () => {
    const t = setup(world({
      rows: [
        row({ id: 901, amount: 3539, installment_details: 'Installment 2', due_date: day('2026-11-20') }),
        row({ id: 900, amount: 3539, due_date: day('2026-10-20') }),
        // Same amount but a payment is recorded against it: never reused.
        row({ id: 899, amount: 3539, due_date: day('2026-10-01'), reference_number: 'UTR-OLD' }),
      ],
    }));
    await t.service.handleRazorpayWebhook('payment_link.paid', linkPaid('plink_332', 353882));
    const byId = new Map(t.schedule().map((r) => [r.id, r]));
    expect(byId.get(900)).toMatchObject({ status: 'Paid', paid_date: day('2026-10-17'), payment_mode: 'Online', reference_number: 'pay_A1' });
    expect(byId.get(901)).toMatchObject({ status: 'Pending', reference_number: null });
    expect(byId.get(899)).toMatchObject({ status: 'Pending', reference_number: 'UTR-OLD' });
    expect(t.schedule()).toHaveLength(3);
    expect(t.events.find((e) => e.type === 'student_payment_recorded')?.metadata).toMatchObject({ row_id: 900, matched_pending_row: true });
  });

  test('after the link is paid the plan tool reads it as settled and covered by the new row', async () => {
    const t = setup(world());
    const plan = new EnrolmentFeePlanService(t.prisma);
    const before = (await plan.getPlan('253')).data as Record<string, unknown>;
    expect(before.money).toMatchObject({ link_outstanding: true });
    expect(String(before.block_reason)).toContain('can still be paid until 20/10/2026');

    await t.service.handleRazorpayWebhook('payment_link.paid', linkPaid('plink_332', 353882));

    const after = (await plan.getPlan('253')).data as Record<string, unknown>;
    expect(after.money).toMatchObject({ link_outstanding: false, application: 3539, schedule_paid: 3539 });
    expect(after.block_reason).toBeNull();
    expect(after.rows).toEqual([expect.objectContaining({ amount: 3539, status: 'Paid', locked: true, lock_reason: 'paid' })]);
  });

  test('the application linked by student_id (new Add Enrolment rows) resolves without email', async () => {
    const t = setup(world({ apps: [app({ student_id: 228, user_email: 'someone-else@example.com' })] }));
    await t.service.handleRazorpayWebhook('payment_link.paid', linkPaid('plink_332', 353882));
    expect(t.schedule()).toHaveLength(1);
    expect(t.events.find((e) => e.type === 'student_payment_recorded')?.metadata).toMatchObject({ via: 'student_id' });
  });

  test('an ambiguous email writes no row and tells Finance; the ledger is still written', async () => {
    const w = world();
    w.users.push({ id: 229, role_id: 2, name: 'Duplicate', email: 'vidhya@example.com', user_email: null, application_id: 0, deleted_at: null });
    w.enrols.push({ id: 260, user_id: 229, course_id: 25, enrollment_id: 'TIDMTT26100229', deleted_at: null });
    const t = setup(w);
    await t.service.handleRazorpayWebhook('payment_link.paid', linkPaid('plink_332', 353882));

    expect(w.rows).toEqual([]);
    expect(t.calls.transactions).toBe(0);
    expect(t.world.apps[0]).toMatchObject({ payment_status: 'paid' });
    const unrecorded = t.events.find((e) => e.type === 'student_payment_unrecorded');
    expect(unrecorded?.description).toContain('2 student accounts with vidhya@example.com are enrolled in this course');
    expect(unrecorded?.metadata).toMatchObject({ reference: 'pay_A1', amount_minor: 353882 });
  });

  test('if the schedule write fails, the ledger is still written on its own and Finance is told', async () => {
    const t = setup(world({ failScheduleWrites: true }));
    await t.service.handleRazorpayWebhook('payment_link.paid', linkPaid('plink_332', 353882));
    expect(t.world.rows).toEqual([]);
    expect(t.world.apps[0]).toMatchObject({ payment_status: 'paid' });
    expect(t.events.find((e) => e.type === 'student_payment_unrecorded')?.description).toContain('the fee schedule could not be updated');
  });
});

describe('a lead is byte-identical: its application stays the only record', () => {
  // AMINA C (application 340): a lead with an instalment plan and a Rs.2,539
  // registration link. Same email as an existing student who is NOT enrolled in
  // the lead's course.
  const AMINA_PLAN = JSON.stringify({
    mode: 'installment', total_amount_minor: 2253900, registration_fee_minor: 253900,
    installments: [
      { label: 'Registration Fee', amountMinor: 253900, dueDate: '2026-10-17' },
      { label: 'Installment 1', amountMinor: 1000000, dueDate: '2026-11-17' },
      { label: 'Installment 2', amountMinor: 1000000, dueDate: '2026-12-17' },
    ],
    additional_discounts: [],
  });
  const amina = (over: Partial<FakeApp> = {}) => app({
    id: 340, application_id: 'TTII267669', course_id: 16, user_email: 'amina@example.com', stage: 'payment_pending', is_converted: 0,
    application_final_fee: null, payment_plan: AMINA_PLAN, payment_status: 'sent', payment_link_id: 'plink_340', ...over,
  });
  const leadWorld = (a: FakeApp) => world({
    apps: [a],
    users: [{ id: 300, role_id: 2, name: 'AMINA C', email: null, user_email: 'amina@example.com', application_id: 0, deleted_at: null }],
    enrols: [{ id: 400, user_id: 300, course_id: 18, enrollment_id: 'TIDMTT26080300', deleted_at: null }],
  });

  test('registration link: exactly the old application write, no transaction, no fee row', async () => {
    const t = setup(leadWorld(amina()));
    await t.service.handleRazorpayWebhook('payment_link.paid', linkPaid('plink_340', 253900, { applicationRef: 'TTII267669' }));
    expect(t.calls.appWrites).toEqual([{
      op: 'update', inTx: false, where: { id: 340 },
      data: { stage: 'paid', payment_status: 'paid', payment_method: 'razorpay', payment_marked_paid_at: NOW, updated_at: NOW },
    }]);
    expect(t.calls.transactions).toBe(0);
    expect(t.calls.scheduleWrites).toEqual([]);
    expect(t.events.map((e) => e.type)).toEqual(['payment_received_razorpay']);
    expect(t.notify).toHaveBeenCalledTimes(1);
  });

  test('instalment link: exactly the old ledger entry, no transaction, no fee row', async () => {
    const t = setup(leadWorld(amina({ payment_status: 'paid', stage: 'paid' })));
    await t.service.handleRazorpayWebhook('payment_link.paid', linkPaid('plink_340b', 1000000, { applicationRef: 'TTII267669', instalmentIndex: 1 }));
    expect(t.calls.transactions).toBe(0);
    expect(t.calls.scheduleWrites).toEqual([]);
    expect(t.calls.appWrites).toHaveLength(1);
    const write = t.calls.appWrites[0];
    expect(write).toMatchObject({ op: 'update', inTx: false, where: { id: 340 } });
    expect(Object.keys(write?.data ?? {}).sort()).toEqual(['payment_plan', 'updated_at']);
    const plan = JSON.parse(String(write?.data.payment_plan)) as { instalment_payments: unknown[] };
    expect(plan.instalment_payments).toEqual([
      { index: 0, mode: '', reference: '', receipt_url: '', note: '', amount_minor: null, paid_date: null, marked_at: '', marked_by: null, status: 'approved' },
      {
        index: 1, mode: 'razorpay', reference: 'plink_340b', receipt_url: '', note: 'Paid online via payment link', amount_minor: 1000000,
        paid_date: '2026-10-17', marked_at: NOW.toISOString(), marked_by: null, status: 'approved', decided_at: NOW.toISOString(),
      },
    ]);
    expect(t.events.map((e) => e.type)).toEqual(['instalment_paid_razorpay']);
  });

  test('a lead whose email matches no enrolled student is never told to Finance', async () => {
    const t = setup(leadWorld(amina({ user_email: 'nobody@example.com' })));
    await t.service.handleRazorpayWebhook('payment_link.paid', linkPaid('plink_340', 253900, { applicationRef: 'TTII267669' }));
    expect(t.events.map((e) => e.type)).toEqual(['payment_received_razorpay']);
  });
});

describe('Finance approval of a manual payment on an enrolled application', () => {
  const pendingPlan = (over: Record<string, unknown> = {}) => JSON.stringify({
    mode: 'full', total_amount_minor: 353882, installments: [],
    instalment_payments: [{
      index: 0, mode: 'UPI', reference: 'UTR77', receipt_url: 'uploads/receipts/utr77.png', note: '', amount_minor: 353800,
      paid_date: '2026-10-15', marked_at: '2026-10-15T10:00:00.000Z', marked_by: 9, status: 'pending_approval', ...over,
    }],
  });

  test('records one Paid row with the manual reference, receipt and paid day; a repeat approval adds none', async () => {
    const t = setup(world({ apps: [app({ payment_plan: pendingPlan(), payment_status: 'pending_approval' })] }));
    expect(await t.service.approveManualPayment('1', '332')).toEqual({ status: 1, message: 'Payment approved.' });
    expect(t.schedule()).toEqual([expect.objectContaining({
      installment_details: 'Course Fee', amount: 3538, status: 'Paid', paid_date: day('2026-10-15'),
      payment_mode: 'UPI', reference_number: 'UTR77', receipt_url: 'uploads/receipts/utr77.png', created_by: 1,
    })]);
    expect(t.calls.transactions).toBe(1);
    expect(await t.service.approveManualPayment('1', '332')).toEqual({ status: 0, message: 'This payment is not awaiting approval.' });
    expect(t.schedule()).toHaveLength(1);
  });

  test('two approvals at once: one wins, one row (claim-first intact)', async () => {
    const t = setup(world({ apps: [app({ payment_plan: pendingPlan(), payment_status: 'pending_approval' })] }));
    const results = await Promise.all([t.service.approveManualPayment('1', '332'), t.service.approveManualPayment('8', '332')]);
    expect(results.map((r) => r.status).sort()).toEqual([0, 1]);
    expect(t.schedule()).toHaveLength(1);
    expect(t.events.filter((e) => e.type === 'payment_approved')).toHaveLength(1);
  });

  test('a lead approval writes no fee row', async () => {
    const t = setup(world({
      apps: [app({ stage: 'payment_pending', is_converted: 0, user_email: 'lead@example.com', payment_plan: pendingPlan(), payment_status: 'pending_approval' })],
    }));
    expect((await t.service.approveManualPayment('1', '332')).status).toBe(1);
    expect(t.calls.transactions).toBe(0);
    expect(t.calls.scheduleWrites).toEqual([]);
    expect(t.world.apps[0]).toMatchObject({ stage: 'paid', payment_status: 'paid' });
  });
});

describe('an instalment link paid after the student enrolled', () => {
  test('marks the materialised Pending instalment Paid', async () => {
    const plan = JSON.stringify({
      mode: 'installment', total_amount_minor: 2253900,
      installments: [
        { label: 'Registration Fee', amountMinor: 253900, dueDate: '2026-10-01' },
        { label: 'Installment 1', amountMinor: 1000000, dueDate: '2026-11-01' },
      ],
      link_targets: { plink_inst1: 1 },
    });
    const t = setup(world({
      apps: [app({ id: 100, application_id: 'TTII260100', course_id: 16, student_id: 228, payment_plan: plan, payment_status: 'paid', payment_link_id: 'plink_inst1' })],
      rows: [
        row({ id: 700, course_id: 16, amount: 2539, installment_details: 'Registration Fee', status: 'Paid', paid_date: day('2026-10-01') }),
        row({ id: 701, course_id: 16, amount: 10000, installment_details: 'Installment 1', due_date: day('2026-11-01') }),
      ],
    }));
    await t.service.handleRazorpayWebhook('payment_link.paid', linkPaid('plink_inst1', 1000000, { applicationRef: 'TTII260100', paymentId: 'pay_I1' }));
    const course16 = t.world.rows.filter((r) => r.course_id === 16);
    expect(course16).toHaveLength(2);
    expect(course16.find((r) => r.id === 701)).toMatchObject({ status: 'Paid', reference_number: 'pay_I1', paid_date: day('2026-10-17') });
    expect(t.calls.transactions).toBe(1);
  });
});
