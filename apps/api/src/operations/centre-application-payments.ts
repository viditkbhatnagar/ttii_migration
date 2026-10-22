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

export type PaymentStatusLoader = () => Promise<Record<string, unknown>>;

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

function add<T extends Totals>(map: Map<string | number, T>, key: string | number, extra: T): void {
  const prev = map.get(key);
  map.set(key, prev ? { ...prev, fee: prev.fee + extra.fee, paid: prev.paid + extra.paid } : extra);
}

function indexInstallments(installments: Array<Record<string, unknown>>) {
  const byApp = new Map<string | number, Totals>();
  const byUserCourse = new Map<string | number, CourseTotals>();
  for (const r of installments) {
    const amount = money(r.amount);
    const totals = { fee: amount, paid: r.computed_status === 'paid' ? amount : 0 };
    const planRow = APP_PLAN_ROW.exec(typeof r.id === 'string' ? r.id : '');
    if (planRow) {
      add(byApp, Number(planRow[1]), totals);
      continue;
    }
    const userId = Number(r.user_id);
    if (!Number.isInteger(userId) || userId <= 0) continue;
    const courseId = Number(r.course_id) || 0;
    add(byUserCourse, `${userId}|${courseId}`, { ...totals, course: typeof r.course_title === 'string' ? r.course_title.trim() : '' });
  }
  return { byApp, byUserCourse };
}

function finish(row: Omit<ApplicationPaymentRow, 'fee' | 'paid' | 'balance' | 'status'>, totals: Totals): ApplicationPaymentRow {
  const fee = roundMoney(totals.fee);
  const paid = roundMoney(totals.paid);
  return { ...row, fee, paid, balance: Math.max(0, roundMoney(fee - paid)), status: paymentState(fee, paid) };
}

export function buildApplicationPayments(input: ApplicationPaymentsInput): ApplicationPaymentRow[] {
  const { byApp, byUserCourse } = indexInstallments(input.installments);
  const studentsById = new Map(input.students.map((s) => [s.id, s]));
  const studentByApp = new Map(input.students.filter((s) => s.application_id > 0).map((s) => [s.application_id, s]));
  const covered = new Set<string>();
  const linked = new Set<number>();
  const courseTitle = (id: number | null) => (id ? input.courseTitles.get(id) ?? '' : '');
  const rows: ApplicationPaymentRow[] = [];

  for (const app of input.apps) {
    const stage = pipelineStageOf(app);
    if (stage === 'rejected' || app.added_under_centre === null) continue;
    const enrolled = stage === 'enrolled';
    const student = enrolled ? (app.student_id ? studentsById.get(app.student_id) : undefined) ?? studentByApp.get(app.id) : undefined;
    const userId = enrolled ? student?.id ?? app.student_id ?? null : null;
    let totals: Totals = ZERO;
    if (userId !== null) {
      linked.add(userId);
      for (const [key, t] of byUserCourse) {
        const [uid, cid] = String(key).split('|').map(Number);
        if (uid !== userId || (app.course_id && cid !== app.course_id)) continue;
        covered.add(String(key));
        totals = { fee: totals.fee + t.fee, paid: totals.paid + t.paid };
      }
    } else if (!enrolled) {
      totals = byApp.get(app.id) ?? ZERO;
    }
    rows.push(finish({
      key: `app-${app.id}`,
      applicationId: (app.application_id ?? '').trim() || `#${app.id}`,
      studentName: (app.name ?? '').trim(),
      studentCode: (student?.student_id ?? '').trim(),
      studentUserId: userId,
      centreId: app.added_under_centre,
      centreName: input.centreNames.get(app.added_under_centre) ?? '',
      course: courseTitle(app.course_id),
      date: istYmd(app.created_at),
      source: enrolled ? 'enrolment' : 'application',
    }, totals));
  }

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
    const own = [...byUserCourse].filter(([key]) => String(key).startsWith(`${s.id}|`) && !covered.has(String(key)));
    for (const [key, t] of own) {
      const courseId = Number(String(key).split('|')[1]) || null;
      rows.push(finish({ ...base, key: `user-${s.id}-${courseId ?? 0}`, course: t.course || courseTitle(courseId) }, t));
    }
    if (own.length === 0 && !linked.has(s.id)) {
      rows.push(finish({ ...base, key: `user-${s.id}-${s.course_id ?? 0}`, course: courseTitle(s.course_id) }, ZERO));
    }
  }
  return rows.sort((a, b) => b.date.localeCompare(a.date) || a.key.localeCompare(b.key));
}
