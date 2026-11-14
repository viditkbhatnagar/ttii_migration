import { useMemo, useState } from 'react';
import type { EChartsOption } from 'echarts';
import { EChart } from '@/components/EChart';
import { Button } from '@/components/ui/button';
import { DmyDateInput } from '@/components/ui/dmy-date-field';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { PageTitle } from '../../shared/components/ui-kit.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { useChartColors } from '../../shared/hooks/useChartColors.js';
import { PillTab } from '../students/list-chrome.js';
import { CredDialog, Field } from './CredDialogShell.js';
import { CredTable, type CredColumn } from './CredTable.js';
import { CredentialGate } from './credential-gate.js';
import { dmyAny } from './credential-delivery-model.js';

// Reports (spec §1.6): nine reports, each with search, per-column filters,
// sorting, an optional date range, CSV export and a bar chart (not the Audit
// Log). Needs credentials.reports. Export is CSV: the repo has no .xlsx library.

const REPORTS: Array<{ key: string; label: string }> = [
  { key: 'issuance', label: 'Issuance' }, { key: 'pending', label: 'Pending' }, { key: 'turnaround', label: 'Turnaround time' },
  { key: 'holds', label: 'Holds' }, { key: 'delivery', label: 'Delivery' }, { key: 'changes', label: 'Duplicates, corrections & revocations' },
  { key: 'verification', label: 'Verification' }, { key: 'centre', label: 'Centre-wise' }, { key: 'audit', label: 'Audit Log' },
];
const LOW_CARDINALITY = new Set(['course', 'batch', 'centre', 'documentType', 'issuedBy', 'status', 'reason', 'action', 'user', 'mode', 'courier', 'country', 'method', 'entity', 'month', 'documentType']);

type Row = Record<string, string | number>;

function JsonCell({ label, value }: { label: string; value: string }) {
  const [open, setOpen] = useState(false);
  if (!value) return <span className="text-muted-foreground">-</span>;
  let pretty = value;
  try { pretty = JSON.stringify(JSON.parse(value), null, 2); } catch { /* plain text */ }
  return (
    <>
      <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => setOpen(true)}>View</button>
      {open ? <CredDialog open onOpenChange={setOpen} title={label} width={560}><pre className="whitespace-pre-wrap break-words text-xs">{pretty}</pre></CredDialog> : null}
    </>
  );
}

function ReportsContent({ api, session }: AdminPageProps) {
  const [key, setKey] = useState('issuance');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const { data, loading, error } = useAdminPageData(() => api.credReport(session.token, key, { from, to }), [api, session.token, key, from, to]);
  const colors = useChartColors();

  const columns = useMemo<Array<CredColumn<Row>>>(() => (data?.columns ?? []).map((c) => ({
    key: c.key, label: c.label, value: (r: Row) => r[c.key] ?? '',
    ...(c.key === 'date' ? { text: (r: Row) => dmyAny(String(r.date ?? '')) } : {}),
    ...(c.key === 'before' || c.key === 'after' ? { render: (r: Row) => <JsonCell label={c.label} value={String(r[c.key] ?? '')} /> } : {}),
    ...(LOW_CARDINALITY.has(c.key) ? { filter: true } : {}),
  })), [data?.columns]);

  const chart = useMemo<EChartsOption | null>(() => {
    if (!data?.chart || data.chart.points.length === 0) return null;
    const points = data.chart.points.slice(0, 30);
    return {
      grid: { left: 8, right: 16, top: 12, bottom: 8, containLabel: true }, tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: { type: 'category', data: points.map((p) => p.label), axisLabel: { color: colors.muted, fontSize: 11, interval: 0, rotate: points.length > 6 ? 30 : 0 } },
      yAxis: { type: 'value', minInterval: 1, axisLabel: { color: colors.muted }, splitLine: { lineStyle: { color: colors.border } } },
      series: [{ type: 'bar', data: points.map((p) => p.value), itemStyle: { color: colors.primary, borderRadius: [6, 6, 0, 0] }, barMaxWidth: 36 }],
    };
  }, [data?.chart, colors]);

  const title = REPORTS.find((r) => r.key === key)?.label ?? '';
  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      <PageTitle title="Reports" subtitle="Credential reports and settings audit history" />
      <div className="flex flex-wrap gap-2">{REPORTS.map((r) => <PillTab key={r.key} active={key === r.key} label={r.label} count={key === r.key ? data?.rows.length ?? 0 : 0} onClick={() => setKey(r.key)} />)}</div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {data?.hasDate ? (
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-40"><Field label="From"><DmyDateInput value={from} onChange={setFrom} minYear={2024} maxYear={2100} /></Field></div>
            <div className="w-40"><Field label="To"><DmyDateInput value={to} onChange={setTo} minYear={2024} maxYear={2100} /></Field></div>
            {from || to ? <Button variant="ghost" size="sm" onClick={() => { setFrom(''); setTo(''); }}>Clear dates</Button> : null}
          </div>
        ) : null}
      </div>
      {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
      {data?.message ? <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{data.message}</p> : null}
      {data?.note ? <p role="status" className="text-xs text-muted-foreground">{data.note}</p> : null}
      {loading && !data ? <p className="py-12 text-center text-sm text-muted-foreground">Loading...</p> : data ? (
        <>
          <CredTable key={key} columns={columns} rows={data.rows} rowKey={(r) => JSON.stringify(r)} empty="No rows for this report." exportName={`ttii-${key}`} noun="rows" searchPlaceholder={`Search ${title.toLowerCase()}`} />
          {chart && data.chart ? (
            <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <h3 className="text-sm font-semibold">{title} by {data.chart.group}</h3>
              <EChart option={chart} className="mt-3 h-64 w-full" ariaLabel={`${title} by ${data.chart.group}`} />
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export default function CredentialReportsPage(props: AdminPageProps) {
  return <CredentialGate api={props.api} token={props.session.token} need="reports"><ReportsContent {...props} /></CredentialGate>;
}
