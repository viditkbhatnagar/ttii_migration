import { useState, useMemo, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminFilterBar, type FilterField } from '../../shared/components/AdminFilterBar.js';

export default function AttendancePage({ api, session }: AdminPageProps) {
  const [cohortFilter, setCohortFilter] = useState('');

  const [cohorts, setCohorts] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    api.loadAdminCohorts(session.token).then(setCohorts).catch(() => {});
  }, [api, session.token]);

  const { data, loading, error } = useAdminPageData(
    () => api.loadCohortAttendance(session.token, cohortFilter || undefined),
    [cohortFilter],
  );

  const rows = useMemo(() => data ?? [], [data]);

  const columns: DataTableColumn[] = useMemo(() => [
    { key: 'student_name', label: 'Student', sortable: true },
    { key: 'student_id', label: 'Student ID' },
    { key: 'cohort_title', label: 'Cohort' },
    { key: 'session_title', label: 'Session' },
    { key: 'join_date', label: 'Date', render: (v) => formatDate(v) },
    { key: 'join_time', label: 'Join Time' },
    { key: 'leave_time', label: 'Leave Time' },
    { key: 'duration', label: 'Duration' },
  ], []);

  const filters: FilterField[] = useMemo(() => [
    {
      key: 'cohort', label: 'Cohort', type: 'select' as const, value: cohortFilter,
      placeholder: 'All Cohorts',
      options: cohorts.map((c) => ({ label: asString(c.title), value: asString(c.id) })),
      onChange: setCohortFilter,
    },
  ], [cohortFilter, cohorts]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-16 w-full" />
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
      <AdminPageHeader title="Attendance Management" />

      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="py-3 text-sm text-amber-700">
          Attendance is tracked through live session participation (Zoom). Records show join/leave times for each student.
        </CardContent>
      </Card>

      <AdminFilterBar
        filters={filters}
        onApply={() => {}}
        onClear={() => { setCohortFilter(''); }}
      />

      <AdminDataTable
        columns={columns}
        rows={rows}
      />
    </div>
  );
}
