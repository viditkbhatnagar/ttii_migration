import { useMemo } from 'react';
import {
  Users, BookOpen, GraduationCap, Calendar, TrendingUp, TrendingDown,
  Sparkles, type LucideIcon,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { DashboardLoader } from '@/components/ui/dashboard-loader';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asNumber, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import type { AdminPageProps } from '../../routing/admin-routes.js';

interface TrendData {
  sparkline: number[];
  trendPercent: number;
}

interface HeroStatDef {
  label: string;
  countKey: string;
  trendKey: string;
  icon: LucideIcon;
  iconBg: string;
  iconColour: string;
  sparkColour: string;
  sublabel: (data: Record<string, unknown>) => string;
  href: string;
}

// TTII brand palette: primary #8F2774 (purple), secondary #F06543 (orange).
// The four hero stats use brand-adjacent tints rather than primary's
// strong purple so the dashboard doesn't feel oppressive.
const HERO_STATS: HeroStatDef[] = [
  {
    label: 'Total Students',
    countKey: 'students_count',
    trendKey: 'students_trend',
    icon: Users,
    iconBg: 'bg-[#eef2ff]',
    iconColour: 'text-[#5a6cee]',
    sparkColour: '#5a6cee',
    sublabel: (d) => {
      const trend = d.students_trend as TrendData | undefined;
      const last = trend?.sparkline?.reduce((s, v) => s + v, 0) ?? 0;
      return `${last} new this month`;
    },
    href: '/admin/students/index',
  },
  {
    label: 'Total Courses',
    countKey: 'courses_count',
    trendKey: 'courses_trend',
    icon: BookOpen,
    iconBg: 'bg-[#ecfdf5]',
    iconColour: 'text-emerald-600',
    sparkColour: '#10b981',
    sublabel: (d) => `${asNumber(d.courses_count)} active`,
    href: '/admin/course/index',
  },
  {
    label: 'Active Enrollments',
    countKey: 'enrolments_count',
    trendKey: 'enrolments_trend',
    icon: GraduationCap,
    iconBg: 'bg-[#fff7ed]',
    iconColour: 'text-[#F06543]',
    sparkColour: '#F06543',
    sublabel: (d) => {
      const dist = d.progress_distribution as { high?: number; total?: number } | undefined;
      const high = dist?.high ?? 0;
      const total = dist?.total ?? 0;
      const pct = total > 0 ? Math.round((high / total) * 100) : 0;
      return `${pct}% high progress`;
    },
    href: '/admin/enrol/index',
  },
  {
    label: 'Upcoming Classes',
    countKey: 'upcoming_classes_count',
    trendKey: 'classes_trend',
    icon: Calendar,
    iconBg: 'bg-[#f5f3ff]',
    iconColour: 'text-[#8F2774]',
    sparkColour: '#8F2774',
    sublabel: (d) => {
      const c = asNumber(d.upcoming_classes_count);
      return c === 0 ? 'No upcoming' : `${c} scheduled`;
    },
    href: '/admin/calendar/index',
  },
];

const STUDENT_COLUMNS: DataTableColumn[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'student_id', label: 'Student ID', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'phone', label: 'Phone' },
  { key: 'course_title', label: 'Course', sortable: true, render: (v) => (typeof v === 'string' && v) || '-' },
  { key: 'created_at', label: 'Joined Date', sortable: true, render: (v) => formatDate(v) },
];

const EVENT_COLUMNS: DataTableColumn[] = [
  { key: 'title', label: 'Title', sortable: true },
  { key: 'event_date', label: 'Event Date', sortable: true, render: (v) => formatDate(v) },
  { key: 'from_time', label: 'From' },
  { key: 'to_time', label: 'To' },
];

export default function DashboardPage({ api, session, onNavigate }: AdminPageProps) {
  const { data, loading, error } = useAdminPageData(
    () => api.loadAdminDashboard(session.token),
    [api, session.token],
  );

  const recentStudents = useMemo(() => toRecords(data?.recent_students), [data]);
  const upcomingEvents = useMemo(() => toRecords(data?.upcoming_events), [data]);
  const monthlyTrend = useMemo(() => toRecords(data?.enrolment_monthly), [data]);
  const progressDist = useMemo(() => {
    const d = data?.progress_distribution as Record<string, unknown> | undefined;
    return {
      low: asNumber(d?.low),
      mid: asNumber(d?.mid),
      high: asNumber(d?.high),
      total: asNumber(d?.total),
    };
  }, [data]);

  if (loading) {
    return <DashboardLoader label="dashboard data" />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="bg-white">
          <CardContent className="py-12 text-center">
            <p role="alert" className="text-sm text-red-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header (Naji 2026-05-07 — sparkle icon + welcome subtitle) */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <Sparkles aria-hidden="true" className="size-6 text-[#8F2774]" />
          Admin Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-500">Overview and controls &middot; Welcome back!</p>
      </div>

      {/* Hero stat cards with sparkline + trend chip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {HERO_STATS.map((stat) => {
          const Icon = stat.icon;
          const value = String(asNumber(data?.[stat.countKey]) || 0);
          const trend = (data?.[stat.trendKey] as TrendData | undefined) ?? { sparkline: [], trendPercent: 0 };
          return (
            <button
              key={stat.label}
              type="button"
              onClick={() => onNavigate(stat.href)}
              aria-label={`${value} ${stat.label}`}
              className="group flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-left transition-all hover:-translate-y-0.5 hover:border-[#8F2774]/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8F2774] focus-visible:ring-offset-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className={`flex size-10 items-center justify-center rounded-xl ${stat.iconBg}`}>
                  <Icon aria-hidden="true" className={`size-5 ${stat.iconColour}`} />
                </div>
                <TrendChip percent={trend.trendPercent} />
              </div>
              <div>
                <p className="text-sm font-medium text-[#8F2774]">{stat.label}</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
                <p className="mt-1 text-xs text-slate-500">{stat.sublabel(data ?? {})}</p>
              </div>
              <div className="flex items-end justify-between gap-2">
                <Sparkline values={trend.sparkline} colour={stat.sparkColour} />
                <span className="text-[10px] uppercase tracking-wider text-slate-400">7d trend</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Charts row: Enrollment Trend + Student Progress Snapshot */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-slate-200 bg-white">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <SectionTitle accent="from-[#8F2774] to-[#F06543]" title="Enrollment Trend" />
              <span className="rounded-full bg-[#f5f3ff] px-3 py-1 text-xs font-medium text-[#8F2774]">
                Last 6 months
              </span>
            </div>
            <EnrollmentTrendChart data={monthlyTrend} />
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <SectionTitle accent="from-[#8F2774] to-[#F06543]" title="Student Progress Snapshot" />
            </div>
            <ProgressSnapshot dist={progressDist} />
            <p className="mt-4 border-t border-slate-100 pt-3 text-center text-xs text-slate-500">
              Based on {progressDist.total} total enrollment{progressDist.total === 1 ? '' : 's'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recently Joined Students */}
      <div className="space-y-2">
        <SectionTitle accent="from-[#8F2774] to-[#F06543]" title="Recently Joined Students" />
        <AdminDataTable columns={STUDENT_COLUMNS} rows={recentStudents} searchable exportable />
      </div>

      {/* Upcoming Activities */}
      <div className="space-y-2">
        <SectionTitle accent="from-[#8F2774] to-[#F06543]" title="Upcoming Activities" />
        <AdminDataTable columns={EVENT_COLUMNS} rows={upcomingEvents} searchable exportable />
      </div>
    </div>
  );
}

/* ─── Helper components ──────────────────────────────────────── */

// Brand-tinted section title with a vertical gradient accent bar on the left.
function SectionTitle({ accent, title }: { accent: string; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden="true" className={`block h-5 w-1 rounded-full bg-gradient-to-b ${accent}`} />
      <h2 className="text-base font-semibold text-[#8F2774]">{title}</h2>
    </div>
  );
}

// Trend chip showing % up/down with arrow + green/red colour.
function TrendChip({ percent }: { percent: number }) {
  if (!Number.isFinite(percent) || percent === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
        0%
      </span>
    );
  }
  const positive = percent > 0;
  const Arrow = positive ? TrendingUp : TrendingDown;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        positive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
      }`}
    >
      <Arrow aria-hidden="true" className="size-3" />
      {Math.abs(percent)}%
    </span>
  );
}

// Inline SVG sparkline. Builds a smooth area + line from a 7-value series.
function Sparkline({ values, colour }: { values: number[]; colour: string }) {
  if (!values || values.length === 0) {
    return <span className="block h-6 flex-1" />;
  }
  const max = Math.max(...values, 1);
  const width = 100;
  const height = 24;
  const stepX = values.length > 1 ? width / (values.length - 1) : width;
  const points = values.map((v, i) => ({
    x: i * stepX,
    y: height - (v / max) * (height - 2) - 1,
  }));
  const pathLine = points.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ');
  const pathArea = `${pathLine} L${width},${height} L0,${height} Z`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-6 flex-1" preserveAspectRatio="none">
      <path d={pathArea} fill={colour} fillOpacity={0.12} />
      <path d={pathLine} fill="none" stroke={colour} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      {points.length > 0 ? (
        <circle cx={points[points.length - 1]!.x} cy={points[points.length - 1]!.y} r={1.5} fill={colour} />
      ) : null}
    </svg>
  );
}

// 6-month enrolment trend area chart. Pure SVG (no recharts dep).
function EnrollmentTrendChart({ data }: { data: Record<string, unknown>[] }) {
  if (!data || data.length === 0) {
    return <p className="py-8 text-center text-xs text-slate-400">No enrolment data yet.</p>;
  }
  const counts = data.map((d) => asNumber(d.count));
  const labels = data.map((d) => (typeof d.label === 'string' ? d.label : ''));
  const max = Math.max(...counts, 1);
  const width = 600;
  const height = 220;
  const padX = 40;
  const padY = 24;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const stepX = counts.length > 1 ? innerW / (counts.length - 1) : innerW;
  const points = counts.map((v, i) => ({
    x: padX + i * stepX,
    y: padY + innerH - (v / max) * innerH,
  }));
  // Smoothed bezier path (tension via average control points).
  const pathLine = points.reduce<string>((acc, p, i) => {
    if (i === 0) return `M${p.x},${p.y}`;
    const prev = points[i - 1]!;
    const cx = (prev.x + p.x) / 2;
    return `${acc} C${cx},${prev.y} ${cx},${p.y} ${p.x},${p.y}`;
  }, '');
  const pathArea = `${pathLine} L${points[points.length - 1]!.x},${padY + innerH} L${points[0]!.x},${padY + innerH} Z`;
  const yTicks = [0, Math.ceil(max / 4), Math.ceil(max / 2), Math.ceil((3 * max) / 4), max];
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full">
      {/* Y-axis grid lines + labels */}
      {yTicks.map((t, i) => {
        const y = padY + innerH - (t / max) * innerH;
        return (
          <g key={i}>
            <line x1={padX} y1={y} x2={width - padX / 2} y2={y} stroke="#e2e8f0" strokeWidth={0.6} strokeDasharray="2,3" />
            <text x={padX - 8} y={y + 3} textAnchor="end" fontSize="10" fill="#94a3b8">{t}</text>
          </g>
        );
      })}
      {/* Area + line */}
      <path d={pathArea} fill="url(#gradEnrolment)" />
      <path d={pathLine} fill="none" stroke="#5a6cee" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      <defs>
        <linearGradient id="gradEnrolment" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#5a6cee" stopOpacity={0.35} />
          <stop offset="100%" stopColor="#5a6cee" stopOpacity={0.02} />
        </linearGradient>
      </defs>
      {/* X-axis labels */}
      {labels.map((label, i) => (
        <text key={i} x={padX + i * stepX} y={height - padY / 2 + 4} textAnchor="middle" fontSize="10" fill="#64748b">
          {label}
        </text>
      ))}
    </svg>
  );
}

// Three-ring progress distribution for the Student Progress Snapshot.
function ProgressSnapshot({ dist }: { dist: { low: number; mid: number; high: number; total: number } }) {
  const total = dist.total || 1;
  const rings = [
    { label: '0-25% Done', count: dist.low, percent: Math.round((dist.low / total) * 100), colour: '#ef4444' },
    { label: '25-75% Done', count: dist.mid, percent: Math.round((dist.mid / total) * 100), colour: '#f59e0b' },
    { label: '75-100% Done', count: dist.high, percent: Math.round((dist.high / total) * 100), colour: '#10b981' },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {rings.map((r) => (
        <ProgressRing key={r.label} {...r} />
      ))}
    </div>
  );
}

function ProgressRing({ label, count, percent, colour }: { label: string; count: number; percent: number; colour: string }) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative size-24">
        <svg className="size-full -rotate-90" viewBox="0 0 90 90">
          <circle cx="45" cy="45" r={radius} fill="none" stroke="#f1f5f9" strokeWidth={6} />
          <circle
            cx="45"
            cy="45"
            r={radius}
            fill="none"
            stroke={colour}
            strokeWidth={6}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 600ms ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold" style={{ color: colour }}>{percent}%</span>
          <span className="text-xs text-slate-500">{count}</span>
        </div>
      </div>
      <p className="text-center text-xs font-medium text-slate-600">{label}</p>
    </div>
  );
}
