import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, toRecords, formatDate, formatCurrency } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminFilterBar, type FilterField } from '../../shared/components/AdminFilterBar.js';
import { AdminTabBar, type AdminTab } from '../../shared/components/AdminTabBar.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';

export default function CentrePaymentsPage({ api, session }: AdminPageProps) {
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [appliedFromDate, setAppliedFromDate] = useState('');
  const [appliedToDate, setAppliedToDate] = useState('');
  const [appliedStatus, setAppliedStatus] = useState('');
  const [activeTab, setActiveTab] = useState('fund_requests');

  const filters = useMemo(() => ({
    ...(appliedFromDate ? { fromDate: appliedFromDate } : {}),
    ...(appliedToDate ? { toDate: appliedToDate } : {}),
    ...(appliedStatus ? { status: appliedStatus } : {}),
  }), [appliedFromDate, appliedToDate, appliedStatus]);

  const { data, loading, error } = useAdminPageData(
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

  const fundRequestColumns: DataTableColumn[] = [
    { key: 'centre_name', label: 'Centre' },
    { key: 'user_name', label: 'User' },
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
    { key: 'description', label: 'Description' },
  ];

  const walletTransactionColumns: DataTableColumn[] = [
    { key: 'centre_name', label: 'Centre' },
    { key: 'transaction_type', label: 'Type' },
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
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
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
    </div>
  );
}
