import { Prisma, type PrismaClient } from '@prisma/client';

import { hashPassword } from '../auth/password.js';
import { getPrismaClient } from '../data/prisma-client.js';

type SqlRow = Record<string, unknown>;

type ReportRange = {
  fromDate: string;
  toDate: string;
};

function toDbNumber(value: unknown): number {
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

function toInteger(value: unknown): number {
  return Math.trunc(toDbNumber(value));
}

function toStringValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value);
  }

  return '';
}

function toNullableString(value: unknown): string | null {
  const normalized = toStringValue(value).trim();
  return normalized === '' ? null : normalized;
}

function toDateOnly(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeDate(value: string | undefined, fallback: Date): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return value.trim();
  }

  return toDateOnly(fallback);
}

function normalizeReportRange(fromDate?: string, toDate?: string): ReportRange {
  const today = new Date();
  const from = normalizeDate(fromDate, today);
  const to = normalizeDate(toDate, today);

  if (from <= to) {
    return { fromDate: from, toDate: to };
  }

  return { fromDate: to, toDate: from };
}

function toCsvCell(value: unknown): string {
  const raw = toStringValue(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }

  return raw;
}

function rowsToCsv(headers: string[], rows: Array<Record<string, unknown>>): string {
  const lines: string[] = [headers.join(',')];

  for (const row of rows) {
    lines.push(headers.map((header) => toCsvCell(row[header])).join(','));
  }

  return `${lines.join('\n')}\n`;
}

export type AdminApplicationFilters = {
  fromDate?: string;
  toDate?: string;
  pipelineRoleId?: number;
  courseId?: number;
  listBy?: string;
};

export type CentreApplicationInput = {
  applicationId?: string;
  name: string;
  countryCode: string;
  phone: string;
  email: string;
  courseId: number;
  pipeline: string;
  pipelineUser: number;
  status: string;
};

export type StudentFilters = {
  courseId?: number;
};

export type CentreInput = {
  centreName: string;
  contactPerson: string;
  countryCode: string;
  phone: string;
  email: string;
  address: string;
  registrationDate?: string;
  expiryDate?: string;
  password?: string;
};

export type CentrePlanInput = {
  centreId: number;
  courseId: number;
  assignedAmount: number;
  startDate: string;
  endDate: string;
};

export type CohortInput = {
  title: string;
  cohortCode?: string;
  courseId: number;
  subjectId: number;
  instructorId: number;
  startDate: string;
  endDate: string;
};

export type AddCohortStudentsInput = {
  cohortId: number;
  studentIds: number[];
};

export type LiveClassEntryInput = {
  sessionId: string;
  title: string;
  date: string;
  fromTime: string;
  toTime: string;
  isRepetitive: number;
  repeatDates: string[];
};

export type AddLiveClassInput = {
  cohortId: number;
  zoomId: string;
  password: string;
  entries: LiveClassEntryInput[];
};

export type ResourceListInput = {
  folderId: number;
  centreId?: number;
};

export type AddFolderInput = {
  parentId: number;
  name: string;
  centreId?: number;
};

export type AddFileInput = {
  folderId: number;
  name: string;
  fileType: string;
  size: number;
  path: string;
  centreId?: number;
};

export type AddCentreFundRequestInput = {
  amount: number;
  date?: string;
  transactionReceipt?: string;
  description?: string;
  attachmentFile?: string;
};

export type UpdateSettingsInput = {
  system: Record<string, string>;
  frontend: Record<string, string>;
};

export type AppVersionInput = {
  appVersion: string;
  appVersionIos: string;
};

export type ReportSummaryInput = {
  fromDate?: string;
  toDate?: string;
};

export type ExportReportInput = {
  type: 'summary' | 'live_report';
  fromDate?: string;
  toDate?: string;
  liveId?: number;
  joinDate?: string;
};

export type BatchInput = {
  title: string;
  description?: string;
  status?: string;
};

export type BannerInput = {
  title?: string;
  image?: string;
  courseId?: number;
  status?: string;
};

export type FaqInput = {
  question: string;
  answer?: string;
  status?: string;
};

export type AdminCohortFilters = {
  courseId?: number;
  subjectId?: number;
  centreId?: number;
  status?: string;
};

export type AdminCentrePaymentFilters = {
  fromDate?: string;
  toDate?: string;
  status?: string;
  type?: string;
};

export type AdminPaymentFilters = {
  fromDate?: string;
  toDate?: string;
  courseId?: number;
};

export type AdminWalletFilters = {
  centreId?: number;
  centreName?: string;
};

// ─── Phase 3: Operations & People Input Types ────────────────────────────────

export type AdminCohortInput = {
  title: string;
  cohortCode?: string;
  courseId: number;
  subjectId: number;
  centreId: number;
  instructorId: number;
  startDate: string;
  endDate: string;
};

export type FeeInstallmentFilters = {
  courseId?: number;
  status?: string;
};

export type CohortAttendanceFilters = {
  cohortId?: number;
};

// ─── Phase 2: Exam & Assessment Input Types ──────────────────────────────────

export type QuestionBankFilters = {
  courseId?: number;
  subjectId?: number;
  lessonId?: number;
  qType?: number;
};

export type QuestionBankInput = {
  courseId: number;
  subjectId?: number;
  lessonId?: number;
  categoryId?: number;
  type?: number;
  qType?: number;
  title: string;
  titleFile?: string;
  hint?: string;
  hintFile?: string;
  solution?: string;
  solutionFile?: string;
  isEquation?: number;
  numberOfOptions?: number;
  options?: string;
  correctAnswers?: string;
  rangeFrom?: string;
  rangeTo?: string;
};

export type AdminExamFilters = {
  courseId?: number;
  subjectId?: number;
  batchId?: number;
  status?: string;
};

export type ExamInput = {
  title: string;
  description?: string;
  mark?: number;
  duration?: string;
  fromDate?: string;
  toDate?: string;
  fromTime?: string;
  toTime?: string;
  courseId: number;
  subjectId?: number;
  lessonId?: number;
  batchId?: number;
  free?: string;
  publishResult?: number;
  isPractice?: number;
  questionIds?: number[];
};

export type AdminAssignmentFilters = {
  courseId?: number;
  cohortId?: number;
};

export type AssignmentInput = {
  title: string;
  description?: string;
  totalMarks?: number;
  addedDate?: string;
  dueDate?: string;
  fromTime?: string;
  toTime?: string;
  instructions?: string;
  file?: string;
  courseId: number;
  cohortId?: number;
};

export type AdminExamResultFilters = {
  examId?: number;
  courseId?: number;
  batchId?: number;
};

export type AdminExamEvaluationFilters = {
  examId?: number;
  courseId?: number;
};

export type AdminReExamFilters = {
  courseId?: number;
  batchId?: number;
};

export type EntranceExamInput = {
  title: string;
  description?: string;
  totalMarks?: number;
  duration?: string;
  examDate?: string;
  fromTime?: string;
  toTime?: string;
  courseId: number;
  status?: string;
  questionIds?: string;
};

function normalizeSqlRow(row: SqlRow): SqlRow {
  const normalized: SqlRow = {};

  for (const [key, value] of Object.entries(row)) {
    normalized[key] = typeof value === 'bigint' ? Number(value) : value;
  }

  return normalized;
}

export class OperationsService {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  private async queryMany(sql: Prisma.Sql): Promise<SqlRow[]> {
    const rows = await this.prisma.$queryRaw<SqlRow[]>(sql);
    return rows.map((row) => normalizeSqlRow(row));
  }

  private async queryOne(sql: Prisma.Sql): Promise<SqlRow | null> {
    const rows = await this.queryMany(sql);
    return rows[0] ?? null;
  }

  private async count(sql: Prisma.Sql): Promise<number> {
    const row = await this.queryOne(sql);
    return toDbNumber(row?.count);
  }

  private async currentUser(userId: number): Promise<SqlRow | null> {
    if (userId <= 0) {
      return null;
    }

    return this.queryOne(Prisma.sql`
      SELECT id, role_id, name, user_email, centre_id, course_id
      FROM users
      WHERE id = ${userId}
        AND deleted_at IS NULL
      LIMIT 1
    `);
  }

  private async resolveActorCentreId(userId: number): Promise<number> {
    const user = await this.currentUser(userId);
    return toInteger(user?.centre_id);
  }

  private async resolveSupportRecipientId(): Promise<number> {
    const admin = await this.queryOne(Prisma.sql`
      SELECT id
      FROM users
      WHERE role_id = 1
        AND deleted_at IS NULL
      ORDER BY id ASC
      LIMIT 1
    `);

    return toInteger(admin?.id) || 1;
  }

  private async nextStudentCode(tx: Prisma.TransactionClient): Promise<string> {
    const latestStudent = await tx.$queryRaw<SqlRow[]>(Prisma.sql`
      SELECT student_id
      FROM users
      WHERE role_id = 2
        AND deleted_at IS NULL
        AND student_id LIKE ${'TTS%'}
      ORDER BY id DESC
      LIMIT 1
    `);

    const current = toStringValue(latestStudent[0]?.student_id);
    const match = current.match(/(\d+)$/);
    const nextNumber = (match ? Number.parseInt(match[1] ?? '0', 10) : 0) + 1;

    return `TTS${String(nextNumber).padStart(4, '0')}`;
  }

  async listPipelineUsers(roleId: number): Promise<SqlRow[]> {
    if (roleId <= 0) {
      return [];
    }

    return this.queryMany(Prisma.sql`
      SELECT id, name, user_email, phone
      FROM users
      WHERE role_id = ${roleId}
        AND deleted_at IS NULL
      ORDER BY name ASC, id ASC
    `);
  }

  async listAdminApplications(filters: AdminApplicationFilters): Promise<Record<string, unknown>> {
    const range = normalizeReportRange(filters.fromDate, filters.toDate);

    const applications = await this.queryMany(Prisma.sql`
      SELECT
        applications.*,
        course.title AS course_title,
        users.name AS pipeline_user_name,
        centres.centre_name
      FROM applications
      LEFT JOIN course ON course.id = applications.course_id
      LEFT JOIN users ON users.id = applications.pipeline_user
      LEFT JOIN centres ON centres.id = applications.added_under_centre
      WHERE applications.deleted_at IS NULL
        AND applications.is_converted = 0
        AND (${filters.fromDate ? Prisma.sql`DATE(applications.created_at) >= ${range.fromDate}` : Prisma.sql`1 = 1`})
        AND (${filters.toDate ? Prisma.sql`DATE(applications.created_at) <= ${range.toDate}` : Prisma.sql`1 = 1`})
        AND (${(filters.pipelineRoleId ?? 0) > 0 ? Prisma.sql`applications.pipeline = ${String(filters.pipelineRoleId)}` : Prisma.sql`1 = 1`})
        AND (${(filters.courseId ?? 0) > 0 ? Prisma.sql`applications.course_id = ${filters.courseId ?? 0}` : Prisma.sql`1 = 1`})
        AND (
          ${(filters.listBy ?? '').trim() !== ''
            ? Prisma.sql`applications.status = ${filters.listBy ?? ''}`
            : Prisma.sql`1 = 1`}
        )
      ORDER BY applications.id DESC
    `);

    const rejectedCount = applications.filter((item) => toStringValue(item.status) === 'rejected').length;

    return {
      students: applications,
      rejected_count: rejectedCount,
    };
  }

  async listCentreApplications(actorUserId: number, listBy?: string): Promise<Record<string, unknown>> {
    const centreId = await this.resolveActorCentreId(actorUserId);
    if (centreId <= 0) {
      return {
        students: [],
        pending_count: 0,
        rejected_count: 0,
      };
    }

    const applications = await this.queryMany(Prisma.sql`
      SELECT
        applications.*,
        course.title AS course_title
      FROM applications
      LEFT JOIN course ON course.id = applications.course_id
      WHERE applications.deleted_at IS NULL
        AND applications.is_converted = 0
        AND (
          applications.added_under_centre = ${centreId}
          OR applications.created_by = ${actorUserId}
        )
        AND (
          ${(listBy ?? '').trim() !== ''
            ? Prisma.sql`applications.status = ${listBy ?? ''}`
            : Prisma.sql`1 = 1`}
        )
      ORDER BY applications.id DESC
    `);

    let pendingCount = 0;
    let rejectedCount = 0;

    for (const item of applications) {
      const status = toStringValue(item.status);
      if (status === 'pending') {
        pendingCount += 1;
      }

      if (status === 'rejected') {
        rejectedCount += 1;
      }
    }

    return {
      students: applications,
      pending_count: pendingCount,
      rejected_count: rejectedCount,
    };
  }

  async getCentreDashboard(actorUserId: number): Promise<Record<string, unknown>> {
    const centreId = await this.resolveActorCentreId(actorUserId);
    if (centreId <= 0) {
      return {
        students: 0,
        wallet_balance: 0,
        active_cohorts: 0,
        pending_applications: 0,
        recent_students: [],
      };
    }

    const [studentsCount, activeCohortsCount, pendingApplicationsCount, centre, recentStudents] = await Promise.all([
      this.count(Prisma.sql`
        SELECT COUNT(*) AS count
        FROM users
        WHERE role_id = 2
          AND added_under_centre = ${centreId}
          AND deleted_at IS NULL
      `),
      this.count(Prisma.sql`
        SELECT COUNT(*) AS count
        FROM cohorts
        WHERE centre_id = ${centreId}
          AND deleted_at IS NULL
      `),
      this.count(Prisma.sql`
        SELECT COUNT(*) AS count
        FROM applications
        WHERE added_under_centre = ${centreId}
          AND is_converted = 0
          AND deleted_at IS NULL
      `),
      this.queryOne(Prisma.sql`
        SELECT id, centre_id, centre_name, wallet_balance
        FROM centres
        WHERE id = ${centreId}
          AND deleted_at IS NULL
        LIMIT 1
      `),
      this.queryMany(Prisma.sql`
        SELECT
          users.id,
          users.student_id,
          users.name AS student_name,
          users.created_at AS enrollment_date,
          course.title AS course_name
        FROM users
        LEFT JOIN course ON course.id = users.course_id
        WHERE users.role_id = 2
          AND users.added_under_centre = ${centreId}
          AND users.deleted_at IS NULL
        ORDER BY users.created_at DESC, users.id DESC
        LIMIT 3
      `),
    ]);

    return {
      students: studentsCount,
      wallet_balance: toDbNumber(centre?.wallet_balance),
      active_cohorts: activeCohortsCount,
      pending_applications: pendingApplicationsCount,
      recent_students: recentStudents.map((entry) => ({
        id: toInteger(entry.id),
        student_id: toStringValue(entry.student_id),
        student_name: toStringValue(entry.student_name),
        course_name: toStringValue(entry.course_name),
        enrollment_date: toStringValue(entry.enrollment_date),
      })),
      centre: centre
        ? {
            id: toInteger(centre.id),
            centre_id: toInteger(centre.centre_id),
            centre_name: toStringValue(centre.centre_name),
          }
        : null,
    };
  }

  async listCentreCourses(actorUserId: number): Promise<SqlRow[]> {
    const centreId = await this.resolveActorCentreId(actorUserId);
    if (centreId <= 0) {
      return [];
    }

    return this.queryMany(Prisma.sql`
      SELECT
        centre_course_plans.*,
        course.short_name,
        course.title AS course_title
      FROM centre_course_plans
      LEFT JOIN course ON course.id = centre_course_plans.course_id
      WHERE centre_course_plans.centre_id = ${centreId}
        AND centre_course_plans.deleted_at IS NULL
      ORDER BY centre_course_plans.id DESC
    `);
  }

  async getCentreWallet(actorUserId: number): Promise<Record<string, unknown>> {
    const centreId = await this.resolveActorCentreId(actorUserId);
    if (centreId <= 0) {
      return {
        list_items: null,
        credits: [],
        debits: [],
        fund_requests: [],
        summary: {
          total_credits: 0,
          total_debits: 0,
        },
      };
    }

    const [centre, credits, debits, fundRequests] = await Promise.all([
      this.queryOne(Prisma.sql`
        SELECT id, centre_id, centre_name, wallet_balance
        FROM centres
        WHERE id = ${centreId}
          AND deleted_at IS NULL
        LIMIT 1
      `),
      this.queryMany(Prisma.sql`
        SELECT id, amount, remarks, reference_id, created_at
        FROM wallet_transactions
        WHERE centre_id = ${centreId}
          AND transaction_type = ${'credit'}
          AND deleted_at IS NULL
        ORDER BY id DESC
      `),
      this.queryMany(Prisma.sql`
        SELECT id, amount, remarks, reference_id, created_at
        FROM wallet_transactions
        WHERE centre_id = ${centreId}
          AND transaction_type = ${'debit'}
          AND deleted_at IS NULL
        ORDER BY id DESC
      `),
      this.queryMany(Prisma.sql`
        SELECT id, amount, date, transaction_receipt, description, attachment_file, status, created_at
        FROM centre_fundrequests
        WHERE centre_id = ${centreId}
          AND deleted_at IS NULL
        ORDER BY id DESC
      `),
    ]);

    const totalCredits = credits.reduce((sum, entry) => sum + toDbNumber(entry.amount), 0);
    const totalDebits = debits.reduce((sum, entry) => sum + toDbNumber(entry.amount), 0);

    return {
      list_items: centre
        ? {
            id: toInteger(centre.id),
            centre_id: toInteger(centre.centre_id),
            centre_name: toStringValue(centre.centre_name),
            wallet_balance: toDbNumber(centre.wallet_balance),
          }
        : null,
      credits: credits.map((entry) => ({
        id: toInteger(entry.id),
        amount: toDbNumber(entry.amount),
        remarks: toStringValue(entry.remarks),
        reference_id: toStringValue(entry.reference_id),
        created_at: toStringValue(entry.created_at),
      })),
      debits: debits.map((entry) => ({
        id: toInteger(entry.id),
        amount: toDbNumber(entry.amount),
        remarks: toStringValue(entry.remarks),
        reference_id: toStringValue(entry.reference_id),
        created_at: toStringValue(entry.created_at),
      })),
      fund_requests: fundRequests.map((entry) => ({
        id: toInteger(entry.id),
        amount: toDbNumber(entry.amount),
        date: toStringValue(entry.date),
        transaction_receipt: toStringValue(entry.transaction_receipt),
        description: toStringValue(entry.description),
        attachment_file: toStringValue(entry.attachment_file),
        status: toStringValue(entry.status) || 'pending',
        created_at: toStringValue(entry.created_at),
      })),
      summary: {
        total_credits: totalCredits,
        total_debits: totalDebits,
      },
    };
  }

  async addCentreFundRequest(actorUserId: number, input: AddCentreFundRequestInput): Promise<Record<string, unknown>> {
    const centreId = await this.resolveActorCentreId(actorUserId);
    if (centreId <= 0) {
      return {
        status: 0,
        message: 'Centre is not assigned for current user.',
      };
    }

    if (input.amount <= 0) {
      return {
        status: 0,
        message: 'Amount is required',
      };
    }

    const now = new Date().toISOString();
    const date = normalizeDate(input.date, new Date());

    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO centre_fundrequests (
        centre_id,
        user_id,
        amount,
        date,
        transaction_receipt,
        description,
        attachment_file,
        status,
        created_by,
        updated_by,
        created_at,
        updated_at
      ) VALUES (
        ${centreId},
        ${actorUserId},
        ${input.amount},
        ${date},
        ${toNullableString(input.transactionReceipt)},
        ${toNullableString(input.description)},
        ${toNullableString(input.attachmentFile)},
        ${'pending'},
        ${actorUserId},
        ${actorUserId},
        ${now},
        ${now}
      )
    `);

    const insertedRow = await this.queryOne(Prisma.sql`SELECT last_insert_rowid() AS id`);

    return {
      status: 1,
      message: 'Request Sent Sucessfully!',
      data: {
        fund_request_id: toInteger(insertedRow?.id),
      },
    };
  }

  async listCentreTrainingVideos(): Promise<SqlRow[]> {
    const rows = await this.queryMany(Prisma.sql`
      SELECT id, title, description, category, video_type, video_url, thumbnail, created_at
      FROM training_videos
      WHERE deleted_at IS NULL
      ORDER BY id DESC
    `);

    if (rows.length > 0) {
      return rows.map((entry) => ({
        id: toInteger(entry.id),
        title: toStringValue(entry.title),
        description: toStringValue(entry.description),
        category: toStringValue(entry.category) || 'Lectures',
        video_type: toStringValue(entry.video_type),
        video_url: toStringValue(entry.video_url),
        thumbnail: toStringValue(entry.thumbnail),
        created_at: toStringValue(entry.created_at),
      }));
    }

    const demoVideos = await this.queryMany(Prisma.sql`
      SELECT id, title, video_type, video_url, thumbnail, created_at
      FROM demo_video
      WHERE deleted_at IS NULL
      ORDER BY id DESC
    `);

    return demoVideos.map((entry) => ({
      id: toInteger(entry.id),
      title: toStringValue(entry.title),
      description: '',
      category: 'Lectures',
      video_type: toStringValue(entry.video_type),
      video_url: toStringValue(entry.video_url),
      thumbnail: toStringValue(entry.thumbnail),
      created_at: toStringValue(entry.created_at),
    }));
  }

  async getCentreSupportMessages(actorUserId: number): Promise<SqlRow[]> {
    if (actorUserId <= 0) {
      return [];
    }

    return this.queryMany(Prisma.sql`
      SELECT id, chat_id, sender_id, message, created_at, updated_at
      FROM support_chat
      WHERE deleted_at IS NULL
        AND (
          chat_id = ${actorUserId}
          OR sender_id = ${actorUserId}
        )
      ORDER BY id ASC
    `);
  }

  async submitCentreSupportMessage(actorUserId: number, message: string): Promise<Record<string, unknown>> {
    if (actorUserId <= 0 || message.trim() === '') {
      return {
        status: 0,
        message: 'something went wrong!',
      };
    }

    const now = new Date().toISOString();
    const recipientId = await this.resolveSupportRecipientId();

    const inserted = await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO support_chat (
        chat_id,
        sender_id,
        message,
        created_at,
        created_by,
        updated_at,
        updated_by
      ) VALUES (
        ${recipientId},
        ${actorUserId},
        ${message},
        ${now},
        ${actorUserId},
        ${now},
        ${actorUserId}
      )
    `);

    return {
      status: inserted > 0 ? 1 : 0,
      message: inserted > 0 ? 'message send successfully' : 'something went wrong!',
    };
  }

  async addCentreApplication(actorUserId: number, input: CentreApplicationInput): Promise<Record<string, unknown>> {
    const centreId = await this.resolveActorCentreId(actorUserId);
    if (centreId <= 0) {
      return {
        status: 0,
        message: 'Centre is not assigned for current user.',
      };
    }

    const email = `${input.countryCode}${input.phone}`;

    const duplicateCount = await this.count(Prisma.sql`
      SELECT COUNT(*) AS count
      FROM applications
      WHERE deleted_at IS NULL
        AND (
          email = ${email}
          OR user_email = ${input.email}
        )
    `);

    if (duplicateCount > 0) {
      return {
        status: 0,
        message: 'Application with same phone or email already exists',
      };
    }

    const now = new Date().toISOString();
    const applicationId = input.applicationId?.trim() ? input.applicationId : `APP-${Date.now()}`;

    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO applications (
        application_id,
        name,
        country_code,
        phone,
        email,
        user_email,
        course_id,
        pipeline,
        pipeline_user,
        status,
        added_under_centre,
        created_by,
        updated_by,
        created_at,
        updated_at
      ) VALUES (
        ${applicationId},
        ${input.name},
        ${input.countryCode},
        ${input.phone},
        ${email},
        ${input.email},
        ${input.courseId},
        ${input.pipeline},
        ${input.pipelineUser},
        ${input.status},
        ${centreId},
        ${actorUserId},
        ${actorUserId},
        ${now},
        ${now}
      )
    `);

    const insertedRow = await this.queryOne(Prisma.sql`SELECT last_insert_rowid() AS id`);

    return {
      status: 1,
      message: 'Application Added Successfully!',
      application_id: toInteger(insertedRow?.id),
    };
  }

  async convertApplication(actorUserId: number, applicationId: number): Promise<Record<string, unknown>> {
    if (applicationId <= 0) {
      return {
        status: 0,
        message: 'Application not found',
      };
    }

    const application = await this.queryOne(Prisma.sql`
      SELECT *
      FROM applications
      WHERE id = ${applicationId}
        AND deleted_at IS NULL
        AND is_converted = 0
      LIMIT 1
    `);

    if (!application) {
      return {
        status: 0,
        message: 'Application not found',
      };
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const studentCode = await this.nextStudentCode(tx);
      const now = new Date().toISOString();
      const hashedPassword = await hashPassword('Temp@1234');
      const applicationEmail = toNullableString(application.user_email) ?? toNullableString(application.email) ?? '';
      const courseId = toInteger(application.course_id);
      const enrolDate = toDateOnly(new Date());

      await tx.$executeRaw(Prisma.sql`
        INSERT INTO users (
          student_id,
          name,
          country_code,
          phone,
          email,
          user_email,
          password,
          role_id,
          course_id,
          added_under_centre,
          status,
          created_by,
          updated_by,
          created_at,
          updated_at
        ) VALUES (
          ${studentCode},
          ${toStringValue(application.name)},
          ${toStringValue(application.country_code)},
          ${toStringValue(application.phone)},
          ${toStringValue(application.email)},
          ${applicationEmail},
          ${hashedPassword},
          2,
          ${courseId},
          ${toInteger(application.added_under_centre)},
          1,
          ${actorUserId},
          ${actorUserId},
          ${now},
          ${now}
        )
      `);

      const insertedStudentRow = await tx.$queryRaw<SqlRow[]>(Prisma.sql`SELECT last_insert_rowid() AS id`);
      const studentUserId = toInteger(insertedStudentRow[0]?.id);

      if (courseId > 0) {
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO enrol (
            user_id,
            course_id,
            enrollment_date,
            enrollment_status,
            mode_of_study,
            created_by,
            updated_by,
            created_at,
            updated_at
          ) VALUES (
            ${studentUserId},
            ${courseId},
            ${enrolDate},
            ${toStringValue(application.enrollment_status) || 'Active'},
            ${toStringValue(application.mode_of_study) || 'Online'},
            ${actorUserId},
            ${actorUserId},
            ${now},
            ${now}
          )
        `);
      }

      await tx.$executeRaw(Prisma.sql`
        UPDATE applications
        SET is_converted = 1,
            status = ${'converted'},
            updated_by = ${actorUserId},
            updated_at = ${now}
        WHERE id = ${applicationId}
      `);

      return {
        studentUserId,
        studentCode,
      };
    });

    return {
      status: 1,
      message: 'Application converted successfully',
      data: {
        student_user_id: created.studentUserId,
        student_id: created.studentCode,
      },
    };
  }

  async listStudents(scope: 'admin' | 'centre', actorUserId: number, filters: StudentFilters): Promise<SqlRow[]> {
    const centreId = scope === 'centre' ? await this.resolveActorCentreId(actorUserId) : 0;

    if (scope === 'centre' && centreId <= 0) {
      return [];
    }

    return this.queryMany(Prisma.sql`
      SELECT
        users.id,
        users.student_id,
        users.name,
        users.user_email,
        users.phone,
        users.course_id,
        users.added_under_centre,
        enrol.enrollment_status AS course_enrol_status,
        enrol.enrollment_id,
        enrol.batch_id,
        course.title AS course_title
      FROM users
      LEFT JOIN enrol ON enrol.user_id = users.id
        AND enrol.course_id = users.course_id
        AND enrol.deleted_at IS NULL
      LEFT JOIN course ON course.id = enrol.course_id
      WHERE users.deleted_at IS NULL
        AND users.role_id = 2
        AND (${(filters.courseId ?? 0) > 0 ? Prisma.sql`users.course_id = ${filters.courseId ?? 0}` : Prisma.sql`1 = 1`})
        AND (${scope === 'centre' ? Prisma.sql`users.added_under_centre = ${centreId}` : Prisma.sql`1 = 1`})
      ORDER BY users.id DESC
    `);
  }

  async listCentres(): Promise<SqlRow[]> {
    return this.queryMany(Prisma.sql`
      SELECT
        centres.*,
        (
          SELECT COUNT(*)
          FROM users
          WHERE users.role_id = 2
            AND users.added_under_centre = centres.id
            AND users.deleted_at IS NULL
        ) AS students_count
      FROM centres
      WHERE centres.deleted_at IS NULL
      ORDER BY centres.id DESC
    `);
  }

  async addCentre(actorUserId: number, input: CentreInput): Promise<Record<string, unknown>> {
    const now = new Date().toISOString();

    const duplicateCount = await this.count(Prisma.sql`
      SELECT COUNT(*) AS count
      FROM centres
      WHERE deleted_at IS NULL
        AND (
          (country_code = ${input.countryCode} AND phone = ${input.phone})
          OR email = ${input.email}
        )
    `);

    if (duplicateCount > 0) {
      return {
        status: 0,
        message: 'Centre with same phone or email already exists',
      };
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const latestCentre = await tx.$queryRaw<SqlRow[]>(Prisma.sql`
        SELECT centre_id
        FROM centres
        WHERE deleted_at IS NULL
        ORDER BY id DESC
        LIMIT 1
      `);
      const nextCentreCode = toInteger(latestCentre[0]?.centre_id) + 1;

      await tx.$executeRaw(Prisma.sql`
        INSERT INTO centres (
          centre_id,
          centre_name,
          contact_person,
          country_code,
          phone,
          email,
          address,
          date_of_registration,
          date_of_expiry,
          wallet_balance,
          created_by,
          updated_by,
          created_at,
          updated_at
        ) VALUES (
          ${nextCentreCode},
          ${input.centreName},
          ${input.contactPerson},
          ${input.countryCode},
          ${input.phone},
          ${input.email},
          ${input.address},
          ${toNullableString(input.registrationDate)},
          ${toNullableString(input.expiryDate)},
          0,
          ${actorUserId},
          ${actorUserId},
          ${now},
          ${now}
        )
      `);

      const centreInsert = await tx.$queryRaw<SqlRow[]>(Prisma.sql`SELECT last_insert_rowid() AS id`);
      const centreDbId = toInteger(centreInsert[0]?.id);

      const centrePassword = await hashPassword(input.password?.trim() ? input.password : 'Centre@1234');

      await tx.$executeRaw(Prisma.sql`
        INSERT INTO users (
          name,
          user_email,
          country_code,
          phone,
          role_id,
          centre_id,
          password,
          status,
          created_by,
          updated_by,
          created_at,
          updated_at
        ) VALUES (
          ${input.centreName},
          ${input.email},
          ${input.countryCode},
          ${input.phone},
          7,
          ${centreDbId},
          ${centrePassword},
          1,
          ${actorUserId},
          ${actorUserId},
          ${now},
          ${now}
        )
      `);

      return {
        centreDbId,
        centreCode: `TTC${String(nextCentreCode).padStart(4, '0')}`,
      };
    });

    return {
      status: 1,
      message: 'Centre Added Successfully!',
      data: {
        centre_id: created.centreDbId,
        centre_code: created.centreCode,
      },
    };
  }

  async assignCentrePlan(actorUserId: number, input: CentrePlanInput): Promise<Record<string, unknown>> {
    if (input.centreId <= 0 || input.courseId <= 0) {
      return {
        status: 0,
        message: 'Centre or course is invalid',
      };
    }

    const duplicateCount = await this.count(Prisma.sql`
      SELECT COUNT(*) AS count
      FROM centre_course_plans
      WHERE centre_id = ${input.centreId}
        AND course_id = ${input.courseId}
        AND deleted_at IS NULL
    `);

    if (duplicateCount > 0) {
      return {
        status: 0,
        message: 'Already assigned to this course',
      };
    }

    const now = new Date().toISOString();

    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO centre_course_plans (
        centre_id,
        course_id,
        assigned_amount,
        start_date,
        end_date,
        created_by,
        updated_by,
        created_at,
        updated_at
      ) VALUES (
        ${input.centreId},
        ${input.courseId},
        ${input.assignedAmount},
        ${input.startDate},
        ${input.endDate},
        ${actorUserId},
        ${actorUserId},
        ${now},
        ${now}
      )
    `);

    return {
      status: 1,
      message: 'Course Assigned Successfully!',
    };
  }

  async listCentreCohorts(actorUserId: number): Promise<SqlRow[]> {
    const centreId = await this.resolveActorCentreId(actorUserId);
    if (centreId <= 0) {
      return [];
    }

    const rows = await this.queryMany(Prisma.sql`
      SELECT
        cohorts.*,
        subject.title AS subject_name,
        course.title AS course_name,
        users.name AS instructor_name,
        (
          SELECT COUNT(*)
          FROM cohort_students
          WHERE cohort_students.cohort_id = cohorts.id
            AND cohort_students.deleted_at IS NULL
        ) AS students_count,
        (
          SELECT COUNT(*)
          FROM live_class
          WHERE live_class.cohort_id = cohorts.id
            AND live_class.deleted_at IS NULL
        ) AS lives_classes_count
      FROM cohorts
      LEFT JOIN subject ON subject.id = cohorts.subject_id
      LEFT JOIN course ON course.id = cohorts.course_id
      LEFT JOIN users ON users.id = cohorts.instructor_id
      WHERE cohorts.deleted_at IS NULL
        AND cohorts.centre_id = ${centreId}
      ORDER BY cohorts.id DESC
    `);

    return rows.map((entry) => ({
      id: toInteger(entry.id),
      subject_id: toInteger(entry.subject_id),
      course_id: toInteger(entry.course_id),
      language_id: toInteger(entry.language_id),
      centre_id: toInteger(entry.centre_id),
      cohort_id: toStringValue(entry.cohort_id),
      title: toStringValue(entry.title),
      start_date: toStringValue(entry.start_date),
      end_date: toStringValue(entry.end_date),
      instructor_id: toInteger(entry.instructor_id),
      created_at: toStringValue(entry.created_at),
      updated_at: toStringValue(entry.updated_at),
      subject_name: toStringValue(entry.subject_name),
      course_name: toStringValue(entry.course_name),
      instructor_name: toStringValue(entry.instructor_name),
      students_count: toInteger(entry.students_count),
      lives_classes_count: toInteger(entry.lives_classes_count),
    }));
  }

  async addCentreCohort(actorUserId: number, input: CohortInput): Promise<Record<string, unknown>> {
    const centreId = await this.resolveActorCentreId(actorUserId);
    if (centreId <= 0) {
      return {
        success: false,
        message: 'Centre is not assigned for current user.',
      };
    }

    const duplicateCount = await this.count(Prisma.sql`
      SELECT COUNT(*) AS count
      FROM cohorts
      WHERE deleted_at IS NULL
        AND centre_id = ${centreId}
        AND course_id = ${input.courseId}
        AND subject_id = ${input.subjectId}
    `);

    if (duplicateCount > 0) {
      return {
        success: false,
        message: 'Cohort with this subject already exists for this course!',
      };
    }

    const now = new Date().toISOString();

    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO cohorts (
        cohort_id,
        title,
        course_id,
        subject_id,
        instructor_id,
        start_date,
        end_date,
        centre_id,
        created_by,
        updated_by,
        created_at,
        updated_at
      ) VALUES (
        ${input.cohortCode?.trim() ? input.cohortCode : `COH-${Date.now()}`},
        ${input.title},
        ${input.courseId},
        ${input.subjectId},
        ${input.instructorId},
        ${input.startDate},
        ${input.endDate},
        ${centreId},
        ${actorUserId},
        ${actorUserId},
        ${now},
        ${now}
      )
    `);

    const insertedRow = await this.queryOne(Prisma.sql`SELECT last_insert_rowid() AS id`);
    const cohortId = toInteger(insertedRow?.id);

    return {
      success: true,
      message: 'Cohort added successfully!',
      data: {
        cohort_id: cohortId,
        subject_id: input.subjectId,
      },
    };
  }

  async addCentreCohortStudents(actorUserId: number, input: AddCohortStudentsInput): Promise<Record<string, unknown>> {
    const centreId = await this.resolveActorCentreId(actorUserId);
    if (centreId <= 0 || input.cohortId <= 0) {
      return {
        success: false,
        message: 'Invalid cohort selection',
      };
    }

    const cohort = await this.queryOne(Prisma.sql`
      SELECT id
      FROM cohorts
      WHERE id = ${input.cohortId}
        AND centre_id = ${centreId}
        AND deleted_at IS NULL
      LIMIT 1
    `);

    if (!cohort) {
      return {
        success: false,
        message: 'Cohort not found for centre',
      };
    }

    const now = new Date().toISOString();
    let inserted = 0;

    for (const studentId of input.studentIds) {
      if (studentId <= 0) {
        continue;
      }

      const existing = await this.count(Prisma.sql`
        SELECT COUNT(*) AS count
        FROM cohort_students
        WHERE cohort_id = ${input.cohortId}
          AND user_id = ${studentId}
          AND deleted_at IS NULL
      `);

      if (existing > 0) {
        continue;
      }

      await this.prisma.$executeRaw(Prisma.sql`
        INSERT INTO cohort_students (
          cohort_id,
          user_id,
          created_by,
          updated_by,
          created_at,
          updated_at
        ) VALUES (
          ${input.cohortId},
          ${studentId},
          ${actorUserId},
          ${actorUserId},
          ${now},
          ${now}
        )
      `);

      inserted += 1;
    }

    return {
      success: true,
      message: inserted > 0 ? 'Learners added successfully!' : 'No new learners added',
      added_count: inserted,
    };
  }

  async listLiveClasses(scope: 'admin' | 'centre', actorUserId: number): Promise<SqlRow[]> {
    const centreId = scope === 'centre' ? await this.resolveActorCentreId(actorUserId) : 0;

    if (scope === 'centre' && centreId <= 0) {
      return [];
    }

    return this.queryMany(Prisma.sql`
      SELECT
        live_class.*,
        cohorts.title AS cohort_title,
        course.title AS course_title
      FROM live_class
      LEFT JOIN cohorts ON cohorts.id = live_class.cohort_id
      LEFT JOIN course ON course.id = cohorts.course_id
      WHERE live_class.deleted_at IS NULL
        AND (${scope === 'centre' ? Prisma.sql`cohorts.centre_id = ${centreId}` : Prisma.sql`1 = 1`})
      ORDER BY live_class.id DESC
    `);
  }

  async addLiveClasses(
    scope: 'admin' | 'centre',
    actorUserId: number,
    input: AddLiveClassInput,
  ): Promise<Record<string, unknown>> {
    if (input.cohortId <= 0 || input.entries.length === 0) {
      return {
        success: false,
        message: 'No live class entries provided!',
      };
    }

    const centreId = scope === 'centre' ? await this.resolveActorCentreId(actorUserId) : 0;

    const cohort = await this.queryOne(Prisma.sql`
      SELECT id, instructor_id, centre_id
      FROM cohorts
      WHERE id = ${input.cohortId}
        AND deleted_at IS NULL
        AND (${scope === 'centre' ? Prisma.sql`centre_id = ${centreId}` : Prisma.sql`1 = 1`})
      LIMIT 1
    `);

    if (!cohort || toInteger(cohort.instructor_id) <= 0) {
      return {
        success: false,
        message: 'Instructor not set, Live class not added!',
      };
    }

    const now = new Date().toISOString();
    let successCount = 0;
    let failedCount = 0;

    for (const entry of input.entries) {
      try {
        await this.prisma.$executeRaw(Prisma.sql`
          INSERT INTO live_class (
            cohort_id,
            session_id,
            title,
            date,
            fromTime,
            toTime,
            repeat_dates,
            zoom_id,
            password,
            is_repetitive,
            created_by,
            updated_by,
            created_at,
            updated_at
          ) VALUES (
            ${input.cohortId},
            ${entry.sessionId},
            ${entry.title},
            ${entry.date},
            ${entry.fromTime},
            ${entry.toTime},
            ${JSON.stringify(entry.repeatDates)},
            ${input.zoomId},
            ${input.password},
            ${entry.isRepetitive},
            ${actorUserId},
            ${actorUserId},
            ${now},
            ${now}
          )
        `);

        successCount += 1;
      } catch {
        failedCount += 1;
      }
    }

    if (successCount === 0) {
      return {
        success: false,
        message: 'Failed to add live classes!',
      };
    }

    if (failedCount === 0) {
      return {
        success: true,
        message: `All ${successCount} live class(es) added successfully!`,
      };
    }

    return {
      success: true,
      message: `${successCount} live class(es) added successfully, ${failedCount} failed!`,
    };
  }

  async listResources(scope: 'admin' | 'centre', actorUserId: number, input: ResourceListInput): Promise<Record<string, unknown>> {
    const centreId = scope === 'centre' ? await this.resolveActorCentreId(actorUserId) : toInteger(input.centreId);
    const hasCentreScope = scope === 'centre' || centreId > 0;
    const folderId = input.folderId > 0 ? input.folderId : 0;

    const currentFolder = folderId > 0
      ? await this.queryOne(Prisma.sql`
          SELECT id, name, parent_id, centre_id
          FROM folder
          WHERE id = ${folderId}
            AND deleted_at IS NULL
            AND (${hasCentreScope ? Prisma.sql`COALESCE(centre_id, 0) = ${centreId}` : Prisma.sql`1 = 1`})
          LIMIT 1
        `)
      : null;

    const folders = await this.queryMany(Prisma.sql`
      SELECT id, name, parent_id, centre_id
      FROM folder
      WHERE deleted_at IS NULL
        AND parent_id = ${folderId}
        AND (${hasCentreScope ? Prisma.sql`COALESCE(centre_id, 0) = ${centreId}` : Prisma.sql`1 = 1`})
      ORDER BY id ASC
    `);

    const files = await this.queryMany(Prisma.sql`
      SELECT id, folder_id, name, type, size, path, centre_id, created_at
      FROM file
      WHERE deleted_at IS NULL
        AND folder_id = ${folderId}
        AND (${hasCentreScope ? Prisma.sql`COALESCE(centre_id, 0) = ${centreId}` : Prisma.sql`1 = 1`})
      ORDER BY id ASC
    `);

    return {
      folder_id: folderId,
      current_folder: currentFolder,
      folders,
      files,
    };
  }

  async addFolder(scope: 'admin' | 'centre', actorUserId: number, input: AddFolderInput): Promise<Record<string, unknown>> {
    const centreId = scope === 'centre' ? await this.resolveActorCentreId(actorUserId) : toInteger(input.centreId);
    const now = new Date().toISOString();

    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO folder (
        name,
        parent_id,
        centre_id,
        created_by,
        updated_by,
        created_at,
        updated_at
      ) VALUES (
        ${input.name},
        ${input.parentId},
        ${centreId > 0 ? centreId : null},
        ${actorUserId},
        ${actorUserId},
        ${now},
        ${now}
      )
    `);

    const row = await this.queryOne(Prisma.sql`SELECT last_insert_rowid() AS id`);

    return {
      status: 1,
      message: 'Folder added successfully!',
      data: {
        folder_id: toInteger(row?.id),
      },
    };
  }

  async addFile(scope: 'admin' | 'centre', actorUserId: number, input: AddFileInput): Promise<Record<string, unknown>> {
    const centreId = scope === 'centre' ? await this.resolveActorCentreId(actorUserId) : toInteger(input.centreId);
    const now = new Date().toISOString();

    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO file (
        folder_id,
        name,
        type,
        size,
        path,
        centre_id,
        created_by,
        updated_by,
        created_at,
        updated_at
      ) VALUES (
        ${input.folderId},
        ${input.name},
        ${input.fileType},
        ${input.size},
        ${input.path},
        ${centreId > 0 ? centreId : null},
        ${actorUserId},
        ${actorUserId},
        ${now},
        ${now}
      )
    `);

    const row = await this.queryOne(Prisma.sql`SELECT last_insert_rowid() AS id`);

    return {
      status: 1,
      message: 'File uploaded successfully!',
      data: {
        file_id: toInteger(row?.id),
      },
    };
  }

  async getSystemSettings(): Promise<Record<string, unknown>> {
    const systemSettings = await this.queryMany(Prisma.sql`
      SELECT "key", value
      FROM settings
      WHERE deleted_at IS NULL
      ORDER BY id ASC
    `);

    const frontendSettings = await this.queryMany(Prisma.sql`
      SELECT "key", value
      FROM frontend_settings
      WHERE deleted_at IS NULL
      ORDER BY id ASC
    `);

    const appVersion = await this.queryOne(Prisma.sql`
      SELECT id, app_version, app_version_ios
      FROM app_version
      WHERE deleted_at IS NULL
      ORDER BY id DESC
      LIMIT 1
    `);

    return {
      system_settings: systemSettings,
      frontend_settings: frontendSettings,
      app_version: appVersion,
    };
  }

  async updateSystemSettings(actorUserId: number, input: UpdateSettingsInput): Promise<void> {
    const now = new Date().toISOString();

    for (const [key, value] of Object.entries(input.system)) {
      await this.prisma.$executeRaw(Prisma.sql`
        INSERT INTO settings (
          "key",
          value,
          created_by,
          updated_by,
          created_at,
          updated_at
        ) VALUES (
          ${key},
          ${value},
          ${actorUserId},
          ${actorUserId},
          ${now},
          ${now}
        )
        ON CONFLICT("key") DO UPDATE SET
          value = excluded.value,
          updated_by = excluded.updated_by,
          updated_at = excluded.updated_at
      `);
    }

    for (const [key, value] of Object.entries(input.frontend)) {
      await this.prisma.$executeRaw(Prisma.sql`
        INSERT INTO frontend_settings (
          "key",
          value,
          created_by,
          updated_by,
          created_at,
          updated_at
        ) VALUES (
          ${key},
          ${value},
          ${actorUserId},
          ${actorUserId},
          ${now},
          ${now}
        )
        ON CONFLICT("key") DO UPDATE SET
          value = excluded.value,
          updated_by = excluded.updated_by,
          updated_at = excluded.updated_at
      `);
    }
  }

  async updateAppVersion(actorUserId: number, input: AppVersionInput): Promise<void> {
    const now = new Date().toISOString();

    const existing = await this.queryOne(Prisma.sql`
      SELECT id
      FROM app_version
      WHERE deleted_at IS NULL
      ORDER BY id DESC
      LIMIT 1
    `);

    if (existing) {
      await this.prisma.$executeRaw(Prisma.sql`
        UPDATE app_version
        SET app_version = ${input.appVersion},
            app_version_ios = ${input.appVersionIos},
            updated_by = ${actorUserId},
            updated_at = ${now}
        WHERE id = ${toInteger(existing.id)}
      `);

      return;
    }

    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO app_version (
        app_version,
        app_version_ios,
        created_by,
        updated_by,
        created_at,
        updated_at
      ) VALUES (
        ${input.appVersion},
        ${input.appVersionIos},
        ${actorUserId},
        ${actorUserId},
        ${now},
        ${now}
      )
    `);
  }

  async listLiveReport(liveId: number, joinDate?: string): Promise<Record<string, unknown>> {
    const lives = await this.queryMany(Prisma.sql`
      SELECT id, title, date
      FROM live_class
      WHERE deleted_at IS NULL
      ORDER BY id DESC
    `);

    const rows = await this.queryMany(Prisma.sql`
      SELECT
        zoom_history.*,
        users.name AS user_name
      FROM zoom_history
      LEFT JOIN users ON users.id = zoom_history.user_id
      WHERE zoom_history.deleted_at IS NULL
        AND (${liveId > 0 ? Prisma.sql`zoom_history.live_id = ${liveId}` : Prisma.sql`1 = 1`})
        AND (${(joinDate ?? '').trim() !== '' ? Prisma.sql`zoom_history.join_date = ${joinDate ?? ''}` : Prisma.sql`1 = 1`})
      ORDER BY zoom_history.id DESC
    `);

    return {
      lives,
      list_items: rows,
    };
  }

  async globalCalendar(fromDate?: string, toDate?: string): Promise<SqlRow[]> {
    const range = normalizeReportRange(fromDate, toDate);

    return this.queryMany(Prisma.sql`
      SELECT
        live_class.id,
        live_class.title,
        live_class.date AS event_date,
        ${'live_class'} AS event_type,
        live_class.fromTime AS from_time,
        live_class.toTime AS to_time
      FROM live_class
      WHERE live_class.deleted_at IS NULL
        AND DATE(live_class.date) BETWEEN ${range.fromDate} AND ${range.toDate}
      UNION ALL
      SELECT
        exam.id,
        exam.title,
        exam.from_date AS event_date,
        ${'exam'} AS event_type,
        exam.from_time,
        exam.to_time
      FROM exam
      WHERE exam.deleted_at IS NULL
        AND DATE(exam.from_date) BETWEEN ${range.fromDate} AND ${range.toDate}
      UNION ALL
      SELECT
        events.id,
        events.title,
        events.event_date,
        ${'event'} AS event_type,
        events.from_time,
        events.to_time
      FROM events
      WHERE events.deleted_at IS NULL
        AND DATE(events.event_date) BETWEEN ${range.fromDate} AND ${range.toDate}
      ORDER BY event_date ASC, id ASC
    `);
  }

  async reportSummary(input: ReportSummaryInput): Promise<Record<string, unknown>> {
    const range = normalizeReportRange(input.fromDate, input.toDate);

    const applicationsTotal = await this.count(Prisma.sql`
      SELECT COUNT(*) AS count
      FROM applications
      WHERE deleted_at IS NULL
        AND DATE(created_at) BETWEEN ${range.fromDate} AND ${range.toDate}
    `);

    const applicationsPending = await this.count(Prisma.sql`
      SELECT COUNT(*) AS count
      FROM applications
      WHERE deleted_at IS NULL
        AND status = ${'pending'}
        AND DATE(created_at) BETWEEN ${range.fromDate} AND ${range.toDate}
    `);

    const applicationsRejected = await this.count(Prisma.sql`
      SELECT COUNT(*) AS count
      FROM applications
      WHERE deleted_at IS NULL
        AND status = ${'rejected'}
        AND DATE(created_at) BETWEEN ${range.fromDate} AND ${range.toDate}
    `);

    const studentsTotal = await this.count(Prisma.sql`
      SELECT COUNT(*) AS count
      FROM users
      WHERE role_id = 2
        AND deleted_at IS NULL
    `);

    const centresTotal = await this.count(Prisma.sql`
      SELECT COUNT(*) AS count
      FROM centres
      WHERE deleted_at IS NULL
    `);

    const cohortsTotal = await this.count(Prisma.sql`
      SELECT COUNT(*) AS count
      FROM cohorts
      WHERE deleted_at IS NULL
    `);

    const liveClassesTotal = await this.count(Prisma.sql`
      SELECT COUNT(*) AS count
      FROM live_class
      WHERE deleted_at IS NULL
    `);

    return {
      report_window: range,
      applications_total: applicationsTotal,
      applications_pending: applicationsPending,
      applications_rejected: applicationsRejected,
      students_total: studentsTotal,
      centres_total: centresTotal,
      cohorts_total: cohortsTotal,
      live_classes_total: liveClassesTotal,
    };
  }

  async exportReport(input: ExportReportInput): Promise<{ filename: string; csv: string }> {
    if (input.type === 'live_report') {
      const liveReport = await this.listLiveReport(input.liveId ?? 0, input.joinDate);
      const rows = (liveReport.list_items as SqlRow[]).map((entry) => ({
        user_name: toStringValue(entry.user_name),
        live_id: toInteger(entry.live_id),
        join_date: toStringValue(entry.join_date),
        join_time: toStringValue(entry.join_time),
        leave_time: toStringValue(entry.leave_time),
        duration: toStringValue(entry.duration),
      }));

      return {
        filename: 'live-report.csv',
        csv: rowsToCsv(['user_name', 'live_id', 'join_date', 'join_time', 'leave_time', 'duration'], rows),
      };
    }

    const summaryInput: ReportSummaryInput = {};

    if (typeof input.fromDate === 'string' && input.fromDate.trim() !== '') {
      summaryInput.fromDate = input.fromDate;
    }

    if (typeof input.toDate === 'string' && input.toDate.trim() !== '') {
      summaryInput.toDate = input.toDate;
    }

    const summary = await this.reportSummary(summaryInput);

    const reportWindow = summary.report_window as ReportRange;

    const rows = [
      {
        from_date: reportWindow.fromDate,
        to_date: reportWindow.toDate,
        applications_total: summary.applications_total,
        applications_pending: summary.applications_pending,
        applications_rejected: summary.applications_rejected,
        students_total: summary.students_total,
        centres_total: summary.centres_total,
        cohorts_total: summary.cohorts_total,
        live_classes_total: summary.live_classes_total,
      },
    ];

    return {
      filename: 'admin-operations-summary.csv',
      csv: rowsToCsv(
        [
          'from_date',
          'to_date',
          'applications_total',
          'applications_pending',
          'applications_rejected',
          'students_total',
          'centres_total',
          'cohorts_total',
          'live_classes_total',
        ],
        rows,
      ),
    };
  }

  // ─── Phase 1: Admin Dashboard ──────────────────────────────────────────────

  async getAdminDashboard(): Promise<Record<string, unknown>> {
    const range = normalizeReportRange(undefined, undefined);

    const [
      coursesCount,
      centresCount,
      studentsCount,
      enrolmentsCount,
      paymentsTotal,
      recentStudents,
      upcomingEvents,
    ] = await Promise.all([
      this.count(Prisma.sql`SELECT COUNT(*) AS count FROM course WHERE deleted_at IS NULL`),
      this.count(Prisma.sql`SELECT COUNT(*) AS count FROM centres WHERE deleted_at IS NULL`),
      this.count(Prisma.sql`SELECT COUNT(*) AS count FROM users WHERE role_id = 2 AND deleted_at IS NULL`),
      this.count(Prisma.sql`SELECT COUNT(*) AS count FROM enrol WHERE deleted_at IS NULL`),
      this.queryOne(Prisma.sql`SELECT COALESCE(SUM(amount_paid), 0) AS total FROM payment_info WHERE deleted_at IS NULL`),
      this.queryMany(Prisma.sql`
        SELECT u.id, u.student_id, u.name, u.email, u.phone, u.created_at,
               c.title AS course_title
        FROM users u
        LEFT JOIN enrol e ON e.user_id = u.id AND e.deleted_at IS NULL
        LEFT JOIN course c ON c.id = e.course_id
        WHERE u.role_id = 2 AND u.deleted_at IS NULL
        ORDER BY u.id DESC
        LIMIT 10
      `),
      this.queryMany(Prisma.sql`
        SELECT id, title, event_date, from_time, to_time
        FROM events
        WHERE deleted_at IS NULL AND event_date >= ${range.toDate}
        ORDER BY event_date ASC
        LIMIT 10
      `),
    ]);

    return {
      courses_count: coursesCount,
      centres_count: centresCount,
      students_count: studentsCount,
      enrolments_count: enrolmentsCount,
      payments_total: toDbNumber(paymentsTotal?.total),
      recent_students: recentStudents,
      upcoming_events: upcomingEvents,
    };
  }

  // ─── Phase 1: Batches (Intake) ────────────────────────────────────────────

  async listBatches(): Promise<SqlRow[]> {
    return this.queryMany(Prisma.sql`
      SELECT b.*,
        (SELECT COUNT(*) FROM enrol WHERE batch_id = b.id AND deleted_at IS NULL) AS student_count
      FROM batch b
      WHERE b.deleted_at IS NULL
      ORDER BY b.id DESC
    `);
  }

  async addBatch(actorUserId: number, input: BatchInput): Promise<Record<string, unknown>> {
    if (!input.title.trim()) {
      return { status: 0, message: 'Title is required.' };
    }

    const now = new Date().toISOString();
    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO batch (title, description, status, created_by, created_at, updated_at)
      VALUES (${input.title}, ${input.description ?? ''}, ${input.status ?? 'active'}, ${actorUserId}, ${now}, ${now})
    `);

    return { status: 1, message: 'Batch Added Successfully!' };
  }

  async editBatch(actorUserId: number, batchId: number, input: BatchInput): Promise<Record<string, unknown>> {
    if (batchId <= 0) {
      return { status: 0, message: 'Invalid batch ID.' };
    }

    const now = new Date().toISOString();
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE batch
      SET title = ${input.title}, description = ${input.description ?? ''}, status = ${input.status ?? 'active'},
          updated_by = ${actorUserId}, updated_at = ${now}
      WHERE id = ${batchId} AND deleted_at IS NULL
    `);

    return { status: 1, message: 'Batch Updated Successfully!' };
  }

  async deleteBatch(actorUserId: number, batchId: number): Promise<Record<string, unknown>> {
    if (batchId <= 0) {
      return { status: 0, message: 'Invalid batch ID.' };
    }

    const now = new Date().toISOString();
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE batch
      SET deleted_by = ${actorUserId}, deleted_at = ${now}
      WHERE id = ${batchId} AND deleted_at IS NULL
    `);

    return { status: 1, message: 'Batch Deleted Successfully!' };
  }

  // ─── Phase 1: Payments ────────────────────────────────────────────────────

  async listPayments(filters: AdminPaymentFilters): Promise<SqlRow[]> {
    const range = normalizeReportRange(filters.fromDate, filters.toDate);

    return this.queryMany(Prisma.sql`
      SELECT p.*, u.name AS user_name, u.student_id, c.title AS course_title
      FROM payment_info p
      LEFT JOIN users u ON u.id = p.user_id
      LEFT JOIN course c ON c.id = p.course_id
      WHERE p.deleted_at IS NULL
        AND (${filters.fromDate ? Prisma.sql`DATE(p.payment_date) >= ${range.fromDate}` : Prisma.sql`1 = 1`})
        AND (${filters.toDate ? Prisma.sql`DATE(p.payment_date) <= ${range.toDate}` : Prisma.sql`1 = 1`})
        AND (${(filters.courseId ?? 0) > 0 ? Prisma.sql`p.course_id = ${filters.courseId ?? 0}` : Prisma.sql`1 = 1`})
      ORDER BY p.id DESC
    `);
  }

  // ─── Phase 1: Admin Cohorts ───────────────────────────────────────────────

  async listAdminCohorts(filters: AdminCohortFilters): Promise<SqlRow[]> {
    return this.queryMany(Prisma.sql`
      SELECT ch.*,
        c.title AS course_title,
        s.title AS subject_title,
        ct.centre_name,
        u.name AS instructor_name,
        (SELECT COUNT(*) FROM cohort_students WHERE cohort_id = ch.id AND deleted_at IS NULL) AS student_count
      FROM cohorts ch
      LEFT JOIN course c ON c.id = ch.course_id
      LEFT JOIN subject s ON s.id = ch.subject_id
      LEFT JOIN centres ct ON ct.id = ch.centre_id
      LEFT JOIN users u ON u.id = ch.instructor_id
      WHERE ch.deleted_at IS NULL
        AND (${(filters.courseId ?? 0) > 0 ? Prisma.sql`ch.course_id = ${filters.courseId ?? 0}` : Prisma.sql`1 = 1`})
        AND (${(filters.subjectId ?? 0) > 0 ? Prisma.sql`ch.subject_id = ${filters.subjectId ?? 0}` : Prisma.sql`1 = 1`})
        AND (${(filters.centreId ?? 0) > 0 ? Prisma.sql`ch.centre_id = ${filters.centreId ?? 0}` : Prisma.sql`1 = 1`})
      ORDER BY ch.id DESC
    `);
  }

  // ─── Phase 1: Admin Centre Payments (Fund Requests + Wallet Txns) ─────────

  async listAdminCentrePayments(filters: AdminCentrePaymentFilters): Promise<Record<string, unknown>> {
    const range = normalizeReportRange(filters.fromDate, filters.toDate);

    const [fundRequests, walletTransactions] = await Promise.all([
      this.queryMany(Prisma.sql`
        SELECT fr.*, ct.centre_name, u.name AS user_name
        FROM centre_fundrequests fr
        LEFT JOIN centres ct ON ct.id = fr.centre_id
        LEFT JOIN users u ON u.id = fr.user_id
        WHERE fr.deleted_at IS NULL
          AND (${filters.fromDate ? Prisma.sql`DATE(fr.date) >= ${range.fromDate}` : Prisma.sql`1 = 1`})
          AND (${filters.toDate ? Prisma.sql`DATE(fr.date) <= ${range.toDate}` : Prisma.sql`1 = 1`})
          AND (${filters.status ? Prisma.sql`fr.status = ${filters.status}` : Prisma.sql`1 = 1`})
        ORDER BY fr.id DESC
      `),
      this.queryMany(Prisma.sql`
        SELECT wt.*, ct.centre_name
        FROM wallet_transactions wt
        LEFT JOIN centres ct ON ct.id = wt.centre_id
        WHERE wt.deleted_at IS NULL
          AND (${filters.fromDate ? Prisma.sql`DATE(wt.created_at) >= ${range.fromDate}` : Prisma.sql`1 = 1`})
          AND (${filters.toDate ? Prisma.sql`DATE(wt.created_at) <= ${range.toDate}` : Prisma.sql`1 = 1`})
        ORDER BY wt.id DESC
      `),
    ]);

    return {
      fund_requests: fundRequests,
      wallet_transactions: walletTransactions,
    };
  }

  // ─── Phase 1: Admin Wallet Status ─────────────────────────────────────────

  async listAdminWalletStatus(filters: AdminWalletFilters): Promise<SqlRow[]> {
    return this.queryMany(Prisma.sql`
      SELECT ct.id, ct.centre_id, ct.centre_name, ct.wallet_balance, ct.phone, ct.email,
        (SELECT COUNT(*) FROM wallet_transactions WHERE centre_id = ct.id AND deleted_at IS NULL) AS transaction_count
      FROM centres ct
      WHERE ct.deleted_at IS NULL
        AND (${(filters.centreId ?? 0) > 0 ? Prisma.sql`ct.centre_id = ${filters.centreId ?? 0}` : Prisma.sql`1 = 1`})
        AND (${filters.centreName ? Prisma.sql`ct.centre_name LIKE ${'%' + filters.centreName + '%'}` : Prisma.sql`1 = 1`})
      ORDER BY ct.id DESC
    `);
  }

  // ─── Phase 1: Admin Notifications ─────────────────────────────────────────

  async listAdminNotifications(): Promise<SqlRow[]> {
    return this.queryMany(Prisma.sql`
      SELECT n.*, c.title AS course_title
      FROM notification n
      LEFT JOIN course c ON c.id = n.course_id AND c.deleted_at IS NULL
      WHERE n.deleted_at IS NULL
      ORDER BY n.id DESC
    `);
  }

  // ─── Phase 1: Banners ────────────────────────────────────────────────────

  async listBanners(): Promise<SqlRow[]> {
    return this.queryMany(Prisma.sql`
      SELECT b.*, c.title AS course_title
      FROM banners b
      LEFT JOIN course c ON c.id = b.course_id
      WHERE b.deleted_at IS NULL
      ORDER BY b.id DESC
    `);
  }

  async addBanner(actorUserId: number, input: BannerInput): Promise<Record<string, unknown>> {
    const now = new Date().toISOString();
    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO banners (title, image, course_id, status, created_by, created_at, updated_at)
      VALUES (${input.title ?? ''}, ${input.image ?? ''}, ${input.courseId ?? 0}, ${input.status ?? 'active'}, ${actorUserId}, ${now}, ${now})
    `);

    return { status: 1, message: 'Banner Added Successfully!' };
  }

  // ─── Phase 1: FAQ ────────────────────────────────────────────────────────

  async listFaqs(): Promise<SqlRow[]> {
    return this.queryMany(Prisma.sql`
      SELECT * FROM faq WHERE deleted_at IS NULL ORDER BY id DESC
    `);
  }

  async addFaq(actorUserId: number, input: FaqInput): Promise<Record<string, unknown>> {
    if (!input.question.trim()) {
      return { status: 0, message: 'Question is required.' };
    }

    const now = new Date().toISOString();
    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO faq (question, answer, status, created_by, created_at, updated_at)
      VALUES (${input.question}, ${input.answer ?? ''}, ${input.status ?? 'active'}, ${actorUserId}, ${now}, ${now})
    `);

    return { status: 1, message: 'FAQ Added Successfully!' };
  }

  // ─── Phase 1: Contact Settings ────────────────────────────────────────────

  async getContactSettings(): Promise<SqlRow[]> {
    return this.queryMany(Prisma.sql`
      SELECT * FROM settings
      WHERE deleted_at IS NULL
        AND "key" IN ('contact_email', 'contact_phone', 'contact_address', 'support_email', 'support_phone', 'whatsapp_number')
      ORDER BY id ASC
    `);
  }

  async updateContactSettings(actorUserId: number, settings: Record<string, string>): Promise<void> {
    const now = new Date().toISOString();

    for (const [key, value] of Object.entries(settings)) {
      const existing = await this.queryOne(Prisma.sql`
        SELECT id FROM settings WHERE "key" = ${key} AND deleted_at IS NULL LIMIT 1
      `);

      if (existing) {
        await this.prisma.$executeRaw(Prisma.sql`
          UPDATE settings SET value = ${value}, updated_by = ${actorUserId}, updated_at = ${now}
          WHERE "key" = ${key} AND deleted_at IS NULL
        `);
      } else {
        await this.prisma.$executeRaw(Prisma.sql`
          INSERT INTO settings ("key", value, created_by, created_at, updated_at)
          VALUES (${key}, ${value}, ${actorUserId}, ${now}, ${now})
        `);
      }
    }
  }

  // ─── Phase 2: Question Bank ─────────────────────────────────────────────────

  async listQuestionBank(filters: QuestionBankFilters = {}): Promise<SqlRow[]> {
    const conditions = [Prisma.sql`qb.deleted_at IS NULL`];

    if (filters.courseId && filters.courseId > 0) {
      conditions.push(Prisma.sql`qb.course_id = ${filters.courseId}`);
    }
    if (filters.subjectId && filters.subjectId > 0) {
      conditions.push(Prisma.sql`qb.subject_id = ${filters.subjectId}`);
    }
    if (filters.lessonId && filters.lessonId > 0) {
      conditions.push(Prisma.sql`qb.lesson_id = ${filters.lessonId}`);
    }
    if (filters.qType !== undefined && filters.qType >= 0) {
      conditions.push(Prisma.sql`qb.q_type = ${filters.qType}`);
    }

    const where = Prisma.join(conditions, ' AND ');

    return this.queryMany(Prisma.sql`
      SELECT qb.*,
        c.title AS course_title,
        s.title AS subject_title,
        l.title AS lesson_title
      FROM question_bank qb
      LEFT JOIN course c ON c.id = qb.course_id
      LEFT JOIN subject s ON s.id = qb.subject_id
      LEFT JOIN lesson l ON l.id = qb.lesson_id
      WHERE ${where}
      ORDER BY qb.id DESC
    `);
  }

  async addQuestion(actorUserId: number, input: QuestionBankInput): Promise<Record<string, unknown>> {
    if (!input.title.trim()) {
      return { status: 0, message: 'Question title is required.' };
    }

    const now = new Date().toISOString();

    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO question_bank (
        course_id, subject_id, lesson_id, category_id, type, q_type,
        title, title_file, hint, hint_file, solution, solution_file,
        is_equation, number_of_options, options, correct_answers,
        range_from, range_to,
        created_by, created_at, updated_at
      ) VALUES (
        ${input.courseId}, ${input.subjectId ?? null}, ${input.lessonId ?? null},
        ${input.categoryId ?? null}, ${input.type ?? 0}, ${input.qType ?? 0},
        ${input.title}, ${input.titleFile ?? null}, ${input.hint ?? null},
        ${input.hintFile ?? null}, ${input.solution ?? null}, ${input.solutionFile ?? null},
        ${input.isEquation ?? 0}, ${input.numberOfOptions ?? 4},
        ${input.options ?? '[]'}, ${input.correctAnswers ?? '[]'},
        ${input.rangeFrom ?? null}, ${input.rangeTo ?? null},
        ${actorUserId}, ${now}, ${now}
      )
    `);

    return { status: 1, message: 'Question added successfully.' };
  }

  async editQuestion(actorUserId: number, questionId: number, input: QuestionBankInput): Promise<Record<string, unknown>> {
    if (!input.title.trim()) {
      return { status: 0, message: 'Question title is required.' };
    }

    const now = new Date().toISOString();

    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE question_bank SET
        course_id = ${input.courseId}, subject_id = ${input.subjectId ?? null},
        lesson_id = ${input.lessonId ?? null}, category_id = ${input.categoryId ?? null},
        type = ${input.type ?? 0}, q_type = ${input.qType ?? 0},
        title = ${input.title}, title_file = ${input.titleFile ?? null},
        hint = ${input.hint ?? null}, hint_file = ${input.hintFile ?? null},
        solution = ${input.solution ?? null}, solution_file = ${input.solutionFile ?? null},
        is_equation = ${input.isEquation ?? 0}, number_of_options = ${input.numberOfOptions ?? 4},
        options = ${input.options ?? '[]'}, correct_answers = ${input.correctAnswers ?? '[]'},
        range_from = ${input.rangeFrom ?? null}, range_to = ${input.rangeTo ?? null},
        updated_by = ${actorUserId}, updated_at = ${now}
      WHERE id = ${questionId} AND deleted_at IS NULL
    `);

    return { status: 1, message: 'Question updated successfully.' };
  }

  async deleteQuestion(actorUserId: number, questionId: number): Promise<Record<string, unknown>> {
    const now = new Date().toISOString();

    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE question_bank SET deleted_by = ${actorUserId}, deleted_at = ${now}
      WHERE id = ${questionId} AND deleted_at IS NULL
    `);

    return { status: 1, message: 'Question deleted successfully.' };
  }

  // ─── Phase 2: Exams ────────────────────────────────────────────────────────

  async listAdminExams(filters: AdminExamFilters = {}): Promise<{
    exams: SqlRow[];
    summary: { total: number; upcoming: number; expired: number; practice: number };
  }> {
    const conditions = [Prisma.sql`e.deleted_at IS NULL`];

    if (filters.courseId && filters.courseId > 0) {
      conditions.push(Prisma.sql`e.course_id = ${filters.courseId}`);
    }
    if (filters.subjectId && filters.subjectId > 0) {
      conditions.push(Prisma.sql`e.subject_id = ${filters.subjectId}`);
    }
    if (filters.batchId && filters.batchId > 0) {
      conditions.push(Prisma.sql`e.batch_id = ${filters.batchId}`);
    }

    const where = Prisma.join(conditions, ' AND ');

    const exams = await this.queryMany(Prisma.sql`
      SELECT e.*,
        c.title AS course_title,
        s.title AS subject_title,
        b.title AS batch_title,
        (SELECT COUNT(*) FROM exam_questions eq WHERE eq.exam_id = e.id AND eq.deleted_at IS NULL) AS question_count,
        (SELECT COUNT(*) FROM exam_attempt ea WHERE ea.exam_id = e.id AND ea.submit_status = 1 AND ea.deleted_at IS NULL) AS attempt_count
      FROM exam e
      LEFT JOIN course c ON c.id = e.course_id
      LEFT JOIN subject s ON s.id = e.subject_id
      LEFT JOIN batch b ON b.id = e.batch_id
      WHERE ${where}
      ORDER BY e.id DESC
    `);

    const now = new Date().toISOString().slice(0, 10);
    let upcoming = 0;
    let expired = 0;
    let practice = 0;

    for (const exam of exams) {
      if (toInteger(exam.is_practice) === 1) {
        practice++;
      }
      const toDate = toStringValue(exam.to_date).slice(0, 10);
      const fromDate = toStringValue(exam.from_date).slice(0, 10);
      if (fromDate > now) {
        upcoming++;
      } else if (toDate < now) {
        expired++;
      }
    }

    return {
      exams,
      summary: { total: exams.length, upcoming, expired, practice },
    };
  }

  async addExam(actorUserId: number, input: ExamInput): Promise<Record<string, unknown>> {
    if (!input.title.trim()) {
      return { status: 0, message: 'Exam title is required.' };
    }

    const now = new Date().toISOString();

    const result = await this.prisma.$queryRaw<Array<{ id: number }>>(Prisma.sql`
      INSERT INTO exam (
        title, description, mark, duration,
        from_date, to_date, from_time, to_time,
        course_id, subject_id, lesson_id, batch_id,
        free, publish_result, is_practice,
        created_by, created_at, updated_at
      ) VALUES (
        ${input.title}, ${input.description ?? null}, ${input.mark ?? 0}, ${input.duration ?? null},
        ${input.fromDate ?? null}, ${input.toDate ?? null}, ${input.fromTime ?? null}, ${input.toTime ?? null},
        ${input.courseId}, ${input.subjectId ?? null}, ${input.lessonId ?? null}, ${input.batchId ?? null},
        ${input.free ?? '0'}, ${input.publishResult ?? 0}, ${input.isPractice ?? 0},
        ${actorUserId}, ${now}, ${now}
      )
      RETURNING id
    `);

    const examId = toInteger(result[0]?.id);

    if (examId > 0 && input.questionIds && input.questionIds.length > 0) {
      for (let i = 0; i < input.questionIds.length; i++) {
        const qId = input.questionIds[i];
        await this.prisma.$executeRaw(Prisma.sql`
          INSERT INTO exam_questions (exam_id, question_id, question_no, mark, created_by, created_at, updated_at)
          VALUES (${examId}, ${qId}, ${i + 1}, ${(input.mark ?? 0) / input.questionIds.length}, ${actorUserId}, ${now}, ${now})
        `);
      }
    }

    return { status: 1, message: 'Exam created successfully.', data: { id: examId } };
  }

  async editExam(actorUserId: number, examId: number, input: ExamInput): Promise<Record<string, unknown>> {
    if (!input.title.trim()) {
      return { status: 0, message: 'Exam title is required.' };
    }

    const now = new Date().toISOString();

    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE exam SET
        title = ${input.title}, description = ${input.description ?? null},
        mark = ${input.mark ?? 0}, duration = ${input.duration ?? null},
        from_date = ${input.fromDate ?? null}, to_date = ${input.toDate ?? null},
        from_time = ${input.fromTime ?? null}, to_time = ${input.toTime ?? null},
        course_id = ${input.courseId}, subject_id = ${input.subjectId ?? null},
        lesson_id = ${input.lessonId ?? null}, batch_id = ${input.batchId ?? null},
        free = ${input.free ?? '0'}, publish_result = ${input.publishResult ?? 0},
        is_practice = ${input.isPractice ?? 0},
        updated_by = ${actorUserId}, updated_at = ${now}
      WHERE id = ${examId} AND deleted_at IS NULL
    `);

    return { status: 1, message: 'Exam updated successfully.' };
  }

  async deleteExam(actorUserId: number, examId: number): Promise<Record<string, unknown>> {
    const now = new Date().toISOString();

    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE exam SET deleted_by = ${actorUserId}, deleted_at = ${now}
      WHERE id = ${examId} AND deleted_at IS NULL
    `);

    return { status: 1, message: 'Exam deleted successfully.' };
  }

  async publishExamResult(actorUserId: number, examId: number): Promise<Record<string, unknown>> {
    const now = new Date().toISOString();

    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE exam SET publish_result = 1, updated_by = ${actorUserId}, updated_at = ${now}
      WHERE id = ${examId} AND deleted_at IS NULL
    `);

    return { status: 1, message: 'Exam results published.' };
  }

  // ─── Phase 2: Assignments ──────────────────────────────────────────────────

  async listAdminAssignments(filters: AdminAssignmentFilters = {}): Promise<SqlRow[]> {
    const conditions = [Prisma.sql`a.deleted_at IS NULL`];

    if (filters.courseId && filters.courseId > 0) {
      conditions.push(Prisma.sql`a.course_id = ${filters.courseId}`);
    }
    if (filters.cohortId && filters.cohortId > 0) {
      conditions.push(Prisma.sql`a.cohort_id = ${filters.cohortId}`);
    }

    const where = Prisma.join(conditions, ' AND ');

    return this.queryMany(Prisma.sql`
      SELECT a.*,
        c.title AS course_title,
        ch.title AS cohort_title,
        (SELECT COUNT(*) FROM assignment_submissions asub WHERE asub.assignment_id = a.id AND asub.deleted_at IS NULL) AS submission_count
      FROM assignment a
      LEFT JOIN course c ON c.id = a.course_id
      LEFT JOIN cohorts ch ON ch.id = a.cohort_id
      WHERE ${where}
      ORDER BY a.id DESC
    `);
  }

  async addAssignment(actorUserId: number, input: AssignmentInput): Promise<Record<string, unknown>> {
    if (!input.title.trim()) {
      return { status: 0, message: 'Assignment title is required.' };
    }

    const now = new Date().toISOString();

    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO assignment (
        title, description, total_marks, added_date, due_date,
        from_time, to_time, instructions, file,
        course_id, cohort_id, created_by, created_at, updated_at
      ) VALUES (
        ${input.title}, ${input.description ?? null}, ${input.totalMarks ?? 0},
        ${input.addedDate ?? now.slice(0, 10)}, ${input.dueDate ?? null},
        ${input.fromTime ?? null}, ${input.toTime ?? null},
        ${input.instructions ?? null}, ${input.file ?? null},
        ${input.courseId}, ${input.cohortId ?? null},
        ${actorUserId}, ${now}, ${now}
      )
    `);

    return { status: 1, message: 'Assignment created successfully.' };
  }

  async editAssignment(actorUserId: number, assignmentId: number, input: AssignmentInput): Promise<Record<string, unknown>> {
    if (!input.title.trim()) {
      return { status: 0, message: 'Assignment title is required.' };
    }

    const now = new Date().toISOString();

    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE assignment SET
        title = ${input.title}, description = ${input.description ?? null},
        total_marks = ${input.totalMarks ?? 0},
        due_date = ${input.dueDate ?? null},
        from_time = ${input.fromTime ?? null}, to_time = ${input.toTime ?? null},
        instructions = ${input.instructions ?? null}, file = ${input.file ?? null},
        course_id = ${input.courseId}, cohort_id = ${input.cohortId ?? null},
        updated_by = ${actorUserId}, updated_at = ${now}
      WHERE id = ${assignmentId} AND deleted_at IS NULL
    `);

    return { status: 1, message: 'Assignment updated successfully.' };
  }

  async deleteAssignment(actorUserId: number, assignmentId: number): Promise<Record<string, unknown>> {
    const now = new Date().toISOString();

    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE assignment SET deleted_by = ${actorUserId}, deleted_at = ${now}
      WHERE id = ${assignmentId} AND deleted_at IS NULL
    `);

    return { status: 1, message: 'Assignment deleted successfully.' };
  }

  async listAssignmentSubmissions(assignmentId: number): Promise<SqlRow[]> {
    return this.queryMany(Prisma.sql`
      SELECT asub.*, u.name AS student_name, u.student_id
      FROM assignment_submissions asub
      LEFT JOIN users u ON u.id = asub.user_id
      WHERE asub.assignment_id = ${assignmentId} AND asub.deleted_at IS NULL
      ORDER BY asub.id DESC
    `);
  }

  async evaluateSubmission(
    actorUserId: number,
    submissionId: number,
    marks: string,
    remarks?: string,
  ): Promise<Record<string, unknown>> {
    const now = new Date().toISOString();

    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE assignment_submissions SET
        marks = ${marks}, remarks = ${remarks ?? null},
        updated_by = ${actorUserId}, updated_at = ${now}
      WHERE id = ${submissionId} AND deleted_at IS NULL
    `);

    return { status: 1, message: 'Submission evaluated successfully.' };
  }

  // ─── Phase 2: Exam Results ─────────────────────────────────────────────────

  async listAdminExamResults(filters: AdminExamResultFilters = {}): Promise<{
    exams: SqlRow[];
    results: SqlRow[];
  }> {
    const examConditions = [Prisma.sql`e.deleted_at IS NULL`];

    if (filters.courseId && filters.courseId > 0) {
      examConditions.push(Prisma.sql`e.course_id = ${filters.courseId}`);
    }
    if (filters.batchId && filters.batchId > 0) {
      examConditions.push(Prisma.sql`e.batch_id = ${filters.batchId}`);
    }

    const examWhere = Prisma.join(examConditions, ' AND ');

    const exams = await this.queryMany(Prisma.sql`
      SELECT e.id, e.title, e.mark, e.course_id, e.batch_id
      FROM exam e WHERE ${examWhere} ORDER BY e.title ASC
    `);

    let results: SqlRow[] = [];

    if (filters.examId && filters.examId > 0) {
      results = await this.queryMany(Prisma.sql`
        SELECT ea.*, u.name AS student_name, u.student_id,
          e.title AS exam_title, e.mark AS total_marks
        FROM exam_attempt ea
        LEFT JOIN users u ON u.id = ea.user_id
        LEFT JOIN exam e ON e.id = ea.exam_id
        WHERE ea.exam_id = ${filters.examId} AND ea.submit_status = 1 AND ea.deleted_at IS NULL
        ORDER BY ea.score DESC
      `);
    }

    return { exams, results };
  }

  // ─── Phase 2: Exam Evaluation ──────────────────────────────────────────────

  async listExamEvaluations(filters: AdminExamEvaluationFilters = {}): Promise<{
    exams: SqlRow[];
    pendingEvaluations: SqlRow[];
  }> {
    const examConditions = [Prisma.sql`e.deleted_at IS NULL`];

    if (filters.courseId && filters.courseId > 0) {
      examConditions.push(Prisma.sql`e.course_id = ${filters.courseId}`);
    }

    const examWhere = Prisma.join(examConditions, ' AND ');

    const exams = await this.queryMany(Prisma.sql`
      SELECT e.id, e.title, e.mark, e.course_id FROM exam e WHERE ${examWhere} ORDER BY e.title ASC
    `);

    const evalConditions = [
      Prisma.sql`ea.submit_status = 1`,
      Prisma.sql`ea.deleted_at IS NULL`,
    ];

    if (filters.examId && filters.examId > 0) {
      evalConditions.push(Prisma.sql`ea.exam_id = ${filters.examId}`);
    }
    if (filters.courseId && filters.courseId > 0) {
      evalConditions.push(Prisma.sql`e.course_id = ${filters.courseId}`);
    }

    const evalWhere = Prisma.join(evalConditions, ' AND ');

    const pendingEvaluations = await this.queryMany(Prisma.sql`
      SELECT ea.*, u.name AS student_name, u.student_id,
        e.title AS exam_title, e.mark AS total_marks
      FROM exam_attempt ea
      LEFT JOIN users u ON u.id = ea.user_id
      LEFT JOIN exam e ON e.id = ea.exam_id
      WHERE ${evalWhere}
      ORDER BY ea.id DESC
    `);

    return { exams, pendingEvaluations };
  }

  async evaluateExamAttempt(actorUserId: number, attemptId: number, score: number): Promise<Record<string, unknown>> {
    const now = new Date().toISOString();

    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE exam_attempt SET score = ${score}, updated_by = ${actorUserId}, updated_at = ${now}
      WHERE id = ${attemptId} AND deleted_at IS NULL
    `);

    return { status: 1, message: 'Exam attempt evaluated successfully.' };
  }

  // ─── Phase 2: Re-Examination ───────────────────────────────────────────────

  async listReExams(filters: AdminReExamFilters = {}): Promise<SqlRow[]> {
    const conditions = [Prisma.sql`e.deleted_at IS NULL`];

    if (filters.courseId && filters.courseId > 0) {
      conditions.push(Prisma.sql`e.course_id = ${filters.courseId}`);
    }
    if (filters.batchId && filters.batchId > 0) {
      conditions.push(Prisma.sql`e.batch_id = ${filters.batchId}`);
    }

    const where = Prisma.join(conditions, ' AND ');

    return this.queryMany(Prisma.sql`
      SELECT e.*,
        c.title AS course_title,
        b.title AS batch_title,
        (SELECT COUNT(*) FROM exam_attempt ea2 WHERE ea2.exam_id = e.id AND ea2.submit_status = 1 AND ea2.deleted_at IS NULL) AS total_attempts,
        (SELECT COUNT(*) FROM exam_attempt ea3 WHERE ea3.exam_id = e.id AND ea3.submit_status = 1 AND ea3.deleted_at IS NULL AND ea3.score < (COALESCE(e.mark, 0) * 0.4)) AS failed_count
      FROM exam e
      LEFT JOIN course c ON c.id = e.course_id
      LEFT JOIN batch b ON b.id = e.batch_id
      WHERE ${where}
      ORDER BY e.id DESC
    `);
  }

  async grantReExam(actorUserId: number, examId: number, userIds: number[]): Promise<Record<string, unknown>> {
    if (userIds.length === 0) {
      return { status: 0, message: 'No students selected.' };
    }

    const now = new Date().toISOString();

    for (const userId of userIds) {
      await this.prisma.$executeRaw(Prisma.sql`
        UPDATE exam_attempt SET deleted_by = ${actorUserId}, deleted_at = ${now}
        WHERE exam_id = ${examId} AND user_id = ${userId} AND submit_status = 1 AND deleted_at IS NULL
      `);
    }

    return { status: 1, message: `Re-exam granted to ${userIds.length} student(s).` };
  }

  // ─── Phase 2: Entrance Exams ───────────────────────────────────────────────

  async listEntranceExams(): Promise<SqlRow[]> {
    return this.queryMany(Prisma.sql`
      SELECT ee.*,
        c.title AS course_title,
        (SELECT COUNT(*) FROM entrance_exam_registration eer WHERE eer.entrance_exam_id = ee.id AND eer.deleted_at IS NULL) AS registration_count
      FROM entrance_exam ee
      LEFT JOIN course c ON c.id = ee.course_id
      WHERE ee.deleted_at IS NULL
      ORDER BY ee.id DESC
    `);
  }

  async addEntranceExam(actorUserId: number, input: EntranceExamInput): Promise<Record<string, unknown>> {
    if (!input.title.trim()) {
      return { status: 0, message: 'Entrance exam title is required.' };
    }

    const now = new Date().toISOString();

    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO entrance_exam (
        title, description, total_marks, duration,
        exam_date, from_time, to_time,
        course_id, status, question_ids,
        created_by, created_at, updated_at
      ) VALUES (
        ${input.title}, ${input.description ?? null}, ${input.totalMarks ?? 0},
        ${input.duration ?? null}, ${input.examDate ?? null},
        ${input.fromTime ?? null}, ${input.toTime ?? null},
        ${input.courseId}, ${input.status ?? 'draft'}, ${input.questionIds ?? '[]'},
        ${actorUserId}, ${now}, ${now}
      )
    `);

    return { status: 1, message: 'Entrance exam created successfully.' };
  }

  async editEntranceExam(actorUserId: number, examId: number, input: EntranceExamInput): Promise<Record<string, unknown>> {
    if (!input.title.trim()) {
      return { status: 0, message: 'Entrance exam title is required.' };
    }

    const now = new Date().toISOString();

    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE entrance_exam SET
        title = ${input.title}, description = ${input.description ?? null},
        total_marks = ${input.totalMarks ?? 0}, duration = ${input.duration ?? null},
        exam_date = ${input.examDate ?? null},
        from_time = ${input.fromTime ?? null}, to_time = ${input.toTime ?? null},
        course_id = ${input.courseId}, status = ${input.status ?? 'draft'},
        question_ids = ${input.questionIds ?? '[]'},
        updated_by = ${actorUserId}, updated_at = ${now}
      WHERE id = ${examId} AND deleted_at IS NULL
    `);

    return { status: 1, message: 'Entrance exam updated successfully.' };
  }

  async deleteEntranceExam(actorUserId: number, examId: number): Promise<Record<string, unknown>> {
    const now = new Date().toISOString();

    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE entrance_exam SET deleted_by = ${actorUserId}, deleted_at = ${now}
      WHERE id = ${examId} AND deleted_at IS NULL
    `);

    return { status: 1, message: 'Entrance exam deleted successfully.' };
  }

  async listEntranceExamRegistrations(examId?: number): Promise<SqlRow[]> {
    const conditions = [Prisma.sql`eer.deleted_at IS NULL`];

    if (examId && examId > 0) {
      conditions.push(Prisma.sql`eer.entrance_exam_id = ${examId}`);
    }

    const where = Prisma.join(conditions, ' AND ');

    return this.queryMany(Prisma.sql`
      SELECT eer.*, ee.title AS exam_title, c.title AS course_title
      FROM entrance_exam_registration eer
      LEFT JOIN entrance_exam ee ON ee.id = eer.entrance_exam_id
      LEFT JOIN course c ON c.id = eer.course_id
      WHERE ${where}
      ORDER BY eer.id DESC
    `);
  }

  async listEntranceExamResults(examId?: number): Promise<SqlRow[]> {
    const conditions = [Prisma.sql`res.deleted_at IS NULL`];

    if (examId && examId > 0) {
      conditions.push(Prisma.sql`res.entrance_exam_id = ${examId}`);
    }

    const where = Prisma.join(conditions, ' AND ');

    return this.queryMany(Prisma.sql`
      SELECT res.*, reg.name, reg.email, reg.phone,
        ee.title AS exam_title
      FROM entrance_exam_result res
      LEFT JOIN entrance_exam_registration reg ON reg.id = res.registration_id
      LEFT JOIN entrance_exam ee ON ee.id = res.entrance_exam_id
      WHERE ${where}
      ORDER BY res.score DESC
    `);
  }

  // ─── Phase 3: Operations & People ───────────────────────────────────────────

  async listInstructors(): Promise<SqlRow[]> {
    return this.queryMany(Prisma.sql`
      SELECT
        u.id, u.name, u.user_email, u.phone, u.status, u.created_at,
        GROUP_CONCAT(DISTINCT c.title) AS assigned_courses,
        (SELECT COUNT(*) FROM cohorts ch WHERE ch.instructor_id = u.id AND ch.deleted_at IS NULL) AS cohort_count
      FROM users u
      LEFT JOIN instructor_enrol ie ON ie.instructor_id = u.id AND ie.deleted_at IS NULL
      LEFT JOIN course c ON c.id = ie.course_id AND c.deleted_at IS NULL
      WHERE u.role_id = 3 AND u.deleted_at IS NULL
      GROUP BY u.id
      ORDER BY u.id DESC
    `);
  }

  async listUsersByRole(roleId: number): Promise<SqlRow[]> {
    return this.queryMany(Prisma.sql`
      SELECT u.id, u.name, u.user_email, u.phone, u.status, u.created_at, u.updated_at
      FROM users u
      WHERE u.role_id = ${roleId} AND u.deleted_at IS NULL
      ORDER BY u.id DESC
    `);
  }

  async addAdminCohort(actorUserId: number, input: AdminCohortInput): Promise<Record<string, unknown>> {
    if (!input.title.trim()) {
      return { status: 0, message: 'Cohort title is required.' };
    }

    const cohortCode = input.cohortCode?.trim() || `COH-${Date.now()}`;
    const now = new Date().toISOString();

    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO cohorts (
        title, cohort_id, course_id, subject_id, centre_id, instructor_id,
        start_date, end_date, created_by, created_at, updated_at
      ) VALUES (
        ${input.title}, ${cohortCode}, ${input.courseId}, ${input.subjectId},
        ${input.centreId}, ${input.instructorId},
        ${input.startDate || null}, ${input.endDate || null},
        ${actorUserId}, ${now}, ${now}
      )
    `);

    return { status: 1, message: 'Cohort created successfully.' };
  }

  async listCourseFees(): Promise<SqlRow[]> {
    return this.queryMany(Prisma.sql`
      SELECT
        c.id AS course_id,
        c.title AS course_title,
        c.price,
        c.sale_price,
        COUNT(DISTINCT sf.user_id) AS students_with_fees,
        COALESCE(SUM(sf.amount), 0) AS total_fee_amount,
        COALESCE(SUM(CASE WHEN sf.status = 'paid' THEN sf.amount ELSE 0 END), 0) AS paid_amount,
        COALESCE(SUM(CASE WHEN sf.status != 'paid' OR sf.status IS NULL THEN sf.amount ELSE 0 END), 0) AS pending_amount,
        (SELECT COUNT(DISTINCT pi.user_id) FROM payment_info pi WHERE pi.course_id = c.id AND pi.deleted_at IS NULL) AS payments_count,
        (SELECT COALESCE(SUM(pi.amount_paid), 0) FROM payment_info pi WHERE pi.course_id = c.id AND pi.deleted_at IS NULL) AS total_collected
      FROM course c
      LEFT JOIN student_fee sf ON sf.course_id = c.id AND sf.deleted_at IS NULL
      WHERE c.deleted_at IS NULL
      GROUP BY c.id
      ORDER BY c.id DESC
    `);
  }

  async listFeeInstallments(filters: FeeInstallmentFilters): Promise<SqlRow[]> {
    return this.queryMany(Prisma.sql`
      SELECT
        sf.id, sf.user_id, sf.course_id, sf.amount, sf.due_date, sf.status, sf.created_at,
        u.name AS student_name, u.student_id, u.phone,
        c.title AS course_title
      FROM student_fee sf
      LEFT JOIN users u ON u.id = sf.user_id
      LEFT JOIN course c ON c.id = sf.course_id
      WHERE sf.deleted_at IS NULL
        AND (${(filters.courseId ?? 0) > 0 ? Prisma.sql`sf.course_id = ${filters.courseId ?? 0}` : Prisma.sql`1 = 1`})
        AND (${filters.status ? Prisma.sql`sf.status = ${filters.status}` : Prisma.sql`1 = 1`})
      ORDER BY sf.due_date DESC, sf.id DESC
    `);
  }

  async listPaymentStatus(filters: AdminPaymentFilters): Promise<Record<string, unknown>> {
    const range = normalizeReportRange(filters.fromDate, filters.toDate);

    const dateConditions = [Prisma.sql`p.deleted_at IS NULL`];
    if (filters.fromDate) {
      dateConditions.push(Prisma.sql`DATE(p.payment_date) >= ${range.fromDate}`);
    }
    if (filters.toDate) {
      dateConditions.push(Prisma.sql`DATE(p.payment_date) <= ${range.toDate}`);
    }
    if ((filters.courseId ?? 0) > 0) {
      dateConditions.push(Prisma.sql`p.course_id = ${filters.courseId ?? 0}`);
    }

    const where = Prisma.join(dateConditions, ' AND ');

    const [summaryRow, payments] = await Promise.all([
      this.queryOne(Prisma.sql`
        SELECT
          COUNT(*) AS total_payments,
          COUNT(DISTINCT p.user_id) AS unique_students,
          COALESCE(SUM(p.amount_paid), 0) AS total_collected,
          COALESCE(AVG(p.amount_paid), 0) AS avg_payment
        FROM payment_info p
        WHERE ${where}
      `),
      this.queryMany(Prisma.sql`
        SELECT p.*, u.name AS user_name, u.student_id, c.title AS course_title
        FROM payment_info p
        LEFT JOIN users u ON u.id = p.user_id
        LEFT JOIN course c ON c.id = p.course_id
        WHERE ${where}
        ORDER BY p.id DESC
      `),
    ]);

    return {
      summary: summaryRow ?? { total_payments: 0, unique_students: 0, total_collected: 0, avg_payment: 0 },
      payments,
    };
  }

  async listCohortAttendance(filters: CohortAttendanceFilters): Promise<SqlRow[]> {
    return this.queryMany(Prisma.sql`
      SELECT
        zh.id, zh.user_id, zh.live_id, zh.join_date, zh.join_time, zh.leave_time, zh.duration,
        u.name AS student_name, u.student_id,
        lc.title AS session_title, lc.date AS session_date,
        ch.title AS cohort_title, c.title AS course_title
      FROM zoom_history zh
      LEFT JOIN users u ON u.id = zh.user_id
      LEFT JOIN live_class lc ON lc.id = zh.live_id
      LEFT JOIN cohorts ch ON ch.id = lc.cohort_id
      LEFT JOIN course c ON c.id = ch.course_id
      WHERE zh.deleted_at IS NULL
        AND (${(filters.cohortId ?? 0) > 0 ? Prisma.sql`lc.cohort_id = ${filters.cohortId ?? 0}` : Prisma.sql`1 = 1`})
      ORDER BY zh.join_date DESC, zh.id DESC
    `);
  }

  async listScholarships(): Promise<SqlRow[]> {
    return this.queryMany(Prisma.sql`
      SELECT
        cc.id, cc.code, cc.discount_perc, cc.total_no, cc.per_user_no,
        cc.validity, cc.start_date, cc.end_date, cc.created_at,
        cp.title AS package_title
      FROM coupon_code cc
      LEFT JOIN course_package cp ON cp.id = cc.package_id
      WHERE cc.deleted_at IS NULL
      ORDER BY cc.id DESC
    `);
  }

  // ─── Phase 4: CRM & Content ─────────────────────────────────────────────────

  async listCounsellors(): Promise<SqlRow[]> {
    return this.queryMany(Prisma.sql`
      SELECT
        u.id, u.name, u.user_email, u.phone, u.status, u.centre_id, u.created_at,
        ct.centre_name,
        (SELECT COUNT(*) FROM applications a WHERE a.pipeline_user = u.id AND a.deleted_at IS NULL) AS applications_referred,
        (SELECT COUNT(*) FROM applications a WHERE a.pipeline_user = u.id AND a.is_converted = 1 AND a.deleted_at IS NULL) AS applications_converted
      FROM users u
      LEFT JOIN centres ct ON ct.id = u.centre_id
      WHERE u.role_id = 9 AND u.deleted_at IS NULL
      ORDER BY u.id DESC
    `);
  }

  async listCounsellorTargets(): Promise<SqlRow[]> {
    return this.queryMany(Prisma.sql`
      SELECT
        t.id, t.user_id, t.period, t.target_type, t.target_value, t.achieved_value,
        t.remarks, t.created_at,
        u.name AS counsellor_name, u.user_email AS counsellor_email
      FROM counsellor_target t
      LEFT JOIN users u ON u.id = t.user_id
      WHERE t.deleted_at IS NULL
      ORDER BY t.period DESC, t.id DESC
    `);
  }

  async listAssociates(): Promise<SqlRow[]> {
    return this.queryMany(Prisma.sql`
      SELECT
        u.id, u.name, u.user_email, u.phone, u.status, u.centre_id, u.created_at,
        ct.centre_name,
        (SELECT COUNT(*) FROM applications a WHERE a.pipeline_user = u.id AND a.deleted_at IS NULL) AS applications_referred,
        (SELECT COUNT(*) FROM applications a WHERE a.pipeline_user = u.id AND a.is_converted = 1 AND a.deleted_at IS NULL) AS applications_converted
      FROM users u
      LEFT JOIN centres ct ON ct.id = u.centre_id
      WHERE u.role_id = 10 AND u.deleted_at IS NULL
      ORDER BY u.id DESC
    `);
  }

  async listAssociateTargets(): Promise<SqlRow[]> {
    return this.queryMany(Prisma.sql`
      SELECT
        t.id, t.user_id, t.period, t.target_type, t.target_value, t.achieved_value,
        t.remarks, t.created_at,
        u.name AS associate_name, u.user_email AS associate_email
      FROM associate_target t
      LEFT JOIN users u ON u.id = t.user_id
      WHERE t.deleted_at IS NULL
      ORDER BY t.period DESC, t.id DESC
    `);
  }

  async listDocumentRequests(): Promise<SqlRow[]> {
    return this.queryMany(Prisma.sql`
      SELECT
        dr.id, dr.student_id, dr.document_type, dr.status, dr.remarks, dr.created_at,
        u.name AS student_name, u.student_id AS student_code, u.user_email AS student_email
      FROM document_request dr
      LEFT JOIN users u ON u.id = dr.student_id
      WHERE dr.deleted_at IS NULL
      ORDER BY dr.id DESC
    `);
  }

  async listDocumentsIssued(): Promise<SqlRow[]> {
    return this.queryMany(Prisma.sql`
      SELECT
        dr.id, dr.student_id, dr.document_type, dr.status, dr.remarks, dr.created_at, dr.updated_at,
        u.name AS student_name, u.student_id AS student_code, u.user_email AS student_email,
        cb.name AS issued_by_name
      FROM document_request dr
      LEFT JOIN users u ON u.id = dr.student_id
      LEFT JOIN users cb ON cb.id = dr.updated_by
      WHERE dr.deleted_at IS NULL
        AND dr.status IN (${'issued'}, ${'delivered'})
      ORDER BY dr.updated_at DESC, dr.id DESC
    `);
  }

  async listDocumentsDelivery(): Promise<SqlRow[]> {
    return this.queryMany(Prisma.sql`
      SELECT
        dr.id, dr.student_id, dr.document_type, dr.status, dr.tracking_number,
        dr.courier_name, dr.dispatch_date, dr.delivery_date, dr.delivery_address,
        dr.created_at, dr.updated_at,
        u.name AS student_name, u.student_id AS student_code
      FROM document_request dr
      LEFT JOIN users u ON u.id = dr.student_id
      WHERE dr.deleted_at IS NULL
        AND dr.status IN (${'issued'}, ${'delivered'})
        AND (dr.tracking_number IS NOT NULL OR dr.dispatch_date IS NOT NULL)
      ORDER BY dr.dispatch_date DESC, dr.id DESC
    `);
  }

  async listAdminEvents(): Promise<SqlRow[]> {
    return this.queryMany(Prisma.sql`
      SELECT
        e.id, e.title, e.description, e.event_date, e.from_time, e.to_time,
        e.image, e.objectives, e.duration, e.is_recording_available, e.created_at,
        u.name AS instructor_name,
        (SELECT COUNT(*) FROM event_registration er WHERE er.event_id = e.id AND er.deleted_at IS NULL) AS registration_count
      FROM events e
      LEFT JOIN users u ON u.id = e.instructor_id
      WHERE e.deleted_at IS NULL
      ORDER BY e.event_date DESC, e.id DESC
    `);
  }

  async listCirculars(): Promise<SqlRow[]> {
    return this.queryMany(Prisma.sql`
      SELECT
        c.id, c.title, c.content, c.target_audience, c.status,
        c.publish_date, c.expiry_date, c.attachment, c.created_at,
        u.name AS created_by_name
      FROM circular c
      LEFT JOIN users u ON u.id = c.created_by
      WHERE c.deleted_at IS NULL
      ORDER BY c.id DESC
    `);
  }

  async listMentorshipHistory(): Promise<SqlRow[]> {
    return this.queryMany(Prisma.sql`
      SELECT
        ms.id, ms.student_id, ms.mentor_type, ms.topic, ms.summary,
        ms.messages_count, ms.duration_minutes, ms.satisfaction_rating, ms.created_at,
        u.name AS student_name, u.student_id AS student_code, u.user_email AS student_email
      FROM mentorship_session ms
      LEFT JOIN users u ON u.id = ms.student_id
      WHERE ms.deleted_at IS NULL
      ORDER BY ms.created_at DESC, ms.id DESC
    `);
  }

  async mentorshipAnalysis(): Promise<Record<string, unknown>> {
    const totalSessions = await this.count(Prisma.sql`
      SELECT COUNT(*) AS count FROM mentorship_session WHERE deleted_at IS NULL
    `);

    const aiSessions = await this.count(Prisma.sql`
      SELECT COUNT(*) AS count FROM mentorship_session WHERE deleted_at IS NULL AND mentor_type = ${'ai'}
    `);

    const avgDuration = await this.queryOne(Prisma.sql`
      SELECT COALESCE(AVG(duration_minutes), 0) AS avg_duration
      FROM mentorship_session
      WHERE deleted_at IS NULL AND duration_minutes > 0
    `);

    const avgRating = await this.queryOne(Prisma.sql`
      SELECT COALESCE(AVG(satisfaction_rating), 0) AS avg_rating
      FROM mentorship_session
      WHERE deleted_at IS NULL AND satisfaction_rating IS NOT NULL
    `);

    const topicBreakdown = await this.queryMany(Prisma.sql`
      SELECT
        COALESCE(topic, 'General') AS topic,
        COUNT(*) AS session_count,
        COALESCE(AVG(duration_minutes), 0) AS avg_duration,
        COALESCE(AVG(satisfaction_rating), 0) AS avg_rating
      FROM mentorship_session
      WHERE deleted_at IS NULL
      GROUP BY topic
      ORDER BY session_count DESC
    `);

    return {
      totalSessions,
      aiSessions,
      humanSessions: totalSessions - aiSessions,
      avgDuration: toDbNumber(avgDuration?.avg_duration),
      avgRating: toDbNumber(avgRating?.avg_rating),
      topicBreakdown,
    };
  }

  // ── Phase 5: Integrations & Polish ──────────────────────────────

  async listAdminSupportChats(): Promise<SqlRow[]> {
    return this.queryMany(Prisma.sql`
      SELECT
        sc.chat_id,
        u.name AS user_name,
        u.user_email,
        COUNT(sc.id) AS message_count,
        MAX(sc.created_at) AS last_message_at,
        MIN(sc.created_at) AS first_message_at
      FROM support_chat sc
      LEFT JOIN users u ON u.id = sc.chat_id
      WHERE sc.deleted_at IS NULL
      GROUP BY sc.chat_id
      ORDER BY last_message_at DESC
    `);
  }

  async listAdminTrainingVideos(): Promise<SqlRow[]> {
    return this.queryMany(Prisma.sql`
      SELECT id, title, description, category, video_type, video_url, thumbnail, created_at
      FROM training_videos
      WHERE deleted_at IS NULL
      ORDER BY id DESC
    `);
  }

  async listAdminEnrollments(): Promise<SqlRow[]> {
    return this.queryMany(Prisma.sql`
      SELECT
        e.id, e.enrollment_id, e.enrollment_status, e.enrollment_date,
        e.mode_of_study, e.preferred_language, e.discount_perc, e.created_at,
        u.name AS student_name, u.user_email AS student_email,
        c.title AS course_title,
        b.title AS batch_title
      FROM enrol e
      LEFT JOIN users u ON u.id = e.user_id
      LEFT JOIN course c ON c.id = e.course_id
      LEFT JOIN batch b ON b.id = e.batch_id
      WHERE e.deleted_at IS NULL
      ORDER BY e.id DESC
    `);
  }

  async listAdminFeeds(): Promise<SqlRow[]> {
    return this.queryMany(Prisma.sql`
      SELECT
        f.id, f.title, f.content, f.image, f.created_at,
        u.name AS instructor_name,
        c.title AS course_title,
        (SELECT COUNT(*) FROM feed_watched fw WHERE fw.feed_id = f.id AND fw.deleted_at IS NULL) AS watch_count,
        (SELECT COUNT(*) FROM feed_like fl WHERE fl.feed_id = f.id AND fl.deleted_at IS NULL) AS like_count,
        (SELECT COUNT(*) FROM feed_comments fc WHERE fc.feed_id = f.id AND fc.deleted_at IS NULL) AS comment_count
      FROM feed f
      LEFT JOIN users u ON u.id = f.instructor_id
      LEFT JOIN course c ON c.id = f.course_id
      WHERE f.deleted_at IS NULL
      ORDER BY f.id DESC
    `);
  }

  async listIntegrationSettings(): Promise<SqlRow[]> {
    return this.queryMany(Prisma.sql`
      SELECT key, value
      FROM settings
      WHERE deleted_at IS NULL
        AND (
          key LIKE '%api%' OR key LIKE '%provider%' OR key LIKE '%gateway%'
          OR key LIKE '%secret%' OR key LIKE '%smtp%' OR key LIKE '%firebase%'
          OR key LIKE '%zoom%' OR key LIKE '%razorpay%' OR key LIKE '%whatsapp%'
          OR key LIKE '%sms%' OR key LIKE '%email%' OR key LIKE '%payment%'
        )
      ORDER BY key ASC
    `);
  }

  async listAdminReviews(): Promise<SqlRow[]> {
    return this.queryMany(Prisma.sql`
      SELECT
        r.id, r.rating, r.review, r.item_type, r.created_at,
        u.name AS user_name, u.user_email,
        c.title AS course_title,
        (SELECT COUNT(*) FROM review_like rl WHERE rl.review_id = r.id AND rl.deleted_at IS NULL) AS like_count
      FROM review r
      LEFT JOIN users u ON u.id = r.user_id
      LEFT JOIN course c ON c.id = r.course_id
      WHERE r.deleted_at IS NULL
      ORDER BY r.id DESC
    `);
  }

  async listLanguages(): Promise<SqlRow[]> {
    return this.queryMany(Prisma.sql`
      SELECT id, title, code, status, created_at
      FROM language
      WHERE deleted_at IS NULL
      ORDER BY id ASC
    `);
  }
}
