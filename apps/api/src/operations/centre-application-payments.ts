import { istYmd, money, paymentState, pipelineStageOf, roundMoney, type PaymentState } from './centre-dashboard-model.js';

// Wallet & Payment → Application Payments (Naji 2026-10-22). The prototype
// built this tab from unrelated sample applications; here every number comes
// from the SAME computation as Fees → Payment Status
// (OperationsService.listPaymentStatus), so the two screens always agree:
//  - before enrolment: the application's payment_plan instalments (rows
//    "app-{applicationId}-{n}", paise already turned into rupees there), paid
//    when Payment Status marks them paid (registration settled / ledger
//    approved);
//  - after enrolment: student_payments rows of the student (users.id) for the
//    application's course, paid when status = 'Paid'.
// Fee = everything scheduled, Paid = the instalments marked paid, Balance =
// the rest. Centre students with no centre application (added directly under
// the centre) get a row per course they have payments for, or one "No plan"
// row. Rejected applications are left out: they owe nothing.
//
// "Enrolled" is is_converted = 1 — the SAME test listPaymentStatus uses to
// stop listing the plan — so an application marked converted / enrolled by
// stage alone keeps its plan rows. Each (student, course) group of
// student_payments is counted on exactly ONE row: the newest converted
// application of that student for that course; an application with no course
// takes only the groups no other application claimed; the rest become the
// student's own rows.

/** listPaymentStatus narrowed to the centre students (users.id) and centre applications (applications.id). */
export interface PaymentStatusScope { userIds: number[]; applicationIds: number[] }

export type PaymentStatusLoader = (scope: PaymentStatusScope) => Promise<Record<string, unknown>>;

export interface ApplicationPaymentRow {
  /** Stable row key: "app-12", or "user-5-9" (user 5, course 9) for a student with no centre application. */
  key: string;
  /** applications.application_id ('' for a student added directly under the centre). */
  applicationId: string;
  studentName: string;
  /** The TTS code once enrolled, else ''. */
  studentCode: string;
  /** users.id of the enrolled student, null before enrolment. */
  studentUserId: number | null;
  centreId: number;
  centreName: string;
  course: string;
  fee: number;
  paid: number;
  balance: number;
  /** IST day the application (or the student) was created, YYYY-MM-DD. */
  date: string;
  status: PaymentState;
  /** Whose money this is: the pre-enrolment plan, or the enrolled student's ledger. */
  source: 'application' | 'enrolment';
}

interface Totals { fee: number; paid: number }
interface CourseTotals extends Totals { course: string }

type AppInput = ApplicationPaymentsInput['apps'][number];

export interface ApplicationPaymentsInput {
  centreNames: Map<number, string>;
  courseTitles: Map<number, string>;
  apps: Array<{
    id: number; application_id: string | null; name: string | null; added_under_centre: number | null; course_id: number | null;
    stage: string | null; status: string | null; is_converted: number | null; student_id: number | null; created_at: Date | null;
  }>;
  students: Array<{
    id: number; name: string | null; student_id: string | null; course_id: number | null; application_id: number;
    added_under_centre: number | null; created_at: Date | null;
  }>;
  /** `installments` of the Payment Status payload. */
  installments: Array<Record<string, unknown>>;
}

const APP_PLAN_ROW = /^app-(\d+)-\d+$/;
const ZERO: Totals = { fee: 0, paid: 0 };

/** Plan rows by application id; student_payments by user id, then course id (O(1) lookups). */
function indexInstallments(installments: Array<Record<string, unknown>>) {
  const byApp = new Map<number, Totals>();
  const byUser = new Map<number, Map<number, CourseTotals>>();
  for (const r of installments) {
    const amount = money(r.amount);
    const paid = r.computed_status === 'paid' ? amount : 0;
    const planRow = APP_PLAN_ROW.exec(typeof r.id === 'string' ? r.id : '');
    if (planRow) {
      const appId = Number(planRow[1]);
      const prev = byApp.get(appId) ?? ZERO;
      byApp.set(appId, { fee: prev.fee + amount, paid: prev.paid + paid });
      continue;
    }
    const userId = Number(r.user_id);
    if (!Number.isInteger(userId) || userId <= 0) continue;
    const courseId = Number(r.course_id) || 0;
    const courses = byUser.get(userId) ?? new Map<number, CourseTotals>();
    const prev = courses.get(courseId);
    const course = typeof r.course_title === 'string' ? r.course_title.trim() : '';
    courses.set(courseId, prev
      ? { fee: prev.fee + amount, paid: prev.paid + paid, course: prev.course || course }
      : { fee: amount, paid, course });
    byUser.set(userId, courses);
  }
  return { byApp, byUser };
}

function finish(row: Omit<ApplicationPaymentRow, 'fee' | 'paid' | 'balance' | 'status'>, totals: Totals): ApplicationPaymentRow {
  const fee = roundMoney(totals.fee);
  const paid = roundMoney(totals.paid);
  return { ...row, fee, paid, balance: Math.max(0, roundMoney(fee - paid)), status: paymentState(fee, paid) };
}

const createdMs = (app: AppInput): number => app.created_at?.getTime() ?? 0;

interface ResolvedApp { app: AppInput & { added_under_centre: number }; converted: boolean; userId: number | null; studentCode: string }

/** Each (user, course) group goes to one application: newest first, course-specific claims before course-less ones. */
function claimGroups(resolved: ResolvedApp[], byUser: Map<number, Map<number, CourseTotals>>) {
  const claimed = new Set<string>();
  const share = new Map<number, Totals>();
  /** "user|course" → the application that counts that group (for listing a row's instalments). */
  const owner = new Map<string, number>();
  const newestFirst = [...resolved].sort((a, b) => createdMs(b.app) - createdMs(a.app) || b.app.id - a.app.id);
  const take = (r: ResolvedApp, courseId: number, group: CourseTotals) => {
    const key = `${r.userId}|${courseId}`;
    if (claimed.has(key)) return;
    claimed.add(key);
    owner.set(key, r.app.id);
    const prev = share.get(r.app.id) ?? ZERO;
    share.set(r.app.id, { fee: prev.fee + group.fee, paid: prev.paid + group.paid });
  };
  for (const r of newestFirst) {
    if (r.userId === null || !r.app.course_id) continue;
    const group = byUser.get(r.userId)?.get(r.app.course_id);
    if (group) take(r, r.app.course_id, group);
  }
  for (const r of newestFirst) {
    if (r.userId === null || r.app.course_id) continue;
    for (const [courseId, group] of byUser.get(r.userId) ?? []) take(r, courseId, group);
  }
  return { claimed, share, owner };
}

/** The applications that get a row (centre set, not rejected), with the enrolled student when converted. */
function resolveApps(input: ApplicationPaymentsInput): ResolvedApp[] {
  const studentsById = new Map(input.students.map((s) => [s.id, s]));
  const studentByApp = new Map(input.students.filter((s) => s.application_id > 0).map((s) => [s.application_id, s]));
  return input.apps.flatMap((app) => {
    const centreId = app.added_under_centre;
    if (centreId === null || pipelineStageOf(app) === 'rejected') return [];
    const converted = app.is_converted === 1;
    const student = converted ? (app.student_id ? studentsById.get(app.student_id) : undefined) ?? studentByApp.get(app.id) : undefined;
    return [{
      app: { ...app, added_under_centre: centreId },
      converted,
      userId: converted ? student?.id ?? app.student_id ?? null : null,
      studentCode: (student?.student_id ?? '').trim(),
    }];
  });
}

export function buildApplicationPayments(input: ApplicationPaymentsInput): ApplicationPaymentRow[] {
  const { byApp, byUser } = indexInstallments(input.installments);
  const courseTitle = (id: number | null) => (id ? input.courseTitles.get(id) ?? '' : '');

  const resolved = resolveApps(input);
  const { claimed, share } = claimGroups(resolved, byUser);
  const linked = new Set(resolved.map((r) => r.userId).filter((id): id is number => id !== null));

  const rows: ApplicationPaymentRow[] = resolved.map(({ app, converted, userId, studentCode }) => finish({
    key: `app-${app.id}`,
    applicationId: (app.application_id ?? '').trim() || `#${app.id}`,
    studentName: (app.name ?? '').trim(),
    studentCode,
    studentUserId: userId,
    centreId: app.added_under_centre,
    centreName: input.centreNames.get(app.added_under_centre) ?? '',
    course: courseTitle(app.course_id),
    date: istYmd(app.created_at),
    source: converted ? 'enrolment' : 'application',
  }, share.get(app.id) ?? byApp.get(app.id) ?? ZERO));

  for (const s of input.students) {
    if (s.added_under_centre === null) continue;
    const base = {
      applicationId: '',
      studentName: (s.name ?? '').trim(),
      studentCode: (s.student_id ?? '').trim(),
      studentUserId: s.id,
      centreId: s.added_under_centre,
      centreName: input.centreNames.get(s.added_under_centre) ?? '',
      date: istYmd(s.created_at),
      source: 'enrolment' as const,
    };
    const own = [...(byUser.get(s.id) ?? [])].filter(([courseId]) => !claimed.has(`${s.id}|${courseId}`));
    for (const [courseId, t] of own) {
      rows.push(finish({ ...base, key: `user-${s.id}-${courseId}`, course: t.course || courseTitle(courseId || null) }, t));
    }
    if (own.length === 0 && !linked.has(s.id)) {
      rows.push(finish({ ...base, key: `user-${s.id}-${s.course_id ?? 0}`, course: courseTitle(s.course_id) }, ZERO));
    }
  }
  return rows.sort((a, b) => b.date.localeCompare(a.date) || a.key.localeCompare(b.key));
}

/**
 * The Payment Status rows behind each row of buildApplicationPayments, by row
 * key — the SAME attribution (plan rows to their application; each (student,
 * course) group of student_payments to the one application that claims it,
 * else to the student's own row), so a row's instalments always sum to its
 * fee. Rows with nothing scheduled are absent. Centre portal Wallet & Payment
 * uses it for the student payment view (2026-10-22).
 */
export function applicationPaymentInstalments(input: ApplicationPaymentsInput): Map<string, Array<Record<string, unknown>>> {
  const { byUser } = indexInstallments(input.installments);
  const resolved = resolveApps(input);
  const { owner } = claimGroups(resolved, byUser);
  const appIds = new Set(resolved.map((r) => r.app.id));
  // An application counting a student's payments shows those, not its plan (as buildApplicationPayments does).
  const counted = new Set(owner.values());
  const centreStudents = new Set(input.students.filter((s) => s.added_under_centre !== null).map((s) => s.id));
  const out = new Map<string, Array<Record<string, unknown>>>();
  const add = (key: string, row: Record<string, unknown>) => {
    const list = out.get(key);
    if (list) list.push(row);
    else out.set(key, [row]);
  };
  for (const r of input.installments) {
    const planRow = APP_PLAN_ROW.exec(typeof r.id === 'string' ? r.id : '');
    if (planRow) {
      const appId = Number(planRow[1]);
      if (appIds.has(appId) && !counted.has(appId)) add(`app-${appId}`, r);
      continue;
    }
    const userId = Number(r.user_id);
    if (!Number.isInteger(userId) || userId <= 0) continue;
    const courseId = Number(r.course_id) || 0;
    const claimedBy = owner.get(`${userId}|${courseId}`);
    if (claimedBy !== undefined) add(`app-${claimedBy}`, r);
    else if (centreStudents.has(userId)) add(`user-${userId}-${courseId}`, r);
  }
  return out;
}
