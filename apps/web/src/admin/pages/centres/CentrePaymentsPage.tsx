import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/page-loader';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Download } from 'lucide-react';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, toRecords, formatDate, formatCurrency } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminFilterBar, type FilterField } from '../../shared/components/AdminFilterBar.js';
import { AdminTabBar, type AdminTab } from '../../shared/components/AdminTabBar.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';

export default function CentrePaymentsPage({ api, session, onNavigate: _onNavigate }: AdminPageProps) {
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [appliedFromDate, setAppliedFromDate] = useState('');
  const [appliedToDate, setAppliedToDate] = useState('');
  const [appliedStatus, setAppliedStatus] = useState('');
  const [activeTab, setActiveTab] = useState('fund_requests');
  const [actionTarget, setActionTarget] = useState<{ row: Record<string, unknown>; action: 'approve' | 'reject' } | null>(null);
  const [processing, setProcessing] = useState(false);

  const filters = useMemo(() => ({
    ...(appliedFromDate ? { fromDate: appliedFromDate } : {}),
    ...(appliedToDate ? { toDate: appliedToDate } : {}),
    ...(appliedStatus ? { status: appliedStatus } : {}),
  }), [appliedFromDate, appliedToDate, appliedStatus]);

  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadAdminCentrePayments(session.token, filters),
    [filters],
  );

  const fundRequests = useMemo(() => (data ? toRecords(data.fundRequests) : []), [data]);
  const walletTransactions = useMemo(() => (data ? toRecords(data.walletTransactions) : []), [data]);

  const tabs: AdminTab[] = [
    { id: 'fund_requests', label: 'Fund Requests', count: fundRequests.length },
    { id: 'wallet_transactions', label: 'Wallet Transactions', count: walletTransactions.length },
  ];

  const filterFields: FilterField[] = [
    {
      key: 'from_date',
      label: 'From Date',
      type: 'date',
      value: filterFromDate,
      onChange: setFilterFromDate,
    },
    {
      key: 'to_date',
      label: 'To Date',
      type: 'date',
      value: filterToDate,
      onChange: setFilterToDate,
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      value: filterStatus,
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' },
      ],
      onChange: setFilterStatus,
    },
  ];

  const handleApproveRequest = (row: Record<string, unknown>) => {
    setActionTarget({ row, action: 'approve' });
  };

  const handleRejectRequest = (row: Record<string, unknown>) => {
    setActionTarget({ row, action: 'reject' });
  };

  const handleConfirmAction = async () => {
    if (!actionTarget) return;
    setProcessing(true);
    try {
      const id = asString(actionTarget.row.id);
      if (actionTarget.action === 'approve') {
        await api.approveFundRequest(session.token, id);
      } else {
        await api.rejectFundRequest(session.token, id);
      }
      setActionTarget(null);
      reload();
    } catch {
      // Error is handled by reload
    } finally {
      setProcessing(false);
    }
  };

  const fundRequestColumns: DataTableColumn[] = [
    { key: 'centre_name', label: 'Centre' },
    { key: 'user_name', label: 'User' },
    {
      key: 'transaction_receipt',
      label: 'Transaction No',
      render: (value, row) => asString(value) || asString(row.id),
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (value) => formatCurrency(value),
    },
    {
      key: 'date',
      label: 'Date',
      render: (value) => formatDate(value),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => <AdminStatusBadge status={asString(value)} />,
    },
    {
      key: 'attachment_file',
      label: 'Attachment',
      render: (value) => {
        const file = asString(value);
        if (!file) return <span className="text-gray-400 text-xs">--</span>;
        return (
          <a href={file} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline">
            <Download className="size-3" />
            View
          </a>
        );
      },
    },
    { key: 'description', label: 'Description' },
    {
      key: '_actions',
      label: 'Actions',
      render: (_value, row) => {
        const status = asString(row.status).toLowerCase();
        if (status !== 'pending') return null;
        return (
          <div className="flex gap-1">
            <Button size="sm" variant="outline" className="text-green-600 border-green-300 hover:bg-green-50" onClick={() => handleApproveRequest(row)}>
              Approve
            </Button>
            <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={() => handleRejectRequest(row)}>
              Reject
            </Button>
          </div>
        );
      },
    },
  ];

  const walletTransactionColumns: DataTableColumn[] = [
    { key: 'centre_name', label: 'Centre' },
    {
      key: 'transaction_type',
      label: 'Type',
      render: (value) => {
        const type = asString(value).toLowerCase();
        return (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            type === 'credit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {asString(value)}
          </span>
        );
      },
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (value) => formatCurrency(value),
    },
    { key: 'remarks', label: 'Remarks' },
    {
      key: 'created_at',
      label: 'Date',
      render: (value) => formatDate(value),
    },
  ];

  const handleApply = () => {
    setAppliedFromDate(filterFromDate);
    setAppliedToDate(filterToDate);
    setAppliedStatus(filterStatus);
  };

  const handleClear = () => {
    setFilterFromDate('');
    setFilterToDate('');
    setFilterStatus('');
    setAppliedFromDate('');
    setAppliedToDate('');
    setAppliedStatus('');
  };

  if (loading) {
    return <PageLoader label="Loading centre payments..." />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-red-600">
          {error}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Centre Payments" />
      <AdminFilterBar filters={filterFields} onApply={handleApply} onClear={handleClear} />
      <AdminTabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      {activeTab === 'fund_requests' ? (
        <AdminDataTable columns={fundRequestColumns} rows={fundRequests} />
      ) : (
        <AdminDataTable columns={walletTransactionColumns} rows={walletTransactions} />
      )}

      {/* Approve/Reject Confirmation Dialog */}
      <Dialog open={actionTarget !== null} onOpenChange={(open) => { if (!open) setActionTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionTarget?.action === 'approve' ? 'Approve Fund Request' : 'Reject Fund Request'}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to {actionTarget?.action} the fund request
              {actionTarget ? ` of ${formatCurrency(actionTarget.row.amount)}` : ''}
              {actionTarget ? ` from ${asString(actionTarget.row.centre_name)}` : ''}?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionTarget(null)} disabled={processing}>
              Cancel
            </Button>
            <Button
              variant={actionTarget?.action === 'approve' ? 'default' : 'destructive'}
              onClick={() => { void handleConfirmAction(); }}
              disabled={processing}
            >
              {processing ? 'Processing...' : actionTarget?.action === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
