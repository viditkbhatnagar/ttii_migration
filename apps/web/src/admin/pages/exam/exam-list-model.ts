import { asNumber, asString } from '../../shared/utils/admin-data-utils.js';
import type { Tone } from '../../shared/components/ui-tones.js';

// Exams list view model (TTII 2026-10-12, Naji's design) — mirrors
// ExamListRow / ExamOverview from the API's exam-admin-service.

export type ExamPhase = 'draft' | 'upcoming' | 'in_progress' | 'completed';
export type PhaseTab = 'all' | ExamPhase;

export interface ExamListRow {
  examId: number;
  examCode: string;
  title: string;
  courses: string[];
  courseIds: number[];
  isPractice: boolean;
  phase: ExamPhase;
  fromDate: string;
  toDate: string;
  subjects: number;
  allocated: number;
  submitted: number;
  resultsPublished: boolean;
}

export interface ExamScheduleRow {
  sittingId: number | null;
  subjectTitle: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMin: number;
  totalMarks: number;
  passMarks: number | null;
  questionsPlanned: number;
  questionsAssigned: number;
  submitted: number;
}

export interface ExamOverview extends ExamListRow {
  status: string;
  offerings: string[];
  schedule: ExamScheduleRow[];
  instructions: string;
  notifyEmail: boolean;
  notifyInapp: boolean;
  deletable: { ok: boolean; reason: string };
}

export const PHASE_LABEL: Record<ExamPhase, string> = {
  in_progress: 'In progress',
  upcoming: 'Upcoming',
  completed: 'Completed',
  draft: 'Draft',
};

export const PHASE_TONE: Record<ExamPhase, Tone> = {
  in_progress: 'primary',
  upcoming: 'blue',
  completed: 'emerald',
  draft: 'amber',
};

const PHASES: ExamPhase[] = ['draft', 'upcoming', 'in_progress', 'completed'];

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function toRow(r: Record<string, unknown>): ExamListRow {
  const phase = asString(r.phase) as ExamPhase;
  return {
    examId: asNumber(r.examId),
    examCode: asString(r.examCode),
    title: asString(r.title),
    courses: Array.isArray(r.courses) ? r.courses.map((c) => asString(c)).filter(Boolean) : [],
    courseIds: Array.isArray(r.courseIds) ? r.courseIds.map((c) => asNumber(c)) : [],
    isPractice: r.isPractice === true,
    phase: PHASES.includes(phase) ? phase : 'draft',
    fromDate: asString(r.fromDate),
    toDate: asString(r.toDate),
    subjects: asNumber(r.subjects),
    allocated: asNumber(r.allocated),
    submitted: asNumber(r.submitted),
    resultsPublished: r.resultsPublished === true,
  };
}

export function toExamListRows(raw: unknown[]): ExamListRow[] {
  return raw.map((r) => toRow(rec(r)));
}

export function toExamOverview(raw: Record<string, unknown>): ExamOverview {
  const del = rec(raw.deletable);
  return {
    ...toRow(raw),
    status: asString(raw.status) || 'draft',
    offerings: Array.isArray(raw.offerings) ? raw.offerings.map((o) => asString(o)).filter(Boolean) : [],
    schedule: (Array.isArray(raw.schedule) ? raw.schedule : []).map((v) => {
      const s = rec(v);
      return {
        sittingId: s.sittingId === null || s.sittingId === undefined ? null : asNumber(s.sittingId),
        subjectTitle: asString(s.subjectTitle),
        date: asString(s.date),
        startTime: asString(s.startTime),
        endTime: asString(s.endTime),
        durationMin: asNumber(s.durationMin),
        totalMarks: asNumber(s.totalMarks),
        passMarks: s.passMarks === null || s.passMarks === undefined ? null : asNumber(s.passMarks),
        questionsPlanned: asNumber(s.questionsPlanned),
        questionsAssigned: asNumber(s.questionsAssigned),
        submitted: asNumber(s.submitted),
      };
    }),
    instructions: asString(raw.instructions),
    notifyEmail: raw.notifyEmail === true,
    notifyInapp: raw.notifyInapp === true,
    deletable: { ok: del.ok === true, reason: asString(del.reason) },
  };
}

export interface ExamFilters {
  tab: PhaseTab;
  search: string;
  courseId: string;
  type: 'all' | 'regular' | 'practice';
  /** YYYY-MM-DD bounds; an exam is kept when its dates fall inside them. */
  from: string;
  to: string;
}

export function filterExams(rows: ExamListRow[], f: ExamFilters): ExamListRow[] {
  const q = f.search.trim().toLowerCase();
  return rows.filter((r) => {
    if (f.tab !== 'all' && r.phase !== f.tab) return false;
    if (f.courseId && !r.courseIds.includes(Number(f.courseId))) return false;
    if (f.type === 'regular' && r.isPractice) return false;
    if (f.type === 'practice' && !r.isPractice) return false;
    if (f.from && (!r.fromDate || r.fromDate < f.from)) return false;
    if (f.to && (!r.toDate || r.toDate > f.to)) return false;
    if (!q) return true;
    return [r.title, r.examCode, String(r.examId), ...r.courses].some((v) => v.toLowerCase().includes(q));
  });
}

export function phaseCounts(rows: ExamListRow[]): Record<PhaseTab, number> {
  const count = (p: ExamPhase): number => rows.filter((r) => r.phase === p).length;
  return { all: rows.length, in_progress: count('in_progress'), upcoming: count('upcoming'), completed: count('completed'), draft: count('draft') };
}

export type ExamSortKey = 'examCode' | 'title' | 'course' | 'type' | 'fromDate' | 'toDate' | 'subjects' | 'phase';

export function sortExams(rows: ExamListRow[], key: ExamSortKey, dir: 'asc' | 'desc'): ExamListRow[] {
  const val = (r: ExamListRow): string | number => {
    switch (key) {
      case 'subjects': return r.subjects;
      case 'course': return r.courses.join(', ');
      case 'type': return r.isPractice ? 'Practice' : 'Regular';
      case 'phase': return PHASE_LABEL[r.phase];
      default: return r[key];
    }
  };
  return [...rows].sort((a, b) => {
    const x = val(a);
    const y = val(b);
    const cmp = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
    return dir === 'asc' ? cmp : -cmp;
  });
}

/** Rich-text instructions as plain lines, without rendering HTML. */
export function instructionLines(html: string): string[] {
  return html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|div|h[1-6])>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}
