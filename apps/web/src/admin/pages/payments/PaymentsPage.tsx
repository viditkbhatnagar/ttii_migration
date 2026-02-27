import { useState, useMemo, useCallback } from 'react';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { toRecords, formatCurrency, formatDate, dateOnly } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminFilterBar, type FilterField } from '../../shared/components/AdminFilterBar.js';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function PaymentsPage({ api, session }: AdminPageProps) {
  const [fromDate, setFromDate] = useState(() => dateOnly(-30));
  const [toDate, setToDate] = useState(() => dateOnly());
  const [appliedFrom, setAppliedFrom] = useState(() => dateOnly(-30));
  const [appliedTo, setAppliedTo] = useState(() => dateOnly());

  const { data, loading, error } = useAdminPageData(
    () => api.loadPayments(session.token, { fromDate: appliedFrom, toDate: appliedTo }),
    [session.token, appliedFrom, appliedTo],
  );

  const handleApply = useCallback(() => {
    setAppliedFrom(fromDate);
    setAppliedTo(toDate);
  }, [fromDate, toDate]);

  const handleClear = useCallback(() => {
    const defaultFrom = dateOnly(-30);
    const defaultTo = dateOnly();
    setFromDate(defaultFrom);
    setToDate(defaultTo);
    setAppliedFrom(defaultFrom);
    setAppliedTo(defaultTo);
  }, []);

  const filters: FilterField[] = useMemo(
    () => [
      {
        key: 'from',
        label: 'From Date',
        type: 'date',
        value: fromDate,
        onChange: setFromDate,
      },
      {
        key: 'to',
        label: 'To Date',
        type: 'date',
        value: toDate,
        onChange: setToDate,
      },
    ],
    [fromDate, toDate],
  );

  const columns: DataTableColumn[] = useMemo(
    () => [
      { key: 'user_name', label: 'User', sortable: true },
      { key: 'student_id', label: 'Student ID' },
      { key: 'course_title', label: 'Course' },
      {
        key: 'amount_paid',
        label: 'Amount Paid',
        sortable: true,
        render: (value) => formatCurrency(value),
      },
      {
        key: 'payment_date',
        label: 'Payment Date',
        render: (value) => formatDate(value),
      },
      { key: 'razorpay_payment_id', label: 'Payment ID' },
    ],
    [],
  );

  const rows = useMemo(() => toRecords(data), [data]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-16 w-full" />
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
      <AdminPageHeader title="Payments" />
      <AdminFilterBar filters={filters} onApply={handleApply} onClear={handleClear} />
      <AdminDataTable columns={columns} rows={rows} />
    </div>
  );
}
