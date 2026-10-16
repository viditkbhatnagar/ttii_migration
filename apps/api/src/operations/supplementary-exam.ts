// Supplementary exams (Risha, TTII 2026-10-16) — the pure rules, no database.
//
// "Can we create a supplementary exam from an existing exam, with an editable
// name? ... It should automatically pick only the subjects where students
// failed, and assign only the students who failed each subject."
//
// Who is a candidate comes straight from the source exam's result sheet
// (computeExamResults, the same sheet the Result page shows), never from a
// second pass/fail rule:
//   - FAILED   the subject was marked and is below its pass mark  → pre-ticked
//   - ABSENT   no paper once the sitting (or its re-exam) closed  → listed, unticked
//   - FLAGGED  a paper with almost no answers saved               → listed, unticked
//   - REEXAM   a re-exam is scheduled and not yet sat             → listed, unticked
// A subject is pre-selected when it has at least one failed student.

import { parseReExamWindow } from './re-exam-service.js';
import type { ResultSitting, SittingStatus, StudentResult, StudentSittingResult } from './exam-results.js';

export const TITLE_MAX = 200;
/** A start this far in the past is still accepted (the dialog took a minute to fill). */
const START_SLACK_MS = 15 * 60 * 1000;
const MARKS_MAX = 1000;

// ─── Name ─────────────────────────────────────────────────────────────────

function matchCase(found: string, replacement: string): string {
  if (found === found.toUpperCase() && found !== found.toLowerCase()) return replacement.toUpperCase();
  if (found === found.toLowerCase()) return replacement.toLowerCase();
  return replacement;
}

/**
 * "Diploma …, Regular Examination, August 2026" → "Diploma …, Supplementary
 * Examination, August 2026". A title without "Regular" gets
 * " – Supplementary Examination" appended; one that already says
 * "Supplementary" (a supplementary of a supplementary) is kept as it is.
 * Month and year text is never touched — the admin edits it if needed.
 */
export function supplementaryTitle(sourceTitle: string): string {
  const title = sourceTitle.trim();
  if (!title) return 'Supplementary Examination';
  const examWords = /regular\s+examination/i;
  const regular = /\bregular\b/i;
  let next: string;
  if (examWords.test(title)) next = title.replace(examWords, (m) => matchCase(m, 'Supplementary Examination'));
  else if (regular.test(title)) next = title.replace(regular, (m) => matchCase(m, 'Supplementary'));
  else if (/\bsupplementary\b/i.test(title)) next = title;
  else next = `${title} – Supplementary Examination`;
  return next.slice(0, TITLE_MAX);
}

// ─── Candidates ───────────────────────────────────────────────────────────

export type CandidateGroup = 'failed' | 'absent' | 'flagged' | 'reexam';

export interface Candidate {
  userId: number;
  name: string;
  studentCode: string;
  group: CandidateGroup;
  score: number | null;
  totalMarks: number;
  /** The low-answers note of a flagged paper. */
  flag: string | null;
  /** YYYY-MM-DD of a scheduled (reexam) or missed (absent) re-exam. */
  reExamDate: string;
}

/** Which group a result cell puts the student in for a supplementary, or null when they need none. */
export function candidateGroup(cell: Pick<StudentSittingResult, 'status' | 'flag'>): CandidateGroup | null {
  if (cell.status === 'pass' || cell.status === 'not_entered' || cell.status === 'pending') return null;
  if (cell.flag !== null) return 'flagged';
  if (cell.status === 'fail') return 'failed';
  if (cell.status === 'absent') return 'absent';
  if (cell.status === 'reexam') return 'reexam';
  return null;
}

const GROUP_ORDER: Record<CandidateGroup, number> = { failed: 0, flagged: 1, absent: 2, reexam: 3 };

/** Sitting exam id → the students who may be entered for it, failed first. */
export function candidatesBySitting(sittings: Array<Pick<ResultSitting, 'examId'>>, students: StudentResult[]): Map<number, Candidate[]> {
  const out = new Map<number, Candidate[]>(sittings.map((s) => [s.examId, []]));
  for (const st of students) {
    for (const cell of st.sittings) {
      const list = out.get(cell.examId);
      const group = candidateGroup(cell);
      if (!list || group === null) continue;
      list.push({
        userId: st.userId,
        name: st.name,
        studentCode: st.studentCode,
        group,
        score: cell.score,
        totalMarks: cell.totalMarks,
        flag: cell.flag,
        reExamDate: cell.reExam?.date ?? '',
      });
    }
  }
  for (const list of out.values()) {
    list.sort((a, b) => GROUP_ORDER[a.group] - GROUP_ORDER[b.group] || a.name.localeCompare(b.name));
  }
  return out;
}

// ─── Dialog draft ─────────────────────────────────────────────────────────

/** One sitting of the source exam, with what a supplementary copies from it. */
export interface SourceSitting {
  sittingExamId: number;
  examSubjectId: number | null;
  subjectId: number | null;
  subjectTitle: string;
  courseIds: string;
  /** The source sitting's own date, HH:MM window and paper length. */
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  totalMarks: number;
  passMarks: number | null;
  /** Step 3 plan of the source subject (copied to the supplementary). */
  mcqQuestions: number;
  descriptiveQuestions: number;
  marksEach: number;
}

export interface DraftCandidate extends Candidate {
  /** Title of another supplementary exam that already has this student for this subject. */
  alreadyIn: string;
  preselect: boolean;
}

export interface DraftSubject extends SourceSitting {
  candidates: DraftCandidate[];
  failed: number;
  /** Ticked when the dialog opens: someone failed it and is not yet in a supplementary for it. */
  preselect: boolean;
}

export function enteredKey(userId: number, sittingExamId: number): string {
  return `${userId}:${sittingExamId}`;
}

/**
 * The subjects the dialog lists: every source sitting with at least one
 * candidate, in the source's order. `alreadyIn` maps (student, source sitting)
 * to the supplementary exam already holding that student for that subject.
 */
export function buildDraftSubjects(
  sittings: SourceSitting[],
  candidates: Map<number, Candidate[]>,
  alreadyIn: Map<string, string> = new Map(),
): DraftSubject[] {
  const out: DraftSubject[] = [];
  for (const s of sittings) {
    const list = candidates.get(s.sittingExamId) ?? [];
    if (list.length === 0) continue;
    const marked = list.map((c): DraftCandidate => {
      const held = alreadyIn.get(enteredKey(c.userId, s.sittingExamId)) ?? '';
      return { ...c, alreadyIn: held, preselect: c.group === 'failed' && !held };
    });
    out.push({
      ...s,
      candidates: marked,
      failed: marked.filter((c) => c.group === 'failed').length,
      preselect: marked.some((c) => c.preselect),
    });
  }
  return out;
}

// ─── Create: validation ───────────────────────────────────────────────────

export interface SubjectInput {
  sittingExamId: number;
  /** YYYY-MM-DD and HH:MM — an IST wall clock, like the exam columns. */
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  totalMarks: number;
  passMarks: number;
  userIds: number[];
}

export interface ParsedSubject extends SubjectInput {
  /** Stored shapes: @db.Date at UTC midnight, @db.Time on 1970-01-01 UTC. */
  storedDate: Date;
  storedStart: Date;
  storedEnd: Date;
  startMs: number;
  endMs: number;
}

export interface ValidationContext {
  /** Source sitting exam id → subject title, in the source's order. */
  subjectTitles: Map<number, string>;
  /** Source sitting exam id → students who may be entered (not passed). */
  candidates: Map<number, Set<number>>;
  nowMs: number;
}

export type Validated =
  | { ok: true; title: string; subjects: ParsedSubject[] }
  | { ok: false; message: string };

function isWholeNumber(n: number): boolean {
  return Number.isInteger(n) && Number.isFinite(n);
}

function subjectProblem(s: SubjectInput, label: string, ctx: ValidationContext): string | ParsedSubject {
  const window = parseReExamWindow(s.date, s.startTime, s.endTime);
  if (!window) return `${label}: enter a valid date, start time and end time.`;
  if (window.endMs <= window.startMs) return `${label}: the end time must be after the start time.`;
  if (window.startMs < ctx.nowMs - START_SLACK_MS) return `${label}: the start time has already passed.`;
  const windowMin = Math.round((window.endMs - window.startMs) / 60000);
  if (!isWholeNumber(s.durationMinutes) || s.durationMinutes <= 0) return `${label}: enter the paper length in minutes.`;
  if (s.durationMinutes > windowMin) {
    return `${label}: the paper (${s.durationMinutes} min) is longer than the window (${windowMin} min). Widen the window or shorten the paper.`;
  }
  if (!isWholeNumber(s.totalMarks) || s.totalMarks <= 0 || s.totalMarks > MARKS_MAX) return `${label}: enter the total marks.`;
  if (!isWholeNumber(s.passMarks) || s.passMarks < 0) return `${label}: enter the pass marks.`;
  if (s.passMarks > s.totalMarks) return `${label}: the pass marks cannot exceed the total marks.`;
  const userIds = [...new Set(s.userIds.filter((id) => Number.isInteger(id) && id > 0))];
  if (userIds.length === 0) return `${label}: select at least one student.`;
  const allowed = ctx.candidates.get(s.sittingExamId) ?? new Set<number>();
  const outsiders = userIds.filter((id) => !allowed.has(id)).length;
  if (outsiders > 0) {
    return `${label}: ${outsiders} selected student${outsiders === 1 ? ' did' : 's did'} not fail, miss or have a flagged paper in this subject.`;
  }
  return {
    ...s,
    userIds,
    storedDate: window.date,
    storedStart: window.start,
    storedEnd: window.end,
    startMs: window.startMs,
    endMs: window.endMs,
  };
}

/** Checks the dialog's request against the source exam; the first problem is returned as the message. */
export function validateSupplementary(input: { title: string; subjects: SubjectInput[] }, ctx: ValidationContext): Validated {
  const title = input.title.trim();
  if (!title) return { ok: false, message: 'Enter a name for the supplementary exam.' };
  if (title.length > TITLE_MAX) return { ok: false, message: `The name can be at most ${TITLE_MAX} characters.` };
  if (input.subjects.length === 0) return { ok: false, message: 'Select at least one subject.' };
  const seen = new Set<number>();
  const parsed: ParsedSubject[] = [];
  for (const s of input.subjects) {
    const subjectTitle = ctx.subjectTitles.get(s.sittingExamId);
    if (subjectTitle === undefined) return { ok: false, message: 'A selected subject is not part of this exam.' };
    if (seen.has(s.sittingExamId)) return { ok: false, message: `${subjectTitle} is selected twice.` };
    seen.add(s.sittingExamId);
    const result = subjectProblem(s, subjectTitle, ctx);
    if (typeof result === 'string') return { ok: false, message: result };
    parsed.push(result);
  }
  // Keep the source exam's subject order (the dialog's order may differ).
  const order = [...ctx.subjectTitles.keys()];
  parsed.sort((a, b) => order.indexOf(a.sittingExamId) - order.indexOf(b.sittingExamId));
  return { ok: true, title, subjects: parsed };
}

/** The parent row's Step 1 window: from the earliest sitting's start to the latest one's end. */
export function parentWindow(subjects: ParsedSubject[]): {
  fromDate: Date; fromTime: Date; toDate: Date; toTime: Date; durationMinutes: number;
} | null {
  if (subjects.length === 0) return null;
  const first = subjects.reduce((a, b) => (b.startMs < a.startMs ? b : a));
  const last = subjects.reduce((a, b) => (b.endMs > a.endMs ? b : a));
  return {
    fromDate: first.storedDate,
    fromTime: first.storedStart,
    toDate: last.storedDate,
    toTime: last.storedEnd,
    durationMinutes: Math.max(0, Math.round((last.endMs - first.startMs) / 60000)),
  };
}

// ─── Linking a supplementary's sittings back to the source ───────────────

export interface ScheduleKey {
  sittingExamId: number;
  subjectId: number | null;
  subjectTitle: string;
}

function normalTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Supplementary sitting → the source sitting it re-examines. Its schedule row
 * was copied from the source's, so the subject matches (a "whole course" row
 * of a lesson-wise course has no subject id and matches by its title).
 */
export function matchSittings(source: ScheduleKey[], supplementary: ScheduleKey[]): Map<number, number> {
  const out = new Map<number, number>();
  for (const s of supplementary) {
    const hit = s.subjectId !== null
      ? source.find((src) => src.subjectId === s.subjectId)
      : source.find((src) => src.subjectId === null && normalTitle(src.subjectTitle) === normalTitle(s.subjectTitle));
    const fallback = hit ?? source.find((src) => normalTitle(src.subjectTitle) === normalTitle(s.subjectTitle));
    if (fallback) out.set(s.sittingExamId, fallback.sittingExamId);
  }
  return out;
}

// ─── Publishing a supplementary exam ──────────────────────────────────────

/**
 * Why a supplementary exam cannot be published as it stands, or null. Its
 * sittings were created with their own students, so every Step 2 subject must
 * still have its sitting, and every sitting at least one student; a subject
 * added later would have nobody chosen for it.
 */
export function supplementaryPublishProblem(
  schedule: Array<{ id: number; subject_title: string }>,
  childBySubjectRow: ReadonlyMap<number, number>,
  studentsBySitting: ReadonlyMap<number, number>,
): string | null {
  if (schedule.length === 0) {
    return 'This supplementary exam has no subjects left in Step 2. Delete it and create the supplementary exam again from the Result page.';
  }
  const added = schedule.filter((r) => !childBySubjectRow.has(r.id)).map((r) => r.subject_title || `Subject ${r.id}`);
  if (added.length > 0) {
    return `Not published — ${added.join(', ')} ${added.length === 1 ? 'was' : 'were'} added after this supplementary exam was created, so no students are chosen for ${added.length === 1 ? 'it' : 'them'}. Remove ${added.length === 1 ? 'it' : 'them'} in Step 2, or create a separate supplementary exam from the Result page.`;
  }
  const empty = schedule
    .filter((r) => (studentsBySitting.get(childBySubjectRow.get(r.id) ?? 0) ?? 0) === 0)
    .map((r) => r.subject_title || `Subject ${r.id}`);
  if (empty.length > 0) return `Not published — no students are entered for ${empty.join(', ')}.`;
  return null;
}

// ─── Outcomes shown on the source exam's Result page ─────────────────────

export type SupplementaryExamStatus = 'draft' | 'in_progress' | 'ready' | 'published';

export interface SupplementaryOutcome {
  userId: number;
  sourceSittingId: number;
  supplementaryExamId: number;
  supplementarySittingId: number;
  status: SittingStatus;
  score: number | null;
  totalMarks: number;
  passMarks: number | null;
  /** YYYY-MM-DD of the supplementary sitting. */
  date: string;
  examStatus: SupplementaryExamStatus;
}

/** One supplementary exam's result cells, re-keyed to the source exam's sittings. */
export function supplementaryOutcomes(
  bundle: { examId: number; examStatus: SupplementaryExamStatus; sittings: Array<Pick<ResultSitting, 'examId' | 'date'>>; students: StudentResult[] },
  toSourceSitting: ReadonlyMap<number, number>,
): SupplementaryOutcome[] {
  const dateOf = new Map(bundle.sittings.map((s) => [s.examId, s.date]));
  const out: SupplementaryOutcome[] = [];
  for (const st of bundle.students) {
    for (const cell of st.sittings) {
      if (cell.status === 'not_entered') continue;
      const source = toSourceSitting.get(cell.examId);
      if (source === undefined) continue;
      out.push({
        userId: st.userId,
        sourceSittingId: source,
        supplementaryExamId: bundle.examId,
        supplementarySittingId: cell.examId,
        status: cell.status,
        score: cell.score,
        totalMarks: cell.totalMarks,
        passMarks: cell.passMarks,
        date: cell.reExam?.date || dateOf.get(cell.examId) || '',
        examStatus: bundle.examStatus,
      });
    }
  }
  return out;
}
