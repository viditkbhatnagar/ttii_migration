import { useMemo, useState, type ReactNode } from 'react';
import { Download, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { downloadCsv, toCsv } from '@/lib/csv';
import { nextSort, pageSlice, sortRows, type SortDir } from '../cohorts/list-model.js';
import { FilterSelect, ListPager, SortHead } from '../students/list-chrome.js';

// The table every Credential Manager screen shares (Naji's DataTable): search,
// a per-column filter under each header, sortable headers, 10 rows a page and a
// CSV export of the filtered rows. Columns say how to read a row (`value`, used
// to sort / filter / export) and how to draw it (`render`).

export interface CredColumn<T> {
  key: string;
  label: string;
  value: (row: T) => string | number;
  render?: (row: T) => ReactNode;
  /** Show a filter select under the header (only worthwhile for low-cardinality columns). */
  filter?: boolean;
  /** Text shown in the export and the filter instead of `value` (e.g. a formatted date). */
  text?: (row: T) => string;
  className?: string;
}

interface CredTableProps<T> {
  columns: Array<CredColumn<T>>;
  rows: T[];
  rowKey: (row: T) => string | number;
  empty: string;
  searchPlaceholder?: string;
  pageSize?: number;
  /** A file name (without extension) turns on the Export button. */
  exportName?: string;
  /** Hide the export without hiding the table (no reports permission). */
  canExport?: boolean;
  toolbar?: ReactNode;
  defaultSort?: { key: string; dir: SortDir };
  noun?: string;
  onRowClick?: (row: T) => void;
}

const FILTER_OPTION_LIMIT = 60;

export function CredTable<T>({
  columns, rows, rowKey, empty, searchPlaceholder = 'Search', pageSize = 10, exportName, canExport = true, toolbar, defaultSort, noun = 'rows', onRowClick,
}: CredTableProps<T>) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<{ key: string; dir: SortDir }>(defaultSort ?? { key: '', dir: 'asc' });
  const [page, setPage] = useState(1);

  const textOf = (c: CredColumn<T>, row: T): string => (c.text ? c.text(row) : String(c.value(row)));
  const filterable = columns.filter((c) => c.filter);
  const options = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const c of filterable) {
      const set = new Set<string>();
      for (const row of rows) set.add(c.text ? c.text(row) : String(c.value(row)));
      out[c.key] = [...set].filter(Boolean).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).slice(0, FILTER_OPTION_LIMIT);
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, columns]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = rows.filter((row) => {
      for (const c of filterable) {
        const wanted = filters[c.key];
        if (wanted && textOf(c, row) !== wanted) return false;
      }
      return !q || columns.some((c) => textOf(c, row).toLowerCase().includes(q));
    });
    const sortCol = columns.find((c) => c.key === sort.key);
    if (sortCol) out = sortRows(out, sortCol.value, sort.dir);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, columns, query, filters, sort]);

  const view = pageSlice(filtered, page, pageSize);
  const anyFilter = Boolean(query) || Object.values(filters).some(Boolean);

  const exportRows = (): void => {
    const header = columns.map((c) => c.label);
    const body = filtered.map((row) => columns.map((c) => (c.text ? c.text(row) : c.value(row))));
    downloadCsv(`${exportName ?? 'export'}.csv`, toCsv([header, ...body]));
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
        <div className="relative min-w-[12rem] flex-1">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Search" placeholder={searchPlaceholder} value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} className="h-9 pl-9" />
        </div>
        {toolbar}
        {anyFilter ? (
          <Button variant="ghost" size="sm" onClick={() => { setQuery(''); setFilters({}); setPage(1); }}>Reset filters</Button>
        ) : null}
        {exportName && canExport ? (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={exportRows} disabled={filtered.length === 0}>
            <Download aria-hidden="true" className="size-4" /> Export
          </Button>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <SortHead key={c.key} label={c.label} k={c.key} sortKey={sort.key} dir={sort.dir} onSort={(k) => { setSort((s) => nextSort(s, k)); setPage(1); }} {...(c.className ? { className: c.className } : {})} />
              ))}
            </TableRow>
            {filterable.length > 0 ? (
              <TableRow className="hover:bg-transparent">
                {columns.map((c) => (
                  <TableCell key={c.key} className="py-1.5">
                    {c.filter ? (
                      <FilterSelect
                        label={`Filter ${c.label}`} value={filters[c.key] ?? ''} allLabel="All"
                        onChange={(v) => { setFilters((f) => ({ ...f, [c.key]: v })); setPage(1); }}
                        options={(options[c.key] ?? []).map((o) => ({ value: o, label: o }))} className="h-8 w-full text-xs"
                      />
                    ) : null}
                  </TableCell>
                ))}
              </TableRow>
            ) : null}
          </TableHeader>
          <TableBody>
            {view.current.length === 0 ? (
              <TableRow><TableCell colSpan={columns.length} className="py-12 text-center text-sm text-muted-foreground">{empty}</TableCell></TableRow>
            ) : view.current.map((row) => (
              <TableRow key={rowKey(row)} onClick={onRowClick ? () => onRowClick(row) : undefined} className={onRowClick ? 'cursor-pointer' : undefined}>
                {columns.map((c) => (
                  <TableCell key={c.key} className={c.className ?? 'text-sm'}>{c.render ? c.render(row) : textOf(c, row)}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ListPager page={view.page} pages={view.pages} shown={view.current.length} total={filtered.length} noun={noun} onPage={setPage} />
    </div>
  );
}
