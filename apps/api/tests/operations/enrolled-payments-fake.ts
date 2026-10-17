import type { PrismaClient } from '@prisma/client';

// A Prisma stand-in for the money paths of an enrolled student's application
// (TTII 2026-10-17): the Razorpay link webhook, Finance approval, the plan
// tool, Add Instalment and payment-link cancelling. It behaves like InnoDB
// where that matters: transactions run one at a time (the row lock that the
// application UPDATE takes) and their writes commit only when they return.

export interface FakeUser {
  id: number;
  role_id: number;
  name: string;
  email: string | null;
  user_email: string | null;
  application_id: number;
  deleted_at: Date | null;
}

export interface FakeEnrol {
  id: number;
  user_id: number;
  course_id: number;
  enrollment_id: string;
  deleted_at: Date | null;
}

export interface FakeApp {
  id: number;
  application_id: string;
  course_id: number | null;
  student_id: number | null;
  user_email: string | null;
  stage: string;
  is_converted: number;
  offering_id: number | null;
  certificate_combination_id: number | null;
  application_final_fee: number | null;
  payment_plan: string | null;
  payment_status: string | null;
  payment_method: string | null;
  payment_link_url: string | null;
  payment_link_id: string | null;
  payment_link_expires_at: Date | null;
  deleted_at: Date | null;
  [extra: string]: unknown;
}

export interface FakePaymentRow {
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
  payment_to: string | null;
  created_by: number | null;
  updated_by: number | null;
  deleted_at: Date | null;
}

export interface World {
  users: FakeUser[];
  enrols: FakeEnrol[];
  apps: FakeApp[];
  rows: FakePaymentRow[];
  /** student_payments writes inside a transaction throw (a failing schedule write). */
  failScheduleWrites?: boolean;
}

export interface FakeCalls {
  appWrites: Array<{ op: 'update' | 'updateMany'; where: Record<string, unknown>; data: Record<string, unknown>; inTx: boolean }>;
  scheduleWrites: Array<{ op: string; inTx: boolean; args: unknown }>;
  transactions: number;
  events: Array<Record<string, unknown>>;
}

type Where = Record<string, unknown>;

/** Prisma `where` semantics the code under test uses: equality (null too), `in`, OR. */
export function matches(row: Record<string, unknown>, where: Where | undefined): boolean {
  if (!where) return true;
  return Object.entries(where).every(([key, cond]) => {
    if (key === 'OR') return (cond as Where[]).some((w) => matches(row, w));
    if (cond !== null && typeof cond === 'object' && !(cond instanceof Date) && 'in' in cond) {
      return (cond as { in: unknown[] }).in.includes(row[key]);
    }
    return row[key] === cond;
  });
}

const clone = <T>(v: T): T => (v === null || v === undefined ? v : ({ ...v } as T));
const UNPAID = new Set(['', 'pending', 'overdue', 'due']);

interface State { apps: FakeApp[]; rows: FakePaymentRow[] }

export function makeFakePrisma(world: World): { prisma: PrismaClient; calls: FakeCalls } {
  const calls: FakeCalls = { appWrites: [], scheduleWrites: [], transactions: 0, events: [] };
  let queue: Promise<unknown> = Promise.resolve();
  let nextRowId = 5000;
  const live: State = {
    get apps() { return world.apps; },
    get rows() { return world.rows; },
  };

  const models = (state: State, inTx: boolean) => {
    const scheduleWrite = (op: string, args: unknown) => {
      if (inTx && world.failScheduleWrites) throw new Error('Lock wait timeout exceeded');
      calls.scheduleWrites.push({ op, inTx, args });
    };
    return {
      applications: {
        findFirst: ({ where }: { where: Where }) => Promise.resolve(clone(state.apps.find((a) => matches(a, where)) ?? null)),
        findMany: ({ where }: { where: Where }) => Promise.resolve(
          state.apps.filter((a) => matches(a, where)).sort((x, y) => y.id - x.id).map((a) => clone(a)),
        ),
        update: ({ where, data }: { where: { id: number }; data: Record<string, unknown> }) => {
          const app = state.apps.find((a) => a.id === where.id);
          if (!app) return Promise.reject(new Error('Record to update not found.'));
          Object.assign(app, data);
          calls.appWrites.push({ op: 'update', where, data, inTx });
          return Promise.resolve(clone(app));
        },
        updateMany: ({ where, data }: { where: Where; data: Record<string, unknown> }) => {
          const hits = state.apps.filter((a) => matches(a, where));
          for (const a of hits) Object.assign(a, data);
          if (hits.length > 0) calls.appWrites.push({ op: 'updateMany', where, data, inTx });
          return Promise.resolve({ count: hits.length });
        },
      },
      users: {
        findFirst: ({ where }: { where: Where }) => Promise.resolve(clone(world.users.find((u) => matches(u as unknown as Record<string, unknown>, where)) ?? null)),
        findMany: ({ where, take }: { where: Where; take?: number }) => Promise.resolve(
          world.users.filter((u) => matches(u as unknown as Record<string, unknown>, where)).slice(0, take ?? Infinity).map((u) => clone(u)),
        ),
      },
      enrol: {
        findFirst: ({ where }: { where: Where }) => Promise.resolve(clone(world.enrols.find((e) => matches(e as unknown as Record<string, unknown>, where)) ?? null)),
        findMany: ({ where }: { where: Where }) => Promise.resolve(world.enrols.filter((e) => matches(e as unknown as Record<string, unknown>, where)).map((e) => clone(e))),
      },
      student_payments: {
        updateMany: ({ where, data }: { where: Where; data: Record<string, unknown> }) => {
          scheduleWrite('updateMany', { where, data });
          const hits = state.rows.filter((r) => matches(r as unknown as Record<string, unknown>, where));
          for (const r of hits) Object.assign(r, data);
          return Promise.resolve({ count: hits.length });
        },
        createMany: ({ data }: { data: Array<Record<string, unknown>> }) => {
          scheduleWrite('createMany', data);
          for (const d of data) state.rows.push(newRow(d));
          return Promise.resolve({ count: data.length });
        },
        create: ({ data }: { data: Record<string, unknown> }) => {
          scheduleWrite('create', data);
          const row = newRow(data);
          state.rows.push(row);
          return Promise.resolve(clone(row));
        },
      },
      $queryRaw: (strings: TemplateStringsArray, ...values: unknown[]) => {
        const text = strings.join('?');
        if (text.includes('FROM create_order')) return Promise.resolve([]);
        if (!text.includes('FROM student_payments')) return Promise.reject(new Error(`unexpected SQL: ${text}`));
        const userId = Number(values[0]);
        const courseId = Number(values[1]);
        const mine = state.rows.filter((r) => r.user_id === userId && r.course_id === courseId);
        if (text.includes('reference_number = ?')) {
          return Promise.resolve(mine.filter((r) => r.reference_number === String(values[2])).slice(0, 1).map((r) => ({ id: r.id })));
        }
        if (text.includes('amount = ?')) {
          const amount = Number(values[2]);
          const hit = mine
            .filter((r) => r.deleted_at === null && UNPAID.has((r.status ?? '').trim().toLowerCase()) && r.paid_date === null
              && (r.reference_number ?? '').trim() === '' && (r.receipt_url ?? '').trim() === '' && r.amount === amount)
            .sort((a, b) => (a.due_date === null ? 1 : 0) - (b.due_date === null ? 1 : 0)
              || (a.due_date?.getTime() ?? 0) - (b.due_date?.getTime() ?? 0) || a.id - b.id);
          return Promise.resolve(hit.slice(0, 1).map((r) => ({ id: r.id })));
        }
        // The schedule read.
        return Promise.resolve(mine.filter((r) => r.deleted_at === null).sort((a, b) => a.id - b.id).map((r) => ({ ...r })));
      },
      create_order: { findMany: () => Promise.resolve([]) },
      payment_info: { findMany: () => Promise.resolve([]) },
      offerings: { findMany: () => Promise.resolve([]) },
      offering_certificate_packages: { findMany: () => Promise.resolve([]) },
      course_fees: { findMany: () => Promise.resolve([]) },
      course: { findMany: () => Promise.resolve([]) },
      certificate_combinations: { findMany: () => Promise.resolve([]) },
      application_events: {
        create: ({ data }: { data: Record<string, unknown> }) => { calls.events.push(data); return Promise.resolve({ id: calls.events.length }); },
      },
    };
  };

  const newRow = (d: Record<string, unknown>): FakePaymentRow => {
    nextRowId += 1;
    return {
      id: nextRowId,
      user_id: Number(d.user_id),
      course_id: Number(d.course_id),
      installment_details: (d.installment_details as string | null | undefined) ?? null,
      amount: (d.amount as number | null | undefined) ?? null,
      status: (d.status as string | null | undefined) ?? null,
      due_date: (d.due_date as Date | null | undefined) ?? null,
      paid_date: (d.paid_date as Date | null | undefined) ?? null,
      payment_mode: (d.payment_mode as string | null | undefined) ?? null,
      reference_number: (d.reference_number as string | null | undefined) ?? null,
      receipt_url: (d.receipt_url as string | null | undefined) ?? null,
      payment_to: (d.payment_to as string | null | undefined) ?? null,
      created_by: (d.created_by as number | null | undefined) ?? null,
      updated_by: (d.updated_by as number | null | undefined) ?? null,
      deleted_at: null,
    };
  };

  const base = models(live, false);
  const prisma = {
    ...base,
    $transaction: (fn: (tx: unknown) => Promise<unknown>) => {
      const run = async () => {
        calls.transactions += 1;
        const staged: State = { apps: world.apps.map((a) => clone(a)), rows: world.rows.map((r) => clone(r)) };
        const result = await fn(models(staged, true));
        world.apps = staged.apps;
        world.rows = staged.rows;
        return result;
      };
      const p = queue.then(run, run);
      queue = p.then(() => undefined, () => undefined);
      return p;
    },
  } as unknown as PrismaClient;
  return { prisma, calls };
}
