import { useMemo } from 'react';
import { GraduationCap, Building2, Users, BookOpen, IndianRupee } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asNumber, toRecords, formatCurrency, formatDate } from '../../shared/utils/admin-data-utils.js';
import type { AdminPageProps } from '../../routing/admin-routes.js';

/* -------------------------------------------------------------------------- */
/*  Stat card configuration                                                   */
/* -------------------------------------------------------------------------- */

interface StatCardDef {
  label: string;
  key: string;
  icon: React.ElementType;
  format?: (value: unknown) => string;
}

const STAT_CARDS: StatCardDef[] = [
  { label: 'Total Courses', key: 'courses_count', icon: GraduationCap },
  { label: 'Total Centres', key: 'centres_count', icon: Building2 },
  { label: 'Total Students', key: 'students_count', icon: Users },
  { label: 'Total Enrolments', key: 'enrolments_count', icon: BookOpen },
  { label: 'Total Payments', key: 'payments_total', icon: IndianRupee, format: formatCurrency },
];

/* -------------------------------------------------------------------------- */
/*  Table column definitions                                                  */
/* -------------------------------------------------------------------------- */

const STUDENT_COLUMNS: DataTableColumn[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'student_id', label: 'Student ID', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'phone', label: 'Phone' },
  { key: 'course', label: 'Course', sortable: true },
  {
    key: 'joined_date',
    label: 'Joined Date',
    sortable: true,
    render: (value: unknown) => formatDate(value),
  },
];

const EVENT_COLUMNS: DataTableColumn[] = [
  { key: 'title', label: 'Title', sortable: true },
  {
    key: 'event_date',
    label: 'Event Date',
    sortable: true,
    render: (value: unknown) => formatDate(value),
  },
  { key: 'from', label: 'From' },
  { key: 'to', label: 'To' },
];

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export default function DashboardPage({ api, session }: AdminPageProps) {
  const { data, loading, error } = useAdminPageData(
    () => api.loadAdminDashboard(session.token),
    [api, session.token],
  );

  const recentStudents = useMemo(() => toRecords(data?.recent_students), [data]);
  const upcomingEvents = useMemo(() => toRecords(data?.upcoming_events), [data]);

  /* ---- Loading state ---------------------------------------------------- */
  if (loading) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="Dashboard" />

        {/* Skeleton stat cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="bg-white">
              <CardContent className="flex items-center gap-4 p-5">
                <Skeleton className="size-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Skeleton tables */}
        <Card className="bg-white">
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ---- Error state ------------------------------------------------------ */
  if (error) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="Dashboard" />
        <Card className="bg-white">
          <CardContent className="py-12 text-center">
            <p className="text-sm text-red-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ---- Loaded state ----------------------------------------------------- */
  return (
    <div className="space-y-6">
      <AdminPageHeader title="Dashboard" />

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {STAT_CARDS.map((stat) => {
          const Icon = stat.icon;
          const raw = data?.[stat.key];
          const displayValue = stat.format ? stat.format(raw) : String(asNumber(raw));

          return (
            <Card key={stat.key} className="bg-white">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ttii-primary/10">
                  <Icon className="size-5 text-ttii-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{displayValue}</p>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recently Joined Students */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">Recently Joined Students</h2>
        <AdminDataTable columns={STUDENT_COLUMNS} rows={recentStudents} searchable exportable />
      </div>

      {/* Upcoming Activities */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">Upcoming Activities</h2>
        <AdminDataTable columns={EVENT_COLUMNS} rows={upcomingEvents} searchable exportable />
      </div>
    </div>
  );
}
