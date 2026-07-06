import { useMemo } from 'react';
import {
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  GraduationCap,
  MessageSquare,
  Play,
  Users,
  Video,
  type LucideIcon,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DashboardLoader } from '@/components/ui/dashboard-loader';
import { Button } from '@/components/ui/button';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { formatDate } from '../../../admin/shared/utils/admin-data-utils.js';
import { useInstructorLayout } from '../../layout/InstructorLayoutContext.js';
import type { InstructorDashboardLiveClass } from '../../instructor-portal-api.js';
import type { InstructorPageProps } from '../../routing/instructor-routes.js';

// Naji 2026-07-06 — refreshed to match the updated ttiifaculty.lovable.app
// dashboard: five KPI tiles (incl. Total Classes), a Session Trend bar chart
// (sessions conducted week by week), a Recent Submissions list, This Week's
// Schedule, and Recent Activities. All wired to the real /instructor/dashboard
// payload. (Supersedes the twin-line score/attendance + cohort-performance +
// AI-insights layout per Naji's new design.)

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
    <div className="relative rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-violet-500/10">
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

// Session Trend — number of live sessions conducted per week over the last 8
// weeks. Recharts vertical bars in the portal's violet.
function SessionTrendChart({ data }: { data: { week: string; sessions: number }[] }) {
  if (!data || data.length === 0) {
    return <p className="py-12 text-center text-xs text-slate-400">No sessions in the last 8 weeks.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ left: -18, right: 8, top: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="week" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          cursor={{ fill: 'rgba(124,58,237,0.06)' }}
          contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
        />
        <Bar dataKey="sessions" fill="#7c3aed" radius={[8, 8, 0, 0]} maxBarSize={44} />
      </BarChart>
    </ResponsiveContainer>
  );
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
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-sm transition hover:border-violet-200 hover:bg-violet-50/40">
      <div className="flex min-w-0 items-center gap-3">
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
        <span className="hidden items-center rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700 sm:inline-flex">Upcoming</span>
        {row.joinUrl ? (
          <Button
            size="sm"
            className="gap-1 bg-violet-600 text-white hover:bg-violet-700"
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

function activityIcon(kind: 'submission' | 'evaluation' | 'class' | 'announcement'): LucideIcon {
  if (kind === 'evaluation') return CheckCircle2;
  if (kind === 'class') return Video;
  if (kind === 'announcement') return MessageSquare;
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
  const sessionTrend = useMemo(() => data?.sessionTrend ?? [], [data]);
  const recentSubmissions = useMemo(() => data?.recentSubmissions ?? [], [data]);
  const upcoming = useMemo(() => data?.upcomingLiveClasses ?? [], [data]);
  const activities = useMemo(() => data?.recentActivities ?? [], [data]);

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

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-0.5 text-sm text-slate-500">Welcome back, {greetingName}</p>
      </div>

      {/* Five KPI tiles */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
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
          label="Total Classes"
          value={metrics?.totalClasses ?? 0}
          sub="Sessions this month"
          icon={Calendar}
          tone="emerald"
          onOpen={() => onNavigate('/instructor/live-classes')}
        />
      </div>

      {/* Session Trend + Recent Submissions */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Session Trend</h2>
              <p className="text-xs text-slate-500">Number of sessions conducted week by week</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">Last 8 weeks</span>
          </div>
          <div className="h-72">
            <SessionTrendChart data={sessionTrend} />
          </div>
        </div>

        <div className="flex flex-col rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Recent Submissions</h2>
              <p className="text-xs text-slate-500">Individual student submissions</p>
            </div>
            <Button variant="ghost" size="sm" className="text-violet-600" onClick={() => onNavigate('/instructor/assignments')}>
              View all
            </Button>
          </div>
          <div className="h-72 space-y-3 overflow-y-auto pr-1">
            {recentSubmissions.length === 0 ? (
              <p className="py-12 text-center text-xs text-slate-400">No submissions yet.</p>
            ) : (
              recentSubmissions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-start gap-3 rounded-xl border border-slate-100 p-3 transition hover:border-violet-200 hover:bg-violet-50/40"
                >
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                    <FileText className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{s.studentName}</p>
                    <p className="truncate text-xs text-slate-500">{s.assignmentTitle}</p>
                    <p className="mt-0.5 truncate text-[11px] text-slate-400">
                      {[s.cohort, timeAgo(s.submittedAt)].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* This Week's Schedule + Recent Activities */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-violet-600" />
              <h2 className="text-base font-semibold text-slate-900">This Week&apos;s Schedule</h2>
            </div>
            <Button variant="ghost" size="sm" className="text-violet-600" onClick={() => onNavigate('/instructor/live-classes')}>
              View all
            </Button>
          </div>
          <div className="space-y-2">
            {upcoming.length === 0 ? (
              <p className="py-10 text-center text-xs text-slate-400">Nothing scheduled.</p>
            ) : (
              upcoming.slice(0, 5).map((row, i) => <ScheduleRow key={row.id ?? i} row={row} onNavigate={onNavigate} />)
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-base font-semibold text-slate-900">Recent Activities</h2>
          <div className="space-y-3">
            {activities.length === 0 ? (
              <p className="py-10 text-center text-xs text-slate-400">No recent activity.</p>
            ) : (
              activities.map((a, i) => {
                const Icon = activityIcon(a.kind);
                return (
                  <div key={i} className="flex items-start gap-3">
                    <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                      <Icon className="size-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium leading-relaxed text-slate-900">{a.title}</p>
                      {a.subtitle ? <p className="truncate text-[11px] text-slate-500">{a.subtitle}</p> : null}
                      <p className="mt-0.5 text-[10px] text-slate-400">{timeAgo(a.when)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
