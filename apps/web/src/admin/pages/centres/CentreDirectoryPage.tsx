import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asNumber, asString, toRecords, formatCurrency } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn, type DataTableAction } from '../../shared/components/AdminDataTable.js';
import { AdminFilterBar, type FilterField } from '../../shared/components/AdminFilterBar.js';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

export default function CentreDirectoryPage({ api, session, onNavigate }: AdminPageProps) {
  const [filterCentreId, setFilterCentreId] = useState('');
  const [filterName, setFilterName] = useState('');
  const [filterContact, setFilterContact] = useState('');
  const [filterPhone, setFilterPhone] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterState, setFilterState] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [appliedCentreId, setAppliedCentreId] = useState('');
  const [appliedName, setAppliedName] = useState('');
  const [appliedContact, setAppliedContact] = useState('');
  const [appliedPhone, setAppliedPhone] = useState('');
  const [appliedStatus, setAppliedStatus] = useState('');
  const [appliedState, setAppliedState] = useState('');
  const [appliedCity, setAppliedCity] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Record<string, unknown> | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadCentres(session.token),
    [],
  );

  const rows = useMemo(() => {
    const all = toRecords(data);
    return all.filter((row) => {
      if (appliedCentreId && !asString(row.centre_id).toLowerCase().includes(appliedCentreId.toLowerCase())) return false;
      if (appliedName && !asString(row.centre_name).toLowerCase().includes(appliedName.toLowerCase())) return false;
      if (appliedContact && !asString(row.contact_person).toLowerCase().includes(appliedContact.toLowerCase())) return false;
      if (appliedPhone && !asString(row.phone).toLowerCase().includes(appliedPhone.toLowerCase())) return false;
      if (appliedStatus && asString(row.status).toLowerCase() !== appliedStatus.toLowerCase()) return false;
      if (appliedState && asString(row.state).toLowerCase() !== appliedState.toLowerCase()) return false;
      if (appliedCity && !asString(row.city).toLowerCase().includes(appliedCity.toLowerCase())) return false;
      return true;
    });
  }, [data, appliedCentreId, appliedName, appliedContact, appliedPhone, appliedStatus, appliedState, appliedCity]);

  const filters: FilterField[] = [
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
      key: 'phone',
      label: 'Contact Phone',
      type: 'text',
      value: filterPhone,
      placeholder: 'Search by phone',
      onChange: setFilterPhone,
    },
    {
      key: 'state',
      label: 'State',
      type: 'select',
      value: filterState,
      options: INDIAN_STATES.map((s) => ({ label: s, value: s })),
      onChange: setFilterState,
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      value: filterStatus,
      placeholder: 'Select Status',
      options: [
        { label: 'Active', value: 'Active' },
        { label: 'Inactive', value: 'Inactive' },
      ],
      onChange: setFilterStatus,
    },
  ];

  const columns: DataTableColumn[] = [
    {
      key: 'centre_name',
      label: 'Centre Name',
      sortable: true,
      render: (value, row) => (
        <button
          type="button"
          className="text-left font-medium text-blue-600 hover:underline"
          onClick={() => onNavigate('/admin/centres/view/' + asString(row.id))}
        >
          {asString(value)}
        </button>
      ),
    },
    { key: 'contact_person', label: 'Contact Person' },
    { key: 'phone', label: 'Contact No' },
    { key: 'email', label: 'Email' },
    {
      key: 'students_count',
      label: 'Total Students',
      sortable: true,
      render: (value) => (value != null ? String(asNumber(value)) : '0'),
    },
    {
      key: 'fund_request_count',
      label: 'Fund Requests',
      render: (value) => (value != null ? String(asNumber(value)) : '-'),
    },
    {
      key: 'wallet_balance',
      label: 'Wallet Balance',
      sortable: true,
      render: (value) => formatCurrency(value),
    },
  ];

  const actions: DataTableAction[] = [
    {
      label: 'View',
      onClick: (row) => onNavigate('/admin/centres/view/' + asString(row.id)),
    },
    {
      label: 'Edit',
      onClick: (row) => onNavigate('/admin/centres/edit/' + asString(row.id)),
    },
    {
      label: 'Delete',
      variant: 'destructive',
      onClick: (row) => setDeleteTarget(row),
    },
  ];

  const handleApply = () => {
    setAppliedCentreId(filterCentreId);
    setAppliedName(filterName);
    setAppliedContact(filterContact);
    setAppliedPhone(filterPhone);
    setAppliedStatus(filterStatus);
    setAppliedState(filterState);
    setAppliedCity(filterCity);
  };

  const handleClear = () => {
    setFilterCentreId('');
    setFilterName('');
    setFilterContact('');
    setFilterPhone('');
    setFilterStatus('');
    setFilterState('');
    setFilterCity('');
    setAppliedCentreId('');
    setAppliedName('');
    setAppliedContact('');
    setAppliedPhone('');
    setAppliedStatus('');
    setAppliedState('');
    setAppliedCity('');
  };

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteCentre(session.token, asString(deleteTarget.id));
      setDeleteTarget(null);
      reload();
    } catch {
      // silently handle error
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, api, session.token, reload]);

  if (loading) {
    return <PageLoader label="Loading centre directory..." />;
  }

  if (error) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-red-600">
          {error}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Centre Directory" addLabel="+ Add Centres" onAdd={() => onNavigate('/admin/centres/add')} />
      <AdminFilterBar filters={filters} onApply={handleApply} onClear={handleClear} />
      <AdminDataTable columns={columns} rows={rows} actions={actions} />

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleDelete();
            }}
          >
            <DialogHeader>
              <DialogTitle>Delete Centre</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-600">
              Are you sure you want to delete <strong>{deleteTarget ? asString(deleteTarget.centre_name) : ''}</strong>? This action cannot be undone.
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
              <Button type="submit" variant="destructive" disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
