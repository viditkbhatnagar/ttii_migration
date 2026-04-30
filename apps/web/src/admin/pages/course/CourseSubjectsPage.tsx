import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { Database, ArrowUpDown } from 'lucide-react';
import { SortableList } from '../../shared/components/SortableList.js';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asNumber, asString, toRecords } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn, type DataTableAction } from '../../shared/components/AdminDataTable.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';
import { useConfirm } from '@/components/confirm-dialog';

const selectClass = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';
const textareaClass = 'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

interface SubjectFormState {
  title: string;
  subject_code: string;
  short_name: string;
  subject_type: string;
  duration_hours: string;
  version: string;
  description: string;
  learning_outcomes: string;
  skills_covered: string;
  assignment_max_marks: string;
  assignment_pass_marks: string;
  examination_max_marks: string;
  examination_pass_marks: string;
  project_max_marks: string;
  project_pass_marks: string;
  viva_max_marks: string;
  viva_pass_marks: string;
  status: string;
  order: string;
}

const emptyForm: SubjectFormState = {
  title: '',
  subject_code: '',
  short_name: '',
  subject_type: '',
  duration_hours: '',
  version: '',
  description: '',
  learning_outcomes: '',
  skills_covered: '',
  assignment_max_marks: '',
  assignment_pass_marks: '',
  examination_max_marks: '',
  examination_pass_marks: '',
  project_max_marks: '',
  project_pass_marks: '',
  viva_max_marks: '',
  viva_pass_marks: '',
  status: 'draft',
  order: '',
};

export default function CourseSubjectsPage({ api, session }: AdminPageProps) {
  const confirm = useConfirm();
  const [showForm, setShowForm] = useState(false);
  const [showSelectDialog, setShowSelectDialog] = useState(false);
  const [showReorderDialog, setShowReorderDialog] = useState(false);
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
    return asString((courseData).title);
  }, [courseData]);

  const totalMarks = useMemo(() => {
    const sum = Number(form.assignment_max_marks || 0)
      + Number(form.examination_max_marks || 0)
      + Number(form.project_max_marks || 0)
      + Number(form.viva_max_marks || 0);
    return sum;
  }, [form.assignment_max_marks, form.examination_max_marks, form.project_max_marks, form.viva_max_marks]);

  const handleOpenAdd = useCallback(() => {
    setEditId('');
    setForm(emptyForm);
    setShowForm(true);
  }, []);

  const handleOpenEdit = useCallback((row: Record<string, unknown>) => {
    setEditId(asString(row.id));
    setForm({
      title: asString(row.title),
      subject_code: asString(row.subject_code),
      short_name: asString(row.short_name),
      subject_type: asString(row.subject_type),
      duration_hours: asString(row.duration_hours),
      version: asString(row.version),
      description: asString(row.description),
      learning_outcomes: asString(row.learning_outcomes),
      skills_covered: asString(row.skills_covered),
      assignment_max_marks: asString(row.assignment_max_marks),
      assignment_pass_marks: asString(row.assignment_pass_marks),
      examination_max_marks: asString(row.examination_max_marks),
      examination_pass_marks: asString(row.examination_pass_marks),
      project_max_marks: asString(row.project_max_marks),
      project_pass_marks: asString(row.project_pass_marks),
      viva_max_marks: asString(row.viva_max_marks),
      viva_pass_marks: asString(row.viva_pass_marks),
      status: asString(row.status) || 'draft',
      order: row.order != null ? String(asNumber(row.order)) : '',
    });
    setShowForm(true);
  }, []);

  const buildPayload = useCallback(() => {
    const numOrUndef = (v: string) => (v.trim() === '' ? undefined : Number(v));
    return {
      course_id: courseId,
      title: form.title.trim(),
      subject_code: form.subject_code.trim(),
      short_name: form.short_name.trim(),
      subject_type: form.subject_type,
      duration_hours: numOrUndef(form.duration_hours),
      version: form.version.trim(),
      description: form.description.trim(),
      learning_outcomes: form.learning_outcomes.trim(),
      skills_covered: form.skills_covered.trim(),
      assignment_max_marks: numOrUndef(form.assignment_max_marks),
      assignment_pass_marks: numOrUndef(form.assignment_pass_marks),
      examination_max_marks: numOrUndef(form.examination_max_marks),
      examination_pass_marks: numOrUndef(form.examination_pass_marks),
      project_max_marks: numOrUndef(form.project_max_marks),
      project_pass_marks: numOrUndef(form.project_pass_marks),
      viva_max_marks: numOrUndef(form.viva_max_marks),
      viva_pass_marks: numOrUndef(form.viva_pass_marks),
      status: form.status,
      order: form.order ? Number(form.order) : undefined,
    };
  }, [courseId, form]);

  const handleSave = useCallback(async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (editId) {
        await api.editSubject(session.token, editId, buildPayload());
      } else {
        await api.addSubject(session.token, buildPayload());
      }
      setShowForm(false);
      setForm(emptyForm);
      setEditId('');
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save subject');
    } finally { setSaving(false); }
  }, [api, session.token, editId, buildPayload, form.title, reload]);

  const handleReorderSubjects = useCallback(async (nextIds: string[]) => {
    try {
      await api.reorderCourseSubjects(session.token, courseId, nextIds);
      toast.success('Order saved');
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save order');
    }
  }, [api, session.token, courseId, reload]);

  const handleUnlink = useCallback(async (row: Record<string, unknown>) => {
    const id = asString(row.id);
    const title = asString(row.title);
    const courseCount = Number(row.course_count ?? 1);
    const description = courseCount > 1
      ? `It's shared across ${courseCount} courses — only the link will be removed, not the subject itself.`
      : 'This subject is only used here, so it will also be permanently deleted.';
    if (!(await confirm({
      title: `Remove "${title}" from this course?`,
      description,
      confirmText: 'Remove',
      variant: 'destructive',
    }))) return;
    setSaving(true);
    try {
      await api.deleteSubject(session.token, id, courseId);
      reload();
    } catch { /* ignore */ } finally { setSaving(false); }
  }, [api, session.token, courseId, reload, confirm]);

  const handleToggleSubject = useCallback((id: string) => {
    setSelectedSubjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }, []);

  const handleLinkSelected = useCallback(async () => {
    if (selectedSubjectIds.size === 0) return;
    setSaving(true);
    try {
      for (const subjectId of selectedSubjectIds) {
        await api.linkSubjectToCourse(session.token, courseId, subjectId);
      }
      setShowSelectDialog(false);
      setSelectedSubjectIds(new Set());
      reload();
    } catch { /* ignore */ } finally { setSaving(false); }
  }, [api, session.token, courseId, selectedSubjectIds, reload]);

  const updateField = useCallback((field: keyof SubjectFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const columns: DataTableColumn[] = [
    { key: 'subject_code', label: 'Subject Code', sortable: true, render: (v) => asString(v) || '-' },
    { key: 'title', label: 'Subject Title', sortable: true },
    { key: 'subject_type', label: 'Type', render: (v) => asString(v) || '-' },
    { key: 'duration_hours', label: 'Duration (h)', render: (v) => (v != null ? String(asNumber(v)) : '-') },
    { key: 'total_lessons', label: 'Total Lessons', render: (v) => String(asNumber(v)) },
    { key: 'status', label: 'Status', render: (v) => <AdminStatusBadge status={asString(v) || 'draft'} /> },
    { key: 'order', label: 'Order', sortable: true },
  ];

  const actions: DataTableAction[] = [
    { label: 'Edit', onClick: (row) => handleOpenEdit(row) },
    { label: 'Remove', onClick: (row) => { void handleUnlink(row); }, variant: 'destructive' },
  ];

  if (loading) return <PageLoader label="Loading course subjects..." />;
  if (error) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-red-600">{error}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {courseTitle && (
        <p className="text-sm text-gray-500">Course: <span className="font-medium text-gray-800">{courseTitle}</span></p>
      )}

      <AdminPageHeader title="Course Subjects" addLabel="New Subject" onAdd={handleOpenAdd}>
        <Button variant="outline" className="gap-1.5" onClick={() => setShowReorderDialog(true)} disabled={rows.length < 2}>
          <ArrowUpDown className="size-4" />
          Reorder
        </Button>
        <Button variant="outline" className="gap-1.5" onClick={() => { setSelectedSubjectIds(new Set()); setShowSelectDialog(true); }}>
          <Database className="size-4" />
          Link Existing Subject
        </Button>
      </AdminPageHeader>

      <AdminDataTable columns={columns} rows={rows} actions={actions} />

      {/* Reorder Subjects dialog — drag to rearrange, save on drop */}
      <Dialog open={showReorderDialog} onOpenChange={(open) => { if (!open) setShowReorderDialog(false); }}>
        <DialogContent className="w-[min(560px,calc(100vw-2rem))] max-w-[min(560px,calc(100vw-2rem))]">
          <DialogHeader>
            <DialogTitle>Reorder Subjects</DialogTitle>
          </DialogHeader>
          <p className="mb-2 text-xs text-slate-500">Drag a subject to a new position. Order saves automatically.</p>
          <SortableList
            ids={rows.map((r) => asString(r.id))}
            onReorder={(nextIds) => { void handleReorderSubjects(nextIds); }}
            className="space-y-1"
          >
            {(id, handle) => {
              const row = rows.find((r) => asString(r.id) === id);
              if (!row) return null;
              return (
                <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-2">
                  {handle}
                  <span className="flex-1 text-sm text-slate-800">{asString(row.title) || '(untitled)'}</span>
                  <span className="text-[11px] text-slate-400">{asString(row.subject_code) || '—'}</span>
                </div>
              );
            }}
          </SortableList>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowReorderDialog(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Subject Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setEditId(''); setForm(emptyForm); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSave();
            }}
          >
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Subject' : 'Add Subject'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Subject Info */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-800">Subject Info</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label>Subject Title *</Label>
                  <Input value={form.title} onChange={(e) => updateField('title', e.target.value)} />
                </div>
                <div>
                  <Label>Subject Code</Label>
                  <Input value={form.subject_code} onChange={(e) => updateField('subject_code', e.target.value)} placeholder="e.g. MGMT-101" />
                </div>
                <div>
                  <Label>Short Name</Label>
                  <Input value={form.short_name} onChange={(e) => updateField('short_name', e.target.value)} placeholder="e.g. Mgmt" />
                </div>
                <div>
                  <Label>Subject Type</Label>
                  <select className={selectClass} value={form.subject_type} onChange={(e) => updateField('subject_type', e.target.value)}>
                    <option value="">Select type</option>
                    <option value="core">Core</option>
                    <option value="elective">Elective</option>
                  </select>
                </div>
                <div>
                  <Label>Duration (hours)</Label>
                  <Input type="number" min="0" value={form.duration_hours} onChange={(e) => updateField('duration_hours', e.target.value)} />
                </div>
                <div>
                  <Label>Version</Label>
                  <Input value={form.version} onChange={(e) => updateField('version', e.target.value)} placeholder="e.g. 1.0" />
                </div>
                <div className="md:col-span-2">
                  <Label>Description</Label>
                  <textarea className={textareaClass} value={form.description} onChange={(e) => updateField('description', e.target.value)} />
                </div>
              </div>
            </section>

            {/* Learning Design */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-800">Learning Design</h3>
              <div className="space-y-3">
                <div>
                  <Label>Learning Outcomes</Label>
                  <textarea className={textareaClass} value={form.learning_outcomes} onChange={(e) => updateField('learning_outcomes', e.target.value)} placeholder="What learners will achieve after this subject" />
                </div>
                <div>
                  <Label>Skills Covered</Label>
                  <Input value={form.skills_covered} onChange={(e) => updateField('skills_covered', e.target.value)} placeholder="Comma-separated skills (e.g. Leadership, Communication)" />
                </div>
              </div>
            </section>

            {/* Assessment Configuration */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-800">Assessment Configuration</h3>
              <div className="space-y-3">
                {(['assignment','examination','project','viva'] as const).map((kind) => {
                  const max = `${kind}_max_marks` as keyof SubjectFormState;
                  const pass = `${kind}_pass_marks` as keyof SubjectFormState;
                  return (
                    <div key={kind} className="grid gap-3 md:grid-cols-[1fr_1fr_1fr] items-end">
                      <div>
                        <Label className="capitalize">{kind}</Label>
                        <p className="text-xs text-gray-500">Maximum + pass marks</p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Max Marks</Label>
                        <Input type="number" min="0" value={form[max]} onChange={(e) => updateField(max, e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Pass Marks</Label>
                        <Input type="number" min="0" value={form[pass]} onChange={(e) => updateField(pass, e.target.value)} />
                      </div>
                    </div>
                  );
                })}
                <div className="border-t pt-2">
                  <p className="text-sm font-semibold text-gray-700">Total Marks: <span className="text-ttii-primary">{totalMarks}</span></p>
                </div>
              </div>
            </section>

            {/* Status + Order */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-800">Status</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label>Status</Label>
                  <select className={selectClass} value={form.status} onChange={(e) => updateField('status', e.target.value)}>
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div>
                  <Label>Display Order</Label>
                  <Input type="number" value={form.order} onChange={(e) => updateField('order', e.target.value)} placeholder="0" />
                </div>
              </div>
            </section>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditId(''); setForm(emptyForm); }} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving || !form.title.trim()}>
              {saving ? 'Saving...' : editId ? 'Update Subject' : 'Add Subject'}
            </Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Select Subject from DB Dialog */}
      <Dialog open={showSelectDialog} onOpenChange={(open) => { if (!open) { setShowSelectDialog(false); setSelectedSubjectIds(new Set()); } }}>
        <DialogContent className="max-h-[80vh] overflow-hidden flex flex-col">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleLinkSelected();
            }}
            className="flex flex-col flex-1 min-h-0"
          >
          <DialogHeader>
            <DialogTitle>Link Existing Subjects</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-gray-500">Select subjects to link to this course.</p>
          <div className="flex-1 overflow-y-auto space-y-2">
            {allSubjectsLoading ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : allSubjects.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No subjects found.</p>
            ) : (
              allSubjects.map((subject) => {
                const id = asString(subject.id);
                const checked = selectedSubjectIds.has(id);
                const alreadyLinked = rows.some((r) => asString(r.id) === id);
                const courses = Array.isArray(subject.courses) ? (subject.courses as Array<Record<string, unknown>>) : [];
                const courseCount = courses.length;
                const courseTitles = courses.map((c) => asString(c.title)).filter(Boolean).join(', ');
                return (
                  <label key={id} className={`flex items-center gap-3 rounded-md border px-3 py-2 cursor-pointer ${alreadyLinked ? 'border-green-200 bg-green-50 opacity-60' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input type="checkbox" checked={checked} disabled={alreadyLinked} onChange={() => handleToggleSubject(id)} className="h-4 w-4 rounded border-gray-300" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {asString(subject.title)}
                        {alreadyLinked && <span className="ml-2 text-xs text-green-600">(already linked)</span>}
                        {!alreadyLinked && courseCount > 0 && (
                          <span className="ml-2 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600" title={courseTitles}>
                            in {courseCount} course{courseCount === 1 ? '' : 's'}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {courseTitles || asString(subject.description) || 'No description'}
                      </p>
                    </div>
                  </label>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setShowSelectDialog(false); setSelectedSubjectIds(new Set()); }} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving || selectedSubjectIds.size === 0}>
              {saving ? 'Linking...' : `Link ${selectedSubjectIds.size > 0 ? `(${selectedSubjectIds.size})` : ''} Selected`}
            </Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
