import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';

export default function DocumentRequestsPage({ api, session }: AdminPageProps) {
  const { data, loading, error } = useAdminPageData(
    () => api.loadDocumentRequests(session.token),
    [],
  );

  const allRequests = useMemo(() => toRecords(data), [data]);

  const pendingCount = useMemo(
    () => allRequests.filter((row) => asString(row.status) === 'pending').length,
    [allRequests],
  );

  const approvedCount = useMemo(
    () => allRequests.filter((row) => asString(row.status) === 'approved').length,
    [allRequests],
  );

  const columns: DataTableColumn[] = useMemo(
    () => [
      { key: 'student_name', label: 'Student', sortable: true },
      { key: 'student_code', label: 'Student ID' },
      { key: 'student_email', label: 'Email' },
      { key: 'document_type', label: 'Document Type', sortable: true },
      {
        key: 'status',
        label: 'Status',
        render: (v) => <AdminStatusBadge status={asString(v)} />,
      },
      { key: 'remarks', label: 'Remarks' },
      { key: 'created_at', label: 'Requested', render: (v) => formatDate(v) },
    ],
    [],
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
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
      <AdminPageHeader title="Document Requests" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Requests', value: allRequests.length },
          { label: 'Pending', value: pendingCount },
          { label: 'Approved', value: approvedCount },
          { label: 'Issued / Delivered', value: allRequests.length - pendingCount - approvedCount },
        ].map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <AdminDataTable columns={columns} rows={allRequests} />
    </div>
  );
}
