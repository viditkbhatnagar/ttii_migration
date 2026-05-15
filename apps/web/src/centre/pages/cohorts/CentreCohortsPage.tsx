import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLoader } from '@/components/ui/page-loader';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AdminPageHeader } from '../../../admin/shared/components/AdminPageHeader.js';
// Naji UAT 2026-05-16 — title-case name-like fields on blur.
import { titleCaseEachWord } from '@/lib/text-format';
import { AdminDataTable, type DataTableColumn, type DataTableAction } from '../../../admin/shared/components/AdminDataTable.js';
import { AdminStatusBadge } from '../../../admin/shared/components/AdminStatusBadge.js';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asString, formatDate, responseSuccess } from '../../../admin/shared/utils/admin-data-utils.js';
import type { CentrePageProps } from '../../routing/centre-routes.js';

const columns: DataTableColumn[] = [
  {
    key: 'title',
    label: 'Cohort Name',
    sortable: true,
  },
  { key: 'course_name', label: 'Course', sortable: true },
  { key: 'students_count', label: 'Students', sortable: true },
  {
    key: 'start_date',
    label: 'Start Date',
    sortable: true,
    render: (value) => formatDate(value),
  },
  {
    key: 'end_date',
    label: 'End Date',
    sortable: true,
    render: (value) => formatDate(value),
  },
  {
    key: 'status',
    label: 'Status',
    render: (value) => <AdminStatusBadge status={asString(value) || 'active'} />,
  },
];

const EMPTY_FORM = {
  title: '',
  courseId: '',
  subjectId: '',
  instructorId: '',
  startDate: '',
  endDate: '',
};

export default function CentreCohortsPage({ api, session, onNavigate }: CentrePageProps) {
  const { data, loading, error, reload } = useAdminPageData<Record<string, unknown>[]>(
    () => api.loadCohorts(session.token),
    [session.token],
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const actions: DataTableAction[] = [
    {
      label: 'View',
      onClick: (row) => onNavigate('/centre/cohorts/view/' + asString(row.id)),
    },
    {
      label: 'Edit',
      onClick: () => toast.info('Edit cohort coming soon'),
    },
  ];

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.courseId.trim()) return;
    setSubmitting(true);
    try {
      const res = await api.addCohort(session.token, {
        title: form.title,
        courseId: form.courseId,
        subjectId: form.subjectId,
        instructorId: form.instructorId,
        startDate: form.startDate,
        endDate: form.endDate,
      });
      if (responseSuccess(res)) {
        setForm(EMPTY_FORM);
        setDialogOpen(false);
        reload();
      } else {
        toast.error(asString(res.message) || 'Failed to add cohort');
      }
    } catch {
      toast.error('Failed to add cohort');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <PageLoader label="Loading centre cohorts..." />;
  }

  if (error) {
    return (
      <Card>
        <CardContent role="alert" className="py-10 text-center text-sm text-red-600">
          {error}
        </CardContent>
      </Card>
    );
  }

  const rows = data ?? [];

  return (
    <div className="space-y-6">
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AdminPageHeader title="Cohorts" addLabel="+ Add Cohort" onAdd={() => setDialogOpen(true)} />

        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Cohort</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="cohort-title">Title</Label>
              <Input
                id="cohort-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                onBlur={(e) => { const next = titleCaseEachWord(e.target.value); if (next !== e.target.value) setForm({ ...form, title: next }); }}
                placeholder="Enter cohort title"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cohort-course">Course ID</Label>
              <Input
                id="cohort-course"
                value={form.courseId}
                onChange={(e) => setForm({ ...form, courseId: e.target.value })}
                placeholder="Enter course ID"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cohort-subject">Subject ID</Label>
              <Input
                id="cohort-subject"
                value={form.subjectId}
                onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
                placeholder="Enter subject ID"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cohort-instructor">Instructor ID</Label>
              <Input
                id="cohort-instructor"
                value={form.instructorId}
                onChange={(e) => setForm({ ...form, instructorId: e.target.value })}
                placeholder="Enter instructor ID"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cohort-start">Start Date</Label>
                <Input
                  id="cohort-start"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cohort-end">End Date</Label>
                <Input
                  id="cohort-end"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-ttii-primary hover:bg-ttii-primary/90"
                disabled={submitting || !form.title.trim() || !form.courseId.trim()}
                onClick={() => { void handleSubmit(); }}
              >
                {submitting ? 'Adding...' : 'Add Cohort'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AdminDataTable
        columns={columns}
        rows={rows}
        actions={actions}
        onRowClick={(row) => onNavigate('/centre/cohorts/view/' + asString(row.id))}
      />
    </div>
  );
}
