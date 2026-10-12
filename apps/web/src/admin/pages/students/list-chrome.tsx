import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils';

// Shared list chrome for the Students and Enrollments lists in Naji's design
// (StudentsModule / EnrollmentsModule): status pills with counts, sortable
// headers and the Prev / Next pager. Same look as the rebuilt Exams list.

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

export function SortHead<K extends string>({
  label, k, sortKey, dir, onSort, className,
}: { label: string; k: K; sortKey: K; dir: 'asc' | 'desc'; onSort: (k: K) => void; className?: string }) {
  const active = sortKey === k;
  const Icon = !active ? ArrowUpDown : dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <TableHead className={className} aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        onClick={() => onSort(k)}
        className={cn('inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium hover:text-foreground', active ? 'text-foreground' : 'text-muted-foreground')}
      >
        {label} <Icon aria-hidden="true" className="size-3" />
      </button>
    </TableHead>
  );
}

export function ListPager({
  page, pages, shown, total, noun, onPage,
}: { page: number; pages: number; shown: number; total: number; noun: string; onPage: (p: number) => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border p-4">
      <p className="text-xs text-muted-foreground">
        Showing <span className="font-medium text-foreground">{shown}</span> of{' '}
        <span className="font-medium text-foreground">{total}</span> {noun}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="gap-1" disabled={page <= 1} onClick={() => onPage(Math.max(1, page - 1))}>
          <ChevronLeft aria-hidden="true" className="size-4" /> Prev
        </Button>
        <span className="px-2 text-xs text-muted-foreground">Page {page} of {pages}</span>
        <Button variant="outline" size="sm" className="gap-1" disabled={page >= pages} onClick={() => onPage(Math.min(pages, page + 1))}>
          Next <ChevronRight aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </div>
  );
}

/** A labelled native select for the filter cards (keeps keyboard + mobile UX). */
export function FilterSelect({
  label, value, onChange, allLabel, options, className,
}: { label: string; value: string; onChange: (v: string) => void; allLabel: string; options: Array<{ value: string; label: string }>; className?: string }) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn('h-9 min-w-0 rounded-md border border-input bg-background px-3 text-sm', className)}
    >
      <option value="">{allLabel}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
