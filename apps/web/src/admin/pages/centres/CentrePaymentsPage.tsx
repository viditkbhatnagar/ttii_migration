import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Search, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/page-loader';
import { DmyDateInput } from '@/components/ui/dmy-date-field';
import { downloadCsv, toCsv } from '@/lib/csv';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, formatCurrency } from '../../shared/utils/admin-data-utils.js';
import { EmptyState, PageTitle } from '../../shared/components/ui-kit.js';
import { nextSort, pageSlice, type SortDir } from '../cohorts/list-model.js';
import { ExportButtons } from '../cohorts/list-ui.js';
import { FilterSelect, ListPager, PillTab } from '../students/list-chrome.js';
import {
  EMPTY_PAYMENT_FILTERS,
  alreadyStatusOf,
  withSettledStatus,
  filterFundRequests,
  filterWalletTxns,
  fundRequestCsvRows,
  sortFundRequests,
  sortWalletTxns,
  toFundRequestRows,
  toWalletTxnRows,
  walletTxnCsvRows,
  type FundRequestRow,
  type FundSortKey,
  type PaymentFilters,
  type WalletSortKey,
} from './centre-payments-model.js';
import { usePendingPatches } from './use-pending-patches.js';
import { FundDecisionDialog, FundRequestTable, WalletTxnTable, type FundDecision } from './centre-payments-tables.js';

// Centre Payments (TTII 2026-10-12), rebuilt after Naji's CentrePaymentsModule:
// date / status filter card, Fund Requests | Wallet Transactions tabs with
// counts, export + search toolbar, sortable paged tables. Approve / Reject keep
// the old endpoints, payload ({ id }) and confirmation wording; the confirm
// button stays disabled while the request runs (a double approve would credit
// the wallet twice — the server's status check sits outside its transaction).

const PAGE_SIZE = 8;
const FIELD_LABEL = 'text-[11px] font-medium text-muted-foreground';
type Tab = 'fund_requests' | 'wallet_transactions';

export default function CentrePaymentsPage({ api, session }: AdminPageProps) {
  const [filters, setFilters] = useState<PaymentFilters>(EMPTY_PAYMENT_FILTERS);
  const [tab, setTab] = useState<Tab>('fund_requests');
  const [page, setPage] = useState(1);
  const [fundSort, setFundSort] = useState<{ key: FundSortKey; dir: SortDir }>({ key: 'date', dir: 'desc' });
  const [walletSort, setWalletSort] = useState<{ key: WalletSortKey; dir: SortDir }>({ key: 'date', dir: 'desc' });
  const [decision, setDecision] = useState<FundDecision | null>(null);
  const [processing, setProcessing] = useState(false);

  const { data, loading, error, reload } = useAdminPageData(
    async () => {
      const res = await api.loadAdminCentrePayments(session.token);
      return { fund: toFundRequestRows(res.fundRequests), wallet: toWalletTxnRows(res.walletTransactions) };
    },
    [],
    'admin:centres:payments',
  );

  // A decided request shows its new status (no buttons) at once; reload() only
  // revalidates in the background, and a live button there invited a duplicate.
  const settled = usePendingPatches<string>(data);
  const settledStatus = settled.get;
  const fund = useMemo(
    () => sortFundRequests(filterFundRequests(withSettledStatus(data?.fund ?? [], settledStatus), filters), fundSort.key, fundSort.dir),
    [data, settledStatus, filters, fundSort],
  );
  const wallet = useMemo(
    () => sortWalletTxns(filterWalletTxns(data?.wallet ?? [], filters), walletSort.key, walletSort.dir),
    [data, filters, walletSort],
  );
  const active: unknown[] = tab === 'fund_requests' ? fund : wallet;
  const { pages, page: safePage } = pageSlice(active, page, PAGE_SIZE);
  useEffect(() => { if (page !== safePage) setPage(safePage); }, [page, safePage]);
  const fundPage = pageSlice(fund, safePage, PAGE_SIZE).current;
  const walletPage = pageSlice(wallet, safePage, PAGE_SIZE).current;
  const shown = tab === 'fund_requests' ? fundPage.length : walletPage.length;

  const set = (patch: Partial<PaymentFilters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };
  const reset = () => { setFilters(EMPTY_PAYMENT_FILTERS); setPage(1); };

  const exportCsv = () => {
    if (tab === 'fund_requests') downloadCsv('centre-fund-requests.csv', toCsv(fundRequestCsvRows(fund)));
    else downloadCsv('centre-wallet-transactions.csv', toCsv(walletTxnCsvRows(wallet)));
  };

  const ask = (row: FundRequestRow, action: FundDecision['action']) => { if (!processing) setDecision({ row, action }); };

  const confirmDecision = async () => {
    if (!decision || processing) return;
    setProcessing(true);
    try {
      const { row, action } = decision;
      const res = action === 'approve'
        ? await api.approveFundRequest(session.token, row.id)
        : await api.rejectFundRequest(session.token, row.id);
      const message = asString(res.message);
      if (res.status === 0) {
        toast.error(message || `Could not ${action} the fund request.`);
        const current = alreadyStatusOf(message);
        if (current) settled.set(row.id, current);
      } else {
        toast.success(message || (action === 'approve' ? 'Fund request approved.' : 'Fund request rejected.'));
        settled.set(row.id, action === 'approve' ? 'approved' : 'rejected');
      }
      setDecision(null);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Could not ${decision.action} the fund request.`);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <PageLoader label="Loading centre payments..." />;
  if (error) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-destructive">
          {error}
          <div className="mt-4"><Button variant="outline" onClick={reload}>Retry</Button></div>
        </CardContent>
      </Card>
    );
  }

  const hasAny = (data?.fund.length ?? 0) + (data?.wallet.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <PageTitle title="Centre Payments" subtitle="Fund requests and wallet transactions across centres." />

      <Card className="gap-0 border-border/70 p-4 shadow-[var(--shadow-soft)]">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="min-w-0">
            <label htmlFor="cp-from" className={FIELD_LABEL}>From Date</label>
            <div className="mt-1"><DmyDateInput id="cp-from" value={filters.from} onChange={(v) => set({ from: v })} /></div>
          </div>
          <div className="min-w-0">
            <label htmlFor="cp-to" className={FIELD_LABEL}>To Date</label>
            <div className="mt-1"><DmyDateInput id="cp-to" value={filters.to} onChange={(v) => set({ to: v })} /></div>
          </div>
          <label className="block min-w-0">
            <span className={FIELD_LABEL}>Status</span>
            <FilterSelect
              label="Status"
              value={filters.status}
              onChange={(v) => set({ status: v as PaymentFilters['status'] })}
              allLabel="All Status"
              options={[
                { value: 'pending', label: 'Pending' },
                { value: 'approved', label: 'Approved' },
                { value: 'rejected', label: 'Rejected' },
              ]}
              className="mt-1 w-full"
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">Status applies to fund requests.</p>
          <Button size="sm" variant="ghost" onClick={reset}>Clear</Button>
        </div>
      </Card>

      <div role="group" aria-label="Payment type" className="flex flex-wrap gap-2">
        <PillTab active={tab === 'fund_requests'} label="Fund Requests" count={fund.length} onClick={() => { setTab('fund_requests'); setPage(1); }} />
        <PillTab active={tab === 'wallet_transactions'} label="Wallet Transactions" count={wallet.length} onClick={() => { setTab('wallet_transactions'); setPage(1); }} />
      </div>

      <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
          <ExportButtons onCsv={exportCsv} disabled={active.length === 0} />
          <div className="relative w-full md:w-64">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search payments" placeholder="Search…" className="pl-9" value={filters.search} onChange={(e) => set({ search: e.target.value })} />
          </div>
        </div>

        {active.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title={!hasAny ? 'No centre payments yet.' : tab === 'fund_requests' ? 'No requests match your filters.' : 'No transactions match your filters.'}
            action={hasAny ? <Button variant="outline" size="sm" onClick={reset}>Clear filters</Button> : undefined}
          />
        ) : tab === 'fund_requests' ? (
          <FundRequestTable
            rows={fundPage}
            offset={(safePage - 1) * PAGE_SIZE}
            sort={fundSort}
            onSort={(k) => setFundSort((s) => nextSort(s, k))}
            busy={processing}
            onDecide={ask}
          />
        ) : (
          <WalletTxnTable
            rows={walletPage}
            offset={(safePage - 1) * PAGE_SIZE}
            sort={walletSort}
            onSort={(k) => setWalletSort((s) => nextSort(s, k))}
          />
        )}
        <ListPager page={safePage} pages={pages} shown={shown} total={active.length} noun="entries" onPage={setPage} />
      </Card>

      <FundDecisionDialog
        decision={decision}
        processing={processing}
        amountLabel={decision ? formatCurrency(decision.row.amount) : ''}
        onCancel={() => { if (!processing) setDecision(null); }}
        onConfirm={() => void confirmDecision()}
      />
    </div>
  );
}
