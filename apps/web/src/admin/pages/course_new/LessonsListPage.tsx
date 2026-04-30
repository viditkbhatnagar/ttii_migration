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
      const courses = Array.isArray(row.courses) ? (row.courses as Array<Record<string, unknown>>) : [];
      for (const c of courses) {
        const id = asString(c.id);
        const title = asString(c.title);
        if (id && title && !seen.has(id)) seen.set(id, title);
      }
      // Fallback for any row missing the courses[] array.
      if (courses.length === 0) {
        const id = asString(row.course_id);
        const title = asString(row.course_title);
        if (id && title && !seen.has(id)) seen.set(id, title);
      }
    }
    return Array.from(seen.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [allRows]);

  const subjectOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const row of allRows) {
      // When narrowed to a specific course, only show subjects linked to
      // that course in the dependent picker.
      if (courseFilter) {
        const courses = Array.isArray(row.courses) ? (row.courses as Array<Record<string, unknown>>) : [];
        const ids = courses.length > 0 ? courses.map((c) => asString(c.id)) : [asString(row.course_id)];
        if (!ids.includes(courseFilter)) continue;
      }
      const id = asString(row.subject_id);
      const title = asString(row.subject_title);
      if (id && title && !seen.has(id)) seen.set(id, title);
    }
    return Array.from(seen.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [allRows, courseFilter]);

  // Live filtering — same shape as SubjectsPage, no Apply button needed.
  const filteredRows = useMemo(() => {
    return allRows.filter((row) => {
      const courses = Array.isArray(row.courses) ? (row.courses as Array<Record<string, unknown>>) : [];
      if (search) {
        const s = search.toLowerCase();
        const titleMatch =
          asString(row.title).toLowerCase().includes(s) ||
          asString(row.subject_title).toLowerCase().includes(s);
        const courseMatch =
          asString(row.course_title).toLowerCase().includes(s) ||
          courses.some((c) => asString(c.title).toLowerCase().includes(s));
        if (!titleMatch && !courseMatch) return false;
      }
      if (courseFilter) {
        const ids = courses.length > 0 ? courses.map((c) => asString(c.id)) : [asString(row.course_id)];
        if (!ids.includes(courseFilter)) return false;
      }
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
      {
        key: 'courses',
        label: 'Courses',
        render: (_v, row) => {
          const courses = Array.isArray(row.courses) ? (row.courses as Array<Record<string, unknown>>) : [];
          if (courses.length === 0) {
            const fallback = asString(row.course_title);
            return fallback ? <span className="text-sm">{fallback}</span> : <span className="text-sm text-slate-400">—</span>;
          }
          return (
            <div className="flex flex-wrap gap-1">
              {courses.map((c, i) => (
                <span
                  key={`${asString(c.id)}-${i}`}
                  className="inline-flex max-w-[180px] truncate rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
                  title={asString(c.title)}
                >
                  {asString(c.title)}
                </span>
              ))}
            </div>
          );
        },
      },
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
