import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';

export default function RolesPermissionsPage({ api, session }: AdminPageProps) {
  const { data, loading, error } = useAdminPageData(
    () => api.loadRoles(session.token),
    [],
  );

  const allRoles = useMemo(() => toRecords(data), [data]);

  const activeCount = useMemo(
    () => allRoles.filter((r) => asString(r.status).toLowerCase() === 'active').length,
    [allRoles],
  );

  const totalPermissions = useMemo(
    () => allRoles.reduce((sum, r) => sum + asNumber(r.permission_count), 0),
    [allRoles],
  );

  const columns: DataTableColumn[] = useMemo(
    () => [
      { key: 'title', label: 'Role Name', sortable: true },
      { key: 'slug', label: 'Slug' },
      { key: 'permission_count', label: 'Permissions', sortable: true },
      {
        key: 'status',
        label: 'Status',
        render: (v) => <AdminStatusBadge status={asString(v)} />,
      },
      { key: 'created_at', label: 'Created', render: (v) => formatDate(v) },
    ],
    [],
  );

  if (loading) {
    return <PageLoader label="Loading roles permissions..." />;
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
      <AdminPageHeader title="Roles & Permissions" />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Roles', value: allRoles.length },
          { label: 'Active Roles', value: activeCount },
          { label: 'Total Permissions', value: totalPermissions },
        ].map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <AdminDataTable columns={columns} rows={allRoles} />
    </div>
  );
}
