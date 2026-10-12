import { asNumber, asString, formatDate } from '../../shared/utils/admin-data-utils.js';
import { dmy, matchesSearch, sortRows, ymdOf, type SortDir } from '../cohorts/list-model.js';

// Assignment Summary + Assignment Evaluation view models (TTII 2026-10-12,
// Naji's AssignmentSummaryModule / AssignmentEvaluationModule).

/* ── Assignment Summary (GET /admin/assignment/index) ─────────────────── */

export type SummaryTab = 'pending' | 'completed' | 'all';
export type SummarySortKey = 'title' | 'course' | 'cohort' | 'marks' | 'added' | 'due' | 'totalStudents' | 'submissions' | 'evaluated';

export interface SummaryRow {
  id: string;
  title: string;
  course: string;
  cohort: string;
  marks: number;
  /** added_date is a timestamp: raw ISO for sorting, local dd/mm/yyyy for display. */
  addedAt: string;
  addedOn: string;
  dueYmd: string;
  totalStudents: number;
  submissions: number;
  evaluated: number;
  /** Naji UAT 2026-05-22: pending = no submissions yet, or any still ungraded. */
  evalStatus: 'pending' | 'completed';
  raw: Record<string, unknown>;
}

export function toSummaryRow(r: Record<string, unknown>): SummaryRow {
  const submissions = asNumber(r.submission_count);
  const evaluated = asNumber(r.evaluated_count);
  return {
    id: asString(r.id),
    title: asString(r.title),
    course: asString(r.course_title),
    cohort: asString(r.cohort_title),
    marks: asNumber(r.total_marks),
    addedAt: asString(r.added_date),
    addedOn: formatDate(r.added_date),
    dueYmd: ymdOf(r.due_date),
    totalStudents: asNumber(r.total_students),
    submissions,
    evaluated,
    evalStatus: submissions > 0 && evaluated >= submissions ? 'completed' : 'pending',
    raw: r,
  };
}

/**
 * Rows to list. Legacy test rows with no title AND no course/cohort link are
 * dropped (Naji UAT 2026-05-22).
 */
export function toSummaryRows(data: unknown): SummaryRow[] {
  if (!Array.isArray(data)) return [];
  return data
    .filter((r): r is Record<string, unknown> => !!r && typeof r === 'object')
    .filter((r) => asString(r.title).trim() !== '' || (asString(r.course_id) || asString(r.cohort_id)) !== '')
    .map(toSummaryRow);
}

export function filterSummary(rows: SummaryRow[], tab: SummaryTab, search: string): SummaryRow[] {
  return rows.filter((a) => (tab === 'all' || a.evalStatus === tab) && matchesSearch(search, [a.title, a.course, a.cohort]));
}

export function summaryCounts(rows: SummaryRow[]): Record<SummaryTab, number> {
  const pending = rows.filter((a) => a.evalStatus === 'pending').length;
  return { pending, completed: rows.length - pending, all: rows.length };
}

export function sortSummary(rows: SummaryRow[], key: SummarySortKey, dir: SortDir): SummaryRow[] {
  const pick = (a: SummaryRow): string | number => {
    switch (key) {
      case 'added': return a.addedAt;
      case 'due': return a.dueYmd;
      default: return a[key];
    }
  };
  return sortRows(rows, pick, dir);
}

export function summaryCsvRows(rows: SummaryRow[]): Array<Array<string | number>> {
  return [
    ['Title', 'Course', 'Cohort', 'Marks', 'Added', 'Due Date', 'Total Students', 'Submissions', 'Evaluated', 'Evaluation'],
    ...rows.map((a) => [a.title, a.course, a.cohort, a.marks, a.addedOn, dmy(a.dueYmd), a.totalStudents, a.submissions, `${a.evaluated} / ${a.submissions}`, a.evalStatus === 'completed' ? 'Completed' : 'Pending']),
  ];
}

/** Submission rate as a whole percent (0 when nobody is enrolled). */
export function submittedPercent(a: SummaryRow): number {
  return a.totalStudents > 0 ? Math.round((a.submissions / a.totalStudents) * 100) : 0;
}

/* ── Assignment Evaluation (GET /admin/assignment/evaluations) ─────────── */

export type EvalStatus = 'pending_evaluation' | 'pending_verification' | 'result_published' | 'returned';
export type EvalSortKey = 'student' | 'course' | 'offering' | 'subject' | 'cohort' | 'instructor' | 'submitted' | 'marks' | 'evaluated';

export const EVAL_TABS: Array<{ id: EvalStatus; label: string }> = [
  { id: 'pending_evaluation', label: 'Pending Evaluation' },
  { id: 'pending_verification', label: 'Pending Verification' },
  { id: 'result_published', label: 'Result Published' },
  { id: 'returned', label: 'Returned' },
];

export interface EvalRow {
  id: string;
  status: EvalStatus;
  studentName: string;
  studentCode: string;
  assignmentId: string;
  assignmentTitle: string;
  course: string;
  offering: string;
  subject: string;
  cohort: string;
  instructor: string;
  /** Sortable submitted / evaluated timestamps (ISO) and their dd/mm/yyyy display. */
  submittedAt: string;
  submittedOn: string;
  evaluatedAt: string;
  evaluatedOn: string;
  marks: string;
  totalMarks: string;
  remarks: string;
  submissionFile: string;
  raw: Record<string, unknown>;
}

const STATUSES: EvalStatus[] = ['pending_evaluation', 'pending_verification', 'result_published', 'returned'];

export function toEvalRow(r: Record<string, unknown>): EvalRow {
  const status = asString(r.status) as EvalStatus;
  return {
    id: asString(r.id),
    status: STATUSES.includes(status) ? status : 'pending_evaluation',
    studentName: asString(r.student_name),
    studentCode: asString(r.student_id),
    assignmentId: asString(r.assignment_id),
    assignmentTitle: asString(r.assignment_title),
    course: asString(r.course_title),
    offering: asString(r.offering_title),
    subject: asString(r.subject_title),
    cohort: asString(r.cohort_title) || asString(r.cohort_code),
    instructor: asString(r.instructor_name),
    submittedAt: asString(r.submitted_at),
    submittedOn: formatDate(r.submitted_at),
    evaluatedAt: asString(r.evaluated_at),
    evaluatedOn: formatDate(r.evaluated_at),
    marks: asString(r.marks),
    totalMarks: asString(r.total_marks),
    remarks: asString(r.remarks),
    submissionFile: asString(r.submission_file),
    raw: r,
  };
}

export function toEvalRows(data: unknown): EvalRow[] {
  return Array.isArray(data)
    ? data.filter((r): r is Record<string, unknown> => !!r && typeof r === 'object').map(toEvalRow)
    : [];
}

export function evalCounts(rows: EvalRow[]): Record<EvalStatus, number> {
  const c: Record<EvalStatus, number> = { pending_evaluation: 0, pending_verification: 0, result_published: 0, returned: 0 };
  for (const r of rows) c[r.status] += 1;
  return c;
}

export function filterEval(rows: EvalRow[], tab: EvalStatus, search: string): EvalRow[] {
  return rows.filter((r) => r.status === tab && matchesSearch(search, [r.studentName, r.studentCode, r.course, r.subject, r.cohort, r.instructor, r.assignmentTitle, r.offering]));
}

export function sortEval(rows: EvalRow[], key: EvalSortKey, dir: SortDir): EvalRow[] {
  const pick = (r: EvalRow): string | number => {
    switch (key) {
      case 'student': return r.studentName;
      case 'submitted': return r.submittedAt;
      case 'evaluated': return r.evaluatedAt;
      case 'marks': return Number(r.marks) || 0;
      default: return r[key];
    }
  };
  return sortRows(rows, pick, dir);
}

/** Marks + Evaluated On columns only mean something once a mark exists. */
export function showsMarks(tab: EvalStatus): boolean {
  return tab === 'pending_verification' || tab === 'result_published';
}

export function evalCsvRows(rows: EvalRow[]): Array<Array<string | number>> {
  return [
    ['Student', 'Student ID', 'Assignment', 'Course', 'Offering', 'Subject', 'Cohort', 'Instructor', 'Submitted On', 'Marks', 'Total Marks', 'Evaluated On', 'Status'],
    ...rows.map((r) => [
      r.studentName, r.studentCode, r.assignmentTitle, r.course, r.offering, r.subject, r.cohort, r.instructor, r.submittedOn,
      r.marks, r.totalMarks, r.evaluatedOn, EVAL_TABS.find((t) => t.id === r.status)?.label ?? r.status,
    ]),
  ];
}
