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
}
