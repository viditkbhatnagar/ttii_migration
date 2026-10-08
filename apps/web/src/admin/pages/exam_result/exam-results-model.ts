// Exam → Result view model (TTII 2026-10-08). The API sends the result sheet
// computed server-side by exam-results.ts; these types mirror it and the
// normalisers below read it defensively, so a missing field renders as a dash
// rather than crashing the page.

import { asNumber, asString } from '../../shared/utils/admin-data-utils.js';

export type SittingStatus = 'pass' | 'fail' | 'absent' | 'pending' | 'marks_only';
export type OverallResult = 'passed' | 'failed' | 'incomplete' | 'absent' | 'pending' | 'marks_only';
export type ExamResultsStatus = 'in_progress' | 'ready' | 'published';

export interface ResultTotals {
  students: number;
  passed: number;
  failed: number;
  incomplete: number;
  absent: number;
  pending: number;
  flagged: number;
  passPercentage: number;
}

export interface ExamResultsRow {
  examId: number;
  examCode: string;
  title: string;
  courses: string[];
  fromDate: string;
  toDate: string;
  status: ExamResultsStatus;
  publishedAt: string | null;
  publishedBy: string | null;
  subjects: number;
  totals: ResultTotals;
}

export interface Sitting {
  examId: number;
  subjectTitle: string;
  date: string;
  totalMarks: number;
  passMarks: number | null;
  closed: boolean;
}

export interface StudentSitting {
  examId: number;
  status: SittingStatus;
  score: number | null;
  totalMarks: number;
  passMarks: number | null;
  answered: number | null;
  questionCount: number | null;
  minutesTaken: number | null;
  flag: string | null;
}

export interface StudentResult {
  userId: number;
  name: string;
  studentCode: string;
  sittings: StudentSitting[];
  obtained: number;
  maxMarks: number;
  percentage: number;
  subjectsPassed: number;
  subjectsTotal: number;
  overall: OverallResult;
  flagged: boolean;
}

export interface SubjectSummary {
  examId: number;
  subjectTitle: string;
  date: string;
  totalMarks: number;
  passMarks: number | null;
  closed: boolean;
  students: number;
  passed: number;
  failed: number;
  absent: number;
  pending: number;
  averageMarks: number;
  passPercentage: number;
}

export interface ExamResultsDetail extends Omit<ExamResultsRow, 'subjects' | 'totals'> {
  sittings: Sitting[];
  students: StudentResult[];
  subjects: SubjectSummary[];
  totals: ResultTotals;
  allSittingsClosed: boolean;
}

function rec(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function list(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(rec) : [];
}

function numOrNull(value: unknown): number | null {
  return value === null || value === undefined || value === '' ? null : asNumber(value);
}

function toTotals(raw: unknown): ResultTotals {
  const t = rec(raw);
  return {
    students: asNumber(t.students),
    passed: asNumber(t.passed),
    failed: asNumber(t.failed),
    incomplete: asNumber(t.incomplete),
    absent: asNumber(t.absent),
    pending: asNumber(t.pending),
    flagged: asNumber(t.flagged),
    passPercentage: asNumber(t.passPercentage),
  };
}

function toStatus(value: unknown): ExamResultsStatus {
  const s = asString(value);
  return s === 'published' || s === 'ready' ? s : 'in_progress';
}

function toHeader(r: Record<string, unknown>): Omit<ExamResultsRow, 'subjects' | 'totals'> {
  return {
    examId: asNumber(r.examId),
    examCode: asString(r.examCode),
    title: asString(r.title),
    courses: Array.isArray(r.courses) ? r.courses.map((c) => asString(c)).filter(Boolean) : [],
    fromDate: asString(r.fromDate),
    toDate: asString(r.toDate),
    status: toStatus(r.status),
    publishedAt: asString(r.publishedAt) || null,
    publishedBy: asString(r.publishedBy) || null,
  };
}

export function toExamResultsRows(raw: unknown[]): ExamResultsRow[] {
  return raw.map(rec).map((r) => ({ ...toHeader(r), subjects: asNumber(r.subjects), totals: toTotals(r.totals) }));
}

export function toExamResultsDetail(raw: Record<string, unknown>): ExamResultsDetail {
  const sheet = rec(raw.sheet);
  return {
    ...toHeader(raw),
    sittings: list(raw.sittings).map((s) => ({
      examId: asNumber(s.examId),
      subjectTitle: asString(s.subjectTitle),
      date: asString(s.date),
      totalMarks: asNumber(s.totalMarks),
      passMarks: numOrNull(s.passMarks),
      closed: s.closed === true,
    })),
    students: list(sheet.students).map((s) => ({
      userId: asNumber(s.userId),
      name: asString(s.name),
      studentCode: asString(s.studentCode),
      sittings: list(s.sittings).map((c) => ({
        examId: asNumber(c.examId),
        status: asString(c.status) as SittingStatus,
        score: numOrNull(c.score),
        totalMarks: asNumber(c.totalMarks),
        passMarks: numOrNull(c.passMarks),
        answered: numOrNull(c.answered),
        questionCount: numOrNull(c.questionCount),
        minutesTaken: numOrNull(c.minutesTaken),
        flag: asString(c.flag) || null,
      })),
      obtained: asNumber(s.obtained),
      maxMarks: asNumber(s.maxMarks),
      percentage: asNumber(s.percentage),
      subjectsPassed: asNumber(s.subjectsPassed),
      subjectsTotal: asNumber(s.subjectsTotal),
      overall: asString(s.overall) as OverallResult,
      flagged: s.flagged === true,
    })),
    subjects: list(sheet.subjects).map((s) => ({
      examId: asNumber(s.examId),
      subjectTitle: asString(s.subjectTitle),
      date: asString(s.date),
      totalMarks: asNumber(s.totalMarks),
      passMarks: numOrNull(s.passMarks),
      closed: s.closed === true,
      students: asNumber(s.students),
      passed: asNumber(s.passed),
      failed: asNumber(s.failed),
      absent: asNumber(s.absent),
      pending: asNumber(s.pending),
      averageMarks: asNumber(s.averageMarks),
      passPercentage: asNumber(s.passPercentage),
    })),
    totals: toTotals(sheet.totals),
    allSittingsClosed: sheet.allSittingsClosed === true,
  };
}

/** dd/mm/yyyy from a bare YYYY-MM-DD, built by hand so no timezone can shift it. */
export function formatYmd(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

export function formatPeriod(from: string, to: string): string {
  const a = formatYmd(from);
  const b = formatYmd(to);
  if (!a) return '—';
  return a === b || !b ? a : `${a} – ${b}`;
}

export const OVERALL_LABEL: Record<OverallResult, string> = {
  passed: 'Passed',
  failed: 'Failed',
  incomplete: 'Incomplete',
  absent: 'Absent',
  pending: 'Pending',
  marks_only: 'Marks only',
};

export const SITTING_LABEL: Record<SittingStatus, string> = {
  pass: 'Pass',
  fail: 'Fail',
  absent: 'Absent',
  pending: 'Not held yet',
  marks_only: 'No pass mark',
};

export const STATUS_LABEL: Record<ExamResultsStatus, string> = {
  in_progress: 'Exam in progress',
  ready: 'Ready to publish',
  published: 'Published',
};

/** CSV of the result sheet — one row per student, one column per subject. */
export function resultSheetCsv(detail: ExamResultsDetail): string {
  const esc = (v: string | number): string => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = [
    'Student', 'Student ID',
    ...detail.sittings.map((s) => `${s.subjectTitle} (/${s.totalMarks})`),
    'Total', 'Max', 'Percentage', 'Subjects passed', 'Result', 'Notes',
  ];
  const rows = detail.students.map((st) => [
    st.name, st.studentCode,
    ...st.sittings.map((c) => (c.score === null ? SITTING_LABEL[c.status] : `${c.score}${c.status === 'fail' ? ' (F)' : ''}`)),
    st.obtained, st.maxMarks, `${st.percentage}%`, `${st.subjectsPassed}/${st.subjectsTotal}`,
    OVERALL_LABEL[st.overall] ?? st.overall,
    st.sittings.map((c) => c.flag).filter(Boolean).join('; '),
  ]);
  return [head, ...rows].map((r) => r.map(esc).join(',')).join('\n');
}
