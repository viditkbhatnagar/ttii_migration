import { useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminTabBar, type AdminTab } from '../../shared/components/AdminTabBar.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';

export default function ScholarshipsPage({ api, session }: AdminPageProps) {
  const [activeTab, setActiveTab] = useState('all');

  const { data, loading, error } = useAdminPageData(
    () => api.loadScholarships(session.token),
    [],
  );

  const today = new Date().toISOString().slice(0, 10);

  const allItems = useMemo(() => data ?? [], [data]);

  const activeItems = useMemo(
    () => allItems.filter((item) => {
      const validity = asNumber(item.validity);
      const endDate = asString(item.end_date);
      return validity === 1 && (!endDate || endDate.slice(0, 10) >= today);
    }),
    [allItems, today],
  );

  const expiredItems = useMemo(
    () => allItems.filter((item) => {
      const validity = asNumber(item.validity);
      const endDate = asString(item.end_date);
      return validity !== 1 || (endDate && endDate.slice(0, 10) < today);
    }),
    [allItems, today],
  );

  const filteredItems = useMemo(() => {
    if (activeTab === 'active') return activeItems;
    if (activeTab === 'expired') return expiredItems;
    return allItems;
  }, [activeTab, allItems, activeItems, expiredItems]);

  const tabs: AdminTab[] = useMemo(() => [
    { id: 'all', label: 'All', count: allItems.length },
    { id: 'active', label: 'Active', count: activeItems.length },
    { id: 'expired', label: 'Expired', count: expiredItems.length },
  ], [allItems.length, activeItems.length, expiredItems.length]);

  const columns: DataTableColumn[] = useMemo(() => [
    { key: 'code', label: 'Code', sortable: true },
    { key: 'discount_perc', label: 'Discount %', render: (v) => `${asNumber(v)}%` },
    { key: 'package_title', label: 'Package' },
    { key: 'total_no', label: 'Total Uses' },
    { key: 'per_user_no', label: 'Per User' },
    {
      key: 'validity',
      label: 'Status',
      render: (v) => <AdminStatusBadge status={asNumber(v) === 1 ? 'Active' : 'Inactive'} />,
    },
    { key: 'start_date', label: 'Start', render: (v) => formatDate(v) },
    { key: 'end_date', label: 'End', render: (v) => formatDate(v) },
  ], []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
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
      <AdminPageHeader title="Scholarships" />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {[
          { label: 'Total', value: allItems.length },
          { label: 'Active', value: activeItems.length },
          { label: 'Expired', value: expiredItems.length },
        ].map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <AdminTabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <AdminDataTable
        columns={columns}
        rows={filteredItems}
      />
    </div>
  );
}
