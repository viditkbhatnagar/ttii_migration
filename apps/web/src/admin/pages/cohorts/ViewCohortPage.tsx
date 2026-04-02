import { useState, useMemo } from 'react';
import { Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';

const TAB_LABELS = ['Learners', 'Live Sessions', 'Activities/Assignments', 'Info'];

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-2 border-b border-gray-100 py-2.5">
      <span className="text-sm font-medium text-gray-500">{label}</span>
      <span className="col-span-2 text-sm text-gray-900">{value || '-'}</span>
    </div>
  );
}

export default function ViewCohortPage({ api, session, onNavigate }: AdminPageProps) {
  const [activeTab, setActiveTab] = useState(0);

  const cohortId = useMemo(() => {
    const parts = window.location.pathname.split('/');
    return parts[parts.length - 1] || '';
  }, []);

  const { data, loading, error } = useAdminPageData(
    () => api.getCohortDetail(session.token, cohortId),
    [cohortId],
  );

  const cohort = useMemo(() => {
    if (!data) return null;
    const record = data.cohort;
    return typeof record === 'object' && record !== null ? (record as Record<string, unknown>) : null;
  }, [data]);

  const learners = useMemo(() => toRecords(data?.learners), [data]);
  const liveSessions = useMemo(() => toRecords(data?.live_sessions), [data]);
  const assignments = useMemo(() => toRecords(data?.assignments), [data]);

  const learnerColumns: DataTableColumn[] = useMemo(
    () => [
      { key: 'name', label: 'Name', sortable: true },
      { key: 'enrollment_id', label: 'Enrollment ID' },
      {
        key: 'status_label',
        label: 'Status',
        render: (value) => <AdminStatusBadge status={asString(value) || 'active'} />,
      },
      {
        key: '_actions',
        label: 'Action',
        render: (_value, row) => (
          <Button variant="ghost" size="sm" onClick={() => onNavigate('/admin/students/view/' + asString(row.id))}>
            <Eye className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [onNavigate],
  );

  const sessionColumns: DataTableColumn[] = useMemo(
    () => [
      { key: 'title', label: 'Title', sortable: true },
      { key: 'date', label: 'Date', render: (v) => formatDate(v) },
      {
        key: 'fromTime',
        label: 'Time',
        render: (_v, row) => {
          const from = asString(row.fromTime);
          const to = asString(row.toTime);
          return from && to ? `${from} - ${to}` : from || to || '-';
        },
      },
      { key: 'zoom_id', label: 'Zoom ID' },
      {
        key: 'video_url',
        label: 'Action',
        render: (value) => {
          const url = asString(value);
          return url ? (
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
              Watch
            </a>
          ) : (
            '-'
          );
        },
      },
    ],
    [],
  );

  const assignmentColumns: DataTableColumn[] = useMemo(
    () => [
      { key: 'title', label: 'Title', sortable: true },
      { key: 'due_date', label: 'Due Date', render: (v) => formatDate(v) },
      { key: 'total_marks', label: 'Total Marks' },
      { key: 'submissions_count', label: 'Submissions' },
    ],
    [],
  );

  if (loading) {
    return <PageLoader label="Loading view cohort..." />;
  }

  if (error || !cohort) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-red-600">
          {error || 'Cohort not found.'}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title={asString(cohort.title) || 'Cohort Details'}>
        <Button variant="outline" onClick={() => onNavigate('/admin/cohorts')}>
          &larr; Back to Cohorts
        </Button>
      </AdminPageHeader>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-gray-200">
        {TAB_LABELS.map((label, idx) => (
          <button
            key={label}
            type="button"
            className={`relative px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === idx ? 'text-ttii-primary' : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab(idx)}
          >
            {label}
            {activeTab === idx ? (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ttii-primary" />
            ) : null}
          </button>
        ))}
      </div>

      {/* Tab 0: Learners */}
      {activeTab === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Learners ({learners.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {learners.length > 0 ? (
              <AdminDataTable columns={learnerColumns} rows={learners} searchable exportable={false} />
            ) : (
              <p className="py-6 text-center text-sm text-gray-400">No learners enrolled in this cohort.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 1: Live Sessions */}
      {activeTab === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Live Sessions ({liveSessions.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {liveSessions.length > 0 ? (
              <AdminDataTable columns={sessionColumns} rows={liveSessions} searchable exportable={false} />
            ) : (
              <p className="py-6 text-center text-sm text-gray-400">No live sessions scheduled.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 2: Activities/Assignments */}
      {activeTab === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assignments ({assignments.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {assignments.length > 0 ? (
              <AdminDataTable columns={assignmentColumns} rows={assignments} searchable exportable={false} />
            ) : (
              <p className="py-6 text-center text-sm text-gray-400">No assignments found.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Info */}
      {activeTab === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cohort Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-x-8 md:grid-cols-2">
              <div>
                <InfoRow label="Cohort ID" value={asString(cohort.cohort_id)} />
                <InfoRow label="Title" value={asString(cohort.title)} />
                <InfoRow label="Course" value={asString(cohort.course_title)} />
                <InfoRow label="Subject" value={asString(cohort.subject_title)} />
              </div>
              <div>
                <InfoRow label="Centre" value={asString(cohort.centre_name)} />
                <InfoRow label="Instructor" value={asString(cohort.instructor_name)} />
                <InfoRow label="Start Date" value={formatDate(cohort.start_date) || '-'} />
                <InfoRow label="End Date" value={formatDate(cohort.end_date) || '-'} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
