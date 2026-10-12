import { asNumber, asString, formatDate } from '../../shared/utils/admin-data-utils.js';
import type { Tone } from '../../shared/components/ui-tones.js';

// Question Bank view model (TTII 2026-10-12, Naji's QuestionBankModule) —
// mirrors QbOverview / QbSubjectRow from the API's question-bank-service and
// the rows of /admin/question_bank/index. Pure: tested in
// apps/web/tests/question-bank-model.test.ts.
//
// True / False is not a separate type in our data: it is an MCQ whose options
// are exactly ["True","False"]. Answers are 0-BASED indexes, repo-wide.

export type QuestionKind = 'mcq' | 'tf' | 'descriptive';
export type KindFilter = '' | QuestionKind;

export const KIND_LABEL: Record<QuestionKind, string> = { mcq: 'MCQ', tf: 'True / False', descriptive: 'Descriptive' };
export const KIND_TONE: Record<QuestionKind, Tone> = { mcq: 'primary', tf: 'blue', descriptive: 'amber' };
export const TRUE_FALSE: readonly string[] = ['True', 'False'];
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 6;

export interface CourseChip { id: number; title: string }

export interface SubjectRow {
  id: number;
  code: string;
  title: string;
  status: string;
  courses: CourseChip[];
  total: number;
  mcq: number;
  descriptive: number;
  recent: number;
  lastUpdated: string;
  matching: number | null;
}

export interface Author { id: number; name: string }

export interface Overview {
  kpis: { subjects: number; questions: number; mcq: number; descriptive: number; recent: number };
  subjects: SubjectRow[];
  authors: Author[];
}

export interface QuestionRow {
  id: number;
  code: string;
  kind: QuestionKind;
  qType: 0 | 1;
  subjectId: number;
  subjectTitle: string;
  title: string;
  options: string[];
  correct: number[];
  hint: string;
  solution: string;
  courseId: string;
  lessonId: string;
  lessonTitle: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  usedInExams: number;
  usedInPublished: string[];
}

function rec(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** A JSON array string (or an array) → its items; anything else → []. */
export function jsonList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || value.trim() === '') return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function questionCode(id: number): string {
  return `Q-${String(id).padStart(5, '0')}`;
}

export function isTrueFalse(options: string[]): boolean {
  return options.length === 2 && options[0]?.trim().toLowerCase() === 'true' && options[1]?.trim().toLowerCase() === 'false';
}

export function kindOf(qType: number, options: string[]): QuestionKind {
  if (qType === 1) return 'descriptive';
  return isTrueFalse(options) ? 'tf' : 'mcq';
}

export function optionLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

/** Subject status pill: our subject.status is free text, default 'draft'. */
export function statusLabel(status: string): string {
  const s = status.trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : 'Draft';
}

export function statusTone(status: string): Tone {
  const s = status.trim().toLowerCase();
  if (s === 'active' || s === 'published') return 'emerald';
  if (s === 'draft' || s === '') return 'slate';
  return 'amber';
}

function toSubjectRow(raw: unknown): SubjectRow | null {
  const r = rec(raw);
  const id = asNumber(r.id);
  if (id <= 0) return null;
  return {
    id,
    code: asString(r.code),
    title: asString(r.title) || `Subject ${id}`,
    status: asString(r.status),
    courses: list(r.courses)
      .map((c) => ({ id: asNumber(rec(c).id), title: asString(rec(c).title) }))
      .filter((c) => c.id > 0 && c.title !== ''),
    total: asNumber(r.total),
    mcq: asNumber(r.mcq),
    descriptive: asNumber(r.descriptive),
    recent: asNumber(r.recent),
    lastUpdated: asString(r.lastUpdated),
    matching: r.matching === null || r.matching === undefined ? null : asNumber(r.matching),
  };
}

function toAuthors(raw: unknown): Author[] {
  return list(raw)
    .map((a) => ({ id: asNumber(rec(a).id), name: asString(rec(a).name) }))
    .filter((a) => a.id > 0);
}

export function toOverview(raw: unknown): Overview {
  const r = rec(raw);
  const k = rec(r.kpis);
  return {
    kpis: {
      subjects: asNumber(k.subjects),
      questions: asNumber(k.questions),
      mcq: asNumber(k.mcq),
      descriptive: asNumber(k.descriptive),
      recent: asNumber(k.recent),
    },
    subjects: list(r.subjects).map(toSubjectRow).filter((s): s is SubjectRow => s !== null),
    authors: toAuthors(r.authors),
  };
}

export function toSubjectDetail(raw: unknown): { subject: SubjectRow; authors: Author[] } | null {
  const r = rec(raw);
  const subject = toSubjectRow(r.subject);
  return subject ? { subject, authors: toAuthors(r.authors) } : null;
}

export function toQuestionRows(raw: unknown): QuestionRow[] {
  return list(raw).flatMap((item): QuestionRow[] => {
    const r = rec(item);
    const id = asNumber(r.id);
    if (id <= 0) return [];
    const qType = asNumber(r.q_type) === 1 ? 1 : 0;
    const options = qType === 1 ? [] : jsonList(r.options).map((o) => asString(o));
    return [{
      id,
      code: questionCode(id),
      kind: kindOf(qType, options),
      qType,
      subjectId: asNumber(r.subject_id),
      subjectTitle: asString(r.subject_title),
      title: asString(r.title),
      options,
      correct: qType === 1 ? [] : jsonList(r.correct_answers).map((c) => asNumber(c)),
      hint: asString(r.hint),
      solution: asString(r.solution),
      courseId: asString(r.course_id),
      lessonId: asString(r.lesson_id),
      lessonTitle: asString(r.lesson_title),
      createdBy: asNumber(r.created_by),
      createdAt: asString(r.created_at),
      updatedAt: asString(r.updated_at) || asString(r.created_at),
      usedInExams: asNumber(r.used_in_exams),
      usedInPublished: list(r.used_in_published).map((v) => asString(v)).filter((v) => v !== ''),
    }];
  });
}

// ─── list sorting ────────────────────────────────────────────────────────────

export type SubjectSortKey = 'title' | 'courses' | 'total' | 'mcq' | 'descriptive' | 'lastUpdated' | 'status';
export type SortDir = 'asc' | 'desc';

function cmp(a: string | number, b: string | number): number {
  return typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b));
}

export function sortSubjects(rows: SubjectRow[], key: SubjectSortKey, dir: SortDir): SubjectRow[] {
  const value = (r: SubjectRow): string | number => {
    switch (key) {
      case 'courses': return r.courses.length;
      case 'status': return statusLabel(r.status);
      case 'lastUpdated': return r.lastUpdated; // ISO: sorts as text; empty first
      default: return r[key];
    }
  };
  const sign = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => sign * cmp(value(a), value(b)) || a.title.localeCompare(b.title));
}

// ─── subject detail ──────────────────────────────────────────────────────────

export type QuestionSortKey = 'id' | 'title' | 'kind' | 'used' | 'updatedAt';

export function filterQuestions(rows: QuestionRow[], search: string, kind: KindFilter): QuestionRow[] {
  const q = search.trim().toLowerCase();
  const id = /^(?:q\s*-?\s*|#)?0*(\d+)$/i.exec(q)?.[1];
  return rows.filter((r) => {
    if (kind && r.kind !== kind) return false;
    if (!q) return true;
    return r.title.toLowerCase().includes(q) || r.code.toLowerCase().includes(q) || (id !== undefined && String(r.id) === id);
  });
}

export function sortQuestions(rows: QuestionRow[], key: QuestionSortKey, dir: SortDir): QuestionRow[] {
  const value = (r: QuestionRow): string | number => {
    switch (key) {
      case 'kind': return KIND_LABEL[r.kind];
      case 'used': return r.usedInExams;
      default: return r[key];
    }
  };
  const sign = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => sign * cmp(value(a), value(b)) || b.id - a.id);
}

export function kindCounts(rows: QuestionRow[]): { total: number; mcq: number; tf: number; descriptive: number } {
  return {
    total: rows.length,
    mcq: rows.filter((r) => r.kind === 'mcq').length,
    tf: rows.filter((r) => r.kind === 'tf').length,
    descriptive: rows.filter((r) => r.kind === 'descriptive').length,
  };
}

/** Rows for "Export": readable, with every option and the answer letter. */
export function questionsCsvRows(rows: QuestionRow[]): Array<Array<string | number>> {
  const header = ['Question ID', 'Subject', 'Type', 'Question', ...Array.from({ length: MAX_OPTIONS }, (_, i) => `Option ${optionLetter(i)}`), 'Correct answer', 'Hint', 'Solution / explanation', 'Used in exams', 'Published exams', 'Created', 'Last updated'];
  return [
    header,
    ...rows.map((r) => [
      r.code,
      r.subjectTitle,
      KIND_LABEL[r.kind],
      r.title,
      ...Array.from({ length: MAX_OPTIONS }, (_, i) => r.options[i] ?? ''),
      r.qType === 1 ? '' : r.correct.map(optionLetter).join(' '),
      r.hint,
      r.solution,
      r.usedInExams,
      r.usedInPublished.join('; '),
      formatDate(r.createdAt),
      formatDate(r.updatedAt),
    ]),
  ];
}

// ─── question form ───────────────────────────────────────────────────────────

export interface QuestionForm {
  kind: QuestionKind;
  title: string;
  options: string[];
  correct: number | null;
  hint: string;
  solution: string;
  courseId: string;
  lessonId: string;
}

export function emptyForm(courseId: string): QuestionForm {
  return { kind: 'mcq', title: '', options: ['', '', '', ''], correct: null, hint: '', solution: '', courseId, lessonId: '' };
}

export function formFromQuestion(q: QuestionRow, fallbackCourseId: string): QuestionForm {
  return {
    kind: q.kind,
    title: q.title,
    options: q.kind === 'descriptive' ? ['', '', '', ''] : q.options,
    correct: q.correct.length > 0 ? (q.correct[0] ?? null) : null,
    hint: q.hint,
    solution: q.solution,
    courseId: q.courseId || fallbackCourseId,
    lessonId: q.lessonId,
  };
}

/** Switching type keeps what still fits: T/F gets its fixed options. */
export function changeKind(form: QuestionForm, kind: QuestionKind): QuestionForm {
  if (kind === form.kind) return form;
  if (kind === 'tf') return { ...form, kind, options: [...TRUE_FALSE], correct: null };
  if (kind === 'mcq') {
    const options = form.kind === 'tf' ? ['', '', '', ''] : form.options;
    return { ...form, kind, options, correct: form.kind === 'tf' ? null : form.correct };
  }
  return { ...form, kind, correct: null };
}

export interface QuestionPayload {
  courseId: string;
  lessonId: string;
  qType: 0 | 1;
  title: string;
  numberOfOptions: number;
  options: string;
  correctAnswers: string;
  hint: string;
  solution: string;
}

/**
 * Validates the form the way the server will (question-rules.ts) and builds
 * the add / edit payload. Options are POSITIONAL: only trailing empty slots
 * are dropped; a blank in the middle must be filled or removed, because
 * dropping it would shift the answer onto the wrong option.
 */
export function buildPayload(form: QuestionForm): { ok: true; payload: QuestionPayload } | { ok: false; message: string } {
  const title = form.title.trim();
  if (!title) return { ok: false, message: 'Question text is required.' };
  const common = { courseId: form.courseId, lessonId: form.lessonId, title, hint: form.hint.trim(), solution: form.solution.trim() };
  if (form.kind === 'descriptive') {
    return { ok: true, payload: { ...common, qType: 1, numberOfOptions: 0, options: '[]', correctAnswers: '[]' } };
  }
  // A stored T/F keeps its own spelling ("true"/"false"): re-sending it
  // unchanged must not read as an answer change on a published question.
  const tf = isTrueFalse(form.options) ? form.options : [...TRUE_FALSE];
  const options = (form.kind === 'tf' ? tf : form.options).map((o) => o.trim());
  while (options.length > 0 && options[options.length - 1] === '') options.pop();
  const gap = options.findIndex((o) => o === '');
  if (gap >= 0) return { ok: false, message: `Option ${optionLetter(gap)} is empty — fill it in or remove it.` };
  if (options.length < MIN_OPTIONS) return { ok: false, message: `An MCQ needs at least ${MIN_OPTIONS} options.` };
  if (options.length > MAX_OPTIONS) return { ok: false, message: `An MCQ can have at most ${MAX_OPTIONS} options.` };
  if (form.correct === null || form.correct < 0 || form.correct >= options.length) {
    return { ok: false, message: 'Choose the correct answer.' };
  }
  return {
    ok: true,
    payload: { ...common, qType: 0, numberOfOptions: options.length, options: JSON.stringify(options), correctAnswers: JSON.stringify([form.correct]) },
  };
}
