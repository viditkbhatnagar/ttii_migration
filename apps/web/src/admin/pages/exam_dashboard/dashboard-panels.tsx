import {
  ArrowRight, Award, BookOpen, CalendarDays, Database, FileCheck2, FileSignature, ListChecks, PenSquare,
  PieChart as PieIcon, Plus, RefreshCw, Send, ShieldCheck, type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TONE, type Tone } from '../../shared/components/ui-tones.js';
import { CARD, SectionHead } from './dashboard-sections.js';
import { HREF, monthLabel, pct, type Bar, type ExamDashboard, type TrendRow } from './exam-dashboard-model.js';

// Exam → Dashboard: status and question-bank bars, the monthly trend,
// participation, module summary and quick access (Naji's ExamDashboardModule).

export function BarListCard({
  title, subtitle, icon: Icon, bars, empty,
}: { title: string; subtitle: string; icon: LucideIcon; bars: Bar[]; empty: string }) {
  const total = bars.reduce((n, b) => n + b.value, 0);
  return (
    <Card className={CARD}>
      <SectionHead title={title} subtitle={subtitle} action={<Icon aria-hidden="true" className="size-4 text-muted-foreground" />} />
      {total === 0 ? (
        <p role="status" className="mt-6 text-center text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {bars.map((b) => {
            const share = pct(b.value, total);
            return (
              <li key={b.label}>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">{b.label}</span>
                  <span className="font-medium tabular-nums text-foreground">{b.value.toLocaleString('en-IN')} · {share}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted" role="presentation">
                  <div className={cn('h-full rounded-full', b.fill)} style={{ width: `${share}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

export function StatusCard({ bars, total }: { bars: Bar[]; total: number }) {
  return (
    <BarListCard
      title="Status Overview"
      subtitle={`${total} exam${total === 1 ? '' : 's'} across all lifecycle stages.`}
      icon={PieIcon}
      bars={bars}
      empty="No exams yet."
    />
  );
}

export function QuestionBankCard({ bars, total }: { bars: Bar[]; total: number }) {
  return (
    <BarListCard
      title="Question Bank Mix"
      subtitle={`${total.toLocaleString('en-IN')} question${total === 1 ? '' : 's'} in the bank.`}
      icon={BookOpen}
      bars={bars}
      empty="The question bank is empty."
    />
  );
}

const SERIES: Array<{ key: keyof Omit<TrendRow, 'month'>; label: string; fill: string }> = [
  { key: 'created', label: 'Created', fill: 'bg-sky-500' },
  { key: 'held', label: 'Sittings held', fill: 'bg-amber-500' },
  { key: 'published', label: 'Results published', fill: 'bg-emerald-500' },
];

export function TrendCard({ rows }: { rows: TrendRow[] }) {
  const max = Math.max(0, ...rows.flatMap((r) => [r.created, r.held, r.published]));
  return (
    <Card className={cn(CARD, 'lg:col-span-2')}>
      <SectionHead
        title="Monthly Examination Trend"
        subtitle="Exams created · subject sittings held · results published, last 6 months."
        action={(
          <span className="hidden flex-wrap items-center gap-3 text-[11px] text-muted-foreground sm:flex">
            {SERIES.map((s) => (
              <span key={s.key} className="inline-flex items-center gap-1.5"><span className={cn('size-2 rounded-full', s.fill)} />{s.label}</span>
            ))}
          </span>
        )}
      />
      {max === 0 ? (
        <p role="status" className="mt-6 text-center text-sm text-muted-foreground">No exam activity in the last six months.</p>
      ) : (
        <div className="mt-5 grid h-52 items-end gap-2 sm:gap-4" style={{ gridTemplateColumns: `repeat(${rows.length}, minmax(0, 1fr))` }}>
          {rows.map((r) => (
            <div key={r.month} className="flex flex-col items-center gap-1.5">
              <div className="flex h-44 items-end gap-1">
                {SERIES.map((s) => (
                  <div
                    key={s.key}
                    title={`${monthLabel(r.month)} — ${s.label}: ${r[s.key]}`}
                    className={cn('w-2.5 rounded-t-md sm:w-3', s.fill)}
                    style={{ height: r[s.key] > 0 ? `${Math.max(4, (r[s.key] / max) * 100)}%` : '0%' }}
                  />
                ))}
              </div>
              <span className="text-[11px] text-muted-foreground">{monthLabel(r.month)}</span>
            </div>
          ))}
        </div>
      )}
      <p className="sr-only">
        {rows.map((r) => `${monthLabel(r.month)}: ${r.created} created, ${r.held} sittings held, ${r.published} results published.`).join(' ')}
      </p>
    </Card>
  );
}

function Meter({ label, value, total, fill }: { label: string; value: number; total: number; fill: string }) {
  const share = pct(value, total);
  return (
    <div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums text-foreground">{value.toLocaleString('en-IN')} · {share}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted" role="presentation">
        <div className={cn('h-full rounded-full', fill)} style={{ width: `${share}%` }} />
      </div>
    </div>
  );
}

export function ParticipationCard({ p }: { p: ExamDashboard['participation'] }) {
  const decided = p.passed + p.failed;
  const passRate = pct(p.passed, decided);
  return (
    <Card className={CARD}>
      <SectionHead title="Student Participation" subtitle={`Subject sittings held in the last ${p.days} days.`} />
      {p.expected === 0 ? (
        <p role="status" className="mt-6 text-center text-sm text-muted-foreground">No sittings closed in the last {p.days} days.</p>
      ) : (
        <>
          <div className="mt-4 space-y-3">
            <Meter label="Allocated papers" value={p.expected} total={p.expected} fill="bg-sky-500" />
            <Meter label="Appeared" value={p.appeared} total={p.expected} fill="bg-emerald-500" />
            <Meter label="Absent" value={p.absent} total={p.expected} fill="bg-rose-500" />
          </div>
          <div className="mt-5 rounded-xl border border-border/70 bg-muted/30 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Pass rate</span>
              <span className="text-lg font-semibold tabular-nums text-foreground">{decided > 0 ? `${passRate}%` : '—'}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" role="presentation">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${passRate}%` }} />
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {decided > 0 ? `${p.passed} of ${decided} marked papers passed (subjects with a pass mark).` : 'No subject with a pass mark was sat.'}
            </p>
          </div>
        </>
      )}
    </Card>
  );
}

interface ModuleCard {
  label: string;
  icon: LucideIcon;
  tone: Tone;
  stats: Array<[string, number]>;
  cta: string;
  href: string;
}

export function ModuleSummary({ d, onNavigate }: { d: ExamDashboard; onNavigate: (href: string) => void }) {
  const modules: ModuleCard[] = [
    { label: 'Question Bank', icon: Database, tone: 'primary', cta: 'Manage Questions', href: HREF.questionBank,
      stats: [['Subjects', d.questionBank.subjects], ['Questions', d.questionBank.total], ['Added 30d', d.questionBank.addedLast30Days]] },
    { label: 'Exams', icon: PenSquare, tone: 'blue', cta: 'Manage Exams', href: HREF.exams,
      stats: [['Draft', d.status.draft], ['Upcoming', d.status.upcoming], ['In progress', d.status.inProgress]] },
    { label: 'Exam Conduct', icon: FileSignature, tone: 'amber', cta: 'Open Calendar', href: HREF.calendar,
      stats: [['Open now', d.conduct.openSittings], ['Writing', d.conduct.papersInProgress], ['Next 30d', d.upcoming.length]] },
    { label: 'Evaluation', icon: FileCheck2, tone: 'rose', cta: 'Open Evaluation', href: HREF.evaluation,
      stats: [['Papers', d.awaitingMarking.papers], ['Exams', d.awaitingMarking.exams.length]] },
    { label: 'Result Management', icon: Award, tone: 'emerald', cta: 'Manage Results', href: HREF.results,
      stats: [['Ready', d.status.ready], ['Published', d.status.published]] },
    { label: 'Re-Examination', icon: RefreshCw, tone: 'slate', cta: 'View Re-exams', href: HREF.reExam,
      stats: [['Scheduled', d.reExamsScheduled], ['Needed', d.reExamNeeds.papers], ['Students', d.reExamNeeds.students]] },
  ];
  return (
    <section aria-labelledby="exam-dash-modules">
      <h2 id="exam-dash-modules" className="mb-3 text-sm font-semibold text-foreground">Module Summary</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => (
          <Card key={m.label} className="flex flex-col gap-0 border-border/70 p-4 shadow-[var(--shadow-soft)]">
            <div className="flex items-center gap-3">
              <span className={cn('flex size-10 items-center justify-center rounded-xl', TONE[m.tone].tile)}>
                <m.icon aria-hidden="true" className="size-5" />
              </span>
              <p className="truncate text-sm font-semibold text-foreground">{m.label}</p>
            </div>
            <dl className="mt-4 grid flex-1 grid-cols-3 gap-2">
              {m.stats.map(([label, value]) => (
                <div key={label} className="rounded-lg bg-muted/40 p-2">
                  <dt className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
                  <dd className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{value.toLocaleString('en-IN')}</dd>
                </div>
              ))}
            </dl>
            <Button variant="outline" size="sm" className="mt-4 justify-between" onClick={() => onNavigate(m.href)}>
              {m.cta} <ArrowRight aria-hidden="true" className="size-3.5" />
            </Button>
          </Card>
        ))}
      </div>
    </section>
  );
}

const QUICK: Array<{ label: string; icon: LucideIcon; href: string }> = [
  { label: 'Create New Exam', icon: Plus, href: HREF.newExam },
  { label: 'Add Questions', icon: Database, href: HREF.questionBank },
  { label: 'Exam Calendar', icon: CalendarDays, href: HREF.calendar },
  { label: 'Student Eligibility', icon: ShieldCheck, href: HREF.eligibility },
  { label: 'Evaluate Papers', icon: FileCheck2, href: HREF.evaluation },
  { label: 'Publish Results', icon: Send, href: HREF.results },
  { label: 'Re-Examination', icon: RefreshCw, href: HREF.reExam },
  { label: 'All Exams', icon: ListChecks, href: HREF.exams },
];

export function QuickAccess({ onNavigate }: { onNavigate: (href: string) => void }) {
  return (
    <Card className={cn(CARD, 'lg:col-span-2')}>
      <SectionHead title="Quick Access" subtitle="Jump straight into a common examination workflow." action={<ListChecks aria-hidden="true" className="size-4 text-muted-foreground" />} />
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {QUICK.map((q) => (
          <button
            key={q.label}
            type="button"
            onClick={() => onNavigate(q.href)}
            className="group flex flex-col items-start gap-2 rounded-xl border border-border/70 bg-card p-3 text-left transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <q.icon aria-hidden="true" className="size-4" />
            </span>
            <span className="text-xs font-medium leading-snug text-foreground">{q.label}</span>
            <span className="mt-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground group-hover:text-foreground">
              Open <ArrowRight aria-hidden="true" className="size-3" />
            </span>
          </button>
        ))}
      </div>
    </Card>
  );
}
