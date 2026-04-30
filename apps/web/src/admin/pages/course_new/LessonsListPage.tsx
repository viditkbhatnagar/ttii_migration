import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asNumber, asString, toRecords } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn, type DataTableAction } from '../../shared/components/AdminDataTable.js';
import { AdminFilterBar, type FilterField } from '../../shared/components/AdminFilterBar.js';

/**
 * Lessons list (Naji 2026-04-30: "Lesson section we can show as table,
 * like subject and content library"). Flat table of every active lesson
 * with course / subject / file-count denormalised. Editing routes back
 * to the existing /admin/course_new/builder step-by-step builder, which
 * stays as the per-lesson detail view.
 */
export default function LessonsListPage({ api, session, onNavigate }: AdminPageProps) {
  const { data, loading, error, reload: _reload } = useAdminPageData(
    () => api.listAllLessonsAdmin(session.token),
    [],
  );

  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');

  const allRows = useMemo(() => toRecords(data), [data]);

  const courseOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const row of allRows) {
      const id = asString(row.course_id);
      const title = asString(row.course_title);
      if (id && title && !seen.has(id)) seen.set(id, title);
    }
    return Array.from(seen.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [allRows]);

  const subjectOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const row of allRows) {
      // Filter the visible subject list by selected course so the picker
      // is meaningful when the admin has narrowed down to one course.
      if (courseFilter && asString(row.course_id) !== courseFilter) continue;
      const id = asString(row.subject_id);
      const title = asString(row.subject_title);
      if (id && title && !seen.has(id)) seen.set(id, title);
    }
    return Array.from(seen.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [allRows, courseFilter]);

  // Live filtering — same shape as SubjectsPage, no Apply button needed
  // (Naji 2026-04-30: filter wasn't working, root cause was the applied/
  // pending split nobody guessed they had to click through).
  const filteredRows = useMemo(() => {
    return allRows.filter((row) => {
      if (search) {
        const s = search.toLowerCase();
        const match =
          asString(row.title).toLowerCase().includes(s) ||
          asString(row.course_title).toLowerCase().includes(s) ||
          asString(row.subject_title).toLowerCase().includes(s);
        if (!match) return false;
      }
      if (courseFilter && asString(row.course_id) !== courseFilter) return false;
      if (subjectFilter && asString(row.subject_id) !== subjectFilter) return false;
      return true;
    });
  }, [allRows, search, courseFilter, subjectFilter]);

  const filters: FilterField[] = useMemo(
    () => [
      {
        key: 'search',
        label: 'Search',
        type: 'text' as const,
        value: search,
        placeholder: 'Title, course, subject…',
        onChange: setSearch,
      },
      {
        key: 'course',
        label: 'Course',
        type: 'select' as const,
        value: courseFilter,
        placeholder: 'All Courses',
        options: courseOptions,
        onChange: (v: string) => {
          setCourseFilter(v);
          // Clear subject when course changes — keeps the picker honest.
          setSubjectFilter('');
        },
      },
      {
        key: 'subject',
        label: 'Subject',
        type: 'select' as const,
        value: subjectFilter,
        placeholder: 'All Subjects',
        options: subjectOptions,
        onChange: setSubjectFilter,
      },
    ],
    [search, courseFilter, subjectFilter, courseOptions, subjectOptions],
  );

  const columns: DataTableColumn[] = useMemo(
    () => [
      { key: 'title', label: 'Lesson', sortable: true, render: (v) => asString(v) || '—' },
      { key: 'course_title', label: 'Course', sortable: true, render: (v) => asString(v) || '—' },
      { key: 'subject_title', label: 'Subject', sortable: true, render: (v) => asString(v) || '—' },
      {
        key: 'files_count',
        label: 'Files',
        sortable: true,
        render: (v) => {
          const n = asNumber(v) || 0;
          return <span className="text-sm text-slate-700">{n}</span>;
        },
      },
      {
        key: 'free',
        label: 'Free',
        render: (v) => {
          const isFree = asString(v).toLowerCase() === 'on';
          return (
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${isFree ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
              {isFree ? 'Free' : 'Paid'}
            </span>
          );
        },
      },
    ],
    [],
  );

  const handleOpen = (row: Record<string, unknown>) => {
    // Send the admin into the existing per-subject builder, pre-selected
    // to this lesson's parent subject. The builder loads its own lesson
    // list and lets the admin manage files / reorder / edit metadata.
    const subjectId = asString(row.subject_id);
    const courseId = asString(row.course_id);
    if (subjectId && courseId) {
      onNavigate(`/admin/course_new/builder?course_id=${encodeURIComponent(courseId)}&subject_id=${encodeURIComponent(subjectId)}`);
    } else {
      onNavigate('/admin/course_new/builder');
    }
  };

  const actions: DataTableAction[] = useMemo(
    () => [
      { label: 'Open Builder', onClick: handleOpen },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  if (loading) return <PageLoader label="Loading lessons..." />;
  if (error) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-red-600">
          {error}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Lessons"
        addLabel="+ Add Lesson"
        onAdd={() => onNavigate('/admin/course_new/builder')}
      />

      <AdminFilterBar
        filters={filters}
        onApply={() => {}}
        onClear={() => {
          setSearch('');
          setCourseFilter('');
          setSubjectFilter('');
        }}
      />

      <AdminDataTable columns={columns} rows={filteredRows} actions={actions} />
    </div>
  );
}
