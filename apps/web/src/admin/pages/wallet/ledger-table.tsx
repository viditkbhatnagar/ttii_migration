import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Search, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { nextSort, pageSlice, type SortDir } from '../cohorts/list-model.js';
import { FilterSelect, ListPager, PillTab, SortHead } from '../students/list-chrome.js';
import {
  PAGE_SIZE, filterLedger, filterOptions, isLedgerFiltered, sortLedger, statusPills,
  type LedgerQuery, type LedgerSpec,
} from './wallet-payment-model.js';

// The prototype's LedgerTable (WalletStatusModule): status pills with counts,
// "Search…" with a clear X, one "All …" select per filter, every column
// sortable, 8 rows a page, "Showing X of Y entries". Mount it with a `key` per
// tab so each tab starts fresh, as the prototype does.

export interface LedgerColumn<T> {
  key: string;
  label: string;
  align?: 'right';
  sortValue: (row: T) => string | number;
  render: (row: T) => ReactNode;
  cellClassName?: string;
}

export interface LedgerTableProps<T> {
  rows: T[];
  rowKey: (row: T) => string;
  columns: Array<LedgerColumn<T>>;
  statuses: string[];
  spec: LedgerSpec<T>;
  defaultSort: { key: string; dir: SortDir };
  /** Opening status pill ('' = All) — the dashboard deep-links "Pending". */
  initialStatus?: string;
  /** An extra, unsortable last column (Approve / Reject on top-ups). */
  action?: { label: string; render: (row: T) => ReactNode };
  searchLabel: string;
  /** Shown when the tab has no rows at all. */
  emptyTitle: string;
}

export function LedgerTable<T>({
  rows, rowKey, columns, statuses, spec, defaultSort, initialStatus = '', action, searchLabel, emptyTitle,
}: LedgerTableProps<T>) {
  const [query, setQuery] = useState<LedgerQuery>({ status: initialStatus, search: '', filters: {} });
  const [sort, setSort] = useState(defaultSort);
  const [page, setPage] = useState(1);

  const pills = useMemo(() => statusPills(rows, statuses, spec.statusOf), [rows, statuses, spec]);
  const options = useMemo(() => spec.filters.map((f) => filterOptions(rows, f.valueOf)), [rows, spec]);
  const filtered = useMemo(() => {
    const list = filterLedger(rows, query, spec);
    const column = columns.find((c) => c.key === sort.key);
    return column ? sortLedger(list, column.sortValue, sort.dir) : list;
  }, [rows, query, spec, columns, sort]);
  const { current, pages, page: safePage } = pageSlice(filtered, page, PAGE_SIZE);
  useEffect(() => { if (page !== safePage) setPage(safePage); }, [page, safePage]);

  const update = (patch: Partial<LedgerQuery>) => { setQuery((q) => ({ ...q, ...patch })); setPage(1); };
  const reset = () => { setQuery({ status: '', search: '', filters: {} }); setPage(1); };
  const span = columns.length + 1 + (action ? 1 : 0);

  return (
    <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
      <div role="group" aria-label="Status" className="flex flex-wrap gap-2 border-b border-border p-4">
        <PillTab active={query.status === ''} label="All" count={rows.length} onClick={() => update({ status: '' })} />
        {pills.map((p) => (
          <PillTab key={p.status} active={query.status === p.status} label={p.status} count={p.count} onClick={() => update({ status: p.status })} />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
        <div className="relative w-full sm:w-72">
          <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label={searchLabel}
            placeholder="Search…"
            className="pl-9 pr-9"
            value={query.search}
            onChange={(e) => update({ search: e.target.value })}
          />
          {isLedgerFiltered(query) ? (
            <button
              type="button"
              onClick={reset}
              aria-label="Clear search and filters"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          ) : null}
        </div>
        {spec.filters.map((f, i) => (
          <FilterSelect
            key={f.key}
            label={f.label}
            value={query.filters[f.key] ?? ''}
            onChange={(v) => update({ filters: { ...query.filters, [f.key]: v } })}
            allLabel={`All ${f.label}`}
            options={options[i] ?? []}
            className="w-full sm:w-48"
          />
        ))}
      </div>

      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="w-10 text-xs">#</TableHead>
            {columns.map((c) => (
              <SortHead
                key={c.key}
                label={c.label}
                k={c.key}
                sortKey={sort.key}
                dir={sort.dir}
                onSort={(k) => setSort((s) => nextSort(s, k))}
                {...(c.align === 'right' ? { className: 'text-right' } : {})}
              />
            ))}
            {action ? <TableHead className="text-right text-xs">{action.label}</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {current.length === 0 ? (
            <TableRow>
              <TableCell colSpan={span} className="py-12 text-center text-sm text-muted-foreground">
                {rows.length === 0 ? emptyTitle : 'No records match your filters.'}
              </TableCell>
            </TableRow>
          ) : current.map((r, i) => (
            <TableRow key={rowKey(r)} className="hover:bg-muted/30">
              <TableCell className="text-xs text-muted-foreground">{(safePage - 1) * PAGE_SIZE + i + 1}</TableCell>
              {columns.map((c) => (
                <TableCell
                  key={c.key}
                  className={cn('whitespace-nowrap text-sm', c.align === 'right' && 'text-right font-medium tabular-nums', c.cellClassName)}
                >
                  {c.render(r)}
                </TableCell>
              ))}
              {action ? <TableCell className="text-right">{action.render(r)}</TableCell> : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <ListPager page={safePage} pages={pages} shown={current.length} total={filtered.length} noun="entries" onPage={setPage} />
    </Card>
  );
}
