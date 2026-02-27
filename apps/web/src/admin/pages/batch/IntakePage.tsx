import { useMemo } from 'react';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { toRecords, asString } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function IntakePage({ api, session }: AdminPageProps) {
  const { data, loading, error } = useAdminPageData(
    () => api.loadBatches(session.token),
    [session.token],
  );

  const columns: DataTableColumn[] = useMemo(
    () => [
      { key: 'title', label: 'Title', sortable: true },
      { key: 'description', label: 'Description' },
      {
        key: 'status',
        label: 'Status',
        render: (value) => <AdminStatusBadge status={asString(value)} />,
      },
      { key: 'student_count', label: 'Students' },
    ],
    [],
  );

  const rows = useMemo(() => toRecords(data), [data]);

  const actions = useMemo(
    () => [
      { label: 'Edit', onClick: () => {} },
      { label: 'Delete', variant: 'destructive' as const, onClick: () => {} },
    ],
    [],
  );

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
        <CardContent className="py-8 text-center text-sm text-red-600">
          {error}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Intake Management" addLabel="+ Add Batch" onAdd={() => {}} />
      <AdminDataTable columns={columns} rows={rows} actions={actions} />
    </div>
  );
}
