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

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

interface ProgramForm {
  title: string;
  code: string;
  level: string;
  duration: string;
  description: string;
}

const emptyForm: ProgramForm = { title: '', code: '', level: '', duration: '', description: '' };

export default function ProgramDirectoryPage({ api, session, onNavigate }: AdminPageProps) {
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
        level: asString(program.level),
        duration: asString(program.duration),
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
        level: form.level || undefined,
        duration: form.duration.trim() || undefined,
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
    if (!window.confirm(`Delete program "${title}"?`)) return;
    try {
      await api.deleteProgram(session.token, id);
      reload();
    } catch { /* ignore */ }
  }, [api, session.token, reload]);

  const columns: DataTableColumn[] = [
    { key: 'title', label: 'Program Name', sortable: true },
    { key: 'code', label: 'Code' },
    { key: 'level', label: 'Level', render: (v) => {
      const l = asString(v);
      const labels: Record<string, string> = { certification: 'Certification', diploma: 'Diploma', pg_diploma: 'PG Diploma' };
      return labels[l] || l || '-';
    }},
    { key: 'duration', label: 'Duration' },
    { key: 'course_count', label: 'Courses' },
    { key: 'status', label: 'Status', render: (v) => (
      <Badge variant={v === 'active' ? 'default' : 'secondary'}>{asString(v) || 'active'}</Badge>
    )},
  ];

  const actions: DataTableAction[] = [
    { label: 'Courses', onClick: (row) => onNavigate(`/admin/programs/courses/${asString(row.id)}`) },
    { label: 'Edit', onClick: (row) => void handleOpenEdit(row) },
    { label: 'Delete', onClick: (row) => void handleDelete(row), variant: 'destructive' },
  ];

  if (loading) {
    return <PageLoader label="Loading program directory..." />;
  }

  if (error) {
    return <Card><CardContent className="py-8 text-center text-sm text-red-600">{error}</CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Programs" addLabel="+ New Program" onAdd={handleOpenAdd} />
      <AdminDataTable columns={columns} rows={rows} actions={actions} />

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setEditId(''); setForm(emptyForm); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Program' : 'New Program'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Diploma in Montessori Education" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Code</Label>
                <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="e.g. DME-2025" />
              </div>
              <div>
                <Label>Level</Label>
                <select className={selectClass} value={form.level} onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}>
                  <option value="">-- Select --</option>
                  <option value="certification">Certification</option>
                  <option value="diploma">Diploma</option>
                  <option value="pg_diploma">PG Diploma</option>
                </select>
              </div>
            </div>
            <div>
              <Label>Duration</Label>
              <Input value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))} placeholder="e.g. 1 Year" />
            </div>
            <div>
              <Label>Description</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Program description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditId(''); setForm(emptyForm); }} disabled={saving}>Cancel</Button>
            <Button onClick={() => { void handleSave(); }} disabled={saving || !form.title.trim()}>
              {saving ? 'Saving...' : editId ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
