import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asNumber, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';

export default function CounsellorsPage({ api, session }: AdminPageProps) {
  const { data, loading, error } = useAdminPageData(
    () => api.loadCounsellors(session.token),
    [],
  );

  const allCounsellors = useMemo(() => toRecords(data), [data]);

  const activeCount = useMemo(
    () => allCounsellors.filter((row) => asNumber(row.status) === 1).length,
    [allCounsellors],
  );

  const totalReferred = useMemo(
    () => allCounsellors.reduce((sum, row) => sum + asNumber(row.applications_referred), 0),
    [allCounsellors],
  );

  const totalConverted = useMemo(
    () => allCounsellors.reduce((sum, row) => sum + asNumber(row.applications_converted), 0),
    [allCounsellors],
  );

  const columns: DataTableColumn[] = useMemo(
    () => [
      { key: 'name', label: 'Name', sortable: true },
      { key: 'user_email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'centre_name', label: 'Centre' },
      { key: 'applications_referred', label: 'Referred', sortable: true },
      { key: 'applications_converted', label: 'Converted', sortable: true },
      {
        key: 'status',
        label: 'Status',
        render: (v) => (
          <AdminStatusBadge status={asNumber(v) === 1 ? 'Active' : 'Inactive'} />
        ),
      },
      { key: 'created_at', label: 'Joined', render: (v) => formatDate(v) },
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
      <AdminPageHeader title="Counsellors Directory" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Counsellors', value: allCounsellors.length },
          { label: 'Active', value: activeCount },
          { label: 'Applications Referred', value: totalReferred },
          { label: 'Conversions', value: totalConverted },
        ].map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <AdminDataTable columns={columns} rows={allCounsellors} />
    </div>
  );
}
