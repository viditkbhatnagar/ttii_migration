import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, toRecords, formatCurrency } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';

export default function CourseFeePage({ api, session, onNavigate }: AdminPageProps) {
  const { data, loading, error } = useAdminPageData(
    () => api.loadCourseFees(session.token),
    [],
  );

  const allFees = useMemo(() => toRecords(data), [data]);

  const columns: DataTableColumn[] = useMemo(() => [
    { key: 'course_title', label: 'Course Name', sortable: true },
    { key: 'price', label: 'Base Fee', sortable: true, render: (v) => formatCurrency(v) },
    { key: 'sale_price', label: 'Offer Fee', sortable: true, render: (v) => formatCurrency(v) },
    {
      key: 'course_id',
      label: 'Action',
      render: (v) => (
        <Button
          variant="outline"
          size="sm"
          className="rounded-full border-purple-300 text-purple-700 hover:bg-purple-50"
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
        <CardContent role="alert" className="py-8 text-center text-sm text-red-600">{error}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Course Fee" />
      <AdminDataTable columns={columns} rows={allFees} />
    </div>
  );
}
