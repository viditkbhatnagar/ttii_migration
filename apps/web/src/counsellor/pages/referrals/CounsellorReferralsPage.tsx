import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AdminDataTable, type DataTableColumn } from '../../../admin/shared/components/AdminDataTable.js';
import { AdminPageHeader } from '../../../admin/shared/components/AdminPageHeader.js';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { toRecords, formatDate } from '../../../admin/shared/utils/admin-data-utils.js';
import type { CounsellorPageProps } from '../../routing/counsellor-routes.js';

const COLUMNS: DataTableColumn[] = [
  { key: 'student_name', label: 'Student', sortable: true },
  { key: 'course_name', label: 'Course', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'created_at', label: 'Referred On', sortable: true, render: (v: unknown) => formatDate(v) },
];

export default function CounsellorReferralsPage({ api, session }: CounsellorPageProps) {
  const { data, loading, error } = useAdminPageData(
    () => api.loadReferrals(session.token),
    [api, session.token],
  );
  const rows = useMemo(() => toRecords(data), [data]);

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Referrals" />
      <p className="-mt-2 text-sm text-gray-500">Students you have referred</p>
      {error ? (
        <Card className="bg-white"><CardContent className="py-8 text-center"><p role="alert" className="text-sm text-red-600">{error}</p></CardContent></Card>
      ) : loading ? (
        <Card className="bg-white"><CardContent className="py-8 text-center text-sm text-gray-500">Loading referrals…</CardContent></Card>
      ) : (
        <AdminDataTable columns={COLUMNS} rows={rows} searchable exportable />
      )}
    </div>
  );
}
