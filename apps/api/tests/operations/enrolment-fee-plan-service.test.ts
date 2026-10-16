import { describe, expect, test } from 'vitest';

import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';

import { EnrolmentFeePlanService } from '../../src/operations/enrolment-fee-plan-service.js';

// Per-enrolment payment plans for ADDITIONAL enrolments (TTII 2026-10-16).
// VIDHYA SHANKAR KS (users.id 228) holds her original course 16 through her
// application, and course 25 through Add Enrolment (enrol 253). The plan for
// course 25 is written straight to student_payments for (228, 25).
//
// The fake database below models what matters for money: a transaction's
// writes are committed only when it returns (a throw rolls everything back),
// and the guarded soft-delete re-checks each row's state when it runs.

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
  /** Runs between the locked read and the guarded soft-delete (a racing writer). */
  beforeUpdate?: (rows: FakeRow[]) => void;
}

const UNPAID = new Set(['', 'pending', 'overdue', 'due']);

const isSqlFragment = (v: unknown): v is { values: unknown[]; strings: string[] } => (
  typeof v === 'object' && v !== null && Array.isArray((v as { values?: unknown }).values) && Array.isArray((v as { strings?: unknown }).strings)
);

// Sanity: the helper recognises what Prisma.join really produces.
if (!isSqlFragment(Prisma.join([1, 2]))) throw new Error('Prisma.join shape changed');

function makeService(world: World) {
  const committed = { deletedIds: [] as number[], created: [] as Array<Record<string, unknown>> };
  const sql: string[] = [];

  const scheduleFor = (userId: number, courseId: number) => world.rows
    .filter((r) => !r.deleted && r.user_id === userId && r.course_id === courseId)
    .map((r) => ({ ...r }));

  const readQuery = (strings: TemplateStringsArray, ...values: unknown[]) => {
    sql.push(strings.join('?'));
    return Promise.resolve(scheduleFor(Number(values[0]), Number(values[1])));
  };

  const base = {
    enrol: { findFirst: ({ where }: { where: { id: number } }) => Promise.resolve(world.enrols.find((e) => e.id === where.id) ?? null) },
    users: { findFirst: () => Promise.resolve(world.student) },
    applications: {
      findFirst: ({ where }: { where: { id?: number; user_email?: string } }) => {
        const hit = where.id != null ? world.apps.find((a) => a.id === where.id) : world.apps.filter((a) => a.user_email === where.user_email).at(-1);
        return Promise.resolve(hit ? { id: hit.id, course_id: hit.course_id } : null);
      },
      findMany: ({ where }: { where: { course_id: { in: number[] } } }) => Promise.resolve(
        world.apps
          .filter((a) => where.course_id.in.includes(a.course_id))
          .filter((a) => a.student_id === world.student.id || a.id === world.student.application_id
            || (a.user_email === world.student.user_email && (a.stage === 'enrolled' || a.is_converted === 1)))
          .sort((x, y) => y.id - x.id),
      ),
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
    $queryRaw: readQuery,
  };

  const prisma = {
    ...base,
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const pending = { deletedIds: [] as number[], created: [] as Array<Record<string, unknown>> };
      const tx = {
        ...base,
        $queryRaw: readQuery,
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

function vidhya(over: Partial<World> = {}): World {
  return {
    enrols: [
      { id: 252, user_id: 228, course_id: 16, enrollment_id: 'TIDMTT26060228' },
      { id: 253, user_id: 228, course_id: 25, enrollment_id: 'TIDMTT26100228' },
    ],
    student: { id: 228, name: 'VIDHYA SHANKAR KS', user_email: 'vidhya@example.com', application_id: 100 },
    apps: [
      { id: 100, application_id: 'TTII260100', course_id: 16, student_id: 228, user_email: 'vidhya@example.com', stage: 'enrolled', is_converted: 1, offering_id: 60, certificate_combination_id: 1, application_final_fee: 30000, payment_plan: null, payment_status: 'paid', payment_link_url: null },
      // Add Enrolment's application: no student_id, linked by email + course.
      { id: 300, application_id: 'TTII260300', course_id: 25, student_id: null, user_email: 'vidhya@example.com', stage: 'enrolled', is_converted: 1, offering_id: 70, certificate_combination_id: 4, application_final_fee: 15000, payment_plan: null, payment_status: null, payment_link_url: null },
    ],
    offerings: [{ id: 70, course_id: 25, title: 'AI Educator - Oct 2026', offering_code: null, fee_category: 'paid', base_fee: null, discount: null, offered_fee: null, pricing_amount: null }],
    packages: [{ offering_id: 70, combination_id: 4, fee_category: 'paid', base_fee: 20000, discount: 2000, offered_fee: null, gst_percent: 18 }],
    courses: [{ id: 25, title: 'Certification in Ai - Early Childhood Educator', total_amount: null, sale_price: 0 }],
    rows: [],
    orderNotes: [],
    ...over,
  };
}

describe('reading the plan of an additional enrolment', () => {
  test("prefills from the enrolment's offering package and shows the fee entered at Add Enrolment", async () => {
    const { service } = makeService(vidhya());
    const res = await service.getPlan('253');
    expect(res.status).toBe(1);
    expect(res.data).toMatchObject({
      enrol_id: 253, user_id: 228, course_id: 25, enrollment_id: 'TIDMTT26100228', student_name: 'VIDHYA SHANKAR KS',
      course_title: 'Certification in Ai - Early Childhood Educator',
      prefill: { total_fee: 20000, discount: 2000, gst_percent: 18, source: 'offering' },
      agreed_fee: 15000,
      free_offering: false,
      application_payment: { application_code: 'TTII260300', received: 0, paid: false },
      rows: [],
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
    const rows = (res.data as { rows: Array<Record<string, unknown>> }).rows;
    expect(rows.map((r) => [r.id, r.locked, r.lock_reason])).toEqual([[1001, true, 'paid'], [1002, false, null], [1003, true, 'checkout']]);
    expect(rows[0]).toMatchObject({ amount: 2000, due_date: '2026-11-01', paid_date: '2026-10-01', status: 'Paid' });
  });

  test("the student's original course is refused: it keeps the application-wide plan", async () => {
    const { service } = makeService(vidhya());
    expect(await service.getPlan('252')).toEqual({
      status: 0,
      message: "This is the student's original course. Its fee is planned with Generate / Edit Payment Plan on the student's application.",
    });
  });

  test('a student with no application can plan every enrolment; nothing resolvable prefills blank', async () => {
    const { service } = makeService(vidhya({
      student: { id: 228, name: 'Legacy', user_email: '', application_id: 0 },
      apps: [],
      offerings: [],
      packages: [],
    }));
    const res = await service.getPlan('252');
    expect(res.status).toBe(1);
    expect(res.data).toMatchObject({ prefill: { total_fee: null, source: null }, agreed_fee: null, application_payment: null });
  });

  test('unknown enrolments are refused', async () => {
    const { service } = makeService(vidhya());
    expect(await service.getPlan('999')).toEqual({ status: 0, message: 'Enrolment not found.' });
    expect(await service.getPlan('abc')).toEqual({ status: 0, message: 'Invalid enrolment id.' });
  });
});

describe('saving the plan of an additional enrolment', () => {
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
    expect(res).toEqual({ status: 1, message: 'Payment plan saved.', data: { created: 2, replaced: 1, kept: 2, payable: 18000 } });
    expect(committed.deletedIds).toEqual([1002]);
    expect(committed.created).toEqual([
      expect.objectContaining({ user_id: 228, course_id: 25, installment_details: 'Installment 2', amount: 5500, due_date: day('2026-11-10'), status: 'Pending', paid_date: null, payment_to: 'ttii', created_by: 1, updated_by: 1 }),
      expect.objectContaining({ user_id: 228, course_id: 25, installment_details: 'Installment 3', amount: 5500, due_date: day('2026-12-10'), status: 'Pending' }),
    ]);
    // The schedule is read FOR UPDATE inside the transaction.
    expect(sql.some((s) => s.includes('FOR UPDATE'))).toBe(true);
  });

  test("a counsellor's recorded cash collection (Pending, mode set) is kept and counted, never replaced", async () => {
    const { service, committed } = makeService(vidhya({
      rows: [
        // addAdditionalEnrolment's non-admin manual branch: Pending + mode, reference in payment_to.
        sp({ id: 1010, installment_details: 'Full course fee', amount: 6000, payment_mode: 'Cash' }),
        sp({ id: 1011 }),
      ],
    }));
    const res = await service.savePlan('1', {
      enrolId: '253',
      plan: { mode: 'full', totalFee: 18000, discount: 0, gstPercent: 0, rows: [{ label: '', amount: 12000, dueDate: '2026-11-10' }] },
    });
    expect(res).toMatchObject({ status: 1, data: { created: 1, replaced: 1, kept: 1 } });
    expect(committed.deletedIds).toEqual([1011]);
  });

  test('full payment on an empty schedule: one Course Fee row for the GST-inclusive total', async () => {
    const { service, committed } = makeService(vidhya());
    const res = await service.savePlan('8', {
      enrolId: '253',
      plan: { mode: 'full', totalFee: 10000, discount: 0, gstPercent: 18, rows: [{ label: '', amount: 11800, dueDate: '2026-10-31' }] },
    });
    expect(res.status).toBe(1);
    expect(committed.deletedIds).toEqual([]);
    expect(committed.created).toEqual([expect.objectContaining({ installment_details: 'Course Fee', amount: 11800, due_date: day('2026-10-31'), created_by: 8 })]);
  });

  test('totals that do not add up are refused and nothing is written', async () => {
    const { service, committed } = makeService(vidhya({ rows: [sp({ id: 1002 })] }));
    const res = await service.savePlan('1', { enrolId: '253', plan: { ...twoInstalments, rows: [{ label: 'X', amount: 1000, dueDate: '2026-11-10' }] } });
    expect(res).toEqual({ status: 0, message: 'The rows add up to ₹1,000 but ₹18,000 is left to schedule (payable ₹18,000).' });
    expect(committed).toEqual({ deletedIds: [], created: [] });
  });

  test('a row paid between the read and the write aborts the whole save (rolled back)', async () => {
    const { service, committed } = makeService(vidhya({
      rows: [sp({ id: 1002 }), sp({ id: 1004 })],
      // A checkout completes on 1004 while the admin is saving.
      beforeUpdate: (rows) => {
        const r = rows.find((x) => x.id === 1004);
        if (r) { r.status = 'Paid'; r.paid_date = day('2026-10-16'); }
      },
    }));
    const res = await service.savePlan('1', {
      enrolId: '253',
      plan: { mode: 'full', totalFee: 18000, discount: 0, gstPercent: 0, rows: [{ label: '', amount: 18000, dueDate: '2026-11-10' }] },
    });
    expect(res).toEqual({ status: 0, message: 'The fee schedule changed while you were editing it. Reload and try again.' });
    expect(committed).toEqual({ deletedIds: [], created: [] });
  });

  test("the student's original course is refused without touching anything", async () => {
    const { service, committed } = makeService(vidhya());
    const res = await service.savePlan('1', { enrolId: '252', plan: twoInstalments });
    expect(res.status).toBe(0);
    expect(committed).toEqual({ deletedIds: [], created: [] });
  });

  test('money recorded on the enrolment application but missing from the schedule blocks the plan', async () => {
    const paidLink = vidhya();
    const addEnrolmentApp = paidLink.apps[1];
    if (!addEnrolmentApp) throw new Error('fixture');
    addEnrolmentApp.payment_plan = JSON.stringify({ mode: 'full', total_amount_minor: 1500000, installments: [] });
    addEnrolmentApp.payment_status = 'paid';
    const blocked = makeService(paidLink);
    const res = await blocked.service.savePlan('1', { enrolId: '253', plan: twoInstalments });
    expect(res.status).toBe(0);
    expect(String(res.message)).toContain('A payment of ₹15,000 is recorded on this enrolment\'s application (TTII260300)');
    expect(blocked.committed).toEqual({ deletedIds: [], created: [] });

    // Once the payment is in the schedule as a Paid row, the plan saves.
    const recorded = makeService({ ...paidLink, rows: [sp({ id: 1001, installment_details: 'Course Fee', amount: 15000, status: 'Paid', paid_date: day('2026-10-02') })] });
    const ok = await recorded.service.savePlan('1', {
      enrolId: '253',
      plan: { mode: 'full', totalFee: 18000, discount: 0, gstPercent: 0, rows: [{ label: 'Balance', amount: 3000, dueDate: '2026-11-10' }] },
    });
    expect(ok.status).toBe(1);
    expect(recorded.committed.created).toEqual([expect.objectContaining({ installment_details: 'Balance', amount: 3000 })]);
  });

  test('nothing to change is refused', async () => {
    const { service, committed } = makeService(vidhya({ rows: [sp({ id: 1001, amount: 18000, status: 'Paid', paid_date: day('2026-10-01') })] }));
    const res = await service.savePlan('1', { enrolId: '253', plan: { mode: 'full', totalFee: 18000, discount: 0, gstPercent: 0, rows: [] } });
    expect(res).toEqual({ status: 0, message: 'Nothing to change: the kept instalments already cover the payable total.' });
    expect(committed).toEqual({ deletedIds: [], created: [] });
  });

  test('bad input is refused before any read', async () => {
    const { service } = makeService(vidhya());
    expect(await service.savePlan('0', { enrolId: '253', plan: twoInstalments })).toEqual({ status: 0, message: 'Invalid user.' });
    expect(await service.savePlan('1', { enrolId: '253', plan: { ...twoInstalments, totalFee: 0 } })).toEqual({ status: 0, message: 'Enter the total fee.' });
  });
});
