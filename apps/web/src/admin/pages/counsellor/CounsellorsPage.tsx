import { useMemo, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLoader } from '@/components/ui/page-loader';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asNumber, asString, toRecords } from '../../shared/utils/admin-data-utils.js';
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
  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedStatus, setAppliedStatus] = useState('');

  // --- Add/Edit dialog ---
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [editRow, setEditRow] = useState<Record<string, unknown> | null>(null);
  const [formName, setFormName] = useState('');
  const [formGender, setFormGender] = useState('');
  const [formDob, setFormDob] = useState('');
  const [formNationality, setFormNationality] = useState('');
  const [formLanguages, setFormLanguages] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formQualification, setFormQualification] = useState('');
  const [formDoj, setFormDoj] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formStatus, setFormStatus] = useState('1');
  const [formSaving, setFormSaving] = useState(false);

  const filters: FilterField[] = useMemo(
    () => [
      {
        key: 'search',
        label: 'Search',
        type: 'text' as const,
        value: searchFilter,
        placeholder: 'Search by counsellor name, p…',
        onChange: setSearchFilter,
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select' as const,
        value: statusFilter,
        placeholder: 'Select Status',
        options: [
          { label: 'Active', value: '1' },
          { label: 'Inactive', value: '0' },
        ],
        onChange: setStatusFilter,
      },
    ],
    [searchFilter, statusFilter],
  );

  const handleApplyFilters = useCallback(() => {
    setAppliedSearch(searchFilter);
    setAppliedStatus(statusFilter);
  }, [searchFilter, statusFilter]);

  const handleClearFilters = useCallback(() => {
    setSearchFilter('');
    setStatusFilter('');
    setAppliedSearch('');
    setAppliedStatus('');
  }, []);

  const filteredCounsellors = useMemo(() => {
    let rows = allCounsellors;
    if (appliedSearch.trim()) {
      const q = appliedSearch.toLowerCase();
      rows = rows.filter(
        (r) =>
          asString(r.name).toLowerCase().includes(q) ||
          asString(r.user_email).toLowerCase().includes(q) ||
          asString(r.phone).toLowerCase().includes(q),
      );
    }
    if (appliedStatus !== '') {
      const s = Number(appliedStatus);
      rows = rows.filter((r) => asNumber(r.status) === s);
    }
    return rows;
  }, [allCounsellors, appliedSearch, appliedStatus]);

  const activeCount = useMemo(
    () => allCounsellors.filter((row) => asNumber(row.status) === 1).length,
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
  const resetForm = useCallback(() => {
    setFormName(''); setFormGender(''); setFormDob(''); setFormNationality('');
    setFormLanguages(''); setFormEmail(''); setFormPhone(''); setFormQualification('');
    setFormDoj(''); setFormPassword(''); setFormStatus('1');
  }, []);

  const openAddDialog = useCallback(() => {
    setDialogMode('add');
    setEditRow(null);
    resetForm();
    setDialogOpen(true);
  }, [resetForm]);

  const openEditDialog = useCallback((row: Record<string, unknown>) => {
    setDialogMode('edit');
    setEditRow(row);
    setFormName(String(row.name ?? ''));
    setFormGender(String(row.gender ?? ''));
    setFormDob(String(row.dob ?? '').slice(0, 10));
    setFormNationality(String(row.nationality ?? ''));
    setFormLanguages(String(row.languages_spoken ?? ''));
    setFormEmail(String(row.user_email ?? ''));
    setFormPhone(String(row.phone ?? ''));
    setFormQualification(String(row.highest_qualification ?? ''));
    setFormDoj(String(row.doj ?? '').slice(0, 10));
    setFormPassword('');
    setFormStatus(String(asNumber(row.status)));
    setDialogOpen(true);
  }, []);

  const handleDialogSave = useCallback(async () => {
    setFormSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: formName,
        gender: formGender,
        dob: formDob,
        nationality: formNationality,
        languages_spoken: formLanguages,
        email: formEmail,
        phone: formPhone || undefined,
        highest_qualification: formQualification,
        doj: formDoj,
        status: Number(formStatus),
      };
      if (formPassword) payload.password = formPassword;

      if (dialogMode === 'add') {
        await api.addCounsellor(session.token, payload as Parameters<typeof api.addCounsellor>[1]);
      } else if (editRow) {
        await api.editCounsellor(session.token, String(editRow.id ?? editRow._id ?? ''), payload as Parameters<typeof api.editCounsellor>[2]);
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
  }, [api, session.token, dialogMode, editRow, formName, formGender, formDob, formNationality, formLanguages, formEmail, formPhone, formQualification, formDoj, formPassword, formStatus, reload]);

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
      { label: 'View', onClick: (row) => openEditDialog(row) },
      { label: 'Edit', onClick: (row) => openEditDialog(row) },
      { label: 'Delete', onClick: (row) => handleDelete(row), variant: 'destructive' as const },
      { label: 'Change Username/Password', onClick: (row) => openEditDialog(row) },
      {
        label: 'Make Inactive',
        onClick: async (row) => {
          if (window.confirm('Make this counsellor inactive?')) {
            try {
              await api.editCounsellor(session.token, String(row.id ?? row._id ?? ''), { status: 0 } as Parameters<typeof api.editCounsellor>[2]);
              reload();
            } catch (err) {
              alert(err instanceof Error ? err.message : 'Failed to update status');
            }
          }
        },
      },
    ],
    [openEditDialog, handleDelete, api, session.token, reload],
  );

  // --- Render ---
  if (loading) {
    return <PageLoader label="Loading counsellors..." />;
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
      <AdminPageHeader title="Counsellors" addLabel="+ Create Counsellors" onAdd={openAddDialog} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-teal-500">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-full bg-teal-100">
              <svg className="size-5 text-teal-600" fill="currentColor" viewBox="0 0 20 20"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500">ACTIVE COUNSELLORS</p>
              <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <AdminFilterBar filters={filters} onApply={handleApplyFilters} onClear={handleClearFilters} />

      <AdminDataTable columns={columns} rows={filteredCounsellors} actions={actions} />

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogMode === 'add' ? 'Add counsellor' : 'Update counsellor Details'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="c-name">Full Name *</Label>
              <Input id="c-name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Full Name" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="c-gender">Gender *</Label>
              <select id="c-gender" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formGender} onChange={(e) => setFormGender(e.target.value)}>
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="c-dob">Date of Birth *</Label>
              <Input id="c-dob" type="date" value={formDob} onChange={(e) => setFormDob(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="c-nat">Nationality *</Label>
              <Input id="c-nat" value={formNationality} onChange={(e) => setFormNationality(e.target.value)} placeholder="e.g. Indian" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="c-lang">Languages Spoken *</Label>
              <Input id="c-lang" value={formLanguages} onChange={(e) => setFormLanguages(e.target.value)} placeholder="e.g. English, Hindi" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="c-phone">Phone Number *</Label>
              <Input id="c-phone" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="91 0000000000" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="c-qual">Highest Qualification *</Label>
              <Input id="c-qual" value={formQualification} onChange={(e) => setFormQualification(e.target.value)} placeholder="e.g. Masters" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="c-doj">Date of Joining *</Label>
              <Input id="c-doj" type="date" value={formDoj} onChange={(e) => setFormDoj(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="c-email">Email Address *</Label>
              <Input id="c-email" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="email@example.com" disabled={dialogMode === 'edit'} />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="c-pwd">Password {dialogMode === 'add' ? '*' : '(leave empty to keep current)'}</Label>
              <Input id="c-pwd" type="text" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} placeholder="Password" />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="c-status">Status *</Label>
              <select id="c-status" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formStatus} onChange={(e) => setFormStatus(e.target.value)}>
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleDialogSave}
              disabled={formSaving || !formName.trim() || (dialogMode === 'add' && !formEmail.trim())}
              className="bg-ttii-primary hover:bg-ttii-primary/90"
            >
              {formSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
