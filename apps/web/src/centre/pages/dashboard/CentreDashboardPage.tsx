import { useMemo, type ReactNode } from 'react';
import type { EChartsOption } from 'echarts';
import {
  ArrowDownRight, ArrowUpRight, ClipboardList, CreditCard, FilePlus, GraduationCap, Headset, IndianRupee, Layers,
  Timer, TrendingUp, Wallet, type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DashboardLoader } from '@/components/ui/dashboard-loader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EChart } from '@/components/EChart';
import { cn } from '@/lib/utils';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { CentrePageHeader } from '../../layout/CentrePageHeader.js';
import { useOpenCentreSupport } from '../../layout/CentreLayoutContext.js';
import { formatYmd, inr } from '../../layout/centre-shell-model.js';
import type { CentrePageProps } from '../../routing/centre-routes.js';
import {
  buildKpis, courseAxisLabel, kpiProgress, stageLabel, stageTone, toDashboardData, trendHasData,
  type DashboardData, type DashboardKpi, type KpiTone, type StageTone,
} from './centre-dashboard-model.js';

// Naji's Centre Dashboard (src/routes/index.tsx) on the centre's real numbers.
// What the prototype invented and is not shown: seats available, certificates
// pending, the monthly target ring and "revenue generated". Fees collected /
// pending are the fees of THIS centre's students (Centre login only).

const KPI_ICONS: Record<string, LucideIcon> = {
  wallet: Wallet, students: TrendingUp, cohorts: Layers, applications: ClipboardList,
  enrolments: GraduationCap, pending: Timer, collected: IndianRupee, balance: CreditCard,
};

const TONES: Record<KpiTone, { bg: string; fg: string; bar: string }> = {
  primary: { bg: 'bg-primary-soft', fg: 'text-accent-foreground', bar: 'bg-primary' },
  success: { bg: 'bg-success-soft', fg: 'text-success', bar: 'bg-success' },
  warning: { bg: 'bg-warning-soft', fg: 'text-warning-foreground', bar: 'bg-warning' },
  info: { bg: 'bg-info-soft', fg: 'text-info', bar: 'bg-info' },
};

const STAGE_CLASS: Record<StageTone, string> = {
  success: 'bg-success-soft text-success border-transparent',
  info: 'bg-info-soft text-info border-transparent',
  warning: 'bg-warning-soft text-warning-foreground border-transparent',
  danger: 'bg-destructive/10 text-destructive border-transparent',
  neutral: 'bg-muted text-muted-foreground border-transparent',
};

// Canvas charts take concrete colours (the theme's --chart-1/-2/-3 in sRGB).
const CHART_PRIMARY = '#4f5bd5';
const CHART_SUCCESS = '#2fb67c';
const CHART_AXIS = '#7b8499';
const CHART_GRID = '#e6e9f1';

function KpiCard({ kpi, progress, onOpen }: { kpi: DashboardKpi; progress: number | undefined; onOpen: () => void }) {
  const t = TONES[kpi.tone];
  const Icon = KPI_ICONS[kpi.id] ?? ClipboardList;
  const up = (kpi.delta ?? 0) >= 0;
  return (
    <Card className="border-border/70 p-0 shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-card)]">
      <button type="button" onClick={onOpen} className="block w-full rounded-xl p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <div className="flex items-start justify-between">
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', t.bg, t.fg)}>
            <Icon aria-hidden="true" className="h-5 w-5" />
          </div>
          {kpi.delta !== null ? (
            <span
              className={cn('inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium', up ? 'bg-success-soft text-success' : 'bg-destructive/10 text-destructive')}
              title="This month against last month"
            >
              {up ? <ArrowUpRight aria-hidden="true" className="h-3 w-3" /> : <ArrowDownRight aria-hidden="true" className="h-3 w-3" />}
              {Math.abs(kpi.delta)}%
            </span>
          ) : null}
        </div>
        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{kpi.label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums">{kpi.value}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{kpi.sub}</p>
        </div>
        {progress !== undefined ? (
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted" role="presentation">
            <div className={cn('h-full rounded-full', t.bar)} style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
          </div>
        ) : null}
      </button>
    </Card>
  );
}

function ChartCard({ title, subtitle, aside, children }: { title: string; subtitle: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <Card className="border-border/70 p-6 shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        {aside}
      </div>
      <div className="mt-6">{children}</div>
    </Card>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

const EmptyNote = ({ children }: { children: ReactNode }) => (
  <p className="py-12 text-center text-sm text-muted-foreground">{children}</p>
);

function AdmissionsChart({ data }: { data: DashboardData }) {
  const option = useMemo<EChartsOption>(() => ({
    grid: { left: 36, right: 12, top: 12, bottom: 28 },
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(15,23,42,0.92)', borderWidth: 0, textStyle: { color: '#f8fafc', fontSize: 12 } },
    xAxis: { type: 'category', data: data.trend.map((t) => t.label), boundaryGap: false, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: CHART_AXIS, fontSize: 11 } },
    yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: CHART_GRID, type: 'dashed' } }, axisLabel: { color: CHART_AXIS, fontSize: 11 } },
    series: [
      { name: 'Applications', type: 'line', smooth: true, symbol: 'circle', symbolSize: 6, data: data.trend.map((t) => t.applications), itemStyle: { color: CHART_PRIMARY }, lineStyle: { color: CHART_PRIMARY, width: 2.5 }, areaStyle: { color: 'rgba(79,91,213,0.16)' } },
      { name: 'Enrollments', type: 'line', smooth: true, symbol: 'circle', symbolSize: 6, data: data.trend.map((t) => t.enrolments), itemStyle: { color: CHART_SUCCESS }, lineStyle: { color: CHART_SUCCESS, width: 2.5 }, areaStyle: { color: 'rgba(47,182,124,0.16)' } },
    ],
  }), [data.trend]);
  const conversion = data.kpis.conversion ?? 0;
  return (
    <ChartCard
      title="Admissions Analytics"
      subtitle="Applications vs Enrollments · last 6 months"
      aside={(
        <div className="flex items-center gap-4">
          <LegendDot color={CHART_PRIMARY} label="Applications" />
          <LegendDot color={CHART_SUCCESS} label="Enrollments" />
          <div className="rounded-lg bg-success-soft px-3 py-1.5 text-xs font-semibold text-success">{conversion}% Conversion</div>
        </div>
      )}
    >
      {trendHasData(data.trend)
        ? <EChart option={option} className="h-72 w-full" ariaLabel="Applications and enrollments over the last 6 months" />
        : <EmptyNote>No applications or enrollments in the last 6 months yet.</EmptyNote>}
    </ChartCard>
  );
}

function CoursePerformance({ data }: { data: DashboardData }) {
  const courses = data.courses;
  const option = useMemo<EChartsOption>(() => {
    const ordered = [...courses].reverse();
    return {
      grid: { left: 8, right: 24, top: 8, bottom: 8, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: 'rgba(15,23,42,0.92)', borderWidth: 0, textStyle: { color: '#f8fafc', fontSize: 12 } },
      xAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: CHART_GRID, type: 'dashed' } }, axisLabel: { color: CHART_AXIS, fontSize: 11 } },
      yAxis: { type: 'category', data: ordered.map((c) => courseAxisLabel(c)), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: CHART_AXIS, fontSize: 11 } },
      series: [
        { name: 'Applications', type: 'bar', barMaxWidth: 14, data: ordered.map((c) => c.applications), itemStyle: { color: CHART_PRIMARY, borderRadius: [0, 4, 4, 0] } },
        { name: 'Enrollments', type: 'bar', barMaxWidth: 14, data: ordered.map((c) => c.enrolments), itemStyle: { color: CHART_SUCCESS, borderRadius: [0, 4, 4, 0] } },
      ],
    };
  }, [courses]);
  return (
    <ChartCard
      title="Course-wise Admissions"
      subtitle="Applications and enrollments by course"
      aside={<div className="flex items-center gap-4"><LegendDot color={CHART_PRIMARY} label="Applications" /><LegendDot color={CHART_SUCCESS} label="Enrollments" /></div>}
    >
      {courses.length > 0
        ? <EChart option={option} className="h-72 w-full" ariaLabel="Applications and enrollments by course" />
        : <EmptyNote>Course-wise numbers appear once your centre has applications.</EmptyNote>}
    </ChartCard>
  );
}

interface QuickAction { id: string; label: string; icon: LucideIcon; tone: string; run: () => void }

function QuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <Card className="border-border/70 p-6 shadow-[var(--shadow-soft)]">
      <h2 className="text-sm font-semibold">Quick Actions</h2>
      <p className="text-xs text-muted-foreground">Shortcuts to common tasks</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {actions.map((a) => (
          <Button key={a.id} variant="outline" onClick={a.run} className="h-auto flex-col items-start gap-2 whitespace-normal p-4 text-left hover:border-primary/40 hover:bg-muted/40">
            <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', a.tone)}>
              <a.icon aria-hidden="true" className="h-4 w-4" />
            </span>
            <span className="text-sm font-medium">{a.label}</span>
          </Button>
        ))}
      </div>
    </Card>
  );
}

const EmptyRows = ({ cols, text }: { cols: number; text: string }) => (
  <TableRow><TableCell colSpan={cols} className="py-8 text-center text-sm text-muted-foreground">{text}</TableCell></TableRow>
);

function RecentActivity({ data, onNavigate }: { data: DashboardData; onNavigate: (href: string) => void }) {
  const money = data.money;
  return (
    <Card className="border-border/70 p-6 shadow-[var(--shadow-soft)]">
      <h2 className="text-sm font-semibold">Recent Activity</h2>
      <p className="mb-4 text-xs text-muted-foreground">{money ? 'Applications, student payments and wallet' : 'Your latest applications'}</p>
      <Tabs defaultValue="apps">
        <TabsList className="bg-muted/60">
          <TabsTrigger value="apps">Applications</TabsTrigger>
          {money ? <TabsTrigger value="pay">Payments</TabsTrigger> : null}
          {money ? <TabsTrigger value="wallet">Wallet</TabsTrigger> : null}
        </TabsList>
        <TabsContent value="apps" className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Applicant</TableHead><TableHead>Course</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.recentApplications.length === 0 ? <EmptyRows cols={5} text="No applications yet." /> : data.recentApplications.map((a) => (
                <TableRow key={a.id} className="cursor-pointer" onClick={() => onNavigate('/centre/applications')}>
                  <TableCell className="font-mono text-xs">{a.applicationId}</TableCell>
                  <TableCell className="font-medium">{a.name || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{a.course || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{formatYmd(a.date)}</TableCell>
                  <TableCell><Badge variant="outline" className={STAGE_CLASS[stageTone(a.stage)]}>{stageLabel(a.stage)}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
        {money ? (
          <TabsContent value="pay" className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Course</TableHead><TableHead>Amount</TableHead><TableHead>Mode</TableHead><TableHead>Paid on</TableHead></TableRow></TableHeader>
              <TableBody>
                {money.recentPayments.length === 0 ? <EmptyRows cols={5} text="No payments recorded for your students yet." /> : money.recentPayments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.studentName || '—'}<span className="block font-mono text-[11px] font-normal text-muted-foreground">{p.studentCode}</span></TableCell>
                    <TableCell className="text-muted-foreground">{p.course || '—'}</TableCell>
                    <TableCell className="font-semibold tabular-nums">{inr(p.amount)}</TableCell>
                    <TableCell className="text-muted-foreground">{p.mode || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{formatYmd(p.paidOn)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        ) : null}
        {money ? (
          <TabsContent value="wallet" className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Amount</TableHead><TableHead>Remarks</TableHead></TableRow></TableHeader>
              <TableBody>
                {money.recentWallet.length === 0 ? <EmptyRows cols={4} text="No wallet transactions yet." /> : money.recentWallet.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-muted-foreground">{formatYmd(t.date)}</TableCell>
                    <TableCell><Badge variant="outline" className={t.type === 'credit' ? STAGE_CLASS.success : STAGE_CLASS.warning}>{t.type === 'credit' ? 'Credit' : 'Debit'}</Badge></TableCell>
                    <TableCell className="font-semibold tabular-nums">{inr(t.amount)}</TableCell>
                    <TableCell className="text-muted-foreground">{t.remarks || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        ) : null}
      </Tabs>
    </Card>
  );
}

export default function CentreDashboardPage({ api, session, onNavigate }: CentrePageProps) {
  const { data: raw, loading, error } = useAdminPageData<unknown>(() => api.loadPortalDashboard(session.token), [session.token]);
  const openSupport = useOpenCentreSupport(onNavigate);
  const data = useMemo(() => (raw ? toDashboardData(raw) : null), [raw]);

  if (loading) return <DashboardLoader label="centre dashboard" />;
  if (error || !data) {
    return (
      <Card><CardContent role="alert" className="py-10 text-center text-sm text-destructive">{error || 'The dashboard could not be loaded.'}</CardContent></Card>
    );
  }

  const kpis = buildKpis(data);
  const actions: QuickAction[] = [
    { id: 'add', label: 'Add Application', icon: FilePlus, tone: 'bg-primary-soft text-accent-foreground', run: () => onNavigate('/centre/applications?new=1') },
    ...(data.money ? [
      { id: 'funds', label: 'Request Funds', icon: Wallet, tone: 'bg-success-soft text-success', run: () => onNavigate('/centre/wallet?tab=fund-requests&new=1') },
      { id: 'fees', label: 'View Pending Fees', icon: CreditCard, tone: 'bg-warning-soft text-warning-foreground', run: () => onNavigate('/centre/wallet?tab=collections') },
    ] : []),
    { id: 'support', label: 'Contact Support', icon: Headset, tone: 'bg-info-soft text-info', run: openSupport },
  ];

  return (
    <div className="space-y-6">
      <CentrePageHeader title="Dashboard" subtitle={data.centreName ? `${data.centreName} at a glance` : 'Your centre at a glance'} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} progress={kpiProgress(kpi, data)} onOpen={() => onNavigate(kpi.href)} />
        ))}
      </div>
      <AdmissionsChart data={data} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2"><CoursePerformance data={data} /></div>
        <QuickActions actions={actions} />
      </div>
      <RecentActivity data={data} onNavigate={onNavigate} />
    </div>
  );
}
