import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';

import { EnrolmentFeePlanService } from '../../src/operations/enrolment-fee-plan-service.js';

// Per-enrolment payment plans (TTII 2026-10-16). VIDHYA SHANKAR KS
// (users.id 228) holds her original course 16 through application 100, and
// course 25 through Add Enrolment (enrol 253). The plan for course 25 is
// written straight to student_payments for (228, 25).
//
// The fake database models what matters for money: a transaction's writes are
// committed only when it returns (a throw rolls everything back), the guarded
// soft-delete re-checks each row when it runs, and the pre-commit checkout
// re-check sees orders that appeared during the save.

interface FakeRow {
  id: number;
  user_id: number;
  course_id: number;
  installment_details: string | null;
  amount: number | null;
  status: string | null;
  due_date: Date | null;
  paid_date: Date | null;
  payment_mode: string | null;
  reference_number: string | null;
  receipt_url: string | null;
  deleted: boolean;
}

interface FakeApp {
  id: number;
  application_id: string;
  course_id: number;
  student_id: number | null;
  user_email: string;
  stage: string;
  is_converted: number;
  offering_id: number | null;
  certificate_combination_id: number | null;
  application_final_fee: number | null;
  payment_plan: string | null;
  payment_status: string | null;
  payment_link_url: string | null;
  payment_link_id: string | null;
  payment_link_expires_at: Date | null;
}

interface World {
  enrols: Array<{ id: number; user_id: number; course_id: number; enrollment_id: string }>;
  student: { id: number; name: string; user_email: string; application_id: number };
  apps: FakeApp[];
  offerings: Array<{ id: number; course_id: number; title: string; offering_code: string | null; fee_category: string; base_fee: number | null; discount: number | null; offered_fee: number | null; pricing_amount: number | null }>;
  packages: Array<{ offering_id: number; combination_id: number; fee_category: string; base_fee: number | null; discount: number | null; offered_fee: number | null; gst_percent: number | null }>;
  courses: Array<{ id: number; title: string; total_amount: number | null; sale_price: number | null }>;
  rows: FakeRow[];
  orderNotes: string[];
  /** Checkout orders that appear while a save runs (seen only by the locking re-check). */
  lateOrderNotes?: string[];
  online?: Array<{ amount_paid: number; razorpay_payment_id: string | null }>;
  /** Runs between the locked read and the guarded soft-delete (a racing writer). */
  beforeUpdate?: (rows: FakeRow[]) => void;
  /** The last `where` the application lookup received (so tests can pin the query). */
  lastAppWhere?: unknown;
}

const UNPAID = new Set(['', 'pending', 'overdue', 'due']);

const isSqlFragment = (v: unknown): v is { values: unknown[]; strings: string[] } => (
  typeof v === 'object' && v !== null && Array.isArray((v as { values?: unknown }).values) && Array.isArray((v as { strings?: unknown }).strings)
);

// Sanity: the helper recognises what Prisma.join really produces.
if (!isSqlFragment(Prisma.join([1, 2]))) throw new Error('Prisma.join shape changed');

const NOW = new Date('2026-10-16T06:00:00.000Z');
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
});

function makeService(world: World) {
  const committed = { deletedIds: [] as number[], created: [] as Array<Record<string, unknown>>, agreed: [] as Array<{ id: number; fee: unknown }> };
  const sql: string[] = [];

  const scheduleFor = (userId: number, courseId: number) => world.rows
    .filter((r) => !r.deleted && r.user_id === userId && r.course_id === courseId)
    .map((r) => ({ ...r }));

  const rawQuery = (strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.join('?');
    sql.push(text);
    if (text.includes('FROM create_order')) {
      return Promise.resolve([...world.orderNotes, ...(world.lateOrderNotes ?? [])].map((notes) => ({ notes })));
    }
    return Promise.resolve(scheduleFor(Number(values[0]), Number(values[1])));
  };

  const base = {
    enrol: { findFirst: ({ where }: { where: { id: number } }) => Promise.resolve(world.enrols.find((e) => e.id === where.id) ?? null) },
    users: { findFirst: () => Promise.resolve(world.student) },
    applications: {
      // originalApplication: the users.application_id row only.
      findFirst: ({ where }: { where: { id?: number } }) => {
        const hit = world.apps.find((a) => a.id === where.id);
        return Promise.resolve(hit ? { id: hit.id, course_id: hit.course_id, payment_plan: hit.payment_plan } : null);
      },
      findMany: ({ where }: { where: { course_id: { in: number[] } } }) => {
        world.lastAppWhere = where;
        return Promise.resolve(
          world.apps
            .filter((a) => where.course_id.in.includes(a.course_id))
            // Mirrors the real query: an email match only takes an application
            // not linked to any student (student_id IS NULL).
            .filter((a) => a.student_id === world.student.id || a.id === world.student.application_id
              || (a.student_id == null && a.user_email === world.student.user_email && (a.stage === 'enrolled' || a.is_converted === 1)))
            .sort((x, y) => y.id - x.id),
        );
      },
    },
    offerings: {
      findMany: ({ where }: { where: { OR: Array<{ id?: { in: number[] }; course_id?: { in: number[] } }> } }) => {
        const ids = where.OR[0]?.id?.in ?? [];
        const courseIds = where.OR[1]?.course_id?.in ?? [];
        return Promise.resolve(world.offerings.filter((o) => ids.includes(o.id) || courseIds.includes(o.course_id)));
      },
    },
    offering_certificate_packages: {
      findMany: ({ where }: { where: { offering_id: { in: number[] } } }) => Promise.resolve(world.packages.filter((p) => where.offering_id.in.includes(p.offering_id))),
    },
    course_fees: { findMany: () => Promise.resolve([]) },
    course: { findMany: () => Promise.resolve(world.courses) },
    certificate_combinations: { findMany: () => Promise.resolve([]) },
    create_order: { findMany: () => Promise.resolve(world.orderNotes.map((notes) => ({ notes }))) },
    payment_info: { findMany: () => Promise.resolve(world.online ?? []) },
    $queryRaw: rawQuery,
  };

  const prisma = {
    ...base,
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const pending = { deletedIds: [] as number[], created: [] as Array<Record<string, unknown>>, agreed: [] as Array<{ id: number; fee: unknown }> };
      const tx = {
        ...base,
        applications: {
          ...base.applications,
          // The agreed fee a plan save records on the enrolment's application.
          updateMany: ({ where, data }: { where: { id: number; course_id?: number }; data: { application_final_fee?: unknown } }) => {
            const hit = world.apps.find((x) => x.id === where.id && (where.course_id === undefined || x.course_id === where.course_id));
            if (!hit) return Promise.resolve({ count: 0 });
            pending.agreed.push({ id: where.id, fee: data.application_final_fee });
            return Promise.resolve({ count: 1 });
          },
        },
        $queryRaw: rawQuery,
        $executeRaw: (strings: TemplateStringsArray, ...values: unknown[]) => {
          sql.push(strings.join('?'));
          world.beforeUpdate?.(world.rows);
          // Prisma.join(ids) arrives as one Sql fragment carrying the ids.
          const ids = values.flatMap((v) => (isSqlFragment(v) ? v.values.map(Number) : []));
          let affected = 0;
          for (const id of ids) {
            const r = world.rows.find((x) => x.id === id);
            const guardOk = r && !r.deleted && r.paid_date == null && UNPAID.has((r.status ?? '').trim().toLowerCase())
              && (r.payment_mode ?? '').trim() === '' && (r.reference_number ?? '').trim() === '' && (r.receipt_url ?? '').trim() === '';
            if (guardOk) { affected += 1; pending.deletedIds.push(id); }
          }
          return Promise.resolve(affected);
        },
        student_payments: {
          createMany: ({ data }: { data: Array<Record<string, unknown>> }) => { pending.created.push(...data); return Promise.resolve({ count: data.length }); },
        },
      };
      const result = await fn(tx);
      // Commit only now: a throw above leaves `committed` untouched.
      committed.deletedIds.push(...pending.deletedIds);
      committed.created.push(...pending.created);
      for (const a of pending.agreed) {
        const appRow = world.apps.find((x) => x.id === a.id);
        if (appRow) appRow.application_final_fee = Number(a.fee);
        committed.agreed.push(a);
      }
      return result;
    },
  } as unknown as PrismaClient;

  return { service: new EnrolmentFeePlanService(prisma), committed, sql };
}

const day = (s: string): Date => new Date(`${s}T00:00:00.000Z`);
const sp = (over: Partial<FakeRow> & { id: number }): FakeRow => ({
  user_id: 228, course_id: 25, installment_details: `Installment ${over.id}`, amount: 5000, status: 'Pending',
  due_date: day('2026-11-01'), paid_date: null, payment_mode: null, reference_number: null, receipt_url: null, deleted: false, ...over,
});
const app = (over: Partial<FakeApp> & { id: number; course_id: number }): FakeApp => ({
  application_id: `TTII26${String(over.id).padStart(4, '0')}`, student_id: null, user_email: 'vidhya@example.com', stage: 'enrolled',
  is_converted: 1, offering_id: null, certificate_combination_id: null, application_final_fee: null, payment_plan: null,
  payment_status: null, payment_link_url: null, payment_link_id: null, payment_link_expires_at: null, ...over,
});

const SCHEDULED_PLAN = JSON.stringify({ mode: 'installment', installments: [{ label: 'Registration Fee', amountMinor: 500000 }] });

function vidhya(over: Partial<World> = {}): World {
  return {
    enrols: [
      { id: 252, user_id: 228, course_id: 16, enrollment_id: 'TIDMTT26060228' },
      { id: 253, user_id: 228, course_id: 25, enrollment_id: 'TIDMTT26100228' },
    ],
    student: { id: 228, name: 'VIDHYA SHANKAR KS', user_email: 'vidhya@example.com', application_id: 100 },
    apps: [
      // Her original application: its plan has a schedule, so it governs course 16.
      app({ id: 100, application_id: 'TTII260100', course_id: 16, student_id: 228, offering_id: 60, certificate_combination_id: 1, application_final_fee: 30000, payment_plan: SCHEDULED_PLAN, payment_status: 'paid' }),
      // Add Enrolment's application: no student_id, linked by email + course.
      app({ id: 300, application_id: 'TTII260300', course_id: 25, offering_id: 70, certificate_combination_id: 4, application_final_fee: 15000 }),
    ],
    offerings: [{ id: 70, course_id: 25, title: 'AI Educator - Oct 2026', offering_code: null, fee_category: 'paid', base_fee: null, discount: null, offered_fee: null, pricing_amount: null }],
    packages: [{ offering_id: 70, combination_id: 4, fee_category: 'paid', base_fee: 20000, discount: 2000, offered_fee: null, gst_percent: 18 }],
    courses: [{ id: 25, title: 'Certification in Ai - Early Childhood Educator', total_amount: null, sale_price: 0 }],
    rows: [],
    orderNotes: [],
    ...over,
  };
}

const twoInstalments = {
  mode: 'installment' as const,
  totalFee: 20000,
  discount: 2000,
  gstPercent: 0,
  rows: [
    { label: 'Installment 2', amount: 5500, dueDate: '2026-11-10' },
    { label: 'Installment 3', amount: 5500, dueDate: '2026-12-10' },
  ],
};
const fullOf = (amount: number) => ({ mode: 'full' as const, totalFee: amount, discount: 0, gstPercent: 0, rows: [{ label: '', amount, dueDate: '2026-11-10' }] });

describe('reading the plan of an enrolment on its own plan', () => {
  test("prefills from the enrolment's offering package and reports no blocking money", async () => {
    const { service } = makeService(vidhya());
    const res = await service.getPlan('253');
    expect(res.status).toBe(1);
    expect(res.data).toMatchObject({
      enrol_id: 253, user_id: 228, course_id: 25, enrollment_id: 'TIDMTT26100228', student_name: 'VIDHYA SHANKAR KS',
      course_title: 'Certification in Ai - Early Childhood Educator',
      prefill: { total_fee: 20000, discount: 2000, gst_percent: 18, source: 'offering' },
      agreed_fee: 15000,
      has_application: true,
      free_offering: false,
      money: { application_code: 'TTII260300', application: 0, online: 0, schedule_paid: 0, pending_approval: false, link_outstanding: false },
      block_reason: null,
      rows: [],
      today: '2026-10-16',
      due_from: '2025-10-16',
      due_to: '2029-10-16',
    });
  });

  test('every schedule row comes back with its lock and reason', async () => {
    const { service } = makeService(vidhya({
      rows: [
        sp({ id: 1001, installment_details: 'Registration Fee', amount: 2000, status: 'Paid', paid_date: day('2026-10-01') }),
        sp({ id: 1002 }),
        sp({ id: 1003 }),
      ],
      orderNotes: ['{"sp_id":1003}'],
    }));
    const res = await service.getPlan('253');
    const data = res.data as { rows: Array<Record<string, unknown>>; money: Record<string, unknown> };
    expect(data.rows.map((r) => [r.id, r.locked, r.lock_reason])).toEqual([[1001, true, 'paid'], [1002, false, null], [1003, true, 'checkout']]);
    expect(data.rows[0]).toMatchObject({ amount: 2000, due_date: '2026-11-01', paid_date: '2026-10-01', status: 'Paid' });
    expect(data.money.schedule_paid).toBe(2000);
  });

  test("the original course is refused while its application plan has a schedule", async () => {
    const { service } = makeService(vidhya());
    expect(await service.getPlan('252')).toEqual({
      status: 0,
      message: "This is the student's original course and its application payment plan has a schedule. Plan its fee with Generate / Edit Payment Plan on the student's application.",
    });
  });

  test('the original course is allowed when its application plan holds only a recorded payment (Jayasree S)', async () => {
    const ledgerOnly = vidhya();
    const original = ledgerOnly.apps[0];
    if (!original) throw new Error('fixture');
    original.payment_plan = JSON.stringify({ instalment_payments: [{ index: 0, status: 'approved', amount_minor: 1888000, mode: 'UPI', reference: 'U1', receipt_url: '', note: '', paid_date: '2026-07-11', marked_at: '', marked_by: 9 }] });
    const { service } = makeService({
      ...ledgerOnly,
      rows: [sp({ id: 2001, course_id: 16, installment_details: 'Course Fee', amount: 18880, status: 'Paid', paid_date: day('2026-07-11'), payment_mode: 'UPI', reference_number: 'U1' })],
    });
    const res = await service.getPlan('252');
    expect(res.status).toBe(1);
    // The approved ₹18,880 is covered by the backfilled Paid row: nothing blocks.
    expect(res.data).toMatchObject({ money: { application: 18880, schedule_paid: 18880 }, block_reason: null });
  });

  test('users.application_id = 0: no original course, every enrolment is planned on its own', async () => {
    const { service } = makeService(vidhya({ student: { id: 228, name: 'Legacy', user_email: 'vidhya@example.com', application_id: 0 } }));
    expect((await service.getPlan('252')).status).toBe(1);
    expect((await service.getPlan('253')).status).toBe(1);
  });

  test('unknown enrolments are refused', async () => {
    const { service } = makeService(vidhya());
    expect(await service.getPlan('999')).toEqual({ status: 0, message: 'Enrolment not found.' });
    expect(await service.getPlan('abc')).toEqual({ status: 0, message: 'Invalid enrolment id.' });
  });
});

describe('saving a per-enrolment plan', () => {
  test('keeps Paid and checkout rows exactly, replaces only the free Pending row, all in one locked transaction', async () => {
    const { service, committed, sql } = makeService(vidhya({
      rows: [
        sp({ id: 1001, installment_details: 'Registration Fee', amount: 2000, status: 'Paid', paid_date: day('2026-10-01') }),
        sp({ id: 1002 }),
        sp({ id: 1003 }),
      ],
      orderNotes: ['{"sp_id":1003}'],
    }));
    // Payable 18,000 = 2,000 paid + 5,000 being paid at checkout + 11,000 new.
    const res = await service.savePlan('1', { enrolId: '253', plan: twoInstalments });
    expect(res).toEqual({ status: 1, message: 'Payment plan saved.', data: { created: 2, replaced: 1, kept: 2, payable: 18000, agreed_fee_saved: true } });
    expect(committed.deletedIds).toEqual([1002]);
    expect(committed.created).toEqual([
      expect.objectContaining({ user_id: 228, course_id: 25, installment_details: 'Installment 2', amount: 5500, due_date: day('2026-11-10'), status: 'Pending', paid_date: null, payment_to: 'ttii', created_by: 1, updated_by: 1 }),
      expect.objectContaining({ user_id: 228, course_id: 25, installment_details: 'Installment 3', amount: 5500, due_date: day('2026-12-10'), status: 'Pending' }),
    ]);
    expect(sql.some((s) => s.includes('FROM student_payments') && s.includes('FOR UPDATE'))).toBe(true);
    // The last statement re-checks checkouts with a locking read.
    expect(sql.at(-1)).toContain('LOCK IN SHARE MODE');
  });

  test("a counsellor's recorded cash collection (Pending, mode set) is kept and counted, never replaced", async () => {
    const { service, committed } = makeService(vidhya({
      rows: [sp({ id: 1010, installment_details: 'Full course fee', amount: 6000, payment_mode: 'Cash' }), sp({ id: 1011 })],
    }));
    const res = await service.savePlan('1', { enrolId: '253', plan: fullOf(18000) });
    expect(res).toMatchObject({ status: 0 });
    const ok = await service.savePlan('1', { enrolId: '253', plan: { ...fullOf(18000), rows: [{ label: '', amount: 12000, dueDate: '2026-11-10' }] } });
    expect(ok).toMatchObject({ status: 1, data: { created: 1, replaced: 1, kept: 1 } });
    expect(committed.deletedIds).toEqual([1011]);
  });

  test('full payment on an empty schedule: one Course Fee row for the GST-inclusive total', async () => {
    const { service, committed } = makeService(vidhya());
    const res = await service.savePlan('8', {
      enrolId: '253',
      plan: { mode: 'full', totalFee: 10000, discount: 0, gstPercent: 18, rows: [{ label: '', amount: 11800, dueDate: '2026-10-31' }] },
    });
    expect(res.status).toBe(1);
    expect(committed.created).toEqual([expect.objectContaining({ installment_details: 'Course Fee', amount: 11800, due_date: day('2026-10-31'), created_by: 8 })]);
  });

  test('totals that do not add up, or a due date outside the window, are refused and nothing is written', async () => {
    const { service, committed } = makeService(vidhya({ rows: [sp({ id: 1002 })] }));
    expect(await service.savePlan('1', { enrolId: '253', plan: { ...twoInstalments, rows: [{ label: 'X', amount: 1000, dueDate: '2026-11-10' }] } })).toEqual({
      status: 0, message: 'The rows add up to ₹1,000 but ₹18,000 is left to schedule (payable ₹18,000).',
    });
    expect(await service.savePlan('1', { enrolId: '253', plan: { ...fullOf(18000), rows: [{ label: '', amount: 18000, dueDate: '2030-01-01' }] } })).toEqual({
      status: 0, message: 'Row 1: the due date must be between 16/10/2025 and 16/10/2029.',
    });
    expect(committed).toEqual({ deletedIds: [], created: [], agreed: [] });
  });

  test('a row paid between the read and the write aborts the whole save (rolled back)', async () => {
    const { service, committed } = makeService(vidhya({
      rows: [sp({ id: 1002 }), sp({ id: 1004 })],
      beforeUpdate: (rows) => {
        const r = rows.find((x) => x.id === 1004);
        if (r) { r.status = 'Paid'; r.paid_date = day('2026-10-16'); }
      },
    }));
    expect(await service.savePlan('1', { enrolId: '253', plan: fullOf(18000) })).toEqual({
      status: 0, message: 'The fee schedule changed while you were editing it. Reload and try again.',
    });
    expect(committed).toEqual({ deletedIds: [], created: [], agreed: [] });
  });

  test('a checkout started on a replaced row during the save is caught before commit (rolled back)', async () => {
    const { service, committed } = makeService(vidhya({ rows: [sp({ id: 1002 })], lateOrderNotes: ['{"sp_id":1002}'] }));
    expect(await service.savePlan('1', { enrolId: '253', plan: fullOf(18000) })).toEqual({
      status: 0, message: 'A payment for one of the instalments being replaced started while the plan was saving. Nothing was changed; reload and try again.',
    });
    expect(committed).toEqual({ deletedIds: [], created: [], agreed: [] });
  });

  test("the original course with a scheduled application plan is refused without touching anything", async () => {
    const { service, committed } = makeService(vidhya());
    expect((await service.savePlan('1', { enrolId: '252', plan: twoInstalments })).status).toBe(0);
    expect(committed).toEqual({ deletedIds: [], created: [], agreed: [] });
  });

  test('a save with no rows still records a changed agreed fee; a repeat is "Nothing to change"', async () => {
    // Application 300 says 15,000; the kept Paid row already covers 18,000.
    const { service, committed } = makeService(vidhya({ rows: [sp({ id: 1001, amount: 18000, status: 'Paid', paid_date: day('2026-10-01') })] }));
    const plan = { mode: 'full' as const, totalFee: 18000, discount: 0, gstPercent: 0, rows: [] };
    expect(await service.savePlan('1', { enrolId: '253', plan })).toEqual({
      status: 1, message: 'Payment plan saved.', data: { created: 0, replaced: 0, kept: 1, payable: 18000, agreed_fee_saved: true },
    });
    expect(committed.agreed).toEqual([{ id: 300, fee: 18000 }]);
    expect(await service.savePlan('1', { enrolId: '253', plan })).toEqual({
      status: 0, message: 'Nothing to change: the kept instalments already cover the payable total.',
    });
  });

  test('the probe: a Rs.15,000 plan fully paid, with a Rs.21,240 package price on the application, is never stuck', async () => {
    const world = vidhya({ rows: [sp({ id: 1001, installment_details: 'Course Fee', amount: 15000, status: 'Paid', paid_date: day('2026-10-02') })] });
    const addEnrolmentApp = world.apps[1];
    if (!addEnrolmentApp) throw new Error('fixture');
    addEnrolmentApp.application_final_fee = 21240;
    const { service, committed } = makeService(world);
    // The agreed fee shows a ₹6,240 balance; planning the real total corrects it.
    expect((await service.getPlan('253')).data).toMatchObject({ agreed_fee: 21240, has_application: true });
    const res = await service.savePlan('1', { enrolId: '253', plan: { mode: 'full', totalFee: 15000, discount: 0, gstPercent: 0, rows: [] } });
    expect(res).toMatchObject({ status: 1, data: { created: 0, agreed_fee_saved: true } });
    expect(committed.agreed).toEqual([{ id: 300, fee: 15000 }]);
    expect((await service.getPlan('253')).data).toMatchObject({ agreed_fee: 15000 });
  });

  test('with no application there is nowhere to record an agreed fee: an unchanged schedule is "Nothing to change"', async () => {
    const { service, committed } = makeService(vidhya({
      student: { id: 228, name: 'Legacy', user_email: '', application_id: 0 },
      apps: [],
      rows: [sp({ id: 1001, amount: 18000, status: 'Paid', paid_date: day('2026-10-01') })],
    }));
    expect((await service.getPlan('253')).data).toMatchObject({ agreed_fee: null, has_application: false });
    expect(await service.savePlan('1', { enrolId: '253', plan: { mode: 'full', totalFee: 18000, discount: 0, gstPercent: 0, rows: [] } })).toEqual({
      status: 0, message: 'Nothing to change: the kept instalments already cover the payable total.',
    });
    expect(committed).toEqual({ deletedIds: [], created: [], agreed: [] });
  });

  test('bad input is refused before any read', async () => {
    const { service } = makeService(vidhya());
    expect(await service.savePlan('0', { enrolId: '253', plan: twoInstalments })).toEqual({ status: 0, message: 'Invalid user.' });
    expect(await service.savePlan('1', { enrolId: '253', plan: { ...twoInstalments, totalFee: 0 } })).toEqual({ status: 0, message: 'Enter the total fee.' });
  });
});

describe('an email match never reaches another student (TTII 2026-10-17 review)', () => {
  test("a different student's application with the same email is neither read nor written", async () => {
    // users.user_email is not unique: student 999 shares Vidhya's email and owns
    // application 400 for the same course 25, with its own agreed fee.
    const world = vidhya({
      apps: [
        ...vidhya().apps,
        app({ id: 400, application_id: 'TTII260400', course_id: 25, student_id: 999, offering_id: 70, certificate_combination_id: 4, application_final_fee: 21240 }),
      ],
    });
    const { service, committed } = makeService(world);
    const res = await service.savePlan('1', { enrolId: '253', plan: fullOf(9000) });
    expect(res.status).toBe(1);
    // The agreed fee lands on Vidhya's own Add Enrolment application (300) only.
    expect(committed.agreed.map((a) => a.id)).toEqual([300]);
    expect(world.apps.find((a) => a.id === 400)?.application_final_fee).toBe(21240);
    // And the real query asks for unlinked applications on the email branch.
    const where = world.lastAppWhere as { OR: Array<Record<string, unknown>> };
    const emailBranch = where.OR.find((b) => 'user_email' in b);
    expect(emailBranch).toMatchObject({ student_id: null });
  });
});

describe('money recorded outside the schedule blocks a save', () => {
  test('an online checkout on the course price (payment_info only) must be recorded first, by amount', async () => {
    const blocked = makeService(vidhya({ online: [{ amount_paid: 18000, razorpay_payment_id: 'pay_A' }, { amount_paid: 18000, razorpay_payment_id: 'pay_A' }] }));
    expect(await blocked.service.savePlan('1', { enrolId: '253', plan: fullOf(18000) })).toEqual({
      status: 0,
      message: 'This student has already paid ₹18,000 online for this course, but the schedule shows ₹0 paid; record it as a Paid instalment first.',
    });
    expect(blocked.committed).toEqual({ deletedIds: [], created: [], agreed: [] });
    // Recorded as a Paid row: the plan can now schedule the rest.
    const recorded = makeService(vidhya({
      online: [{ amount_paid: 18000, razorpay_payment_id: 'pay_A' }],
      rows: [sp({ id: 1001, installment_details: 'Course Fee', amount: 18000, status: 'Paid', paid_date: day('2026-10-02') })],
    }));
    const ok = await recorded.service.savePlan('1', { enrolId: '253', plan: { ...fullOf(20000), rows: [{ label: 'Balance', amount: 2000, dueDate: '2026-11-10' }] } });
    expect(ok.status).toBe(1);
  });

  test('application money must be covered by Paid rows of at least that amount', async () => {
    const paidLink = vidhya();
    const addEnrolmentApp = paidLink.apps[1];
    if (!addEnrolmentApp) throw new Error('fixture');
    addEnrolmentApp.payment_plan = JSON.stringify({ mode: 'full', total_amount_minor: 1500000, installments: [] });
    addEnrolmentApp.payment_status = 'paid';
    const short = makeService({ ...paidLink, rows: [sp({ id: 1001, amount: 5000, status: 'Paid', paid_date: day('2026-10-02') })] });
    const res = await short.service.savePlan('1', { enrolId: '253', plan: fullOf(18000) });
    expect(res).toEqual({
      status: 0,
      message: "This student has already paid ₹15,000 on this enrolment's application (TTII260300) for this course, but the schedule shows ₹5,000 paid; record it as a Paid instalment first.",
    });
    expect(short.committed).toEqual({ deletedIds: [], created: [], agreed: [] });

    const covered = makeService({ ...paidLink, rows: [sp({ id: 1001, installment_details: 'Course Fee', amount: 15000, status: 'Paid', paid_date: day('2026-10-02') })] });
    const ok = await covered.service.savePlan('1', { enrolId: '253', plan: { ...fullOf(18000), rows: [{ label: 'Balance', amount: 3000, dueDate: '2026-11-10' }] } });
    expect(ok.status).toBe(1);
  });

  test('a payment awaiting Finance approval, or an open payment link, blocks until it settles', async () => {
    const pending = vidhya();
    const pendingApp = pending.apps[1];
    if (!pendingApp) throw new Error('fixture');
    pendingApp.payment_status = 'pending_approval';
    pendingApp.payment_plan = JSON.stringify({ instalment_payments: [{ index: 0, status: 'pending_approval', amount_minor: 500000 }] });
    expect(String((await makeService(pending).service.savePlan('1', { enrolId: '253', plan: fullOf(18000) })).message)).toContain('waiting for Finance approval');

    const linked = vidhya();
    const linkApp = linked.apps[1];
    if (!linkApp) throw new Error('fixture');
    linkApp.payment_link_url = 'https://rzp.io/l/abc';
    linkApp.payment_link_id = 'plink_1';
    linkApp.payment_link_expires_at = new Date('2026-10-23T06:00:00.000Z');
    linkApp.payment_plan = JSON.stringify({ mode: 'full', total_amount_minor: 1500000, installments: [] });
    const open = await makeService(linked).service.savePlan('1', { enrolId: '253', plan: fullOf(18000) });
    expect(open).toEqual({
      status: 0,
      message: "A payment link from this enrolment's application (TTII260300) can still be paid until 23/10/2026. Cancel the payment link first, or wait until it is paid (the payment is then recorded automatically) or has expired.",
    });

    // Once the link has expired unpaid, nothing blocks.
    linkApp.payment_link_expires_at = new Date('2026-10-15T06:00:00.000Z');
    expect((await makeService(linked).service.savePlan('1', { enrolId: '253', plan: fullOf(18000) })).status).toBe(1);
  });
});
