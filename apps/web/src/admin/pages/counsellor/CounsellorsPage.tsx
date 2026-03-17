import { useMemo, useState, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asNumber, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn, type DataTableAction } from '../../shared/components/AdminDataTable.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';
import { AdminFilterBar, type FilterField } from '../../shared/components/AdminFilterBar.js';

export default function CounsellorsPage({ api, session }: AdminPageProps) {
  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadCounsellors(session.token),
    [],
  );

  const allCounsellors = useMemo(() => toRecords(data), [data]);

  // --- Filters ---
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [centreFilter, setCentreFilter] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedStatus, setAppliedStatus] = useState('');
  const [appliedCentre, setAppliedCentre] = useState('');

  // --- Add/Edit dialog ---
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [editRow, setEditRow] = useState<Record<string, unknown> | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formStatus, setFormStatus] = useState('1');
  const [formSaving, setFormSaving] = useState(false);

  const centreOptions = useMemo(() => {
    const set = new Set<string>();
    for (const row of allCounsellors) {
      const c = row.centre_name;
      if (c != null && String(c).trim()) set.add(String(c));
    }
    return Array.from(set)
      .sort()
      .map((v) => ({ label: v, value: v }));
  }, [allCounsellors]);

  const filters: FilterField[] = useMemo(
    () => [
      {
        key: 'search',
        label: 'Search',
        type: 'text' as const,
        value: searchFilter,
        placeholder: 'Search by name, email, phone...',
        onChange: setSearchFilter,
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select' as const,
        value: statusFilter,
        placeholder: 'All Statuses',
        options: [
          { label: 'Active', value: '1' },
          { label: 'Inactive', value: '0' },
        ],
        onChange: setStatusFilter,
      },
      {
        key: 'centre',
        label: 'Centre',
        type: 'select' as const,
        value: centreFilter,
        placeholder: 'All Centres',
        options: centreOptions,
        onChange: setCentreFilter,
      },
    ],
    [searchFilter, statusFilter, centreFilter, centreOptions],
  );

  const handleApplyFilters = useCallback(() => {
    setAppliedSearch(searchFilter);
    setAppliedStatus(statusFilter);
    setAppliedCentre(centreFilter);
  }, [searchFilter, statusFilter, centreFilter]);

  const handleClearFilters = useCallback(() => {
    setSearchFilter('');
    setStatusFilter('');
    setCentreFilter('');
    setAppliedSearch('');
    setAppliedStatus('');
    setAppliedCentre('');
  }, []);

  const filteredCounsellors = useMemo(() => {
    let rows = allCounsellors;
    if (appliedSearch.trim()) {
      const q = appliedSearch.toLowerCase();
      rows = rows.filter(
        (r) =>
          String(r.name ?? '').toLowerCase().includes(q) ||
          String(r.user_email ?? '').toLowerCase().includes(q) ||
          String(r.phone ?? '').toLowerCase().includes(q),
      );
    }
    if (appliedStatus !== '') {
      const s = Number(appliedStatus);
      rows = rows.filter((r) => asNumber(r.status) === s);
    }
    if (appliedCentre) {
      rows = rows.filter((r) => String(r.centre_name) === appliedCentre);
    }
    return rows;
  }, [allCounsellors, appliedSearch, appliedStatus, appliedCentre]);

  // --- Summary stats ---
  const activeCount = useMemo(
    () => allCounsellors.filter((row) => asNumber(row.status) === 1).length,
    [allCounsellors],
  );

  const totalReferred = useMemo(
    () => allCounsellors.reduce((sum, row) => sum + asNumber(row.applications_referred), 0),
    [allCounsellors],
  );

  const totalConverted = useMemo(
    () => allCounsellors.reduce((sum, row) => sum + asNumber(row.applications_converted), 0),
    [allCounsellors],
  );

  // --- Table columns ---
  const columns: DataTableColumn[] = useMemo(
    () => [
      { key: 'name', label: 'Name', sortable: true },
      { key: 'phone', label: 'Phone' },
      { key: 'user_email', label: 'Email' },
      {
        key: 'status',
        label: 'Active Status',
        render: (v) => (
          <AdminStatusBadge status={asNumber(v) === 1 ? 'Active' : 'Inactive'} />
        ),
      },
    ],
    [],
  );

  // --- Dialog handlers ---
  const openAddDialog = useCallback(() => {
    setDialogMode('add');
    setEditRow(null);
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormStatus('1');
    setDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((row: Record<string, unknown>) => {
    setDialogMode('edit');
    setEditRow(row);
    setFormName(String(row.name ?? ''));
    setFormEmail(String(row.user_email ?? ''));
    setFormPhone(String(row.phone ?? ''));
    setFormStatus(String(asNumber(row.status)));
    setDialogOpen(true);
  }, []);

  const handleDialogSave = useCallback(async () => {
    setFormSaving(true);
    try {
      if (dialogMode === 'add') {
        await api.addCounsellor(session.token, {
          name: formName,
          email: formEmail,
          phone: formPhone || undefined,
          status: Number(formStatus),
        });
      } else if (editRow) {
        await api.editCounsellor(session.token, String(editRow.id ?? editRow._id ?? ''), {
          name: formName,
          phone: formPhone || undefined,
          status: Number(formStatus),
        });
      }
      setDialogOpen(false);
      reload();
    } catch (err) {
      window.alert(
        `Failed to ${dialogMode === 'add' ? 'add' : 'update'} counsellor: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setFormSaving(false);
    }
  }, [api, session.token, dialogMode, editRow, formName, formEmail, formPhone, formStatus, reload]);

  const handleDelete = useCallback(
    async (row: Record<string, unknown>) => {
      const confirmed = window.confirm(`Are you sure you want to delete "${row.name}"?`);
      if (!confirmed) return;
      try {
        await api.deleteCounsellor(session.token, String(row.id ?? row._id ?? ''));
        reload();
      } catch (err) {
        window.alert(`Failed to delete counsellor: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
    [api, session.token, reload],
  );

  const actions: DataTableAction[] = useMemo(
    () => [
      { label: 'Edit', onClick: (row) => openEditDialog(row) },
      { label: 'Delete', onClick: (row) => handleDelete(row), variant: 'destructive' as const },
    ],
    [openEditDialog, handleDelete],
  );

  // --- Render ---
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
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
      <AdminPageHeader title="Counsellors Directory" addLabel="+ Add Counsellor" onAdd={openAddDialog} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Counsellors', value: allCounsellors.length },
          { label: 'Active', value: activeCount },
          { label: 'Applications Referred', value: totalReferred },
          { label: 'Conversions', value: totalConverted },
        ].map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <AdminFilterBar filters={filters} onApply={handleApplyFilters} onClear={handleClearFilters} />

      <AdminDataTable columns={columns} rows={filteredCounsellors} actions={actions} />

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{dialogMode === 'add' ? 'Add Counsellor' : 'Edit Counsellor'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="form-name">Full Name</Label>
              <Input
                id="form-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Full name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="form-email">Email</Label>
              <Input
                id="form-email"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="Email address"
                disabled={dialogMode === 'edit'}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="form-phone">Phone</Label>
              <Input
                id="form-phone"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="Phone number"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="form-status">Status</Label>
              <select
                id="form-status"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value)}
              >
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDialogSave}
              disabled={formSaving || !formName.trim() || (dialogMode === 'add' && !formEmail.trim())}
              className="bg-ttii-primary hover:bg-ttii-primary/90"
            >
              {formSaving ? 'Saving...' : dialogMode === 'add' ? 'Add Counsellor' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
