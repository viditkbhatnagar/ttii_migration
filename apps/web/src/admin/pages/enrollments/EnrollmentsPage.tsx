import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';

export default function EnrollmentsPage({ api, session }: AdminPageProps) {
  const { data, loading, error } = useAdminPageData(
    () => api.loadEnrollments(session.token),
    [],
  );

  const allEnrollments = useMemo(() => toRecords(data), [data]);

  const activeCount = useMemo(
    () => allEnrollments.filter((r) => asString(r.enrollment_status).toLowerCase() === 'active').length,
    [allEnrollments],
  );

  const pendingCount = useMemo(
    () => allEnrollments.filter((r) => asString(r.enrollment_status).toLowerCase() === 'pending').length,
    [allEnrollments],
  );

  const uniqueCourses = useMemo(
    () => new Set(allEnrollments.map((r) => asString(r.course_title)).filter(Boolean)).size,
    [allEnrollments],
  );

  const columns: DataTableColumn[] = useMemo(
    () => [
      { key: 'enrollment_id', label: 'Enrollment ID', sortable: true },
      { key: 'student_name', label: 'Student', sortable: true },
      { key: 'course_title', label: 'Course' },
      { key: 'batch_title', label: 'Batch' },
      {
        key: 'enrollment_status',
        label: 'Status',
        render: (v) => <AdminStatusBadge status={asString(v)} />,
      },
      { key: 'mode_of_study', label: 'Mode' },
      { key: 'preferred_language', label: 'Language' },
      { key: 'enrollment_date', label: 'Enrolled', render: (v) => formatDate(v) },
      { key: 'created_at', label: 'Created', render: (v) => formatDate(v) },
    ],
    [],
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-red-600">
          {error}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title="App Enrollments" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Enrollments', value: allEnrollments.length },
          { label: 'Active', value: activeCount },
          { label: 'Pending', value: pendingCount },
          { label: 'Unique Courses', value: uniqueCourses },
        ].map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <AdminDataTable columns={columns} rows={allEnrollments} />
    </div>
  );
}
