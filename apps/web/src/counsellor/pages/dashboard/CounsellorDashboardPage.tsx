import { useMemo } from 'react';
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  FilePlus,
  FileText,
  GraduationCap,
  Percent,
  Target,
  Timer,
  TrendingUp,
  UserMinus,
  UserPlus,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import type { EChartsOption } from 'echarts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardLoader } from '@/components/ui/dashboard-loader';
import { EChart } from '@/components/EChart';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asNumber, asString, toRecords, formatDate } from '../../../admin/shared/utils/admin-data-utils.js';
import type { CounsellorPageProps } from '../../routing/counsellor-routes.js';
import { asRecord, KpiCard, type KpiCardProps, StageBadge, type TrendData } from '../../components/CounsellorWidgets.js';

// EXACT Lovable chart palette (indigo / teal / rainbow — not the brand navy/orange).
const INDIGO = '#4f46e5';
const TEAL = '#10b981';
const COURSE_COLORS = ['#4f46e5', '#10b981', '#eab308', '#a855f7', '#ef4444', '#3b82f6'];

const CARD = 'rounded-[14px] border border-cn-border/70 bg-white p-6 shadow-[var(--cn-shadow-soft)]';

/* ─── Target progress ring (SVG, indigo→violet) ─────────────── */

function TargetProgressRing({ target, achieved }: { target: number; achieved: number }) {
  const pct = target > 0 ? Math.min(100, Math.round((achieved / target) * 100)) : 0;
  const remaining = Math.max(0, target - achieved);
  const radius = 78;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  return (
    <div className={CARD}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Target Progress</h3>
          <p className="text-xs text-cn-muted-fg">Current target window</p>
        </div>
        <div className="flex size-9 items-center justify-center rounded-lg bg-cn-orange-soft text-cn-orange-fg">
          <Target className="size-4" />
        </div>
      </div>
      <div className="mt-6 flex flex-col items-center">
        <div className="relative size-48">
          <svg className="-rotate-90" viewBox="0 0 200 200" width="100%" height="100%">
            <circle cx="100" cy="100" r={radius} strokeWidth="14" className="stroke-slate-100" fill="none" />
            <circle
              cx="100"
              cy="100"
              r={radius}
              strokeWidth="14"
              strokeLinecap="round"
              stroke="url(#cn-target-grad)"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 1s ease' }}
            />
            <defs>
              <linearGradient id="cn-target-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#7c3aed" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-3xl font-bold text-slate-900">{pct}%</p>
            <p className="text-xs text-cn-muted-fg">Achieved</p>
          </div>
        </div>
        <div className="mt-6 grid w-full grid-cols-3 gap-2 text-center">
          <RingStat label="Target" value={target.toLocaleString('en-IN')} />
          <RingStat label="Achieved" value={achieved.toLocaleString('en-IN')} accent />
          <RingStat label="Remaining" value={remaining.toLocaleString('en-IN')} />
        </div>
      </div>
    </div>
  );
}

function RingStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg bg-slate-50 py-2">
      <p className="text-[11px] uppercase tracking-wide text-cn-muted-fg">{label}</p>
      <p className={`text-sm font-bold ${accent ? 'text-cn-orange-fg' : 'text-slate-900'}`}>{value}</p>
    </div>
  );
}

/* ─── Admissions analytics (area chart + conversion badge) ──── */

function ChartLegend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-cn-muted-fg">
      <span className="size-2.5 rounded-full" style={{ background: color }} />
      {label}
    </div>
  );
}

function AdmissionsAnalytics({ trend, conversionPct, hasData }: { trend: TrendData; conversionPct: number; hasData: boolean }) {
  const option = useMemo<EChartsOption>(
    () => ({
      grid: { left: 36, right: 12, top: 12, bottom: 24, containLabel: true },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#ffffff',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        textStyle: { color: '#0f172a', fontSize: 12 },
        extraCssText: 'border-radius:12px;box-shadow:0 8px 24px rgba(15,23,42,0.08);',
      },
      xAxis: {
        type: 'category',
        data: trend.labels,
        boundaryGap: false,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#64748b', fontSize: 12 },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        splitLine: { lineStyle: { color: '#eef2f7', type: 'dashed' } },
        axisLabel: { color: '#64748b', fontSize: 12 },
      },
      series: [
        {
          name: 'Applications',
          type: 'line',
          data: trend.applications,
          smooth: true,
          symbol: 'none',
          lineStyle: { color: INDIGO, width: 2.5 },
          areaStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [{ offset: 0, color: 'rgba(79,70,229,0.35)' }, { offset: 1, color: 'rgba(79,70,229,0)' }],
            },
          },
        },
        {
          name: 'Enrollments',
          type: 'line',
          data: trend.enrollments,
          smooth: true,
          symbol: 'none',
          lineStyle: { color: TEAL, width: 2.5 },
          areaStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [{ offset: 0, color: 'rgba(16,185,129,0.35)' }, { offset: 1, color: 'rgba(16,185,129,0)' }],
            },
          },
        },
      ],
    }),
    [trend],
  );
  return (
    <div className={CARD}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Admissions Analytics</h3>
          <p className="text-xs text-cn-muted-fg">Applications vs Enrollments · last 6 months</p>
        </div>
        <div className="flex items-center gap-4">
          <ChartLegend color={INDIGO} label="Applications" />
          <ChartLegend color={TEAL} label="Enrollments" />
          <div className="rounded-lg bg-cn-success-soft px-3 py-1.5 text-xs font-semibold text-cn-success">
            {conversionPct}% Conversion
          </div>
        </div>
      </div>
      <div className="mt-6 h-72">
        {hasData ? (
          <EChart option={option} className="h-full w-full" ariaLabel="Admissions analytics" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">No admissions data yet.</div>
        )}
      </div>
    </div>
  );
}

/* ─── Course performance (rainbow bar chart + top-3 list) ────── */

interface CoursePerfRow {
  courseTitle: string;
  applications: number;
  enrollments: number;
  conversionPct: number;
}

function CoursePerformance({ rows }: { rows: CoursePerfRow[] }) {
  const total = rows.reduce((sum, r) => sum + r.applications, 0);
  const option = useMemo<EChartsOption>(
    () => ({
      grid: { left: 28, right: 8, top: 8, bottom: 24, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(148,163,184,0.12)' } },
        backgroundColor: '#ffffff',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        textStyle: { color: '#0f172a', fontSize: 12 },
        extraCssText: 'border-radius:12px;',
      },
      xAxis: {
        type: 'category',
        data: rows.map((r) => r.courseTitle),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#64748b', fontSize: 11, interval: 0, formatter: (v: string) => (v.length > 10 ? `${v.slice(0, 9)}…` : v) },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        splitLine: { lineStyle: { color: '#eef2f7', type: 'dashed' } },
        axisLabel: { color: '#64748b', fontSize: 11 },
      },
      series: [
        {
          type: 'bar',
          data: rows.map((r, i) => ({ value: r.applications, itemStyle: { color: COURSE_COLORS[i % COURSE_COLORS.length] ?? INDIGO, borderRadius: [8, 8, 0, 0] } })),
          barMaxWidth: 34,
        },
      ],
    }),
    [rows],
  );
  return (
    <div className={CARD}>
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Course Performance</h3>
        <p className="text-xs text-cn-muted-fg">Applications by course</p>
      </div>
      {rows.length === 0 ? (
        <p className="py-12 text-center text-xs text-slate-400">No course activity yet.</p>
      ) : (
        <>
          <div className="mt-4 h-56">
            <EChart option={option} className="h-full w-full" ariaLabel="Course performance" />
          </div>
          <div className="mt-4 space-y-2">
            {rows.slice(0, 3).map((r, i) => (
              <div key={r.courseTitle} className="flex items-center gap-3">
                <span className="size-2.5 rounded-full" style={{ background: COURSE_COLORS[i % COURSE_COLORS.length] }} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700" title={r.courseTitle}>{r.courseTitle}</span>
                <span className="text-sm font-semibold text-slate-900">{r.applications}</span>
                <span className="w-12 text-right text-xs text-cn-muted-fg">{total > 0 ? Math.round((r.applications / total) * 100) : 0}%</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Recent activity feed ──────────────────────────────────── */

function activityVisual(type: string, title: string): { Icon: LucideIcon; tone: string } {
  const s = `${type} ${title}`.toLowerCase();
  if (s.includes('paid') || s.includes('payment')) return { Icon: CreditCard, tone: 'bg-cn-warning-soft text-amber-700' };
  if (s.includes('approv') || s.includes('enrol')) return { Icon: CheckCircle2, tone: 'bg-cn-success-soft text-cn-success' };
  if (s.includes('reject')) return { Icon: XCircle, tone: 'bg-cn-destructive-soft text-cn-destructive' };
  if (s.includes('form')) return { Icon: FileText, tone: 'bg-cn-info-soft text-cn-info' };
  if (s.includes('link')) return { Icon: FilePlus, tone: 'bg-cn-orange-soft text-cn-orange-fg' };
  if (s.includes('lead') || s.includes('creat')) return { Icon: UserPlus, tone: 'bg-cn-orange-soft text-cn-orange-fg' };
  return { Icon: Activity, tone: 'bg-slate-100 text-slate-600' };
}

function relativeTime(iso: string): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const min = Math.floor((Date.now() - t) / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} day${day === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function RecentActivity({ items }: { items: Record<string, unknown>[] }) {
  return (
    <div className={CARD}>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-900">Recent Activity</h3>
        <p className="text-xs text-cn-muted-fg">Your latest actions across the CRM</p>
      </div>
      {items.length === 0 ? (
        <p className="py-8 text-center text-xs text-slate-400">No recent activity yet.</p>
      ) : (
        <ul className="space-y-4">
          {items.map((it) => {
            const { Icon, tone } = activityVisual(asString(it.type), asString(it.title));
            return (
              <li key={asString(it.id)} className="flex items-start gap-3">
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${tone}`}>
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-slate-800">{asString(it.title)}</p>
                    <span className="whitespace-nowrap text-xs text-cn-muted-fg">{relativeTime(asString(it.createdAt))}</span>
                  </div>
                  <p className="truncate text-xs text-cn-muted-fg">{asString(it.detail)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ─── Pipeline snapshot ─────────────────────────────────────── */

function SnapshotTable({ rows }: { rows: Record<string, unknown>[] }) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-xs text-slate-400">No applications in this stage.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-cn-muted-fg">
            <th className="py-2 pr-3 font-medium">Application ID</th>
            <th className="py-2 pr-3 font-medium">Applicant</th>
            <th className="py-2 pr-3 font-medium">Course</th>
            <th className="py-2 pr-3 font-medium">Date</th>
            <th className="py-2 font-medium">Stage</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={asString(row.id)} className="border-b border-slate-50 last:border-0">
              <td className="py-2.5 pr-3 font-mono text-xs text-cn-muted-fg">{asString(row.applicationId)}</td>
              <td className="py-2.5 pr-3 font-medium text-slate-700">{asString(row.name)}</td>
              <td className="py-2.5 pr-3 text-cn-muted-fg">{asString(row.course)}</td>
              <td className="py-2.5 pr-3 text-cn-muted-fg">{formatDate(row.date)}</td>
              <td className="py-2.5"><StageBadge stage={asString(row.stage)} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────── */

export default function CounsellorDashboardPage({ api, session }: CounsellorPageProps) {
  const { data, loading, error } = useAdminPageData(
    () => api.loadCounsellorDashboard(session.token),
    [api, session.token],
  );

  const kpis = useMemo(() => asRecord(asRecord(data).kpis), [data]);
  const trend = useMemo<TrendData>(() => {
    const t = asRecord(asRecord(data).admissionsTrend);
    const toNums = (v: unknown): number[] => (Array.isArray(v) ? v.map((x) => asNumber(x)) : []);
    return {
      labels: Array.isArray(t.labels) ? t.labels.map((x) => asString(x)) : [],
      applications: toNums(t.applications),
      enrollments: toNums(t.enrollments),
    };
  }, [data]);
  const coursePerformance = useMemo<CoursePerfRow[]>(
    () =>
      toRecords(asRecord(data).coursePerformance).map((r) => ({
        courseTitle: asString(r.courseTitle) || '—',
        applications: asNumber(r.applications),
        enrollments: asNumber(r.enrollments),
        conversionPct: asNumber(r.conversionPct),
      })),
    [data],
  );
  const snapshot = useMemo(() => asRecord(asRecord(data).pipelineSnapshot), [data]);
  const paymentPending = useMemo(() => toRecords(snapshot.paymentPending), [snapshot]);
  const formPending = useMemo(() => toRecords(snapshot.formPending), [snapshot]);
  const approvalWaiting = useMemo(() => toRecords(snapshot.approvalWaiting), [snapshot]);
  const recentActivity = useMemo(() => toRecords(asRecord(data).recentActivity), [data]);

  if (loading) return <DashboardLoader label="counsellor dashboard" />;

  if (error) {
    return (
      <div className={CARD}>
        <p role="alert" className="py-8 text-center text-sm text-red-600">{error}</p>
      </div>
    );
  }

  const targetPoint = asNumber(kpis.monthlyTargetPoint);
  const achieved = asNumber(kpis.targetAchieved);
  const achievementPct = asNumber(kpis.achievementPct);
  const totalApps = asNumber(kpis.totalApplications);
  const totalEnroll = asNumber(kpis.totalEnrollments);
  const conversionPct = totalApps > 0 ? Math.round((totalEnroll / totalApps) * 100) : 0;
  const hasTrend = trend.applications.some((n) => n > 0) || trend.enrollments.some((n) => n > 0);

  const targetCards: KpiCardProps[] = [
    { label: 'Monthly Target Point', value: targetPoint.toLocaleString('en-IN'), icon: Target, tone: 'primary', sub: 'Current target window', progress: achievementPct },
    { label: 'Target Achieved', value: achieved.toLocaleString('en-IN'), icon: TrendingUp, tone: 'success', sub: `${Math.max(0, targetPoint - achieved).toLocaleString('en-IN')} to go`, progress: achievementPct },
    { label: 'Achievement %', value: `${achievementPct}%`, icon: Percent, tone: 'info', sub: 'Of target window', progress: achievementPct },
    { label: 'Year to Date', value: asNumber(kpis.ytd).toLocaleString('en-IN'), icon: CalendarDays, tone: 'primary', sub: 'Applications this year' },
  ];
  const countCards: KpiCardProps[] = [
    { label: 'Total Applications', value: totalApps.toLocaleString('en-IN'), icon: ClipboardList, tone: 'info', sub: 'All time' },
    { label: 'Total Enrollments', value: totalEnroll.toLocaleString('en-IN'), icon: GraduationCap, tone: 'success', sub: `${conversionPct}% conversion` },
    { label: 'Pending Applications', value: asNumber(kpis.pendingApplications).toLocaleString('en-IN'), icon: Timer, tone: 'warning', sub: 'Awaiting action' },
    { label: 'Total Dropouts', value: asNumber(kpis.totalDropouts).toLocaleString('en-IN'), icon: UserMinus, tone: 'primary', sub: 'Among your students' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {targetCards.map((c) => <KpiCard key={c.label} {...c} />)}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {countCards.map((c) => <KpiCard key={c.label} {...c} />)}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <TargetProgressRing target={targetPoint} achieved={achieved} />
        <div className="lg:col-span-2">
          <AdmissionsAnalytics trend={trend} conversionPct={conversionPct} hasData={hasTrend} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CoursePerformance rows={coursePerformance} />
        </div>
        <RecentActivity items={recentActivity} />
      </div>

      <div className={CARD}>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-900">Application Pipeline Snapshot</h3>
          <p className="text-xs text-cn-muted-fg">Pending payments, forms and approvals</p>
        </div>
        <Tabs defaultValue="payment">
          <TabsList className="bg-slate-100/70">
            <TabsTrigger value="payment">Pending Payment ({paymentPending.length})</TabsTrigger>
            <TabsTrigger value="form">Form Pending ({formPending.length})</TabsTrigger>
            <TabsTrigger value="approval">Approval Waiting ({approvalWaiting.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="payment" className="mt-4"><SnapshotTable rows={paymentPending} /></TabsContent>
          <TabsContent value="form" className="mt-4"><SnapshotTable rows={formPending} /></TabsContent>
          <TabsContent value="approval" className="mt-4"><SnapshotTable rows={approvalWaiting} /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
