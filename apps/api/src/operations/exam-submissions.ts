import {
  AUTO_SUBMIT_GRACE_MS,
  LATE_SUBMIT_GRACE_MS,
  examEffectiveEndMs,
  examWindowCloseInstant,
  examWindowOpenInstant,
  type ExamWindowRow,
} from '../assessment/assessment-service.js';

// Exam → Exam Submissions (TTII 2026-10-12, Naji's ExamSubmissionsModule) —
// the PURE classifier. One call decides where one student stands on one
// sitting (or on one re-exam of it) from rows already loaded, so every rule
// below is pinned by tests without a database.
//
//   Scheduled       allocated; the window has not opened, or is open and the
//                   student has not started.
//   In progress     the NEWEST paper is unsubmitted AND its own deadline
//                   (examEffectiveEndMs) plus the server's auto-submit grace has
//                   not passed. An unsubmitted paper alone is not "in
//                   progress": production holds 39 open attempts from March
//                   2025 onwards that nobody will ever finish.
//   Submitted       a submitted paper.
//   Auto submitted  a submitted paper the evidence says the student did not
//                   submit by hand — a HEURISTIC, labelled as one (below).
//   Missed          the window (or the paper's own deadline) is over with no
//                   submitted paper and no re-exam still to come.
//   Re-exam pending the original sitting was missed but a re-exam for it is
//                   still scheduled or running, so the student is not "missed"
//                   yet — the re-exam row carries the live status.
//
// Auto-submit heuristic. finalizeExamAttempt stamps end_time = the moment the
// paper was finalised and time_taken = (finalise time clamped to the deadline)
// − start. So for a paper the student submitted on time, start + time_taken ≈
// end_time. Then:
//   gap = end_time − (start_time + time_taken)
//   gap > LATE_SUBMIT_GRACE_MS (90s)            → finalised by the server after
//                                                  the deadline (the sweep, or a
//                                                  late request graded from the
//                                                  autosave): "Auto submitted (server)"
//   start + time_taken ≥ deadline − 10s         → ran to the deadline — the
//                                                  player's own time-up submit:
//                                                  "Auto submitted (time up)"
//   otherwise                                   → Submitted
// Before 2026-08-11 none of that machinery existed, so older papers are
// always plain Submitted.

export type SubmissionStatus = 'scheduled' | 'in_progress' | 'submitted' | 'auto_submitted' | 'missed' | 'reexam_pending';
export type AutoSubmitKind = 'server' | 'time_up';
export type MissedReason = 'never_opened' | 'nothing_answered' | 'not_submitted';
export type Activity = 'active' | 'idle';
export type EvaluationState = 'none' | 'auto' | 'pending' | 'evaluated';
export type ResultState = 'not_published' | 'pending' | 'pass' | 'fail' | 'marks_only' | 'absent';

/** A heartbeat this recent means the student is working right now. */
export const ACTIVE_HEARTBEAT_MS = 60 * 1000;
/** A paper finishing this close to its deadline ran out of time. */
export const TIME_UP_TOLERANCE_MS = 10 * 1000;
/** 2026-08-11 00:00 IST: autosave, late-submit grading and auto-submit shipped. */
export const AUTO_SUBMIT_TRACKED_FROM_MS = Date.UTC(2026, 7, 10, 18, 30);

/** One exam_attempt row that is a real paper of this sitting (quiz rows already dropped). */
export interface SubmissionAttempt {
  id: number;
  createdAt: Date | null;
  startTime: Date | null;
  endTime: Date | null;
  /** exam_attempt.time_taken as seconds (a @db.Time read with UTC getters). */
  timeTakenSeconds: number | null;
  submitted: boolean;
  /** Questions issued (exam_attempt.question_no). */
  questionCount: number;
  /** Questions left blank (exam_attempt.skip). */
  skipped: number;
  /** Answered entries in the autosaved draft (countDraftAnswered). */
  draftAnswered: number;
  lastSeenAt: Date | null;
}

export interface ClassifyInput {
  /** The window this row is judged by — the re-exam's for a re-exam row. */
  window: ExamWindowRow;
  /** The papers that belong to this row (regular or re-exam bucket). */
  attempts: SubmissionAttempt[];
  /** A re-exam for this sitting is still scheduled or running (regular rows only). */
  reExamPending: boolean;
  nowMs: number;
}

export interface Classification {
  status: SubmissionStatus;
  autoKind: AutoSubmitKind | null;
  missedReason: MissedReason | null;
  activity: Activity | null;
  /** The paper this row reports on, if any. */
  attempt: SubmissionAttempt | null;
  answered: number | null;
  questionCount: number | null;
  /** The paper's own deadline (start + duration, capped at the window close). */
  deadlineMs: number | null;
  openMs: number | null;
  closeMs: number | null;
}

/** HH:MM:SS from a @db.Time column, as seconds. */
export function timeOfDaySeconds(value: Date | null | undefined): number | null {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return null;
  return value.getUTCHours() * 3600 + value.getUTCMinutes() * 60 + value.getUTCSeconds();
}

/** True when an answer (string[], JSON string or scalar) holds anything non-blank. */
export function answerHasWork(answer: unknown): boolean {
  if (Array.isArray(answer)) return answer.some((v) => answerHasWork(v));
  if (answer === null || answer === undefined) return false;
  if (typeof answer === 'string') {
    const text = answer.trim();
    if (text === '') return false;
    if (text.startsWith('[')) {
      try {
        const parsed = JSON.parse(text) as unknown;
        if (Array.isArray(parsed)) return answerHasWork(parsed);
      } catch {
        return true;
      }
    }
    return true;
  }
  if (typeof answer === 'number' || typeof answer === 'boolean') return true;
  return false;
}

/**
 * Questions answered in an autosaved draft. Reads both shapes the column holds
 * — the plain [{ question_id, answer }] array and the { writer, answers }
 * envelope — and the { question_id: answer } map. Rows are per QUESTION, blanks
 * included (the player emits one per question), so only non-blank answers
 * count. Later rows for the same question win, as in the scorer.
 */
export function countDraftAnswered(raw: string | null | undefined): number {
  const text = (raw ?? '').trim();
  if (text === '') return 0;
  let doc: unknown;
  try {
    doc = JSON.parse(text);
  } catch {
    return 0;
  }
  const isEnvelope = typeof doc === 'object' && doc !== null && !Array.isArray(doc)
    && Array.isArray((doc as Record<string, unknown>).answers);
  const value = isEnvelope ? (doc as { answers: unknown[] }).answers : doc;
  const byQuestion = new Map<string, boolean>();
  if (Array.isArray(value)) {
    for (const row of value) {
      if (!row || typeof row !== 'object') continue;
      const rec = row as Record<string, unknown>;
      const raw = rec.question_id;
      const id = typeof raw === 'string' || typeof raw === 'number' ? String(raw).trim() : '';
      if (id !== '') byQuestion.set(id, answerHasWork(rec.answer));
    }
  } else if (value && typeof value === 'object') {
    for (const [id, answer] of Object.entries(value as Record<string, unknown>)) {
      if (id.trim() !== '') byQuestion.set(id.trim(), answerHasWork(answer));
    }
  }
  return [...byQuestion.values()].filter(Boolean).length;
}

function newestFirst(attempts: SubmissionAttempt[]): SubmissionAttempt[] {
  return [...attempts].sort((a, b) => b.id - a.id);
}

/** How a submitted paper ended. Null kind = submitted by the student. */
export function autoSubmitKind(window: ExamWindowRow, attempt: SubmissionAttempt): AutoSubmitKind | null {
  const startedMs = attempt.startTime?.getTime() ?? null;
  const createdMs = attempt.createdAt?.getTime() ?? startedMs;
  if (createdMs === null || createdMs < AUTO_SUBMIT_TRACKED_FROM_MS) return null;
  if (startedMs === null || attempt.timeTakenSeconds === null || !attempt.endTime) return null;
  const finishedMs = startedMs + attempt.timeTakenSeconds * 1000;
  if (attempt.endTime.getTime() - finishedMs > LATE_SUBMIT_GRACE_MS) return 'server';
  const deadlineMs = examEffectiveEndMs(window, attempt.startTime);
  if (deadlineMs !== null && finishedMs >= deadlineMs - TIME_UP_TOLERANCE_MS) return 'time_up';
  return null;
}

export function classifySubmission(input: ClassifyInput): Classification {
  const { window, nowMs } = input;
  const openMs = examWindowOpenInstant(window)?.getTime() ?? null;
  const closeMs = examWindowCloseInstant(window)?.getTime() ?? null;
  const papers = newestFirst(input.attempts);
  const newest = papers[0] ?? null;
  const base = { openMs, closeMs, autoKind: null, missedReason: null, activity: null } as const;

  // 1. The newest paper is still running.
  if (newest && !newest.submitted) {
    const deadlineMs = examEffectiveEndMs(window, newest.startTime);
    if (deadlineMs === null || nowMs <= deadlineMs + AUTO_SUBMIT_GRACE_MS) {
      const seen = newest.lastSeenAt?.getTime() ?? null;
      return {
        ...base,
        status: 'in_progress',
        activity: seen !== null && nowMs - seen <= ACTIVE_HEARTBEAT_MS ? 'active' : 'idle',
        attempt: newest,
        answered: newest.draftAnswered,
        questionCount: newest.questionCount,
        deadlineMs,
      };
    }
  }

  // 2. A submitted paper — the newest one counts.
  const paper = papers.find((p) => p.submitted) ?? null;
  if (paper) {
    const kind = autoSubmitKind(window, paper);
    return {
      ...base,
      status: kind ? 'auto_submitted' : 'submitted',
      autoKind: kind,
      attempt: paper,
      answered: Math.max(0, paper.questionCount - paper.skipped),
      questionCount: paper.questionCount,
      deadlineMs: examEffectiveEndMs(window, paper.startTime),
    };
  }

  // 3. Opened but never submitted, and its own time is over.
  if (newest) {
    const deadlineMs = examEffectiveEndMs(window, newest.startTime);
    return {
      ...base,
      status: input.reExamPending ? 'reexam_pending' : 'missed',
      missedReason: newest.draftAnswered > 0 ? 'not_submitted' : 'nothing_answered',
      attempt: newest,
      answered: newest.draftAnswered,
      questionCount: newest.questionCount,
      deadlineMs,
    };
  }

  // 4. Never opened.
  const over = closeMs !== null && nowMs > closeMs;
  return {
    ...base,
    status: over ? (input.reExamPending ? 'reexam_pending' : 'missed') : 'scheduled',
    missedReason: over ? 'never_opened' : null,
    attempt: null,
    answered: null,
    questionCount: null,
    deadlineMs: null,
  };
}

/** A re-exam row still to be decided keeps the original sitting from counting as missed. */
export function isPendingStatus(status: SubmissionStatus): boolean {
  return status === 'scheduled' || status === 'in_progress';
}

export function isSubmittedStatus(status: SubmissionStatus): boolean {
  return status === 'submitted' || status === 'auto_submitted';
}

/**
 * Written-answer marking. A paper with no answered descriptive question is
 * fully auto-marked; otherwise it is evaluated once every answered one has a
 * grade in exam_descriptive_grades.
 */
export function evaluationState(status: SubmissionStatus, descriptiveAnswered: number, descriptiveGraded: number): EvaluationState {
  if (!isSubmittedStatus(status)) return 'none';
  if (descriptiveAnswered === 0) return 'auto';
  return descriptiveGraded >= descriptiveAnswered ? 'evaluated' : 'pending';
}

/** Pass / fail only once the exam's results are published; until then nothing is shown as a result. */
export function resultState(
  status: SubmissionStatus,
  score: number | null,
  passMarks: number | null,
  published: boolean,
): ResultState {
  if (!published) return 'not_published';
  if (isSubmittedStatus(status)) {
    if (passMarks === null || score === null) return 'marks_only';
    return score >= passMarks ? 'pass' : 'fail';
  }
  if (status === 'missed') return 'absent';
  return 'pending';
}
