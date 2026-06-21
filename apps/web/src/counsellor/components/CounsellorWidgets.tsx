import { useMemo } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { EChartsOption } from 'echarts';
import { Card, CardContent } from '@/components/ui/card';
import { EChart } from '@/components/EChart';

// TTII brand palette — match the admin dashboard exactly. Shared across all
// counsellor analytics surfaces (Dashboard, Performance, Courses).
export const BRAND_PRIMARY = '#8F2774';
export const BRAND_ACCENT = '#F06543';

export function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

/* ─── Section title (matches admin) ─────────────────────────── */

export function SectionTitle({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden="true" className="block h-5 w-1 rounded-full bg-gradient-to-b from-[#8F2774] to-[#F06543]" />
      <h2 className="text-base font-semibold text-[#8F2774]">{title}</h2>
    </div>
  );
}

/* ─── KPI card ──────────────────────────────────────────────── */

export type KpiTone = 'primary' | 'accent' | 'success' | 'info' | 'warning';

export interface KpiCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: KpiTone;
  sub: string;
  progress?: number;
}

const TONE_MAP: Record<KpiTone, { chip: string; bar: string }> = {
  primary: { chip: 'bg-ttii-primary/10 text-ttii-primary', bar: 'bg-ttii-primary' },
  accent: { chip: 'bg-[#F06543]/10 text-[#F06543]', bar: 'bg-[#F06543]' },
  success: { chip: 'bg-emerald-50 text-emerald-600', bar: 'bg-emerald-500' },
  info: { chip: 'bg-blue-50 text-[rgb(27,97,197)]', bar: 'bg-[rgb(27,97,197)]' },
  warning: { chip: 'bg-amber-50 text-amber-600', bar: 'bg-amber-500' },
};

export function KpiCard({ label, value, icon: Icon, tone, sub, progress }: KpiCardProps) {
  const t = TONE_MAP[tone];
  return (
    <Card className="border-slate-200 bg-white transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div aria-hidden="true" className={`flex size-10 items-center justify-center rounded-xl ${t.chip}`}>
          <Icon className="size-5" />
        </div>
        <p className="mt-4 text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
        <p className="mt-0.5 text-xs text-slate-400">{sub}</p>
        {progress !== undefined ? (
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${t.bar}`} style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

/* ─── Stage badge ───────────────────────────────────────────── */

const STAGE_STYLES: Record<string, { label: string; cls: string }> = {
  lead: { label: 'Lead', cls: 'bg-slate-100 text-slate-600' },
  payment_pending: { label: 'Payment Pending', cls: 'bg-amber-50 text-amber-700' },
  paid: { label: 'Paid', cls: 'bg-emerald-50 text-emerald-700' },
  form_pending: { label: 'Form Pending', cls: 'bg-blue-50 text-blue-700' },
  form_submitted: { label: 'Form Submitted', cls: 'bg-indigo-50 text-indigo-700' },
  approval_waiting: { label: 'Approval Waiting', cls: 'bg-purple-50 text-purple-700' },
  enrolled: { label: 'Enrolled', cls: 'bg-emerald-50 text-emerald-700' },
  rejected: { label: 'Rejected', cls: 'bg-red-50 text-red-700' },
};

export function StageBadge({ stage }: { stage: string }) {
  const s = STAGE_STYLES[stage] ?? { label: stage || '—', cls: 'bg-slate-100 text-slate-600' };
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${s.cls}`}>{s.label}</span>;
}

/* ─── Admissions / two-series trend chart ───────────────────── */

export interface TrendData {
  labels: string[];
  applications: number[];
  enrollments: number[];
}

export function AdmissionsChart({
  trend,
  hasData,
  seriesNames = ['Applications', 'Enrollments'],
}: {
  trend: TrendData;
  hasData: boolean;
  seriesNames?: [string, string];
}) {
  const option = useMemo<EChartsOption>(
    () => ({
      grid: { left: 40, right: 16, top: 24, bottom: 28, containLabel: false },
      legend: {
        data: seriesNames,
        top: 0,
        right: 0,
        icon: 'roundRect',
        itemWidth: 10,
        itemHeight: 10,
        textStyle: { color: '#64748b', fontSize: 11 },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15,23,42,0.92)',
        borderWidth: 0,
        textStyle: { color: '#f8fafc', fontSize: 12 },
        axisPointer: { lineStyle: { color: '#cbd5e1' } },
        valueFormatter: (v) => String(v ?? 0),
      },
      xAxis: {
        type: 'category',
        data: trend.labels,
        boundaryGap: false,
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
        axisLabel: { color: '#64748b', fontSize: 10 },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        splitLine: { lineStyle: { color: '#e2e8f0', type: 'dashed' } },
        axisLabel: { color: '#94a3b8', fontSize: 10 },
      },
      series: [
        {
          name: seriesNames[0],
          type: 'line',
          data: trend.applications,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          itemStyle: { color: BRAND_PRIMARY, borderColor: '#ffffff', borderWidth: 2 },
          lineStyle: { color: BRAND_PRIMARY, width: 2.4 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(143,39,116,0.30)' },
                { offset: 1, color: 'rgba(143,39,116,0.02)' },
              ],
            },
          },
        },
        {
          name: seriesNames[1],
          type: 'line',
          data: trend.enrollments,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          itemStyle: { color: BRAND_ACCENT, borderColor: '#ffffff', borderWidth: 2 },
          lineStyle: { color: BRAND_ACCENT, width: 2.4 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(240,101,67,0.28)' },
                { offset: 1, color: 'rgba(240,101,67,0.02)' },
              ],
            },
          },
        },
      ],
    }),
    [trend, seriesNames],
  );

  if (!hasData) {
    return <p className="py-12 text-center text-xs text-slate-400">No data yet.</p>;
  }
  return <EChart option={option} className="h-64 w-full" ariaLabel="Trend over the last 6 months" />;
}

/* ─── Achievement gauge ─────────────────────────────────────── */

export function AchievementGauge({ pct }: { pct: number }) {
  const option = useMemo<EChartsOption>(
    () => ({
      series: [
        {
          type: 'gauge',
          startAngle: 90,
          endAngle: -270,
          radius: '92%',
          center: ['50%', '50%'],
          min: 0,
          max: 100,
          progress: { show: true, width: 12, roundCap: true, itemStyle: { color: BRAND_PRIMARY } },
          axisLine: { lineStyle: { width: 12, color: [[1, '#f1f5f9']] } },
          pointer: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          anchor: { show: false },
          detail: {
            valueAnimation: true,
            offsetCenter: [0, 0],
            formatter: (v) => `${Math.round(Number(v))}%`,
            color: BRAND_PRIMARY,
            fontSize: 24,
            fontWeight: 700,
          },
          data: [{ value: pct }],
        },
      ],
      animationDuration: 800,
    }),
    [pct],
  );
  return <EChart option={option} className="size-40" ariaLabel={`Achievement ${pct}%`} />;
}
