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
import { FileUpload } from '../../shared/components/FileUpload.js';
import { useConfirm } from '@/components/confirm-dialog';

interface InstructorForm {
  name: string;
  email: string;
  phone: string;
  whatsapp_phone: string;
  qualification: string;
  bio: string;
  image: string;
  status: number;
}

const emptyForm: InstructorForm = { name: '', email: '', phone: '', whatsapp_phone: '', qualification: '', bio: '', image: '', status: 1 };

export default function InstructorsPage({ api, session, onNavigate }: AdminPageProps) {
  const confirm = useConfirm();
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
      bio: asString(row.biography || row.bio || row.description),
      image: asString(row.image) || asString(row.profile_picture),
      status: asNumber(row.status),
    });
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback(async (row: Record<string, unknown>) => {
    const id = asString(row._id || row.id);
    if (!(await confirm({
      title: `Delete instructor "${asString(row.name)}"?`,
      description: 'This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive',
    }))) return;
    try {
      await api.deleteInstructor(session.token, id);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete instructor');
    }
  }, [api, session.token, reload, confirm]);

  const handleSubmit = useCallback(async () => {
    if (!editingId) {
      const missing = !form.name.trim() || !form.email.trim() || !form.phone.trim()
        || !form.whatsapp_phone.trim() || !form.qualification.trim() || !form.bio.trim();
      if (missing) {
        toast.error('All fields are required.');
        return;
      }
    } else if (!form.name.trim()) {
      toast.error('Name is required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        whatsapp_phone: form.whatsapp_phone.trim() || undefined,
        qualification: form.qualification.trim() || undefined,
        bio: form.bio.trim() || undefined,
        image: form.image.trim() || undefined,
        status: form.status,
      };
      if (editingId) {
        await api.editInstructor(session.token, editingId, payload);
      } else {
        const res = await api.addInstructor(session.token, payload);
        const message = asString((res as Record<string, unknown>).message);
        if (message) toast.success(message);
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
          void (async () => {
            if (!(await confirm({
              title: 'Reset device binding for this instructor?',
              confirmText: 'Reset',
              variant: 'default',
            }))) return;
            window.location.href = '/admin/instructor/change_device/' + asString(row._id || row.id);
          })();
        },
      },
    ],
    [openEdit, handleDelete, confirm],
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
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSubmit();
            }}
          >
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Instructor' : 'Add Instructor'}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2 max-h-[70vh] overflow-y-auto">
            <div className="grid gap-2">
              <Label>Profile Photo</Label>
              <FileUpload
                value={form.image}
                onChange={(url) => setForm((f) => ({ ...f, image: url }))}
                onUpload={async (file) => {
                  const r = await api.uploadFile(session.token, file);
                  return r.url;
                }}
                accept="image/*"
                placeholder="Upload profile photo"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="inst-name">Name *</Label>
              <Input
                id="inst-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Name"
                required
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
                required
              />
            </div>

            {!editingId && (
              <p className="rounded-md border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
                A secure temporary password will be auto-generated and emailed to <span className="font-semibold">{form.email || 'this instructor'}</span> on save. They&rsquo;ll be prompted to change it on first sign-in.
              </p>
            )}

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
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-ttii-primary hover:bg-ttii-primary/90"
              disabled={saving || !form.name.trim() || !form.email.trim()}
            >
              {saving ? 'Saving...' : editingId ? 'Update' : 'Add Instructor'}
            </Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
