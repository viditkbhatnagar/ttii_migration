// A tiny in-memory stand-in for the Prisma tables the Credential delivery
// services touch: equality / in / gt / not-null / OR filters, id ordering,
// autoincrement ids, unique columns (P2002) and $transaction (no rollback is
// needed: refusals are checked before anything is written in these tests).

type Row = Record<string, unknown>;
type Where = Record<string, unknown>;

function matches(row: Row, where: Where | undefined): boolean {
  if (!where) return true;
  return Object.entries(where).every(([key, cond]) => {
    if (key === 'OR') return (cond as Where[]).some((w) => matches(row, w));
    const value = row[key];
    if (cond !== null && typeof cond === 'object' && !(cond instanceof Date)) {
      const c = cond as Record<string, unknown>;
      if ('in' in c) return (c.in as unknown[]).includes(value);
      if ('gt' in c) return typeof value === 'number' && value > (c.gt as number);
      if ('not' in c) return c.not === null ? value !== null && value !== undefined : value !== c.not;
      return true;
    }
    return (value ?? null) === (cond ?? null);
  });
}

export class FakeTable {
  rows: Row[] = [];
  private next = 1;
  constructor(private readonly unique: string[] = []) {}

  private checkUnique(data: Row, ignoreId?: unknown): void {
    for (const col of this.unique) {
      const v = data[col];
      if (v !== null && v !== undefined && this.rows.some((r) => r[col] === v && r.id !== ignoreId)) {
        throw Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
      }
    }
  }

  seed(row: Row): Row {
    const full = { id: this.next++, ...row };
    if (typeof row.id === 'number') this.next = Math.max(this.next, row.id + 1);
    this.rows.push({ ...full, id: typeof row.id === 'number' ? row.id : full.id });
    return this.rows[this.rows.length - 1] as Row;
  }

  findMany(args: { where?: Where; orderBy?: Row | Row[]; take?: number } = {}): Promise<Row[]> {
    let out = this.rows.filter((r) => matches(r, args.where));
    const order = Array.isArray(args.orderBy) ? args.orderBy[0] : args.orderBy;
    const [col, dir] = order ? (Object.entries(order)[0] as [string, string]) : ['id', 'asc'];
    out = [...out].sort((a, b) => {
      const x = a[col] as string | number, y = b[col] as string | number;
      return (x < y ? -1 : x > y ? 1 : 0) * (dir === 'desc' ? -1 : 1);
    });
    return Promise.resolve(args.take ? out.slice(0, args.take) : out);
  }
  findFirst(args: { where?: Where; orderBy?: Row } = {}): Promise<Row | null> {
    return this.findMany(args).then((r) => r[0] ?? null);
  }
  findUnique(args: { where: Where }): Promise<Row | null> {
    return Promise.resolve(this.rows.find((r) => matches(r, args.where)) ?? null);
  }
  create(args: { data: Row }): Promise<Row> {
    this.checkUnique(args.data);
    const row = { id: this.next++, created_at: new Date(), read_at: null, email_status: 'not_sent', ...args.data };
    this.rows.push(row);
    return Promise.resolve(row);
  }
  update(args: { where: Where; data: Row }): Promise<Row> {
    const row = this.rows.find((r) => matches(r, args.where));
    if (!row) return Promise.reject(new Error('not found'));
    this.checkUnique({ ...row, ...args.data }, row.id);
    Object.assign(row, args.data);
    return Promise.resolve(row);
  }
  updateMany(args: { where: Where; data: Row }): Promise<{ count: number }> {
    const hit = this.rows.filter((r) => matches(r, args.where));
    for (const row of hit) {
      this.checkUnique({ ...row, ...args.data }, row.id);
      Object.assign(row, args.data);
    }
    return Promise.resolve({ count: hit.length });
  }
  count(args: { where?: Where } = {}): Promise<number> {
    return Promise.resolve(this.rows.filter((r) => matches(r, args.where)).length);
  }
}

export const TABLES = [
  'credential_delivery_items', 'credential_documents', 'credential_dispatch_batches', 'credential_delivery_events',
  'credential_document_events', 'credential_config', 'credential_offering_settings', 'credential_learner_state',
  'credential_notifications', 'credential_scan_alerts', 'credential_scans', 'enrol', 'course', 'centres', 'users', 'offerings',
] as const;

export function makeFakeDb(): Record<(typeof TABLES)[number], FakeTable> & { $transaction: <T>(fn: (tx: unknown) => Promise<T>) => Promise<T> } {
  const unique: Record<string, string[]> = {
    credential_delivery_items: ['paper_serial'], credential_dispatch_batches: ['batch_no'], credential_notifications: ['dedupe_key'],
    credential_documents: ['document_no', 'verification_id'],
  };
  const db = Object.fromEntries(TABLES.map((t) => [t, new FakeTable(unique[t] ?? [])])) as Record<(typeof TABLES)[number], FakeTable>;
  const withTx = db as Record<(typeof TABLES)[number], FakeTable> & { $transaction: <T>(fn: (tx: unknown) => Promise<T>) => Promise<T> };
  withTx.$transaction = (fn) => fn(withTx);
  return withTx;
}
