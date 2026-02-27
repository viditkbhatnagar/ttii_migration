import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asNumber, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';

export default function FeedsPage({ api, session }: AdminPageProps) {
  const { data, loading, error } = useAdminPageData(
    () => api.loadFeeds(session.token),
    [],
  );

  const allFeeds = useMemo(() => toRecords(data), [data]);

  const totalEngagement = useMemo(
    () =>
      allFeeds.reduce(
        (sum, row) => sum + asNumber(row.watch_count) + asNumber(row.like_count) + asNumber(row.comment_count),
        0,
      ),
    [allFeeds],
  );

  const columns: DataTableColumn[] = useMemo(
    () => [
      { key: 'title', label: 'Title', sortable: true },
      { key: 'course_title', label: 'Course' },
      { key: 'instructor_name', label: 'Instructor' },
      { key: 'watch_count', label: 'Watches', sortable: true },
      { key: 'like_count', label: 'Likes', sortable: true },
      { key: 'comment_count', label: 'Comments', sortable: true },
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
      <AdminPageHeader title="Feeds" />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Feeds', value: allFeeds.length },
          { label: 'Total Engagement', value: totalEngagement },
          { label: 'Avg Likes/Feed', value: allFeeds.length > 0 ? Math.round(allFeeds.reduce((s, r) => s + asNumber(r.like_count), 0) / allFeeds.length) : 0 },
        ].map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <AdminDataTable columns={columns} rows={allFeeds} />
    </div>
  );
}
