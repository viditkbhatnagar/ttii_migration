import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminFilterBar, type FilterField } from '../../shared/components/AdminFilterBar.js';
import { AdminTabBar, type AdminTab } from '../../shared/components/AdminTabBar.js';

export default function CentreCohortsPage({ api, session }: AdminPageProps) {
  const [filterCourse, setFilterCourse] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [appliedCourse, setAppliedCourse] = useState('');
  const [appliedSubject, setAppliedSubject] = useState('');
  const [appliedStatus, setAppliedStatus] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const filters = useMemo(() => ({
    ...(appliedCourse ? { courseId: appliedCourse } : {}),
    ...(appliedSubject ? { subjectId: appliedSubject } : {}),
    ...(appliedStatus ? { status: appliedStatus } : {}),
  }), [appliedCourse, appliedSubject, appliedStatus]);

  const { data, loading, error } = useAdminPageData(
    () => api.loadAdminCohorts(session.token, filters),
    [filters],
  );

  const allRows = useMemo(() => toRecords(data), [data]);

  const rows = useMemo(() => {
    if (activeTab === 'all') return allRows;
    const now = new Date();
    return allRows.filter((row) => {
      const startDate = asString(row.start_date);
      const endDate = asString(row.end_date);
      const end = endDate ? new Date(endDate) : null;
      const start = startDate ? new Date(startDate) : null;
      if (activeTab === 'active') {
        return start && start <= now && (!end || end >= now);
      }
      if (activeTab === 'completed') {
        return end && end < now;
      }
      return true;
    });
  }, [allRows, activeTab]);

  const tabs: AdminTab[] = useMemo(() => {
    const now = new Date();
    const activeCount = allRows.filter((row) => {
      const start = asString(row.start_date) ? new Date(asString(row.start_date)) : null;
      const end = asString(row.end_date) ? new Date(asString(row.end_date)) : null;
      return start && start <= now && (!end || end >= now);
    }).length;
    const completedCount = allRows.filter((row) => {
      const end = asString(row.end_date) ? new Date(asString(row.end_date)) : null;
      return end && end < now;
    }).length;
    return [
      { id: 'all', label: 'All', count: allRows.length },
      { id: 'active', label: 'Active', count: activeCount },
      { id: 'completed', label: 'Completed', count: completedCount },
    ];
  }, [allRows]);

  const filterFields: FilterField[] = [
    {
      key: 'course',
      label: 'Course',
      type: 'select',
      value: filterCourse,
      options: [],
      onChange: setFilterCourse,
    },
    {
      key: 'subject',
      label: 'Subject',
      type: 'select',
      value: filterSubject,
      options: [],
      onChange: setFilterSubject,
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      value: filterStatus,
      options: [
        { label: 'Active', value: 'Active' },
        { label: 'Completed', value: 'Completed' },
      ],
      onChange: setFilterStatus,
    },
  ];

  const columns: DataTableColumn[] = [
    { key: 'cohort_id', label: 'Cohort ID' },
    { key: 'title', label: 'Title', sortable: true },
    { key: 'centre_name', label: 'Centre' },
    { key: 'course_title', label: 'Course' },
    { key: 'subject_title', label: 'Subject' },
    { key: 'instructor_name', label: 'Instructor' },
    { key: 'student_count', label: 'Students' },
    {
      key: 'start_date',
      label: 'Start Date',
      render: (value) => formatDate(value),
    },
    {
      key: 'end_date',
      label: 'End Date',
      render: (value) => formatDate(value),
    },
  ];

  const handleApply = () => {
    setAppliedCourse(filterCourse);
    setAppliedSubject(filterSubject);
    setAppliedStatus(filterStatus);
  };

  const handleClear = () => {
    setFilterCourse('');
    setFilterSubject('');
    setFilterStatus('');
    setAppliedCourse('');
    setAppliedSubject('');
    setAppliedStatus('');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-red-600">
          {error}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Centre Cohorts" />
      <AdminFilterBar filters={filterFields} onApply={handleApply} onClear={handleClear} />
      <AdminTabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      <AdminDataTable columns={columns} rows={rows} />
    </div>
  );
}
