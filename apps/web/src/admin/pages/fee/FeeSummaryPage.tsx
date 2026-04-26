import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/page-loader';
import { MetricCard } from '@ttii/ui';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asNumber, asString, toRecords } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn, type DataTableAction } from '../../shared/components/AdminDataTable.js';
import { AdminFilterBar, type FilterField } from '../../shared/components/AdminFilterBar.js';

function formatINR(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export default function FeeSummaryPage({ api, session, onNavigate }: AdminPageProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, loading, error } = useAdminPageData(
    () => api.listFeeSummary(session.token),
    [],
  );

  const allRows = useMemo(() => toRecords(data), [data]);

  const filtered = useMemo(() => {
    return allRows.filter((r) => {
      if (search) {
        const s = search.toLowerCase();
        const matches =
          asString(r.student_name).toLowerCase().includes(s) ||
          asString(r.student_id).toLowerCase().includes(s) ||
          asString(r.email).toLowerCase().includes(s) ||
          asString(r.phone).toLowerCase().includes(s);
        if (!matches) return false;
      }
      if (statusFilter === 'pending' && asNumber(r.pending_amount) === 0) return false;
      if (statusFilter === 'overdue' && asNumber(r.overdue_amount) === 0) return false;
      if (statusFilter === 'cleared' && asNumber(r.pending_amount) > 0) return false;
      return true;
    });
  }, [allRows, search, statusFilter]);

  const totals = useMemo(() => {
    let total = 0;
    let paid = 0;
    let pending = 0;
    let overdue = 0;
    for (const r of allRows) {
      total += asNumber(r.total_fee);
      paid += asNumber(r.paid_amount);
      pending += asNumber(r.pending_amount);
      overdue += asNumber(r.overdue_amount);
    }
    return { total, paid, pending, overdue };
  }, [allRows]);

  const columns: DataTableColumn[] = [
    { key: 'student_id', label: 'Student ID', render: (v) => asString(v) || '—' },
    { key: 'student_name', label: 'Student Name', sortable: true },
    { key: 'email', label: 'Email', render: (v) => asString(v) || '—' },
    { key: 'total_fee', label: 'Total Fee', render: formatINR, sortable: true },
    { key: 'paid_amount', label: 'Paid', render: formatINR, sortable: true },
    {
      key: 'pending_amount',
      label: 'Pending',
      sortable: true,
      render: (v) => {
        const n = asNumber(v);
        return <span className={n > 0 ? 'font-medium text-amber-700' : 'text-slate-500'}>{formatINR(v)}</span>;
      },
    },
    {
      key: 'overdue_amount',
      label: 'Overdue',
      sortable: true,
      render: (v) => {
        const n = asNumber(v);
        return <span className={n > 0 ? 'font-medium text-red-600' : 'text-slate-500'}>{formatINR(v)}</span>;
      },
    },
  ];

  const actions: DataTableAction[] = [
    {
      label: 'View Student',
      onClick: (row) => {
        const userId = asString(row.user_id);
        if (userId) onNavigate(`/admin/students/view/${userId}`);
      },
    },
  ];

  const filters: FilterField[] = useMemo(
    () => [
      { key: 'search', label: 'Search', type: 'text' as const, value: search, placeholder: 'Name, student ID, email...', onChange: setSearch },
      {
        key: 'status',
        label: 'Status',
        type: 'select' as const,
        value: statusFilter,
        placeholder: 'All',
        options: [
          { label: 'Has Pending', value: 'pending' },
          { label: 'Has Overdue', value: 'overdue' },
          { label: 'Fully Cleared', value: 'cleared' },
        ],
        onChange: setStatusFilter,
      },
    ],
    [search, statusFilter],
  );

  if (loading) return <PageLoader label="Loading fee summary..." />;
  if (error)
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-red-600">
          {error}
        </CardContent>
      </Card>
    );

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Fee Summary" />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard label="Total Fees" value={formatINR(totals.total)} detail={`${allRows.length} students`} tone="info" />
        <MetricCard label="Paid" value={formatINR(totals.paid)} detail="Across all enrolments" tone="success" />
        <MetricCard label="Pending" value={formatINR(totals.pending)} detail="Total − Paid" tone="warning" />
        <MetricCard label="Overdue" value={formatINR(totals.overdue)} detail="Past due unpaid installments" tone={totals.overdue > 0 ? 'warning' : 'neutral'} />
      </div>

      <AdminFilterBar
        filters={filters}
        onApply={() => {}}
        onClear={() => {
          setSearch('');
          setStatusFilter('');
        }}
      />

      <AdminDataTable columns={columns} rows={filtered} actions={actions} />
    </div>
  );
}
