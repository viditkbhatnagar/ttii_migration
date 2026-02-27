import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asNumber, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';

export default function AssociateTargetPage({ api, session }: AdminPageProps) {
  const { data, loading, error } = useAdminPageData(
    () => api.loadAssociateTargets(session.token),
    [],
  );

  const allTargets = useMemo(() => toRecords(data), [data]);

  const totalTarget = useMemo(
    () => allTargets.reduce((sum, row) => sum + asNumber(row.target_value), 0),
    [allTargets],
  );

  const totalAchieved = useMemo(
    () => allTargets.reduce((sum, row) => sum + asNumber(row.achieved_value), 0),
    [allTargets],
  );

  const columns: DataTableColumn[] = useMemo(
    () => [
      { key: 'associate_name', label: 'Associate', sortable: true },
      { key: 'associate_email', label: 'Email' },
      { key: 'period', label: 'Period', sortable: true },
      { key: 'target_type', label: 'Type' },
      { key: 'target_value', label: 'Target', sortable: true },
      { key: 'achieved_value', label: 'Achieved', sortable: true },
      {
        key: 'achieved_value',
        label: 'Progress',
        render: (_v, row) => {
          const target = asNumber(row.target_value);
          const achieved = asNumber(row.achieved_value);
          const pct = target > 0 ? Math.round((achieved / target) * 100) : 0;
          return (
            <span className={pct >= 100 ? 'text-green-600 font-medium' : pct >= 50 ? 'text-amber-600' : 'text-red-600'}>
              {pct}%
            </span>
          );
        },
      },
      { key: 'remarks', label: 'Remarks' },
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

  const overallPct = totalTarget > 0 ? Math.round((totalAchieved / totalTarget) * 100) : 0;

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Associate Target" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Entries', value: allTargets.length },
          { label: 'Total Target', value: totalTarget },
          { label: 'Total Achieved', value: totalAchieved },
          { label: 'Overall Progress', value: `${overallPct}%` },
        ].map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <AdminDataTable columns={columns} rows={allTargets} />
    </div>
  );
}
