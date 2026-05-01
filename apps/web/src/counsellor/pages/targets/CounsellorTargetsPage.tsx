import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AdminDataTable, type DataTableColumn } from '../../../admin/shared/components/AdminDataTable.js';
import { AdminPageHeader } from '../../../admin/shared/components/AdminPageHeader.js';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asNumber, toRecords } from '../../../admin/shared/utils/admin-data-utils.js';
import type { CounsellorPageProps } from '../../routing/counsellor-routes.js';

const COLUMNS: DataTableColumn[] = [
  { key: 'month', label: 'Month', sortable: true },
  { key: 'year', label: 'Year', sortable: true },
  { key: 'target', label: 'Target', sortable: true },
  { key: 'achieved', label: 'Achieved', sortable: true },
  { key: 'percentage', label: '% Achieved', sortable: true, render: (v: unknown) => `${asNumber(v)}%` },
];

export default function CounsellorTargetsPage({ api, session }: CounsellorPageProps) {
  const { data, loading, error } = useAdminPageData(
    () => api.loadCounsellorTargets(session.token),
    [api, session.token],
  );
  const rows = useMemo(() => toRecords(data), [data]);

  return (
    <div className="space-y-4">
      <AdminPageHeader title="My Targets" />
      <p className="-mt-2 text-sm text-gray-500">Monthly targets and progress</p>
      {error ? (
        <Card className="bg-white"><CardContent className="py-8 text-center"><p role="alert" className="text-sm text-red-600">{error}</p></CardContent></Card>
      ) : loading ? (
        <Card className="bg-white"><CardContent className="py-8 text-center text-sm text-gray-500">Loading targets…</CardContent></Card>
      ) : (
        <AdminDataTable columns={COLUMNS} rows={rows} searchable exportable />
      )}
    </div>
  );
}
