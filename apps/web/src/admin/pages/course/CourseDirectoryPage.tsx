import { useMemo, useState } from 'react';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { toRecords, asString, formatCurrency } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn, type DataTableAction } from '../../shared/components/AdminDataTable.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageLoader } from '@/components/ui/page-loader';

export default function CourseDirectoryPage({ api, session, onNavigate }: AdminPageProps) {
  const { data, loading, error, reload } = useAdminPageData(
    () => api.listCoursesAdmin(session.token),
    [session.token],
  );

  const [archiving, setArchiving] = useState<string | null>(null);

  const columns: DataTableColumn[] = useMemo(
    () => [
      {
        key: 'title',
        label: 'Title',
        sortable: true,
        render: (value, row) => (
          <button
            type="button"
            className="text-left font-medium text-blue-700 hover:underline"
            onClick={() => onNavigate(`/admin/course/subjects/${asString(row.id)}`)}
          >
            {asString(value)}
          </button>
        ),
      },
      { key: 'category_name', label: 'Category', sortable: true },
      {
        key: 'status',
        label: 'Status',
        render: (value) => <AdminStatusBadge status={asString(value)} />,
      },
      {
        key: 'visibility',
        label: 'Visibility',
        render: (value) => (
          <Badge variant={asString(value) === 'private' ? 'secondary' : 'default'}>
            {asString(value) === 'private' ? 'Private' : 'Public'}
          </Badge>
        ),
      },
      {
        key: 'price',
        label: 'Price',
        render: (value, row) =>
          Number(row.is_free_course) === 1 ? 'Free' : formatCurrency(value),
      },
      { key: 'duration', label: 'Duration' },
      { key: 'subject_count', label: 'Subjects', sortable: true },
      { key: 'enrolled_students', label: 'Enrolled', sortable: true },
    ],
    [onNavigate],
  );

  const rows = useMemo(() => toRecords(data), [data]);

  const actions: DataTableAction[] = useMemo(
    () => [
      {
        label: 'Edit',
        onClick: (row) => onNavigate(`/admin/course/edit/${asString(row.id)}`),
      },
      {
        label: 'Subjects',
        onClick: (row) => onNavigate(`/admin/course/subjects/${asString(row.id)}`),
      },
      {
        label: 'Archive',
        variant: 'destructive',
        onClick: async (row) => {
          const id = asString(row.id);
          if (!window.confirm(`Archive course "${asString(row.title)}"?`)) return;
          setArchiving(id);
          try {
            await api.archiveCourse(session.token, id);
            reload();
          } catch {
            // silently fail
          } finally {
            setArchiving(null);
          }
        },
      },
    ],
    [api, session.token, onNavigate, reload],
  );

  if (loading) {
    return <PageLoader label="Loading course directory..." />;
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
      <AdminPageHeader
        title="Course Directory"
        addLabel="+ Create Course"
        onAdd={() => onNavigate('/admin/course/add')}
      />
      <AdminDataTable
        columns={columns}
        rows={rows}
        actions={actions}
      />
      {archiving ? (
        <div className="text-center text-sm text-gray-500">Archiving...</div>
      ) : null}
    </div>
  );
}
