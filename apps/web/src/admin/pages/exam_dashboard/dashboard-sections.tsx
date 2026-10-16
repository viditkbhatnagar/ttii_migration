import {
  Activity, ArrowRight, Award, ChevronRight, Clock, Database, FileCheck2, FileSignature, PenSquare, RefreshCw,
  Send, ShieldCheck, Users as UsersIcon, type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Pill } from '../../shared/components/ui-kit.js';
import { TONE } from '../../shared/components/ui-tones.js';
import { formatHm } from '../exam_result/exam-results-model.js';
import { PHASE_LABEL, PHASE_TONE } from '../exam/exam-list-model.js';
import type { CalendarItem } from '../exam_calendar/exam-calendar-model.js';
import {
  ACTIVITY_TONE,
  HREF,
  activityText,
  dayLabel,
  formatWhen,
  type ActivityItem,
  type ActivityKind,
  type PendingTask,
  type PipelineStage,
  type StageIcon,
  type TaskIcon,
} from './exam-dashboard-model.js';

// Exam → Dashboard: pipeline, upcoming schedule, pending activities and the
// recent-activity feed (Naji's ExamDashboardModule, on real data).

export const CARD = 'gap-0 border-border/70 p-5 shadow-[var(--shadow-soft)]';

export function SectionHead({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function LinkButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button variant="ghost" size="sm" className="h-7 shrink-0 gap-1 text-xs" onClick={onClick}>
      {label} <ChevronRight aria-hidden="true" className="size-3.5" />
    </Button>
  );
}

const STAGE_ICON: Record<StageIcon, LucideIcon> = {
  bank: Database,
  create: PenSquare,
  eligibility: ShieldCheck,
  allocation: UsersIcon,
  conduct: FileSignature,
  evaluation: FileCheck2,
  result: Award,
  published: Send,
};

export function PipelineCard({ stages, onNavigate }: { stages: PipelineStage[]; onNavigate: (href: string) => void }) {
  return (
    <Card className={CARD}>
      <SectionHead
        title="Examination Pipeline"
        subtitle="Live status across every stage of the exam lifecycle."
        action={<LinkButton label="View all" onClick={() => onNavigate(HREF.exams)} />}
      />
      <ol className="mt-5 grid gap-3 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-8">
        {stages.map((s, i) => {
          const Icon = STAGE_ICON[s.key];
          return (
            <li key={s.key}>
              <button
                type="button"
                onClick={() => onNavigate(s.href)}
                className="group flex h-full w-full flex-col rounded-xl border border-border/70 bg-card p-3 text-left transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <span className="flex items-center justify-between">
                  <span className={cn('flex size-8 items-center justify-center rounded-lg', TONE[s.tone].tile)}>
                    <Icon aria-hidden="true" className="size-4" />
                  </span>
                  <span className="text-[10px] font-medium text-muted-foreground">Stage {i + 1}</span>
                </span>
                <span className="mt-3 text-[11px] font-medium text-muted-foreground">{s.label}</span>
                <span className={cn('mt-0.5 font-semibold tracking-tight text-foreground', s.key === 'eligibility' ? 'text-sm' : 'text-lg tabular-nums')}>
                  {s.value}
                </span>
                <span className="mt-1 text-[10px] leading-snug text-muted-foreground">{s.caption}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

const UPCOMING_ROWS = 8;

export function UpcomingCard({
  items, now, onOpen, onNavigate,
}: { items: CalendarItem[]; now: Date; onOpen: (item: CalendarItem) => void; onNavigate: (href: string) => void }) {
  const shown = items.slice(0, UPCOMING_ROWS);
  return (
    <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)] lg:col-span-2">
      <div className="p-4">
        <SectionHead
          title="Upcoming Examination Schedule"
          subtitle={items.length > UPCOMING_ROWS
            ? `Next 30 days — showing ${UPCOMING_ROWS} of ${items.length}.`
            : 'Today and the next 30 days.'}
          action={<LinkButton label="Calendar" onClick={() => onNavigate(HREF.calendar)} />}
        />
      </div>
      {shown.length === 0 ? (
        <p role="status" className="border-t border-border/70 px-4 py-10 text-center text-sm text-muted-foreground">
          No exam sittings, drafts or re-exams in the next 30 days.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="text-xs">Exam</TableHead>
                <TableHead className="text-xs">Course</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-right text-xs">Students</TableHead>
                <TableHead className="text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((u) => (
                <TableRow key={u.key} className="cursor-pointer hover:bg-muted/30" onClick={() => onOpen(u)}>
                  <TableCell className="max-w-[240px]">
                    <button type="button" title={u.title || undefined} className="block max-w-full truncate text-left text-sm font-medium text-foreground hover:text-primary focus-visible:outline-none focus-visible:underline" onClick={(e) => { e.stopPropagation(); onOpen(u); }}>
                      {u.title || 'Untitled exam'}
                    </button>
                    {u.subject ? <span className="block truncate text-xs text-muted-foreground" title={u.subject}>{u.subject}</span> : null}
                  </TableCell>
                  <TableCell className="max-w-[180px] truncate text-sm text-muted-foreground" title={u.courses.join(', ')}>
                    {u.courses.join(', ') || '—'}
                  </TableCell>
                  <TableCell>
                    {u.kind === 'reexam' ? <Pill tone="amber">Re-Examination</Pill> : <Pill tone="blue">Regular</Pill>}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
                      <Clock aria-hidden="true" className="size-3" />
                      {dayLabel(u.fromDate, now)}{u.startTime ? ` · ${formatHm(u.startTime)}` : ''}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{u.students}</TableCell>
                  <TableCell><Pill tone={PHASE_TONE[u.status]}>{PHASE_LABEL[u.status]}</Pill></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}

const TASK_ICON: Record<TaskIcon, LucideIcon> = {
  allocation: UsersIcon,
  evaluation: FileCheck2,
  publish: Send,
  reexam: RefreshCw,
};

export function PendingCard({ tasks, onNavigate }: { tasks: PendingTask[]; onNavigate: (href: string) => void }) {
  return (
    <Card className={cn(CARD, 'p-4')}>
      <SectionHead
        title="Pending Activities"
        action={<span className="text-[11px] text-muted-foreground">{tasks.length} task{tasks.length === 1 ? '' : 's'}</span>}
      />
      {tasks.length === 0 ? (
        <p role="status" className="mt-6 text-center text-sm text-muted-foreground">Nothing is waiting on you.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {tasks.map((t) => {
            const Icon = TASK_ICON[t.key];
            return (
              <li key={t.key} className="flex items-center gap-3 rounded-xl border border-border/70 p-3 transition hover:bg-muted/30">
                <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', TONE[t.tone].tile)}>
                  <Icon aria-hidden="true" className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug text-foreground">
                    <span className="font-semibold tabular-nums">{t.count}</span> {t.label}
                  </p>
                  {t.detail ? <p className="truncate text-[11px] text-muted-foreground" title={t.detail}>{t.detail}</p> : null}
                </div>
                <Button size="sm" variant="outline" className="h-7 shrink-0 gap-1 text-xs" onClick={() => onNavigate(t.href)}>
                  {t.action} <ArrowRight aria-hidden="true" className="size-3" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

const ACTIVITY_ICON: Record<ActivityKind, LucideIcon> = {
  exam_created: PenSquare,
  exam_published: Activity,
  results_published: Award,
  reexam_scheduled: RefreshCw,
  questions_added: Database,
};

export function ActivityCard({ items, now }: { items: ActivityItem[]; now: Date }) {
  return (
    <Card className={cn(CARD, 'lg:col-span-2')}>
      <SectionHead title="Recent Activity" subtitle="Exams created and published, results released, re-exams scheduled and questions added." />
      {items.length === 0 ? (
        <p role="status" className="mt-6 text-center text-sm text-muted-foreground">No exam activity yet.</p>
      ) : (
        <ol className="relative mt-4 ml-2.5 space-y-4 border-l border-border/70 pl-5">
          {items.map((a, i) => {
            const Icon = ACTIVITY_ICON[a.kind];
            return (
              <li key={`${a.kind}-${a.at}-${i}`} className="relative">
                <span className={cn('absolute -left-[31px] top-0 flex size-5 items-center justify-center rounded-full ring-2 ring-background', TONE[ACTIVITY_TONE[a.kind]].tile)}>
                  <Icon aria-hidden="true" className="size-3" />
                </span>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <p className="min-w-0 text-sm text-foreground">
                    <span className="font-medium">{a.actor}</span> {activityText(a)}
                  </p>
                  <span className="whitespace-nowrap text-[11px] text-muted-foreground">{formatWhen(a.at, now)}</span>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
