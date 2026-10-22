// Shared pure helpers for the centre portal v2 Applications / Students /
// Courses & Fees pages. Dates arrive as IST calendar days (YYYY-MM-DD) or ISO
// instants; a YMD is never handed to `new Date('YYYY-MM-DD')` (UTC day shift).

const IST_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 86_400_000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function str(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'bigint' || typeof value === 'boolean') return String(value);
  return '';
}

export function num(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const n = Number(str(value).replace(/[,\s₹]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/** A money value or null (null, '' and non-numbers stay "unknown", never 0). */
export function moneyOrNull(value: unknown): number | null {
  if (value === null || value === undefined || str(value) === '') return null;
  const n = num(value);
  return Number.isFinite(n) ? n : null;
}

export function records(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((v): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v))
    : [];
}

export function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function istTodayYmd(now: Date = new Date()): string {
  return new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

export function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1) + days * DAY_MS).toISOString().slice(0, 10);
}

/** '2026-10-02' → '02 Oct 2026'; '' → '—'. */
export function fmtYmd(ymd: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  if (!match) return '—';
  return `${match[3]} ${MONTHS[Number(match[2]) - 1] ?? ''} ${match[1]}`;
}

/** An ISO instant as an IST date and time: '02 Oct 2026, 10:30 AM'. */
export function fmtInstant(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return '—';
  const ist = new Date(ms + IST_OFFSET_MS);
  const h = ist.getUTCHours();
  const mm = String(ist.getUTCMinutes()).padStart(2, '0');
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${fmtYmd(ist.toISOString().slice(0, 10))}, ${hour12}:${mm} ${h < 12 ? 'AM' : 'PM'}`;
}

/** ₹ in Indian grouping; null → '—'. */
export function inr(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

export type SortDir = 'asc' | 'desc';

/** Stable sort; blanks (null / '') always last whatever the direction. */
export function sortBy<T>(rows: readonly T[], value: (row: T) => string | number | null, dir: SortDir): T[] {
  const sign = dir === 'asc' ? 1 : -1;
  return rows
    .map((row, index) => ({ row, index, v: value(row) }))
    .sort((a, b) => {
      const blankA = a.v === null || a.v === '';
      const blankB = b.v === null || b.v === '';
      if (blankA || blankB) return blankA === blankB ? a.index - b.index : blankA ? 1 : -1;
      const cmp = typeof a.v === 'number' && typeof b.v === 'number'
        ? a.v - b.v
        : String(a.v).localeCompare(String(b.v), 'en', { numeric: true, sensitivity: 'base' });
      return cmp !== 0 ? cmp * sign : a.index - b.index;
    })
    .map((x) => x.row);
}

export type RangeKey = '7' | '30' | '90' | '180' | 'all';

export const RANGE_LABELS: Record<RangeKey, string> = {
  '7': 'Last 7 days', '30': 'Last 30 days', '90': 'Last 90 days', '180': 'Last 6 months', all: 'All time',
};

/** Inside the last N IST days (today included); 'all' keeps undated rows too. */
export function withinRange(ymd: string, range: RangeKey, todayYmd: string): boolean {
  if (range === 'all') return true;
  if (!ymd) return false;
  return ymd >= addDaysYmd(todayYmd, -(Number(range) - 1));
}

export function matchesQuery(query: string, ...fields: string[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => f.toLowerCase().includes(q));
}

/** The trailing id segment of /centre/<module>/view/:id ('' when missing). */
export function pathId(pathname: string): string {
  const parts = pathname.replace(/\/+$/, '').split('/');
  const id = parts[parts.length - 1] ?? '';
  return /^\d+$/.test(id) ? id : '';
}

export function pageSlice<T>(rows: readonly T[], page: number, pageSize: number): { page: number; totalPages: number; rows: T[] } {
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safe = Math.min(Math.max(1, page), totalPages);
  return { page: safe, totalPages, rows: rows.slice((safe - 1) * pageSize, safe * pageSize) };
}

export function uniqueOptions(values: Array<{ value: string; label: string }>): Array<{ value: string; label: string }> {
  const seen = new Map<string, string>();
  for (const v of values) if (v.value && !seen.has(v.value)) seen.set(v.value, v.label);
  return [...seen.entries()].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
}
