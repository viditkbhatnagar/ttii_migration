// Per-enrolment fee plans and the student fee state (TTII 2026-10-16). Pure:
// no database, so every money rule here is unit-tested.
//
// An ADDITIONAL enrolment (a course added after the student's original
// application, or any enrolment of a student with no application) has no
// application-wide payment plan. Its fee lives only in student_payments rows
// for (user_id = users.id, course_id), which is exactly what Pay Now charges
// and every fee view reads. student_payments.amount is WHOLE RUPEES.

export const MAX_PLAN_INSTALMENTS = 24;
/** A pending checkout this young may still be paid, so its row stays locked. */
export const CHECKOUT_HOLD_MS = 24 * 60 * 60 * 1000;
const MAX_TOTAL_FEE = 10_000_000;
const LABEL_MAX = 200;

export type PlanMode = 'full' | 'installment';
export type LockReason = 'paid' | 'payment_recorded' | 'checkout' | 'status';

/** One live student_payments row, with dates already as YYYY-MM-DD ('' = none). */
export interface ScheduleRow {
  id: number;
  label: string;
  amount: number;
  status: string;
  dueDate: string;
  paidDate: string;
  paymentMode: string;
  referenceNumber: string;
  receiptUrl: string;
}

export interface ClassifiedRow extends ScheduleRow {
  locked: boolean;
  lockReason: LockReason | null;
}

const UNPAID_STATUSES = new Set(['', 'pending', 'overdue', 'due']);

/** Paid by the house rule used by every fee view: status 'paid' OR a paid date. */
export function isPaidRow(row: Pick<ScheduleRow, 'status' | 'paidDate'>): boolean {
  return row.status.trim().toLowerCase() === 'paid' || row.paidDate.trim() !== '';
}

/** A recorded payment mode, reference or receipt is evidence of money against
 *  the row. A counsellor's "manual payment" at Add Enrolment is exactly that: a
 *  Pending row with its mode set (the reference goes to payment_to), waiting
 *  for Finance — it must never be replaced by a plan. */
function hasPaymentEvidence(row: ScheduleRow): boolean {
  return row.paymentMode.trim() !== '' || row.referenceNumber.trim() !== '' || row.receiptUrl.trim() !== '';
}

/**
 * Which rows a plan save must keep exactly. Only a Pending row with no payment
 * against it may be replaced: a Paid row (the paid-lock rule), a row carrying a
 * recorded payment mode, reference or receipt, a row a checkout is paying, and
 * any row with another status (e.g. Waived) are all kept.
 */
export function classifyScheduleRow(row: ScheduleRow, checkoutRowIds: ReadonlySet<number>): ClassifiedRow {
  let lockReason: LockReason | null = null;
  if (isPaidRow(row)) lockReason = 'paid';
  else if (hasPaymentEvidence(row)) lockReason = 'payment_recorded';
  else if (checkoutRowIds.has(row.id)) lockReason = 'checkout';
  else if (!UNPAID_STATUSES.has(row.status.trim().toLowerCase())) lockReason = 'status';
  return { ...row, locked: lockReason !== null, lockReason };
}

/** student_payments ids named by checkout orders ({"sp_id": N} in create_order.notes). */
export function checkoutRowIdsFromNotes(notes: ReadonlyArray<string | null>): Set<number> {
  const ids = new Set<number>();
  for (const raw of notes) {
    try {
      const spId = Number((JSON.parse(raw ?? '') as { sp_id?: unknown } | null)?.sp_id);
      if (Number.isInteger(spId) && spId > 0) ids.add(spId);
    } catch {
      // Legacy non-JSON notes name no instalment.
    }
  }
  return ids;
}

export interface FeeBreakdown {
  totalFee: number;
  discount: number;
  gstPercent: number;
  afterDiscount: number;
  gstAmount: number;
  /** Whole rupees the schedule must add up to. */
  payable: number;
}

/**
 * Same composition as the application plan dialog: GST is added on top of the
 * fee after discount, so payable = (fee - discount) * (1 + GST%). Worked in
 * paise and rounded once, to whole rupees, because the ledger stores rupees.
 */
export function computePayable(totalFee: number, discount: number, gstPercent: number): FeeBreakdown | { error: string } {
  if (!Number.isFinite(totalFee) || totalFee <= 0) return { error: 'Enter the total fee.' };
  if (totalFee > MAX_TOTAL_FEE) return { error: 'The total fee is too large.' };
  if (!Number.isFinite(discount) || discount < 0) return { error: 'The discount cannot be negative.' };
  if (discount > totalFee) return { error: 'The discount cannot be more than the total fee.' };
  if (!Number.isFinite(gstPercent) || gstPercent < 0 || gstPercent > 100) return { error: 'GST must be between 0 and 100%.' };
  const afterPaise = Math.round(totalFee * 100) - Math.round(discount * 100);
  const gstPaise = Math.round((afterPaise * gstPercent) / 100);
  const payable = Math.round((afterPaise + gstPaise) / 100);
  if (payable < 1) return { error: 'The payable total must be at least ₹1.' };
  return { totalFee, discount, gstPercent, afterDiscount: afterPaise / 100, gstAmount: gstPaise / 100, payable };
}

/** A valid calendar date 'YYYY-MM-DD' as UTC midnight (the @db.Date form), else null. */
export function ymdToUtcMidnight(ymd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  return date;
}

export function defaultRowLabel(mode: PlanMode, index: number, offset = 0): string {
  return mode === 'full' ? 'Course Fee' : `Installment ${offset + index + 1}`;
}

/** Add whole years to a YYYY-MM-DD, clamping 29 Feb to 28 Feb. */
function addYearsYmd(ymd: string, years: number): string {
  const y = Number(ymd.slice(0, 4)) + years;
  const md = ymd.slice(5);
  const isLeap = (yr: number): boolean => (yr % 4 === 0 && yr % 100 !== 0) || yr % 400 === 0;
  return `${y}-${md === '02-29' && !isLeap(y) ? '02-28' : md}`;
}

/** Due dates must fall between a year back and three years ahead of `today`. */
export function dueDateWindow(today: string): { from: string; to: string } {
  return { from: addYearsYmd(today, -1), to: addYearsYmd(today, 3) };
}

/** Today's IST calendar day as YYYY-MM-DD. */
export function istToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

const dmy = (ymd: string): string => `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}/${ymd.slice(0, 4)}`;

export interface PlanRowInput {
  label: string;
  amount: number;
  dueDate: string;
}

export interface PlanInput {
  mode: PlanMode;
  totalFee: number;
  discount: number;
  gstPercent: number;
  rows: PlanRowInput[];
}

export interface ValidatedPlanRow {
  label: string;
  amount: number;
  dueDate: Date;
}

export type PlanValidation =
  | { ok: true; breakdown: FeeBreakdown; keptTotal: number; remaining: number; rows: ValidatedPlanRow[] }
  | { ok: false; message: string };

const inr = (n: number): string => `₹${n.toLocaleString('en-IN')}`;

/**
 * Check a plan against the rows it must keep. The kept rows stay in the
 * schedule, so they count toward the total: kept + new rows must equal the
 * payable total to the rupee. `today` (YYYY-MM-DD, IST) bounds the due dates.
 */
export function validateEnrolmentPlan(
  input: PlanInput,
  keptRows: ReadonlyArray<Pick<ScheduleRow, 'amount'>>,
  today: string,
): PlanValidation {
  const breakdown = computePayable(input.totalFee, input.discount, input.gstPercent);
  if ('error' in breakdown) return { ok: false, message: breakdown.error };
  const keptTotal = keptRows.reduce((sum, r) => sum + (Number.isFinite(r.amount) ? r.amount : 0), 0);
  const remaining = breakdown.payable - keptTotal;
  if (remaining < 0) {
    return { ok: false, message: `The instalments that must be kept already total ${inr(keptTotal)}, more than the payable ${inr(breakdown.payable)}.` };
  }
  if (input.mode !== 'full' && input.mode !== 'installment') return { ok: false, message: 'Choose full payment or instalments.' };
  if (remaining === 0) {
    if (input.rows.length > 0) return { ok: false, message: 'Nothing is left to schedule: the kept instalments already cover the payable total.' };
    return { ok: true, breakdown, keptTotal, remaining, rows: [] };
  }
  if (input.rows.length === 0) return { ok: false, message: `Add the instalments for the remaining ${inr(remaining)}.` };
  if (input.mode === 'full' && input.rows.length !== 1) return { ok: false, message: 'Full payment has exactly one row.' };
  if (input.rows.length > MAX_PLAN_INSTALMENTS) return { ok: false, message: `A plan can have at most ${MAX_PLAN_INSTALMENTS} instalments.` };

  const window = dueDateWindow(today);
  const rows: ValidatedPlanRow[] = [];
  for (const [i, row] of input.rows.entries()) {
    const n = i + 1;
    if (!Number.isInteger(row.amount) || row.amount < 1) {
      return { ok: false, message: `Row ${n}: the amount must be a whole number of rupees, at least ₹1.` };
    }
    const dueDate = ymdToUtcMidnight(row.dueDate);
    if (!dueDate) return { ok: false, message: `Row ${n}: enter a valid due date.` };
    const due = row.dueDate.trim();
    if (due < window.from || due > window.to) {
      return { ok: false, message: `Row ${n}: the due date must be between ${dmy(window.from)} and ${dmy(window.to)}.` };
    }
    const label = row.label.trim().slice(0, LABEL_MAX) || defaultRowLabel(input.mode, i);
    rows.push({ label, amount: row.amount, dueDate });
  }
  const planned = rows.reduce((sum, r) => sum + r.amount, 0);
  if (planned !== remaining) {
    const kept = keptTotal > 0 ? ` after ${inr(keptTotal)} already kept` : '';
    return { ok: false, message: `The rows add up to ${inr(planned)} but ${inr(remaining)} is left to schedule (payable ${inr(breakdown.payable)}${kept}).` };
  }
  return { ok: true, breakdown, keptTotal, remaining, rows };
}

// ── Pricing (offering packages) ───────────────────────────────────────────

export interface PackagePricing {
  combination_id: number;
  fee_category: string | null;
  base_fee: number | null;
  discount: number | null;
  offered_fee: number | null;
  gst_percent: number | null;
}

export interface OfferingPricing {
  id: number;
  course_id: number;
  title: string;
  fee_category: string | null;
  base_fee: number | null;
  discount: number | null;
  offered_fee: number | null;
  pricing_amount: number | null;
  packages: PackagePricing[];
}

export function isFreeCategory(category: string | null | undefined): boolean {
  return (category ?? '').trim().toLowerCase() === 'free';
}

/** The package pricing an enrolment uses, resolved the way the Student View Fee
 *  Summary does: paid packages first, the held combination first, else the
 *  first package. */
export function pickPricingPackage(packages: ReadonlyArray<PackagePricing>, combinationId: number | null): PackagePricing | null {
  const paid = packages.filter((p) => !isFreeCategory(p.fee_category ?? 'paid'));
  const pool = paid.length > 0 ? paid : packages;
  return (combinationId ? pool.find((p) => p.combination_id === combinationId) : undefined) ?? pool[0] ?? null;
}

/**
 * Whether an enrolment is genuinely free. course.is_free_course cannot say so:
 * the admin course form saves it as 1 on EVERY course (pricing moved to Course
 * Offerings), so paid courses carry it too. The real signal is the offering
 * pricing: the enrolment's own offering package (its combination, else all of
 * its packages), else every offering of the course.
 */
export function isFreeByPricing(input: {
  enrolmentOffering: OfferingPricing | null;
  combinationId: number | null;
  courseOfferings: ReadonlyArray<OfferingPricing>;
}): boolean {
  const offeringIsFree = (o: OfferingPricing): boolean => (
    o.packages.length > 0 ? o.packages.every((p) => isFreeCategory(p.fee_category)) : isFreeCategory(o.fee_category)
  );
  const own = input.enrolmentOffering;
  if (own) {
    const matched = input.combinationId ? own.packages.find((p) => p.combination_id === input.combinationId) : undefined;
    return matched ? isFreeCategory(matched.fee_category) : offeringIsFree(own);
  }
  return input.courseOfferings.length > 0 && input.courseOfferings.every(offeringIsFree);
}

export type StudentFeeStatus = 'scheduled' | 'priced' | 'free' | 'pending';

/**
 * The student's fee state for one enrolled course. Their own schedule wins;
 * then a legacy course price; "free" only on a real free signal. A paid course
 * with no fee yet is 'pending' — never shown as free, never offered Pay Now.
 */
export function studentCourseFeeStatus(scheduleTotal: number, legacyTotal: number, isFree: boolean): StudentFeeStatus {
  if (scheduleTotal > 0) return 'scheduled';
  if (legacyTotal > 0) return 'priced';
  return isFree ? 'free' : 'pending';
}

/** Admin fee views: a course with no resolvable price but a schedule is billed
 *  what its schedule says (an additional enrolment's plan lives only there). */
export function feeWithScheduleFallback(computedFee: number, scheduleTotal: number): { fee: number; fromSchedule: boolean } {
  if (computedFee > 0 || !(scheduleTotal > 0)) return { fee: computedFee, fromSchedule: false };
  return { fee: scheduleTotal, fromSchedule: true };
}

// ── Prefill ───────────────────────────────────────────────────────────────

export type PrefillSource = 'offering' | 'fee_structure' | 'course';

export interface FeePrefill {
  totalFee: number | null;
  discount: number;
  gstPercent: number;
  source: PrefillSource | null;
  sourceLabel: string;
}

const positive = (v: number | null | undefined): number | null => (v != null && Number.isFinite(v) && v > 0 ? v : null);

/** Package pricing as dialog inputs, mirroring GeneratePaymentLinkDialog. */
function fromPackage(pkg: PackagePricing): { totalFee: number; discount: number; gstPercent: number } | null {
  const base = positive(pkg.base_fee);
  const offered = positive(pkg.offered_fee);
  const total = base ?? offered;
  if (total == null) return null;
  const discount = positive(pkg.discount) ?? (base != null && offered != null ? Math.max(0, base - offered) : 0);
  const gst = pkg.gst_percent != null && Number.isFinite(pkg.gst_percent) ? pkg.gst_percent : 0;
  return { totalFee: total, discount, gstPercent: gst };
}

/** An offering with no packages carries scalar pricing (no GST column). */
function fromOfferingScalar(o: OfferingPricing): { totalFee: number; discount: number; gstPercent: number } | null {
  const base = positive(o.base_fee) ?? positive(o.pricing_amount);
  const offered = positive(o.offered_fee);
  const total = base ?? offered;
  if (total == null) return null;
  const discount = positive(o.discount) ?? (base != null && offered != null ? Math.max(0, base - offered) : 0);
  return { totalFee: total, discount, gstPercent: 0 };
}

function fromOffering(o: OfferingPricing, combinationId: number | null, combinationGst: number | null): { totalFee: number; discount: number; gstPercent: number } | null {
  if (o.packages.length > 0) {
    const pkg = pickPricingPackage(o.packages, combinationId);
    return pkg && !isFreeCategory(pkg.fee_category) ? fromPackage(pkg) : null;
  }
  if (isFreeCategory(o.fee_category)) return null;
  const scalar = fromOfferingScalar(o);
  return scalar && combinationGst != null ? { ...scalar, gstPercent: combinationGst } : scalar;
}

/**
 * Prefill for the per-enrolment plan, from the course's offering or fee
 * structure when one resolves, otherwise blank:
 *   1. the offering chosen for this enrolment (its package for the held
 *      combination, else its first paid package, else its own pricing);
 *   2. the course's fee structure when it offers exactly one price;
 *   3. the legacy course fee (course_fees, course.total_amount, sale_price).
 */
export function resolveFeePrefill(input: {
  enrolmentOffering: OfferingPricing | null;
  combinationId: number | null;
  combinationGst: number | null;
  courseOfferings: ReadonlyArray<OfferingPricing>;
  courseFee: { base_fee: number | null; discount: number | null } | null;
  course: { total_amount: number | null; sale_price: number | null } | null;
}): FeePrefill {
  const own = input.enrolmentOffering;
  if (own) {
    const priced = fromOffering(own, input.combinationId, input.combinationGst);
    if (priced) return { ...priced, source: 'offering', sourceLabel: `the course offering "${own.title || `#${own.id}`}"` };
  }

  const options = new Map<string, { totalFee: number; discount: number; gstPercent: number }>();
  for (const o of input.courseOfferings) {
    const candidates = o.packages.length > 0
      ? o.packages.filter((p) => !isFreeCategory(p.fee_category)).map(fromPackage)
      : [isFreeCategory(o.fee_category) ? null : fromOfferingScalar(o)];
    for (const c of candidates) {
      if (c) options.set(`${c.totalFee}|${c.discount}|${c.gstPercent}`, c);
    }
  }
  const onlyOption = options.size === 1 ? [...options.values()][0] : undefined;
  if (onlyOption) return { ...onlyOption, source: 'fee_structure', sourceLabel: "the course's fee structure" };

  const legacyBase = positive(input.courseFee?.base_fee);
  if (legacyBase != null) {
    const discount = Math.min(legacyBase, positive(input.courseFee?.discount) ?? 0);
    return { totalFee: legacyBase, discount, gstPercent: 0, source: 'course', sourceLabel: "the course's fee" };
  }
  const coursePrice = positive(input.course?.total_amount) ?? positive(input.course?.sale_price);
  if (coursePrice != null) return { totalFee: coursePrice, discount: 0, gstPercent: 0, source: 'course', sourceLabel: "the course's price" };

  return { totalFee: null, discount: 0, gstPercent: 0, source: null, sourceLabel: '' };
}

// ── Which plan governs an enrolment ───────────────────────────────────────

/** Whether an application payment_plan holds a schedule (instalments, full
 *  mode or a total) — as opposed to only recorded payments, or nothing. */
export function planHasSchedule(paymentPlanJson: string | null | undefined): boolean {
  if (!paymentPlanJson) return false;
  let plan: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(paymentPlanJson);
    if (!parsed || typeof parsed !== 'object') return false;
    plan = parsed as Record<string, unknown>;
  } catch {
    return false;
  }
  if (Array.isArray(plan.installments) && plan.installments.length > 0) return true;
  if (plan.mode === 'full') return true;
  const total = Number(plan.total_amount_minor ?? 0);
  return Number.isFinite(total) && total > 0;
}

/**
 * Whether an enrolment's fee is planned on its own (student_payments) rather
 * than by the application-wide plan. The application-wide plan is the
 * authority only for the course of the application `users.application_id`
 * names, and only while that plan HAS a schedule. A student with no linked
 * application (application_id 0) has no original course: the newest
 * application by email is often an Add Enrolment one, so it is never used.
 */
export function usesOwnFeePlan(
  courseId: number | null,
  original: { course_id: number | null; payment_plan: string | null } | null,
): boolean {
  if (!original || original.course_id == null || original.course_id !== courseId) return true;
  return !planHasSchedule(original.payment_plan);
}

/**
 * Fee of an enrolment on its own plan. Its schedule is the fee — except when
 * everything scheduled is paid and the AGREED payable is larger: then the
 * rest is still to be scheduled, so it must never read as cleared.
 *
 * Agreed = the payable the per-enrolment plan tool saved, else the fee entered
 * on the enrolment's application (both live in application_final_fee). A list
 * price is NEVER used: a ₹15,000 plan agreed against a ₹21,240 package would
 * show a phantom ₹6,240 balance the admin could not clear (TTII 2026-10-17).
 * With no agreed payable this behaves exactly as before.
 */
export function ownPlanFee(input: { scheduleTotal: number; paidTotal: number; agreedPayable: number | null }): { fee: number; balancePending: boolean } {
  const settled = input.scheduleTotal > 0 && input.paidTotal >= input.scheduleTotal;
  if (settled && input.agreedPayable != null && input.agreedPayable > input.scheduleTotal) {
    return { fee: input.agreedPayable, balancePending: true };
  }
  return { fee: input.scheduleTotal, balancePending: false };
}

/** An application_final_fee as whole rupees, or null when none is recorded. */
export function agreedPayableOf(finalFee: number | null | undefined): number | null {
  return finalFee != null && Number.isFinite(finalFee) && finalFee > 0 ? Math.round(finalFee) : null;
}

// ── Money recorded outside the schedule ───────────────────────────────────

export interface ReceivedMoney {
  /** Approved on the enrolment's own application ledger, rupees. */
  application: number;
  /** The application reads paid but holds no amount. */
  applicationPaidUnknown: boolean;
  applicationCode: string;
  /** A manual payment on the application awaits Finance approval. */
  pendingApproval: boolean;
  /** An application payment link may still be paid; its expiry YYYY-MM-DD or ''. */
  linkOutstanding: boolean;
  linkExpiresOn: string;
  /** Live checkout payments (payment_info) for the course, rupees. */
  online: number;
}

export const NO_MONEY_ELSEWHERE: ReceivedMoney = {
  application: 0, applicationPaidUnknown: false, applicationCode: '', pendingApproval: false,
  linkOutstanding: false, linkExpiresOn: '', online: 0,
};

/**
 * Why a plan must not be saved yet, or null. Money that reaches the course
 * outside its schedule — a checkout paid on the course price, a payment link or
 * a Finance-approved manual payment on the enrolment's application — never
 * writes student_payments, so a plan saved over it would bill the student again.
 * The Paid rows must cover every rupee received, and nothing may be in flight.
 */
/**
 * Why nothing else may be scheduled or recorded for a course while its
 * application's payment link is open: the student could pay twice. Shared by
 * the plan tool and Add Instalment (TTII 2026-10-17).
 */
export function openLinkMessage(applicationCode: string, linkExpiresOn: string): string {
  const code = applicationCode || 'the application';
  const until = linkExpiresOn ? ` until ${dmy(linkExpiresOn)}` : '';
  return `A payment link from this enrolment's application (${code}) can still be paid${until}. Cancel the payment link first, or wait until it is paid (the payment is then recorded automatically) or has expired.`;
}

export function planBlockReason(money: ReceivedMoney, paidRowsTotal: number): string | null {
  const code = money.applicationCode || 'the application';
  if (money.pendingApproval) {
    return `A payment on this enrolment's application (${code}) is waiting for Finance approval. Approve or reject it first, record an approved payment as a Paid instalment, then save the plan.`;
  }
  if (money.linkOutstanding) return openLinkMessage(money.applicationCode, money.linkExpiresOn);
  const received = money.application + money.online;
  if (received > paidRowsTotal) {
    const parts = [
      ...(money.online > 0 ? [`${inr(money.online)} online`] : []),
      ...(money.application > 0 ? [`${inr(money.application)} on this enrolment's application (${code})`] : []),
    ];
    return `This student has already paid ${parts.join(' and ')} for this course, but the schedule shows ${inr(paidRowsTotal)} paid; record it as a Paid instalment first.`;
  }
  if (money.applicationPaidUnknown && paidRowsTotal <= 0) {
    return `This enrolment's application (${code}) is marked paid; record that payment as a Paid instalment first.`;
  }
  return null;
}
