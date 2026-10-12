// Pure helpers shared by the Cohorts-management lists (Cohorts, Live Sessions,
// Assignment Summary, Assignment Evaluation) — TTII 2026-10-12, Naji's design.

export type SortDir = 'asc' | 'desc';

/** Next sort state after a header click: the same column flips, a new column starts ascending. */
export function nextSort<K extends string>(current: { key: K; dir: SortDir }, k: K): { key: K; dir: SortDir } {
  if (current.key === k) return { key: k, dir: current.dir === 'asc' ? 'desc' : 'asc' };
  return { key: k, dir: 'asc' };
}

/** One page of rows (1-based) plus the page count; an out-of-range page is clamped. */
export function pageSlice<T>(rows: T[], page: number, size: number): { current: T[]; page: number; pages: number } {
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const p = Math.min(Math.max(1, page), pages);
  return { current: rows.slice((p - 1) * size, p * size), page: p, pages };
}

/** Compare two cell values: numbers numerically, text case-insensitively with natural digits. */
export function compareValues(a: string | number, b: string | number): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

export function sortRows<T>(rows: T[], pick: (row: T) => string | number, dir: SortDir): T[] {
  const sign = dir === 'asc' ? 1 : -1;
  return [...rows].sort((x, y) => sign * compareValues(pick(x), pick(y)));
}

/**
 * The calendar date of a @db.Date / ISO value as YYYY-MM-DD, read from its
 * leading digits — never through `new Date()`, which would shift the day by the
 * viewer's timezone. '' when there is no date.
 */
export function ymdOf(value: unknown): string {
  if (typeof value !== 'string') return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : '';
}

/**
 * HH:MM of a @db.Time value. Prisma serialises TIME as "1970-01-01T19:30:00.000Z"
 * (the IST wall clock in the UTC slot); legacy rows may hold "19:30:00".
 */
export function hhmmOf(value: unknown): string {
  if (typeof value !== 'string' || !value) return '';
  const iso = /T(\d{2}):(\d{2})/.exec(value);
  if (iso) return `${iso[1]}:${iso[2]}`;
  const plain = /^(\d{1,2}):(\d{2})/.exec(value);
  return plain ? `${(plain[1] ?? '').padStart(2, '0')}:${plain[2]}` : '';
}

/** dd/mm/yyyy for a value with a leading YYYY-MM-DD. */
export function dmy(value: unknown): string {
  const ymd = ymdOf(value);
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-');
  return `${d}/${m}/${y}`;
}

/** "19:30" → "7:30 PM". */
export function to12h(hhmm: string): string {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) return hhmm;
  const h = Number(m[1]);
  return `${((h + 11) % 12) + 1}:${m[2]} ${h >= 12 ? 'PM' : 'AM'}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-07-01" (or "2026-07") → "Jul 2026". */
export function monthLabel(value: unknown): string {
  const raw = typeof value === 'string' ? value : '';
  const ymd = ymdOf(raw) || (/^\d{4}-\d{2}$/.test(raw) ? `${raw}-01` : '');
  if (!ymd) return '';
  const [y, m] = ymd.split('-');
  return `${MONTHS[Number(m) - 1] ?? ''} ${y}`;
}

/** "02 Jul 2026" for a value with a leading YYYY-MM-DD. */
export function dayMonthYear(value: unknown): string {
  const ymd = ymdOf(value);
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-');
  return `${d} ${MONTHS[Number(m) - 1] ?? ''} ${y}`;
}

const IST_OFFSET_MS = 330 * 60 * 1000;

/**
 * The real instant of an IST wall-clock date + time (classes are scheduled in
 * IST and the server runs in UTC). A missing time means the end of that day.
 */
export function istInstantMs(ymd: string, hhmm: string): number | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!d) return null;
  const t = /^(\d{2}):(\d{2})$/.exec(hhmm);
  const h = t ? Number(t[1]) : 23;
  const mi = t ? Number(t[2]) : 59;
  return Date.UTC(Number(d[1]), Number(d[2]) - 1, Number(d[3]), h, mi) - IST_OFFSET_MS;
}

/** Today's IST calendar date as YYYY-MM-DD. */
export function istTodayYmd(nowMs: number = Date.now()): string {
  return new Date(nowMs + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** Case-insensitive "any field contains the query" for the list search boxes. */
export function matchesSearch(query: string, fields: Array<string | number | null | undefined>): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => f !== null && f !== undefined && String(f).toLowerCase().includes(q));
}
