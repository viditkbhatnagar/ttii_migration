import { useMemo } from 'react';
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  FileText,
  GraduationCap,
  Percent,
  Plus,
  Target,
  Timer,
  TrendingUp,
  Users,
  UserMinus,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardLoader } from '@/components/ui/dashboard-loader';
import { AdminPageHeader } from '../../../admin/shared/components/AdminPageHeader.js';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asNumber, asString, toRecords, formatDate } from '../../../admin/shared/utils/admin-data-utils.js';
import type { CounsellorPageProps } from '../../routing/counsellor-routes.js';
import {
  AchievementGauge,
  AdmissionsChart,
  asRecord,
  KpiCard,
  type KpiCardProps,
  SectionTitle,
  StageBadge,
  type TrendData,
} from '../../components/CounsellorWidgets.js';

/* ─── Course performance list ───────────────────────────────── */

interface CoursePerfRow {
  courseTitle: string;
  applications: number;
  enrollments: number;
  conversionPct: number;
}

function CoursePerformanceList({ rows }: { rows: CoursePerfRow[] }) {
  if (rows.length === 0) {
    return <p className="py-10 text-center text-xs text-slate-400">No course activity yet.</p>;
  }
  return (
    <div className="space-y-4">
      {rows.map((r) => (
        <div key={r.courseTitle}>
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-sm font-medium text-slate-700" title={r.courseTitle}>
              {r.courseTitle}
            </p>
            <p className="shrink-0 text-xs text-slate-500">
              {r.applications} app{r.applications === 1 ? '' : 's'} · {r.enrollments} enrolled
            </p>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-ttii-primary" style={{ width: `${Math.min(100, r.conversionPct)}%` }} />
            </div>
            <span className="w-10 shrink-0 text-right text-[11px] font-semibold text-ttii-primary">{r.conversionPct}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Pipeline snapshot table ───────────────────────────────── */

function SnapshotTable({ rows }: { rows: Record<string, unknown>[] }) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-xs text-slate-400">No applications in this stage.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-400">
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
              <td className="py-2.5 pr-3 font-mono text-xs text-slate-500">{asString(row.applicationId)}</td>
              <td className="py-2.5 pr-3 font-medium text-slate-700">{asString(row.name)}</td>
              <td className="py-2.5 pr-3 text-slate-500">{asString(row.course)}</td>
              <td className="py-2.5 pr-3 text-slate-500">{formatDate(row.date)}</td>
              <td className="py-2.5">
                <StageBadge stage={asString(row.stage)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Quick actions ─────────────────────────────────────────── */

function QuickActions({ onNavigate }: { onNavigate: (href: string) => void }) {
  const actions: { label: string; icon: LucideIcon; href: string }[] = [
    { label: 'Add Lead', icon: Plus, href: '/counsellor/leads/add' },
    { label: 'Applications', icon: FileText, href: '/counsellor/applications' },
    { label: 'My Enrollments', icon: Users, href: '/counsellor/students' },
    { label: 'My Targets', icon: Target, href: '/counsellor/targets' },
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {actions.map((a) => {
        const Icon = a.icon;
        return (
          <button
            key={a.href}
            type="button"
            onClick={() => onNavigate(a.href)}
            className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-left transition-colors hover:border-ttii-primary/40 hover:bg-ttii-primary/5"
          >
            <span className="flex items-center gap-2.5">
              <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-lg bg-ttii-primary/10 text-ttii-primary">
                <Icon className="size-4" />
              </span>
              <span className="text-sm font-medium text-slate-700">{a.label}</span>
            </span>
            <ArrowRight className="size-4 text-slate-300 transition-colors group-hover:text-ttii-primary" />
          </button>
        );
      })}
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────── */

export default function CounsellorDashboardPage({ api, session, onNavigate }: CounsellorPageProps) {
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

  if (loading) {
    return <DashboardLoader label="counsellor dashboard" />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="My Dashboard" />
        <p className="-mt-4 text-sm text-gray-500">Counsellor performance overview</p>
        <Card className="bg-white">
          <CardContent className="py-12 text-center">
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const targetPoint = asNumber(kpis.monthlyTargetPoint);
  const achieved = asNumber(kpis.targetAchieved);
  const achievementPct = asNumber(kpis.achievementPct);
  const remaining = Math.max(0, targetPoint - achieved);
  const hasTrend = trend.applications.some((n) => n > 0) || trend.enrollments.some((n) => n > 0);

  const targetCards: KpiCardProps[] = [
    { label: 'Monthly Target Point', value: targetPoint.toLocaleString('en-IN'), icon: Target, tone: 'primary', sub: 'Current target window', progress: achievementPct },
    { label: 'Target Achieved', value: achieved.toLocaleString('en-IN'), icon: TrendingUp, tone: 'success', sub: `${remaining.toLocaleString('en-IN')} to go`, progress: achievementPct },
    { label: 'Achievement %', value: `${achievementPct}%`, icon: Percent, tone: 'info', sub: 'Of target window', progress: achievementPct },
    { label: 'Year to Date', value: asNumber(kpis.ytd).toLocaleString('en-IN'), icon: CalendarDays, tone: 'accent', sub: 'Applications this year' },
  ];
  const countCards: KpiCardProps[] = [
    { label: 'Total Applications', value: asNumber(kpis.totalApplications).toLocaleString('en-IN'), icon: ClipboardList, tone: 'info', sub: 'All time' },
    { label: 'Total Enrollments', value: asNumber(kpis.totalEnrollments).toLocaleString('en-IN'), icon: GraduationCap, tone: 'success', sub: 'Converted to enrolment' },
    { label: 'Pending Applications', value: asNumber(kpis.pendingApplications).toLocaleString('en-IN'), icon: Timer, tone: 'warning', sub: 'Awaiting action' },
    { label: 'Total Dropouts', value: asNumber(kpis.totalDropouts).toLocaleString('en-IN'), icon: UserMinus, tone: 'accent', sub: 'Among your students' },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader title="My Dashboard" />
      <p className="-mt-4 text-sm text-gray-500">Counsellor performance overview</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {targetCards.map((c) => (
          <KpiCard key={c.label} {...c} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {countCards.map((c) => (
          <KpiCard key={c.label} {...c} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="border-slate-200 bg-white">
          <CardContent className="p-5">
            <SectionTitle title="Target Progress" />
            <div className="mt-4 flex flex-col items-center">
              <AchievementGauge pct={achievementPct} />
              <div className="mt-3 grid w-full grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
                <div>
                  <p className="text-sm font-bold text-slate-900">{targetPoint.toLocaleString('en-IN')}</p>
                  <p className="text-[11px] text-slate-400">Target</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-emerald-600">{achieved.toLocaleString('en-IN')}</p>
                  <p className="text-[11px] text-slate-400">Achieved</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-600">{remaining.toLocaleString('en-IN')}</p>
                  <p className="text-[11px] text-slate-400">Remaining</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white lg:col-span-2">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <SectionTitle title="Admissions Over Time" />
              <span className="rounded-full bg-[#f5f3ff] px-3 py-1 text-xs font-medium text-[#8F2774]">Last 6 months</span>
            </div>
            <AdmissionsChart trend={trend} hasData={hasTrend} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="border-slate-200 bg-white lg:col-span-2">
          <CardContent className="p-5">
            <SectionTitle title="Course Performance" />
            <div className="mt-4">
              <CoursePerformanceList rows={coursePerformance} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white">
          <CardContent className="p-5">
            <SectionTitle title="Quick Actions" />
            <div className="mt-4">
              <QuickActions onNavigate={onNavigate} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 bg-white">
        <CardContent className="p-5">
          <div className="mb-4">
            <SectionTitle title="Application Pipeline Snapshot" />
            <p className="ml-3 mt-1 text-xs text-slate-400">Pending payments, forms and approvals</p>
          </div>
          <Tabs defaultValue="payment">
            <TabsList className="bg-slate-100/70">
              <TabsTrigger value="payment">Pending Payment ({paymentPending.length})</TabsTrigger>
              <TabsTrigger value="form">Form Pending ({formPending.length})</TabsTrigger>
              <TabsTrigger value="approval">Approval Waiting ({approvalWaiting.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="payment" className="mt-4">
              <SnapshotTable rows={paymentPending} />
            </TabsContent>
            <TabsContent value="form" className="mt-4">
              <SnapshotTable rows={formPending} />
            </TabsContent>
            <TabsContent value="approval" className="mt-4">
              <SnapshotTable rows={approvalWaiting} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
