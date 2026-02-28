import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminFilterBar, type FilterField } from '../../shared/components/AdminFilterBar.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';

export default function EntranceExamResultsPage({ api, session }: AdminPageProps) {
  const [examFilter, setExamFilter] = useState('');

  const { data: examsData } = useAdminPageData(
    () => api.loadEntranceExams(session.token),
    [],
  );

  const examOptions = useMemo(() =>
    toRecords(examsData).map((e) => ({ label: asString(e.title), value: asString(e.id) })),
    [examsData],
  );

  const { data, loading, error } = useAdminPageData(
    () => api.loadEntranceExamResults(session.token, examFilter || undefined),
    [examFilter],
  );

  const results = useMemo(() => toRecords(data), [data]);

  const columns: DataTableColumn[] = useMemo(() => [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email' },
    { key: 'exam_title', label: 'Exam' },
    { key: 'score', label: 'Score', sortable: true },
    { key: 'total_marks', label: 'Total Marks' },
    { key: 'correct', label: 'Correct' },
    { key: 'incorrect', label: 'Incorrect' },
    { key: 'skipped', label: 'Skipped' },
    {
      key: 'status',
      label: 'Status',
      render: (v) => <AdminStatusBadge status={asString(v) || 'Pending'} />,
    },
  ], []);

  const filters: FilterField[] = useMemo(() => [
    {
      key: 'exam', label: 'Entrance Exam', type: 'select' as const, value: examFilter,
      placeholder: 'All Entrance Exams',
      options: examOptions,
      onChange: setExamFilter,
    },
  ], [examFilter, examOptions]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
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
      <AdminPageHeader title="Entrance Exam Results" />

      <AdminFilterBar
        filters={filters}
        onApply={() => {}}
        onClear={() => setExamFilter('')}
      />

      <AdminDataTable columns={columns} rows={results} exportable />
    </div>
  );
}
