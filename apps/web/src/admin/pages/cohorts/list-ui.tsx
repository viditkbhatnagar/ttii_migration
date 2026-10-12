import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { SortDir } from './list-model.js';

// List building blocks for the Cohorts-management screens rebuilt in Naji's
// design (Cohorts, Live Sessions, Assignment Summary, Assignment Evaluation):
// pill tabs with counts, sortable headers, the Prev/Next footer and the export
// buttons. Same look as the rebuilt Exams list.

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
}: { label: string; k: K; sortKey: K; dir: SortDir; onSort: (k: K) => void; className?: string }) {
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

export function Pager({
  page, pages, shown, total, noun, onPage,
}: { page: number; pages: number; shown: number; total: number; noun: string; onPage: (p: number) => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border p-4 print:hidden">
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

/** Export CSV + Print (the browser's print dialog also saves as PDF). */
export function ExportButtons({ onCsv, csvLabel = 'Export CSV', disabled }: { onCsv: () => void; csvLabel?: string; disabled?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" disabled={disabled} onClick={onCsv}>
        <Download aria-hidden="true" className="size-3.5" /> {csvLabel}
      </Button>
      <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => window.print()} title="Print, or choose Save as PDF in the print window">
        <Printer aria-hidden="true" className="size-3.5" /> Print / PDF
      </Button>
    </div>
  );
}
