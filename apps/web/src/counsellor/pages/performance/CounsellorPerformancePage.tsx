import { useMemo } from 'react';
import { CalendarDays, ClipboardList, GraduationCap, Percent } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { DashboardLoader } from '@/components/ui/dashboard-loader';
import { AdminPageHeader } from '../../../admin/shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../../admin/shared/components/AdminDataTable.js';
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
  type TrendData,
} from '../../components/CounsellorWidgets.js';

const TARGET_TYPE_LABELS: Record<number, string> = { 1: 'Applications', 2: 'Enrollments', 3: 'Payments' };

const TARGET_COLUMNS: DataTableColumn[] = [
  { key: 'from_date', label: 'From', sortable: true, render: (v: unknown) => formatDate(v) },
  { key: 'to_date', label: 'To', sortable: true, render: (v: unknown) => formatDate(v) },
  { key: 'type', label: 'Type', render: (v: unknown) => TARGET_TYPE_LABELS[asNumber(v)] ?? `Type ${asNumber(v)}` },
  { key: 'value', label: 'Target', sortable: true, render: (v: unknown) => asNumber(v).toLocaleString('en-IN') },
];

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

  if (loading) {
    return <DashboardLoader label="performance" />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="My Performance" />
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

  const cards: KpiCardProps[] = [
    { label: 'Total Applications', value: asNumber(kpis.totalApplications).toLocaleString('en-IN'), icon: ClipboardList, tone: 'info', sub: 'All time' },
    { label: 'Total Enrollments', value: asNumber(kpis.totalEnrollments).toLocaleString('en-IN'), icon: GraduationCap, tone: 'success', sub: 'Converted to enrolment' },
    { label: 'Achievement %', value: `${achievementPct}%`, icon: Percent, tone: 'primary', sub: 'Of current target', progress: achievementPct },
    { label: 'Year to Date', value: asNumber(kpis.ytd).toLocaleString('en-IN'), icon: CalendarDays, tone: 'accent', sub: 'Applications this year' },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader title="My Performance" />
      <p className="-mt-4 text-sm text-gray-500">Targets, achievement and admissions trend</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <KpiCard key={c.label} {...c} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="rounded-[14px] border-cn-border/70 bg-white shadow-[var(--cn-shadow-soft)]">
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

        <Card className="rounded-[14px] border-cn-border/70 bg-white shadow-[var(--cn-shadow-soft)] lg:col-span-2">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <SectionTitle title="Admissions Over Time" />
              <span className="rounded-full bg-cn-orange-soft px-3 py-1 text-xs font-medium text-cn-orange-fg">Last 6 months</span>
            </div>
            <AdmissionsChart trend={trend} hasData={hasTrend} />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        <SectionTitle title="My Targets" />
        <AdminDataTable columns={TARGET_COLUMNS} rows={targets} searchable exportable />
      </div>
    </div>
  );
}
