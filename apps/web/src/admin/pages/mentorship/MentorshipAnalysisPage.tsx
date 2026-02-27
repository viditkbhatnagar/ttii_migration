import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asNumber, asString, asRecord, toRecords } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';

export default function MentorshipAnalysisPage({ api, session }: AdminPageProps) {
  const { data, loading, error } = useAdminPageData(
    () => api.loadMentorshipAnalysis(session.token),
    [],
  );

  const analysis = useMemo(() => asRecord(data) ?? {}, [data]);
  const topicBreakdown = useMemo(() => toRecords(analysis.topicBreakdown), [analysis]);

  const columns: DataTableColumn[] = useMemo(
    () => [
      { key: 'topic', label: 'Topic', sortable: true },
      { key: 'session_count', label: 'Sessions', sortable: true },
      {
        key: 'avg_duration',
        label: 'Avg Duration',
        render: (v) => `${Math.round(asNumber(v))} min`,
      },
      {
        key: 'avg_rating',
        label: 'Avg Rating',
        render: (v) => {
          const rating = asNumber(v);
          return rating > 0 ? `${rating.toFixed(1)}/5` : '-';
        },
      },
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

  const avgRating = asNumber(analysis.avgRating);

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Mentorship Analysis" />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Sessions', value: asNumber(analysis.totalSessions) },
          { label: 'AI Sessions', value: asNumber(analysis.aiSessions) },
          { label: 'Human Sessions', value: asNumber(analysis.humanSessions) },
          { label: 'Avg Duration', value: `${Math.round(asNumber(analysis.avgDuration))} min` },
          { label: 'Avg Rating', value: avgRating > 0 ? `${avgRating.toFixed(1)}/5` : '-' },
        ].map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <AdminDataTable columns={columns} rows={topicBreakdown} />
    </div>
  );
}
