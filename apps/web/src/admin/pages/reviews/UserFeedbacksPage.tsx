import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';

export default function UserFeedbacksPage({ api, session }: AdminPageProps) {
  const { data, loading, error } = useAdminPageData(
    () => api.loadUserFeedbacks(session.token),
    [],
  );

  const allReviews = useMemo(() => toRecords(data), [data]);

  const avgRating = useMemo(() => {
    if (allReviews.length === 0) return 0;
    const sum = allReviews.reduce((s, r) => s + asNumber(r.rating), 0);
    return Math.round((sum / allReviews.length) * 10) / 10;
  }, [allReviews]);

  const fiveStarCount = useMemo(
    () => allReviews.filter((r) => asNumber(r.rating) === 5).length,
    [allReviews],
  );

  const columns: DataTableColumn[] = useMemo(
    () => [
      { key: 'user_name', label: 'User', sortable: true },
      { key: 'course_title', label: 'Course' },
      {
        key: 'rating',
        label: 'Rating',
        sortable: true,
        render: (v) => {
          const n = asNumber(v);
          return `${n}/5`;
        },
      },
      {
        key: 'review',
        label: 'Review',
        render: (v) => {
          const text = asString(v);
          return text.length > 80 ? text.slice(0, 80) + '...' : text || '-';
        },
      },
      { key: 'like_count', label: 'Likes', sortable: true },
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
      <AdminPageHeader title="User Feedbacks" />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Reviews', value: allReviews.length },
          { label: 'Avg Rating', value: avgRating },
          { label: '5-Star Reviews', value: fiveStarCount },
        ].map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <AdminDataTable columns={columns} rows={allReviews} />
    </div>
  );
}
