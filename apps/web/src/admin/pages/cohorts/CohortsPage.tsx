import { useState, useMemo, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
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
import { useConfirm } from '@/components/confirm-dialog';

const LANGUAGE_OPTIONS = [
  { label: 'Malayalam', value: 'malayalam' },
  { label: 'English', value: 'english' },
];

function formatCohortMonth(value: unknown): string {
  const str = asString(value);
  if (!str) return '-';
  // Try parsing as YYYY-MM or full date
  const date = new Date(str.length === 7 ? `${str}-01` : str);
  if (Number.isNaN(date.getTime())) return str;
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export default function CohortsPage({ api, session, onNavigate }: AdminPageProps) {
  const confirm = useConfirm();
  /* ── Filter state ────────────────────────────────────────────────── */
  const [cohortMonth, setCohortMonth] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [languageFilter, setLanguageFilter] = useState('');
  const [instructorFilter, setInstructorFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  /* ── Dropdown options ────────────────────────────────────────────── */
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
    if (courseFilter) {
      api.loadSubjects(session.token, courseFilter).then(setSubjects).catch(() => {});
    } else {
      setSubjects([]);
    }
    setSubjectFilter('');
  }, [api, session.token, courseFilter]);

  /* ── Data loading ────────────────────────────────────────────────── */
  const { data, loading, error, reload } = useAdminPageData(
    () =>
      api.loadAdminCohorts(session.token, {
        ...(cohortMonth ? { cohortMonth } : {}),
        ...(courseFilter ? { courseId: courseFilter } : {}),
        ...(subjectFilter ? { subjectId: subjectFilter } : {}),
        ...(languageFilter ? { languageId: languageFilter } : {}),
        ...(instructorFilter ? { instructorId: instructorFilter } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      }),
    [cohortMonth, courseFilter, subjectFilter, languageFilter, instructorFilter, statusFilter],
  );

  const allCohorts = useMemo(() => toRecords(data), [data]);

  /* ── Tab filtering (client-side) ─────────────────────────────────── */
  const filteredCohorts = useMemo(() => {
    if (activeTab === 'all') return allCohorts;
    return allCohorts.filter((c) => asString(c.status).toLowerCase() === activeTab);
  }, [allCohorts, activeTab]);

  /* ── Tabs ────────────────────────────────────────────────────────── */
  const tabs: AdminTab[] = useMemo(
    () => [
      { id: 'all', label: 'All', count: allCohorts.length },
      { id: 'active', label: 'Active', count: allCohorts.filter((c) => asString(c.status).toLowerCase() === 'active').length },
      { id: 'completed', label: 'Completed', count: allCohorts.filter((c) => asString(c.status).toLowerCase() === 'completed').length },
    ],
    [allCohorts],
  );

  /* ── Filters ─────────────────────────────────────────────────────── */
  const filters: FilterField[] = useMemo(
    () => [
      {
        key: 'cohortMonth',
        label: 'Cohort Date',
        type: 'month' as const,
        value: cohortMonth,
        onChange: setCohortMonth,
      },
      {
        key: 'course',
        label: 'Course',
        type: 'select' as const,
        value: courseFilter,
        placeholder: 'Select Course',
        options: courses.map((c) => ({ label: asString(c.title), value: asString(c.id) })),
        onChange: setCourseFilter,
      },
      {
        key: 'subject',
        label: 'Subject',
        type: 'select' as const,
        value: subjectFilter,
        placeholder: 'Select subject',
        options: subjects.map((s) => ({ label: asString(s.title), value: asString(s.id) })),
        onChange: setSubjectFilter,
      },
      {
        key: 'language',
        label: 'Language',
        type: 'select' as const,
        value: languageFilter,
        placeholder: 'Select language',
        options: LANGUAGE_OPTIONS,
        onChange: setLanguageFilter,
      },
      {
        key: 'instructor',
        label: 'Instructor',
        type: 'select' as const,
        value: instructorFilter,
        placeholder: 'Select Instructor',
        options: instructors.map((i) => ({
          label: asString(i.name) || asString(i.full_name) || 'Unknown',
          value: asString(i.id) || asString(i._id),
        })),
        onChange: setInstructorFilter,
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select' as const,
        value: statusFilter,
        placeholder: 'Select Status',
        options: [
          { label: 'Active', value: 'active' },
          { label: 'Completed', value: 'completed' },
        ],
        onChange: setStatusFilter,
      },
    ],
    [cohortMonth, courseFilter, subjectFilter, languageFilter, instructorFilter, statusFilter, courses, subjects, instructors],
  );

  const handleClearFilters = () => {
    setCohortMonth('');
    setCourseFilter('');
    setSubjectFilter('');
    setLanguageFilter('');
    setInstructorFilter('');
    setStatusFilter('');
  };

  /* ── Delete handler ──────────────────────────────────────────────── */
  const handleDelete = useCallback(
    async (row: Record<string, unknown>) => {
      const id = asString(row._id) || asString(row.id);
      const name = asString(row.title) || asString(row.cohort_id) || 'this cohort';
      if (!(await confirm({
        title: `Delete "${name}"?`,
        description: 'This action cannot be undone.',
        confirmText: 'Delete',
        variant: 'destructive',
      }))) return;
      try {
        await api.deleteCohort(session.token, id);
        reload();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete cohort');
      }
    },
    [api, session.token, reload, confirm],
  );

  /* ── Table columns ───────────────────────────────────────────────── */
  const columns: DataTableColumn[] = useMemo(
    () => [
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        render: (value) => {
          const status = asString(value) || 'active';
          return <AdminStatusBadge status={status} />;
        },
      },
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
        render: (value, row) => (
          <button
            type="button"
            className="text-left font-medium text-blue-600 hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate('/admin/cohorts/view/' + asString(row._id || row.id));
            }}
          >
            {asString(value) || '-'}
          </button>
        ),
      },
      { key: 'course_title', label: 'Course', sortable: true, render: (v) => asString(v) || '-' },
      { key: 'subject_title', label: 'Subject', sortable: true, render: (v) => asString(v) || '-' },
      {
        key: 'offering_titles',
        label: 'Offerings',
        render: (_v, row) => {
          const titles = Array.isArray(row.offering_titles) ? (row.offering_titles as string[]) : [];
          if (titles.length === 0) return '-';
          const joined = titles.join(', ');
          return joined.length > 50 ? `${joined.slice(0, 50)}…` : joined;
        },
      },
      {
        key: 'language',
        label: 'Language',
        sortable: true,
        render: (_v, row) => asString(row.language_title) || asString(row.language) || '-',
      },
      {
        key: 'instructor_name',
        label: 'Instructor',
        sortable: true,
        render: (v) => asString(v) || '-',
      },
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
      {
        key: 'assignment_count',
        label: 'Assignments',
        sortable: true,
        render: (_v, row) => {
          const count = asNumber(row.assignment_count) || asNumber(row.assignments_count) || 0;
          return (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
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
      {
        label: 'View',
        onClick: (row) => onNavigate('/admin/cohorts/view/' + asString(row._id || row.id)),
      },
      {
        label: 'Edit',
        onClick: (row) => onNavigate('/admin/cohorts/edit/' + asString(row._id || row.id)),
      },
      {
        label: 'Delete',
        variant: 'destructive',
        onClick: (row) => {
          void handleDelete(row);
        },
      },
    ],
    [onNavigate, handleDelete],
  );

  /* ── Loading / error ─────────────────────────────────────────────── */
  if (loading) {
    return <PageLoader label="Loading cohorts..." />;
  }

  if (error) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-red-600">{error}</CardContent>
      </Card>
    );
  }

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Cohorts"
        addLabel="+ Add Cohorts"
        onAdd={() => onNavigate('/admin/cohorts/add')}
      />

      <AdminFilterBar filters={filters} onApply={() => {}} onClear={handleClearFilters} />

      <AdminTabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <AdminDataTable columns={columns} rows={filteredCohorts} actions={actions} />
    </div>
  );
}
