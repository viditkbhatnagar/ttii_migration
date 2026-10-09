import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  OVERALL_LABEL,
  STATUS_LABEL,
  formatYmd,
  type ExamResultsStatus,
  type OverallResult,
  type StudentSitting,
} from './exam-results-model.js';

// Small presentational pieces of Exam → Result, after Naji's Result Management
// design (KPI tiles, stat boxes, result pills), on the admin's own tokens.

export type Tone = 'emerald' | 'rose' | 'slate' | 'amber' | 'violet' | 'blue';

const TONE: Record<Tone, { tile: string; text: string; pill: string }> = {
  emerald: { tile: 'bg-emerald-50 text-emerald-600', text: 'text-emerald-700', pill: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  rose: { tile: 'bg-rose-50 text-rose-600', text: 'text-rose-700', pill: 'border-rose-200 bg-rose-50 text-rose-700' },
  slate: { tile: 'bg-slate-100 text-slate-600', text: 'text-slate-700', pill: 'border-slate-200 bg-slate-50 text-slate-600' },
  amber: { tile: 'bg-amber-50 text-amber-600', text: 'text-amber-700', pill: 'border-amber-200 bg-amber-50 text-amber-700' },
  violet: { tile: 'bg-primary/10 text-primary', text: 'text-primary', pill: 'border-primary/20 bg-primary/5 text-primary' },
  blue: { tile: 'bg-sky-50 text-sky-600', text: 'text-sky-700', pill: 'border-sky-200 bg-sky-50 text-sky-700' },
};

const OVERALL_TONE: Record<OverallResult, Tone> = {
  passed: 'emerald',
  failed: 'rose',
  incomplete: 'amber',
  absent: 'slate',
  pending: 'blue',
  marks_only: 'slate',
  reexam: 'violet',
};

const STATUS_TONE: Record<ExamResultsStatus, Tone> = {
  in_progress: 'blue',
  ready: 'amber',
  published: 'emerald',
};

export function Pill({ tone, children, className }: { tone: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold', TONE[tone].pill, className)}>
      {children}
    </span>
  );
}

export function OverallBadge({ result }: { result: OverallResult }) {
  return <Pill tone={OVERALL_TONE[result] ?? 'slate'}>{OVERALL_LABEL[result] ?? result}</Pill>;
}

export function ExamStatusBadge({ status }: { status: ExamResultsStatus }) {
  return <Pill tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Pill>;
}

/** One subject's mark in the student table: the score, coloured by outcome. */
export function SittingMark({ cell }: { cell: StudentSitting }) {
  if (cell.status === 'reexam') {
    return (
      <span className="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
        Re-exam {formatYmd(cell.reExam?.date ?? '').slice(0, 5)}
      </span>
    );
  }
  if (cell.status === 'absent') {
    return (
      <span className="text-xs font-medium text-slate-500">
        Absent{cell.reExam?.state === 'missed' ? <span className="block text-[10px] font-normal">re-exam missed</span> : null}
      </span>
    );
  }
  if (cell.status === 'pending' || cell.score === null) return <span className="text-xs text-slate-400">—</span>;
  const tone = cell.status === 'fail' ? 'text-rose-700' : cell.status === 'pass' ? 'text-emerald-700' : 'text-slate-700';
  return (
    <span className={cn('text-sm font-semibold tabular-nums', tone)}>
      {cell.score}
      {cell.status === 'fail' ? <span className="ml-0.5 text-[10px] font-bold">F</span> : null}
      {cell.reExam?.state === 'completed' ? (
        <span
          className="ml-1 rounded bg-primary/10 px-1 text-[10px] font-bold text-primary"
          title={`Re-exam mark. Original paper: ${cell.previousScore ?? '—'}`}
        >
          R
        </span>
      ) : null}
    </span>
  );
}

export function KpiTile({
  label, value, icon: Icon, tone, active = false, onClick,
}: { label: string; value: number | string; icon: LucideIcon; tone: Tone; active?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex items-center gap-3 rounded-2xl border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        active ? 'border-primary ring-2 ring-primary/20' : 'border-border',
      )}
    >
      <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', TONE[tone].tile)}>
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-2xl font-bold leading-none tabular-nums text-foreground">{value}</span>
        <span className="mt-1 block truncate text-xs text-muted-foreground">{label}</span>
      </span>
    </button>
  );
}

export function StatBox({ label, value, tone }: { label: string; value: number | string; tone: Tone }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn('mt-1 text-xl font-bold tabular-nums', TONE[tone].text)}>{value}</p>
    </div>
  );
}
