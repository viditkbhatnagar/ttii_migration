import { CheckCircle2, CircleDashed, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { StageBadge } from '../StageBadge.js';
import { formatDateTime, type AppEvent, type StageStep } from '../application-profile-model.js';

// Activity Timeline (the Lead History events) and Stage History (the pipeline
// steps, dated from those same events) — Naji's last two profile tabs.

export function PipelineProgress({ steps }: { steps: StageStep[] }) {
  return (
    <div>
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Pipeline Progress</p>
      <ol className="flex items-center gap-1 overflow-x-auto pb-1">
        {steps.map((s, i) => {
          const rejected = s.stage === 'rejected';
          const done = s.state === 'done';
          const active = s.state === 'current';
          return (
            <li key={s.stage} className="flex min-w-fit flex-1 items-center" aria-current={active ? 'step' : undefined}>
              <div className="flex flex-1 flex-col items-center gap-1.5">
                <span className={cn(
                  'flex size-7 items-center justify-center rounded-full border-2 text-[11px] font-semibold',
                  done && 'border-emerald-600 bg-emerald-600 text-white',
                  active && !rejected && 'border-primary bg-primary text-primary-foreground ring-4 ring-primary/15',
                  active && rejected && 'border-rose-600 bg-rose-600 text-white ring-4 ring-rose-100',
                  !done && !active && 'border-border bg-card text-muted-foreground',
                )}>
                  {done ? <CheckCircle2 aria-hidden="true" className="size-3.5" /> : rejected ? <XCircle aria-hidden="true" className="size-3.5" /> : i + 1}
                </span>
                <span className={cn('whitespace-nowrap text-center text-[10px]', active ? 'font-semibold text-foreground' : 'text-muted-foreground')}>{s.label}</span>
              </div>
              {i < steps.length - 1 ? <span aria-hidden="true" className={cn('-mt-5 h-0.5 min-w-6 flex-1', done ? 'bg-emerald-600' : 'bg-border')} /> : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function ActivityTimeline({ events, loading }: { events: AppEvent[]; loading: boolean }) {
  return (
    <Card className="gap-0 p-6 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold">Activity Timeline</h3>
      {loading && events.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading timeline…</p>
      ) : events.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No events recorded yet.</p>
      ) : (
        <ol className="relative ml-3 space-y-5 border-l border-border">
          {events.map((ev, i) => (
            <li key={i} className="ml-6">
              <span aria-hidden="true" className="absolute -left-1.5 mt-1.5 size-3 rounded-full border-2 border-card bg-primary" />
              <p className="text-sm font-medium">{ev.description || ev.type}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                <span>{formatDateTime(ev.at)}</span>
                <span>· {ev.actor ? `by ${ev.actor}` : 'System'}</span>
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider">{ev.type}</span>
              </p>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

export function StageHistory({ steps }: { steps: StageStep[] }) {
  return (
    <Card className="gap-0 p-6 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold">Stage History</h3>
      <ul className="space-y-3">
        {steps.map((s) => {
          const done = s.state === 'done';
          const active = s.state === 'current';
          const when = s.at ? formatDateTime(s.at) : '';
          return (
            <li key={s.stage} className="flex items-center gap-3 rounded-lg border border-border p-3">
              {done
                ? <CheckCircle2 aria-hidden="true" className="size-5 text-emerald-600" />
                : <CircleDashed aria-hidden="true" className={cn('size-5', active ? 'text-primary' : 'text-muted-foreground/50')} />}
              <div className="min-w-0 flex-1">
                <p className={cn('text-sm font-medium', !done && !active && 'text-muted-foreground')}>{s.label}</p>
                <p className="text-xs text-muted-foreground">
                  {done ? `Completed${when ? ` · ${when}` : ''}` : active ? `Current stage${when ? ` · since ${when}` : ''}` : 'Upcoming'}
                  {(done || active) && s.by ? ` · by ${s.by}` : ''}
                </p>
              </div>
              {done ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Done</span> : null}
              {active ? <StageBadge stage={s.stage} /> : null}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
