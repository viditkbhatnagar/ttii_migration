// Step 3 (Question Setup) — pure component rows and the per-subject checks.
//
// Risha UAT 2026-08-06 — "gave 70 questions, editing shows 10 again". The
// underlying cause is that re-saving Step 2 renumbered exam_subjects and
// orphaned the saved components (fixed backend-side), but the wizard made it
// unreadable by drawing the hardcoded default 10 as a real value. A row now
// carries `configured`, and an unconfigured row shows its default as a
// placeholder so "not configured" can never be mistaken for "saved as 10".

export type ComponentType = 'mcq' | 'descriptive';

export interface ComponentRow {
  /** Client-side identity — index keys break when a row is removed. */
  uid: string;
  exam_subject_id: number;
  subject_title: string;
  component_type: ComponentType;
  configured: boolean;
  num_questions: number;
  marks_each: number;
  negative_marks: number;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  word_limit: number;
  /** What an unconfigured row saves as — derived from Step 2's total marks. */
  default_questions: number;
}

/** A Step 2 sitting as Step 3 sees it — the subject rail. */
export interface SetupSubject {
  exam_subject_id: number;
  subject_id: number | null;
  subject_title: string;
  total_marks: number;
}

// Fallback when Step 2 carries no marks for the subject to derive from.
export const FALLBACK_QUESTION_COUNT = 10;

/** One question per mark is the only count Step 2 actually implies. */
export function derivedQuestionCount(totalMarks: number): number {
  return totalMarks > 0 ? totalMarks : FALLBACK_QUESTION_COUNT;
}

/** The count a row will actually be saved with. */
export function effectiveCount(r: ComponentRow): number {
  return r.configured ? r.num_questions : r.default_questions;
}

/** The wire shape of components/save — unchanged from the pre-split wizard. */
export function componentsPayload(rows: ComponentRow[]): Array<Record<string, unknown>> {
  return rows.map((r) => ({
    exam_subject_id: r.exam_subject_id,
    component_type: r.component_type,
    num_questions: effectiveCount(r),
    marks_each: r.marks_each,
    negative_marks: r.negative_marks,
    shuffle_questions: r.shuffle_questions ? 1 : 0,
    shuffle_options: r.shuffle_options ? 1 : 0,
    word_limit: r.word_limit,
  }));
}

export interface SubjectSetupSummary {
  mcqCount: number;
  descriptiveCount: number;
  questions: number;
  /** Σ count × marks each, using the count each row will save with. */
  plannedMarks: number;
}

export function summariseSubject(rows: ComponentRow[]): SubjectSetupSummary {
  let mcqCount = 0;
  let descriptiveCount = 0;
  let plannedMarks = 0;
  for (const r of rows) {
    const n = Math.max(0, effectiveCount(r));
    if (r.component_type === 'descriptive') descriptiveCount += n;
    else mcqCount += n;
    plannedMarks += n * (Number.isFinite(r.marks_each) ? r.marks_each : 0);
  }
  return { mcqCount, descriptiveCount, questions: mcqCount + descriptiveCount, plannedMarks: Math.round(plannedMarks * 100) / 100 };
}

export interface SubjectSetupIssues {
  /** Planned marks differ from Step 2's total marks. */
  marksMismatch: string | null;
  /** The bank cannot supply the planned counts (Step 4 will under-fill). */
  bankShort: string[];
}

/**
 * Naji's design checks each subject's paper against the bank and the marks it
 * is worth. Both are reported, neither blocks: Step 4 already fills honestly
 * from a short bank, and the marks check is a confirmation on save because
 * per-question marks can still be adjusted in Step 4.
 */
export function subjectSetupIssues(
  summary: SubjectSetupSummary,
  totalMarks: number,
  bank: { mcq: number; descriptive: number } | null,
): SubjectSetupIssues {
  const marksMismatch = totalMarks > 0 && summary.questions > 0 && summary.plannedMarks !== totalMarks
    ? `Planned marks (${summary.plannedMarks}) don't match the subject's total marks (${totalMarks}) from Step 2.`
    : null;
  const bankShort: string[] = [];
  if (bank) {
    if (summary.mcqCount > bank.mcq) bankShort.push(`Only ${bank.mcq} MCQ question${bank.mcq === 1 ? '' : 's'} in the bank (planned ${summary.mcqCount}).`);
    if (summary.descriptiveCount > bank.descriptive) bankShort.push(`Only ${bank.descriptive} descriptive question${bank.descriptive === 1 ? '' : 's'} in the bank (planned ${summary.descriptiveCount}).`);
  }
  return { marksMismatch, bankShort };
}
