import { useMemo } from 'react';
import {
  BookOpen, Flame, Target, CheckCircle, ClipboardList,
  Sparkles, Calendar, Trophy, Zap, Radio, ArrowRight, PlayCircle, Wallet, type LucideIcon,
} from 'lucide-react';
import type { EChartsOption } from 'echarts';
import { DashboardLoader } from '@/components/ui/dashboard-loader';
import { Button } from '@/components/ui/button';
import { EChart } from '@/components/EChart';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asNumber, asString, formatCurrency } from '../../../admin/shared/utils/admin-data-utils.js';
import { useStudentLayout } from '../../layout/StudentLayoutContext.js';
import type {
  StudentDashboardSnapshot,
  StudentInstallmentItem,
  StudentLearningSnapshot,
} from '../../student-portal-api.js';
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

// Stat-card palette — distinct tints give the grid rhythm without leaving the
// brand. Each maps to a tinted icon chip.
type Tint = 'primary' | 'accent' | 'blue' | 'amber' | 'emerald' | 'rose' | 'orange';
const TINTS: Record<Tint, { chip: string; icon: string }> = {
  primary: { chip: 'bg-student-primary/10', icon: 'text-student-primary' },
  accent: { chip: 'bg-student-accent/10', icon: 'text-student-accent' },
  blue: { chip: 'bg-blue-50', icon: 'text-blue-600' },
  amber: { chip: 'bg-amber-50', icon: 'text-amber-600' },
  emerald: { chip: 'bg-emerald-50', icon: 'text-emerald-600' },
  rose: { chip: 'bg-rose-50', icon: 'text-rose-600' },
  orange: { chip: 'bg-orange-50', icon: 'text-orange-600' },
};

// A single in-progress course derived from the learning snapshot: real
// content completion (0 < pct < 100) computed from per-lesson progress.
interface InProgressCourse {
  id: string;
  title: string;
  instructor: string;
  progress: number;
}

const PAID_STATUSES = new Set(['paid', 'success', 'completed']);

// Find the next outstanding installment: unpaid (no paid date / non-paid
// status), earliest due date first. Returns null when nothing is due.
function findNextDue(installments: StudentInstallmentItem[]): StudentInstallmentItem | null {
  const outstanding = installments.filter(
    (i) => i.amount > 0 && !i.paidDate && !PAID_STATUSES.has(i.status.trim().toLowerCase()),
  );
  if (outstanding.length === 0) {
    return null;
  }
  return outstanding
    .slice()
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0] ?? null;
}

// Derive in-progress courses from the learning snapshot. Per-course
// completion mirrors StudentLearningPage: average completed_percentage over
// the course's lessons (joined to subjects via course_id). Only courses
// that are started but not finished (0 < pct < 100) are returned.
function deriveInProgressCourses(learning: StudentLearningSnapshot): InProgressCourse[] {
  return learning.courses
    .map((course): InProgressCourse => {
      const id = asString(course.id);
      const courseSubjectIds = new Set(
        learning.subjects.filter((s) => asString(s.course_id) === id).map((s) => asString(s.id)),
      );
      const courseLessons = learning.lessons.filter((l) => courseSubjectIds.has(asString(l.subject_id)));
      const progress = courseLessons.length === 0
        ? 0
        : Math.round(
            courseLessons.reduce((sum, l) => sum + asNumber(l.completed_percentage), 0) / courseLessons.length,
          );
      const instructor =
        asString(course.instructor) ||
        asString(course.faculty_name) ||
        asString(course.trainer_name) ||
        asString(course.subject_title);
      return { id, title: asString(course.title) || 'Untitled Course', instructor, progress };
    })
    .filter((c) => c.progress > 0 && c.progress < 100);
}

function formatDueDate(value: string): string {
  if (!value) {
    return 'No due date';
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return value;
  }
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

type DashboardBundle = readonly [StudentDashboardSnapshot, StudentLearningSnapshot, StudentInstallmentItem[]];

export default function StudentDashboardPage({ api, session, onNavigate }: StudentPageProps) {
  const { data, loading, error } = useAdminPageData<DashboardBundle>(
    () => Promise.all([
      api.loadDashboard(session.token),
      api.loadLearning(session.token),
      api.loadInstallments(session.token),
    ]),
    [api, session.token],
  );
  const { currentUser } = useStudentLayout();

  const todaysTipIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % TIPS_OF_THE_DAY.length;
  const todaysTip = TIPS_OF_THE_DAY[todaysTipIndex] ?? TIPS_OF_THE_DAY[0];

  const dashboardData = useMemo(() => data?.[0] ?? EMPTY_DASHBOARD, [data]);
  const inProgressCourses = useMemo(
    () => (data ? deriveInProgressCourses(data[1]) : []),
    [data],
  );
  const nextDue = useMemo(() => (data ? findNextDue(data[2]) : null), [data]);
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

  // EduPulse's 6-card stat grid, mapped to our real metrics. (EduPulse also
  // shows Average Grade / Attendance / Certificates — we have no backing data
  // for those yet, so we surface our equivalents instead.)
  const stats: { icon: LucideIcon; label: string; value: string; sublabel: string; tint: Tint }[] = [
    { icon: BookOpen, label: 'Enrolled Courses', value: String(dashboardData.coursesCount), sublabel: dashboardData.coursesCount > 0 ? 'Keep it up' : 'Browse the catalog', tint: 'primary' },
    { icon: Radio, label: 'Upcoming Classes', value: String(dashboardData.scheduledTasks), sublabel: dashboardData.scheduledTasks > 0 ? 'Live sessions scheduled' : 'None scheduled', tint: 'blue' },
    { icon: ClipboardList, label: 'Pending Assignments', value: String(dashboardData.currentAssignments), sublabel: dashboardData.currentAssignments > 0 ? 'Due soon' : 'All caught up', tint: 'amber' },
    { icon: Target, label: 'Course Progress', value: `${courseProgress}%`, sublabel: 'Content completed', tint: 'emerald' },
    { icon: Flame, label: 'Current Streak', value: String(dashboardData.streakCurrent), sublabel: `${dashboardData.streakTotal} day best`, tint: 'rose' },
    { icon: CheckCircle, label: 'Completed Tasks', value: String(completedTasks), sublabel: totalTasks > 0 ? `${taskCompletionPct}% completion` : 'No tasks yet', tint: 'orange' },
    {
      icon: Wallet,
      label: 'Payment Due',
      value: nextDue ? formatCurrency(nextDue.amount) : formatCurrency(0),
      sublabel: nextDue ? `Due ${formatDueDate(nextDue.dueDate)}` : 'Nothing due',
      tint: 'accent',
    },
  ];

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
      {/* Hero header — greeting + Resume Learning CTA (EduPulse layout). */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-student-primary via-[#7d2266] to-[#5a1b4a] p-6 text-white shadow-lg sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-widest text-white/70">{formattedDate}</p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
              Welcome back, {greetingName}
            </h1>
            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-white/85">
              <Sparkles aria-hidden="true" className="size-4" />
              You've completed <span className="font-semibold text-white">{courseProgress}%</span>
              {dashboardData.primaryCourseTitle ? <> of {dashboardData.primaryCourseTitle}</> : ' of your course'}
            </p>
          </div>
          <Button
            onClick={() => onNavigate('/student/courses')}
            className="h-11 shrink-0 rounded-xl bg-white px-5 text-sm font-semibold text-student-primary shadow-sm hover:bg-white/90"
          >
            <PlayCircle aria-hidden="true" className="mr-2 size-4" />
            {dashboardData.primaryCourseTitle ? 'Resume Learning' : 'Browse Courses'}
          </Button>
        </div>
      </div>

      {/* Stat grid — 6 cards, 2x3 on desktop (EduPulse signature). */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4">
        {stats.map((s) => (
          <StatCard key={s.label} icon={s.icon} label={s.label} value={s.value} sublabel={s.sublabel} tint={s.tint} />
        ))}
      </div>

      {/* Continue Learning — in-progress course cards with progress + resume.
          Driven by real per-course content completion (loadLearning). Falls
          back to the primary-course card / empty state when nothing is
          mid-way through. */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-base font-bold text-student-text">
            <BookOpen aria-hidden="true" className="size-4 text-student-primary" />
            Continue Learning
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('/student/courses')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-student-primary hover:underline"
          >
            View all <ArrowRight aria-hidden="true" className="size-3" />
          </button>
        </div>
        {inProgressCourses.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {inProgressCourses.map((course) => (
              <ContinueLearningCard
                key={course.id}
                course={course}
                onResume={() => onNavigate('/student/courses')}
              />
            ))}
          </div>
        ) : dashboardData.primaryCourseTitle ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-student-primary to-student-accent text-white">
                <BookOpen aria-hidden="true" className="size-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-base font-bold text-student-text">{dashboardData.primaryCourseTitle}</h3>
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-student-primary to-student-accent transition-all duration-500"
                      style={{ width: `${Math.min(courseProgress, 100)}%` }}
                    />
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-student-text">{courseProgress}%</span>
                </div>
              </div>
              <Button
                onClick={() => onNavigate('/student/courses')}
                className="h-10 shrink-0 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Resume
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="text-sm text-student-muted">You're not enrolled in a course yet.</p>
            <Button onClick={() => onNavigate('/student/courses')} variant="outline" className="mt-3 rounded-xl">
              Browse Courses
            </Button>
          </div>
        )}
      </section>

      {/* Performance + side panels. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Performance — semicircular gauge. */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-2 flex items-center gap-1.5">
            <Target aria-hidden="true" className="size-4 text-emerald-600" />
            <h2 className="text-base font-bold text-student-text">Performance</h2>
          </div>
          <div className="flex flex-col items-center justify-center py-3">
            <SemicircleGauge percentage={courseProgress} />
            <p className="-mt-3 text-xs font-medium text-student-muted">Course Completion</p>
            <div className="mt-4 grid w-full grid-cols-3 gap-3 sm:max-w-md">
              <MiniMetric label="Courses" value={String(dashboardData.coursesCount)} />
              <MiniMetric label="Completed" value={String(completedTasks)} />
              <MiniMetric label="Pending" value={String(dashboardData.currentAssignments)} />
            </div>
          </div>
        </div>

        {/* Right column: Upcoming Live + Streak. */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-base font-bold text-student-text">
                <Calendar aria-hidden="true" className="size-4 text-student-primary" />
                Upcoming Live
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('/student/live-classes')}
                className="text-xs font-medium text-student-primary hover:underline"
              >
                See all
              </button>
            </div>
            {dashboardData.scheduledTasks > 0 ? (
              <button
                type="button"
                onClick={() => onNavigate('/student/live-classes')}
                className="flex w-full items-center gap-3 rounded-xl bg-blue-50 p-3 text-left transition-colors hover:bg-blue-100"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600">
                  <Radio aria-hidden="true" className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-student-text">
                    {dashboardData.scheduledTasks} session{dashboardData.scheduledTasks === 1 ? '' : 's'} scheduled
                  </span>
                  <span className="block text-[11px] text-student-muted">Tap to view your live classes</span>
                </span>
              </button>
            ) : (
              <p className="rounded-xl bg-slate-50 p-3 text-sm text-student-muted">No upcoming sessions</p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-50">
                <Flame aria-hidden="true" className="size-5 text-amber-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-student-muted">Current Streak</p>
                <p className="mt-0.5 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-student-text">{dashboardData.streakCurrent}</span>
                  <span className="text-xs text-student-muted">days · {dashboardData.streakTotal} best</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('/student/courses')}
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700 transition-colors hover:bg-amber-100"
              >
                <Zap aria-hidden="true" className="size-3" />
                Study
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Achievements + Tip of the day. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-base font-bold text-student-text">
              <Trophy aria-hidden="true" className="size-4 text-amber-500" />
              Achievements
            </h2>
            <p className="text-xs font-semibold text-student-muted">{achievementsEarned}/{achievements.length} earned</p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {achievements.map((a) => {
              const A = a.icon;
              return (
                <div
                  key={a.label}
                  className={`flex aspect-square flex-col items-center justify-center rounded-xl text-center transition-all ${
                    a.earned ? `bg-gradient-to-br ${a.tone} text-white shadow-sm` : 'bg-slate-100 text-slate-400'
                  }`}
                  title={a.label}
                >
                  <A aria-hidden="true" className="size-5" />
                  <p className="mt-1 line-clamp-2 px-1 text-[9px] font-semibold leading-tight">{a.label}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-[#3B5BBE] via-[#4A6EDB] to-[#5A7BE8] p-5 text-white shadow-md">
          <div className="flex h-full flex-col">
            <div className="flex size-10 items-center justify-center rounded-xl bg-white/20">
              <Sparkles aria-hidden="true" className="size-5" />
            </div>
            <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-white/85">Tip of the day</p>
            <p className="mt-1 text-base font-medium leading-snug">"{todaysTip}"</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Helper components ──────────────────────────────────────── */

function StatCard({ icon: Icon, label, value, sublabel, tint }: {
  icon: LucideIcon; label: string; value: string; sublabel: string; tint: Tint;
}) {
  const t = TINTS[tint];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
      <div className={`mb-3 flex size-10 items-center justify-center rounded-xl ${t.chip}`}>
        <Icon aria-hidden="true" className={`size-5 ${t.icon}`} />
      </div>
      <p className="text-2xl font-bold text-student-text">{value}</p>
      <p className="mt-0.5 text-xs font-semibold text-student-text">{label}</p>
      <p className="mt-0.5 truncate text-[11px] text-student-muted">{sublabel}</p>
    </div>
  );
}

// In-progress course card: title, instructor/subject (when known), a bottom
// progress bar + percent, and a Resume CTA.
function ContinueLearningCard({ course, onResume }: { course: InProgressCourse; onResume: () => void }) {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-student-primary to-student-accent text-white">
          <BookOpen aria-hidden="true" className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm font-bold text-student-text">{course.title}</h3>
          {course.instructor ? (
            <p className="mt-0.5 truncate text-xs text-student-muted">{course.instructor}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-4 flex-1" />
      <div className="mb-3 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-student-primary transition-all duration-500"
            style={{ width: `${Math.min(course.progress, 100)}%` }}
          />
        </div>
        <span className="shrink-0 text-xs font-semibold text-student-text">{course.progress}%</span>
      </div>
      <Button
        onClick={onResume}
        className="h-10 w-full rounded-xl bg-slate-900 text-sm font-semibold text-white hover:bg-slate-800"
      >
        <PlayCircle aria-hidden="true" className="mr-2 size-4" />
        Resume
      </Button>
    </div>
  );
}

// Semicircular gauge — TTII blue→purple→orange track, purple needle.
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
        anchor: { show: true, size: 16, itemStyle: { color: '#ffffff', borderColor: '#8F2774', borderWidth: 3 } },
        pointer: { show: true, length: '70%', width: 6, itemStyle: { color: '#8F2774' } },
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
