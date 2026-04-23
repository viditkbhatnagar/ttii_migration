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

export default function AssignmentsPage({ api, session, onNavigate }: AdminPageProps) {
  const confirm = useConfirm();
  const [courseFilter, setCourseFilter] = useState('');
  const [activeTab, setActiveTab] = useState('all');

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

  const allAssignments = useMemo(() => toRecords(data), [data]);

  const now = new Date().toISOString().slice(0, 10);

  const current = useMemo(
    () => allAssignments.filter((a) => {
      const due = asString(a.due_date).slice(0, 10);
      const added = asString(a.added_date).slice(0, 10);
      return added <= now && due >= now;
    }),
    [allAssignments, now],
  );

  const upcoming = useMemo(
    () => allAssignments.filter((a) => asString(a.added_date).slice(0, 10) > now),
    [allAssignments, now],
  );

  const completed = useMemo(
    () => allAssignments.filter((a) => asString(a.due_date).slice(0, 10) < now),
    [allAssignments, now],
  );

  const filteredAssignments = useMemo(() => {
    if (activeTab === 'current') return current;
    if (activeTab === 'upcoming') return upcoming;
    if (activeTab === 'completed') return completed;
    return allAssignments;
  }, [allAssignments, current, upcoming, completed, activeTab]);

  const tabs: AdminTab[] = useMemo(() => [
    { id: 'all', label: 'All', count: allAssignments.length },
    { id: 'current', label: 'Current', count: current.length },
    { id: 'upcoming', label: 'Upcoming', count: upcoming.length },
    { id: 'completed', label: 'Completed', count: completed.length },
  ], [allAssignments.length, current.length, upcoming.length, completed.length]);

  const columns: DataTableColumn[] = useMemo(() => [
    { key: 'title', label: 'Title', sortable: true },
    { key: 'course_title', label: 'Course' },
    { key: 'cohort_title', label: 'Cohort' },
    { key: 'total_marks', label: 'Marks', sortable: true },
    { key: 'added_date', label: 'Added', render: (v) => formatDate(v) },
    { key: 'due_date', label: 'Due Date', render: (v) => formatDate(v) },
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
                <Input id="edit-title" value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} />
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
