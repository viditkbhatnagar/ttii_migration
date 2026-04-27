import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, toRecords } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn, type DataTableAction } from '../../shared/components/AdminDataTable.js';
import { useConfirm } from '@/components/confirm-dialog';

interface ProgramForm {
  title: string;
  code: string;
  description: string;
}

const emptyForm: ProgramForm = { title: '', code: '', description: '' };

export default function ProgramDirectoryPage({ api, session, onNavigate }: AdminPageProps) {
  const confirm = useConfirm();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState('');
  const [form, setForm] = useState<ProgramForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const { data, loading, error, reload } = useAdminPageData(
    () => api.listPrograms(session.token),
    [],
  );

  const rows = useMemo(() => toRecords(data), [data]);

  const handleOpenAdd = useCallback(() => {
    setEditId('');
    setForm(emptyForm);
    setShowForm(true);
  }, []);

  const handleOpenEdit = useCallback(async (row: Record<string, unknown>) => {
    const id = asString(row.id);
    const program = await api.getProgram(session.token, id);
    if (program) {
      setEditId(id);
      setForm({
        title: asString(program.title),
        code: asString(program.code),
        description: asString(program.description),
      });
      setShowForm(true);
    }
  }, [api, session.token]);

  const handleSave = useCallback(async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        code: form.code.trim() || undefined,
        description: form.description.trim() || undefined,
      };
      if (editId) {
        await api.updateProgram(session.token, editId, payload);
      } else {
        await api.createProgram(session.token, payload);
      }
      setShowForm(false);
      setForm(emptyForm);
      setEditId('');
      reload();
    } catch { /* ignore */ } finally { setSaving(false); }
  }, [api, session.token, editId, form, reload]);

  const handleDelete = useCallback(async (row: Record<string, unknown>) => {
    const id = asString(row.id);
    const title = asString(row.title);
    if (!(await confirm({
      title: `Delete program "${title}"?`,
      description: 'This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive',
    }))) return;
    try {
      await api.deleteProgram(session.token, id);
      reload();
    } catch { /* ignore */ }
  }, [api, session.token, reload, confirm]);

  const columns: DataTableColumn[] = [
    { key: 'code', label: 'Code' },
    { key: 'title', label: 'Program Name', sortable: true },
    {
      key: 'description',
      label: 'Description',
      className: 'max-w-md whitespace-normal align-top',
      render: (v) => {
        const text = asString(v);
        if (!text) return <span className="text-slate-400">—</span>;
        return (
          <p title={text} className="line-clamp-3 break-words text-sm leading-snug text-slate-700">
            {text}
          </p>
        );
      },
    },
    { key: 'course_count', label: 'No of Courses' },
    {
      key: 'course_titles',
      label: 'Courses',
      className: 'max-w-sm whitespace-normal align-top',
      render: (v) => {
        const list = Array.isArray(v) ? (v as string[]).filter(Boolean) : [];
        if (list.length === 0) return <span className="text-slate-400">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {list.slice(0, 3).map((t, idx) => (
              <span key={t + idx} className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{t}</span>
            ))}
            {list.length > 3 ? <span className="text-xs text-slate-500">+{list.length - 3}</span> : null}
          </div>
        );
      },
    },
    { key: 'status', label: 'Status', render: (v) => (
      <Badge variant={v === 'active' ? 'default' : 'secondary'}>{asString(v) || 'active'}</Badge>
    )},
  ];

  const actions: DataTableAction[] = [
    { label: 'View', onClick: (row) => onNavigate(`/admin/programs/view/${asString(row.id)}`) },
    { label: 'Edit', onClick: (row) => void handleOpenEdit(row) },
    { label: 'Delete', onClick: (row) => void handleDelete(row), variant: 'destructive' },
  ];

  if (loading) {
    return <PageLoader label="Loading program directory..." />;
  }

  if (error) {
    return <Card><CardContent role="alert" className="py-8 text-center text-sm text-red-600">{error}</CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Programs" addLabel="+ New Program" onAdd={handleOpenAdd} />
      <AdminDataTable columns={columns} rows={rows} actions={actions} />

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setEditId(''); setForm(emptyForm); } }}>
        <DialogContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSave();
            }}
          >
          <DialogHeader className="mb-5">
            <DialogTitle>{editId ? 'Edit Program' : 'New Program'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="program-code">Program Code</Label>
              <Input id="program-code" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="e.g. DME-2025" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="program-name">Program Name *</Label>
              <Input id="program-name" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Diploma in Montessori Education" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="program-description">Program Description</Label>
              <textarea
                id="program-description"
                rows={4}
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Short description of the program"
              />
            </div>
          </div>
          <DialogFooter className="mt-6 gap-2">
            <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditId(''); setForm(emptyForm); }} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving || !form.title.trim()}>
              {saving ? 'Saving...' : editId ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
