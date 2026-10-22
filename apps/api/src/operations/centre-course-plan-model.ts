import { istToday, text } from './centre-profile-model.js';

// Course & Fee Structure validation (admin Centre profile). Pure, no I/O.

export const DUPLICATE_PLAN_MESSAGE = 'This course is already assigned to this centre — edit the existing plan instead';
const MAX_AMOUNT = 100_000_000;

/** "10,000" / 10000 -> "10000" (plain string for the VarChar column); null when not a number >= 0. */
export function parseCentreFee(value: unknown): string | null {
  const raw = typeof value === 'number' ? String(value) : text(value).replace(/,/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > MAX_AMOUNT) return null;
  return String(n);
}

/** A real calendar date written YYYY-MM-DD, else null. */
export function parseYmd(value: unknown): { ymd: string; date: Date } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text(value));
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  return { ymd: `${m[1]}-${m[2]}-${m[3]}`, date };
}

export interface PlanInput { fee: string; start: Date; end: Date; startYmd: string; endYmd: string }

/** First problem as a message, or the parsed values. */
export function validatePlanInput(payload: Record<string, unknown>): { error: string } | { value: PlanInput } {
  const fee = parseCentreFee(payload.assigned_amount);
  if (fee === null) return { error: 'Enter the centre fee as a number (0 or more).' };
  const start = parseYmd(payload.start_date);
  if (!start) return { error: 'Enter a valid start date.' };
  const end = parseYmd(payload.end_date);
  if (!end) return { error: 'Enter a valid end date.' };
  if (end.ymd < start.ymd) return { error: 'The end date cannot be before the start date.' };
  return { value: { fee, start: start.date, end: end.date, startYmd: start.ymd, endYmd: end.ymd } };
}

/** A plan still blocks a new one for its course while its end date is today (IST) or later. */
export function planIsLive(endYmd: string, nowMs: number): boolean {
  return !endYmd || endYmd >= istToday(nowMs);
}
