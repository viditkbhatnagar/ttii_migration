import { asNumber, asString } from '../../shared/utils/admin-data-utils.js';
import type { Tone } from '../../shared/components/ui-tones.js';
import { formatHm, formatYmd } from '../exam_result/exam-results-model.js';

export { formatHm, formatYmd };

// Exam Submissions view model (TTII 2026-10-12, Naji's ExamSubmissionsModule)
// — mirrors SubmissionRow / SubmissionDetail from the API's
// exam-submissions-service. Instants arrive as ISO strings and are shown in
// IST; window dates arrive as bare YYYY-MM-DD / HH:MM IST wall clock.

export type SubmissionStatus = 'scheduled' | 'in_progress' | 'submitted' | 'auto_submitted' | 'missed' | 'reexam_pending';
export type EvaluationState = 'none' | 'auto' | 'pending' | 'evaluated';
export type ResultState = 'not_published' | 'pending' | 'pass' | 'fail' | 'marks_only' | 'absent';
export type SubmissionTab = 'in_progress' | 'upcoming' | 'submitted' | 'auto_submitted' | 'missed' | 'evaluation_pending' | 'results_published' | 'all';
export type SortKey = 'student' | 'exam' | 'schedule' | 'attempt' | 'status' | 'evaluation';

export interface SubmissionRow {
  key: string;
  type: 'regular' | 'reexam';
  attemptNo: number;
  sittingId: number;
  examId: number;
  examCode: string;
  examTitle: string;
  subject: string;
  courseIds: number[];
  courses: string[];
  userId: number;
  studentName: string;
  studentCode: string;
  date: string;
  toDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  openAt: string | null;
  closeAt: string | null;
  status: SubmissionStatus;
  autoKind: 'server' | 'time_up' | null;
  missedReason: 'never_opened' | 'nothing_answered' | 'not_submitted' | null;
  activity: 'active' | 'idle' | null;
  attemptId: number | null;
  startedAt: string | null;
  submittedAt: string | null;
  lastSeenAt: string | null;
  deadlineAt: string | null;
  timeTakenSeconds: number | null;
  answered: number | null;
  questionCount: number | null;
  correct: number | null;
  incorrect: number | null;
  score: number | null;
  totalMarks: number | null;
  passMarks: number | null;
  evaluation: EvaluationState;
  descriptiveAnswered: number;
  descriptiveGraded: number;
  descriptiveMarks: number;
  resultsPublished: boolean;
  resultPublishedAt: string | null;
  result: ResultState;
  reExamScheduledAt: string | null;
}

export interface SubmissionAttemptSummary {
  attemptId: number;
  type: 'regular' | 'reexam';
  createdAt: string | null;
  startedAt: string | null;
  submittedAt: string | null;
  submitted: boolean;
  score: number | null;
}

export interface DescriptiveGrade {
  attemptId: number;
  questionId: number;
  question: string;
  score: number | null;
  remarks: string;
  gradedAt: string | null;
  gradedBy: string;
}

export interface SubmissionDetail {
  rows: SubmissionRow[];
  attempts: SubmissionAttemptSummary[];
  grades: DescriptiveGrade[];
  studentEmail: string;
  studentPhone: string;
}

export interface SubmissionFilters {
  search: string;
  courseId: string;
  examId: string;
  subject: string;
  type: 'all' | 'regular' | 'reexam';
  status: 'all' | SubmissionStatus;
  evaluation: 'all' | EvaluationState;
  result: 'all' | ResultState;
}

export const EMPTY_FILTERS: SubmissionFilters = {
  search: '', courseId: '', examId: '', subject: '', type: 'all', status: 'all', evaluation: 'all', result: 'all',
};

export const STATUS_LABEL: Record<SubmissionStatus, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In progress',
  submitted: 'Submitted',
  auto_submitted: 'Auto submitted',
  missed: 'Missed',
  reexam_pending: 'Re-exam pending',
};

export const STATUS_TONE: Record<SubmissionStatus, Tone> = {
  scheduled: 'slate',
  in_progress: 'blue',
  submitted: 'emerald',
  auto_submitted: 'amber',
  missed: 'rose',
  reexam_pending: 'primary',
};

export const EVAL_LABEL: Record<EvaluationState, string> = {
  none: '—',
  auto: 'Auto-marked',
  pending: 'Evaluation pending',
  evaluated: 'Written answers graded',
};

export const EVAL_TONE: Record<EvaluationState, Tone> = { none: 'slate', auto: 'blue', pending: 'amber', evaluated: 'emerald' };

export const RESULT_LABEL: Record<ResultState, string> = {
  not_published: 'Not published',
  pending: 'Pending',
  pass: 'Passed',
  fail: 'Failed',
  marks_only: 'Marks only',
  absent: 'Absent',
};

export const RESULT_TONE: Record<ResultState, Tone> = {
  not_published: 'slate', pending: 'slate', pass: 'emerald', fail: 'rose', marks_only: 'blue', absent: 'rose',
};

export const TABS: Array<{ id: SubmissionTab; label: string }> = [
  { id: 'in_progress', label: 'In progress' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'auto_submitted', label: 'Auto submitted' },
  { id: 'missed', label: 'Missed' },
  { id: 'evaluation_pending', label: 'Evaluation pending' },
  { id: 'results_published', label: 'Results published' },
  { id: 'all', label: 'All' },
];

const STATUSES = Object.keys(STATUS_LABEL) as SubmissionStatus[];
const EVALS = Object.keys(EVAL_LABEL) as EvaluationState[];
const RESULTS = Object.keys(RESULT_LABEL) as ResultState[];

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function numOrNull(v: unknown): number | null {
  return v === null || v === undefined || v === '' ? null : asNumber(v);
}

function strOrNull(v: unknown): string | null {
  const s = asString(v);
  return s === '' ? null : s;
}

function oneOf<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  const s = asString(value) as T;
  return allowed.includes(s) ? s : fallback;
}

export function toSubmissionRow(raw: unknown): SubmissionRow {
  const r = rec(raw);
  const autoKind = asString(r.autoKind);
  const missed = asString(r.missedReason);
  const activity = asString(r.activity);
  return {
    key: asString(r.key),
    type: r.type === 'reexam' ? 'reexam' : 'regular',
    attemptNo: asNumber(r.attemptNo) || 1,
    sittingId: asNumber(r.sittingId),
    examId: asNumber(r.examId),
    examCode: asString(r.examCode),
    examTitle: asString(r.examTitle),
    subject: asString(r.subject),
    courseIds: Array.isArray(r.courseIds) ? r.courseIds.map((c) => asNumber(c)) : [],
    courses: Array.isArray(r.courses) ? r.courses.map((c) => asString(c)).filter(Boolean) : [],
    userId: asNumber(r.userId),
    studentName: asString(r.studentName),
    studentCode: asString(r.studentCode),
    date: asString(r.date),
    toDate: asString(r.toDate),
    startTime: asString(r.startTime),
    endTime: asString(r.endTime),
    durationMinutes: asNumber(r.durationMinutes),
    openAt: strOrNull(r.openAt),
    closeAt: strOrNull(r.closeAt),
    status: oneOf(r.status, STATUSES, 'scheduled'),
    autoKind: autoKind === 'server' || autoKind === 'time_up' ? autoKind : null,
    missedReason: missed === 'never_opened' || missed === 'nothing_answered' || missed === 'not_submitted' ? missed : null,
    activity: activity === 'active' || activity === 'idle' ? activity : null,
    attemptId: numOrNull(r.attemptId),
    startedAt: strOrNull(r.startedAt),
    submittedAt: strOrNull(r.submittedAt),
    lastSeenAt: strOrNull(r.lastSeenAt),
    deadlineAt: strOrNull(r.deadlineAt),
    timeTakenSeconds: numOrNull(r.timeTakenSeconds),
    answered: numOrNull(r.answered),
    questionCount: numOrNull(r.questionCount),
    correct: numOrNull(r.correct),
    incorrect: numOrNull(r.incorrect),
    score: numOrNull(r.score),
    totalMarks: numOrNull(r.totalMarks),
    passMarks: numOrNull(r.passMarks),
    evaluation: oneOf(r.evaluation, EVALS, 'none'),
    descriptiveAnswered: asNumber(r.descriptiveAnswered),
    descriptiveGraded: asNumber(r.descriptiveGraded),
    descriptiveMarks: asNumber(r.descriptiveMarks),
    resultsPublished: r.resultsPublished === true,
    resultPublishedAt: strOrNull(r.resultPublishedAt),
    result: oneOf(r.result, RESULTS, 'not_published'),
    reExamScheduledAt: strOrNull(r.reExamScheduledAt),
  };
}

export function toSubmissionRows(raw: unknown): SubmissionRow[] {
  const rows = rec(raw).rows;
  return Array.isArray(rows) ? rows.map(toSubmissionRow).filter((r) => r.key !== '') : [];
}

export function toSubmissionDetail(raw: unknown): SubmissionDetail | null {
  const d = rec(raw);
  if (!Array.isArray(d.rows) || d.rows.length === 0) return null;
  return {
    rows: d.rows.map(toSubmissionRow),
    attempts: (Array.isArray(d.attempts) ? d.attempts : []).map((a) => {
      const x = rec(a);
      return {
        attemptId: asNumber(x.attemptId),
        type: x.type === 'reexam' ? 'reexam' : 'regular',
        createdAt: strOrNull(x.createdAt),
        startedAt: strOrNull(x.startedAt),
        submittedAt: strOrNull(x.submittedAt),
        submitted: x.submitted === true,
        score: numOrNull(x.score),
      };
    }),
    grades: (Array.isArray(d.grades) ? d.grades : []).map((g) => {
      const x = rec(g);
      return {
        attemptId: asNumber(x.attemptId),
        questionId: asNumber(x.questionId),
        question: asString(x.question),
        score: numOrNull(x.score),
        remarks: asString(x.remarks),
        gradedAt: strOrNull(x.gradedAt),
        gradedBy: asString(x.gradedBy),
      };
    }),
    studentEmail: asString(d.studentEmail),
    studentPhone: asString(d.studentPhone),
  };
}

// ---------- formatting (IST) ----------

const IST_FORMAT = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
});

/** dd/mm/yyyy, h:mm am — an ISO instant shown in IST whatever the browser's zone. */
export function formatIst(isoValue: string | null): string {
  if (!isoValue) return '';
  const d = new Date(isoValue);
  return Number.isNaN(d.getTime()) ? '' : IST_FORMAT.format(d).replace(/\b(am|pm)\b/i, (m) => m.toUpperCase());
}

export function formatSeconds(seconds: number | null): string {
  if (seconds === null || seconds < 0) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

export function formatMinutes(minutes: number): string {
  return minutes > 0 ? formatSeconds(minutes * 60) : '—';
}

export function scheduleLabel(r: SubmissionRow): string {
  const date = formatYmd(r.date);
  if (!date) return '—';
  return r.startTime ? `${date} ${formatHm(r.startTime)}` : date;
}

/** 05/10/2026 10:00 AM – 11:30 AM, or across days when the window spans several. */
export function windowLabel(r: SubmissionRow): string {
  const start = scheduleLabel(r);
  if (start === '—' || !r.endTime) return start;
  const end = r.toDate && r.toDate !== r.date ? `${formatYmd(r.toDate)} ${formatHm(r.endTime)}` : formatHm(r.endTime);
  return `${start} – ${end}`;
}

/** The one-line explanation under the status badge. */
export function statusDetail(r: SubmissionRow, nowMs: number): string {
  switch (r.status) {
    case 'scheduled':
      return r.openAt && new Date(r.openAt).getTime() > nowMs ? `Opens ${formatIst(r.openAt)}` : 'Window open — not started';
    case 'in_progress':
      if (r.activity === 'active') return 'Active now';
      return r.lastSeenAt ? `Idle — last autosave ${formatIst(r.lastSeenAt)}` : 'Idle — no autosave yet';
    case 'auto_submitted':
      return r.autoKind === 'server' ? 'Finalised by the server after the deadline (inferred)' : 'Ran to the time limit (inferred)';
    case 'missed':
      if (r.missedReason === 'nothing_answered') return 'Opened, nothing answered';
      if (r.missedReason === 'not_submitted') return 'Answered but never submitted';
      return 'Never opened';
    case 'reexam_pending':
      return 'Missed the sitting — re-exam scheduled';
    default:
      return '';
  }
}

export function marksLabel(r: SubmissionRow): string {
  if (r.score === null) return '—';
  return r.totalMarks ? `${r.score} / ${r.totalMarks}` : String(r.score);
}

export function percentage(r: SubmissionRow): number | null {
  return r.score !== null && r.totalMarks ? Math.round((r.score / r.totalMarks) * 1000) / 10 : null;
}

// ---------- filtering, tabs, sorting ----------

export function inTab(r: SubmissionRow, tab: SubmissionTab): boolean {
  switch (tab) {
    case 'all': return true;
    case 'upcoming': return r.status === 'scheduled';
    case 'evaluation_pending': return r.evaluation === 'pending';
    case 'results_published': return r.resultsPublished && (r.status === 'submitted' || r.status === 'auto_submitted' || r.status === 'missed');
    default: return r.status === tab;
  }
}

export function filterRows(rows: SubmissionRow[], f: SubmissionFilters): SubmissionRow[] {
  const q = f.search.trim().toLowerCase();
  return rows.filter((r) => {
    if (f.courseId && !r.courseIds.includes(Number(f.courseId))) return false;
    if (f.examId && String(r.examId) !== f.examId) return false;
    if (f.subject && r.subject !== f.subject) return false;
    if (f.type !== 'all' && r.type !== f.type) return false;
    if (f.status !== 'all' && r.status !== f.status) return false;
    if (f.evaluation !== 'all' && r.evaluation !== f.evaluation) return false;
    if (f.result !== 'all' && r.result !== f.result) return false;
    if (q) {
      const hay = [r.studentName, r.studentCode, r.examTitle, r.examCode, r.subject].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function tabCounts(rows: SubmissionRow[]): Record<SubmissionTab, number> {
  const counts = Object.fromEntries(TABS.map((t) => [t.id, 0])) as Record<SubmissionTab, number>;
  for (const r of rows) {
    for (const t of TABS) if (inTab(r, t.id)) counts[t.id] += 1;
  }
  return counts;
}

const STATUS_ORDER: SubmissionStatus[] = ['in_progress', 'scheduled', 'submitted', 'auto_submitted', 'reexam_pending', 'missed'];
const EVAL_ORDER: EvaluationState[] = ['pending', 'evaluated', 'auto', 'none'];

function sortValue(r: SubmissionRow, key: SortKey): string | number {
  switch (key) {
    case 'student': return r.studentName.toLowerCase();
    case 'exam': return `${r.examTitle} ${r.subject}`.toLowerCase();
    case 'schedule': return `${r.date} ${r.startTime}`;
    case 'attempt': return r.attemptNo;
    case 'status': return STATUS_ORDER.indexOf(r.status);
    case 'evaluation': return EVAL_ORDER.indexOf(r.evaluation);
    default: return '';
  }
}

export function sortRows(rows: SubmissionRow[], key: SortKey, dir: 'asc' | 'desc'): SubmissionRow[] {
  const sign = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = sortValue(a, key);
    const vb = sortValue(b, key);
    const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
    return cmp !== 0 ? cmp * sign : a.studentName.localeCompare(b.studentName);
  });
}

export interface Option { value: string; label: string }

/** Filter options built from the loaded rows, so every option has rows behind it. */
export function filterOptions(rows: SubmissionRow[]): { exams: Option[]; subjects: Option[]; courses: Option[] } {
  const exams = new Map<string, string>();
  const subjects = new Set<string>();
  const courses = new Map<string, string>();
  for (const r of rows) {
    exams.set(String(r.examId), r.examTitle);
    if (r.subject) subjects.add(r.subject);
    r.courseIds.forEach((id, i) => { if (r.courses[i]) courses.set(String(id), r.courses[i]); });
  }
  const byLabel = (a: Option, b: Option): number => a.label.localeCompare(b.label);
  return {
    exams: [...exams].map(([value, label]) => ({ value, label })).sort(byLabel),
    subjects: [...subjects].map((s) => ({ value: s, label: s })).sort(byLabel),
    courses: [...courses].map(([value, label]) => ({ value, label })).sort(byLabel),
  };
}

export function csvRows(rows: SubmissionRow[], nowMs: number): Array<Array<string | number>> {
  return [
    ['Student', 'Student ID', 'Exam', 'Exam ID', 'Subject', 'Type', 'Attempt', 'Date', 'Start (IST)', 'Duration (min)',
      'Status', 'Status detail', 'Started (IST)', 'Submitted (IST)', 'Time taken', 'Answered', 'Questions',
      'Score', 'Total marks', 'Pass marks', 'Evaluation', 'Written marks (not in score)', 'Result'],
    ...rows.map((r) => [
      r.studentName, r.studentCode, r.examTitle, r.examCode, r.subject, r.type === 'reexam' ? 'Re-exam' : 'Regular', r.attemptNo,
      formatYmd(r.date), r.startTime ? formatHm(r.startTime) : '', r.durationMinutes,
      STATUS_LABEL[r.status], statusDetail(r, nowMs), formatIst(r.startedAt), formatIst(r.submittedAt), formatSeconds(r.timeTakenSeconds),
      r.answered ?? '', r.questionCount ?? '', r.score ?? '', r.totalMarks ?? '', r.passMarks ?? '',
      EVAL_LABEL[r.evaluation], r.descriptiveGraded > 0 ? r.descriptiveMarks : '', RESULT_LABEL[r.result],
    ]),
  ];
}

/** YYYY-MM-DD `days` before `today`, from LOCAL date parts (never toISOString). */
export function daysBefore(today: Date, days: number): string {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ---------- detail ----------

export interface TimelineEvent {
  label: string;
  /** ISO instant, or null when it has not happened (or is unknown). */
  at: string | null;
  done: boolean;
  tone: Tone;
}

/** The submission's story, oldest first, from the fields the server already sent. */
export function timelineEvents(r: SubmissionRow, lastGradedAt: string | null, nowMs: number): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  if (r.type === 'reexam') events.push({ label: 'Re-exam scheduled', at: r.reExamScheduledAt, done: true, tone: 'primary' });
  events.push({ label: 'Exam window opens', at: r.openAt, done: !!r.openAt && new Date(r.openAt).getTime() <= nowMs, tone: 'slate' });
  events.push({ label: 'Student started', at: r.startedAt, done: !!r.startedAt, tone: 'blue' });
  if (r.status === 'in_progress') events.push({ label: 'Last autosave', at: r.lastSeenAt, done: !!r.lastSeenAt, tone: 'blue' });
  if (r.status === 'missed' || r.status === 'reexam_pending') {
    events.push({ label: 'Window closed — nothing submitted', at: r.closeAt, done: true, tone: 'rose' });
  } else {
    events.push({
      label: r.status === 'auto_submitted' ? 'Auto submitted' : 'Submission completed',
      at: r.submittedAt,
      done: !!r.submittedAt,
      tone: r.status === 'auto_submitted' ? 'amber' : 'emerald',
    });
  }
  if (r.descriptiveAnswered > 0) {
    events.push({ label: 'Written answers graded', at: r.evaluation === 'evaluated' ? lastGradedAt : null, done: r.evaluation === 'evaluated', tone: 'emerald' });
  }
  events.push({ label: 'Result published', at: r.resultPublishedAt, done: r.resultsPublished, tone: 'emerald' });
  return events;
}

/** The newest grading instant among the grades of one attempt. */
export function lastGradedAt(grades: DescriptiveGrade[], attemptId: number | null): string | null {
  const times = grades.filter((g) => g.attemptId === attemptId && g.gradedAt).map((g) => g.gradedAt as string).sort();
  return times.at(-1) ?? null;
}

export function submissionTypeLabel(r: SubmissionRow): string {
  if (r.status === 'auto_submitted') return r.autoKind === 'server' ? 'Auto (server, after the deadline)' : 'Auto (time up)';
  if (r.status === 'submitted') return 'Submitted by the student';
  return '—';
}
