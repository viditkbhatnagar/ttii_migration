import { MetricCard } from '@ttii/ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/page-loader';
import { AdminPageHeader } from '../../../admin/shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../../admin/shared/components/AdminDataTable.js';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asString, formatDate, formatCurrency } from '../../../admin/shared/utils/admin-data-utils.js';
import type { CentrePageProps } from '../../routing/centre-routes.js';
import type { CentreDashboardSnapshot } from '../../centre-portal-api.js';

const recentColumns: DataTableColumn[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'course_name', label: 'Course', sortable: true },
  {
    key: 'created_at',
    label: 'Enrolled Date',
    sortable: true,
    render: (value) => formatDate(value),
  },
];

export default function CentreDashboardPage({ api, session, onNavigate }: CentrePageProps) {
  const { data, loading, error } = useAdminPageData<CentreDashboardSnapshot>(
    () => api.loadDashboard(session.token),
    [session.token],
  );

  if (loading) {
    return <PageLoader label="Loading centre dashboard..." />;
  }

  if (error) {
    return (
      <Card>
        <CardContent role="alert" className="py-10 text-center text-sm text-red-600">
          {error}
        </CardContent>
      </Card>
    );
  }

  const snapshot = data!;
  const recentStudents = snapshot.recentStudents.slice(0, 5);

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Dashboard" />

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border-l-4 border-blue-500">
          <MetricCard label="Students" value={String(snapshot.students)} tone="info" />
        </div>
        <div className="rounded-xl border-l-4 border-green-500">
          <MetricCard
            label="Wallet Balance"
            value={formatCurrency(snapshot.walletBalance)}
            tone="success"
          />
        </div>
        <div className="rounded-xl border-l-4 border-amber-500">
          <MetricCard label="Active Cohorts" value={String(snapshot.activeCohorts)} tone="warning" />
        </div>
        <div className="rounded-xl border-l-4 border-purple-500">
          <MetricCard
            label="Pending Applications"
            value={String(snapshot.pendingApplications)}
            tone="neutral"
          />
        </div>
      </div>

      {/* Recent applications */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Recent Applications</h2>
        <AdminDataTable
          columns={recentColumns}
          rows={recentStudents.map((s) => ({
            ...s,
            name: asString(s.name) || asString(s.student_name),
            course_name: asString(s.course_name) || asString(s.course),
          }))}
          searchable={false}
          exportable={false}
          pageSize={5}
        />
      </div>

      {/* Quick action buttons */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => onNavigate('/centre/applications')}>
            Add Application
          </Button>
          <Button variant="outline" onClick={() => onNavigate('/centre/students')}>
            View Students
          </Button>
          <Button variant="outline" onClick={() => onNavigate('/centre/cohorts')}>
            Manage Cohorts
          </Button>
          <Button variant="outline" onClick={() => onNavigate('/centre/wallet')}>
            View Wallet
          </Button>
        </div>
      </div>
    </div>
  );
}
