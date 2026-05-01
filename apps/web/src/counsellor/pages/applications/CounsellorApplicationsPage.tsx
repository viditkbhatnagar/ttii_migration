import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useConfirm } from '@/components/confirm-dialog';
import { AdminDataTable, type DataTableAction, type DataTableColumn } from '../../../admin/shared/components/AdminDataTable.js';
import { AdminPageHeader } from '../../../admin/shared/components/AdminPageHeader.js';
import { AdminStatusBadge } from '../../../admin/shared/components/AdminStatusBadge.js';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asString, formatDate, toRecords } from '../../../admin/shared/utils/admin-data-utils.js';
import type { CounsellorPageProps } from '../../routing/counsellor-routes.js';

interface AddForm {
  name: string;
  email: string;
  phone: string;
  course_id: string;
}

const emptyAdd: AddForm = { name: '', email: '', phone: '', course_id: '' };

export default function CounsellorApplicationsPage({ api, session }: CounsellorPageProps) {
  const confirm = useConfirm();

  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadApplications(session.token),
    [api, session.token],
  );
  const rows = useMemo(() => toRecords(data), [data]);

  const { data: courseData } = useAdminPageData(
    () => api.loadCourses(session.token),
    [api, session.token],
  );
  const courses = useMemo(() => toRecords(courseData), [courseData]);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewRow, setViewRow] = useState<Record<string, unknown> | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<AddForm>(emptyAdd);
  const [addSaving, setAddSaving] = useState(false);

  const onView = useCallback(async (row: Record<string, unknown>) => {
    setViewOpen(true);
    setViewLoading(true);
    setViewRow(null);
    try {
      const detail = await api.getApplication(session.token, asString(row.id));
      setViewRow(detail);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not load application.');
      setViewOpen(false);
    } finally {
      setViewLoading(false);
    }
  }, [api, session.token]);

  const onConvert = useCallback(async (row: Record<string, unknown>) => {
    const ok = await confirm({
      title: 'Convert to enrollment?',
      description: `This marks ${asString(row.name) || 'this application'} as converted and creates a student record.`,
      confirmText: 'Convert',
    });
    if (!ok) return;
    try {
      await api.convertApplication(session.token, asString(row.id));
      toast.success('Application converted.');
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not convert application.');
    }
  }, [api, confirm, reload, session.token]);

  const onReject = useCallback(async (row: Record<string, unknown>) => {
    const reason = window.prompt('Reason for rejection (optional):', '');
    if (reason === null) return;
    try {
      await api.updateApplicationStatus(session.token, asString(row.id), 'rejected', reason);
      toast.success('Application rejected.');
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update status.');
    }
  }, [api, reload, session.token]);

  const onSubmitAdd = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (addForm.name.trim() === '' || addForm.phone.trim() === '') {
      toast.error('Name and phone are required.');
      return;
    }
    setAddSaving(true);
    try {
      await api.createApplication(session.token, {
        name: addForm.name.trim(),
        user_email: addForm.email.trim(),
        phone: addForm.phone.trim(),
        course_id: addForm.course_id,
      });
      toast.success('Application added.');
      setAddOpen(false);
      setAddForm(emptyAdd);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add application.');
    } finally {
      setAddSaving(false);
    }
  }, [addForm, api, reload, session.token]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!addOpen) setAddForm(emptyAdd);
  }, [addOpen]);

  const columns: DataTableColumn[] = useMemo(() => [
    { key: 'application_id', label: 'App ID', sortable: true, render: (v) => asString(v) || '—' },
    { key: 'name', label: 'Name', sortable: true },
    { key: 'phone', label: 'Phone' },
    { key: 'user_email', label: 'Email', sortable: true },
    { key: 'course_title', label: 'Course', sortable: true, render: (v) => asString(v) || '—' },
    { key: 'created_at', label: 'Date', sortable: true, render: (v) => formatDate(v) },
    {
      key: 'status',
      label: 'Status',
      render: (v) => <AdminStatusBadge status={asString(v) || 'pending'} />,
    },
  ], []);

  const actions: DataTableAction[] = useMemo(() => [
    { label: 'View', onClick: (row) => void onView(row) },
    {
      label: 'Convert',
      onClick: (row) => void onConvert(row),
    },
    {
      label: 'Reject',
      onClick: (row) => void onReject(row),
      variant: 'destructive',
    },
  ], [onView, onConvert, onReject]);

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="My Applications"
        addLabel="Add Application"
        onAdd={() => setAddOpen(true)}
      />
      <p className="-mt-2 text-sm text-gray-500">Applications assigned to you</p>

      {error ? (
        <Card className="bg-white"><CardContent className="py-8 text-center"><p role="alert" className="text-sm text-red-600">{error}</p></CardContent></Card>
      ) : loading ? (
        <Card className="bg-white"><CardContent className="py-8 text-center text-sm text-gray-500">Loading applications…</CardContent></Card>
      ) : (
        <AdminDataTable columns={columns} rows={rows} actions={actions} searchable exportable />
      )}

      {/* Add Application dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="w-[min(560px,calc(100vw-2rem))] max-w-[min(560px,calc(100vw-2rem))] overflow-hidden">
          <DialogHeader><DialogTitle>Add Application</DialogTitle></DialogHeader>
          <form onSubmit={(e) => void onSubmitAdd(e)} className="w-full min-w-0">
            <div className="w-full min-w-0 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="add-name">Name *</Label>
                <Input id="add-name" value={addForm.name} onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="add-phone">Phone *</Label>
                  <Input id="add-phone" value={addForm.phone} onChange={(e) => setAddForm((p) => ({ ...p, phone: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="add-email">Email</Label>
                  <Input id="add-email" type="email" value={addForm.email} onChange={(e) => setAddForm((p) => ({ ...p, email: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-course">Course</Label>
                <select
                  id="add-course"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={addForm.course_id}
                  onChange={(e) => setAddForm((p) => ({ ...p, course_id: e.target.value }))}
                >
                  <option value="">Select a course</option>
                  {courses.map((c) => (
                    <option key={asString(c.id)} value={asString(c.id)}>{asString(c.title)}</option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter className="mt-5">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)} disabled={addSaving}>Cancel</Button>
              <Button type="submit" disabled={addSaving} className="bg-ttii-primary hover:bg-ttii-primary/90">
                {addSaving ? 'Saving…' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Application dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="w-[min(640px,calc(100vw-2rem))] max-w-[min(640px,calc(100vw-2rem))] overflow-hidden">
          <DialogHeader><DialogTitle>Application Details</DialogTitle></DialogHeader>
          {viewLoading ? (
            <p className="py-8 text-center text-sm text-gray-500">Loading…</p>
          ) : viewRow ? (
            <div className="grid max-h-[70vh] grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2">
              <Field label="Application ID" value={asString(viewRow.application_id)} />
              <Field label="Status" value={asString(viewRow.status) || 'pending'} />
              <Field label="Name" value={asString(viewRow.name)} />
              <Field label="Phone" value={asString(viewRow.phone)} />
              <Field label="Email" value={asString(viewRow.user_email) || asString(viewRow.email)} />
              <Field label="Course" value={asString(viewRow.course_title)} />
              <Field label="Pipeline" value={asString(viewRow.pipeline_role)} />
              <Field label="Pipeline User" value={asString(viewRow.pipeline_user_name)} />
              <Field label="Date" value={formatDate(viewRow.created_at)} />
              <Field label="Lead Source" value={asString(viewRow.lead_source)} />
              <Field label="Note" value={asString(viewRow.lead_note)} className="sm:col-span-2" />
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-gray-500">No data.</p>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setViewOpen(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={`grid gap-1 ${className ?? ''}`}>
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-sm text-gray-900">{value || <span className="text-gray-400">—</span>}</p>
    </div>
  );
}
