import type { PrismaClient } from '@prisma/client';

import { matches } from './memory-prisma.js';

// In-memory Prisma stand-in for the Centres v2 onboarding / affiliation
// services. Unlike memory-prisma.ts it models what these services lean on:
// UNIQUE indexes (P2002 on create / update / updateMany, NULLs never clash),
// interactive transactions that ROLL BACK when the callback throws, tables
// that are "not migrated" (P2021), and a hook that runs before each
// updateMany so a test can slip a concurrent write in between a read and a
// claim.

type Row = Record<string, unknown>;
type Where = Record<string, unknown>;

const UNIQUE: Record<string, string[][]> = {
  centre_onboarding: [['ref_no'], ['link_token_hash'], ['centre_code']],
  centre_agreements: [['agreement_no']],
  centre_affiliation_certificates: [['certificate_no']],
};
const PRIMARY: Record<string, string> = { centre_kyc: 'centre_id' };

function compare(a: unknown, b: unknown): number {
  const x = a instanceof Date ? a.getTime() : a;
  const y = b instanceof Date ? b.getTime() : b;
  if (x === y) return 0;
  if (x === null || x === undefined) return -1;
  if (y === null || y === undefined) return 1;
  return (x as number) < (y as number) ? -1 : 1;
}

function sortRows(rows: Row[], orderBy: unknown): Row[] {
  const keys = (Array.isArray(orderBy) ? orderBy : orderBy ? [orderBy] : []) as Array<Record<string, 'asc' | 'desc'>>;
  if (keys.length === 0) return rows;
  return [...rows].sort((a, b) => {
    for (const k of keys) {
      const [field, dir] = Object.entries(k)[0] ?? ['id', 'asc'];
      const c = compare(a[field], b[field]);
      if (c !== 0) return dir === 'desc' ? -c : c;
    }
    return 0;
  });
}

function pick(row: Row, select: Record<string, unknown> | undefined): Row {
  if (!select) return { ...row };
  const out: Row = {};
  for (const [k, on] of Object.entries(select)) if (on) out[k] = row[k] ?? null;
  return out;
}

const p2002 = (target: string) => Object.assign(new Error(`Unique constraint failed on ${target}`), { code: 'P2002', meta: { target } });

/** The tables tests read back directly (any other table still works through `prisma`). */
export type TableName =
  | 'centre_onboarding' | 'centre_onboarding_events' | 'centre_agreements' | 'centre_affiliation_certificates'
  | 'centre_kyc' | 'centres' | 'users';

export interface OnboardingDb {
  prisma: PrismaClient;
  tables: Record<TableName, Row[]>;
  missing: Set<string>;
  /** Runs before every updateMany (table, where) — simulate a concurrent writer here. */
  beforeUpdateMany: ((table: string, where: Where) => void) | null;
  /** A row another connection COMMITTED: it survives a rollback of the transaction in flight. */
  insertCommitted: (table: TableName, row: Row) => void;
  count: (table: string) => number;
}

export function onboardingDb(seed: Record<string, Row[]> = {}): OnboardingDb {
  let tables: Record<string, Row[]> = {};
  const nextId: Record<string, number> = {};
  const missing = new Set<string>();
  for (const [name, rows] of Object.entries(seed)) {
    tables[name] = rows.map((r) => ({ ...r }));
    nextId[name] = Math.max(0, ...rows.map((r) => Number(r.id ?? 0))) + 1;
  }
  const table = (name: string): Row[] => {
    if (missing.has(name)) throw Object.assign(new Error(`The table \`${name}\` does not exist in the current database.`), { code: 'P2021' });
    tables[name] ??= [];
    return tables[name];
  };
  const checkUnique = (name: string, candidate: Row, self: Row | null) => {
    for (const cols of UNIQUE[name] ?? []) {
      if (cols.some((c) => candidate[c] === null || candidate[c] === undefined)) continue;
      const clash = table(name).some((r) => r !== self && cols.every((c) => compare(r[c], candidate[c]) === 0));
      if (clash) throw p2002(cols.join(','));
    }
    const pk = PRIMARY[name];
    if (pk && table(name).some((r) => r !== self && compare(r[pk], candidate[pk]) === 0)) throw p2002(pk);
  };
  const run = <T>(fn: () => T): Promise<T> => {
    try {
      return Promise.resolve(fn());
    } catch (error: unknown) {
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }
  };
  const state = { beforeUpdateMany: null as OnboardingDb['beforeUpdateMany'], snapshot: null as Record<string, Row[]> | null };
  let queue: Promise<void> = Promise.resolve();

  const delegate = (name: string) => ({
    findMany: (args: { where?: Where; select?: Record<string, unknown>; orderBy?: unknown; take?: number } = {}) => run(() => {
      const rows = sortRows(table(name).filter((r) => matches(r, args.where)), args.orderBy);
      return (args.take ? rows.slice(0, args.take) : rows).map((r) => pick(r, args.select));
    }),
    findFirst: (args: { where?: Where; select?: Record<string, unknown>; orderBy?: unknown } = {}) => run(() => {
      const row = sortRows(table(name).filter((r) => matches(r, args.where)), args.orderBy)[0];
      return row ? pick(row, args.select) : null;
    }),
    count: (args: { where?: Where } = {}) => run(() => table(name).filter((r) => matches(r, args.where)).length),
    create: (args: { data: Row; select?: Record<string, unknown> }) => run(() => {
      const pk = PRIMARY[name];
      const data: Row = { ...args.data };
      if (!pk) {
        const id = data.id === undefined ? nextId[name] ?? 1 : Number(data.id);
        data.id = id;
      }
      checkUnique(name, data, null);
      if (!pk) nextId[name] = Math.max(nextId[name] ?? 1, Number(data.id) + 1);
      table(name).push(data);
      return pick(data, args.select);
    }),
    update: (args: { where: Where; data: Row; select?: Record<string, unknown> }) => run(() => {
      const row = table(name).find((r) => matches(r, args.where));
      if (!row) throw Object.assign(new Error('Record to update not found.'), { code: 'P2025' });
      checkUnique(name, { ...row, ...args.data }, row);
      Object.assign(row, args.data);
      return pick(row, args.select);
    }),
    updateMany: (args: { where?: Where; data: Row }) => run(() => {
      state.beforeUpdateMany?.(name, args.where ?? {});
      const hit = table(name).filter((r) => matches(r, args.where));
      for (const r of hit) checkUnique(name, { ...r, ...args.data }, r);
      for (const r of hit) Object.assign(r, args.data);
      return { count: hit.length };
    }),
  });

  const cache = new Map<string, ReturnType<typeof delegate>>();
  const prisma: PrismaClient = new Proxy({}, {
    get(_target, prop: string) {
      if (prop === '$transaction') {
        return async (fn: unknown) => {
          if (typeof fn !== 'function') return Promise.all(fn as Array<Promise<unknown>>);
          // Transactions run one at a time (a real database would make the
          // second claim wait on the first's row lock), so a rollback never
          // undoes another transaction's committed writes.
          const previous = queue;
          let release = () => undefined as void;
          queue = new Promise<void>((resolve) => { release = resolve; });
          await previous;
          const snapshot = Object.fromEntries(Object.entries(tables).map(([k, rows]) => [k, rows.map((r) => ({ ...r }))]));
          const ids = { ...nextId };
          state.snapshot = snapshot;
          try {
            return await (fn as (tx: unknown) => Promise<unknown>)(prisma);
          } catch (error: unknown) {
            tables = snapshot;
            Object.assign(nextId, ids);
            throw error;
          } finally {
            state.snapshot = null;
            release();
          }
        };
      }
      if (prop === 'then') return undefined;
      if (!cache.has(prop)) cache.set(prop, delegate(prop));
      return cache.get(prop);
    },
  }) as unknown as PrismaClient;

  const db: OnboardingDb = {
    prisma,
    get tables() { return new Proxy({}, { get: (_t, p: string) => tables[p] ?? [] }) as Record<TableName, Row[]>; },
    missing,
    get beforeUpdateMany() { return state.beforeUpdateMany; },
    set beforeUpdateMany(fn) { state.beforeUpdateMany = fn; },
    count: (name: string) => (tables[name] ?? []).length,
    insertCommitted: (name: TableName, row: Row) => {
      table(name).push({ ...row });
      if (state.snapshot) (state.snapshot[name] ??= []).push({ ...row });
    },
  };
  return db;
}
