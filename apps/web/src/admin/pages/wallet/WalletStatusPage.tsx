import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/page-loader';
import { cn } from '@/lib/utils';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, formatCurrency, messageFromError } from '../../shared/utils/admin-data-utils.js';
import { PageTitle } from '../../shared/components/ui-kit.js';
import { alreadyStatusOf, withSettledStatus } from '../centres/centre-payments-model.js';
import { FundDecisionDialog, type FundDecision } from '../centres/centre-payments-tables.js';
import { usePendingPatches } from '../centres/use-pending-patches.js';
import { LedgerTable } from './ledger-table.js';
import {
  AFFILIATION_STATUSES, APP_PAYMENT_STATUSES, TOPUP_STATUSES, WALLET_STATUSES, WALLET_TABS,
  parseWalletLink, toAffiliationFees, toAppPaymentRows, toCentreWalletRows, toTopUpRows,
  type AffiliationFeeRow, type AppPaymentRow, type CentreWalletRow, type TopUpRow, type WalletTab,
} from './wallet-payment-model.js';
import {
  AFFILIATION_COLUMNS, AFFILIATION_SPEC, APP_PAYMENT_COLUMNS, APP_PAYMENT_SPEC, TOPUP_SPEC, WALLET_COLUMNS, WALLET_SPEC, topUpColumns,
} from './wallet-columns.js';
import { TopUpActions, TopUpDetailsDialog } from './wallet-dialogs.js';

// Wallet & Payment (Naji 2026-10-22, WalletStatusModule): Top-up Requests,
// Centre Wallets, Application Payments and Affiliation Fee Records, each a
// ledger with status pills, search, filters, sortable columns and 8 rows a
// page. Real data only (see wallet-payment-model.ts for the sources).
//
// Kept on purpose although the prototype dropped it: Approve / Reject on
// pending top-ups — the ONLY way a centre wallet is credited. Same claim-first
// endpoints and confirmation as the old Centre Payments page; the confirm
// button is locked while the request runs and a decided row shows its new
// status at once. Not built: the "Mode" column / filter (no such data is
// stored). The global Wallet Transactions ledger moved to the centre profile.

interface Slice<T> { rows: T[]; error: string }
interface WalletData {
  topUps: Slice<TopUpRow>;
  wallets: Slice<CentreWalletRow>;
  applications: Slice<AppPaymentRow>;
  affiliation: Slice<AffiliationFeeRow> & { ready: boolean; message: string };
}

function settledSlice<T>(result: PromiseSettledResult<T[]>): Slice<T> {
  return result.status === 'fulfilled' ? { rows: result.value, error: '' } : { rows: [], error: messageFromError(result.reason) };
}

export default function WalletStatusPage({ api, session }: AdminPageProps) {
  const link = useMemo(() => parseWalletLink(typeof window === 'undefined' ? '' : window.location.search), []);
  const [tab, setTab] = useState<WalletTab>(link.tab);
  const [details, setDetails] = useState<TopUpRow | null>(null);
  const [decision, setDecision] = useState<FundDecision | null>(null);
  const [processing, setProcessing] = useState(false);

  const { data, loading, error, reload } = useAdminPageData<WalletData>(
    async () => {
      const [topUps, wallets, applications, affiliation] = await Promise.allSettled([
        api.loadAdminCentrePayments(session.token).then((r) => toTopUpRows(r.fundRequests)),
        api.loadAdminWalletStatus(session.token).then(toCentreWalletRows),
        api.loadCentreApplicationPayments(session.token).then(toAppPaymentRows),
        api.loadCentreAffiliationFees(session.token).then(toAffiliationFees),
      ]);
      const all = [topUps, wallets, applications, affiliation];
      if (all.every((r) => r.status === 'rejected')) throw (topUps as PromiseRejectedResult).reason;
      return {
        topUps: settledSlice(topUps),
        wallets: settledSlice(wallets),
        applications: settledSlice(applications),
        affiliation: affiliation.status === 'fulfilled'
          ? { rows: affiliation.value.rows, error: '', ready: affiliation.value.ready, message: affiliation.value.message }
          : { rows: [], error: messageFromError(affiliation.reason), ready: true, message: '' },
      };
    },
    [],
    'admin:wallet:payment',
  );

  // A decided request shows its new status (no buttons) at once; reload() only
  // revalidates in the background, and a live button there invited a duplicate.
  const settled = usePendingPatches<string>(data);
  const settledStatus = settled.get;
  const topUps = useMemo(() => withSettledStatus(data?.topUps.rows ?? [], settledStatus), [data, settledStatus]);

  const ask = useCallback((row: TopUpRow, verb: FundDecision['action']) => {
    if (processing) return;
    setDetails(null);
    setDecision({ row, action: verb });
  }, [processing]);
  const columns = useMemo(() => topUpColumns(setDetails), []);
  const action = useMemo(() => ({
    label: 'Action',
    render: (r: TopUpRow) => <TopUpActions row={r} busy={processing} onDecide={ask} />,
  }), [processing, ask]);

  const confirmDecision = async () => {
    if (!decision || processing) return;
    setProcessing(true);
    try {
      const { row, action: verb } = decision;
      const res = verb === 'approve'
        ? await api.approveFundRequest(session.token, row.id)
        : await api.rejectFundRequest(session.token, row.id);
      const message = asString(res.message);
      if (res.status === 0) {
        toast.error(message || `Could not ${verb} the top-up request.`);
        const current = alreadyStatusOf(message);
        if (current) settled.set(row.id, current);
      } else {
        toast.success(message || (verb === 'approve' ? 'Top-up approved and wallet credited.' : 'Top-up request rejected.'));
        settled.set(row.id, verb === 'approve' ? 'approved' : 'rejected');
      }
      setDecision(null);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Could not ${decision.action} the top-up request.`);
    } finally {
      setProcessing(false);
    }
  };

  if (loading && !data) return <PageLoader label="Loading wallet & payments..." />;
  if (error && !data) return <LoadError message={error} onRetry={reload} />;
  if (!data) return null;

  const counts: Record<WalletTab, number> = {
    topups: topUps.length,
    wallets: data.wallets.rows.length,
    applications: data.applications.rows.length,
    affiliation: data.affiliation.rows.length,
  };
  const startStatus = (t: WalletTab) => (t === link.tab ? link.status : '');
  const sliceError = { topups: data.topUps.error, wallets: data.wallets.error, applications: data.applications.error, affiliation: data.affiliation.error }[tab];

  return (
    <div className="space-y-6">
      <PageTitle title="Wallet & Payment" subtitle="Top-ups, centre wallets, application payments and affiliation fees." />

      <div role="tablist" aria-label="Wallet & Payment" className="flex w-full items-center gap-1 overflow-x-auto border-b border-border">
        {WALLET_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'relative inline-flex shrink-0 items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
              tab === t.id ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">{counts[t.id]}</span>
            {tab === t.id ? <span aria-hidden="true" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" /> : null}
          </button>
        ))}
      </div>

      {sliceError ? <LoadError message={sliceError} onRetry={reload} /> : null}

      {!sliceError && tab === 'topups' ? (
        <LedgerTable
          key="topups"
          rows={topUps}
          rowKey={(r) => r.id}
          columns={columns}
          statuses={TOPUP_STATUSES}
          spec={TOPUP_SPEC}
          defaultSort={{ key: 'date', dir: 'desc' }}
          initialStatus={startStatus('topups')}
          action={action}
          searchLabel="Search top-up requests"
          emptyTitle="No top-up requests yet."
        />
      ) : null}
      {!sliceError && tab === 'wallets' ? (
        <LedgerTable
          key="wallets"
          rows={data.wallets.rows}
          rowKey={(r) => r.id}
          columns={WALLET_COLUMNS}
          statuses={WALLET_STATUSES}
          spec={WALLET_SPEC}
          defaultSort={{ key: 'code', dir: 'asc' }}
          initialStatus={startStatus('wallets')}
          searchLabel="Search centre wallets"
          emptyTitle="No centre wallets yet."
        />
      ) : null}
      {!sliceError && tab === 'applications' ? (
        <LedgerTable
          key="applications"
          rows={data.applications.rows}
          rowKey={(r) => r.key}
          columns={APP_PAYMENT_COLUMNS}
          statuses={APP_PAYMENT_STATUSES}
          spec={APP_PAYMENT_SPEC}
          defaultSort={{ key: 'date', dir: 'desc' }}
          initialStatus={startStatus('applications')}
          searchLabel="Search application payments"
          emptyTitle="No centre applications or students yet."
        />
      ) : null}
      {!sliceError && tab === 'affiliation' ? (
        <>
          {!data.affiliation.ready ? (
            <p role="status" className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <Info aria-hidden="true" className="size-4 shrink-0" />
              {data.affiliation.message || 'Affiliation records are not set up yet.'}
            </p>
          ) : null}
          <LedgerTable
            key="affiliation"
            rows={data.affiliation.rows}
            rowKey={(r) => r.id}
            columns={AFFILIATION_COLUMNS}
            statuses={AFFILIATION_STATUSES}
            spec={AFFILIATION_SPEC}
            defaultSort={{ key: 'recordNo', dir: 'asc' }}
            initialStatus={startStatus('affiliation')}
            searchLabel="Search affiliation fee records"
            emptyTitle={data.affiliation.ready ? 'No affiliation fees recorded yet.' : 'Affiliation records are not set up yet.'}
          />
        </>
      ) : null}

      <TopUpDetailsDialog row={details} busy={processing} onClose={() => setDetails(null)} onDecide={ask} />
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

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card>
      <CardContent role="alert" className="py-8 text-center text-sm text-destructive">
        {message}
        <div className="mt-4"><Button variant="outline" onClick={onRetry}>Retry</Button></div>
      </CardContent>
    </Card>
  );
}
