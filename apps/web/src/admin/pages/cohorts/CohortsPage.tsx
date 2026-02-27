import { useState, useMemo, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminFilterBar, type FilterField } from '../../shared/components/AdminFilterBar.js';

export default function CohortsPage({ api, session, onNavigate }: AdminPageProps) {
  const [courseFilter, setCourseFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [centreFilter, setCentreFilter] = useState('');

  const [courses, setCourses] = useState<Record<string, unknown>[]>([]);
  const [subjects, setSubjects] = useState<Record<string, unknown>[]>([]);
  const [centres, setCentres] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    Promise.all([
      api.loadCourses(session.token),
      api.loadCentres(session.token),
    ]).then(([c, ct]) => { setCourses(c); setCentres(ct); }).catch(() => {});
  }, [api, session.token]);

  useEffect(() => {
    const courseId = Number(courseFilter);
    if (courseId > 0) {
      api.loadSubjects(session.token, courseId).then(setSubjects).catch(() => {});
    } else {
      setSubjects([]);
    }
    setSubjectFilter('');
  }, [api, session.token, courseFilter]);

  const { data, loading, error } = useAdminPageData(
    () => api.loadAdminCohorts(session.token, {
      ...(courseFilter ? { courseId: Number(courseFilter) } : {}),
      ...(subjectFilter ? { subjectId: Number(subjectFilter) } : {}),
      ...(centreFilter ? { centreId: Number(centreFilter) } : {}),
    }),
    [courseFilter, subjectFilter, centreFilter],
  );

  const allCohorts = useMemo(() => toRecords(data), [data]);

  const columns: DataTableColumn[] = useMemo(() => [
    { key: 'cohort_id', label: 'ID', sortable: true },
    { key: 'title', label: 'Title', sortable: true },
    { key: 'course_title', label: 'Course' },
    { key: 'subject_title', label: 'Subject' },
    { key: 'centre_name', label: 'Centre' },
    { key: 'instructor_name', label: 'Instructor' },
    { key: 'student_count', label: 'Students', sortable: true },
    { key: 'start_date', label: 'Start Date', render: (v) => formatDate(v) },
    { key: 'end_date', label: 'End Date', render: (v) => formatDate(v) },
  ], []);

  const filters: FilterField[] = useMemo(() => [
    {
      key: 'course', label: 'Course', type: 'select' as const, value: courseFilter,
      placeholder: 'All Courses',
      options: courses.map((c) => ({ label: asString(c.title), value: String(asNumber(c.id)) })),
      onChange: setCourseFilter,
    },
    {
      key: 'subject', label: 'Subject', type: 'select' as const, value: subjectFilter,
      placeholder: 'All Subjects',
      options: subjects.map((s) => ({ label: asString(s.title), value: String(asNumber(s.id)) })),
      onChange: setSubjectFilter,
    },
    {
      key: 'centre', label: 'Centre', type: 'select' as const, value: centreFilter,
      placeholder: 'All Centres',
      options: centres.map((ct) => ({ label: asString(ct.centre_name || ct.name), value: String(asNumber(ct.id)) })),
      onChange: setCentreFilter,
    },
  ], [courseFilter, subjectFilter, centreFilter, courses, subjects, centres]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
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
      <AdminPageHeader
        title="Cohorts"
        addLabel="+ Add Cohort"
        onAdd={() => onNavigate('/admin/cohorts/add')}
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {[
          { label: 'Total Cohorts', value: allCohorts.length },
          { label: 'With Students', value: allCohorts.filter((c) => asNumber(c.student_count) > 0).length },
          { label: 'Empty Cohorts', value: allCohorts.filter((c) => asNumber(c.student_count) === 0).length },
        ].map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <AdminFilterBar
        filters={filters}
        onApply={() => {}}
        onClear={() => { setCourseFilter(''); setSubjectFilter(''); setCentreFilter(''); }}
      />

      <AdminDataTable columns={columns} rows={allCohorts} />
    </div>
  );
}
