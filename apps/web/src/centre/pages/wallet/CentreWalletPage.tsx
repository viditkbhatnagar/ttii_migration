import { useState } from 'react';
import { MetricCard } from '@ttii/ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLoader } from '@/components/ui/page-loader';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AdminPageHeader } from '../../../admin/shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../../admin/shared/components/AdminDataTable.js';
import { AdminTabBar, type AdminTab } from '../../../admin/shared/components/AdminTabBar.js';
import { AdminStatusBadge } from '../../../admin/shared/components/AdminStatusBadge.js';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asString, formatDate, formatCurrency, messageFromError } from '../../../admin/shared/utils/admin-data-utils.js';
import type { CentrePageProps } from '../../routing/centre-routes.js';
import type { CentreWalletSnapshot } from '../../centre-portal-api.js';

const fundRequestColumns: DataTableColumn[] = [
  {
    key: 'amount',
    label: 'Amount',
    sortable: true,
    render: (value) => formatCurrency(value),
  },
  {
    key: 'date',
    label: 'Date',
    sortable: true,
    render: (value, row) => formatDate(value || row.created_at),
  },
  { key: 'transaction_no', label: 'Transaction No', sortable: true },
  {
    key: 'status',
    label: 'Status',
    sortable: true,
    render: (value) => <AdminStatusBadge status={asString(value) || 'pending'} />,
  },
  { key: 'description', label: 'Description' },
];

const transactionColumns: DataTableColumn[] = [
  {
    key: 'txn_type',
    label: 'Type',
    render: (value) => {
      const type = asString(value);
      return (
        <span
          className={
            type === 'Credit'
              ? 'rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700'
              : 'rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700'
          }
        >
          {type}
        </span>
      );
    },
  },
  {
    key: 'amount',
    label: 'Amount',
    sortable: true,
    render: (value) => formatCurrency(value),
  },
  {
    key: 'date',
    label: 'Date',
    sortable: true,
    render: (value, row) => formatDate(value || row.created_at),
  },
  { key: 'description', label: 'Description' },
];

const tabs: AdminTab[] = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
];

export default function CentreWalletPage({ api, session }: CentrePageProps) {
  const { data, loading, error, reload } = useAdminPageData<CentreWalletSnapshot>(
    () => api.loadWallet(session.token),
    [session.token],
  );

  const [activeTab, setActiveTab] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [fundAmount, setFundAmount] = useState('');
  const [fundTxnRef, setFundTxnRef] = useState('');
  const [fundDescription, setFundDescription] = useState('');

  const handleAddFundRequest = async () => {
    const amount = Number(fundAmount);
    if (!amount || amount <= 0) return;
    try {
      await api.addFundRequest(session.token, {
        amount,
        transactionNo: fundTxnRef.trim() || '',
        description: fundDescription.trim() || '',
      });
      setFundAmount('');
      setFundTxnRef('');
      setFundDescription('');
      setDialogOpen(false);
      reload();
    } catch (err: unknown) {
      alert(messageFromError(err));
    }
  };

  if (loading) {
    return <PageLoader label="Loading centre wallet..." />;
  }

  if (error) {
    return (
      <Card>
        <CardContent role="alert" className="py-10 text-center text-sm text-red-600">
          {error}
        </CardContent>
      </Card>
    );
  }

  const wallet = data!;

  const filteredRequests =
    activeTab === 'all'
      ? wallet.fundRequests
      : wallet.fundRequests.filter(
          (r) => asString(r.status).toLowerCase() === activeTab,
        );

  const tabsWithCounts: AdminTab[] = tabs.map((tab) => ({
    ...tab,
    count:
      tab.id === 'all'
        ? wallet.fundRequests.length
        : wallet.fundRequests.filter(
            (r) => asString(r.status).toLowerCase() === tab.id,
          ).length,
  }));

  const transactions = [
    ...wallet.credits.map((c) => ({ ...c, txn_type: 'Credit' })),
    ...wallet.debits.map((d) => ({ ...d, txn_type: 'Debit' })),
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Wallet"
        addLabel="+ Request Fund"
        onAdd={() => setDialogOpen(true)}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Fund</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>
            <div className="space-y-2">
              <Label>Transaction Reference</Label>
              <Input
                value={fundTxnRef}
                onChange={(e) => setFundTxnRef(e.target.value)}
                placeholder="Enter transaction reference"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={fundDescription}
                onChange={(e) => setFundDescription(e.target.value)}
                placeholder="Enter description"
              />
            </div>
            <Button
              className="w-full bg-ttii-primary hover:bg-ttii-primary/90"
              onClick={() => void handleAddFundRequest()}
            >
              Submit Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border-l-4 border-blue-500">
          <MetricCard
            label="Balance"
            value={formatCurrency(wallet.walletBalance)}
            tone="info"
          />
        </div>
        <div className="rounded-xl border-l-4 border-green-500">
          <MetricCard
            label="Total Credits"
            value={formatCurrency(wallet.totalCredits)}
            tone="success"
          />
        </div>
        <div className="rounded-xl border-l-4 border-amber-500">
          <MetricCard
            label="Total Debits"
            value={formatCurrency(wallet.totalDebits)}
            tone="warning"
          />
        </div>
        <div className="rounded-xl border-l-4 border-gray-400">
          <MetricCard
            label="Fund Requests"
            value={String(wallet.fundRequests.length)}
            tone="neutral"
          />
        </div>
      </div>

      {/* Fund requests */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Fund Requests</h2>
        <AdminTabBar tabs={tabsWithCounts} activeTab={activeTab} onChange={setActiveTab} />
        <AdminDataTable
          columns={fundRequestColumns}
          rows={filteredRequests}
          pageSize={10}
        />
      </div>

      {/* Transaction history */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Transaction History</h2>
        <AdminDataTable
          columns={transactionColumns}
          rows={transactions}
          pageSize={10}
        />
      </div>
    </div>
  );
}
