import type { LucideIcon } from 'lucide-react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Pill } from '../../shared/components/ui-kit.js';
import {
  EVAL_LABEL,
  EVAL_TONE,
  RESULT_LABEL,
  RESULT_TONE,
  STATUS_LABEL,
  STATUS_TONE,
  type SortKey,
  type SubmissionRow,
} from './exam-submissions-model.js';

// Small presentational pieces of the Exam Submissions page (Naji's design).

export function StatusBadge({ row }: { row: SubmissionRow }) {
  return (
    <Pill tone={STATUS_TONE[row.status]}>
      {row.status === 'in_progress' ? (
        <span aria-hidden="true" className={cn('size-1.5 rounded-full', row.activity === 'active' ? 'animate-pulse bg-sky-500' : 'bg-slate-400')} />
      ) : null}
      {STATUS_LABEL[row.status]}
    </Pill>
  );
}

export function EvalBadge({ row }: { row: SubmissionRow }) {
  if (row.evaluation === 'none') return <span className="text-xs text-muted-foreground">—</span>;
  return <Pill tone={EVAL_TONE[row.evaluation]} className="text-[11px]">{EVAL_LABEL[row.evaluation]}</Pill>;
}

export function ResultBadge({ row }: { row: SubmissionRow }) {
  return <Pill tone={RESULT_TONE[row.result]} className="text-[11px]">Result: {RESULT_LABEL[row.result]}</Pill>;
}

export function TypeBadge({ type }: { type: SubmissionRow['type'] }) {
  return (
    <Pill tone={type === 'reexam' ? 'amber' : 'primary'} className="px-1.5 text-[10px]">
      {type === 'reexam' ? 'Re-exam' : 'Regular'}
    </Pill>
  );
}

export function PillTab({ active, label, count, onClick }: { active: boolean; label: string; count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
      <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-semibold', active ? 'bg-white/20' : 'bg-muted text-muted-foreground')}>{count}</span>
    </button>
  );
}

export function SortHead({
  label, k, sortKey, dir, onSort, className,
}: { label: string; k: SortKey; sortKey: SortKey; dir: 'asc' | 'desc'; onSort: (k: SortKey) => void; className?: string }) {
  const active = sortKey === k;
  const Icon = !active ? ArrowUpDown : dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <TableHead className={className} aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => onSort(k)} className={cn('inline-flex items-center gap-1 text-xs font-medium hover:text-foreground', active ? 'text-foreground' : 'text-muted-foreground')}>
        {label} <Icon aria-hidden="true" className="size-3" />
      </button>
    </TableHead>
  );
}

export function MiniTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/60 px-3 py-2.5 backdrop-blur">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-foreground" title={value}>{value}</p>
    </div>
  );
}

export function InfoCard({
  title, icon: Icon, children, className,
}: { title: string; icon: LucideIcon; children: React.ReactNode; className?: string }) {
  return (
    <Card className={cn('gap-0 p-5 shadow-sm', className)}>
      <div className="mb-4 flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon aria-hidden="true" className="size-4" />
        </span>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="space-y-2.5">{children}</div>
    </Card>
  );
}

export function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right font-medium text-foreground">{value === '' || value === null ? '—' : value}</span>
    </div>
  );
}

export function ProfileTabBtn({
  active, onClick, icon: Icon, label,
}: { active: boolean; onClick: () => void; icon: LucideIcon; label: string }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'relative inline-flex items-center gap-2 px-4 py-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      <Icon aria-hidden="true" className="size-4" />
      {label}
      {active ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" /> : null}
    </button>
  );
}
