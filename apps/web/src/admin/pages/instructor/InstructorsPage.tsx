import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber, toRecords } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn, type DataTableAction } from '../../shared/components/AdminDataTable.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';

interface InstructorForm {
  name: string;
  email: string;
  phone: string;
  whatsapp_phone: string;
  qualification: string;
  password: string;
  bio: string;
  status: number;
}

const emptyForm: InstructorForm = { name: '', email: '', phone: '', whatsapp_phone: '', qualification: '', password: '', bio: '', status: 1 };

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  let p = '';
  for (let i = 0; i < 10; i++) p += chars[Math.floor(Math.random() * chars.length)];
  return p;
}

export default function InstructorsPage({ api, session, onNavigate }: AdminPageProps) {
  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadInstructors(session.token),
    [],
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<InstructorForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const allInstructors = useMemo(() => toRecords(data), [data]);

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
      whatsapp_phone: asString(row.whatsapp_phone),
      qualification: asString(row.qualification),
      password: '',
      bio: asString(row.biography || row.bio || row.description),
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
      toast.error(err instanceof Error ? err.message : 'Failed to delete instructor');
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
        whatsapp_phone: form.whatsapp_phone.trim() || undefined,
        qualification: form.qualification.trim() || undefined,
        password: form.password.trim() || undefined,
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
      toast.error(err instanceof Error ? err.message : 'Failed to save instructor');
    } finally {
      setSaving(false);
    }
  }, [form, editingId, api, session.token, reload]);

  const columns: DataTableColumn[] = useMemo(
    () => [
      { key: 'name', label: 'Name', sortable: true, render: (v) => asString(v) || '-' },
      { key: 'phone', label: 'Phone', sortable: true, render: (v) => asString(v) || '-' },
      { key: 'user_email', label: 'Email', sortable: true, render: (v) => asString(v) || '-' },
      { key: 'verification_code', label: 'OTP', sortable: true, render: (v) => asString(v) || '-' },
      {
        key: 'assigned_courses',
        label: 'Course',
        sortable: true,
        render: (_v, row) => (
          <button
            type="button"
            className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-200"
            onClick={() => onNavigate('/admin/course/index?instructor=' + asString(row?._id || row?.id))}
          >
            Enrolled Courses
          </button>
        ),
      },
      {
        key: 'students_count',
        label: 'Students',
        sortable: true,
        render: (v) => String(asNumber(v) || 0),
      },
      {
        key: 'status',
        label: 'Status',
        render: (v) => (
          <AdminStatusBadge status={asNumber(v) === 1 ? 'Active' : 'Inactive'} />
        ),
      },
    ],
    [onNavigate],
  );

  const actions: DataTableAction[] = useMemo(
    () => [
      { label: 'View', onClick: (row) => openEdit(row) },
      { label: 'Edit', onClick: (row) => openEdit(row) },
      { label: 'Delete', variant: 'destructive', onClick: (row) => { void handleDelete(row); } },
      {
        label: 'Change Device',
        onClick: (row) => {
          if (window.confirm('Reset device binding for this instructor?')) {
            window.location.href = '/admin/instructor/change_device/' + asString(row._id || row.id);
          }
        },
      },
    ],
    [openEdit, handleDelete],
  );

  if (loading) {
    return <PageLoader label="Loading instructors..." />;
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
      <AdminPageHeader title="Instructors" addLabel="+ Add Instructor" onAdd={openAdd} />
      <AdminDataTable columns={columns} rows={allInstructors} actions={actions} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Instructor' : 'Add Instructor'}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2 max-h-[70vh] overflow-y-auto">
            <div className="grid gap-2">
              <Label htmlFor="inst-name">Name *</Label>
              <Input
                id="inst-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Name"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="inst-phone">Phone *</Label>
                <Input
                  id="inst-phone"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="91 0000000000"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="inst-whatsapp">Whatsapp *</Label>
                <Input
                  id="inst-whatsapp"
                  value={form.whatsapp_phone}
                  onChange={(e) => setForm((f) => ({ ...f, whatsapp_phone: e.target.value }))}
                  placeholder="91 0000000000"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="inst-qual">Highest Qualification *</Label>
              <Input
                id="inst-qual"
                value={form.qualification}
                onChange={(e) => setForm((f) => ({ ...f, qualification: e.target.value }))}
                placeholder="e.g. Masters"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="inst-email">Email *</Label>
              <Input
                id="inst-email"
                type="email"
                value={form.email}
                disabled={!!editingId}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="email@example.com"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="inst-pwd">Password (Without Space) {!editingId ? '*' : '(leave empty to keep current)'}</Label>
              <div className="flex gap-2">
                <Input
                  id="inst-pwd"
                  type="text"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value.replace(/\s/g, '') }))}
                  placeholder="Password"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setForm((f) => ({ ...f, password: generatePassword() }))}
                >
                  Generate
                </Button>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="inst-bio">Biography *</Label>
              <textarea
                id="inst-bio"
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                placeholder="Enter biography (supports HTML)"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="inst-status">Status</Label>
              <select
                id="inst-status"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
              onClick={() => { void handleSubmit(); }}
            >
              {saving ? 'Saving...' : editingId ? 'Update' : 'Add Instructor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
