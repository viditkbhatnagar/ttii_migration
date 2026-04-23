import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { toRecords, asString } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn, type DataTableAction } from '../../shared/components/AdminDataTable.js';
import { AdminFilterBar, type FilterField } from '../../shared/components/AdminFilterBar.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';
import { Card, CardContent } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/page-loader';

export default function CourseDirectoryPage({ api, session, onNavigate }: AdminPageProps) {
  const [statusFilter, setStatusFilter] = useState('');

  const { data, loading, error, reload } = useAdminPageData(
    () => api.listCoursesAdmin(session.token),
    [session.token],
  );

  const allRows = useMemo(() => toRecords(data), [data]);

  const filteredRows = useMemo(() => {
    if (!statusFilter) return allRows;
    return allRows.filter((r) => asString(r.status).toLowerCase() === statusFilter);
  }, [allRows, statusFilter]);

  const columns: DataTableColumn[] = useMemo(
    () => [
      { key: 'course_code', label: 'Course Code', sortable: true, render: (v) => asString(v) || '-' },
      {
        key: 'title',
        label: 'Course Title',
        sortable: true,
        render: (value, row) => (
          <button
            type="button"
            className="text-left font-medium text-blue-700 hover:underline"
            onClick={() => onNavigate(`/admin/course/view/${asString(row.id)}`)}
          >
            {asString(value)}
          </button>
        ),
      },
      { key: 'level', label: 'Course Level', sortable: true, render: (v) => asString(v) || '-' },
      { key: 'duration', label: 'Course Duration', sortable: true, render: (v) => asString(v) || '-' },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        render: (value) => <AdminStatusBadge status={asString(value) || 'draft'} />,
      },
    ],
    [onNavigate],
  );

  const filters: FilterField[] = useMemo(
    () => [
      {
        key: 'status',
        label: 'Status',
        type: 'select' as const,
        value: statusFilter,
        placeholder: 'All',
        options: [
          { label: 'Draft', value: 'draft' },
          { label: 'Published', value: 'published' },
          { label: 'Archived', value: 'archived' },
        ],
        onChange: setStatusFilter,
      },
    ],
    [statusFilter],
  );

  const actions: DataTableAction[] = useMemo(
    () => [
      {
        label: 'View',
        onClick: (row) => onNavigate(`/admin/course/view/${asString(row.id)}`),
      },
      {
        label: 'Edit',
        onClick: (row) => onNavigate(`/admin/course/edit/${asString(row.id)}`),
      },
      {
        label: 'Subjects',
        onClick: (row) => onNavigate(`/admin/course/subjects/${asString(row.id)}`),
      },
      {
        label: 'Archive Course',
        variant: 'destructive',
        onClick: (row) => {
          const id = asString(row.id);
          if (!window.confirm(`Archive course "${asString(row.title)}"?`)) return;
          void (async () => {
            try {
              await api.archiveCourse(session.token, id);
              reload();
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'Failed to archive course');
            }
          })();
        },
      },
    ],
    [api, session.token, onNavigate, reload],
  );

  if (loading) return <PageLoader label="Loading course directory..." />;

  if (error) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-red-600">{error}</CardContent>
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
      <AdminFilterBar filters={filters} onApply={() => {}} onClear={() => setStatusFilter('')} />
      <AdminDataTable columns={columns} rows={filteredRows} actions={actions} />
    </div>
  );
}
