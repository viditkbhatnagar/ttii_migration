import { useMemo } from 'react';
import {
  Users,
  Video,
  ClipboardCheck,
  GraduationCap,
  CheckCircle2,
  MessageSquare,
  Calendar,
  FileText,
  ArrowUpRight,
  type LucideIcon,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DashboardLoader } from '@/components/ui/dashboard-loader';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { formatDate } from '../../../admin/shared/utils/admin-data-utils.js';
import { useInstructorLayout } from '../../layout/InstructorLayoutContext.js';
import type { InstructorDashboardLiveClass } from '../../instructor-portal-api.js';
import type { InstructorPageProps } from '../../routing/instructor-routes.js';

// Naji 2026-07-06 — rebuilt with the EXACT ttiifaculty.lovable.app dashboard
// markup (his Card/Badge/Button composition + semantic .faculty-portal tokens:
// bg-primary-soft / text-primary / bg-muted / soft-shadow / glow-shadow / etc.).
// Routing swapped from @tanstack/react-router <Link> to onNavigate; mock data
// swapped for the real /instructor/dashboard snapshot.

function format12hTime(value: string | null): string {
  if (!value) return '';
  const parts = value.split(':');
  const hh = Number(parts[0] ?? 0);
  const mm = Number(parts[1] ?? 0);
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

// Day/date box parts for the schedule rows (his design shows a small weekday +
// date-number tile). Built from local Date parts to avoid the UTC day-shift.
function scheduleDayParts(date: string | null): { day: string; date: string } {
  if (!date) return { day: '—', date: '' };
  const parts = date.split('-');
  const y = Number(parts[0] ?? 0);
  const mo = Number(parts[1] ?? 0);
  const d = Number(parts[2] ?? 0);
  if (!y || !mo || !d) return { day: '—', date: formatDate(date) };
  const dt = new Date(y, mo - 1, d);
  const day = dt.toLocaleDateString('en-US', { weekday: 'short' });
  const dd = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return { day, date: dd };
}

const kpiTintMap: Record<string, string> = {
  primary: 'bg-primary-soft text-primary',
  info: 'bg-[oklch(0.94_0.04_235)] text-info',
  warning: 'bg-[oklch(0.97_0.05_75)] text-[oklch(0.55_0.17_75)]',
  success: 'bg-[oklch(0.94_0.06_155)] text-success',
};

const activityIconMap: Record<string, LucideIcon> = {
  submission: ClipboardCheck,
  evaluation: CheckCircle2,
  class: Video,
  announcement: MessageSquare,
};

export default function InstructorDashboardPage({ api, session, onNavigate }: InstructorPageProps) {
  const { currentUser } = useInstructorLayout();
  const { data, loading, error } = useAdminPageData(
    () => api.loadDashboard(session.token),
    [api, session.token],
  );

  // Naji 2026-07-07 — greet with the instructor's real first name; do NOT
  // prepend a "Dr." title that was never provided.
  const firstName = (currentUser?.name.split(/\s+/)[0] ?? '').trim();
  const greetingName = firstName || 'Faculty';

  const metrics = data?.metrics;
  const sessionTrend = useMemo(() => data?.sessionTrend ?? [], [data]);
  const recentSubmissions = useMemo(() => data?.recentSubmissions ?? [], [data]);
  const upcoming = useMemo(() => data?.upcomingLiveClasses ?? [], [data]);
  const activities = useMemo(() => data?.recentActivities ?? [], [data]);

  const kpis = useMemo(
    () => [
      {
        label: 'Assigned Cohorts',
        value: metrics?.assignedCohorts ?? 0,
        delta: metrics?.assignedCohortsDelta ?? '',
        icon: Users,
        tint: 'primary',
        href: '/instructor/cohorts',
      },
      {
        label: 'Upcoming Classes',
        value: metrics?.upcomingClassesCount ?? 0,
        delta: metrics?.upcomingClassesNextLabel ?? '',
        icon: Video,
        tint: 'info',
        href: '/instructor/live-classes',
      },
      {
        label: 'Pending Evaluations',
        value: metrics?.pendingEvaluations ?? 0,
        delta:
          (metrics?.pendingEvaluationsOverdue ?? 0) > 0
            ? `${metrics?.pendingEvaluationsOverdue} overdue`
            : 'On track',
        icon: ClipboardCheck,
        tint: 'warning',
        href: '/instructor/assignments',
      },
      {
        label: 'Total Learners',
        value: metrics?.totalLearners ?? 0,
        delta: `Across ${metrics?.assignedCohorts ?? 0} cohort${metrics?.assignedCohorts === 1 ? '' : 's'}`,
        icon: GraduationCap,
        tint: 'primary',
        href: '/instructor/cohorts',
      },
      {
        label: 'Total Classes',
        value: metrics?.totalClasses ?? 0,
        delta: 'Sessions this month',
        icon: Calendar,
        tint: 'success',
        href: '/instructor/live-classes',
      },
    ],
    [metrics],
  );

  if (loading) return <DashboardLoader label="faculty dashboard" />;
  if (error) {
    return (
      <div className="space-y-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        </div>
        <Card className="soft-shadow border-destructive/40">
          <CardContent className="p-8 text-center">
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* PageHeader (inline — our layout already provides navbar + sidebar) */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Welcome back, {greetingName}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {kpis.map((k) => (
          <Card
            key={k.label}
            className="soft-shadow border-border/60 transition hover:-translate-y-0.5 hover:glow-shadow"
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${kpiTintMap[k.tint]}`}
                >
                  <k.icon className="h-5 w-5" />
                </div>
                <button
                  type="button"
                  aria-label={`Open ${k.label}`}
                  onClick={() => onNavigate(k.href)}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ArrowUpRight className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-4 text-xs font-medium text-muted-foreground">{k.label}</p>
              <p className="mt-1 text-2xl font-bold tracking-tight">{k.value}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{k.delta}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="soft-shadow lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Session Trend</CardTitle>
              <p className="text-xs text-muted-foreground">
                Number of sessions conducted week by week
              </p>
            </div>
            <Badge variant="secondary" className="rounded-full">
              Last 8 weeks
            </Badge>
          </CardHeader>
          <CardContent className="h-72">
            {sessionTrend.length === 0 ? (
              <p className="py-12 text-center text-xs text-muted-foreground">
                No sessions in the last 8 weeks.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sessionTrend} margin={{ left: -20, right: 8, top: 8 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="week"
                    stroke="var(--color-muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--color-muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid var(--color-border)',
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="sessions" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="soft-shadow">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Recent Submissions</CardTitle>
              <p className="text-xs text-muted-foreground">Individual student submissions</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary"
              onClick={() => onNavigate('/instructor/assignments')}
            >
              View all
            </Button>
          </CardHeader>
          <CardContent className="h-72 space-y-3 overflow-y-auto pr-1">
            {recentSubmissions.length === 0 ? (
              <p className="py-12 text-center text-xs text-muted-foreground">No submissions yet.</p>
            ) : (
              recentSubmissions.slice(0, 5).map((s) => (
                <div
                  key={s.id}
                  className="flex items-start gap-3 rounded-xl border border-border/60 p-3 transition hover:border-primary/30 hover:bg-primary-soft/40"
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.studentName}</p>
                    <p className="truncate text-xs text-muted-foreground">{s.assignmentTitle}</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {[s.cohort, timeAgo(s.submittedAt)].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Schedule + Activities */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="soft-shadow lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">This Week&apos;s Schedule</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary"
              onClick={() => onNavigate('/instructor/live-classes')}
            >
              View all
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcoming.length === 0 ? (
              <p className="py-10 text-center text-xs text-muted-foreground">Nothing scheduled.</p>
            ) : (
              upcoming.slice(0, 5).map((s: InstructorDashboardLiveClass, i) => {
                const parts = scheduleDayParts(s.date);
                const timeLabel = s.fromTime ? format12hTime(s.fromTime) : '';
                const titleLine = [timeLabel, s.title || 'Untitled session']
                  .filter(Boolean)
                  .join(' · ');
                const subLine = [
                  s.cohortTitle ?? '',
                  s.fromTime && s.toTime
                    ? `${format12hTime(s.fromTime)} – ${format12hTime(s.toTime)}`
                    : '',
                ]
                  .filter(Boolean)
                  .join(' · ');
                return (
                  <div
                    key={s.id ?? i}
                    className="flex items-center gap-4 rounded-xl border border-border/60 p-3 transition hover:border-primary/30 hover:bg-primary-soft/40"
                  >
                    <div className="flex w-16 shrink-0 flex-col items-center rounded-lg bg-muted px-2 py-2">
                      <span className="text-xs font-semibold text-primary">{parts.day}</span>
                      <span className="text-[10px] text-muted-foreground">{parts.date}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{titleLine}</p>
                      <p className="truncate text-xs text-muted-foreground">{subLine}</p>
                    </div>
                    {s.joinUrl ? (
                      <Button
                        size="sm"
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={() =>
                          window.open(s.joinUrl ?? '#', '_blank', 'noopener,noreferrer')
                        }
                      >
                        Start
                      </Button>
                    ) : (
                      <Badge variant="secondary">Upcoming</Badge>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="soft-shadow">
          <CardHeader>
            <CardTitle className="text-base">Recent Activities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activities.length === 0 ? (
              <p className="py-10 text-center text-xs text-muted-foreground">No recent activity.</p>
            ) : (
              activities.map((a, i) => {
                const Icon = activityIconMap[a.kind] ?? CheckCircle2;
                return (
                  <div key={i} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs leading-relaxed text-foreground">{a.title}</p>
                      {a.subtitle ? (
                        <p className="truncate text-[11px] text-muted-foreground">{a.subtitle}</p>
                      ) : null}
                      <p className="mt-0.5 text-[10px] text-muted-foreground">{timeAgo(a.when)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
