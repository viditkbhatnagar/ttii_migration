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

export default function ApplicationsPage({ api, session }: AdminPageProps) {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [courseId, setCourseId] = useState('');
  const [pipelineRoleId, setPipelineRoleId] = useState('');
  const [listBy, setListBy] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const { data, loading, error } = useAdminPageData(
    () =>
      api.loadApplications(session.token, {
        ...(fromDate ? { fromDate } : {}),
        ...(toDate ? { toDate } : {}),
        ...(courseId ? { courseId } : {}),
        ...(pipelineRoleId ? { pipelineRoleId } : {}),
        ...(listBy ? { listBy } : {}),
      }),
    [fromDate, toDate, courseId, pipelineRoleId, listBy],
  );

  const items = useMemo(() => (data ? toRecords(data.items) : []), [data]);
  const rejectedCount = data?.rejectedCount ?? 0;

  const displayedItems = useMemo(() => {
    if (activeTab === 'rejected') {
      return items.filter((row) => asString(row.status).toLowerCase() === 'rejected');
    }
    return items;
  }, [items, activeTab]);

  const tabs: AdminTab[] = useMemo(
    () => [
      { id: 'all', label: 'All', count: items.length },
      { id: 'rejected', label: 'Rejected', count: rejectedCount },
    ],
    [items.length, rejectedCount],
  );

  const filters: FilterField[] = useMemo(
    () => [
      {
        key: 'fromDate',
        label: 'From Date',
        type: 'date',
        value: fromDate,
        onChange: setFromDate,
      },
      {
        key: 'toDate',
        label: 'To Date',
        type: 'date',
        value: toDate,
        onChange: setToDate,
      },
      {
        key: 'courseId',
        label: 'Course',
        type: 'select',
        value: courseId,
        placeholder: 'All Courses',
        options: [],
        onChange: setCourseId,
      },
      {
        key: 'pipelineRoleId',
        label: 'Pipeline',
        type: 'select',
        value: pipelineRoleId,
        placeholder: 'All Pipelines',
        options: [],
        onChange: setPipelineRoleId,
      },
    ],
    [fromDate, toDate, courseId, pipelineRoleId],
  );

  const columns: DataTableColumn[] = useMemo(
    () => [
      { key: 'application_id', label: 'Application ID' },
      {
        key: 'created_at',
        label: 'Date',
        render: (value) => formatDate(value),
      },
      { key: 'name', label: 'Name' },
      { key: 'course_title', label: 'Course' },
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email' },
      { key: 'pipeline', label: 'Pipeline' },
      { key: 'centre_name', label: 'Centre' },
    ],
    [],
  );

  const handleApplyFilters = () => {
    // Filters are reactive via deps in useAdminPageData, so this is a no-op.
    // Kept for AdminFilterBar's onApply contract.
  };

  const handleClearFilters = () => {
    setFromDate('');
    setToDate('');
    setCourseId('');
    setPipelineRoleId('');
    setListBy('');
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
      <AdminPageHeader title="Applications" />

      <AdminFilterBar
        filters={filters}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
      />

      <AdminTabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <AdminDataTable
        columns={columns}
        rows={displayedItems}
        actions={[
          { label: 'View', onClick: () => {} },
          { label: 'Convert', onClick: () => {} },
        ]}
      />
    </div>
  );
}
