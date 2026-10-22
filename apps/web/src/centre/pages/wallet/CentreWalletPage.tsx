import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/page-loader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { messageFromError } from '../../../admin/shared/utils/admin-data-utils.js';
import type { CentrePageProps } from '../../routing/centre-routes.js';
import { CentrePageHeader, NoticeCard } from '../kit/page-kit.js';
import { useQueryParams } from '../kit/use-query-params.js';
import { CollectionDetailView } from './CollectionDetailView.js';
import { FundRequestsTab } from './FundRequestsTab.js';
import { RequestFundsDialog } from './RequestFundsDialog.js';
import { WalletCollectionsTab } from './WalletCollectionsTab.js';
import { WalletLedgerTab } from './WalletLedgerTab.js';
import { WalletOverviewTab } from './WalletOverviewTab.js';
import { WALLET_TABS, parseWalletTab, toCollectionDetail, toCollectionsView, toWalletLedgerView, type WalletTab } from './wallet-model.js';

/** Wallet & Payment. ?tab=collections|ledger|fund-requests, ?new=1 opens Request Funds, ?student=<key> opens a fee detail. */
export default function CentreWalletPage({ api, session }: CentrePageProps) {
  const [params, setParams] = useQueryParams();
  const tab = parseWalletTab(params.get('tab'));
  const studentKey = params.get('student') ?? '';
  const [dialogOpen, setDialogOpen] = useState(false);

  const ledger = useAdminPageData(async () => toWalletLedgerView(await api.loadWalletLedger(session.token)), [session.token]);
  const collections = useAdminPageData(async () => toCollectionsView(await api.loadWalletCollections(session.token)), [session.token]);
  const detail = useAdminPageData(
    async () => (studentKey ? toCollectionDetail(await api.loadWalletCollection(session.token, studentKey)) : null),
    [session.token, studentKey],
  );

  const wantsNew = params.get('new') === '1';
  useEffect(() => {
    if (!wantsNew) return;
    setDialogOpen(true);
    setParams({ new: null, student: null, tab: 'fund-requests' });
  }, [wantsNew, setParams]);

  const openDialog = () => { setParams({ tab: 'fund-requests', student: null }); setDialogOpen(true); };
  const closeDetail = () => setParams({ student: null });

  const header = (
    <CentrePageHeader
      title="Wallet & Payment"
      subtitle="Wallet balance, student fee collections and fund requests"
      actions={<Button className="gap-1.5" onClick={openDialog}><Plus className="h-4 w-4" />Request Funds</Button>}
    />
  );

  if (ledger.loading || collections.loading) return <PageLoader label="Loading wallet..." />;
  const failure = ledger.error || collections.error;
  if (failure || !ledger.data || !collections.data) {
    return <div className="space-y-5">{header}<NoticeCard tone="error">{failure || messageFromError(null)}</NoticeCard></div>;
  }

  if (studentKey) {
    return (
      <div className="space-y-5">
        {header}
        {detail.loading && <PageLoader label="Loading payment details..." />}
        {!detail.loading && (detail.error || !detail.data) && <NoticeCard tone="error">{detail.error || 'Payment record not found.'}</NoticeCard>}
        {!detail.loading && detail.data && <CollectionDetailView detail={detail.data} onBack={closeDetail} />}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {header}
      <Tabs value={tab} onValueChange={(v) => setParams({ tab: v === 'overview' ? null : v })}>
        <TabsList className="h-auto flex-wrap bg-muted/50 p-1">
          {WALLET_TABS.map((t) => <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>)}
        </TabsList>
        <TabsContent value="overview" className="mt-4"><WalletOverviewTab ledger={ledger.data} totals={collections.data.totals} /></TabsContent>
        <TabsContent value="collections" className="mt-4">
          <WalletCollectionsTab rows={collections.data.rows} onView={(key) => setParams({ student: key, tab: 'collections' })} />
        </TabsContent>
        <TabsContent value="ledger" className="mt-4"><WalletLedgerTab ledger={ledger.data} /></TabsContent>
        <TabsContent value="fund-requests" className="mt-4"><FundRequestsTab requests={ledger.data.fundRequests} onNew={() => setDialogOpen(true)} /></TabsContent>
      </Tabs>
      <RequestFundsDialog open={dialogOpen} onOpenChange={setDialogOpen} api={api} token={session.token} onSent={ledger.reload} />
    </div>
  );
}
