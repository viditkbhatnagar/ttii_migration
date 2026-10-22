// Pure helpers for the Centres v2 finance surfaces (Naji 2026-10-22): the
// Centre Dashboard and the Wallet & Payment tabs. No database access here —
// centre-dashboard-service.ts loads the rows and these decide the dates,
// buckets and derived statuses, so the rules are testable on their own.
//
// Dates:
//  - "today", period windows and month buckets are IST calendar days;
//  - DATETIME columns (created_at, converted_at) are real instants → IST day;
//  - @db.Date columns (effective_date, fee_paid_on, …) are read with UTC
//    getters (Prisma hands them over at UTC midnight);
//  - centres.date_of_expiry is a VarChar and is parsed from its text.

export const IST_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 86_400_000;
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ─── Periods ────────────────────────────────────────────────────────────────

export type DashboardPeriod = 'month' | 'quarter' | 'year';

/** Rolling windows ending today (Naji's prototype: 31 / 92 / 366 days). */
export const PERIOD_DAYS: Record<DashboardPeriod, number> = { month: 31, quarter: 92, year: 366 };

export function parsePeriod(value: unknown): DashboardPeriod {
  return value === 'month' || value === 'quarter' || value === 'year' ? value : 'year';
}

export interface PeriodWindow {
  period: DashboardPeriod;
  days: number;
  /** First IST day inside the window (YYYY-MM-DD). */
  fromYmd: string;
  /** Today, IST (YYYY-MM-DD) — the last day inside the window. */
  toYmd: string;
}

/** The IST calendar day of an instant ('' when missing or invalid). */
export function istYmd(value: Date | null | undefined): string {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return '';
  return new Date(value.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** The calendar date of a @db.Date value, read with UTC getters ('' when missing). */
export function dateYmd(value: Date | null | undefined): string {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return '';
  return value.toISOString().slice(0, 10);
}

function validYmd(y: number, m: number, d: number): string {
  if (y < 1900 || m < 1 || m > 12 || d < 1 || d > 31) return '';
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCMonth() !== m - 1) return '';
  return date.toISOString().slice(0, 10);
}

/**
 * A YYYY-MM-DD from a free-text date column (centres.date_of_expiry): accepts
 * "2027-03-31", "2027-03-31 00:00:00", "31-03-2027" and "31/03/2027". '' for
 * blanks, "0000-00-00" and anything else.
 */
export function looseYmd(value: string | null | undefined): string {
  const text = String(value ?? '').trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (iso) return validYmd(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const dmy = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(text);
  if (dmy) return validYmd(Number(dmy[3]), Number(dmy[2]), Number(dmy[1]));
  return '';
}

function ymdMs(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number);
  return Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1);
}

export function addDays(ymd: string, days: number): string {
  return new Date(ymdMs(ymd) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from `fromYmd` to `toYmd` (negative when `toYmd` is earlier). */
export function daysBetween(fromYmd: string, toYmd: string): number {
  return Math.round((ymdMs(toYmd) - ymdMs(fromYmd)) / DAY_MS);
}

/** The N IST calendar days ending today, today included. */
export function periodWindow(period: DashboardPeriod, now: Date): PeriodWindow {
  const days = PERIOD_DAYS[period];
  const toYmd = istYmd(now);
  return { period, days, fromYmd: addDays(toYmd, -(days - 1)), toYmd };
}

export function inWindow(ymd: string, window: Pick<PeriodWindow, 'fromYmd' | 'toYmd'>): boolean {
  return ymd !== '' && ymd >= window.fromYmd && ymd <= window.toYmd;
}

export interface TrendMonth {
  /** YYYY-MM (IST). */
  month: string;
  /** "May" (the prototype's short month). */
  label: string;
}

/** The last `count` IST months, oldest first, the current month last. */
export function trendMonths(now: Date, count = 6): TrendMonth[] {
  const today = istYmd(now);
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7)) - 1;
  const out: TrendMonth[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(year, month - i, 1));
    out.push({ month: d.toISOString().slice(0, 7), label: MONTH_SHORT[d.getUTCMonth()] ?? '' });
  }
  return out;
}

// ─── Values ─────────────────────────────────────────────────────────────────

/** A money value from a VarChar / Decimal column; 0 when it is not a finite number. */
export function money(value: unknown): number {
  let n: number;
  if (typeof value === 'number') n = value;
  else if (typeof value === 'string') n = value.trim() === '' ? 0 : Number(value.replace(/,/g, '').trim());
  else if (typeof value === 'object' && value !== null && typeof (value as { toNumber?: unknown }).toNumber === 'function') {
    n = (value as { toNumber: () => number }).toNumber(); // Prisma Decimal
  } else return 0;
  return Number.isFinite(n) ? n : 0;
}

/** centres.state_id holds a state NAME on new rows; legacy rows keep a numeric id that names nothing. */
export function stateName(value: string | null | undefined): string {
  const text = String(value ?? '').trim();
  return text && !/^\d+$/.test(text) ? text : '';
}

export function toPositiveInt(value: unknown): number {
  const text = typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim() : '';
  if (!/^\d+$/.test(text)) return 0;
  const n = Number(text);
  return Number.isSafeInteger(n) && n > 0 ? n : 0;
}

/** Prisma P2021: the table does not exist (its migration has not run yet). */
export function isMissingTable(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'P2021';
}

export const AFFILIATION_NOT_SET_UP = 'Affiliation records are not set up yet.';

// ─── Top-ups ────────────────────────────────────────────────────────────────

/** "FR-12" — the display number of a centre_fund_requests row. */
export function fundRequestNo(id: number): string {
  return `FR-${id}`;
}

/** The fund request a wallet credit came from ("Fund request approved #12" → 12), else null. */
export function approvedRequestIdOf(remarks: string | null | undefined): number | null {
  const m = /Fund request approved #(\d+)/i.exec(String(remarks ?? ''));
  return m ? Number(m[1]) : null;
}

export function isCredit(type: string | null | undefined): boolean {
  return String(type ?? '').trim().toLowerCase() === 'credit';
}

// ─── Centre application pipeline ────────────────────────────────────────────

/** The main Applications pipeline, in order (labels live on the page). */
export const PIPELINE_STAGES = [
  'lead', 'payment_pending', 'paid', 'form_pending', 'approval_waiting', 'enrolled', 'rejected',
] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export interface StageFacts {
  stage: string | null;
  status: string | null;
  is_converted: number | null;
}

/**
 * The REAL stage of a centre application. Converted (is_converted, status
 * 'converted' or stage 'enrolled') → enrolled; status or stage 'rejected' →
 * rejected; the legacy 'form_submitted' sits with Approval Waiting (as on the
 * Applications page); a blank or unknown stage is a Lead.
 */
export function pipelineStageOf(app: StageFacts): PipelineStage {
  const stage = String(app.stage ?? '').trim().toLowerCase();
  const status = String(app.status ?? '').trim().toLowerCase();
  if (app.is_converted === 1 || status === 'converted' || stage === 'enrolled') return 'enrolled';
  if (status === 'rejected' || stage === 'rejected') return 'rejected';
  if (stage === 'form_submitted') return 'approval_waiting';
  return (PIPELINE_STAGES as readonly string[]).includes(stage) ? (stage as PipelineStage) : 'lead';
}

export function isInProgress(stage: PipelineStage): boolean {
  return stage !== 'enrolled' && stage !== 'rejected';
}

export function conversionPct(approved: number, total: number): number {
  return total > 0 ? Math.round((approved / total) * 100) : 0;
}

// ─── Affiliation ────────────────────────────────────────────────────────────

export type AffiliationState = 'expired' | 'due_soon' | 'valid' | 'not_set';

/** Dashboard threshold: expiring within this many days is "Due Soon". */
export const AFFILIATION_DUE_SOON_DAYS = 60;

/** The later of two YYYY-MM-DD values ('' ignored). */
export function laterYmd(a: string, b: string): string {
  if (!a) return b;
  if (!b) return a;
  return a >= b ? a : b;
}

export function affiliationState(daysLeft: number | null): AffiliationState {
  if (daysLeft === null) return 'not_set';
  if (daysLeft < 0) return 'expired';
  return daysLeft <= AFFILIATION_DUE_SOON_DAYS ? 'due_soon' : 'valid';
}

// ─── Affiliation fees ───────────────────────────────────────────────────────

export type FeeStatus = 'paid' | 'overdue' | 'due_soon' | 'pending' | 'no_fee';

/** An unpaid fee due within this many days is "Due Soon". */
export const FEE_DUE_SOON_DAYS = 30;

/**
 * Paid when recorded paid; otherwise from the due date (the agreement's
 * effective date): Overdue once it has passed, Due Soon within 30 days,
 * else Pending. An unpaid zero fee is "No fee" rather than Overdue.
 */
export function feeStatus(fee: { paid: boolean; amount: number; dueYmd: string }, todayYmd: string): FeeStatus {
  if (fee.paid) return 'paid';
  if (fee.amount <= 0) return 'no_fee';
  if (!fee.dueYmd) return 'pending';
  const days = daysBetween(todayYmd, fee.dueYmd);
  if (days < 0) return 'overdue';
  return days <= FEE_DUE_SOON_DAYS ? 'due_soon' : 'pending';
}

/** "2026–29" from the effective / expiry years; one year alone when they match. */
export function feePeriod(effectiveYmd: string, expiryYmd: string): string {
  const from = effectiveYmd.slice(0, 4);
  const to = expiryYmd.slice(0, 4);
  if (!from) return to;
  if (!to || to === from) return from;
  return `${from}–${to.slice(2)}`;
}

// ─── Application payments ───────────────────────────────────────────────────

export type PaymentState = 'paid' | 'partial' | 'unpaid' | 'no_plan';

/** Paid / Partial / Unpaid against the plan; "No plan" when nothing is scheduled. */
export function paymentState(fee: number, paid: number): PaymentState {
  if (fee <= 0) return paid > 0 ? 'paid' : 'no_plan';
  if (paid <= 0) return 'unpaid';
  return paid >= fee ? 'paid' : 'partial';
}

/** Round to paise so summed floats never print as 1999.9999. */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
