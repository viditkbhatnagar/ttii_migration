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
    <svg
      width={size}
      height={size}
      role="img"
      aria-label={`${value}% complete`}
      className="text-student-primary"
    >
      <circle
        cx={center} cy={center} r={radius}
        fill="none" stroke="currentColor" strokeWidth={strokeWidth}
        className="text-slate-100"
      />
      <circle
        cx={center} cy={center} r={radius}
        fill="none" stroke="currentColor" strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${center} ${center})`}
        className="transition-all duration-500 ease-out"
      />
      <text
        x="50%" y="50%"
        textAnchor="middle" dominantBaseline="central"
        className="fill-student-text text-2xl font-semibold"
      >
        {value}%
      </text>
    </svg>
  );
}

/* ─── Dashboard Card Wrapper ──────────────────────────────── */

function DashboardCard({
  icon: Icon,
  iconTint,
  title,
  subtitle,
  children,
  className = '',
}: {
  icon: React.ElementType;
  iconTint: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-5 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${iconTint}`}>
          <Icon aria-hidden="true" className="size-5" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-800 text-base">{title}</h3>
          {subtitle ? <p className="text-xs text-slate-500 truncate">{subtitle}</p> : null}
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
  iconTint: string;
}

const QUICK_STATS: QuickStatDef[] = [
  {
    label: 'Courses',
    getValue: (d) => String(d.coursesCount),
    icon: BookOpen,
    iconTint: 'bg-blue-50 text-blue-600',
  },
  {
    label: 'Assignments',
    getValue: (d) => String(d.currentAssignments + d.upcomingAssignments),
    icon: ClipboardList,
    iconTint: 'bg-emerald-50 text-emerald-600',
  },
  {
    label: 'Exams',
    getValue: (d) => String(d.upcomingExams),
    icon: FileText,
    iconTint: 'bg-violet-50 text-violet-600',
  },
  {
    label: 'Notifications',
    getValue: (d) => String(d.notificationsCount),
    icon: Bell,
    iconTint: 'bg-amber-50 text-amber-600',
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
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {QUICK_STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-semibold text-student-text">{stat.getValue(dashboardData)}</p>
                  <p className="mt-0.5 text-xs font-medium text-student-muted">{stat.label}</p>
                </div>
                <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${stat.iconTint}`}>
                  <Icon aria-hidden="true" className="size-5" />
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
            iconTint="bg-blue-50 text-blue-600"
            title="Continue Learning"
            subtitle={data.primaryCourseTitle}
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
              <ArrowRight aria-hidden="true" className="ml-1 size-3.5" />
            </Button>
          </DashboardCard>
        ) : null}

        {/* Overall Progress */}
        <DashboardCard
          icon={TrendingUp}
          iconTint="bg-emerald-50 text-emerald-600"
          title="Overall Progress"
          subtitle="All courses combined"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-student-muted">Completion</span>
              <span className="font-semibold text-student-text">{courseProgress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-student-primary transition-all duration-500 ease-out"
                style={{ width: `${Math.min(courseProgress, 100)}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-lg bg-slate-50 p-2 text-center">
                <p className="text-lg font-semibold text-student-text">{data?.completedAssignments ?? 0}</p>
                <p className="text-xs text-student-muted">Completed</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2 text-center">
                <p className="text-lg font-semibold text-student-text">{data?.currentAssignments ?? 0}</p>
                <p className="text-xs text-student-muted">Pending</p>
              </div>
            </div>
          </div>
        </DashboardCard>

        {/* Quick Stats Grid */}
        <DashboardCard
          icon={BarChart3}
          iconTint="bg-slate-100 text-slate-600"
          title="Quick Stats"
        >
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-slate-50 p-3 text-center">
              <Target aria-hidden="true" className="mx-auto mb-1 size-4 text-slate-500" />
              <p className="text-lg font-semibold text-student-text">{data?.completedAssignments ?? 0}</p>
              <p className="text-[11px] text-student-muted">Tasks Done</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-center">
              <FileText aria-hidden="true" className="mx-auto mb-1 size-4 text-slate-500" />
              <p className="text-lg font-semibold text-student-text">{data?.upcomingExams ?? 0}</p>
              <p className="text-[11px] text-student-muted">Exams Due</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-center">
              <TrendingUp aria-hidden="true" className="mx-auto mb-1 size-4 text-slate-500" />
              <p className="text-lg font-semibold text-student-text">{courseProgress}%</p>
              <p className="text-[11px] text-student-muted">Avg Score</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-center">
              <Flame aria-hidden="true" className="mx-auto mb-1 size-4 text-slate-500" />
              <p className="text-lg font-semibold text-student-text">{data?.streakCurrent ?? 0}</p>
              <p className="text-[11px] text-student-muted">Day Streak</p>
            </div>
          </div>
        </DashboardCard>
      </div>

      {/* Bento Grid — Row 2 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Study Streak */}
        <DashboardCard
          icon={Flame}
          iconTint="bg-amber-50 text-amber-600"
          title="Study Streak"
          subtitle="Keep your momentum going"
        >
          <div className="flex items-baseline gap-3 mt-1">
            <span className="text-3xl font-semibold text-student-text">{data?.streakCurrent ?? 0}</span>
            <span className="text-sm text-student-muted">day streak</span>
            <span className="ml-auto text-sm text-student-muted">{data?.streakTotal ?? 0} total days</span>
          </div>
        </DashboardCard>

        {/* Recent Payment */}
        <DashboardCard
          icon={CreditCard}
          iconTint="bg-emerald-50 text-emerald-600"
          title="Recent Payment"
        >
          <div className="mt-1">
            {recentPaymentAmount > 0 ? (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-student-text">{formatCurrency(recentPaymentAmount)}</span>
                <span className="text-sm text-student-muted">
                  on {recentPaymentDate ? formatDate(recentPaymentDate) : 'N/A'}
                </span>
              </div>
            ) : (
              <p className="text-sm text-student-muted">No payments yet</p>
            )}
            <Button
              variant="link"
              className="mt-3 h-auto p-0 text-sm text-student-primary font-medium"
              onClick={() => onNavigate('/student/payments')}
            >
              View All Payments
              <ArrowRight aria-hidden="true" className="ml-1 size-3.5" />
            </Button>
          </div>
        </DashboardCard>
      </div>

      {/* Bento Grid — Row 3: Tasks + Quick Links */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Tasks Today */}
        <DashboardCard
          icon={CheckCircle}
          iconTint="bg-green-50 text-green-600"
          title="Tasks Today"
          subtitle="Your schedule for today"
        >
          <div className="mt-1 flex items-baseline gap-3">
            <span className="text-3xl font-semibold text-student-text">{data?.scheduledTasks ?? 0}</span>
            <span className="text-sm text-student-muted">scheduled</span>
            {(data?.overdueTasks ?? 0) > 0 ? (
              <span className="ml-auto text-sm font-medium text-red-600">{data?.overdueTasks} overdue</span>
            ) : (
              <span className="ml-auto text-sm text-emerald-600">All caught up</span>
            )}
          </div>
        </DashboardCard>

        {/* Quick Links */}
        <div className="space-y-2">
          {[
            { label: 'View All Assignments', detail: `${data?.currentAssignments ?? 0} current`, icon: ClipboardList, iconTint: 'bg-orange-50 text-orange-600', href: '/student/grades' },
            { label: 'View All Exams', detail: `${data?.upcomingExams ?? 0} upcoming`, icon: FileText, iconTint: 'bg-red-50 text-red-600', href: '/student/grades' },
            { label: 'My Courses', detail: `${data?.coursesCount ?? 0} enrolled`, icon: BookOpen, iconTint: 'bg-blue-50 text-blue-600', href: '/student/courses' },
          ].map((link) => {
            const LinkIcon = link.icon;
            return (
              <button
                key={link.label}
                type="button"
                className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition-colors hover:bg-slate-50"
                onClick={() => onNavigate(link.href)}
              >
                <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${link.iconTint}`}>
                  <LinkIcon aria-hidden="true" className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-student-text">{link.label}</p>
                  <p className="text-xs text-student-muted">{link.detail}</p>
                </div>
                <ArrowRight aria-hidden="true" className="size-4 text-slate-400" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
