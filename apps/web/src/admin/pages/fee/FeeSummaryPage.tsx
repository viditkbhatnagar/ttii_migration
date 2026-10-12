import { useEffect, useMemo, useState } from 'react';
import { Download, MoreHorizontal, Search, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/page-loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { downloadCsv, toCsv } from '@/lib/csv';
import { cn } from '@/lib/utils';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { EmptyState, PageTitle, Pill, type Tone } from '../../shared/components/ui-kit.js';
import { FilterSelect, ListPager, PillTab, SortHead } from '../students/list-chrome.js';
import { pageSlice } from '../cohorts/list-model.js';
import {
  EMPTY_FEE_SUMMARY_FILTERS, FEE_PAGE_SIZE, distinct, feeSummaryCsvRows, feeSummaryTotals, filterFeeSummary,
  inr, rowNo, sortFeeSummary, statusCounts, toFeeSummaryRows,
  type FeeState, type FeeSummaryFilters, type FeeSummaryRow, type FeeSummarySortKey, type SortDir,
} from './fee-model.js';
import { DetailGrid, SummaryCard } from './fee-ui.js';

// Fee Information → Fee Summary, rebuilt after Naji's FeeSummaryModule
// (TTII 2026-10-12): totals cards, course-status pills, a filter card and a
// sortable, paged table of every enrolment with its fee breakdown — all from
// /admin/fee_management/fee_summary, unchanged. Whole-rupee format as before.
// Kept from the old page: the Has Balance / Has Due / Fully Cleared filter and
// "View Student". Naji's "Send Payment Reminder" is not offered here: there is
// no enrolment-level reminder endpoint (reminders are per instalment, on
// Payment Status).

const STATUS_ORDER = ['Active', 'On Hold', 'Completed', 'Graduated', 'Inactive', 'Dropout'];
const STATUS_TONE: Record<string, Tone> = {
  active: 'emerald', 'on hold': 'amber', completed: 'blue', graduated: 'blue', inactive: 'slate', dropout: 'rose',
};
const FEE_STATES: Array<{ value: FeeState; label: string }> = [
  { value: 'has_balance', label: 'Has Balance' },
  { value: 'has_due', label: 'Has Due (Overdue)' },
  { value: 'cleared', label: 'Fully Cleared' },
];
const rupees = (n: number) => inr(n, 0);

export default function FeeSummaryPage({ api, session, onNavigate }: AdminPageProps) {
  const [filters, setFilters] = useState<FeeSummaryFilters>(EMPTY_FEE_SUMMARY_FILTERS);
  const [sortKey, setSortKey] = useState<FeeSummarySortKey>('enrollmentId');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<FeeSummaryRow | null>(null);

  const { data, loading, error, reload } = useAdminPageData(() => api.listFeeSummary(session.token), []);

  const rows = useMemo(() => toFeeSummaryRows(data ?? []), [data]);
  const totals = useMemo(() => feeSummaryTotals(rows), [rows]);
  const pills = useMemo(() => statusCounts(rows.map((r) => r.status), STATUS_ORDER), [rows]);
  const options = useMemo(() => ({
    course: distinct(rows.map((r) => r.course)),
    offering: distinct(rows.filter((r) => !filters.course || r.course === filters.course).map((r) => r.offering)),
  }), [rows, filters.course]);
  const filtered = useMemo(
    () => sortFeeSummary(filterFeeSummary(rows, filters), sortKey, sortDir),
    [rows, filters, sortKey, sortDir],
  );
  const { current, pages, page: shownPage } = pageSlice(filtered, page, FEE_PAGE_SIZE);
  useEffect(() => { if (page !== shownPage) setPage(shownPage); }, [page, shownPage]);

  const set = (patch: Partial<FeeSummaryFilters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };
  const reset = () => { setFilters(EMPTY_FEE_SUMMARY_FILTERS); setPage(1); };
  const onSort = (k: FeeSummarySortKey) => {
    if (k === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir('asc'); }
  };
  const viewStudent = (r: FeeSummaryRow) => { if (r.userId) onNavigate(`/admin/students/view/${r.userId}`); };
  const asOptions = (list: string[]) => list.map((v) => ({ value: v, label: v }));

  if (loading && !data) return <PageLoader label="Loading fee summary..." />;
  if (error && !data) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-red-600">
          {error}
          <div className="mt-4"><Button variant="outline" onClick={reload}>Retry</Button></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageTitle
        title="Fee Summary"
        subtitle={`${filtered.length} of ${rows.length} enrolments`}
        actions={(
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={filtered.length === 0}
            onClick={() => downloadCsv('fee_summary.csv', toCsv(feeSummaryCsvRows(filtered)))}
          >
            <Download aria-hidden="true" className="size-4" /> Export
          </Button>
        )}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Total Course Fees" value={rupees(totals.fee)} caption={`${rows.length} enrolments`} tone="blue" />
        <SummaryCard label="Fee Paid" value={rupees(totals.paid)} caption="Across all enrolments" tone="emerald" />
        <SummaryCard label="Balance Fee" value={rupees(totals.balance)} caption="Total − Paid" tone="amber" />
        <SummaryCard label="Fee Due (Overdue)" value={rupees(totals.due)} caption="Past-due unpaid instalments" tone={totals.due > 0 ? 'rose' : 'slate'} />
      </div>

      <div role="group" aria-label="Course status" className="flex flex-wrap gap-2">
        {pills.map((p) => (
          <PillTab key={p.id} active={filters.status === p.id} label={p.id === 'all' ? 'All' : p.id} count={p.count} onClick={() => set({ status: p.id })} />
        ))}
      </div>

      <Card className="gap-0 border-border/70 p-4 shadow-[var(--shadow-soft)]">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_220px_220px_180px_auto]">
          <div className="relative">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search enrolments" placeholder="Enrollment ID, name, course, combination…" className="pl-9" value={filters.search} onChange={(e) => set({ search: e.target.value })} />
          </div>
          <FilterSelect label="Course" value={filters.course} onChange={(v) => set({ course: v, offering: '' })} allLabel="All Courses" options={asOptions(options.course)} />
          <FilterSelect label="Offering" value={filters.offering} onChange={(v) => set({ offering: v })} allLabel="All Offerings" options={asOptions(options.offering)} />
          <FilterSelect label="Fee" value={filters.feeState} onChange={(v) => set({ feeState: v as FeeState })} allLabel="All Fee States" options={FEE_STATES} />
          <div className="flex items-center justify-end">
            <Button variant="ghost" size="sm" onClick={reset}>Reset filters</Button>
          </div>
        </div>
      </Card>

      <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
        {current.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title={rows.length === 0 ? 'No enrolments yet.' : 'No enrolments match your filters.'}
            {...(rows.length === 0 ? {} : { action: <Button variant="outline" size="sm" onClick={reset}>Reset filters</Button> })}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-10 text-xs">#</TableHead>
                  <SortHead label="Enrollment ID" k="enrollmentId" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Student" k="name" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Course" k="course" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Offering" k="offering" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Combination" k="combination" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Course Fee (Inc GST)" k="fee" sortKey={sortKey} dir={sortDir} onSort={onSort} className="text-right" />
                  <SortHead label="Fee Paid" k="paid" sortKey={sortKey} dir={sortDir} onSort={onSort} className="text-right" />
                  <SortHead label="Balance Fee" k="balance" sortKey={sortKey} dir={sortDir} onSort={onSort} className="text-right" />
                  <SortHead label="Fee Due" k="due" sortKey={sortKey} dir={sortDir} onSort={onSort} className="text-right" />
                  <SortHead label="Course Status" k="status" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <TableHead className="text-right text-xs">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {current.map((r, i) => (
                  <TableRow key={r.id} className="hover:bg-muted/30">
                    <TableCell className="text-xs text-muted-foreground">{rowNo(shownPage, FEE_PAGE_SIZE, i)}</TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-xs text-primary">{r.enrollmentId || '—'}</TableCell>
                    <TableCell>
                      <p className="max-w-[200px] truncate text-sm font-semibold">{r.name || '—'}</p>
                      <p className="max-w-[200px] truncate text-[11px] text-muted-foreground">{r.email}</p>
                    </TableCell>
                    <TableCell className="max-w-[200px] text-sm">{r.course || '—'}</TableCell>
                    <TableCell className="max-w-[200px] text-sm text-muted-foreground">{r.offering || '—'}</TableCell>
                    <TableCell className="text-sm">{r.combination || '—'}</TableCell>
                    <TableCell className="whitespace-nowrap text-right text-sm font-medium tabular-nums">{rupees(r.fee)}</TableCell>
                    <TableCell className="whitespace-nowrap text-right text-sm tabular-nums text-emerald-700">{rupees(r.paid)}</TableCell>
                    <TableCell className={cn('whitespace-nowrap text-right text-sm tabular-nums', r.balance > 0 ? 'font-medium text-amber-700' : 'text-muted-foreground')}>{rupees(r.balance)}</TableCell>
                    <TableCell className={cn('whitespace-nowrap text-right text-sm tabular-nums', r.due > 0 ? 'font-medium text-rose-700' : 'text-muted-foreground')}>{rupees(r.due)}</TableCell>
                    <TableCell><Pill tone={STATUS_TONE[r.status.toLowerCase()] ?? 'slate'}>{r.status}</Pill></TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="size-8" aria-label={`Actions for ${r.name || 'enrolment'}`}>
                            <MoreHorizontal aria-hidden="true" className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => setDetail(r)}>View Fee Details</DropdownMenuItem>
                          <DropdownMenuItem disabled={!r.userId} onClick={() => viewStudent(r)}>View Student</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <ListPager page={shownPage} pages={pages} shown={current.length} total={filtered.length} noun="entries" onPage={setPage} />
      </Card>

      <Dialog open={detail !== null} onOpenChange={(o) => { if (!o) setDetail(null); }}>
        <DialogContent
          style={{ width: 'min(560px, calc(100vw - 2rem))', maxWidth: 'min(560px, calc(100vw - 2rem))' }}
          className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 [&>*]:min-w-0"
        >
          <DialogHeader className="shrink-0 border-b border-border px-6 pb-4 pt-6">
            <DialogTitle>{detail?.name || 'Fee details'}</DialogTitle>
            <DialogDescription>{[detail?.enrollmentId, detail?.email].filter(Boolean).join(' · ')}</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            {detail ? (
              <DetailGrid
                items={[
                  ['Course', detail.course],
                  ['Offering', detail.offering],
                  ['Combination', detail.combination],
                  ['Course Status', detail.status],
                  ['Course Fee (Inc GST)', rupees(detail.fee)],
                  ['Fee Paid', rupees(detail.paid)],
                  ['Balance Fee', rupees(detail.balance)],
                  ['Fee Due (Overdue)', rupees(detail.due)],
                ]}
              />
            ) : null}
          </div>
          <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
            <Button variant="outline" onClick={() => setDetail(null)}>Close</Button>
            {detail?.userId ? <Button onClick={() => { const r = detail; setDetail(null); viewStudent(r); }}>View Student</Button> : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
