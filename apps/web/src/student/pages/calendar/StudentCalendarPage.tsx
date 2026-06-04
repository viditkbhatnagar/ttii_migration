import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Radio, FileText, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/page-loader';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asString } from '../../../admin/shared/utils/admin-data-utils.js';
import type { StudentPortalApi } from '../../student-portal-api.js';
import type { StudentPageProps } from '../../routing/student-routes.js';

type EventType = 'class' | 'exam' | 'deadline';

interface CalendarEvent {
  date: Date;
  title: string;
  subject: string;
  type: EventType;
  time: string;
}

interface CalendarData {
  assignments: Record<string, unknown>[];
  exams: Record<string, unknown>[];
  liveClasses: Record<string, unknown>[];
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MAX_CHIPS_PER_DAY = 2;

// Soft-tinted pill + dot + agenda-tile styles, one per event type. EduPulse's
// calendar legend reads Class / Exam / Deadline, each in its own hue.
const TYPE_STYLES: Record<EventType, { chip: string; dot: string; pill: string; label: string }> = {
  class: {
    chip: 'bg-sky-100 text-sky-700',
    dot: 'bg-sky-500',
    pill: 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200',
    label: 'Class',
  },
  exam: {
    chip: 'bg-amber-100 text-amber-700',
    dot: 'bg-amber-500',
    pill: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
    label: 'Exam',
  },
  deadline: {
    chip: 'bg-red-100 text-red-700',
    dot: 'bg-red-500',
    pill: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200',
    label: 'Deadline',
  },
};

const TYPE_ICON: Record<EventType, typeof Radio> = {
  class: Radio,
  exam: FileText,
  deadline: ClipboardList,
};

// Assignment/exam rows expose their subject under a few different keys; pull the
// first non-empty one so the agenda can show it as a meta line (live classes use
// the dedicated `subject_title` field handled separately).
const SUBJECT_KEYS = ['subject_title', 'subject_name', 'subject', 'course_title'] as const;

// Backend date fields arrive in several shapes — assignments as `DD-MM-YYYY`,
// exams as `DD/MM/YYYY`, live classes as `YYYY-MM-DD`, plus the occasional ISO
// datetime. `new Date()` mishandles the day-first variants and shifts bare ISO
// dates across the UTC boundary, so parse defensively into a LOCAL-midnight
// Date and return null for anything unrecognized (callers skip those rows).
function parseEventDate(value: unknown): Date | null {
  const raw = asString(value);
  if (!raw) return null;

  // ISO datetime (e.g. "2026-06-15T09:30:00.000Z") — let the engine handle it.
  if (raw.includes('T')) {
    const dt = new Date(raw);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  // Pull the date portion if a space-separated time tags along.
  const datePart = raw.split(' ')[0] ?? raw;
  const match = datePart.match(/^(\d{1,4})[-/](\d{1,2})[-/](\d{1,4})$/);
  if (!match) {
    const fallback = new Date(raw);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }

  const firstSeg = match[1] ?? '';
  const first = Number(firstSeg);
  const middle = Number(match[2]);
  const last = Number(match[3]);
  let year: number;
  let month: number;
  let day: number;

  if (firstSeg.length === 4) {
    // YYYY-MM-DD
    year = first;
    month = middle;
    day = last;
  } else {
    // DD-MM-YYYY or DD/MM/YYYY
    year = last;
    month = middle;
    day = first;
  }

  if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const built = new Date(year, month - 1, day);
  return Number.isNaN(built.getTime()) ? null : built;
}

function pickDate(row: Record<string, unknown>, keys: readonly string[]): Date | null {
  for (const key of keys) {
    const parsed = parseEventDate(row[key]);
    if (parsed) return parsed;
  }
  return null;
}

function pickSubject(row: Record<string, unknown>): string {
  for (const key of SUBJECT_KEYS) {
    const value = asString(row[key]);
    if (value) return value;
  }
  return '';
}

// Live-class `from_time` is "HH:MM:SS"; render a friendly "9:30 AM".
function formatTime(value: unknown): string {
  const raw = asString(value);
  if (!raw) return '';
  const clock = raw.includes('T') ? (raw.split('T')[1] ?? '') : raw;
  const parts = clock.split(':');
  if (parts.length < 2) return '';
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return '';
  const at = new Date();
  at.setHours(hours, minutes, 0, 0);
  return at.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function buildEvents(data: CalendarData): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  for (const row of data.assignments) {
    const date = pickDate(row, ['date', 'due_date', 'end_date']);
    if (!date) continue;
    events.push({
      date,
      title: asString(row.title) || `Assignment ${asString(row.id)}`,
      subject: pickSubject(row),
      type: 'deadline',
      time: '',
    });
  }

  for (const row of data.exams) {
    const date = pickDate(row, ['date', 'start_datetime', 'start_date']);
    if (!date) continue;
    events.push({
      date,
      title: asString(row.title) || `Exam ${asString(row.id)}`,
      subject: pickSubject(row),
      type: 'exam',
      time: '',
    });
  }

  for (const row of data.liveClasses) {
    const date = pickDate(row, ['date']);
    if (!date) continue;
    events.push({
      date,
      title: asString(row.title) || 'Live Class',
      subject: asString(row.subject_title),
      type: 'class',
      time: formatTime(row.from_time),
    });
  }

  return events;
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return dayKey(a) === dayKey(b);
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

async function loadCalendar(api: StudentPortalApi, token: string): Promise<CalendarData> {
  const [assessments, liveClasses] = await Promise.all([
    api.loadAssessments(token),
    api.loadAllLiveClasses(token),
  ]);
  return {
    assignments: [
      ...assessments.assignments.current,
      ...assessments.assignments.upcoming,
      ...assessments.assignments.completed,
    ],
    exams: [
      ...assessments.exams.available,
      ...assessments.exams.upcoming,
      ...assessments.exams.expired,
    ],
    liveClasses,
  };
}

export default function StudentCalendarPage({ api, session }: StudentPageProps) {
  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const [viewMonth, setViewMonth] = useState<Date>(() => startOfMonth(today));
  const [selectedDay, setSelectedDay] = useState<Date>(today);

  const { data, loading, error, reload } = useAdminPageData(
    () => loadCalendar(api, session.token),
    [api, session.token],
  );

  const events = useMemo(() => (data ? buildEvents(data) : []), [data]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const key = dayKey(event.date);
      const bucket = map.get(key);
      if (bucket) bucket.push(event);
      else map.set(key, [event]);
    }
    return map;
  }, [events]);

  const selectedEvents = useMemo(() => {
    const list = eventsByDay.get(dayKey(selectedDay)) ?? [];
    return [...list].sort((a, b) => a.time.localeCompare(b.time));
  }, [eventsByDay, selectedDay]);

  // Build the leading-blank-padded grid of day cells for the viewed month.
  const cells = useMemo<Array<Date | null>>(() => {
    const first = startOfMonth(viewMonth);
    const leadingBlanks = first.getDay();
    const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
    const result: Array<Date | null> = [];
    for (let i = 0; i < leadingBlanks; i += 1) result.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      result.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day));
    }
    return result;
  }, [viewMonth]);

  const monthLabel = viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const selectedIsToday = isSameDay(selectedDay, today);

  const goToMonth = (delta: number) => {
    setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  };

  const jumpToToday = () => {
    setViewMonth(startOfMonth(today));
    setSelectedDay(today);
  };

  if (loading) {
    return <PageLoader label="Loading your calendar..." />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-student-text">Calendar</h1>
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <Button variant="outline" className="mt-4" onClick={reload}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header — title + subtitle on the left, legend pills + refresh on the right.
          (EduPulse shows an "Add Event" button here; intentionally omitted — a
          student can't create institutional calendar events.) */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-student-text">
            <CalendarDays aria-hidden="true" className="size-6 text-student-primary" />
            Calendar
          </h1>
          <p className="mt-1 text-sm text-student-muted">Your academic schedule at a glance</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ul aria-label="Event legend" className="flex flex-wrap items-center gap-2">
            {(Object.keys(TYPE_STYLES) as EventType[]).map((type) => (
              <li
                key={type}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${TYPE_STYLES[type].pill}`}
              >
                <span aria-hidden="true" className={`size-2 rounded-full ${TYPE_STYLES[type].dot}`} />
                {TYPE_STYLES[type].label}
              </li>
            ))}
          </ul>
          <Button variant="outline" size="sm" onClick={reload} className="rounded-xl">Refresh</Button>
        </div>
      </div>

      {/* Month grid */}
      <section
        aria-label={`Calendar for ${monthLabel}`}
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Previous month"
            onClick={() => goToMonth(-1)}
            className="rounded-full text-student-muted hover:text-student-text max-sm:size-11"
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
          </Button>
          <div className="flex flex-col items-center">
            <h2 className="text-base font-bold text-student-text sm:text-lg">{monthLabel}</h2>
            {!selectedIsToday ? (
              <button
                type="button"
                onClick={jumpToToday}
                className="text-xs font-semibold text-student-primary hover:underline"
              >
                Jump to today
              </button>
            ) : null}
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Next month"
            onClick={() => goToMonth(1)}
            className="rounded-full text-student-muted hover:text-student-text max-sm:size-11"
          >
            <ChevronRight aria-hidden="true" className="size-5" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {WEEKDAYS.map((day) => (
            <div key={day} className="pb-1 text-center text-[11px] font-semibold uppercase tracking-wide text-student-muted">
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{day.charAt(0)}</span>
            </div>
          ))}

          {cells.map((cellDate, index) => {
            if (!cellDate) {
              return <div key={`blank-${index}`} aria-hidden="true" />;
            }

            const dayEvents = eventsByDay.get(dayKey(cellDate)) ?? [];
            const isToday = isSameDay(cellDate, today);
            const isSelected = isSameDay(cellDate, selectedDay);
            const overflow = dayEvents.length - MAX_CHIPS_PER_DAY;

            return (
              <button
                key={dayKey(cellDate)}
                type="button"
                onClick={() => setSelectedDay(cellDate)}
                aria-pressed={isSelected}
                aria-label={`${cellDate.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}, ${dayEvents.length} event${dayEvents.length === 1 ? '' : 's'}`}
                className={`flex min-h-[68px] flex-col rounded-xl border p-1.5 text-left transition-colors sm:min-h-[92px] sm:p-2 ${
                  isSelected
                    ? 'border-student-primary bg-student-primary/5'
                    : 'border-slate-200 hover:bg-slate-50'
                } ${isToday ? 'ring-2 ring-student-primary' : ''}`}
              >
                <span
                  className={`mb-1 inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold ${
                    isToday ? 'bg-student-primary text-white' : 'text-student-text'
                  }`}
                >
                  {cellDate.getDate()}
                </span>
                <span className="flex flex-1 flex-col gap-0.5">
                  {dayEvents.slice(0, MAX_CHIPS_PER_DAY).map((event, chipIndex) => (
                    <span
                      key={`${event.type}-${chipIndex}-${event.title}`}
                      title={event.title}
                      className={`flex items-center gap-1 truncate rounded px-1 py-0.5 text-[10px] font-medium leading-tight ${TYPE_STYLES[event.type].chip}`}
                    >
                      <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${TYPE_STYLES[event.type].dot}`} />
                      <span className="truncate">{event.title}</span>
                    </span>
                  ))}
                  {overflow > 0 ? (
                    <span className="px-1 text-[10px] font-medium text-student-muted">+{overflow} more</span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Agenda — EduPulse's "Today's Schedule". Anchored to today by default; the
          heading adapts when another day is picked from the grid above. */}
      <section aria-label="Daily schedule" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-bold text-student-text">
            {selectedIsToday ? "Today's Schedule" : 'Schedule'}
          </h2>
          <p className="text-sm font-medium text-student-muted">
            {selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {selectedEvents.length === 0 ? (
          <div role="status" className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
            <CalendarDays aria-hidden="true" className="mx-auto size-8 text-slate-300" />
            <p className="mt-2 text-sm text-student-muted">
              {selectedIsToday ? 'Nothing scheduled for today.' : 'Nothing scheduled.'}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {selectedEvents.map((event, index) => {
              const Icon = TYPE_ICON[event.type];
              return (
                <li
                  key={`${event.type}-${index}-${event.title}`}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 transition-colors hover:bg-slate-50"
                >
                  <span className="w-16 shrink-0 text-xs font-semibold text-student-muted">
                    {event.time || '—'}
                  </span>
                  <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${TYPE_STYLES[event.type].chip}`}>
                    <Icon aria-hidden="true" className="size-4" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-semibold text-student-text">{event.title}</span>
                    {event.subject ? (
                      <span className="truncate text-xs text-student-muted">{event.subject}</span>
                    ) : null}
                  </span>
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TYPE_STYLES[event.type].chip}`}
                  >
                    {TYPE_STYLES[event.type].label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
