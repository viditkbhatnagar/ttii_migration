import { useMemo } from 'react';
import {
  ArrowUpRight,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  Play,
  Sparkles,
  TrendingUp,
  Users,
  Video,
  type LucideIcon,
} from 'lucide-react';
import type { EChartsOption } from 'echarts';
import { DashboardLoader } from '@/components/ui/dashboard-loader';
import { Button } from '@/components/ui/button';
import { EChart } from '@/components/EChart';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { formatDate } from '../../../admin/shared/utils/admin-data-utils.js';
import { useInstructorLayout } from '../../layout/InstructorLayoutContext.js';
import type { InstructorDashboardLiveClass } from '../../instructor-portal-api.js';
import type { InstructorPageProps } from '../../routing/instructor-routes.js';

// Naji UAT 2026-05-22 — pixel-match pass for the ttiifaculty.lovable.app
// dashboard. Five metric tiles with circular soft-tint icons + arrow,
// twin-line area chart (avg score + attendance) with hover tooltip,
// vertical bar chart for cohort performance, today's schedule, and
// recent activities — all on the lighter slate-50 page background
// that the new layout provides.

function format12hTime(value: string | null): string {
  if (!value) return '';
  const [h, m] = value.split(':');
  const hh = Number(h ?? 0);
  const mm = Number(m ?? 0);
  const period = hh >= 12 ? 'PM' : 'AM';
  const h12 = hh % 12 || 12;
  return `${h12}:${String(mm).padStart(2, '0')} ${period}`;
}

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

const TONES = {
  violet: { soft: 'bg-violet-100', icon: 'text-violet-600' },
  sky: { soft: 'bg-sky-100', icon: 'text-sky-600' },
  amber: { soft: 'bg-amber-100', icon: 'text-amber-600' },
  fuchsia: { soft: 'bg-fuchsia-100', icon: 'text-fuchsia-600' },
  emerald: { soft: 'bg-emerald-100', icon: 'text-emerald-600' },
} as const;

function MetricTile({
  label,
  value,
  sub,
  icon: Icon,
  tone,
  onOpen,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: LucideIcon;
  tone: keyof typeof TONES;
  onOpen?: () => void;
}) {
  const c = TONES[tone];
  return (
    <div className="relative rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <button
        type="button"
        aria-label={`Open ${label}`}
        onClick={onOpen}
        className="absolute right-4 top-4 text-slate-300 transition-colors hover:text-slate-600"
      >
        <ArrowUpRight className="size-4" />
      </button>
      <div className={`mb-4 flex size-12 items-center justify-center rounded-2xl ${c.soft}`}>
        <Icon className={`size-6 ${c.icon}`} />
      </div>
      <p className="text-[13px] font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-[28px] font-bold leading-none text-slate-900">{value}</p>
      <p className="mt-3 text-xs text-slate-500">{sub}</p>
    </div>
  );
}

// Twin-line area chart (avg score in violet + attendance in cyan) over weeks.
// Apache ECharts — built-in tooltip + axis pointer replaces the hand-rolled
// hover overlay.
function PerformanceChart({ data }: { data: { week: string; score: number; attendance: number }[] }) {
  const option = useMemo<EChartsOption>(() => ({
    grid: { left: 40, right: 16, top: 32, bottom: 32, containLabel: false },
    legend: {
      top: 0,
      right: 0,
      icon: 'roundRect',
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: '#475569', fontSize: 11 },
      data: ['avg score', 'attendance'],
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#ffffff',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      textStyle: { color: '#0f172a', fontSize: 12 },
      axisPointer: { type: 'line', lineStyle: { color: '#cbd5e1', type: 'dashed', width: 1 } },
    },
    xAxis: {
      type: 'category',
      data: data.map((d) => d.week),
      boundaryGap: false,
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisTick: { show: false },
      axisLabel: { color: '#64748b', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      interval: 25,
      splitLine: { lineStyle: { color: '#e2e8f0', type: 'dashed' } },
      axisLabel: { color: '#94a3b8', fontSize: 11 },
    },
    series: [
      {
        name: 'attendance',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        data: data.map((d) => d.attendance),
        itemStyle: { color: '#06b6d4' },
        lineStyle: { color: '#06b6d4', width: 2.4 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(6,182,212,0.22)' },
              { offset: 1, color: 'rgba(6,182,212,0.02)' },
            ],
          },
        },
      },
      {
        name: 'avg score',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        data: data.map((d) => d.score),
        itemStyle: { color: '#7c3aed' },
        lineStyle: { color: '#7c3aed', width: 2.4 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(124,58,237,0.25)' },
              { offset: 1, color: 'rgba(124,58,237,0.02)' },
            ],
          },
        },
      },
    ],
  }), [data]);

  if (!data || data.length === 0) {
    return <p className="py-12 text-center text-xs text-slate-400">No performance data yet.</p>;
  }
  return <EChart option={option} className="h-72 w-full" ariaLabel="Average score and attendance by week" />;
}

// Vertical bar chart of avg cohort performance percentage. Apache ECharts.
function CohortBarChart({ data }: { data: { cohortTitle: string; avgPercent: number }[] }) {
  const trimmed = useMemo(() => data.slice(0, 6), [data]);
  // Trim long cohort titles so the x-axis labels stay readable.
  const shortLabel = (s: string) => (s.length <= 10 ? s : `${s.slice(0, 8)}…`);
  const option = useMemo<EChartsOption>(() => ({
    grid: { left: 32, right: 16, top: 16, bottom: 32, containLabel: false },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#ffffff',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      textStyle: { color: '#0f172a', fontSize: 12 },
      formatter: (params) => {
        const arr = Array.isArray(params) ? params : [params];
        const p = arr[0] as { axisValue?: string; data?: number } | undefined;
        if (!p) return '';
        const full = trimmed.find((t) => shortLabel(t.cohortTitle) === p.axisValue)?.cohortTitle ?? p.axisValue ?? '';
        return `<strong>${full}</strong><br/>avg : ${p.data ?? 0}%`;
      },
    },
    xAxis: {
      type: 'category',
      data: trimmed.map((c) => shortLabel(c.cohortTitle)),
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisTick: { show: false },
      axisLabel: { color: '#64748b', fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      interval: 25,
      splitLine: { lineStyle: { color: '#e2e8f0', type: 'dashed' } },
      axisLabel: { color: '#94a3b8', fontSize: 11 },
    },
    series: [
      {
        type: 'bar',
        barMaxWidth: 36,
        data: trimmed.map((c) => Math.max(0, Math.min(100, c.avgPercent))),
        itemStyle: { color: '#7c3aed', borderRadius: [6, 6, 0, 0] },
      },
    ],
  }), [trimmed]);

  if (!data || data.length === 0) {
    return <p className="py-12 text-center text-xs text-slate-400">No cohort data yet.</p>;
  }
  return <EChart option={option} className="h-72 w-full" ariaLabel="Average performance percentage by cohort" />;
}

function ScheduleRow({
  row,
  onNavigate,
}: {
  row: InstructorDashboardLiveClass;
  onNavigate: (href: string) => void;
}) {
  const dateLabel = row.date ? formatDate(row.date) : '—';
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
          <Video className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{row.title || 'Untitled session'}</p>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {row.cohortTitle ? `${row.cohortTitle} · ` : ''}{dateLabel}
            {row.fromTime ? ` · ${format12hTime(row.fromTime)} – ${format12hTime(row.toTime)}` : ''}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline-flex items-center rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700">Upcoming</span>
        {row.joinUrl ? (
          <Button
            size="sm"
            className="gap-1 bg-violet-600 hover:bg-violet-700 text-white"
            onClick={() => window.open(row.joinUrl ?? '#', '_blank', 'noopener,noreferrer')}
          >
            <Play className="size-3.5" /> Start
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="text-slate-500"
            onClick={() => onNavigate('/instructor/live-classes')}
          >
            Open
          </Button>
        )}
      </div>
    </div>
  );
}

function activityIcon(kind: 'submission' | 'evaluation' | 'class' | 'announcement') {
  if (kind === 'evaluation') return CheckCircle2;
  if (kind === 'class') return Video;
  if (kind === 'announcement') return Sparkles;
  return ClipboardCheck;
}

export default function InstructorDashboardPage({ api, session, onNavigate }: InstructorPageProps) {
  const { currentUser } = useInstructorLayout();
  const { data, loading, error } = useAdminPageData(
    () => api.loadDashboard(session.token),
    [api, session.token],
  );

  const firstName = (currentUser?.name.split(/\s+/)[0] ?? '').trim();
  const lastName = (currentUser?.name.split(/\s+/)[1] ?? '').trim();
  const greetingName = lastName ? `Dr. ${lastName}` : firstName || 'Faculty';

  const metrics = data?.metrics;
  const trend = useMemo(() => data?.performanceTrend ?? [], [data]);
  const cohortPerf = useMemo(() => data?.cohortPerformance ?? [], [data]);
  const schedule = useMemo(() => data?.todaysSchedule ?? [], [data]);
  const upcoming = data?.upcomingLiveClasses ?? [];
  const activities = useMemo(() => data?.recentActivities ?? [], [data]);
  const insights = useMemo(() => data?.aiInsights ?? [], [data]);

  if (loading) return <DashboardLoader label="faculty dashboard" />;
  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  const deltaSign = (n: number) => (n > 0 ? `+${n}` : `${n}`);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-0.5 text-sm text-slate-500">Welcome back, {greetingName}</p>
      </div>

      {/* Five metric tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricTile
          label="Assigned Cohorts"
          value={metrics?.assignedCohorts ?? 0}
          sub={metrics?.assignedCohortsDelta ?? ''}
          icon={Users}
          tone="violet"
          onOpen={() => onNavigate('/instructor/cohorts')}
        />
        <MetricTile
          label="Upcoming Classes"
          value={metrics?.upcomingClassesCount ?? 0}
          sub={metrics?.upcomingClassesNextLabel ?? ''}
          icon={Video}
          tone="sky"
          onOpen={() => onNavigate('/instructor/live-classes')}
        />
        <MetricTile
          label="Pending Evaluations"
          value={metrics?.pendingEvaluations ?? 0}
          sub={(metrics?.pendingEvaluationsOverdue ?? 0) > 0 ? `${metrics?.pendingEvaluationsOverdue} overdue` : 'On track'}
          icon={ClipboardCheck}
          tone="amber"
          onOpen={() => onNavigate('/instructor/assignments')}
        />
        <MetricTile
          label="Total Learners"
          value={metrics?.totalLearners ?? 0}
          sub={`Across ${metrics?.assignedCohorts ?? 0} cohort${metrics?.assignedCohorts === 1 ? '' : 's'}`}
          icon={GraduationCap}
          tone="fuchsia"
          onOpen={() => onNavigate('/instructor/cohorts')}
        />
        <MetricTile
          label="Avg Performance"
          value={`${metrics?.avgPerformancePercent ?? 0}%`}
          sub={`${deltaSign(metrics?.avgPerformanceDelta ?? 0)}% vs last month`}
          icon={TrendingUp}
          tone="emerald"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-1 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Learner Performance Trend</h2>
              <p className="text-xs text-slate-500">Weekly average across all cohorts</p>
            </div>
            <span className="rounded-full bg-violet-50 px-3 py-1 text-[11px] font-medium text-violet-700">Last 8 weeks</span>
          </div>
          <PerformanceChart data={trend} />
          <div className="mt-2 flex items-center gap-4 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-violet-600" /> Avg score</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-cyan-500" /> Attendance</span>
          </div>
        </section>
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-1">
            <h2 className="text-base font-semibold text-slate-900">Cohort Performance</h2>
            <p className="text-xs text-slate-500">Avg score by cohort</p>
          </div>
          <CohortBarChart data={cohortPerf} />
        </section>
      </div>

      {/* Today's schedule + recent activity */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="size-5 text-violet-600" />
              <h2 className="text-base font-semibold text-slate-900">Today's Schedule</h2>
            </div>
            <Button variant="ghost" size="sm" className="text-violet-600 hover:bg-violet-50" onClick={() => onNavigate('/instructor/live-classes')}>
              View all
            </Button>
          </div>
          {schedule.length === 0 ? (
            upcoming.length === 0 ? (
              <div role="status" className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
                Nothing scheduled today.
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[11px] text-slate-400">No sessions today — showing your next upcoming.</p>
                {upcoming.slice(0, 3).map((row) => (
                  <ScheduleRow key={row.id} row={row} onNavigate={onNavigate} />
                ))}
              </div>
            )
          ) : (
            <div className="space-y-2">
              {schedule.map((row) => (
                <ScheduleRow key={row.id} row={row} onNavigate={onNavigate} />
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Calendar className="size-5 text-violet-600" />
            <h2 className="text-base font-semibold text-slate-900">Recent Activities</h2>
          </div>
          {activities.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">No recent activity.</p>
          ) : (
            <ul className="space-y-2">
              {activities.map((a, i) => {
                const Icon = activityIcon(a.kind);
                return (
                  <li key={`${a.when}-${i}`} className="flex items-start gap-2.5 rounded-xl border border-slate-100 p-2.5">
                    <span className="mt-0.5 rounded-lg bg-violet-50 p-1.5 text-violet-600">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-slate-800">{a.title}</p>
                      <p className="truncate text-[11px] text-slate-500">{a.subtitle}</p>
                    </div>
                    <span className="shrink-0 text-[10px] text-slate-400">{timeAgo(a.when)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* AI Insights */}
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="size-5 text-violet-600" />
          <h2 className="text-base font-semibold text-slate-900">Insights & Recommendations</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {insights.map((ins, i) => {
            const palette: Record<typeof ins.tone, { bg: string; border: string; fg: string }> = {
              positive: { bg: 'bg-emerald-50', border: 'border-emerald-200', fg: 'text-emerald-800' },
              warning: { bg: 'bg-amber-50', border: 'border-amber-200', fg: 'text-amber-800' },
              info: { bg: 'bg-violet-50', border: 'border-violet-200', fg: 'text-violet-800' },
            } as const;
            const c = palette[ins.tone];
            return (
              <div key={i} className={`rounded-xl border ${c.border} ${c.bg} p-3`}>
                <p className={`text-xs font-semibold ${c.fg}`}>{ins.title}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-700">{ins.body}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
