import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';

export default function EntranceExamsPage({ api, session, onNavigate }: AdminPageProps) {
  const { data, loading, error } = useAdminPageData(
    () => api.loadEntranceExams(session.token),
    [],
  );

  const exams = useMemo(() => toRecords(data), [data]);

  const columns: DataTableColumn[] = useMemo(() => [
    { key: 'title', label: 'Title', sortable: true },
    { key: 'course_title', label: 'Course' },
    { key: 'exam_date', label: 'Date', render: (v) => formatDate(v) },
    { key: 'duration', label: 'Duration' },
    { key: 'total_marks', label: 'Total Marks' },
    {
      key: 'status',
      label: 'Status',
      render: (v) => <AdminStatusBadge status={asString(v) || 'Draft'} />,
    },
    { key: 'registration_count', label: 'Registrations' },
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
      <AdminPageHeader
        title="Entrance Exams"
        addLabel="+ Create Entrance Exam"
        onAdd={() => onNavigate('/admin/entrance_exam/add')}
      />

      <AdminDataTable
        columns={columns}
        rows={exams}
        actions={[
          {
            label: 'Delete',
            onClick: (row) => { api.deleteEntranceExam(session.token, asString(row.id)); },
            variant: 'destructive',
          },
        ]}
      />
    </div>
  );
}
