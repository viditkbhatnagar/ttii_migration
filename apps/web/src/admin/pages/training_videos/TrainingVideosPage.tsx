import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';

export default function TrainingVideosPage({ api, session }: AdminPageProps) {
  const { data, loading, error } = useAdminPageData(
    () => api.loadTrainingVideos(session.token),
    [],
  );

  const allVideos = useMemo(() => toRecords(data), [data]);

  const categoryBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const row of allVideos) {
      const cat = asString(row.category) || 'Uncategorised';
      counts[cat] = (counts[cat] ?? 0) + 1;
    }
    return counts;
  }, [allVideos]);

  const columns: DataTableColumn[] = useMemo(
    () => [
      { key: 'title', label: 'Title', sortable: true },
      { key: 'category', label: 'Category', render: (v) => asString(v) || 'Uncategorised' },
      {
        key: 'video_type',
        label: 'Type',
        render: (v) => <AdminStatusBadge status={asString(v) || 'default'} />,
      },
      { key: 'created_at', label: 'Created', render: (v) => formatDate(v) },
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

  const categoryCards = Object.entries(categoryBreakdown);

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Training Videos" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Total Videos</p>
            <p className="text-2xl font-semibold text-gray-900">{allVideos.length}</p>
          </CardContent>
        </Card>
        {categoryCards.slice(0, 3).map(([cat, count]) => (
          <Card key={cat}>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">{cat}</p>
              <p className="text-2xl font-semibold text-gray-900">{count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <AdminDataTable columns={columns} rows={allVideos} />
    </div>
  );
}
