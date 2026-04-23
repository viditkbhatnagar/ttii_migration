import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminFilterBar, type FilterField } from '../../shared/components/AdminFilterBar.js';

export default function ReExamPage({ api, session }: AdminPageProps) {
  const [courseFilter, setCourseFilter] = useState('');
  const [batchFilter, setBatchFilter] = useState('');

  const [courses, setCourses] = useState<Record<string, unknown>[]>([]);
  const [batches, setBatches] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    Promise.all([
      api.loadCourses(session.token),
      api.loadBatches(session.token),
    ]).then(([c, b]) => { setCourses(c); setBatches(b); }).catch(() => {});
  }, [api, session.token]);

  const { data, loading, error } = useAdminPageData(
    () => api.loadReExams(session.token, {
      ...(courseFilter ? { courseId: courseFilter } : {}),
      ...(batchFilter ? { batchId: batchFilter } : {}),
    }),
    [courseFilter, batchFilter],
  );

  const exams = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const columns: DataTableColumn[] = useMemo(() => [
    { key: 'title', label: 'Exam Title', sortable: true },
    { key: 'course_title', label: 'Course' },
    { key: 'batch_title', label: 'Batch' },
    { key: 'mark', label: 'Total Marks' },
    { key: 'total_attempts', label: 'Total Attempts' },
    { key: 'failed_count', label: 'Failed', sortable: true },
    { key: 'from_date', label: 'Start', render: (v) => formatDate(v) },
    { key: 'to_date', label: 'End', render: (v) => formatDate(v) },
  ], []);

  const filters: FilterField[] = useMemo(() => [
    {
      key: 'course', label: 'Course', type: 'select' as const, value: courseFilter,
      placeholder: 'All Courses',
      options: courses.map((c) => ({ label: asString(c.title), value: asString(c.id) })),
      onChange: setCourseFilter,
    },
    {
      key: 'batch', label: 'Batch', type: 'select' as const, value: batchFilter,
      placeholder: 'All Batches',
      options: batches.map((b) => ({ label: asString(b.title), value: asString(b.id) })),
      onChange: setBatchFilter,
    },
  ], [courseFilter, batchFilter, courses, batches]);

  if (loading) {
    return <PageLoader label="Loading re exam..." />;
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
      <AdminPageHeader title="Re-Examination" />

      <AdminFilterBar
        filters={filters}
        onApply={() => {}}
        onClear={() => { setCourseFilter(''); setBatchFilter(''); }}
      />

      <AdminDataTable columns={columns} rows={exams} />
    </div>
  );
}
