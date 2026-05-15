import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
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
import { AdminFilterBar, type FilterField } from '../../shared/components/AdminFilterBar.js';
import { useConfirm } from '@/components/confirm-dialog';
// Naji UAT 2026-05-16 — title-case name-like fields on blur.
import { titleCaseEachWord } from '@/lib/text-format';

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';
const textareaClass =
  'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

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
};

export default function SubjectsPage({ api, session }: AdminPageProps) {
  const confirm = useConfirm();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState('');
  const [form, setForm] = useState<SubjectFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');

  const { data, loading, error, reload } = useAdminPageData(
    () => api.listAllSubjects(session.token),
    [],
  );

  const allRows = useMemo(() => toRecords(data), [data]);

  const courseOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of allRows) {
      const courses = Array.isArray(r.courses) ? (r.courses as Array<Record<string, unknown>>) : [];
      for (const c of courses) {
        const id = asString(c.id);
        const title = asString(c.title);
        if (id && title && !seen.has(id)) seen.set(id, title);
      }
      // Fallback for any subject that hasn't been backfilled into courses[].
      if (courses.length === 0) {
        const id = asString(r.course_id);
        const title = asString(r.course_title);
        if (id && title && !seen.has(id)) seen.set(id, title);
      }
    }
    return Array.from(seen.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [allRows]);

  const filteredRows = useMemo(() => {
    return allRows.filter((r) => {
      const courses = Array.isArray(r.courses) ? (r.courses as Array<Record<string, unknown>>) : [];
      if (search) {
        const s = search.toLowerCase();
        const titleMatch =
          asString(r.title).toLowerCase().includes(s) ||
          asString(r.subject_code).toLowerCase().includes(s) ||
          asString(r.short_name).toLowerCase().includes(s);
        const courseMatch =
          asString(r.course_title).toLowerCase().includes(s) ||
          courses.some((c) => asString(c.title).toLowerCase().includes(s));
        if (!titleMatch && !courseMatch) return false;
      }
      if (typeFilter && asString(r.subject_type).toLowerCase() !== typeFilter.toLowerCase()) return false;
      if (statusFilter && asString(r.status).toLowerCase() !== statusFilter.toLowerCase()) return false;
      if (courseFilter) {
        const matchesAny =
          asString(r.course_id) === courseFilter ||
          courses.some((c) => asString(c.id) === courseFilter);
        if (!matchesAny) return false;
      }
      return true;
    });
  }, [allRows, search, typeFilter, statusFilter, courseFilter]);

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
      duration_hours: row.duration_hours == null ? '' : String(asNumber(row.duration_hours)),
      version: asString(row.version),
      description: asString(row.description),
      learning_outcomes: asString(row.learning_outcomes),
      skills_covered: asString(row.skills_covered),
      assignment_max_marks: row.assignment_max_marks == null ? '' : String(asNumber(row.assignment_max_marks)),
      assignment_pass_marks: row.assignment_pass_marks == null ? '' : String(asNumber(row.assignment_pass_marks)),
      examination_max_marks: row.examination_max_marks == null ? '' : String(asNumber(row.examination_max_marks)),
      examination_pass_marks: row.examination_pass_marks == null ? '' : String(asNumber(row.examination_pass_marks)),
      project_max_marks: row.project_max_marks == null ? '' : String(asNumber(row.project_max_marks)),
      project_pass_marks: row.project_pass_marks == null ? '' : String(asNumber(row.project_pass_marks)),
      viva_max_marks: row.viva_max_marks == null ? '' : String(asNumber(row.viva_max_marks)),
      viva_pass_marks: row.viva_pass_marks == null ? '' : String(asNumber(row.viva_pass_marks)),
      status: asString(row.status) || 'draft',
    });
    setShowForm(true);
  }, []);

  const totalMarks = useMemo(() => {
    return (
      Number(form.assignment_max_marks || 0) +
      Number(form.examination_max_marks || 0) +
      Number(form.project_max_marks || 0) +
      Number(form.viva_max_marks || 0)
    );
  }, [form.assignment_max_marks, form.examination_max_marks, form.project_max_marks, form.viva_max_marks]);

  const handleSave = useCallback(async () => {
    if (!form.title.trim()) {
      toast.error('Subject title is required.');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        subject_code: form.subject_code.trim() || null,
        short_name: form.short_name.trim() || null,
        subject_type: form.subject_type || null,
        duration_hours: form.duration_hours ? Number(form.duration_hours) : null,
        version: form.version.trim() || null,
        description: form.description.trim() || null,
        learning_outcomes: form.learning_outcomes.trim() || null,
        skills_covered: form.skills_covered.trim() || null,
        assignment_max_marks: form.assignment_max_marks ? Number(form.assignment_max_marks) : null,
        assignment_pass_marks: form.assignment_pass_marks ? Number(form.assignment_pass_marks) : null,
        examination_max_marks: form.examination_max_marks ? Number(form.examination_max_marks) : null,
        examination_pass_marks: form.examination_pass_marks ? Number(form.examination_pass_marks) : null,
        project_max_marks: form.project_max_marks ? Number(form.project_max_marks) : null,
        project_pass_marks: form.project_pass_marks ? Number(form.project_pass_marks) : null,
        viva_max_marks: form.viva_max_marks ? Number(form.viva_max_marks) : null,
        viva_pass_marks: form.viva_pass_marks ? Number(form.viva_pass_marks) : null,
        status: form.status,
      };
      if (editId) await api.editSubject(session.token, editId, payload);
      else await api.addSubject(session.token, payload);
      toast.success(editId ? 'Subject updated.' : 'Subject created.');
      setShowForm(false);
      setEditId('');
      setForm(emptyForm);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save subject');
    } finally {
      setSaving(false);
    }
  }, [api, session.token, editId, form, reload]);

  const handleDelete = useCallback(
    async (row: Record<string, unknown>) => {
      if (
        !(await confirm({
          title: `Delete subject "${asString(row.title)}"?`,
          description: 'This will detach the subject from any course it is linked to. This action cannot be undone.',
          confirmText: 'Delete',
          variant: 'destructive',
        }))
      )
        return;
      try {
        await api.deleteSubject(session.token, asString(row.id));
        reload();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete subject');
      }
    },
    [api, session.token, reload, confirm],
  );

  const columns: DataTableColumn[] = [
    { key: 'subject_code', label: 'Code', sortable: true, render: (v) => asString(v) || '—' },
    { key: 'title', label: 'Subject Title', sortable: true },
    {
      key: 'courses',
      label: 'Courses',
      render: (_v, row) => {
        const courses = Array.isArray(row.courses) ? (row.courses as Array<Record<string, unknown>>) : [];
        if (courses.length === 0) {
          const fallback = asString(row.course_title);
          return fallback ? <span className="text-sm">{fallback}</span> : <span className="text-sm text-slate-400">—</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {courses.map((c, i) => (
              <span
                key={`${asString(c.id)}-${i}`}
                className="inline-flex max-w-[180px] truncate rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
                title={asString(c.title)}
              >
                {asString(c.title)}
              </span>
            ))}
          </div>
        );
      },
    },
    { key: 'subject_type', label: 'Type', render: (v) => asString(v) || '—' },
    { key: 'duration_hours', label: 'Hours', render: (v) => (v == null ? '—' : String(asNumber(v))) },
    { key: 'version', label: 'Version', render: (v) => asString(v) || '—' },
    { key: 'status', label: 'Status', render: (v) => <AdminStatusBadge status={asString(v) || 'draft'} /> },
  ];

  const actions: DataTableAction[] = [
    { label: 'Edit', onClick: (row) => handleOpenEdit(row) },
    { label: 'Delete', onClick: (row) => void handleDelete(row), variant: 'destructive' },
  ];

  const filters: FilterField[] = useMemo(
    () => [
      { key: 'search', label: 'Search', type: 'text' as const, value: search, placeholder: 'Title, code, course...', onChange: setSearch },
      {
        key: 'course',
        label: 'Course',
        type: 'select' as const,
        value: courseFilter,
        placeholder: 'All Courses',
        options: courseOptions,
        onChange: setCourseFilter,
      },
      {
        key: 'type',
        label: 'Type',
        type: 'select' as const,
        value: typeFilter,
        placeholder: 'All Types',
        options: [
          { label: 'Core', value: 'Core' },
          { label: 'Elective', value: 'Elective' },
        ],
        onChange: setTypeFilter,
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select' as const,
        value: statusFilter,
        placeholder: 'All',
        options: [
          { label: 'Draft', value: 'draft' },
          { label: 'Active', value: 'active' },
          { label: 'Archived', value: 'archived' },
        ],
        onChange: setStatusFilter,
      },
    ],
    [search, typeFilter, statusFilter, courseFilter, courseOptions],
  );

  if (loading) return <PageLoader label="Loading subjects..." />;
  if (error)
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-red-600">
          {error}
        </CardContent>
      </Card>
    );

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Subjects" addLabel="Add Subject" onAdd={handleOpenAdd} />

      <AdminFilterBar
        filters={filters}
        onApply={() => {}}
        onClear={() => {
          setSearch('');
          setTypeFilter('');
          setStatusFilter('');
          setCourseFilter('');
        }}
      />

      <AdminDataTable columns={columns} rows={filteredRows} actions={actions} />

      <Dialog
        open={showForm}
        onOpenChange={(open) => {
          if (!open) {
            setShowForm(false);
            setEditId('');
            setForm(emptyForm);
          }
        }}
      >
        <DialogContent className="w-[min(880px,calc(100vw-2rem))] max-w-[min(880px,calc(100vw-2rem))] max-h-[90vh] overflow-y-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSave();
            }}
            className="w-full min-w-0"
          >
            <DialogHeader className="mb-5">
              <DialogTitle>{editId ? 'Edit Subject' : 'New Subject'}</DialogTitle>
            </DialogHeader>

            <div className="w-full min-w-0 space-y-5">
              <div>
                <h3 className="mb-3 text-sm font-semibold text-slate-700">Subject Information</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Subject Title *</Label>
                    <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} onBlur={(e) => { const next = titleCaseEachWord(e.target.value); if (next !== e.target.value) setForm((f) => ({ ...f, title: next })); }} placeholder="e.g. Child Development" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Subject Code</Label>
                    <Input value={form.subject_code} onChange={(e) => setForm((f) => ({ ...f, subject_code: e.target.value }))} placeholder="e.g. CD-101" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Short Name</Label>
                    <Input value={form.short_name} onChange={(e) => setForm((f) => ({ ...f, short_name: e.target.value }))} placeholder="e.g. CD" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Subject Type</Label>
                    <select className={selectClass} value={form.subject_type} onChange={(e) => setForm((f) => ({ ...f, subject_type: e.target.value }))}>
                      <option value="">— Select —</option>
                      <option value="Core">Core</option>
                      <option value="Elective">Elective</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Duration (hours)</Label>
                    <Input type="number" min="0" value={form.duration_hours} onChange={(e) => setForm((f) => ({ ...f, duration_hours: e.target.value }))} placeholder="e.g. 30" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Version</Label>
                    <Input value={form.version} onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))} placeholder="e.g. 1.0" />
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <Label>Description</Label>
                    <textarea className={textareaClass} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Subject overview" />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold text-slate-700">Learning Design</h3>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Learning Outcomes (one point per line)</Label>
                    <textarea className={textareaClass} value={form.learning_outcomes} onChange={(e) => setForm((f) => ({ ...f, learning_outcomes: e.target.value }))} placeholder={'• Understand cognitive milestones\n• Identify developmental delays'} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Skills Covered (comma separated)</Label>
                    <Input value={form.skills_covered} onChange={(e) => setForm((f) => ({ ...f, skills_covered: e.target.value }))} placeholder="e.g. observation, lesson planning, classroom management" />
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <h3 className="text-sm font-semibold text-slate-700">Assessment Configuration</h3>
                  <p className="text-xs text-slate-500">Total: <span className="font-medium text-slate-700">{totalMarks}</span></p>
                </div>
                <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
                  {(
                    [
                      { key: 'assignment', label: 'Assignment' },
                      { key: 'examination', label: 'Examination' },
                      { key: 'project', label: 'Project' },
                      { key: 'viva', label: 'Viva' },
                    ] as const
                  ).map((row) => {
                    const maxKey = `${row.key}_max_marks` as keyof SubjectFormState;
                    const passKey = `${row.key}_pass_marks` as keyof SubjectFormState;
                    return (
                      <div key={row.key} className="rounded-md border border-slate-200 p-3">
                        <Label className="text-xs font-semibold uppercase tracking-wide text-slate-600">{row.label}</Label>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <p className="text-[11px] text-slate-500">Max marks</p>
                            <Input type="number" min="0" value={form[maxKey]} onChange={(e) => setForm((f) => ({ ...f, [maxKey]: e.target.value }))} />
                          </div>
                          <div className="space-y-1">
                            <p className="text-[11px] text-slate-500">Pass marks</p>
                            <Input type="number" min="0" value={form[passKey]} onChange={(e) => setForm((f) => ({ ...f, [passKey]: e.target.value }))} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <select className={selectClass} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setEditId('');
                  setForm(emptyForm);
                }}
                disabled={saving}
              >
                Cancel
              </Button>
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
