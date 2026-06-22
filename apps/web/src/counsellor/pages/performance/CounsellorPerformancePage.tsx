import { useMemo } from 'react';
import {
  Target,
  TrendingUp,
  Trophy,
  Award,
  Flame,
  Calendar,
  CheckCircle2,
  ClipboardList,
} from 'lucide-react';
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DashboardLoader } from '@/components/ui/dashboard-loader';
import { cn } from '@/lib/utils';
import { AdminPageHeader } from '../../../admin/shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../../admin/shared/components/AdminDataTable.js';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asNumber, asString, toRecords, formatDate } from '../../../admin/shared/utils/admin-data-utils.js';
import type { CounsellorPageProps } from '../../routing/counsellor-routes.js';
import {
  AchievementGauge,
  asRecord,
  KpiCard,
  type KpiCardProps,
  SectionTitle,
  type TrendData,
} from '../../components/CounsellorWidgets.js';

// EXACT Lovable chart palette (hex substitutes for the prototype's oklch).
const NAVY = '#0B2758';
const ORANGE = '#F47C2C';
const COURSE_COLORS = ['#4f46e5', '#3b82f6', '#10b981', '#a855f7', '#eab308', '#06b6d4'];

const TARGET_TYPE_LABELS: Record<number, string> = { 1: 'Applications', 2: 'Enrollments', 3: 'Payments' };

const TARGET_COLUMNS: DataTableColumn[] = [
  { key: 'from_date', label: 'From', sortable: true, render: (v: unknown) => formatDate(v) },
  { key: 'to_date', label: 'To', sortable: true, render: (v: unknown) => formatDate(v) },
  { key: 'type', label: 'Type', render: (v: unknown) => TARGET_TYPE_LABELS[asNumber(v)] ?? `Type ${asNumber(v)}` },
  { key: 'value', label: 'Target', sortable: true, render: (v: unknown) => asNumber(v).toLocaleString('en-IN') },
];

const tooltipStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 10,
  fontSize: 12,
  boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
} as const;

interface AnalyticsRow {
  label: string;
  applications: number;
  enrollments: number;
}

interface CourseConvRow {
  course: string;
  conv: number;
}

export default function CounsellorPerformancePage({ api, session }: CounsellorPageProps) {
  const { data, loading, error } = useAdminPageData(
    () =>
      Promise.all([api.loadCounsellorDashboard(session.token), api.loadCounsellorTargets(session.token)]).then(
        ([dashboard, targets]) => ({ dashboard, targets }),
      ),
    [api, session.token],
  );

  const kpis = useMemo(() => asRecord(asRecord(data?.dashboard).kpis), [data]);
  const targets = useMemo(() => toRecords(data?.targets), [data]);

  const trend = useMemo<TrendData>(() => {
    const t = asRecord(asRecord(data?.dashboard).admissionsTrend);
    const toNums = (v: unknown): number[] => (Array.isArray(v) ? v.map((x) => asNumber(x)) : []);
    return {
      labels: Array.isArray(t.labels) ? t.labels.map((x) => asString(x)) : [],
      applications: toNums(t.applications),
      enrollments: toNums(t.enrollments),
    };
  }, [data]);

  const analytics = useMemo<AnalyticsRow[]>(
    () =>
      trend.labels.map((label, i) => ({
        label,
        applications: trend.applications[i] ?? 0,
        enrollments: trend.enrollments[i] ?? 0,
      })),
    [trend],
  );

  const courseConversion = useMemo<CourseConvRow[]>(
    () =>
      toRecords(asRecord(data?.dashboard).coursePerformance).map((r) => ({
        course: asString(r.courseTitle) || '—',
        conv: asNumber(r.conversionPct),
      })),
    [data],
  );

  if (loading) {
    return <DashboardLoader label="performance" />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="My Performance" />
        <Card className="rounded-[14px] border-cn-border/70 bg-white shadow-[var(--cn-shadow-soft)]">
          <div className="py-12 text-center">
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const targetPoint = asNumber(kpis.monthlyTargetPoint);
  const achieved = asNumber(kpis.targetAchieved);
  const achievementPct = asNumber(kpis.achievementPct);
  const remaining = Math.max(0, targetPoint - achieved);
  const totalEnrollments = asNumber(kpis.totalEnrollments);
  const ytd = asNumber(kpis.ytd);
  const onTrack = achievementPct >= 80;
  const hasTrend = trend.applications.some((n) => n > 0) || trend.enrollments.some((n) => n > 0);
  const periodLabel = trend.labels.length > 0 ? `${trend.labels[0]} – ${trend.labels[trend.labels.length - 1]}` : '—';

  const cards: KpiCardProps[] = [
    { label: 'Monthly Target Point', value: targetPoint.toLocaleString('en-IN'), icon: Target, tone: 'primary', sub: 'Current window', progress: 100 },
    { label: 'Target Achieved', value: achieved.toLocaleString('en-IN'), icon: CheckCircle2, tone: 'success', sub: `of ${targetPoint.toLocaleString('en-IN')}`, progress: achievementPct },
    { label: 'Achievement %', value: `${achievementPct}%`, icon: TrendingUp, tone: 'info', sub: 'Of current target', progress: achievementPct },
    { label: 'Current Enrollments', value: totalEnrollments.toLocaleString('en-IN'), icon: Trophy, tone: 'success', sub: 'Converted to enrolment', progress: achievementPct },
    { label: 'Applications — YTD', value: ytd.toLocaleString('en-IN'), icon: Award, tone: 'primary', sub: 'Year to date', progress: 100 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <AdminPageHeader title="My Performance" />
          <p className="-mt-1 text-sm text-cn-muted-fg">Targets, achievement and admissions trend.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {periodLabel}
          </Badge>
          <Badge
            className={cn(
              'gap-1.5 border-0',
              onTrack ? 'bg-cn-success-soft text-cn-success' : 'bg-cn-warning-soft text-amber-700',
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

      {/* Performance Analytics — target window admissions trend */}
      <Card className="rounded-[14px] border-cn-border/70 bg-white p-5 shadow-[var(--cn-shadow-soft)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <SectionTitle title="Performance Analytics" />
            <p className="mt-0.5 text-xs text-cn-muted-fg">Applications vs enrollments across time</p>
          </div>
          <span className="rounded-full bg-cn-orange-soft px-3 py-1 text-xs font-medium text-cn-orange-fg">
            Last 6 months
          </span>
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
                <Bar dataKey="applications" name="Applications" fill={NAVY} radius={[6, 6, 0, 0]} barSize={20} />
                <Area
                  type="monotone"
                  dataKey="enrollments"
                  name="Enrollments"
                  stroke={ORANGE}
                  strokeWidth={2.5}
                  fill="url(#cnAchGrad)"
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-slate-400">No admissions data yet.</div>
          )}
        </div>
      </Card>

      {/* Target progress gauge + course conversion */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="rounded-[14px] border-cn-border/70 bg-white p-5 shadow-[var(--cn-shadow-soft)]">
          <div className="mb-4">
            <SectionTitle title="Target Progress" />
            <p className="mt-0.5 text-xs text-cn-muted-fg">Achievement vs current target window</p>
          </div>
          <div className="flex flex-col items-center">
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
        </Card>

        <Card className="rounded-[14px] border-cn-border/70 bg-white p-5 shadow-[var(--cn-shadow-soft)]">
          <div className="mb-4">
            <SectionTitle title="Course-wise Conversion" />
            <p className="mt-0.5 text-xs text-cn-muted-fg">Conversion % by program</p>
          </div>
          <div className="h-[260px]">
            {courseConversion.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={courseConversion} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="course" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} unit="%" allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="conv" name="Conversion %" radius={[6, 6, 0, 0]}>
                    {courseConversion.map((row, i) => (
                      <Cell key={row.course} fill={COURSE_COLORS[i % COURSE_COLORS.length] ?? NAVY} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">No course activity yet.</div>
            )}
          </div>
        </Card>
      </div>

      {/* My Targets */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-cn-orange-fg" />
          <SectionTitle title="My Targets" />
        </div>
        <AdminDataTable columns={TARGET_COLUMNS} rows={targets} searchable exportable />
      </div>
    </div>
  );
}
