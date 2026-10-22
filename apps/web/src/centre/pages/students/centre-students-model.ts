import {
  matchesQuery, num, record, records, sortBy, str, uniqueOptions, withinRange,
  type RangeKey, type SortDir,
} from '../list-kit/list-kit-model.js';
import { parsePaymentLines, type PaymentLine } from '../applications/centre-applications-model.js';

// Centre portal → Students (Naji 2026-10-22, students.index / students.$id)
// on real data: the centre's students (role 2 under its centre), status from
// the ENROLMENT (enrol.enrollment_status — users.status flips on every login
// and holds no academic state), fee / paid from Fees → Payment Status scoped
// to these students. Students come only from converted applications.

export const STUDENT_STATUSES = ['Active', 'On Hold', 'Dropout', 'Completed', 'Graduated'] as const;
export type StudentStatus = (typeof STUDENT_STATUSES)[number];
/** Pill tabs; Completed includes Graduated. */
export type StatusTab = 'all' | 'Active' | 'On Hold' | 'Dropout' | 'Completed';
export const STATUS_TABS: Exclude<StatusTab, 'all'>[] = ['Active', 'On Hold', 'Dropout', 'Completed'];

export const STATUS_TONE: Record<StudentStatus, string> = {
  Active: 'bg-info-soft text-info',
  'On Hold': 'bg-warning-soft text-warning-foreground',
  Dropout: 'bg-destructive/10 text-destructive',
  Completed: 'bg-success-soft text-success',
  Graduated: 'bg-success-soft text-success',
};

export type FeeState = 'paid' | 'partial' | 'unpaid' | 'overdue' | 'no_plan';

export const FEE_STATE: Record<FeeState, { label: string; tone: string }> = {
  paid: { label: 'Paid', tone: 'bg-success-soft text-success' },
  partial: { label: 'Partial', tone: 'bg-warning-soft text-warning-foreground' },
  unpaid: { label: 'Unpaid', tone: 'bg-muted text-muted-foreground' },
  overdue: { label: 'Overdue', tone: 'bg-destructive/10 text-destructive' },
  no_plan: { label: 'No plan', tone: 'bg-muted text-muted-foreground' },
};

export interface StudentRow {
  id: string;
  studentCode: string;
  name: string;
  email: string;
  phone: string;
  course: string;
  offering: string;
  combination: string;
  enrolledOn: string;
  fee: number;
  paid: number;
  balance: number;
  feeState: FeeState;
  status: StudentStatus;
  /** Lessons completed %, null when the course has no content to measure. */
  progress: number | null;
  photo: string;
  loginDisabled: boolean;
}

function statusOf(value: unknown): StudentStatus {
  const s = str(value);
  return (STUDENT_STATUSES as readonly string[]).includes(s) ? (s as StudentStatus) : 'Active';
}

function feeStateOf(value: unknown): FeeState {
  const s = str(value);
  return s in FEE_STATE ? (s as FeeState) : 'no_plan';
}

export function parseStudentBoard(data: Record<string, unknown>): StudentRow[] {
  return records(data.rows).map((r): StudentRow => ({
    id: str(r.id),
    studentCode: str(r.studentCode),
    name: str(r.name),
    email: str(r.email),
    phone: str(r.phone),
    course: str(r.course),
    offering: str(r.offering),
    combination: str(r.combination),
    enrolledOn: str(r.enrolledOn),
    fee: num(r.fee),
    paid: num(r.paid),
    balance: num(r.balance),
    feeState: feeStateOf(r.feeState),
    status: statusOf(r.status),
    progress: typeof r.progress === 'number' && Number.isFinite(r.progress) ? Math.max(0, Math.min(100, r.progress)) : null,
    photo: str(r.photo),
    loginDisabled: r.loginDisabled === true,
  })).filter((r) => r.id !== '');
}

export function tabOf(status: StudentStatus): Exclude<StatusTab, 'all'> {
  return status === 'Graduated' ? 'Completed' : status;
}

export function statusCounts(rows: readonly StudentRow[]): Record<StatusTab, number> {
  const counts: Record<StatusTab, number> = { all: rows.length, Active: 0, 'On Hold': 0, Dropout: 0, Completed: 0 };
  for (const r of rows) counts[tabOf(r.status)] += 1;
  return counts;
}

export interface StudentKpis { total: number; active: number; completed: number; paid: number }

export function studentKpis(rows: readonly StudentRow[]): StudentKpis {
  const counts = statusCounts(rows);
  return { total: rows.length, active: counts.Active, completed: counts.Completed, paid: rows.reduce((sum, r) => sum + r.paid, 0) };
}

export interface StudentFilters { tab: StatusTab; query: string; course: string; offering: string; range: RangeKey }

export const DEFAULT_STUDENT_FILTERS: StudentFilters = { tab: 'all', query: '', course: 'all', offering: 'all', range: 'all' };

export function filterStudents(rows: readonly StudentRow[], f: StudentFilters, todayYmd: string): StudentRow[] {
  return rows.filter((r) =>
    (f.tab === 'all' || tabOf(r.status) === f.tab)
    && (f.course === 'all' || r.course === f.course)
    && (f.offering === 'all' || r.offering === f.offering)
    && withinRange(r.enrolledOn, f.range, todayYmd)
    && matchesQuery(f.query, r.name, r.studentCode, r.email, r.phone));
}

export type StudentSortKey = 'studentCode' | 'name' | 'course' | 'offering' | 'enrolledOn' | 'fee' | 'paid' | 'status';

export function sortStudents(rows: readonly StudentRow[], key: StudentSortKey | null, dir: SortDir): StudentRow[] {
  if (!key) return [...rows];
  const value = (r: StudentRow): string | number | null => {
    switch (key) {
      case 'studentCode': return r.studentCode;
      case 'name': return r.name;
      case 'course': return r.course;
      case 'offering': return r.offering;
      case 'enrolledOn': return r.enrolledOn;
      case 'fee': return r.fee > 0 ? r.fee : null;
      case 'paid': return r.fee > 0 ? r.paid : null;
      case 'status': return STUDENT_STATUSES.indexOf(r.status);
    }
  };
  return sortBy(rows, value, dir);
}

export function courseOptions(rows: readonly StudentRow[]) {
  return uniqueOptions(rows.map((r) => ({ value: r.course, label: r.course })));
}

export function offeringOptions(rows: readonly StudentRow[], course: string) {
  return uniqueOptions(rows.filter((r) => course === 'all' || r.course === course).map((r) => ({ value: r.offering, label: r.offering })));
}

/** CSV of the rows on screen (Export button). */
export function studentsCsv(rows: readonly StudentRow[], showMoney = true): string {
  const cell = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = ['Student ID', 'Name', 'Email', 'Phone', 'Course', 'Offering', 'Combination', 'Enrolled On', ...(showMoney ? ['Fee', 'Paid', 'Balance', 'Fee Status'] : []), 'Status'];
  const lines = rows.map((r) => [
    r.studentCode, r.name, r.email, r.phone, r.course, r.offering, r.combination, r.enrolledOn,
    ...(showMoney ? [r.fee, r.paid, r.balance, FEE_STATE[r.feeState].label] : []), r.status,
  ].map(cell).join(','));
  return [head.join(','), ...lines].join('\n');
}

// ─── Profile ────────────────────────────────────────────────────────────────

export interface StudentEnrolment { id: string; course: string; enrolmentId: string; enrolledOn: string; status: StudentStatus; mode: string }
export interface StudentCohort { id: string; code: string; title: string; course: string; instructor: string; startDate: string; endDate: string; status: 'upcoming' | 'running' | 'completed' }

export interface StudentProfile {
  id: string;
  studentCode: string;
  name: string;
  email: string;
  phone: string;
  gender: string;
  dob: string;
  place: string;
  joinedOn: string;
  photo: string;
  loginDisabled: boolean;
  offering: string;
  combination: string;
  applicationId: string;
  enrolments: StudentEnrolment[];
  payments: { fee: number; paid: number; balance: number; status: string; lines: PaymentLine[] };
  cohorts: StudentCohort[];
}

export const COHORT_STATUS: Record<StudentCohort['status'], { label: string; tone: string }> = {
  upcoming: { label: 'Upcoming', tone: 'bg-warning-soft text-warning-foreground' },
  running: { label: 'Running', tone: 'bg-info-soft text-info' },
  completed: { label: 'Completed', tone: 'bg-success-soft text-success' },
};

export function parseStudentProfile(data: Record<string, unknown>): StudentProfile | null {
  const id = str(data.id);
  if (!id) return null;
  const payments = record(data.payments);
  return {
    id,
    studentCode: str(data.studentCode),
    name: str(data.name),
    email: str(data.email),
    phone: str(data.phone),
    gender: str(data.gender),
    dob: str(data.dob),
    place: str(data.place),
    joinedOn: str(data.joinedOn),
    photo: str(data.photo),
    loginDisabled: data.loginDisabled === true,
    offering: str(data.offering),
    combination: str(data.combination),
    applicationId: str(data.applicationId),
    enrolments: records(data.enrolments).map((e) => ({
      id: str(e.id), course: str(e.course), enrolmentId: str(e.enrolmentId), enrolledOn: str(e.enrolledOn), status: statusOf(e.status), mode: str(e.mode),
    })),
    payments: {
      fee: num(payments.fee),
      paid: num(payments.paid),
      balance: num(payments.balance),
      status: str(payments.status) || 'no_plan',
      lines: parsePaymentLines(payments.lines),
    },
    cohorts: records(data.cohorts).map((c) => {
      const status = str(c.status);
      return {
        id: str(c.id), code: str(c.code), title: str(c.title), course: str(c.course), instructor: str(c.instructor),
        startDate: str(c.startDate), endDate: str(c.endDate),
        status: status === 'upcoming' || status === 'completed' ? status : 'running',
      };
    }),
  };
}

/** The headline status of a profile: its enrolments rolled up (Completed only when all are). */
export function profileStatus(enrolments: readonly StudentEnrolment[]): StudentStatus {
  if (enrolments.length === 0) return 'Active';
  const done = (s: StudentStatus) => s === 'Completed' || s === 'Graduated';
  if (enrolments.every((e) => done(e.status))) return 'Completed';
  if (enrolments.every((e) => e.status === 'Dropout')) return 'Dropout';
  if (enrolments.some((e) => e.status === 'Active')) return 'Active';
  return enrolments[0]?.status ?? 'Active';
}
