import { useMemo, useState, type ReactNode } from 'react';
import {
  BookOpen, Calendar, ClipboardList, Wallet, Award, PlayCircle, ArrowRight,
  FileText, Video, Bell, CheckCircle, Flame, Trophy, Sparkles, Clock,
  Rocket, TrendingUp, Crown,
  type LucideIcon,
} from 'lucide-react';
import { PageLoader } from '@/components/ui/page-loader';
import { Button } from '@/components/ui/button';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asNumber, asString, formatCurrency, formatDate } from '../../../admin/shared/utils/admin-data-utils.js';
import { useStudentLayout } from '../../layout/StudentLayoutContext.js';
import { cleanNotificationText } from '../../shared/notification-text.js';
import type {
  StudentDashboardSnapshot,
  StudentLearningSnapshot,
  StudentAssessmentSnapshot,
  StudentInstallmentItem,
  StudentNotificationsSnapshot,
} from '../../student-portal-api.js';
import type { StudentPageProps } from '../../routing/student-routes.js';

/* ─── Constants ──────────────────────────────────────────────── */

const PAID_STATUSES = new Set(['paid', 'success', 'completed']);
const MS_PER_DAY = 1000 * 60 * 60 * 24;
const RECENT_ACTIVITY_LIMIT = 5;

/* ─── Derived view models ────────────────────────────────────── */

// A live-class row (from loadAllLiveClasses) that is upcoming or in progress.
interface LiveRow {
  id: string;
  title: string;
  subject: string;
  instructor: string;
  date: string;
  fromTime: string;
  joinUrl: string;
  isToday: boolean;
}

// An in-progress course: real content completion (0 < pct < 100) computed from
// per-lesson progress, mirroring StudentLearningPage's enrolledCoursesMeta.
interface CourseProgressRow {
  id: string;
  title: string;
  instructor: string;
  progress: number;
}

// A catalog course the student is NOT enrolled in (Recommended Courses).
interface CatalogCourseRow {
  id: string;
  title: string;
  subjectCount: number;
  price: number;
  offerPrice: number;
}

type PriorityKind = 'assignment' | 'quiz' | 'payment';
type PriorityStatus = 'due-today' | 'overdue' | 'upcoming' | 'completed';

interface PriorityRow {
  id: string;
  kind: PriorityKind;
  title: string;
  context: string;
  status: PriorityStatus;
  action: { label: string; href: string };
}

interface ActivityRow {
  id: string;
  title: string;
  description: string;
  time: string;
  isRead: boolean;
}

interface BadgeRow {
  label: string;
  caption: string;
  icon: LucideIcon;
  tone: string;
  earned: boolean;
}

type DashboardBundle = readonly [
  StudentDashboardSnapshot,
  StudentLearningSnapshot,
  StudentAssessmentSnapshot,
  Record<string, unknown>[],
  StudentInstallmentItem[],
  StudentNotificationsSnapshot,
];

/* ─── Date helpers (display only; storage stays ISO) ─────────── */

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// Whole-day delta from today: 0 = today, <0 = past, >0 = future. null when the
// value isn't a parseable date.
function dayDelta(value: string): number | null {
  if (!value) {
    return null;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - startOfToday()) / MS_PER_DAY);
}

// "HH:MM:SS" / "HH:MM" → "9:30 AM". Falls back to the raw value.
function shortTime(value: string): string {
  if (!value) {
    return '';
  }
  const t = value.length > 8 ? value.slice(-8) : value;
  const d = new Date(`1970-01-01T${t}`);
  if (Number.isNaN(d.getTime())) {
    return value;
  }
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function weekdayChip(value: string): { weekday: string; day: string } {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return { weekday: '', day: '' };
  }
  return {
    weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
    day: String(d.getDate()).padStart(2, '0'),
  };
}

// "2h ago" / "3d ago" / "just now" from an ISO-ish timestamp. Falls back to the
// formatted date when too old or unparseable.
function relativeTime(value: string): string {
  if (!value) {
    return '';
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return value;
  }
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 0) {
    return formatDate(value);
  }
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) {
    return 'just now';
  }
  if (mins < 60) {
    return `${mins}m ago`;
  }
  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }
  return formatDate(value);
}

/* ─── Derivations ────────────────────────────────────────────── */

function deriveInProgressCourses(learning: StudentLearningSnapshot): CourseProgressRow[] {
  return learning.courses
    .map((course): CourseProgressRow => {
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

// Count courses that are fully complete (every lesson at 100%) — a real
// "ready to claim" certificate signal derived from per-lesson progress.
function countCompletedCourses(learning: StudentLearningSnapshot): number {
  return learning.courses.filter((course) => {
    const id = asString(course.id);
    const courseSubjectIds = new Set(
      learning.subjects.filter((s) => asString(s.course_id) === id).map((s) => asString(s.id)),
    );
    const courseLessons = learning.lessons.filter((l) => courseSubjectIds.has(asString(l.subject_id)));
    if (courseLessons.length === 0) {
      return false;
    }
    return courseLessons.every((l) => asNumber(l.completed_percentage) >= 100);
  }).length;
}

function deriveRecommendedCourses(learning: StudentLearningSnapshot): CatalogCourseRow[] {
  const enrolledIds = new Set(learning.courses.map((c) => asString(c.id)));
  return learning.catalogCourses
    .filter((c) => !enrolledIds.has(asString(c.id)))
    .map((course): CatalogCourseRow => ({
      id: asString(course.id),
      title: asString(course.title) || 'Untitled Course',
      subjectCount: asNumber(course.subjects_count) || asNumber(course.subject_count) || asNumber(course.total_subjects),
      price: asNumber(course.price),
      offerPrice: asNumber(course.offer_price),
    }));
}

// Upcoming / in-progress live classes, soonest first. Mirrors
// StudentLiveClassPage's status mapping ('upcoming' | 'today').
function deriveUpcomingLive(rows: Record<string, unknown>[]): LiveRow[] {
  return rows
    .filter((r) => {
      const status = asString(r.status);
      return status === 'upcoming' || status === 'today';
    })
    .map((r): LiveRow => ({
      id: asString(r.id),
      title: asString(r.title) || 'Live Class',
      subject: asString(r.subject_title),
      instructor: asString(r.instructor_name),
      date: asString(r.date),
      fromTime: asString(r.from_time),
      joinUrl: asString(r.join_url),
      isToday: asString(r.status) === 'today',
    }))
    .sort((a, b) => {
      const da = new Date(`${a.date}T${a.fromTime || '00:00:00'}`).getTime();
      const db = new Date(`${b.date}T${b.fromTime || '00:00:00'}`).getTime();
      return (Number.isNaN(da) ? Infinity : da) - (Number.isNaN(db) ? Infinity : db);
    });
}

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

function assignmentDueDate(row: Record<string, unknown>): string {
  return asString(row.date) || asString(row.due_date) || asString(row.end_date);
}

function statusFromDelta(delta: number | null): PriorityStatus {
  if (delta === null) {
    return 'upcoming';
  }
  if (delta === 0) {
    return 'due-today';
  }
  if (delta < 0) {
    return 'overdue';
  }
  return 'upcoming';
}

// Today's priorities: current/upcoming assignments + available/upcoming exams +
// the next unpaid installment. Built only from real assessment/installment data.
function derivePriorities(
  assessments: StudentAssessmentSnapshot,
  nextDue: StudentInstallmentItem | null,
): PriorityRow[] {
  const rows: PriorityRow[] = [];

  for (const a of [...assessments.assignments.current, ...assessments.assignments.upcoming]) {
    const id = asString(a.id);
    const submitted = asNumber(a.is_submitted) > 0;
    const due = assignmentDueDate(a);
    rows.push({
      id: `assignment-${id}`,
      kind: 'assignment',
      title: asString(a.title) || `Assignment ${id}`,
      context: asString(a.subject_title) || asString(a.course_title) || 'Assignment',
      status: submitted ? 'completed' : statusFromDelta(dayDelta(due)),
      action: { label: submitted ? 'Review' : 'Submit', href: '/student/assignments' },
    });
  }

  for (const e of [...assessments.exams.available, ...assessments.exams.upcoming]) {
    const id = asString(e.id);
    const state = asString(e.state);
    const due = asString(e.date) || asString(e.start_date);
    rows.push({
      id: `quiz-${id}`,
      kind: 'quiz',
      title: asString(e.title) || `Exam ${id}`,
      context: asString(e.subject_title) || 'Exam',
      status: state === 'available' ? 'due-today' : statusFromDelta(dayDelta(due)),
      action: { label: state === 'available' ? 'Attempt' : 'View', href: '/student/exams' },
    });
  }

  if (nextDue) {
    rows.push({
      id: `payment-${nextDue.id}`,
      kind: 'payment',
      title: nextDue.installmentDetails || `Installment ${nextDue.installmentNo || ''}`.trim(),
      context: formatCurrency(nextDue.amount),
      status: statusFromDelta(dayDelta(nextDue.dueDate)),
      action: { label: 'Pay Now', href: '/student/payments' },
    });
  }

  return rows;
}

function deriveActivity(notifications: StudentNotificationsSnapshot): ActivityRow[] {
  return notifications.notifications.slice(0, RECENT_ACTIVITY_LIMIT).map((n): ActivityRow => ({
    id: asString(n.id),
    title: cleanNotificationText(asString(n.title)) || 'Notification',
    description: cleanNotificationText(asString(n.description) || asString(n.message)),
    time: relativeTime(asString(n.created_at)),
    isRead: asNumber(n.is_read) === 1,
  }));
}

// Six fixed badges (Naji 2026-06-05, audio): always rendered — earned ones in
// colour, locked ones greyed out, with an "X / 6 earned" count in the header.
// "earned" is decided ONLY from substantiated signals (streak, real course
// progress, completed courses); nothing is fabricated — unearned badges simply
// read as locked goals.
function deriveBadges(
  streakCurrent: number,
  streakBest: number,
  completedCourses: number,
  maxProgress: number,
): BadgeRow[] {
  const started = maxProgress > 0 || completedCourses > 0;
  return [
    {
      label: 'First Steps',
      icon: Rocket,
      tone: 'from-sky-400 to-blue-500',
      earned: started,
      caption: started ? 'Learning started' : 'Start a course',
    },
    {
      label: 'On a Streak',
      icon: Flame,
      tone: 'from-amber-400 to-orange-500',
      earned: streakCurrent >= 3,
      caption: streakCurrent >= 3 ? `${streakCurrent}-day streak` : 'Study 3 days running',
    },
    {
      label: '7-Day Warrior',
      icon: Trophy,
      tone: 'from-fuchsia-400 to-purple-500',
      earned: streakBest >= 7,
      caption: streakBest >= 7 ? `${streakBest}-day best` : 'Reach a 7-day streak',
    },
    {
      label: 'Halfway There',
      icon: TrendingUp,
      tone: 'from-violet-400 to-indigo-500',
      earned: maxProgress >= 50,
      caption: maxProgress >= 50 ? 'Course 50%+ done' : 'Reach 50% in a course',
    },
    {
      label: 'Course Finisher',
      icon: CheckCircle,
      tone: 'from-emerald-400 to-green-500',
      earned: completedCourses >= 1,
      caption: completedCourses >= 1 ? `${completedCourses} completed` : 'Finish a course',
    },
    {
      label: 'Top Performer',
      icon: Crown,
      tone: 'from-rose-400 to-pink-500',
      earned: completedCourses >= 3,
      caption: completedCourses >= 3 ? 'Pro graduate' : 'Finish 3 courses',
    },
  ];
}

/* ─── Page ───────────────────────────────────────────────────── */

export default function StudentDashboardPage({ api, session, onNavigate }: StudentPageProps) {
  const { data, loading, error, reload } = useAdminPageData<DashboardBundle>(
    () => Promise.all([
      api.loadDashboard(session.token),
      api.loadLearning(session.token),
      api.loadAssessments(session.token),
      api.loadAllLiveClasses(session.token),
      api.loadInstallments(session.token),
      api.loadNotifications(session.token),
    ]),
    [api, session.token],
  );
  const { currentUser } = useStudentLayout();

  const dashboard = data?.[0];
  const learning = data?.[1];
  const assessments = data?.[2];

  const inProgressCourses = useMemo(() => (learning ? deriveInProgressCourses(learning) : []), [learning]);
  const completedCourses = useMemo(() => (learning ? countCompletedCourses(learning) : 0), [learning]);
  const recommended = useMemo(() => (learning ? deriveRecommendedCourses(learning) : []), [learning]);
  const upcomingLive = useMemo(() => (data ? deriveUpcomingLive(data[3]) : []), [data]);
  const nextDue = useMemo(() => (data ? findNextDue(data[4]) : null), [data]);
  const priorities = useMemo(
    () => (assessments ? derivePriorities(assessments, nextDue) : []),
    [assessments, nextDue],
  );
  const activity = useMemo(() => (data ? deriveActivity(data[5]) : []), [data]);
  const badges = useMemo(() => {
    const inProgressMax = inProgressCourses.reduce((m, c) => Math.max(m, c.progress), 0);
    const maxProgress = completedCourses > 0 ? 100 : inProgressMax;
    return deriveBadges(
      dashboard?.streakCurrent ?? 0,
      dashboard?.streakTotal ?? 0,
      completedCourses,
      maxProgress,
    );
  }, [dashboard, completedCourses, inProgressCourses]);
  const earnedBadgeCount = badges.filter((b) => b.earned).length;

  if (loading) {
    return <PageLoader label="Loading your dashboard..." />;
  }

  if (error || !dashboard) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-student-text">Dashboard</h1>
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-sm text-red-600">{error ?? 'Could not load your dashboard.'}</p>
          <Button variant="outline" className="mt-4 rounded-xl" onClick={reload}>Retry</Button>
        </div>
      </div>
    );
  }

  const firstName = (currentUser?.name.split(/\s+/)[0] ?? '').trim() || 'there';

  // Stat deltas, all derived from real fields.
  const dueThisWeek = priorities.filter(
    (p) => p.kind === 'assignment' && (p.status === 'due-today' || p.status === 'overdue'),
  ).length;
  const nextLive = upcomingLive[0];
  const nextLiveDelta = nextLive ? dayDelta(nextLive.date) : null;
  const upcomingClassDelta = nextLive
    ? nextLiveDelta === 0
      ? `Next today${nextLive.fromTime ? ` · ${shortTime(nextLive.fromTime)}` : ''}`
      : nextLiveDelta !== null && nextLiveDelta > 0
        ? `Next in ${nextLiveDelta} day${nextLiveDelta === 1 ? '' : 's'}`
        : ''
    : '';

  const stats: StatCardProps[] = [
    {
      icon: BookOpen,
      label: 'Enrolled Courses',
      value: String(dashboard.coursesCount),
      delta: inProgressCourses.length > 0 ? `${inProgressCourses.length} in progress` : ' ',
      tint: 'primary',
    },
    {
      icon: Calendar,
      label: 'Upcoming Classes',
      value: String(upcomingLive.length),
      delta: upcomingClassDelta,
      tint: 'blue',
    },
    {
      icon: ClipboardList,
      label: 'Pending Assignments',
      value: String(dashboard.currentAssignments),
      delta: dueThisWeek > 0 ? `${dueThisWeek} due this week` : ' ',
      tint: 'primary',
    },
    {
      icon: Wallet,
      label: 'Payment Due',
      value: nextDue ? formatCurrency(nextDue.amount) : formatCurrency(0),
      delta: nextDue ? `Due ${formatDate(nextDue.dueDate)}` : 'Nothing due',
      tint: 'emerald',
    },
    {
      icon: Award,
      label: 'Certificates',
      value: String(completedCourses),
      delta: completedCourses > 0 ? 'ready to claim' : ' ',
      tint: 'primary',
    },
  ];

  return (
    <div className="space-y-8">
      {/* 1 · Welcome hero */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-student-text sm:text-3xl">
            Welcome back, {firstName} <span aria-hidden="true">👋</span>
          </h1>
          <p className="mt-1.5 text-sm text-student-muted">
            Here&apos;s what&apos;s happening with your learning today.
          </p>
        </div>
        <Button
          onClick={() => onNavigate('/student/courses')}
          className="h-11 shrink-0 rounded-xl bg-student-primary px-5 text-sm font-semibold text-white shadow-sm hover:bg-student-primary/90"
        >
          <PlayCircle aria-hidden="true" className="mr-2 size-4" />
          Resume Learning
        </Button>
      </section>

      {/* 2 · Stat cards — 5 in a single row (EduPulse layout) */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </section>

      {/* 3 · Continue Learning (left) + Upcoming Live (right) — Naji's order */}
      {inProgressCourses.length > 0 || upcomingLive.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-3">
          {inProgressCourses.length > 0 ? (
            <div className={upcomingLive.length > 0 ? 'lg:col-span-2' : 'lg:col-span-3'}>
              <SectionCard
                title="Continue Learning"
                subtitle="Pick up right where you left off"
                actionLabel="View all"
                onAction={() => onNavigate('/student/courses')}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  {inProgressCourses.map((course) => (
                    <ContinueLearningCard
                      key={course.id}
                      course={course}
                      onResume={() => onNavigate('/student/courses')}
                    />
                  ))}
                </div>
              </SectionCard>
            </div>
          ) : null}

          {upcomingLive.length > 0 ? (
            <div className={inProgressCourses.length > 0 ? 'lg:col-span-1' : 'lg:col-span-3'}>
              <SectionCard
                title="Upcoming Live"
                actionLabel="See all"
                onAction={() => onNavigate('/student/live-classes')}
              >
                <div className="space-y-3">
                  {upcomingLive.map((row) => (
                    <UpcomingLiveRow
                      key={row.id}
                      row={row}
                      onJoin={() => onNavigate('/student/live-classes')}
                    />
                  ))}
                </div>
              </SectionCard>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* 4 · Achievements & Badges (left) + Today's Priorities (right) — Naji's order */}
      {badges.length > 0 || priorities.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-3">
          {badges.length > 0 ? (
            <div className={priorities.length > 0 ? 'lg:col-span-2' : 'lg:col-span-3'}>
              <SectionCard
                title="Achievements & Badges"
                subtitle="Milestones you've unlocked"
                pill={`${earnedBadgeCount} / 6 earned`}
              >
                <div className="grid grid-cols-3 gap-3 sm:gap-4">
                  {badges.map((badge) => (
                    <BadgeTile key={badge.label} badge={badge} />
                  ))}
                </div>
              </SectionCard>
            </div>
          ) : null}

          {priorities.length > 0 ? (
            <div className={badges.length > 0 ? 'lg:col-span-1' : 'lg:col-span-3'}>
              <PrioritiesSection priorities={priorities} onNavigate={onNavigate} />
            </div>
          ) : null}
        </div>
      ) : null}

      {/* 5 · Recent Activity (big card, full width) */}
      {activity.length > 0 ? (
        <SectionCard
          title="Recent Activity"
          actionLabel="View all"
          onAction={() => onNavigate('/student/notifications')}
        >
          <ol className="space-y-1">
            {activity.map((row, idx) => (
              <ActivityItem key={row.id} row={row} isLast={idx === activity.length - 1} />
            ))}
          </ol>
        </SectionCard>
      ) : null}

      {/* 6 · Recommended Courses (big card, full width) */}
      {recommended.length > 0 ? (
        <SectionCard
          title="Recommended Courses"
          subtitle="Expand your skills with these programs"
          actionLabel="Browse all"
          onAction={() => onNavigate('/student/courses')}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recommended.slice(0, 6).map((course) => (
              <RecommendedCard
                key={course.id}
                course={course}
                onMore={() => onNavigate('/student/courses')}
              />
            ))}
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}

/* ─── Helper components ──────────────────────────────────────── */

type Tint = 'primary' | 'pink' | 'blue' | 'amber' | 'emerald';
const TINTS: Record<Tint, string> = {
  primary: 'bg-student-primary/10 text-student-primary',
  pink: 'bg-fuchsia-50 text-fuchsia-600',
  blue: 'bg-sky-50 text-sky-600',
  amber: 'bg-amber-50 text-amber-600',
  emerald: 'bg-emerald-50 text-emerald-600',
};

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  delta: string;
  tint: Tint;
}

function StatCard({ icon: Icon, label, value, delta, tint }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className={`flex size-10 items-center justify-center rounded-xl ${TINTS[tint]}`}>
        <Icon aria-hidden="true" className="size-5" />
      </div>
      <p className="mt-4 text-sm font-medium text-student-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-student-text">{value}</p>
      <p className="mt-1 truncate text-xs text-student-muted">{delta}</p>
    </div>
  );
}

interface SectionHeaderProps {
  title: string;
  subtitle?: string | undefined;
  actionLabel?: string | undefined;
  onAction?: (() => void) | undefined;
  pill?: string | undefined;
}

function SectionHeader({ title, subtitle, actionLabel, onAction, pill }: SectionHeaderProps) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-student-text">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-sm text-student-muted">{subtitle}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {pill ? (
          <span className="inline-flex items-center rounded-full bg-student-primary/10 px-3 py-1 text-xs font-semibold text-student-primary">
            {pill}
          </span>
        ) : null}
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex items-center gap-1 text-sm font-semibold text-student-primary hover:underline"
          >
            {actionLabel} <ArrowRight aria-hidden="true" className="size-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

interface SectionCardProps extends SectionHeaderProps {
  children: ReactNode;
  className?: string;
}

// A section rendered as one big white container card with its header + items
// inside (Naji 2026-06-05: "big one card, items listed inside, same all others").
function SectionCard({ title, subtitle, actionLabel, onAction, pill, children, className }: SectionCardProps) {
  return (
    <section
      className={`flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ${className ?? ''}`}
    >
      <SectionHeader
        title={title}
        subtitle={subtitle}
        actionLabel={actionLabel}
        onAction={onAction}
        pill={pill}
      />
      {children}
    </section>
  );
}

// Vertical gradient course tile matching the EduPulse demo (Naji 2026-06-05,
// audio: keep the course-card size the same as the design UI). Gradient banner
// with progress % · title/instructor · progress bar + Resume.
function ContinueLearningCard({ course, onResume }: { course: CourseProgressRow; onResume: () => void }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="relative flex h-24 items-center bg-gradient-to-br from-student-primary to-student-accent px-5">
        <BookOpen aria-hidden="true" className="size-8 text-white/90" />
        <span className="absolute right-3 top-3 rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
          {course.progress}%
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-2 text-sm font-bold text-student-text">{course.title}</h3>
        {course.instructor ? (
          <p className="mt-0.5 truncate text-xs text-student-muted">{course.instructor}</p>
        ) : null}
        <div className="mt-auto pt-4">
          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-student-primary transition-all duration-500"
              style={{ width: `${Math.min(course.progress, 100)}%` }}
            />
          </div>
          <Button
            onClick={onResume}
            className="mt-4 h-10 w-full rounded-xl bg-student-primary text-sm font-semibold text-white hover:bg-student-primary/90"
          >
            <PlayCircle aria-hidden="true" className="mr-2 size-4" />
            Resume
          </Button>
        </div>
      </div>
    </div>
  );
}

function UpcomingLiveRow({ row, onJoin }: { row: LiveRow; onJoin: () => void }) {
  const chip = weekdayChip(row.date);
  const time = shortTime(row.fromTime);
  const meta = [row.subject, row.instructor].filter(Boolean).join(' · ');
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 p-4">
      <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-xl bg-student-primary/10 text-student-primary">
        <span className="text-[10px] font-bold uppercase tracking-wide">{chip.weekday || '—'}</span>
        <span className="text-lg font-bold leading-none">{chip.day || '—'}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-bold text-student-text">{row.title}</h3>
          {row.isToday ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700">
              <span className="inline-block size-1.5 animate-pulse rounded-full bg-red-500" />
              Live
            </span>
          ) : null}
        </div>
        {meta ? <p className="mt-0.5 truncate text-xs text-student-muted">{meta}</p> : null}
        {time ? (
          <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-student-muted">
            <Clock aria-hidden="true" className="size-3" />
            {time}
          </p>
        ) : null}
      </div>
      <Button
        onClick={onJoin}
        className="h-9 shrink-0 rounded-xl bg-student-primary px-4 text-xs font-semibold text-white hover:bg-student-primary/90"
      >
        <Video aria-hidden="true" className="mr-1.5 size-3.5" />
        {row.isToday ? 'Join' : 'Details'}
      </Button>
    </div>
  );
}

const PRIORITY_STATUS_STYLE: Record<PriorityStatus, { label: string; className: string }> = {
  'due-today': { label: 'Due Today', className: 'bg-amber-100 text-amber-700' },
  overdue: { label: 'Overdue', className: 'bg-red-100 text-red-700' },
  upcoming: { label: 'Upcoming', className: 'bg-sky-100 text-sky-700' },
  completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-700' },
};

const PRIORITY_KIND_META: Record<PriorityKind, { label: string; icon: LucideIcon; dot: string }> = {
  assignment: { label: 'Assignment', icon: ClipboardList, dot: 'bg-student-primary' },
  quiz: { label: 'Quiz', icon: FileText, dot: 'bg-sky-500' },
  payment: { label: 'Payment', icon: Wallet, dot: 'bg-amber-500' },
};

type PriorityFilter = 'all' | PriorityKind;

function PrioritiesSection({
  priorities,
  onNavigate,
}: {
  priorities: PriorityRow[];
  onNavigate: (href: string) => void;
}) {
  const [filter, setFilter] = useState<PriorityFilter>('all');
  const dueToday = priorities.filter((p) => p.status === 'due-today').length;
  const filtered = filter === 'all' ? priorities : priorities.filter((p) => p.kind === filter);

  const filterTabs: { id: PriorityFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'assignment', label: 'Assignments' },
    { id: 'quiz', label: 'Quizzes' },
    { id: 'payment', label: 'Payments' },
  ];

  return (
    <section className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-student-text">Today&apos;s Priorities</h2>
        <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
          {dueToday} Due Today
        </span>
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        {filterTabs.map((t) => {
          const active = filter === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setFilter(t.id)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? 'bg-student-primary text-white'
                  : 'bg-white text-student-muted ring-1 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-student-muted">
          Nothing here right now.
        </div>
      ) : (
        <div>
          {filtered.map((row, idx) => (
            <PriorityItem
              key={row.id}
              row={row}
              isLast={idx === filtered.length - 1}
              onAction={() => onNavigate(row.action.href)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function PriorityItem({ row, isLast, onAction }: { row: PriorityRow; isLast: boolean; onAction: () => void }) {
  const kind = PRIORITY_KIND_META[row.kind];
  const status = PRIORITY_STATUS_STYLE[row.status];
  const KindIcon = kind.icon;
  return (
    <div className={`flex items-center gap-4 p-4 ${isLast ? '' : 'border-b border-slate-100'}`}>
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${TINTS[row.kind === 'quiz' ? 'blue' : row.kind === 'payment' ? 'amber' : 'primary']}`}>
        <KindIcon aria-hidden="true" className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`inline-block size-2 shrink-0 rounded-full ${kind.dot}`} aria-hidden="true" />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-student-muted">{kind.label}</span>
        </div>
        <h3 className="mt-0.5 truncate text-sm font-semibold text-student-text">{row.title}</h3>
        {row.context ? <p className="truncate text-xs text-student-muted">{row.context}</p> : null}
      </div>
      <span className={`hidden shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold sm:inline-flex ${status.className}`}>
        {status.label}
      </span>
      <Button
        onClick={onAction}
        variant={row.status === 'completed' ? 'outline' : 'default'}
        className={`h-9 shrink-0 rounded-xl px-4 text-xs font-semibold ${
          row.status === 'completed'
            ? 'border-slate-200 text-student-text'
            : 'bg-student-primary text-white hover:bg-student-primary/90'
        }`}
      >
        {row.action.label}
      </Button>
    </div>
  );
}

function ActivityItem({ row, isLast }: { row: ActivityRow; isLast: boolean }) {
  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center">
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
          row.isRead ? 'bg-slate-100 text-slate-400' : 'bg-student-primary/10 text-student-primary'
        }`}>
          <Bell aria-hidden="true" className="size-4" />
        </span>
        {isLast ? null : <span className="my-1 w-px flex-1 bg-slate-100" aria-hidden="true" />}
      </div>
      <div className={`min-w-0 flex-1 ${isLast ? 'pb-0' : 'pb-4'}`}>
        <div className="flex items-start justify-between gap-3">
          <p className={`text-sm ${row.isRead ? 'text-student-text' : 'font-semibold text-student-text'}`}>{row.title}</p>
          {row.time ? <span className="shrink-0 text-xs text-slate-400">{row.time}</span> : null}
        </div>
        {row.description ? <p className="mt-0.5 line-clamp-2 text-sm text-student-muted">{row.description}</p> : null}
      </div>
    </li>
  );
}

function RecommendedCard({ course, onMore }: { course: CatalogCourseRow; onMore: () => void }) {
  const hasOffer = course.offerPrice > 0 && course.offerPrice < course.price;
  const displayPrice = hasOffer ? course.offerPrice : course.price;
  const isFree = course.price <= 0;
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="relative flex h-24 items-center bg-gradient-to-br from-student-primary to-student-accent px-5">
        <BookOpen aria-hidden="true" className="size-8 text-white/90" />
        {isFree ? (
          <span className="absolute right-3 top-3 rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
            Free
          </span>
        ) : displayPrice > 0 ? (
          <span className="absolute right-3 top-3 rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
            {formatCurrency(displayPrice)}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-2 text-sm font-bold text-student-text">{course.title}</h3>
        <p className="mt-0.5 text-xs text-student-muted">
          {course.subjectCount > 0 ? `${course.subjectCount} Subjects` : 'Curriculum inside'}
        </p>
        <div className="mt-auto pt-4">
          <Button
            onClick={onMore}
            variant="outline"
            className="h-10 w-full rounded-xl border-student-primary/30 text-sm font-semibold text-student-primary hover:bg-student-primary/5"
          >
            More Info
          </Button>
        </div>
      </div>
    </div>
  );
}

function BadgeTile({ badge }: { badge: BadgeRow }) {
  const Icon = badge.icon;
  return (
    <div className="flex flex-col items-center text-center">
      <div
        className={`flex size-16 items-center justify-center rounded-full shadow-sm ${
          badge.earned
            ? `bg-gradient-to-br ${badge.tone} text-white`
            : 'bg-slate-100 text-slate-400 ring-1 ring-inset ring-slate-200'
        }`}
      >
        <Icon aria-hidden="true" className="size-7" />
      </div>
      <p
        className={`mt-2.5 flex items-center gap-1 text-sm font-bold ${
          badge.earned ? 'text-student-text' : 'text-slate-400'
        }`}
      >
        {badge.earned ? <Sparkles aria-hidden="true" className="size-3.5 text-amber-500" /> : null}
        {badge.label}
      </p>
      <p className={`mt-0.5 text-xs ${badge.earned ? 'text-student-muted' : 'text-slate-400'}`}>
        {badge.caption}
      </p>
    </div>
  );
}
