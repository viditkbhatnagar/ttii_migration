import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber, asBoolean, dateOnly } from '../../shared/utils/admin-data-utils.js';
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

  // Risha UAT 2026-08-06 — local (IST) today, not `toISOString()`. The UTC
  // day is still yesterday between 00:00 and 05:30 IST, which flipped an exam
  // starting today into the Upcoming tab every morning.
  const now = dateOnly();

  const filteredExams = useMemo(() => {
    if (activeTab === 'all') return allExams;
    if (activeTab === 'practice') return allExams.filter((e) => asNumber(e.is_practice) === 1);
    // from_date / to_date arrive as ISO datetimes (Prisma @db.Date → UTC
    // midnight), so slicing the first 10 chars still yields the stored day.
    // An UNSCHEDULED exam has no date at all, and '' sorts before every real
    // date — which silently filed every dateless draft under Expired.
    if (activeTab === 'upcoming') {
      return allExams.filter((e) => { const from = asString(e.from_date).slice(0, 10); return from !== '' && from > now; });
    }
    if (activeTab === 'expired') {
      return allExams.filter((e) => { const to = asString(e.to_date).slice(0, 10); return to !== '' && to < now; });
    }
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
      // Risha UAT 2026-08-06 — this column read `description`, a DIFFERENT
      // column from the `instructions` the wizard's Step 6 writes, so every
      // wizard-built exam showed a dash here while old seeded rows had text.
      key: 'instructions',
      label: 'Instruction',
      render: (v) => {
        const text = asString(v).replace(/<[^>]*>/g, ''); // strip HTML
        return text.length > 60 ? text.slice(0, 60) + '...' : text || '-';
      },
    },
    {
      // Risha UAT 2026-08-06 — a wizard exam stays `draft` until Step 6
      // publishes it, and only a published exam is takeable. Without this
      // column the admin had no way to tell why students could not see it.
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (v) => <AdminStatusBadge status={asString(v) || 'draft'} />,
    },
    {
      // Risha UAT 2026-08-06 — Step 2 schedules one row per subject and
      // publishing materialises one child exam per row. The list shows the
      // parent only, so this is where an admin sees that "Test Exam" is
      // really five separate sittings.
      key: 'sitting_count',
      label: 'Sittings',
      sortable: true,
      // Risha UAT 2026-08-08 — "why is the new exam showing sitting to 1 by
      // default? This will appear as a single exam then right?" Sittings are
      // only created when the exam is PUBLISHED, so a draft with five subjects
      // already scheduled read "Single" and looked like the split had failed.
      // A draft now reports what publishing WILL produce.
      render: (v, row) => {
        const live = asNumber(v);
        if (live > 0) return String(live);
        // >= 1, not > 1: a one-subject exam publishes into one sitting, and
        // reading "Single" now then "1" after publishing is the same confusion
        // in miniature.
        const scheduled = asNumber(row?.scheduled_sitting_count);
        if (scheduled >= 1) {
          return (
            <span className="text-slate-600">
              {scheduled} <span className="text-xs text-slate-400">on publish</span>
            </span>
          );
        }
        return 'Single';
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
      // Risha UAT 2026-08-06 — `exam.publish_result` is a Prisma Boolean, so it
      // arrives as JSON `true`; asNumber(true) is 0, which pinned this badge to
      // "Unpublished" even right after Publish Result succeeded.
      render: (v) => <AdminStatusBadge status={asBoolean(v) ? 'Published' : 'Unpublished'} />,
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
        <CardContent role="alert" className="py-8 text-center text-sm text-red-600">{error}</CardContent>
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
