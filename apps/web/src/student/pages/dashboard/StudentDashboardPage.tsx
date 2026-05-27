import { useMemo } from 'react';
import {
  BookOpen, Clock, Flame, Target, CheckCircle,
  Sparkles, Calendar, Trophy, Zap, type LucideIcon,
} from 'lucide-react';
import type { EChartsOption } from 'echarts';
import { DashboardLoader } from '@/components/ui/dashboard-loader';
import { Button } from '@/components/ui/button';
import { EChart } from '@/components/EChart';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { useStudentLayout } from '../../layout/StudentLayoutContext.js';
import type { StudentDashboardSnapshot } from '../../student-portal-api.js';
import type { StudentPageProps } from '../../routing/student-routes.js';

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

const TIPS_OF_THE_DAY = [
  'Believe you can and you\'re halfway there.',
  'Small daily improvements lead to staggering long-term results.',
  'The expert in anything was once a beginner.',
  'Learn as if you will live forever.',
  'Success is the sum of small efforts repeated day in and day out.',
  'Your future is created by what you do today, not tomorrow.',
];

export default function StudentDashboardPage({ api, session, onNavigate }: StudentPageProps) {
  const { data, loading, error } = useAdminPageData(
    () => api.loadDashboard(session.token),
    [api, session.token],
  );
  const { currentUser } = useStudentLayout();

  // Tip of the Day rotates by date (deterministic per day so it doesn't
  // flicker on re-renders, but the student gets a fresh quote daily).
  const todaysTipIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % TIPS_OF_THE_DAY.length;
  const todaysTip = TIPS_OF_THE_DAY[todaysTipIndex] ?? TIPS_OF_THE_DAY[0];

  const dashboardData = useMemo(() => data ?? EMPTY_DASHBOARD, [data]);
  const firstName = (currentUser?.name.split(/\s+/)[0] ?? '').trim();
  const greetingName = firstName || 'there';

  const now = new Date();
  const formattedDate = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });

  if (loading) {
    return <DashboardLoader label="dashboard data" />;
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

  const courseProgress = dashboardData.courseProgress;
  const completedTasks = dashboardData.completedAssignments;
  const totalTasks = dashboardData.completedAssignments + dashboardData.currentAssignments + dashboardData.upcomingAssignments;
  const taskCompletionPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Achievements derived from existing data — milestones the student has
  // hit. Naji 2026-05-07 redesign — replaces the static placeholder.
  const achievements: { label: string; icon: LucideIcon; earned: boolean; tone: string }[] = [
    { label: 'First Course Started', icon: BookOpen, earned: dashboardData.coursesCount > 0, tone: 'from-blue-400 to-indigo-500' },
    { label: 'On the Streak', icon: Flame, earned: dashboardData.streakCurrent >= 3, tone: 'from-amber-400 to-orange-500' },
    { label: 'Task Completed', icon: CheckCircle, earned: dashboardData.completedAssignments > 0, tone: 'from-emerald-400 to-green-500' },
    { label: 'Half Way There', icon: Target, earned: courseProgress >= 50, tone: 'from-violet-400 to-purple-500' },
    { label: '7-Day Warrior', icon: Trophy, earned: dashboardData.streakTotal >= 7, tone: 'from-rose-400 to-pink-500' },
    { label: 'Course Crusher', icon: Sparkles, earned: courseProgress >= 100, tone: 'from-cyan-400 to-sky-500' },
  ];
  const achievementsEarned = achievements.filter((a) => a.earned).length;

  return (
    <div className="space-y-6">
      {/* Welcome banner — Naji 2026-05-07 reskin. Hero greeting with the
          subtitle showing course-completion sentence. */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-student-text sm:text-3xl">
            Welcome back, <span className="text-student-primary">{greetingName}</span>!{' '}
            <span aria-hidden="true">👋</span>
          </h1>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-student-muted">
            <Sparkles aria-hidden="true" className="size-4 text-student-primary" />
            You've completed <span className="font-semibold text-student-primary">{courseProgress}%</span> of your course
          </p>
        </div>
        <p className="text-xs text-student-muted">{formattedDate}</p>
      </div>

      {/* Top row: Continue Learning + Watch Time + Quiz Score (3-card row) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Continue Learning — left card spanning a wider area on desktop */}
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-student-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-student-primary">
            <BookOpen aria-hidden="true" className="size-3" />
            Continue Learning
          </div>
          <h2 className="text-lg font-bold leading-snug text-student-text">
            {dashboardData.primaryCourseTitle || 'No course in progress'}
          </h2>
          {dashboardData.primaryCourseTitle ? (
            <>
              <div className="mt-3 flex items-center justify-between text-xs text-student-muted">
                <span>Progress</span>
                <span className="font-semibold text-student-text">{courseProgress}%</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-student-primary to-student-accent transition-all duration-500"
                  style={{ width: `${Math.min(courseProgress, 100)}%` }}
                />
              </div>
              <Button
                onClick={() => onNavigate('/student/courses')}
                className="mt-4 h-11 w-full rounded-xl bg-slate-900 text-sm font-semibold text-white hover:bg-slate-800"
              >
                <span className="inline-flex items-center gap-2">
                  ▶ Resume Course
                </span>
              </Button>
            </>
          ) : (
            <Button
              onClick={() => onNavigate('/student/courses')}
              variant="outline"
              className="mt-4 h-11 w-full rounded-xl"
            >
              Browse Courses
            </Button>
          )}
        </div>

        {/* Tasks Done card (Watch Time analogue — using existing data) */}
        <SparklineStatCard
          icon={Clock}
          label="Tasks Done"
          value={`${completedTasks}`}
          sublabel={totalTasks > 0 ? `${taskCompletionPct}% completion` : 'No tasks yet'}
          tint="rose"
          sparkPercent={taskCompletionPct}
        />

        {/* Streak card (Quiz Score analogue) */}
        <SparklineStatCard
          icon={Flame}
          label="Current Streak"
          value={`${dashboardData.streakCurrent}`}
          sublabel={dashboardData.streakCurrent > 0 ? `${dashboardData.streakTotal} total days` : 'Start studying'}
          tint="amber"
          sparkPercent={Math.min(dashboardData.streakCurrent * 10, 100)}
        />
      </div>

      {/* Tip of the day — full-width brand-tinted card */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-[#3B5BBE] via-[#4A6EDB] to-[#5A7BE8] p-5 text-white shadow-md">
        <div className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
            <Sparkles aria-hidden="true" className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/85">Tip of the day</p>
            <p className="mt-1 text-base font-medium leading-snug">"{todaysTip}"</p>
          </div>
        </div>
      </div>

      {/* Two-column grid: Overall Progress gauge + Streak + Live (right) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Overall Progress — semicircular gauge */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-2 flex items-center gap-1.5">
            <Target aria-hidden="true" className="size-4 text-emerald-600" />
            <h2 className="text-base font-bold text-student-text">Overall Progress</h2>
          </div>
          <div className="flex flex-col items-center justify-center py-3">
            <SemicircleGauge percentage={courseProgress} />
            <p className="-mt-3 text-xs font-medium text-student-muted">Course Completion</p>
            <div className="mt-4 grid w-full grid-cols-3 gap-3 sm:max-w-md">
              <MiniMetric label="Courses" value={String(dashboardData.coursesCount)} />
              <MiniMetric label="Completed Tasks" value={String(completedTasks)} />
              <MiniMetric label="Pending" value={String(dashboardData.currentAssignments)} />
            </div>
          </div>
        </div>

        {/* Streak panel — current / best / status */}
        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-50">
                <Flame aria-hidden="true" className="size-5 text-amber-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-student-muted">Current Streak</p>
                <p className="mt-0.5 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-student-text">{dashboardData.streakCurrent}</span>
                  <span className="text-xs text-student-muted">days</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('/student/courses')}
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700 transition-colors hover:bg-amber-100"
              >
                <Zap aria-hidden="true" className="size-3" />
                Study now
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-student-muted">Best</p>
              <p className="mt-1 text-base font-bold text-student-text">{dashboardData.streakTotal} days</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-student-muted">Status</p>
              <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-emerald-600">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                {dashboardData.streakCurrent > 0 ? 'Growing' : 'Begin'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Learning Goals + Upcoming Live + Achievements */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Learning Goals (Daily Goal placeholder) */}
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-1.5">
            <Target aria-hidden="true" className="size-4 text-emerald-600" />
            <h2 className="text-base font-bold text-student-text">Learning Goals</h2>
          </div>
          <div className="rounded-xl bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-student-text">Daily Goal</p>
              <p className="text-sm font-bold text-student-text">{taskCompletionPct}%</p>
            </div>
            <p className="mt-0.5 text-[11px] text-student-muted">{completedTasks} / {totalTasks || 0} tasks</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${Math.min(taskCompletionPct, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Upcoming Live */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Calendar aria-hidden="true" className="size-4 text-student-primary" />
              <h2 className="text-base font-bold text-student-text">Upcoming Live</h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('/student/courses')}
              className="text-xs font-medium text-student-primary hover:underline"
            >
              See all
            </button>
          </div>
          {dashboardData.scheduledTasks > 0 ? (
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-sm font-semibold text-student-text">
                {dashboardData.scheduledTasks} session{dashboardData.scheduledTasks === 1 ? '' : 's'} scheduled
              </p>
              <p className="mt-0.5 text-[11px] text-student-muted">Open My Courses → Live Classes to see details</p>
            </div>
          ) : (
            <p className="rounded-xl bg-slate-50 p-3 text-sm text-student-muted">No upcoming sessions</p>
          )}
        </div>

        {/* Achievements */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Trophy aria-hidden="true" className="size-4 text-amber-500" />
              <h2 className="text-base font-bold text-student-text">Achievements</h2>
            </div>
            <p className="text-xs font-semibold text-student-muted">
              {achievementsEarned}/{achievements.length} earned
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {achievements.map((a) => {
              const A = a.icon;
              return (
                <div
                  key={a.label}
                  className={`flex aspect-square flex-col items-center justify-center rounded-xl text-center transition-all ${
                    a.earned
                      ? `bg-gradient-to-br ${a.tone} text-white shadow-sm`
                      : 'bg-slate-100 text-slate-400'
                  }`}
                  title={a.label}
                >
                  <A aria-hidden="true" className="size-5" />
                  <p className="mt-1 line-clamp-2 px-1 text-[9px] font-semibold leading-tight">{a.label}</p>
                </div>
              );
            })}
          </div>
          {achievementsEarned < achievements.length ? (
            <p className="mt-3 text-center text-[10px] text-student-muted">Keep going!</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ─── Helper components ──────────────────────────────────────── */

// Card showing a metric with an icon, value, sublabel, and a horizontal
// progress bar at the bottom acting as a visual sparkline equivalent.
function SparklineStatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  tint,
  sparkPercent,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sublabel: string;
  tint: 'rose' | 'amber';
  sparkPercent: number;
}) {
  const palette =
    tint === 'rose'
      ? { bg: 'bg-rose-50', icon: 'text-rose-600', bar: 'bg-rose-500' }
      : { bg: 'bg-amber-50', icon: 'text-amber-600', bar: 'bg-amber-500' };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${palette.bg}`}>
          <Icon aria-hidden="true" className={`size-5 ${palette.icon}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-student-muted">{label}</p>
          <p className="mt-1 text-2xl font-bold text-student-text">{value}</p>
          <p className="mt-0.5 truncate text-[11px] text-student-muted">{sublabel}</p>
        </div>
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${palette.bar} transition-all duration-500`}
          style={{ width: `${Math.min(Math.max(sparkPercent, 4), 100)}%` }}
        />
      </div>
    </div>
  );
}

// Semicircular gauge used by the Overall Progress card. Apache ECharts.
//
// Track has the TTII blue→purple→orange gradient; needle + central dot match the
// previous SVG version's TTII purple. Tick marks every 10%.
function SemicircleGauge({ percentage }: { percentage: number }) {
  const clamped = Math.max(0, Math.min(100, percentage));
  const option = useMemo<EChartsOption>(() => ({
    series: [
      {
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        center: ['50%', '78%'],
        radius: '100%',
        min: 0,
        max: 100,
        progress: {
          show: true,
          width: 14,
          roundCap: true,
          itemStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 1, y2: 0,
              colorStops: [
                { offset: 0, color: '#3B5BBE' },
                { offset: 0.6, color: '#8F2774' },
                { offset: 1, color: '#F06543' },
              ],
            },
          },
        },
        axisLine: { lineStyle: { width: 14, color: [[1, '#e2e8f0']] } },
        axisTick: {
          show: true,
          length: 6,
          distance: -22,
          lineStyle: { color: '#cbd5e1', width: 1 },
          splitNumber: 1,
        },
        splitLine: { show: false },
        axisLabel: { show: false },
        anchor: {
          show: true,
          size: 16,
          itemStyle: { color: '#ffffff', borderColor: '#8F2774', borderWidth: 3 },
        },
        pointer: {
          show: true,
          length: '70%',
          width: 6,
          itemStyle: { color: '#8F2774' },
        },
        detail: {
          valueAnimation: true,
          offsetCenter: [0, '-5%'],
          formatter: (v) => `${Math.round(Number(v))}%`,
          color: '#0f172a',
          fontSize: 28,
          fontWeight: 700,
        },
        data: [{ value: clamped }],
      },
    ],
    animationDuration: 800,
  }), [clamped]);

  return (
    <div className="relative w-full max-w-[260px]">
      <EChart option={option} className="h-32 w-full" ariaLabel={`Overall progress: ${clamped}%`} />
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 text-center">
      <p className="text-base font-bold text-student-text">{value}</p>
      <p className="text-[10px] text-student-muted">{label}</p>
    </div>
  );
}
