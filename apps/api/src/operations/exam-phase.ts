// Where an exam is in its life (TTII 2026-10-12, Exams list in Naji's design):
// Draft → Upcoming → In progress → Completed.
//
// Decided from the real IST instants of its sittings, never from bare dates on
// the server clock: listAdminExams compared YYYY-MM-DD strings built with the
// server's (UTC) getters, so between 00:00 and 05:30 IST an exam starting that
// day still counted as Upcoming.

export type ExamPhase = 'draft' | 'upcoming' | 'in_progress' | 'completed';

/**
 * TTII 2026-10-16 — false for a subject sitting of an exam that is still a
 * draft. Publishing creates a regular exam's sittings already published, so
 * the only draft sittings are a supplementary exam's, created up front with
 * their own students; until the admin publishes the exam no student may see
 * them (they would show as a "closed" card), and calendars show the exam as
 * the one draft it is. Every other row passes.
 */
export function isNotDraftSitting(exam: { parent_exam_id?: number | null; status?: string | null }): boolean {
  return exam.parent_exam_id === null || exam.parent_exam_id === undefined || exam.status === 'published';
}

export interface SittingWindow {
  /** When the sitting opens, or null if it has no start. */
  openMs: number | null;
  /** When it closes, or null if it never closes. */
  closeMs: number | null;
}

export function examPhase(status: string | null | undefined, sittings: SittingWindow[], nowMs: number): ExamPhase {
  if (status !== 'published') return 'draft';
  if (sittings.length === 0) return 'in_progress';
  const opens = sittings.map((s) => s.openMs);
  const closes = sittings.map((s) => s.closeMs);
  const firstOpen = opens.some((o) => o === null) ? null : Math.min(...(opens as number[]));
  const lastClose = closes.some((c) => c === null) ? null : Math.max(...(closes as number[]));
  if (firstOpen !== null && nowMs < firstOpen) return 'upcoming';
  if (lastClose !== null && nowMs > lastClose) return 'completed';
  return 'in_progress';
}
