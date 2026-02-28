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
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
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
  password: string;
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
}

export interface AdminPaymentStatusSnapshot {
  summary: Record<string, unknown>;
  payments: Record<string, unknown>[];
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
    } = {},
  ): Promise<AdminApplicationsSnapshot> {
    const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>('/admin/applications/index', authToken, {
      ...(input.fromDate ? { from_date: input.fromDate } : {}),
      ...(input.toDate ? { to_date: input.toDate } : {}),
      ...(input.listBy ? { list_by: input.listBy } : {}),
      ...(input.courseId ? { course: input.courseId } : {}),
      ...(input.pipelineRoleId ? { filter_pipeline: input.pipelineRoleId } : {}),
    });

    const data = asRecord(payload.data) ?? {};

    return {
      items: toRecords(data.students),
      rejectedCount: asNumber(data.rejected_count),
    };
  }

  async loadStudents(authToken: string, courseId = ''): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/students/index', authToken, {
      ...(courseId ? { course_id: courseId } : {}),
    });

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
      password: input.password,
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
    });
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
    input: { courseId?: string; subjectId?: string; centreId?: string; status?: string } = {},
  ): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/centres/cohorts', authToken, {
      ...(input.courseId ? { course_id: input.courseId } : {}),
      ...(input.subjectId ? { subject_id: input.subjectId } : {}),
      ...(input.centreId ? { centre_id: input.centreId } : {}),
      ...(input.status ? { status: input.status } : {}),
    });

    return toRecords(payload.data);
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
    input: { title?: string; image?: string; courseId?: string; status?: string },
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/banners/add', authToken, {
      title: input.title,
      image: input.image,
      course_id: input.courseId,
      status: input.status,
    });
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
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/Re_exam/index', authToken, {
      ...(filters.courseId ? { course_id: filters.courseId } : {}),
      ...(filters.batchId ? { batch_id: filters.batchId } : {}),
    });
    return toRecords(payload.data);
  }

  async grantReExam(authToken: string, examId: string, userIds: string[]): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/Re_exam/grant', authToken, {
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
    });
  }

  async loadCourseFees(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/course_fee/index', authToken);
    return toRecords(payload.data);
  }

  async loadFeeInstallments(
    authToken: string,
    filters: { courseId?: string; status?: string } = {},
  ): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/fee_management/installments', authToken, {
      ...(filters.courseId ? { course_id: filters.courseId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    });
    return toRecords(payload.data);
  }

  async loadPaymentStatus(
    authToken: string,
    filters: { fromDate?: string; toDate?: string; courseId?: string } = {},
  ): Promise<AdminPaymentStatusSnapshot> {
    const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>('/admin/fee_management/payment_status', authToken, {
      ...(filters.fromDate ? { from_date: filters.fromDate } : {}),
      ...(filters.toDate ? { to_date: filters.toDate } : {}),
      ...(filters.courseId ? { course_id: filters.courseId } : {}),
    });

    const data = asRecord(payload.data) ?? {};

    return {
      summary: asRecord(data.summary) ?? { total_payments: 0, unique_students: 0, total_collected: 0, avg_payment: 0 },
      payments: toRecords(data.payments),
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

  async loadCirculars(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/circulars/index', authToken);
    return toRecords(payload.data);
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

  async loadIntegrations(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/integration/index', authToken);
    return toRecords(payload.data);
  }

  async loadUserFeedbacks(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/review/index', authToken);
    return toRecords(payload.data);
  }

  async loadLanguages(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/language/index', authToken);
    return toRecords(payload.data);
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
}
