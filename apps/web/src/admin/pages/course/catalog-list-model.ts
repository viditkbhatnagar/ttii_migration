import type { Tone } from '../../shared/components/ui-tones.js';

// Shared list logic for the Courses section (Programs, Courses, Subjects,
// Lessons, Content Library), rebuilt in Naji's design (TTII 2026-10-12). Pure,
// so it is unit-tested in apps/web/tests/catalog-list-model.test.ts.

export type SortDir = 'asc' | 'desc';

export interface CourseRef {
  id: string;
  title: string;
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

/** Natural, case-insensitive text compare ("MTT2" < "MTT10"). Empty sorts last. */
export function compareText(a: string, b: string): number {
  if (a === b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return collator.compare(a, b);
}

export function compareNumber(a: number | null, b: number | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a - b;
}

/** Stable sort by a comparator, reversed for `desc`. Never mutates the input. */
export function sortRows<T>(rows: readonly T[], compare: (a: T, b: T) => number, dir: SortDir): T[] {
  const sign = dir === 'asc' ? 1 : -1;
  return rows
    .map((row, index) => ({ row, index }))
    .sort((x, y) => sign * compare(x.row, y.row) || x.index - y.index)
    .map((entry) => entry.row);
}

export interface PageSlice<T> {
  page: number;
  pages: number;
  current: T[];
}

/** 1-based paging; clamps a page that fell off the end after a delete or filter. */
export function pageSlice<T>(rows: readonly T[], page: number, size: number): PageSlice<T> {
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const safe = Math.min(Math.max(1, page), pages);
  return { page: safe, pages, current: rows.slice((safe - 1) * size, safe * size) };
}

/** Case-insensitive "any field contains the query". Blank query matches all. */
export function matchesSearch(query: string, fields: readonly string[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => f.toLowerCase().includes(q));
}

export function statusKey(raw: string): string {
  return raw.trim().toLowerCase();
}

/** 'published' → 'Published'; blank → '—'. Display only; filters use statusKey. */
export function statusLabel(raw: string): string {
  const s = raw.trim();
  if (!s) return '—';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

const STATUS_TONE: Record<string, Tone> = {
  published: 'emerald',
  active: 'emerald',
  draft: 'amber',
  archived: 'slate',
  inactive: 'slate',
};

export function statusTone(raw: string): Tone {
  return STATUS_TONE[statusKey(raw)] ?? 'slate';
}

export interface StatusPill {
  key: string;
  label: string;
  count: number;
}

/**
 * One pill per status that actually occurs, in the preferred order first and
 * any unexpected value after it — so a stray `active` course (the column's
 * default) is still reachable instead of only ever appearing under "All".
 */
export function statusPills(statuses: readonly string[], preferred: readonly string[]): StatusPill[] {
  const counts = new Map<string, number>();
  for (const raw of statuses) {
    const key = statusKey(raw);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const order = [...preferred, ...[...counts.keys()].filter((k) => !preferred.includes(k)).sort()];
  return order
    .filter((key) => (counts.get(key) ?? 0) > 0)
    .map((key) => ({ key, label: statusLabel(key), count: counts.get(key) ?? 0 }));
}

/** Distinct, sorted {value,label} options, keyed by id. */
export function distinctOptions(refs: readonly CourseRef[]): Array<{ value: string; label: string }> {
  const seen = new Map<string, string>();
  for (const r of refs) {
    if (r.id && r.title && !seen.has(r.id)) seen.set(r.id, r.title);
  }
  return [...seen.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => compareText(a.label, b.label));
}

/** Distinct, sorted non-blank strings. */
export function distinctValues(values: readonly string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))].sort(compareText);
}

/** Plain text for a table cell: drops tags and collapses whitespace (never rendered as HTML). */
export function plainText(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * dd/mm/yyyy for a server timestamp. A bare YYYY-MM-DD is read as a calendar
 * date (not UTC midnight, which shifts a day in IST); anything else is parsed
 * as an instant and shown in local time. Blank or invalid → ''.
 */
export function formatDmy(raw: string): string {
  const s = raw.trim();
  if (!s) return '';
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (ymd) return `${ymd[3]}/${ymd[2]}/${ymd[1]}`;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '';
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Selection helpers for the header "select page" checkbox. */
export function toggleId(selected: ReadonlySet<string>, id: string, on: boolean): Set<string> {
  const next = new Set(selected);
  if (on) next.add(id);
  else next.delete(id);
  return next;
}

export function allSelected(selected: ReadonlySet<string>, pageIds: readonly string[]): boolean {
  return pageIds.length > 0 && pageIds.every((id) => selected.has(id));
}

export function togglePage(selected: ReadonlySet<string>, pageIds: readonly string[]): Set<string> {
  const next = new Set(selected);
  if (allSelected(selected, pageIds)) pageIds.forEach((id) => next.delete(id));
  else pageIds.forEach((id) => next.add(id));
  return next;
}

/** Export the ticked rows when any are ticked, else everything the filters show. */
export function rowsToExport<T extends { id: string }>(filtered: readonly T[], selected: ReadonlySet<string>): T[] {
  if (selected.size === 0) return [...filtered];
  return filtered.filter((r) => selected.has(r.id));
}

/** Server envelope message for a toast, ignoring the 'success' sentinel. */
export function envelopeMessage(res: unknown, fallback: string): string {
  if (res && typeof res === 'object' && 'message' in res) {
    const m = (res as { message?: unknown }).message;
    if (typeof m === 'string' && m.trim() && m.trim().toLowerCase() !== 'success') return m.trim();
  }
  return fallback;
}

export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

export function exportLabel(selectedCount: number): string {
  return selectedCount > 0 ? `Export (${selectedCount})` : 'Export';
}

/** Toggle the sort key, flipping direction when the same column is clicked again. */
export function nextSort<K extends string>(current: { key: K; dir: SortDir }, k: K): { key: K; dir: SortDir } {
  if (current.key === k) return { key: k, dir: current.dir === 'asc' ? 'desc' : 'asc' };
  return { key: k, dir: 'asc' };
}

/** Modal sizing per the admin rule: inline width (sm:max-w-lg wins over classes). */
export function dialogStyle(px: number): { width: string; maxWidth: string } {
  const w = `min(${px}px, calc(100vw - 2rem))`;
  return { width: w, maxWidth: w };
}
