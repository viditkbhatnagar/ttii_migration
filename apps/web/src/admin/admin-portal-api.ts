import { type LegacyApiClient, type QueryValue } from '@ttii/frontend-core';

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

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  // Numeric IDs come straight from Prisma as `number`; without this coercion
  // every {id, title} pair we map for the Course dropdown ends up with
  // value="", making selection a no-op.
  if (typeof value === 'number' || typeof value === 'bigint' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

function asNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'bigint') {
    return Number(value);
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function toRecords(value: unknown): Record<string, unknown>[] {
  return asArray(value)
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => entry !== null);
}

function firstRecord(value: unknown): Record<string, unknown> | null {
  const rows = toRecords(value);
  return rows[0] ?? null;
}

function dateOnly(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dayOffset(offsetDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return dateOnly(date);
}

export interface AdminDashboardSnapshot {
  windowLabel: string;
  applicationsTotal: number;
  pendingApplications: number;
  rejectedApplications: number;
  studentsTotal: number;
  centresTotal: number;
  cohortsTotal: number;
  liveClassesTotal: number;
  recentApplications: Record<string, unknown>[];
  latestCentres: Record<string, unknown>[];
  latestLiveClasses: Record<string, unknown>[];
}

export interface AdminApplicationsSnapshot {
  items: Record<string, unknown>[];
  rejectedCount: number;
  pendingCount: number;
  courses: { id: string; title: string }[];
  centres: { id: string; centre_name: string }[];
}

export interface AdminAssessmentSnapshot {
  upcomingExams: Record<string, unknown>[];
  expiredExams: Record<string, unknown>[];
  currentAssignments: Record<string, unknown>[];
  upcomingAssignments: Record<string, unknown>[];
  completedAssignments: Record<string, unknown>[];
}

export interface AdminSettingsSnapshot {
  systemSettings: Record<string, unknown>[];
  frontendSettings: Record<string, unknown>[];
  appVersion: Record<string, unknown>;
}

export interface AddAdminCentreInput {
  centreName: string;
  contactPerson: string;
  countryCode: string;
  phone: string;
  email: string;
  address: string;
  registrationDate: string;
  expiryDate: string;
  image?: string | undefined;
}

export interface AssignCentrePlanInput {
  centreId: string;
  courseId: string;
  assignedAmount: number;
  startDate: string;
  endDate: string;
}

export interface AddAdminResourceFileInput {
  folderId: string;
  centreId?: string;
  name: string;
  type: string;
  size: number;
  path: string;
}

export interface AddAdminLiveClassInput {
  cohortId: string;
  zoomId: string;
  password: string;
  entries: Array<{
    sessionId: string;
    title: string;
    date: string;
    fromTime: string;
    toTime: string;
    isRepetitive?: number;
    repeatDates?: string[];
  }>;
  platform?: 'teams' | 'zoom' | 'manual' | 'other';
  teamsHostEmail?: string;
  manualJoinUrl?: string;
}

export interface TeamsMeetingHost {
  id: number;
  teams_email: string;
  display_name: string | null;
  is_active: number;
  policy_verified_at: string | null;
  last_error: string | null;
}

export interface ExportAdminReportInput {
  type: 'summary' | 'live_report';
  fromDate?: string;
  toDate?: string;
  liveId?: string;
  date?: string;
}

// ─── Phase 2: Exam & Assessment Types ─────────────────────────────────────

export interface AdminExamListSnapshot {
  exams: Record<string, unknown>[];
  summary: { total: number; upcoming: number; expired: number; practice: number };
}

export interface AdminExamResultSnapshot {
  exams: Record<string, unknown>[];
  results: Record<string, unknown>[];
}

export interface AdminExamEvaluationSnapshot {
  exams: Record<string, unknown>[];
  pendingEvaluations: Record<string, unknown>[];
}

export interface AddExamInput {
  title: string;
  description?: string;
  mark?: number;
  duration?: string;
  fromDate?: string;
  toDate?: string;
  fromTime?: string;
  toTime?: string;
  courseId: string;
  subjectId?: string;
  lessonId?: string;
  batchId?: string;
  free?: string;
  publishResult?: number;
  isPractice?: number;
  questionIds?: string[];
}

export interface AddQuestionInput {
  courseId: string;
  subjectId?: string;
  lessonId?: string;
  qType?: number;
  title: string;
  options?: string;
  correctAnswers?: string;
  numberOfOptions?: number;
  hint?: string;
  solution?: string;
}

export interface AddAssignmentInput {
  title: string;
  description?: string;
  totalMarks?: number;
  addedDate?: string;
  dueDate?: string;
  fromTime?: string;
  toTime?: string;
  instructions?: string;
  file?: string;
  courseId: string;
  cohortId?: string;
}

export interface AddEntranceExamInput {
  title: string;
  description?: string;
  totalMarks?: number;
  duration?: string;
  examDate?: string;
  fromTime?: string;
  toTime?: string;
  courseId: string;
  status?: string;
  questionIds?: string;
}

// ─── Phase 3: Operations & People Types ───────────────────────────────────

export interface AddAdminCohortInput {
  title: string;
  cohortCode?: string;
  courseId: string;
  subjectId: string;
  centreId: string;
  instructorId: string;
  startDate: string;
  endDate: string;
  languageId?: string;
  offeringIds?: string[];
}

export interface AdminPaymentStatusSnapshot {
  counts: Record<string, number>;
  installments: Record<string, unknown>[];
}

// ── Ainvox call history (admin-only) ──────────────────────────────
export interface AdminCallLog {
  uuid: string;
  direction: string | null;
  phoneNumber: string | null;
  virtualNumber: string | null;
  status: string | null;
  durationSeconds: number | null;
  recordingUrl: string | null;
  startedAt: string | null;
  answeredAt: string | null;
  endedAt: string | null;
  hangupCause: string | null;
  cost: number | null;
}

export interface AdminCallLogPage {
  pageNumber: number;
  perPage: number;
  totalRows: number | null;
  data: AdminCallLog[];
}

export class AdminPortalApi {
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

  async loadApplications(
    authToken: string,
    input: {
      fromDate?: string;
      toDate?: string;
      listBy?: string;
      courseId?: string;
      pipelineRoleId?: string;
      centreId?: string;
      search?: string;
      status?: string;
    } = {},
  ): Promise<AdminApplicationsSnapshot> {
    const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>('/admin/applications/index', authToken, {
      ...(input.fromDate ? { from_date: input.fromDate } : {}),
      ...(input.toDate ? { to_date: input.toDate } : {}),
      ...(input.listBy ? { list_by: input.listBy } : {}),
      ...(input.courseId ? { course: input.courseId } : {}),
      ...(input.pipelineRoleId ? { filter_pipeline: input.pipelineRoleId } : {}),
      ...(input.centreId ? { centre_id: input.centreId } : {}),
      ...(input.search ? { search: input.search } : {}),
      ...(input.status ? { status: input.status } : {}),
    });

    const data = asRecord(payload.data) ?? {};

    return {
      items: toRecords(data.students),
      rejectedCount: asNumber(data.rejected_count),
      pendingCount: asNumber(data.pending_count),
      courses: toRecords(data.courses).map(c => ({ id: asString(c.id), title: asString(c.title) })),
      centres: toRecords(data.centres).map(c => ({ id: asString(c.id), centre_name: asString(c.centre_name) })),
    };
  }

  async loadStudents(
    authToken: string,
    filters: { courseId?: string; centreId?: string; batchId?: string; search?: string; status?: string } = {},
  ): Promise<Record<string, unknown>[]> {
    const params: Record<string, QueryValue> = {};
    if (filters.courseId) params.course_id = filters.courseId;
    if (filters.centreId) params.centre_id = filters.centreId;
    if (filters.batchId) params.batch_id = filters.batchId;
    if (filters.search) params.search = filters.search;
    if (filters.status) params.status = filters.status;

    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/students/index', authToken, params);
    return toRecords(payload.data);
  }

  async loadCentres(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/centres/index', authToken);
    return toRecords(payload.data);
  }

  async addCentre(authToken: string, input: AddAdminCentreInput): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/centres/add', authToken, {
      centre_name: input.centreName,
      contact_person: input.contactPerson,
      code: input.countryCode,
      phone: input.phone,
      email: input.email,
      address: input.address,
      date_of_registration: input.registrationDate,
      date_of_expiry: input.expiryDate,
      image: input.image,
    });
  }

  async assignCentrePlan(authToken: string, input: AssignCentrePlanInput): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/centres/save_assign_plan', authToken, {
      centre_id: input.centreId,
      course_id: input.courseId,
      assigned_amount: input.assignedAmount,
      start_date: input.startDate,
      end_date: input.endDate,
    });
  }

  async loadPipelineUsers(authToken: string, roleId: number): Promise<Record<string, unknown>[]> {
    const payload = await this.get<unknown[]>('/admin/applications/get_pipeline_users', authToken, {
      role_id: roleId,
    });

    return toRecords(payload);
  }

  async convertApplication(authToken: string, applicationId: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/applications/convert', authToken, {
      application_id: applicationId,
    });
  }

  async loadCourses(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/course/all_course', authToken);
    return toRecords(payload.data);
  }

  async loadSubjects(authToken: string, courseId: string): Promise<Record<string, unknown>[]> {
    if (!courseId) {
      return [];
    }

    const payload = await this.get<LegacyEnvelope<unknown[]>>('/course/get_subjects', authToken, {
      course_id: courseId,
    });

    return toRecords(payload.data);
  }

  async loadLessons(authToken: string, subjectId: string): Promise<Record<string, unknown>[]> {
    if (!subjectId) {
      return [];
    }

    const payload = await this.get<LegacyEnvelope<unknown[]>>('/course/get_lessons', authToken, {
      subject_id: subjectId,
    });

    return toRecords(payload.data);
  }

  async loadResources(authToken: string, folderId = '', centreId = ''): Promise<Record<string, unknown>> {
    const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>('/admin/resources/index', authToken, {
      ...(folderId ? { folder_id: folderId } : {}),
      ...(centreId ? { centre_id: centreId } : {}),
    });

    return asRecord(payload.data) ?? {};
  }

  async addResourceFolder(
    authToken: string,
    parentId: string,
    name: string,
    centreId?: string,
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/resources/add_folder', authToken, {
      parent_id: parentId,
      name,
      ...(centreId ? { centre_id: centreId } : {}),
    });
  }

  async addResourceFile(authToken: string, input: AddAdminResourceFileInput): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/resources/add_file', authToken, {
      folder_id: input.folderId,
      ...(input.centreId ? { centre_id: input.centreId } : {}),
      name: input.name,
      type: input.type,
      size: input.size,
      path: input.path,
    });
  }

  async loadLiveClasses(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/live_class/index', authToken);
    return toRecords(payload.data);
  }

  async addLiveClass(authToken: string, input: AddAdminLiveClassInput): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/live_class/add', authToken, {
      cohort_id: input.cohortId,
      zoom_id: input.zoomId,
      password: input.password,
      entries: input.entries.map((entry) => ({
        session_id: entry.sessionId,
        title: entry.title,
        date: entry.date,
        fromTime: entry.fromTime,
        toTime: entry.toTime,
        is_repetitive: entry.isRepetitive ?? 0,
        repeat_dates: entry.repeatDates ?? [],
      })),
      platform: input.platform,
      teams_host_email: input.teamsHostEmail,
      manual_join_url: input.manualJoinUrl,
    });
  }

  // ── Teams meeting hosts (allowlist) ──────────────────────────────
  async listTeamsMeetingHosts(authToken: string): Promise<TeamsMeetingHost[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/teams_meeting_hosts/index', authToken);
    return toRecords(payload.data) as unknown as TeamsMeetingHost[];
  }

  async addTeamsMeetingHost(
    authToken: string,
    input: { teamsEmail: string; displayName?: string; userId?: string; isActive?: boolean },
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/teams_meeting_hosts/add', authToken, {
      teams_email: input.teamsEmail,
      display_name: input.displayName,
      user_id: input.userId,
      is_active: input.isActive !== false,
    });
  }

  async editTeamsMeetingHost(
    authToken: string,
    id: string,
    input: { displayName?: string; isActive?: boolean },
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/teams_meeting_hosts/edit', authToken, {
      id,
      display_name: input.displayName,
      is_active: input.isActive,
    });
  }

  async deleteTeamsMeetingHost(authToken: string, id: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/teams_meeting_hosts/delete', authToken, { id });
  }

  async testTeamsMeetingHost(authToken: string, id: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/teams_meeting_hosts/test', authToken, { id });
  }

  async loadAssessments(
    authToken: string,
    input: {
      courseId?: string;
      subjectId?: string;
      lessonId?: string;
      cohortId?: string;
    } = {},
  ): Promise<AdminAssessmentSnapshot> {
    const [examsPayload, assignmentsPayload] = await Promise.all([
      this.get<LegacyEnvelope<Record<string, unknown>>>('/exams/index', authToken, {
        ...(input.courseId ? { course_id: input.courseId } : {}),
        ...(input.subjectId ? { subject_id: input.subjectId } : {}),
        ...(input.lessonId ? { lesson_id: input.lessonId } : {}),
      }),
      this.get<LegacyEnvelope<Record<string, unknown>>>('/assignment/index', authToken, {
        ...(input.subjectId ? { subject_id: input.subjectId } : {}),
        ...(input.cohortId ? { cohort_id: input.cohortId } : {}),
      }),
    ]);

    const examsData = asRecord(examsPayload.data) ?? {};
    const assignmentsData = asRecord(assignmentsPayload.data) ?? {};

    return {
      upcomingExams: toRecords(examsData.upcoming_exams),
      expiredExams: toRecords(examsData.expired_exams),
      currentAssignments: toRecords(assignmentsData.current),
      upcomingAssignments: toRecords(assignmentsData.upcoming),
      completedAssignments: toRecords(assignmentsData.completed),
    };
  }

  async loadReports(
    authToken: string,
    input: {
      fromDate?: string;
      toDate?: string;
    } = {},
  ): Promise<Record<string, unknown>> {
    const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>('/admin/reports/index', authToken, {
      ...(input.fromDate ? { from_date: input.fromDate } : {}),
      ...(input.toDate ? { to_date: input.toDate } : {}),
    });

    return asRecord(payload.data) ?? {};
  }

  async exportReport(authToken: string, input: ExportAdminReportInput): Promise<{ filename: string; csv: string }> {
    const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>('/admin/reports/export', authToken, {
      type: input.type,
      ...(input.fromDate ? { from_date: input.fromDate } : {}),
      ...(input.toDate ? { to_date: input.toDate } : {}),
      ...(input.liveId ? { live_id: input.liveId } : {}),
      ...(input.date ? { date: input.date } : {}),
    });

    const data = asRecord(payload.data) ?? {};

    return {
      filename: asString(data.filename) || (input.type === 'live_report' ? 'live-report.csv' : 'admin-operations-summary.csv'),
      csv: asString(data.csv),
    };
  }

  async loadLiveReport(authToken: string, liveId = '', joinDate = ''): Promise<{
    lives: Record<string, unknown>[];
    listItems: Record<string, unknown>[];
  }> {
    const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>('/admin/live_report/index', authToken, {
      ...(liveId ? { live_id: liveId } : {}),
      ...(joinDate.trim() !== '' ? { date: joinDate } : {}),
    });

    const data = asRecord(payload.data) ?? {};

    return {
      lives: toRecords(data.lives),
      listItems: toRecords(data.list_items),
    };
  }

  async loadGlobalCalendar(
    authToken: string,
    fromDate = dayOffset(-7),
    toDate = dayOffset(14),
  ): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/global_calender/index', authToken, {
      from_date: fromDate,
      to_date: toDate,
    });

    return toRecords(payload.data);
  }

  async loadSettings(authToken: string): Promise<AdminSettingsSnapshot> {
    const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>('/admin/settings/system_settings', authToken);
    const data = asRecord(payload.data) ?? {};

    return {
      systemSettings: toRecords(data.system_settings),
      frontendSettings: toRecords(data.frontend_settings),
      appVersion: asRecord(data.app_version) ?? {},
    };
  }

  async updateSystemSettings(authToken: string, system: Record<string, string>): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/settings/system_settings', authToken, {
      system,
    });
  }

  async updateWebsiteSettings(authToken: string, frontend: Record<string, string>): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/settings/website_settings', authToken, {
      frontend,
    });
  }

  async updateAppVersion(
    authToken: string,
    input: {
      appVersion: string;
      appVersionIos: string;
    },
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/settings/edit_app_version', authToken, {
      app_version: input.appVersion,
      app_version_ios: input.appVersionIos,
    });
  }

  async loadDashboard(authToken: string): Promise<AdminDashboardSnapshot> {
    const [reportSummary, applications, centres, students, liveClasses] = await Promise.all([
      this.loadReports(authToken, {
        fromDate: dayOffset(-30),
        toDate: dayOffset(0),
      }),
      this.loadApplications(authToken),
      this.loadCentres(authToken),
      this.loadStudents(authToken),
      this.loadLiveClasses(authToken),
    ]);

    const reportWindow = asRecord(reportSummary.report_window) ?? {};

    const pendingApplications = applications.items.filter((entry) => asString(entry.status).toLowerCase() === 'pending').length;

    return {
      windowLabel: `${asString(reportWindow.fromDate)} to ${asString(reportWindow.toDate)}`,
      applicationsTotal: asNumber(reportSummary.applications_total) || applications.items.length,
      pendingApplications,
      rejectedApplications: asNumber(reportSummary.applications_rejected) || applications.rejectedCount,
      studentsTotal: asNumber(reportSummary.students_total) || students.length,
      centresTotal: asNumber(reportSummary.centres_total) || centres.length,
      cohortsTotal: asNumber(reportSummary.cohorts_total),
      liveClassesTotal: asNumber(reportSummary.live_classes_total) || liveClasses.length,
      recentApplications: applications.items.slice(0, 5),
      latestCentres: centres.slice(0, 5),
      latestLiveClasses: liveClasses.slice(0, 5),
    };
  }

  static asNumber(value: unknown): number {
    return asNumber(value);
  }

  static asString(value: unknown): string {
    return asString(value);
  }

  static firstCourseId(rows: Record<string, unknown>[]): string {
    return asString(firstRecord(rows)?.id);
  }

  static firstSubjectId(rows: Record<string, unknown>[]): string {
    return asString(firstRecord(rows)?.id);
  }

  static firstLiveId(rows: Record<string, unknown>[]): string {
    return asString(firstRecord(rows)?.id) || asString(firstRecord(rows)?.live_id);
  }

  // ─── Phase 1: Admin Dashboard (dedicated endpoint) ────────────────────────

  async loadAdminDashboard(authToken: string): Promise<Record<string, unknown>> {
    const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>('/admin/dashboard/index', authToken);
    return asRecord(payload.data) ?? {};
  }

  // ─── Phase 1: Batches (Intake) ────────────────────────────────────────────

  async loadBatches(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/batch/index', authToken);
    return toRecords(payload.data);
  }

  async addBatch(
    authToken: string,
    input: { title: string; description?: string; status?: string },
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/batch/add', authToken, input);
  }

  async editBatch(
    authToken: string,
    input: { id: string; title: string; description?: string; status?: string },
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/batch/edit', authToken, input);
  }

  async deleteBatch(authToken: string, id: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/batch/delete', authToken, { id });
  }

  // ─── Phase 1: Payments ────────────────────────────────────────────────────

  async loadPayments(
    authToken: string,
    input: { fromDate?: string; toDate?: string; courseId?: string } = {},
  ): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/payments/index', authToken, {
      ...(input.fromDate ? { from_date: input.fromDate } : {}),
      ...(input.toDate ? { to_date: input.toDate } : {}),
      ...(input.courseId ? { course_id: input.courseId } : {}),
    });

    return toRecords(payload.data);
  }

  // ─── Phase 1: Admin Cohorts ───────────────────────────────────────────────

  async loadAdminCohorts(
    authToken: string,
    input: {
      courseId?: string;
      subjectId?: string;
      centreId?: string;
      status?: string;
      languageId?: string;
      instructorId?: string;
      cohortMonth?: string;
    } = {},
  ): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/centres/cohorts', authToken, {
      ...(input.courseId ? { course_id: input.courseId } : {}),
      ...(input.subjectId ? { subject_id: input.subjectId } : {}),
      ...(input.centreId ? { centre_id: input.centreId } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.languageId ? { language_id: input.languageId } : {}),
      ...(input.instructorId ? { instructor_id: input.instructorId } : {}),
      ...(input.cohortMonth ? { cohort_month: input.cohortMonth } : {}),
    });

    return toRecords(payload.data);
  }

  async deleteCohort(authToken: string, id: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/cohorts/delete', authToken, { id });
  }

  // ─── Cohort Detail Mutations ─────────────────────────────────────────
  async addCohortLearners(authToken: string, cohortId: string, studentIds: string[]): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/cohorts/add_learners', authToken, {
      cohort_id: cohortId,
      student_ids: studentIds,
    });
  }

  async removeCohortLearner(authToken: string, cohortId: string, studentId: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/cohorts/remove_learner', authToken, {
      cohort_id: cohortId,
      student_id: studentId,
    });
  }

  async loadAvailableLearners(authToken: string, cohortId: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/cohorts/available_learners', authToken, {
      cohort_id: cohortId,
    });
    return toRecords(payload.data);
  }

  async addCohortLiveSession(
    authToken: string,
    cohortId: string,
    input: {
      sessionId: string;
      title: string;
      date: string;
      fromTime: string;
      toTime: string;
      zoomId?: string;
      password?: string;
      isRepetitive?: boolean;
      repeatDates?: string[];
      platform?: 'teams' | 'zoom' | 'manual' | 'other';
      teamsHostEmail?: string;
      manualJoinUrl?: string;
    },
  ): Promise<Record<string, unknown>> {
    // Route through the real /admin/live_class/add endpoint (the
    // /admin/cohorts/add_live_session endpoint was never implemented
    // on the backend). Payload shape matches AddLiveClassInput.
    return this.post<Record<string, unknown>>('/admin/live_class/add', authToken, {
      cohort_id: cohortId,
      zoom_id: input.zoomId ?? '',
      password: input.password ?? '',
      entries: [{
        session_id: input.sessionId,
        title: input.title,
        date: input.date,
        fromTime: input.fromTime,
        toTime: input.toTime,
        is_repetitive: input.isRepetitive ? 1 : 0,
        repeat_dates: input.repeatDates ?? [],
      }],
      platform: input.platform,
      teams_host_email: input.teamsHostEmail,
      manual_join_url: input.manualJoinUrl,
    });
  }

  // Bulk creation — used by the Multiple Sessions schedule builder. Backend
  // already loops over `entries`, so we just pass them all in a single POST.
  async addCohortLiveSessionsBulk(
    authToken: string,
    cohortId: string,
    input: {
      platform?: 'teams' | 'zoom' | 'manual' | 'other';
      teamsHostEmail?: string;
      manualJoinUrl?: string;
      zoomId?: string;
      password?: string;
      entries: Array<{
        sessionId: string;
        title: string;
        date: string;
        fromTime: string;
        toTime: string;
        isRepetitive?: boolean;
        repeatDates?: string[];
      }>;
    },
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/live_class/add', authToken, {
      cohort_id: cohortId,
      zoom_id: input.zoomId ?? '',
      password: input.password ?? '',
      entries: input.entries.map((e) => ({
        session_id: e.sessionId,
        title: e.title,
        date: e.date,
        fromTime: e.fromTime,
        toTime: e.toTime,
        is_repetitive: e.isRepetitive ? 1 : 0,
        repeat_dates: e.repeatDates ?? [],
      })),
      platform: input.platform,
      teams_host_email: input.teamsHostEmail,
      manual_join_url: input.manualJoinUrl,
    });
  }

  async deleteCohortLiveSession(authToken: string, sessionId: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/cohorts/delete_live_session', authToken, { id: sessionId });
  }

  async updateLiveSessionRecording(authToken: string, sessionId: string, vimeoLink: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/cohorts/update_recording', authToken, {
      session_id: sessionId,
      vimeo_link: vimeoLink,
    });
  }

  async addCohortAssignment(
    authToken: string,
    cohortId: string,
    input: {
      title: string;
      courseId?: string;
      description?: string;
      totalMarks?: string;
      dueDate: string;
      fromTime?: string;
      dueTime?: string;
      attachment?: string;
      instructions?: string;
    },
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/cohorts/add_assignment', authToken, {
      cohort_id: cohortId,
      title: input.title,
      ...(input.courseId ? { course_id: input.courseId } : {}),
      ...(input.description ? { description: input.description } : {}),
      ...(input.totalMarks ? { total_marks: input.totalMarks } : {}),
      due_date: input.dueDate,
      ...(input.fromTime ? { from_time: input.fromTime } : {}),
      ...(input.dueTime ? { due_time: input.dueTime } : {}),
      ...(input.attachment ? { attachment: input.attachment } : {}),
      ...(input.instructions ? { instructions: input.instructions } : {}),
    });
  }

  async editCohortAssignment(authToken: string, assignmentId: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/cohorts/edit_assignment', authToken, { id: assignmentId, ...input });
  }

  async loadCohortAssignmentSubmissions(authToken: string, assignmentId: string): Promise<Record<string, unknown>> {
    const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>('/admin/cohorts/assignment_submissions', authToken, {
      assignment_id: assignmentId,
    });
    return (payload.data as Record<string, unknown>) ?? {};
  }

  async gradeAssignmentSubmission(
    authToken: string,
    submissionId: string,
    marks: string,
    remarks: string,
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/cohorts/grade_submission', authToken, {
      submission_id: submissionId,
      marks,
      remarks,
    });
  }

  async deleteAssignmentSubmission(authToken: string, submissionId: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/cohorts/delete_submission_file', authToken, { id: submissionId });
  }

  // Announcements are served by the real AnnouncementService routes:
  // POST /admin/announcements (create, cohort_id in body),
  // POST /admin/announcements/:id/update and /:id/delete (id in path).
  async addCohortAnnouncement(
    authToken: string,
    cohortId: string,
    input: { title: string; content: string; description?: string },
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/announcements', authToken, {
      cohort_id: cohortId,
      title: input.title,
      content: input.content,
      ...(input.description ? { description: input.description } : {}),
    });
  }

  async editCohortAnnouncement(authToken: string, id: string, input: { title: string; content: string; description?: string }): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>(`/admin/announcements/${encodeURIComponent(id)}/update`, authToken, {
      title: input.title,
      content: input.content,
      ...(input.description ? { description: input.description } : {}),
    });
  }

  async deleteCohortAnnouncement(authToken: string, id: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>(`/admin/announcements/${encodeURIComponent(id)}/delete`, authToken, {});
  }

  // ─── Phase 1: Admin Centre Payments ───────────────────────────────────────

  async loadAdminCentrePayments(
    authToken: string,
    input: { fromDate?: string; toDate?: string; status?: string } = {},
  ): Promise<{ fundRequests: Record<string, unknown>[]; walletTransactions: Record<string, unknown>[] }> {
    const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>('/admin/centres/centre_payments', authToken, {
      ...(input.fromDate ? { from_date: input.fromDate } : {}),
      ...(input.toDate ? { to_date: input.toDate } : {}),
      ...(input.status ? { status: input.status } : {}),
    });

    const data = asRecord(payload.data) ?? {};

    return {
      fundRequests: toRecords(data.fund_requests),
      walletTransactions: toRecords(data.wallet_transactions),
    };
  }

  // ─── Phase 1: Admin Wallet Status ─────────────────────────────────────────

  async loadAdminWalletStatus(
    authToken: string,
    input: { centreId?: string; centreName?: string } = {},
  ): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/wallet/index', authToken, {
      ...(input.centreId ? { centre_id: input.centreId } : {}),
      ...(input.centreName ? { centre_name: input.centreName } : {}),
    });

    return toRecords(payload.data);
  }

  // ─── Phase 1: Notifications (admin) ───────────────────────────────────────

  async loadNotifications(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/notification/index', authToken);
    return toRecords(payload.data);
  }

  // ─── Phase 1: Banners ────────────────────────────────────────────────────

  async loadBanners(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/banners/index', authToken);
    return toRecords(payload.data);
  }

  async addBanner(
    authToken: string,
    input: { title?: string; image?: string; courseId?: string; status?: string; url?: string; isCourseBanner?: boolean },
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/banners/add', authToken, {
      title: input.title,
      image: input.image,
      course_id: input.courseId,
      status: input.status,
      url: input.url,
      is_course_banner: input.isCourseBanner ? 1 : 0,
    });
  }

  async editBanner(
    authToken: string,
    id: string,
    input: { title?: string; image?: string; courseId?: string; status?: string; url?: string; isCourseBanner?: boolean },
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/banners/edit', authToken, {
      id,
      title: input.title,
      image: input.image,
      course_id: input.courseId,
      status: input.status,
      url: input.url,
      is_course_banner: input.isCourseBanner ? 1 : 0,
    });
  }

  async deleteBanner(authToken: string, id: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/banners/delete', authToken, { id });
  }

  // ─── Phase 1: FAQ ────────────────────────────────────────────────────────

  async loadFaqs(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/faq/index', authToken);
    return toRecords(payload.data);
  }

  async addFaq(
    authToken: string,
    input: { question: string; answer?: string; status?: string },
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/faq/add', authToken, input);
  }

  async editFaq(
    authToken: string,
    id: string,
    input: { question: string; answer?: string; status?: string },
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/faq/edit', authToken, { id, ...input });
  }

  async deleteFaq(authToken: string, id: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/faq/delete', authToken, { id });
  }

  // ─── Phase 1: Contact Settings ────────────────────────────────────────────

  async loadContactSettings(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/settings/contact_settings', authToken);
    return toRecords(payload.data);
  }

  async updateContactSettings(authToken: string, contact: Record<string, string>): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/settings/contact_settings', authToken, { contact });
  }

  // ─── Phase 2: Question Bank ─────────────────────────────────────────────

  async loadQuestionBank(
    authToken: string,
    filters: { courseId?: string; subjectId?: string; lessonId?: string; qType?: number } = {},
  ): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/question_bank/index', authToken, {
      ...(filters.courseId ? { course_id: filters.courseId } : {}),
      ...(filters.subjectId ? { subject_id: filters.subjectId } : {}),
      ...(filters.lessonId ? { lesson_id: filters.lessonId } : {}),
      ...(filters.qType !== undefined ? { q_type: filters.qType } : {}),
    });
    return toRecords(payload.data);
  }

  // Naji UAT 2026-05-18 — Question Bank rebuilt to group by Subject.
  async loadQuestionBankSubjects(
    authToken: string,
    filters: { courseId?: string; subjectId?: string } = {},
  ): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/question_bank/subjects', authToken, {
      ...(filters.courseId ? { course_id: filters.courseId } : {}),
      ...(filters.subjectId ? { subject_id: filters.subjectId } : {}),
    });
    return toRecords(payload.data);
  }

  async addQuestion(authToken: string, input: AddQuestionInput): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/question_bank/add', authToken, {
      course_id: input.courseId,
      subject_id: input.subjectId,
      lesson_id: input.lessonId,
      q_type: input.qType ?? 0,
      title: input.title,
      number_of_options: input.numberOfOptions ?? 4,
      options: input.options ?? '[]',
      correct_answers: input.correctAnswers ?? '[]',
      hint: input.hint,
      solution: input.solution,
    });
  }

  async editQuestion(authToken: string, id: string, input: AddQuestionInput): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/question_bank/edit', authToken, {
      id,
      course_id: input.courseId,
      subject_id: input.subjectId,
      lesson_id: input.lessonId,
      q_type: input.qType ?? 0,
      title: input.title,
      number_of_options: input.numberOfOptions ?? 4,
      options: input.options ?? '[]',
      correct_answers: input.correctAnswers ?? '[]',
      hint: input.hint,
      solution: input.solution,
    });
  }

  async deleteQuestion(authToken: string, id: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/question_bank/delete', authToken, { id });
  }

  // Risha UAT 2026-05-25 — delete every question under a subject in one shot.
  // courseId optional; mirrors the listing's course filter when set.
  async deleteQuestionBankSubject(
    authToken: string,
    subjectId: string,
    courseId?: string,
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/question_bank/delete-by-subject', authToken, {
      subject_id: subjectId,
      ...(courseId ? { course_id: courseId } : {}),
    });
  }

  // ─── Phase 2: Exams ────────────────────────────────────────────────────

  async loadAdminExams(
    authToken: string,
    filters: { courseId?: string; subjectId?: string; batchId?: string; status?: string } = {},
  ): Promise<AdminExamListSnapshot> {
    const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>('/admin/exam/index', authToken, {
      ...(filters.courseId ? { course_id: filters.courseId } : {}),
      ...(filters.subjectId ? { subject_id: filters.subjectId } : {}),
      ...(filters.batchId ? { batch_id: filters.batchId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    });

    const data = asRecord(payload.data) ?? {};
    const summary = asRecord(data.summary) ?? {};

    return {
      exams: toRecords(data.exams),
      summary: {
        total: asNumber(summary.total),
        upcoming: asNumber(summary.upcoming),
        expired: asNumber(summary.expired),
        practice: asNumber(summary.practice),
      },
    };
  }

  // Naji 2026-05-09 — Exam Creation wizard. Step 1 saves the basic
  // fields + multi-course/offering as a Draft.
  async saveExamDraft(
    authToken: string,
    input: {
      id?: string;
      title: string;
      course_ids: string[];
      offering_ids: string[];
      from_date: string;
      to_date: string;
      from_time: string;
      to_time: string;
      duration_minutes?: number;
      description?: string;
      // Risha UAT 2026-05-27 — when true, every student attempting the
      // exam gets the questions in a random order.
      shuffle_questions?: boolean;
    },
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/exam/draft/save', authToken, input);
  }

  async getExamDraft(authToken: string, id: string): Promise<Record<string, unknown>> {
    const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>('/admin/exam/draft/get', authToken, { id });
    return payload.data ?? {};
  }

  // Naji 2026-05-09 — Student Eligibility table.
  async listStudentEligibility(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/exam/eligibility', authToken);
    return toRecords(payload.data);
  }

  // Naji 2026-05-09 — Question Bank bulk upload.
  async bulkAddQuestions(authToken: string, rows: Record<string, unknown>[]): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/question_bank/bulk-add', authToken, { rows });
  }

  // Naji 2026-05-09 — Re-Examination
  async listReExaminations(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/re_exam/index', authToken);
    return toRecords(payload.data);
  }
  async getReExaminationDetail(authToken: string, examId: string): Promise<Record<string, unknown>> {
    const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>('/admin/re_exam/detail', authToken, { exam_id: examId });
    return payload.data ?? {};
  }
  async scheduleReExamination(authToken: string, input: { exam_id: string; exam_subject_id?: number; user_id: number; new_date: string; new_start_time: string; new_end_time: string; notes?: string }): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/re_exam/schedule', authToken, input);
  }

  // Naji 2026-05-09 — Evaluation
  async listEvaluationExams(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/exam_evaluation/exams', authToken);
    return toRecords(payload.data);
  }
  async listEvaluationSubjects(authToken: string, examId: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/exam_evaluation/subjects', authToken, { exam_id: examId });
    return toRecords(payload.data);
  }
  async listEvaluationStudents(authToken: string, examId: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/exam_evaluation/students', authToken, { exam_id: examId });
    return toRecords(payload.data);
  }
  async submitDescriptiveGrade(authToken: string, input: { attempt_id: number; question_id: number; score: number; remarks?: string }): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/exam_evaluation/grade', authToken, input);
  }
  async publishExamResults(authToken: string, examId: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/exam_evaluation/publish', authToken, { exam_id: examId });
  }

  // Step 2 — scheduling.
  async getExamSchedulingSuggestions(authToken: string, examId: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/exam/draft/scheduling-suggestions', authToken, { exam_id: examId });
    return toRecords(payload.data);
  }
  async getExamSchedule(authToken: string, examId: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/exam/draft/schedule', authToken, { exam_id: examId });
    return toRecords(payload.data);
  }
  async saveExamSchedule(authToken: string, examId: string, rows: Record<string, unknown>[]): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/exam/draft/schedule/save', authToken, { exam_id: examId, rows });
  }

  // Step 3 — components.
  async getExamComponents(authToken: string, examId: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/exam/draft/components', authToken, { exam_id: examId });
    return toRecords(payload.data);
  }
  async saveExamComponents(authToken: string, examId: string, rows: Record<string, unknown>[]): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/exam/draft/components/save', authToken, { exam_id: examId, rows });
  }

  // Step 4 — question assignment (links question_bank rows -> exam_questions).
  async listExamQuestionOptions(authToken: string, examId: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/exam/draft/question-options', authToken, { exam_id: examId });
    return toRecords(payload.data);
  }
  async getExamQuestions(authToken: string, examId: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/exam/draft/questions', authToken, { exam_id: examId });
    return toRecords(payload.data);
  }
  async saveExamQuestions(authToken: string, examId: string, questions: Array<{ question_id: number; mark: number }>): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/exam/draft/questions/save', authToken, { exam_id: examId, questions });
  }

  // Step 5 — allocations.
  async getExamEligibleStudents(authToken: string, examId: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/exam/draft/eligible-students', authToken, { exam_id: examId });
    return toRecords(payload.data);
  }
  async getExamAllocations(authToken: string, examId: string): Promise<number[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/exam/draft/allocations', authToken, { exam_id: examId });
    return Array.isArray(payload.data) ? payload.data.map((v) => Number(v)).filter((n) => Number.isFinite(n)) : [];
  }
  async saveExamAllocations(authToken: string, examId: string, userIds: number[]): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/exam/draft/allocations/save', authToken, { exam_id: examId, user_ids: userIds });
  }

  // Step 5 — instructions templates + publish.
  async listExamInstructionTemplates(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/exam/instruction-templates', authToken);
    return toRecords(payload.data);
  }
  async createExamInstructionTemplate(authToken: string, input: { title: string; body: string }): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/exam/instruction-templates/add', authToken, input);
  }
  async deleteExamInstructionTemplate(authToken: string, id: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/exam/instruction-templates/delete', authToken, { id });
  }
  async publishExam(
    authToken: string,
    examId: string,
    input: { instructions?: string; notify_email?: boolean; notify_inapp?: boolean },
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/exam/draft/publish', authToken, {
      exam_id: examId,
      instructions: input.instructions ?? '',
      notify_email: input.notify_email ?? true,
      notify_inapp: input.notify_inapp ?? true,
    });
  }

  async addExam(authToken: string, input: AddExamInput): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/exam/add', authToken, {
      title: input.title,
      description: input.description,
      mark: input.mark,
      duration: input.duration,
      from_date: input.fromDate,
      to_date: input.toDate,
      from_time: input.fromTime,
      to_time: input.toTime,
      course_id: input.courseId,
      subject_id: input.subjectId,
      lesson_id: input.lessonId,
      batch_id: input.batchId,
      free: input.free ?? '0',
      publish_result: input.publishResult ?? 0,
      is_practice: input.isPractice ?? 0,
      question_ids: input.questionIds,
    });
  }

  async editExam(authToken: string, id: string, input: AddExamInput): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/exam/edit', authToken, {
      id,
      title: input.title,
      description: input.description,
      mark: input.mark,
      duration: input.duration,
      from_date: input.fromDate,
      to_date: input.toDate,
      from_time: input.fromTime,
      to_time: input.toTime,
      course_id: input.courseId,
      subject_id: input.subjectId,
      lesson_id: input.lessonId,
      batch_id: input.batchId,
      free: input.free ?? '0',
      publish_result: input.publishResult ?? 0,
      is_practice: input.isPractice ?? 0,
    });
  }

  async deleteExam(authToken: string, id: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/exam/delete', authToken, { id });
  }

  async publishExamResult(authToken: string, examId: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/exam/publish_result', authToken, { id: examId });
  }

  // ─── Phase 2: Assignments ──────────────────────────────────────────────

  async loadAdminAssignments(
    authToken: string,
    filters: { courseId?: string; cohortId?: string } = {},
  ): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/assignment/index', authToken, {
      ...(filters.courseId ? { course_id: filters.courseId } : {}),
      ...(filters.cohortId ? { cohort_id: filters.cohortId } : {}),
    });
    return toRecords(payload.data);
  }

  async addAssignment(authToken: string, input: AddAssignmentInput): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/assignment/add', authToken, {
      title: input.title,
      description: input.description,
      total_marks: input.totalMarks,
      added_date: input.addedDate,
      due_date: input.dueDate,
      from_time: input.fromTime,
      to_time: input.toTime,
      instructions: input.instructions,
      file: input.file,
      course_id: input.courseId,
      cohort_id: input.cohortId,
    });
  }

  async editAssignment(authToken: string, id: string, input: AddAssignmentInput): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/assignment/edit', authToken, {
      id,
      title: input.title,
      description: input.description,
      total_marks: input.totalMarks,
      due_date: input.dueDate,
      from_time: input.fromTime,
      to_time: input.toTime,
      instructions: input.instructions,
      file: input.file,
      course_id: input.courseId,
      cohort_id: input.cohortId,
    });
  }

  async deleteAssignment(authToken: string, id: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/assignment/delete', authToken, { id });
  }

  async loadAssignmentSubmissions(authToken: string, assignmentId: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/assignment/submissions', authToken, {
      assignment_id: assignmentId,
    });
    return toRecords(payload.data);
  }

  async evaluateSubmission(
    authToken: string,
    submissionId: string,
    marks: string,
    remarks?: string,
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/assignment/evaluate', authToken, {
      id: submissionId,
      marks,
      remarks: remarks ?? '',
    });
  }

  // Naji UAT 2026-05-22 — admin verification publishes a Pending
  // Verification submission to Result Published.
  async verifySubmission(authToken: string, submissionId: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/assignment/verify', authToken, { id: submissionId });
  }

  // ─── Phase 2: Exam Results ─────────────────────────────────────────────

  async loadAdminExamResults(
    authToken: string,
    filters: { examId?: string; courseId?: string; batchId?: string } = {},
  ): Promise<AdminExamResultSnapshot> {
    const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>('/admin/Exam_result/index', authToken, {
      ...(filters.examId ? { exam_id: filters.examId } : {}),
      ...(filters.courseId ? { course_id: filters.courseId } : {}),
      ...(filters.batchId ? { batch_id: filters.batchId } : {}),
    });

    const data = asRecord(payload.data) ?? {};

    return {
      exams: toRecords(data.exams),
      results: toRecords(data.results),
    };
  }

  // ─── Phase 2: Exam Evaluation ──────────────────────────────────────────

  async loadExamEvaluations(
    authToken: string,
    filters: { examId?: string; courseId?: string } = {},
  ): Promise<AdminExamEvaluationSnapshot> {
    const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>('/admin/Exam_evaluation/index', authToken, {
      ...(filters.examId ? { exam_id: filters.examId } : {}),
      ...(filters.courseId ? { course_id: filters.courseId } : {}),
    });

    const data = asRecord(payload.data) ?? {};

    return {
      exams: toRecords(data.exams),
      pendingEvaluations: toRecords(data.pendingEvaluations),
    };
  }

  async evaluateExamAttempt(authToken: string, attemptId: string, score: number): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/Exam_evaluation/evaluate', authToken, {
      attempt_id: attemptId,
      score,
    });
  }

  // ─── Phase 2: Re-Examination ───────────────────────────────────────────

  async loadReExams(
    authToken: string,
    filters: { courseId?: string; batchId?: string } = {},
  ): Promise<Record<string, unknown>[]> {
    // Server route was renamed from /admin/Re_exam/index → /admin/re_exam/manage_list
    // on 2026-05-30 when the API switched to case-insensitive routing (the
    // CamelCase path collided with the Naji 2026-05-09 /admin/re_exam/index
    // overview endpoint).
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/re_exam/manage_list', authToken, {
      ...(filters.courseId ? { course_id: filters.courseId } : {}),
      ...(filters.batchId ? { batch_id: filters.batchId } : {}),
    });
    return toRecords(payload.data);
  }

  async grantReExam(authToken: string, examId: string, userIds: string[]): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/re_exam/manage_grant', authToken, {
      exam_id: examId,
      user_ids: userIds,
    });
  }

  // ─── Phase 2: Entrance Exams ───────────────────────────────────────────

  async loadEntranceExams(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/entrance_exam/index', authToken);
    return toRecords(payload.data);
  }

  async addEntranceExam(authToken: string, input: AddEntranceExamInput): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/entrance_exam/add', authToken, {
      title: input.title,
      description: input.description,
      total_marks: input.totalMarks,
      duration: input.duration,
      exam_date: input.examDate,
      from_time: input.fromTime,
      to_time: input.toTime,
      course_id: input.courseId,
      status: input.status ?? 'draft',
      question_ids: input.questionIds ?? '[]',
    });
  }

  async editEntranceExam(authToken: string, id: string, input: AddEntranceExamInput): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/entrance_exam/edit', authToken, {
      id,
      title: input.title,
      description: input.description,
      total_marks: input.totalMarks,
      duration: input.duration,
      exam_date: input.examDate,
      from_time: input.fromTime,
      to_time: input.toTime,
      course_id: input.courseId,
      status: input.status ?? 'draft',
      question_ids: input.questionIds ?? '[]',
    });
  }

  async deleteEntranceExam(authToken: string, id: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/entrance_exam/delete', authToken, { id });
  }

  async loadEntranceExamRegistrations(authToken: string, examId?: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/entrance_exam/registrations', authToken, {
      ...(examId ? { exam_id: examId } : {}),
    });
    return toRecords(payload.data);
  }

  async loadEntranceExamResults(authToken: string, examId?: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/entrance_exam/results', authToken, {
      ...(examId ? { exam_id: examId } : {}),
    });
    return toRecords(payload.data);
  }

  // ─── Phase 3: Operations & People ───────────────────────────────────────

  async loadInstructors(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/instructor/index', authToken);
    return toRecords(payload.data);
  }

  async loadAdminUsers(authToken: string, roleId: number): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>(
      roleId === 1 ? '/admin/admin/index' : '/admin/sub_admin/index',
      authToken,
    );
    return toRecords(payload.data);
  }

  async addAdminCohort(authToken: string, input: AddAdminCohortInput): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/cohorts/add', authToken, {
      title: input.title,
      cohort_code: input.cohortCode,
      course_id: input.courseId,
      subject_id: input.subjectId,
      centre_id: input.centreId,
      instructor_id: input.instructorId,
      start_date: input.startDate,
      end_date: input.endDate,
      language_id: input.languageId,
      offering_ids: input.offeringIds,
    });
  }

  async editAdminCohort(authToken: string, cohortId: string, input: AddAdminCohortInput): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/cohorts/edit', authToken, {
      id: cohortId,
      title: input.title,
      cohort_code: input.cohortCode,
      course_id: input.courseId,
      subject_id: input.subjectId,
      centre_id: input.centreId,
      instructor_id: input.instructorId,
      start_date: input.startDate,
      end_date: input.endDate,
      language_id: input.languageId,
      offering_ids: input.offeringIds,
    });
  }

  async loadCourseFees(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/course_fee/index', authToken);
    return toRecords(payload.data);
  }

  async loadFeeInstallments(
    authToken: string,
    filters: { courseId?: string; status?: string; search?: string; centreId?: string; studentId?: string; paymentStatus?: string } = {},
  ): Promise<{ counts: Record<string, number>; items: Record<string, unknown>[] }> {
    const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>('/admin/fee_management/installments', authToken, {
      ...(filters.courseId ? { course_id: filters.courseId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.search ? { search: filters.search } : {}),
      ...(filters.centreId ? { centre_id: filters.centreId } : {}),
      ...(filters.studentId ? { student_id: filters.studentId } : {}),
      ...(filters.paymentStatus ? { payment_status: filters.paymentStatus } : {}),
    });
    const data = asRecord(payload.data) ?? {};
    const countsRaw = asRecord(data.counts) ?? {};
    return {
      counts: {
        fully_added: asNumber(countsRaw.fully_added),
        partially_added: asNumber(countsRaw.partially_added),
        not_added: asNumber(countsRaw.not_added),
      },
      items: toRecords(data.items),
    };
  }

  async loadPaymentStatus(
    authToken: string,
    filters: { courseId?: string; centreId?: string; search?: string; paymentStatus?: string; dueDateFrom?: string; dueDateTo?: string } = {},
  ): Promise<AdminPaymentStatusSnapshot> {
    const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>('/admin/fee_management/payment_status', authToken, {
      ...(filters.courseId ? { course_id: filters.courseId } : {}),
      ...(filters.centreId ? { centre_id: filters.centreId } : {}),
      ...(filters.search ? { search: filters.search } : {}),
      ...(filters.paymentStatus ? { payment_status: filters.paymentStatus } : {}),
      ...(filters.dueDateFrom ? { due_date_from: filters.dueDateFrom } : {}),
      ...(filters.dueDateTo ? { due_date_to: filters.dueDateTo } : {}),
    });

    const data = asRecord(payload.data) ?? {};
    const countsRaw = asRecord(data.counts) ?? {};
    const amountsRaw = asRecord(data.amounts) ?? {};

    return {
      counts: {
        overdue: asNumber(countsRaw.overdue),
        due: asNumber(countsRaw.due),
        upcoming: asNumber(countsRaw.upcoming),
        paid: asNumber(countsRaw.paid),
        overdue_amount: asNumber(amountsRaw.overdue),
        due_amount: asNumber(amountsRaw.due),
        upcoming_amount: asNumber(amountsRaw.upcoming),
        paid_amount: asNumber(amountsRaw.paid),
      },
      installments: toRecords(data.installments),
    };
  }

  async loadCohortAttendance(authToken: string, cohortId?: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/cohorts/attendance', authToken, {
      ...(cohortId ? { cohort_id: cohortId } : {}),
    });
    return toRecords(payload.data);
  }

  async loadScholarships(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/scholarships/index', authToken);
    return toRecords(payload.data);
  }

  // ─── Phase 4: CRM & Content ───────────────────────────────────────────────

  async loadCounsellors(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/counsellor/index', authToken);
    return toRecords(payload.data);
  }

  async loadCounsellorTargets(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/counsellor_target/index', authToken);
    return toRecords(payload.data);
  }

  async loadAssociates(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/associates/index', authToken);
    return toRecords(payload.data);
  }

  async loadAssociateTargets(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/associates_target/index', authToken);
    return toRecords(payload.data);
  }

  async loadDocumentRequests(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/documents/requests', authToken);
    return toRecords(payload.data);
  }

  async loadDocumentsIssued(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/documents/issued', authToken);
    return toRecords(payload.data);
  }

  async loadDocumentsDelivery(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/documents/delivery', authToken);
    return toRecords(payload.data);
  }

  async loadEvents(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/events/index', authToken);
    return toRecords(payload.data);
  }

  async addEvent(authToken: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/events/add', authToken, input);
  }

  async editEvent(authToken: string, id: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/events/edit', authToken, { id, ...input });
  }

  async deleteEvent(authToken: string, id: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/events/delete', authToken, { id });
  }

  async loadCirculars(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/circulars/index', authToken);
    return toRecords(payload.data);
  }

  async addCircular(authToken: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/circulars/add', authToken, input);
  }

  async editCircular(authToken: string, id: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/circulars/edit', authToken, { id, ...input });
  }

  async deleteCircular(authToken: string, id: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/circulars/delete', authToken, { id });
  }

  async loadMentorshipHistory(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/mentorship/history', authToken);
    return toRecords(payload.data);
  }

  async loadMentorshipAnalysis(authToken: string): Promise<Record<string, unknown>> {
    const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>('/admin/mentorship/analysis', authToken);
    return asRecord(payload.data) ?? {};
  }

  // ── Phase 5: Integrations & Polish ──────────────────────────────

  async loadChatSupport(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/chat_support', authToken);
    return toRecords(payload.data);
  }

  async loadChatConversations(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>('/admin/chat_support/conversations', authToken);
    const data = asRecord(payload.data) ?? {};
    return toRecords(data.conversations);
  }

  async loadChatMessages(authToken: string, chatId: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>('/admin/chat_support/messages', authToken, { chat_id: chatId });
    const data = asRecord(payload.data) ?? {};
    return toRecords(data.messages);
  }

  async sendChatMessage(authToken: string, chatId: string, message: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/chat_support/send', authToken, { chat_id: chatId, message });
  }

  async loadTrainingVideos(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/training_videos', authToken);
    return toRecords(payload.data);
  }

  async loadEnrollments(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/enrol/index', authToken);
    return toRecords(payload.data);
  }

  async loadFeeds(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/feed/index', authToken);
    return toRecords(payload.data);
  }

  async addFeed(authToken: string, input: { title: string; image?: string; course_id: string; instructor_id?: string; description: string }): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/feed/add', authToken, input);
  }

  async editFeed(authToken: string, id: string, input: { title: string; image?: string; course_id: string; instructor_id?: string; description: string }): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/feed/edit', authToken, { id, ...input });
  }

  async deleteFeed(authToken: string, id: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/feed/delete', authToken, { id });
  }

  async loadIntegrations(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/integration/index', authToken);
    return toRecords(payload.data);
  }

  async loadUserFeedbacks(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/review/index', authToken);
    return toRecords(payload.data);
  }

  async addReview(authToken: string, input: { course_id: string; user_id: string; rating: string; review: string }): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/review/add', authToken, input);
  }

  async editReview(authToken: string, id: string, input: { course_id: string; user_id: string; rating: string; review: string }): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/review/edit', authToken, { id, ...input });
  }

  async deleteReview(authToken: string, id: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/review/delete', authToken, { id });
  }

  async loadLanguages(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/language/index', authToken);
    return toRecords(payload.data);
  }

  async loadCountries(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/country/index', authToken);
    return toRecords(payload.data);
  }

  async addLanguage(authToken: string, title: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/language/add', authToken, { title });
  }

  async editLanguage(authToken: string, id: string, title: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/language/edit', authToken, { id, title });
  }

  async deleteLanguage(authToken: string, id: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/language/delete', authToken, { id });
  }

  // ── Phase 6: Additional pages ──────────────────────────────────

  async loadRoles(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/roles/index', authToken);
    return toRecords(payload.data);
  }

  async loadStudentPayments(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/student_payments/index', authToken);
    return toRecords(payload.data);
  }

  async loadEnquiries(authToken: string): Promise<Record<string, unknown>> {
    const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>('/admin/enquiries/index', authToken);
    return asRecord(payload.data) ?? {};
  }

  async loadBooks(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/books/index', authToken);
    return toRecords(payload.data);
  }

  async loadReferrals(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/referrals/index', authToken);
    return toRecords(payload.data);
  }

  async loadShortContent(authToken: string): Promise<Record<string, unknown>> {
    const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>('/admin/short_content/index', authToken);
    return asRecord(payload.data) ?? {};
  }

  async loadTestimonials(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/testimonials/index', authToken);
    return toRecords(payload.data);
  }

  async loadPackages(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/packages/index', authToken);
    return toRecords(payload.data);
  }

  // ─── Phase A: CRUD methods ───────────────────────────────────────────────

  async addInstructor(authToken: string, input: { name: string; email: string; phone?: string | undefined; bio?: string | undefined; status?: number | undefined }): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/instructor/add', authToken, input);
  }

  async editInstructor(authToken: string, id: string, input: { name: string; email: string; phone?: string | undefined; bio?: string | undefined; status?: number | undefined }): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/instructor/edit', authToken, { id, ...input });
  }

  async deleteInstructor(authToken: string, id: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/instructor/delete', authToken, { id });
  }

  // Resend the welcome email with a fresh temp password for any user
  // (role-agnostic). The backend regenerates the password hash so the
  // emailed credentials are usable immediately.
  async resendLoginCredentials(authToken: string, id: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/user/resend_credentials', authToken, { id });
  }

  async addUser(authToken: string, input: { name: string; email: string; phone?: string | undefined; role_id: number; image?: string | undefined }): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/user/add', authToken, input);
  }

  async editUser(
    authToken: string,
    id: string,
    input: { name: string; phone?: string | undefined; status?: number | undefined; image?: string | undefined },
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/user/edit', authToken, { id, ...input });
  }

  async deleteUserAccount(authToken: string, id: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/user/delete', authToken, { id });
  }

  /** Fetch the currently-signed-in user's display fields (name, email,
   * image, role) for the admin navbar greeting. Hits the same /auth/me
   * endpoint as the auth bootstrap but unwraps the new display fields. */
  async loadMyProfile(authToken: string): Promise<{ userId: string; roleId: number; name: string; email: string; image: string }> {
    const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>('/auth/me', authToken);
    const data = payload.data ?? {};
    return {
      userId: asString(data.user_id) || '',
      roleId: Number(data.role_id) || 0,
      name: asString(data.name) || '',
      email: asString(data.email) || '',
      image: asString(data.image) || '',
    };
  }

  // ── Admin permissions (Track 3, 2026-04-30) ──────────────────────
  // Naji 2026-05-09 — overview for the Roles & Permissions page.
  async loadRolesPermissionsOverview(authToken: string): Promise<{
    users: Array<Record<string, unknown>>;
    total_permissions: number;
  }> {
    const payload = await this.get<LegacyEnvelope<{ users?: unknown; total_permissions?: number }>>(
      '/admin/roles/permissions-overview',
      authToken,
    );
    const data = payload.data ?? {};
    const users = Array.isArray(data.users) ? data.users.filter((u): u is Record<string, unknown> => typeof u === 'object' && u !== null) : [];
    return { users, total_permissions: Number(data.total_permissions ?? 0) };
  }

  async listAdminPermissionsCatalog(authToken: string): Promise<Array<Record<string, unknown>>> {
    const payload = await this.get<LegacyEnvelope<Array<Record<string, unknown>>>>(
      '/admin/permissions/catalog',
      authToken,
    );
    return Array.isArray(payload.data) ? payload.data : [];
  }

  async listUserAdminPermissions(authToken: string, userId: string): Promise<number[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>(
      '/admin/permissions/user',
      authToken,
      { user_id: userId },
    );
    return Array.isArray(payload.data) ? payload.data.map((v) => Number(v)).filter((n) => Number.isInteger(n) && n > 0) : [];
  }

  async setUserAdminPermissions(authToken: string, userId: string, permissionIds: number[]): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/permissions/user/set', authToken, {
      user_id: userId,
      permission_ids: permissionIds,
    });
  }

  async addAssociate(authToken: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/associates/add', authToken, input);
  }

  async editAssociate(authToken: string, id: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/associates/edit', authToken, { id, ...input });
  }

  async deleteAssociate(authToken: string, id: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/associates/delete', authToken, { id });
  }

  async addCounsellor(authToken: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/counsellor/add', authToken, input);
  }

  async editCounsellor(authToken: string, id: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/counsellor/edit', authToken, { id, ...input });
  }

  async deleteCounsellor(authToken: string, id: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/counsellor/delete', authToken, { id });
  }

  async addCounsellorTarget(authToken: string, input: { user_id: string; target_type: string; target_value: number; period_from: string; period_to: string; remarks?: string | undefined }): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/counsellor_target/add', authToken, input);
  }

  async editCounsellorTarget(authToken: string, id: string, input: { user_id: string; target_type: string; target_value: number; period_from: string; period_to: string; remarks?: string | undefined }): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/counsellor_target/edit', authToken, { id, ...input });
  }

  async deleteCounsellorTarget(authToken: string, id: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/counsellor_target/delete', authToken, { id });
  }

  async addAssociateTarget(authToken: string, id: string, input: { user_id: string; target_type: string; target_value: number; period_from: string; period_to: string; remarks?: string | undefined }): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/associates_target/add', authToken, input);
  }

  async editAssociateTarget(authToken: string, id: string, input: { user_id: string; target_type: string; target_value: number; period_from: string; period_to: string; remarks?: string | undefined }): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/associates_target/edit', authToken, { id, ...input });
  }

  async deleteAssociateTarget(authToken: string, id: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/associates_target/delete', authToken, { id });
  }

  // ── Email verification (MX + disposable check, no OTP) ────────────────────

  async verifyEmail(
    authToken: string,
    email: string,
  ): Promise<{ valid: boolean; message: string; reason?: string; suggestion?: string }> {
    const payload = await this.get<{
      status?: number | string;
      message?: string;
      data?: { valid?: boolean; reason?: string; message?: string; suggestion?: string };
    }>(
      '/admin/email/verify',
      authToken,
      { email },
    );
    const valid = payload.status === 1 || payload.status === '1';
    return {
      valid,
      message: payload.data?.message ?? payload.message ?? '',
      ...(payload.data?.reason ? { reason: payload.data.reason } : {}),
      ...(payload.data?.suggestion ? { suggestion: payload.data.suggestion } : {}),
    };
  }

  // ── Quiz questions for lesson_files (lesson-builder dialog) ────────────────

  async listLessonQuizQuestions(authToken: string, lessonFileId: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>(
      '/admin/course/lesson_files/quiz_questions',
      authToken,
      { id: lessonFileId },
    );
    return toRecords(payload.data);
  }

  async replaceLessonQuizQuestions(
    authToken: string,
    lessonFileId: string,
    questions: Array<{
      question: string;
      option_a?: string;
      option_b?: string;
      option_c?: string;
      option_d?: string;
      correct_answer: string;
    }>,
  ): Promise<{ count: number }> {
    const payload = await this.post<LegacyEnvelope<{ count: number }>>(
      '/admin/course/lesson_files/quiz_questions/replace',
      authToken,
      { id: lessonFileId, questions },
    );
    return payload.data ?? { count: 0 };
  }

  // ── Applications Phase B ────────────────────────────────────────────────────

  async getApplication(authToken: string, id: string): Promise<Record<string, unknown>> {
    const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>('/admin/applications/get', authToken, { id });
    return asRecord(payload.data) ?? {};
  }

  async createApplication(authToken: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/applications/add', authToken, input);
  }

  async editApplication(authToken: string, id: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/applications/edit', authToken, { id, ...input });
  }

  async deleteApplication(authToken: string, id: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/applications/delete', authToken, { id });
  }

  async updateApplicationStatus(authToken: string, id: string, status: string, rejectReason?: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/applications/update_status', authToken, { id, status, reject_reason: rejectReason || '' });
  }

  // ─── Phase C: Student Detail & Actions ────────────────────────────────────

  async getStudentDetail(authToken: string, studentId: string): Promise<Record<string, unknown>> {
    const payload = await this.get<Record<string, unknown>>('/admin/students/view', authToken, { id: studentId });
    return payload;
  }

  async getStudentAnalytics(authToken: string, studentId: string): Promise<Record<string, unknown>> {
    const payload = await this.get<Record<string, unknown>>('/admin/students/analytics', authToken, { id: studentId });
    return payload;
  }

  async changeStudentUsername(authToken: string, studentId: string, username: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/students/change_username', authToken, { id: studentId, username });
  }

  async changeStudentPassword(authToken: string, studentId: string, password: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/students/change_password', authToken, { id: studentId, password });
  }

  async editStudentEnrollmentId(authToken: string, studentId: string, enrollmentId: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/students/edit_enrollment_id', authToken, { id: studentId, enrollment_id: enrollmentId });
  }

  // Naji UAT 2026-05-12 — full Edit Enrolment from the Enrollments tab on
  // the Student View page. Backend updates enrol fields directly and
  // pushes offering/combination onto the linked applications row.
  async updateEnrolment(
    authToken: string,
    enrolId: string,
    fields: Partial<{
      enrollment_id: string;
      enrollment_status: string;
      mode_of_study: string;
      preferred_language: string;
      offering_id: string;
      combination_id: string;
      pipeline: string;
      pipeline_user: string;
      lead_source: string;
    }>,
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/enrol/update', authToken, { enrol_id: enrolId, ...fields });
  }

  async loadCertificateCombinations(authToken: string, filters?: Record<string, string>): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/certificate_combinations', authToken, filters);
    return toRecords(payload.data);
  }

  // Naji UAT 2026-05-14 — Add another enrolment for an existing student.
  async addAdditionalEnrolment(
    authToken: string,
    studentId: string,
    fields: {
      course_id: string;
      offering_id?: string;
      combination_id?: string;
      mode_of_study?: string;
      preferred_language?: string;
      pipeline?: string;
      pipeline_user?: string;
      lead_source?: string;
      reference_student_id?: string;
      registration_fee?: string;
      discount?: string;
      discount_type?: string;
      gst_percent?: string;
      final_course_fee?: string;
      payment_mode?: 'link' | 'manual' | 'draft';
      manual_payment_mode?: string;
      manual_reference?: string;
    },
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>(`/admin/students/${encodeURIComponent(studentId)}/add-enrolment`, authToken, fields);
  }

  // Naji UAT 2026-05-14 — duplicate-check used by the Add Lead form's
  // email/phone onBlur to surface a red banner before the admin keeps typing.
  async checkLeadDuplicate(authToken: string, params: { email?: string; phone?: string }): Promise<{
    matches: Array<{ id: number; name: string | null; student_id: string | null; user_email: string | null; phone: string | null; match_via: 'email' | 'phone' | 'both' }>;
  }> {
    const payload = await this.get<LegacyEnvelope<{ matches?: unknown[] }>>('/admin/leads/duplicate-check', authToken, params as Record<string, string>);
    const data = (payload.data ?? {}) as { matches?: unknown[] };
    const matches = Array.isArray(data.matches) ? data.matches : [];
    return { matches: matches as { id: number; name: string | null; student_id: string | null; user_email: string | null; phone: string | null; match_via: 'email' | 'phone' | 'both' }[] };
  }

  // Naji UAT 2026-05-13 — admin edit on a payment-schedule row.
  async updateInstallment(
    authToken: string,
    installmentId: string,
    fields: Partial<{
      installment_details: string;
      amount: string;
      payment_mode: string;
      status: string;
      due_date: string;
      paid_date: string;
    }>,
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/student-payments/update', authToken, { installment_id: installmentId, ...fields });
  }

  async loadAssignmentEvaluations(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/assignment/evaluations', authToken);
    return toRecords(payload.data);
  }

  // Naji UAT 2026-05-13 — universal enable/disable toggle for any user.
  async toggleUserStatus(authToken: string, userId: string, enabled: boolean): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/users/toggle-status', authToken, {
      user_id: userId,
      enabled: enabled ? '1' : '0',
    });
  }

  async editStudentInfo(authToken: string, studentId: string, name: string, phone: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/students/edit', authToken, { id: studentId, name, phone });
  }

  // Full edit (used by ViewStudentPage). Backend accepts each field
  // optionally and only updates the keys that are present.
  async updateStudentFull(
    authToken: string,
    studentId: string,
    fields: Partial<{
      name: string;
      phone: string;
      user_email: string;
      date_of_birth: string;
      gender: string;
      nationality: string;
      marital_status: string;
      father_name: string;
      mother_name: string;
      guardian_name: string;
      aadhar_no: string;
      passport_no: string;
      whatsapp_no: string;
      country: string;
      state: string;
      city: string;
      address: string;
      native_address: string;
      profile_picture: string;
      country_code: string;
      alternate_phone: string;
      status: string;
      highest_qualification: string;
      specialization: string;
      institution_name: string;
      year_of_passing: string;
      percentage_or_grade: string;
      employment_status: string;
      current_occupation: string;
      experience_years: string;
      // Naji 2026-05-05 — application-captured fields the Edit form
      // now exposes so they round-trip back to the applications row.
      age: string;
      emergency_name: string;
      emergency_relation: string;
      emergency_phone: string;
      biography: string;
      learning_disabilities: string;
      accessibility_needs: string;
      // Naji 2026-05-11 — enrolment / pipeline / fee fields the Edit form
      // also exposes. Listing them explicitly so the contract matches the
      // route handler's destructured payload and TS doesn't quietly drop
      // any of them via excess-property checks.
      course_id: string;
      offering_id: string;
      certificate_combination_id: string;
      mode_of_study: string;
      preferred_language: string;
      pipeline: string;
      pipeline_user: string;
      lead_source: string;
      reference_student_id: string;
      registration_fee: string;
      gst_percent: string;
      gst_applicability: string;
      final_course_fee: string;
      discount: string;
      discount_type: string;
      installment_plan: string;
      documents: string;
    }>,
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/students/edit', authToken, { id: studentId, ...fields });
  }

  async deleteStudent(authToken: string, id: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/students/delete', authToken, { id });
  }

  async loadBatchStudents(authToken: string, batchId: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/batch/students', authToken, { batch_id: batchId });
    return toRecords(payload.data);
  }

  // ─── Phase D: Centres Feature ─────────────────────────────────────────────

  async getCentre(authToken: string, id: string): Promise<Record<string, unknown>> {
    const payload = await this.get<Record<string, unknown>>('/admin/centres/get', authToken, { id });
    return payload;
  }

  async editCentre(authToken: string, id: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/centres/edit', authToken, { id, ...input });
  }

  async deleteCentre(authToken: string, id: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/centres/delete', authToken, { id });
  }

  async approveFundRequest(authToken: string, id: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/centres/fund_request/approve', authToken, { id });
  }

  async rejectFundRequest(authToken: string, id: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/centres/fund_request/reject', authToken, { id });
  }

  async getCohortDetail(authToken: string, id: string): Promise<Record<string, unknown>> {
    const payload = await this.get<Record<string, unknown>>('/admin/cohorts/view', authToken, { id });
    return payload;
  }

  async loadLiveSessionAttendance(authToken: string, liveClassId: string): Promise<Record<string, unknown>> {
    const payload = await this.get<Record<string, unknown>>('/admin/live_classes/attendance', authToken, { id: liveClassId });
    return payload;
  }

  /**
   * Mints a short-lived (1 hr) signed URL for a live session's recording
   * stored in our private Spaces bucket. Throws if no recording has been
   * synced yet or if the session doesn't exist.
   */
  async getLiveSessionRecordingSignedUrl(authToken: string, liveClassId: string): Promise<string> {
    const response = await this.get<Record<string, unknown>>(
      '/admin/live_classes/recording-signed-url',
      authToken,
      { id: liveClassId },
    );
    const data = response.data as { url?: string } | undefined;
    if (!data?.url) {
      const message = typeof response.message === 'string' && response.message.trim() !== ''
        ? response.message
        : 'Recording not available';
      throw new Error(message);
    }
    return data.url;
  }

  // ── Ainvox browser dialer (talk in the dashboard, no login) ───────
  // Returns a pre-authenticated iframe URL so the widget opens already
  // logged in (server mints short-lived tokens from the account creds).
  async getDialerIframeUrl(authToken: string): Promise<string> {
    const payload = await this.post<LegacyEnvelope<{ iframeUrl: string }>>('/admin/calls/dialer-token', authToken, {});
    const url = payload.data?.iframeUrl;
    if (!url) {
      throw new Error(typeof payload.message === 'string' && payload.message ? payload.message : 'Could not open the dialer.');
    }
    return url;
  }

  // ── Ainvox click-to-call (server-side phone fallback) ─────────────
  // Rings the admin's callback phone, then connects + records the student.
  async startServerCall(authToken: string, studentPhone: string, agentPhone?: string): Promise<{ uuid: string | null }> {
    const payload = await this.post<LegacyEnvelope<{ uuid: string | null }>>(
      '/admin/calls/create',
      authToken,
      { studentPhone, ...(agentPhone ? { agentPhone } : {}) },
    );
    if (!payload.data) {
      throw new Error(typeof payload.message === 'string' && payload.message ? payload.message : 'Could not start the call.');
    }
    return payload.data;
  }

  // ── Ainvox call history ───────────────────────────────────────────
  // Pull a student's call log (filtered by their phone, +E.164) from Ainvox
  // via our server-side proxy. Empty/inert until AINVOX_PROVIDER=ainvox.
  async getStudentCallLogs(authToken: string, phone: string): Promise<AdminCallLogPage> {
    // Cache-bust: a recording finalises a short time after the call ends, so a
    // browser-cached call-log response can miss a recording that now exists.
    // A unique param forces a fresh fetch each time (the server ignores it).
    const payload = await this.get<LegacyEnvelope<AdminCallLogPage>>('/admin/calls/log', authToken, {
      phone,
      _t: String(Date.now()),
    });
    return payload.data ?? { pageNumber: 1, perPage: 20, totalRows: null, data: [] };
  }

  // Direct URL for an <audio> element. The auth token rides in the query so
  // the browser can stream it; the server proxies the file from Ainvox with
  // Basic Auth (the Ainvox secret never reaches the browser).
  getCallRecordingUrl(authToken: string, recordingPath: string): string {
    const base = this.apiClient.getBaseUrl();
    return `${base}admin/calls/recording?path=${encodeURIComponent(recordingPath)}&auth_token=${encodeURIComponent(authToken)}`;
  }

  async deleteResource(authToken: string, id: string, type: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/resources/delete', authToken, { id, type });
  }

  async renameResource(authToken: string, id: string, type: string, name: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/resources/rename', authToken, { id, type, name });
  }

  async addTrainingVideo(authToken: string, input: { title: string; category?: string | undefined; video_type?: string | undefined; video_url?: string | undefined; thumbnail?: string | undefined; description?: string | undefined }): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/training_videos/add', authToken, input);
  }

  async editTrainingVideo(authToken: string, id: string, input: { title: string; category?: string | undefined; video_type?: string | undefined; video_url?: string | undefined; thumbnail?: string | undefined; description?: string | undefined }): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/training_videos/edit', authToken, { id, ...input });
  }

  async deleteTrainingVideo(authToken: string, id: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/training_videos/delete', authToken, { id });
  }

  // ── Course Admin CRUD ─────────────────────────────────────────────

  async listCoursesAdmin(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/course/index', authToken);
    return toRecords(payload.data);
  }

  async getCourse(authToken: string, id: string): Promise<Record<string, unknown> | null> {
    const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>('/admin/course/get', authToken, { id });
    return asRecord(payload.data);
  }

  async createCourse(authToken: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/course/add', authToken, input);
  }

  async updateCourse(authToken: string, id: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/course/edit', authToken, { id, ...input });
  }

  async archiveCourse(authToken: string, id: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/course/archive', authToken, { id });
  }

  async loadCategories(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/category/index', authToken);
    return toRecords(payload.data);
  }

  // ── Subject Admin CRUD ────────────────────────────────────────────

  async listCourseSubjects(authToken: string, courseId: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/course/subjects', authToken, { course_id: courseId });
    return toRecords(payload.data);
  }

  async listAllSubjects(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/course/subjects/all', authToken);
    return toRecords(payload.data);
  }

  async addSubject(authToken: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/course/subjects/add', authToken, input);
  }

  async editSubject(authToken: string, id: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/course/subjects/edit', authToken, { id, ...input });
  }

  async deleteSubject(authToken: string, id: string, courseId?: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/course/subjects/delete', authToken, { id, course_id: courseId });
  }

  async linkSubjectToCourse(authToken: string, courseId: string, subjectId: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/course/subjects/link', authToken, { course_id: courseId, subject_id: subjectId });
  }

  async unlinkSubjectFromCourse(authToken: string, courseId: string, subjectId: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/course/subjects/unlink', authToken, { course_id: courseId, subject_id: subjectId });
  }

  // ── Program Admin CRUD ───────────────────────────────────────────

  async listPrograms(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/programs', authToken);
    return toRecords(payload.data);
  }

  async getProgram(authToken: string, id: string): Promise<Record<string, unknown> | null> {
    const payload = await this.get<LegacyEnvelope<unknown>>('/admin/programs/get', authToken, { id });
    return payload.data as Record<string, unknown> | null;
  }

  async createProgram(authToken: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/programs/add', authToken, input);
  }

  async updateProgram(authToken: string, id: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/programs/edit', authToken, { id, ...input });
  }

  async deleteProgram(authToken: string, id: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/programs/delete', authToken, { id });
  }

  async listProgramCourses(authToken: string, programId: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/programs/courses', authToken, { program_id: programId });
    return toRecords(payload.data);
  }

  async addCourseToProgram(authToken: string, programId: string, courseId: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/programs/courses/add', authToken, { program_id: programId, course_id: courseId });
  }

  async removeCourseFromProgram(authToken: string, programId: string, courseId: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/programs/courses/remove', authToken, { program_id: programId, course_id: courseId });
  }

  // ── Offering Admin CRUD ──────────────────────────────────────────

  async listOfferings(authToken: string, filters?: Record<string, string>): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/offerings', authToken, filters);
    return toRecords(payload.data);
  }

  async getOffering(authToken: string, id: string): Promise<Record<string, unknown> | null> {
    const payload = await this.get<LegacyEnvelope<unknown>>('/admin/offerings/get', authToken, { id });
    return payload.data as Record<string, unknown> | null;
  }

  async createOffering(authToken: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/offerings/add', authToken, input);
  }

  async updateOffering(authToken: string, id: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/offerings/edit', authToken, { id, ...input });
  }

  async deleteOffering(authToken: string, id: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/offerings/delete', authToken, { id });
  }

  // ── Lead → Enrolment workflow (Naji 2026-05-05) ────────────────
  async addLead(
    authToken: string,
    input: {
      name: string;
      email: string;
      phone: string;
      country_code?: string | undefined;
      course_id: string;
      offering_id?: string | undefined;
      combination_id?: string | undefined;
      source?: string | undefined;
    },
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/leads/add', authToken, input);
  }

  async editLead(
    authToken: string,
    id: string,
    input: {
      name: string;
      email: string;
      phone: string;
      country_code?: string | undefined;
      course_id: string;
      offering_id?: string | undefined;
      combination_id?: string | undefined;
      source?: string | undefined;
    },
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/leads/edit', authToken, { id, ...input });
  }

  async listLeads(
    authToken: string,
    filters?: { stage?: string; course_id?: string; search?: string },
  ): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/leads/list', authToken, filters);
    return toRecords(payload.data);
  }

  // Naji 2026-05-09 — Lead History tab.
  async listApplicationEvents(authToken: string, applicationId: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>(
      `/admin/applications/${applicationId}/events`,
      authToken,
    );
    return toRecords(payload.data);
  }

  async counsellorApproveApplication(authToken: string, id: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/applications/counsellor-approve', authToken, { id });
  }

  async adminApproveApplication(authToken: string, id: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/applications/admin-approve', authToken, { id });
  }

  // Naji UAT 2026-05-31 — toggle an application verification key
  // ("basic" / "qualification" / "documents" / "doc:<index>").
  async setApplicationVerification(
    authToken: string,
    id: string,
    key: string,
    verified: boolean,
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/applications/verify', authToken, { id, key, verified });
  }

  async rejectApplication(authToken: string, id: string, reason: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/applications/reject', authToken, { id, reason });
  }

  async generatePaymentLink(
    authToken: string,
    input: {
      id: string;
      mode: 'full' | 'installment';
      total_amount_minor: number;
      registration_fee_minor?: number;
      installments?: Array<{ label: string; amount_minor: number; due_date: string }>;
      // Ad-hoc discount lines entered in the dialog, persisted into the
      // payment_plan JSON for the audit trail. Amounts are NOT re-applied by
      // the backend — the request amounts are already net of these discounts.
      additional_discounts?: Array<{ description: string; amount: number }>;
      expires_in_days?: number;
    },
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/applications/payment-link/generate', authToken, input);
  }

  async savePaymentPlan(
    authToken: string,
    input: {
      id: string;
      mode: 'full' | 'installment';
      total_amount_minor: number;
      registration_fee_minor?: number;
      installments?: Array<{ label: string; amount_minor: number; due_date: string }>;
      // See generatePaymentLink — same audit-trail discount lines.
      additional_discounts?: Array<{ description: string; amount: number }>;
    },
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/applications/payment-plan/save', authToken, input);
  }

  async markApplicationPaid(
    authToken: string,
    id: string,
    input?: { mode?: string; reference?: string; receipt_url?: string; note?: string; amount?: number },
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/applications/mark-paid', authToken, {
      id,
      mode: input?.mode ?? '',
      reference: input?.reference ?? '',
      receipt_url: input?.receipt_url ?? '',
      note: input?.note ?? '',
      // Actual amount received (rupees). Omitted when not supplied so the
      // server keeps its total fallback for older flows.
      ...(input?.amount != null && input.amount > 0 ? { amount: input.amount } : {}),
    });
  }

  async generateApplicationFormLink(authToken: string, id: string, expiresInDays?: number): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/applications/form-link/generate', authToken, {
      id,
      expires_in_days: expiresInDays ?? 7,
    });
  }

  // ── File Upload ────────────────────────────────────────────────

  async uploadFile(authToken: string, file: File): Promise<{ key: string; url: string }> {
    // The token has to ride in the URL query (not the multipart body): the
    // server's auth middleware can't see body fields on multipart requests
    // because @fastify/multipart isn't configured with attachFieldsToBody.
    const formData = new FormData();
    formData.append('file', file);
    const url = `${this.apiClient.getBaseUrl()}admin/upload?auth_token=${encodeURIComponent(authToken)}`;
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });
    // A too-large upload is rejected by nginx (413) with an HTML body, so a blind
    // response.json() throws the cryptic "Unexpected token '<'". Detect non-JSON
    // / error responses and surface a clear, actionable message instead.
    const contentType = response.headers.get('content-type') ?? '';
    if (!response.ok || !contentType.includes('application/json')) {
      if (response.status === 413) {
        throw new Error('File is too large to upload (max 200 MB). Please compress it or split it into smaller files.');
      }
      throw new Error(`Upload failed (${response.status}). The file may be too large or the server rejected it.`);
    }
    const payload = (await response.json()) as Record<string, unknown>;
    if (!payload || payload.status !== 1) {
      throw new Error((payload?.message as string) || 'Upload failed');
    }
    return payload.data as { key: string; url: string };
  }

  // ── Completion Policies & Certificates ──────────────────────────

  async listCompletionPolicies(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/completion-policies', authToken);
    return toRecords(payload.data);
  }

  async createCompletionPolicy(authToken: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/completion-policies/add', authToken, input);
  }

  async updateCompletionPolicy(authToken: string, id: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/completion-policies/edit', authToken, { id, ...input });
  }

  async deleteCompletionPolicy(authToken: string, id: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/completion-policies/delete', authToken, { id });
  }

  async listCertificateTemplates(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/certificate-templates', authToken);
    return toRecords(payload.data);
  }

  async createCertificateTemplate(authToken: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/certificate-templates/add', authToken, input);
  }

  async updateCertificateTemplate(authToken: string, id: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/certificate-templates/edit', authToken, { id, ...input });
  }

  async deleteCertificateTemplate(authToken: string, id: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/certificate-templates/delete', authToken, { id });
  }

  async listCertificates(authToken: string, filters?: Record<string, string>): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/certificates', authToken, filters);
    return toRecords(payload.data);
  }

  async issueCertificate(authToken: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/certificates/issue', authToken, input);
  }

  async revokeCertificate(authToken: string, id: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/certificates/revoke', authToken, { id });
  }

  // ── Fee Management ───────────────────────────────────────────────

  async listCourseFeeStructure(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/fee_management/course_fee_structure', authToken);
    return toRecords(payload.data);
  }

  async listFeeSummary(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/fee_management/fee_summary', authToken);
    return toRecords(payload.data);
  }

  // ── Cohort Announcements ─────────────────────────────────────────

  async listAnnouncements(authToken: string, filters?: Record<string, string>): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/announcements', authToken, filters);
    return toRecords(payload.data);
  }

  async getAnnouncement(authToken: string, id: string): Promise<Record<string, unknown> | null> {
    const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>(`/admin/announcements/${id}`, authToken);
    return payload.data ?? null;
  }

  async createAnnouncement(authToken: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/announcements', authToken, input);
  }

  async updateAnnouncement(authToken: string, id: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>(`/admin/announcements/${id}/update`, authToken, input);
  }

  async deleteAnnouncement(authToken: string, id: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>(`/admin/announcements/${id}/delete`, authToken, {});
  }

  // ── Offering Certificate Packages ────────────────────────────────

  async listOfferingPackages(authToken: string, offeringId: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>(`/admin/offerings/${offeringId}/packages`, authToken);
    return toRecords(payload.data);
  }

  async addOfferingPackage(authToken: string, offeringId: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>(`/admin/offerings/${offeringId}/packages/add`, authToken, input);
  }

  async updateOfferingPackage(authToken: string, packageId: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>(`/admin/offering_packages/${packageId}/update`, authToken, input);
  }

  async deleteOfferingPackage(authToken: string, packageId: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>(`/admin/offering_packages/${packageId}/delete`, authToken, {});
  }

  // ── Certification Partners ───────────────────────────────────────

  async listCertificationPartners(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/certification_partners', authToken);
    return toRecords(payload.data);
  }

  // Naji UAT 2026-05-22 — Partner View detail page (header + courses + students + liability).
  async getCertificationPartnerDetail(authToken: string, id: string): Promise<Record<string, unknown>> {
    const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>(`/admin/certification_partners/${id}/detail`, authToken);
    return payload.data ?? {};
  }

  async createCertificationPartner(authToken: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/certification_partners', authToken, input);
  }

  async updateCertificationPartner(authToken: string, id: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>(`/admin/certification_partners/${id}/update`, authToken, input);
  }

  async deleteCertificationPartner(authToken: string, id: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>(`/admin/certification_partners/${id}/delete`, authToken, {});
  }

  // ── Document Types (settings) + per-course required docs ────────

  async listDocumentTypes(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/settings/document-types', authToken);
    return toRecords(payload.data);
  }

  async createDocumentType(authToken: string, label: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/settings/document-types', authToken, { label });
  }

  async updateDocumentType(authToken: string, id: string, label: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>(`/admin/settings/document-types/${id}/update`, authToken, { label });
  }

  async deleteDocumentType(authToken: string, id: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>(`/admin/settings/document-types/${id}/delete`, authToken, {});
  }

  async listCourseRequiredDocuments(authToken: string, courseId: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>(`/admin/courses/${courseId}/required-documents`, authToken);
    return toRecords(payload.data);
  }

  async setCourseRequiredDocuments(authToken: string, courseId: string, documentTypeIds: string[]): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>(`/admin/courses/${courseId}/required-documents`, authToken, {
      document_type_ids: documentTypeIds,
    });
  }

  // ── Certificate Combinations ─────────────────────────────────────

  async listCertificateCombinations(
    authToken: string,
    filters?: { course_id?: string; status?: string },
  ): Promise<Record<string, unknown>[]> {
    const query: Record<string, string> = {};
    if (filters?.course_id) query.course_id = filters.course_id;
    if (filters?.status) query.status = filters.status;
    const payload = await this.get<LegacyEnvelope<unknown[]>>(
      '/admin/certificate_combinations',
      authToken,
      Object.keys(query).length ? query : undefined,
    );
    return toRecords(payload.data);
  }

  async getCertificateCombination(authToken: string, id: string): Promise<Record<string, unknown> | null> {
    const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>(
      `/admin/certificate_combinations/${id}`,
      authToken,
    );
    return payload.data ?? null;
  }

  async createCertificateCombination(authToken: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/certificate_combinations', authToken, input);
  }

  async updateCertificateCombination(authToken: string, id: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>(`/admin/certificate_combinations/${id}/update`, authToken, input);
  }

  async deleteCertificateCombination(authToken: string, id: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>(`/admin/certificate_combinations/${id}/delete`, authToken, {});
  }

  // ── Content Asset Library ────────────────────────────────────────

  async listContentAssets(authToken: string, filters?: Record<string, string>): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/content-assets', authToken, filters);
    return toRecords(payload.data);
  }

  async getContentAsset(authToken: string, id: string): Promise<Record<string, unknown> | null> {
    const payload = await this.get<LegacyEnvelope<unknown>>('/admin/content-assets/get', authToken, { id });
    return payload.data as Record<string, unknown> | null;
  }

  async createContentAsset(authToken: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/content-assets/add', authToken, input);
  }

  async updateContentAsset(authToken: string, id: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/content-assets/edit', authToken, { id, ...input });
  }

  async deleteContentAsset(authToken: string, id: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/content-assets/delete', authToken, { id });
  }

  async listLessonAssets(authToken: string, lessonId: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/content-assets/lesson', authToken, { lesson_id: lessonId });
    return toRecords(payload.data);
  }

  async linkAssetToLesson(authToken: string, lessonId: string, assetId: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/content-assets/lesson/link', authToken, { lesson_id: lessonId, asset_id: assetId });
  }

  async unlinkAssetFromLesson(authToken: string, lessonId: string, assetId: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/content-assets/lesson/unlink', authToken, { lesson_id: lessonId, asset_id: assetId });
  }

  // ── Lesson Admin CRUD ─────────────────────────────────────────────

  async listLessonsAdmin(authToken: string, subjectId: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/course/lessons', authToken, { subject_id: subjectId });
    return toRecords(payload.data);
  }

  async listAllLessonsAdmin(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/course/lessons/all', authToken);
    return toRecords(payload.data);
  }

  // Lesson-wise courses: lessons attached directly to the course (no subject).
  async listLessonsByCourse(authToken: string, courseId: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/course/lessons_by_course', authToken, { course_id: courseId });
    return toRecords(payload.data);
  }

  async addLesson(authToken: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/course/lessons/add', authToken, input);
  }

  async editLesson(authToken: string, id: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/course/lessons/edit', authToken, { id, ...input });
  }

  async deleteLesson(authToken: string, id: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/course/lessons/delete', authToken, { id });
  }

  async reorderLessons(authToken: string, lessonIds: string[]): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/course/lessons/reorder', authToken, { lesson_ids: lessonIds });
  }

  // Attach / clone existing lessons + copy existing files (Ishfaq 2026-06-24).
  async listAttachableLessons(authToken: string, excludeCourseId?: string): Promise<Record<string, unknown>[]> {
    const params = excludeCourseId ? { exclude_course_id: excludeCourseId } : undefined;
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/course/lessons/attachable', authToken, params);
    return toRecords(payload.data);
  }

  async cloneLessonInto(authToken: string, sourceLessonId: string, targetCourseId: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/course/lessons/clone-into', authToken, {
      source_lesson_id: sourceLessonId,
      target_course_id: targetCourseId,
    });
  }

  async listAttachableFiles(authToken: string, excludeLessonId?: string): Promise<Record<string, unknown>[]> {
    const params = excludeLessonId ? { exclude_lesson_id: excludeLessonId } : undefined;
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/course/lesson_files/attachable', authToken, params);
    return toRecords(payload.data);
  }

  async copyLessonFileInto(authToken: string, sourceFileId: string, targetLessonId: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/course/lesson_files/copy-into', authToken, {
      source_file_id: sourceFileId,
      target_lesson_id: targetLessonId,
    });
  }

  // ── Subject Detail (manage lessons + their content in one place) ──────

  async loadSubjectContentTree(authToken: string, subjectId: string): Promise<Record<string, unknown>> {
    const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>(
      '/admin/subjects/content-tree',
      authToken,
      { subject_id: subjectId },
    );
    return payload.data ?? {};
  }

  async reorderLessonContent(authToken: string, lessonId: string, assetIds: string[]): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/content-assets/lesson/reorder', authToken, {
      lesson_id: lessonId,
      asset_ids: assetIds,
    });
  }

  async reorderCourseSubjects(authToken: string, courseId: string, subjectIds: string[]): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/course/subjects/reorder', authToken, {
      course_id: courseId,
      subject_ids: subjectIds,
    });
  }

  async reorderLessonFiles(authToken: string, lessonId: string, fileIds: string[]): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/course/lesson_files/reorder', authToken, {
      lesson_id: lessonId,
      file_ids: fileIds,
    });
  }

  // ── Lesson File Admin CRUD ────────────────────────────────────────

  async listLessonFiles(authToken: string, lessonId: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/course/lesson_files', authToken, { lesson_id: lessonId });
    return toRecords(payload.data);
  }

  async addLessonFile(authToken: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/course/lesson_files/add', authToken, input);
  }

  async editLessonFile(authToken: string, id: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/course/lesson_files/edit', authToken, { id, ...input });
  }

  async deleteLessonFile(authToken: string, id: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/course/lesson_files/delete', authToken, { id });
  }

  // ── Phase F: Payment Actions ──────────────────────────────────

  async upsertStudentDocument(
    authToken: string,
    input: { studentId: string; label: string; file: string },
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/student-documents/upsert', authToken, {
      student_id: input.studentId,
      label: input.label,
      file: input.file,
    });
  }

  async markInstallmentPaid(
    authToken: string,
    installmentId: string,
    extras?: {
      paidDate?: string;
      paymentMode?: string;
      referenceNumber?: string;
      receiptUrl?: string;
    },
  ): Promise<Record<string, unknown>> {
    const payload: Record<string, unknown> = { installment_id: installmentId };
    if (extras?.paidDate) payload.paid_date = extras.paidDate;
    if (extras?.paymentMode) payload.payment_mode = extras.paymentMode;
    if (extras?.referenceNumber) payload.reference_number = extras.referenceNumber;
    if (extras?.receiptUrl) payload.receipt_url = extras.receiptUrl;
    return this.post<Record<string, unknown>>('/admin/fee_management/mark_paid', authToken, payload);
  }

  async sendPaymentReminder(authToken: string, installmentId: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/fee_management/send_reminder', authToken, { installment_id: installmentId });
  }

  // ── Payment Approval (Finance) ────────────────────────────────────────

  async listPaymentApprovals(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/fee_management/payment_approvals', authToken);
    return toRecords(payload.data);
  }

  async approvePayment(authToken: string, id: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/fee_management/payment_approvals/approve', authToken, { id });
  }

  async rejectPayment(authToken: string, id: string, reason: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/fee_management/payment_approvals/reject', authToken, { id, reason });
  }
}
