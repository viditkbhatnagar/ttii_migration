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
  centreId: number;
  courseId: number;
  assignedAmount: number;
  startDate: string;
  endDate: string;
}

export interface AddAdminResourceFileInput {
  folderId: number;
  centreId?: number;
  name: string;
  type: string;
  size: number;
  path: string;
}

export interface AddAdminLiveClassInput {
  cohortId: number;
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
  liveId?: number;
  date?: string;
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
      courseId?: number;
      pipelineRoleId?: number;
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

  async loadStudents(authToken: string, courseId = 0): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/students/index', authToken, {
      ...(courseId > 0 ? { course_id: courseId } : {}),
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

  async convertApplication(authToken: string, applicationId: number): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/applications/convert', authToken, {
      application_id: applicationId,
    });
  }

  async loadCourses(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/course/all_course', authToken);
    return toRecords(payload.data);
  }

  async loadSubjects(authToken: string, courseId: number): Promise<Record<string, unknown>[]> {
    if (courseId <= 0) {
      return [];
    }

    const payload = await this.get<LegacyEnvelope<unknown[]>>('/course/get_subjects', authToken, {
      course_id: courseId,
    });

    return toRecords(payload.data);
  }

  async loadLessons(authToken: string, subjectId: number): Promise<Record<string, unknown>[]> {
    if (subjectId <= 0) {
      return [];
    }

    const payload = await this.get<LegacyEnvelope<unknown[]>>('/course/get_lessons', authToken, {
      subject_id: subjectId,
    });

    return toRecords(payload.data);
  }

  async loadResources(authToken: string, folderId = 0, centreId = 0): Promise<Record<string, unknown>> {
    const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>('/admin/resources/index', authToken, {
      folder_id: folderId,
      ...(centreId > 0 ? { centre_id: centreId } : {}),
    });

    return asRecord(payload.data) ?? {};
  }

  async addResourceFolder(
    authToken: string,
    parentId: number,
    name: string,
    centreId?: number,
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/resources/add_folder', authToken, {
      parent_id: parentId,
      name,
      ...(centreId && centreId > 0 ? { centre_id: centreId } : {}),
    });
  }

  async addResourceFile(authToken: string, input: AddAdminResourceFileInput): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/resources/add_file', authToken, {
      folder_id: input.folderId,
      ...(input.centreId && input.centreId > 0 ? { centre_id: input.centreId } : {}),
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
      courseId?: number;
      subjectId?: number;
      lessonId?: number;
      cohortId?: number;
    } = {},
  ): Promise<AdminAssessmentSnapshot> {
    const [examsPayload, assignmentsPayload] = await Promise.all([
      this.get<LegacyEnvelope<Record<string, unknown>>>('/exams/index', authToken, {
        ...(input.courseId && input.courseId > 0 ? { course_id: input.courseId } : {}),
        ...(input.subjectId && input.subjectId > 0 ? { subject_id: input.subjectId } : {}),
        ...(input.lessonId && input.lessonId > 0 ? { lesson_id: input.lessonId } : {}),
      }),
      this.get<LegacyEnvelope<Record<string, unknown>>>('/assignment/index', authToken, {
        ...(input.subjectId && input.subjectId > 0 ? { subject_id: input.subjectId } : {}),
        ...(input.cohortId && input.cohortId > 0 ? { cohort_id: input.cohortId } : {}),
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
      ...(input.liveId && input.liveId > 0 ? { live_id: input.liveId } : {}),
      ...(input.date ? { date: input.date } : {}),
    });

    const data = asRecord(payload.data) ?? {};

    return {
      filename: asString(data.filename) || (input.type === 'live_report' ? 'live-report.csv' : 'admin-operations-summary.csv'),
      csv: asString(data.csv),
    };
  }

  async loadLiveReport(authToken: string, liveId = 0, joinDate = ''): Promise<{
    lives: Record<string, unknown>[];
    listItems: Record<string, unknown>[];
  }> {
    const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>('/admin/live_report/index', authToken, {
      ...(liveId > 0 ? { live_id: liveId } : {}),
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

  static firstCourseId(rows: Record<string, unknown>[]): number {
    return asNumber(firstRecord(rows)?.id);
  }

  static firstSubjectId(rows: Record<string, unknown>[]): number {
    return asNumber(firstRecord(rows)?.id);
  }

  static firstLiveId(rows: Record<string, unknown>[]): number {
    return asNumber(firstRecord(rows)?.id) || asNumber(firstRecord(rows)?.live_id);
  }
}
