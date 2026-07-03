import { type AuthSession, type LegacyApiClient, type QueryValue } from '@ttii/frontend-core';

/**
 * Instructor portal API client. Thin wrapper over the shared legacy API
 * client, exposing only the endpoints the instructor-facing UI needs.
 *
 * Kept separate from AdminPortalApi so the surface is small + obvious;
 * instructors don't need admin-level methods like "create cohort" or
 * "delete student".
 */

interface LegacyEnvelope<T> {
  data?: T;
  message?: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export interface InstructorProfileSnapshot {
  userId: string;
  roleId: number;
  name: string;
  email: string;
  phone: string;
  countryCode: string;
  image: string;
}

export interface InstructorProfileUpdateInput {
  name: string;
  email: string;
  phone: string;
  countryCode: string;
}

export interface InstructorPasswordUpdateInput {
  password: string;
  confirmPassword: string;
}

export interface InstructorDashboardLiveClass {
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

export interface InstructorDashboardSnapshot {
  profile: {
    id: number;
    name: string;
    email: string;
    image: string | null;
  } | null;
  upcomingLiveClasses: InstructorDashboardLiveClass[];
  pastLiveClasses: InstructorDashboardLiveClass[];
  cohortCount: number;
  // Naji UAT 2026-05-22 — extra payload for the redesigned dashboard
  // (matches the ttiifaculty.lovable.app reference).
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
  };
  performanceTrend: { week: string; score: number; attendance: number }[];
  cohortPerformance: { cohortId: number; cohortTitle: string; avgPercent: number; learners: number }[];
  todaysSchedule: InstructorDashboardLiveClass[];
  recentActivities: {
    kind: 'submission' | 'evaluation' | 'class' | 'announcement';
    title: string;
    subtitle: string;
    when: string;
  }[];
  aiInsights: {
    tone: 'positive' | 'warning' | 'info';
    title: string;
    body: string;
  }[];
}

export type InstructorLiveClassFilter = 'upcoming' | 'past' | 'all';

export interface InstructorLiveClassRow extends InstructorDashboardLiveClass {
  recordingFetchedAt: string | null;
  attendanceFetchedAt: string | null;
}

export interface ScheduleLiveClassInput {
  cohortId: number;
  title: string;
  date: string; // YYYY-MM-DD
  fromTime: string; // HH:MM
  toTime: string; // HH:MM
  joinUrl: string;
}

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

export interface InstructorAttendanceSnapshot {
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

export interface InstructorCohortDetailSnapshot extends InstructorCohortSummary {
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

export interface InstructorAssignmentDetailSnapshot {
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

function asNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function asStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.filter((x): x is string => typeof x === 'string').map((s) => s.trim()).filter(Boolean);
}

function asSubmissionRow(input: unknown): InstructorSubmissionRow {
  const row = asRecord(input) ?? {};
  return {
    id: asNumber(row.id),
    userId: row.userId == null ? null : asNumber(row.userId),
    studentName: asNullableString(row.studentName),
    studentEnrollmentId: asNullableString(row.studentEnrollmentId),
    studentEmail: asNullableString(row.studentEmail),
    submittedAt: asNullableString(row.submittedAt),
    files: asStringArray(row.files),
    marks: asString(row.marks),
    remarks: asString(row.remarks),
    graded: Boolean(row.graded),
  };
}

function asLiveClassRow(input: unknown): InstructorDashboardLiveClass {
  const row = asRecord(input) ?? {};
  return {
    id: asNumber(row.id),
    title: asString(row.title),
    date: asNullableString(row.date),
    fromTime: asNullableString(row.fromTime),
    toTime: asNullableString(row.toTime),
    status: asString(row.status),
    cohortId: row.cohortId == null ? null : asNumber(row.cohortId),
    cohortTitle: asNullableString(row.cohortTitle),
    joinUrl: asNullableString(row.joinUrl),
    recordingUrl: asNullableString(row.recordingUrl),
    recordingStorageKey: asNullableString(row.recordingStorageKey),
  };
}

export class InstructorPortalApi {
  private readonly apiClient: LegacyApiClient;

  constructor(apiClient: LegacyApiClient) {
    this.apiClient = apiClient;
  }

  private async get<T>(path: string, authToken: string, query?: Record<string, QueryValue>): Promise<T> {
    return this.apiClient.request<T>({
      method: 'GET',
      path,
      authToken,
      ...(query ? { query } : {}),
    });
  }

  private async post<T>(
    path: string,
    authToken: string,
    body?: Record<string, unknown>,
    query?: Record<string, QueryValue>,
  ): Promise<T> {
    return this.apiClient.request<T>({
      method: 'POST',
      path,
      authToken,
      ...(body ? { body } : {}),
      ...(query ? { query } : {}),
    });
  }

  /**
   * Loads the logged-in instructor's profile from the shared /profile/index
   * endpoint. Used by the layout context to render their name + initials in
   * the navbar + sidebar.
   */
  async loadProfile(authToken: string, session: AuthSession): Promise<InstructorProfileSnapshot> {
    try {
      const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>('/profile/index', authToken);
      const profile = asRecord(payload.data) ?? {};
      return {
        userId: asString(profile.id) || String(session.userId),
        roleId: typeof profile.role_id === 'number' ? profile.role_id : session.roleId,
        name: asString(profile.name),
        email: asString(profile.user_email) || asString(profile.email),
        phone: asString(profile.phone),
        countryCode: asString(profile.country_code),
        image: asString(profile.image),
      };
    } catch {
      return {
        userId: String(session.userId),
        roleId: session.roleId,
        name: '',
        email: '',
        phone: '',
        countryCode: '',
        image: '',
      };
    }
  }

  async updateProfile(
    authToken: string,
    input: InstructorProfileUpdateInput,
    session: AuthSession,
  ): Promise<InstructorProfileSnapshot> {
    await this.post<LegacyEnvelope<Record<string, unknown>>>('/profile/update', authToken, {
      name: input.name,
      email: input.email,
      user_email: input.email,
      phone: input.phone,
      country_code: input.countryCode,
    });
    return this.loadProfile(authToken, session);
  }

  async changePassword(authToken: string, input: InstructorPasswordUpdateInput): Promise<void> {
    const response = await this.post<LegacyEnvelope<Record<string, unknown>>>(
      '/profile/change_password',
      authToken,
      {
        password: input.password,
        confirm_password: input.confirmPassword,
      },
    );
    // The legacy endpoint returns { status: 0, message } for validation errors
    // (mismatch / missing fields) with HTTP 200, so surface those as thrown
    // errors so the UI can show a toast.
    if (response && typeof response === 'object' && 'status' in response) {
      const status = (response as { status?: unknown }).status;
      if (status === 0 || status === '0') {
        const message = typeof response.message === 'string' && response.message.trim() !== ''
          ? response.message
          : 'Could not change password.';
        throw new Error(message);
      }
    }
  }

  async loadLiveClasses(
    authToken: string,
    filter: InstructorLiveClassFilter = 'all',
  ): Promise<InstructorLiveClassRow[]> {
    const payload = await this.get<LegacyEnvelope<unknown>>(
      '/instructor/live-classes',
      authToken,
      { filter },
    );
    const list = Array.isArray(payload.data) ? payload.data : [];
    return list.map((item) => {
      const row = asRecord(item) ?? {};
      return {
        ...asLiveClassRow(row),
        recordingFetchedAt: asNullableString(row.recordingFetchedAt),
        attendanceFetchedAt: asNullableString(row.attendanceFetchedAt),
      };
    });
  }

  /**
   * Schedules a single manual-link live session for one of the instructor's
   * cohorts. Throws an ApiError (with the server's message) on validation or
   * ownership failure so the form can surface it. Returns the created row.
   */
  async scheduleLiveClass(
    authToken: string,
    input: ScheduleLiveClassInput,
  ): Promise<InstructorLiveClassRow> {
    const payload = await this.post<LegacyEnvelope<Record<string, unknown>>>(
      '/instructor/live-classes',
      authToken,
      {
        cohortId: input.cohortId,
        title: input.title,
        date: input.date,
        fromTime: input.fromTime,
        toTime: input.toTime,
        joinUrl: input.joinUrl,
      },
    );
    const row = asRecord(payload.data) ?? {};
    return {
      ...asLiveClassRow(row),
      recordingFetchedAt: asNullableString(row.recordingFetchedAt),
      attendanceFetchedAt: asNullableString(row.attendanceFetchedAt),
    };
  }

  async loadLiveClassAttendance(
    authToken: string,
    liveClassId: number,
  ): Promise<InstructorAttendanceSnapshot | null> {
    try {
      const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>(
        `/instructor/live-classes/${liveClassId}/attendance`,
        authToken,
      );
      const data = asRecord(payload.data) ?? {};
      const list = Array.isArray(data.attendance) ? data.attendance : [];
      return {
        liveClassId: asNumber(data.liveClassId),
        title: asString(data.title),
        date: asNullableString(data.date),
        attendance: list.map((item) => {
          const row = asRecord(item) ?? {};
          return {
            id: asNumber(row.id),
            email: asNullableString(row.email),
            displayName: asNullableString(row.displayName),
            role: asNullableString(row.role),
            totalSeconds: row.totalSeconds == null ? null : asNumber(row.totalSeconds),
            percentAttended: row.percentAttended == null ? null : asNumber(row.percentAttended),
            firstJoinedAt: asNullableString(row.firstJoinedAt),
            lastLeftAt: asNullableString(row.lastLeftAt),
            userId: row.userId == null ? null : asNumber(row.userId),
            userName: asNullableString(row.userName),
            studentId: asNullableString(row.studentId),
          };
        }),
      };
    } catch {
      return null;
    }
  }

  async loadAssignments(authToken: string): Promise<InstructorAssignmentSummary[]> {
    const payload = await this.get<LegacyEnvelope<unknown>>('/instructor/assignments', authToken);
    const list = Array.isArray(payload.data) ? payload.data : [];
    return list.map((item) => {
      const row = asRecord(item) ?? {};
      return {
        id: asNumber(row.id),
        title: asString(row.title),
        cohortId: row.cohortId == null ? null : asNumber(row.cohortId),
        cohortTitle: asNullableString(row.cohortTitle),
        dueDate: asNullableString(row.dueDate),
        totalMarks: row.totalMarks == null ? null : asNumber(row.totalMarks),
        submissionCount: asNumber(row.submissionCount),
        gradedCount: asNumber(row.gradedCount),
        pendingCount: asNumber(row.pendingCount),
      };
    });
  }

  async loadAssignmentDetail(
    authToken: string,
    assignmentId: number,
  ): Promise<InstructorAssignmentDetailSnapshot | null> {
    try {
      const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>(
        `/instructor/assignments/${assignmentId}/submissions`,
        authToken,
      );
      const data = asRecord(payload.data);
      if (!data) return null;
      const a = asRecord(data.assignment) ?? {};
      const subs = Array.isArray(data.submissions) ? data.submissions : [];
      return {
        assignment: {
          id: asNumber(a.id),
          title: asString(a.title),
          description: asString(a.description),
          instructions: asNullableString(a.instructions),
          file: asNullableString(a.file),
          dueDate: asNullableString(a.dueDate),
          totalMarks: a.totalMarks == null ? null : asNumber(a.totalMarks),
          cohortId: a.cohortId == null ? null : asNumber(a.cohortId),
          cohortTitle: asNullableString(a.cohortTitle),
        },
        submissions: subs.map((item) => asSubmissionRow(item)),
      };
    } catch {
      return null;
    }
  }

  async gradeSubmission(
    authToken: string,
    submissionId: number,
    input: { marks: string; remarks: string },
  ): Promise<InstructorSubmissionRow | null> {
    try {
      const payload = await this.post<LegacyEnvelope<Record<string, unknown>>>(
        `/instructor/submissions/${submissionId}/grade`,
        authToken,
        { marks: input.marks, remarks: input.remarks },
      );
      const data = asRecord(payload.data);
      if (!data) return null;
      return asSubmissionRow(data);
    } catch {
      return null;
    }
  }

  async loadCohorts(authToken: string): Promise<InstructorCohortSummary[]> {
    const payload = await this.get<LegacyEnvelope<unknown>>('/instructor/cohorts', authToken);
    const list = Array.isArray(payload.data) ? payload.data : [];
    return list.map((item) => {
      const row = asRecord(item) ?? {};
      return {
        id: asNumber(row.id),
        title: asString(row.title),
        cohortCode: asString(row.cohortCode),
        courseTitle: asNullableString(row.courseTitle),
        startDate: asNullableString(row.startDate),
        endDate: asNullableString(row.endDate),
        learnerCount: asNumber(row.learnerCount),
        upcomingSessionCount: asNumber(row.upcomingSessionCount),
      };
    });
  }

  async loadCohortDetail(
    authToken: string,
    cohortId: number,
  ): Promise<InstructorCohortDetailSnapshot | null> {
    try {
      const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>(
        `/instructor/cohorts/${cohortId}/learners`,
        authToken,
      );
      const data = asRecord(payload.data);
      if (!data) return null;
      const learners = Array.isArray(data.learners) ? data.learners : [];
      return {
        id: asNumber(data.id),
        title: asString(data.title),
        cohortCode: asString(data.cohortCode),
        courseTitle: asNullableString(data.courseTitle),
        startDate: asNullableString(data.startDate),
        endDate: asNullableString(data.endDate),
        learnerCount: asNumber(data.learnerCount),
        upcomingSessionCount: asNumber(data.upcomingSessionCount),
        learners: learners.map((item) => {
          const row = asRecord(item) ?? {};
          return {
            id: asNumber(row.id),
            name: asString(row.name),
            email: asString(row.email),
            phone: asString(row.phone),
            enrollmentId: asNullableString(row.enrollmentId),
            statusLabel: asString(row.statusLabel) || 'Unknown',
          };
        }),
      };
    } catch {
      return null;
    }
  }

  async loadRecordingUrl(authToken: string, liveClassId: number): Promise<string | null> {
    try {
      const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>(
        `/instructor/live-classes/${liveClassId}/recording-url`,
        authToken,
      );
      const data = asRecord(payload.data) ?? {};
      return asNullableString(data.url);
    } catch {
      return null;
    }
  }

  async loadDashboard(authToken: string): Promise<InstructorDashboardSnapshot> {
    const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>(
      '/instructor/dashboard',
      authToken,
    );
    const data = asRecord(payload.data) ?? {};
    const profile = asRecord(data.profile);
    const upcoming = Array.isArray(data.upcomingLiveClasses) ? data.upcomingLiveClasses : [];
    const past = Array.isArray(data.pastLiveClasses) ? data.pastLiveClasses : [];

    // Naji UAT 2026-05-22 — dashboard payload extended for the redesign.
    // Older API responses (before this commit hit prod) won't carry the
    // new fields, so default each to a safe empty value rather than
    // throwing — that lets the page render gracefully across versions.
    const metricsRaw = asRecord(data.metrics) ?? {};
    const performanceTrend = Array.isArray(data.performanceTrend)
      ? (data.performanceTrend as unknown[]).map((p) => {
          const r = asRecord(p) ?? {};
          return { week: asString(r.week), score: asNumber(r.score), attendance: asNumber(r.attendance) };
        })
      : [];
    const cohortPerformance = Array.isArray(data.cohortPerformance)
      ? (data.cohortPerformance as unknown[]).map((p) => {
          const r = asRecord(p) ?? {};
          return {
            cohortId: asNumber(r.cohortId),
            cohortTitle: asString(r.cohortTitle),
            avgPercent: asNumber(r.avgPercent),
            learners: asNumber(r.learners),
          };
        })
      : [];
    const todaysSchedule = Array.isArray(data.todaysSchedule) ? (data.todaysSchedule as unknown[]).map(asLiveClassRow) : [];
    const recentActivities = Array.isArray(data.recentActivities)
      ? (data.recentActivities as unknown[]).map((p) => {
          const r = asRecord(p) ?? {};
          const kindRaw = asString(r.kind);
          const kind: 'submission' | 'evaluation' | 'class' | 'announcement' =
            kindRaw === 'submission' || kindRaw === 'evaluation' || kindRaw === 'class' || kindRaw === 'announcement'
              ? kindRaw
              : 'submission';
          return { kind, title: asString(r.title), subtitle: asString(r.subtitle), when: asString(r.when) };
        })
      : [];
    const aiInsights = Array.isArray(data.aiInsights)
      ? (data.aiInsights as unknown[]).map((p) => {
          const r = asRecord(p) ?? {};
          const toneRaw = asString(r.tone);
          const tone: 'positive' | 'warning' | 'info' =
            toneRaw === 'positive' || toneRaw === 'warning' || toneRaw === 'info' ? toneRaw : 'info';
          return { tone, title: asString(r.title), body: asString(r.body) };
        })
      : [];

    return {
      profile: profile
        ? {
            id: asNumber(profile.id),
            name: asString(profile.name),
            email: asString(profile.email),
            image: asNullableString(profile.image),
          }
        : null,
      upcomingLiveClasses: upcoming.map(asLiveClassRow),
      pastLiveClasses: past.map(asLiveClassRow),
      cohortCount: asNumber(data.cohortCount),
      metrics: {
        assignedCohorts: asNumber(metricsRaw.assignedCohorts),
        assignedCohortsDelta: asString(metricsRaw.assignedCohortsDelta),
        upcomingClassesCount: asNumber(metricsRaw.upcomingClassesCount),
        upcomingClassesNextLabel: asString(metricsRaw.upcomingClassesNextLabel),
        pendingEvaluations: asNumber(metricsRaw.pendingEvaluations),
        pendingEvaluationsOverdue: asNumber(metricsRaw.pendingEvaluationsOverdue),
        totalLearners: asNumber(metricsRaw.totalLearners),
        avgPerformancePercent: asNumber(metricsRaw.avgPerformancePercent),
        avgPerformanceDelta: asNumber(metricsRaw.avgPerformanceDelta),
      },
      performanceTrend,
      cohortPerformance,
      todaysSchedule,
      recentActivities,
      aiInsights,
    };
  }
}
