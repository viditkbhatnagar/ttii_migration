import { useState, useMemo, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminFilterBar, type FilterField } from '../../shared/components/AdminFilterBar.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';

const Q_TYPE_LABELS: Record<number, string> = { 0: 'MCQ', 1: 'Descriptive', 2: 'Range' };

export default function QuestionBankPage({ api, session }: AdminPageProps) {
  const [courseFilter, setCourseFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [lessonFilter, setLessonFilter] = useState('');

  const [courses, setCourses] = useState<Record<string, unknown>[]>([]);
  const [subjects, setSubjects] = useState<Record<string, unknown>[]>([]);
  const [lessons, setLessons] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    api.loadCourses(session.token).then(setCourses).catch(() => {});
  }, [api, session.token]);

  useEffect(() => {
    if (courseFilter) {
      api.loadSubjects(session.token, courseFilter).then(setSubjects).catch(() => {});
    } else {
      setSubjects([]);
    }
    setSubjectFilter('');
    setLessonFilter('');
  }, [api, session.token, courseFilter]);

  useEffect(() => {
    if (subjectFilter) {
      api.loadLessons(session.token, subjectFilter).then(setLessons).catch(() => {});
    } else {
      setLessons([]);
    }
    setLessonFilter('');
  }, [api, session.token, subjectFilter]);

  const { data, loading, error } = useAdminPageData(
    () => api.loadQuestionBank(session.token, {
      ...(courseFilter ? { courseId: courseFilter } : {}),
      ...(subjectFilter ? { subjectId: subjectFilter } : {}),
      ...(lessonFilter ? { lessonId: lessonFilter } : {}),
    }),
    [courseFilter, subjectFilter, lessonFilter],
  );

  const questions = useMemo(() => toRecords(data), [data]);

  const columns: DataTableColumn[] = useMemo(() => [
    { key: 'id', label: '#' },
    {
      key: 'title',
      label: 'Question',
      sortable: true,
      render: (value) => {
        const text = asString(value);
        return text.length > 80 ? `${text.slice(0, 80)}...` : text;
      },
    },
    { key: 'course_title', label: 'Course' },
    { key: 'subject_title', label: 'Subject' },
    { key: 'lesson_title', label: 'Lesson' },
    {
      key: 'q_type',
      label: 'Type',
      render: (value) => (
        <AdminStatusBadge status={Q_TYPE_LABELS[asNumber(value)] ?? 'MCQ'} />
      ),
    },
    { key: 'number_of_options', label: 'Options' },
    {
      key: 'created_at',
      label: 'Created',
      render: (value) => formatDate(value),
    },
  ], []);

  const filters: FilterField[] = useMemo(() => [
    {
      key: 'course',
      label: 'Course',
      type: 'select' as const,
      value: courseFilter,
      placeholder: 'All Courses',
      options: courses.map((c) => ({ label: asString(c.title), value: asString(c.id) })),
      onChange: setCourseFilter,
    },
    {
      key: 'subject',
      label: 'Subject',
      type: 'select' as const,
      value: subjectFilter,
      placeholder: 'All Subjects',
      options: subjects.map((s) => ({ label: asString(s.title), value: asString(s.id) })),
      onChange: setSubjectFilter,
    },
    {
      key: 'lesson',
      label: 'Lesson',
      type: 'select' as const,
      value: lessonFilter,
      placeholder: 'All Lessons',
      options: lessons.map((l) => ({ label: asString(l.title), value: asString(l.id) })),
      onChange: setLessonFilter,
    },
  ], [courseFilter, subjectFilter, lessonFilter, courses, subjects, lessons]);

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
      <AdminPageHeader title="Question Bank" />

      <AdminFilterBar
        filters={filters}
        onApply={() => {}}
        onClear={() => { setCourseFilter(''); setSubjectFilter(''); setLessonFilter(''); }}
      />

      <AdminDataTable
        columns={columns}
        rows={questions}
        actions={[
          { label: 'Delete', onClick: (row) => { api.deleteQuestion(session.token, asString(row.id)); }, variant: 'destructive' },
        ]}
      />
    </div>
  );
}
