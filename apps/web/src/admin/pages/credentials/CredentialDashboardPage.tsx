import { useMemo, useState } from 'react';
import type { EChartsOption } from 'echarts';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, CheckCircle2, ClipboardList, FileCheck2, Truck } from 'lucide-react';
import { EChart } from '@/components/EChart';
import { cn } from '@/lib/utils';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { PageTitle } from '../../shared/components/ui-kit.js';
import { useChartColors } from '../../shared/hooks/useChartColors.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { CredDialog } from './CredDialogShell.js';
import { CredTable, type CredColumn } from './CredTable.js';
import { CredentialGate } from './credential-gate.js';
import { ALERT_TYPE_LABEL, dmyAny, monthName, trendText, type DashboardKpi } from './credential-delivery-model.js';

// Credential Dashboard (spec §1.1): five KPI tiles with a month-on-month trend,
// the 12-month issuance line, issuance by course, the delivery donut, and the
// Needs attention / Recent activity / Overdue parcels / Open scan alerts panels.
// Real data only; "Ready" figures need the eligibility module and say so until
// it is connected.

const KPI_ICON = { ready: ClipboardList, issued: FileCheck2, awaiting: Truck, dispatched: Truck, alerts: AlertTriangle } as const;
const DONUT_COLORS = ['#64748b', '#f59e0b', '#0ea5e9', '#10b981', '#e11d48'];

function Card({ title, subtitle, children, className }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-2xl border border-border bg-card p-4 shadow-sm', className)}>
      <h2 className="text-sm font-semibold">{title}</h2>
      {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Tile({ kpi, overdueNote, onClick }: { kpi: DashboardKpi; overdueNote: string; onClick: () => void }) {
  const Icon = KPI_ICON[kpi.key];
  const Arrow = kpi.trendPct < 0 ? ArrowDownRight : ArrowUpRight;
  return (
    <button type="button" onClick={onClick}
      className={cn('flex min-w-[11.5rem] flex-1 flex-col gap-2 rounded-2xl border bg-card p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40', kpi.tone === 'danger' ? 'border-rose-200' : 'border-border')}>
      <span className="flex items-center justify-between">
        <span className={cn('flex size-9 items-center justify-center rounded-xl', kpi.tone === 'danger' ? 'bg-rose-50 text-rose-600' : 'bg-primary/10 text-primary')}><Icon aria-hidden="true" className="size-5" /></span>
        <span className={cn('inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold', kpi.trendGood ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')}>
          <Arrow aria-hidden="true" className="size-3" />{trendText(kpi.trendPct)}
        </span>
      </span>
      <span className={cn('text-3xl font-bold tabular-nums', kpi.tone === 'danger' ? 'text-rose-700' : 'text-foreground')}>{kpi.value ?? '-'}</span>
      <span className="text-sm font-medium">{kpi.title}</span>
      <span className="text-[11px] text-muted-foreground">{overdueNote}vs last month</span>
    </button>
  );
}

type Row = Record<string, string | number>;

function DashboardContent({ api, session, onNavigate }: AdminPageProps) {
  const { data, loading, error } = useAdminPageData(() => api.credDashboard(session.token), [api, session.token]);
  const colors = useChartColors();
  const [openKpi, setOpenKpi] = useState<DashboardKpi | null>(null);

  const lineOption = useMemo<EChartsOption>(() => ({
    grid: { left: 36, right: 16, top: 16, bottom: 28 },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: (data?.issuedByMonth ?? []).map((m) => monthName(m.month)), axisLabel: { color: colors.muted, fontSize: 11 } },
    yAxis: { type: 'value', minInterval: 1, axisLabel: { color: colors.muted }, splitLine: { lineStyle: { color: colors.border } } },
    series: [{ type: 'line', smooth: true, symbolSize: 6, data: (data?.issuedByMonth ?? []).map((m) => m.count), lineStyle: { color: colors.primary, width: 3 }, itemStyle: { color: colors.primary }, areaStyle: { color: colors.primary, opacity: 0.08 } }],
  }), [data, colors]);
  const barOption = useMemo<EChartsOption>(() => {
    const rows = [...(data?.issuanceByCourse ?? [])].reverse();
    return {
      grid: { left: 8, right: 24, top: 8, bottom: 8, containLabel: true }, tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: { type: 'value', minInterval: 1, axisLabel: { color: colors.muted }, splitLine: { lineStyle: { color: colors.border } } },
      yAxis: { type: 'category', data: rows.map((r) => r.course), axisLabel: { color: colors.foreground, width: 120, overflow: 'truncate' } },
      series: [{ type: 'bar', data: rows.map((r) => r.count), itemStyle: { color: colors.primary, borderRadius: [0, 6, 6, 0] }, barMaxWidth: 22 }],
    };
  }, [data, colors]);
  const donutOption = useMemo<EChartsOption>(() => ({
    tooltip: { trigger: 'item' }, legend: { bottom: 0, textStyle: { color: colors.muted, fontSize: 11 } },
    series: [{ type: 'pie', radius: ['52%', '74%'], center: ['50%', '44%'], label: { show: false }, color: DONUT_COLORS, data: (data?.deliveryStatus ?? []).map((d) => ({ name: d.label, value: d.count })) }],
  }), [data, colors]);

  if (loading && !data) return <p className="p-12 text-center text-sm text-muted-foreground">Loading...</p>;
  if (!data) return <p role="alert" className="m-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error ?? 'The dashboard could not be loaded.'}</p>;

  const issuedTotal = data.issuedByMonth.reduce((a, m) => a + m.count, 0);
  const tableColumns = (kpi: DashboardKpi): Array<CredColumn<Row>> => kpi.table.columns.map((c) => ({
    key: c.key, label: c.label, value: (r) => r[c.key] ?? '', text: (r) => (c.key === 'date' ? dmyAny(String(r[c.key] ?? '')) : String(r[c.key] ?? '')),
  }));
  const attentionColumns: Array<CredColumn<DashboardNeeds>> = [
    { key: 'enrolmentNo', label: 'Learner ID', value: (r) => r.enrolmentNo },
    { key: 'learner', label: 'Learner', value: (r) => r.learner },
    { key: 'course', label: 'Course', value: (r) => r.course },
    { key: 'centre', label: 'Centre', value: (r) => r.centre || '-' },
    { key: 'days', label: 'Days waiting', value: (r) => r.daysWaiting, render: (r) => <span className={cn('font-semibold tabular-nums', r.late ? 'text-rose-600' : '')}>{r.daysWaiting}</span> },
  ];

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      <PageTitle title="Credential Manager" subtitle="TTII certificates, marksheets and academic records" />
      {data.message ? <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{data.message}</p> : null}
      {!data.readyConnected && data.ready ? <p className="text-xs text-muted-foreground">&quot;Ready to issue&quot; and &quot;Needs attention&quot; appear once the eligibility module is connected.</p> : null}
      <div className="flex gap-3 overflow-x-auto pb-1">
        {data.kpis.map((k) => <Tile key={k.key} kpi={k} overdueNote={k.key === 'dispatched' && (k.overdue ?? 0) > 0 ? `${k.overdue} overdue · ` : ''} onClick={() => setOpenKpi(k)} />)}
      </div>
      <Card title="Documents issued" subtitle="Last 12 months"><EChart option={lineOption} className="h-60 w-full" ariaLabel={`Documents issued per month, ${issuedTotal} in total`} /></Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Issuance by course" subtitle="Top 6 courses, last 12 months">
          {data.issuanceByCourse.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">Nothing issued yet.</p> : <EChart option={barOption} className="h-64 w-full" ariaLabel="Issuance by course" />}
        </Card>
        <Card title="Delivery status" subtitle="Where issued documents are now"><EChart option={donutOption} className="h-64 w-full" ariaLabel="Delivery status of issued documents" /></Card>
      </div>
      <Card title="Needs attention" subtitle="Ready learners waiting longest">
        <CredTable columns={attentionColumns} rows={data.needsAttention} rowKey={(r) => r.enrolmentNo + r.learner} empty="Nothing waiting to issue." pageSize={5} noun="learners" />
      </Card>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Recent activity">
          {data.recentActivity.length === 0 ? <p className="text-sm text-muted-foreground">No recent actions.</p> : (
            <ul className="flex flex-col gap-2 text-sm">{data.recentActivity.map((a, i) => <li key={`${a.at}-${i}`}><span className="font-medium">{a.learner}</span> · {a.action}<br /><span className="text-xs text-muted-foreground">{a.user} · {dmyAny(a.at)}</span></li>)}</ul>
          )}
        </Card>
        <Card title="Overdue parcels">
          {data.overdueParcels.length === 0 ? <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><CheckCircle2 aria-hidden="true" className="size-4 text-emerald-600" /> No overdue parcels.</p> : (
            <ul className="flex flex-col gap-2 text-sm">{data.overdueParcels.map((p, i) => <li key={`${p.batchNo}-${i}`}><span className="font-medium">{p.batchNo}</span> · <span className="text-rose-600">{p.daysLate} days late</span><br /><span className="text-xs text-muted-foreground">{p.learner}{p.courier ? ` · ${p.courier}` : ''}</span></li>)}</ul>
          )}
        </Card>
        <Card title="Open scan alerts">
          {data.openAlerts.length === 0 ? <p className="text-sm text-muted-foreground">No open alerts.</p> : (
            <ul className="flex flex-col gap-2 text-sm">{data.openAlerts.map((a) => <li key={a.id}><span className="font-medium">{ALERT_TYPE_LABEL[a.type] ?? a.type}</span><br /><span className="text-xs text-muted-foreground">{a.details}</span></li>)}</ul>
          )}
          <button type="button" className="mt-3 text-xs font-medium text-primary hover:underline" onClick={() => onNavigate('/admin/credentials/scans')}>Review in Scan History</button>
        </Card>
      </div>
      {openKpi ? (
        <CredDialog open onOpenChange={(o) => { if (!o) setOpenKpi(null); }} title={openKpi.title} width={980}>
          <CredTable columns={tableColumns(openKpi)} rows={openKpi.table.rows} rowKey={(r) => JSON.stringify(r)} empty="Nothing to show." exportName={`ttii-${openKpi.key}`} noun="rows" />
        </CredDialog>
      ) : null}
    </div>
  );
}

type DashboardNeeds = { enrolmentNo: string; learner: string; course: string; centre: string; daysWaiting: number; late: boolean };

export default function CredentialDashboardPage(props: AdminPageProps) {
  return <CredentialGate api={props.api} token={props.session.token} need="access"><DashboardContent {...props} /></CredentialGate>;
}
