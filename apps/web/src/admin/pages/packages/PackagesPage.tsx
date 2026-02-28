import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber, toRecords, formatCurrency } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';

export default function PackagesPage({ api, session }: AdminPageProps) {
  const { data, loading, error } = useAdminPageData(
    () => api.loadPackages(session.token),
    [],
  );

  const allPackages = useMemo(() => toRecords(data), [data]);

  const activeCount = useMemo(
    () => allPackages.filter((r) => asString(r.status).toLowerCase() === 'active').length,
    [allPackages],
  );

  const totalFeatures = useMemo(
    () => allPackages.reduce((sum, r) => sum + asNumber(r.features_count), 0),
    [allPackages],
  );

  const columns: DataTableColumn[] = useMemo(
    () => [
      { key: 'title', label: 'Title', sortable: true },
      { key: 'type', label: 'Type' },
      { key: 'course_title', label: 'Course' },
      {
        key: 'amount',
        label: 'Amount',
        sortable: true,
        render: (v) => formatCurrency(v),
      },
      {
        key: 'discount',
        label: 'Discount',
        render: (v) => {
          const n = asNumber(v);
          return n > 0 ? `${n}%` : '-';
        },
      },
      { key: 'duration', label: 'Duration' },
      {
        key: 'status',
        label: 'Status',
        render: (v) => <AdminStatusBadge status={asString(v)} />,
      },
    ],
    [],
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
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
      <AdminPageHeader title="Packages" addLabel="+ Add Package" onAdd={() => {}} />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Packages', value: allPackages.length },
          { label: 'Active Packages', value: activeCount },
          { label: 'Total Features', value: totalFeatures },
        ].map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <AdminDataTable columns={columns} rows={allPackages} />
    </div>
  );
}
