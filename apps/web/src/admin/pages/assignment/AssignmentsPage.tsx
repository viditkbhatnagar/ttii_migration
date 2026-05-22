import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminFilterBar, type FilterField } from '../../shared/components/AdminFilterBar.js';
import { AdminTabBar, type AdminTab } from '../../shared/components/AdminTabBar.js';
import { useConfirm } from '@/components/confirm-dialog';
// Naji UAT 2026-05-16 — title-case name-like fields on blur.
import { titleCaseEachWord } from '@/lib/text-format';

export default function AssignmentsPage({ api, session, onNavigate }: AdminPageProps) {
  const confirm = useConfirm();
  const [courseFilter, setCourseFilter] = useState('');
  // Default to Evaluation Pending so coordinators land on actionable rows.
  const [activeTab, setActiveTab] = useState('pending');

  const [courses, setCourses] = useState<Record<string, unknown>[]>([]);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editRow, setEditRow] = useState<Record<string, unknown> | null>(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', totalMarks: '', dueDate: '', instructions: '' });

  useEffect(() => {
    api.loadCourses(session.token).then(setCourses).catch(() => {});
  }, [api, session.token]);

  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadAdminAssignments(session.token, {
      ...(courseFilter ? { courseId: courseFilter } : {}),
    }),
    [courseFilter],
  );

  // Naji UAT 2026-05-22 — guard against the legacy dummy rows where a
  // course was created in test mode with no title or course assignment.
  // Filter them out so the master list reads cleanly even before the
  // backend cleanup script runs against prod.
  const allAssignments = useMemo(() => {
    return toRecords(data).filter((a) => {
      const t = asString(a.title).trim();
      const courseId = asString(a.course_id) || asString(a.cohort_id);
      // Drop the genuinely empty rows: no title AND no course/cohort linkage.
      if (!t && !courseId) return false;
      return true;
    });
  }, [data]);

  // Naji UAT 2026-05-22 — tabs now reflect grading progress rather than
  // calendar position. "Evaluation Pending" = at least one submission
  // still ungraded; "Evaluation Completed" = every submission has marks;
  // "All" = everything. Empty (no submissions yet) assignments land in
  // Pending so the queue surface them.
  const pending = useMemo(
    () => allAssignments.filter((a) => {
      const subs = asNumber(a.submission_count);
      const evald = asNumber(a.evaluated_count);
      return subs === 0 || evald < subs;
    }),
    [allAssignments],
  );

  const completedEval = useMemo(
    () => allAssignments.filter((a) => {
      const subs = asNumber(a.submission_count);
      const evald = asNumber(a.evaluated_count);
      return subs > 0 && evald >= subs;
    }),
    [allAssignments],
  );

  const filteredAssignments = useMemo(() => {
    if (activeTab === 'pending') return pending;
    if (activeTab === 'completed') return completedEval;
    return allAssignments;
  }, [allAssignments, pending, completedEval, activeTab]);

  const tabs: AdminTab[] = useMemo(() => [
    { id: 'pending', label: 'Evaluation Pending', count: pending.length },
    { id: 'completed', label: 'Evaluation Completed', count: completedEval.length },
    { id: 'all', label: 'All', count: allAssignments.length },
  ], [pending.length, completedEval.length, allAssignments.length]);

  const columns: DataTableColumn[] = useMemo(() => [
    { key: 'title', label: 'Title', sortable: true },
    {
      // Naji UAT 2026-05-22 — when an assignment row doesn't carry a
      // direct course_id (multi-cohort drafts), fall back to the cohort's
      // course; show '-' only if neither path resolves. The backend
      // already does the lookup; this render keeps the empty-state clean.
      key: 'course_title',
      label: 'Course',
      render: (v) => asString(v) || '-',
    },
    { key: 'cohort_title', label: 'Cohort', render: (v) => asString(v) || '-' },
    { key: 'total_marks', label: 'Marks', sortable: true },
    { key: 'added_date', label: 'Added', render: (v) => formatDate(v) },
    { key: 'due_date', label: 'Due Date', render: (v) => formatDate(v) },
    // Naji UAT 2026-05-22 — three progress columns right after Due Date.
    {
      key: 'total_students',
      label: 'Total Students',
      sortable: true,
      render: (v) => <span className="font-medium text-gray-700">{asNumber(v)}</span>,
    },
    {
      key: 'submission_count',
      label: 'Submissions',
      render: (value, row) => (
        <button
          type="button"
          className="text-blue-600 hover:underline font-medium"
          onClick={(e) => { e.stopPropagation(); onNavigate('/admin/assignment/submissions/' + asString(row.id)); }}
        >
          {asNumber(value)}
        </button>
      ),
    },
    {
      key: 'evaluated_count',
      label: 'Evaluated',
      render: (value, row) => {
        const evald = asNumber(value);
        const subs = asNumber(row.submission_count);
        const tone = subs > 0 && evald >= subs ? 'text-emerald-700' : 'text-amber-700';
        return <span className={`font-medium ${tone}`}>{evald} / {subs}</span>;
      },
    },
  ], [onNavigate]);

  const filters: FilterField[] = useMemo(() => [
    {
      key: 'course', label: 'Course', type: 'select' as const, value: courseFilter,
      placeholder: 'All Courses',
      options: courses.map((c) => ({ label: asString(c.title), value: asString(c.id) })),
      onChange: setCourseFilter,
    },
  ], [courseFilter, courses]);

  const handleEditClick = (row: Record<string, unknown>) => {
    setEditRow(row);
    setEditForm({
      title: asString(row.title),
      description: asString(row.description),
      totalMarks: String(asNumber(row.total_marks)),
      dueDate: asString(row.due_date).slice(0, 10),
      instructions: asString(row.instructions),
    });
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!editRow) return;
    try {
      await api.editAssignment(session.token, asString(editRow.id), {
        title: editForm.title,
        description: editForm.description,
        totalMarks: Number(editForm.totalMarks),
        dueDate: editForm.dueDate,
        instructions: editForm.instructions,
        courseId: asString(editRow.course_id),
        cohortId: asString(editRow.cohort_id),
      });
      setEditDialogOpen(false);
      setEditRow(null);
      reload();
    } catch {
      // silently handle
    }
  };

  const handleDelete = async (row: Record<string, unknown>) => {
    const confirmed = await confirm({
      title: `Delete "${asString(row.title)}"?`,
      description: 'This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (!confirmed) return;
    try {
      await api.deleteAssignment(session.token, asString(row.id));
      reload();
    } catch {
      // silently handle
    }
  };

  if (loading) {
    return <PageLoader label="Loading assignments..." />;
  }

  if (error) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-red-600">{error}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Assignments" />

      <AdminFilterBar
        filters={filters}
        onApply={() => {}}
        onClear={() => setCourseFilter('')}
      />

      <AdminTabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <AdminDataTable
        columns={columns}
        rows={filteredAssignments}
        actions={[
          {
            label: 'Edit',
            onClick: (row) => handleEditClick(row),
          },
          {
            label: 'Delete',
            onClick: (row) => { void handleDelete(row); },
            variant: 'destructive',
          },
        ]}
      />

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleEditSave();
            }}
          >
            <DialogHeader>
              <DialogTitle>Edit Assignment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label htmlFor="edit-title">Title</Label>
                <Input id="edit-title" value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} onBlur={(e) => { const next = titleCaseEachWord(e.target.value); if (next !== e.target.value) setEditForm((f) => ({ ...f, title: next })); }} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-description">Description</Label>
                <Input id="edit-description" value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-marks">Total Marks</Label>
                <Input id="edit-marks" type="number" value={editForm.totalMarks} onChange={(e) => setEditForm((f) => ({ ...f, totalMarks: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-due">Due Date</Label>
                <Input id="edit-due" type="date" value={editForm.dueDate} onChange={(e) => setEditForm((f) => ({ ...f, dueDate: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-instructions">Instructions</Label>
                <Input id="edit-instructions" value={editForm.instructions} onChange={(e) => setEditForm((f) => ({ ...f, instructions: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
