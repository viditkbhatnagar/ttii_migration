// Create / Edit Exam wizard — pure state, parsing and validation (no React).
//
// Naji 2026-05-09 — Exam Creation wizard. Six steps:
//   1) Add Exam (basic info)
//   2) Subject Scheduling
//   3) Question Setup (component plan: counts/marks per subject)
//   4) Assign Questions (pick real questions from the bank -> exam_questions)
//   5) Student Allocation
//   6) Instructions & Notification (Review, then Publish)
// Naji 2026-06-09 — step 4 "Assign Questions": the component step only stores
// planning metadata; the student player serves questions from exam_questions,
// so without it an exam is never takeable. Naji's 2026-10 prototype has five
// steps; ours keeps six for that reason.

import { asNumber, asString } from '../../../shared/utils/admin-data-utils.js';

export type WizardStepId = 1 | 2 | 3 | 4 | 5 | 6;

export const WIZARD_STEPS: ReadonlyArray<{ id: WizardStepId; label: string }> = [
  { id: 1, label: 'Add Exam' },
  { id: 2, label: 'Subject Scheduling' },
  { id: 3, label: 'Question Setup' },
  { id: 4, label: 'Assign Questions' },
  { id: 5, label: 'Student Allocation' },
  { id: 6, label: 'Instructions & Notification' },
];

export interface DraftState {
  id: string;
  exam_code: string;
  title: string;
  course_ids: string[];
  offering_ids: string[];
  from_date: string;
  to_date: string;
  from_time: string;
  to_time: string;
  duration_minutes: number;
  // Risha UAT 2026-05-27 — per-exam toggle. ON randomizes question
  // order for every student attempting the exam.
  shuffle_questions: boolean;
}

export const emptyDraft: DraftState = {
  id: '',
  exam_code: '',
  title: '',
  course_ids: [],
  offering_ids: [],
  from_date: '',
  to_date: '',
  from_time: '',
  to_time: '',
  duration_minutes: 0,
  shuffle_questions: false,
};

// Step 6 state that lives on the exam row rather than in the wizard draft.
// Risha UAT 2026-08-06 — "Despite of giving instructions before, still
// invisible when opened for editing. It was saved before." PublishStep used to
// start with an empty textarea and publishing wrote that empty string back.
export interface DraftMeta {
  instructions: string;
  notify_email: boolean;
  notify_inapp: boolean;
  status: string;
  is_published: boolean;
  /** Subject sittings already materialised by a previous publish. */
  child_count: number;
}

export const emptyMeta: DraftMeta = {
  instructions: '',
  notify_email: true,
  notify_inapp: true,
  status: 'draft',
  is_published: false,
  child_count: 0,
};

// The shared dd/mm/yyyy field defaults its year dropdown to a date-of-birth
// window (100 years back, nothing in the future). Exam dates are near-future.
export const EXAM_YEAR_MIN = new Date().getFullYear() - 1;
export const EXAM_YEAR_MAX = new Date().getFullYear() + 5;

/** HH:MM out of the API's `1970-01-01T09:30:00.000Z` time strings ('' otherwise). */
export function extractTime(raw: string): string {
  if (!raw) return '';
  const m = raw.match(/T(\d{2}:\d{2})/);
  if (m) return m[1] ?? '';
  // fallback: ISO date-only or empty
  return '';
}

/**
 * Risha UAT 2026-05-27 — the shuffle flag arrives as boolean / 1 / "1" /
 * "true" depending on the legacy MySQL driver.
 */
export function parseFlag(v: unknown): boolean {
  return v === true || v === 1 || v === '1' || v === 'true';
}

/** Whole minutes from (fromDate fromTime) to (toDate toTime); null when unparseable. */
export function minutesBetween(fromDate: string, fromTime: string, toDate: string, toTime: string): number | null {
  if (!fromDate || !toDate || !fromTime || !toTime) return null;
  const start = new Date(`${fromDate}T${fromTime}:00`);
  const end = new Date(`${toDate}T${toTime}:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

export function validateStep1(draft: DraftState): string | null {
  if (!draft.title.trim()) return 'Exam title is required.';
  if (draft.course_ids.length === 0) return 'Pick at least one course.';
  if (!draft.from_date || !draft.to_date) return 'Start and end date are required.';
  if (!draft.from_time || !draft.to_time) return 'Start and end time are required.';
  if (draft.duration_minutes <= 0) return 'End time must be after start time.';
  return null;
}

/** "1 h 30 min" / "45 min" — '' for zero. */
export function formatMinutes(total: number): string {
  if (!Number.isFinite(total) || total <= 0) return '';
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

// ─── Step 2: Subject Scheduling ────────────────────────────────────

export interface ScheduleRow {
  id?: number;
  subject_id: number | null;
  subject_title: string;
  course_ids: string;
  available_courses: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  total_marks: number;
  pass_marks: number;
}

/** Step 1's window, which Step 2 defaults to and validates against. */
export interface ExamWindow {
  from_date: string;
  to_date: string;
  from_time: string;
  to_time: string;
}

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;
// A window longer than this is a typo; don't build a giant day list for it.
const MAX_WINDOW_DAYS = 366;

/** Every YYYY-MM-DD from `from` to `to` inclusive — built in UTC so no timezone can shift a day. */
export function windowDays(from: string, to: string): string[] {
  const a = YMD.exec(from);
  const b = YMD.exec(to);
  if (!a || !b) return [];
  const start = Date.UTC(Number(a[1]), Number(a[2]) - 1, Number(a[3]));
  const end = Date.UTC(Number(b[1]), Number(b[2]) - 1, Number(b[3]));
  if (end < start) return [];
  const out: string[] = [];
  for (let t = start; t <= end && out.length < MAX_WINDOW_DAYS; t += 86_400_000) {
    const d = new Date(t);
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`);
  }
  return out;
}

export function rowDuration(date: string, start: string, end: string): number | null {
  return minutesBetween(date, start, date, end);
}

/**
 * A Step 2 row for a subject that has no saved sitting yet. Naji's design
 * starts each subject on the next day of the Step 1 window (the last day once
 * the window runs out) at the Step 1 session times, so the timetable is
 * filled rather than blank. Times are only copied when they make a same-day
 * session (a window that ends earlier in the day than it starts does not).
 */
export function suggestedScheduleRow(
  s: { subject_id: number; subject_title: string; course_ids: string; available_courses: string },
  index: number,
  window: ExamWindow,
): ScheduleRow {
  const days = windowDays(window.from_date, window.to_date);
  const date = days.length > 0 ? (days[Math.min(index, days.length - 1)] ?? '') : '';
  const sameDay = window.from_time && window.to_time && window.to_time > window.from_time;
  const start = sameDay ? window.from_time : '';
  const end = sameDay ? window.to_time : '';
  const duration = date && start && end ? (rowDuration(date, start, end) ?? 0) : 0;
  return {
    subject_id: s.subject_id,
    subject_title: s.subject_title,
    course_ids: s.course_ids,
    available_courses: s.available_courses,
    exam_date: date,
    start_time: start,
    end_time: end,
    duration_minutes: duration,
    total_marks: 100,
    pass_marks: 40,
  };
}

/** Applies a patch and recomputes the duration when the date or a time changed. */
export function patchScheduleRow(row: ScheduleRow, patch: Partial<ScheduleRow>): ScheduleRow {
  const next = { ...row, ...patch };
  if (patch.exam_date !== undefined || patch.start_time !== undefined || patch.end_time !== undefined) {
    if (next.exam_date && next.start_time && next.end_time) {
      const d = rowDuration(next.exam_date, next.start_time, next.end_time);
      if (d !== null) next.duration_minutes = d;
    }
  }
  return next;
}

/**
 * Client-side checks from Naji's design: a sitting must fall inside the exam
 * window, end after it starts, and cannot need more marks to pass than it
 * has. A blank date/time is allowed here (publish refuses it, naming the
 * subjects), so a half-built timetable can still be saved.
 */
export function scheduleRowErrors(row: ScheduleRow, window: ExamWindow): string[] {
  const errs: string[] = [];
  const hasWindow = YMD.test(window.from_date) && YMD.test(window.to_date);
  if (row.exam_date && hasWindow && (row.exam_date < window.from_date || row.exam_date > window.to_date)) {
    errs.push('Date is outside the exam window.');
  }
  if (row.start_time && row.end_time && row.end_time <= row.start_time) {
    errs.push('End time must be after start time.');
  }
  if (row.pass_marks > row.total_marks) {
    errs.push('Pass marks cannot exceed total marks.');
  }
  return errs;
}

/** The first problem across the timetable, phrased for a toast; null when clean. */
export function firstScheduleError(rows: ScheduleRow[], window: ExamWindow): string | null {
  for (const r of rows) {
    const errs = scheduleRowErrors(r, window);
    if (errs.length > 0) return `${r.subject_title}: ${errs[0]}`;
  }
  return null;
}

/** A saved Step 2 row from GET /admin/exam/draft/schedule. */
export function toScheduleRow(r: Record<string, unknown>): ScheduleRow {
  return {
    id: asNumber(r.id),
    subject_id: r.subject_id ? asNumber(r.subject_id) : null,
    subject_title: asString(r.subject_title),
    course_ids: asString(r.course_ids),
    available_courses: asString(r.available_courses),
    exam_date: asString(r.exam_date).slice(0, 10),
    start_time: extractTime(asString(r.start_time)),
    end_time: extractTime(asString(r.end_time)),
    duration_minutes: asNumber(r.duration_minutes),
    total_marks: asNumber(r.total_marks),
    pass_marks: asNumber(r.pass_marks),
  };
}

// ─── Step 5: Student Allocation ────────────────────────────────────

export interface EligibleStudent {
  user_id: number;
  student_id: string;
  name: string;
  email: string;
  courses: string;
}

export function filterStudents(students: EligibleStudent[], search: string): EligibleStudent[] {
  if (!search) return students;
  const q = search.toLowerCase();
  return students.filter((s) => s.name.toLowerCase().includes(q)
    || s.email.toLowerCase().includes(q)
    || s.student_id.toLowerCase().includes(q)
    || s.courses.toLowerCase().includes(q));
}

/** Naji's design: an exam needs at least one student before moving on to publish. */
export function allocationError(pickedCount: number): string | null {
  return pickedCount > 0 ? null : 'Add at least one student to this exam before continuing.';
}
