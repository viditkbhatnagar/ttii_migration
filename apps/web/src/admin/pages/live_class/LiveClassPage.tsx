import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminTabBar, type AdminTab } from '../../shared/components/AdminTabBar.js';

export default function LiveClassPage({ api, session }: AdminPageProps) {
  const [activeTab, setActiveTab] = useState('all');

  const { data, loading, error } = useAdminPageData(
    () => api.loadLiveClasses(session.token),
    [],
  );

  const allSessions = useMemo(() => toRecords(data), [data]);

  const today = new Date().toISOString().slice(0, 10);

  const upcomingCount = useMemo(
    () => allSessions.filter((r) => asString(r.date).slice(0, 10) > today).length,
    [allSessions, today],
  );

  const pastCount = useMemo(
    () => allSessions.filter((r) => asString(r.date).slice(0, 10) <= today).length,
    [allSessions, today],
  );

  const filteredSessions = useMemo(() => {
    if (activeTab === 'all') return allSessions;
    if (activeTab === 'upcoming') return allSessions.filter((r) => asString(r.date).slice(0, 10) > today);
    if (activeTab === 'past') return allSessions.filter((r) => asString(r.date).slice(0, 10) <= today);
    return allSessions;
  }, [allSessions, activeTab, today]);

  const tabs: AdminTab[] = useMemo(() => [
    { id: 'all', label: 'All', count: allSessions.length },
    { id: 'upcoming', label: 'Upcoming', count: upcomingCount },
    { id: 'past', label: 'Past', count: pastCount },
  ], [allSessions.length, upcomingCount, pastCount]);

  const columns: DataTableColumn[] = useMemo(() => [
    { key: 'session_id', label: 'ID', sortable: true },
    { key: 'title', label: 'Title', sortable: true },
    { key: 'cohort_title', label: 'Cohort' },
    { key: 'course_title', label: 'Course' },
    { key: 'date', label: 'Date', render: (v) => formatDate(v) },
    { key: 'fromTime', label: 'From' },
    { key: 'toTime', label: 'To' },
    { key: 'zoom_id', label: 'Zoom ID' },
  ], []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-red-600">{error}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Live Sessions" />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {[
          { label: 'Total Sessions', value: allSessions.length },
          { label: 'Upcoming', value: upcomingCount },
          { label: 'Past', value: pastCount },
        ].map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <AdminTabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <AdminDataTable columns={columns} rows={filteredSessions} />
    </div>
  );
}
