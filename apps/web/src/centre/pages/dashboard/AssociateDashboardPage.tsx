import { useMemo } from 'react';
import { FileText, Target, TrendingUp, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/page-loader';
import { AdminPageHeader } from '../../../admin/shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../../admin/shared/components/AdminDataTable.js';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { formatDate } from '../../../admin/shared/utils/admin-data-utils.js';
import type { CentrePageProps } from '../../routing/centre-routes.js';

const APPLICATION_COLUMNS: DataTableColumn[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'phone', label: 'Phone' },
  { key: 'course_name', label: 'Course', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'created_at', label: 'Date', sortable: true, render: (v: unknown) => formatDate(v) },
];

const STUDENT_COLUMNS: DataTableColumn[] = [
  { key: 'name', label: 'Student', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'course_name', label: 'Course', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'created_at', label: 'Enrolled', sortable: true, render: (v: unknown) => formatDate(v) },
];

export default function AssociateDashboardPage({ api, session }: CentrePageProps) {
  const { data, loading, error } = useAdminPageData(
    () =>
      Promise.all([
        api.loadApplications(session.token),
        api.loadStudents(session.token),
      ]).then(([appSnapshot, students]) => ({ appSnapshot, students })),
    [api, session.token],
  );

  const applications = useMemo(() => data?.appSnapshot?.items ?? [], [data]);
  const students = useMemo(() => data?.students ?? [], [data]);

  const totalApps = applications.length;
  const convertedApps = applications.filter(
    (a) => a.status === 'converted' || a.status === 'enrolled',
  ).length;
  const conversionRate = totalApps > 0 ? Math.round((convertedApps / totalApps) * 100) : 0;

  if (loading) {
    return <PageLoader label="Loading associate dashboard..." />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="My Dashboard" />
      <p className="text-sm text-gray-500 -mt-4">Associate performance overview</p>
        <Card className="bg-white">
          <CardContent className="py-12 text-center">
            <p role="alert" className="text-sm text-red-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = [
    { label: 'My Referrals', value: String(totalApps), icon: FileText, borderColor: 'border-blue-500' },
    { label: 'Conversions', value: String(convertedApps), icon: Users, borderColor: 'border-green-500' },
    { label: 'Conversion Rate', value: `${conversionRate}%`, icon: TrendingUp, borderColor: 'border-purple-500' },
    { label: 'Enrolled Students', value: String(students.length), icon: Target, borderColor: 'border-orange-500' },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader title="My Dashboard" />
      <p className="text-sm text-gray-500 -mt-4">Associate performance overview</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        <h2 className="text-lg font-semibold text-gray-900">My Referrals</h2>
        <AdminDataTable columns={APPLICATION_COLUMNS} rows={applications} searchable exportable />
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">My Students</h2>
        <AdminDataTable columns={STUDENT_COLUMNS} rows={students} searchable exportable />
      </div>
    </div>
  );
}
