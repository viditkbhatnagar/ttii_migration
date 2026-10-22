// Small formatting helpers shared by the centre portal Wallet, Cohorts,
// Resources and Training pages (Naji's centre login design, 2026-10-22).
// Calendar days travel as YYYY-MM-DD strings and are formatted from their
// parts — never through new Date('YYYY-MM-DD'), which is UTC midnight and
// shifts the day in some time zones.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
const LONG_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const;
const IST_OFFSET_MS = 330 * 60 * 1000;

/** "₹1,23,456" (Indian grouping, paise only when present). */
export function inr(value: number): string {
  const n = Number.isFinite(value) ? value : 0;
  const hasPaise = Math.round(n * 100) % 100 !== 0;
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: hasPaise ? 2 : 0, maximumFractionDigits: 2 })}`;
}

function parts(ymd: string): [number, number, number] | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  if (!m) return null;
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return [Number(m[1]), month, Number(m[3])];
}

/** "17 Oct 2026" ('—' for a missing day). */
export function fmtDay(ymd: string, empty = '—'): string {
  const p = parts(ymd);
  return p ? `${String(p[2]).padStart(2, '0')} ${MONTHS[p[1] - 1]} ${p[0]}` : empty;
}

/** "17 October 2026". */
export function fmtLongDay(ymd: string, empty = '—'): string {
  const p = parts(ymd);
  return p ? `${String(p[2]).padStart(2, '0')} ${LONG_MONTHS[p[1] - 1]} ${p[0]}` : empty;
}

/** "17 Oct" (no year). */
export function fmtShortDay(ymd: string, empty = '—'): string {
  const p = parts(ymd);
  return p ? `${String(p[2]).padStart(2, '0')} ${MONTHS[p[1] - 1]}` : empty;
}

/** "Oct 2026". */
export function fmtMonth(ymd: string, empty = '—'): string {
  const p = parts(ymd);
  return p ? `${MONTHS[p[1] - 1]} ${p[0]}` : empty;
}

/** "2:00 PM" from "14:00" ('' when it does not parse). */
export function fmtTime(hhmm: string): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm);
  if (!m) return '';
  const h = Number(m[1]);
  return `${((h + 11) % 12) + 1}:${m[2]} ${h < 12 ? 'AM' : 'PM'}`;
}

/** Today's calendar day in IST (YYYY-MM-DD). */
export function istToday(nowMs: number = Date.now()): string {
  return new Date(nowMs + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** Whole days from one YYYY-MM-DD to another (negative when `to` is earlier); null if either is missing. */
export function daysBetween(fromYmd: string, toYmd: string): number | null {
  const a = parts(fromYmd);
  const b = parts(toYmd);
  if (!a || !b) return null;
  return Math.round((Date.UTC(b[0], b[1] - 1, b[2]) - Date.UTC(a[0], a[1] - 1, a[2])) / 86400000);
}

/** The IST calendar day of an ISO timestamp ('' when it does not parse). */
export function istDayOf(iso: string): string {
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? '' : istToday(ms);
}

/** Up to two initials ("Dr. Laila Hassan" → "LH"). */
export function initials(name: string): string {
  const words = name.replace(/\b(Dr|Ms|Mrs|Mr|Prof)\.\s*/gi, '').trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('') || '?';
}

/** Case-insensitive "every word of the query appears somewhere in these fields". */
export function matchesQuery(query: string, fields: string[]): boolean {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = fields.join(' ').toLowerCase();
  return words.every((w) => haystack.includes(w));
}
