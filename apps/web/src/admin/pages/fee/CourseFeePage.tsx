import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asNumber, asString, toRecords, formatCurrency } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';

export default function CourseFeePage({ api, session, onNavigate }: AdminPageProps) {
  const { data, loading, error } = useAdminPageData(
    () => api.loadCourseFees(session.token),
    [],
  );

  const allFees = useMemo(() => toRecords(data), [data]);

  const totalCollected = useMemo(
    () => allFees.reduce((sum, row) => sum + asNumber(row.total_collected), 0),
    [allFees],
  );

  const totalPending = useMemo(
    () => allFees.reduce((sum, row) => sum + asNumber(row.pending_amount), 0),
    [allFees],
  );

  const columns: DataTableColumn[] = useMemo(() => [
    { key: 'course_title', label: 'Course', sortable: true },
    { key: 'price', label: 'Price', render: (v) => formatCurrency(v) },
    { key: 'sale_price', label: 'Sale Price', render: (v) => formatCurrency(v) },
    { key: 'students_with_fees', label: 'Students' },
    { key: 'total_collected', label: 'Collected', render: (v) => formatCurrency(v) },
    { key: 'pending_amount', label: 'Pending', render: (v) => formatCurrency(v) },
    { key: 'payments_count', label: 'Payments' },
    {
      key: 'course_id',
      label: 'Action',
      render: (v) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate(`/admin/fee_management/payment_status?course_id=${asString(v)}`)}
        >
          View Payments
        </Button>
      ),
    },
  ], [onNavigate]);

  if (loading) {
    return <PageLoader label="Loading course fee..." />;
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
      <AdminPageHeader title="Course Fee Status" />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500">Total Courses</p>
            <p className="text-2xl font-semibold">{allFees.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500">Total Collected</p>
            <p className="text-2xl font-semibold">{formatCurrency(totalCollected)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500">Total Pending</p>
            <p className="text-2xl font-semibold">{formatCurrency(totalPending)}</p>
          </CardContent>
        </Card>
      </div>

      <AdminDataTable columns={columns} rows={allFees} />
    </div>
  );
}
