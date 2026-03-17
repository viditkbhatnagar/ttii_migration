import { useState, useMemo, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn, type DataTableAction } from '../../shared/components/AdminDataTable.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';

interface InstructorForm {
  name: string;
  email: string;
  phone: string;
  bio: string;
  status: number;
}

const emptyForm: InstructorForm = { name: '', email: '', phone: '', bio: '', status: 1 };

export default function InstructorsPage({ api, session }: AdminPageProps) {
  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadInstructors(session.token),
    [],
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<InstructorForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const allInstructors = useMemo(() => toRecords(data), [data]);

  const activeCount = useMemo(
    () => allInstructors.filter((row) => asNumber(row.status) === 1).length,
    [allInstructors],
  );

  const inactiveCount = useMemo(
    () => allInstructors.filter((row) => asNumber(row.status) !== 1).length,
    [allInstructors],
  );

  const openAdd = useCallback(() => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((row: Record<string, unknown>) => {
    setEditingId(asString(row._id || row.id));
    setForm({
      name: asString(row.name),
      email: asString(row.user_email),
      phone: asString(row.phone),
      bio: asString(row.bio || row.description),
      status: asNumber(row.status),
    });
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback(async (row: Record<string, unknown>) => {
    const id = asString(row._id || row.id);
    if (!window.confirm(`Are you sure you want to delete instructor "${asString(row.name)}"?`)) return;
    try {
      await api.deleteInstructor(session.token, id);
      reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete instructor');
    }
  }, [api, session.token, reload]);

  const handleSubmit = useCallback(async () => {
    if (!form.name.trim() || !form.email.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        bio: form.bio.trim() || undefined,
        status: form.status,
      };
      if (editingId) {
        await api.editInstructor(session.token, editingId, payload);
      } else {
        await api.addInstructor(session.token, payload);
      }
      setDialogOpen(false);
      reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save instructor');
    } finally {
      setSaving(false);
    }
  }, [form, editingId, api, session.token, reload]);

  const columns: DataTableColumn[] = useMemo(
    () => [
      { key: 'name', label: 'Name', sortable: true },
      { key: 'phone', label: 'Phone' },
      { key: 'user_email', label: 'Email' },
      { key: 'verification_code', label: 'OTP' },
      { key: 'assigned_courses', label: 'Enrolled Courses' },
      {
        key: 'status',
        label: 'Status',
        render: (v) => (
          <AdminStatusBadge status={asNumber(v) === 1 ? 'Active' : 'Inactive'} />
        ),
      },
      { key: 'created_at', label: 'Joined', render: (v) => formatDate(v) },
    ],
    [],
  );

  const actions: DataTableAction[] = useMemo(
    () => [
      {
        label: 'Edit',
        onClick: (row) => openEdit(row),
      },
      {
        label: 'Delete',
        variant: 'destructive',
        onClick: (row) => { void handleDelete(row); },
      },
    ],
    [openEdit, handleDelete],
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
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
      <AdminPageHeader title="Instructors Directory" addLabel="+ Add Instructor" onAdd={openAdd} />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Instructors', value: allInstructors.length },
          { label: 'Active', value: activeCount },
          { label: 'Inactive', value: inactiveCount },
        ].map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <AdminDataTable columns={columns} rows={allInstructors} actions={actions} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Instructor' : 'Add Instructor'}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="inst-name">Full Name</Label>
              <Input
                id="inst-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Enter full name"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="inst-email">Email</Label>
              <Input
                id="inst-email"
                type="email"
                value={form.email}
                disabled={!!editingId}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="Enter email address"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="inst-phone">Phone</Label>
              <Input
                id="inst-phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="Enter phone number"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="inst-bio">Bio / Description</Label>
              <textarea
                id="inst-bio"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                placeholder="Enter bio or description"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="inst-status">Status</Label>
              <select
                id="inst-status"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: Number(e.target.value) }))}
              >
                <option value={1}>Active</option>
                <option value={0}>Inactive</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-ttii-primary hover:bg-ttii-primary/90"
              disabled={saving || !form.name.trim() || !form.email.trim()}
              onClick={handleSubmit}
            >
              {saving ? 'Saving...' : editingId ? 'Update' : 'Add Instructor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
