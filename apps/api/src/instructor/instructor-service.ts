import type { PrismaClient } from '@prisma/client';

import { getPrismaClient } from '../data/prisma-client.js';
import { toLegacyFileUrl } from '../data/legacy-asset-url.js';
import { AnnouncementService } from '../operations/announcement-service.js';

/**
 * Parse `assignment_submission.assignment_files` into absolute, linkable URLs.
 *
 * The column holds a JSON-encoded array — assessment-service writes it with
 * JSON.stringify(files), and the three admin readers in operations-service
 * JSON.parse it (Naji UAT 2026-05-18). The faculty portal instead split the raw
 * string on commas, which for a single file yielded the literal
 * `["https://…pdf"]` and for two files split the JSON down the middle. Rendered
 * into <a href>, a value like that is not absolute, so the browser resolved it
 * against the current path and the SPA router answered "Page Not Found:
 * /instructor/[%22https…%22]" — Agile Mary, 2026-07-29, could not open any
 * submitted assignment.
 *
 * Legacy rows may hold a bare path or a comma/newline-separated list, so keep
 * that as the fallback. Every entry goes through toLegacyFileUrl so relative
 * legacy paths come back absolute and can never hijack the router.
 */
function parseSubmissionFiles(raw: string | null | undefined): string[] {
  const value = (raw ?? '').trim();
  if (!value) return [];

  if (value.startsWith('[')) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        return parsed
          .map((entry) => toLegacyFileUrl(typeof entry === 'string' ? entry : String(entry)))
          .filter((url) => url !== '');
      }
    } catch {
      // Malformed JSON — fall through to the legacy split.
    }
  }

  return value
    .split(/[,\n]/)
    .map((f) => toLegacyFileUrl(f.trim()))
    .filter((url) => url !== '');
}

export interface InstructorProfile {
  id: number;
  name: string;
  email: string;
  image: string | null;
}

export interface InstructorLiveClassSummary {
  id: number;
  title: string;
  date: string | null;
  fromTime: string | null;
  toTime: string | null;
  status: string;
  cohortId: number | null;
  cohortTitle: string | null;
  joinUrl: string | null;
  recordingUrl: string | null;
  recordingStorageKey: string | null;
}

export interface InstructorDashboardPayload {
  profile: InstructorProfile | null;
  upcomingLiveClasses: InstructorLiveClassSummary[];
  pastLiveClasses: InstructorLiveClassSummary[];
  cohortCount: number;
  // Naji UAT 2026-05-22 — Faculty dashboard redesign to match the
  // ttiifaculty.lovable.app reference. Extra metrics + chart data.
  metrics: {
    assignedCohorts: number;
    assignedCohortsDelta: string;
    upcomingClassesCount: number;
    upcomingClassesNextLabel: string;
    pendingEvaluations: number;
    pendingEvaluationsOverdue: number;
    totalLearners: number;
    avgPerformancePercent: number;
    avgPerformanceDelta: number;
    // Naji 2026-07-06 Lovable refresh — "Total Classes" KPI (sessions this month).
    totalClasses: number;
  };
  performanceTrend: { week: string; score: number; attendance: number }[]; // last 8 weeks
  // Naji 2026-07-06 Lovable refresh — sessions conducted week by week (last 8).
  sessionTrend: { week: string; sessions: number }[];
  cohortPerformance: { cohortId: number; cohortTitle: string; avgPercent: number; learners: number }[];
  // Naji 2026-07-06 Lovable refresh — recent individual student submissions.
  recentSubmissions: {
    id: number;
    studentName: string;
    assignmentTitle: string;
    cohort: string;
    submittedAt: string; // ISO timestamp
  }[];
  todaysSchedule: InstructorLiveClassSummary[];
  recentActivities: {
    kind: 'submission' | 'evaluation' | 'class' | 'announcement';
    title: string;
    subtitle: string;
    when: string; // ISO timestamp
  }[];
  aiInsights: {
    tone: 'positive' | 'warning' | 'info';
    title: string;
    body: string;
  }[];
}

export type LiveClassFilter = 'upcoming' | 'past' | 'all';

export interface InstructorLiveClassListItem extends InstructorLiveClassSummary {
  recordingFetchedAt: string | null;
  attendanceFetchedAt: string | null;
  // True when a playable recording exists from ANY source: an uploaded Spaces
  // storage key OR a legacy absolute recording_url / video_url. Mirrors the
  // admin/student model (operations-service.getLiveSessionRecordingTarget).
  hasRecording: boolean;
}

// Resolver result for a live-session recording: either a Spaces storage key we
// sign, or an absolute URL we hand back as-is (legacy Vimeo/Graph links live in
// recording_url / video_url). Mirrors operations-service.getLiveSessionRecordingTarget.
export type InstructorRecordingTarget =
  | { kind: 'key'; key: string }
  | { kind: 'url'; url: string }
  | null;

export interface InstructorAttendanceRow {
  id: number;
  email: string | null;
  displayName: string | null;
  role: string | null;
  totalSeconds: number | null;
  percentAttended: number | null;
  firstJoinedAt: string | null;
  lastLeftAt: string | null;
  userId: number | null;
  userName: string | null;
  studentId: string | null;
}

export interface InstructorAttendancePayload {
  liveClassId: number;
  title: string;
  date: string | null;
  attendance: InstructorAttendanceRow[];
}

export interface InstructorCohortSummary {
  id: number;
  title: string;
  cohortCode: string;
  courseTitle: string | null;
  startDate: string | null;
  endDate: string | null;
  learnerCount: number;
  upcomingSessionCount: number;
}

export interface InstructorLearnerRow {
  id: number;
  name: string;
  email: string;
  phone: string;
  enrollmentId: string | null;
  statusLabel: string;
}

export interface InstructorCohortDetail extends InstructorCohortSummary {
  learners: InstructorLearnerRow[];
}

export interface InstructorAssignmentSummary {
  id: number;
  title: string;
  cohortId: number | null;
  cohortTitle: string | null;
  dueDate: string | null;
  totalMarks: number | null;
  submissionCount: number;
  gradedCount: number;
  pendingCount: number;
}

export interface InstructorSubmissionRow {
  id: number;
  userId: number | null;
  studentName: string | null;
  studentEnrollmentId: string | null;
  studentEmail: string | null;
  submittedAt: string | null;
  files: string[];
  marks: string;
  remarks: string;
  graded: boolean;
}

export interface InstructorAssignmentDetail {
  assignment: {
    id: number;
    title: string;
    description: string;
    instructions: string | null;
    file: string | null;
    dueDate: string | null;
    totalMarks: number | null;
    cohortId: number | null;
    cohortTitle: string | null;
  };
  submissions: InstructorSubmissionRow[];
}

export interface GradeSubmissionInput {
  marks: string;
  remarks: string;
}

export interface ScheduleLiveClassInput {
  cohortId: number;
  title: string;
  date: string; // YYYY-MM-DD
  fromTime: string; // HH:MM
  toTime: string; // HH:MM
}

// A per-cohort announcement as surfaced to the instructor portal. Backed by the
// shared cohort_announcements table via AnnouncementService (no new table).
export interface InstructorCohortAnnouncement {
  id: number;
  cohortId: number | null;
  title: string;
  content: string;
  createdAt: string | null;
}

export interface CreateCohortAnnouncementInput {
  title: string;
  content: string;
}

// Parse an id-ish value (AnnouncementService serializes ids as strings) into a
// number, tolerating string | number and returning NaN for anything else.
function idFromUnknown(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number.parseInt(value, 10);
  return NaN;
}

// Coerce a serialized AnnouncementService record into the instructor shape.
function toInstructorAnnouncement(rec: Record<string, unknown>): InstructorCohortAnnouncement {
  const idNum = idFromUnknown(rec.id);
  const cohortNum = idFromUnknown(rec.cohort_id);
  const created = rec.created_at;
  const createdAt =
    created instanceof Date
      ? created.toISOString()
      : typeof created === 'string' && created
        ? created
        : null;
  return {
    id: Number.isFinite(idNum) ? idNum : 0,
    cohortId: Number.isFinite(cohortNum) ? cohortNum : null,
    title: typeof rec.title === 'string' ? rec.title : '',
    content: typeof rec.content === 'string' ? rec.content : '',
    createdAt,
  };
}

export type ScheduleLiveClassResult =
  | { ok: true; row: InstructorLiveClassListItem }
  | { ok: false; code: 'not_found' | 'invalid'; message: string };

const UPCOMING_LIMIT = 8;
const PAST_LIMIT = 8;

function isoDate(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

function timeOf(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString().slice(11, 19);
}

function isoString(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString();
}

// Parse "HH:MM" / "HH:MM:SS" into the 1970-epoch Date that Prisma needs for a
// @db.Time column (mirrors operations-service.addLiveClasses' parseTime).
function parseTimeToDate(t: string): Date {
  const cleaned = /^\d{1,2}:\d{2}(:\d{2})?$/.test(t) ? (t.length === 5 ? `${t}:00` : t) : '00:00:00';
  return new Date(`1970-01-01T${cleaned}Z`);
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':');
  return Number(h ?? 0) * 60 + Number(m ?? 0);
}

// Render a short "Today 4 PM" / "Tue 9 AM" label for the dashboard's
// "next upcoming class" chip. Falls back to a date string when both
// date and time are missing.
function formatScheduleLabel(isoDateValue: string | null, hhmm: string | null): string {
  if (!isoDateValue) return 'Date TBD';
  const d = new Date(isoDateValue);
  if (Number.isNaN(d.getTime())) return 'Date TBD';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const datePart = diffDays === 0 ? 'Today' : diffDays === 1 ? 'Tomorrow' : (weekdays[d.getDay()] ?? 'Soon');
  if (!hhmm) return datePart;
  const [hRaw, mRaw] = hhmm.split(':');
  const h = Number(hRaw ?? 0);
  const m = Number(mRaw ?? 0);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  const timePart = m === 0 ? `${h12} ${period}` : `${h12}:${String(m).padStart(2, '0')} ${period}`;
  return `${datePart} ${timePart}`;
}

export class InstructorService {
  private prisma: PrismaClient;
  private announcements: AnnouncementService;

  constructor(prisma: PrismaClient = getPrismaClient()) {
    this.prisma = prisma;
    this.announcements = new AnnouncementService();
  }

  async getDashboard(instructorId: number): Promise<InstructorDashboardPayload> {
    const [profile, cohorts] = await Promise.all([
      this.prisma.users.findFirst({
        where: { id: instructorId, deleted_at: null },
        select: { id: true, name: true, email: true, user_email: true, image: true },
      }),
      this.prisma.cohorts.findMany({
        where: { instructor_id: instructorId, deleted_at: null },
        select: { id: true, title: true },
      }),
    ]);

    const cohortIds = cohorts.map((c) => c.id);
    const cohortTitleMap = new Map(cohorts.map((c) => [c.id, c.title ?? '']));

    if (cohortIds.length === 0) {
      return {
        profile: profile
          ? {
              id: profile.id,
              name: profile.name ?? '',
              email: profile.email ?? profile.user_email ?? '',
              image: profile.image ?? null,
            }
          : null,
        upcomingLiveClasses: [],
        pastLiveClasses: [],
        cohortCount: 0,
        metrics: {
          assignedCohorts: 0,
          assignedCohortsDelta: 'No cohorts assigned yet',
          upcomingClassesCount: 0,
          upcomingClassesNextLabel: 'Nothing scheduled',
          pendingEvaluations: 0,
          pendingEvaluationsOverdue: 0,
          totalLearners: 0,
          avgPerformancePercent: 0,
          avgPerformanceDelta: 0,
          totalClasses: 0,
        },
        performanceTrend: [],
        sessionTrend: [],
        cohortPerformance: [],
        recentSubmissions: [],
        todaysSchedule: [],
        recentActivities: [],
        aiInsights: [{
          tone: 'info',
          title: 'No cohorts yet',
          body: 'Once a coordinator assigns you a cohort, this dashboard will surface progress and recommendations.',
        }],
      };
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [upcoming, past] = await Promise.all([
      this.prisma.live_class.findMany({
        where: {
          cohort_id: { in: cohortIds },
          deleted_at: null,
          date: { gte: today },
        },
        orderBy: [{ date: 'asc' }, { fromTime: 'asc' }],
        take: UPCOMING_LIMIT,
        select: {
          id: true,
          title: true,
          date: true,
          fromTime: true,
          toTime: true,
          status: true,
          cohort_id: true,
          join_url: true,
          recording_url: true,
          recording_storage_key: true,
        },
      }),
      this.prisma.live_class.findMany({
        where: {
          cohort_id: { in: cohortIds },
          deleted_at: null,
          date: { lt: today },
        },
        orderBy: [{ date: 'desc' }, { fromTime: 'desc' }],
        take: PAST_LIMIT,
        select: {
          id: true,
          title: true,
          date: true,
          fromTime: true,
          toTime: true,
          status: true,
          cohort_id: true,
          join_url: true,
          recording_url: true,
          recording_storage_key: true,
        },
      }),
    ]);

    const mapRow = (row: {
      id: number;
      title: string;
      date: Date | null;
      fromTime: Date | null;
      toTime: Date | null;
      status: string;
      cohort_id: number | null;
      join_url: string | null;
      recording_url: string | null;
      recording_storage_key: string | null;
    }): InstructorLiveClassSummary => ({
      id: row.id,
      title: row.title ?? '',
      date: isoDate(row.date),
      fromTime: timeOf(row.fromTime),
      toTime: timeOf(row.toTime),
      status: row.status ?? '',
      cohortId: row.cohort_id ?? null,
      cohortTitle: row.cohort_id ? cohortTitleMap.get(row.cohort_id) ?? null : null,
      joinUrl: row.join_url ?? null,
      recordingUrl: row.recording_url ?? null,
      recordingStorageKey: row.recording_storage_key ?? null,
    });

    // Naji UAT 2026-05-22 — extra dashboard metrics for the redesigned
    // Faculty home page (ttiifaculty.lovable.app reference).
    const upcomingMapped = upcoming.map(mapRow);
    const pastMapped = past.map(mapRow);

    // Pull cohort_students rows so we can count learners + per-cohort
    // size. cohort_students.cohort_id is a string column in the legacy
    // schema, so we look up by both pk and any text code.
    const cohortIdStrs = cohortIds.map((id) => String(id));
    const learnerRows = await this.prisma.cohort_students.findMany({
      where: { cohort_id: { in: cohortIdStrs }, deleted_at: null },
      select: { cohort_id: true, user_id: true },
    });
    const totalLearners = new Set(learnerRows.map((r) => r.user_id)).size;
    const learnersPerCohort = new Map<number, number>();
    for (const r of learnerRows) {
      const cid = Number(r.cohort_id);
      if (!Number.isFinite(cid)) continue;
      learnersPerCohort.set(cid, (learnersPerCohort.get(cid) ?? 0) + 1);
    }

    // Pending evaluations = submissions tied to this instructor's cohorts
    // that still have no marks. Overdue = pending AND the parent
    // assignment's due_date has passed.
    const allCohortAssignments = await this.prisma.assignment.findMany({
      where: { cohort_id: { in: cohortIds }, deleted_at: null },
      select: { id: true, cohort_id: true, due_date: true, total_marks: true, title: true },
    });
    const assignmentIds = allCohortAssignments.map((a) => a.id);
    const assignmentDueMap = new Map(allCohortAssignments.map((a) => [a.id, a.due_date]));
    const assignmentTotalMap = new Map(allCohortAssignments.map((a) => [a.id, a.total_marks ?? 0]));
    const assignmentTitleMap = new Map(allCohortAssignments.map((a) => [a.id, a.title ?? '']));

    const submissions = assignmentIds.length > 0
      ? await this.prisma.assignment_submissions.findMany({
          where: { assignment_id: { in: assignmentIds }, deleted_at: null },
          select: { id: true, assignment_id: true, marks: true, user_id: true, updated_at: true, created_at: true, cohort_id: true },
        })
      : [];
    let pendingEvaluations = 0;
    let pendingOverdue = 0;
    const totalScores: number[] = [];
    const scoresByCohort = new Map<number, number[]>();
    for (const s of submissions) {
      const isPending = s.marks === null || String(s.marks).trim() === '';
      if (isPending) {
        pendingEvaluations += 1;
        const due = s.assignment_id ? assignmentDueMap.get(s.assignment_id) : null;
        if (due && due < now) pendingOverdue += 1;
        continue;
      }
      const total = s.assignment_id ? Number(assignmentTotalMap.get(s.assignment_id) ?? 0) : 0;
      const scored = Number(String(s.marks).trim());
      if (total > 0 && Number.isFinite(scored)) {
        const pct = Math.max(0, Math.min(100, Math.round((scored / total) * 100)));
        totalScores.push(pct);
        if (s.cohort_id) {
          const arr = scoresByCohort.get(s.cohort_id) ?? [];
          arr.push(pct);
          scoresByCohort.set(s.cohort_id, arr);
        }
      }
    }
    const avg = (xs: number[]): number => (xs.length === 0 ? 0 : Math.round(xs.reduce((a, b) => a + b, 0) / xs.length));
    const avgPerformancePercent = avg(totalScores);

    // 8-week performance trend — bucket evaluated submissions by their
    // updated_at into weekly windows ending today. Also bucket
    // live_class_attendance rows for the second line on the chart
    // (avg attendance % across this instructor's classes that ended in
    // the same week).
    const week = 7 * 24 * 60 * 60 * 1000;
    const earliestWindowStart = new Date(today.getTime() - 7 * week);

    // Pull this instructor's live classes within the 8-week window so
    // we can join their attendance rows. Cohort scope keeps it cheap.
    const recentClasses = await this.prisma.live_class.findMany({
      where: {
        cohort_id: { in: cohortIds },
        deleted_at: null,
        date: { gte: earliestWindowStart },
      },
      select: { id: true, date: true },
    });
    const classDateMap = new Map(recentClasses.map((c) => [c.id, c.date]));
    const recentClassIds = recentClasses.map((c) => c.id);
    const attendanceRows = recentClassIds.length > 0
      ? await this.prisma.live_class_attendance.findMany({
          where: { live_class_id: { in: recentClassIds } },
          select: { live_class_id: true, percent_attended: true },
        })
      : [];

    const performanceTrend: { week: string; score: number; attendance: number }[] = [];
    for (let i = 7; i >= 0; i -= 1) {
      const end = new Date(today.getTime() - i * week + week);
      const start = new Date(end.getTime() - week);
      const scoreBucket: number[] = [];
      for (const s of submissions) {
        if (!s.updated_at || !s.marks || String(s.marks).trim() === '') continue;
        const t = new Date(s.updated_at);
        if (t < start || t >= end) continue;
        const total = s.assignment_id ? Number(assignmentTotalMap.get(s.assignment_id) ?? 0) : 0;
        const scored = Number(String(s.marks).trim());
        if (total > 0 && Number.isFinite(scored)) scoreBucket.push(Math.round((scored / total) * 100));
      }
      const attendBucket: number[] = [];
      for (const a of attendanceRows) {
        const classDate = classDateMap.get(a.live_class_id);
        if (!classDate) continue;
        const t = new Date(classDate);
        if (t < start || t >= end) continue;
        const pct = a.percent_attended === null || a.percent_attended === undefined ? null : Number(a.percent_attended);
        if (pct !== null && Number.isFinite(pct)) attendBucket.push(Math.max(0, Math.min(100, Math.round(pct))));
      }
      const label = `W${8 - i}`;
      performanceTrend.push({
        week: label,
        score: scoreBucket.length === 0 ? avgPerformancePercent : avg(scoreBucket),
        attendance: attendBucket.length === 0 ? 0 : avg(attendBucket),
      });
    }
    // Approximate delta vs last month = current avg minus avg of weeks 1-4.
    const recentAvg = avg(performanceTrend.slice(-4).map((p) => p.score));
    const priorAvg = avg(performanceTrend.slice(0, 4).map((p) => p.score));
    const avgPerformanceDelta = recentAvg - priorAvg;

    // Per-cohort performance for the bar chart.
    const cohortPerformance = cohorts.map((c) => ({
      cohortId: c.id,
      cohortTitle: c.title ?? '',
      avgPercent: avg(scoresByCohort.get(c.id) ?? []),
      learners: learnersPerCohort.get(c.id) ?? 0,
    }));

    // Today's schedule is upcoming sessions whose date is today.
    const todaysSchedule = upcomingMapped.filter((row) => {
      if (!row.date) return false;
      const d = new Date(row.date);
      return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
    });

    // Recent Activities — newest evaluations + recent submissions + recent classes.
    const recentActivities: InstructorDashboardPayload['recentActivities'] = [];
    const recentEvaluated = submissions
      .filter((s) => s.marks && String(s.marks).trim() !== '' && s.updated_at)
      .sort((a, b) => (b.updated_at?.getTime() ?? 0) - (a.updated_at?.getTime() ?? 0))
      .slice(0, 5);
    for (const s of recentEvaluated) {
      recentActivities.push({
        kind: 'evaluation',
        title: `Submission evaluated · ${String(s.marks).trim()} / ${assignmentTotalMap.get(s.assignment_id ?? 0) ?? '-'}`,
        subtitle: 'Marks saved — awaiting verification',
        when: (s.updated_at ?? new Date()).toISOString(),
      });
    }
    for (const row of pastMapped.slice(0, 3)) {
      recentActivities.push({
        kind: 'class',
        title: `Live class · ${row.title}`,
        subtitle: row.cohortTitle ?? 'Cohort',
        when: row.date ?? new Date().toISOString(),
      });
    }
    recentActivities.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());

    // Naji 2026-07-06 Lovable refresh — "Session Trend" bar chart: number of
    // live sessions conducted in each of the last 8 weekly windows (reuses the
    // recentClasses set already pulled for the attendance line above).
    const sessionTrend: { week: string; sessions: number }[] = [];
    for (let i = 7; i >= 0; i -= 1) {
      const end = new Date(today.getTime() - i * week + week);
      const start = new Date(end.getTime() - week);
      let count = 0;
      for (const c of recentClasses) {
        if (!c.date) continue;
        const t = new Date(c.date);
        if (t >= start && t < end) count += 1;
      }
      sessionTrend.push({ week: `W${8 - i}`, sessions: count });
    }

    // "Total Classes" KPI — live sessions in the CURRENT calendar month.
    // Counted directly against the table (not the capped past/upcoming display
    // slices) so a busy month isn't undercounted and it stays consistent with
    // sessionTrend. Month bounds built from local parts (no bare-YYYY-MM-DD
    // Date parsing) to avoid the timezone day-shift trap.
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const totalClasses = await this.prisma.live_class.count({
      where: { cohort_id: { in: cohortIds }, deleted_at: null, date: { gte: monthStart, lt: nextMonthStart } },
    });

    // "Recent Submissions" list — newest individual student submissions with the
    // student name + assignment title resolved via batch lookups. Sort/label by
    // created_at (the submit time) with updated_at as a fallback, so a re-graded
    // old row doesn't masquerade as a fresh submission.
    const submittedAtOf = (s: { created_at: Date | null; updated_at: Date | null }): Date | null =>
      s.created_at ?? s.updated_at;
    const submittedSorted = [...submissions]
      .filter((s) => submittedAtOf(s) !== null)
      .sort((a, b) => (submittedAtOf(b)?.getTime() ?? 0) - (submittedAtOf(a)?.getTime() ?? 0))
      .slice(0, 8);
    const submissionUserIds = Array.from(
      new Set(submittedSorted.map((s) => s.user_id).filter((id): id is number => typeof id === 'number' && Number.isFinite(id))),
    );
    const submissionUsers = submissionUserIds.length > 0
      ? await this.prisma.users.findMany({ where: { id: { in: submissionUserIds } }, select: { id: true, name: true } })
      : [];
    const submissionUserNameMap = new Map(submissionUsers.map((u) => [u.id, u.name ?? '']));
    const recentSubmissions = submittedSorted.map((s) => ({
      id: s.id,
      studentName: (s.user_id != null ? submissionUserNameMap.get(s.user_id) : '') || 'Student',
      assignmentTitle: (s.assignment_id != null ? assignmentTitleMap.get(s.assignment_id) : '') || 'Assignment',
      cohort: (s.cohort_id != null ? cohortTitleMap.get(s.cohort_id) : '') || '',
      submittedAt: (submittedAtOf(s) ?? new Date()).toISOString(),
    }));

    // AI Insights — simple heuristics so the section feels alive
    // without LLM cost. (Hooks to a real model can replace these later.)
    const aiInsights: InstructorDashboardPayload['aiInsights'] = [];
    if (pendingOverdue > 0) {
      aiInsights.push({
        tone: 'warning',
        title: `${pendingOverdue} overdue evaluation${pendingOverdue === 1 ? '' : 's'}`,
        body: 'These submissions are past their due date. Catching up unblocks the verification queue downstream.',
      });
    }
    if (avgPerformanceDelta >= 5) {
      aiInsights.push({
        tone: 'positive',
        title: `Performance up ${avgPerformanceDelta} pts vs early term`,
        body: 'Recent cohort scores are trending up. Consider noting which content shifted to keep the momentum.',
      });
    } else if (avgPerformanceDelta <= -5) {
      aiInsights.push({
        tone: 'warning',
        title: `Performance down ${Math.abs(avgPerformanceDelta)} pts vs early term`,
        body: 'Recent scores have slipped. A quick check-in or a remedial live session may help reset the trajectory.',
      });
    }
    const lowCohorts = cohortPerformance.filter((c) => c.avgPercent > 0 && c.avgPercent < 60);
    if (lowCohorts.length > 0) {
      aiInsights.push({
        tone: 'info',
        title: `${lowCohorts.length} cohort${lowCohorts.length === 1 ? '' : 's'} below 60%`,
        body: `Lowest: ${lowCohorts[0]!.cohortTitle} (${lowCohorts[0]!.avgPercent}%). Targeted feedback could move the needle.`,
      });
    }
    if (aiInsights.length === 0) {
      aiInsights.push({
        tone: 'positive',
        title: 'All clear',
        body: 'No overdue evaluations and cohort performance is steady. Great work keeping things on track.',
      });
    }

    const nextClass = upcomingMapped[0];
    const upcomingClassesNextLabel = nextClass
      ? `Next: ${formatScheduleLabel(nextClass.date, nextClass.fromTime)}`
      : 'Nothing scheduled';

    return {
      profile: profile
        ? {
            id: profile.id,
            name: profile.name ?? '',
            email: profile.email ?? profile.user_email ?? '',
            image: profile.image ?? null,
          }
        : null,
      upcomingLiveClasses: upcomingMapped,
      pastLiveClasses: pastMapped,
      cohortCount: cohorts.length,
      metrics: {
        assignedCohorts: cohorts.length,
        assignedCohortsDelta: `${cohorts.length} active`,
        upcomingClassesCount: upcomingMapped.length,
        upcomingClassesNextLabel,
        pendingEvaluations,
        pendingEvaluationsOverdue: pendingOverdue,
        totalLearners,
        avgPerformancePercent,
        avgPerformanceDelta,
        totalClasses,
      },
      performanceTrend,
      sessionTrend,
      cohortPerformance,
      recentSubmissions,
      todaysSchedule,
      recentActivities: recentActivities.slice(0, 6),
      aiInsights,
    };
  }

  private async getInstructorCohortIds(instructorId: number): Promise<{ ids: number[]; titleMap: Map<number, string> }> {
    const cohorts = await this.prisma.cohorts.findMany({
      where: { instructor_id: instructorId, deleted_at: null },
      select: { id: true, title: true },
    });
    return {
      ids: cohorts.map((c) => c.id),
      titleMap: new Map(cohorts.map((c) => [c.id, c.title ?? ''])),
    };
  }

  async listLiveClasses(
    instructorId: number,
    filter: LiveClassFilter = 'all',
  ): Promise<InstructorLiveClassListItem[]> {
    const { ids: cohortIds, titleMap } = await this.getInstructorCohortIds(instructorId);
    if (cohortIds.length === 0) return [];

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dateFilter =
      filter === 'upcoming'
        ? { gte: today }
        : filter === 'past'
          ? { lt: today }
          : undefined;

    const rows = await this.prisma.live_class.findMany({
      where: {
        cohort_id: { in: cohortIds },
        deleted_at: null,
        ...(dateFilter ? { date: dateFilter } : {}),
      },
      orderBy:
        filter === 'past'
          ? [{ date: 'desc' }, { fromTime: 'desc' }]
          : [{ date: 'asc' }, { fromTime: 'asc' }],
      select: {
        id: true,
        title: true,
        date: true,
        fromTime: true,
        toTime: true,
        status: true,
        cohort_id: true,
        join_url: true,
        recording_url: true,
        recording_storage_key: true,
        video_url: true,
        recording_fetched_at: true,
        attendance_fetched_at: true,
      },
    });

    return rows.map((row) => ({
      id: row.id,
      title: row.title ?? '',
      date: isoDate(row.date),
      fromTime: timeOf(row.fromTime),
      toTime: timeOf(row.toTime),
      status: row.status ?? '',
      cohortId: row.cohort_id ?? null,
      cohortTitle: row.cohort_id ? titleMap.get(row.cohort_id) ?? null : null,
      joinUrl: row.join_url ?? null,
      recordingUrl: row.recording_url ?? null,
      recordingStorageKey: row.recording_storage_key ?? null,
      recordingFetchedAt: isoString(row.recording_fetched_at),
      attendanceFetchedAt: isoString(row.attendance_fetched_at),
      hasRecording: Boolean(
        row.recording_storage_key ||
          (row.recording_url && /^https?:\/\//i.test(row.recording_url)) ||
          (row.video_url && /^https?:\/\//i.test(row.video_url)),
      ),
    }));
  }

  /**
   * Schedules a single live session for one of this instructor's own cohorts.
   * Auto-creates a Microsoft Teams meeting under a configured org host (Risha/
   * Naji 2026-07-06 — replaces the earlier manual-link approach): the instructor
   * never needs their own Teams licence; the meeting is hosted by an allowlisted
   * `teams_meeting_hosts` account, exactly like the admin/centre path
   * (operations-service.addLiveClasses). The row is written with platform 'teams'
   * so students see it and recording/attendance auto-sync applies.
   * Ownership is enforced by matching cohorts.instructor_id.
   */
  async scheduleLiveClass(
    instructorId: number,
    input: ScheduleLiveClassInput,
  ): Promise<ScheduleLiveClassResult> {
    const title = input.title.trim();
    const date = input.date.trim();
    const fromTime = input.fromTime.trim();
    const toTime = input.toTime.trim();

    if (!title) return { ok: false, code: 'invalid', message: 'Session title is required.' };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { ok: false, code: 'invalid', message: 'A valid date is required.' };
    }
    if (!/^\d{1,2}:\d{2}$/.test(fromTime) || !/^\d{1,2}:\d{2}$/.test(toTime)) {
      return { ok: false, code: 'invalid', message: 'Valid start and end times are required.' };
    }
    if (timeToMinutes(toTime) <= timeToMinutes(fromTime)) {
      return { ok: false, code: 'invalid', message: 'End time must be after the start time.' };
    }
    if (!input.cohortId) {
      return { ok: false, code: 'not_found', message: 'Cohort not found or not yours.' };
    }

    const cohort = await this.prisma.cohorts.findFirst({
      where: { id: input.cohortId, instructor_id: instructorId, deleted_at: null },
      select: { id: true, title: true, course_id: true },
    });
    if (!cohort) {
      return { ok: false, code: 'not_found', message: 'Cohort not found or not yours.' };
    }

    // Auto-create the Teams meeting under a free org host (shared allowlist +
    // conflict check with admin/centre). The instructor is not the organiser.
    const { pickAvailableTeamsHost, createTeamsMeetingServiceFromEnv } = await import(
      '../integrations/teams-scheduling.js'
    );
    const assignment = await pickAvailableTeamsHost(this.prisma, [{ date, fromTime, toTime }]);
    if (!assignment.host) {
      return {
        ok: false,
        code: 'invalid',
        message: assignment.reason ?? 'No faculty Teams account is free for the selected time slot.',
      };
    }
    const teamsHostEmail = assignment.host.teams_email;

    const teamsService = await createTeamsMeetingServiceFromEnv();
    if (!teamsService) {
      return {
        ok: false,
        code: 'invalid',
        message: 'Teams meeting integration is not configured on the server. Please contact admin.',
      };
    }

    // Build ISO start/end the same way the admin/centre flow does (times treated
    // as UTC-naive with a Z suffix) so both flows behave identically.
    const toIso = (t: string): string =>
      new Date(`${date}T${t.length === 5 ? `${t}:00` : t}Z`).toISOString();

    let joinUrl: string;
    let externalMeetingId: string | null;
    try {
      const meeting = await teamsService.createMeeting({
        hostEmail: teamsHostEmail,
        subject: title,
        startDateTime: toIso(fromTime),
        endDateTime: toIso(toTime),
      });
      joinUrl = meeting.joinUrl;
      externalMeetingId = meeting.meetingId;
      await this.prisma.teams_meeting_hosts.updateMany({
        where: { teams_email: teamsHostEmail },
        data: { policy_verified_at: new Date(), last_error: null },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await this.prisma.teams_meeting_hosts.updateMany({
        where: { teams_email: teamsHostEmail },
        data: { last_error: msg.substring(0, 1000) },
      });
      return { ok: false, code: 'invalid', message: `Could not create the Teams meeting: ${msg}` };
    }

    const now = new Date();
    const created = await this.prisma.live_class.create({
      data: {
        cohort_id: cohort.id,
        title,
        instructor_id: String(instructorId),
        course_id: String(cohort.course_id ?? ''),
        date: new Date(date),
        fromTime: parseTimeToDate(fromTime),
        toTime: parseTimeToDate(toTime),
        status: 'scheduled',
        platform: 'teams',
        join_url: joinUrl,
        external_meeting_id: externalMeetingId,
        host_email: teamsHostEmail,
        is_repetitive: 0,
        created_by: instructorId,
        updated_by: instructorId,
        created_at: now,
        updated_at: now,
      },
      select: {
        id: true,
        title: true,
        date: true,
        fromTime: true,
        toTime: true,
        status: true,
        cohort_id: true,
        join_url: true,
        recording_url: true,
        recording_storage_key: true,
        recording_fetched_at: true,
        attendance_fetched_at: true,
      },
    });

    return {
      ok: true,
      row: {
        id: created.id,
        title: created.title ?? '',
        date: isoDate(created.date),
        fromTime: timeOf(created.fromTime),
        toTime: timeOf(created.toTime),
        status: created.status ?? '',
        cohortId: created.cohort_id ?? null,
        cohortTitle: cohort.title ?? null,
        joinUrl: created.join_url ?? null,
        recordingUrl: created.recording_url ?? null,
        recordingStorageKey: created.recording_storage_key ?? null,
        recordingFetchedAt: isoString(created.recording_fetched_at),
        attendanceFetchedAt: isoString(created.attendance_fetched_at),
        // Just-scheduled session — no recording exists yet.
        hasRecording: false,
      },
    };
  }

  /**
   * Verifies that the live class belongs to a cohort owned by this instructor.
   * Returns the live_class row when authorized, or null when not (404 OR 403 —
   * caller decides). Used to gate attendance + recording-url lookups.
   */
  private async loadOwnedLiveClass(instructorId: number, liveClassId: number) {
    if (!liveClassId) return null;
    const row = await this.prisma.live_class.findFirst({
      where: { id: liveClassId, deleted_at: null },
      select: {
        id: true,
        title: true,
        date: true,
        cohort_id: true,
        recording_storage_key: true,
        recording_url: true,
        video_url: true,
      },
    });
    if (!row || !row.cohort_id) return null;
    const cohort = await this.prisma.cohorts.findFirst({
      where: { id: row.cohort_id, instructor_id: instructorId, deleted_at: null },
      select: { id: true },
    });
    if (!cohort) return null;
    return row;
  }

  /**
   * Resolves the playable recording for one of this instructor's live sessions.
   * Returns a Spaces storage key (route signs it), an absolute legacy URL
   * (recording_url || video_url — route hands it back as-is), or null when no
   * recording exists / the session isn't this instructor's. Mirrors the
   * admin/student model (operations-service.getLiveSessionRecordingTarget).
   */
  async getRecordingTarget(instructorId: number, liveClassId: number): Promise<InstructorRecordingTarget> {
    const row = await this.loadOwnedLiveClass(instructorId, liveClassId);
    if (!row) return null;
    if (row.recording_storage_key) return { kind: 'key', key: row.recording_storage_key };
    // Test each source independently (mirrors the hasRecording gate) so a
    // non-http(s) recording_url doesn't mask a valid http(s) video_url.
    const fallback =
      row.recording_url && /^https?:\/\//i.test(row.recording_url)
        ? row.recording_url
        : row.video_url && /^https?:\/\//i.test(row.video_url)
          ? row.video_url
          : null;
    if (fallback) return { kind: 'url', url: fallback };
    return null;
  }

  /**
   * Confirms `cohortId` is a live, non-deleted cohort owned by this instructor.
   * Returns true/false — callers translate false into a 404 (never leak whether
   * the cohort exists under another instructor).
   */
  private async ownsCohort(instructorId: number, cohortId: number): Promise<boolean> {
    if (!cohortId) return false;
    const cohort = await this.prisma.cohorts.findFirst({
      where: { id: cohortId, instructor_id: instructorId, deleted_at: null },
      select: { id: true },
    });
    return Boolean(cohort);
  }

  /**
   * Lists announcements for one of this instructor's cohorts. Returns null when
   * the cohort isn't theirs (route → 404). Reuses the shared AnnouncementService
   * / cohort_announcements table — no instructor-specific storage.
   */
  async listCohortAnnouncements(
    instructorId: number,
    cohortId: number,
  ): Promise<InstructorCohortAnnouncement[] | null> {
    if (!(await this.ownsCohort(instructorId, cohortId))) return null;
    const rows = await this.announcements.list({ cohortId: String(cohortId) });
    return rows.map(toInstructorAnnouncement);
  }

  /**
   * Creates a "sent" in-app announcement on one of this instructor's cohorts.
   * Returns null when the cohort isn't theirs (route → 404). The instructor id
   * is recorded as created_by via AnnouncementService.create.
   */
  async createCohortAnnouncement(
    instructorId: number,
    cohortId: number,
    input: CreateCohortAnnouncementInput,
  ): Promise<InstructorCohortAnnouncement | null> {
    if (!(await this.ownsCohort(instructorId, cohortId))) return null;
    const created = await this.announcements.create(String(instructorId), {
      cohort_id: String(cohortId),
      title: input.title,
      content: input.content,
      status: 'sent',
      audience_type: 'all',
      delivery_channels: ['in_app'],
    });
    return toInstructorAnnouncement(created);
  }

  /**
   * Soft-deletes an announcement, but ONLY when it belongs to a cohort this
   * instructor owns — never another cohort's or an admin-scoped (cohort-less)
   * announcement. Returns false when the announcement is missing or not theirs
   * (route → 404).
   */
  async deleteCohortAnnouncement(instructorId: number, announcementId: number): Promise<boolean> {
    if (!announcementId) return false;
    const existing = await this.announcements.get(String(announcementId));
    if (!existing) return false;
    const cohortNum = idFromUnknown(existing.cohort_id);
    if (!Number.isFinite(cohortNum) || cohortNum <= 0) return false;
    if (!(await this.ownsCohort(instructorId, cohortNum))) return false;
    await this.announcements.delete(String(instructorId), String(announcementId));
    return true;
  }

  async listCohorts(instructorId: number): Promise<InstructorCohortSummary[]> {
    const cohorts = await this.prisma.cohorts.findMany({
      where: { instructor_id: instructorId, deleted_at: null },
      select: {
        id: true,
        cohort_id: true,
        title: true,
        course_id: true,
        start_date: true,
        end_date: true,
      },
      orderBy: [{ start_date: 'desc' }, { id: 'desc' }],
    });

    if (cohorts.length === 0) return [];

    const cohortIds = cohorts.map((c) => c.id);
    const cohortIdStrs = cohortIds.map((id) => String(id));
    const courseIds = [
      ...new Set(cohorts.map((c) => c.course_id).filter((x): x is number => x !== null && x !== undefined)),
    ];

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [courses, learnerCounts, upcomingCounts] = await Promise.all([
      courseIds.length > 0
        ? this.prisma.course.findMany({
            where: { id: { in: courseIds } },
            select: { id: true, title: true },
          })
        : [],
      this.prisma.cohort_students.groupBy({
        by: ['cohort_id'],
        where: { cohort_id: { in: cohortIdStrs }, deleted_at: null },
        _count: { id: true },
      }),
      this.prisma.live_class.groupBy({
        by: ['cohort_id'],
        where: {
          cohort_id: { in: cohortIds },
          deleted_at: null,
          date: { gte: today },
        },
        _count: { id: true },
      }),
    ]);

    const courseMap = new Map(courses.map((c) => [c.id, c.title ?? '']));
    const learnerCountMap = new Map(learnerCounts.map((row) => [row.cohort_id, row._count?.id ?? 0]));
    const upcomingCountMap = new Map(upcomingCounts.map((row) => [row.cohort_id, row._count?.id ?? 0]));

    return cohorts.map((row) => ({
      id: row.id,
      title: row.title ?? '',
      cohortCode: row.cohort_id ?? '',
      courseTitle: row.course_id ? courseMap.get(row.course_id) ?? null : null,
      startDate: isoDate(row.start_date),
      endDate: isoDate(row.end_date),
      learnerCount: learnerCountMap.get(String(row.id)) ?? 0,
      upcomingSessionCount: row.id ? upcomingCountMap.get(row.id) ?? 0 : 0,
    }));
  }

  async getCohortDetail(
    instructorId: number,
    cohortId: number,
  ): Promise<InstructorCohortDetail | null> {
    if (!cohortId) return null;
    const cohort = await this.prisma.cohorts.findFirst({
      where: { id: cohortId, instructor_id: instructorId, deleted_at: null },
      select: {
        id: true,
        cohort_id: true,
        title: true,
        course_id: true,
        start_date: true,
        end_date: true,
      },
    });
    if (!cohort) return null;

    const cohortIdStr = String(cohort.id);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [course, students, learnerCount, upcomingCount] = await Promise.all([
      cohort.course_id
        ? this.prisma.course.findFirst({
            where: { id: cohort.course_id },
            select: { id: true, title: true },
          })
        : null,
      this.prisma.cohort_students.findMany({
        where: { cohort_id: cohortIdStr, deleted_at: null },
        select: { user_id: true },
      }),
      this.prisma.cohort_students.count({
        where: { cohort_id: cohortIdStr, deleted_at: null },
      }),
      this.prisma.live_class.count({
        where: { cohort_id: cohort.id, deleted_at: null, date: { gte: today } },
      }),
    ]);

    const userIds = students
      .map((s) => s.user_id)
      .filter((x): x is number => x !== null && x !== undefined);

    const users = userIds.length > 0
      ? await this.prisma.users.findMany({
          where: { id: { in: userIds }, deleted_at: null },
          select: {
            id: true,
            name: true,
            email: true,
            user_email: true,
            phone: true,
            student_id: true,
            status: true,
          },
        })
      : [];

    const statusLabels: Record<number, string> = {
      0: 'Inactive',
      1: 'Active',
      2: 'Graduated',
      3: 'Dropped',
    };

    const learners: InstructorLearnerRow[] = users
      .map((u) => ({
        id: u.id,
        name: u.name ?? '',
        email: u.user_email ?? u.email ?? '',
        phone: u.phone ?? '',
        enrollmentId: u.student_id ?? null,
        statusLabel:
          u.status !== null && u.status !== undefined
            ? statusLabels[u.status] ?? 'Unknown'
            : 'Unknown',
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      id: cohort.id,
      title: cohort.title ?? '',
      cohortCode: cohort.cohort_id ?? '',
      courseTitle: course?.title ?? null,
      startDate: isoDate(cohort.start_date),
      endDate: isoDate(cohort.end_date),
      learnerCount,
      upcomingSessionCount: upcomingCount,
      learners,
    };
  }

  async listAssignments(instructorId: number): Promise<InstructorAssignmentSummary[]> {
    const { ids: cohortIds, titleMap } = await this.getInstructorCohortIds(instructorId);
    if (cohortIds.length === 0) return [];

    const assignments = await this.prisma.assignment.findMany({
      where: { cohort_id: { in: cohortIds }, deleted_at: null },
      select: {
        id: true,
        title: true,
        cohort_id: true,
        due_date: true,
        total_marks: true,
      },
      orderBy: [{ due_date: 'desc' }, { id: 'desc' }],
    });

    if (assignments.length === 0) return [];

    const assignmentIds = assignments.map((a) => a.id);
    const submissions = await this.prisma.assignment_submissions.findMany({
      where: { assignment_id: { in: assignmentIds }, deleted_at: null },
      select: { assignment_id: true, marks: true },
    });

    const submissionsByAssignment = new Map<number, { total: number; graded: number }>();
    for (const sub of submissions) {
      const aid = sub.assignment_id;
      if (aid === null || aid === undefined) continue;
      const current = submissionsByAssignment.get(aid) ?? { total: 0, graded: 0 };
      current.total += 1;
      if (sub.marks && sub.marks.trim() !== '') current.graded += 1;
      submissionsByAssignment.set(aid, current);
    }

    return assignments.map((a) => {
      const counts = submissionsByAssignment.get(a.id) ?? { total: 0, graded: 0 };
      return {
        id: a.id,
        title: a.title ?? '',
        cohortId: a.cohort_id ?? null,
        cohortTitle: a.cohort_id ? titleMap.get(a.cohort_id) ?? null : null,
        dueDate: isoDate(a.due_date),
        totalMarks: a.total_marks ?? null,
        submissionCount: counts.total,
        gradedCount: counts.graded,
        pendingCount: counts.total - counts.graded,
      };
    });
  }

  /**
   * Verifies the assignment belongs to a cohort owned by this instructor.
   * Returns the assignment row when authorized, null otherwise.
   */
  private async loadOwnedAssignment(instructorId: number, assignmentId: number) {
    if (!assignmentId) return null;
    const assignment = await this.prisma.assignment.findFirst({
      where: { id: assignmentId, deleted_at: null },
      select: {
        id: true,
        title: true,
        description: true,
        instructions: true,
        file: true,
        due_date: true,
        total_marks: true,
        cohort_id: true,
      },
    });
    if (!assignment || !assignment.cohort_id) return null;
    const cohort = await this.prisma.cohorts.findFirst({
      where: { id: assignment.cohort_id, instructor_id: instructorId, deleted_at: null },
      select: { id: true, title: true },
    });
    if (!cohort) return null;
    return { assignment, cohort };
  }

  async getAssignmentDetail(
    instructorId: number,
    assignmentId: number,
  ): Promise<InstructorAssignmentDetail | null> {
    const owned = await this.loadOwnedAssignment(instructorId, assignmentId);
    if (!owned) return null;
    const { assignment, cohort } = owned;

    const submissions = await this.prisma.assignment_submissions.findMany({
      where: { assignment_id: assignment.id, deleted_at: null },
      orderBy: { id: 'desc' },
    });

    const userIds = [
      ...new Set(submissions.map((s) => s.user_id).filter((x): x is number => x !== null && x !== undefined)),
    ];
    const users = userIds.length > 0
      ? await this.prisma.users.findMany({
          where: { id: { in: userIds }, deleted_at: null },
          select: { id: true, name: true, student_id: true, email: true, user_email: true },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    const submissionRows: InstructorSubmissionRow[] = submissions.map((s) => {
      const user = s.user_id ? userMap.get(s.user_id) : null;
      const files = parseSubmissionFiles(s.assignment_files);
      return {
        id: s.id,
        userId: s.user_id ?? null,
        studentName: user?.name ?? null,
        studentEnrollmentId: user?.student_id ?? null,
        studentEmail: user?.user_email ?? user?.email ?? null,
        submittedAt: isoString(s.created_at),
        files,
        marks: s.marks ?? '',
        remarks: s.remarks ?? '',
        graded: Boolean(s.marks && s.marks.trim() !== ''),
      };
    });

    return {
      assignment: {
        id: assignment.id,
        title: assignment.title ?? '',
        description: assignment.description ?? '',
        instructions: assignment.instructions ?? null,
        file: assignment.file ?? null,
        dueDate: isoDate(assignment.due_date),
        totalMarks: assignment.total_marks ?? null,
        cohortId: cohort.id,
        cohortTitle: cohort.title ?? null,
      },
      submissions: submissionRows,
    };
  }

  /**
   * Grades a submission with the canonical admin pattern (marks + remarks).
   * Verifies the submission's assignment belongs to a cohort owned by this
   * instructor before applying the update.
   */
  async gradeSubmission(
    instructorId: number,
    submissionId: number,
    input: GradeSubmissionInput,
  ): Promise<InstructorSubmissionRow | null> {
    if (!submissionId) return null;
    const submission = await this.prisma.assignment_submissions.findFirst({
      where: { id: submissionId, deleted_at: null },
      select: { id: true, assignment_id: true, user_id: true },
    });
    if (!submission || !submission.assignment_id) return null;
    const owned = await this.loadOwnedAssignment(instructorId, submission.assignment_id);
    if (!owned) return null;

    const marks = input.marks.trim();
    const remarks = input.remarks.trim();
    const now = new Date();

    // Naji UAT 2026-05-22 — re-grading via the instructor portal must
    // reopen verification, exactly like the admin's evaluateSubmission
    // path does. Otherwise an admin-verified row could end up with
    // mismatched marks if the instructor changes them after publishing.
    await this.prisma.assignment_submissions.update({
      where: { id: submissionId },
      data: {
        marks: marks === '' ? null : marks,
        remarks: remarks === '' ? null : remarks,
        verified_at: null,
        verified_by: null,
        updated_by: instructorId,
        updated_at: now,
      },
    });

    const updated = await this.prisma.assignment_submissions.findFirst({
      where: { id: submissionId },
    });
    if (!updated) return null;

    const user = updated.user_id
      ? await this.prisma.users.findFirst({
          where: { id: updated.user_id, deleted_at: null },
          select: { id: true, name: true, student_id: true, email: true, user_email: true },
        })
      : null;

    const files = parseSubmissionFiles(updated.assignment_files);

    return {
      id: updated.id,
      userId: updated.user_id ?? null,
      studentName: user?.name ?? null,
      studentEnrollmentId: user?.student_id ?? null,
      studentEmail: user?.user_email ?? user?.email ?? null,
      submittedAt: isoString(updated.created_at),
      files,
      marks: updated.marks ?? '',
      remarks: updated.remarks ?? '',
      graded: Boolean(updated.marks && updated.marks.trim() !== ''),
    };
  }

  async getLiveClassAttendance(
    instructorId: number,
    liveClassId: number,
  ): Promise<InstructorAttendancePayload | null> {
    const row = await this.loadOwnedLiveClass(instructorId, liveClassId);
    if (!row) return null;

    const attendance = await this.prisma.live_class_attendance.findMany({
      where: { live_class_id: row.id },
      orderBy: [{ percent_attended: 'desc' }, { email: 'asc' }],
    });

    const userIds = attendance
      .map((a) => a.user_id)
      .filter((x): x is number => x !== null && x !== undefined);
    const users = userIds.length > 0
      ? await this.prisma.users.findMany({
          where: { id: { in: userIds }, deleted_at: null },
          select: { id: true, name: true, student_id: true },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    return {
      liveClassId: row.id,
      title: row.title ?? '',
      date: isoDate(row.date),
      attendance: attendance.map((a) => {
        const user = a.user_id ? userMap.get(a.user_id) : null;
        return {
          id: a.id,
          email: a.email ?? null,
          displayName: a.display_name ?? null,
          role: a.role ?? null,
          totalSeconds: a.total_seconds ?? null,
          percentAttended: a.percent_attended === null ? null : Number(a.percent_attended),
          firstJoinedAt: isoString(a.first_joined_at),
          lastLeftAt: isoString(a.last_left_at),
          userId: a.user_id ?? null,
          userName: user?.name ?? null,
          studentId: user?.student_id ?? null,
        };
      }),
    };
  }
}
