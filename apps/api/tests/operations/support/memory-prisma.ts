import type { PrismaClient } from '@prisma/client';

// A small in-memory stand-in for the Prisma client, for service tests that
// read and write several exam tables together (supplementary exams: create,
// publish, results, calendar, Exams list). It models only what those services
// use: equality (null included), in / notIn / not / gte / lte / gt / lt /
// startsWith, OR / AND / NOT, orderBy, take, select (shallow), _count groupBy,
// skipDuplicates on the tables' unique keys, and an interactive $transaction
// that runs on the same data (no rollback is modelled — tests that need "no
// writes" check the tables after a refusal that happens before any write).

type Row = Record<string, unknown>;
type Where = Record<string, unknown>;

const UNIQUE: Record<string, string[]> = {
  exam_student_allocations: ['exam_id', 'user_id'],
  exam_courses: ['exam_id', 'course_id'],
  exam_offerings: ['exam_id', 'offering_id'],
};

const PRIMARY: Record<string, string> = { exam_supplementary: 'exam_id' };

function sameValue(a: unknown, b: unknown): boolean {
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  return a === b;
}

function compare(a: unknown, b: unknown): number {
  const x = a instanceof Date ? a.getTime() : a;
  const y = b instanceof Date ? b.getTime() : b;
  if (x === y) return 0;
  if (x === null || x === undefined) return -1;
  if (y === null || y === undefined) return 1;
  return (x as number) < (y as number) ? -1 : 1;
}

function matchesField(value: unknown, cond: unknown): boolean {
  if (cond === null || cond instanceof Date || typeof cond !== 'object') return sameValue(value ?? null, cond);
  const c = cond as Record<string, unknown>;
  if ('in' in c && !(c.in as unknown[]).some((v) => sameValue(v, value))) return false;
  if ('notIn' in c && (c.notIn as unknown[]).some((v) => sameValue(v, value))) return false;
  if ('not' in c && matchesField(value, c.not)) return false;
  if ('equals' in c && !sameValue(value, c.equals)) return false;
  if ('gte' in c && (value === null || value === undefined || compare(value, c.gte) < 0)) return false;
  if ('lte' in c && (value === null || value === undefined || compare(value, c.lte) > 0)) return false;
  if ('gt' in c && (value === null || value === undefined || compare(value, c.gt) <= 0)) return false;
  if ('lt' in c && (value === null || value === undefined || compare(value, c.lt) >= 0)) return false;
  if ('startsWith' in c && !(typeof value === 'string' && value.startsWith(String(c.startsWith)))) return false;
  return true;
}

export function matches(row: Row, where: Where | undefined): boolean {
  if (!where) return true;
  for (const [key, cond] of Object.entries(where)) {
    if (cond === undefined) continue;
    if (key === 'OR') { if (!(cond as Where[]).some((w) => matches(row, w))) return false; continue; }
    if (key === 'AND') { if (!(Array.isArray(cond) ? cond : [cond]).every((w) => matches(row, w as Where))) return false; continue; }
    if (key === 'NOT') { if ((Array.isArray(cond) ? cond : [cond]).some((w) => matches(row, w as Where))) return false; continue; }
    if (!matchesField(row[key], cond)) return false;
  }
  return true;
}

function pick(row: Row, select: Record<string, unknown> | undefined): Row {
  if (!select) return { ...row };
  const out: Row = {};
  for (const [k, on] of Object.entries(select)) if (on) out[k] = row[k] ?? null;
  return out;
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

/** The tables tests read back directly (any other table still works through `prisma`). */
export type TableName =
  | 'exam' | 'exam_subjects' | 'exam_subject_components' | 'exam_student_allocations' | 'exam_courses'
  | 'exam_offerings' | 'exam_questions' | 'exam_attempt' | 'exam_supplementary' | 'exam_re_examinations'
  | 'question_bank' | 'users' | 'course';

export interface MemoryDb {
  prisma: PrismaClient;
  tables: Record<TableName, Row[]>;
  /** Tables that answer every call with Prisma P2021 (migration not run). */
  missing: Set<string>;
}

export function memoryPrisma(seed: Record<string, Row[]> = {}): MemoryDb {
  const tables: Record<string, Row[]> = {};
  const nextId: Record<string, number> = {};
  const missing = new Set<string>();
  const table = (name: string): Row[] => {
    if (missing.has(name)) throw Object.assign(new Error(`The table \`${name}\` does not exist in the current database.`), { code: 'P2021' });
    tables[name] ??= [];
    return tables[name];
  };
  for (const [name, rows] of Object.entries(seed)) {
    tables[name] = rows.map((r) => ({ ...r }));
    nextId[name] = Math.max(0, ...rows.map((r) => Number(r.id ?? 0))) + 1;
  }
  const insert = (name: string, data: Row): Row => {
    const rows = table(name);
    const pk = PRIMARY[name];
    if (pk && rows.some((r) => sameValue(r[pk], data[pk]))) throw Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
    if (pk) {
      rows.push({ ...data });
      return rows[rows.length - 1] as Row;
    }
    const id = data.id === undefined ? nextId[name] ?? 1 : Number(data.id);
    nextId[name] = Math.max(nextId[name] ?? 1, id + 1);
    const row: Row = { ...data, id };
    rows.push(row);
    return row;
  };
  // Every call answers with a promise, a missing table (P2021) included.
  const run = <T>(fn: () => T): Promise<T> => {
    try {
      return Promise.resolve(fn());
    } catch (error: unknown) {
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }
  };
  const delegate = (name: string) => ({
    findMany: (args: { where?: Where; select?: Record<string, unknown>; orderBy?: unknown; take?: number } = {}) => run(() => {
      const rows = sortRows(table(name).filter((r) => matches(r, args.where)), args.orderBy);
      return (args.take ? rows.slice(0, args.take) : rows).map((r) => pick(r, args.select));
    }),
    findFirst: (args: { where?: Where; select?: Record<string, unknown>; orderBy?: unknown } = {}) => run(() => {
      const row = sortRows(table(name).filter((r) => matches(r, args.where)), args.orderBy)[0];
      return row ? pick(row, args.select) : null;
    }),
    findUnique: (args: { where?: Where; select?: Record<string, unknown> } = {}) => run(() => {
      const row = table(name).find((r) => matches(r, args.where));
      return row ? pick(row, args.select) : null;
    }),
    count: (args: { where?: Where } = {}) => run(() => table(name).filter((r) => matches(r, args.where)).length),
    groupBy: (args: { by: string[]; where?: Where; _count?: Record<string, boolean> }) => run(() => {
      const groups = new Map<string, Row[]>();
      for (const r of table(name).filter((row) => matches(row, args.where))) {
        const key = JSON.stringify(args.by.map((b) => r[b] ?? null));
        groups.set(key, [...(groups.get(key) ?? []), r]);
      }
      return [...groups.values()].map((rows) => {
        const first = rows[0] as Row;
        const out: Row = Object.fromEntries(args.by.map((b) => [b, first[b] ?? null]));
        if (args._count) out._count = Object.fromEntries(Object.keys(args._count).map((k) => [k, rows.length]));
        return out;
      });
    }),
    create: (args: { data: Row }) => run(() => ({ ...insert(name, args.data) })),
    createMany: (args: { data: Row[]; skipDuplicates?: boolean }) => run(() => {
      const unique = UNIQUE[name];
      let count = 0;
      for (const data of args.data) {
        if (unique && table(name).some((r) => unique.every((k) => sameValue(r[k], data[k])))) {
          if (args.skipDuplicates) continue;
          throw Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
        }
        insert(name, data);
        count += 1;
      }
      return { count };
    }),
    update: (args: { where: Where; data: Row }) => run(() => {
      const row = table(name).find((r) => matches(r, args.where));
      if (!row) throw Object.assign(new Error('Record not found'), { code: 'P2025' });
      Object.assign(row, args.data);
      return { ...row };
    }),
    updateMany: (args: { where?: Where; data: Row }) => run(() => {
      const hit = table(name).filter((r) => matches(r, args.where));
      for (const r of hit) Object.assign(r, args.data);
      return { count: hit.length };
    }),
    deleteMany: (args: { where?: Where } = {}) => run(() => {
      const rows = table(name);
      const keep = rows.filter((r) => !matches(r, args.where));
      tables[name] = keep;
      return { count: rows.length - keep.length };
    }),
  });
  const cache = new Map<string, ReturnType<typeof delegate>>();
  const client: Record<string, unknown> = {};
  const prisma = new Proxy(client, {
    get(_target, prop: string) {
      if (prop === '$transaction') {
        return (arg: unknown) => (typeof arg === 'function' ? (arg as (tx: unknown) => unknown)(prisma) : Promise.all(arg as Promise<unknown>[]));
      }
      if (prop === 'then') return undefined;
      if (!cache.has(prop)) cache.set(prop, delegate(prop));
      return cache.get(prop);
    },
  }) as unknown as PrismaClient;
  const view = new Proxy(tables, { get: (t, p: string) => t[p] ?? [] }) as unknown as Record<TableName, Row[]>;
  return { prisma, tables: view, missing };
}
