import { useState, useMemo, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminFilterBar, type FilterField } from '../../shared/components/AdminFilterBar.js';

export default function ExamEvaluationPage({ api, session }: AdminPageProps) {
  const [examFilter, setExamFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [courses, setCourses] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    api.loadCourses(session.token).then(setCourses).catch(() => {});
  }, [api, session.token]);

  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadExamEvaluations(session.token, {
      ...(examFilter ? { examId: examFilter } : {}),
      ...(courseFilter ? { courseId: courseFilter } : {}),
    }),
    [examFilter, courseFilter],
  );

  const exams = data?.exams ?? [];
  const evaluations = data?.pendingEvaluations ?? [];

  const columns: DataTableColumn[] = useMemo(() => [
    { key: 'student_name', label: 'Student', sortable: true },
    { key: 'student_id', label: 'Student ID' },
    { key: 'exam_title', label: 'Exam' },
    { key: 'correct', label: 'Correct' },
    { key: 'incorrect', label: 'Incorrect' },
    { key: 'skip', label: 'Skipped' },
    { key: 'score', label: 'Score', sortable: true },
    { key: 'total_marks', label: 'Total Marks' },
    { key: 'time_taken', label: 'Time Taken' },
  ], []);

  const filters: FilterField[] = useMemo(() => [
    {
      key: 'course', label: 'Course', type: 'select' as const, value: courseFilter,
      placeholder: 'All Courses',
      options: courses.map((c) => ({ label: asString(c.title), value: asString(c.id) })),
      onChange: setCourseFilter,
    },
    {
      key: 'exam', label: 'Exam', type: 'select' as const, value: examFilter,
      placeholder: 'All Exams',
      options: exams.map((e) => ({ label: asString(e.title), value: asString(e.id) })),
      onChange: setExamFilter,
    },
  ], [courseFilter, examFilter, courses, exams]);

  const handleEvaluate = async (row: Record<string, unknown>) => {
    const totalMarks = asNumber(row.total_marks);
    const scoreInput = window.prompt(`Enter score (out of ${totalMarks}):`, String(asNumber(row.score)));
    if (scoreInput === null) return;

    const score = Number(scoreInput);
    if (!Number.isFinite(score) || score < 0) return;

    await api.evaluateExamAttempt(session.token, asString(row.id), score);
    reload();
  };

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
      <AdminPageHeader title="Exam Evaluation" />

      <AdminFilterBar
        filters={filters}
        onApply={() => {}}
        onClear={() => { setExamFilter(''); setCourseFilter(''); }}
      />

      <AdminDataTable
        columns={columns}
        rows={evaluations}
        actions={[
          { label: 'Evaluate', onClick: handleEvaluate },
        ]}
      />
    </div>
  );
}
