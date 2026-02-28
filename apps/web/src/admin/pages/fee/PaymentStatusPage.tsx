import { useState, useMemo, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber, toRecords, formatDate, formatCurrency } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminFilterBar, type FilterField } from '../../shared/components/AdminFilterBar.js';

export default function PaymentStatusPage({ api, session }: AdminPageProps) {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [courses, setCourses] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    api.loadCourses(session.token).then(setCourses).catch(() => {});
  }, [api, session.token]);

  const { data, loading, error } = useAdminPageData<{
    summary: Record<string, unknown>;
    payments: Record<string, unknown>[];
  } | null>(
    () => api.loadPaymentStatus(session.token, {
      ...(fromDate ? { fromDate } : {}),
      ...(toDate ? { toDate } : {}),
      ...(courseFilter ? { courseId: courseFilter } : {}),
    }),
    [fromDate, toDate, courseFilter],
  );

  const payments = useMemo(() => data?.payments ?? [], [data]);

  const filters: FilterField[] = useMemo(() => [
    {
      key: 'from_date',
      label: 'From Date',
      type: 'date' as const,
      value: fromDate,
      onChange: setFromDate,
    },
    {
      key: 'to_date',
      label: 'To Date',
      type: 'date' as const,
      value: toDate,
      onChange: setToDate,
    },
    {
      key: 'course',
      label: 'Course',
      type: 'select' as const,
      value: courseFilter,
      placeholder: 'All Courses',
      options: courses.map((c) => ({ label: asString(c.title), value: asString(c.id) })),
      onChange: setCourseFilter,
    },
  ], [fromDate, toDate, courseFilter, courses]);

  const columns: DataTableColumn[] = useMemo(() => [
    { key: 'user_name', label: 'Student', sortable: true },
    { key: 'student_id', label: 'Student ID' },
    { key: 'course_title', label: 'Course' },
    { key: 'amount_paid', label: 'Amount', render: (v) => formatCurrency(v) },
    { key: 'payment_date', label: 'Payment Date', render: (v) => formatDate(v) },
    { key: 'razorpay_payment_id', label: 'Razorpay ID' },
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
      <AdminPageHeader title="Payment Status" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500">Total Collected</p>
            <p className="text-2xl font-semibold">{formatCurrency(asNumber(data?.summary?.total_collected))}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500">Total Payments</p>
            <p className="text-2xl font-semibold">{asNumber(data?.summary?.total_payments)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500">Unique Students</p>
            <p className="text-2xl font-semibold">{asNumber(data?.summary?.unique_students)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500">Avg Payment</p>
            <p className="text-2xl font-semibold">{formatCurrency(asNumber(data?.summary?.avg_payment))}</p>
          </CardContent>
        </Card>
      </div>

      <AdminFilterBar
        filters={filters}
        onApply={() => {}}
        onClear={() => { setFromDate(''); setToDate(''); setCourseFilter(''); }}
      />

      <AdminDataTable columns={columns} rows={payments} />
    </div>
  );
}
