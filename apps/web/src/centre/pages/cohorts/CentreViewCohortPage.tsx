import { useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/page-loader';
import { AdminPageHeader } from '../../../admin/shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../../admin/shared/components/AdminDataTable.js';
import { AdminTabBar, type AdminTab } from '../../../admin/shared/components/AdminTabBar.js';
import { AdminStatusBadge } from '../../../admin/shared/components/AdminStatusBadge.js';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asString, formatDate } from '../../../admin/shared/utils/admin-data-utils.js';
import type { CentrePageProps } from '../../routing/centre-routes.js';

const TABS: AdminTab[] = [
  { id: 'learners', label: 'Learners' },
  { id: 'sessions', label: 'Live Sessions' },
  { id: 'activities', label: 'Activities' },
  { id: 'announcements', label: 'Announcements' },
];

const learnerColumns: DataTableColumn[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'enrollment_id', label: 'Enrollment ID', sortable: true },
  {
    key: 'status',
    label: 'Status',
    render: (value) => <AdminStatusBadge status={asString(value) || 'active'} />,
  },
];

const sessionColumns: DataTableColumn[] = [
  { key: 'title', label: 'Title', sortable: true },
  {
    key: 'date',
    label: 'Date',
    sortable: true,
    render: (value) => formatDate(value),
  },
  { key: 'platform', label: 'Platform' },
  {
    key: 'status',
    label: 'Status',
    render: (value) => <AdminStatusBadge status={asString(value) || 'upcoming'} />,
  },
];

const activityColumns: DataTableColumn[] = [
  { key: 'title', label: 'Title', sortable: true },
  {
    key: 'due_date',
    label: 'Due Date',
    sortable: true,
    render: (value) => formatDate(value),
  },
  { key: 'submissions', label: 'Submissions' },
];

export default function CentreViewCohortPage({ api, session, onNavigate }: CentrePageProps) {
  const cohortId = useMemo(() => {
    const parts = window.location.pathname.split('/');
    return parts[parts.length - 1] || '';
  }, []);

  const [activeTab, setActiveTab] = useState('learners');

  const { data, loading, error } = useAdminPageData<Record<string, unknown>[]>(
    () => api.loadCohorts(session.token),
    [session.token],
  );

  if (loading) {
    return <PageLoader label="Loading centre view cohort..." />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-red-600">
          {error}
        </CardContent>
      </Card>
    );
  }

  const cohorts = data ?? [];
  const cohort = cohorts.find((c) => asString(c.id) === cohortId) ?? null;
  const cohortTitle = cohort ? asString(cohort.title) : 'Unknown Cohort';

  return (
    <div className="space-y-6">
      <AdminPageHeader title={`View Cohort - ${cohortTitle}`}>
        <Button
          variant="outline"
          className="gap-1.5"
          onClick={() => onNavigate('/centre/cohorts')}
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>
      </AdminPageHeader>

      {cohort && (
        <Card>
          <CardContent className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-gray-500">Course</p>
              <p className="text-sm font-medium">{asString(cohort.course_name) || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Start Date</p>
              <p className="text-sm font-medium">{formatDate(cohort.start_date) || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">End Date</p>
              <p className="text-sm font-medium">{formatDate(cohort.end_date) || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Status</p>
              <AdminStatusBadge status={asString(cohort.status) || 'active'} />
            </div>
          </CardContent>
        </Card>
      )}

      <AdminTabBar tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'learners' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button
              className="bg-ttii-primary hover:bg-ttii-primary/90"
              onClick={() => alert('Add learner coming soon')}
            >
              + Add Learner
            </Button>
          </div>
          <AdminDataTable
            columns={learnerColumns}
            rows={[]}
            searchable={false}
            exportable={false}
          />
        </div>
      )}

      {activeTab === 'sessions' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button
              className="bg-ttii-primary hover:bg-ttii-primary/90"
              onClick={() => alert('Add session coming soon')}
            >
              + Add Session
            </Button>
          </div>
          <AdminDataTable
            columns={sessionColumns}
            rows={[]}
            searchable={false}
            exportable={false}
          />
        </div>
      )}

      {activeTab === 'activities' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button
              className="bg-ttii-primary hover:bg-ttii-primary/90"
              onClick={() => alert('Add assignment coming soon')}
            >
              + Add Assignment
            </Button>
          </div>
          <AdminDataTable
            columns={activityColumns}
            rows={[]}
            searchable={false}
            exportable={false}
          />
        </div>
      )}

      {activeTab === 'announcements' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button
              className="bg-ttii-primary hover:bg-ttii-primary/90"
              onClick={() => alert('Post announcement coming soon')}
            >
              + Post Announcement
            </Button>
          </div>
          <Card>
            <CardContent className="py-10 text-center text-sm text-gray-400">
              No announcements available
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
