import { useState, useMemo, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminFilterBar, type FilterField } from '../../shared/components/AdminFilterBar.js';
import { AdminTabBar, type AdminTab } from '../../shared/components/AdminTabBar.js';

export default function AssignmentsPage({ api, session }: AdminPageProps) {
  const [courseFilter, setCourseFilter] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const [courses, setCourses] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    api.loadCourses(session.token).then(setCourses).catch(() => {});
  }, [api, session.token]);

  const { data, loading, error } = useAdminPageData(
    () => api.loadAdminAssignments(session.token, {
      ...(courseFilter ? { courseId: courseFilter } : {}),
    }),
    [courseFilter],
  );

  const allAssignments = useMemo(() => toRecords(data), [data]);

  const now = new Date().toISOString().slice(0, 10);

  const current = useMemo(
    () => allAssignments.filter((a) => {
      const due = asString(a.due_date).slice(0, 10);
      const added = asString(a.added_date).slice(0, 10);
      return added <= now && due >= now;
    }),
    [allAssignments, now],
  );

  const upcoming = useMemo(
    () => allAssignments.filter((a) => asString(a.added_date).slice(0, 10) > now),
    [allAssignments, now],
  );

  const completed = useMemo(
    () => allAssignments.filter((a) => asString(a.due_date).slice(0, 10) < now),
    [allAssignments, now],
  );

  const filteredAssignments = useMemo(() => {
    if (activeTab === 'current') return current;
    if (activeTab === 'upcoming') return upcoming;
    if (activeTab === 'completed') return completed;
    return allAssignments;
  }, [allAssignments, current, upcoming, completed, activeTab]);

  const tabs: AdminTab[] = useMemo(() => [
    { id: 'all', label: 'All', count: allAssignments.length },
    { id: 'current', label: 'Current', count: current.length },
    { id: 'upcoming', label: 'Upcoming', count: upcoming.length },
    { id: 'completed', label: 'Completed', count: completed.length },
  ], [allAssignments.length, current.length, upcoming.length, completed.length]);

  const columns: DataTableColumn[] = useMemo(() => [
    { key: 'title', label: 'Title', sortable: true },
    { key: 'course_title', label: 'Course' },
    { key: 'cohort_title', label: 'Cohort' },
    { key: 'total_marks', label: 'Marks', sortable: true },
    { key: 'added_date', label: 'Added', render: (v) => formatDate(v) },
    { key: 'due_date', label: 'Due Date', render: (v) => formatDate(v) },
    { key: 'submission_count', label: 'Submissions' },
  ], []);

  const filters: FilterField[] = useMemo(() => [
    {
      key: 'course', label: 'Course', type: 'select' as const, value: courseFilter,
      placeholder: 'All Courses',
      options: courses.map((c) => ({ label: asString(c.title), value: asString(c.id) })),
      onChange: setCourseFilter,
    },
  ], [courseFilter, courses]);

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
      <AdminPageHeader title="Assignments" />

      <AdminFilterBar
        filters={filters}
        onApply={() => {}}
        onClear={() => setCourseFilter('')}
      />

      <AdminTabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <AdminDataTable
        columns={columns}
        rows={filteredAssignments}
        actions={[
          {
            label: 'Delete',
            onClick: (row) => { api.deleteAssignment(session.token, asString(row.id)); },
            variant: 'destructive',
          },
        ]}
      />
    </div>
  );
}
