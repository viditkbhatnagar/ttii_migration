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
import { FileText, GraduationCap, Percent, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
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
import { asString, formatDate } from '../../../admin/shared/utils/admin-data-utils.js';
import { KpiCard, StageBadge } from '../../../counsellor/components/CounsellorWidgets.js';
import type { AssociatePageProps } from '../../routing/associate-routes.js';

// Counsellor Lovable chart palette (recharts) — navy + orange, course accents.
const NAVY = '#0B2758';
const ORANGE = '#F47C2C';
const COURSE_COLORS = ['#0B2758', '#F47C2C', '#4f46e5', '#10b981', '#eab308', '#a855f7'];
const GRID = '#e2e8f0';
const AXIS = '#64748b';

const CONVERTED_STATUSES = new Set(['converted', 'enrolled']);

interface TrendPoint {
  m: string;
  referrals: number;
  conversions: number;
}

interface CourseRow {
  course: string;
  referrals: number;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function parseDate(value: unknown): Date | null {
  const s = asString(value);
  if (s === '') return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Derive a rolling 6-month referrals-vs-conversions trend from the associate's
// own application rows (created_at + status). No backend trend endpoint exists
// for associates, so this is computed client-side from the scoped data.
function buildTrend(applications: Record<string, unknown>[]): TrendPoint[] {
  const now = new Date();
  const buckets: { key: string; label: string; referrals: number; conversions: number }[] = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ key: monthKey(d), label: d.toLocaleString('en-IN', { month: 'short' }), referrals: 0, conversions: 0 });
  }
  const index = new Map(buckets.map((b) => [b.key, b]));
  for (const row of applications) {
    const created = parseDate(row.created_at);
    if (!created) continue;
    const bucket = index.get(monthKey(created));
    if (!bucket) continue;
    bucket.referrals += 1;
    if (CONVERTED_STATUSES.has(asString(row.status))) {
      bucket.conversions += 1;
    }
  }
  return buckets.map((b) => ({ m: b.label, referrals: b.referrals, conversions: b.conversions }));
}

function buildCourseBreakdown(applications: Record<string, unknown>[]): CourseRow[] {
  const counts = new Map<string, number>();
  for (const row of applications) {
    const course = asString(row.course_name) || 'Unassigned';
    counts.set(course, (counts.get(course) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([course, referrals]) => ({ course, referrals }))
    .sort((a, b) => b.referrals - a.referrals)
    .slice(0, 6);
}

export default function AssociateDashboardPage({ api, session }: AssociatePageProps) {
  const { data, loading, error } = useAdminPageData(
    () =>
      Promise.all([
        api.loadApplications(session.token),
        api.loadStudents(session.token),
      ]).then(([appSnapshot, students]) => ({ appSnapshot, students })),
    [api, session.token],
  );

  const applications = useMemo(() => data?.appSnapshot?.items ?? [], [data]);
  const students = useMemo(() => data?.students ?? [], [data]);

  const totalApps = applications.length;
  const convertedApps = useMemo(
    () => applications.filter((a) => CONVERTED_STATUSES.has(asString(a.status))).length,
    [applications],
  );
  const conversionRate = totalApps > 0 ? Math.round((convertedApps / totalApps) * 100) : 0;

  const trend = useMemo(() => buildTrend(applications), [applications]);
  const courseData = useMemo(() => buildCourseBreakdown(applications), [applications]);
  const hasTrend = trend.some((t) => t.referrals > 0 || t.conversions > 0);
  const recentReferrals = useMemo(() => applications.slice(0, 8), [applications]);

  if (loading) {
    return <DashboardLoader tone="theme" />;
  }

  if (error) {
    return (
      <Card className="p-6 shadow-[var(--shadow-soft)] border-border/70">
        <p className="text-sm font-semibold text-destructive">Failed to load dashboard</p>
        <p className="text-xs text-muted-foreground mt-1">{error}</p>
      </Card>
    );
  }

  return (
    <main className="space-y-6">
      {/* KPI row — associate metrics (no targets) */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="My Referrals"
          value={totalApps.toLocaleString()}
          icon={FileText}
          tone="info"
          sub="Total applications referred"
        />
        <KpiCard
          label="Conversions"
          value={convertedApps.toLocaleString()}
          icon={TrendingUp}
          tone="success"
          progress={conversionRate}
          sub={`${conversionRate}% conversion rate`}
        />
        <KpiCard
          label="Conversion Rate"
          value={`${conversionRate}%`}
          icon={Percent}
          tone="primary"
          progress={conversionRate}
          sub={`${convertedApps.toLocaleString()} of ${totalApps.toLocaleString()} referrals`}
        />
        <KpiCard
          label="Enrolled Students"
          value={students.length.toLocaleString()}
          icon={GraduationCap}
          tone="warning"
          sub="Active enrollments"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="p-6 shadow-[var(--shadow-soft)] border-border/70">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">Referrals Analytics</h3>
                <p className="text-xs text-muted-foreground">Referrals vs Conversions · last 6 months</p>
              </div>
              <div className="flex items-center gap-4">
                <ChartLegend color={NAVY} label="Referrals" />
                <ChartLegend color={ORANGE} label="Conversions" />
                <div className="rounded-lg bg-success-soft text-success px-3 py-1.5 text-xs font-semibold">
                  {conversionRate}% Conversion
                </div>
              </div>
            </div>
            <div className="mt-6 h-72">
              {hasTrend ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="a1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={NAVY} stopOpacity={0.32} />
                        <stop offset="100%" stopColor={NAVY} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="a2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={ORANGE} stopOpacity={0.32} />
                        <stop offset="100%" stopColor={ORANGE} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                    <XAxis dataKey="m" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: AXIS }} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: AXIS }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: `1px solid ${GRID}`,
                        boxShadow: '0 8px 24px rgba(15,39,88,0.08)',
                        fontSize: 12,
                      }}
                    />
                    <Area type="monotone" dataKey="referrals" stroke={NAVY} strokeWidth={2.5} fill="url(#a1)" />
                    <Area type="monotone" dataKey="conversions" stroke={ORANGE} strokeWidth={2.5} fill="url(#a2)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="flex h-full items-center justify-center text-xs text-muted-foreground">No referral history yet.</p>
              )}
            </div>
          </Card>
        </div>

        <Card className="p-6 shadow-[var(--shadow-soft)] border-border/70">
          <div>
            <h3 className="text-sm font-semibold">Referrals by Course</h3>
            <p className="text-xs text-muted-foreground">Top courses · all time</p>
          </div>
          <div className="mt-4 h-56">
            {courseData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={courseData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <XAxis dataKey="course" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: AXIS }} interval={0} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: AXIS }} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: 12, border: `1px solid ${GRID}`, fontSize: 12 }} />
                  <Bar dataKey="referrals" radius={[8, 8, 0, 0]} maxBarSize={56}>
                    {courseData.map((row, i) => (
                      <Cell key={row.course} fill={COURSE_COLORS[i % COURSE_COLORS.length] ?? NAVY} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-xs text-muted-foreground">No referrals yet.</p>
            )}
          </div>
        </Card>
      </div>

      {/* Recent referrals snapshot */}
      <Card className="p-6 shadow-[var(--shadow-soft)] border-border/70">
        <div className="mb-4">
          <h3 className="text-sm font-semibold">Recent Referrals</h3>
          <p className="text-xs text-muted-foreground">Your latest {recentReferrals.length} applications</p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentReferrals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                    No referrals yet.
                  </TableCell>
                </TableRow>
              ) : (
                recentReferrals.map((row, i) => (
                  <TableRow key={asString(row.id) || String(i)}>
                    <TableCell className="font-medium">{asString(row.name) || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{asString(row.course_name) || '—'}</TableCell>
                    <TableCell><StageBadge stage={asString(row.status)} /></TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(row.created_at)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </main>
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
