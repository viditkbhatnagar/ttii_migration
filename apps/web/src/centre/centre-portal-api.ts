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

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  if (typeof value === 'bigint') {
    return Number(value);
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

function formatDateOnly(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface CentreDashboardSnapshot {
  students: number;
  walletBalance: number;
  activeCohorts: number;
  pendingApplications: number;
  recentStudents: Record<string, unknown>[];
  centreName: string;
  centreCode: string;
}

export interface CentreApplicationsSnapshot {
  items: Record<string, unknown>[];
  pendingCount: number;
  rejectedCount: number;
}

export interface CentreWalletSnapshot {
  walletBalance: number;
  credits: Record<string, unknown>[];
  debits: Record<string, unknown>[];
  fundRequests: Record<string, unknown>[];
  totalCredits: number;
  totalDebits: number;
}

export interface AddCentreApplicationInput {
  name: string;
  countryCode: string;
  phone: string;
  email: string;
  courseId: string;
  pipeline?: string;
  pipelineUser?: string;
  status?: string;
}

export interface AddCentreCohortInput {
  title: string;
  cohortCode?: string;
  courseId: string;
  subjectId: string;
  instructorId: string;
  startDate: string;
  endDate: string;
}

export interface AddCentreLiveClassInput {
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

export interface AddCentreFileInput {
  folderId: string;
  name: string;
  type: string;
  size: number;
  path: string;
}

export interface AddCentreFundRequestInput {
  amount: number;
  date?: string;
  transactionNo?: string;
  description?: string;
  attachmentFile?: string;
}

export class CentrePortalApi {
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

  async loadDashboard(authToken: string): Promise<CentreDashboardSnapshot> {
    const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>('/centre/dashboard/index', authToken);
    const data = asRecord(payload.data) ?? {};
    const centre = asRecord(data.centre) ?? {};

    return {
      students: asNumber(data.students),
      walletBalance: asNumber(data.wallet_balance),
      activeCohorts: asNumber(data.active_cohorts),
      pendingApplications: asNumber(data.pending_applications),
      recentStudents: toRecords(data.recent_students),
      centreName: asString(centre.centre_name),
      centreCode: asString(centre.centre_id),
    };
  }

  async loadApplications(authToken: string, listBy = ''): Promise<CentreApplicationsSnapshot> {
    const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>('/centre/applications/index', authToken, {
      ...(listBy.trim() !== '' ? { list_by: listBy.trim() } : {}),
    });

    const data = asRecord(payload.data) ?? {};

    return {
      items: toRecords(data.students),
      pendingCount: asNumber(data.pending_count),
      rejectedCount: asNumber(data.rejected_count),
    };
  }

  async addApplication(authToken: string, input: AddCentreApplicationInput): Promise<Record<string, unknown>> {
    const response = await this.post<Record<string, unknown>>('/centre/applications/add', authToken, {
      name: input.name,
      code: input.countryCode,
      phone: input.phone,
      email: input.email,
      course_id: input.courseId,
      pipeline: input.pipeline ?? '0',
      pipeline_user: input.pipelineUser ?? '',
      status: input.status ?? 'pending',
    });

    return response;
  }

  async convertApplication(authToken: string, applicationId: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/centre/applications/convert', authToken, {
      application_id: applicationId,
    });
  }

  async loadStudents(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/centre/students/index', authToken);
    return toRecords(payload.data);
  }

  async loadCourses(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/centre/courses/index', authToken);
    return toRecords(payload.data);
  }

  async loadPipelineUsers(authToken: string, roleId: number): Promise<Record<string, unknown>[]> {
    const payload = await this.get<unknown[]>('/centre/applications/get_pipeline_users', authToken, {
      role_id: roleId,
    });

    return toRecords(payload);
  }

  async loadCohorts(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/centre/cohorts/index', authToken);
    return toRecords(payload.data);
  }

  async addCohort(authToken: string, input: AddCentreCohortInput): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/centre/cohorts/add', authToken, {
      title: input.title,
      cohort_id: input.cohortCode ?? '',
      course_id: input.courseId,
      subject_id: input.subjectId,
      instructor_id: input.instructorId,
      start_date: input.startDate,
      end_date: input.endDate,
    });
  }

  async addCohortStudents(authToken: string, cohortId: string, studentIds: string[]): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/centre/cohorts/add_cohort_students', authToken, {
      cohort_id: cohortId,
      student_id: studentIds,
    });
  }

  async loadLiveClasses(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/centre/live_class/index', authToken);
    return toRecords(payload.data);
  }

  async addLiveClass(authToken: string, input: AddCentreLiveClassInput): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/centre/live_class/add', authToken, {
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

  async loadResources(authToken: string, folderId = ''): Promise<Record<string, unknown>> {
    const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>('/centre/resources/index', authToken, {
      ...(folderId ? { folder_id: folderId } : {}),
    });

    return asRecord(payload.data) ?? {};
  }

  async addFolder(authToken: string, parentId: string, name: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/centre/resources/add_folder', authToken, {
      parent_id: parentId,
      name,
    });
  }

  async addFile(authToken: string, input: AddCentreFileInput): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/centre/resources/add_file', authToken, {
      folder_id: input.folderId,
      name: input.name,
      type: input.type,
      size: input.size,
      path: input.path,
    });
  }

  async loadWallet(authToken: string): Promise<CentreWalletSnapshot> {
    const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>('/centre/wallet/index', authToken);
    const data = asRecord(payload.data) ?? {};
    const listItems = asRecord(data.list_items) ?? {};
    const summary = asRecord(data.summary) ?? {};

    return {
      walletBalance: asNumber(listItems.wallet_balance),
      credits: toRecords(data.credits),
      debits: toRecords(data.debits),
      fundRequests: toRecords(data.fund_requests),
      totalCredits: asNumber(summary.total_credits),
      totalDebits: asNumber(summary.total_debits),
    };
  }

  async addFundRequest(authToken: string, input: AddCentreFundRequestInput): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/centre/wallet/add', authToken, {
      amount: input.amount,
      date: input.date ?? formatDateOnly(new Date()),
      transaction_no: input.transactionNo ?? '',
      description: input.description ?? '',
      attachment_file: input.attachmentFile ?? '',
      uploadedFileName: input.attachmentFile ?? '',
    });
  }

  async loadSupportMessages(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/centre/support/get_messages', authToken);
    return toRecords(payload.data);
  }

  async submitSupportMessage(authToken: string, message: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/centre/support/submit_message', authToken, {
      message,
    });
  }

  async loadTrainingVideos(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/centre/training_videos/index', authToken);
    return toRecords(payload.data);
  }

  static getId(value: Record<string, unknown>): string {
    return asString(value.id);
  }

  static getCourseId(value: Record<string, unknown>): string {
    return asString(value.course_id) || asString(value.id);
  }

  static getSubjectId(value: Record<string, unknown>): string {
    return asString(value.subject_id) || asString(value.id);
  }

  static getUserId(value: Record<string, unknown>): string {
    return asString(value.id) || asString(value.user_id);
  }

  static getTitle(value: Record<string, unknown>): string {
    return asString(value.title);
  }

  static getMessage(value: Record<string, unknown>): string {
    return asString(value.message);
  }

  static firstCourseId(rows: Record<string, unknown>[]): string {
    return asString(firstRecord(rows)?.course_id) || asString(firstRecord(rows)?.id);
  }
}
