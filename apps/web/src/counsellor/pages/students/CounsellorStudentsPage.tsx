import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AdminDataTable, type DataTableColumn } from '../../../admin/shared/components/AdminDataTable.js';
import { AdminPageHeader } from '../../../admin/shared/components/AdminPageHeader.js';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { toRecords, formatDate } from '../../../admin/shared/utils/admin-data-utils.js';
import type { CounsellorPageProps } from '../../routing/counsellor-routes.js';

const COLUMNS: DataTableColumn[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'enrollment_id', label: 'Enrollment ID', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'phone', label: 'Phone' },
  { key: 'course_name', label: 'Course', sortable: true },
  { key: 'created_at', label: 'Enrolled On', sortable: true, render: (v: unknown) => formatDate(v) },
];

export default function CounsellorStudentsPage({ api, session }: CounsellorPageProps) {
  const { data, loading, error } = useAdminPageData(
    () => api.loadStudents(session.token),
    [api, session.token],
  );
  const rows = useMemo(() => toRecords(data), [data]);

  return (
    <div className="space-y-4">
      <AdminPageHeader title="My Students" />
      <p className="-mt-2 text-sm text-gray-500">Students you have enrolled or referred</p>
      {error ? (
        <Card className="bg-white"><CardContent className="py-8 text-center"><p role="alert" className="text-sm text-red-600">{error}</p></CardContent></Card>
      ) : loading ? (
        <Card className="bg-white"><CardContent className="py-8 text-center text-sm text-gray-500">Loading students…</CardContent></Card>
      ) : (
        <AdminDataTable columns={COLUMNS} rows={rows} searchable exportable />
      )}
    </div>
  );
}
