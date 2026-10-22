import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, formatCurrency, messageFromError } from '../../shared/utils/admin-data-utils.js';
import { PageTitle } from '../../shared/components/ui-kit.js';
import { alreadyStatusOf, withSettledStatus } from '../centres/centre-payments-model.js';
import { FundDecisionDialog, type FundDecision } from '../centres/centre-payments-tables.js';
import { usePendingPatches } from '../centres/use-pending-patches.js';
import { LedgerTable } from './ledger-table.js';
import {
  AFFILIATION_STATUSES, APP_PAYMENT_STATUSES, TOPUP_STATUSES, WALLET_STATUSES,
  panelId, parseWalletLink, tabId, toAffiliationFees, toAppPaymentRows, toCentreWalletRows, toTopUpRows,
  type AffiliationFeeRow, type AppPaymentRow, type CentreWalletRow, type TopUpRow, type WalletTab,
} from './wallet-payment-model.js';
import {
  AFFILIATION_COLUMNS, AFFILIATION_SPEC, APP_PAYMENT_COLUMNS, APP_PAYMENT_SPEC, TOPUP_SPEC, WALLET_COLUMNS, WALLET_SPEC, topUpColumns,
} from './wallet-columns.js';
import { TopUpActions, TopUpDetailsDialog } from './wallet-dialogs.js';
import { WalletTabBar } from './wallet-tabbar.js';

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
//
// Application Payments is the heavy read (the Payment Status computation), so
// it loads only when its tab is first opened; the other tabs never wait on it.

interface Slice<T> { rows: T[]; error: string }
interface WalletData {
  topUps: Slice<TopUpRow>;
  wallets: Slice<CentreWalletRow>;
  affiliation: Slice<AffiliationFeeRow> & { ready: boolean; message: string };
}

function settledSlice<T>(result: PromiseSettledResult<T[]>): Slice<T> {
  return result.status === 'fulfilled' ? { rows: result.value, error: '' } : { rows: [], error: messageFromError(result.reason) };
}

export default function WalletStatusPage({ api, session }: AdminPageProps) {
  const link = useMemo(() => parseWalletLink(typeof window === 'undefined' ? '' : window.location.search), []);
  const [tab, setTab] = useState<WalletTab>(link.tab);
  // The linked status pill applies once, to the linked tab, until another tab is picked.
  const [linkStatus, setLinkStatus] = useState(link.status);
  const [details, setDetails] = useState<TopUpRow | null>(null);
  const [decision, setDecision] = useState<FundDecision | null>(null);
  const [processing, setProcessing] = useState(false);
  const [appsWanted, setAppsWanted] = useState(link.tab === 'applications');

  const { data, loading, error, reload } = useAdminPageData<WalletData>(
    async () => {
      const [topUps, wallets, affiliation] = await Promise.allSettled([
        api.loadAdminCentrePayments(session.token).then((r) => toTopUpRows(r.fundRequests)),
        api.loadAdminWalletStatus(session.token).then(toCentreWalletRows),
        api.loadCentreAffiliationFees(session.token).then(toAffiliationFees),
      ]);
      const all = [topUps, wallets, affiliation];
      if (all.every((r) => r.status === 'rejected')) throw (topUps as PromiseRejectedResult).reason;
      return {
        topUps: settledSlice(topUps),
        wallets: settledSlice(wallets),
        affiliation: affiliation.status === 'fulfilled'
          ? { rows: affiliation.value.rows, error: '', ready: affiliation.value.ready, message: affiliation.value.message }
          : { rows: [], error: messageFromError(affiliation.reason), ready: true, message: '' },
      };
    },
    [],
    'admin:wallet:payment',
  );

  // Lazy: nothing is fetched until the tab is opened (the loader answers null).
  const apps = useAdminPageData<AppPaymentRow[] | null>(
    async () => (appsWanted ? toAppPaymentRows(await api.loadCentreApplicationPayments(session.token)) : null),
    [appsWanted],
    appsWanted ? 'admin:wallet:application-payments' : undefined,
  );

  const selectTab = (next: WalletTab) => {
    setTab(next);
    setLinkStatus('');
    if (next === 'applications') setAppsWanted(true);
  };

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

  const counts: Partial<Record<WalletTab, number>> = {
    topups: topUps.length,
    wallets: data.wallets.rows.length,
    affiliation: data.affiliation.rows.length,
    ...(apps.data ? { applications: apps.data.length } : {}),
  };
  const startStatus = (t: WalletTab) => (t === link.tab ? linkStatus : '');
  const sliceError = { topups: data.topUps.error, wallets: data.wallets.error, applications: '', affiliation: data.affiliation.error }[tab];

  return (
    <div className="space-y-6">
      <PageTitle title="Wallet & Payment" subtitle="Top-ups, centre wallets, application payments and affiliation fees." />

      <WalletTabBar tab={tab} counts={counts} onSelect={selectTab} />

      <div role="tabpanel" id={panelId(tab)} aria-labelledby={tabId(tab)} tabIndex={0} className="space-y-4 focus-visible:outline-none">
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
        {tab === 'applications' && apps.error && !apps.data ? <LoadError message={apps.error} onRetry={apps.reload} /> : null}
        {tab === 'applications' && !apps.error && !apps.data ? <PageLoader label="Loading application payments..." /> : null}
        {tab === 'applications' && apps.data ? (
          <LedgerTable
            key="applications"
            rows={apps.data}
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
      </div>

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
