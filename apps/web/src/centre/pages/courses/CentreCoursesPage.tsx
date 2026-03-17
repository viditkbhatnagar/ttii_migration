import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import type { CentrePageProps } from '../../routing/centre-routes.js';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asString, toRecords, formatDate, formatCurrency } from '../../../admin/shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../../admin/shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../../admin/shared/components/AdminDataTable.js';
import { AdminStatusBadge } from '../../../admin/shared/components/AdminStatusBadge.js';

export default function CentreCoursesPage({ api, session }: CentrePageProps) {
  const { data, loading, error } = useAdminPageData(
    () => api.loadCourses(session.token),
    [],
  );

  const courses = useMemo(() => toRecords(data), [data]);

  const columns: DataTableColumn[] = [
    { key: 'course_title', label: 'Course Title', sortable: true, render: (_, row) => asString(row.course_title) || asString(row.short_name) || '-' },
    { key: 'assigned_amount', label: 'Amount', sortable: true, render: (_, row) => formatCurrency(row.assigned_amount) },
    { key: 'start_date', label: 'Start Date', sortable: true, render: (_, row) => formatDate(row.start_date) || '-' },
    { key: 'end_date', label: 'End Date', sortable: true, render: (_, row) => formatDate(row.end_date) || '-' },
    {
      key: 'status',
      label: 'Status',
      render: (val) => {
        const status = asString(val);
        return status ? <AdminStatusBadge status={status} /> : '-';
      },
    },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-red-600">
          Failed to load courses: {error}
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <AdminPageHeader title="Courses" />
      <AdminDataTable
        columns={columns}
        rows={courses}
      />
    </div>
  );
}
