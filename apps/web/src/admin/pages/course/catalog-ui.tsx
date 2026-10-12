import type { LucideIcon } from 'lucide-react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, FileText, MoreHorizontal, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { SortDir, StatusPill } from './catalog-list-model.js';

// Building blocks for the Courses-section lists in Naji's design (Programs,
// Courses, Subjects, Lessons, Content Library): page header with Export + New,
// status pills, sortable headers, the row "…" menu and the pager.

export const SELECT_CLASS = 'h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
export const TEXTAREA_CLASS = 'flex min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
export const PAGE_CARD = 'gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]';
export const FILTER_CARD = 'gap-0 border-border/70 p-4 shadow-[var(--shadow-soft)]';

export function ListHeader({
  crumb, title, shown, total, noun, exportLabel, onExport, newLabel, onNew,
}: {
  crumb?: string;
  title: string;
  shown: number;
  total: number;
  noun: string;
  exportLabel: string;
  onExport: () => void;
  newLabel: string;
  onNew: () => void;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {crumb ? <p className="mb-1 text-xs text-muted-foreground">{crumb}</p> : null}
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{shown} of {total} {noun}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" className="gap-1.5" disabled={shown === 0} onClick={onExport}>
          <FileText aria-hidden="true" className="size-4" /> {exportLabel}
        </Button>
        <Button size="sm" className="gap-1.5" onClick={onNew}>
          <Plus aria-hidden="true" className="size-4" /> {newLabel}
        </Button>
      </div>
    </div>
  );
}


export function StatusPills({
  label, pills, total, active, onChange,
}: { label: string; pills: StatusPill[]; total: number; active: string; onChange: (key: string) => void }) {
  if (pills.length === 0) return null;
  const all: StatusPill = { key: '', label: 'All', count: total };
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-2">
      {[all, ...pills].map((p) => {
        const on = active === p.key;
        return (
          <button
            key={p.key || 'all'}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(p.key)}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
              on ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground',
            )}
          >
            {p.label}
            <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-semibold', on ? 'bg-white/20' : 'bg-muted text-muted-foreground')}>{p.count}</span>
          </button>
        );
      })}
    </div>
  );
}

export function SortHead<K extends string>({
  label, k, sortKey, dir, onSort, className,
}: { label: string; k: K; sortKey: K; dir: SortDir; onSort: (k: K) => void; className?: string }) {
  const active = sortKey === k;
  const Icon = !active ? ArrowUpDown : dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <TableHead className={className} aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        onClick={() => onSort(k)}
        className={cn('inline-flex items-center gap-1 text-xs font-medium hover:text-foreground', active ? 'text-foreground' : 'text-muted-foreground')}
      >
        {label} <Icon aria-hidden="true" className="size-3" />
      </button>
    </TableHead>
  );
}


export function SelectCell({ checked, label, onChange }: { checked: boolean; label: string; onChange: (on: boolean) => void }) {
  return <Checkbox aria-label={label} checked={checked} onCheckedChange={(v) => onChange(v === true)} />;
}

export interface RowAction {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  destructive?: boolean;
}

export function RowActions({ name, actions }: { name: string; actions: RowAction[] }) {
  return (
    // Non-modal: a confirm or dialog opened from an item must not inherit the
    // menu's body pointer-events lock.
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" className="size-8" aria-label={`Actions for ${name}`}>
          <MoreHorizontal aria-hidden="true" className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {actions.map((a) => (
          <DropdownMenuItem key={a.label} variant={a.destructive ? 'destructive' : 'default'} onSelect={a.onSelect}>
            <a.icon aria-hidden="true" className="size-4" /> {a.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Pager({
  shown, total, page, pages, onPage,
}: { shown: number; total: number; page: number; pages: number; onPage: (p: number) => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4">
      <p className="text-xs text-muted-foreground">
        Showing <span className="font-medium text-foreground">{shown}</span> of <span className="font-medium text-foreground">{total}</span> entries
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="gap-1" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft aria-hidden="true" className="size-4" /> Prev
        </Button>
        <span className="px-2 text-xs text-muted-foreground">Page {page} of {pages}</span>
        <Button variant="outline" size="sm" className="gap-1" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next <ChevronRight aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function LoadError({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <Card>
      <CardContent role="alert" className="py-8 text-center text-sm text-destructive">
        {error}
        <div className="mt-4"><Button variant="outline" onClick={onRetry}>Retry</Button></div>
      </CardContent>
    </Card>
  );
}

/** Chips for a list of names: the first `max`, then "+N". */
export function Chips({ names, max }: { names: string[]; max: number }) {
  if (names.length === 0) return <span className="text-sm text-muted-foreground">—</span>;
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;
  return (
    <div className="flex max-w-xs flex-wrap gap-1.5" title={names.join(', ')}>
      {shown.map((n, i) => (
        <span key={`${n}-${i}`} className="inline-flex max-w-[180px] items-center truncate rounded-md bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-accent-foreground">
          {n}
        </span>
      ))}
      {extra > 0 ? <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">+{extra}</span> : null}
    </div>
  );
}

/** Label + control stack used by the create / edit dialogs. */
export function Field({
  label, htmlFor, required, hint, className, children,
}: { label: string; htmlFor?: string; required?: boolean; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('min-w-0 space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label} {required ? <span className="text-destructive">*</span> : null}
      </label>
      {children}
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

// modal-maxh (app.css) = 78vh fallback + 85dvh where supported, so the body
// scrolls on phones too.
export const DIALOG_CLASS = 'modal-maxh flex flex-col gap-0 overflow-hidden p-0 [&>*]:min-w-0';
