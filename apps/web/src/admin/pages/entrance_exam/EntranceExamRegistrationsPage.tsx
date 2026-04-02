import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminFilterBar, type FilterField } from '../../shared/components/AdminFilterBar.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';

export default function EntranceExamRegistrationsPage({ api, session }: AdminPageProps) {
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
    () => api.loadEntranceExamRegistrations(session.token, examFilter || undefined),
    [examFilter],
  );

  const registrations = useMemo(() => toRecords(data), [data]);

  const columns: DataTableColumn[] = useMemo(() => [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'exam_title', label: 'Entrance Exam' },
    { key: 'course_title', label: 'Course' },
    {
      key: 'status',
      label: 'Status',
      render: (v) => <AdminStatusBadge status={asString(v) || 'Registered'} />,
    },
    { key: 'created_at', label: 'Registered', render: (v) => formatDate(v) },
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
    return <PageLoader label="Loading entrance exam registrations..." />;
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
      <AdminPageHeader title="Entrance Exam Registrations" />

      <AdminFilterBar
        filters={filters}
        onApply={() => {}}
        onClear={() => setExamFilter('')}
      />

      <AdminDataTable columns={columns} rows={registrations} />
    </div>
  );
}
