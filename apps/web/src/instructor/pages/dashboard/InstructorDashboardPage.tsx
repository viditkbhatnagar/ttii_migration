import { useMemo } from 'react';
import {
  Activity,
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Play,
  Sparkles,
  TrendingUp,
  Users,
  Video,
  type LucideIcon,
} from 'lucide-react';
import { DashboardLoader } from '@/components/ui/dashboard-loader';
import { Button } from '@/components/ui/button';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { formatDate } from '../../../admin/shared/utils/admin-data-utils.js';
import { useInstructorLayout } from '../../layout/InstructorLayoutContext.js';
import type { InstructorDashboardLiveClass } from '../../instructor-portal-api.js';
import type { InstructorPageProps } from '../../routing/instructor-routes.js';

// Naji UAT 2026-05-22 — Faculty dashboard redesigned to match the
// ttiifaculty.lovable.app reference. Five metric tiles up top, two
// pure-SVG charts (Learner Performance Trend line + Cohort Performance
// bars), Today's Schedule, Recent Activities feed, and AI Insights
// recommendation cards. No new chart dep — mirrors the SVG pattern
// already used on the admin dashboard.

function formatTimeRange(from: string | null, to: string | null): string {
  if (!from && !to) return '';
  const trim = (t: string | null) => (t ?? '').slice(0, 5);
  return [trim(from), trim(to)].filter(Boolean).join(' – ');
}

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

function MetricTile({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: LucideIcon;
  tone: 'primary' | 'amber' | 'emerald' | 'sky' | 'violet';
}) {
  const palette: Record<typeof tone, { bg: string; fg: string }> = {
    primary: { bg: 'bg-student-primary/10', fg: 'text-student-primary' },
    amber: { bg: 'bg-amber-100', fg: 'text-amber-700' },
    emerald: { bg: 'bg-emerald-100', fg: 'text-emerald-700' },
    sky: { bg: 'bg-sky-100', fg: 'text-sky-700' },
    violet: { bg: 'bg-violet-100', fg: 'text-violet-700' },
  } as const;
  const c = palette[tone];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-student-muted">{label}</p>
          <p className="mt-2 text-3xl font-bold text-student-text">{value}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{sub}</p>
        </div>
        <div className={`shrink-0 rounded-xl p-2.5 ${c.bg} ${c.fg}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function PerformanceTrendChart({ data }: { data: { week: string; score: number }[] }) {
  if (!data || data.length === 0) {
    return <p className="py-8 text-center text-xs text-slate-400">No performance data yet.</p>;
  }
  const scores = data.map((d) => d.score);
  const max = 100;
  const width = 600;
  const height = 220;
  const padX = 36;
  const padY = 20;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const stepX = scores.length > 1 ? innerW / (scores.length - 1) : innerW;
  const points = scores.map((v, i) => ({
    x: padX + i * stepX,
    y: padY + innerH - (v / max) * innerH,
  }));
  const pathLine = points.reduce<string>((acc, p, i) => {
    if (i === 0) return `M${p.x},${p.y}`;
    const prev = points[i - 1]!;
    const cx = (prev.x + p.x) / 2;
    return `${acc} C${cx},${prev.y} ${cx},${p.y} ${p.x},${p.y}`;
  }, '');
  const pathArea = `${pathLine} L${points[points.length - 1]!.x},${padY + innerH} L${points[0]!.x},${padY + innerH} Z`;
  const yTicks = [0, 25, 50, 75, 100];
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full">
      {yTicks.map((t) => {
        const y = padY + innerH - (t / max) * innerH;
        return (
          <g key={t}>
            <line x1={padX} y1={y} x2={width - padX / 2} y2={y} stroke="#e2e8f0" strokeWidth={0.6} strokeDasharray="2,3" />
            <text x={padX - 8} y={y + 3} textAnchor="end" fontSize="10" fill="#94a3b8">{t}</text>
          </g>
        );
      })}
      <path d={pathArea} fill="url(#gradPerf)" />
      <path d={pathLine} fill="none" stroke="#5a6cee" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      <defs>
        <linearGradient id="gradPerf" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#5a6cee" stopOpacity={0.35} />
          <stop offset="100%" stopColor="#5a6cee" stopOpacity={0.02} />
        </linearGradient>
      </defs>
      {data.map((p, i) => (
        <text key={p.week} x={padX + i * stepX} y={height - padY / 2 + 4} textAnchor="middle" fontSize="10" fill="#64748b">
          {p.week}
        </text>
      ))}
    </svg>
  );
}

function CohortPerformanceBars({ data }: { data: { cohortTitle: string; avgPercent: number; learners: number }[] }) {
  if (!data || data.length === 0) {
    return <p className="py-8 text-center text-xs text-slate-400">No cohort data yet.</p>;
  }
  const trimmed = data.slice(0, 6); // cap to keep bars readable
  return (
    <div className="space-y-3">
      {trimmed.map((c) => {
        const pct = Math.max(0, Math.min(100, c.avgPercent));
        const tone = pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-sky-500' : 'bg-amber-500';
        return (
          <div key={c.cohortTitle}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="truncate font-medium text-slate-700">{c.cohortTitle || 'Untitled cohort'}</span>
              <span className="text-slate-500"><span className="font-semibold text-slate-800">{pct}%</span> · {c.learners} learner{c.learners === 1 ? '' : 's'}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full ${tone} transition-all`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LiveClassRow({
  row,
  variant,
  onNavigate,
}: {
  row: InstructorDashboardLiveClass;
  variant: 'upcoming' | 'past';
  onNavigate: (href: string) => void;
}) {
  const dateLabel = row.date ? formatDate(row.date) : '—';
  const timeLabel = formatTimeRange(row.fromTime, row.toTime);
  const hasRecording = Boolean(row.recordingStorageKey || row.recordingUrl);
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-student-text">{row.title || 'Untitled session'}</p>
          {variant === 'upcoming' ? (
            <span className="inline-flex items-center rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700">Upcoming</span>
          ) : null}
        </div>
        <p className="mt-0.5 text-xs text-student-muted">
          {row.cohortTitle ? `${row.cohortTitle} · ` : ''}{dateLabel}{timeLabel ? ` · ${format12hTime(row.fromTime)} – ${format12hTime(row.toTime)}` : ''}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {variant === 'upcoming' && row.joinUrl ? (
          <Button
            size="sm"
            className="bg-student-primary text-white hover:bg-student-primary/90"
            onClick={() => window.open(row.joinUrl ?? '#', '_blank', 'noopener,noreferrer')}
          >
            <Play className="mr-1 h-3.5 w-3.5" /> Start
          </Button>
        ) : null}
        {variant === 'past' && hasRecording ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigate(`/instructor/live-classes?recording=${row.id}`)}
          >
            <Video className="mr-1 h-3.5 w-3.5" /> Recording
          </Button>
        ) : null}
        {variant === 'past' ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onNavigate(`/instructor/live-classes?attendance=${row.id}`)}
          >
            <Users className="mr-1 h-3.5 w-3.5" /> Attendance
          </Button>
        ) : null}
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
  const greetingName = firstName || 'Faculty';

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
        <h1 className="text-2xl font-bold text-student-text">Dashboard</h1>
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  const deltaSign = (n: number) => (n > 0 ? `+${n}` : `${n}`);

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-student-text">Welcome back, {greetingName}</h1>
        <p className="mt-1 text-sm text-student-muted">
          Your cohorts, classes, and grading at a glance.
        </p>
      </div>

      {/* Five metric tiles */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricTile
          label="Assigned Cohorts"
          value={metrics?.assignedCohorts ?? 0}
          sub={metrics?.assignedCohortsDelta ?? ''}
          icon={BookOpen}
          tone="primary"
        />
        <MetricTile
          label="Upcoming Classes"
          value={metrics?.upcomingClassesCount ?? 0}
          sub={metrics?.upcomingClassesNextLabel ?? ''}
          icon={Calendar}
          tone="sky"
        />
        <MetricTile
          label="Pending Evaluations"
          value={metrics?.pendingEvaluations ?? 0}
          sub={
            (metrics?.pendingEvaluationsOverdue ?? 0) > 0
              ? `${metrics?.pendingEvaluationsOverdue} overdue`
              : 'On track'
          }
          icon={ClipboardCheck}
          tone={(metrics?.pendingEvaluationsOverdue ?? 0) > 0 ? 'amber' : 'emerald'}
        />
        <MetricTile
          label="Total Learners"
          value={metrics?.totalLearners ?? 0}
          sub={`Across ${metrics?.assignedCohorts ?? 0} cohort${metrics?.assignedCohorts === 1 ? '' : 's'}`}
          icon={Users}
          tone="violet"
        />
        <MetricTile
          label="Avg Performance"
          value={`${metrics?.avgPerformancePercent ?? 0}%`}
          sub={`${deltaSign(metrics?.avgPerformanceDelta ?? 0)} pts vs early term`}
          icon={TrendingUp}
          tone={(metrics?.avgPerformanceDelta ?? 0) >= 0 ? 'emerald' : 'amber'}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-student-text">Learner Performance Trend</h2>
            <span className="text-[11px] text-slate-500">Last 8 weeks · 0–100 scale</span>
          </div>
          <PerformanceTrendChart data={trend} />
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-student-text">Cohort Performance</h2>
            <span className="text-[11px] text-slate-500">Avg score across assignments</span>
          </div>
          <CohortPerformanceBars data={cohortPerf} />
        </section>
      </div>

      {/* Today's schedule + recent activity */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-student-text">Today's Schedule</h2>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('/instructor/live-classes')}>
              View all
            </Button>
          </div>
          {schedule.length === 0 ? (
            upcoming.length === 0 ? (
              <div role="status" className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-student-muted">
                Nothing scheduled today.
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">No sessions today — showing your next upcoming.</p>
                {upcoming.slice(0, 3).map((row) => (
                  <LiveClassRow key={row.id} row={row} variant="upcoming" onNavigate={onNavigate} />
                ))}
              </div>
            )
          ) : (
            <div className="space-y-2">
              {schedule.map((row) => (
                <LiveClassRow key={row.id} row={row} variant="upcoming" onNavigate={onNavigate} />
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-student-text">Recent Activities</h2>
            <Activity className="h-4 w-4 text-slate-400" />
          </div>
          {activities.length === 0 ? (
            <p className="py-6 text-center text-xs text-student-muted">No recent activity.</p>
          ) : (
            <ul className="space-y-2">
              {activities.map((a, i) => {
                const Icon = activityIcon(a.kind);
                return (
                  <li key={`${a.when}-${i}`} className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50/60 p-2">
                    <span className="mt-0.5 rounded-md bg-white p-1.5 text-slate-500 shadow-sm">
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
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-500" />
          <h2 className="text-sm font-semibold text-student-text">Insights & Recommendations</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {insights.map((ins, i) => {
            const palette: Record<typeof ins.tone, { bg: string; border: string; fg: string }> = {
              positive: { bg: 'bg-emerald-50', border: 'border-emerald-200', fg: 'text-emerald-800' },
              warning: { bg: 'bg-amber-50', border: 'border-amber-200', fg: 'text-amber-800' },
              info: { bg: 'bg-sky-50', border: 'border-sky-200', fg: 'text-sky-800' },
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
