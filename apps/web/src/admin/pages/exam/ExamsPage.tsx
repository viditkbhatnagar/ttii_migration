import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminFilterBar, type FilterField } from '../../shared/components/AdminFilterBar.js';
import { AdminTabBar, type AdminTab } from '../../shared/components/AdminTabBar.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';

export default function ExamsPage({ api, session, onNavigate }: AdminPageProps) {
  const [courseFilter, setCourseFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const [courses, setCourses] = useState<Record<string, unknown>[]>([]);
  const [subjects, setSubjects] = useState<Record<string, unknown>[]>([]);
  const [batches, setBatches] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    Promise.all([
      api.loadCourses(session.token),
      api.loadBatches(session.token),
    ]).then(([c, b]) => { setCourses(c); setBatches(b); }).catch(() => {});
  }, [api, session.token]);

  useEffect(() => {
    if (courseFilter) {
      api.loadSubjects(session.token, courseFilter).then(setSubjects).catch(() => {});
    } else {
      setSubjects([]);
    }
    setSubjectFilter('');
  }, [api, session.token, courseFilter]);

  const { data, loading, error } = useAdminPageData(
    () => api.loadAdminExams(session.token, {
      ...(courseFilter ? { courseId: courseFilter } : {}),
      ...(subjectFilter ? { subjectId: subjectFilter } : {}),
      ...(batchFilter ? { batchId: batchFilter } : {}),
    }),
    [courseFilter, subjectFilter, batchFilter],
  );

  const allExams = useMemo(() => data?.exams ?? [], [data]);
  const summary = data?.summary ?? { total: 0, upcoming: 0, expired: 0, practice: 0 };

  const now = new Date().toISOString().slice(0, 10);

  const filteredExams = useMemo(() => {
    if (activeTab === 'all') return allExams;
    if (activeTab === 'practice') return allExams.filter((e) => asNumber(e.is_practice) === 1);
    if (activeTab === 'upcoming') return allExams.filter((e) => asString(e.from_date).slice(0, 10) > now);
    if (activeTab === 'expired') return allExams.filter((e) => asString(e.to_date).slice(0, 10) < now);
    return allExams;
  }, [allExams, activeTab, now]);

  const tabs: AdminTab[] = useMemo(() => [
    { id: 'all', label: 'All', count: summary.total },
    { id: 'upcoming', label: 'Upcoming', count: summary.upcoming },
    { id: 'expired', label: 'Expired', count: summary.expired },
    { id: 'practice', label: 'Practice', count: summary.practice },
  ], [summary]);

  const columns: DataTableColumn[] = useMemo(() => [
    { key: 'title', label: 'Title', sortable: true, render: (v) => asString(v) || '-' },
    { key: 'course_title', label: 'Course', sortable: true, render: (v) => asString(v) || '-' },
    { key: 'batch_title', label: 'Batch', sortable: true, render: (v) => asString(v) || '-' },
    {
      key: 'description',
      label: 'Instruction',
      render: (v) => {
        const text = asString(v).replace(/<[^>]*>/g, ''); // strip HTML
        return text.length > 60 ? text.slice(0, 60) + '...' : text || '-';
      },
    },
    {
      key: '_questions',
      label: 'Question Bank',
      render: (_v, row) => (
        <button
          type="button"
          className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-200"
          onClick={() => onNavigate('/admin/exam/exam_questions/' + asString(row?.id))}
        >
          Questions
        </button>
      ),
    },
    {
      key: 'publish_result',
      label: 'Result',
      render: (v) => <AdminStatusBadge status={asNumber(v) === 1 ? 'Published' : 'Unpublished'} />,
    },
  ], [onNavigate]);

  const filters: FilterField[] = useMemo(() => [
    {
      key: 'course', label: 'Course', type: 'select' as const, value: courseFilter,
      placeholder: 'All Courses',
      options: courses.map((c) => ({ label: asString(c.title), value: asString(c.id) })),
      onChange: setCourseFilter,
    },
    {
      key: 'subject', label: 'Subject', type: 'select' as const, value: subjectFilter,
      placeholder: 'All Subjects',
      options: subjects.map((s) => ({ label: asString(s.title), value: asString(s.id) })),
      onChange: setSubjectFilter,
    },
    {
      key: 'batch', label: 'Batch', type: 'select' as const, value: batchFilter,
      placeholder: 'All Batches',
      options: batches.map((b) => ({ label: asString(b.title), value: asString(b.id) })),
      onChange: setBatchFilter,
    },
  ], [courseFilter, subjectFilter, batchFilter, courses, subjects, batches]);

  if (loading) {
    return <PageLoader label="Loading exams..." />;
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
      <AdminPageHeader title="Exams" addLabel="+ Add Exam" onAdd={() => onNavigate('/admin/exam/add')} />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: 'Total Exams', value: summary.total },
          { label: 'Upcoming', value: summary.upcoming },
          { label: 'Expired', value: summary.expired },
          { label: 'Practice', value: summary.practice },
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
        onClear={() => { setCourseFilter(''); setSubjectFilter(''); setBatchFilter(''); }}
      />

      <AdminTabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <AdminDataTable
        columns={columns}
        rows={filteredExams}
        actions={[
          {
            label: 'Edit',
            onClick: (row) => onNavigate('/admin/exam/edit/' + asString(row.id)),
          },
          {
            label: 'Publish Result',
            onClick: (row) => { void api.publishExamResult(session.token, asString(row.id)); },
          },
          {
            label: 'Delete',
            onClick: (row) => { void api.deleteExam(session.token, asString(row.id)); },
            variant: 'destructive',
          },
        ]}
      />
    </div>
  );
}
