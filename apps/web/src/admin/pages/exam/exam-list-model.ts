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
  /** TTII 2026-10-16 — created from another exam's results for the students who failed. */
  isSupplementary: boolean;
  sourceExamId: number | null;
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
    isSupplementary: r.isSupplementary === true,
    sourceExamId: r.sourceExamId === null || r.sourceExamId === undefined ? null : asNumber(r.sourceExamId),
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
  type: 'all' | ExamType;
  /** YYYY-MM-DD bounds; an exam is kept when its dates fall inside them. */
  from: string;
  to: string;
}

export type ExamType = 'regular' | 'practice' | 'supplementary';

export function examType(r: Pick<ExamListRow, 'isPractice' | 'isSupplementary'>): ExamType {
  if (r.isPractice) return 'practice';
  return r.isSupplementary ? 'supplementary' : 'regular';
}

export const EXAM_TYPE_LABEL: Record<ExamType, string> = {
  regular: 'Regular',
  practice: 'Practice',
  supplementary: 'Supplementary',
};

/** A supplementary exam is made from a finished, real exam (a supplementary one included). */
export function canCreateSupplementary(r: Pick<ExamListRow, 'phase' | 'isPractice'>): boolean {
  return r.phase === 'completed' && !r.isPractice;
}

export function filterExams(rows: ExamListRow[], f: ExamFilters): ExamListRow[] {
  const q = f.search.trim().toLowerCase();
  return rows.filter((r) => {
    if (f.tab !== 'all' && r.phase !== f.tab) return false;
    if (f.courseId && !r.courseIds.includes(Number(f.courseId))) return false;
    if (f.type !== 'all' && examType(r) !== f.type) return false;
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
      case 'type': return EXAM_TYPE_LABEL[examType(r)];
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

const NAMED_ENTITIES: Record<string, string> = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

/**
 * Decode HTML entities to plain TEXT in one pass (so "&amp;lt;" stays "&lt;").
 * The result is only ever rendered as text, never as HTML. Unknown names and
 * out-of-range or surrogate code points are left as written.
 */
export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]{1,6}|#\d{1,7}|[a-z]+);/gi, (whole, body: string) => {
    if (body[0] !== '#') return NAMED_ENTITIES[body.toLowerCase()] ?? whole;
    const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
    const valid = Number.isInteger(code) && code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff);
    return valid ? String.fromCodePoint(code) : whole;
  });
}

/** Rich-text instructions as plain lines, without rendering HTML. Ordered-list items keep their numbers. */
export function instructionLines(html: string): string[] {
  const numbered = html.replace(/<ol\b[^>]*>([\s\S]*?)<\/ol>/gi, (_m, inner: string) => {
    let n = 0;
    return inner.replace(/<li\b[^>]*>/gi, () => `\n${(n += 1)}. `);
  });
  return decodeEntities(
    numbered
      .replace(/<\s*br\s*\/?>/gi, '\n')
      .replace(/<\/(p|li|div|h[1-6])>/gi, '\n')
      .replace(/<[^>]*>/g, ''),
  )
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}
