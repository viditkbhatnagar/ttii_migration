import { asNumber, asRecord, asString } from '../../shared/utils/admin-data-utils.js';
import type { Tone } from '../../shared/components/ui-tones.js';
import { toCalendarItems, type CalendarItem } from '../exam_calendar/exam-calendar-model.js';

// Exam → Dashboard view model (TTII 2026-10-12, Naji's ExamDashboardModule).
// Mirrors ExamDashboardSummary from the API's exam-dashboard-service; every
// figure is real — the prototype's mock-only parts (session filters, deltas,
// difficulty mix, withheld results) are not shown at all.

export interface ExamRef {
  examId: number;
  title: string;
  count: number;
}

export type ActivityKind = 'exam_created' | 'exam_published' | 'results_published' | 'reexam_scheduled' | 'questions_added';

export interface ActivityItem {
  kind: ActivityKind;
  at: string;
  actor: string;
  examId: number | null;
  title: string;
  count: number;
}

export interface TrendRow {
  month: string;
  created: number;
  held: number;
  published: number;
}

export interface ExamDashboard {
  generatedAt: string;
  status: { total: number; draft: number; upcoming: number; inProgress: number; ready: number; published: number };
  reExamsScheduled: number;
  questionBank: { total: number; mcq: number; descriptive: number; other: number; subjects: number; addedLast30Days: number };
  conduct: { openSittings: number; papersInProgress: number };
  allocationPending: ExamRef[];
  awaitingMarking: { papers: number; exams: ExamRef[] };
  readyToPublish: ExamRef[];
  reExamNeeds: { papers: number; students: number; exams: ExamRef[] };
  upcoming: CalendarItem[];
  trend: TrendRow[];
  participation: { days: number; expected: number; appeared: number; absent: number; passed: number; failed: number };
  activity: ActivityItem[];
}

export const HREF = {
  newExam: '/admin/exam/add',
  exams: '/admin/exam/index',
  calendar: '/admin/exam/calendar',
  questionBank: '/admin/question_bank/index',
  eligibility: '/admin/exam/eligibility/index',
  evaluation: '/admin/Exam_evaluation/index',
  results: '/admin/Exam_result/index',
  reExam: '/admin/Re_exam/index',
} as const;

function rec(v: unknown): Record<string, unknown> {
  return asRecord(v) ?? {};
}

function refs(v: unknown): ExamRef[] {
  return Array.isArray(v)
    ? v.map((x) => {
        const r = rec(x);
        return { examId: asNumber(r.examId), title: asString(r.title), count: asNumber(r.count) };
      })
    : [];
}

function numbers<K extends string>(v: unknown, keys: readonly K[]): Record<K, number> {
  const r = rec(v);
  return Object.fromEntries(keys.map((k) => [k, asNumber(r[k])])) as Record<K, number>;
}

const KINDS: ActivityKind[] = ['exam_created', 'exam_published', 'results_published', 'reexam_scheduled', 'questions_added'];

export function toExamDashboard(raw: unknown): ExamDashboard {
  const r = rec(raw);
  return {
    generatedAt: asString(r.generatedAt),
    status: numbers(r.status, ['total', 'draft', 'upcoming', 'inProgress', 'ready', 'published'] as const),
    reExamsScheduled: asNumber(r.reExamsScheduled),
    questionBank: numbers(r.questionBank, ['total', 'mcq', 'descriptive', 'other', 'subjects', 'addedLast30Days'] as const),
    conduct: numbers(r.conduct, ['openSittings', 'papersInProgress'] as const),
    allocationPending: refs(r.allocationPending),
    awaitingMarking: { papers: asNumber(rec(r.awaitingMarking).papers), exams: refs(rec(r.awaitingMarking).exams) },
    readyToPublish: refs(r.readyToPublish),
    reExamNeeds: {
      ...numbers(r.reExamNeeds, ['papers', 'students'] as const),
      exams: refs(rec(r.reExamNeeds).exams),
    },
    upcoming: toCalendarItems(Array.isArray(r.upcoming) ? r.upcoming : []),
    trend: Array.isArray(r.trend)
      ? r.trend.map((t) => ({ month: asString(rec(t).month), ...numbers(t, ['created', 'held', 'published'] as const) }))
      : [],
    participation: numbers(r.participation, ['days', 'expected', 'appeared', 'absent', 'passed', 'failed'] as const),
    activity: Array.isArray(r.activity)
      ? r.activity.flatMap((a) => {
          const x = rec(a);
          const kind = asString(x.kind) as ActivityKind;
          if (!KINDS.includes(kind)) return [];
          const examId = asNumber(x.examId);
          return [{
            kind,
            at: asString(x.at),
            actor: asString(x.actor) || 'Someone',
            examId: examId > 0 ? examId : null,
            title: asString(x.title),
            count: Math.max(1, asNumber(x.count)),
          }];
        })
      : [],
  };
}

/** Whole-number share, 0 when there is nothing to share. */
export function pct(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-10" → "Oct". */
export function monthLabel(ym: string): string {
  const m = /^\d{4}-(\d{2})$/.exec(ym);
  return m ? MONTHS[Number(m[1]) - 1] ?? ym : ym;
}

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** What the person did, after their name. */
export function activityText(a: ActivityItem): string {
  switch (a.kind) {
    case 'exam_created': return `created the exam “${a.title}”`;
    case 'exam_published': return `published the exam “${a.title}” to students`;
    case 'results_published': return `published results for “${a.title}”`;
    case 'reexam_scheduled': return `scheduled ${plural(a.count, 're-exam')} for “${a.title}”`;
    case 'questions_added': return `added ${plural(a.count, 'question')} to the Question Bank`;
  }
}

export const ACTIVITY_TONE: Record<ActivityKind, Tone> = {
  exam_created: 'blue',
  exam_published: 'primary',
  results_published: 'emerald',
  reexam_scheduled: 'amber',
  questions_added: 'slate',
};

function localYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function time12(d: Date): string {
  const h = d.getHours();
  return `${((h + 11) % 12) + 1}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

/** "Today · 11:42 AM", "Yesterday · 6:12 PM", else "dd/mm/yyyy · 9:05 AM" (the viewer's clock). */
export function formatWhen(iso: string, now: Date): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const day = localYmd(d);
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const label = day === localYmd(now)
    ? 'Today'
    : day === localYmd(yesterday)
      ? 'Yesterday'
      : `${day.slice(8, 10)}/${day.slice(5, 7)}/${day.slice(0, 4)}`;
  return `${label} · ${time12(d)}`;
}

/** "Today", "Tomorrow" or dd/mm/yyyy for an exam's YYYY-MM-DD (an IST date, compared as a bare date). */
export function dayLabel(ymd: string, now: Date): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return '—';
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (ymd === localYmd(now)) return 'Today';
  if (ymd === localYmd(tomorrow)) return 'Tomorrow';
  return `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}/${ymd.slice(0, 4)}`;
}

/** The Result page, opened on the exam when there is exactly one. */
export function resultsHref(exams: ExamRef[]): string {
  return exams.length === 1 && exams[0] ? `${HREF.results}?exam=${exams[0].examId}` : HREF.results;
}

export type StageIcon = 'bank' | 'create' | 'eligibility' | 'allocation' | 'conduct' | 'evaluation' | 'result' | 'published';

export interface PipelineStage {
  key: StageIcon;
  label: string;
  value: string;
  caption: string;
  href: string;
  tone: Tone;
}

export function pipelineStages(d: ExamDashboard): PipelineStage[] {
  const n = (v: number): string => v.toLocaleString('en-IN');
  const s = d.status;
  return [
    { key: 'bank', label: 'Question Bank', value: n(d.questionBank.total), caption: `${n(d.questionBank.mcq)} MCQ · ${n(d.questionBank.descriptive)} written`, href: HREF.questionBank, tone: 'primary' },
    { key: 'create', label: 'Exam Creation', value: n(s.total), caption: `${n(s.draft)} draft · ${n(s.total - s.draft)} published`, href: HREF.exams, tone: 'blue' },
    { key: 'eligibility', label: 'Student Eligibility', value: 'Not set up', caption: 'No eligibility rules yet', href: HREF.eligibility, tone: 'slate' },
    { key: 'allocation', label: 'Student Allocation', value: n(d.allocationPending.length), caption: 'exams with no students', href: HREF.exams, tone: 'blue' },
    { key: 'conduct', label: 'Exam Conduct', value: n(d.conduct.openSittings), caption: `open now · ${plural(d.conduct.papersInProgress, 'paper')} in progress`, href: HREF.calendar, tone: 'amber' },
    { key: 'evaluation', label: 'Evaluation', value: n(d.awaitingMarking.papers), caption: 'papers awaiting marking', href: HREF.evaluation, tone: 'rose' },
    { key: 'result', label: 'Result Management', value: n(s.ready), caption: 'exams ready to publish', href: resultsHref(d.readyToPublish), tone: 'emerald' },
    { key: 'published', label: 'Published', value: n(s.published), caption: 'exams with results out', href: HREF.results, tone: 'emerald' },
  ];
}

export type TaskIcon = 'allocation' | 'evaluation' | 'publish' | 'reexam';

export interface PendingTask {
  key: TaskIcon;
  count: number;
  label: string;
  detail: string;
  action: string;
  href: string;
  tone: Tone;
}

function examNames(exams: ExamRef[]): string {
  const names = exams.slice(0, 2).map((e) => e.title);
  return exams.length > 2 ? `${names.join(', ')} +${exams.length - 2} more` : names.join(', ');
}

/** Only what actually needs doing — a task with nothing in it is left out. */
export function pendingTasks(d: ExamDashboard): PendingTask[] {
  const tasks: PendingTask[] = [
    {
      key: 'allocation', count: d.allocationPending.length,
      label: d.allocationPending.length === 1 ? 'exam has no students allocated' : 'exams have no students allocated',
      detail: examNames(d.allocationPending), action: 'Allocate', href: HREF.exams, tone: 'blue',
    },
    {
      key: 'evaluation', count: d.awaitingMarking.papers,
      label: d.awaitingMarking.papers === 1 ? 'paper with written answers awaiting marking' : 'papers with written answers awaiting marking',
      detail: examNames(d.awaitingMarking.exams), action: 'Evaluate', href: HREF.evaluation, tone: 'rose',
    },
    {
      key: 'publish', count: d.readyToPublish.length,
      label: d.readyToPublish.length === 1 ? 'exam ready for result publication' : 'exams ready for result publication',
      detail: examNames(d.readyToPublish), action: 'Publish', href: resultsHref(d.readyToPublish), tone: 'emerald',
    },
    {
      key: 'reexam', count: d.reExamNeeds.students,
      label: d.reExamNeeds.students === 1 ? 'student needs a re-exam (absent or flagged)' : 'students need a re-exam (absent or flagged)',
      detail: `${plural(d.reExamNeeds.papers, 'paper')} · ${examNames(d.reExamNeeds.exams)}`,
      action: 'Schedule', href: resultsHref(d.reExamNeeds.exams), tone: 'amber',
    },
  ];
  return tasks.filter((t) => t.count > 0);
}

export interface Bar {
  label: string;
  value: number;
  /** A semantic fill (status colours) or the theme's primary. */
  fill: string;
}

export function statusBars(d: ExamDashboard): Bar[] {
  const s = d.status;
  return [
    { label: 'Draft', value: s.draft, fill: 'bg-slate-400' },
    { label: 'Upcoming', value: s.upcoming, fill: 'bg-sky-500' },
    { label: 'In progress', value: s.inProgress, fill: 'bg-primary' },
    { label: 'Awaiting results', value: s.ready, fill: 'bg-amber-500' },
    { label: 'Results published', value: s.published, fill: 'bg-emerald-500' },
  ];
}

export function questionBars(d: ExamDashboard): Bar[] {
  const q = d.questionBank;
  return [
    { label: 'MCQ', value: q.mcq, fill: 'bg-sky-500' },
    { label: 'Descriptive', value: q.descriptive, fill: 'bg-primary' },
    ...(q.other > 0 ? [{ label: 'Other', value: q.other, fill: 'bg-slate-400' }] : []),
  ];
}
