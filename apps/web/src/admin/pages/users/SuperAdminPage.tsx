import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';

export default function SuperAdminPage({ api, session }: AdminPageProps) {
  const { data, loading, error } = useAdminPageData(
    () => api.loadAdminUsers(session.token, 1),
    [],
  );

  const allUsers = useMemo(() => toRecords(data), [data]);

  const activeCount = useMemo(
    () => allUsers.filter((row) => asNumber(row.status) === 1).length,
    [allUsers],
  );

  const inactiveCount = useMemo(
    () => allUsers.filter((row) => asNumber(row.status) !== 1).length,
    [allUsers],
  );

  const columns: DataTableColumn[] = useMemo(
    () => [
      { key: 'name', label: 'Name', sortable: true },
      { key: 'user_email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      {
        key: 'status',
        label: 'Status',
        render: (v) => (
          <AdminStatusBadge status={asNumber(v) === 1 ? 'Active' : 'Inactive'} />
        ),
      },
      { key: 'created_at', label: 'Created', render: (v) => formatDate(v) },
    ],
    [],
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
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
      <AdminPageHeader title="Super Admin" />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Total', value: allUsers.length },
          { label: 'Active', value: activeCount },
          { label: 'Inactive', value: inactiveCount },
        ].map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <AdminDataTable columns={columns} rows={allUsers} />
    </div>
  );
}
