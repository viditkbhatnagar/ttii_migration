import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, toRecords, formatCurrency } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminFilterBar, type FilterField } from '../../shared/components/AdminFilterBar.js';

export default function CentreDirectoryPage({ api, session }: AdminPageProps) {
  const [filterName, setFilterName] = useState('');
  const [filterContact, setFilterContact] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [appliedName, setAppliedName] = useState('');
  const [appliedContact, setAppliedContact] = useState('');
  const [appliedStatus, setAppliedStatus] = useState('');

  const { data, loading, error } = useAdminPageData(
    () => api.loadCentres(session.token),
    [],
  );

  const rows = useMemo(() => {
    const all = toRecords(data);
    return all.filter((row) => {
      if (appliedName && !asString(row.centre_name).toLowerCase().includes(appliedName.toLowerCase())) return false;
      if (appliedContact && !asString(row.contact_person).toLowerCase().includes(appliedContact.toLowerCase())) return false;
      if (appliedStatus && asString(row.status).toLowerCase() !== appliedStatus.toLowerCase()) return false;
      return true;
    });
  }, [data, appliedName, appliedContact, appliedStatus]);

  const filters: FilterField[] = [
    {
      key: 'centre_name',
      label: 'Centre Name',
      type: 'text',
      value: filterName,
      placeholder: 'Search by centre name',
      onChange: setFilterName,
    },
    {
      key: 'contact_person',
      label: 'Contact Name',
      type: 'text',
      value: filterContact,
      placeholder: 'Search by contact name',
      onChange: setFilterContact,
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      value: filterStatus,
      options: [
        { label: 'Active', value: 'Active' },
        { label: 'Inactive', value: 'Inactive' },
      ],
      onChange: setFilterStatus,
    },
  ];

  const columns: DataTableColumn[] = [
    { key: 'centre_name', label: 'Centre Name', sortable: true },
    { key: 'contact_person', label: 'Contact Person' },
    { key: 'phone', label: 'Contact No' },
    { key: 'email', label: 'Email' },
    {
      key: 'wallet_balance',
      label: 'Wallet Balance',
      sortable: true,
      render: (value) => formatCurrency(value),
    },
  ];

  const actions = [
    { label: 'View', onClick: () => {} },
    { label: 'Edit', onClick: () => {} },
  ];

  const handleApply = () => {
    setAppliedName(filterName);
    setAppliedContact(filterContact);
    setAppliedStatus(filterStatus);
  };

  const handleClear = () => {
    setFilterName('');
    setFilterContact('');
    setFilterStatus('');
    setAppliedName('');
    setAppliedContact('');
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
      <AdminPageHeader title="Centre Directory" addLabel="+ Add Centre" onAdd={() => {}} />
      <AdminFilterBar filters={filters} onApply={handleApply} onClear={handleClear} />
      <AdminDataTable columns={columns} rows={rows} actions={actions} />
    </div>
  );
}
