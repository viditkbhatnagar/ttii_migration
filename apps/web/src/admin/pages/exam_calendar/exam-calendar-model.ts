import { asNumber, asString } from '../../shared/utils/admin-data-utils.js';
import type { ExamPhase } from '../exam/exam-list-model.js';

// Exam Calendar view model (TTII 2026-10-12). All dates are YYYY-MM-DD strings
// built from LOCAL date parts — never toISOString(), which turns IST midnight
// into the previous UTC day (the global calendar lost every month's last day).

export interface CalendarItem {
  key: string;
  kind: 'sitting' | 'draft' | 'reexam';
  examId: number;
  title: string;
  subject: string;
  courses: string[];
  courseIds: number[];
  fromDate: string;
  toDate: string;
  startTime: string;
  endTime: string;
  status: ExamPhase;
  students: number;
}

export function localYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** First and last day of a month as YYYY-MM-DD (month is 0-based). */
export function monthRange(year: number, month: number): { from: string; to: string } {
  return { from: localYmd(new Date(year, month, 1)), to: localYmd(new Date(year, month + 1, 0)) };
}

/** The month grid, Sunday first: null pads before the 1st and after the last day. */
export function monthCells(year: number, month: number): Array<string | null> {
  const cells: Array<string | null> = [];
  const lead = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(localYmd(new Date(year, month, d)));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** Items whose date span covers the day — a multi-day window shows on every day. */
export function itemsOnDay(items: CalendarItem[], day: string): CalendarItem[] {
  return items.filter((i) => i.fromDate !== '' && i.fromDate <= day && day <= (i.toDate || i.fromDate));
}

const PHASES: ExamPhase[] = ['draft', 'upcoming', 'in_progress', 'completed'];

export function toCalendarItems(raw: unknown[]): CalendarItem[] {
  return raw.map((v) => {
    const r = v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
    const kind = asString(r.kind);
    const status = asString(r.status) as ExamPhase;
    return {
      key: asString(r.key),
      kind: kind === 'draft' || kind === 'reexam' ? kind : 'sitting',
      examId: asNumber(r.examId),
      title: asString(r.title),
      subject: asString(r.subject),
      courses: Array.isArray(r.courses) ? r.courses.map((c) => asString(c)).filter(Boolean) : [],
      courseIds: Array.isArray(r.courseIds) ? r.courseIds.map((c) => asNumber(c)) : [],
      fromDate: asString(r.fromDate),
      toDate: asString(r.toDate),
      startTime: asString(r.startTime),
      endTime: asString(r.endTime),
      status: PHASES.includes(status) ? status : 'upcoming',
      students: asNumber(r.students),
    };
  });
}
