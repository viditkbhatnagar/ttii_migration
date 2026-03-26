import { useState, useMemo, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, toRecords } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn, type DataTableAction } from '../../shared/components/AdminDataTable.js';

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

interface PolicyForm {
  title: string;
  course_id: string;
  min_progress_pct: string;
  min_exam_score_pct: string;
  require_all_assignments: boolean;
  require_all_exams: boolean;
  min_attendance_pct: string;
  require_manual_approval: boolean;
}

const emptyForm: PolicyForm = {
  title: '', course_id: '', min_progress_pct: '80', min_exam_score_pct: '',
  require_all_assignments: false, require_all_exams: false, min_attendance_pct: '', require_manual_approval: false,
};

export default function CompletionPoliciesPage({ api, session }: AdminPageProps) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState('');
  const [form, setForm] = useState<PolicyForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const { data, loading, error, reload } = useAdminPageData(() => api.listCompletionPolicies(session.token), []);
  const { data: coursesData } = useAdminPageData(() => api.loadCourses(session.token), []);
  const rows = useMemo(() => toRecords(data), [data]);
  const courses = useMemo(() => toRecords(coursesData), [coursesData]);

  const handleOpenAdd = useCallback(() => { setEditId(''); setForm(emptyForm); setShowForm(true); }, []);

  const handleOpenEdit = useCallback((row: Record<string, unknown>) => {
    setEditId(asString(row.id));
    setForm({
      title: asString(row.title),
      course_id: asString(row.course_id),
      min_progress_pct: String(row.min_progress_pct ?? 80),
      min_exam_score_pct: String(row.min_exam_score_pct ?? ''),
      require_all_assignments: Number(row.require_all_assignments) === 1,
      require_all_exams: Number(row.require_all_exams) === 1,
      min_attendance_pct: String(row.min_attendance_pct ?? ''),
      require_manual_approval: Number(row.require_manual_approval) === 1,
    });
    setShowForm(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        course_id: form.course_id || undefined,
        min_progress_pct: Number(form.min_progress_pct) || 80,
        min_exam_score_pct: form.min_exam_score_pct ? Number(form.min_exam_score_pct) : undefined,
        require_all_assignments: form.require_all_assignments ? 1 : 0,
        require_all_exams: form.require_all_exams ? 1 : 0,
        min_attendance_pct: form.min_attendance_pct ? Number(form.min_attendance_pct) : undefined,
        require_manual_approval: form.require_manual_approval ? 1 : 0,
      };
      if (editId) await api.updateCompletionPolicy(session.token, editId, payload);
      else await api.createCompletionPolicy(session.token, payload);
      setShowForm(false); setEditId(''); setForm(emptyForm); reload();
    } catch { /* ignore */ } finally { setSaving(false); }
  }, [api, session.token, editId, form, reload]);

  const handleDelete = useCallback(async (row: Record<string, unknown>) => {
    if (!window.confirm(`Delete policy "${asString(row.title)}"?`)) return;
    try { await api.deleteCompletionPolicy(session.token, asString(row.id)); reload(); } catch { /* ignore */ }
  }, [api, session.token, reload]);

  const columns: DataTableColumn[] = [
    { key: 'title', label: 'Policy Name', sortable: true },
    { key: 'course_title', label: 'Course', render: (v) => String(v || 'All Courses') },
    { key: 'min_progress_pct', label: 'Min Progress %' },
    { key: 'min_exam_score_pct', label: 'Min Exam %', render: (v) => String(v || '-') },
    { key: 'min_attendance_pct', label: 'Min Attendance %', render: (v) => String(v || '-') },
    { key: 'require_manual_approval', label: 'Manual Approval', render: (v) => Number(v) === 1 ? 'Yes' : 'No' },
  ];

  const actions: DataTableAction[] = [
    { label: 'Edit', onClick: (row) => handleOpenEdit(row) },
    { label: 'Delete', onClick: (row) => void handleDelete(row), variant: 'destructive' },
  ];

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;
  if (error) return <Card><CardContent className="py-8 text-center text-sm text-red-600">{error}</CardContent></Card>;

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Completion Policies" addLabel="+ New Policy" onAdd={handleOpenAdd} />
      <AdminDataTable columns={columns} rows={rows} actions={actions} />

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setEditId(''); setForm(emptyForm); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? 'Edit Policy' : 'New Completion Policy'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Diploma Standard Completion" /></div>
            <div><Label>Course (optional)</Label>
              <select className={selectClass} value={form.course_id} onChange={(e) => setForm((f) => ({ ...f, course_id: e.target.value }))}>
                <option value="">All Courses</option>
                {courses.map((c) => <option key={asString(c.id)} value={asString(c.id)}>{asString(c.title)}</option>)}
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Min Progress %</Label><Input type="number" value={form.min_progress_pct} onChange={(e) => setForm((f) => ({ ...f, min_progress_pct: e.target.value }))} /></div>
              <div><Label>Min Exam Score %</Label><Input type="number" value={form.min_exam_score_pct} onChange={(e) => setForm((f) => ({ ...f, min_exam_score_pct: e.target.value }))} placeholder="Optional" /></div>
              <div><Label>Min Attendance %</Label><Input type="number" value={form.min_attendance_pct} onChange={(e) => setForm((f) => ({ ...f, min_attendance_pct: e.target.value }))} placeholder="Optional" /></div>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.require_all_assignments} onChange={(e) => setForm((f) => ({ ...f, require_all_assignments: e.target.checked }))} className="h-4 w-4" /><span className="text-sm">Require all assignments completed</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.require_all_exams} onChange={(e) => setForm((f) => ({ ...f, require_all_exams: e.target.checked }))} className="h-4 w-4" /><span className="text-sm">Require all exams passed</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.require_manual_approval} onChange={(e) => setForm((f) => ({ ...f, require_manual_approval: e.target.checked }))} className="h-4 w-4" /><span className="text-sm">Require manual approval before issuing certificate</span></label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditId(''); setForm(emptyForm); }} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.title.trim()}>{saving ? 'Saving...' : editId ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
