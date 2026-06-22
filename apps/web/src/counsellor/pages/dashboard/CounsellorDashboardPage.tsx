import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  FileText,
  GraduationCap,
  Percent,
  PhoneCall,
  Target,
  Timer,
  TrendingUp,
  UserMinus,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DashboardLoader } from '@/components/ui/dashboard-loader';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asNumber, asString, toRecords } from '../../../admin/shared/utils/admin-data-utils.js';
import type { CounsellorPageProps } from '../../routing/counsellor-routes.js';
import { KpiCard } from '../../components/CounsellorWidgets.js';

// EXACT Lovable chart palette — oklch substituted with hex (per the brief).
const INDIGO = '#4f46e5';
const TEAL = '#10b981';
const COURSE_COLORS = ['#4f46e5', '#10b981', '#eab308', '#a855f7', '#ef4444', '#3b82f6'];
const GRID = '#e2e8f0';
const AXIS = '#64748b';

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

/* ─── Target progress ring (SVG, indigo→violet gradient) ────── */

function TargetProgress({ target, achieved }: { target: number; achieved: number }) {
  const pct = target > 0 ? Math.round((achieved / target) * 100) : 0;
  const remaining = Math.max(0, target - achieved);
  const radius = 78;
  const c = 2 * Math.PI * radius;
  const offset = c - (Math.min(100, pct) / 100) * c;
  return (
    <Card className="p-6 shadow-[var(--shadow-soft)] border-border/70">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Target Progress</h3>
          <p className="text-xs text-muted-foreground">Current target window</p>
        </div>
        <div className="h-9 w-9 rounded-lg bg-primary-soft text-accent-foreground flex items-center justify-center">
          <Target className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-6 flex flex-col items-center">
        <div className="relative h-48 w-48">
          <svg className="-rotate-90" viewBox="0 0 200 200" width="100%" height="100%">
            <circle cx="100" cy="100" r={radius} strokeWidth="14" className="stroke-muted" fill="none" />
            <circle
              cx="100"
              cy="100"
              r={radius}
              strokeWidth="14"
              strokeLinecap="round"
              stroke="url(#tg)"
              fill="none"
              strokeDasharray={c}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 1s ease' }}
            />
            <defs>
              <linearGradient id="tg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={INDIGO} />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-3xl font-bold">{pct}%</p>
            <p className="text-xs text-muted-foreground">Achieved</p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-3 w-full gap-2 text-center">
          <TargetStat label="Target" value={target.toLocaleString()} />
          <TargetStat label="Achieved" value={achieved.toLocaleString()} accent />
          <TargetStat label="Remaining" value={remaining.toLocaleString()} />
        </div>
      </div>
    </Card>
  );
}

function TargetStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg bg-muted/50 py-2">
      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={'text-sm font-bold ' + (accent ? 'text-primary' : '')}>{value}</p>
    </div>
  );
}

/* ─── Admissions analytics (area chart) ─────────────────────── */

interface TrendPoint {
  m: string;
  applications: number;
  enrollments: number;
}

function AdmissionsChart({ data }: { data: TrendPoint[] }) {
  const last = data.length > 0 ? data[data.length - 1] : undefined;
  const conv =
    last && last.applications > 0 ? Math.round((last.enrollments / last.applications) * 100) : 0;
  return (
    <Card className="p-6 shadow-[var(--shadow-soft)] border-border/70">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Admissions Analytics</h3>
          <p className="text-xs text-muted-foreground">Applications vs Enrollments</p>
        </div>
        <div className="flex items-center gap-4">
          <ChartLegend color={INDIGO} label="Applications" />
          <ChartLegend color={TEAL} label="Enrollments" />
          <div className="rounded-lg bg-success-soft text-success px-3 py-1.5 text-xs font-semibold">
            {conv}% Conversion
          </div>
        </div>
      </div>
      <div className="mt-6 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={INDIGO} stopOpacity={0.35} />
                <stop offset="100%" stopColor={INDIGO} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={TEAL} stopOpacity={0.35} />
                <stop offset="100%" stopColor={TEAL} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
            <XAxis dataKey="m" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: AXIS }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: AXIS }} />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: `1px solid ${GRID}`,
                boxShadow: '0 8px 24px rgba(15,39,88,0.08)',
                fontSize: 12,
              }}
            />
            <Area type="monotone" dataKey="applications" stroke={INDIGO} strokeWidth={2.5} fill="url(#g1)" />
            <Area type="monotone" dataKey="enrollments" stroke={TEAL} strokeWidth={2.5} fill="url(#g2)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function ChartLegend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {label}
    </div>
  );
}

/* ─── Course performance (bar chart + top-3 list) ───────────── */

interface CourseRow {
  course: string;
  admissions: number;
}

function CoursePerformance({ data }: { data: CourseRow[] }) {
  const total = data.reduce((a, b) => a + b.admissions, 0);
  return (
    <Card className="p-6 shadow-[var(--shadow-soft)] border-border/70">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Course Performance</h3>
          <p className="text-xs text-muted-foreground">Admissions by course</p>
        </div>
      </div>
      <div className="mt-4 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <XAxis dataKey="course" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: AXIS }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: AXIS }} />
            <Tooltip
              cursor={{ fill: '#f1f5f9' }}
              contentStyle={{ borderRadius: 12, border: `1px solid ${GRID}`, fontSize: 12 }}
            />
            <Bar dataKey="admissions" radius={[8, 8, 0, 0]}>
              {data.map((row, i) => (
                <Cell key={row.course} fill={COURSE_COLORS[i % COURSE_COLORS.length] ?? INDIGO} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 space-y-2">
        {data.slice(0, 3).map((c, i) => (
          <div key={c.course} className="flex items-center gap-3">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: COURSE_COLORS[i % COURSE_COLORS.length] ?? INDIGO }}
            />
            <span className="text-sm font-medium flex-1">{c.course}</span>
            <span className="text-sm font-semibold">{c.admissions}</span>
            <span className="text-xs text-muted-foreground w-12 text-right">
              {total > 0 ? Math.round((c.admissions / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ─── Recent activity feed (prototype's "QuickActions") ─────── */

interface ActivityRow {
  id: string;
  type: string;
  title: string;
  detail: string;
  createdAt: string;
}

const activityIconByType: Record<string, { icon: LucideIcon; tone: string }> = {
  created: { icon: FileText, tone: 'bg-primary-soft text-accent-foreground' },
  application_created: { icon: FileText, tone: 'bg-primary-soft text-accent-foreground' },
  lead_created: { icon: UserPlus, tone: 'bg-primary-soft text-accent-foreground' },
  link_sent: { icon: CreditCard, tone: 'bg-warning-soft text-warning-foreground' },
  payment_link_sent: { icon: CreditCard, tone: 'bg-warning-soft text-warning-foreground' },
  marked_paid: { icon: CreditCard, tone: 'bg-success-soft text-success' },
  payment_received: { icon: CreditCard, tone: 'bg-success-soft text-success' },
  form_submitted: { icon: FileText, tone: 'bg-info-soft text-info' },
  approved: { icon: CheckCircle2, tone: 'bg-success-soft text-success' },
  rejected: { icon: UserMinus, tone: 'bg-destructive-soft text-destructive' },
  follow_up: { icon: PhoneCall, tone: 'bg-info-soft text-info' },
};

function activityIcon(type: string): { icon: LucideIcon; tone: string } {
  return activityIconByType[type] ?? { icon: FileText, tone: 'bg-muted text-foreground' };
}

function relativeTime(iso: string): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Math.max(0, Date.now() - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

function RecentActivity({ activities }: { activities: ActivityRow[] }) {
  return (
    <Card className="p-6 shadow-[var(--shadow-soft)] border-border/70">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold">Recent Activity</h3>
          <p className="text-xs text-muted-foreground">Your latest actions across the CRM</p>
        </div>
      </div>
      {activities.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">No recent activity yet.</p>
      ) : (
        <ul className="space-y-4">
          {activities.map((a) => {
            const { icon: Icon, tone } = activityIcon(a.type);
            return (
              <li key={a.id} className="flex items-start gap-3">
                <span className={`h-9 w-9 shrink-0 rounded-lg flex items-center justify-center ${tone}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">{a.title}</p>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {relativeTime(a.createdAt)}
                    </span>
                  </div>
                  {a.detail ? <p className="text-xs text-muted-foreground truncate">{a.detail}</p> : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/* ─── Pipeline snapshot tabs (prototype's "RecentTables") ───── */

interface PipelineRow {
  id: string;
  applicationId: string;
  name: string;
  course: string;
  date: string;
  stage: string;
}

const stageStyles: Record<string, string> = {
  payment_pending: 'text-warning-foreground border-warning/40 bg-warning-soft',
  form_pending: 'text-info border-info/40 bg-info-soft',
  approval_waiting: 'text-accent-foreground border-primary/40 bg-primary-soft',
};

const stageLabel: Record<string, string> = {
  payment_pending: 'Payment Pending',
  form_pending: 'Form Pending',
  approval_waiting: 'Approval Waiting',
};

function StageBadge({ stage }: { stage: string }) {
  return (
    <Badge variant="outline" className={stageStyles[stage] ?? 'text-muted-foreground'}>
      {stageLabel[stage] ?? stage}
    </Badge>
  );
}

function snapshotDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function PipelineTable({ rows }: { rows: PipelineRow[] }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Application ID</TableHead>
            <TableHead>Applicant</TableHead>
            <TableHead>Course</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Stage</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                No applications in this stage
              </TableCell>
            </TableRow>
          ) : (
            rows.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-mono text-xs">{a.applicationId}</TableCell>
                <TableCell className="font-medium">{a.name}</TableCell>
                <TableCell className="text-muted-foreground">{a.course}</TableCell>
                <TableCell className="text-muted-foreground">{snapshotDate(a.date)}</TableCell>
                <TableCell>
                  <StageBadge stage={a.stage} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function RecentTables({
  paymentPending,
  formPending,
  approvalWaiting,
}: {
  paymentPending: PipelineRow[];
  formPending: PipelineRow[];
  approvalWaiting: PipelineRow[];
}) {
  return (
    <Card className="p-6 shadow-[var(--shadow-soft)] border-border/70">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold">Application Pipeline Snapshot</h3>
          <p className="text-xs text-muted-foreground">
            Quick view of pending payments, forms and approvals
          </p>
        </div>
      </div>
      <Tabs defaultValue="payment">
        <TabsList className="bg-muted/60">
          <TabsTrigger value="payment">Pending Payment ({paymentPending.length})</TabsTrigger>
          <TabsTrigger value="form">Application Form Pending ({formPending.length})</TabsTrigger>
          <TabsTrigger value="approval">Approval Waiting ({approvalWaiting.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="payment" className="mt-4">
          <PipelineTable rows={paymentPending} />
        </TabsContent>
        <TabsContent value="form" className="mt-4">
          <PipelineTable rows={formPending} />
        </TabsContent>
        <TabsContent value="approval" className="mt-4">
          <PipelineTable rows={approvalWaiting} />
        </TabsContent>
      </Tabs>
    </Card>
  );
}

/* ─── Data mapping helpers ──────────────────────────────────── */

function toPipelineRows(value: unknown): PipelineRow[] {
  return toRecords(value).map((row) => ({
    id: asString(row.id),
    applicationId: asString(row.applicationId),
    name: asString(row.name) || '—',
    course: asString(row.course) || '—',
    date: asString(row.date),
    stage: asString(row.stage),
  }));
}

/* ─── Page ──────────────────────────────────────────────────── */

export default function CounsellorDashboardPage({ api, session }: CounsellorPageProps) {
  const { data, loading, error } = useAdminPageData(
    () => api.loadCounsellorDashboard(session.token),
    [api, session.token],
  );

  const view = useMemo(() => {
    const root = asRecord(data);
    const kpis = asRecord(root.kpis);
    const trend = asRecord(root.admissionsTrend);

    const labels = Array.isArray(trend.labels) ? trend.labels : [];
    const trendApps = Array.isArray(trend.applications) ? trend.applications : [];
    const trendEnr = Array.isArray(trend.enrollments) ? trend.enrollments : [];
    const trendData: TrendPoint[] = labels.map((label, i) => ({
      m: asString(label),
      applications: asNumber(trendApps[i]),
      enrollments: asNumber(trendEnr[i]),
    }));

    const courseData: CourseRow[] = toRecords(root.coursePerformance).map((row) => ({
      course: asString(row.courseTitle) || '—',
      admissions: asNumber(row.enrollments),
    }));

    const pipeline = asRecord(root.pipelineSnapshot);
    const activities: ActivityRow[] = toRecords(root.recentActivity).map((row) => ({
      id: asString(row.id),
      type: asString(row.type),
      title: asString(row.title) || 'Activity',
      detail: asString(row.detail),
      createdAt: asString(row.createdAt),
    }));

    return {
      monthlyTargetPoint: asNumber(kpis.monthlyTargetPoint),
      targetAchieved: asNumber(kpis.targetAchieved),
      achievementPct: asNumber(kpis.achievementPct),
      ytd: asNumber(kpis.ytd),
      totalApplications: asNumber(kpis.totalApplications),
      totalEnrollments: asNumber(kpis.totalEnrollments),
      pendingApplications: asNumber(kpis.pendingApplications),
      totalDropouts: asNumber(kpis.totalDropouts),
      trendData,
      courseData,
      activities,
      paymentPending: toPipelineRows(pipeline.paymentPending),
      formPending: toPipelineRows(pipeline.formPending),
      approvalWaiting: toPipelineRows(pipeline.approvalWaiting),
    };
  }, [data]);

  if (loading) {
    return <DashboardLoader />;
  }

  if (error) {
    return (
      <div className="p-4 lg:p-8">
        <Card className="p-6 shadow-[var(--shadow-soft)] border-border/70">
          <p className="text-sm font-semibold text-destructive">Failed to load dashboard</p>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
        </Card>
      </div>
    );
  }

  const conversionPct =
    view.totalApplications > 0
      ? Math.round((view.totalEnrollments / view.totalApplications) * 100)
      : 0;
  const remainingPoints = Math.max(0, view.monthlyTargetPoint - view.targetAchieved);
  const targetPct =
    view.monthlyTargetPoint > 0
      ? Math.min(100, Math.round((view.targetAchieved / view.monthlyTargetPoint) * 100))
      : 0;

  return (
    <main className="flex-1 p-4 lg:p-8 space-y-6">
      {/* KPIs Row 1 */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Monthly Target Point"
          value={view.monthlyTargetPoint.toLocaleString()}
          icon={Target}
          tone="primary"
          progress={100}
          sub="Goal for the current window"
        />
        <KpiCard
          label="Target Achieved"
          value={view.targetAchieved.toLocaleString()}
          icon={TrendingUp}
          tone="success"
          progress={targetPct}
          sub={`${remainingPoints.toLocaleString()} points to go`}
        />
        <KpiCard
          label="Achievement %"
          value={`${view.achievementPct}%`}
          icon={Percent}
          tone="info"
          progress={view.achievementPct}
        />
        <KpiCard
          label="YTD"
          value={view.ytd.toLocaleString()}
          icon={CalendarDays}
          tone="primary"
          sub="Year-to-date applications"
        />
      </div>

      {/* KPIs Row 2 */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total Applications"
          value={view.totalApplications.toLocaleString()}
          icon={ClipboardList}
          tone="info"
        />
        <KpiCard
          label="Total Enrollments"
          value={view.totalEnrollments.toLocaleString()}
          icon={GraduationCap}
          tone="success"
          progress={conversionPct}
          sub={`${conversionPct}% conversion`}
        />
        <KpiCard
          label="Pending Applications"
          value={view.pendingApplications.toLocaleString()}
          icon={Timer}
          tone="warning"
        />
        <KpiCard
          label="Total Dropouts"
          value={view.totalDropouts.toLocaleString()}
          icon={UserMinus}
          tone="primary"
        />
      </div>

      {/* Mid grid */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <TargetProgress target={view.monthlyTargetPoint} achieved={view.targetAchieved} />
        <div className="lg:col-span-2">
          <AdmissionsChart data={view.trendData} />
        </div>
      </div>

      {/* Course + Recent activity */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CoursePerformance data={view.courseData} />
        </div>
        <RecentActivity activities={view.activities} />
      </div>

      {/* Pipeline snapshot */}
      <RecentTables
        paymentPending={view.paymentPending}
        formPending={view.formPending}
        approvalWaiting={view.approvalWaiting}
      />
    </main>
  );
}
