import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn, type DataTableAction } from '../../shared/components/AdminDataTable.js';
import { AdminFilterBar, type FilterField } from '../../shared/components/AdminFilterBar.js';
import { AdminTabBar, type AdminTab } from '../../shared/components/AdminTabBar.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';

export default function ApplicationsPage({ api, session, onNavigate }: AdminPageProps) {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [courseId, setCourseId] = useState('');
  const [pipelineRoleId, setPipelineRoleId] = useState('');
  const [pipelineUserId, setPipelineUserId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const { data, loading, error } = useAdminPageData(
    () =>
      api.loadApplications(session.token, {
        ...(fromDate ? { fromDate } : {}),
        ...(toDate ? { toDate } : {}),
        ...(courseId ? { courseId } : {}),
        ...(pipelineRoleId ? { pipelineRoleId } : {}),
        ...(pipelineUserId ? { pipelineUserId } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      }),
    [fromDate, toDate, courseId, pipelineRoleId, pipelineUserId, statusFilter],
  );

  // Load pipeline users for filter dropdown
  const { data: pipelineUsersData } = useAdminPageData(
    () => api.loadPipelineUsers(session.token, 9),
    [],
  );
  const pipelineUserOptions = useMemo(
    () => (Array.isArray(pipelineUsersData) ? pipelineUsersData : []).map((u) => ({ label: asString(u.name), value: asString(u.id) })),
    [pipelineUsersData],
  );

  const items = useMemo(() => (data ? data.items : []), [data]);
  const rejectedCount = data?.rejectedCount ?? 0;
  const pendingCount = data?.pendingCount ?? 0;
  const courseOptions = useMemo(() => (data?.courses ?? []).map(c => ({ label: c.title, value: c.id })), [data]);

  const displayedItems = useMemo(() => {
    if (activeTab === 'rejected') {
      return items.filter((row) => asString(row.status).toLowerCase() === 'rejected');
    }
    if (activeTab === 'pending') {
      return items.filter((row) => asString(row.status).toLowerCase() === 'pending');
    }
    return items;
  }, [items, activeTab]);

  const tabs: AdminTab[] = useMemo(
    () => [
      { id: 'all', label: 'All', count: items.length },
      { id: 'pending', label: 'Pending', count: pendingCount },
      { id: 'rejected', label: 'Rejected', count: rejectedCount },
    ],
    [items.length, pendingCount, rejectedCount],
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
        options: courseOptions,
        onChange: setCourseId,
      },
      {
        key: 'pipelineRoleId',
        label: 'Pipeline',
        type: 'select',
        value: pipelineRoleId,
        placeholder: 'All Pipelines',
        options: [
          { label: 'Senders', value: 'senders' },
          { label: 'Counsellors', value: '9' },
          { label: 'Student Referral', value: 'student_referral' },
          { label: 'Associates', value: '10' },
        ],
        onChange: setPipelineRoleId,
      },
      {
        key: 'pipelineUserId',
        label: 'Pipeline User',
        type: 'select',
        value: pipelineUserId,
        placeholder: 'All Pipeline Users',
        options: pipelineUserOptions,
        onChange: setPipelineUserId,
      },
      {
        key: 'statusFilter',
        label: 'Status',
        type: 'select',
        value: statusFilter,
        placeholder: 'All Status',
        options: [
          { label: 'Pending', value: 'pending' },
          { label: 'Approved', value: 'approved' },
          { label: 'Rejected', value: 'rejected' },
        ],
        onChange: setStatusFilter,
      },
    ],
    [fromDate, toDate, courseId, pipelineRoleId, pipelineUserId, statusFilter, courseOptions, pipelineUserOptions],
  );

  const columns: DataTableColumn[] = useMemo(
    () => [
      {
        key: 'application_id',
        label: 'Application ID',
        sortable: true,
        render: (value) => asString(value) || '-',
      },
      {
        key: 'created_at',
        label: 'Application Date',
        sortable: true,
        render: (value) => formatDate(value),
      },
      {
        key: 'name',
        label: 'Name',
        sortable: true,
        render: (value, row) => (
          <button
            type="button"
            className="text-left font-medium text-blue-600 hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate('/admin/applications/view/' + asString(row._id || row.id));
            }}
          >
            {asString(value) || '-'}
          </button>
        ),
      },
      { key: 'course_title', label: 'Course', sortable: true, render: (v) => asString(v) || '-' },
      { key: 'phone', label: 'Phone No', sortable: true, render: (v) => asString(v) || '-' },
      { key: 'user_email', label: 'E-mail', sortable: true, render: (v) => asString(v) || '-' },
      { key: 'pipeline_role', label: 'Pipeline', sortable: true, render: (v) => asString(v) || '-' },
      { key: 'pipeline_user_name', label: 'Pipeline User', sortable: true, render: (v) => asString(v) || '-' },
      {
        key: 'status',
        label: 'Status',
        render: (value) => {
          const status = asString(value) || 'pending';
          return <AdminStatusBadge status={status} />;
        },
      },
    ],
    [onNavigate],
  );

  const actions: DataTableAction[] = useMemo(
    () => [
      {
        label: 'View',
        onClick: (row) => onNavigate('/admin/applications/view/' + asString(row._id || row.id)),
      },
    ],
    [onNavigate],
  );

  const handleClearFilters = () => {
    setFromDate('');
    setToDate('');
    setCourseId('');
    setPipelineRoleId('');
    setPipelineUserId('');
    setStatusFilter('');
  };

  if (loading) {
    return <PageLoader label="Loading applications..." />;
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
      <AdminPageHeader
        title="Applications"
        addLabel="Add Application"
        onAdd={() => onNavigate('/admin/applications/add')}
      />

      <AdminFilterBar
        filters={filters}
        onApply={() => {}}
        onClear={handleClearFilters}
      />

      <AdminTabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <AdminDataTable
        columns={columns}
        rows={displayedItems}
        actions={actions}
      />
    </div>
  );
}
