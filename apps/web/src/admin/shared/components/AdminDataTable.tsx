import { useMemo, useState } from 'react';
import { ArrowUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download, MoreHorizontal, Printer, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface DataTableColumn<T = Record<string, unknown>> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
  className?: string;
}

export interface DataTableAction {
  label: string;
  onClick: (row: Record<string, unknown>, index: number) => void;
  variant?: 'default' | 'destructive';
}

interface AdminDataTableProps {
  columns: DataTableColumn[];
  rows: Record<string, unknown>[];
  actions?: DataTableAction[];
  searchable?: boolean;
  exportable?: boolean;
  pageSize?: number;
  onRowClick?: (row: Record<string, unknown>, index: number) => void;
}

function exportToCSV(columns: DataTableColumn[], rows: Record<string, unknown>[]) {
  const headers = columns.map((col) => col.label).join(',');
  const body = rows
    .map((row) =>
      columns
        .map((col) => {
          const val = row[col.key];
          const str = val == null ? '' : String(val);
          return `"${str.replace(/"/g, '""')}"`;
        })
        .join(','),
    )
    .join('\n');
  const csv = `${headers}\n${body}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'export.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export function AdminDataTable({
  columns,
  rows,
  actions,
  searchable = true,
  exportable = true,
  pageSize = 10,
  onRowClick,
}: AdminDataTableProps) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((row) =>
      columns.some((col) => {
        const val = row[col.key];
        return val != null && String(val).toLowerCase().includes(q);
      }),
    );
  }, [rows, search, columns]);

  const sortedRows = useMemo(() => {
    if (!sortKey) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      const aStr = aVal == null ? '' : String(aVal);
      const bStr = bVal == null ? '' : String(bVal);
      const cmp = aStr.localeCompare(bStr, undefined, { numeric: true, sensitivity: 'base' });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredRows, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pagedRows = sortedRows.slice(safePage * pageSize, (safePage + 1) * pageSize);
  const showFrom = sortedRows.length > 0 ? safePage * pageSize + 1 : 0;
  const showTo = Math.min((safePage + 1) * pageSize, sortedRows.length);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(0);
  };

  return (
    <Card>
      <CardContent className="p-0">
        {/* Top bar: exports + search */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
          {exportable ? (
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => exportToCSV(columns, filteredRows)}>
                <Download className="size-3" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => exportToCSV(columns, filteredRows)}>
                <Download className="size-3" />
                Export Excel
              </Button>
              <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => window.print()}>
                <Printer className="size-3" />
                Print
              </Button>
              <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => exportToCSV(columns, filteredRows)}>
                <Download className="size-3" />
                Export PDF
              </Button>
            </div>
          ) : <div />}
          {searchable ? (
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                placeholder="Search..."
                className="h-8 w-52 pl-8 text-xs"
              />
            </div>
          ) : null}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-ttii-table-header hover:bg-ttii-table-header">
                <TableHead className="w-12 text-center text-xs font-semibold text-ttii-primary">#</TableHead>
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    className={cn('text-xs font-semibold text-ttii-primary', col.className)}
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        className="flex items-center gap-1 hover:text-ttii-primary/80"
                        onClick={() => handleSort(col.key)}
                      >
                        {col.label}
                        <ArrowUpDown className="size-3" />
                      </button>
                    ) : (
                      col.label
                    )}
                  </TableHead>
                ))}
                {actions && actions.length > 0 ? (
                  <TableHead className="w-16 text-center text-xs font-semibold text-ttii-primary">Action</TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + (actions ? 2 : 1)} className="py-8 text-center text-sm text-gray-400">
                    No data available in table
                  </TableCell>
                </TableRow>
              ) : (
                pagedRows.map((row, idx) => {
                  const globalIdx = safePage * pageSize + idx;
                  return (
                    <TableRow
                      key={globalIdx}
                      className={cn(onRowClick && 'cursor-pointer hover:bg-gray-50')}
                      onClick={onRowClick ? () => onRowClick(row, globalIdx) : undefined}
                    >
                      <TableCell className="text-center text-xs text-gray-500">{globalIdx + 1}</TableCell>
                      {columns.map((col) => (
                        <TableCell key={col.key} className={cn('text-sm', col.className)}>
                          {col.render ? col.render(row[col.key], row, globalIdx) : (row[col.key] != null ? String(row[col.key]) : '')}
                        </TableCell>
                      ))}
                      {actions && actions.length > 0 ? (
                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-7">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {actions.map((action) => (
                                <DropdownMenuItem
                                  key={action.label}
                                  onClick={(e) => { e.stopPropagation(); action.onClick(row, globalIdx); }}
                                  className={action.variant === 'destructive' ? 'text-destructive' : ''}
                                >
                                  {action.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
          <p className="text-xs text-gray-500">
            Showing {showFrom} to {showTo} of {sortedRows.length} entries
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-7 text-xs" disabled={safePage === 0} onClick={() => setPage(0)}>
              <ChevronsLeft className="size-3" />
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs" disabled={safePage === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
              <ChevronLeft className="size-3" />
            </Button>
            <span className="rounded-md bg-ttii-primary px-2.5 py-0.5 text-xs font-medium text-white">{safePage + 1}</span>
            <Button variant="outline" size="sm" className="h-7 text-xs" disabled={safePage >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}>
              <ChevronRight className="size-3" />
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs" disabled={safePage >= totalPages - 1} onClick={() => setPage(totalPages - 1)}>
              <ChevronsRight className="size-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
