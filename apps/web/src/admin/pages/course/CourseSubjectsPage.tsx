import { useState, useMemo, useCallback } from 'react';
import { Pencil, Trash2, Database } from 'lucide-react';
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

interface SubjectFormState {
  title: string;
  description: string;
  order: string;
}

const emptyForm: SubjectFormState = { title: '', description: '', order: '' };

export default function CourseSubjectsPage({ api, session }: AdminPageProps) {
  const [showForm, setShowForm] = useState(false);
  const [showSelectDialog, setShowSelectDialog] = useState(false);
  const [editId, setEditId] = useState('');
  const [form, setForm] = useState<SubjectFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<Set<string>>(new Set());

  const courseId = useMemo(() => {
    const match = window.location.pathname.match(/\/admin\/course\/subjects\/(.+)/);
    return match?.[1] ?? '';
  }, []);

  const { data: courseData } = useAdminPageData(
    () => api.getCourse(session.token, courseId),
    [courseId],
  );

  const { data: subjectsData, loading, error, reload } = useAdminPageData(
    () => api.listCourseSubjects(session.token, courseId),
    [courseId],
  );

  const { data: allSubjectsData, loading: allSubjectsLoading } = useAdminPageData(
    () => (showSelectDialog ? api.listAllSubjects(session.token) : Promise.resolve([])),
    [showSelectDialog],
  );

  const rows = useMemo(() => toRecords(subjectsData), [subjectsData]);
  const allSubjects = useMemo(() => toRecords(allSubjectsData), [allSubjectsData]);

  const courseTitle = useMemo(() => {
    if (!courseData) return '';
    if (Array.isArray(courseData)) return '';
    return asString((courseData as Record<string, unknown>).title);
  }, [courseData]);

  const handleOpenAdd = useCallback(() => {
    setEditId('');
    setForm(emptyForm);
    setShowForm(true);
  }, []);

  const handleOpenEdit = useCallback((row: Record<string, unknown>) => {
    setEditId(asString(row.id));
    setForm({
      title: asString(row.title),
      description: asString(row.description),
      order: row.order != null ? String(row.order) : '',
    });
    setShowForm(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (editId) {
        await api.editSubject(session.token, editId, {
          course_id: courseId,
          title: form.title.trim(),
          description: form.description.trim(),
          order: form.order ? Number(form.order) : 0,
        });
      } else {
        await api.addSubject(session.token, {
          course_id: courseId,
          title: form.title.trim(),
          description: form.description.trim(),
        });
      }
      setShowForm(false);
      setForm(emptyForm);
      setEditId('');
      reload();
    } catch { /* ignore */ } finally { setSaving(false); }
  }, [api, session.token, courseId, editId, form, reload]);

  const handleDelete = useCallback(async (row: Record<string, unknown>) => {
    const id = asString(row.id);
    const title = asString(row.title);
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
    setSaving(true);
    try {
      await api.deleteSubject(session.token, id);
      reload();
    } catch { /* ignore */ } finally { setSaving(false); }
  }, [api, session.token, reload]);

  const handleToggleSubject = useCallback((id: string) => {
    setSelectedSubjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleAddSelected = useCallback(async () => {
    if (selectedSubjectIds.size === 0) return;
    setSaving(true);
    try {
      for (const subjectId of selectedSubjectIds) {
        const subject = allSubjects.find((s) => asString(s.id) === subjectId);
        if (subject) {
          await api.addSubject(session.token, {
            course_id: courseId,
            title: asString(subject.title),
            description: asString(subject.description),
          });
        }
      }
      setShowSelectDialog(false);
      setSelectedSubjectIds(new Set());
      reload();
    } catch { /* ignore */ } finally { setSaving(false); }
  }, [api, session.token, courseId, allSubjects, selectedSubjectIds, reload]);

  const updateField = useCallback((field: keyof SubjectFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const columns: DataTableColumn[] = [
    { key: 'title', label: 'Subject Name', sortable: true },
    { key: 'description', label: 'Description' },
    { key: 'lesson_count', label: 'Lessons Count' },
    { key: 'order', label: 'Order', sortable: true },
  ];

  const actions: DataTableAction[] = [
    {
      label: 'Edit',
      onClick: (row) => handleOpenEdit(row),
    },
    {
      label: 'Delete',
      onClick: (row) => handleDelete(row),
      variant: 'destructive',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-red-600">{error}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {courseTitle && (
        <p className="text-sm text-gray-500">
          Course: <span className="font-medium text-gray-800">{courseTitle}</span>
        </p>
      )}

      <AdminPageHeader title="Course Subjects" addLabel="+ Add Subject" onAdd={handleOpenAdd}>
        <Button variant="outline" className="gap-1.5" onClick={() => { setSelectedSubjectIds(new Set()); setShowSelectDialog(true); }}>
          <Database className="size-4" />
          Select Subject from DB
        </Button>
      </AdminPageHeader>

      <AdminDataTable columns={columns} rows={rows} actions={actions} />

      {/* Add / Edit Subject Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setEditId(''); setForm(emptyForm); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Subject' : 'Add Subject'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => updateField('title', e.target.value)} placeholder="Subject title" />
            </div>
            <div>
              <Label>Description</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Subject description"
              />
            </div>
            <div>
              <Label>Order</Label>
              <Input type="number" value={form.order} onChange={(e) => updateField('order', e.target.value)} placeholder="0" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditId(''); setForm(emptyForm); }} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.title.trim()}>
              {saving ? 'Saving...' : editId ? 'Update Subject' : 'Add Subject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Select Subject from DB Dialog */}
      <Dialog open={showSelectDialog} onOpenChange={(open) => { if (!open) { setShowSelectDialog(false); setSelectedSubjectIds(new Set()); } }}>
        <DialogContent className="max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Select Subjects from Database</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-2">
            {allSubjectsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : allSubjects.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No subjects found.</p>
            ) : (
              allSubjects.map((subject) => {
                const id = asString(subject.id);
                const checked = selectedSubjectIds.has(id);
                return (
                  <label
                    key={id}
                    className="flex items-center gap-3 rounded-md border border-gray-200 px-3 py-2 cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleSubject(id)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{asString(subject.title)}</p>
                      {asString(subject.description) && (
                        <p className="text-xs text-gray-500 truncate">{asString(subject.description)}</p>
                      )}
                    </div>
                  </label>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowSelectDialog(false); setSelectedSubjectIds(new Set()); }} disabled={saving}>Cancel</Button>
            <Button onClick={handleAddSelected} disabled={saving || selectedSubjectIds.size === 0}>
              {saving ? 'Adding...' : `Add ${selectedSubjectIds.size > 0 ? `(${selectedSubjectIds.size})` : ''} Selected`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
