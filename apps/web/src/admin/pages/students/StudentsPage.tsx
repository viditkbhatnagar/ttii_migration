import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminFilterBar, type FilterField } from '../../shared/components/AdminFilterBar.js';
import { AdminTabBar, type AdminTab } from '../../shared/components/AdminTabBar.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';

export default function StudentsPage({ api, session }: AdminPageProps) {
  const [courseFilter, setCourseFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const { data, loading, error } = useAdminPageData(
    () => api.loadStudents(session.token),
    [],
  );

  const allStudents = useMemo(() => toRecords(data), [data]);

  const activeStudents = useMemo(
    () => allStudents.filter((row) => asNumber(row.status) === 1),
    [allStudents],
  );

  const inactiveStudents = useMemo(
    () => allStudents.filter((row) => asNumber(row.status) === 0),
    [allStudents],
  );

  const filteredStudents = useMemo(() => {
    let list = allStudents;

    if (activeTab === 'active') {
      list = activeStudents;
    } else if (activeTab === 'inactive') {
      list = inactiveStudents;
    }

    if (courseFilter) {
      list = list.filter((row) => asString(row.course_title) === courseFilter);
    }

    if (statusFilter) {
      const numericStatus = statusFilter === 'Active' ? 1 : 0;
      list = list.filter((row) => asNumber(row.status) === numericStatus);
    }

    return list;
  }, [allStudents, activeStudents, inactiveStudents, activeTab, courseFilter, statusFilter]);

  const tabs: AdminTab[] = useMemo(
    () => [
      { id: 'all', label: 'All', count: allStudents.length },
      { id: 'active', label: 'Active', count: activeStudents.length },
      { id: 'inactive', label: 'Inactive', count: inactiveStudents.length },
    ],
    [allStudents.length, activeStudents.length, inactiveStudents.length],
  );

  const filters: FilterField[] = useMemo(
    () => [
      {
        key: 'course',
        label: 'Course',
        type: 'select',
        value: courseFilter,
        placeholder: 'All Courses',
        options: [],
        onChange: setCourseFilter,
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        value: statusFilter,
        placeholder: 'All Statuses',
        options: [
          { label: 'Active', value: 'Active' },
          { label: 'Inactive', value: 'Inactive' },
        ],
        onChange: setStatusFilter,
      },
    ],
    [courseFilter, statusFilter],
  );

  const columns: DataTableColumn[] = useMemo(
    () => [
      { key: 'student_id', label: 'Student ID' },
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      {
        key: 'course_title',
        label: 'Course',
        render: (value) => asString(value) || 'N/A',
      },
      {
        key: 'status',
        label: 'Status',
        render: (value) => (
          <AdminStatusBadge status={asNumber(value) === 1 ? 'Active' : 'Inactive'} />
        ),
      },
    ],
    [],
  );

  const handleApplyFilters = () => {
    // Filters are applied reactively via useMemo, so this is a no-op.
    // Kept for AdminFilterBar's onApply contract.
  };

  const handleClearFilters = () => {
    setCourseFilter('');
    setStatusFilter('');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-10 w-full" />
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
    <div>
      <AdminPageHeader title="Students" />

      <AdminFilterBar
        filters={filters}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
      />

      <AdminTabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <AdminDataTable
        columns={columns}
        rows={filteredStudents}
        actions={[
          { label: 'View', onClick: () => {} },
        ]}
      />
    </div>
  );
}
