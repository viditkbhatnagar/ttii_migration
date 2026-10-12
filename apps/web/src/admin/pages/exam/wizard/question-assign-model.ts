// Step 4 (Assign Questions) — pure grouping, auto-fill and shortfall logic.
//
// Picks real question_bank rows for the exam and writes exam_questions — the
// link the student player + availability check require (Naji 2026-06-09).
//
// Risha UAT 2026-08-06 — "This part doesn't have a clarity. Which subject, how
// many questions in each subject. How to choose in bulk are all a concern now."
// The picker is one collapsible section per scheduled subject, in Step 2
// order, each carrying its own selected/target and marks/total plus bulk
// actions. Questions from subjects this exam does not sit stay in their own
// collapsed section rather than being mixed in silently.

import { asBoolean, asNumber, asString } from '../../../shared/utils/admin-data-utils.js';

export interface QuestionOption {
  id: number;
  title: string;
  subject_id: number | null;
  subject_title: string;
  /** Links the question to a Step 2 row; null when its subject isn't scheduled. */
  exam_subject_id: number | null;
  /** question_bank.q_type — 0 = MCQ, 1 = Descriptive. */
  q_type: number;
  in_scheduled_subject: boolean;
}

// One scheduled subject's plan, from getExamQuestionPlan (Step 2 + Step 3).
export interface SubjectPlan {
  exam_subject_id: number;
  subject_id: number | null;
  subject_title: string;
  mcq_target: number;
  descriptive_target: number;
  total_target: number;
  total_marks: number;
  mcq_marks_each: number;
  mcq_negative_marks: number;
}

export interface QuestionSection {
  key: string;
  title: string;
  /** null for a legacy exam with no Step 2 schedule, and for the stray bucket. */
  plan: SubjectPlan | null;
  /** True only for the "not in this exam's schedule" bucket. */
  unscheduled: boolean;
  items: QuestionOption[];
}

export const UNSCHEDULED_SECTION_KEY = 'not-scheduled';

// The mark an auto-filled question gets when its subject has no Step 3
// marks_each to inherit. Same value the Default mark box starts on, so the two
// can never silently disagree.
export const DEFAULT_QUESTION_MARK = 1;

const nullableId = (v: unknown): number | null => (v === null || v === undefined ? null : asNumber(v));

export function toQuestionOption(o: Record<string, unknown>): QuestionOption {
  return {
    id: asNumber(o.id),
    title: asString(o.title),
    subject_id: nullableId(o.subject_id),
    subject_title: asString(o.subject_title),
    exam_subject_id: nullableId(o.exam_subject_id),
    q_type: asNumber(o.q_type),
    in_scheduled_subject: asBoolean(o.in_scheduled_subject),
  };
}

export function toSubjectPlan(p: Record<string, unknown>): SubjectPlan {
  return {
    exam_subject_id: asNumber(p.exam_subject_id),
    subject_id: nullableId(p.subject_id),
    subject_title: asString(p.subject_title),
    mcq_target: asNumber(p.mcq_target),
    descriptive_target: asNumber(p.descriptive_target),
    total_target: asNumber(p.total_target),
    total_marks: asNumber(p.total_marks),
    mcq_marks_each: asNumber(p.mcq_marks_each),
    mcq_negative_marks: asNumber(p.mcq_negative_marks),
  };
}

// Risha UAT 2026-08-06 — Step 3 already records how many MCQ / descriptive
// questions each subject wants, so Step 4 fills itself from that plan. Manual
// ticking is untouched: the auto-fill only seeds the selection in the browser,
// and nothing reaches exam_questions until Save.
//
// Grouping the bank into Step 2 sittings is needed by the picker, by the
// first-open auto-fill, by Step 3's bank chips and by the Review dialog, so it
// is one pure function.
export function buildSections(options: QuestionOption[], plans: SubjectPlan[]): QuestionSection[] {
  if (plans.length === 0) {
    // No plan came back. `in_scheduled_subject` still tells us whether the
    // exam has a schedule at all, so the stray bucket stays meaningful.
    const anyScheduled = options.some((o) => o.in_scheduled_subject);
    const bySubject = new Map<string, QuestionSection>();
    const strays: QuestionOption[] = [];
    for (const o of options) {
      if (anyScheduled && !o.in_scheduled_subject) { strays.push(o); continue; }
      const key = `subject-${o.subject_id ?? 'none'}`;
      const existing = bySubject.get(key);
      if (existing) { existing.items.push(o); continue; }
      bySubject.set(key, {
        key,
        title: o.subject_title || (o.subject_id === null ? 'No subject' : `Subject #${o.subject_id}`),
        plan: null,
        unscheduled: false,
        items: [o],
      });
    }
    const flat = [...bySubject.values()];
    if (strays.length > 0) {
      flat.push({ key: UNSCHEDULED_SECTION_KEY, title: "Not in this exam's schedule", plan: null, unscheduled: true, items: strays });
    }
    return flat;
  }

  const claimed = new Set<number>();
  const out: QuestionSection[] = [];
  for (const p of plans) {
    const items = options.filter((o) => {
      if (claimed.has(o.id)) return false;
      // exam_subject_id is the exact link; subject_id is the fallback for a
      // row the backend could not resolve to a single Step 2 sitting.
      if (o.exam_subject_id !== null) return o.exam_subject_id === p.exam_subject_id;
      return p.subject_id !== null && o.subject_id === p.subject_id;
    });
    for (const o of items) claimed.add(o.id);
    out.push({
      key: `plan-${p.exam_subject_id}`,
      title: p.subject_title || `Subject #${p.subject_id ?? p.exam_subject_id}`,
      plan: p,
      unscheduled: false,
      items,
    });
  }
  const strays = options.filter((o) => !claimed.has(o.id));
  if (strays.length > 0) {
    out.push({ key: UNSCHEDULED_SECTION_KEY, title: "Not in this exam's schedule", plan: null, unscheduled: true, items: strays });
  }
  return out;
}

/** MCQ / descriptive counts in a section's bank (q_type 1 = descriptive, anything else MCQ). */
export function bankCounts(items: QuestionOption[]): { mcq: number; descriptive: number } {
  let descriptive = 0;
  for (const o of items) if (o.q_type === 1) descriptive += 1;
  return { mcq: items.length - descriptive, descriptive };
}

/** One "asked for vs. actually in the bank" line of a subject's fill. */
export interface PickPart { label: string; wanted: number; got: number }

export interface SubjectPick {
  /** Bank question ids, in the order they should be numbered. */
  ids: number[];
  /** The mark each picked question gets — the subject's Step 3 marks_each. */
  mark: number;
  parts: PickPart[];
}

// What the plan asks for, and what the bank can actually supply.
//
// The pick is DELIBERATELY deterministic — the first N of the subject's bank
// rows in the order listExamQuestionOptions returned them (the backend orders
// by subject then id). It is not randomised, because exam.shuffle_questions
// already randomises the order per student at attempt time, and a random pick
// would make two auto-fills of the same exam produce two different papers —
// impossible for an admin to review, re-verify or explain to a student.
export function planPickFor(s: QuestionSection, fallbackMark: number): SubjectPick {
  const plan = s.plan;
  const mark = plan && plan.mcq_marks_each > 0 ? plan.mcq_marks_each : fallbackMark;
  if (!plan) return { ids: [], mark, parts: [] };
  const mcqWanted = Math.max(0, plan.mcq_target);
  const descWanted = Math.max(0, plan.descriptive_target);
  // An older exam whose Step 3 setup names neither type still has a total to
  // honour; fill it in bank order rather than refusing to fill at all.
  if (mcqWanted === 0 && descWanted === 0) {
    const wanted = Math.max(0, plan.total_target);
    const take = s.items.slice(0, wanted);
    return { ids: take.map((o) => o.id), mark, parts: [{ label: 'question', wanted, got: take.length }] };
  }
  const mcqs = s.items.filter((o) => o.q_type !== 1).slice(0, mcqWanted);
  const descs = s.items.filter((o) => o.q_type === 1).slice(0, descWanted);
  return {
    ids: [...mcqs, ...descs].map((o) => o.id),
    mark,
    parts: [
      { label: 'MCQ', wanted: mcqWanted, got: mcqs.length },
      { label: 'descriptive', wanted: descWanted, got: descs.length },
    ],
  };
}

/** Questions the plan asked for that the bank could not supply. */
export function missingIn(pick: SubjectPick): number {
  return pick.parts.reduce((n, p) => n + Math.max(0, p.wanted - p.got), 0);
}

/** "42 of 70 MCQ · 5 of 5 descriptive" — only the types the plan asked for. */
export function describeParts(parts: PickPart[]): string {
  return parts.filter((p) => p.wanted > 0).map((p) => `${p.got} of ${p.wanted} ${p.label}`).join(' · ');
}

// Whole-exam fill. Sections are walked in Step 2 order and each subject's
// questions are inserted together, so the Map's insertion order — which is
// what becomes question_no — reads subject 1, then subject 2, then subject 3.
// Subjects with no Step 3 plan (and the stray bucket) are never auto-filled;
// picking those is always a deliberate act.
export function autoFillSelection(
  sections: QuestionSection[],
  fallbackMark: number,
): { selection: Map<number, number>; picked: number; shortfall: number } {
  const selection = new Map<number, number>();
  let shortfall = 0;
  for (const s of sections) {
    if (!s.plan) continue;
    const pick = planPickFor(s, fallbackMark);
    for (const id of pick.ids) selection.set(id, pick.mark);
    shortfall += missingIn(pick);
  }
  return { selection, picked: selection.size, shortfall };
}

// question_no comes out of the selection Map's insertion order, so every
// membership change re-lays it in Step 2 order. Without this, a subject
// auto-filled or ticked second would number its questions after subject 3's.
export function orderBySections(sections: QuestionSection[], next: Map<number, number>): Map<number, number> {
  const out = new Map<number, number>();
  for (const s of sections) {
    for (const o of s.items) {
      const mark = next.get(o.id);
      if (mark !== undefined) out.set(o.id, mark);
    }
  }
  // A question already assigned but no longer in the bank listing keeps its
  // place at the end rather than being dropped behind the admin's back.
  for (const [id, mark] of next) if (!out.has(id)) out.set(id, mark);
  return out;
}

/** How many of a section's questions are selected, and their marks. */
export function sectionStats(s: QuestionSection, selected: Map<number, number>): { count: number; marks: number } {
  let count = 0;
  let marks = 0;
  for (const o of s.items) {
    const m = selected.get(o.id);
    if (m === undefined) continue;
    count += 1;
    if (Number.isFinite(m)) marks += m;
  }
  return { count, marks };
}
