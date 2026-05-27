import { useMemo } from 'react';
import {
  Users, BookOpen, GraduationCap, Calendar, TrendingUp, TrendingDown,
  Sparkles, type LucideIcon,
} from 'lucide-react';
import type { EChartsOption } from 'echarts';
import { Card, CardContent } from '@/components/ui/card';
import { DashboardLoader } from '@/components/ui/dashboard-loader';
import { EChart } from '@/components/EChart';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asNumber, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import type { AdminPageProps } from '../../routing/admin-routes.js';

interface TrendData {
  sparkline: number[];
  trendPercent: number;
}

interface HeroStatDef {
  label: string;
  countKey: string;
  trendKey: string;
  icon: LucideIcon;
  iconBg: string;
  iconColour: string;
  sparkColour: string;
  sublabel: (data: Record<string, unknown>) => string;
  href: string;
}

// TTII brand palette: primary #8F2774 (purple), secondary #F06543 (orange).
// The four hero stats use brand-adjacent tints rather than primary's
// strong purple so the dashboard doesn't feel oppressive.
const HERO_STATS: HeroStatDef[] = [
  {
    label: 'Total Students',
    countKey: 'students_count',
    trendKey: 'students_trend',
    icon: Users,
    iconBg: 'bg-[#eef2ff]',
    iconColour: 'text-[#5a6cee]',
    sparkColour: '#5a6cee',
    sublabel: (d) => {
      const trend = d.students_trend as TrendData | undefined;
      const last = trend?.sparkline?.reduce((s, v) => s + v, 0) ?? 0;
      return `${last} new this month`;
    },
    href: '/admin/students/index',
  },
  {
    label: 'Total Courses',
    countKey: 'courses_count',
    trendKey: 'courses_trend',
    icon: BookOpen,
    iconBg: 'bg-[#ecfdf5]',
    iconColour: 'text-emerald-600',
    sparkColour: '#10b981',
    sublabel: (d) => `${asNumber(d.courses_count)} active`,
    href: '/admin/course/index',
  },
  {
    label: 'Active Enrollments',
    countKey: 'enrolments_count',
    trendKey: 'enrolments_trend',
    icon: GraduationCap,
    iconBg: 'bg-[#fff7ed]',
    iconColour: 'text-[#F06543]',
    sparkColour: '#F06543',
    sublabel: (d) => {
      const dist = d.progress_distribution as { high?: number; total?: number } | undefined;
      const high = dist?.high ?? 0;
      const total = dist?.total ?? 0;
      const pct = total > 0 ? Math.round((high / total) * 100) : 0;
      return `${pct}% high progress`;
    },
    href: '/admin/enrol/index',
  },
  {
    label: 'Upcoming Classes',
    countKey: 'upcoming_classes_count',
    trendKey: 'classes_trend',
    icon: Calendar,
    iconBg: 'bg-[#f5f3ff]',
    iconColour: 'text-[#8F2774]',
    sparkColour: '#8F2774',
    sublabel: (d) => {
      const c = asNumber(d.upcoming_classes_count);
      return c === 0 ? 'No upcoming' : `${c} scheduled`;
    },
    href: '/admin/calendar/index',
  },
];

const STUDENT_COLUMNS: DataTableColumn[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'student_id', label: 'Student ID', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'phone', label: 'Phone' },
  { key: 'course_title', label: 'Course', sortable: true, render: (v) => (typeof v === 'string' && v) || '-' },
  { key: 'created_at', label: 'Joined Date', sortable: true, render: (v) => formatDate(v) },
];

const EVENT_COLUMNS: DataTableColumn[] = [
  { key: 'title', label: 'Title', sortable: true },
  { key: 'event_date', label: 'Event Date', sortable: true, render: (v) => formatDate(v) },
  { key: 'from_time', label: 'From' },
  { key: 'to_time', label: 'To' },
];

export default function DashboardPage({ api, session, onNavigate }: AdminPageProps) {
  const { data, loading, error } = useAdminPageData(
    () => api.loadAdminDashboard(session.token),
    [api, session.token],
  );

  const recentStudents = useMemo(() => toRecords(data?.recent_students), [data]);
  const upcomingEvents = useMemo(() => toRecords(data?.upcoming_events), [data]);
  const monthlyTrend = useMemo(() => toRecords(data?.enrolment_monthly), [data]);
  const progressDist = useMemo(() => {
    const d = data?.progress_distribution as Record<string, unknown> | undefined;
    return {
      low: asNumber(d?.low),
      mid: asNumber(d?.mid),
      high: asNumber(d?.high),
      total: asNumber(d?.total),
    };
  }, [data]);

  if (loading) {
    return <DashboardLoader label="dashboard data" />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="bg-white">
          <CardContent className="py-12 text-center">
            <p role="alert" className="text-sm text-red-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header (Naji 2026-05-07 — sparkle icon + welcome subtitle) */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <Sparkles aria-hidden="true" className="size-6 text-[#8F2774]" />
          Admin Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-500">Overview and controls &middot; Welcome back!</p>
      </div>

      {/* Hero stat cards with sparkline + trend chip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {HERO_STATS.map((stat) => {
          const Icon = stat.icon;
          const value = String(asNumber(data?.[stat.countKey]) || 0);
          const trend = (data?.[stat.trendKey] as TrendData | undefined) ?? { sparkline: [], trendPercent: 0 };
          return (
            <button
              key={stat.label}
              type="button"
              onClick={() => onNavigate(stat.href)}
              aria-label={`${value} ${stat.label}`}
              className="group flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-left transition-all hover:-translate-y-0.5 hover:border-[#8F2774]/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8F2774] focus-visible:ring-offset-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className={`flex size-10 items-center justify-center rounded-xl ${stat.iconBg}`}>
                  <Icon aria-hidden="true" className={`size-5 ${stat.iconColour}`} />
                </div>
                <TrendChip percent={trend.trendPercent} />
              </div>
              <div>
                <p className="text-sm font-medium text-[#8F2774]">{stat.label}</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
                <p className="mt-1 text-xs text-slate-500">{stat.sublabel(data ?? {})}</p>
              </div>
              <div className="flex items-end justify-between gap-2">
                <Sparkline values={trend.sparkline} colour={stat.sparkColour} />
                <span className="text-[10px] uppercase tracking-wider text-slate-400">7d trend</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Charts row: Enrollment Trend + Student Progress Snapshot */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-slate-200 bg-white">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <SectionTitle accent="from-[#8F2774] to-[#F06543]" title="Enrollment Trend" />
              <span className="rounded-full bg-[#f5f3ff] px-3 py-1 text-xs font-medium text-[#8F2774]">
                Last 6 months
              </span>
            </div>
            <EnrollmentTrendChart data={monthlyTrend} />
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <SectionTitle accent="from-[#8F2774] to-[#F06543]" title="Student Progress Snapshot" />
            </div>
            <ProgressSnapshot dist={progressDist} />
            <p className="mt-4 border-t border-slate-100 pt-3 text-center text-xs text-slate-500">
              Based on {progressDist.total} total enrollment{progressDist.total === 1 ? '' : 's'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recently Joined Students */}
      <div className="space-y-2">
        <SectionTitle accent="from-[#8F2774] to-[#F06543]" title="Recently Joined Students" />
        <AdminDataTable columns={STUDENT_COLUMNS} rows={recentStudents} searchable exportable />
      </div>

      {/* Upcoming Activities */}
      <div className="space-y-2">
        <SectionTitle accent="from-[#8F2774] to-[#F06543]" title="Upcoming Activities" />
        <AdminDataTable columns={EVENT_COLUMNS} rows={upcomingEvents} searchable exportable />
      </div>
    </div>
  );
}

/* ─── Helper components ──────────────────────────────────────── */

// Brand-tinted section title with a vertical gradient accent bar on the left.
function SectionTitle({ accent, title }: { accent: string; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden="true" className={`block h-5 w-1 rounded-full bg-gradient-to-b ${accent}`} />
      <h2 className="text-base font-semibold text-[#8F2774]">{title}</h2>
    </div>
  );
}

// Trend chip showing % up/down with arrow + green/red colour.
function TrendChip({ percent }: { percent: number }) {
  if (!Number.isFinite(percent) || percent === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
        0%
      </span>
    );
  }
  const positive = percent > 0;
  const Arrow = positive ? TrendingUp : TrendingDown;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        positive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
      }`}
    >
      <Arrow aria-hidden="true" className="size-3" />
      {Math.abs(percent)}%
    </span>
  );
}

// 7-day mini sparkline (line + soft area fill). Apache ECharts.
function Sparkline({ values, colour }: { values: number[]; colour: string }) {
  const option = useMemo<EChartsOption>(() => {
    const lineSeries: NonNullable<EChartsOption['series']> = [
      {
        type: 'line',
        data: values,
        smooth: true,
        symbol: 'none',
        lineStyle: { color: colour, width: 1.5 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: `${colour}33` },
              { offset: 1, color: `${colour}00` },
            ],
          },
        },
        // Last-point highlight dot — only attach when we have data.
        ...(values.length > 0
          ? {
              markPoint: {
                symbol: 'circle',
                symbolSize: 4,
                itemStyle: { color: colour, borderColor: '#ffffff', borderWidth: 1 },
                data: [{ name: 'latest', coord: [values.length - 1, values[values.length - 1] ?? 0] }],
                animation: false,
              },
            }
          : {}),
      },
    ];
    return {
      grid: { left: 0, right: 0, top: 2, bottom: 2 },
      xAxis: { type: 'category', show: false, boundaryGap: false, data: values.map((_, i) => String(i)) },
      yAxis: { type: 'value', show: false, min: 0 },
      tooltip: { show: false },
      animationDuration: 600,
      series: lineSeries,
    };
  }, [values, colour]);

  if (!values || values.length === 0) {
    return <span className="block h-6 flex-1" />;
  }
  return <EChart option={option} className="h-6 flex-1" ariaLabel="7-day trend" />;
}

// 6-month enrolment trend — smoothed area chart with gridlines + tooltip.
function EnrollmentTrendChart({ data }: { data: Record<string, unknown>[] }) {
  const labels = useMemo(() => data.map((d) => (typeof d.label === 'string' ? d.label : '')), [data]);
  const counts = useMemo(() => data.map((d) => asNumber(d.count)), [data]);
  const option = useMemo<EChartsOption>(() => ({
    grid: { left: 40, right: 16, top: 16, bottom: 28, containLabel: false },
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
      data: labels,
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
        type: 'line',
        data: counts,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: { color: '#5a6cee', borderColor: '#ffffff', borderWidth: 2 },
        lineStyle: { color: '#5a6cee', width: 2.4 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(90,108,238,0.35)' },
              { offset: 1, color: 'rgba(90,108,238,0.02)' },
            ],
          },
        },
      },
    ],
  }), [labels, counts]);

  if (!data || data.length === 0) {
    return <p className="py-8 text-center text-xs text-slate-400">No enrolment data yet.</p>;
  }
  return <EChart option={option} className="h-56 w-full" ariaLabel="6-month enrolment trend" />;
}

// Three-ring progress distribution for the Student Progress Snapshot.
function ProgressSnapshot({ dist }: { dist: { low: number; mid: number; high: number; total: number } }) {
  const total = dist.total || 1;
  const rings = [
    { label: '0-25% Done', count: dist.low, percent: Math.round((dist.low / total) * 100), colour: '#ef4444' },
    { label: '25-75% Done', count: dist.mid, percent: Math.round((dist.mid / total) * 100), colour: '#f59e0b' },
    { label: '75-100% Done', count: dist.high, percent: Math.round((dist.high / total) * 100), colour: '#10b981' },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {rings.map((r) => (
        <ProgressRing key={r.label} {...r} />
      ))}
    </div>
  );
}

// Single ring (gauge) for a category in the progress snapshot.
function ProgressRing({ label, count, percent, colour }: { label: string; count: number; percent: number; colour: string }) {
  const option = useMemo<EChartsOption>(() => ({
    series: [
      {
        type: 'gauge',
        startAngle: 90,
        endAngle: -270,
        radius: '90%',
        center: ['50%', '50%'],
        min: 0,
        max: 100,
        progress: { show: true, width: 6, roundCap: true, itemStyle: { color: colour } },
        axisLine: { lineStyle: { width: 6, color: [[1, '#f1f5f9']], opacity: 1 } },
        pointer: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        anchor: { show: false },
        detail: {
          valueAnimation: true,
          offsetCenter: [0, '-12%'],
          formatter: (v) => `${Math.round(Number(v))}%`,
          color: colour,
          fontSize: 16,
          fontWeight: 700,
        },
        title: {
          offsetCenter: [0, '28%'],
          color: '#64748b',
          fontSize: 11,
        },
        data: [{ value: percent, name: String(count) }],
      },
    ],
    animationDuration: 800,
  }), [percent, count, colour]);

  return (
    <div className="flex flex-col items-center gap-2">
      <EChart option={option} className="size-24" ariaLabel={`${label}: ${percent}%`} />
      <p className="text-center text-xs font-medium text-slate-600">{label}</p>
    </div>
  );
}
