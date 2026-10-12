import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Download, ExternalLink, MoreHorizontal, Search, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/page-loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useConfirm } from '@/components/confirm-dialog';
import { downloadCsv, toCsv } from '@/lib/csv';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString } from '../../shared/utils/admin-data-utils.js';
import { EmptyState } from '../../shared/components/ui-kit.js';
import { FilterSelect, ListPager, PillTab, SortHead } from '../students/list-chrome.js';
import { dmy, pageSlice } from '../cohorts/list-model.js';
import { FEE_PAGE_SIZE, capitalise, distinct, rowNo, statusCounts, type SortDir } from './fee-model.js';
import {
  EMPTY_APPROVAL_FILTERS, approvalAmount, approvalCsvRows, filterApprovals, istDate, sortApprovals, toApprovalRows,
  type ApprovalFilters, type ApprovalRow, type ApprovalSortKey,
} from './payment-model.js';
import { ApprovalDetailsDialog, RejectPaymentDialog } from './ApprovalDialogs.js';

// Fee Information → Payment Approval, rebuilt after Naji's PaymentApprovalModule
// (TTII 2026-10-12). Finance's queue for manually recorded payments; Razorpay
// payments never appear here (they reflect via the webhook). Approve / Reject
// keep their exact calls, payloads, confirmation and server-message toasts:
// approving flips that instalment (and, for the registration, the application)
// to paid and notifies the student; rejecting sends it back.

const MODE_ORDER = ['Bank Transfer', 'UPI', 'Cash', 'Cheque'];

export default function PaymentApprovalPage({ api, session }: AdminPageProps) {
  const confirm = useConfirm();
  const [filters, setFilters] = useState<ApprovalFilters>(EMPTY_APPROVAL_FILTERS);
  const [sortKey, setSortKey] = useState<ApprovalSortKey>('recorded');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<ApprovalRow | null>(null);
  const [rejecting, setRejecting] = useState<ApprovalRow | null>(null);
  const [rejectBusy, setRejectBusy] = useState(false);

  const { data, loading, error, reload } = useAdminPageData(
    () => api.listPaymentApprovals(session.token),
    [api, session.token],
  );

  const rows = useMemo(() => toApprovalRows(data ?? []), [data]);
  const pills = useMemo(() => statusCounts(rows.map((r) => r.mode), MODE_ORDER), [rows]);
  const courses = useMemo(() => distinct(rows.map((r) => r.course)), [rows]);
  const filtered = useMemo(
    () => sortApprovals(filterApprovals(rows, filters), sortKey, sortDir),
    [rows, filters, sortKey, sortDir],
  );
  const { current, pages, page: shownPage } = pageSlice(filtered, page, FEE_PAGE_SIZE);
  useEffect(() => { if (page !== shownPage) setPage(shownPage); }, [page, shownPage]);

  const set = (patch: Partial<ApprovalFilters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };
  const reset = () => { setFilters(EMPTY_APPROVAL_FILTERS); setPage(1); };
  const onSort = (k: ApprovalSortKey) => {
    if (k === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir('asc'); }
  };

  const handleApprove = useCallback(async (row: ApprovalRow) => {
    const ok = await confirm({
      title: `Approve payment for ${row.name || 'this student'}?`,
      description: 'This confirms the manual payment and reflects it to the student (marks the application paid + sends confirmation).',
      confirmText: 'Approve',
    });
    if (!ok) return;
    try {
      const res = await api.approvePayment(session.token, row.id);
      const m = asString((res as { message?: unknown }).message);
      if ((res as { status?: number }).status === 1) { toast.success(m || 'Payment approved'); reload(); }
      else toast.error(m || 'Could not approve.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not approve.');
    }
  }, [api, session.token, confirm, reload]);

  const handleReject = useCallback(async (reason: string) => {
    if (!rejecting) return;
    setRejectBusy(true);
    try {
      const res = await api.rejectPayment(session.token, rejecting.id, reason);
      const m = asString((res as { message?: unknown }).message);
      if ((res as { status?: number }).status === 1) { toast.success(m || 'Payment rejected'); setRejecting(null); reload(); }
      else toast.error(m || 'Could not reject.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not reject.');
    } finally {
      setRejectBusy(false);
    }
  }, [api, session.token, rejecting, reload]);

  if (loading && !data) return <PageLoader label="Loading payment approvals..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="inline-flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
            <ShieldCheck aria-hidden="true" className="size-6 text-primary" />
            Payment Approval
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length} of {rows.length} payments · Review manual payments before they reflect to students. Razorpay payments are approved automatically.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 self-start sm:self-auto"
          disabled={filtered.length === 0}
          onClick={() => downloadCsv('payment_approvals.csv', toCsv(approvalCsvRows(filtered)))}
        >
          <Download aria-hidden="true" className="size-4" /> Export
        </Button>
      </div>

      {error && !data ? (
        <Card>
          <CardContent role="alert" className="py-8 text-center text-sm text-red-600">
            {error}
            <div className="mt-4"><Button variant="outline" onClick={reload}>Retry</Button></div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div role="group" aria-label="Payment mode" className="flex flex-wrap gap-2">
            {pills.map((p) => (
              <PillTab key={p.id} active={filters.mode === p.id} label={p.id === 'all' ? 'All' : capitalise(p.id)} count={p.count} onClick={() => set({ mode: p.id })} />
            ))}
          </div>

          <Card className="gap-0 border-border/70 p-4 shadow-[var(--shadow-soft)]">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_240px_auto]">
              <div className="relative">
                <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input aria-label="Search payments" placeholder="Search by student, course, reference or instalment…" className="pl-9" value={filters.search} onChange={(e) => set({ search: e.target.value })} />
              </div>
              <FilterSelect label="Course" value={filters.course} onChange={(v) => set({ course: v })} allLabel="All Courses" options={courses.map((c) => ({ value: c, label: c }))} />
              <div className="flex items-center justify-end">
                <Button variant="ghost" size="sm" onClick={reset}>Reset filters</Button>
              </div>
            </div>
          </Card>

          <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
            {current.length === 0 ? (
              <EmptyState
                icon={ShieldCheck}
                title={rows.length === 0 ? 'No payments awaiting approval.' : 'No payments match your filters.'}
                {...(rows.length === 0 ? {} : { action: <Button variant="outline" size="sm" onClick={reset}>Reset filters</Button> })}
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="w-10 text-xs">#</TableHead>
                      <SortHead label="Student" k="name" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                      <SortHead label="Course" k="course" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                      <SortHead label="Instalment" k="instalment" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                      <SortHead label="Amount" k="amount" sortKey={sortKey} dir={sortDir} onSort={onSort} className="text-right" />
                      <SortHead label="Date of Payment" k="paidDate" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                      <SortHead label="Mode" k="mode" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                      <SortHead label="Reference" k="reference" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                      <TableHead className="text-xs">Receipt</TableHead>
                      <SortHead label="Recorded" k="recorded" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                      <TableHead className="text-right text-xs">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {current.map((r, i) => (
                      <TableRow key={r.id} className="hover:bg-muted/30">
                        <TableCell className="text-xs text-muted-foreground">{rowNo(shownPage, FEE_PAGE_SIZE, i)}</TableCell>
                        <TableCell className="text-sm font-medium">{r.name || '—'}</TableCell>
                        <TableCell className="max-w-[220px] text-sm">{r.course || '—'}</TableCell>
                        <TableCell className="text-sm">{r.instalment || '—'}</TableCell>
                        <TableCell className="whitespace-nowrap text-right text-sm tabular-nums">{approvalAmount(r.amount)}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{dmy(r.paidYmd) || '—'}</TableCell>
                        <TableCell className="text-sm">{r.mode || '—'}</TableCell>
                        <TableCell className="max-w-[180px] break-all text-sm text-muted-foreground">{r.reference || '—'}</TableCell>
                        <TableCell>
                          {r.receiptUrl ? (
                            <a href={r.receiptUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                              View <ExternalLink className="size-3" aria-hidden="true" />
                            </a>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{istDate(r.markedAt) || '—'}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="size-8" aria-label={`Actions for ${r.name || 'payment'}`}>
                                <MoreHorizontal aria-hidden="true" className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem onClick={() => setViewing(r)}>View Details</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => { void handleApprove(r); }}>Approve</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setRejecting(r)}>Reject</DropdownMenuItem>
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
        </>
      )}

      <ApprovalDetailsDialog
        row={viewing}
        onClose={() => setViewing(null)}
        onApprove={(r) => { void handleApprove(r); }}
        onReject={(r) => setRejecting(r)}
      />
      <RejectPaymentDialog row={rejecting} busy={rejectBusy} onCancel={() => setRejecting(null)} onConfirm={(reason) => { void handleReject(reason); }} />
    </div>
  );
}
