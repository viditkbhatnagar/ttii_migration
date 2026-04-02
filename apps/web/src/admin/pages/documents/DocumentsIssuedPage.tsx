import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';

export default function DocumentsIssuedPage({ api, session }: AdminPageProps) {
  const { data, loading, error } = useAdminPageData(
    () => api.loadDocumentsIssued(session.token),
    [],
  );

  const allIssued = useMemo(() => toRecords(data), [data]);

  const deliveredCount = useMemo(
    () => allIssued.filter((row) => asString(row.status) === 'delivered').length,
    [allIssued],
  );

  const columns: DataTableColumn[] = useMemo(
    () => [
      { key: 'student_name', label: 'Student', sortable: true },
      { key: 'student_code', label: 'Student ID' },
      { key: 'document_type', label: 'Document Type', sortable: true },
      {
        key: 'status',
        label: 'Status',
        render: (v) => <AdminStatusBadge status={asString(v)} />,
      },
      { key: 'issued_by_name', label: 'Issued By' },
      { key: 'remarks', label: 'Remarks' },
      { key: 'updated_at', label: 'Issued Date', render: (v) => formatDate(v) },
    ],
    [],
  );

  if (loading) {
    return <PageLoader label="Loading documents issued..." />;
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
      <AdminPageHeader title="Documents Issued" />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Issued', value: allIssued.length },
          { label: 'Delivered', value: deliveredCount },
          { label: 'Pending Delivery', value: allIssued.length - deliveredCount },
        ].map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <AdminDataTable columns={columns} rows={allIssued} />
    </div>
  );
}
