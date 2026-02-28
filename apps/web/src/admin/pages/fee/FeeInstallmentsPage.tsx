import { useState, useMemo, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, toRecords, formatDate, formatCurrency } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';
import { AdminFilterBar, type FilterField } from '../../shared/components/AdminFilterBar.js';
import { AdminTabBar, type AdminTab } from '../../shared/components/AdminTabBar.js';

export default function FeeInstallmentsPage({ api, session }: AdminPageProps) {
  const [courseFilter, setCourseFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [courses, setCourses] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    api.loadCourses(session.token).then(setCourses).catch(() => {});
  }, [api, session.token]);

  const { data, loading, error } = useAdminPageData(
    () => api.loadFeeInstallments(session.token, {
      ...(courseFilter ? { courseId: courseFilter } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
    }),
    [courseFilter, statusFilter],
  );

  const allItems = useMemo(() => toRecords(data), [data]);

  const today = new Date().toISOString().slice(0, 10);

  const paidCount = useMemo(
    () => allItems.filter((r) => asString(r.status) === 'paid').length,
    [allItems],
  );

  const pendingCount = useMemo(
    () => allItems.filter((r) => asString(r.status) === 'pending').length,
    [allItems],
  );

  const overdueCount = useMemo(
    () => allItems.filter((r) => asString(r.status) !== 'paid' && asString(r.due_date) < today).length,
    [allItems, today],
  );

  const filteredItems = useMemo(() => {
    if (activeTab === 'paid') return allItems.filter((r) => asString(r.status) === 'paid');
    if (activeTab === 'pending') return allItems.filter((r) => asString(r.status) === 'pending');
    if (activeTab === 'overdue') return allItems.filter((r) => asString(r.status) !== 'paid' && asString(r.due_date) < today);
    return allItems;
  }, [allItems, activeTab, today]);

  const tabs: AdminTab[] = useMemo(() => [
    { id: 'all', label: 'All', count: allItems.length },
    { id: 'paid', label: 'Paid', count: paidCount },
    { id: 'pending', label: 'Pending', count: pendingCount },
    { id: 'overdue', label: 'Overdue', count: overdueCount },
  ], [allItems.length, paidCount, pendingCount, overdueCount]);

  const filters: FilterField[] = useMemo(() => [
    {
      key: 'course',
      label: 'Course',
      type: 'select' as const,
      value: courseFilter,
      placeholder: 'All Courses',
      options: courses.map((c) => ({ label: asString(c.title), value: asString(c.id) })),
      onChange: setCourseFilter,
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select' as const,
      value: statusFilter,
      placeholder: 'All Statuses',
      options: [
        { label: 'Paid', value: 'paid' },
        { label: 'Pending', value: 'pending' },
        { label: 'Overdue', value: 'overdue' },
      ],
      onChange: setStatusFilter,
    },
  ], [courseFilter, statusFilter, courses]);

  const columns: DataTableColumn[] = useMemo(() => [
    { key: 'student_name', label: 'Student', sortable: true },
    { key: 'student_id', label: 'Student ID' },
    { key: 'phone', label: 'Phone' },
    { key: 'course_title', label: 'Course' },
    { key: 'amount', label: 'Amount', render: (v) => formatCurrency(v) },
    { key: 'due_date', label: 'Due Date', render: (v) => formatDate(v) },
    {
      key: 'status',
      label: 'Status',
      render: (v) => <AdminStatusBadge status={asString(v) || 'pending'} />,
    },
  ], []);

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
      <AdminPageHeader title="Fee Installments" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-2xl font-semibold">{allItems.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500">Paid</p>
            <p className="text-2xl font-semibold">{paidCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500">Pending</p>
            <p className="text-2xl font-semibold">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500">Overdue</p>
            <p className="text-2xl font-semibold">{overdueCount}</p>
          </CardContent>
        </Card>
      </div>

      <AdminTabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <AdminFilterBar
        filters={filters}
        onApply={() => {}}
        onClear={() => { setCourseFilter(''); setStatusFilter(''); }}
      />

      <AdminDataTable columns={columns} rows={filteredItems} />
    </div>
  );
}
