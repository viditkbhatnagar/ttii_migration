import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
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
  const [statusFilter, setStatusFilter] = useState('');
  const [centreId, setCentreId] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const { data, loading, error, reload } = useAdminPageData(
    () =>
      api.loadApplications(session.token, {
        ...(fromDate ? { fromDate } : {}),
        ...(toDate ? { toDate } : {}),
        ...(courseId ? { courseId } : {}),
        ...(pipelineRoleId ? { pipelineRoleId } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(centreId ? { centreId } : {}),
      }),
    [fromDate, toDate, courseId, pipelineRoleId, statusFilter, centreId],
  );

  const items = useMemo(() => (data ? data.items : []), [data]);
  const rejectedCount = data?.rejectedCount ?? 0;
  const pendingCount = data?.pendingCount ?? 0;
  const courseOptions = useMemo(() => (data?.courses ?? []).map(c => ({ label: c.title, value: c.id })), [data]);
  const centreOptions = useMemo(() => (data?.centres ?? []).map(c => ({ label: c.centre_name, value: c.id })), [data]);

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
        key: 'centreId',
        label: 'Centre',
        type: 'select',
        value: centreId,
        placeholder: 'All Centres',
        options: centreOptions,
        onChange: setCentreId,
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
    ],
    [fromDate, toDate, courseId, pipelineRoleId, statusFilter, centreId, courseOptions, centreOptions],
  );

  const handleDelete = useCallback(async (row: Record<string, unknown>) => {
    const id = asString(row._id || row.id);
    if (!window.confirm(`Are you sure you want to delete application "${asString(row.name)}"?`)) return;
    try {
      await api.deleteApplication(session.token, id);
      reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete application');
    }
  }, [api, session.token, reload]);

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
      { key: 'centre_name', label: 'Centre', sortable: true, render: (v) => asString(v) || '-' },
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
      {
        label: 'Edit',
        onClick: (row) => onNavigate('/admin/applications/edit/' + asString(row._id || row.id)),
      },
      {
        label: 'Convert',
        onClick: async (row) => {
          const id = asString(row._id || row.id);
          if (!window.confirm(`Convert application "${asString(row.name)}" to student?`)) return;
          try {
            await api.convertApplication(session.token, id);
            reload();
          } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to convert application');
          }
        },
      },
      {
        label: 'Delete',
        variant: 'destructive',
        onClick: (row) => { void handleDelete(row); },
      },
    ],
    [onNavigate, api, session.token, reload, handleDelete],
  );

  const handleApplyFilters = () => {
    // Filters are reactive via deps in useAdminPageData
  };

  const handleClearFilters = () => {
    setFromDate('');
    setToDate('');
    setCourseId('');
    setPipelineRoleId('');
    setStatusFilter('');
    setCentreId('');
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
        addLabel="+ Add Application"
        onAdd={() => onNavigate('/admin/applications/add')}
      />

      <AdminFilterBar
        filters={filters}
        onApply={handleApplyFilters}
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
