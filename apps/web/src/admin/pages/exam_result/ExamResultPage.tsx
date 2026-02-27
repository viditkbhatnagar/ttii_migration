import { useState, useMemo, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminFilterBar, type FilterField } from '../../shared/components/AdminFilterBar.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';

export default function ExamResultPage({ api, session }: AdminPageProps) {
  const [examFilter, setExamFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [courses, setCourses] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    api.loadCourses(session.token).then(setCourses).catch(() => {});
  }, [api, session.token]);

  const { data, loading, error } = useAdminPageData(
    () => api.loadAdminExamResults(session.token, {
      ...(examFilter ? { examId: Number(examFilter) } : {}),
      ...(courseFilter ? { courseId: Number(courseFilter) } : {}),
    }),
    [examFilter, courseFilter],
  );

  const exams = data?.exams ?? [];
  const results = data?.results ?? [];

  const columns: DataTableColumn[] = useMemo(() => [
    { key: 'student_name', label: 'Student', sortable: true },
    { key: 'student_id', label: 'Student ID' },
    { key: 'exam_title', label: 'Exam' },
    { key: 'score', label: 'Score', sortable: true },
    { key: 'total_marks', label: 'Total Marks' },
    { key: 'correct', label: 'Correct' },
    { key: 'incorrect', label: 'Incorrect' },
    { key: 'skip', label: 'Skipped' },
    { key: 'time_taken', label: 'Time Taken' },
    {
      key: 'submit_status',
      label: 'Status',
      render: (v) => <AdminStatusBadge status={asNumber(v) === 1 ? 'Submitted' : 'Incomplete'} />,
    },
  ], []);

  const filters: FilterField[] = useMemo(() => [
    {
      key: 'course', label: 'Course', type: 'select' as const, value: courseFilter,
      placeholder: 'All Courses',
      options: courses.map((c) => ({ label: asString(c.title), value: String(asNumber(c.id)) })),
      onChange: setCourseFilter,
    },
    {
      key: 'exam', label: 'Exam', type: 'select' as const, value: examFilter,
      placeholder: 'Select Exam',
      options: exams.map((e) => ({ label: asString(e.title), value: String(asNumber(e.id)) })),
      onChange: setExamFilter,
    },
  ], [courseFilter, examFilter, courses, exams]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
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
      <AdminPageHeader title="Exam Results" />

      <AdminFilterBar
        filters={filters}
        onApply={() => {}}
        onClear={() => { setExamFilter(''); setCourseFilter(''); }}
      />

      {!examFilter ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-gray-500">
            Select an exam from the filter above to view results.
          </CardContent>
        </Card>
      ) : (
        <AdminDataTable columns={columns} rows={results} exportable />
      )}
    </div>
  );
}
