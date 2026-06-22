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
  Rocket,
  Star,
  Gem,
  ArrowUpRight,
  ArrowDownRight,
  type LucideIcon,
} from 'lucide-react';
import {
  Area,
  Bar,
  CartesianGrid,
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

// EXACT Lovable chart palette (hex substitutes for the prototype's oklch).
const ORANGE = '#F47C2C';

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

interface AchievementBadge {
  label: string;
  icon: LucideIcon;
  tone: BadgeTone;
  earned: boolean;
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
        <Card className="rounded-[14px] border-border/70 bg-card shadow-[var(--shadow-soft)]">
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
  const periodLabel =
    trend.labels.length > 0 ? `${trend.labels[0]} – ${trend.labels[trend.labels.length - 1]}` : '—';

  // Real month-over-month deltas from the dashboard payload — attach only where
  // a genuine value exists (never fabricated).
  const enrollDelta = asNumber(deltas.totalEnrollments);
  const appsDelta = asNumber(deltas.totalApplications);
  const hasEnrollDelta = 'totalEnrollments' in deltas;
  const hasAppsDelta = 'totalApplications' in deltas;

  const cards: KpiCardProps[] = [
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
    { label: 'Achievement %', value: `${achievementPct}%`, icon: TrendingUp, tone: 'info', sub: 'Of current target', progress: achievementPct },
    {
      label: 'Current Enrollments',
      value: totalEnrollments.toLocaleString('en-IN'),
      icon: Trophy,
      tone: 'success',
      sub: 'Converted to enrolment',
      progress: achievementPct,
      ...(hasEnrollDelta ? { delta: enrollDelta } : {}),
    },
    { label: 'Applications — YTD', value: ytd.toLocaleString('en-IN'), icon: Award, tone: 'primary', sub: 'Year to date', progress: 100 },
  ];

  // Achievement badges — earned/locked derived from REAL milestones only.
  const badges: AchievementBadge[] = [
    { label: 'First Enrolment', icon: Star, tone: 'info', earned: totalEnrollments >= 1 },
    { label: '10 Enrolments', icon: Rocket, tone: 'primary', earned: totalEnrollments >= 10 },
    { label: '50 Enrolments', icon: Medal, tone: 'info', earned: totalEnrollments >= 50 },
    { label: 'Centurion', icon: Gem, tone: 'success', earned: totalEnrollments >= 100 },
    { label: 'Target Hit', icon: Trophy, tone: 'warning', earned: achievementPct >= 100 },
    { label: 'On Track', icon: Flame, tone: 'warning', earned: onTrack },
  ];
  const earnedCount = badges.filter((b) => b.earned).length;
  const earnedPct = Math.round((earnedCount / badges.length) * 100);

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
            {periodLabel}
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
      <Card className="rounded-[14px] border-border/70 bg-card p-5 shadow-[var(--shadow-soft)]">
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
                    <stop offset="0%" stopColor={ORANGE} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={ORANGE} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="target" name="Target" fill="hsl(var(--muted))" radius={[6, 6, 0, 0]} barSize={20} />
                <Area
                  type="monotone"
                  dataKey="achieved"
                  name="Achieved"
                  stroke={ORANGE}
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
        <Card className="rounded-[14px] border-border/70 bg-card p-5 shadow-[var(--shadow-soft)]">
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

        {/* Top Counsellors — placed here in the 2-col row's second slot below */}
        <Card className="rounded-[14px] border-border/70 bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="mb-4">
            <h2 className="text-base font-semibold">Achievement Badges</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Your earned rewards</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {badges.map((b) => (
              <div
                key={b.label}
                className={cn(
                  'flex flex-col items-center rounded-lg border p-3 text-center transition-colors',
                  b.earned ? 'border-border bg-muted/30 hover:bg-muted/60' : 'border-border/60 bg-muted/10 opacity-50',
                )}
              >
                <div
                  className={cn(
                    'mb-2 flex h-10 w-10 items-center justify-center rounded-full',
                    b.earned ? BADGE_TONE_CLASSES[b.tone] : 'bg-muted text-muted-foreground',
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
              <span className="text-muted-foreground">Badges earned</span>
              <span className="font-semibold">
                {earnedCount}/{badges.length}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-[image:var(--gradient-primary)]" style={{ width: `${earnedPct}%` }} />
            </div>
          </div>
        </Card>
      </div>

      {/* Top Counsellors leaderboard */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="rounded-[14px] border-border/70 bg-card p-5 shadow-[var(--shadow-soft)] xl:col-span-3">
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
      </div>

      {/* Performance Timeline */}
      <Card className="rounded-[14px] border-border/70 bg-card p-5 shadow-[var(--shadow-soft)]">
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
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="achievementPct"
                    name="Achievement %"
                    stroke="hsl(var(--success))"
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
                <th className="py-2 pr-4 font-medium">Applications</th>
                <th className="py-2 pr-4 font-medium">Enrollments</th>
                <th className="py-2 pr-4 font-medium">Achievement</th>
              </tr>
            </thead>
            <tbody>
              {timeline.map((h) => (
                <tr key={h.label} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4 font-medium">{h.label}</td>
                  <td className="py-3 pr-4 tabular-nums">{h.applications}</td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
