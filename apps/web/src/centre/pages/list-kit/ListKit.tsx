import type { ComponentType, ReactNode } from 'react';
import { AlertTriangle, ArrowDown, ArrowLeft, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { SortDir } from './list-kit-model.js';

// Naji's centre portal design vocabulary (Lovable "centrelogin" export:
// AppShell.StatCard, the Applications PillButton, Courses SortHead and the
// TablePagination bar), shared by Applications / Students / Courses & Fees.
// Colours come from the centre theme tokens (bg-primary-soft, text-info, …).

export const CARD = 'rounded-xl border-border/70 shadow-[var(--shadow-soft)]';

type Icon = ComponentType<{ className?: string }>;

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatCard({ label, value, icon: IconCmp, tone = 'bg-primary-soft text-accent-foreground', sub }: {
  label: string;
  value: ReactNode;
  icon: Icon;
  tone?: string;
  sub?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card p-4 shadow-[var(--shadow-soft)]">
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', tone)}>
        <IconCmp className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-xl font-bold tracking-tight text-foreground">{value}</p>
        {sub ? <p className="text-[11px] text-muted-foreground">{sub}</p> : null}
      </div>
    </div>
  );
}

export function PillButton({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground',
      )}
    >
      {label}
      <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-semibold', active ? 'bg-white/20' : 'bg-muted text-muted-foreground')}>
        {count}
      </span>
    </button>
  );
}

export function SortHead<K extends string>({ label, k, sortKey, sortDir, onSort, align, className }: {
  label: string;
  k: K;
  sortKey: K | null;
  sortDir: SortDir;
  onSort: (k: K) => void;
  align?: 'right';
  className?: string;
}) {
  const active = sortKey === k;
  return (
    <TableHead className={cn(align === 'right' && 'text-right', className)} aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        onClick={() => onSort(k)}
        title={`Sort by ${label}`}
        className={cn('inline-flex items-center gap-1 transition-colors hover:text-foreground', active ? 'text-foreground' : 'text-muted-foreground')}
      >
        {label}
        {active ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-50" />}
      </button>
    </TableHead>
  );
}

export function PaginationBar({ page, totalPages, showing, total, unit, onPage }: {
  page: number;
  totalPages: number;
  showing: number;
  total: number;
  unit: string;
  onPage: (page: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground">
        Showing <span className="font-medium text-foreground">{showing}</span> of{' '}
        <span className="font-medium text-foreground">{total}</span> {unit}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)} className="gap-1">
          <ChevronLeft className="h-4 w-4" /> Prev
        </Button>
        <span className="px-2 text-xs text-muted-foreground">Page {page} of {totalPages}</span>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)} className="gap-1">
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function Tag({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span className={cn('inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium', className)}>
      {children}
    </span>
  );
}

/** Stage / status badge with the design's leading dot. */
export function DotBadge({ tone, label }: { tone: string; label: string }) {
  return (
    <Tag className={tone}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
      {label}
    </Tag>
  );
}

export function SectionCard({ title, icon: IconCmp, children, action }: { title: string; icon: Icon; children: ReactNode; action?: ReactNode }) {
  return (
    <Card className={cn(CARD, 'gap-0 p-6')}>
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-accent-foreground">
          <IconCmp className="h-4 w-4" />
        </div>
        <h3 className="flex-1 text-sm font-semibold text-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </Card>
  );
}

export function FieldGrid({ children }: { children: ReactNode }) {
  return <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">{children}</dl>;
}

export function Field({ label, value, full }: { label: string; value: ReactNode; full?: boolean }) {
  const empty = value === '' || value === null || value === undefined;
  return (
    <div className={cn('min-w-0', full && 'sm:col-span-2')}>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={cn('mt-0.5 break-words text-sm font-medium', empty ? 'text-muted-foreground' : 'text-foreground')}>{empty ? '—' : value}</dd>
    </div>
  );
}

export function BackLink({ label, onClick, trail }: { label: string; onClick: () => void; trail?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <button type="button" onClick={onClick} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {label}
      </button>
      {trail ? (
        <>
          <span className="text-muted-foreground">/</span>
          <span className="truncate font-mono text-xs text-foreground">{trail}</span>
        </>
      ) : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card className={cn(CARD, 'items-center gap-3 p-10 text-center')} role="alert">
      <AlertTriangle className="h-6 w-6 text-destructive" />
      <p className="text-sm text-foreground">{message}</p>
      {onRetry ? <Button variant="outline" size="sm" onClick={onRetry}>Try again</Button> : null}
    </Card>
  );
}

export function EmptyState({ icon: IconCmp, title, body }: { icon: Icon; title: string; body?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <IconCmp className="h-5 w-5" />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {body ? <p className="max-w-sm text-xs text-muted-foreground">{body}</p> : null}
    </div>
  );
}
