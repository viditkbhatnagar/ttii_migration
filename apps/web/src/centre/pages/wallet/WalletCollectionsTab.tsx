import { useMemo, useState } from 'react';
import { Download, Eye, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { downloadCsv, toCsv } from '@/lib/csv';
import { cn } from '@/lib/utils';
import { FilterSelect } from '../kit/FilterSelect.js';
import { fmtDay, initials, inr, istToday } from '../kit/format.js';
import { PaginationBar } from '../kit/page-kit.js';
import { usePagination } from '../kit/use-pagination.js';
import {
  COLLECTION_STATUS_LABEL, COLLECTION_STATUS_STYLE, DUE_RANGES, EMPTY_COLLECTION_FILTERS, collectionCourses, collectionRef,
  filterCollections, paidPct, type CollectionFilters, type CollectionRow, type CollectionStatus, type DueRange,
} from './wallet-model.js';

const STATUS_OPTIONS: ReadonlyArray<{ value: CollectionStatus; label: string }> = (
  ['paid', 'partial', 'pending', 'overdue', 'no_plan'] as const
).map((s) => ({ value: s, label: COLLECTION_STATUS_LABEL[s] }));

interface WalletCollectionsTabProps {
  rows: CollectionRow[];
  onView: (key: string) => void;
}

/** Student Fee Collections: one row per centre application or student, fee / paid / balance from Payment Status. */
export function WalletCollectionsTab({ rows, onView }: WalletCollectionsTabProps) {
  const [filters, setFilters] = useState<CollectionFilters>(EMPTY_COLLECTION_FILTERS);
  const today = istToday();
  const filtered = useMemo(() => filterCollections(rows, filters, today), [rows, filters, today]);
  const courses = useMemo(() => collectionCourses(rows), [rows]);
  const pg = usePagination(filtered, 10, JSON.stringify(filters));

  const exportCsv = () => {
    downloadCsv(`fee-collections-${today}.csv`, toCsv([
      ['Student', 'Student ID / Application', 'Course', 'Total Fee', 'Paid', 'Pending', 'Overdue', 'Next Due', 'Status'],
      ...filtered.map((r) => [r.studentName, collectionRef(r), r.course, r.fee, r.paid, r.balance, r.overdue, r.nextDueYmd, COLLECTION_STATUS_LABEL[r.status]]),
    ]));
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="relative flex-1">
            <label htmlFor="collections-search" className="sr-only">Search students</label>
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input id="collections-search" className="pl-9" placeholder="Search by name, student ID or application ID…" value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:flex">
            <FilterSelect label="Status" allLabel="All statuses" value={filters.status} options={STATUS_OPTIONS} className="lg:w-36"
              onChange={(v) => setFilters({ ...filters, status: v as CollectionFilters['status'] })} />
            <FilterSelect label="Course" allLabel="All courses" value={filters.course} options={courses.map((c) => ({ value: c, label: c }))} className="lg:w-52"
              onChange={(v) => setFilters({ ...filters, course: v })} />
            <FilterSelect label="Due date" value={filters.due} options={DUE_RANGES} className="lg:w-40"
              onChange={(v) => setFilters({ ...filters, due: v as DueRange })} />
          </div>
        </div>
      </Card>

      <Card className="gap-0 overflow-hidden p-0 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div>
            <p className="text-sm font-semibold">Student Fee Collections</p>
            <p className="text-xs text-muted-foreground">{filtered.length} of {rows.length} records</p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" disabled={filtered.length === 0} onClick={exportCsv}>
            <Download className="h-4 w-4" /> Export
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Student</TableHead>
              <TableHead>Course</TableHead>
              <TableHead className="text-right">Total Fee</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Pending</TableHead>
              <TableHead>Next Due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pg.current.map((r) => {
              const pct = paidPct(r.fee, r.paid);
              return (
                <TableRow key={r.key} className="group cursor-pointer" onClick={() => onView(r.key)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                        {initials(r.studentName)}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-tight group-hover:text-primary">{r.studentName || '—'}</p>
                        <p className="text-xs text-muted-foreground">{collectionRef(r)}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-56 text-sm">{r.course || '—'}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{inr(r.fee)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-sm font-medium tabular-nums text-success">{inr(r.paid)}</span>
                      <div className="h-1 w-20 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                        <div className="h-full bg-success" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className={cn('text-right font-medium tabular-nums', r.balance > 0 ? 'text-destructive' : 'text-muted-foreground')}>{inr(r.balance)}</TableCell>
                  <TableCell className="text-sm">{fmtDay(r.nextDueYmd)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn('rounded-full', COLLECTION_STATUS_STYLE[r.status])}>{COLLECTION_STATUS_LABEL[r.status]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`View payments of ${r.studentName}`}
                      onClick={(e) => { e.stopPropagation(); onView(r.key); }}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                  {rows.length === 0 ? 'No fee collections yet — your centre has no applications or students with a fee plan.' : 'No payments match the filters.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <PaginationBar page={pg.page} totalPages={pg.totalPages} showing={pg.current.length} total={pg.total} onPage={pg.setPage} unit="records" />
      </Card>
    </div>
  );
}
