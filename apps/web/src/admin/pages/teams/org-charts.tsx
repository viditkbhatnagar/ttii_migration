import { useMemo } from 'react';
import { TrendingUp, type LucideIcon } from 'lucide-react';
import type { EChartsOption } from 'echarts';
import { EChart } from '@/components/EChart';
import { SectionCard } from '../counsellor/staff-profile-tabs.js';
import { chartLabel, type OrgKpis, type TrendPoint } from './org-model.js';

// Charts of the Team / Group profiles on the shared ECharts wrapper. Colours
// come from the admin theme tokens (--primary, --color-success, ...), resolved
// to rgb once per mount, so a theme recolour reaches the charts too.

interface ChartColors { primary: string; success: string; muted: string; border: string; card: string; foreground: string }

/** Neutral fallbacks for when the tokens cannot be read (no DOM / no canvas). */
const FALLBACK: ChartColors = {
  primary: 'rgb(71, 85, 105)', success: 'rgb(16, 185, 129)', muted: 'rgb(100, 116, 139)',
  border: 'rgb(226, 232, 240)', card: 'rgb(255, 255, 255)', foreground: 'rgb(15, 23, 42)',
};

/**
 * Reads a CSS custom property from the admin theme and converts it to rgb()
 * through a 1px canvas: the tokens are oklch(), which ECharts cannot parse.
 */
function resolveToken(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const host = document.querySelector('.admin-theme') ?? document.documentElement;
  const raw = getComputedStyle(host).getPropertyValue(name).trim();
  if (!raw) return fallback;
  try {
    const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    if (!ctx) return fallback;
    ctx.fillStyle = fallback;
    ctx.fillStyle = raw;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return `rgb(${r ?? 0}, ${g ?? 0}, ${b ?? 0})`;
  } catch {
    return fallback;
  }
}

function useChartColors(): ChartColors {
  return useMemo(() => ({
    primary: resolveToken('--primary', FALLBACK.primary),
    success: resolveToken('--color-success', FALLBACK.success),
    muted: resolveToken('--muted-foreground', FALLBACK.muted),
    border: resolveToken('--border', FALLBACK.border),
    card: resolveToken('--card', FALLBACK.card),
    foreground: resolveToken('--foreground', FALLBACK.foreground),
  }), []);
}

function barOption(c: ChartColors, labels: string[], series: Array<{ name: string; data: number[]; color: string }>): EChartsOption {
  return {
    grid: { left: 8, right: 8, top: 36, bottom: 8, containLabel: true },
    legend: { top: 0, textStyle: { color: c.muted, fontSize: 12 } },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: c.card,
      borderColor: c.border,
      textStyle: { color: c.foreground, fontSize: 12 },
    },
    xAxis: {
      type: 'category',
      data: labels,
      axisLabel: { color: c.muted, fontSize: 11 },
      axisLine: { lineStyle: { color: c.border } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { color: c.muted, fontSize: 11 },
      splitLine: { lineStyle: { color: c.border, type: 'dashed' } },
    },
    series: series.map((s) => ({
      name: s.name, type: 'bar' as const, data: s.data, barMaxWidth: 28,
      itemStyle: { color: s.color, borderRadius: [4, 4, 0, 0] },
    })),
  };
}

export function TrendCard({ trend }: { trend: TrendPoint[] }) {
  const colors = useChartColors();
  const hasData = trend.some((t) => t.applications > 0 || t.enrollments > 0);
  const option = useMemo(() => barOption(colors, trend.map((t) => t.label), [
    { name: 'Applications', data: trend.map((t) => t.applications), color: colors.primary },
    { name: 'Enrolments', data: trend.map((t) => t.enrollments), color: colors.success },
  ]), [colors, trend]);
  return (
    <SectionCard title="Monthly Applications & Enrolments" icon={TrendingUp}>
      {hasData ? (
        <EChart option={option} className="h-64 w-full" ariaLabel="Monthly applications and enrolments, last 12 months" />
      ) : (
        <p className="py-10 text-center text-sm text-muted-foreground">No applications in the last 12 months.</p>
      )}
    </SectionCard>
  );
}

export function ComparisonCard({ title, icon, rows, firstWord = false }: {
  title: string; icon: LucideIcon; rows: Array<{ name: string; kpis: OrgKpis }>; /** People: label bars by first name. */ firstWord?: boolean;
}) {
  const colors = useChartColors();
  const option = useMemo(() => barOption(colors, rows.map((r) => chartLabel(r.name, firstWord)), [
    { name: 'Applications', data: rows.map((r) => r.kpis.applications), color: colors.muted },
    { name: 'Enrolled', data: rows.map((r) => r.kpis.enrolled), color: colors.primary },
  ]), [colors, rows, firstWord]);
  return (
    <SectionCard title={title} icon={icon}>
      {rows.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">Nothing to compare yet.</p> : (
        <EChart option={option} className="h-72 w-full" ariaLabel={`${title}: applications and enrolled`} />
      )}
    </SectionCard>
  );
}
