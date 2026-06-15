import { useMemo } from 'react';
import { FileText, Target, TrendingUp, Users } from 'lucide-react';
import type { EChartsOption } from 'echarts';
import { Card, CardContent } from '@/components/ui/card';
import { DashboardLoader } from '@/components/ui/dashboard-loader';
import { EChart } from '@/components/EChart';
import { AdminDataTable, type DataTableColumn } from '../../../admin/shared/components/AdminDataTable.js';
import { AdminPageHeader } from '../../../admin/shared/components/AdminPageHeader.js';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asNumber, asString, toRecords, formatDate } from '../../../admin/shared/utils/admin-data-utils.js';
import type { CounsellorPageProps } from '../../routing/counsellor-routes.js';

// TTII brand palette — match the admin dashboard exactly.
const BRAND_PRIMARY = '#8F2774';
const BRAND_ACCENT = '#F06543';
const NEUTRAL_SLATE = '#cbd5e1';

const APPLICATION_COLUMNS: DataTableColumn[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'phone', label: 'Phone' },
  { key: 'course_name', label: 'Course', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'created_at', label: 'Date', sortable: true, render: (v: unknown) => formatDate(v) },
];

const TARGET_COLUMNS: DataTableColumn[] = [
  { key: 'month', label: 'Month', sortable: true },
  { key: 'year', label: 'Year', sortable: true },
  { key: 'target', label: 'Target', sortable: true },
  { key: 'achieved', label: 'Achieved', sortable: true },
  { key: 'percentage', label: '% Achieved', sortable: true, render: (v: unknown) => `${asNumber(v)}%` },
];

const REFERRAL_COLUMNS: DataTableColumn[] = [
  { key: 'student_name', label: 'Student', sortable: true },
  { key: 'course_name', label: 'Course', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'created_at', label: 'Referred On', sortable: true, render: (v: unknown) => formatDate(v) },
];

// A status counts as a "conversion" when the application reached enrolment.
const CONVERSION_STATUSES = new Set(['converted', 'enrolled']);
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface MonthlyTrend {
  labels: string[];
  applications: number[];
  conversions: number[];
}

interface StatusSlice {
  name: string;
  value: number;
  colour: string;
}

export default function CounsellorDashboardPage({ api, session }: CounsellorPageProps) {
  const { data, loading, error } = useAdminPageData(
    () =>
      Promise.all([
        api.loadApplications(session.token),
        api.loadCounsellorTargets(session.token),
        api.loadReferrals(session.token),
      ]).then(([applications, targets, referrals]) => ({ applications, targets, referrals })),
    [api, session.token],
  );

  const applications = useMemo(() => toRecords(data?.applications), [data]);
  const targets = useMemo(() => toRecords(data?.targets), [data]);
  const referrals = useMemo(() => toRecords(data?.referrals), [data]);

  const totalApps = applications.length;
  const convertedApps = useMemo(
    () => applications.filter((a) => CONVERSION_STATUSES.has(asString(a.status).toLowerCase())).length,
    [applications],
  );
  const conversionRate = totalApps > 0 ? Math.round((convertedApps / totalApps) * 100) : 0;

  // Bucket applications into the last 6 calendar months (oldest → newest).
  const monthlyTrend = useMemo<MonthlyTrend>(() => {
    const now = new Date();
    const buckets: { key: string; label: string; apps: number; conversions: number }[] = [];
    const indexByKey = new Map<string, number>();
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      indexByKey.set(key, buckets.length);
      buckets.push({ key, label: MONTH_LABELS[d.getMonth()] ?? '', apps: 0, conversions: 0 });
    }

    for (const app of applications) {
      const raw = asString(app.created_at);
      if (!raw) continue;
      const parsed = new Date(raw);
      if (Number.isNaN(parsed.getTime())) continue;
      const key = `${parsed.getFullYear()}-${parsed.getMonth()}`;
      const idx = indexByKey.get(key);
      if (idx === undefined) continue;
      const bucket = buckets[idx];
      if (!bucket) continue;
      bucket.apps += 1;
      if (CONVERSION_STATUSES.has(asString(app.status).toLowerCase())) {
        bucket.conversions += 1;
      }
    }

    return {
      labels: buckets.map((b) => b.label),
      applications: buckets.map((b) => b.apps),
      conversions: buckets.map((b) => b.conversions),
    };
  }, [applications]);

  // Application-status breakdown for the small donut.
  const statusBreakdown = useMemo<StatusSlice[]>(() => {
    const counts = new Map<string, number>();
    for (const app of applications) {
      const status = asString(app.status).toLowerCase() || 'unknown';
      counts.set(status, (counts.get(status) ?? 0) + 1);
    }
    const colourFor = (status: string): string => {
      if (status === 'converted') return BRAND_PRIMARY;
      if (status === 'enrolled') return BRAND_ACCENT;
      return NEUTRAL_SLATE;
    };
    const titleCase = (s: string): string => (s ? `${s.charAt(0).toUpperCase()}${s.slice(1)}` : s);
    return Array.from(counts.entries())
      .map(([status, value]) => ({ name: titleCase(status), value, colour: colourFor(status) }))
      .sort((a, b) => b.value - a.value);
  }, [applications]);

  // Target vs achieved series for the full-width bar chart.
  const targetSeries = useMemo(() => {
    const rows = targets.map((t) => ({
      label: `${asString(t.month)} ${asString(t.year)}`.trim() || asString(t.month) || '—',
      target: asNumber(t.target),
      achieved: asNumber(t.achieved),
    }));
    return {
      labels: rows.map((r) => r.label),
      target: rows.map((r) => r.target),
      achieved: rows.map((r) => r.achieved),
    };
  }, [targets]);

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
            <p role="alert" className="text-sm text-red-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = [
    { label: 'My Applications', value: String(totalApps), icon: FileText, borderColor: 'border-blue-500' },
    { label: 'Conversions', value: String(convertedApps), icon: Users, borderColor: 'border-green-500' },
    { label: 'Conversion Rate', value: `${conversionRate}%`, icon: TrendingUp, borderColor: 'border-purple-500' },
    { label: 'Active Targets', value: String(targets.length), icon: Target, borderColor: 'border-orange-500' },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader title="My Dashboard" />
      <p className="-mt-4 text-sm text-gray-500">Counsellor performance overview</p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className={`bg-white border-l-4 ${stat.borderColor}`}>
              <CardContent className="flex items-center gap-4 p-5">
                <div aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ttii-primary/10">
                  <Icon className="size-5 text-ttii-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts row: Applications & Conversions trend + Performance Snapshot */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-slate-200 bg-white">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <SectionTitle accent="from-[#8F2774] to-[#F06543]" title="Applications & Conversions" />
              <span className="rounded-full bg-[#f5f3ff] px-3 py-1 text-xs font-medium text-[#8F2774]">
                Last 6 months
              </span>
            </div>
            <ApplicationsTrendChart trend={monthlyTrend} hasApplications={totalApps > 0} />
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <SectionTitle accent="from-[#8F2774] to-[#F06543]" title="Performance Snapshot" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col items-center justify-center">
                <ConversionGauge rate={conversionRate} />
                <p className="text-center text-xs font-medium text-slate-600">Conversion rate</p>
              </div>
              <div className="flex flex-col items-center justify-center">
                <StatusBreakdownDonut slices={statusBreakdown} />
                <p className="text-center text-xs font-medium text-slate-600">Application status</p>
              </div>
            </div>
            <p className="mt-4 border-t border-slate-100 pt-3 text-center text-xs text-slate-500">
              Based on {totalApps} application{totalApps === 1 ? '' : 's'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Target Achievement — full width bar chart (only when targets exist) */}
      {targets.length > 0 ? (
        <Card className="border-slate-200 bg-white">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <SectionTitle accent="from-[#8F2774] to-[#F06543]" title="Target Achievement" />
            </div>
            <TargetAchievementChart series={targetSeries} />
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-2">
        <SectionTitle accent="from-[#8F2774] to-[#F06543]" title="My Applications" />
        <AdminDataTable columns={APPLICATION_COLUMNS} rows={applications} searchable exportable />
      </div>

      <div className="space-y-2">
        <SectionTitle accent="from-[#8F2774] to-[#F06543]" title="My Targets" />
        <AdminDataTable columns={TARGET_COLUMNS} rows={targets} searchable exportable />
      </div>

      <div className="space-y-2">
        <SectionTitle accent="from-[#8F2774] to-[#F06543]" title="Students I Referred" />
        <AdminDataTable columns={REFERRAL_COLUMNS} rows={referrals} searchable exportable />
      </div>
    </div>
  );
}

/* ─── Helper components ──────────────────────────────────────── */

// Brand-tinted section title with a vertical gradient accent bar (mirrors admin).
function SectionTitle({ accent, title }: { accent: string; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden="true" className={`block h-5 w-1 rounded-full bg-gradient-to-b ${accent}`} />
      <h2 className="text-base font-semibold text-[#8F2774]">{title}</h2>
    </div>
  );
}

// 6-month applications + conversions trend — smoothed line+area, two series.
function ApplicationsTrendChart({ trend, hasApplications }: { trend: MonthlyTrend; hasApplications: boolean }) {
  const option = useMemo<EChartsOption>(() => ({
    grid: { left: 40, right: 16, top: 24, bottom: 28, containLabel: false },
      legend: {
        data: ['Applications', 'Conversions'],
        top: 0,
        right: 0,
        icon: 'roundRect',
        itemWidth: 10,
        itemHeight: 10,
        textStyle: { color: '#64748b', fontSize: 11 },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15,23,42,0.92)',
        borderWidth: 0,
        textStyle: { color: '#f8fafc', fontSize: 12 },
        axisPointer: { lineStyle: { color: '#cbd5e1' } },
        valueFormatter: (v) => String(v ?? 0),
      },
      xAxis: {
        type: 'category',
        data: trend.labels,
        boundaryGap: false,
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
        axisLabel: { color: '#64748b', fontSize: 10 },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        splitLine: { lineStyle: { color: '#e2e8f0', type: 'dashed' } },
        axisLabel: { color: '#94a3b8', fontSize: 10 },
      },
      series: [
        {
          name: 'Applications',
          type: 'line',
          data: trend.applications,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          itemStyle: { color: BRAND_PRIMARY, borderColor: '#ffffff', borderWidth: 2 },
          lineStyle: { color: BRAND_PRIMARY, width: 2.4 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(143,39,116,0.30)' },
                { offset: 1, color: 'rgba(143,39,116,0.02)' },
              ],
            },
          },
        },
        {
          name: 'Conversions',
          type: 'line',
          data: trend.conversions,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          itemStyle: { color: BRAND_ACCENT, borderColor: '#ffffff', borderWidth: 2 },
          lineStyle: { color: BRAND_ACCENT, width: 2.4 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(240,101,67,0.28)' },
                { offset: 1, color: 'rgba(240,101,67,0.02)' },
              ],
            },
          },
        },
      ],
  }), [trend]);

  if (!hasApplications) {
    return <p className="py-8 text-center text-xs text-slate-400">No application data yet.</p>;
  }
  return <EChart option={option} className="h-56 w-full" ariaLabel="Applications and conversions over the last 6 months" />;
}

// Conversion-rate gauge donut — ring filled to rate% in brand primary.
function ConversionGauge({ rate }: { rate: number }) {
  const option = useMemo<EChartsOption>(() => ({
    series: [
      {
        type: 'gauge',
        startAngle: 90,
        endAngle: -270,
        radius: '92%',
        center: ['50%', '50%'],
        min: 0,
        max: 100,
        progress: { show: true, width: 10, roundCap: true, itemStyle: { color: BRAND_PRIMARY } },
        axisLine: { lineStyle: { width: 10, color: [[1, '#f1f5f9']] } },
        pointer: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        anchor: { show: false },
        detail: {
          valueAnimation: true,
          offsetCenter: [0, 0],
          formatter: (v) => `${Math.round(Number(v))}%`,
          color: BRAND_PRIMARY,
          fontSize: 22,
          fontWeight: 700,
        },
        data: [{ value: rate }],
      },
    ],
    animationDuration: 800,
  }), [rate]);

  return <EChart option={option} className="size-32" ariaLabel={`Conversion rate ${rate}%`} />;
}

// Application-status breakdown — small brand-tinted donut.
function StatusBreakdownDonut({ slices }: { slices: StatusSlice[] }) {
  const option = useMemo<EChartsOption>(() => ({
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(15,23,42,0.92)',
      borderWidth: 0,
      textStyle: { color: '#f8fafc', fontSize: 12 },
      formatter: '{b}: {c} ({d}%)',
    },
    series: [
      {
        type: 'pie',
        radius: ['55%', '82%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: false,
        padAngle: 2,
        itemStyle: { borderRadius: 4, borderColor: '#ffffff', borderWidth: 2 },
        label: { show: false },
        labelLine: { show: false },
        data: slices.map((s) => ({ name: s.name, value: s.value, itemStyle: { color: s.colour } })),
      },
    ],
    animationDuration: 800,
  }), [slices]);

  if (slices.length === 0) {
    return (
      <div className="flex size-32 items-center justify-center">
        <span className="text-xs text-slate-400">No data</span>
      </div>
    );
  }
  return <EChart option={option} className="size-32" ariaLabel="Application status breakdown" />;
}

// Target vs achieved per month — grouped bar chart (target slate, achieved brand).
function TargetAchievementChart({ series }: { series: { labels: string[]; target: number[]; achieved: number[] } }) {
  const option = useMemo<EChartsOption>(() => ({
    grid: { left: 40, right: 16, top: 28, bottom: 28, containLabel: false },
    legend: {
      data: ['Target', 'Achieved'],
      top: 0,
      right: 0,
      icon: 'roundRect',
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: '#64748b', fontSize: 11 },
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15,23,42,0.92)',
      borderWidth: 0,
      textStyle: { color: '#f8fafc', fontSize: 12 },
      axisPointer: { type: 'shadow' },
      valueFormatter: (v) => String(v ?? 0),
    },
    xAxis: {
      type: 'category',
      data: series.labels,
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisTick: { show: false },
      axisLabel: { color: '#64748b', fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { color: '#e2e8f0', type: 'dashed' } },
      axisLabel: { color: '#94a3b8', fontSize: 10 },
    },
    series: [
      {
        name: 'Target',
        type: 'bar',
        data: series.target,
        barMaxWidth: 28,
        itemStyle: { color: '#94a3b8', borderRadius: [4, 4, 0, 0] },
      },
      {
        name: 'Achieved',
        type: 'bar',
        data: series.achieved,
        barMaxWidth: 28,
        itemStyle: { color: BRAND_PRIMARY, borderRadius: [4, 4, 0, 0] },
      },
    ],
    animationDuration: 800,
  }), [series]);

  return <EChart option={option} className="h-56 w-full" ariaLabel="Target versus achieved per month" />;
}
