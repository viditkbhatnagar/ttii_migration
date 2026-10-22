import { dateYmd, istYmd, money, pipelineStageOf, type StageFacts } from './centre-dashboard-model.js';

// Centre portal v2 (Naji 2026-10-22): Applications, Students and Courses &
// Fees for the logged-in centre. Pure rules only — centre-portal-apps-service.ts
// loads the rows. Real data only: the prototype's Lead → Form Pending → Review
// Pending → Payment Pending → Approval Waiting stages are ON HOLD (the centre
// does not pay TTII per application today), so a centre application has the
// three states the real flow has: pending (added, not enrolled yet), enrolled
// (Convert created the student) and rejected.

export type CentreAppState = 'pending' | 'enrolled' | 'rejected';

export function centreAppState(app: StageFacts): CentreAppState {
  const stage = pipelineStageOf(app);
  if (stage === 'enrolled') return 'enrolled';
  if (stage === 'rejected') return 'rejected';
  return 'pending';
}

// ─── Course validity (centre_course_plans) ──────────────────────────────────

export type PlanStatus = 'active' | 'upcoming' | 'expired';

export interface PlanDates { start_date: Date | null; end_date: Date | null }

/** One plan's status on an IST day: open bounds (null) never close the window. */
export function planStatusOn(plan: PlanDates, todayYmd: string): PlanStatus {
  const start = dateYmd(plan.start_date);
  const end = dateYmd(plan.end_date);
  if (start && start > todayYmd) return 'upcoming';
  if (end && end < todayYmd) return 'expired';
  return 'active';
}

/** A course is open to the centre when ANY of its plans is active today. */
export function coursePlanStatus(plans: PlanDates[], todayYmd: string): PlanStatus {
  const states = plans.map((p) => planStatusOn(p, todayYmd));
  if (states.includes('active')) return 'active';
  if (states.includes('upcoming')) return 'upcoming';
  return 'expired';
}

// ─── Offerings and certificate combinations ─────────────────────────────────

export interface OfferingWindow { status: string | null; enrollment_end: Date | null }

/** The Add Application offerings: status 'active' and the enrolment window not closed (IST day). */
export function offeringOpenOn(offering: OfferingWindow, todayYmd: string): boolean {
  if (String(offering.status ?? '').trim().toLowerCase() !== 'active') return false;
  const end = dateYmd(offering.enrollment_end);
  return end === '' || end >= todayYmd;
}

/**
 * The combinations a student can pick for an offering — the same rule as the
 * counsellor Add Lead form: the course's active combinations that the offering
 * has a certificate package for; when it has none of them, every active
 * combination of the course.
 */
export function combinationsForOffering<T extends { id: number }>(courseCombos: T[], packageComboIds: number[]): T[] {
  const priced = new Set(packageComboIds);
  const offered = courseCombos.filter((c) => priced.has(c.id));
  return offered.length > 0 ? offered : courseCombos;
}

// ─── Add Application input ──────────────────────────────────────────────────

export interface AddApplicationPayload {
  name: string;
  countryCode: string;
  phone: string;
  email: string;
  courseId: number;
  offeringId: number;
  combinationId: number;
}

export type AddApplicationCheck = { ok: true; value: AddApplicationPayload } | { ok: false; message: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_MAX = 255;
const EMAIL_MAX = 50; // applications.user_email VarChar(50)

/** A scalar as trimmed text; objects / null / undefined are ''. */
export function scalarText(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value);
  return '';
}

export function positiveInt(value: unknown): number {
  const n = typeof value === 'number' ? value : Number.parseInt(scalarText(value), 10);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

/** Shape and format checks; course / offering / combination membership is checked against the centre's options. */
export function checkAddApplication(raw: Record<string, unknown>): AddApplicationCheck {
  const name = scalarText(raw.name).replace(/\s+/g, ' ');
  const countryCode = scalarText(raw.code ?? raw.country_code) || '+91';
  const phone = scalarText(raw.phone).replace(/[\s()-]/g, '');
  const email = scalarText(raw.email).toLowerCase();
  if (!name) return { ok: false, message: 'Student name is required.' };
  if (name.length > NAME_MAX) return { ok: false, message: 'Student name is too long.' };
  if (!/^\+?\d{1,4}$/.test(countryCode)) return { ok: false, message: 'Enter a valid country code, e.g. +91.' };
  if (!/^\d{6,15}$/.test(phone)) return { ok: false, message: 'Enter a valid phone number (digits only).' };
  if (`${countryCode}${phone}`.length > EMAIL_MAX) return { ok: false, message: 'Phone number is too long.' };
  if (!email) return { ok: false, message: 'Email is required.' };
  if (email.length > EMAIL_MAX || !EMAIL_RE.test(email)) return { ok: false, message: 'Enter a valid email address.' };
  const courseId = positiveInt(raw.course_id);
  if (!courseId) return { ok: false, message: 'Choose a course.' };
  const offeringId = positiveInt(raw.offering_id);
  if (!offeringId) return { ok: false, message: 'Choose an offering.' };
  return {
    ok: true,
    value: {
      name,
      countryCode: countryCode.startsWith('+') ? countryCode : `+${countryCode}`,
      phone,
      email,
      courseId,
      offeringId,
      combinationId: positiveInt(raw.combination_id ?? raw.certificate_combination_id),
    },
  };
}

// ─── Students ───────────────────────────────────────────────────────────────

export const ENROLMENT_STATUSES = ['Active', 'On Hold', 'Dropout', 'Completed', 'Graduated'] as const;
export type EnrolmentStatus = (typeof ENROLMENT_STATUSES)[number];

/** enrol.enrollment_status in its legacy spellings; unmarked rows are Active (as on the admin Enrollments page). */
export function enrolmentStatusOf(raw: unknown): EnrolmentStatus {
  const s = scalarText(raw).toLowerCase();
  if (s === 'on hold' || s === 'onhold' || s === 'hold') return 'On Hold';
  if (s === 'dropout' || s === 'drop out' || s === 'dropped' || s === 'inactive') return 'Dropout';
  if (s === 'completed' || s === 'complete') return 'Completed';
  if (s === 'graduated' || s === 'graduate') return 'Graduated';
  return 'Active';
}

export interface MoneyTotals { fee: number; paid: number }

/** student_payments rows (listPaymentStatus `installments`) summed per users.id. */
export function feeTotalsByUser(installments: Array<Record<string, unknown>>): Map<number, MoneyTotals> {
  const out = new Map<number, MoneyTotals>();
  for (const row of installments) {
    const userId = positiveInt(row.user_id);
    if (!userId) continue;
    const amount = money(row.amount);
    const prev = out.get(userId) ?? { fee: 0, paid: 0 };
    out.set(userId, { fee: prev.fee + amount, paid: prev.paid + (row.computed_status === 'paid' ? amount : 0) });
  }
  return out;
}

// ─── Timeline ───────────────────────────────────────────────────────────────

/**
 * application_events a centre may see on its own application. Finance-only
 * notes (payment reconciliation warnings, verification ticks, link e-mails
 * with addresses) stay internal.
 */
export const CENTRE_VISIBLE_EVENTS = new Set([
  'lead_created', 'lead_edited', 'form_submitted', 'counsellor_approved', 'admin_approved_enrolled', 'converted',
  'cohort_assigned', 'rejected', 'reopened', 'payment_approved', 'payment_received_razorpay', 'instalment_paid_razorpay',
]);

export interface TimelineEvent { type: string; description: string; at: string }

export function timelineOf(
  events: Array<{ event_type: string; description: string; created_at: Date | null }>,
  createdAt: Date | null,
): TimelineEvent[] {
  const visible = events
    .filter((e) => CENTRE_VISIBLE_EVENTS.has(e.event_type))
    .map((e) => ({ type: e.event_type, description: e.description, at: e.created_at ? e.created_at.toISOString() : '' }));
  if (createdAt && !visible.some((e) => e.type === 'lead_created')) {
    visible.push({ type: 'created', description: 'Application added', at: createdAt.toISOString() });
  }
  return visible.sort((a, b) => b.at.localeCompare(a.at));
}

// ─── Text ───────────────────────────────────────────────────────────────────

const ENTITIES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };

/** Course descriptions are stored as editor HTML; the portal shows plain text. */
export function plainText(html: string | null | undefined): string {
  return String(html ?? '')
    .replace(/<\s*(br|\/p|\/li|\/h\d)\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m] ?? m)
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim();
}

export function phoneText(countryCode: string | null | undefined, phone: string | null | undefined): string {
  const p = String(phone ?? '').trim();
  if (!p) return '';
  const code = String(countryCode ?? '').trim();
  return code ? `${code.startsWith('+') ? code : `+${code}`} ${p}` : p;
}

export { dateYmd, istYmd, money };
