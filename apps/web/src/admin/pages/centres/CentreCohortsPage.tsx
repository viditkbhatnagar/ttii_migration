import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber, toRecords } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn, type DataTableAction } from '../../shared/components/AdminDataTable.js';
import { AdminFilterBar, type FilterField } from '../../shared/components/AdminFilterBar.js';
import { AdminTabBar, type AdminTab } from '../../shared/components/AdminTabBar.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';

const LANGUAGE_OPTIONS = [
  { label: 'Malayalam', value: 'malayalam' },
  { label: 'English', value: 'english' },
];

function formatCohortMonth(value: unknown): string {
  const str = asString(value);
  if (!str) return '-';
  const date = new Date(str.length === 7 ? `${str}-01` : str);
  if (Number.isNaN(date.getTime())) return str;
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export default function CentreCohortsPage({ api, session, onNavigate }: AdminPageProps) {
  const [cohortMonth, setCohortMonth] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterLanguage, setFilterLanguage] = useState('');
  const [filterInstructor, setFilterInstructor] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const [courses, setCourses] = useState<Record<string, unknown>[]>([]);
  const [subjects, setSubjects] = useState<Record<string, unknown>[]>([]);
  const [instructors, setInstructors] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    Promise.all([
      api.loadCourses(session.token),
      api.loadInstructors(session.token),
    ])
      .then(([c, i]) => {
        setCourses(c);
        setInstructors(i);
      })
      .catch(() => {});
  }, [api, session.token]);

  useEffect(() => {
    if (filterCourse) {
      api.loadSubjects(session.token, filterCourse).then(setSubjects).catch(() => {});
    } else {
      setSubjects([]);
    }
    setFilterSubject('');
  }, [api, session.token, filterCourse]);

  const { data, loading, error, reload } = useAdminPageData(
    () =>
      api.loadAdminCohorts(session.token, {
        ...(cohortMonth ? { cohortMonth } : {}),
        ...(filterCourse ? { courseId: filterCourse } : {}),
        ...(filterSubject ? { subjectId: filterSubject } : {}),
        ...(filterLanguage ? { languageId: filterLanguage } : {}),
        ...(filterInstructor ? { instructorId: filterInstructor } : {}),
        ...(filterStatus ? { status: filterStatus } : {}),
      }),
    [cohortMonth, filterCourse, filterSubject, filterLanguage, filterInstructor, filterStatus],
  );

  const allRows = useMemo(() => toRecords(data), [data]);

  const filteredRows = useMemo(() => {
    if (activeTab === 'all') return allRows;
    return allRows.filter((r) => asString(r.status).toLowerCase() === activeTab);
  }, [allRows, activeTab]);

  const tabs: AdminTab[] = useMemo(
    () => [
      { id: 'all', label: 'All', count: allRows.length },
      { id: 'active', label: 'Active', count: allRows.filter((r) => asString(r.status).toLowerCase() === 'active').length },
      { id: 'completed', label: 'Completed', count: allRows.filter((r) => asString(r.status).toLowerCase() === 'completed').length },
    ],
    [allRows],
  );

  const filterFields: FilterField[] = useMemo(
    () => [
      { key: 'cohortMonth', label: 'Cohort Date', type: 'month' as const, value: cohortMonth, onChange: setCohortMonth },
      {
        key: 'course',
        label: 'Course',
        type: 'select' as const,
        value: filterCourse,
        placeholder: 'Select Course',
        options: courses.map((c) => ({ label: asString(c.title), value: asString(c.id) })),
        onChange: setFilterCourse,
      },
      {
        key: 'subject',
        label: 'Subject',
        type: 'select' as const,
        value: filterSubject,
        placeholder: 'Select subject',
        options: subjects.map((s) => ({ label: asString(s.title), value: asString(s.id) })),
        onChange: setFilterSubject,
      },
      {
        key: 'language',
        label: 'Language',
        type: 'select' as const,
        value: filterLanguage,
        placeholder: 'Select language',
        options: LANGUAGE_OPTIONS,
        onChange: setFilterLanguage,
      },
      {
        key: 'instructor',
        label: 'Instructor',
        type: 'select' as const,
        value: filterInstructor,
        placeholder: 'Select Instructor',
        options: instructors.map((i) => ({
          label: asString(i.name) || asString(i.full_name) || 'Unknown',
          value: asString(i.id) || asString(i._id),
        })),
        onChange: setFilterInstructor,
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select' as const,
        value: filterStatus,
        placeholder: 'Select Status',
        options: [
          { label: 'Active', value: 'active' },
          { label: 'Completed', value: 'completed' },
        ],
        onChange: setFilterStatus,
      },
    ],
    [cohortMonth, filterCourse, filterSubject, filterLanguage, filterInstructor, filterStatus, courses, subjects, instructors],
  );

  const handleClear = () => {
    setCohortMonth('');
    setFilterCourse('');
    setFilterSubject('');
    setFilterLanguage('');
    setFilterInstructor('');
    setFilterStatus('');
  };

  const handleDelete = useCallback(
    async (row: Record<string, unknown>) => {
      const id = asString(row._id) || asString(row.id);
      const name = asString(row.title) || 'this cohort';
      if (!window.confirm(`Delete "${name}"?`)) return;
      try {
        await api.deleteCohort(session.token, id);
        reload();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to delete cohort');
      }
    },
    [api, session.token, reload],
  );

  const columns: DataTableColumn[] = useMemo(
    () => [
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        render: (v) => <AdminStatusBadge status={asString(v) || 'active'} />,
      },
      { key: 'centre_name', label: 'Centre', sortable: true, render: (v) => asString(v) || '-' },
      { key: 'cohort_id', label: 'Cohort ID', sortable: true, render: (v) => asString(v) || '-' },
      {
        key: 'cohort_date',
        label: 'Cohort Date',
        sortable: true,
        render: (_v, row) => formatCohortMonth(row.cohort_date || row.cohort_month || row.start_date),
      },
      {
        key: 'title',
        label: 'Cohort Name',
        sortable: true,
        render: (v, row) => (
          <button
            type="button"
            className="text-left font-medium text-blue-600 hover:underline"
            onClick={() => onNavigate('/admin/cohorts/view/' + asString(row._id || row.id))}
          >
            {asString(v) || '-'}
          </button>
        ),
      },
      { key: 'course_title', label: 'Course', sortable: true, render: (v) => asString(v) || '-' },
      { key: 'subject_title', label: 'Subject', sortable: true, render: (v) => asString(v) || '-' },
      { key: 'language', label: 'Language', sortable: true, render: (v) => asString(v) || '-' },
      { key: 'instructor_name', label: 'Instructor', sortable: true, render: (v) => asString(v) || '-' },
      {
        key: 'student_count',
        label: 'No. of Students',
        sortable: true,
        render: (v) => (
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
            {asNumber(v) || 0}
          </span>
        ),
      },
      {
        key: 'live_class_count',
        label: 'No. of Live Classes',
        sortable: true,
        render: (_v, row) => {
          const count = asNumber(row.live_class_count) || asNumber(row.live_sessions_count) || 0;
          return (
            <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-700">
              {count}
            </span>
          );
        },
      },
    ],
    [onNavigate],
  );

  const actions: DataTableAction[] = useMemo(
    () => [
      { label: 'View', onClick: (row) => onNavigate('/admin/cohorts/view/' + asString(row._id || row.id)) },
      { label: 'Edit', onClick: (row) => onNavigate('/admin/cohorts/edit/' + asString(row._id || row.id)) },
      { label: 'Delete', variant: 'destructive', onClick: (row) => void handleDelete(row) },
    ],
    [onNavigate, handleDelete],
  );

  if (loading) return <PageLoader label="Loading centre cohorts..." />;

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-red-600">{error}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Centre Cohorts" />
      <AdminFilterBar filters={filterFields} onApply={() => {}} onClear={handleClear} />
      <AdminTabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      <AdminDataTable columns={columns} rows={filteredRows} actions={actions} />
    </div>
  );
}
