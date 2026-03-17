import { useMemo } from 'react';
import { FileText, Target, TrendingUp, Users } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asNumber, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import type { AdminPageProps } from '../../routing/admin-routes.js';

const APPLICATION_COLUMNS: DataTableColumn[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'phone', label: 'Phone' },
  { key: 'course_name', label: 'Course', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'created_at', label: 'Date', sortable: true, render: (v: unknown) => formatDate(v) },
];

const TARGET_COLUMNS: DataTableColumn[] = [
  { key: 'month', label: 'Month', sortable: true },
  { key: 'year', label: 'Year', sortable: true },
  { key: 'target', label: 'Target', sortable: true },
  { key: 'achieved', label: 'Achieved', sortable: true },
  { key: 'percentage', label: '% Achieved', sortable: true, render: (v: unknown) => `${asNumber(v)}%` },
];

const REFERRAL_COLUMNS: DataTableColumn[] = [
  { key: 'student_name', label: 'Student', sortable: true },
  { key: 'course_name', label: 'Course', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'created_at', label: 'Referred On', sortable: true, render: (v: unknown) => formatDate(v) },
];

export default function CounsellorDashboardPage({ api, session }: AdminPageProps) {
  const { data, loading, error } = useAdminPageData(
    () =>
      Promise.all([
        api.loadApplications(session.token),
        api.loadCounsellorTargets(session.token),
        api.loadReferrals(session.token),
      ]).then(([applications, targets, referrals]) => ({ applications, targets, referrals })),
    [api, session.token],
  );

  const applications = useMemo(() => toRecords(data?.applications), [data]);
  const targets = useMemo(() => toRecords(data?.targets), [data]);
  const referrals = useMemo(() => toRecords(data?.referrals), [data]);

  const totalApps = applications.length;
  const convertedApps = applications.filter((a) => a.status === 'converted' || a.status === 'enrolled').length;
  const conversionRate = totalApps > 0 ? Math.round((convertedApps / totalApps) * 100) : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="My Dashboard" />
      <p className="text-sm text-gray-500 -mt-4">Counsellor performance overview</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
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
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="My Dashboard" />
      <p className="text-sm text-gray-500 -mt-4">Counsellor performance overview</p>
        <Card className="bg-white">
          <CardContent className="py-12 text-center">
            <p className="text-sm text-red-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = [
    { label: 'My Applications', value: String(totalApps), icon: FileText, borderColor: 'border-blue-500' },
    { label: 'Conversions', value: String(convertedApps), icon: Users, borderColor: 'border-green-500' },
    { label: 'Conversion Rate', value: `${conversionRate}%`, icon: TrendingUp, borderColor: 'border-purple-500' },
    { label: 'Active Targets', value: String(targets.length), icon: Target, borderColor: 'border-orange-500' },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader title="My Dashboard" />
      <p className="text-sm text-gray-500 -mt-4">Counsellor performance overview</p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className={`bg-white border-l-4 ${stat.borderColor}`}>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ttii-primary/10">
                  <Icon className="size-5 text-ttii-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">My Applications</h2>
        <AdminDataTable columns={APPLICATION_COLUMNS} rows={applications} searchable exportable />
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">My Targets</h2>
        <AdminDataTable columns={TARGET_COLUMNS} rows={targets} searchable exportable />
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">Students I Referred</h2>
        <AdminDataTable columns={REFERRAL_COLUMNS} rows={referrals} searchable exportable />
      </div>
    </div>
  );
}
