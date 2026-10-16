import { asNumber, asString, toRecords } from '../../../shared/utils/admin-data-utils.js';

// Per-enrolment payment plan (TTII 2026-10-16) for an enrolment on its own
// plan — see usesOwnFeePlan. The plan is saved straight into that enrolment's
// student_payments rows (what the student sees and Pay Now charges). The
// server re-checks everything; these helpers mirror its rules so the dialog can
// explain a problem before saving.

export const MAX_PLAN_INSTALMENTS = 24;

export type PlanMode = 'full' | 'installment';
export type LockReason = 'paid' | 'payment_recorded' | 'checkout' | 'status';

export interface PlanScheduleRow {
  id: string;
  label: string;
  amount: number;
  dueDate: string;
  paidDate: string;
  status: string;
  locked: boolean;
  lockReason: LockReason | null;
}

export interface EnrolmentPlanData {
  enrolId: string;
  courseTitle: string;
  enrollmentId: string;
  studentName: string;
  prefill: { totalFee: number | null; discount: number; gstPercent: number; sourceLabel: string };
  /** The agreed payable (the last saved plan, else the fee entered on the
   *  enrolment's application). Only this can show a balance still to be
   *  scheduled; a list price never does. */
  agreedFee: number | null;
  /** Whether the enrolment has an application to keep the agreed fee on. */
  hasApplication: boolean;
  freeOffering: boolean;
  /** Money recorded outside the schedule (the server's view). */
  money: { code: string; application: number; online: number; schedulePaid: number; pendingApproval: boolean; linkOutstanding: boolean };
  /** Why the server will refuse a save right now, or null. */
  blockReason: string | null;
  /** Due dates must fall inside this window (YYYY-MM-DD). */
  dueFrom: string;
  dueTo: string;
  rows: PlanScheduleRow[];
}

export interface DraftRow {
  key: string;
  label: string;
  /** Kept as typed text; parsed when checked. */
  amount: string;
  dueDate: string;
}

export interface PlanDraft {
  mode: PlanMode;
  totalFee: string;
  discount: string;
  gstPercent: string;
  /** Full mode: one row whose amount is always the remaining total. */
  rows: DraftRow[];
  /** True when the draft started from the enrolment's current schedule. */
  fromSchedule: boolean;
}

const LOCK_REASONS: ReadonlySet<string> = new Set(['paid', 'payment_recorded', 'checkout', 'status']);

const obj = (v: unknown): Record<string, unknown> => (typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {});
const numOrNull = (v: unknown): number | null => (v == null || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null);

export function parsePlanData(raw: Record<string, unknown>): EnrolmentPlanData {
  const prefill = obj(raw.prefill);
  const money = obj(raw.money);
  const blockReason = asString(raw.block_reason);
  return {
    enrolId: asString(raw.enrol_id),
    courseTitle: asString(raw.course_title),
    enrollmentId: asString(raw.enrollment_id),
    studentName: asString(raw.student_name),
    prefill: {
      totalFee: numOrNull(prefill.total_fee),
      discount: asNumber(prefill.discount),
      gstPercent: asNumber(prefill.gst_percent),
      sourceLabel: asString(prefill.source_label),
    },
    agreedFee: numOrNull(raw.agreed_fee),
    hasApplication: raw.has_application === true,
    freeOffering: raw.free_offering === true,
    money: {
      code: asString(money.application_code),
      application: asNumber(money.application),
      online: asNumber(money.online),
      schedulePaid: asNumber(money.schedule_paid),
      pendingApproval: money.pending_approval === true,
      linkOutstanding: money.link_outstanding === true,
    },
    blockReason: blockReason || null,
    dueFrom: asString(raw.due_from),
    dueTo: asString(raw.due_to),
    rows: toRecords(raw.rows).map((r) => {
      const reason = asString(r.lock_reason);
      return {
        id: asString(r.id),
        label: asString(r.label),
        amount: asNumber(r.amount),
        dueDate: asString(r.due_date),
        paidDate: asString(r.paid_date),
        status: asString(r.status),
        locked: r.locked === true,
        lockReason: LOCK_REASONS.has(reason) ? (reason as LockReason) : null,
      };
    }),
  };
}

export function lockReasonLabel(reason: LockReason | null): string {
  switch (reason) {
    case 'paid': return 'Paid';
    case 'payment_recorded': return 'Payment details recorded';
    case 'checkout': return 'Checkout in progress';
    case 'status': return 'Kept';
    default: return '';
  }
}

/**
 * Same composition as the server (and the application plan dialog): GST is
 * added on top of the fee after discount. Worked in paise, rounded once to
 * whole rupees — the ledger stores rupees.
 */
export function payableOf(totalFee: number, discount: number, gstPercent: number): { afterDiscount: number; gstAmount: number; payable: number } | { error: string } {
  if (!Number.isFinite(totalFee) || totalFee <= 0) return { error: 'Enter the total fee.' };
  if (!Number.isFinite(discount) || discount < 0) return { error: 'The discount cannot be negative.' };
  if (discount > totalFee) return { error: 'The discount cannot be more than the total fee.' };
  if (!Number.isFinite(gstPercent) || gstPercent < 0 || gstPercent > 100) return { error: 'GST must be between 0 and 100%.' };
  const afterPaise = Math.round(totalFee * 100) - Math.round(discount * 100);
  const gstPaise = Math.round((afterPaise * gstPercent) / 100);
  const payable = Math.round((afterPaise + gstPaise) / 100);
  if (payable < 1) return { error: 'The payable total must be at least ₹1.' };
  return { afterDiscount: afterPaise / 100, gstAmount: gstPaise / 100, payable };
}

/** Whole rupees, as equal as possible, the remainder on the last row. */
export function splitEvenly(total: number, parts: number): number[] {
  if (!(total > 0) || !(parts >= 1)) return [];
  const n = Math.floor(parts);
  const base = Math.floor(total / n);
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? total - base * (n - 1) : base));
}

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidYmd(ymd: string): boolean {
  const m = YMD.exec(ymd);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

/** Add calendar months to a YYYY-MM-DD, clamping to the month's last day. */
export function addMonthsYmd(ymd: string, months: number): string {
  const m = YMD.exec(ymd);
  if (!m) return ymd;
  const total = Number(m[2]) - 1 + months;
  const y = Number(m[1]) + Math.floor(total / 12);
  const mo = ((total % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
  const d = Math.min(Number(m[3]), lastDay);
  return `${y}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Today as YYYY-MM-DD from LOCAL date parts (never toISOString, which is UTC). */
export function todayYmd(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** New instalments continue the numbering of kept "Installment N" rows. */
export function instalmentLabelOffset(kept: ReadonlyArray<Pick<PlanScheduleRow, 'label'>>): number {
  return kept.filter((r) => /^installment\s+\d+$/i.test(r.label.trim())).length;
}

export function generateRows(remaining: number, count: number, firstDue: string, offset: number): DraftRow[] {
  return splitEvenly(remaining, Math.min(Math.max(1, Math.floor(count)), MAX_PLAN_INSTALMENTS)).map((amount, i) => ({
    key: `gen-${i}`,
    label: `Installment ${offset + i + 1}`,
    amount: String(amount),
    dueDate: isValidYmd(firstDue) ? addMonthsYmd(firstDue, i) : '',
  }));
}

/**
 * The dialog's starting point. Generate (no schedule yet): the prefill from
 * the course offering / fee structure, full payment due today. Edit: the
 * current schedule — its total as the fee, its replaceable rows as the rows.
 */
export function initialDraft(data: EnrolmentPlanData, today: string): PlanDraft {
  if (data.rows.length === 0) {
    return {
      mode: 'full',
      totalFee: data.prefill.totalFee != null ? String(data.prefill.totalFee) : '',
      discount: data.prefill.totalFee != null ? String(data.prefill.discount) : '0',
      gstPercent: data.prefill.totalFee != null ? String(data.prefill.gstPercent) : '0',
      rows: [{ key: 'full', label: 'Course Fee', amount: '', dueDate: today }],
      fromSchedule: false,
    };
  }
  const editable = data.rows.filter((r) => !r.locked);
  const kept = data.rows.filter((r) => r.locked);
  const total = data.rows.reduce((sum, r) => sum + r.amount, 0);
  const single = editable.length === 1 && kept.length === 0 ? editable[0] : undefined;
  if (single) {
    return {
      mode: 'full',
      totalFee: String(total),
      discount: '0',
      gstPercent: '0',
      rows: [{ key: 'full', label: single.label || 'Course Fee', amount: '', dueDate: single.dueDate || today }],
      fromSchedule: true,
    };
  }
  return {
    mode: 'installment',
    totalFee: String(total),
    discount: '0',
    gstPercent: '0',
    rows: editable.map((r, i) => ({ key: `cur-${r.id || i}`, label: r.label, amount: String(r.amount), dueDate: r.dueDate })),
    fromSchedule: true,
  };
}

export interface DraftSummary {
  payable: number | null;
  afterDiscount: number | null;
  gstAmount: number | null;
  keptTotal: number;
  remaining: number | null;
  planned: number;
  /** The save would record `payable` as the agreed fee (it differs today). */
  agreedChanges: boolean;
  problem: string | null;
}

const inr = (n: number): string => `₹${n.toLocaleString('en-IN')}`;

const dmy = (ymd: string): string => `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}/${ymd.slice(0, 4)}`;

/** What the save would send, and the first thing the server would refuse.
 *  `replaceableCount` = current rows the save would replace; `window` = the
 *  server's due-date bounds (YYYY-MM-DD); `agreed` = the enrolment's agreed
 *  fee and whether it has an application to keep one on. */
export function summarizeDraft(
  draft: PlanDraft,
  kept: ReadonlyArray<Pick<PlanScheduleRow, 'amount'>>,
  replaceableCount = 0,
  window: { from: string; to: string } | null = null,
  agreed: Pick<EnrolmentPlanData, 'agreedFee' | 'hasApplication'> | null = null,
): DraftSummary {
  const keptTotal = kept.reduce((sum, r) => sum + r.amount, 0);
  const pay = payableOf(Number(draft.totalFee), Number(draft.discount || 0), Number(draft.gstPercent || 0));
  if ('error' in pay) {
    return { payable: null, afterDiscount: null, gstAmount: null, keptTotal, remaining: null, planned: 0, agreedChanges: false, problem: pay.error };
  }
  const remaining = pay.payable - keptTotal;
  const rows = rowsToSend(draft, remaining);
  const planned = rows.reduce((sum, r) => sum + (Number.isFinite(r.amount) ? r.amount : 0), 0);
  // As the server: a save records the payable as the agreed fee whenever the
  // enrolment has an application and the figure differs — so setting or
  // correcting the agreed fee is a change even when no row moves.
  const agreedChanges = agreed?.hasApplication === true && agreed.agreedFee !== pay.payable;
  const base = { payable: pay.payable, afterDiscount: pay.afterDiscount, gstAmount: pay.gstAmount, keptTotal, remaining, planned, agreedChanges };
  if (remaining < 0) {
    return { ...base, problem: `The instalments that must be kept already total ${inr(keptTotal)}, more than the payable ${inr(pay.payable)}.` };
  }
  if (remaining === 0) {
    if (rows.length > 0) return { ...base, problem: 'Nothing is left to schedule: the kept instalments already cover the payable total.' };
    return { ...base, problem: replaceableCount > 0 || agreedChanges ? null : 'Nothing to change: the kept instalments already cover the payable total.' };
  }
  if (rows.length === 0) return { ...base, problem: `Add the instalments for the remaining ${inr(remaining)}.` };
  if (rows.length > MAX_PLAN_INSTALMENTS) return { ...base, problem: `A plan can have at most ${MAX_PLAN_INSTALMENTS} instalments.` };
  for (const [i, r] of rows.entries()) {
    if (!Number.isInteger(r.amount) || r.amount < 1) return { ...base, problem: `Row ${i + 1}: the amount must be a whole number of rupees, at least ₹1.` };
    if (!isValidYmd(r.dueDate)) return { ...base, problem: `Row ${i + 1}: enter a valid due date.` };
    if (window && window.from && window.to && (r.dueDate < window.from || r.dueDate > window.to)) {
      return { ...base, problem: `Row ${i + 1}: the due date must be between ${dmy(window.from)} and ${dmy(window.to)}.` };
    }
  }
  if (planned !== remaining) {
    return { ...base, problem: `The rows add up to ${inr(planned)} but ${inr(remaining)} is left to schedule.` };
  }
  return { ...base, problem: null };
}

/** Rows to save. Full payment is one row for exactly the remaining total. */
export function rowsToSend(draft: PlanDraft, remaining: number): Array<{ label: string; amount: number; dueDate: string }> {
  if (remaining <= 0 && draft.mode === 'full') return [];
  if (draft.mode === 'full') {
    const row = draft.rows[0];
    return [{ label: (row?.label ?? '').trim() || 'Course Fee', amount: remaining, dueDate: row?.dueDate ?? '' }];
  }
  return draft.rows.map((r) => ({ label: r.label.trim(), amount: r.amount.trim() === '' ? Number.NaN : Number(r.amount), dueDate: r.dueDate }));
}

export function toSaveBody(enrolId: string, draft: PlanDraft, remaining: number): Record<string, unknown> {
  return {
    enrol_id: enrolId,
    mode: draft.mode,
    total_fee: Number(draft.totalFee),
    discount: Number(draft.discount || 0),
    gst_percent: Number(draft.gstPercent || 0),
    installments: rowsToSend(draft, remaining).map((r) => ({ label: r.label, amount: r.amount, due_date: r.dueDate })),
  };
}

/**
 * Whether this enrolment's fee is planned on its own. The server decides
 * (own_fee_plan): every enrolment except the course of the application
 * users.application_id names, while that application's plan has a schedule.
 * The display-only enrolment (id 0) has no row to plan against.
 */
export function usesOwnFeePlan(enrolment: Record<string, unknown>): boolean {
  return asNumber(enrolment.id) > 0 && enrolment.own_fee_plan === true;
}

/** The selected enrolment's own fee rows (falls back to all rows when its course is unknown). */
export function scopeToCourse<T extends Record<string, unknown>>(rows: T[], courseId: number): T[] {
  return courseId > 0 ? rows.filter((r) => asNumber(r.course_id) === courseId) : rows;
}
