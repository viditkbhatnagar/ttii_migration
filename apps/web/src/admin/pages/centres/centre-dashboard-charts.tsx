import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import { EChart } from '@/components/EChart';
import { useChartColors, type ChartColors } from '../../shared/hooks/useChartColors.js';
import { enrollmentBars, inr, inrThousands, type CentreDashboardData, type DashboardRow } from './centre-dashboard-model.js';
import { DashCard, DashTitle } from './centre-dashboard-ui.js';

// The two Centre Dashboard charts on the shared ECharts wrapper (the admin
// dashboards moved off recharts). Colours follow the admin theme tokens.

function tooltip(c: ChartColors) {
  return { backgroundColor: c.card, borderColor: c.border, textStyle: { color: c.foreground, fontSize: 12 } };
}

function trendOption(c: ChartColors, trend: CentreDashboardData['trend']): EChartsOption {
  return {
    grid: { left: 8, right: 16, top: 36, bottom: 8, containLabel: true },
    legend: { top: 0, textStyle: { color: c.muted, fontSize: 12 } },
    tooltip: { trigger: 'axis', valueFormatter: (v) => inr(Number(v) || 0), ...tooltip(c) },
    xAxis: {
      type: 'category', data: trend.map((t) => t.label), boundaryGap: false,
      axisLabel: { color: c.muted, fontSize: 12 }, axisLine: { lineStyle: { color: c.border } }, axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: c.muted, fontSize: 12, formatter: (v: number) => inrThousands(v) },
      splitLine: { lineStyle: { color: c.border, type: 'dashed' } },
    },
    series: [
      { name: 'Wallet top-ups', type: 'line', smooth: true, symbolSize: 6, data: trend.map((t) => t.topUps), itemStyle: { color: c.primary }, lineStyle: { width: 2 } },
      { name: 'Affiliation fees', type: 'line', smooth: true, symbolSize: 6, data: trend.map((t) => t.affiliation), itemStyle: { color: c.success }, lineStyle: { width: 2 } },
    ],
  };
}

export function RevenueTrendCard({ trend }: { trend: CentreDashboardData['trend'] }) {
  const colors = useChartColors();
  const option = useMemo(() => trendOption(colors, trend), [colors, trend]);
  const any = trend.some((t) => t.topUps > 0 || t.affiliation > 0);
  return (
    <DashCard>
      <DashTitle>Payments received from centres (₹)</DashTitle>
      {any ? (
        <EChart option={option} className="h-64 w-full" ariaLabel="Wallet top-ups and affiliation fees received per month, last 6 months" />
      ) : (
        <p role="status" className="flex h-64 items-center justify-center text-center text-sm text-muted-foreground">
          No wallet top-ups or affiliation fees received in the last six months.
        </p>
      )}
      <p className="sr-only">
        {trend.map((t) => `${t.label}: ${inr(t.topUps)} wallet top-ups, ${inr(t.affiliation)} affiliation fees.`).join(' ')}
      </p>
    </DashCard>
  );
}

function enrolOption(c: ChartColors, bars: Array<{ name: string; enrollments: number }>): EChartsOption {
  const ordered = [...bars].reverse(); // ECharts draws the first category at the bottom
  return {
    grid: { left: 8, right: 24, top: 8, bottom: 8, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, ...tooltip(c) },
    xAxis: { type: 'value', minInterval: 1, axisLabel: { color: c.muted, fontSize: 12 }, splitLine: { lineStyle: { color: c.border, type: 'dashed' } } },
    yAxis: {
      type: 'category', data: ordered.map((b) => b.name),
      axisLabel: { color: c.muted, fontSize: 11, width: 130, overflow: 'truncate' }, axisLine: { lineStyle: { color: c.border } }, axisTick: { show: false },
    },
    series: [{
      name: 'Enrollments', type: 'bar', barMaxWidth: 22, data: ordered.map((b) => b.enrollments),
      itemStyle: { color: c.primary, borderRadius: [0, 6, 6, 0] },
    }],
  };
}

export function EnrollmentsCard({ rows }: { rows: DashboardRow[] }) {
  const colors = useChartColors();
  const bars = useMemo(() => enrollmentBars(rows), [rows]);
  const option = useMemo(() => enrolOption(colors, bars), [colors, bars]);
  return (
    <DashCard>
      <DashTitle>Enrollments by centre</DashTitle>
      {bars.length === 0 ? (
        <p role="status" className="flex h-64 items-center justify-center text-sm text-muted-foreground">No centres yet.</p>
      ) : (
        <EChart option={option} className="h-64 w-full" ariaLabel="Enrolled students per centre, top 7" />
      )}
      <p className="sr-only">{bars.map((b) => `${b.name}: ${b.enrollments}`).join(', ')}</p>
    </DashCard>
  );
}
