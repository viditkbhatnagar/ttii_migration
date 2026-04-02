import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber, toRecords, formatDate, formatCurrency } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';

export default function StudentPaymentsPage({ api, session }: AdminPageProps) {
  const { data, loading, error } = useAdminPageData(
    () => api.loadStudentPayments(session.token),
    [],
  );

  const allPayments = useMemo(() => toRecords(data), [data]);

  const totalCollected = useMemo(
    () => allPayments.reduce((sum, r) => sum + asNumber(r.amount), 0),
    [allPayments],
  );

  const paidCount = useMemo(
    () => allPayments.filter((r) => asString(r.status).toLowerCase() === 'paid').length,
    [allPayments],
  );

  const pendingCount = useMemo(
    () => allPayments.filter((r) => asString(r.status).toLowerCase() === 'pending').length,
    [allPayments],
  );

  const columns: DataTableColumn[] = useMemo(
    () => [
      { key: 'student_name', label: 'Student', sortable: true },
      { key: 'course_title', label: 'Course' },
      {
        key: 'amount',
        label: 'Amount',
        sortable: true,
        render: (v) => formatCurrency(v),
      },
      { key: 'due_date', label: 'Due Date', render: (v) => formatDate(v) },
      { key: 'payment_mode', label: 'Payment Mode' },
      {
        key: 'status',
        label: 'Status',
        render: (v) => <AdminStatusBadge status={asString(v)} />,
      },
    ],
    [],
  );

  if (loading) {
    return <PageLoader label="Loading student payments..." />;
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
      <AdminPageHeader title="Student Payments" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Payments', value: allPayments.length },
          { label: 'Total Collected', value: formatCurrency(totalCollected) },
          { label: 'Paid', value: paidCount },
          { label: 'Pending', value: pendingCount },
        ].map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <AdminDataTable columns={columns} rows={allPayments} />
    </div>
  );
}
