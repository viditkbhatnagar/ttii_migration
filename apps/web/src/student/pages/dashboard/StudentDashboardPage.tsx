import { useMemo } from 'react';
import { BookOpen, ClipboardList, FileText, Bell, Flame, CheckCircle, CreditCard, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { formatCurrency, formatDate } from '../../../admin/shared/utils/admin-data-utils.js';
import type { StudentPageProps } from '../../routing/student-routes.js';

interface StatCardDef {
  label: string;
  getValue: (data: Record<string, unknown>) => string;
  getDetail: (data: Record<string, unknown>) => string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
}

const STAT_CARDS: StatCardDef[] = [
  {
    label: 'Enrolled Courses',
    getValue: (d) => String(d.coursesCount ?? 0),
    getDetail: (d) => (d.primaryCourseTitle as string) || 'No courses',
    icon: BookOpen,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-100',
  },
  {
    label: 'Assignments Due',
    getValue: (d) => String(((d.currentAssignments as number) ?? 0) + ((d.upcomingAssignments as number) ?? 0)),
    getDetail: (d) => `${d.completedAssignments ?? 0} completed`,
    icon: ClipboardList,
    iconColor: 'text-orange-600',
    iconBg: 'bg-orange-100',
  },
  {
    label: 'Upcoming Exams',
    getValue: (d) => String(d.upcomingExams ?? 0),
    getDetail: (d) => `${d.expiredExams ?? 0} past exams`,
    icon: FileText,
    iconColor: 'text-red-600',
    iconBg: 'bg-red-100',
  },
  {
    label: 'Notifications',
    getValue: (d) => String(d.notificationsCount ?? 0),
    getDetail: () => 'Unread messages',
    icon: Bell,
    iconColor: 'text-green-600',
    iconBg: 'bg-green-100',
  },
];

export default function StudentDashboardPage({ api, session, onNavigate }: StudentPageProps) {
  const { data, loading, error } = useAdminPageData(
    () => api.loadDashboard(session.token),
    [api, session.token],
  );

  const dashboardData = useMemo(() => (data as unknown as Record<string, unknown>) ?? {}, [data]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="bg-white">
              <CardContent className="flex items-center gap-4 p-5">
                <Skeleton className="size-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <Card className="bg-white">
          <CardContent className="py-12 text-center">
            <p className="text-sm text-red-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const courseProgress = data?.courseProgress ?? 0;
  const recentPaymentAmount = data?.recentPaymentAmount ?? 0;
  const recentPaymentDate = data?.recentPaymentDate ?? '';

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">
          Welcome back{data?.primaryCourseTitle ? `, ${data.primaryCourseTitle} student` : ''}!
        </h1>
        <p className="mt-1 text-sm text-gray-500">Here's an overview of your learning progress.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {STAT_CARDS.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="bg-white">
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`flex size-10 shrink-0 items-center justify-center rounded-full ${stat.iconBg}`}>
                  <Icon className={`size-5 ${stat.iconColor}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stat.getValue(dashboardData)}</p>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-xs text-gray-400">{stat.getDetail(dashboardData)}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Course Progress + Recent Payment */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Course Progress */}
        {data?.primaryCourseTitle ? (
          <Card className="bg-white">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ttii-primary/10">
                  <BookOpen className="size-5 text-ttii-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900">Course Progress</h3>
                  <p className="truncate text-sm text-gray-500">{data.primaryCourseTitle}</p>
                </div>
                <span className="text-2xl font-bold text-ttii-primary">{courseProgress}%</span>
              </div>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-ttii-primary transition-all"
                  style={{ width: `${Math.min(courseProgress, 100)}%` }}
                />
              </div>
              <Button
                variant="link"
                className="mt-2 h-auto p-0 text-sm text-ttii-primary"
                onClick={() => onNavigate('/student/learning')}
              >
                Continue Learning
                <ArrowRight className="ml-1 size-3.5" />
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {/* Recent Payment */}
        <Card className="bg-white">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                <CreditCard className="size-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Recent Payment</h3>
                <p className="text-sm text-gray-500">
                  {recentPaymentAmount > 0
                    ? `${formatCurrency(recentPaymentAmount)} on ${recentPaymentDate ? formatDate(recentPaymentDate) : 'N/A'}`
                    : 'No payments yet'}
                </p>
              </div>
            </div>
            <Button
              variant="link"
              className="mt-3 h-auto p-0 text-sm text-ttii-primary"
              onClick={() => onNavigate('/student/payments')}
            >
              View All Payments
              <ArrowRight className="ml-1 size-3.5" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Streak + Tasks */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Study Streak */}
        <Card className="bg-white">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
                <Flame className="size-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Study Streak</h3>
                <p className="text-sm text-gray-500">Keep your momentum going!</p>
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-3xl font-bold text-amber-600">{data?.streakCurrent ?? 0}</span>
              <span className="text-sm text-gray-500">day streak</span>
              <span className="ml-auto text-sm text-gray-400">{data?.streakTotal ?? 0} total days studied</span>
            </div>
          </CardContent>
        </Card>

        {/* Tasks Today */}
        <Card className="bg-white">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle className="size-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Tasks Today</h3>
                <p className="text-sm text-gray-500">Your schedule for today</p>
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-3xl font-bold text-gray-900">{data?.scheduledTasks ?? 0}</span>
              <span className="text-sm text-gray-500">scheduled</span>
              {(data?.overdueTasks ?? 0) > 0 ? (
                <span className="ml-auto text-sm font-medium text-red-600">{data?.overdueTasks} overdue</span>
              ) : (
                <span className="ml-auto text-sm text-emerald-600">All caught up!</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card
          className="cursor-pointer bg-white transition-shadow hover:shadow-md"
          onClick={() => onNavigate('/student/assessments')}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-orange-100">
              <ClipboardList className="size-4 text-orange-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900">View All Assignments</p>
              <p className="text-xs text-gray-500">{data?.currentAssignments ?? 0} current</p>
            </div>
            <ArrowRight className="size-4 text-gray-400" />
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer bg-white transition-shadow hover:shadow-md"
          onClick={() => onNavigate('/student/assessments')}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-red-100">
              <FileText className="size-4 text-red-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900">View All Exams</p>
              <p className="text-xs text-gray-500">{data?.upcomingExams ?? 0} upcoming</p>
            </div>
            <ArrowRight className="size-4 text-gray-400" />
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer bg-white transition-shadow hover:shadow-md"
          onClick={() => onNavigate('/student/learning')}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-100">
              <BookOpen className="size-4 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900">My Courses</p>
              <p className="text-xs text-gray-500">{data?.coursesCount ?? 0} enrolled</p>
            </div>
            <ArrowRight className="size-4 text-gray-400" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
