import { useMemo, useState } from 'react';
import {
  Target,
  TrendingUp,
  Trophy,
  Award,
  Flame,
  Calendar,
  CheckCircle2,
  Crown,
  Medal,
  IndianRupee,
  ArrowUpRight,
  ArrowDownRight,
  type LucideIcon,
} from 'lucide-react';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  LineChart,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardLoader } from '@/components/ui/dashboard-loader';
import { cn } from '@/lib/utils';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asNumber, asString, toRecords } from '../../../admin/shared/utils/admin-data-utils.js';
import type { CounsellorPageProps } from '../../routing/counsellor-routes.js';
import { asRecord, KpiCard, type KpiCardProps, type TrendData } from '../../components/CounsellorWidgets.js';

// EXACT Lovable chart palette (literal hex — this scope defines tokens as hex,
// so `hsl(var(--token))` does NOT resolve; recharts needs literal colours).
const NAVY = '#0B2758'; // counsellor "primary"/navy (matches --chart-1)
const SUCCESS = '#22C55E';
const INFO = '#3b82f6';
const WARNING = '#F59E0B';

// Six multi-coloured bars for the Course-wise Conversion chart, matching the
// prototype's per-bar palette.
const COURSE_BAR_COLORS = [NAVY, INFO, SUCCESS, '#8b5cf6', WARNING, '#06b6d4'] as const;

// Per-stage funnel colours, matching the prototype's stage palette.
const FUNNEL_COLORS: Record<string, string> = {
  lead: '#3b82f6',
  payment_pending: '#f59e0b',
  paid: '#10b981',
  form_pending: '#8b5cf6',
  form_submitted: '#0B2758',
  approval_waiting: '#f59e0b',
  rejected: '#ef4444',
};

const TIER_STYLES: Record<string, string> = {
  Diamond: 'bg-info-soft text-info border-info/30',
  Platinum: 'bg-muted text-foreground border-border',
  Gold: 'bg-warning-soft text-warning-foreground border-warning/30',
  Silver: 'bg-secondary text-secondary-foreground border-border',
  Bronze: 'bg-orange-100 text-orange-700 border-orange-200',
};

const tooltipStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 10,
  fontSize: 12,
  boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
} as const;

type BadgeTone = 'warning' | 'success' | 'info' | 'primary';

interface AnalyticsRow {
  label: string;
  target: number;
  achieved: number;
}

interface FunnelRow {
  key: string;
  label: string;
  count: number;
}

interface LeaderRow {
  rank: number;
  name: string;
  initials: string;
  points: number;
  admissions: number;
  enrollments: number;
  achievementPct: number;
  tier: string;
  isCurrentUser: boolean;
}

interface TimelineRow {
  label: string;
  applications: number;
  enrollments: number;
  achievementPct: number;
}

interface CoursePerfRow {
  courseTitle: string;
  conversionPct: number;
}

interface AchievementBadge {
  label: string;
  icon: LucideIcon;
  tone: BadgeTone;
}

const BADGE_TONE_CLASSES: Record<BadgeTone, string> = {
  warning: 'bg-warning-soft text-warning-foreground',
  success: 'bg-success-soft text-success',
  info: 'bg-info-soft text-info',
  primary: 'bg-primary-soft text-accent-foreground',
};

export default function CounsellorPerformancePage({ api, session }: CounsellorPageProps) {
  const { data, loading, error } = useAdminPageData(
    () =>
      Promise.all([
        api.loadCounsellorDashboard(session.token),
        api.loadCounsellorTargets(session.token),
        api.loadCounsellorLeaderboard(session.token),
      ]).then(([dashboard, targets, leaderboard]) => ({ dashboard, targets, leaderboard })),
    [api, session.token],
  );

  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');

  const kpis = useMemo(() => asRecord(asRecord(data?.dashboard).kpis), [data]);
  const deltas = useMemo(() => asRecord(asRecord(data?.dashboard).deltas), [data]);

  const trend = useMemo<TrendData>(() => {
    const t = asRecord(asRecord(data?.dashboard).admissionsTrend);
    const toNums = (v: unknown): number[] => (Array.isArray(v) ? v.map((x) => asNumber(x)) : []);
    return {
      labels: Array.isArray(t.labels) ? t.labels.map((x) => asString(x)) : [],
      applications: toNums(t.applications),
      enrollments: toNums(t.enrollments),
    };
  }, [data]);

  const targetPoint = asNumber(kpis.monthlyTargetPoint);

  // Analytics series — Target (flat target line per month) vs Achieved (real
  // monthly applications). Weekly/Yearly windows are not provided by the API,
  // so all three Tabs render the same real monthly window honestly.
  const analytics = useMemo<AnalyticsRow[]>(
    () =>
      trend.labels.map((label, i) => ({
        label,
        target: targetPoint,
        achieved: trend.applications[i] ?? 0,
      })),
    [trend, targetPoint],
  );

  const funnel = useMemo<FunnelRow[]>(
    () =>
      toRecords(asRecord(data?.dashboard).funnel).map((r) => ({
        key: asString(r.key),
        label: asString(r.label) || '—',
        count: asNumber(r.count),
      })),
    [data],
  );

  const overallConversionPct = useMemo(() => asNumber(asRecord(data?.dashboard).overallConversionPct), [data]);

  // Course-wise conversion — real per-course conversion % from the dashboard payload.
  const coursePerformance = useMemo<CoursePerfRow[]>(
    () =>
      toRecords(asRecord(data?.dashboard).coursePerformance).map((r) => ({
        courseTitle: asString(r.courseTitle) || '—',
        conversionPct: asNumber(r.conversionPct),
      })),
    [data],
  );

  const leaderboard = useMemo<LeaderRow[]>(
    () =>
      toRecords(asRecord(data?.leaderboard).leaderboard).map((r) => ({
        rank: asNumber(r.rank),
        name: asString(r.name) || '—',
        initials: asString(r.initials) || 'CN',
        points: asNumber(r.points),
        admissions: asNumber(r.admissions),
        enrollments: asNumber(r.enrollments),
        achievementPct: asNumber(r.achievementPct),
        tier: asString(r.tier) || 'Bronze',
        isCurrentUser: r.isCurrentUser === true,
      })),
    [data],
  );

  const timeline = useMemo<TimelineRow[]>(
    () =>
      trend.labels.map((label, i) => {
        const applications = trend.applications[i] ?? 0;
        const enrollments = trend.enrollments[i] ?? 0;
        return {
          label,
          applications,
          enrollments,
          achievementPct: applications > 0 ? Math.round((enrollments / applications) * 100) : 0,
        };
      }),
    [trend],
  );

  if (loading) {
    return <DashboardLoader label="performance" />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Performance</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live sales analytics, targets, and leaderboard for your team.
          </p>
        </div>
        <Card className="border-border/70 bg-card shadow-[var(--shadow-soft)]">
          <div className="py-12 text-center">
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const achieved = asNumber(kpis.targetAchieved);
  const achievementPct = asNumber(kpis.achievementPct);
  const totalEnrollments = asNumber(kpis.totalEnrollments);
  const ytd = asNumber(kpis.ytd);
  const onTrack = achievementPct >= 80;
  const hasTrend = trend.applications.some((n) => n > 0) || trend.enrollments.some((n) => n > 0);
  // Single "{Month YYYY}" status token (current month) — not a Jan–Dec range.
  const statusMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Real month-over-month deltas from the dashboard payload — attach only where
  // a genuine value exists (never fabricated). The payload exposes deltas for
  // totalApplications and totalEnrollments only.
  const enrollDelta = asNumber(deltas.totalEnrollments);
  const appsDelta = asNumber(deltas.totalApplications);
  const hasEnrollDelta = 'totalEnrollments' in deltas;
  const hasAppsDelta = 'totalApplications' in deltas;

  const cards: KpiCardProps[] = [
    // No MoM delta exists for the configured target point — honestly omit it.
    { label: 'Monthly Target Point', value: targetPoint.toLocaleString('en-IN'), icon: Target, tone: 'primary', sub: 'Current window', progress: 100 },
    {
      label: 'Target Achieved',
      value: achieved.toLocaleString('en-IN'),
      icon: CheckCircle2,
      tone: 'success',
      sub: `of ${targetPoint.toLocaleString('en-IN')}`,
      progress: achievementPct,
      ...(hasAppsDelta ? { delta: appsDelta } : {}),
    },
    {
      // Achievement % shares the applications numerator against a flat target,
      // so the applications MoM delta is the genuine movement here.
      label: 'Achievement %',
      value: `${achievementPct}%`,
      icon: TrendingUp,
      tone: 'info',
      sub: 'Of current target',
      progress: achievementPct,
      ...(hasAppsDelta ? { delta: appsDelta } : {}),
    },
    {
      label: 'Current Enrollments',
      value: totalEnrollments.toLocaleString('en-IN'),
      icon: Trophy,
      tone: 'success',
      sub: 'Converted to enrolment',
      progress: achievementPct,
      ...(hasEnrollDelta ? { delta: enrollDelta } : {}),
    },
    // No YTD-specific MoM delta in the payload — honestly omit it.
    { label: 'Applications — YTD', value: ytd.toLocaleString('en-IN'), icon: Award, tone: 'primary', sub: 'Year to date', progress: 100 },
  ];

  // Achievement badges — the prototype's six labels/icons, all fully opaque.
  const badges: AchievementBadge[] = [
    { label: 'Top Performer', icon: Crown, tone: 'warning' },
    { label: 'Revenue King', icon: IndianRupee, tone: 'success' },
    { label: 'Streak 30d', icon: Flame, tone: 'warning' },
    { label: 'Quick Closer', icon: TrendingUp, tone: 'info' },
    { label: 'Mentor', icon: Award, tone: 'primary' },
    { label: 'Centurion', icon: Medal, tone: 'info' },
  ];
  // "Next badge: Legend" progress — real progress toward the next 100-enrolment
  // (Legend) milestone; falls back to the current achievement % when no
  // enrolments exist yet.
  const nextBadgePct =
    totalEnrollments > 0 ? Math.round((totalEnrollments % 100) / 100 * 100) : Math.min(100, achievementPct);

  // Timeline summary boxes — real values from the last-6-months trend.
  const lastIdx = timeline.length - 1;
  const thisMonth = lastIdx >= 0 ? timeline[lastIdx] : undefined;
  const prevMonth = lastIdx >= 1 ? timeline[lastIdx - 1] : undefined;
  const avgAdmissions =
    timeline.length > 0
      ? Math.round((timeline.reduce((sum, r) => sum + r.applications, 0) / timeline.length) * 10) / 10
      : 0;
  const momDiff =
    thisMonth && prevMonth && prevMonth.applications > 0
      ? Math.round(((thisMonth.applications - prevMonth.applications) / prevMonth.applications) * 1000) / 10
      : 0;
  const momUp = momDiff >= 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Performance</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live sales analytics, targets, and leaderboard for your team.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {statusMonth}
          </Badge>
          <Badge
            className={cn(
              'gap-1.5 border-0',
              onTrack ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning-foreground',
            )}
          >
            <Flame className="h-3.5 w-3.5" />
            {onTrack ? 'On Track' : 'Below Target'}
          </Badge>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {cards.map((c) => (
          <KpiCard key={c.label} {...c} />
        ))}
      </div>

      {/* Performance Analytics — period switch */}
      <Card className="border-border/70 bg-card p-5 shadow-[var(--shadow-soft)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Performance Analytics</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Target vs achievement across time</p>
          </div>
          <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
            <TabsList>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="yearly">Yearly</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="h-[300px]">
          {hasTrend ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={analytics} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="cnAchGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={NAVY} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={NAVY} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="target" name="Target" fill="#E2E8F0" radius={[6, 6, 0, 0]} barSize={20} />
                <Area
                  type="monotone"
                  dataKey="achieved"
                  name="Achieved"
                  stroke={NAVY}
                  strokeWidth={2.5}
                  fill="url(#cnAchGrad)"
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-slate-400">
              No admissions data yet.
            </div>
          )}
        </div>
      </Card>

      {/* Application Funnel + Course Conversion */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="border-border/70 bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="mb-4">
            <h2 className="text-base font-semibold">Application Funnel</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Lead → Enrolled</p>
          </div>
          {funnel.length > 0 ? (
            <>
              <div className="space-y-2">
                {funnel.map((f, i) => {
                  const max = Math.max(1, ...funnel.map((s) => s.count));
                  const pct = (f.count / max) * 100;
                  const prev = funnel[i - 1];
                  const conv = i === 0 ? 100 : prev && prev.count > 0 ? (f.count / prev.count) * 100 : 0;
                  return (
                    <div key={f.key}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-medium">{f.label}</span>
                        <span className="text-muted-foreground">
                          {f.count.toLocaleString('en-IN')} · {conv.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-7 overflow-hidden rounded-md bg-muted">
                        <div
                          className="flex h-full items-center justify-end rounded-md pr-2 text-[11px] font-semibold text-white transition-all"
                          style={{ width: `${pct}%`, backgroundColor: FUNNEL_COLORS[f.key] ?? '#0B2758' }}
                        >
                          {pct.toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-xs">
                <span className="text-muted-foreground">Overall conversion</span>
                <span className="font-semibold text-success">{overallConversionPct}%</span>
              </div>
            </>
          ) : (
            <div className="flex h-[260px] items-center justify-center text-xs text-slate-400">
              No pipeline activity yet.
            </div>
          )}
        </Card>

        {/* Course-wise Conversion — real per-course conversion % from the dashboard. */}
        <Card className="border-border/70 bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="mb-4">
            <h2 className="text-base font-semibold">Course-wise Conversion</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Conversion % by program</p>
          </div>
          {coursePerformance.length > 0 ? (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={coursePerformance} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="courseTitle" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} unit="%" allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="conversionPct" name="Conversion %" radius={[6, 6, 0, 0]}>
                    {coursePerformance.map((row, i) => (
                      <Cell key={row.courseTitle} fill={COURSE_BAR_COLORS[i % COURSE_BAR_COLORS.length] ?? NAVY} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[260px] items-center justify-center text-xs text-slate-400">
              No pipeline activity yet.
            </div>
          )}
        </Card>
      </div>

      {/* Top Counsellors leaderboard (2/3) + Achievement Badges (1/3) */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="border-border/70 bg-card p-5 shadow-[var(--shadow-soft)] xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <Trophy className="h-4 w-4 text-warning" />
                Top Counsellors
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Team leaderboard</p>
            </div>
            <Badge variant="outline">Live</Badge>
          </div>
          {leaderboard.length > 0 ? (
            <div className="space-y-2">
              {leaderboard.map((c) => {
                const rankIcon =
                  c.rank === 1 ? (
                    <Crown className="h-4 w-4 text-warning" />
                  ) : c.rank === 2 ? (
                    <Medal className="h-4 w-4 text-muted-foreground" />
                  ) : c.rank === 3 ? (
                    <Award className="h-4 w-4 text-orange-500" />
                  ) : null;
                return (
                  <div
                    key={`${c.rank}-${c.name}`}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border p-3 transition-colors',
                      c.isCurrentUser
                        ? 'border-primary/40 bg-primary-soft/40 ring-1 ring-primary/20'
                        : c.rank <= 3
                          ? 'border-primary/20 bg-primary-soft/30'
                          : 'border-border hover:bg-muted/50',
                    )}
                  >
                    <div className="flex w-8 items-center justify-center gap-1 text-center text-sm font-bold tabular-nums">
                      {rankIcon || <span className="text-muted-foreground">{c.rank}</span>}
                    </div>
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary-soft text-xs font-semibold text-accent-foreground">
                        {c.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                        {c.name}
                        {c.isCurrentUser ? (
                          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                            You
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {c.points} pts · {c.admissions} admissions
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums">{c.achievementPct}%</p>
                      <Badge
                        variant="outline"
                        className={cn('mt-0.5 border text-[10px]', TIER_STYLES[c.tier] ?? TIER_STYLES.Bronze)}
                      >
                        {c.tier}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-[160px] items-center justify-center text-xs text-slate-400">
              No team data yet.
            </div>
          )}
        </Card>

        {/* Achievement Badges (3rd column) */}
        <Card className="border-border/70 bg-card p-5 shadow-[var(--shadow-soft)] xl:col-span-1">
          <div className="mb-4">
            <h2 className="text-base font-semibold">Achievement Badges</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Your earned rewards</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {badges.map((b) => (
              <div
                key={b.label}
                className="flex flex-col items-center rounded-lg border border-border bg-muted/30 p-3 text-center transition-colors hover:bg-muted/60"
              >
                <div
                  className={cn(
                    'mb-2 flex h-10 w-10 items-center justify-center rounded-full',
                    BADGE_TONE_CLASSES[b.tone],
                  )}
                >
                  <b.icon className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-medium">{b.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-border pt-4">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Next badge: Legend</span>
              <span className="font-semibold">{nextBadgePct}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-[image:var(--gradient-primary)]" style={{ width: `${nextBadgePct}%` }} />
            </div>
          </div>
        </Card>
      </div>

      {/* Performance Timeline */}
      <Card className="border-border/70 bg-card p-5 shadow-[var(--shadow-soft)]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Performance Timeline</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Monthly history &amp; comparison</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-primary" />
              Admissions
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-success" />
              Achievement %
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="h-[260px] lg:col-span-2">
            {hasTrend ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeline} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
                  <YAxis yAxisId="left" stroke="#64748b" fontSize={12} allowDecimals={false} />
                  <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={12} unit="%" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="applications"
                    name="Admissions"
                    stroke={NAVY}
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="achievementPct"
                    name="Achievement %"
                    stroke={SUCCESS}
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">
                No timeline data yet.
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground">This Month</p>
              <p className="mt-1 text-2xl font-bold">{thisMonth ? thisMonth.applications : 0}</p>
              <p className="text-xs text-muted-foreground">
                admissions · {thisMonth ? thisMonth.enrollments : 0} enrolled
              </p>
              {prevMonth ? (
                <div
                  className={cn(
                    'mt-2 inline-flex items-center gap-1 text-xs font-medium',
                    momUp ? 'text-success' : 'text-destructive',
                  )}
                >
                  {momUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {Math.abs(momDiff)}% vs last month
                </div>
              ) : null}
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs text-muted-foreground">Previous Month</p>
              <p className="mt-1 text-2xl font-bold">{prevMonth ? prevMonth.applications : 0}</p>
              <p className="text-xs text-muted-foreground">
                admissions · {prevMonth ? prevMonth.enrollments : 0} enrolled
              </p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs text-muted-foreground">6-Month Avg</p>
              <p className="mt-1 text-2xl font-bold">{avgAdmissions}</p>
              <p className="text-xs text-muted-foreground">admissions / month</p>
            </div>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Month</th>
                <th className="py-2 pr-4 font-medium">Target Point</th>
                <th className="py-2 pr-4 font-medium">Enrollments</th>
                <th className="py-2 pr-4 font-medium">Achievement</th>
                <th className="py-2 pr-4 font-medium">Trend</th>
              </tr>
            </thead>
            <tbody>
              {timeline.map((h, i) => {
                // Per-row MoM % vs the previous row's enrollments — em-dash on the first row.
                const prev = i > 0 ? timeline[i - 1] : undefined;
                const trendDiff =
                  prev && prev.enrollments > 0
                    ? Math.round(((h.enrollments - prev.enrollments) / prev.enrollments) * 1000) / 10
                    : 0;
                const trendUp = trendDiff >= 0;
                return (
                  <tr key={h.label} className="border-b border-border last:border-0">
                    <td className="py-3 pr-4 font-medium">{h.label}</td>
                    <td className="py-3 pr-4 tabular-nums">{targetPoint}</td>
                    <td className="py-3 pr-4 tabular-nums">{h.enrollments}</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn('h-full rounded-full', h.achievementPct >= 100 ? 'bg-success' : 'bg-primary')}
                            style={{ width: `${Math.min(100, h.achievementPct)}%` }}
                          />
                        </div>
                        <span className="text-xs tabular-nums">{h.achievementPct}%</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      {prev ? (
                        <span
                          className={cn(
                            'inline-flex items-center gap-0.5 text-xs font-medium',
                            trendUp ? 'text-success' : 'text-destructive',
                          )}
                        >
                          {trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          {Math.abs(trendDiff)}%
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
