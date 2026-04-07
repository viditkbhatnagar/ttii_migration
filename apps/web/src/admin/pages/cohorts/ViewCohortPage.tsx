import { useState, useMemo } from 'react';
import { Eye, BookOpen, Users, Video, ClipboardList, Calendar, Megaphone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';

const TAB_LABELS = ['Learners', 'Live Sessions', 'Activities/Assignments', 'Announcements'];

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
  const announcements = useMemo(() => toRecords(data?.announcements), [data]);

  /* ── Table column definitions ───────────────────────────────────── */
  const learnerColumns: DataTableColumn[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'Name',
        sortable: true,
        render: (_v, row) => (
          <div className="flex items-center gap-2">
            <Avatar className="size-8">
              {asString(row.image) ? <AvatarImage src={asString(row.image)} alt="" /> : null}
              <AvatarFallback className="bg-ttii-primary text-xs text-white">
                {(asString(row.name) || 'S').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium">{asString(row.name) || '-'}</span>
          </div>
        ),
      },
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
      { key: 'session_id', label: 'Session ID', render: (v) => asString(v) || '-' },
      { key: 'title', label: 'Title', sortable: true },
      { key: 'date', label: 'Date', render: (v) => formatDate(v) },
      {
        key: 'fromTime',
        label: 'Time',
        render: (_v, row) => {
          const from = asString(row.fromTime) || asString(row.from_time);
          const to = asString(row.toTime) || asString(row.to_time);
          return from && to ? `${from} - ${to}` : from || to || '-';
        },
      },
      { key: 'zoom_id', label: 'Zoom ID', render: (v) => asString(v) || '-' },
      {
        key: 'video_url',
        label: 'Recording',
        render: (value) => {
          const url = asString(value);
          return url ? (
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
              View Recording
            </a>
          ) : (
            <span className="text-xs text-gray-400">Not uploaded</span>
          );
        },
      },
    ],
    [],
  );

  const assignmentColumns: DataTableColumn[] = useMemo(
    () => [
      { key: 'title', label: 'Title', sortable: true },
      { key: 'due_date', label: 'Deadline', render: (v) => formatDate(v) },
      { key: 'total_marks', label: 'Total Marks', render: (v) => asString(v) || '-' },
      { key: 'submissions_count', label: 'Submissions', render: (v) => asNumber(v) || 0 },
    ],
    [],
  );

  const announcementColumns: DataTableColumn[] = useMemo(
    () => [
      { key: 'title', label: 'Title', sortable: true },
      { key: 'content', label: 'Content', render: (v) => {
        const text = asString(v);
        return text.length > 80 ? text.slice(0, 80) + '...' : text || '-';
      }},
      { key: 'created_at', label: 'Date', render: (v) => formatDate(v) },
    ],
    [],
  );

  if (loading) {
    return <PageLoader label="Loading cohort..." />;
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

  /* ── Summary metadata ───────────────────────────────────────────── */
  const instructorName = asString(cohort.instructor_name) || 'Unassigned';
  const instructorImage = asString(cohort.instructor_image);
  const courseTitle = asString(cohort.course_title) || '-';
  const subjectTitle = asString(cohort.subject_title) || '-';
  const language = asString(cohort.language) || '';
  const subjectWithLang = language ? `${subjectTitle} - ${language}` : subjectTitle;
  const studentCount = learners.length || asNumber(cohort.student_count);
  const sessionCount = liveSessions.length || asNumber(cohort.live_class_count) || asNumber(cohort.live_sessions_count);
  const assignmentCount = assignments.length || asNumber(cohort.assignments_count);
  const cohortIdLabel = asString(cohort.cohort_id) || cohortId;
  const startDate = formatDate(cohort.start_date) || '-';
  const endDate = formatDate(cohort.end_date) || '-';
  const status = asString(cohort.status) || 'active';

  return (
    <div className="space-y-4">
      <AdminPageHeader title={asString(cohort.title) || 'Cohort Details'}>
        <Button variant="outline" onClick={() => onNavigate('/admin/cohorts/index')}>
          &larr; Back to Cohorts
        </Button>
        <Button className="bg-ttii-primary hover:bg-ttii-primary/90" onClick={() => onNavigate('/admin/cohorts/add')}>
          + Add Cohort
        </Button>
      </AdminPageHeader>

      {/* ── Summary Card ───────────────────────────────────────────── */}
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            {/* Faculty info */}
            <div className="flex items-center gap-4">
              <Avatar className="size-16 shrink-0">
                {instructorImage ? <AvatarImage src={instructorImage} alt={instructorName} /> : null}
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-lg font-bold text-white">
                  {instructorName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500">Faculty</p>
                <p className="text-lg font-bold text-gray-900">{instructorName}</p>
                <div className="mt-1 flex items-center gap-2">
                  <AdminStatusBadge status={status} />
                  <span className="text-xs text-gray-500">{cohortIdLabel}</span>
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              <div className="flex items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-lg bg-blue-100">
                  <Users className="size-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Students</p>
                  <p className="text-lg font-bold text-gray-900">{studentCount}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-lg bg-purple-100">
                  <Video className="size-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Live Sessions</p>
                  <p className="text-lg font-bold text-gray-900">{sessionCount}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-lg bg-orange-100">
                  <ClipboardList className="size-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Assignments</p>
                  <p className="text-lg font-bold text-gray-900">{assignmentCount}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Course / Subject / Dates row */}
          <div className="mt-6 grid grid-cols-1 gap-4 border-t border-gray-100 pt-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-start gap-2">
              <BookOpen className="mt-0.5 size-4 shrink-0 text-gray-400" />
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Course</p>
                <p className="truncate text-sm font-medium text-gray-900">{courseTitle}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <BookOpen className="mt-0.5 size-4 shrink-0 text-gray-400" />
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Subject</p>
                <p className="truncate text-sm font-medium text-gray-900">{subjectWithLang}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="mt-0.5 size-4 shrink-0 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Start Date</p>
                <p className="text-sm font-medium text-gray-900">{startDate}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="mt-0.5 size-4 shrink-0 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">End Date</p>
                <p className="text-sm font-medium text-gray-900">{endDate}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Tab navigation ──────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {TAB_LABELS.map((label, idx) => (
          <button
            key={label}
            type="button"
            className={`relative px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
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

      {/* Tab 3: Announcements */}
      {activeTab === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Megaphone className="size-4 text-ttii-primary" />
              Announcements ({announcements.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {announcements.length > 0 ? (
              <AdminDataTable columns={announcementColumns} rows={announcements} searchable exportable={false} />
            ) : (
              <p className="py-6 text-center text-sm text-gray-400">No announcements posted.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
