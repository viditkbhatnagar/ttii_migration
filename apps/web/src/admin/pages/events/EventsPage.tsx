import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';

export default function EventsPage({ api, session }: AdminPageProps) {
  const { data, loading, error } = useAdminPageData(
    () => api.loadEvents(session.token),
    [],
  );

  const allEvents = useMemo(() => toRecords(data), [data]);

  const upcomingCount = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return allEvents.filter((row) => asString(row.event_date) >= today).length;
  }, [allEvents]);

  const totalRegistrations = useMemo(
    () => allEvents.reduce((sum, row) => sum + asNumber(row.registration_count), 0),
    [allEvents],
  );

  const columns: DataTableColumn[] = useMemo(
    () => [
      { key: 'title', label: 'Title', sortable: true },
      { key: 'event_date', label: 'Date', sortable: true, render: (v) => formatDate(v) },
      {
        key: 'from_time',
        label: 'Time',
        render: (_v, row) => {
          const from = asString(row.from_time);
          const to = asString(row.to_time);
          return from && to ? `${from} - ${to}` : from || to || '-';
        },
      },
      { key: 'instructor_name', label: 'Instructor' },
      { key: 'registration_count', label: 'Registrations', sortable: true },
      {
        key: 'is_recording_available',
        label: 'Recording',
        render: (v) => (
          <AdminStatusBadge status={asNumber(v) === 1 ? 'Active' : 'Inactive'} />
        ),
      },
      { key: 'duration', label: 'Duration' },
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

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Events" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Events', value: allEvents.length },
          { label: 'Upcoming', value: upcomingCount },
          { label: 'Past', value: allEvents.length - upcomingCount },
          { label: 'Total Registrations', value: totalRegistrations },
        ].map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <AdminDataTable columns={columns} rows={allEvents} />
    </div>
  );
}
