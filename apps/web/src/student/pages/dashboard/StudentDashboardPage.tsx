import { useMemo } from 'react';
import {
  BookOpen, ClipboardList, FileText, Bell, Flame, CheckCircle,
  CreditCard, ArrowRight, Target, TrendingUp, BarChart3,
} from 'lucide-react';
import { PageLoader } from '@/components/ui/page-loader';
import { Button } from '@/components/ui/button';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { formatCurrency, formatDate } from '../../../admin/shared/utils/admin-data-utils.js';
import { useStudentLayout } from '../../layout/StudentLayoutContext.js';
import type { StudentDashboardSnapshot } from '../../student-portal-api.js';
import type { StudentPageProps } from '../../routing/student-routes.js';

/* ─── SVG Progress Ring ──────────────────────────────────── */

function ProgressRing({ value, size = 120, strokeWidth = 10 }: { value: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(value, 100) / 100) * circumference;
  const center = size / 2;

  return (
    <svg width={size} height={size} className="drop-shadow-sm">
      <circle
        cx={center} cy={center} r={radius}
        fill="none" stroke="hsl(210 20% 92%)" strokeWidth={strokeWidth}
      />
      <circle
        cx={center} cy={center} r={radius}
        fill="none" stroke="url(#progressGradient)" strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${center} ${center})`}
        className="transition-all duration-700 ease-out"
      />
      <defs>
        <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        className="fill-slate-800 text-2xl font-bold" style={{ fontFamily: 'Epilogue, sans-serif' }}>
        {value}%
      </text>
    </svg>
  );
}

/* ─── Dashboard Card Wrapper ──────────────────────────────── */

function DashboardCard({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  gradient,
  children,
  className = '',
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle?: string;
  gradient: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-slate-200/80 bg-gradient-to-br ${gradient} p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2.5 rounded-xl ${iconBg}`}>
          <Icon className={`size-5 ${iconColor}`} />
        </div>
        <div>
          <h3 className="font-semibold text-slate-800 text-lg">{title}</h3>
          {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </div>
  );
}

/* ─── Stat Cards ──────────────────────────────────────────── */

interface QuickStatDef {
  label: string;
  getValue: (d: StudentDashboardSnapshot) => string;
  icon: React.ElementType;
  gradient: string;
  iconColor: string;
}

const QUICK_STATS: QuickStatDef[] = [
  {
    label: 'Courses',
    getValue: (d) => String(d.coursesCount),
    icon: BookOpen,
    gradient: 'from-blue-500 to-blue-600',
    iconColor: 'text-blue-100',
  },
  {
    label: 'Assignments',
    getValue: (d) => String(d.currentAssignments + d.upcomingAssignments),
    icon: ClipboardList,
    gradient: 'from-emerald-500 to-emerald-600',
    iconColor: 'text-emerald-100',
  },
  {
    label: 'Exams',
    getValue: (d) => String(d.upcomingExams),
    icon: FileText,
    gradient: 'from-violet-500 to-purple-600',
    iconColor: 'text-violet-100',
  },
  {
    label: 'Notifications',
    getValue: (d) => String(d.notificationsCount),
    icon: Bell,
    gradient: 'from-cyan-500 to-teal-600',
    iconColor: 'text-cyan-100',
  },
];

/* ─── Main Component ──────────────────────────────────────── */

const EMPTY_DASHBOARD: StudentDashboardSnapshot = {
  coursesCount: 0,
  currentAssignments: 0,
  upcomingAssignments: 0,
  completedAssignments: 0,
  upcomingExams: 0,
  expiredExams: 0,
  notificationsCount: 0,
  scheduledTasks: 0,
  overdueTasks: 0,
  streakTotal: 0,
  streakCurrent: 0,
  primaryCourseTitle: '',
  courseProgress: 0,
  recentPaymentAmount: 0,
  recentPaymentDate: '',
};

export default function StudentDashboardPage({ api, session, onNavigate }: StudentPageProps) {
  const { data, loading, error } = useAdminPageData(
    () => api.loadDashboard(session.token),
    [api, session.token],
  );
  const { currentUser } = useStudentLayout();

  const dashboardData = useMemo(() => data ?? EMPTY_DASHBOARD, [data]);
  const firstName = (currentUser?.name.split(/\s+/)[0] ?? '').trim();
  const greetingName = firstName || 'there';

  if (loading) {
    return (
      <PageLoader label="Loading dashboard..." />
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-student-text">Dashboard</h1>
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  const courseProgress = data?.courseProgress ?? 0;
  const recentPaymentAmount = data?.recentPaymentAmount ?? 0;
  const recentPaymentDate = data?.recentPaymentDate ?? '';

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-student-text">
          Welcome back, {greetingName}
        </h1>
        <p className="mt-1 text-sm text-student-muted">
          {data?.primaryCourseTitle
            ? `Here's your ${data.primaryCourseTitle} progress.`
            : "Here's an overview of your learning progress."}
        </p>
      </div>

      {/* Quick Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {QUICK_STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className={`rounded-2xl bg-gradient-to-br ${stat.gradient} p-5 text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">{stat.getValue(dashboardData)}</p>
                  <p className="mt-1 text-sm font-medium text-white/80">{stat.label}</p>
                </div>
                <div className="rounded-xl bg-white/20 p-3">
                  <Icon className={`size-6 ${stat.iconColor}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bento Grid — Row 1 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Continue Learning / Course Progress */}
        {data?.primaryCourseTitle ? (
          <DashboardCard
            icon={BookOpen}
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
            title="Continue Learning"
            subtitle={data.primaryCourseTitle}
            gradient="from-blue-50 via-blue-50/80 to-indigo-50"
          >
            <div className="flex items-center justify-center py-2">
              <ProgressRing value={courseProgress} />
            </div>
            <Button
              variant="link"
              className="mt-2 h-auto p-0 text-sm text-student-primary font-medium"
              onClick={() => onNavigate('/student/courses')}
            >
              Continue Learning
              <ArrowRight className="ml-1 size-3.5" />
            </Button>
          </DashboardCard>
        ) : null}

        {/* Overall Progress */}
        <DashboardCard
          icon={TrendingUp}
          iconBg="bg-emerald-100"
          iconColor="text-emerald-600"
          title="Overall Progress"
          subtitle="All courses combined"
          gradient="from-emerald-50 via-green-50/80 to-teal-50"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Completion</span>
              <span className="font-semibold text-emerald-600">{courseProgress}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700 ease-out"
                style={{ width: `${Math.min(courseProgress, 100)}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-lg bg-white/60 p-2 text-center">
                <p className="text-lg font-bold text-slate-800">{data?.completedAssignments ?? 0}</p>
                <p className="text-xs text-slate-500">Completed</p>
              </div>
              <div className="rounded-lg bg-white/60 p-2 text-center">
                <p className="text-lg font-bold text-slate-800">{data?.currentAssignments ?? 0}</p>
                <p className="text-xs text-slate-500">Pending</p>
              </div>
            </div>
          </div>
        </DashboardCard>

        {/* Quick Stats Grid */}
        <DashboardCard
          icon={BarChart3}
          iconBg="bg-slate-100"
          iconColor="text-slate-600"
          title="Quick Stats"
          gradient="from-slate-50 via-gray-50/80 to-zinc-50"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/80 p-3 text-center shadow-sm">
              <Target className="mx-auto mb-1 size-4 text-blue-500" />
              <p className="text-lg font-bold text-slate-800">{data?.completedAssignments ?? 0}</p>
              <p className="text-[11px] text-slate-500">Tasks Done</p>
            </div>
            <div className="rounded-xl bg-white/80 p-3 text-center shadow-sm">
              <FileText className="mx-auto mb-1 size-4 text-purple-500" />
              <p className="text-lg font-bold text-slate-800">{data?.upcomingExams ?? 0}</p>
              <p className="text-[11px] text-slate-500">Exams Due</p>
            </div>
            <div className="rounded-xl bg-white/80 p-3 text-center shadow-sm">
              <TrendingUp className="mx-auto mb-1 size-4 text-emerald-500" />
              <p className="text-lg font-bold text-slate-800">{courseProgress}%</p>
              <p className="text-[11px] text-slate-500">Avg Score</p>
            </div>
            <div className="rounded-xl bg-white/80 p-3 text-center shadow-sm">
              <Flame className="mx-auto mb-1 size-4 text-amber-500" />
              <p className="text-lg font-bold text-slate-800">{data?.streakCurrent ?? 0}</p>
              <p className="text-[11px] text-slate-500">Day Streak</p>
            </div>
          </div>
        </DashboardCard>
      </div>

      {/* Bento Grid — Row 2 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Study Streak */}
        <DashboardCard
          icon={Flame}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
          title="Study Streak"
          subtitle="Keep your momentum going!"
          gradient="from-amber-50 via-yellow-50/80 to-orange-50"
        >
          <div className="flex items-baseline gap-3 mt-2">
            <span className="text-4xl font-bold text-amber-600">{data?.streakCurrent ?? 0}</span>
            <span className="text-sm text-slate-500">day streak</span>
            <span className="ml-auto text-sm text-slate-400">{data?.streakTotal ?? 0} total days studied</span>
          </div>
        </DashboardCard>

        {/* Recent Payment */}
        <DashboardCard
          icon={CreditCard}
          iconBg="bg-emerald-100"
          iconColor="text-emerald-600"
          title="Recent Payment"
          gradient="from-emerald-50 via-green-50/80 to-teal-50"
        >
          <div className="mt-2">
            {recentPaymentAmount > 0 ? (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-800">{formatCurrency(recentPaymentAmount)}</span>
                <span className="text-sm text-slate-500">
                  on {recentPaymentDate ? formatDate(recentPaymentDate) : 'N/A'}
                </span>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No payments yet</p>
            )}
            <Button
              variant="link"
              className="mt-3 h-auto p-0 text-sm text-student-primary font-medium"
              onClick={() => onNavigate('/student/payments')}
            >
              View All Payments
              <ArrowRight className="ml-1 size-3.5" />
            </Button>
          </div>
        </DashboardCard>
      </div>

      {/* Bento Grid — Row 3: Tasks + Quick Links */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Tasks Today */}
        <DashboardCard
          icon={CheckCircle}
          iconBg="bg-green-100"
          iconColor="text-green-600"
          title="Tasks Today"
          subtitle="Your schedule for today"
          gradient="from-green-50 via-emerald-50/80 to-teal-50"
        >
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-slate-800">{data?.scheduledTasks ?? 0}</span>
            <span className="text-sm text-slate-500">scheduled</span>
            {(data?.overdueTasks ?? 0) > 0 ? (
              <span className="ml-auto text-sm font-medium text-red-600">{data?.overdueTasks} overdue</span>
            ) : (
              <span className="ml-auto text-sm text-emerald-600">All caught up!</span>
            )}
          </div>
        </DashboardCard>

        {/* Quick Links */}
        <div className="space-y-3">
          {[
            { label: 'View All Assignments', detail: `${data?.currentAssignments ?? 0} current`, icon: ClipboardList, iconBg: 'bg-orange-100', iconColor: 'text-orange-600', href: '/student/grades' },
            { label: 'View All Exams', detail: `${data?.upcomingExams ?? 0} upcoming`, icon: FileText, iconBg: 'bg-red-100', iconColor: 'text-red-600', href: '/student/grades' },
            { label: 'My Courses', detail: `${data?.coursesCount ?? 0} enrolled`, icon: BookOpen, iconBg: 'bg-blue-100', iconColor: 'text-blue-600', href: '/student/courses' },
          ].map((link) => {
            const LinkIcon = link.icon;
            return (
              <button
                key={link.label}
                type="button"
                className="flex w-full items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                onClick={() => onNavigate(link.href)}
              >
                <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${link.iconBg}`}>
                  <LinkIcon className={`size-5 ${link.iconColor}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800">{link.label}</p>
                  <p className="text-xs text-slate-500">{link.detail}</p>
                </div>
                <ArrowRight className="size-4 text-slate-400" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
