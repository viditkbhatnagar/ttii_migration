import { asNumber, asString } from '../../shared/utils/admin-data-utils.js';

// Exam → Re-Examination view model (TTII 2026-10-09); mirrors ReExamListRow
// from the API's re-exam-service.

export type ReExamState = 'upcoming' | 'open' | 'in_progress' | 'completed' | 'missed' | 'cancelled' | 'superseded';

export interface ReExamRow {
  id: number;
  examId: number;
  parentExamId: number | null;
  examTitle: string;
  examCode: string;
  subjectTitle: string;
  userId: number;
  studentName: string;
  studentCode: string;
  date: string;
  startTime: string;
  endTime: string;
  notes: string;
  state: ReExamState;
  totalMarks: number;
  passMarks: number | null;
  previousScore: number | null;
  newScore: number | null;
  result: 'pass' | 'fail' | '';
  scheduledAt: string | null;
  scheduledBy: string;
}

const STATES: ReExamState[] = ['upcoming', 'open', 'in_progress', 'completed', 'missed', 'cancelled', 'superseded'];

function numOrNull(value: unknown): number | null {
  return value === null || value === undefined || value === '' ? null : asNumber(value);
}

export function toReExamRows(raw: unknown[]): ReExamRow[] {
  return raw.map((v) => {
    const r = v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
    const state = asString(r.state) as ReExamState;
    const result = asString(r.result);
    return {
      id: asNumber(r.id),
      examId: asNumber(r.examId),
      parentExamId: numOrNull(r.parentExamId),
      examTitle: asString(r.examTitle),
      examCode: asString(r.examCode),
      subjectTitle: asString(r.subjectTitle),
      userId: asNumber(r.userId),
      studentName: asString(r.studentName),
      studentCode: asString(r.studentCode),
      date: asString(r.date),
      startTime: asString(r.startTime),
      endTime: asString(r.endTime),
      notes: asString(r.notes),
      state: STATES.includes(state) ? state : 'upcoming',
      totalMarks: asNumber(r.totalMarks),
      passMarks: numOrNull(r.passMarks),
      previousScore: numOrNull(r.previousScore),
      newScore: numOrNull(r.newScore),
      result: result === 'pass' || result === 'fail' ? result : '',
      scheduledAt: asString(r.scheduledAt) || null,
      scheduledBy: asString(r.scheduledBy),
    };
  });
}

export const STATE_LABEL: Record<ReExamState, string> = {
  upcoming: 'Upcoming',
  open: 'Open now',
  in_progress: 'In progress',
  completed: 'Completed',
  missed: 'Missed',
  cancelled: 'Cancelled',
  superseded: 'Replaced',
};

/** A re-exam can still be moved or cancelled until the student starts it. */
export function isChangeable(state: ReExamState): boolean {
  return state === 'upcoming' || state === 'open' || state === 'missed';
}
