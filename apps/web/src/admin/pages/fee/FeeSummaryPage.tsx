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
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';

function formatINR(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

// Naji 2026-05-09 — Fee Summary lists every active enrolment with its
// course / offering / combination + fee breakdown:
//   Enrollment ID · Student · Course · Offering · Combination ·
//   Course Fee (Inc GST) · Fee Paid · Balance Fee · Fee Due · Course Status
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
          asString(r.enrollment_id).toLowerCase().includes(s) ||
          asString(r.email).toLowerCase().includes(s) ||
          asString(r.course_title).toLowerCase().includes(s) ||
          asString(r.offering_title).toLowerCase().includes(s) ||
          asString(r.combination_title).toLowerCase().includes(s);
        if (!matches) return false;
      }
      if (statusFilter === 'has_balance' && asNumber(r.balance_fee) === 0) return false;
      if (statusFilter === 'has_due' && asNumber(r.fee_due) === 0) return false;
      if (statusFilter === 'cleared' && asNumber(r.balance_fee) > 0) return false;
      if (statusFilter === 'active' && asString(r.course_status).toLowerCase() !== 'active') return false;
      return true;
    });
  }, [allRows, search, statusFilter]);

  const totals = useMemo(() => {
    let fee = 0;
    let paid = 0;
    let balance = 0;
    let due = 0;
    for (const r of allRows) {
      fee += asNumber(r.course_fee_inc_gst);
      paid += asNumber(r.fee_paid);
      balance += asNumber(r.balance_fee);
      due += asNumber(r.fee_due);
    }
    return { fee, paid, balance, due };
  }, [allRows]);

  const columns: DataTableColumn[] = [
    {
      key: 'enrollment_id',
      label: 'Enrollment ID',
      sortable: true,
      render: (v) => <span className="font-mono text-xs text-slate-700">{asString(v) || '—'}</span>,
    },
    {
      key: 'student_name',
      label: 'Student',
      sortable: true,
      render: (_v, r) => (
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900">{asString(r.student_name) || '—'}</p>
          <p className="truncate text-xs text-gray-500">{asString(r.email)}</p>
        </div>
      ),
    },
    { key: 'course_title', label: 'Course', sortable: true, render: (v) => asString(v) || '—' },
    { key: 'offering_title', label: 'Offering', render: (v) => asString(v) || '—' },
    { key: 'combination_title', label: 'Combination', render: (v) => asString(v) || '—' },
    {
      key: 'course_fee_inc_gst',
      label: 'Course Fee (Inc GST)',
      sortable: true,
      render: (v) => <span className="font-medium text-gray-900">{formatINR(v)}</span>,
    },
    {
      key: 'fee_paid',
      label: 'Fee Paid',
      sortable: true,
      render: (v) => <span className="text-emerald-700">{formatINR(v)}</span>,
    },
    {
      key: 'balance_fee',
      label: 'Balance Fee',
      sortable: true,
      render: (v) => {
        const n = asNumber(v);
        return <span className={n > 0 ? 'font-medium text-amber-700' : 'text-slate-500'}>{formatINR(v)}</span>;
      },
    },
    {
      key: 'fee_due',
      label: 'Fee Due',
      sortable: true,
      render: (v) => {
        const n = asNumber(v);
        return <span className={n > 0 ? 'font-medium text-red-600' : 'text-slate-500'}>{formatINR(v)}</span>;
      },
    },
    {
      key: 'course_status',
      label: 'Course Status',
      render: (v) => {
        const s = asString(v) || 'Active';
        return <AdminStatusBadge status={s} />;
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
      { key: 'search', label: 'Search', type: 'text' as const, value: search, placeholder: 'Enrollment ID, name, course, combination…', onChange: setSearch },
      {
        key: 'status',
        label: 'Status',
        type: 'select' as const,
        value: statusFilter,
        placeholder: 'All',
        options: [
          { label: 'Active', value: 'active' },
          { label: 'Has Balance', value: 'has_balance' },
          { label: 'Has Due (Overdue)', value: 'has_due' },
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
        <CardContent role="alert" className="py-8 text-center text-sm text-red-600">{error}</CardContent>
      </Card>
    );

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Fee Summary" />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard label="Total Course Fees" value={formatINR(totals.fee)} detail={`${allRows.length} enrolments`} tone="info" />
        <MetricCard label="Fee Paid" value={formatINR(totals.paid)} detail="Across all enrolments" tone="success" />
        <MetricCard label="Balance Fee" value={formatINR(totals.balance)} detail="Total − Paid" tone="warning" />
        <MetricCard label="Fee Due (Overdue)" value={formatINR(totals.due)} detail="Past-due unpaid instalments" tone={totals.due > 0 ? 'warning' : 'neutral'} />
      </div>

      <AdminFilterBar
        filters={filters}
        onApply={() => {}}
        onClear={() => {
          setSearch('');
          setStatusFilter('');
        }}
      />

      <AdminDataTable columns={columns} rows={filtered} actions={actions} searchable={false} exportable />
    </div>
  );
}
