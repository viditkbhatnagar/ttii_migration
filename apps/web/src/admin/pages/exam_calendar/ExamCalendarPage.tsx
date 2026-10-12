import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString } from '../../shared/utils/admin-data-utils.js';
import { PageTitle } from '../../shared/components/ui-kit.js';
import { TONE } from '../../shared/components/ui-tones.js';
import { formatHm } from '../exam_result/exam-results-model.js';
import { PHASE_LABEL, PHASE_TONE, type ExamPhase } from '../exam/exam-list-model.js';
import { ViewExamDialog } from '../exam/ViewExamDialog.js';
import { itemsOnDay, localYmd, monthCells, monthRange, toCalendarItems, type CalendarItem } from './exam-calendar-model.js';

// Exam → Exam Calendar (TTII 2026-10-12, Naji's ExamCalendarModule): a month
// of exam days — every subject sitting on each day its window covers, draft
// exams on their planned dates, and re-exams. Opens on the current month (the
// prototype was pinned to August 2026); a click opens View Exam, or the
// Re-Examination page for a re-exam.

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const STATUS_FILTERS: Array<'all' | ExamPhase> = ['all', 'upcoming', 'in_progress', 'completed', 'draft'];

function itemLabel(i: CalendarItem): string {
  const what = i.subject ? `${i.subject}` : i.title;
  return i.kind === 'reexam' ? `Re-exam · ${what}` : what;
}

function itemTitle(i: CalendarItem): string {
  return [
    i.kind === 'reexam' ? `Re-exam — ${i.students} student${i.students === 1 ? '' : 's'}` : '',
    i.title,
    i.subject,
    i.courses.join(', '),
    i.startTime ? `${formatHm(i.startTime)} – ${formatHm(i.endTime)} IST` : '',
    i.kind === 'draft' ? 'Draft — not published' : PHASE_LABEL[i.status],
  ].filter(Boolean).join('\n');
}

export default function ExamCalendarPage({ api, session, onNavigate }: AdminPageProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [courseId, setCourseId] = useState('');
  const [status, setStatus] = useState<'all' | ExamPhase>('all');
  const [viewing, setViewing] = useState<number | null>(null);
  const [courses, setCourses] = useState<Array<{ id: string; title: string }>>([]);

  useEffect(() => {
    api.loadCourses(session.token)
      .then((list) => setCourses(list.map((c) => ({ id: asString(c.id), title: asString(c.title) })).filter((c) => c.id && c.title)))
      .catch(() => setCourses([]));
  }, [api, session.token]);

  const range = monthRange(year, month);
  const { data, loading, error, reload } = useAdminPageData(
    async () => toCalendarItems(await api.getExamCalendar(session.token, range.from, range.to)),
    [range.from, range.to],
  );
  const items = useMemo(() => (data ?? []).filter((i) => {
    if (courseId && !i.courseIds.includes(Number(courseId))) return false;
    return status === 'all' || i.status === status;
  }), [data, courseId, status]);
  const cells = useMemo(() => monthCells(year, month), [year, month]);
  const todayYmd = localYmd(today);

  const shift = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };
  const open = (i: CalendarItem) => {
    if (i.kind === 'reexam') onNavigate('/admin/Re_exam/index');
    else setViewing(i.examId);
  };

  return (
    <div className="space-y-6">
      <PageTitle title="Exam Calendar" subtitle="Month view of every exam sitting, draft and re-exam." />

      <Card className="gap-0 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="size-8" aria-label="Previous month" onClick={() => shift(-1)}>
              <ChevronLeft aria-hidden="true" className="size-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }}>
              <CalendarDays aria-hidden="true" className="size-3.5" /> Today
            </Button>
            <Button variant="outline" size="icon" className="size-8" aria-label="Next month" onClick={() => shift(1)}>
              <ChevronRight aria-hidden="true" className="size-4" />
            </Button>
          </div>
          <h2 className="text-lg font-semibold text-foreground" aria-live="polite">{MONTHS[month]} {year}</h2>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <select aria-label="Course" value={courseId} onChange={(e) => setCourseId(e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-xs">
              <option value="">All courses</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
            <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value as 'all' | ExamPhase)} className="h-8 rounded-md border border-input bg-background px-2 text-xs">
              {STATUS_FILTERS.map((s) => <option key={s} value={s}>{s === 'all' ? 'All statuses' : PHASE_LABEL[s]}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {(['upcoming', 'in_progress', 'completed', 'draft'] as ExamPhase[]).map((p) => (
            <span key={p} className="inline-flex items-center gap-1.5">
              <span className={cn('size-2.5 rounded-full border', TONE[PHASE_TONE[p]].pill)} /> {PHASE_LABEL[p]}
            </span>
          ))}
          <span className="ml-auto">
            <span className="font-medium text-foreground">{items.length}</span> item{items.length === 1 ? '' : 's'} this month
          </span>
        </div>
      </Card>

      {error ? (
        <Card>
          <CardContent role="alert" className="py-8 text-center text-sm text-red-600">
            {error}
            <div className="mt-4"><Button variant="outline" onClick={reload}>Retry</Button></div>
          </CardContent>
        </Card>
      ) : (
        <Card className="gap-0 overflow-hidden p-0 shadow-sm" aria-busy={loading}>
          <div className="grid grid-cols-7 border-b border-border bg-muted/40">
            {WEEK.map((w) => (
              <div key={w} className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((day, idx) => {
              const dayItems = day ? itemsOnDay(items, day) : [];
              const isToday = day === todayYmd;
              return (
                <div key={idx} className={cn('min-h-[112px] border-b border-r border-border p-1.5', day ? 'bg-background' : 'bg-muted/20')}>
                  {day ? (
                    <>
                      <div className="mb-1 flex justify-end text-xs">
                        <span className={isToday ? 'inline-flex size-6 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground' : 'font-medium text-muted-foreground'}>
                          {Number(day.slice(8, 10))}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {dayItems.slice(0, 3).map((i) => (
                          <button
                            key={i.key}
                            type="button"
                            title={itemTitle(i)}
                            onClick={() => open(i)}
                            className={cn(
                              'block w-full truncate rounded border px-1.5 py-0.5 text-left text-[10.5px] font-medium hover:opacity-80',
                              TONE[PHASE_TONE[i.status]].pill,
                              i.kind === 'reexam' && 'border-dashed',
                            )}
                          >
                            {i.startTime ? <span className="mr-1 opacity-70">{formatHm(i.startTime)}</span> : null}
                            {itemLabel(i)}
                          </button>
                        ))}
                        {dayItems.length > 3 ? (
                          <p className="pl-1 text-[10.5px] text-muted-foreground" title={dayItems.slice(3).map(itemLabel).join('\n')}>
                            +{dayItems.length - 3} more
                          </p>
                        ) : null}
                      </div>
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <ViewExamDialog
        examId={viewing}
        api={api}
        token={session.token}
        onClose={() => setViewing(null)}
        onNavigate={onNavigate}
        onDeleted={reload}
      />
    </div>
  );
}
