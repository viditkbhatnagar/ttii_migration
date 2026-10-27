import { reExamCandidates } from '../exam_result/re-exam-candidates.js';
import type { Sitting, StudentResult } from '../exam_result/exam-results-model.js';
import type { ReExamCandidate } from './ScheduleReExamDialog.js';

// Create Re-exam for the whole exam (Naji 2026-10-27): every subject that has
// students needing a re-exam is listed together, each with a window of its own.
// This is the pure part — which subjects are eligible, what is ticked, what is
// still missing, and the payload — so the dialog stays presentational.

export interface EligibleSubject {
  examId: number;
  subjectTitle: string;
  /** YYYY-MM-DD of the original sitting. */
  date: string;
  candidates: ReExamCandidate[];
}

export interface SubjectDraft {
  included: boolean;
  selected: ReadonlySet<number>;
  date: string;
  startTime: string;
  endTime: string;
}

export type BatchDrafts = Readonly<Record<number, SubjectDraft>>;

export interface BatchItemPayload {
  exam_id: number;
  user_ids: number[];
  date: string;
  start_time: string;
  end_time: string;
  notes?: string;
}

export interface BatchError {
  examId: number;
  subjectTitle: string;
  message: string;
}

/** Closed sittings with at least one student who may need a re-exam. */
export function eligibleSubjects(sittings: Sitting[], students: StudentResult[]): EligibleSubject[] {
  const out: EligibleSubject[] = [];
  sittings.forEach((s, index) => {
    if (!s.closed) return;
    const candidates = reExamCandidates(students, index);
    if (candidates.length === 0) return;
    out.push({ examId: s.examId, subjectTitle: s.subjectTitle, date: s.date, candidates });
  });
  return out;
}

/** Ticked where there is a pre-ticked candidate; a subject with none starts unticked. */
export function initialDrafts(subjects: EligibleSubject[]): BatchDrafts {
  const drafts: Record<number, SubjectDraft> = {};
  for (const s of subjects) {
    const selected = new Set(s.candidates.filter((c) => c.preselect).map((c) => c.userId));
    drafts[s.examId] = { included: selected.size > 0, selected, date: '', startTime: '', endTime: '' };
  }
  return drafts;
}

export function updateDraft(drafts: BatchDrafts, examId: number, patch: Partial<SubjectDraft>): BatchDrafts {
  const current = drafts[examId];
  return current ? { ...drafts, [examId]: { ...current, ...patch } } : drafts;
}

export function toggleStudent(drafts: BatchDrafts, examId: number, userId: number): BatchDrafts {
  const current = drafts[examId];
  if (!current) return drafts;
  const selected = new Set(current.selected);
  if (selected.has(userId)) selected.delete(userId); else selected.add(userId);
  return updateDraft(drafts, examId, { selected });
}

/** What is missing for one ticked subject, or null when it is ready. */
export function subjectProblem(draft: SubjectDraft): string | null {
  if (draft.selected.size === 0) return 'Select at least one student.';
  if (!draft.date || !draft.startTime || !draft.endTime) return 'Enter the date, start time and end time.';
  if (draft.endTime <= draft.startTime) return 'The end time must be after the start time.';
  return null;
}

/** YYYY-MM-DD plus n calendar days (UTC arithmetic on the wall-clock date — no time zone involved). */
export function addDaysYmd(ymd: string, n: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return '';
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + n));
  return d.toISOString().slice(0, 10);
}

/** True when this subject's window is complete and a ticked subject follows it. */
export function canCopyDown(subjects: EligibleSubject[], drafts: BatchDrafts, examId: number): boolean {
  const d = drafts[examId];
  if (!d?.included || !d.date || !d.startTime || !d.endTime) return false;
  const at = subjects.findIndex((s) => s.examId === examId);
  return subjects.slice(at + 1).some((s) => drafts[s.examId]?.included);
}

/**
 * Naji 2026-10-27 — fewer steps: copy one subject's window to every TICKED
 * subject below it, same times, one day apart (each stays editable). A student
 * re-sitting two papers can then never land on the same slot twice.
 */
export function copyWindowDown(subjects: EligibleSubject[], drafts: BatchDrafts, examId: number): BatchDrafts {
  const from = drafts[examId];
  if (!from || !canCopyDown(subjects, drafts, examId)) return drafts;
  const at = subjects.findIndex((s) => s.examId === examId);
  let next: BatchDrafts = drafts;
  let day = 0;
  for (const s of subjects.slice(at + 1)) {
    if (!next[s.examId]?.included) continue;
    day += 1;
    next = updateDraft(next, s.examId, { date: addDaysYmd(from.date, day), startTime: from.startTime, endTime: from.endTime });
  }
  return next;
}

export function tickedSubjects(subjects: EligibleSubject[], drafts: BatchDrafts): EligibleSubject[] {
  return subjects.filter((s) => drafts[s.examId]?.included);
}

/** Ticked students across ticked subjects. */
export function tickedStudentCount(subjects: EligibleSubject[], drafts: BatchDrafts): number {
  return tickedSubjects(subjects, drafts).reduce((n, s) => n + (drafts[s.examId]?.selected.size ?? 0), 0);
}

export function canSubmit(subjects: EligibleSubject[], drafts: BatchDrafts): boolean {
  const ticked = tickedSubjects(subjects, drafts);
  return ticked.length > 0 && ticked.every((s) => {
    const d = drafts[s.examId];
    return d !== undefined && subjectProblem(d) === null;
  });
}

export function buildBatchItems(subjects: EligibleSubject[], drafts: BatchDrafts, notes: string): BatchItemPayload[] {
  const trimmed = notes.trim();
  return tickedSubjects(subjects, drafts).flatMap((s) => {
    const d = drafts[s.examId];
    if (!d) return [];
    return [{
      exam_id: s.examId,
      user_ids: s.candidates.filter((c) => d.selected.has(c.userId)).map((c) => c.userId),
      date: d.date,
      start_time: d.startTime,
      end_time: d.endTime,
      ...(trimmed ? { notes: trimmed } : {}),
    }];
  });
}

/** The server's per-subject refusals, keyed by exam id (first message wins per subject, the rest are joined). */
export function errorsByExam(raw: unknown): Record<number, string> {
  const out: Record<number, string> = {};
  if (!Array.isArray(raw)) return out;
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    const id = Number(e.examId);
    const message = typeof e.message === 'string' ? e.message : '';
    if (!Number.isFinite(id) || !message) continue;
    out[id] = out[id] ? `${out[id]} ${message}` : message;
  }
  return out;
}
