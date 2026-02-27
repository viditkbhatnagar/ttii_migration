import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';

export default function CircularsPage({ api, session }: AdminPageProps) {
  const { data, loading, error } = useAdminPageData(
    () => api.loadCirculars(session.token),
    [],
  );

  const allCirculars = useMemo(() => toRecords(data), [data]);

  const publishedCount = useMemo(
    () => allCirculars.filter((row) => asString(row.status) === 'published').length,
    [allCirculars],
  );

  const draftCount = useMemo(
    () => allCirculars.filter((row) => asString(row.status) === 'draft').length,
    [allCirculars],
  );

  const columns: DataTableColumn[] = useMemo(
    () => [
      { key: 'title', label: 'Title', sortable: true },
      { key: 'target_audience', label: 'Audience' },
      {
        key: 'status',
        label: 'Status',
        render: (v) => <AdminStatusBadge status={asString(v)} />,
      },
      { key: 'created_by_name', label: 'Created By' },
      { key: 'publish_date', label: 'Published', render: (v) => formatDate(v) },
      { key: 'expiry_date', label: 'Expires', render: (v) => formatDate(v) },
      { key: 'created_at', label: 'Created', render: (v) => formatDate(v) },
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
      <AdminPageHeader title="Circulars" />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Circulars', value: allCirculars.length },
          { label: 'Published', value: publishedCount },
          { label: 'Drafts', value: draftCount },
        ].map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <AdminDataTable columns={columns} rows={allCirculars} />
    </div>
  );
}
