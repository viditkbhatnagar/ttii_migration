// Supplementary exams (Risha, TTII 2026-10-16) — the admin screens' pure model.
// The server works out who failed, missed or has a flagged paper from the
// Result page's own sheet (supplementary-exam-service on the API); this file
// reads what it sends, holds the Create dialog's per-subject choices, checks
// them the way the server will, and words the outcomes shown on the regular
// exam's Result page.

import type { Tone } from '../../shared/components/ui-tones.js';
import { asNumber, asString } from '../../shared/utils/admin-data-utils.js';
import { formatYmd, type SittingStatus } from '../exam_result/exam-results-model.js';

export type CandidateGroup = 'failed' | 'absent' | 'flagged' | 'reexam';
export type SupplementaryStatus = 'draft' | 'in_progress' | 'ready' | 'published';

export interface DraftCandidate {
  userId: number;
  name: string;
  studentCode: string;
  group: CandidateGroup;
  score: number | null;
  totalMarks: number;
  flag: string;
  reExamDate: string;
  /** Another supplementary exam already holding this student for this subject. */
  alreadyIn: string;
  preselect: boolean;
}

export interface DraftSubject {
  sittingExamId: number;
  subjectTitle: string;
  /** The regular sitting's date (YYYY-MM-DD) and IST window. */
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  totalMarks: number;
  passMarks: number | null;
  mcqQuestions: number;
  descriptiveQuestions: number;
  marksEach: number;
  failed: number;
  preselect: boolean;
  candidates: DraftCandidate[];
}

export interface SupplementaryRef {
  examId: number;
  examCode: string;
  title: string;
  status: SupplementaryStatus;
  subjects: number;
  students: number;
}

export interface SupplementaryDraft {
  sourceExamId: number;
  sourceExamCode: string;
  sourceTitle: string;
  suggestedTitle: string;
  setUp: boolean;
  existing: SupplementaryRef[];
  subjects: DraftSubject[];
}

export interface SupplementaryOutcome {
  userId: number;
  sourceSittingId: number;
  supplementaryExamId: number;
  status: SittingStatus;
  score: number | null;
  totalMarks: number;
  passMarks: number | null;
  date: string;
  examStatus: SupplementaryStatus;
}

export interface SupplementaryLinks {
  supplementaryOf: { examId: number; examCode: string; title: string } | null;
  supplementaries: SupplementaryRef[];
  outcomes: SupplementaryOutcome[];
}

const GROUPS: CandidateGroup[] = ['failed', 'flagged', 'absent', 'reexam'];
const STATUSES: SupplementaryStatus[] = ['draft', 'in_progress', 'ready', 'published'];

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function list(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v) ? v.map(rec) : [];
}

function numOrNull(v: unknown): number | null {
  return v === null || v === undefined || v === '' ? null : asNumber(v);
}

function toStatus(v: unknown): SupplementaryStatus {
  const s = asString(v) as SupplementaryStatus;
  return STATUSES.includes(s) ? s : 'draft';
}

function toRef(r: Record<string, unknown>): SupplementaryRef {
  return {
    examId: asNumber(r.examId),
    examCode: asString(r.examCode),
    title: asString(r.title),
    status: toStatus(r.status),
    subjects: asNumber(r.subjects),
    students: asNumber(r.students),
  };
}

export function toSupplementaryDraft(raw: unknown): SupplementaryDraft {
  const d = rec(raw);
  return {
    sourceExamId: asNumber(d.sourceExamId),
    sourceExamCode: asString(d.sourceExamCode),
    sourceTitle: asString(d.sourceTitle),
    suggestedTitle: asString(d.suggestedTitle),
    setUp: d.setUp === true,
    existing: list(d.existing).map(toRef),
    subjects: list(d.subjects).map((s) => ({
      sittingExamId: asNumber(s.sittingExamId),
      subjectTitle: asString(s.subjectTitle),
      date: asString(s.date),
      startTime: asString(s.startTime),
      endTime: asString(s.endTime),
      durationMinutes: asNumber(s.durationMinutes),
      totalMarks: asNumber(s.totalMarks),
      passMarks: numOrNull(s.passMarks),
      mcqQuestions: asNumber(s.mcqQuestions),
      descriptiveQuestions: asNumber(s.descriptiveQuestions),
      marksEach: asNumber(s.marksEach),
      failed: asNumber(s.failed),
      preselect: s.preselect === true,
      candidates: list(s.candidates).map((c) => {
        const group = asString(c.group) as CandidateGroup;
        return {
          userId: asNumber(c.userId),
          name: asString(c.name),
          studentCode: asString(c.studentCode),
          group: GROUPS.includes(group) ? group : 'absent',
          score: numOrNull(c.score),
          totalMarks: asNumber(c.totalMarks),
          flag: asString(c.flag),
          reExamDate: asString(c.reExamDate),
          alreadyIn: asString(c.alreadyIn),
          preselect: c.preselect === true,
        };
      }),
    })),
  };
}

export function toSupplementaryLinks(raw: unknown): SupplementaryLinks {
  const d = rec(raw);
  const of = rec(d.supplementaryOf);
  return {
    supplementaryOf: of.examId ? { examId: asNumber(of.examId), examCode: asString(of.examCode), title: asString(of.title) } : null,
    supplementaries: list(d.supplementaries).map(toRef),
    outcomes: list(d.outcomes).map((o) => ({
      userId: asNumber(o.userId),
      sourceSittingId: asNumber(o.sourceSittingId),
      supplementaryExamId: asNumber(o.supplementaryExamId),
      status: asString(o.status) as SittingStatus,
      score: numOrNull(o.score),
      totalMarks: asNumber(o.totalMarks),
      passMarks: numOrNull(o.passMarks),
      date: asString(o.date),
      examStatus: toStatus(o.examStatus),
    })),
  };
}

// ─── Candidate groups ─────────────────────────────────────────────────────

export const GROUP_META: Record<CandidateGroup, { label: string; tone: Tone; hint: string }> = {
  failed: { label: 'Failed', tone: 'rose', hint: 'Marked below the pass mark. Ticked for you.' },
  flagged: { label: 'Flagged paper', tone: 'amber', hint: 'Almost no answers saved, usually a technical problem. Check before adding: a free re-exam may suit better.' },
  absent: { label: 'Absent', tone: 'slate', hint: 'Did not sit the subject. Add them if they should take the supplementary.' },
  reexam: { label: 'Re-exam pending', tone: 'primary', hint: 'A re-exam is already scheduled for them in this subject.' },
};

export const GROUP_ORDER: CandidateGroup[] = GROUPS;

/** "17/70", "Missed re-exam 20/08", "0 of 70 answers …" — why this student is listed. */
export function candidateNote(c: DraftCandidate): string {
  if (c.group === 'failed') return `${c.score ?? 0}/${c.totalMarks}`;
  if (c.group === 'flagged') return c.flag || `${c.score ?? 0}/${c.totalMarks}`;
  if (c.group === 'reexam') return c.reExamDate ? `Re-exam ${formatYmd(c.reExamDate)}` : 'Re-exam scheduled';
  return c.reExamDate ? `Missed re-exam ${formatYmd(c.reExamDate)}` : 'Did not sit';
}

// ─── The dialog's choices for one subject ────────────────────────────────

export interface SubjectChoice {
  selected: boolean;
  /** YYYY-MM-DD of the supplementary sitting — chosen by the admin. */
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  /** Once the admin types a paper length it no longer follows the window. */
  durationTouched: boolean;
  totalMarks: number;
  passMarks: number;
  picked: Set<number>;
}

/** Copied from the regular sitting; the date is left for the admin to pick. */
export function initialChoice(s: DraftSubject): SubjectChoice {
  return {
    selected: s.preselect,
    date: '',
    startTime: s.startTime,
    endTime: s.endTime,
    durationMinutes: s.durationMinutes,
    durationTouched: s.durationMinutes !== (windowMinutes(s.startTime, s.endTime) ?? -1),
    totalMarks: s.totalMarks,
    passMarks: s.passMarks ?? 0,
    picked: new Set(s.candidates.filter((c) => c.preselect).map((c) => c.userId)),
  };
}

const HM = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Minutes from HH:MM to HH:MM on the same day; null when either is missing or the end is not later. */
export function windowMinutes(start: string, end: string): number | null {
  const a = HM.exec(start);
  const b = HM.exec(end);
  if (!a || !b) return null;
  const minutes = Number(b[1]) * 60 + Number(b[2]) - (Number(a[1]) * 60 + Number(a[2]));
  return minutes > 0 ? minutes : null;
}

/** A time change; the paper length follows the window until the admin edits it. */
export function withTimes(c: SubjectChoice, patch: { startTime?: string; endTime?: string }): SubjectChoice {
  const next = { ...c, ...patch };
  const w = windowMinutes(next.startTime, next.endTime);
  return !c.durationTouched && w !== null ? { ...next, durationMinutes: w } : next;
}

export function togglePicked(c: SubjectChoice, userId: number): SubjectChoice {
  const picked = new Set(c.picked);
  if (picked.has(userId)) picked.delete(userId);
  else picked.add(userId);
  return { ...c, picked };
}

/** The first thing wrong with a selected subject, worded for the dialog; null when it is ready. */
export function choiceProblem(c: SubjectChoice, todayYmd: string): string | null {
  if (!c.date) return 'Pick the date.';
  if (c.date < todayYmd) return 'The date has already passed.';
  const w = windowMinutes(c.startTime, c.endTime);
  if (!c.startTime || !c.endTime) return 'Enter the start and end time.';
  if (w === null) return 'The end time must be after the start time.';
  if (!Number.isInteger(c.durationMinutes) || c.durationMinutes <= 0) return 'Enter the paper length in minutes.';
  if (c.durationMinutes > w) return `The paper (${c.durationMinutes} min) is longer than the window (${w} min).`;
  if (!Number.isInteger(c.totalMarks) || c.totalMarks <= 0) return 'Enter the total marks.';
  if (!Number.isInteger(c.passMarks) || c.passMarks < 0) return 'Enter the pass marks.';
  if (c.passMarks > c.totalMarks) return 'The pass marks cannot exceed the total marks.';
  if (c.picked.size === 0) return 'Tick at least one student.';
  return null;
}

/** The first problem across the dialog, prefixed with the subject; null when it can be created. */
export function dialogProblem(title: string, subjects: DraftSubject[], choices: Map<number, SubjectChoice>, todayYmd: string): string | null {
  if (!title.trim()) return 'Enter a name for the supplementary exam.';
  const chosen = subjects.filter((s) => choices.get(s.sittingExamId)?.selected);
  if (chosen.length === 0) return 'Select at least one subject.';
  for (const s of chosen) {
    const problem = choiceProblem(choices.get(s.sittingExamId) as SubjectChoice, todayYmd);
    if (problem) return `${s.subjectTitle}: ${problem}`;
  }
  return overlapProblem(chosen, choices);
}

/** Absolute minutes of an IST wall-clock date and HH:MM (only ever compared with each other). */
function wallMinutes(ymd: string, hm: string): number | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  const t = HM.exec(hm);
  if (!d || !t) return null;
  return Date.UTC(Number(d[1]), Number(d[2]) - 1, Number(d[3]), Number(t[1]), Number(t[2])) / 60000;
}

/**
 * A student cannot sit two papers at once: two ticked subjects whose windows
 * overlap must not share a ticked student. The server makes the same check.
 */
export function overlapProblem(chosen: DraftSubject[], choices: Map<number, SubjectChoice>): string | null {
  const span = (s: DraftSubject): [number, number] | null => {
    const c = choices.get(s.sittingExamId);
    const start = c ? wallMinutes(c.date, c.startTime) : null;
    const end = c ? wallMinutes(c.date, c.endTime) : null;
    return start !== null && end !== null ? [start, end] : null;
  };
  for (const [i, a] of chosen.entries()) {
    for (const b of chosen.slice(i + 1)) {
      const wa = span(a);
      const wb = span(b);
      if (!wa || !wb || !(wa[0] < wb[1] && wb[0] < wa[1])) continue;
      const other = choices.get(b.sittingExamId)?.picked ?? new Set<number>();
      const shared = [...(choices.get(a.sittingExamId)?.picked ?? [])].filter((id) => other.has(id));
      if (shared.length === 0) continue;
      const names = shared.map((id) => a.candidates.find((c) => c.userId === id)?.name ?? '').filter(Boolean);
      const who = names.length === shared.length && shared.length <= 3
        ? `${names.join(', ')} ${shared.length === 1 ? 'is' : 'are'}`
        : `${shared.length} student${shared.length === 1 ? ' is' : 's are'}`;
      return `${a.subjectTitle} and ${b.subjectTitle} overlap on ${formatYmd(choices.get(a.sittingExamId)?.date ?? '')}, and ${who} ticked for both. Give them different times.`;
    }
  }
  return null;
}

/** The body of POST /admin/exam_supplementary/create. */
export function createPayload(sourceExamId: number, title: string, subjects: DraftSubject[], choices: Map<number, SubjectChoice>): Record<string, unknown> {
  return {
    source_exam_id: sourceExamId,
    title: title.trim(),
    subjects: subjects.flatMap((s) => {
      const c = choices.get(s.sittingExamId);
      if (!c?.selected) return [];
      return [{
        sitting_exam_id: s.sittingExamId,
        date: c.date,
        start_time: c.startTime,
        end_time: c.endTime,
        duration_minutes: c.durationMinutes,
        total_marks: c.totalMarks,
        pass_marks: c.passMarks,
        user_ids: [...c.picked],
      }];
    }),
  };
}

/** Students across the selected subjects, each counted once. */
export function selectedStudentCount(choices: Map<number, SubjectChoice>): number {
  const all = new Set<number>();
  for (const c of choices.values()) if (c.selected) for (const id of c.picked) all.add(id);
  return all.size;
}

/** Today's date in IST as YYYY-MM-DD (exam dates are IST wall-clock dates). */
export function istToday(now: Date = new Date()): string {
  return new Date(now.getTime() + 330 * 60 * 1000).toISOString().slice(0, 10);
}

// ─── Outcomes on the regular exam's Result page ──────────────────────────

export function outcomeKey(userId: number, sourceSittingId: number): string {
  return `${userId}:${sourceSittingId}`;
}

/** (student, subject) → the newest supplementary outcome for it. */
export function outcomesByKey(outcomes: SupplementaryOutcome[]): Map<string, SupplementaryOutcome> {
  const out = new Map<string, SupplementaryOutcome>();
  for (const o of outcomes) {
    const key = outcomeKey(o.userId, o.sourceSittingId);
    const held = out.get(key);
    if (!held || o.supplementaryExamId > held.supplementaryExamId) out.set(key, o);
  }
  return out;
}

/** "Supplementary: 40/70 Passed", "Supplementary: Absent", "Supplementary on 28/10/2026 (draft)". */
export function outcomeLabel(o: SupplementaryOutcome): string {
  if (o.examStatus === 'draft') return `Supplementary on ${formatYmd(o.date) || 'a date to be set'} (draft)`;
  if (o.score !== null) {
    const verdict = o.status === 'pass' ? ' Passed' : o.status === 'fail' ? ' Failed' : '';
    return `Supplementary: ${o.score}/${o.totalMarks}${verdict}`;
  }
  if (o.status === 'absent') return 'Supplementary: Absent';
  if (o.status === 'reexam') return 'Supplementary: re-exam scheduled';
  return `Supplementary on ${formatYmd(o.date) || 'a date to be set'}`;
}

/** The short form for a cell of the result grid. */
export function outcomeChip(o: SupplementaryOutcome): { text: string; tone: Tone } {
  if (o.examStatus === 'draft') return { text: 'Supp. draft', tone: 'slate' };
  if (o.score !== null) {
    return { text: `Supp. ${o.score}${o.status === 'pass' ? ' P' : o.status === 'fail' ? ' F' : ''}`, tone: o.status === 'pass' ? 'emerald' : o.status === 'fail' ? 'rose' : 'slate' };
  }
  if (o.status === 'absent') return { text: 'Supp. absent', tone: 'slate' };
  return { text: `Supp. ${formatYmd(o.date).slice(0, 5) || 'scheduled'}`, tone: 'blue' };
}

// ─── The wizard's view of a supplementary exam ───────────────────────────

export interface SupplementaryWizardInfo {
  sourceExamId: number;
  sourceExamCode: string;
  sourceTitle: string;
  subjects: Array<{
    examSubjectId: number;
    subjectTitle: string;
    students: Array<{ userId: number; name: string; studentCode: string }>;
  }>;
  /** Questions on the regular exam's papers; Step 4 avoids them where it can. */
  sourceQuestionIds: number[];
}

/** Null for any exam that is not supplementary (or when the read failed). */
export function toSupplementaryWizardInfo(raw: unknown): SupplementaryWizardInfo | null {
  const d = rec(raw);
  if (d.isSupplementary !== true) return null;
  return {
    sourceExamId: asNumber(d.sourceExamId),
    sourceExamCode: asString(d.sourceExamCode),
    sourceTitle: asString(d.sourceTitle),
    subjects: list(d.subjects).map((s) => ({
      examSubjectId: asNumber(s.examSubjectId),
      subjectTitle: asString(s.subjectTitle),
      students: list(s.students).map((st) => ({ userId: asNumber(st.userId), name: asString(st.name), studentCode: asString(st.studentCode) })),
    })),
    sourceQuestionIds: Array.isArray(d.sourceQuestionIds) ? d.sourceQuestionIds.map((v) => asNumber(v)).filter((n) => n > 0) : [],
  };
}

export const SUPPLEMENTARY_STATUS_LABEL: Record<SupplementaryStatus, string> = {
  draft: 'Draft',
  in_progress: 'In progress',
  ready: 'Results ready',
  published: 'Results published',
};
