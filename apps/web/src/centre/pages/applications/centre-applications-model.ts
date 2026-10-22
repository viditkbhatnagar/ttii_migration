import {
  matchesQuery, moneyOrNull, num, record, records, sortBy, str, uniqueOptions, withinRange,
  type RangeKey, type SortDir,
} from '../list-kit/list-kit-model.js';

// Centre portal → Applications (Naji 2026-10-22) on the REAL flow. His
// Lead → Form Pending → Review Pending → Payment Pending → Approval Waiting
// stages are on hold (a centre does not pay TTII per application today), so
// an application is Pending (added, not converted, not rejected), Enrolled
// (Convert created the student) or Rejected.

export type AppState = 'pending' | 'enrolled' | 'rejected';
export type StageTab = 'all' | AppState;

export const APP_STATES: AppState[] = ['pending', 'enrolled', 'rejected'];

export const STATE_LABEL: Record<AppState, string> = { pending: 'Pending', enrolled: 'Enrolled', rejected: 'Rejected' };

export const STATE_TONE: Record<AppState, string> = {
  pending: 'bg-warning-soft text-warning-foreground',
  enrolled: 'bg-success-soft text-success',
  rejected: 'bg-destructive/10 text-destructive',
};

export interface ApplicationRow {
  id: string;
  applicationId: string;
  /** IST day added, YYYY-MM-DD. */
  date: string;
  name: string;
  phone: string;
  email: string;
  courseId: string;
  course: string;
  offeringId: string;
  offering: string;
  combinationId: string;
  combination: string;
  state: AppState;
  /** Scheduled fee on TTII's plan; null = no plan yet. */
  fee: number | null;
  paid: number | null;
  studentUserId: string;
  studentCode: string;
  rejectionReason: string;
}

function stateOf(value: unknown): AppState {
  const s = str(value);
  return s === 'enrolled' || s === 'rejected' ? s : 'pending';
}

export function parseApplicationRow(raw: Record<string, unknown>): ApplicationRow {
  return {
    id: str(raw.id),
    applicationId: str(raw.applicationId) || `#${str(raw.id)}`,
    date: str(raw.date),
    name: str(raw.name),
    phone: str(raw.phone),
    email: str(raw.email),
    courseId: str(raw.courseId),
    course: str(raw.course),
    offeringId: str(raw.offeringId),
    offering: str(raw.offering),
    combinationId: str(raw.combinationId),
    combination: str(raw.combination),
    state: stateOf(raw.state),
    fee: moneyOrNull(raw.fee),
    paid: moneyOrNull(raw.paid),
    studentUserId: str(raw.studentUserId),
    studentCode: str(raw.studentCode),
    rejectionReason: str(raw.rejectionReason),
  };
}

export function parseApplicationBoard(data: Record<string, unknown>): ApplicationRow[] {
  return records(data.rows).map(parseApplicationRow).filter((r) => r.id !== '');
}

export function stateCounts(rows: readonly ApplicationRow[]): Record<StageTab, number> {
  const counts: Record<StageTab, number> = { all: rows.length, pending: 0, enrolled: 0, rejected: 0 };
  for (const r of rows) counts[r.state] += 1;
  return counts;
}

export interface ApplicationFilters {
  stage: StageTab;
  query: string;
  course: string;
  offering: string;
  range: RangeKey;
}

export const DEFAULT_FILTERS: ApplicationFilters = { stage: 'all', query: '', course: 'all', offering: 'all', range: 'all' };

export function filterApplications(rows: readonly ApplicationRow[], f: ApplicationFilters, todayYmd: string): ApplicationRow[] {
  return rows.filter((r) =>
    (f.stage === 'all' || r.state === f.stage)
    && (f.course === 'all' || r.courseId === f.course)
    && (f.offering === 'all' || r.offeringId === f.offering)
    && withinRange(r.date, f.range, todayYmd)
    && matchesQuery(f.query, r.name, r.applicationId, r.email, r.phone, r.studentCode));
}

export type ApplicationSortKey = 'applicationId' | 'date' | 'name' | 'course' | 'combination' | 'fee' | 'state';

export function sortApplications(rows: readonly ApplicationRow[], key: ApplicationSortKey | null, dir: SortDir): ApplicationRow[] {
  if (!key) return [...rows];
  const value = (r: ApplicationRow): string | number | null => {
    switch (key) {
      case 'applicationId': return r.applicationId;
      case 'date': return r.date;
      case 'name': return r.name;
      case 'course': return `${r.course} ${r.offering}`.trim();
      case 'combination': return r.combination;
      case 'fee': return r.fee;
      case 'state': return APP_STATES.indexOf(r.state);
    }
  };
  return sortBy(rows, value, dir);
}

export function courseFilterOptions(rows: readonly ApplicationRow[]) {
  return uniqueOptions(rows.map((r) => ({ value: r.courseId, label: r.course || `Course ${r.courseId}` })));
}

/** Offerings seen on the applications, narrowed to the chosen course. */
export function offeringFilterOptions(rows: readonly ApplicationRow[], course: string) {
  return uniqueOptions(rows.filter((r) => course === 'all' || r.courseId === course).map((r) => ({ value: r.offeringId, label: r.offering || `Offering ${r.offeringId}` })));
}

// ─── Add Application options and form ───────────────────────────────────────

export type PlanStatus = 'active' | 'upcoming' | 'expired';

export interface OptionCombination { id: string; code: string; partners: string[] }
export interface OptionOffering { id: string; title: string; code: string; startDate: string; endDate: string; combinations: OptionCombination[] }
export interface OptionCourse { id: string; title: string; planStatus: PlanStatus; offerings: OptionOffering[] }

function planStatusOf(value: unknown): PlanStatus {
  const s = str(value);
  return s === 'upcoming' || s === 'expired' ? s : 'active';
}

function parseCombination(raw: Record<string, unknown>): OptionCombination {
  return { id: str(raw.id), code: str(raw.code), partners: (Array.isArray(raw.partners) ? raw.partners : []).map(str).filter(Boolean) };
}

export function parseApplicationOptions(data: Record<string, unknown>): OptionCourse[] {
  return records(data.courses).map((c) => ({
    id: str(c.id),
    title: str(c.title),
    planStatus: planStatusOf(c.planStatus),
    offerings: records(c.offerings).map((o) => ({
      id: str(o.id),
      title: str(o.title),
      code: str(o.code),
      startDate: str(o.startDate),
      endDate: str(o.endDate),
      combinations: records(o.combinations).map(parseCombination),
    })),
  })).filter((c) => c.id !== '');
}

export const PLAN_NOTE: Record<PlanStatus, string> = {
  active: '',
  upcoming: "validity hasn't started",
  expired: 'validity ended',
};

export interface AddApplicationForm {
  name: string;
  countryCode: string;
  phone: string;
  email: string;
  courseId: string;
  offeringId: string;
  combinationId: string;
}

export const EMPTY_FORM: AddApplicationForm = { name: '', countryCode: '+91', phone: '', email: '', courseId: '', offeringId: '', combinationId: '' };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function offeringsFor(courses: readonly OptionCourse[], courseId: string): OptionOffering[] {
  return courses.find((c) => c.id === courseId)?.offerings ?? [];
}

export function combinationsFor(courses: readonly OptionCourse[], courseId: string, offeringId: string): OptionCombination[] {
  return offeringsFor(courses, courseId).find((o) => o.id === offeringId)?.combinations ?? [];
}

/** Changing the course clears the offering and combination; changing the offering clears the combination. */
export function updateForm(form: AddApplicationForm, patch: Partial<AddApplicationForm>): AddApplicationForm {
  const next = { ...form, ...patch };
  if (patch.courseId !== undefined && patch.courseId !== form.courseId) return { ...next, offeringId: '', combinationId: '' };
  if (patch.offeringId !== undefined && patch.offeringId !== form.offeringId) return { ...next, combinationId: '' };
  return next;
}

/** The first problem with the form, or '' when it can be sent. The server checks the same again. */
export function validateForm(form: AddApplicationForm, courses: readonly OptionCourse[]): string {
  if (!form.name.trim()) return 'Enter the student name.';
  if (!/^\+?\d{1,4}$/.test(form.countryCode.trim())) return 'Enter a valid country code, e.g. +91.';
  if (!/^\d{6,15}$/.test(form.phone.replace(/[\s()-]/g, ''))) return 'Enter a valid phone number (digits only).';
  if (!EMAIL_RE.test(form.email.trim())) return 'Enter a valid email address.';
  const course = courses.find((c) => c.id === form.courseId);
  if (!course) return 'Choose a course.';
  if (course.planStatus !== 'active') return `Your centre's ${PLAN_NOTE[course.planStatus]} for this course.`;
  const offering = course.offerings.find((o) => o.id === form.offeringId);
  if (!offering) return 'Choose an offering.';
  if (offering.combinations.length > 0 && !offering.combinations.some((c) => c.id === form.combinationId)) return 'Choose a certificate combination.';
  return '';
}

export function addPayload(form: AddApplicationForm): Record<string, unknown> {
  return {
    name: form.name.trim(),
    code: form.countryCode.trim(),
    phone: form.phone.replace(/[\s()-]/g, ''),
    email: form.email.trim(),
    course_id: form.courseId,
    offering_id: form.offeringId,
    combination_id: form.combinationId,
  };
}

/** Pre-select a course (and offering) — the course detail "Add Application" button. */
export function presetForm(courses: readonly OptionCourse[], courseId?: string, offeringId?: string): AddApplicationForm {
  const course = courses.find((c) => c.id === courseId && c.planStatus === 'active');
  if (!course) return EMPTY_FORM;
  const offering = course.offerings.find((o) => o.id === offeringId);
  const only = offering?.combinations.length === 1 ? offering.combinations[0]?.id ?? '' : '';
  return { ...EMPTY_FORM, courseId: course.id, offeringId: offering?.id ?? '', combinationId: only };
}

// ─── Detail ─────────────────────────────────────────────────────────────────

export interface PaymentLine { label: string; course: string; amount: number; dueDate: string; paidDate: string; status: string; mode: string }
export interface TimelineEvent { type: string; description: string; at: string }

export interface ApplicationDetail extends ApplicationRow {
  dob: string;
  gender: string;
  address: string;
  district: string;
  stateName: string;
  qualification: string;
  modeOfStudy: string;
  language: string;
  addedBy: string;
  rejectedAt: string;
  rejectedBy: string;
  payments: { fee: number; paid: number; balance: number; status: string; lines: PaymentLine[] };
  timeline: TimelineEvent[];
}

export function parsePaymentLines(value: unknown): PaymentLine[] {
  return records(value).map((l) => ({
    label: str(l.label),
    course: str(l.course),
    amount: num(l.amount),
    dueDate: str(l.dueDate),
    paidDate: str(l.paidDate),
    status: str(l.status) || 'upcoming',
    mode: str(l.mode),
  }));
}

export function parseApplicationDetail(data: Record<string, unknown>): ApplicationDetail | null {
  const base = parseApplicationRow(data);
  if (!base.id) return null;
  const payments = record(data.payments);
  return {
    ...base,
    dob: str(data.dob),
    gender: str(data.gender),
    address: str(data.address),
    district: str(data.district),
    stateName: str(data.stateName),
    qualification: str(data.qualification),
    modeOfStudy: str(data.modeOfStudy),
    language: str(data.language),
    addedBy: str(data.addedBy),
    rejectedAt: str(data.rejectedAt),
    rejectedBy: str(data.rejectedBy),
    payments: {
      fee: num(payments.fee),
      paid: num(payments.paid),
      balance: num(payments.balance),
      status: str(payments.status) || 'no_plan',
      lines: parsePaymentLines(payments.lines),
    },
    timeline: records(data.timeline).map((e) => ({ type: str(e.type), description: str(e.description), at: str(e.at) })),
  };
}

export type StepStatus = 'done' | 'current' | 'rejected';

/** The real progress of a centre application: Added → Enrolled, or Added → Rejected. */
export function progressSteps(state: AppState): Array<{ label: string; status: StepStatus; hint: string }> {
  const added = { label: 'Application added', status: 'done' as StepStatus, hint: 'Added by your centre' };
  if (state === 'rejected') return [added, { label: 'Rejected', status: 'rejected', hint: 'Closed — not enrolled' }];
  if (state === 'enrolled') return [added, { label: 'Enrolled', status: 'done', hint: 'Converted to a student' }];
  return [added, { label: 'Enrolled', status: 'current', hint: 'Next: Convert to student' }];
}

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  paid: 'Fully paid', partial: 'Partially paid', unpaid: 'Unpaid', no_plan: 'No payment plan yet',
};

export const LINE_STATUS: Record<string, { label: string; tone: string }> = {
  paid: { label: 'Paid', tone: 'bg-success-soft text-success' },
  overdue: { label: 'Overdue', tone: 'bg-destructive/10 text-destructive' },
  due: { label: 'Due', tone: 'bg-warning-soft text-warning-foreground' },
  upcoming: { label: 'Upcoming', tone: 'bg-muted text-muted-foreground' },
};

/** `?new=1` on /centre/applications opens Add Application (topbar button, dashboard quick action). */
export function wantsNewApplication(search: string): boolean {
  return new URLSearchParams(search).get('new') === '1';
}
