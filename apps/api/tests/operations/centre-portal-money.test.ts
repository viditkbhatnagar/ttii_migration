import Fastify from 'fastify';
import { describe, expect, test, vi } from 'vitest';

import { requireLegacyAuth } from '../../src/auth/middleware.js';
import { applicationPaymentInstalments, buildApplicationPayments } from '../../src/operations/centre-application-payments.js';
import {
  NO_CENTRE, buildLedger, collectionStatus, collectionTotals, isCollectionKey, pendingTopUps, safeLink, sortInstalments,
  toCollectionRow, toFundRequestView, toInstalment, ymdOf,
} from '../../src/operations/centre-portal-money-model.js';
import { CentrePortalMoneyService } from '../../src/operations/centre-portal-money-service.js';
import { registerCentrePortalMoneyRoutes } from '../../src/routes/centre-portal-money-routes.js';
import { memoryPrisma } from './support/memory-prisma.js';

// Centre portal → Wallet & Payment (Naji's centre login design, 2026-10-22):
// centre-scoped reads, VarChar money, an honest running balance, and centre
// logins (role 7) only.

const d = (iso: string) => new Date(iso);
const day = (ymd: string) => new Date(`${ymd}T00:00:00.000Z`);

describe('buildLedger', () => {
  const txns = [
    { id: 3, transaction_type: 'debit', amount: '3,201', remarks: 'Fee payable to TTII', created_at: d('2026-10-17T20:00:00Z') },
    { id: 1, transaction_type: 'credit', amount: '₹ 10,000', remarks: 'Fund request approved #4', created_at: d('2026-10-01T05:00:00Z') },
    { id: 2, transaction_type: 'Credit', amount: '500.50', remarks: null, created_at: null },
  ];

  test('reconciles: running balance after each entry, newest first, VarChar amounts parsed', () => {
    const ledger = buildLedger(txns, '7,299.50');
    expect(ledger).toMatchObject({ balance: 7299.5, totalCredits: 10500.5, totalDebits: 3201, net: 7299.5, reconciled: true });
    expect(ledger.entries.map((e) => [e.txnNo, e.type, e.amount, e.balance])).toEqual([
      ['WTX-3', 'debit', 3201, 7299.5],
      ['WTX-2', 'credit', 500.5, 10500.5],
      ['WTX-1', 'credit', 10000, 10000],
    ]);
    // 20:00Z on 17 Oct is 18 Oct in IST; a missing timestamp stays blank.
    expect(ledger.entries[0]).toMatchObject({ ymd: '2026-10-18', description: 'Fee payable to TTII' });
    expect(ledger.entries[1]).toMatchObject({ ymd: '', at: '' });
  });

  test('a balance set outside the ledger: totals still shown, every running balance is null', () => {
    const ledger = buildLedger(txns, '75000');
    expect(ledger.reconciled).toBe(false);
    expect(ledger.net).toBe(7299.5);
    expect(ledger.entries.every((e) => e.balance === null)).toBe(true);
  });

  test('an entry of an unknown type never yields a running balance', () => {
    const ledger = buildLedger([...txns, { id: 4, transaction_type: 'adjustment', amount: '0', remarks: '', created_at: null }], '7299.5');
    expect(ledger.reconciled).toBe(false);
    expect(ledger.entries[0]).toMatchObject({ type: 'other', balance: null });
  });

  test('no entries and no balance reconcile at zero', () => {
    expect(buildLedger([], null)).toMatchObject({ balance: 0, net: 0, reconciled: true, entries: [] });
  });
});

describe('fund requests', () => {
  test('number, date, money and only safe proof links', () => {
    const view = toFundRequestView({
      id: 12, amount: '25,000', date: day('2026-10-14'), transaction_receipt: ' HDFCN261 ', description: 'NEFT',
      attachment_file: 'https://cdn.example.com/proof.pdf', status: 'approved', created_at: d('2026-10-14T05:00:00Z'),
    });
    expect(view).toEqual({
      id: 12, reqNo: 'FR-12', ymd: '2026-10-14', amount: 25000, reference: 'HDFCN261', description: 'NEFT',
      attachment: 'https://cdn.example.com/proof.pdf', status: 'approved',
    });
    expect(safeLink('javascript:alert(1)')).toBe('');
    expect(safeLink('uploads/x.pdf')).toBe('');
    expect(toFundRequestView({ id: 1, amount: null, date: null, transaction_receipt: null, description: null, attachment_file: null, status: null, created_at: d('2026-10-01T20:00:00Z') }))
      .toMatchObject({ amount: 0, status: 'pending', ymd: '2026-10-02' });
  });

  test('pending top-ups are counted and summed', () => {
    const rows = [
      toFundRequestView({ id: 1, amount: '1,000', date: null, transaction_receipt: '', description: '', attachment_file: '', status: 'pending', created_at: null }),
      toFundRequestView({ id: 2, amount: '500', date: null, transaction_receipt: '', description: '', attachment_file: '', status: 'approved', created_at: null }),
      toFundRequestView({ id: 3, amount: '250.25', date: null, transaction_receipt: '', description: '', attachment_file: '', status: 'pending', created_at: null }),
    ];
    expect(pendingTopUps(rows)).toEqual({ count: 2, amount: 1250.25 });
  });
});

describe('collection rows', () => {
  const base = { key: 'app-1', applicationId: 'APP-1', studentName: 'Anu', studentCode: '', course: 'Diploma', source: 'application' as const, date: '2026-10-01' };
  const inst = (id: string, amount: number, status: string, due: string) => toInstalment({ id, installment_details: id, amount, computed_status: status, due_date: due ? day(due) : null });

  test('status: paid, overdue before partial, pending, no plan', () => {
    expect(collectionStatus(0, 0, 0)).toBe('no_plan');
    expect(collectionStatus(0, 100, 0)).toBe('paid');
    expect(collectionStatus(1000, 1000, 0)).toBe('paid');
    expect(collectionStatus(1000, 200, 300)).toBe('overdue');
    expect(collectionStatus(1000, 200, 0)).toBe('partial');
    expect(collectionStatus(1000, 0, 0)).toBe('pending');
  });

  test('overdue amount and the next unpaid due date come from the instalments', () => {
    const row = toCollectionRow({ ...base, fee: 30000, paid: 5000, balance: 25000 }, [
      inst('i1', 5000, 'paid', '2026-08-01'),
      inst('i3', 15000, 'upcoming', '2026-12-15'),
      inst('i2', 10000, 'overdue', '2026-09-15'),
    ]);
    expect(row).toMatchObject({ overdue: 10000, status: 'overdue', nextDueYmd: '2026-09-15' });
    const totals = collectionTotals([row, toCollectionRow({ ...base, key: 'app-2', fee: 0, paid: 0, balance: 0 }, [])]);
    expect(totals).toEqual({ rows: 2, fee: 30000, received: 5000, pending: 25000, overdue: 10000, overdueRows: 1 });
  });

  test('instalments: Payment Status dates (Date or string), paid details only when paid, due-date order', () => {
    const paid = toInstalment({ id: 7, installment_details: ' Semester 1 ', amount: '1,500', computed_status: 'paid', due_date: day('2026-09-01'), paid_date: '2026-09-03', payment_mode: 'UPI' }, { reference: 'UTR1', receipt: 'https://x.test/r.pdf' });
    expect(paid).toEqual({ id: '7', label: 'Semester 1', dueYmd: '2026-09-01', amount: 1500, status: 'paid', paidYmd: '2026-09-03', mode: 'UPI', reference: 'UTR1', receiptUrl: 'https://x.test/r.pdf' });
    const unpaid = toInstalment({ id: 'app-1-1', installment_details: null, amount: 10, computed_status: 'weird', paid_date: '2026-09-03', payment_mode: 'UPI' });
    expect(unpaid).toMatchObject({ label: 'Instalment', status: 'upcoming', paidYmd: '', mode: '', dueYmd: '' });
    expect(sortInstalments([unpaid, paid]).map((i) => i.id)).toEqual(['7', 'app-1-1']);
    expect(ymdOf('2026-10-01 00:00:00')).toBe('2026-10-01');
    expect(ymdOf(42)).toBe('');
  });

  test('only app-N and user-N-N are collection keys', () => {
    expect(['app-12', 'user-5-9', 'user-5-0'].every(isCollectionKey)).toBe(true);
    expect(['app-', 'app-1-2', 'user-5', '12', 'app-1 OR 1=1'].some(isCollectionKey)).toBe(false);
  });
});

describe('applicationPaymentInstalments', () => {
  const centreNames = new Map([[1, 'TTC Bepur svk']]);
  const courseTitles = new Map([[16, 'Diploma'], [18, 'PG Diploma']]);
  const app = (id: number, extra: Record<string, unknown>) => ({
    id, application_id: `APP-${id}`, name: 'Riya', added_under_centre: 1, course_id: 16, stage: 'lead', status: 'pending',
    is_converted: 0, student_id: null, created_at: d('2026-09-01T06:00:00Z'), ...extra,
  });
  const input = {
    centreNames, courseTitles,
    students: [{ id: 501, name: 'Riya', student_id: 'TTS0101', course_id: 16, application_id: 0, added_under_centre: 1, created_at: d('2026-10-02T05:00:00Z') }],
    apps: [
      app(201, { is_converted: 1, student_id: 501, created_at: d('2026-08-01T06:00:00Z') }),
      app(202, { is_converted: 1, student_id: 501, created_at: d('2026-09-15T06:00:00Z') }),
      app(301, {}),
      app(302, { status: 'rejected', stage: 'rejected' }),
    ],
    installments: [
      { id: 1, user_id: 501, course_id: 16, amount: 10000, computed_status: 'paid' },
      { id: 2, user_id: 501, course_id: 16, amount: 5000, computed_status: 'overdue' },
      { id: 3, user_id: 501, course_id: 18, amount: 3000, computed_status: 'due', course_title: 'PG Diploma' },
      { id: 'app-301-0', user_id: null, course_id: 16, amount: 2000, computed_status: 'paid' },
      { id: 'app-302-0', user_id: null, course_id: 16, amount: 9999, computed_status: 'paid' },
      { id: 9, user_id: 777, course_id: 16, amount: 1, computed_status: 'paid' },
    ],
  };

  test('every row\'s instalments sum to its fee, with the same attribution as the rows', () => {
    const rows = buildApplicationPayments(input);
    const members = applicationPaymentInstalments(input);
    for (const row of rows) {
      const sum = (members.get(row.key) ?? []).reduce((s, m) => s + Number(m.amount), 0);
      expect(sum).toBe(row.fee);
    }
    expect(members.get('app-202')?.map((m) => m.id)).toEqual([1, 2]); // newest converted application claims the course
    expect(members.has('app-201')).toBe(false);
    expect(members.get('user-501-18')?.map((m) => m.id)).toEqual([3]);
    expect(members.get('app-301')?.map((m) => m.id)).toEqual(['app-301-0']);
    // A rejected application and a user outside the centre own nothing.
    expect([...members.keys()].sort()).toEqual(['app-202', 'app-301', 'user-501-18']);
  });
});

// ─── Service (in-memory Prisma) ─────────────────────────────────────────────

function seed() {
  return {
    users: [
      { id: 700, role_id: 7, centre_id: '1', deleted_at: null },
      { id: 701, role_id: 10, centre_id: '1', deleted_at: null }, // associate
      { id: 702, role_id: 7, centre_id: '', deleted_at: null }, // centre login with no centre
      { id: 703, role_id: 7, centre_id: '99', deleted_at: null }, // deleted centre
      { id: 501, role_id: 2, name: 'Riya', student_id: 'TTS0101', course_id: 16, application_id: 0, added_under_centre: 1, created_at: d('2026-10-02T05:00:00Z'), user_email: 'riya@x.test', phone: '9000000001', deleted_at: null },
      { id: 502, role_id: 2, name: 'Other centre', student_id: 'TTS0102', course_id: 16, application_id: 0, added_under_centre: 28, created_at: d('2026-10-02T05:00:00Z'), user_email: 'o@x.test', phone: '9', deleted_at: null },
    ],
    centres: [
      { id: 1, centre_id: 'TTC0001', centre_name: 'TTC Bepur svk', wallet_balance: '9,200', deleted_at: null },
      { id: 28, centre_id: 'TTC0028', centre_name: 'upCarrera Education', wallet_balance: '25000', deleted_at: null },
      { id: 99, centre_id: 'TTC0099', centre_name: 'Gone', wallet_balance: '0', deleted_at: d('2026-01-01T00:00:00Z') },
    ],
    wallet_transactions: [
      { id: 10, centre_id: 1, transaction_type: 'credit', amount: '10,000', remarks: 'Fund request approved #2', created_at: d('2026-10-01T05:00:00Z'), deleted_at: null },
      { id: 11, centre_id: 1, transaction_type: 'debit', amount: '800', remarks: 'Enrollment fee', created_at: d('2026-10-05T05:00:00Z'), deleted_at: null },
      { id: 12, centre_id: 28, transaction_type: 'credit', amount: '25000', remarks: 'Other centre', created_at: d('2026-10-05T05:00:00Z'), deleted_at: null },
      { id: 13, centre_id: 1, transaction_type: 'credit', amount: '99999', remarks: 'deleted', created_at: d('2026-10-05T05:00:00Z'), deleted_at: d('2026-10-06T05:00:00Z') },
    ],
    centre_fund_requests: [
      { id: 2, centre_id: 1, amount: '10000', date: day('2026-09-30'), transaction_receipt: 'UTR2', description: '', attachment_file: null, status: 'approved', created_at: d('2026-09-30T05:00:00Z'), deleted_at: null },
      { id: 3, centre_id: 1, amount: '5,000', date: day('2026-10-20'), transaction_receipt: 'UTR3', description: 'top-up', attachment_file: 'https://cdn.test/p.pdf', status: 'pending', created_at: d('2026-10-20T05:00:00Z'), deleted_at: null },
      { id: 4, centre_id: 28, amount: '700', date: day('2026-10-20'), transaction_receipt: 'X', description: '', attachment_file: null, status: 'pending', created_at: d('2026-10-20T05:00:00Z'), deleted_at: null },
    ],
    applications: [
      { id: 101, application_id: 'APP-101', name: 'Anu', added_under_centre: 1, course_id: 16, stage: 'payment_pending', status: 'pending', is_converted: 0, student_id: null, created_at: d('2026-10-20T06:00:00Z'), user_email: 'anu@x.test', phone: '9000000002', deleted_at: null },
      { id: 104, application_id: 'APP-104', name: 'Other', added_under_centre: 28, course_id: 16, stage: 'lead', status: 'pending', is_converted: 0, student_id: null, created_at: d('2026-10-20T06:00:00Z'), user_email: '', phone: '', deleted_at: null },
    ],
    course: [{ id: 16, title: 'Diploma' }],
    student_payments: [{ id: 900, reference_number: 'UTR900', receipt_url: 'https://cdn.test/r900.pdf' }],
  };
}

const installments = [
  { id: 'app-101-0', user_id: null, course_id: 16, installment_details: 'Registration', amount: 5000, computed_status: 'paid', due_date: day('2026-09-01') },
  { id: 'app-101-1', user_id: null, course_id: 16, installment_details: 'Instalment 2', amount: 15000, computed_status: 'overdue', due_date: day('2026-09-25') },
  { id: 900, user_id: 501, course_id: 16, installment_details: 'Semester 1', amount: 8000, computed_status: 'paid', due_date: day('2026-10-01'), paid_date: day('2026-10-03'), payment_mode: 'UPI' },
  { id: 901, user_id: 501, course_id: 16, installment_details: 'Semester 2', amount: 8000, computed_status: 'upcoming', due_date: day('2026-12-01') },
];

function service(loader = vi.fn().mockResolvedValue({ installments })) {
  const db = memoryPrisma(seed());
  return { svc: new CentrePortalMoneyService({ prisma: db.prisma, loadPaymentStatus: loader }), loader };
}

describe('CentrePortalMoneyService', () => {
  test('ledger: only the caller\'s centre, deleted rows left out, reconciled running balance', async () => {
    const { svc } = service();
    const out = await svc.ledger(700);
    expect(out.status).toBe(1);
    expect(out.data).toMatchObject({
      centre: { id: 1, code: 'TTC0001', name: 'TTC Bepur svk' },
      balance: 9200, totalCredits: 10000, totalDebits: 800, reconciled: true,
      pendingTopUps: { count: 1, amount: 5000 },
    });
    expect(out.data?.entries.map((e) => [e.id, e.balance])).toEqual([[11, 9200], [10, 10000]]);
    expect(out.data?.fundRequests.map((r) => r.reqNo)).toEqual(['FR-3', 'FR-2']);
  });

  test('no centre: an associate, a login without a centre, a deleted centre, no actor', async () => {
    const { svc } = service();
    for (const actor of [701, 702, 703, null, 999]) {
      expect(await svc.ledger(actor)).toEqual({ status: 0, message: NO_CENTRE });
      expect(await svc.collections(actor)).toEqual({ status: 0, message: NO_CENTRE });
    }
  });

  test('collections: Payment Status is read only for this centre\'s students and applications', async () => {
    const { svc, loader } = service();
    const out = await svc.collections(700);
    expect(loader).toHaveBeenCalledWith({ userIds: [501], applicationIds: [101] });
    const byKey = new Map(out.data?.rows.map((r) => [r.key, r]));
    expect([...byKey.keys()].sort()).toEqual(['app-101', 'user-501-16']);
    expect(byKey.get('app-101')).toMatchObject({ fee: 20000, paid: 5000, balance: 15000, overdue: 15000, status: 'overdue', nextDueYmd: '2026-09-25' });
    expect(byKey.get('user-501-16')).toMatchObject({ studentCode: 'TTS0101', fee: 16000, paid: 8000, status: 'partial', nextDueYmd: '2026-12-01' });
    expect(out.data?.totals).toEqual({ rows: 2, fee: 36000, received: 13000, pending: 23000, overdue: 15000, overdueRows: 1 });
  });

  test('detail: instalments with reference / receipt and contact; another centre\'s record is not found', async () => {
    const { svc } = service();
    const own = await svc.collectionDetail(700, 'user-501-16');
    expect(own.status).toBe(1);
    expect(own.data).toMatchObject({ email: 'riya@x.test', phone: '9000000001' });
    expect(own.data?.instalments.map((i) => [i.id, i.status, i.reference, i.receiptUrl, i.paidYmd])).toEqual([
      ['900', 'paid', 'UTR900', 'https://cdn.test/r900.pdf', '2026-10-03'],
      ['901', 'upcoming', '', '', ''],
    ]);
    const app = await svc.collectionDetail(700, 'app-101');
    expect(app.data).toMatchObject({ email: 'anu@x.test', row: { applicationId: 'APP-101' } });
    for (const key of ['app-104', 'user-502-16', 'bogus', '']) {
      expect(await svc.collectionDetail(700, key)).toEqual({ status: 0, message: 'Payment record not found.' });
    }
  });

  test('a centre with no applications or students does not read Payment Status', async () => {
    const loader = vi.fn();
    const db = memoryPrisma({ ...seed(), applications: [], users: [{ id: 700, role_id: 7, centre_id: '1', deleted_at: null }] });
    const out = await new CentrePortalMoneyService({ prisma: db.prisma, loadPaymentStatus: loader }).collections(700);
    expect(out.data).toEqual({ rows: [], totals: { rows: 0, fee: 0, received: 0, pending: 0, overdue: 0, overdueRows: 0 } });
    expect(loader).not.toHaveBeenCalled();
  });
});

// ─── Routes ─────────────────────────────────────────────────────────────────

const USERS: Record<string, { id: number; role_id: number }> = {
  centre: { id: 700, role_id: 7 },
  associate: { id: 701, role_id: 10 },
  admin: { id: 1, role_id: 1 },
  student: { id: 501, role_id: 2 },
};

function makeApp(fail = false) {
  const authService = {
    authenticateAuthToken: (token: string) => {
      const user = USERS[token];
      return Promise.resolve(user ? { user: { ...user, name: token } } : null);
    },
    logAuthDenied: () => Promise.resolve(),
    logRbacDenied: () => Promise.resolve(),
  };
  const svc = {
    ledger: vi.fn().mockImplementation(() => (fail ? Promise.reject(new Error('db down')) : Promise.resolve({ status: 1, message: 'success', data: { balance: 1 } }))),
    collections: vi.fn().mockResolvedValue({ status: 1, message: 'success', data: { rows: [] } }),
    collectionDetail: vi.fn().mockResolvedValue({ status: 0, message: 'Payment record not found.' }),
  };
  const app = Fastify({ logger: false });
  registerCentrePortalMoneyRoutes(app, {
    requireAuth: requireLegacyAuth(authService as never),
    authService: authService as never,
    loadPaymentStatus: () => Promise.resolve({}),
    service: svc as unknown as CentrePortalMoneyService,
  });
  return { app, svc };
}

const PATHS = ['/centre/wallet/ledger', '/centre/wallet/collections', '/centre/wallet/collections/view'];

describe('centre portal wallet routes', () => {
  test('associates, admins, students and anonymous callers are refused; nothing reaches the service', async () => {
    const { app, svc } = makeApp();
    for (const path of PATHS) {
      for (const token of ['associate', 'admin', 'student']) {
        expect((await app.inject({ method: 'GET', url: `${path}?auth_token=${token}` })).statusCode).toBe(403);
      }
      expect((await app.inject({ method: 'GET', url: path })).statusCode).toBe(401);
    }
    expect(svc.ledger).not.toHaveBeenCalled();
    expect(svc.collections).not.toHaveBeenCalled();
    expect(svc.collectionDetail).not.toHaveBeenCalled();
    await app.close();
  });

  test('a centre login reads; the actor comes from the token, never from the query', async () => {
    const { app, svc } = makeApp();
    const ledger = await app.inject({ method: 'GET', url: '/centre/wallet/ledger?auth_token=centre&centre_id=28' });
    expect(ledger.json()).toEqual({ status: 1, message: 'success', data: { balance: 1 } });
    expect(svc.ledger).toHaveBeenCalledWith(700);
    await app.inject({ method: 'GET', url: '/centre/wallet/collections?auth_token=centre' });
    expect(svc.collections).toHaveBeenCalledWith(700);
    const view = await app.inject({ method: 'GET', url: '/centre/wallet/collections/view?auth_token=centre&key=%20app-104%20' });
    expect(view.json()).toEqual({ status: 0, message: 'Payment record not found.', data: {} });
    expect(svc.collectionDetail).toHaveBeenCalledWith(700, 'app-104');
    await app.close();
  });

  test('an unexpected failure is a generic 500', async () => {
    const { app } = makeApp(true);
    const res = await app.inject({ method: 'GET', url: '/centre/wallet/ledger?auth_token=centre' });
    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({ status: 0, message: 'Something went wrong. Please try again.', data: {} });
    await app.close();
  });
});
