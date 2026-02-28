import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asNumber, toRecords, formatCurrency } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminFilterBar, type FilterField } from '../../shared/components/AdminFilterBar.js';

export default function WalletStatusPage({ api, session }: AdminPageProps) {
  const [filterCentreId, setFilterCentreId] = useState('');
  const [filterCentreName, setFilterCentreName] = useState('');
  const [appliedCentreId, setAppliedCentreId] = useState('');
  const [appliedCentreName, setAppliedCentreName] = useState('');

  const filters = useMemo(() => ({
    ...(appliedCentreId ? { centreId: appliedCentreId } : {}),
    ...(appliedCentreName ? { centreName: appliedCentreName } : {}),
  }), [appliedCentreId, appliedCentreName]);

  const { data, loading, error } = useAdminPageData(
    () => api.loadAdminWalletStatus(session.token, filters),
    [filters],
  );

  const rows = useMemo(() => toRecords(data), [data]);

  const filterFields: FilterField[] = [
    {
      key: 'centre_id',
      label: 'Centre ID',
      type: 'text',
      value: filterCentreId,
      placeholder: 'Search by centre ID',
      onChange: setFilterCentreId,
    },
    {
      key: 'centre_name',
      label: 'Centre Name',
      type: 'text',
      value: filterCentreName,
      placeholder: 'Search by centre name',
      onChange: setFilterCentreName,
    },
  ];

  const columns: DataTableColumn[] = [
    { key: 'centre_id', label: 'Centre ID' },
    { key: 'centre_name', label: 'Centre Name', sortable: true },
    {
      key: 'wallet_balance',
      label: 'Wallet Balance',
      sortable: true,
      render: (value) => formatCurrency(value),
    },
    { key: 'transaction_count', label: 'Transactions' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
  ];

  const handleApply = () => {
    setAppliedCentreId(filterCentreId);
    setAppliedCentreName(filterCentreName);
  };

  const handleClear = () => {
    setFilterCentreId('');
    setFilterCentreName('');
    setAppliedCentreId('');
    setAppliedCentreName('');
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
      <AdminPageHeader title="Wallet Status" />
      <AdminFilterBar filters={filterFields} onApply={handleApply} onClear={handleClear} />
      <AdminDataTable columns={columns} rows={rows} />
    </div>
  );
}
