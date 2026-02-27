import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';

export default function MentorshipHistoryPage({ api, session }: AdminPageProps) {
  const { data, loading, error } = useAdminPageData(
    () => api.loadMentorshipHistory(session.token),
    [],
  );

  const allSessions = useMemo(() => toRecords(data), [data]);

  const aiCount = useMemo(
    () => allSessions.filter((row) => asString(row.mentor_type) === 'ai').length,
    [allSessions],
  );

  const avgDuration = useMemo(() => {
    if (allSessions.length === 0) return 0;
    const total = allSessions.reduce((sum, row) => sum + asNumber(row.duration_minutes), 0);
    return Math.round(total / allSessions.length);
  }, [allSessions]);

  const columns: DataTableColumn[] = useMemo(
    () => [
      { key: 'student_name', label: 'Student', sortable: true },
      { key: 'student_code', label: 'Student ID' },
      { key: 'topic', label: 'Topic', sortable: true },
      {
        key: 'mentor_type',
        label: 'Type',
        render: (v) => (
          <AdminStatusBadge status={asString(v) === 'ai' ? 'Active' : 'Completed'} />
        ),
      },
      { key: 'messages_count', label: 'Messages', sortable: true },
      {
        key: 'duration_minutes',
        label: 'Duration',
        render: (v) => `${asNumber(v)} min`,
      },
      {
        key: 'satisfaction_rating',
        label: 'Rating',
        render: (v) => {
          const rating = asNumber(v);
          return rating > 0 ? `${rating}/5` : '-';
        },
      },
      { key: 'created_at', label: 'Date', render: (v) => formatDate(v) },
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
      <AdminPageHeader title="Mentorship History" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Sessions', value: allSessions.length },
          { label: 'AI Sessions', value: aiCount },
          { label: 'Human Sessions', value: allSessions.length - aiCount },
          { label: 'Avg Duration', value: `${avgDuration} min` },
        ].map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <AdminDataTable columns={columns} rows={allSessions} />
    </div>
  );
}
