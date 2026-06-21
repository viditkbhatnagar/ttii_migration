import { useMemo } from 'react';
import { BadgeIndianRupee, CheckCircle2, Clock, Wallet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { DashboardLoader } from '@/components/ui/dashboard-loader';
import { AdminPageHeader } from '../../../admin/shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../../admin/shared/components/AdminDataTable.js';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asNumber, asString, toRecords, formatDate } from '../../../admin/shared/utils/admin-data-utils.js';
import type { CounsellorPageProps } from '../../routing/counsellor-routes.js';
import { asRecord, KpiCard, type KpiCardProps } from '../../components/CounsellorWidgets.js';

const STATE_STYLES: Record<string, { label: string; cls: string }> = {
  paid: { label: 'Paid', cls: 'bg-emerald-50 text-emerald-700' },
  pending: { label: 'Pending', cls: 'bg-amber-50 text-amber-700' },
  no_link: { label: 'No link', cls: 'bg-slate-100 text-slate-500' },
};

function rupees(n: number): string {
  return `₹${n.toLocaleString('en-IN')}`;
}

const COLUMNS: DataTableColumn[] = [
  { key: 'applicationId', label: 'Application ID', sortable: true, render: (v: unknown) => <span className="font-mono text-xs text-slate-500">{asString(v)}</span> },
  { key: 'name', label: 'Applicant', sortable: true },
  { key: 'course', label: 'Course', sortable: true },
  { key: 'fee', label: 'Fee', sortable: true, render: (v: unknown) => rupees(asNumber(v)) },
  {
    key: 'state',
    label: 'Status',
    sortable: true,
    render: (v: unknown) => {
      const s = STATE_STYLES[asString(v)] ?? STATE_STYLES.no_link!;
      return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${s.cls}`}>{s.label}</span>;
    },
  },
  { key: 'createdAt', label: 'Date', sortable: true, render: (v: unknown) => formatDate(v) },
];

export default function CounsellorPaymentsPage({ api, session }: CounsellorPageProps) {
  const { data, loading, error } = useAdminPageData(
    () => api.loadCounsellorPayments(session.token),
    [api, session.token],
  );

  const summary = useMemo(() => asRecord(asRecord(data).summary), [data]);
  const rows = useMemo(() => toRecords(asRecord(data).rows), [data]);

  if (loading) {
    return <DashboardLoader label="payments" />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="Payments" />
        <Card className="bg-white">
          <CardContent className="py-12 text-center">
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const cards: KpiCardProps[] = [
    { label: 'Collected', value: rupees(asNumber(summary.collectedAmount)), icon: BadgeIndianRupee, tone: 'success', sub: `${asNumber(summary.paidCount)} paid` },
    { label: 'Pending', value: rupees(asNumber(summary.pendingAmount)), icon: Clock, tone: 'warning', sub: `${asNumber(summary.pendingCount)} awaiting` },
    { label: 'Paid Applications', value: asNumber(summary.paidCount).toLocaleString('en-IN'), icon: CheckCircle2, tone: 'primary', sub: 'Fees received' },
    { label: 'Total Applications', value: asNumber(summary.total).toLocaleString('en-IN'), icon: Wallet, tone: 'info', sub: 'In your pipeline' },
  ];

  const actions = [
    {
      label: (row: Record<string, unknown>) => (asString(row.paymentLink) ? 'Open link' : 'No link'),
      onClick: (row: Record<string, unknown>) => {
        const link = asString(row.paymentLink);
        if (link) window.open(link, '_blank', 'noopener,noreferrer');
      },
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Payments" />
      <p className="-mt-4 text-sm text-gray-500">Fee collection across your applications</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <KpiCard key={c.label} {...c} />
        ))}
      </div>

      <AdminDataTable columns={COLUMNS} rows={rows} actions={actions} searchable exportable />
    </div>
  );
}
