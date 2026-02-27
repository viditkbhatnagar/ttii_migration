import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';

export default function SessionFeedbacksPage({ api, session }: AdminPageProps) {
  const { data, loading, error } = useAdminPageData(
    () => api.loadLiveClasses(session.token),
    [],
  );

  const allSessions = useMemo(() => toRecords(data), [data]);

  const columns: DataTableColumn[] = useMemo(() => [
    { key: 'title', label: 'Title', sortable: true },
    { key: 'cohort_title', label: 'Cohort' },
    { key: 'course_title', label: 'Course' },
    { key: 'date', label: 'Date', render: (v) => formatDate(v) },
    { key: 'fromTime', label: 'From' },
    { key: 'toTime', label: 'To' },
    {
      key: 'feedback_status',
      label: 'Feedback Status',
      render: () => <AdminStatusBadge status="Pending" />,
    },
  ], []);

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
        <CardContent className="py-8 text-center text-sm text-red-600">{error}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Sessions Feedbacks" />

      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="py-3 text-sm text-blue-700">
          Session feedback collection is being set up. Currently showing live session records.
        </CardContent>
      </Card>

      <AdminDataTable columns={columns} rows={allSessions} />
    </div>
  );
}
