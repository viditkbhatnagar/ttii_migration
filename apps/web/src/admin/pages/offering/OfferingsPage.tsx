import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, toRecords } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn, type DataTableAction } from '../../shared/components/AdminDataTable.js';
import { useConfirm } from '@/components/confirm-dialog';

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

const deliveryModeLabels: Record<string, string> = {
  self_paced: 'Self-Paced',
  cohort: 'Cohort',
};

const statusColors: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  draft: 'secondary',
  published: 'outline',
  active: 'default',
  completed: 'secondary',
  archived: 'destructive',
};

export default function OfferingsPage({ api, session, onNavigate }: AdminPageProps) {
  const confirm = useConfirm();
  const [filterCourseId, setFilterCourseId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const { data: coursesData } = useAdminPageData(() => api.loadCourses(session.token), []);
  const courses = useMemo(() => toRecords(coursesData), [coursesData]);

  const filters = useMemo(() => {
    const f: Record<string, string> = {};
    if (filterCourseId) f.course_id = filterCourseId;
    if (filterStatus) f.status = filterStatus;
    return f;
  }, [filterCourseId, filterStatus]);

  const { data, loading, error, reload } = useAdminPageData(
    () => api.listOfferings(session.token, Object.keys(filters).length > 0 ? filters : undefined),
    [filterCourseId, filterStatus],
  );

  const rows = useMemo(() => toRecords(data), [data]);

  // Summary metrics
  const totalOfferings = rows.length;
  const activeOfferings = rows.filter((r) => r.status === 'active').length;
  const totalEnrolled = rows.reduce((sum, r) => sum + Number(r.enrolled_count ?? 0), 0);

  const handleDelete = useCallback(async (row: Record<string, unknown>) => {
    if (!(await confirm({
      title: `Delete offering "${asString(row.title)}"?`,
      description: 'This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive',
    }))) return;
    try {
      await api.deleteOffering(session.token, asString(row.id));
      reload();
    } catch { /* ignore */ }
  }, [api, session.token, reload, confirm]);

  const renderDate = (v: unknown) => {
    const str = asString(v);
    if (!str) return '-';
    const d = new Date(str);
    return isNaN(d.getTime()) ? '-' : d.toLocaleDateString();
  };

  const columns: DataTableColumn[] = [
    // AdminDataTable renders its own '#' index column; do not add another here.
    { key: 'title', label: 'Offering', sortable: true },
    { key: 'course_title', label: 'Course' },
    { key: 'delivery_mode', label: 'Mode', render: (v) => deliveryModeLabels[asString(v)] || asString(v) },
    { key: 'start_date', label: 'Start Date', render: renderDate },
    { key: 'end_date', label: 'End Date', render: renderDate },
    { key: 'enrollment_end', label: 'Enrolments Ends', render: renderDate },
    { key: 'fee_category', label: 'Pricing Type', render: (v) => {
      const s = asString(v) || 'paid';
      return s === 'free' ? 'Free' : 'Paid';
    }},
    { key: 'enrolled_count', label: 'Enrollments' },
    { key: 'status', label: 'Status', render: (v) => (
      <Badge variant={statusColors[asString(v)] ?? 'secondary'}>{asString(v) || 'draft'}</Badge>
    )},
  ];

  const actions: DataTableAction[] = [
    { label: 'Edit', onClick: (row) => onNavigate(`/admin/offerings/edit/${asString(row.id)}`) },
    { label: 'Delete', onClick: (row) => void handleDelete(row), variant: 'destructive' },
  ];

  if (loading) {
    return <PageLoader label="Loading offerings..." />;
  }

  if (error) {
    return <Card><CardContent role="alert" className="py-8 text-center text-sm text-red-600">{error}</CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Course Offerings" addLabel="+ New Offering" onAdd={() => onNavigate('/admin/offerings/add')} />

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Total Offerings</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{totalOfferings}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Active</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-green-600">{activeOfferings}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Total Enrolled</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-blue-600">{totalEnrolled}</p></CardContent></Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Course</Label>
              <select className={selectClass} value={filterCourseId} onChange={(e) => setFilterCourseId(e.target.value)}>
                <option value="">All Courses</option>
                {courses.map((c) => <option key={asString(c.id)} value={asString(c.id)}>{asString(c.title)}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <select className={selectClass} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <AdminDataTable columns={columns} rows={rows} actions={actions} />
    </div>
  );
}
