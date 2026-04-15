import { type PrismaClient } from '@prisma/client';

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
  courseId?: string;
  listBy?: string;
  centreId?: string;
  search?: string;
  status?: string;
};

export type AdminApplicationInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;
  maritalStatus?: string;
  fatherName?: string;
  motherName?: string;
  guardianName?: string;
  aadharNo?: string;
  passportNo?: string;
  whatsappNo?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  permanentAddress?: string;
  correspondenceAddress?: string;
  highestQualification?: string;
  specialization?: string;
  institutionName?: string;
  yearOfPassing?: string;
  percentageOrCgpa?: string;
  workExperience?: string;
  currentOccupation?: string;
  employmentStatus?: string;
  courseId?: string;
  centreId?: string;
  batchId?: string;
  offeringId?: string;
  enrollmentDate?: string;
  modeOfStudy?: string;
  language?: string;
  pipeline?: string;
  pipelineUser?: string;
  discount?: string;
  gstApplicability?: string;
  leadSource?: string;
  applicationStatus?: string;
  notes?: string;
  crmTags?: string;
};

export type CentreApplicationInput = {
  applicationId?: string;
  name: string;
  countryCode: string;
  phone: string;
  email: string;
  courseId: string;
  pipeline: string;
  pipelineUser: string;
  status: string;
};

export type StudentFilters = {
  courseId?: string;
  centreId?: string;
  batchId?: string;
  search?: string;
  status?: string;
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
  centreId: string;
  courseId: string;
  assignedAmount: number;
  startDate: string;
  endDate: string;
};

export type CohortInput = {
  title: string;
  cohortCode?: string;
  courseId: string;
  subjectId: string;
  instructorId: string;
  startDate: string;
  endDate: string;
};

export type AddCohortStudentsInput = {
  cohortId: string;
  studentIds: string[];
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
  cohortId: string;
  zoomId: string;
  password: string;
  entries: LiveClassEntryInput[];
};

export type ResourceListInput = {
  folderId: string;
  centreId?: string;
};

export type AddFolderInput = {
  parentId: string;
  name: string;
  centreId?: string;
};

export type AddFileInput = {
  folderId: string;
  name: string;
  fileType: string;
  size: number;
  path: string;
  centreId?: string;
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
  liveId?: string;
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
  courseId?: string;
  status?: string;
};

export type FaqInput = {
  question: string;
  answer?: string;
  status?: string;
};

export type AdminCohortFilters = {
  courseId?: string;
  subjectId?: string;
  centreId?: string;
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
  courseId?: string;
};

export type AdminWalletFilters = {
  centreId?: string;
  centreName?: string;
};

// ─── Phase D: Centres Feature Input Types ────────────────────────────────────

export type UpdateCentreInput = {
  centreName?: string;
  centreCode?: string;
  centreType?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  googleMapsLink?: string;
  affiliationNumber?: string;
  affiliationDate?: string;
  affiliationDocument?: string;
  recognitionStatus?: string;
  description?: string;
  status?: string;
  logo?: string;
  establishedDate?: string;
  registrationDate?: string;
  expiryDate?: string;
};

export type TrainingVideoInput = {
  title: string;
  category?: string;
  videoType?: string;
  videoUrl?: string;
  thumbnail?: string;
  description?: string;
  status?: string;
};

// ─── Phase 3: Operations & People Input Types ────────────────────────────────

export type AdminCohortInput = {
  title: string;
  cohortCode?: string;
  courseId?: string;
  subjectId?: string;
  centreId?: string;
  instructorId?: string;
  startDate: string;
  endDate: string;
};

export type FeeInstallmentFilters = {
  courseId?: string;
  status?: string;
};

export type CohortAttendanceFilters = {
  cohortId?: string;
};

// ─── Phase 2: Exam & Assessment Input Types ──────────────────────────────────

export type QuestionBankFilters = {
  courseId?: string;
  subjectId?: string;
  lessonId?: string;
  qType?: number;
};

export type QuestionBankInput = {
  courseId: string;
  subjectId?: string;
  lessonId?: string;
  categoryId?: string;
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
  courseId?: string;
  subjectId?: string;
  batchId?: string;
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
  courseId: string;
  subjectId?: string;
  lessonId?: string;
  batchId?: string;
  free?: string;
  publishResult?: number;
  isPractice?: number;
  questionIds?: string[];
};

export type AdminAssignmentFilters = {
  courseId?: string;
  cohortId?: string;
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
  courseId: string;
  cohortId?: string;
};

export type AdminExamResultFilters = {
  examId?: string;
  courseId?: string;
  batchId?: string;
};

export type AdminExamEvaluationFilters = {
  examId?: string;
  courseId?: string;
};

export type AdminReExamFilters = {
  courseId?: string;
  batchId?: string;
};

export type EntranceExamInput = {
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
};

export type AddInstructorInput = {
  name: string;
  email: string;
  phone?: string;
  bio?: string;
  status?: number;
};

export type AddUserInput = {
  name: string;
  email: string;
  phone?: string;
  password: string;
  roleId: number;
};

export type AddTargetInput = {
  userId: string;
  targetType: string;
  targetValue: number;
  periodFrom: string;
  periodTo: string;
  remarks?: string;
};

export type AddAssociateInput = {
  name: string;
  email: string;
  phone?: string;
  status?: number;
};

function normalizeSqlRow(row: SqlRow): SqlRow {
  const normalized: SqlRow = {};

  for (const [key, value] of Object.entries(row)) {
    normalized[key] = typeof value === 'bigint' ? Number(value) : value;
  }

  return normalized;
}

function toIntId(id: string | number | null | undefined): number {
  if (typeof id === 'number') return id;
  if (!id) return 0;
  const n = parseInt(String(id), 10);
  return Number.isFinite(n) ? n : 0;
}

function toNullableIntId(id: string | number | null | undefined): number | null {
  if (id === null || id === undefined || id === '') return null;
  if (typeof id === 'number') return id;
  const n = parseInt(String(id), 10);
  return Number.isFinite(n) ? n : null;
}

export class OperationsService {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  private async currentUser(userId: string): Promise<SqlRow | null> {
    if (!userId) {
      return null;
    }

    const user = await this.prisma.users.findFirst({
      where: { id: toIntId(userId), deleted_at: null },
      select: { id: true, role_id: true, name: true, user_email: true, centre_id: true, course_id: true },
    });

    return user ? normalizeSqlRow(user as unknown as SqlRow) : null;
  }

  private async resolveActorCentreId(userId: string): Promise<string> {
    const user = await this.currentUser(userId);
    return toStringValue(user?.centre_id);
  }

  private async resolveSupportRecipientId(): Promise<string> {
    const admin = await this.prisma.users.findFirst({
      where: { role_id: 1, deleted_at: null },
      orderBy: { id: 'asc' },
      select: { id: true },
    });

    return admin ? String(admin.id) : '';
  }

  private async nextStudentCode(tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>): Promise<string> {
    const latestStudent = await tx.users.findFirst({
      where: {
        role_id: 2,
        deleted_at: null,
        student_id: { startsWith: 'TTS' },
      },
      orderBy: { id: 'desc' },
      select: { student_id: true },
    });

    const current = toStringValue(latestStudent?.student_id);
    const match = current.match(/(\d+)$/);
    const nextNumber = (match ? Number.parseInt(match[1] ?? '0', 10) : 0) + 1;

    return `TTS${String(nextNumber).padStart(4, '0')}`;
  }

  async listPipelineUsers(roleId: number): Promise<SqlRow[]> {
    if (roleId <= 0) {
      return [];
    }

    const users = await this.prisma.users.findMany({
      where: { role_id: roleId, deleted_at: null },
      select: { id: true, name: true, user_email: true, phone: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });

    return users as unknown as SqlRow[];
  }

  async listAdminApplications(filters: AdminApplicationFilters): Promise<Record<string, unknown>> {
    const range = normalizeReportRange(filters.fromDate, filters.toDate);

    const where: Record<string, unknown> = {
      deleted_at: null,
      is_converted: 0,
    };

    if (filters.fromDate) {
      where.created_at = { ...(where.created_at as Record<string, unknown> ?? {}), gte: new Date(`${range.fromDate}T00:00:00Z`) };
    }
    if (filters.toDate) {
      where.created_at = { ...(where.created_at as Record<string, unknown> ?? {}), lte: new Date(`${range.toDate}T23:59:59Z`) };
    }
    if ((filters.pipelineRoleId ?? 0) > 0) {
      where.pipeline = String(filters.pipelineRoleId);
    }
    if (filters.courseId) {
      where.course_id = toIntId(filters.courseId);
    }
    if ((filters.listBy ?? '').trim() !== '') {
      where.status = filters.listBy;
    }
    if ((filters.status ?? '').trim() !== '') {
      where.status = filters.status;
    }
    if (filters.centreId) {
      where.added_under_centre = toIntId(filters.centreId);
    }
    if ((filters.search ?? '').trim() !== '') {
      const q = filters.search!.trim();
      where.OR = [
        { name: { contains: q } },
        { phone: { contains: q } },
        { email: { contains: q } },
        { user_email: { contains: q } },
        { application_id: { contains: q } },
      ];
    }

    const apps = await this.prisma.applications.findMany({
      where: where as any,
      orderBy: { id: 'desc' },
    });

    // LEFT JOIN: courses, users (pipeline), centres
    const courseIds = [...new Set(apps.map(a => a.course_id).filter((x): x is number => x !== null && x !== undefined))];
    const pipelineUserIds = [...new Set(apps.map(a => a.pipeline_user).filter((x): x is number => x !== null && x !== undefined))];
    const centreIds = [...new Set(apps.map(a => a.added_under_centre).filter((x): x is number => x !== null && x !== undefined))];

    const [courses, pipelineUsers, centres, allCourses, allCentres] = await Promise.all([
      courseIds.length > 0 ? this.prisma.course.findMany({ where: { id: { in: courseIds } } }) : [],
      pipelineUserIds.length > 0 ? this.prisma.users.findMany({ where: { id: { in: pipelineUserIds } }, select: { id: true, name: true } }) : [],
      centreIds.length > 0 ? this.prisma.centres.findMany({ where: { id: { in: centreIds } }, select: { id: true, centre_name: true } }) : [],
      this.prisma.course.findMany({ where: { deleted_at: null }, select: { id: true, title: true }, orderBy: { title: 'asc' } }),
      this.prisma.centres.findMany({ where: { deleted_at: null }, select: { id: true, centre_name: true }, orderBy: { centre_name: 'asc' } }),
    ]);

    const courseMap = new Map(courses.map(c => [c.id, c]));
    const pipelineUserMap = new Map(pipelineUsers.map(u => [u.id, u]));
    const centreMap = new Map(centres.map(c => [c.id, c]));

    const applications = apps.map(a => ({
      ...a,
      course_title: a.course_id ? courseMap.get(a.course_id)?.title ?? null : null,
      pipeline_user_name: a.pipeline_user ? pipelineUserMap.get(a.pipeline_user)?.name ?? null : null,
      centre_name: a.added_under_centre ? centreMap.get(a.added_under_centre)?.centre_name ?? null : null,
    }));

    const rejectedCount = applications.filter((item) => toStringValue(item.status) === 'rejected').length;
    const pendingCount = applications.filter((item) => toStringValue(item.status) === 'pending').length;

    return {
      students: applications,
      rejected_count: rejectedCount,
      pending_count: pendingCount,
      courses: allCourses,
      centres: allCentres,
    };
  }

  async listCentreApplications(actorUserId: string, listBy?: string): Promise<Record<string, unknown>> {
    const centreId = await this.resolveActorCentreId(actorUserId);
    if (!centreId) {
      return {
        students: [],
        pending_count: 0,
        rejected_count: 0,
      };
    }

    const where: Record<string, unknown> = {
      deleted_at: null,
      is_converted: 0,
      OR: [
        { added_under_centre: toIntId(centreId) },
        { created_by: toIntId(actorUserId) },
      ],
    };

    if ((listBy ?? '').trim() !== '') {
      where.status = listBy;
    }

    const apps = await this.prisma.applications.findMany({
      where: where as any,
      orderBy: { id: 'desc' },
    });

    // LEFT JOIN: courses
    const courseIds = [...new Set(apps.map(a => a.course_id).filter((x): x is number => x !== null && x !== undefined))];
    const courses = courseIds.length > 0 ? await this.prisma.course.findMany({ where: { id: { in: courseIds } } }) : [];
    const courseMap = new Map(courses.map(c => [c.id, c]));

    const applications = apps.map(a => ({
      ...a,
      course_title: a.course_id ? courseMap.get(a.course_id)?.title ?? null : null,
    }));

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

  async getCentreDashboard(actorUserId: string): Promise<Record<string, unknown>> {
    const centreId = await this.resolveActorCentreId(actorUserId);
    if (!centreId) {
      return {
        students: 0,
        wallet_balance: 0,
        active_cohorts: 0,
        pending_applications: 0,
        recent_students: [],
      };
    }

    const centreIdNum = Number(centreId);

    const [studentsCount, activeCohortsCount, pendingApplicationsCount, centre, recentStudentRows] = await Promise.all([
      this.prisma.users.count({ where: { role_id: 2, added_under_centre: centreIdNum, deleted_at: null } }),
      this.prisma.cohorts.count({ where: { centre_id: centreId, deleted_at: null } }),
      this.prisma.applications.count({ where: { added_under_centre: centreIdNum, is_converted: 0, deleted_at: null } }),
      this.prisma.centres.findFirst({
        where: { id: centreId, deleted_at: null },
        select: { id: true, centre_id: true, centre_name: true, wallet_balance: true },
      }),
      this.prisma.users.findMany({
        where: { role_id: 2, added_under_centre: centreIdNum, deleted_at: null },
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        take: 3,
        select: { id: true, student_id: true, name: true, created_at: true, course_id: true },
      }),
    ]);

    // LEFT JOIN courses for recent students
    const courseIds = [...new Set(recentStudentRows.map(s => s.course_id).filter(Boolean))] as string[];
    const courses = courseIds.length > 0 ? await this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } }) : [];
    const courseMap = new Map(courses.map(c => [c.id, c]));

    return {
      students: studentsCount,
      wallet_balance: toDbNumber(centre?.wallet_balance),
      active_cohorts: activeCohortsCount,
      pending_applications: pendingApplicationsCount,
      recent_students: recentStudentRows.map((entry) => ({
        id: entry.id,
        student_id: toStringValue(entry.student_id),
        student_name: toStringValue(entry.name),
        course_name: entry.course_id ? courseMap.get(entry.course_id)?.title ?? '' : '',
        enrollment_date: toStringValue(entry.created_at),
      })),
      centre: centre
        ? {
            id: centre.id,
            centre_id: toInteger(centre.centre_id),
            centre_name: toStringValue(centre.centre_name),
          }
        : null,
    };
  }

  async listCentreCourses(actorUserId: string): Promise<SqlRow[]> {
    const centreId = await this.resolveActorCentreId(actorUserId);
    if (!centreId) {
      return [];
    }

    const plans = await this.prisma.centre_course_plans.findMany({
      where: { centre_id: centreId, deleted_at: null },
      orderBy: { id: 'desc' },
    });

    const courseIds = [...new Set(plans.map(p => p.course_id).filter(Boolean))] as string[];
    const courses = courseIds.length > 0 ? await this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, short_name: true, title: true } }) : [];
    const courseMap = new Map(courses.map(c => [c.id, c]));

    return plans.map(p => ({
      ...p,
      short_name: p.course_id ? courseMap.get(p.course_id)?.short_name ?? null : null,
      course_title: p.course_id ? courseMap.get(p.course_id)?.title ?? null : null,
    })) as unknown as SqlRow[];
  }

  async getCentreWallet(actorUserId: string): Promise<Record<string, unknown>> {
    const centreId = await this.resolveActorCentreId(actorUserId);
    if (!centreId) {
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
      this.prisma.centres.findFirst({
        where: { id: centreId, deleted_at: null },
        select: { id: true, centre_id: true, centre_name: true, wallet_balance: true },
      }),
      this.prisma.wallet_transactions.findMany({
        where: { centre_id: centreId, transaction_type: 'credit', deleted_at: null },
        select: { id: true, amount: true, remarks: true, reference_id: true, created_at: true },
        orderBy: { id: 'desc' },
      }),
      this.prisma.wallet_transactions.findMany({
        where: { centre_id: centreId, transaction_type: 'debit', deleted_at: null },
        select: { id: true, amount: true, remarks: true, reference_id: true, created_at: true },
        orderBy: { id: 'desc' },
      }),
      this.prisma.centre_fundrequests.findMany({
        where: { centre_id: centreId, deleted_at: null },
        select: { id: true, amount: true, date: true, transaction_receipt: true, description: true, attachment_file: true, status: true, created_at: true },
        orderBy: { id: 'desc' },
      }),
    ]);

    const totalCredits = credits.reduce((sum, entry) => sum + toDbNumber(entry.amount), 0);
    const totalDebits = debits.reduce((sum, entry) => sum + toDbNumber(entry.amount), 0);

    return {
      list_items: centre
        ? {
            id: centre.id,
            centre_id: toInteger(centre.centre_id),
            centre_name: toStringValue(centre.centre_name),
            wallet_balance: toDbNumber(centre.wallet_balance),
          }
        : null,
      credits: credits.map((entry) => ({
        id: entry.id,
        amount: toDbNumber(entry.amount),
        remarks: toStringValue(entry.remarks),
        reference_id: toStringValue(entry.reference_id),
        created_at: toStringValue(entry.created_at),
      })),
      debits: debits.map((entry) => ({
        id: entry.id,
        amount: toDbNumber(entry.amount),
        remarks: toStringValue(entry.remarks),
        reference_id: toStringValue(entry.reference_id),
        created_at: toStringValue(entry.created_at),
      })),
      fund_requests: fundRequests.map((entry) => ({
        id: entry.id,
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

  async addCentreFundRequest(actorUserId: string, input: AddCentreFundRequestInput): Promise<Record<string, unknown>> {
    const centreId = await this.resolveActorCentreId(actorUserId);
    if (!centreId) {
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

    const now = new Date();
    const date = normalizeDate(input.date, now);

    const created = await this.prisma.centre_fundrequests.create({
      data: {
        centre_id: centreId,
        user_id: actorUserId,
        amount: input.amount,
        date: new Date(date),
        transaction_receipt: toNullableString(input.transactionReceipt),
        description: toNullableString(input.description),
        attachment_file: toNullableString(input.attachmentFile),
        status: 'pending',
        created_by: actorUserId,
        updated_by: actorUserId,
        created_at: now,
        updated_at: now,
      },
    });

    return {
      status: 1,
      message: 'Request Sent Sucessfully!',
      data: {
        fund_request_id: created.id,
      },
    };
  }

  async listCentreTrainingVideos(): Promise<SqlRow[]> {
    const rows = await this.prisma.training_videos.findMany({
      where: { deleted_at: null },
      select: { id: true, title: true, description: true, category: true, video_type: true, video_url: true, thumbnail: true, created_at: true },
      orderBy: { id: 'desc' },
    });

    if (rows.length > 0) {
      return rows.map((entry) => ({
        id: entry.id,
        title: toStringValue(entry.title),
        description: toStringValue(entry.description),
        category: toStringValue(entry.category) || 'Lectures',
        video_type: toStringValue(entry.video_type),
        video_url: toStringValue(entry.video_url),
        thumbnail: toStringValue(entry.thumbnail),
        created_at: toStringValue(entry.created_at),
      }));
    }

    const demoVideos = await this.prisma.demo_video.findMany({
      where: { deleted_at: null },
      select: { id: true, title: true, video_type: true, video_url: true, thumbnail: true, created_at: true },
      orderBy: { id: 'desc' },
    });

    return demoVideos.map((entry) => ({
      id: entry.id,
      title: toStringValue(entry.title),
      description: '',
      category: 'Lectures',
      video_type: toStringValue(entry.video_type),
      video_url: toStringValue(entry.video_url),
      thumbnail: toStringValue(entry.thumbnail),
      created_at: toStringValue(entry.created_at),
    }));
  }

  async getCentreSupportMessages(actorUserId: string): Promise<SqlRow[]> {
    if (!actorUserId) {
      return [];
    }

    const messages = await this.prisma.support_chat.findMany({
      where: {
        deleted_at: null,
        OR: [
          { chat_id: toIntId(actorUserId) },
          { sender_id: toIntId(actorUserId) },
        ],
      },
      select: { id: true, chat_id: true, sender_id: true, message: true, created_at: true, updated_at: true },
      orderBy: { id: 'asc' },
    });

    return messages as unknown as SqlRow[];
  }

  async submitCentreSupportMessage(actorUserId: string, message: string): Promise<Record<string, unknown>> {
    if (!actorUserId || message.trim() === '') {
      return {
        status: 0,
        message: 'something went wrong!',
      };
    }

    const now = new Date();
    const recipientId = await this.resolveSupportRecipientId();

    const created = await this.prisma.support_chat.create({
      data: {
        chat_id: toNullableIntId(recipientId),
        sender_id: toNullableIntId(actorUserId),
        message,
        created_at: now,
        created_by: toIntId(actorUserId),
        updated_at: now,
        updated_by: toIntId(actorUserId),
      },
    });

    return {
      status: created ? 1 : 0,
      message: created ? 'message send successfully' : 'something went wrong!',
    };
  }

  async addCentreApplication(actorUserId: string, input: CentreApplicationInput): Promise<Record<string, unknown>> {
    const centreId = await this.resolveActorCentreId(actorUserId);
    if (!centreId) {
      return {
        status: 0,
        message: 'Centre is not assigned for current user.',
      };
    }

    const email = `${input.countryCode}${input.phone}`;

    const duplicateCount = await this.prisma.applications.count({
      where: {
        deleted_at: null,
        OR: [
          { email },
          { user_email: input.email },
        ],
      },
    });

    if (duplicateCount > 0) {
      return {
        status: 0,
        message: 'Application with same phone or email already exists',
      };
    }

    const now = new Date();
    const applicationId = input.applicationId?.trim() ? input.applicationId : `APP-${Date.now()}`;

    const created = await this.prisma.applications.create({
      data: {
        application_id: applicationId,
        name: input.name,
        country_code: input.countryCode,
        phone: input.phone,
        email,
        user_email: input.email,
        course_id: toNullableIntId(input.courseId),
        pipeline: input.pipeline,
        pipeline_user: toNullableIntId(input.pipelineUser),
        status: input.status as any,
        added_under_centre: toIntId(centreId),
        whatsapp_no: 0,
        second_code: 0,
        second_phone: '',
        image: '',
        created_by: toIntId(actorUserId),
        updated_by: toIntId(actorUserId),
        created_at: now,
        updated_at: now,
      },
    });

    return {
      status: 1,
      message: 'Application Added Successfully!',
      application_id: created.id,
    };
  }

  async convertApplication(actorUserId: string, applicationId: string): Promise<Record<string, unknown>> {
    if (!applicationId) {
      return {
        status: 0,
        message: 'Application not found',
      };
    }

    const application = await this.prisma.applications.findFirst({
      where: { id: toIntId(applicationId), deleted_at: null, is_converted: 0 },
    });

    if (!application) {
      return {
        status: 0,
        message: 'Application not found',
      };
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const studentCode = await this.nextStudentCode(tx);
      const now = new Date();
      const hashedPassword = await hashPassword('Temp@1234');
      const applicationEmail = toNullableString(application.user_email) ?? toNullableString(application.email) ?? '';
      const courseIdNum = application.course_id;
      const enrolDate = toDateOnly(now);

      const student = await tx.users.create({
        data: {
          student_id: studentCode,
          name: toStringValue(application.name),
          country_code: toStringValue(application.country_code),
          phone: toStringValue(application.phone),
          email: toStringValue(application.email),
          user_email: applicationEmail,
          password: hashedPassword,
          role_id: 2,
          course_id: courseIdNum ?? null,
          added_under_centre: application.added_under_centre,
          status: 1,
          gender: '',
          dynamic_link: '',
          image: '',
          profile_picture: '',
          application_id: 0,
          created_by: toIntId(actorUserId),
          updated_by: toIntId(actorUserId),
          created_at: now,
          updated_at: now,
        },
      });

      if (courseIdNum) {
        await tx.enrol.create({
          data: {
            user_id: student.id,
            course_id: courseIdNum,
            enrollment_date: enrolDate,
            enrollment_status: toStringValue(application.enrollment_status) || 'Active',
            mode_of_study: toStringValue(application.mode_of_study) || 'Online',
            created_by: toIntId(actorUserId),
            updated_by: toIntId(actorUserId),
            created_at: now,
            updated_at: now,
          },
        });
      }

      await tx.applications.update({
        where: { id: toIntId(applicationId) },
        data: {
          is_converted: 1,
          status: 'converted',
          updated_by: toIntId(actorUserId),
          updated_at: now,
        },
      });

      return {
        studentUserId: student.id,
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

  async listStudents(scope: 'admin' | 'centre', actorUserId: string, filters: StudentFilters): Promise<SqlRow[]> {
    const centreId = scope === 'centre' ? await this.resolveActorCentreId(actorUserId) : '';

    if (scope === 'centre' && !centreId) {
      return [];
    }

    const where: Record<string, unknown> = {
      deleted_at: null,
      role_id: 2,
    };

    if (filters.courseId) {
      where.course_id = toIntId(filters.courseId);
    }
    if (scope === 'centre') {
      where.added_under_centre = toIntId(centreId);
    }
    if (filters.centreId) {
      where.added_under_centre = toIntId(filters.centreId);
    }
    if (filters.status) {
      const statusNum = filters.status === 'Active' ? 1 : filters.status === 'Inactive' ? 0 : filters.status === 'Graduated' ? 2 : filters.status === 'Dropped' ? 3 : undefined;
      if (statusNum !== undefined) {
        where.status = statusNum;
      }
    }
    if (filters.search) {
      const q = filters.search.trim();
      where.OR = [
        { name: { contains: q } },
        { user_email: { contains: q } },
        { phone: { contains: q } },
        { student_id: { contains: q } },
      ];
    }

    const users = await this.prisma.users.findMany({
      where: where as any,
      select: { id: true, student_id: true, name: true, user_email: true, phone: true, course_id: true, added_under_centre: true, status: true, profile_picture: true, email: true },
      orderBy: { id: 'desc' },
    });

    // LEFT JOIN enrol and course
    const userIds = users.map(u => u.id);
    const enrolments = userIds.length > 0 ? await this.prisma.enrol.findMany({
      where: { user_id: { in: userIds }, deleted_at: null },
      select: { user_id: true, course_id: true, enrollment_status: true, enrollment_id: true, batch_id: true },
    }) : [];

    // If batch filter, restrict to users who have enrolment in that batch
    let filteredUserIds: Set<number> | null = null;
    if (filters.batchId) {
      const batchIdNum = toIntId(filters.batchId);
      filteredUserIds = new Set(
        enrolments
          .filter(e => e.batch_id === batchIdNum && e.user_id !== null && e.user_id !== undefined)
          .map(e => e.user_id as number),
      );
    }

    const courseIds = [...new Set([
      ...users.map(u => u.course_id).filter((x): x is number => x !== null && x !== undefined),
      ...enrolments.map(e => e.course_id).filter((x): x is number => x !== null && x !== undefined),
    ])];
    const courses = courseIds.length > 0 ? await this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } }) : [];
    const courseMap = new Map(courses.map(c => [c.id, c]));

    // Fetch centres for display
    const centreNums = [...new Set(users.map(u => u.added_under_centre).filter((x): x is number => x !== null && x !== undefined))];
    const centres = centreNums.length > 0 ? await this.prisma.centres.findMany({ where: { deleted_at: null }, select: { id: true, centre_name: true } }) : [];

    // Fetch batches for display
    const batchIds = [...new Set(enrolments.map(e => e.batch_id).filter((x): x is number => x !== null && x !== undefined))];
    const batches = batchIds.length > 0 ? await this.prisma.batch.findMany({ where: { id: { in: batchIds } }, select: { id: true, title: true } }) : [];
    const batchMap = new Map(batches.map(b => [b.id, b]));

    const statusLabels: Record<number, string> = { 0: 'Inactive', 1: 'Active', 2: 'Graduated', 3: 'Dropped' };

    return users
      .filter(u => filteredUserIds === null || filteredUserIds.has(u.id))
      .map(u => {
        const enrol = enrolments.find(e => e.user_id === u.id && e.course_id === u.course_id);
        return {
          ...u,
          course_enrol_status: enrol?.enrollment_status ?? null,
          enrollment_id: enrol?.enrollment_id ?? null,
          batch_id: enrol?.batch_id ?? null,
          batch_title: enrol?.batch_id ? batchMap.get(enrol.batch_id)?.title ?? null : null,
          course_title: enrol?.course_id ? courseMap.get(enrol.course_id)?.title ?? null : null,
          centre_name: centres.find(c => u.added_under_centre !== null && u.added_under_centre !== undefined && c.id === u.added_under_centre)?.centre_name ?? null,
          status_label: u.status !== null && u.status !== undefined ? (statusLabels[u.status] ?? 'Unknown') : 'Unknown',
        };
      }) as unknown as SqlRow[];
  }

  async listCentres(): Promise<SqlRow[]> {
    const allCentres = await this.prisma.centres.findMany({
      where: { deleted_at: null },
      orderBy: { id: 'desc' },
    });

    // Subquery: count students per centre
    const centreIds = allCentres.map(c => c.id);
    const studentCounts = centreIds.length > 0
      ? await this.prisma.users.groupBy({
          by: ['added_under_centre'],
          where: { role_id: 2, deleted_at: null, added_under_centre: { not: null } },
          _count: { id: true },
        })
      : [];

    const countMap = new Map(studentCounts.map(sc => [sc.added_under_centre, sc._count.id]));

    return allCentres.map(c => ({
      ...c,
      students_count: countMap.get(c.id) ?? 0,
    })) as unknown as SqlRow[];
  }

  async addCentre(actorUserId: string, input: CentreInput): Promise<Record<string, unknown>> {
    const now = new Date();

    const duplicateCount = await this.prisma.centres.count({
      where: {
        deleted_at: null,
        OR: [
          { country_code: input.countryCode, phone: input.phone },
          { email: input.email },
        ],
      },
    });

    if (duplicateCount > 0) {
      return {
        status: 0,
        message: 'Centre with same phone or email already exists',
      };
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const latestCentre = await tx.centres.findFirst({
        where: { deleted_at: null },
        orderBy: { id: 'desc' },
        select: { centre_id: true },
      });
      const nextCentreCode = toInteger(latestCentre?.centre_id) + 1;

      const centre = await tx.centres.create({
        data: {
          centre_id: String(nextCentreCode),
          centre_name: input.centreName,
          contact_person: input.contactPerson,
          country_code: input.countryCode,
          phone: input.phone,
          whatsapp: input.phone,
          secondary_phone: '',
          email: input.email,
          address: input.address,
          date_of_registration: toNullableString(input.registrationDate),
          date_of_expiry: toNullableString(input.expiryDate),
          wallet_balance: '0',
          created_by: toIntId(actorUserId),
          updated_by: toIntId(actorUserId),
          created_at: now,
          updated_at: now,
        },
      });

      const centrePassword = await hashPassword(input.password?.trim() ? input.password : 'Centre@1234');

      await tx.users.create({
        data: {
          name: input.centreName,
          user_email: input.email,
          country_code: input.countryCode,
          phone: input.phone,
          role_id: 7,
          centre_id: String(centre.id),
          password: centrePassword,
          status: 1,
          gender: '',
          dynamic_link: '',
          image: '',
          profile_picture: '',
          application_id: 0,
          created_by: toIntId(actorUserId),
          updated_by: toIntId(actorUserId),
          created_at: now,
          updated_at: now,
        },
      });

      return {
        centreDbId: centre.id,
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

  async assignCentrePlan(actorUserId: string, input: CentrePlanInput): Promise<Record<string, unknown>> {
    const centreIdInt = toIntId(input.centreId);
    const courseIdInt = toIntId(input.courseId);

    if (!centreIdInt || !courseIdInt) {
      return {
        status: 0,
        message: 'Centre or course is invalid',
      };
    }

    const duplicateCount = await this.prisma.centre_course_plans.count({
      where: { centre_id: centreIdInt, course_id: courseIdInt, deleted_at: null },
    });

    if (duplicateCount > 0) {
      return {
        status: 0,
        message: 'Already assigned to this course',
      };
    }

    const now = new Date();

    await this.prisma.centre_course_plans.create({
      data: {
        centre_id: centreIdInt,
        course_id: courseIdInt,
        assigned_amount: String(input.assignedAmount),
        start_date: new Date(input.startDate),
        end_date: new Date(input.endDate),
        created_by: toIntId(actorUserId),
        updated_by: toIntId(actorUserId),
        created_at: now,
        updated_at: now,
      },
    });

    return {
      status: 1,
      message: 'Course Assigned Successfully!',
    };
  }

  async listCentreCohorts(actorUserId: string): Promise<SqlRow[]> {
    const centreId = await this.resolveActorCentreId(actorUserId);
    if (!centreId) {
      return [];
    }

    const cohorts = await this.prisma.cohorts.findMany({
      where: { deleted_at: null, centre_id: centreId },
      orderBy: { id: 'desc' },
    });

    const cohortIds = cohorts.map(c => c.id);
    const subjectIds = [...new Set(cohorts.map(c => c.subject_id).filter(Boolean))] as string[];
    const courseIds = [...new Set(cohorts.map(c => c.course_id).filter(Boolean))] as string[];
    const instructorIds = [...new Set(cohorts.map(c => c.instructor_id).filter(Boolean))] as string[];

    const [subjects, courses, instructors, studentCounts, liveClassCounts] = await Promise.all([
      subjectIds.length > 0 ? this.prisma.subject.findMany({ where: { id: { in: subjectIds } }, select: { id: true, title: true } }) : [],
      courseIds.length > 0 ? this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } }) : [],
      instructorIds.length > 0 ? this.prisma.users.findMany({ where: { id: { in: instructorIds } }, select: { id: true, name: true } }) : [],
      cohortIds.length > 0 ? this.prisma.cohort_students.groupBy({ by: ['cohort_id'], where: { cohort_id: { in: cohortIds }, deleted_at: null }, _count: { id: true } }) : [],
      cohortIds.length > 0 ? this.prisma.live_class.groupBy({ by: ['cohort_id'], where: { cohort_id: { in: cohortIds }, deleted_at: null }, _count: { id: true } }) : [],
    ]);

    const subjectMap = new Map(subjects.map(s => [s.id, s]));
    const courseMap = new Map(courses.map(c => [c.id, c]));
    const instructorMap = new Map(instructors.map(i => [i.id, i]));
    const studentCountMap = new Map(studentCounts.map(sc => [sc.cohort_id, sc._count.id]));
    const liveCountMap = new Map(liveClassCounts.map(lc => [lc.cohort_id, lc._count.id]));

    return cohorts.map((entry) => ({
      id: entry.id,
      subject_id: entry.subject_id,
      course_id: entry.course_id,
      language_id: entry.language_id,
      centre_id: entry.centre_id,
      cohort_id: toStringValue(entry.cohort_id),
      title: toStringValue(entry.title),
      start_date: toStringValue(entry.start_date),
      end_date: toStringValue(entry.end_date),
      instructor_id: entry.instructor_id,
      created_at: toStringValue(entry.created_at),
      updated_at: toStringValue(entry.updated_at),
      subject_name: entry.subject_id ? subjectMap.get(entry.subject_id)?.title ?? '' : '',
      course_name: entry.course_id ? courseMap.get(entry.course_id)?.title ?? '' : '',
      instructor_name: entry.instructor_id ? instructorMap.get(entry.instructor_id)?.name ?? '' : '',
      students_count: studentCountMap.get(entry.id) ?? 0,
      lives_classes_count: liveCountMap.get(entry.id) ?? 0,
    }));
  }

  async addCentreCohort(actorUserId: string, input: CohortInput): Promise<Record<string, unknown>> {
    const centreId = await this.resolveActorCentreId(actorUserId);
    if (!centreId) {
      return {
        success: false,
        message: 'Centre is not assigned for current user.',
      };
    }

    const courseIdStr = String(input.courseId);
    const subjectIdStr = String(input.subjectId);

    const duplicateCount = await this.prisma.cohorts.count({
      where: { deleted_at: null, centre_id: centreId, course_id: courseIdStr, subject_id: subjectIdStr },
    });

    if (duplicateCount > 0) {
      return {
        success: false,
        message: 'Cohort with this subject already exists for this course!',
      };
    }

    const now = new Date();

    const created = await this.prisma.cohorts.create({
      data: {
        cohort_id: input.cohortCode?.trim() ? input.cohortCode : `COH-${Date.now()}`,
        title: input.title,
        course_id: courseIdStr,
        subject_id: subjectIdStr,
        instructor_id: String(input.instructorId),
        start_date: new Date(input.startDate),
        end_date: new Date(input.endDate),
        centre_id: centreId,
        created_by: actorUserId,
        updated_by: actorUserId,
        created_at: now,
        updated_at: now,
      },
    });

    return {
      success: true,
      message: 'Cohort added successfully!',
      data: {
        cohort_id: created.id,
        subject_id: input.subjectId,
      },
    };
  }

  async addCentreCohortStudents(actorUserId: string, input: AddCohortStudentsInput): Promise<Record<string, unknown>> {
    const centreId = await this.resolveActorCentreId(actorUserId);
    const cohortIdStr = String(input.cohortId);

    if (!centreId || !cohortIdStr) {
      return {
        success: false,
        message: 'Invalid cohort selection',
      };
    }

    const cohort = await this.prisma.cohorts.findFirst({
      where: { id: cohortIdStr, centre_id: centreId, deleted_at: null },
      select: { id: true },
    });

    if (!cohort) {
      return {
        success: false,
        message: 'Cohort not found for centre',
      };
    }

    const now = new Date();
    let inserted = 0;

    for (const studentId of input.studentIds) {
      const studentIdStr = String(studentId);
      if (!studentIdStr) {
        continue;
      }

      const existing = await this.prisma.cohort_students.count({
        where: { cohort_id: cohortIdStr, user_id: studentIdStr, deleted_at: null },
      });

      if (existing > 0) {
        continue;
      }

      await this.prisma.cohort_students.create({
        data: {
          cohort_id: cohortIdStr,
          user_id: studentIdStr,
          created_by: actorUserId,
          updated_by: actorUserId,
          created_at: now,
          updated_at: now,
        },
      });

      inserted += 1;
    }

    return {
      success: true,
      message: inserted > 0 ? 'Learners added successfully!' : 'No new learners added',
      added_count: inserted,
    };
  }

  async listLiveClasses(scope: 'admin' | 'centre', actorUserId: string): Promise<SqlRow[]> {
    const centreId = scope === 'centre' ? await this.resolveActorCentreId(actorUserId) : '';

    if (scope === 'centre' && !centreId) {
      return [];
    }

    // For centre scope, first find cohort IDs belonging to that centre
    let cohortFilter: string[] | undefined;
    if (scope === 'centre' && centreId) {
      const centreCohorts = await this.prisma.cohorts.findMany({
        where: { centre_id: centreId, deleted_at: null },
        select: { id: true },
      });
      cohortFilter = centreCohorts.map(c => c.id);
    }

    const liveClasses = await this.prisma.live_class.findMany({
      where: {
        deleted_at: null,
        ...(cohortFilter ? { cohort_id: { in: cohortFilter } } : {}),
      },
      orderBy: { id: 'desc' },
    });

    // LEFT JOIN cohorts and courses
    const cohortIds = [...new Set(liveClasses.map(lc => lc.cohort_id).filter(Boolean))] as string[];
    const cohorts = cohortIds.length > 0 ? await this.prisma.cohorts.findMany({ where: { id: { in: cohortIds } }, select: { id: true, title: true, course_id: true } }) : [];
    const cohortMap = new Map(cohorts.map(c => [c.id, c]));
    const courseIds = [...new Set(cohorts.map(c => c.course_id).filter(Boolean))] as string[];
    const courses = courseIds.length > 0 ? await this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } }) : [];
    const courseMap = new Map(courses.map(c => [c.id, c]));

    return liveClasses.map(lc => {
      const cohort = lc.cohort_id ? cohortMap.get(lc.cohort_id) : null;
      return {
        ...lc,
        cohort_title: cohort?.title ?? null,
        course_title: cohort?.course_id ? courseMap.get(cohort.course_id)?.title ?? null : null,
      };
    }) as unknown as SqlRow[];
  }

  async addLiveClasses(
    scope: 'admin' | 'centre',
    actorUserId: string,
    input: AddLiveClassInput,
  ): Promise<Record<string, unknown>> {
    const cohortIdStr = String(input.cohortId);
    if (!cohortIdStr || input.entries.length === 0) {
      return {
        success: false,
        message: 'No live class entries provided!',
      };
    }

    const centreId = scope === 'centre' ? await this.resolveActorCentreId(actorUserId) : '';

    const cohortWhere: Record<string, unknown> = { id: cohortIdStr, deleted_at: null };
    if (scope === 'centre' && centreId) {
      cohortWhere.centre_id = centreId;
    }

    const cohort = await this.prisma.cohorts.findFirst({
      where: cohortWhere as any,
      select: { id: true, instructor_id: true, centre_id: true },
    });

    if (!cohort || !cohort.instructor_id) {
      return {
        success: false,
        message: 'Instructor not set, Live class not added!',
      };
    }

    const now = new Date();
    let successCount = 0;
    let failedCount = 0;

    for (const entry of input.entries) {
      try {
        await this.prisma.live_class.create({
          data: {
            cohort_id: cohortIdStr,
            session_id: entry.sessionId,
            title: entry.title,
            date: new Date(entry.date),
            fromTime: entry.fromTime,
            toTime: entry.toTime,
            repeat_dates: JSON.stringify(entry.repeatDates),
            zoom_id: input.zoomId,
            password: input.password,
            is_repetitive: entry.isRepetitive,
            created_by: actorUserId,
            updated_by: actorUserId,
            created_at: now,
            updated_at: now,
          },
        });

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

  async listResources(scope: 'admin' | 'centre', actorUserId: string, input: ResourceListInput): Promise<Record<string, unknown>> {
    const centreId = scope === 'centre' ? await this.resolveActorCentreId(actorUserId) : (input.centreId ? String(input.centreId) : '');
    const hasCentreScope = scope === 'centre' || !!centreId;
    const folderIdStr = input.folderId ? input.folderId : '';

    const folderWhere: Record<string, unknown> = { deleted_at: null };
    if (hasCentreScope) {
      folderWhere.centre_id = centreId || null;
    }

    const currentFolder = folderIdStr
      ? await this.prisma.folder.findFirst({
          where: { ...folderWhere, id: folderIdStr } as any,
          select: { id: true, name: true, parent_id: true, centre_id: true },
        })
      : null;

    const folders = await this.prisma.folder.findMany({
      where: { ...folderWhere, parent_id: folderIdStr || null } as any,
      select: { id: true, name: true, parent_id: true, centre_id: true },
      orderBy: { id: 'asc' },
    });

    const fileWhere: Record<string, unknown> = { deleted_at: null, folder_id: folderIdStr || null };
    if (hasCentreScope) {
      fileWhere.centre_id = centreId || null;
    }

    const files = await this.prisma.file.findMany({
      where: fileWhere as any,
      select: { id: true, folder_id: true, name: true, type: true, size: true, path: true, centre_id: true, created_at: true },
      orderBy: { id: 'asc' },
    });

    return {
      folder_id: folderIdStr || 0,
      current_folder: currentFolder,
      folders,
      files,
    };
  }

  async addFolder(scope: 'admin' | 'centre', actorUserId: string, input: AddFolderInput): Promise<Record<string, unknown>> {
    const centreId = scope === 'centre' ? await this.resolveActorCentreId(actorUserId) : (input.centreId ? String(input.centreId) : '');
    const now = new Date();

    const created = await this.prisma.folder.create({
      data: {
        name: input.name,
        parent_id: input.parentId ? input.parentId : null,
        centre_id: centreId || null,
        created_by: actorUserId,
        updated_by: actorUserId,
        created_at: now,
        updated_at: now,
      },
    });

    return {
      status: 1,
      message: 'Folder added successfully!',
      data: {
        folder_id: created.id,
      },
    };
  }

  async addFile(scope: 'admin' | 'centre', actorUserId: string, input: AddFileInput): Promise<Record<string, unknown>> {
    const centreId = scope === 'centre' ? await this.resolveActorCentreId(actorUserId) : (input.centreId ? String(input.centreId) : '');
    const now = new Date();

    const created = await this.prisma.file.create({
      data: {
        folder_id: input.folderId ? input.folderId : null,
        name: input.name,
        type: input.fileType,
        size: input.size,
        path: input.path,
        centre_id: centreId || null,
        created_by: actorUserId,
        updated_by: actorUserId,
        created_at: now,
        updated_at: now,
      },
    });

    return {
      status: 1,
      message: 'File uploaded successfully!',
      data: {
        file_id: created.id,
      },
    };
  }

  async getSystemSettings(): Promise<Record<string, unknown>> {
    const [systemSettings, frontendSettings, appVersion] = await Promise.all([
      this.prisma.settings.findMany({
        where: { deleted_at: null },
        select: { key: true, value: true },
        orderBy: { id: 'asc' },
      }),
      this.prisma.frontend_settings.findMany({
        where: { deleted_at: null },
        select: { key: true, value: true },
        orderBy: { id: 'asc' },
      }),
      this.prisma.app_version.findFirst({
        where: { deleted_at: null },
        select: { id: true, app_version: true, app_version_ios: true },
        orderBy: { id: 'desc' },
      }),
    ]);

    return {
      system_settings: systemSettings,
      frontend_settings: frontendSettings,
      app_version: appVersion,
    };
  }

  async updateSystemSettings(actorUserId: string, input: UpdateSettingsInput): Promise<void> {
    const now = new Date();

    for (const [key, value] of Object.entries(input.system)) {
      await this.prisma.settings.upsert({
        where: { key },
        update: { value, updated_by: actorUserId, updated_at: now },
        create: { key, value, created_by: actorUserId, updated_by: actorUserId, created_at: now, updated_at: now },
      });
    }

    for (const [key, value] of Object.entries(input.frontend)) {
      await this.prisma.frontend_settings.upsert({
        where: { key },
        update: { value, updated_by: actorUserId, updated_at: now },
        create: { key, value, created_by: actorUserId, updated_by: actorUserId, created_at: now, updated_at: now },
      });
    }
  }

  async updateAppVersion(actorUserId: string, input: AppVersionInput): Promise<void> {
    const now = new Date();

    const existing = await this.prisma.app_version.findFirst({
      where: { deleted_at: null },
      orderBy: { id: 'desc' },
      select: { id: true },
    });

    if (existing) {
      await this.prisma.app_version.update({
        where: { id: existing.id },
        data: {
          app_version: input.appVersion,
          app_version_ios: input.appVersionIos,
          updated_by: actorUserId,
          updated_at: now,
        },
      });

      return;
    }

    await this.prisma.app_version.create({
      data: {
        app_version: input.appVersion,
        app_version_ios: input.appVersionIos,
        created_by: actorUserId,
        updated_by: actorUserId,
        created_at: now,
        updated_at: now,
      },
    });
  }

  async listLiveReport(liveId: string, joinDate?: string): Promise<Record<string, unknown>> {
    const lives = await this.prisma.live_class.findMany({
      where: { deleted_at: null },
      select: { id: true, title: true, date: true },
      orderBy: { id: 'desc' },
    });

    const zhWhere: Record<string, unknown> = { deleted_at: null };
    if (liveId) {
      zhWhere.live_id = liveId;
    }
    if ((joinDate ?? '').trim() !== '') {
      zhWhere.join_date = new Date(joinDate!);
    }

    const zoomRows = await this.prisma.zoom_history.findMany({
      where: zhWhere as any,
      orderBy: { id: 'desc' },
    });

    // LEFT JOIN users
    const userIds = [...new Set(zoomRows.map(z => z.user_id).filter(Boolean))];
    const users = userIds.length > 0 ? await this.prisma.users.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } }) : [];
    const userMap = new Map(users.map(u => [u.id, u]));

    const rows = zoomRows.map(z => ({
      ...z,
      user_name: z.user_id ? userMap.get(z.user_id)?.name ?? null : null,
    }));

    return {
      lives,
      list_items: rows,
    };
  }

  async globalCalendar(fromDate?: string, toDate?: string): Promise<SqlRow[]> {
    const range = normalizeReportRange(fromDate, toDate);
    const dateFrom = new Date(`${range.fromDate}T00:00:00Z`);
    const dateTo = new Date(`${range.toDate}T23:59:59Z`);

    // UNION ALL via separate queries merged in JS
    const [liveClasses, exams, events] = await Promise.all([
      this.prisma.live_class.findMany({
        where: { deleted_at: null, date: { gte: dateFrom, lte: dateTo } },
        select: { id: true, title: true, date: true, fromTime: true, toTime: true },
      }),
      this.prisma.exam.findMany({
        where: { deleted_at: null, from_date: { gte: dateFrom, lte: dateTo } },
        select: { id: true, title: true, from_date: true, from_time: true, to_time: true },
      }),
      this.prisma.events.findMany({
        where: { deleted_at: null, event_date: { gte: dateFrom, lte: dateTo } },
        select: { id: true, title: true, event_date: true, from_time: true, to_time: true },
      }),
    ]);

    const combined: SqlRow[] = [
      ...liveClasses.map(lc => ({
        id: lc.id,
        title: lc.title,
        event_date: lc.date,
        event_type: 'live_class',
        from_time: lc.fromTime,
        to_time: lc.toTime,
      })),
      ...exams.map(e => ({
        id: e.id,
        title: e.title,
        event_date: e.from_date,
        event_type: 'exam',
        from_time: e.from_time,
        to_time: e.to_time,
      })),
      ...events.map(ev => ({
        id: ev.id,
        title: ev.title,
        event_date: ev.event_date,
        event_type: 'event',
        from_time: ev.from_time,
        to_time: ev.to_time,
      })),
    ];

    combined.sort((a, b) => {
      const dateA = toStringValue(a.event_date);
      const dateB = toStringValue(b.event_date);
      if (dateA < dateB) return -1;
      if (dateA > dateB) return 1;
      return toStringValue(a.id) < toStringValue(b.id) ? -1 : 1;
    });

    return combined;
  }

  async reportSummary(input: ReportSummaryInput): Promise<Record<string, unknown>> {
    const range = normalizeReportRange(input.fromDate, input.toDate);
    const dateFrom = new Date(`${range.fromDate}T00:00:00Z`);
    const dateTo = new Date(`${range.toDate}T23:59:59Z`);

    const appDateFilter = { deleted_at: null, created_at: { gte: dateFrom, lte: dateTo } };

    const [applicationsTotal, applicationsPending, applicationsRejected, studentsTotal, centresTotal, cohortsTotal, liveClassesTotal] = await Promise.all([
      this.prisma.applications.count({ where: appDateFilter as any }),
      this.prisma.applications.count({ where: { ...appDateFilter, status: 'pending' } as any }),
      this.prisma.applications.count({ where: { ...appDateFilter, status: 'rejected' } as any }),
      this.prisma.users.count({ where: { role_id: 2, deleted_at: null } }),
      this.prisma.centres.count({ where: { deleted_at: null } }),
      this.prisma.cohorts.count({ where: { deleted_at: null } }),
      this.prisma.live_class.count({ where: { deleted_at: null } }),
    ]);

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
      const liveReport = await this.listLiveReport(input.liveId ?? '', input.joinDate);
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
      paymentsAgg,
      recentStudentRows,
      upcomingEvents,
    ] = await Promise.all([
      this.prisma.course.count({ where: { deleted_at: null } }),
      this.prisma.centres.count({ where: { deleted_at: null } }),
      this.prisma.users.count({ where: { role_id: 2, deleted_at: null } }),
      this.prisma.enrol.count({ where: { deleted_at: null } }),
      this.prisma.payment_info.aggregate({ where: { deleted_at: null }, _sum: { amount_paid: true } }),
      this.prisma.users.findMany({
        where: { role_id: 2, deleted_at: null },
        select: { id: true, student_id: true, name: true, email: true, phone: true, created_at: true },
        orderBy: { id: 'desc' },
        take: 10,
      }),
      this.prisma.events.findMany({
        where: { deleted_at: null, event_date: { gte: new Date(`${range.toDate}T00:00:00Z`) } },
        select: { id: true, title: true, event_date: true, from_time: true, to_time: true },
        orderBy: { event_date: 'asc' },
        take: 10,
      }),
    ]);

    // LEFT JOIN enrol + course for recent students
    const studentIds = recentStudentRows.map(s => s.id);
    const enrolments = studentIds.length > 0 ? await this.prisma.enrol.findMany({ where: { user_id: { in: studentIds }, deleted_at: null }, select: { user_id: true, course_id: true } }) : [];
    const courseIds = [...new Set(enrolments.map(e => e.course_id).filter(Boolean))] as string[];
    const courses = courseIds.length > 0 ? await this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } }) : [];
    const courseMap = new Map(courses.map(c => [c.id, c]));
    const enrolMap = new Map(enrolments.map(e => [e.user_id, e]));

    const recentStudents = recentStudentRows.map(u => {
      const enrol = enrolMap.get(u.id);
      return {
        ...u,
        course_title: enrol?.course_id ? courseMap.get(enrol.course_id)?.title ?? null : null,
      };
    });

    return {
      courses_count: coursesCount,
      centres_count: centresCount,
      students_count: studentsCount,
      enrolments_count: enrolmentsCount,
      payments_total: paymentsAgg._sum.amount_paid ?? 0,
      recent_students: recentStudents,
      upcoming_events: upcomingEvents,
    };
  }

  // ─── Phase 1: Batches (Intake) ────────────────────────────────────────────

  async listBatches(): Promise<SqlRow[]> {
    const batches = await this.prisma.batch.findMany({
      where: { deleted_at: null },
      orderBy: { id: 'desc' },
    });

    const batchIds = batches.map(b => b.id);
    const enrolCounts = batchIds.length > 0
      ? await this.prisma.enrol.groupBy({ by: ['batch_id'], where: { batch_id: { in: batchIds }, deleted_at: null }, _count: { id: true } })
      : [];
    const countMap = new Map(enrolCounts.map(ec => [ec.batch_id, ec._count.id]));

    return batches.map(b => ({
      ...b,
      student_count: countMap.get(b.id) ?? 0,
    })) as unknown as SqlRow[];
  }

  async addBatch(actorUserId: string, input: BatchInput): Promise<Record<string, unknown>> {
    if (!input.title.trim()) {
      return { status: 0, message: 'Title is required.' };
    }

    const now = new Date();
    await this.prisma.batch.create({
      data: { title: input.title, description: input.description ?? '', status: input.status ?? 'active', created_by: actorUserId, created_at: now, updated_at: now },
    });

    return { status: 1, message: 'Batch Added Successfully!' };
  }

  async editBatch(actorUserId: string, batchId: string, input: BatchInput): Promise<Record<string, unknown>> {
    if (!batchId) {
      return { status: 0, message: 'Invalid batch ID.' };
    }

    const now = new Date();
    await this.prisma.batch.updateMany({
      where: { id: batchId, deleted_at: null },
      data: { title: input.title, description: input.description ?? '', status: input.status ?? 'active', updated_by: actorUserId, updated_at: now },
    });

    return { status: 1, message: 'Batch Updated Successfully!' };
  }

  async deleteBatch(actorUserId: string, batchId: string): Promise<Record<string, unknown>> {
    if (!batchId) {
      return { status: 0, message: 'Invalid batch ID.' };
    }

    const now = new Date();
    await this.prisma.batch.updateMany({
      where: { id: batchId, deleted_at: null },
      data: { deleted_by: actorUserId, deleted_at: now },
    });

    return { status: 1, message: 'Batch Deleted Successfully!' };
  }

  // ─── Phase 1: Payments ────────────────────────────────────────────────────

  async listPayments(filters: AdminPaymentFilters): Promise<SqlRow[]> {
    const range = normalizeReportRange(filters.fromDate, filters.toDate);

    const where: Record<string, unknown> = { deleted_at: null };
    if (filters.fromDate) {
      where.payment_date = { ...(where.payment_date as Record<string, unknown> ?? {}), gte: new Date(`${range.fromDate}T00:00:00Z`) };
    }
    if (filters.toDate) {
      where.payment_date = { ...(where.payment_date as Record<string, unknown> ?? {}), lte: new Date(`${range.toDate}T23:59:59Z`) };
    }
    if (filters.courseId) {
      where.course_id = filters.courseId;
    }

    const payments = await this.prisma.payment_info.findMany({ where: where as any, orderBy: { id: 'desc' } });

    const userIds = [...new Set(payments.map(p => p.user_id).filter(Boolean))];
    const courseIds = [...new Set(payments.map(p => p.course_id).filter(Boolean))] as string[];

    const [users, courses] = await Promise.all([
      userIds.length > 0 ? this.prisma.users.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, student_id: true } }) : [],
      courseIds.length > 0 ? this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } }) : [],
    ]);

    const userMap = new Map(users.map(u => [u.id, u]));
    const courseMap = new Map(courses.map(c => [c.id, c]));

    return payments.map(p => ({
      ...p,
      user_name: p.user_id ? userMap.get(p.user_id)?.name ?? null : null,
      student_id: p.user_id ? userMap.get(p.user_id)?.student_id ?? null : null,
      course_title: p.course_id ? courseMap.get(p.course_id)?.title ?? null : null,
    })) as unknown as SqlRow[];
  }

  // ─── Phase 1: Admin Cohorts ───────────────────────────────────────────────

  async listAdminCohorts(filters: AdminCohortFilters): Promise<SqlRow[]> {
    const where: Record<string, unknown> = { deleted_at: null };
    if (filters.courseId) where.course_id = filters.courseId;
    if (filters.subjectId) where.subject_id = filters.subjectId;
    if (filters.centreId) where.centre_id = filters.centreId;

    const cohorts = await this.prisma.cohorts.findMany({ where: where as any, orderBy: { id: 'desc' } });

    const cohortIds = cohorts.map(c => c.id);
    const courseIds = [...new Set(cohorts.map(c => c.course_id).filter(Boolean))] as string[];
    const subjectIds = [...new Set(cohorts.map(c => c.subject_id).filter(Boolean))] as string[];
    const centreIds = [...new Set(cohorts.map(c => c.centre_id).filter(Boolean))] as string[];
    const instructorIds = [...new Set(cohorts.map(c => c.instructor_id).filter(Boolean))] as string[];

    const [courses, subjects, centres, instructors, studentCounts] = await Promise.all([
      courseIds.length > 0 ? this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } }) : [],
      subjectIds.length > 0 ? this.prisma.subject.findMany({ where: { id: { in: subjectIds } }, select: { id: true, title: true } }) : [],
      centreIds.length > 0 ? this.prisma.centres.findMany({ where: { id: { in: centreIds } }, select: { id: true, centre_name: true } }) : [],
      instructorIds.length > 0 ? this.prisma.users.findMany({ where: { id: { in: instructorIds } }, select: { id: true, name: true } }) : [],
      cohortIds.length > 0 ? this.prisma.cohort_students.groupBy({ by: ['cohort_id'], where: { cohort_id: { in: cohortIds }, deleted_at: null }, _count: { id: true } }) : [],
    ]);

    const courseMap = new Map(courses.map(c => [c.id, c]));
    const subjectMap = new Map(subjects.map(s => [s.id, s]));
    const centreMap = new Map(centres.map(c => [c.id, c]));
    const instructorMap = new Map(instructors.map(i => [i.id, i]));
    const studentCountMap = new Map(studentCounts.map(sc => [sc.cohort_id, sc._count.id]));

    return cohorts.map(ch => ({
      ...ch,
      course_title: ch.course_id ? courseMap.get(ch.course_id)?.title ?? null : null,
      subject_title: ch.subject_id ? subjectMap.get(ch.subject_id)?.title ?? null : null,
      centre_name: ch.centre_id ? centreMap.get(ch.centre_id)?.centre_name ?? null : null,
      instructor_name: ch.instructor_id ? instructorMap.get(ch.instructor_id)?.name ?? null : null,
      student_count: studentCountMap.get(ch.id) ?? 0,
    })) as unknown as SqlRow[];
  }

  // ─── Phase 1: Admin Centre Payments (Fund Requests + Wallet Txns) ─────────

  async listAdminCentrePayments(filters: AdminCentrePaymentFilters): Promise<Record<string, unknown>> {
    const range = normalizeReportRange(filters.fromDate, filters.toDate);

    const frWhere: Record<string, unknown> = { deleted_at: null };
    if (filters.fromDate) frWhere.date = { ...(frWhere.date as Record<string, unknown> ?? {}), gte: new Date(`${range.fromDate}T00:00:00Z`) };
    if (filters.toDate) frWhere.date = { ...(frWhere.date as Record<string, unknown> ?? {}), lte: new Date(`${range.toDate}T23:59:59Z`) };
    if (filters.status) frWhere.status = filters.status;

    const wtWhere: Record<string, unknown> = { deleted_at: null };
    if (filters.fromDate) wtWhere.created_at = { ...(wtWhere.created_at as Record<string, unknown> ?? {}), gte: new Date(`${range.fromDate}T00:00:00Z`) };
    if (filters.toDate) wtWhere.created_at = { ...(wtWhere.created_at as Record<string, unknown> ?? {}), lte: new Date(`${range.toDate}T23:59:59Z`) };

    const [frRows, wtRows] = await Promise.all([
      this.prisma.centre_fundrequests.findMany({ where: frWhere as any, orderBy: { id: 'desc' } }),
      this.prisma.wallet_transactions.findMany({ where: wtWhere as any, orderBy: { id: 'desc' } }),
    ]);

    // LEFT JOINs
    const centreIds = [...new Set([...frRows.map(f => f.centre_id), ...wtRows.map(w => w.centre_id)].filter(Boolean))];
    const userIds = [...new Set(frRows.map(f => f.user_id).filter(Boolean))];
    const [centres, users] = await Promise.all([
      centreIds.length > 0 ? this.prisma.centres.findMany({ where: { id: { in: centreIds } }, select: { id: true, centre_name: true } }) : [],
      userIds.length > 0 ? this.prisma.users.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } }) : [],
    ]);
    const centreMap = new Map(centres.map(c => [c.id, c]));
    const userMap = new Map(users.map(u => [u.id, u]));

    const fundRequests = frRows.map(fr => ({ ...fr, centre_name: centreMap.get(fr.centre_id)?.centre_name ?? null, user_name: userMap.get(fr.user_id)?.name ?? null }));
    const walletTransactions = wtRows.map(wt => ({ ...wt, centre_name: centreMap.get(wt.centre_id)?.centre_name ?? null }));

    return { fund_requests: fundRequests, wallet_transactions: walletTransactions };
  }

  // ─── Phase 1: Admin Wallet Status ─────────────────────────────────────────

  async listAdminWalletStatus(filters: AdminWalletFilters): Promise<SqlRow[]> {
    const where: Record<string, unknown> = { deleted_at: null };
    if (filters.centreId) where.centre_id = filters.centreId;
    if (filters.centreName) where.centre_name = { contains: filters.centreName, mode: 'insensitive' };

    const centres = await this.prisma.centres.findMany({
      where: where as any,
      select: { id: true, centre_id: true, centre_name: true, wallet_balance: true, phone: true, email: true },
      orderBy: { id: 'desc' },
    });

    const centreDbIds = centres.map(c => c.id);
    const txnCounts = centreDbIds.length > 0
      ? await this.prisma.wallet_transactions.groupBy({ by: ['centre_id'], where: { centre_id: { in: centreDbIds }, deleted_at: null }, _count: { id: true } })
      : [];
    const countMap = new Map(txnCounts.map(tc => [tc.centre_id, tc._count.id]));

    return centres.map(ct => ({ ...ct, transaction_count: countMap.get(ct.id) ?? 0 })) as unknown as SqlRow[];
  }

  // ─── Phase 1: Admin Notifications ─────────────────────────────────────────

  async listAdminNotifications(): Promise<SqlRow[]> {
    const notifications = await this.prisma.notification.findMany({ where: { deleted_at: null }, orderBy: { id: 'desc' } });
    const courseIds = [...new Set(notifications.map(n => n.course_id).filter(Boolean))] as string[];
    const courses = courseIds.length > 0 ? await this.prisma.course.findMany({ where: { id: { in: courseIds }, deleted_at: null }, select: { id: true, title: true } }) : [];
    const courseMap = new Map(courses.map(c => [c.id, c]));

    return notifications.map(n => ({ ...n, course_title: n.course_id ? courseMap.get(n.course_id)?.title ?? null : null })) as unknown as SqlRow[];
  }

  // ─── Phase 1: Banners ────────────────────────────────────────────────────

  async listBanners(): Promise<SqlRow[]> {
    const banners = await this.prisma.banners.findMany({ where: { deleted_at: null }, orderBy: { id: 'desc' } });
    const courseIds = [...new Set(banners.map(b => b.course_id).filter(Boolean))] as string[];
    const courses = courseIds.length > 0 ? await this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } }) : [];
    const courseMap = new Map(courses.map(c => [c.id, c]));

    return banners.map(b => ({ ...b, course_title: b.course_id ? courseMap.get(b.course_id)?.title ?? null : null })) as unknown as SqlRow[];
  }

  async addBanner(actorUserId: string, input: BannerInput): Promise<Record<string, unknown>> {
    const now = new Date();
    await this.prisma.banners.create({
      data: {
        title: input.title ?? '',
        image: input.image ?? '',
        course_id: input.courseId ? String(input.courseId) : null,
        status: input.status ?? 'active',
        created_by: actorUserId,
        created_at: now,
        updated_at: now,
      },
    });

    return { status: 1, message: 'Banner Added Successfully!' };
  }

  // ─── Phase 1: FAQ ────────────────────────────────────────────────────────

  async listFaqs(): Promise<SqlRow[]> {
    const faqs = await this.prisma.faq.findMany({ where: { deleted_at: null }, orderBy: { id: 'desc' } });
    return faqs as unknown as SqlRow[];
  }

  async addFaq(actorUserId: string, input: FaqInput): Promise<Record<string, unknown>> {
    if (!input.question.trim()) {
      return { status: 0, message: 'Question is required.' };
    }

    const now = new Date();
    await this.prisma.faq.create({
      data: { question: input.question, answer: input.answer ?? '', status: input.status ?? 'active', created_by: actorUserId, created_at: now, updated_at: now },
    });

    return { status: 1, message: 'FAQ Added Successfully!' };
  }

  // ─── Phase 1: Contact Settings ────────────────────────────────────────────

  async getContactSettings(): Promise<SqlRow[]> {
    const contactKeys = ['contact_email', 'contact_phone', 'contact_address', 'support_email', 'support_phone', 'whatsapp_number'];
    const settings = await this.prisma.settings.findMany({
      where: { deleted_at: null, key: { in: contactKeys } },
      orderBy: { id: 'asc' },
    });
    return settings as unknown as SqlRow[];
  }

  async updateContactSettings(actorUserId: string, settings: Record<string, string>): Promise<void> {
    const now = new Date();

    for (const [key, value] of Object.entries(settings)) {
      await this.prisma.settings.upsert({
        where: { key },
        update: { value, updated_by: actorUserId, updated_at: now },
        create: { key, value, created_by: actorUserId, created_at: now, updated_at: now },
      });
    }
  }

  // ─── Phase 2: Question Bank ─────────────────────────────────────────────────

  async listQuestionBank(filters: QuestionBankFilters = {}): Promise<SqlRow[]> {
    const where: Record<string, unknown> = { deleted_at: null };
    if (filters.courseId) where.course_id = filters.courseId;
    if (filters.subjectId) where.subject_id = filters.subjectId;
    if (filters.lessonId) where.lesson_id = filters.lessonId;
    if (filters.qType !== undefined && filters.qType >= 0) where.q_type = filters.qType;

    const questions = await this.prisma.question_bank.findMany({ where: where as any, orderBy: { id: 'desc' } });

    const courseIds = [...new Set(questions.map(q => q.course_id).filter(Boolean))] as string[];
    const subjectIds = [...new Set(questions.map(q => q.subject_id).filter(Boolean))] as string[];
    const lessonIds = [...new Set(questions.map(q => q.lesson_id).filter(Boolean))] as string[];

    const [courses, subjects, lessons] = await Promise.all([
      courseIds.length > 0 ? this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } }) : [],
      subjectIds.length > 0 ? this.prisma.subject.findMany({ where: { id: { in: subjectIds } }, select: { id: true, title: true } }) : [],
      lessonIds.length > 0 ? this.prisma.lesson.findMany({ where: { id: { in: lessonIds } }, select: { id: true, title: true } }) : [],
    ]);

    const courseMap = new Map(courses.map(c => [c.id, c]));
    const subjectMap = new Map(subjects.map(s => [s.id, s]));
    const lessonMap = new Map(lessons.map(l => [l.id, l]));

    return questions.map(qb => ({
      ...qb,
      course_title: qb.course_id ? courseMap.get(qb.course_id)?.title ?? null : null,
      subject_title: qb.subject_id ? subjectMap.get(qb.subject_id)?.title ?? null : null,
      lesson_title: qb.lesson_id ? lessonMap.get(qb.lesson_id)?.title ?? null : null,
    })) as unknown as SqlRow[];
  }

  async addQuestion(actorUserId: string, input: QuestionBankInput): Promise<Record<string, unknown>> {
    if (!input.title.trim()) {
      return { status: 0, message: 'Question title is required.' };
    }

    const now = new Date();

    await this.prisma.question_bank.create({
      data: {
        course_id: String(input.courseId),
        subject_id: input.subjectId ? String(input.subjectId) : null,
        lesson_id: input.lessonId ? String(input.lessonId) : null,
        category_id: input.categoryId ? String(input.categoryId) : null,
        type: input.type ?? 0,
        q_type: input.qType ?? 0,
        title: input.title,
        title_file: input.titleFile ?? null,
        hint: input.hint ?? null,
        hint_file: input.hintFile ?? null,
        solution: input.solution ?? null,
        solution_file: input.solutionFile ?? null,
        is_equation: input.isEquation ?? 0,
        number_of_options: input.numberOfOptions ?? 4,
        options: input.options ?? '[]',
        correct_answers: input.correctAnswers ?? '[]',
        range_from: input.rangeFrom ?? null,
        range_to: input.rangeTo ?? null,
        created_by: actorUserId,
        created_at: now,
        updated_at: now,
      },
    });

    return { status: 1, message: 'Question added successfully.' };
  }

  async editQuestion(actorUserId: string, questionId: string, input: QuestionBankInput): Promise<Record<string, unknown>> {
    if (!input.title.trim()) {
      return { status: 0, message: 'Question title is required.' };
    }

    const now = new Date();

    await this.prisma.question_bank.updateMany({
      where: { id: questionId, deleted_at: null },
      data: {
        course_id: String(input.courseId),
        subject_id: input.subjectId ? String(input.subjectId) : null,
        lesson_id: input.lessonId ? String(input.lessonId) : null,
        category_id: input.categoryId ? String(input.categoryId) : null,
        type: input.type ?? 0,
        q_type: input.qType ?? 0,
        title: input.title,
        title_file: input.titleFile ?? null,
        hint: input.hint ?? null,
        hint_file: input.hintFile ?? null,
        solution: input.solution ?? null,
        solution_file: input.solutionFile ?? null,
        is_equation: input.isEquation ?? 0,
        number_of_options: input.numberOfOptions ?? 4,
        options: input.options ?? '[]',
        correct_answers: input.correctAnswers ?? '[]',
        range_from: input.rangeFrom ?? null,
        range_to: input.rangeTo ?? null,
        updated_by: actorUserId,
        updated_at: now,
      },
    });

    return { status: 1, message: 'Question updated successfully.' };
  }

  async deleteQuestion(actorUserId: string, questionId: string): Promise<Record<string, unknown>> {
    const now = new Date();

    await this.prisma.question_bank.updateMany({
      where: { id: questionId, deleted_at: null },
      data: { deleted_by: actorUserId, deleted_at: now },
    });

    return { status: 1, message: 'Question deleted successfully.' };
  }

  // ─── Phase 2: Exams ────────────────────────────────────────────────────────

  async listAdminExams(filters: AdminExamFilters = {}): Promise<{
    exams: SqlRow[];
    summary: { total: number; upcoming: number; expired: number; practice: number };
  }> {
    const where: Record<string, unknown> = { deleted_at: null };
    if (filters.courseId) where.course_id = filters.courseId;
    if (filters.subjectId) where.subject_id = filters.subjectId;
    if (filters.batchId) where.batch_id = filters.batchId;

    const examRows = await this.prisma.exam.findMany({ where: where as any, orderBy: { id: 'desc' } });

    const examIds = examRows.map(e => e.id);
    const courseIds = [...new Set(examRows.map(e => e.course_id).filter(Boolean))] as string[];
    const subjectIds = [...new Set(examRows.map(e => e.subject_id).filter(Boolean))] as string[];
    const batchIds = [...new Set(examRows.map(e => e.batch_id).filter(Boolean))] as string[];

    const [courses, subjects, batches, questionCounts, attemptCounts] = await Promise.all([
      courseIds.length > 0 ? this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } }) : [],
      subjectIds.length > 0 ? this.prisma.subject.findMany({ where: { id: { in: subjectIds } }, select: { id: true, title: true } }) : [],
      batchIds.length > 0 ? this.prisma.batch.findMany({ where: { id: { in: batchIds } }, select: { id: true, title: true } }) : [],
      examIds.length > 0 ? this.prisma.exam_questions.groupBy({ by: ['exam_id'], where: { exam_id: { in: examIds }, deleted_at: null }, _count: { id: true } }) : [],
      examIds.length > 0 ? this.prisma.exam_attempt.groupBy({ by: ['exam_id'], where: { exam_id: { in: examIds }, submit_status: 1, deleted_at: null }, _count: { id: true } }) : [],
    ]);

    const courseMap = new Map(courses.map(c => [c.id, c]));
    const subjectMap = new Map(subjects.map(s => [s.id, s]));
    const batchMap = new Map(batches.map(b => [b.id, b]));
    const qCountMap = new Map(questionCounts.map(qc => [qc.exam_id, qc._count.id]));
    const aCountMap = new Map(attemptCounts.map(ac => [ac.exam_id, ac._count.id]));

    const exams = examRows.map(e => ({
      ...e,
      course_title: e.course_id ? courseMap.get(e.course_id)?.title ?? null : null,
      subject_title: e.subject_id ? subjectMap.get(e.subject_id)?.title ?? null : null,
      batch_title: e.batch_id ? batchMap.get(e.batch_id)?.title ?? null : null,
      question_count: qCountMap.get(e.id) ?? 0,
      attempt_count: aCountMap.get(e.id) ?? 0,
    })) as unknown as SqlRow[];

    const now = new Date().toISOString().slice(0, 10);
    let upcoming = 0;
    let expired = 0;
    let practice = 0;

    for (const exam of exams) {
      if (toInteger(exam.is_practice) === 1) practice++;
      const toDate = toStringValue(exam.to_date).slice(0, 10);
      const fromDate = toStringValue(exam.from_date).slice(0, 10);
      if (fromDate > now) upcoming++;
      else if (toDate < now) expired++;
    }

    return { exams, summary: { total: exams.length, upcoming, expired, practice } };
  }

  async addExam(actorUserId: string, input: ExamInput): Promise<Record<string, unknown>> {
    if (!input.title.trim()) {
      return { status: 0, message: 'Exam title is required.' };
    }

    const now = new Date();

    const exam = await this.prisma.exam.create({
      data: {
        title: input.title,
        description: input.description ?? null,
        mark: input.mark ?? 0,
        duration: input.duration ?? null,
        from_date: input.fromDate ? new Date(input.fromDate) : null,
        to_date: input.toDate ? new Date(input.toDate) : null,
        from_time: input.fromTime ?? null,
        to_time: input.toTime ?? null,
        course_id: String(input.courseId),
        subject_id: input.subjectId ? String(input.subjectId) : null,
        lesson_id: input.lessonId ? String(input.lessonId) : null,
        batch_id: input.batchId ? String(input.batchId) : null,
        free: input.free ?? '0',
        publish_result: input.publishResult ?? 0,
        is_practice: input.isPractice ?? 0,
        created_by: actorUserId,
        created_at: now,
        updated_at: now,
      },
    });

    if (exam.id && input.questionIds && input.questionIds.length > 0) {
      for (let i = 0; i < input.questionIds.length; i++) {
        const qId = input.questionIds[i];
        await this.prisma.exam_questions.create({
          data: {
            exam_id: exam.id,
            question_id: String(qId),
            question_no: i + 1,
            mark: (input.mark ?? 0) / input.questionIds.length,
            created_by: actorUserId,
            created_at: now,
            updated_at: now,
          },
        });
      }
    }

    return { status: 1, message: 'Exam created successfully.', data: { id: exam.id } };
  }

  async editExam(actorUserId: string, examId: string, input: ExamInput): Promise<Record<string, unknown>> {
    if (!input.title.trim()) {
      return { status: 0, message: 'Exam title is required.' };
    }

    const now = new Date();

    await this.prisma.exam.updateMany({
      where: { id: examId, deleted_at: null },
      data: {
        title: input.title,
        description: input.description ?? null,
        mark: input.mark ?? 0,
        duration: input.duration ?? null,
        from_date: input.fromDate ? new Date(input.fromDate) : null,
        to_date: input.toDate ? new Date(input.toDate) : null,
        from_time: input.fromTime ?? null,
        to_time: input.toTime ?? null,
        course_id: String(input.courseId),
        subject_id: input.subjectId ? String(input.subjectId) : null,
        lesson_id: input.lessonId ? String(input.lessonId) : null,
        batch_id: input.batchId ? String(input.batchId) : null,
        free: input.free ?? '0',
        publish_result: input.publishResult ?? 0,
        is_practice: input.isPractice ?? 0,
        updated_by: actorUserId,
        updated_at: now,
      },
    });

    return { status: 1, message: 'Exam updated successfully.' };
  }

  async deleteExam(actorUserId: string, examId: string): Promise<Record<string, unknown>> {
    const now = new Date();
    await this.prisma.exam.updateMany({ where: { id: examId, deleted_at: null }, data: { deleted_by: actorUserId, deleted_at: now } });
    return { status: 1, message: 'Exam deleted successfully.' };
  }

  async publishExamResult(actorUserId: string, examId: string): Promise<Record<string, unknown>> {
    const now = new Date();
    await this.prisma.exam.updateMany({ where: { id: examId, deleted_at: null }, data: { publish_result: 1, updated_by: actorUserId, updated_at: now } });
    return { status: 1, message: 'Exam results published.' };
  }

  // ─── Phase 2: Assignments ──────────────────────────────────────────────────

  async listAdminAssignments(filters: AdminAssignmentFilters = {}): Promise<SqlRow[]> {
    const where: Record<string, unknown> = { deleted_at: null };
    if (filters.courseId) where.course_id = filters.courseId;
    if (filters.cohortId) where.cohort_id = filters.cohortId;

    const assignments = await this.prisma.assignment.findMany({ where: where as any, orderBy: { id: 'desc' } });

    const assignmentIds = assignments.map(a => a.id);
    const courseIds = [...new Set(assignments.map(a => a.course_id).filter(Boolean))] as string[];
    const cohortIds = [...new Set(assignments.map(a => a.cohort_id).filter(Boolean))] as string[];

    const [courses, cohorts, submissionCounts] = await Promise.all([
      courseIds.length > 0 ? this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } }) : [],
      cohortIds.length > 0 ? this.prisma.cohorts.findMany({ where: { id: { in: cohortIds } }, select: { id: true, title: true } }) : [],
      assignmentIds.length > 0 ? this.prisma.assignment_submissions.groupBy({ by: ['assignment_id'], where: { assignment_id: { in: assignmentIds }, deleted_at: null }, _count: { id: true } }) : [],
    ]);

    const courseMap = new Map(courses.map(c => [c.id, c]));
    const cohortMap = new Map(cohorts.map(c => [c.id, c]));
    const subCountMap = new Map(submissionCounts.map(sc => [sc.assignment_id, sc._count.id]));

    return assignments.map(a => ({
      ...a,
      course_title: a.course_id ? courseMap.get(a.course_id)?.title ?? null : null,
      cohort_title: a.cohort_id ? cohortMap.get(a.cohort_id)?.title ?? null : null,
      submission_count: subCountMap.get(a.id) ?? 0,
    })) as unknown as SqlRow[];
  }

  async addAssignment(actorUserId: string, input: AssignmentInput): Promise<Record<string, unknown>> {
    if (!input.title.trim()) {
      return { status: 0, message: 'Assignment title is required.' };
    }

    const now = new Date();

    await this.prisma.assignment.create({
      data: {
        title: input.title,
        description: input.description ?? null,
        total_marks: input.totalMarks ?? 0,
        added_date: input.addedDate ? new Date(input.addedDate) : now,
        due_date: input.dueDate ? new Date(input.dueDate) : null,
        from_time: input.fromTime ?? null,
        to_time: input.toTime ?? null,
        instructions: input.instructions ?? null,
        file: input.file ?? null,
        course_id: String(input.courseId),
        cohort_id: input.cohortId ? String(input.cohortId) : null,
        created_by: actorUserId,
        created_at: now,
        updated_at: now,
      },
    });

    return { status: 1, message: 'Assignment created successfully.' };
  }

  async editAssignment(actorUserId: string, assignmentId: string, input: AssignmentInput): Promise<Record<string, unknown>> {
    if (!input.title.trim()) {
      return { status: 0, message: 'Assignment title is required.' };
    }

    const now = new Date();

    await this.prisma.assignment.updateMany({
      where: { id: assignmentId, deleted_at: null },
      data: {
        title: input.title,
        description: input.description ?? null,
        total_marks: input.totalMarks ?? 0,
        due_date: input.dueDate ? new Date(input.dueDate) : null,
        from_time: input.fromTime ?? null,
        to_time: input.toTime ?? null,
        instructions: input.instructions ?? null,
        file: input.file ?? null,
        course_id: String(input.courseId),
        cohort_id: input.cohortId ? String(input.cohortId) : null,
        updated_by: actorUserId,
        updated_at: now,
      },
    });

    return { status: 1, message: 'Assignment updated successfully.' };
  }

  async deleteAssignment(actorUserId: string, assignmentId: string): Promise<Record<string, unknown>> {
    const now = new Date();
    await this.prisma.assignment.updateMany({ where: { id: assignmentId, deleted_at: null }, data: { deleted_by: actorUserId, deleted_at: now } });
    return { status: 1, message: 'Assignment deleted successfully.' };
  }

  async listAssignmentSubmissions(assignmentId: string): Promise<SqlRow[]> {
    const subs = await this.prisma.assignment_submissions.findMany({ where: { assignment_id: assignmentId, deleted_at: null }, orderBy: { id: 'desc' } });
    const userIds = [...new Set(subs.map(s => s.user_id).filter(Boolean))];
    const users = userIds.length > 0 ? await this.prisma.users.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, student_id: true } }) : [];
    const userMap = new Map(users.map(u => [u.id, u]));

    return subs.map(s => ({
      ...s,
      student_name: s.user_id ? userMap.get(s.user_id)?.name ?? null : null,
      student_id: s.user_id ? userMap.get(s.user_id)?.student_id ?? null : null,
    })) as unknown as SqlRow[];
  }

  async evaluateSubmission(
    actorUserId: string,
    submissionId: string,
    marks: string,
    remarks?: string,
  ): Promise<Record<string, unknown>> {
    const now = new Date();
    await this.prisma.assignment_submissions.updateMany({
      where: { id: submissionId, deleted_at: null },
      data: { marks, remarks: remarks ?? null, updated_by: actorUserId, updated_at: now },
    });
    return { status: 1, message: 'Submission evaluated successfully.' };
  }

  // ─── Phase 2: Exam Results ─────────────────────────────────────────────────

  async listAdminExamResults(filters: AdminExamResultFilters = {}): Promise<{ exams: SqlRow[]; results: SqlRow[] }> {
    const examWhere: Record<string, unknown> = { deleted_at: null };
    if (filters.courseId) examWhere.course_id = filters.courseId;
    if (filters.batchId) examWhere.batch_id = filters.batchId;

    const exams = await this.prisma.exam.findMany({ where: examWhere as any, select: { id: true, title: true, mark: true, course_id: true, batch_id: true }, orderBy: { title: 'asc' } });

    let results: SqlRow[] = [];
    if (filters.examId) {
      const examIdStr = filters.examId;
      const attempts = await this.prisma.exam_attempt.findMany({ where: { exam_id: examIdStr, submit_status: 1, deleted_at: null }, orderBy: { score: 'desc' } });
      const userIds = [...new Set(attempts.map(a => a.user_id))];
      const [users, examRow] = await Promise.all([
        userIds.length > 0 ? this.prisma.users.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, student_id: true } }) : [],
        this.prisma.exam.findFirst({ where: { id: examIdStr }, select: { title: true, mark: true } }),
      ]);
      const userMap = new Map(users.map(u => [u.id, u]));
      results = attempts.map(ea => ({ ...ea, student_name: userMap.get(ea.user_id)?.name ?? null, student_id: userMap.get(ea.user_id)?.student_id ?? null, exam_title: examRow?.title ?? null, total_marks: examRow?.mark ?? null })) as unknown as SqlRow[];
    }

    return { exams: exams as unknown as SqlRow[], results };
  }

  // ─── Phase 2: Exam Evaluation ──────────────────────────────────────────────

  async listExamEvaluations(filters: AdminExamEvaluationFilters = {}): Promise<{ exams: SqlRow[]; pendingEvaluations: SqlRow[] }> {
    const examWhere: Record<string, unknown> = { deleted_at: null };
    if (filters.courseId) examWhere.course_id = filters.courseId;

    const exams = await this.prisma.exam.findMany({ where: examWhere as any, select: { id: true, title: true, mark: true, course_id: true }, orderBy: { title: 'asc' } });

    const evalWhere: Record<string, unknown> = { submit_status: 1, deleted_at: null };
    if (filters.examId) evalWhere.exam_id = filters.examId;
    // For course filter, get matching exam IDs
    if (filters.courseId) {
      const courseExamIds = exams.map(e => e.id);
      if (courseExamIds.length > 0) evalWhere.exam_id = { in: courseExamIds };
      else return { exams: exams as unknown as SqlRow[], pendingEvaluations: [] };
    }

    const attempts = await this.prisma.exam_attempt.findMany({ where: evalWhere as any, orderBy: { id: 'desc' } });
    const userIds = [...new Set(attempts.map(a => a.user_id))];
    const examIds = [...new Set(attempts.map(a => a.exam_id))];
    const [users, examDetails] = await Promise.all([
      userIds.length > 0 ? this.prisma.users.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, student_id: true } }) : [],
      examIds.length > 0 ? this.prisma.exam.findMany({ where: { id: { in: examIds } }, select: { id: true, title: true, mark: true } }) : [],
    ]);
    const userMap = new Map(users.map(u => [u.id, u]));
    const examMap = new Map(examDetails.map(e => [e.id, e]));

    const pendingEvaluations = attempts.map(ea => ({
      ...ea,
      student_name: userMap.get(ea.user_id)?.name ?? null,
      student_id: userMap.get(ea.user_id)?.student_id ?? null,
      exam_title: examMap.get(ea.exam_id)?.title ?? null,
      total_marks: examMap.get(ea.exam_id)?.mark ?? null,
    })) as unknown as SqlRow[];

    return { exams: exams as unknown as SqlRow[], pendingEvaluations };
  }

  async evaluateExamAttempt(actorUserId: string, attemptId: string, score: number): Promise<Record<string, unknown>> {
    const now = new Date();
    await this.prisma.exam_attempt.updateMany({ where: { id: attemptId, deleted_at: null }, data: { score, updated_by: actorUserId, updated_at: now } });
    return { status: 1, message: 'Exam attempt evaluated successfully.' };
  }

  // ─── Phase 2: Re-Examination ───────────────────────────────────────────────

  async listReExams(filters: AdminReExamFilters = {}): Promise<SqlRow[]> {
    const where: Record<string, unknown> = { deleted_at: null };
    if (filters.courseId) where.course_id = filters.courseId;
    if (filters.batchId) where.batch_id = filters.batchId;

    const examRows = await this.prisma.exam.findMany({ where: where as any, orderBy: { id: 'desc' } });
    const examIds = examRows.map(e => e.id);
    const courseIds = [...new Set(examRows.map(e => e.course_id).filter(Boolean))] as string[];
    const batchIds = [...new Set(examRows.map(e => e.batch_id).filter(Boolean))] as string[];

    const [courses, batches, attemptCounts, allAttempts] = await Promise.all([
      courseIds.length > 0 ? this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } }) : [],
      batchIds.length > 0 ? this.prisma.batch.findMany({ where: { id: { in: batchIds } }, select: { id: true, title: true } }) : [],
      examIds.length > 0 ? this.prisma.exam_attempt.groupBy({ by: ['exam_id'], where: { exam_id: { in: examIds }, submit_status: 1, deleted_at: null }, _count: { id: true } }) : [],
      examIds.length > 0 ? this.prisma.exam_attempt.findMany({ where: { exam_id: { in: examIds }, submit_status: 1, deleted_at: null }, select: { exam_id: true, score: true } }) : [],
    ]);

    const courseMap = new Map(courses.map(c => [c.id, c]));
    const batchMap = new Map(batches.map(b => [b.id, b]));
    const attemptCountMap = new Map(attemptCounts.map(ac => [ac.exam_id, ac._count.id]));

    // Calculate failed counts in JS (score < mark * 0.4)
    const failedCountMap = new Map<string, number>();
    for (const e of examRows) {
      const threshold = (e.mark ?? 0) * 0.4;
      const failed = allAttempts.filter(a => a.exam_id === e.id && a.score < threshold).length;
      failedCountMap.set(e.id, failed);
    }

    return examRows.map(e => ({
      ...e,
      course_title: e.course_id ? courseMap.get(e.course_id)?.title ?? null : null,
      batch_title: e.batch_id ? batchMap.get(e.batch_id)?.title ?? null : null,
      total_attempts: attemptCountMap.get(e.id) ?? 0,
      failed_count: failedCountMap.get(e.id) ?? 0,
    })) as unknown as SqlRow[];
  }

  async grantReExam(actorUserId: string, examId: string, userIds: string[]): Promise<Record<string, unknown>> {
    if (userIds.length === 0) {
      return { status: 0, message: 'No students selected.' };
    }

    const now = new Date();
    for (const userId of userIds) {
      await this.prisma.exam_attempt.updateMany({
        where: { exam_id: examId, user_id: userId, submit_status: 1, deleted_at: null },
        data: { deleted_by: actorUserId, deleted_at: now },
      });
    }

    return { status: 1, message: `Re-exam granted to ${userIds.length} student(s).` };
  }

  // ─── Phase 2: Entrance Exams ───────────────────────────────────────────────

  async listEntranceExams(): Promise<SqlRow[]> {
    const eeRows = await this.prisma.entrance_exam.findMany({ where: { deleted_at: null }, orderBy: { id: 'desc' } });
    const eeIds = eeRows.map(e => e.id);
    const courseIds = [...new Set(eeRows.map(e => e.course_id).filter(Boolean))] as string[];

    const [courses, regCounts] = await Promise.all([
      courseIds.length > 0 ? this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } }) : [],
      eeIds.length > 0 ? this.prisma.entrance_exam_registration.groupBy({ by: ['entrance_exam_id'], where: { entrance_exam_id: { in: eeIds }, deleted_at: null }, _count: { id: true } }) : [],
    ]);
    const courseMap = new Map(courses.map(c => [c.id, c]));
    const regCountMap = new Map(regCounts.map(rc => [rc.entrance_exam_id, rc._count.id]));

    return eeRows.map(ee => ({
      ...ee,
      course_title: ee.course_id ? courseMap.get(ee.course_id)?.title ?? null : null,
      registration_count: regCountMap.get(ee.id) ?? 0,
    })) as unknown as SqlRow[];
  }

  async addEntranceExam(actorUserId: string, input: EntranceExamInput): Promise<Record<string, unknown>> {
    if (!input.title.trim()) return { status: 0, message: 'Entrance exam title is required.' };
    const now = new Date();
    await this.prisma.entrance_exam.create({
      data: {
        title: input.title, description: input.description ?? null, total_marks: input.totalMarks ?? 0,
        duration: input.duration ?? null, exam_date: input.examDate ? new Date(input.examDate) : null,
        from_time: input.fromTime ?? null, to_time: input.toTime ?? null,
        course_id: String(input.courseId), status: input.status ?? 'draft', question_ids: input.questionIds ?? '[]',
        created_by: actorUserId, created_at: now, updated_at: now,
      },
    });
    return { status: 1, message: 'Entrance exam created successfully.' };
  }

  async editEntranceExam(actorUserId: string, examId: string, input: EntranceExamInput): Promise<Record<string, unknown>> {
    if (!input.title.trim()) return { status: 0, message: 'Entrance exam title is required.' };
    const now = new Date();
    await this.prisma.entrance_exam.updateMany({
      where: { id: examId, deleted_at: null },
      data: {
        title: input.title, description: input.description ?? null, total_marks: input.totalMarks ?? 0,
        duration: input.duration ?? null, exam_date: input.examDate ? new Date(input.examDate) : null,
        from_time: input.fromTime ?? null, to_time: input.toTime ?? null,
        course_id: String(input.courseId), status: input.status ?? 'draft', question_ids: input.questionIds ?? '[]',
        updated_by: actorUserId, updated_at: now,
      },
    });
    return { status: 1, message: 'Entrance exam updated successfully.' };
  }

  async deleteEntranceExam(actorUserId: string, examId: string): Promise<Record<string, unknown>> {
    const now = new Date();
    await this.prisma.entrance_exam.updateMany({ where: { id: examId, deleted_at: null }, data: { deleted_by: actorUserId, deleted_at: now } });
    return { status: 1, message: 'Entrance exam deleted successfully.' };
  }

  async listEntranceExamRegistrations(examId?: string): Promise<SqlRow[]> {
    const where: Record<string, unknown> = { deleted_at: null };
    if (examId) where.entrance_exam_id = examId;

    const regs = await this.prisma.entrance_exam_registration.findMany({ where: where as any, orderBy: { id: 'desc' } });
    const eeIds = [...new Set(regs.map(r => r.entrance_exam_id))];
    const courseIds = [...new Set(regs.map(r => r.course_id).filter(Boolean))] as string[];

    const [ees, courses] = await Promise.all([
      eeIds.length > 0 ? this.prisma.entrance_exam.findMany({ where: { id: { in: eeIds } }, select: { id: true, title: true } }) : [],
      courseIds.length > 0 ? this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } }) : [],
    ]);
    const eeMap = new Map(ees.map(e => [e.id, e]));
    const courseMap = new Map(courses.map(c => [c.id, c]));

    return regs.map(r => ({
      ...r,
      exam_title: eeMap.get(r.entrance_exam_id)?.title ?? null,
      course_title: r.course_id ? courseMap.get(r.course_id)?.title ?? null : null,
    })) as unknown as SqlRow[];
  }

  async listEntranceExamResults(examId?: string): Promise<SqlRow[]> {
    const where: Record<string, unknown> = { deleted_at: null };
    if (examId) where.entrance_exam_id = examId;

    const results = await this.prisma.entrance_exam_result.findMany({ where: where as any, orderBy: { score: 'desc' } });
    const regIds = [...new Set(results.map(r => r.registration_id))];
    const eeIds = [...new Set(results.map(r => r.entrance_exam_id))];

    const [regs, ees] = await Promise.all([
      regIds.length > 0 ? this.prisma.entrance_exam_registration.findMany({ where: { id: { in: regIds } }, select: { id: true, name: true, email: true, phone: true } }) : [],
      eeIds.length > 0 ? this.prisma.entrance_exam.findMany({ where: { id: { in: eeIds } }, select: { id: true, title: true } }) : [],
    ]);
    const regMap = new Map(regs.map(r => [r.id, r]));
    const eeMap = new Map(ees.map(e => [e.id, e]));

    return results.map(res => ({
      ...res,
      name: regMap.get(res.registration_id)?.name ?? null,
      email: regMap.get(res.registration_id)?.email ?? null,
      phone: regMap.get(res.registration_id)?.phone ?? null,
      exam_title: eeMap.get(res.entrance_exam_id)?.title ?? null,
    })) as unknown as SqlRow[];
  }

  // ─── Phase 3: Operations & People ───────────────────────────────────────────

  async listInstructors(): Promise<SqlRow[]> {
    const instructors = await this.prisma.users.findMany({
      where: { role_id: 3, deleted_at: null },
      orderBy: { id: 'desc' },
      select: { id: true, name: true, user_email: true, phone: true, status: true, created_at: true },
    });

    const instructorIds = instructors.map(i => i.id);
    if (instructorIds.length === 0) return [] as unknown as SqlRow[];

    const [enrolments, cohortCounts] = await Promise.all([
      this.prisma.instructor_enrol.findMany({
        where: { instructor_id: { in: instructorIds }, deleted_at: null },
        select: { instructor_id: true, course_id: true },
      }),
      this.prisma.cohorts.groupBy({
        by: ['instructor_id'],
        where: { instructor_id: { in: instructorIds }, deleted_at: null },
        _count: { id: true },
      }),
    ]);

    const courseIds = [...new Set(enrolments.map(e => e.course_id).filter((x): x is number => x !== null && x !== undefined))];
    const courses = courseIds.length > 0
      ? await this.prisma.course.findMany({ where: { id: { in: courseIds }, deleted_at: null }, select: { id: true, title: true } })
      : [];
    const courseMap = new Map(courses.map(c => [c.id, c.title]));

    const instructorCoursesMap = new Map<number, string[]>();
    for (const e of enrolments) {
      if (e.course_id === null || e.course_id === undefined || e.instructor_id === null || e.instructor_id === undefined) continue;
      const title = courseMap.get(e.course_id);
      if (title) {
        if (!instructorCoursesMap.has(e.instructor_id)) instructorCoursesMap.set(e.instructor_id, []);
        const arr = instructorCoursesMap.get(e.instructor_id)!;
        if (!arr.includes(title)) arr.push(title);
      }
    }

    const cohortCountMap = new Map(cohortCounts.map(c => [c.instructor_id, c._count.id]));

    return instructors.map(i => ({
      ...i,
      assigned_courses: instructorCoursesMap.get(i.id)?.join(',') ?? null,
      cohort_count: cohortCountMap.get(i.id) ?? 0,
    })) as unknown as SqlRow[];
  }

  async listUsersByRole(roleId: number): Promise<SqlRow[]> {
    const users = await this.prisma.users.findMany({
      where: { role_id: roleId, deleted_at: null },
      orderBy: { id: 'desc' },
      select: { id: true, name: true, user_email: true, phone: true, status: true, created_at: true, updated_at: true },
    });
    return users as unknown as SqlRow[];
  }

  async addAdminCohort(actorUserId: string, input: AdminCohortInput): Promise<Record<string, unknown>> {
    if (!input.title.trim()) {
      return { status: 0, message: 'Cohort title is required.' };
    }

    const cohortCode = input.cohortCode?.trim() || `COH-${Date.now()}`;
    const now = new Date();

    await this.prisma.cohorts.create({
      data: {
        title: input.title,
        cohort_id: cohortCode,
        course_id: input.courseId || null,
        subject_id: input.subjectId || null,
        centre_id: input.centreId || null,
        instructor_id: input.instructorId || null,
        start_date: input.startDate ? new Date(input.startDate) : null,
        end_date: input.endDate ? new Date(input.endDate) : null,
        created_by: actorUserId,
        created_at: now,
        updated_at: now,
      },
    });

    return { status: 1, message: 'Cohort created successfully.' };
  }

  async listCourseFees(): Promise<SqlRow[]> {
    const courses = await this.prisma.course.findMany({
      where: { deleted_at: null },
      orderBy: { id: 'desc' },
      select: { id: true, title: true, price: true, sale_price: true },
    });

    const courseIds = courses.map(c => c.id);
    if (courseIds.length === 0) return [] as unknown as SqlRow[];

    const [allFees, paymentAggs] = await Promise.all([
      this.prisma.student_fee.findMany({
        where: { course_id: { in: courseIds }, deleted_at: null },
        select: { course_id: true, user_id: true, amount: true, status: true },
      }),
      this.prisma.payment_info.groupBy({
        by: ['course_id'],
        where: { course_id: { in: courseIds }, deleted_at: null },
        _count: { user_id: true },
        _sum: { amount_paid: true },
      }),
    ]);

    // Build fee aggregates per course
    const feeAggMap = new Map<string, { uniqueUsers: Set<string>; totalAmount: number; paidAmount: number; pendingAmount: number }>();
    for (const sf of allFees) {
      if (!feeAggMap.has(sf.course_id)) {
        feeAggMap.set(sf.course_id, { uniqueUsers: new Set(), totalAmount: 0, paidAmount: 0, pendingAmount: 0 });
      }
      const agg = feeAggMap.get(sf.course_id)!;
      agg.uniqueUsers.add(sf.user_id);
      agg.totalAmount += sf.amount;
      if (sf.status === 'paid') {
        agg.paidAmount += sf.amount;
      } else {
        agg.pendingAmount += sf.amount;
      }
    }

    // Payment info aggregates (distinct user count approximated by groupBy _count)
    const paymentMap = new Map(paymentAggs.map(p => [p.course_id, { payments_count: p._count.user_id, total_collected: p._sum.amount_paid ?? 0 }]));

    return courses.map(c => {
      const feeAgg = feeAggMap.get(c.id);
      const payAgg = paymentMap.get(c.id);
      return {
        course_id: c.id,
        course_title: c.title,
        price: c.price,
        sale_price: c.sale_price,
        students_with_fees: feeAgg?.uniqueUsers.size ?? 0,
        total_fee_amount: feeAgg?.totalAmount ?? 0,
        paid_amount: feeAgg?.paidAmount ?? 0,
        pending_amount: feeAgg?.pendingAmount ?? 0,
        payments_count: payAgg?.payments_count ?? 0,
        total_collected: payAgg?.total_collected ?? 0,
      };
    }) as unknown as SqlRow[];
  }

  async listFeeInstallments(filters: FeeInstallmentFilters & { search?: string; centreId?: string }): Promise<Record<string, unknown>> {
    const studentWhere: Record<string, unknown> = { deleted_at: null };
    if (filters.courseId) studentWhere.course_id = filters.courseId;

    const allStudents = await this.prisma.students.findMany({
      where: studentWhere as any,
      select: { id: true, user_id: true, course_id: true, enrollment_id: true, total_fee: true },
    });

    const userIds = [...new Set(allStudents.map(s => s.user_id))];
    const courseIds = [...new Set(allStudents.map(s => s.course_id).filter(Boolean))] as string[];

    const [users, courses, fees] = await Promise.all([
      userIds.length > 0 ? this.prisma.users.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, student_id: true, phone: true } }) : [],
      courseIds.length > 0 ? this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } }) : [],
      userIds.length > 0 ? this.prisma.student_fee.findMany({ where: { user_id: { in: userIds }, deleted_at: null } }) : [],
    ]);

    const userMap = new Map(users.map(u => [u.id, u]));
    const courseMap = new Map(courses.map(c => [c.id, c.title]));

    // Group fees by user_id+course_id
    const feeCountMap = new Map<string, number>();
    const feeSumMap = new Map<string, number>();
    for (const f of fees) {
      const key = `${f.user_id}|${f.course_id}`;
      feeCountMap.set(key, (feeCountMap.get(key) ?? 0) + 1);
      feeSumMap.set(key, (feeSumMap.get(key) ?? 0) + f.amount);
    }

    let items = allStudents.map(s => {
      const key = `${s.user_id}|${s.course_id ?? ''}`;
      const installments_added = feeCountMap.get(key) ?? 0;
      const instalments_sum = feeSumMap.get(key) ?? 0;
      const totalFee = s.total_fee ?? 0;

      let fee_plan_status = 'not_added';
      if (installments_added > 0) {
        fee_plan_status = totalFee > 0 && instalments_sum >= totalFee ? 'fully_added' : 'partially_added';
      }

      return {
        student_record_id: s.id,
        user_id: s.user_id,
        course_id: s.course_id,
        enrollment_id: s.enrollment_id,
        student_name: userMap.get(s.user_id)?.name ?? null,
        student_id: userMap.get(s.user_id)?.student_id ?? null,
        phone: userMap.get(s.user_id)?.phone ?? null,
        course_title: s.course_id ? courseMap.get(s.course_id) ?? null : null,
        total_fee: totalFee,
        installments_added,
        fee_plan_status,
      };
    });

    // Filter by status tab
    if (filters.status && filters.status !== 'all') {
      items = items.filter(i => i.fee_plan_status === filters.status);
    }

    // Filter by search
    if (filters.search) {
      const sl = filters.search.toLowerCase();
      items = items.filter(i => {
        const name = toStringValue(i.student_name).toLowerCase();
        const sid = toStringValue(i.student_id).toLowerCase();
        return name.includes(sl) || sid.includes(sl);
      });
    }

    const counts = { fully_added: 0, partially_added: 0, not_added: 0 };
    for (const i of items) {
      const s = i.fee_plan_status as keyof typeof counts;
      if (s in counts) counts[s]++;
    }

    return { counts, items };
  }

  async listPaymentStatus(filters: AdminPaymentFilters & { centreId?: string; search?: string }): Promise<Record<string, unknown>> {
    const where: Record<string, unknown> = { deleted_at: null };
    if (filters.courseId) where.course_id = filters.courseId;

    const installments = await this.prisma.student_payments.findMany({
      where: where as any,
      orderBy: [{ due_date: 'asc' }, { id: 'desc' }],
    });

    const userIds = [...new Set(installments.map(i => i.user_id))];
    const courseIds = [...new Set(installments.map(i => i.course_id).filter(Boolean))] as string[];

    const [users, courses] = await Promise.all([
      userIds.length > 0 ? this.prisma.users.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } }) : [],
      courseIds.length > 0 ? this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } }) : [],
    ]);
    const userMap = new Map(users.map(u => [u.id, u]));
    const courseMap = new Map(courses.map(c => [c.id, c.title]));

    // Compute status for each installment
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    let enriched = installments.map(inst => {
      const isPaid = inst.status === 'Paid' || inst.paid_date != null;
      let computed_status = 'upcoming';
      if (isPaid) {
        computed_status = 'paid';
      } else if (inst.due_date) {
        const dueDate = new Date(inst.due_date);
        dueDate.setHours(0, 0, 0, 0);
        if (dueDate < today) {
          computed_status = 'overdue';
        } else if (dueDate <= sevenDaysLater) {
          computed_status = 'due';
        }
      }
      return {
        ...inst,
        user_name: userMap.get(inst.user_id)?.name ?? null,
        course_title: inst.course_id ? courseMap.get(inst.course_id) ?? null : null,
        computed_status,
      };
    });

    // Filter by search text (user name)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      enriched = enriched.filter(r => {
        const name = toStringValue(r.user_name).toLowerCase();
        return name.includes(searchLower);
      });
    }

    // Count by status
    const counts = { overdue: 0, due: 0, upcoming: 0, paid: 0 };
    for (const r of enriched) {
      const s = r.computed_status as keyof typeof counts;
      if (s in counts) counts[s]++;
    }

    return { counts, installments: enriched };
  }

  async listCohortAttendance(filters: CohortAttendanceFilters): Promise<SqlRow[]> {
    // If cohort filter is set, first find live_class IDs for that cohort
    let liveIdFilter: string[] | undefined;
    if (filters.cohortId) {
      const livesForCohort = await this.prisma.live_class.findMany({
        where: { cohort_id: filters.cohortId, deleted_at: null },
        select: { id: true },
      });
      liveIdFilter = livesForCohort.map(l => l.id);
      if (liveIdFilter.length === 0) return [] as unknown as SqlRow[];
    }

    const zhWhere: Record<string, unknown> = { deleted_at: null };
    if (liveIdFilter) zhWhere.live_id = { in: liveIdFilter };

    const records = await this.prisma.zoom_history.findMany({
      where: zhWhere as any,
      orderBy: [{ join_date: 'desc' }, { id: 'desc' }],
    });

    const userIds = [...new Set(records.map(r => r.user_id))];
    const liveIds = [...new Set(records.map(r => r.live_id))];

    const [users, liveClasses] = await Promise.all([
      userIds.length > 0 ? this.prisma.users.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, student_id: true } }) : [],
      liveIds.length > 0 ? this.prisma.live_class.findMany({ where: { id: { in: liveIds } }, select: { id: true, title: true, date: true, cohort_id: true } }) : [],
    ]);
    const userMap = new Map(users.map(u => [u.id, u]));
    const lcMap = new Map(liveClasses.map(l => [l.id, l]));

    const cohortIds = [...new Set(liveClasses.map(l => l.cohort_id).filter(Boolean))] as string[];
    const cohorts = cohortIds.length > 0
      ? await this.prisma.cohorts.findMany({ where: { id: { in: cohortIds } }, select: { id: true, title: true, course_id: true } })
      : [];
    const cohortMap = new Map(cohorts.map(ch => [ch.id, ch]));

    const courseIds = [...new Set(cohorts.map(ch => ch.course_id).filter(Boolean))] as string[];
    const courses = courseIds.length > 0
      ? await this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } })
      : [];
    const courseMap = new Map(courses.map(c => [c.id, c.title]));

    return records.map(zh => {
      const lc = lcMap.get(zh.live_id);
      const ch = lc?.cohort_id ? cohortMap.get(lc.cohort_id) : undefined;
      return {
        ...zh,
        student_name: userMap.get(zh.user_id)?.name ?? null,
        student_id: userMap.get(zh.user_id)?.student_id ?? null,
        session_title: lc?.title ?? null,
        session_date: lc?.date ?? null,
        cohort_title: ch?.title ?? null,
        course_title: ch?.course_id ? courseMap.get(ch.course_id) ?? null : null,
      };
    }) as unknown as SqlRow[];
  }

  async listScholarships(): Promise<SqlRow[]> {
    const coupons = await this.prisma.coupon_code.findMany({
      where: { deleted_at: null },
      orderBy: { id: 'desc' },
    });

    const packageIds = [...new Set(coupons.map(c => c.package_id).filter(Boolean))] as string[];
    const packages = packageIds.length > 0
      ? await this.prisma.course_package.findMany({ where: { id: { in: packageIds } }, select: { id: true, title: true } })
      : [];
    const packageMap = new Map(packages.map(p => [p.id, p.title]));

    return coupons.map(cc => ({
      ...cc,
      package_title: cc.package_id ? packageMap.get(cc.package_id) ?? null : null,
    })) as unknown as SqlRow[];
  }

  // ─── Phase 4: CRM & Content ─────────────────────────────────────────────────

  async listCounsellors(): Promise<SqlRow[]> {
    const counsellors = await this.prisma.users.findMany({
      where: { role_id: 9, deleted_at: null },
      orderBy: { id: 'desc' },
      select: { id: true, name: true, user_email: true, phone: true, status: true, centre_id: true, created_at: true },
    });

    const counsellorIds = counsellors.map(c => c.id);
    if (counsellorIds.length === 0) return [] as unknown as SqlRow[];

    const centreIdInts = [...new Set(counsellors.map(c => toNullableIntId(c.centre_id)).filter((x): x is number => x !== null))];

    const [centres, referredCounts, convertedCounts] = await Promise.all([
      centreIdInts.length > 0 ? this.prisma.centres.findMany({ where: { id: { in: centreIdInts } }, select: { id: true, centre_name: true } }) : [],
      this.prisma.applications.groupBy({
        by: ['pipeline_user'],
        where: { pipeline_user: { in: counsellorIds }, deleted_at: null },
        _count: { id: true },
      }),
      this.prisma.applications.groupBy({
        by: ['pipeline_user'],
        where: { pipeline_user: { in: counsellorIds }, is_converted: 1, deleted_at: null },
        _count: { id: true },
      }),
    ]);

    const centreMap = new Map(centres.map(c => [c.id, c.centre_name]));
    const referredMap = new Map(referredCounts.map(r => [r.pipeline_user, r._count.id]));
    const convertedMap = new Map(convertedCounts.map(r => [r.pipeline_user, r._count.id]));

    return counsellors.map(u => {
      const centreIdNum = toNullableIntId(u.centre_id);
      return {
        ...u,
        centre_name: centreIdNum !== null ? centreMap.get(centreIdNum) ?? null : null,
        applications_referred: referredMap.get(u.id) ?? 0,
        applications_converted: convertedMap.get(u.id) ?? 0,
      };
    }) as unknown as SqlRow[];
  }

  async listCounsellorTargets(): Promise<SqlRow[]> {
    const targets = await this.prisma.counsellor_target.findMany({
      where: { deleted_at: null },
      orderBy: [{ from_date: 'desc' }, { counsellor_target_id: 'desc' }],
    });

    const userIds = [...new Set(targets.map(t => t.counsellor_id))];
    const users = userIds.length > 0
      ? await this.prisma.users.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, user_email: true } })
      : [];
    const userMap = new Map(users.map(u => [u.id, u]));

    return targets.map(t => ({
      ...t,
      counsellor_name: userMap.get(t.counsellor_id)?.name ?? null,
      counsellor_email: userMap.get(t.counsellor_id)?.user_email ?? null,
    })) as unknown as SqlRow[];
  }

  async listAssociates(): Promise<SqlRow[]> {
    const associates = await this.prisma.users.findMany({
      where: { role_id: 10, deleted_at: null },
      orderBy: { id: 'desc' },
      select: { id: true, name: true, user_email: true, phone: true, status: true, centre_id: true, created_at: true },
    });

    const associateIds = associates.map(a => a.id);
    if (associateIds.length === 0) return [] as unknown as SqlRow[];

    const centreIdInts = [...new Set(associates.map(a => toNullableIntId(a.centre_id)).filter((x): x is number => x !== null))];

    const [centres, referredCounts, convertedCounts] = await Promise.all([
      centreIdInts.length > 0 ? this.prisma.centres.findMany({ where: { id: { in: centreIdInts } }, select: { id: true, centre_name: true } }) : [],
      this.prisma.applications.groupBy({
        by: ['pipeline_user'],
        where: { pipeline_user: { in: associateIds }, deleted_at: null },
        _count: { id: true },
      }),
      this.prisma.applications.groupBy({
        by: ['pipeline_user'],
        where: { pipeline_user: { in: associateIds }, is_converted: 1, deleted_at: null },
        _count: { id: true },
      }),
    ]);

    const centreMap = new Map(centres.map(c => [c.id, c.centre_name]));
    const referredMap = new Map(referredCounts.map(r => [r.pipeline_user, r._count.id]));
    const convertedMap = new Map(convertedCounts.map(r => [r.pipeline_user, r._count.id]));

    return associates.map(u => {
      const centreIdNum = toNullableIntId(u.centre_id);
      return {
        ...u,
        centre_name: centreIdNum !== null ? centreMap.get(centreIdNum) ?? null : null,
        applications_referred: referredMap.get(u.id) ?? 0,
        applications_converted: convertedMap.get(u.id) ?? 0,
      };
    }) as unknown as SqlRow[];
  }

  async listAssociateTargets(): Promise<SqlRow[]> {
    const targets = await this.prisma.associates_target.findMany({
      where: { deleted_at: null },
      orderBy: [{ from_date: 'desc' }, { associate_target_id: 'desc' }],
    });

    const userIds = [...new Set(targets.map(t => t.associate_id))];
    const users = userIds.length > 0
      ? await this.prisma.users.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, user_email: true } })
      : [];
    const userMap = new Map(users.map(u => [u.id, u]));

    return targets.map(t => ({
      ...t,
      associate_name: userMap.get(t.associate_id)?.name ?? null,
      associate_email: userMap.get(t.associate_id)?.user_email ?? null,
    })) as unknown as SqlRow[];
  }

  async listDocumentRequests(): Promise<SqlRow[]> {
    const requests = await this.prisma.document_request.findMany({
      where: { deleted_at: null },
      orderBy: { id: 'desc' },
    });

    const studentIds = [...new Set(requests.map(r => r.student_id))];
    const users = studentIds.length > 0
      ? await this.prisma.users.findMany({ where: { id: { in: studentIds } }, select: { id: true, name: true, student_id: true, user_email: true } })
      : [];
    const userMap = new Map(users.map(u => [u.id, u]));

    return requests.map(dr => ({
      ...dr,
      student_name: userMap.get(dr.student_id)?.name ?? null,
      student_code: userMap.get(dr.student_id)?.student_id ?? null,
      student_email: userMap.get(dr.student_id)?.user_email ?? null,
    })) as unknown as SqlRow[];
  }

  async listDocumentsIssued(): Promise<SqlRow[]> {
    const docs = await this.prisma.document_request.findMany({
      where: { deleted_at: null, status: { in: ['issued', 'delivered'] } },
      orderBy: [{ updated_at: 'desc' }, { id: 'desc' }],
    });

    const studentIds = [...new Set(docs.map(d => d.student_id))];
    const updaterIds = [...new Set(docs.map(d => d.updated_by).filter(Boolean))] as string[];
    const allUserIds = [...new Set([...studentIds, ...updaterIds])];

    const users = allUserIds.length > 0
      ? await this.prisma.users.findMany({ where: { id: { in: allUserIds } }, select: { id: true, name: true, student_id: true, user_email: true } })
      : [];
    const userMap = new Map(users.map(u => [u.id, u]));

    return docs.map(dr => ({
      ...dr,
      student_name: userMap.get(dr.student_id)?.name ?? null,
      student_code: userMap.get(dr.student_id)?.student_id ?? null,
      student_email: userMap.get(dr.student_id)?.user_email ?? null,
      issued_by_name: dr.updated_by ? userMap.get(dr.updated_by)?.name ?? null : null,
    })) as unknown as SqlRow[];
  }

  async listDocumentsDelivery(): Promise<SqlRow[]> {
    const docs = await this.prisma.document_request.findMany({
      where: {
        deleted_at: null,
        status: { in: ['issued', 'delivered'] },
        OR: [
          { tracking_number: { not: null } },
          { dispatch_date: { not: null } },
        ],
      },
      orderBy: [{ dispatch_date: 'desc' }, { id: 'desc' }],
    });

    const studentIds = [...new Set(docs.map(d => d.student_id))];
    const users = studentIds.length > 0
      ? await this.prisma.users.findMany({ where: { id: { in: studentIds } }, select: { id: true, name: true, student_id: true } })
      : [];
    const userMap = new Map(users.map(u => [u.id, u]));

    return docs.map(dr => ({
      ...dr,
      student_name: userMap.get(dr.student_id)?.name ?? null,
      student_code: userMap.get(dr.student_id)?.student_id ?? null,
    })) as unknown as SqlRow[];
  }

  async listAdminEvents(): Promise<SqlRow[]> {
    const events = await this.prisma.events.findMany({
      where: { deleted_at: null },
      orderBy: [{ event_date: 'desc' }, { id: 'desc' }],
    });

    const instructorIds = [...new Set(events.map(e => e.instructor_id).filter(Boolean))] as string[];
    const eventIds = events.map(e => e.id);

    const [instructors, regCounts] = await Promise.all([
      instructorIds.length > 0 ? this.prisma.users.findMany({ where: { id: { in: instructorIds } }, select: { id: true, name: true } }) : [],
      eventIds.length > 0 ? this.prisma.event_registration.groupBy({
        by: ['event_id'],
        where: { event_id: { in: eventIds }, deleted_at: null },
        _count: { id: true },
      }) : [],
    ]);

    const instructorMap = new Map(instructors.map(u => [u.id, u.name]));
    const regCountMap = new Map(regCounts.map(r => [r.event_id, r._count.id]));

    return events.map(e => ({
      ...e,
      instructor_name: e.instructor_id ? instructorMap.get(e.instructor_id) ?? null : null,
      registration_count: regCountMap.get(e.id) ?? 0,
    })) as unknown as SqlRow[];
  }

  async listCirculars(): Promise<SqlRow[]> {
    const circulars = await this.prisma.circular.findMany({
      where: { deleted_at: null },
      orderBy: { id: 'desc' },
    });

    const creatorIds = [...new Set(circulars.map(c => c.created_by).filter(Boolean))] as string[];
    const users = creatorIds.length > 0
      ? await this.prisma.users.findMany({ where: { id: { in: creatorIds } }, select: { id: true, name: true } })
      : [];
    const userMap = new Map(users.map(u => [u.id, u.name]));

    return circulars.map(c => ({
      ...c,
      created_by_name: c.created_by ? userMap.get(c.created_by) ?? null : null,
    })) as unknown as SqlRow[];
  }

  async listMentorshipHistory(): Promise<SqlRow[]> {
    const sessions = await this.prisma.mentorship_session.findMany({
      where: { deleted_at: null },
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    });

    const studentIds = [...new Set(sessions.map(s => s.student_id))];
    const users = studentIds.length > 0
      ? await this.prisma.users.findMany({ where: { id: { in: studentIds } }, select: { id: true, name: true, student_id: true, user_email: true } })
      : [];
    const userMap = new Map(users.map(u => [u.id, u]));

    return sessions.map(ms => ({
      ...ms,
      student_name: userMap.get(ms.student_id)?.name ?? null,
      student_code: userMap.get(ms.student_id)?.student_id ?? null,
      student_email: userMap.get(ms.student_id)?.user_email ?? null,
    })) as unknown as SqlRow[];
  }

  async mentorshipAnalysis(): Promise<Record<string, unknown>> {
    const [totalSessions, aiSessions, durationAgg, ratingAgg] = await Promise.all([
      this.prisma.mentorship_session.count({ where: { deleted_at: null } }),
      this.prisma.mentorship_session.count({ where: { deleted_at: null, mentor_type: 'ai' } }),
      this.prisma.mentorship_session.aggregate({
        where: { deleted_at: null, duration_minutes: { gt: 0 } },
        _avg: { duration_minutes: true },
      }),
      this.prisma.mentorship_session.aggregate({
        where: { deleted_at: null, satisfaction_rating: { not: null } },
        _avg: { satisfaction_rating: true },
      }),
    ]);

    // Topic breakdown: groupBy + aggregate per topic
    const topicGroups = await this.prisma.mentorship_session.groupBy({
      by: ['topic'],
      where: { deleted_at: null },
      _count: { id: true },
      _avg: { duration_minutes: true, satisfaction_rating: true },
      orderBy: { _count: { id: 'desc' } },
    });

    const topicBreakdown = topicGroups.map(g => ({
      topic: g.topic ?? 'General',
      session_count: g._count.id,
      avg_duration: g._avg.duration_minutes ?? 0,
      avg_rating: g._avg.satisfaction_rating ?? 0,
    }));

    return {
      totalSessions,
      aiSessions,
      humanSessions: totalSessions - aiSessions,
      avgDuration: toDbNumber(durationAgg._avg.duration_minutes),
      avgRating: toDbNumber(ratingAgg._avg.satisfaction_rating),
      topicBreakdown,
    };
  }

  // ── Phase 5: Integrations & Polish ──────────────────────────────

  async listAdminSupportChats(): Promise<SqlRow[]> {
    const groups = await this.prisma.support_chat.groupBy({
      by: ['chat_id'],
      where: { deleted_at: null },
      _count: { id: true },
      _max: { created_at: true },
      _min: { created_at: true },
      orderBy: { _max: { created_at: 'desc' } },
    });

    const chatIds = groups.map(g => g.chat_id);
    const users = chatIds.length > 0
      ? await this.prisma.users.findMany({ where: { id: { in: chatIds } }, select: { id: true, name: true, user_email: true } })
      : [];
    const userMap = new Map(users.map(u => [u.id, u]));

    return groups.map(g => ({
      chat_id: g.chat_id,
      user_name: userMap.get(g.chat_id)?.name ?? null,
      user_email: userMap.get(g.chat_id)?.user_email ?? null,
      message_count: g._count.id,
      last_message_at: g._max.created_at,
      first_message_at: g._min.created_at,
    })) as unknown as SqlRow[];
  }

  async listAdminTrainingVideos(): Promise<SqlRow[]> {
    const videos = await this.prisma.training_videos.findMany({
      where: { deleted_at: null },
      orderBy: { id: 'desc' },
      select: { id: true, title: true, description: true, category: true, video_type: true, video_url: true, thumbnail: true, created_at: true },
    });
    return videos as unknown as SqlRow[];
  }

  async listAdminEnrollments(): Promise<SqlRow[]> {
    const enrollments = await this.prisma.enrol.findMany({
      where: { deleted_at: null },
      orderBy: { id: 'desc' },
    });

    const userIds = [...new Set(enrollments.map(e => e.user_id))];
    const courseIds = [...new Set(enrollments.map(e => e.course_id))];
    const batchIds = [...new Set(enrollments.map(e => e.batch_id).filter(Boolean))] as string[];

    const [users, courses, batches] = await Promise.all([
      userIds.length > 0 ? this.prisma.users.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, user_email: true } }) : [],
      courseIds.length > 0 ? this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } }) : [],
      batchIds.length > 0 ? this.prisma.batch.findMany({ where: { id: { in: batchIds } }, select: { id: true, title: true } }) : [],
    ]);
    const userMap = new Map(users.map(u => [u.id, u]));
    const courseMap = new Map(courses.map(c => [c.id, c.title]));
    const batchMap = new Map(batches.map(b => [b.id, b.title]));

    return enrollments.map(e => ({
      ...e,
      student_name: userMap.get(e.user_id)?.name ?? null,
      student_email: userMap.get(e.user_id)?.user_email ?? null,
      course_title: courseMap.get(e.course_id) ?? null,
      batch_title: e.batch_id ? batchMap.get(e.batch_id) ?? null : null,
    })) as unknown as SqlRow[];
  }

  async listAdminFeeds(): Promise<SqlRow[]> {
    const feeds = await this.prisma.feed.findMany({
      where: { deleted_at: null },
      orderBy: { id: 'desc' },
    });

    const feedIds = feeds.map(f => f.id);
    const instructorIds = [...new Set(feeds.map(f => f.instructor_id).filter(Boolean))] as string[];
    const courseIds = [...new Set(feeds.map(f => f.course_id).filter(Boolean))] as string[];

    const [instructors, courses, watchCounts, likeCounts, commentCounts] = await Promise.all([
      instructorIds.length > 0 ? this.prisma.users.findMany({ where: { id: { in: instructorIds } }, select: { id: true, name: true } }) : [],
      courseIds.length > 0 ? this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } }) : [],
      feedIds.length > 0 ? this.prisma.feed_watched.groupBy({
        by: ['feed_id'],
        where: { feed_id: { in: feedIds }, deleted_at: null },
        _count: { id: true },
      }) : [],
      feedIds.length > 0 ? this.prisma.feed_like.groupBy({
        by: ['feed_id'],
        where: { feed_id: { in: feedIds }, deleted_at: null },
        _count: { id: true },
      }) : [],
      feedIds.length > 0 ? this.prisma.feed_comments.groupBy({
        by: ['feed_id'],
        where: { feed_id: { in: feedIds }, deleted_at: null },
        _count: { id: true },
      }) : [],
    ]);

    const instructorMap = new Map(instructors.map(u => [u.id, u.name]));
    const courseMap = new Map(courses.map(c => [c.id, c.title]));
    const watchMap = new Map(watchCounts.map(w => [w.feed_id, w._count.id]));
    const likeMap = new Map(likeCounts.map(l => [l.feed_id, l._count.id]));
    const commentMap = new Map(commentCounts.map(c => [c.feed_id, c._count.id]));

    return feeds.map(f => ({
      ...f,
      instructor_name: f.instructor_id ? instructorMap.get(f.instructor_id) ?? null : null,
      course_title: f.course_id ? courseMap.get(f.course_id) ?? null : null,
      watch_count: watchMap.get(f.id) ?? 0,
      like_count: likeMap.get(f.id) ?? 0,
      comment_count: commentMap.get(f.id) ?? 0,
    })) as unknown as SqlRow[];
  }

  async listIntegrationSettings(): Promise<SqlRow[]> {
    const keywords = ['api', 'provider', 'gateway', 'secret', 'smtp', 'firebase', 'zoom', 'razorpay', 'whatsapp', 'sms', 'email', 'payment'];
    const settings = await this.prisma.settings.findMany({
      where: {
        deleted_at: null,
        OR: keywords.map(kw => ({ key: { contains: kw, mode: 'insensitive' as const } })),
      },
      orderBy: { key: 'asc' },
      select: { key: true, value: true },
    });
    return settings as unknown as SqlRow[];
  }

  async listAdminReviews(): Promise<SqlRow[]> {
    const reviews = await this.prisma.review.findMany({
      where: { deleted_at: null },
      orderBy: { id: 'desc' },
    });

    const reviewIds = reviews.map(r => r.id);
    const userIds = [...new Set(reviews.map(r => r.user_id).filter(Boolean))] as string[];
    const courseIds = [...new Set(reviews.map(r => r.course_id).filter(Boolean))] as string[];

    const [users, courses, likeCounts] = await Promise.all([
      userIds.length > 0 ? this.prisma.users.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, user_email: true } }) : [],
      courseIds.length > 0 ? this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } }) : [],
      reviewIds.length > 0 ? this.prisma.review_like.groupBy({
        by: ['review_id'],
        where: { review_id: { in: reviewIds }, deleted_at: null },
        _count: { id: true },
      }) : [],
    ]);

    const userMap = new Map(users.map(u => [u.id, u]));
    const courseMap = new Map(courses.map(c => [c.id, c.title]));
    const likeMap = new Map(likeCounts.map(l => [l.review_id, l._count.id]));

    return reviews.map(r => ({
      ...r,
      user_name: r.user_id ? userMap.get(r.user_id)?.name ?? null : null,
      user_email: r.user_id ? userMap.get(r.user_id)?.user_email ?? null : null,
      course_title: r.course_id ? courseMap.get(r.course_id) ?? null : null,
      like_count: likeMap.get(r.id) ?? 0,
    })) as unknown as SqlRow[];
  }

  async listLanguages(): Promise<SqlRow[]> {
    const languages = await this.prisma.language.findMany({
      where: { deleted_at: null },
      orderBy: { id: 'asc' },
      select: { id: true, title: true, code: true, status: true, created_at: true },
    });
    return languages as unknown as SqlRow[];
  }

  // ─── Phase A: CRUD for Instructors, Users, Counsellors, Associates, Targets ──

  async addInstructor(actorUserId: string, input: AddInstructorInput): Promise<Record<string, unknown>> {
    if (!input.name.trim()) return { status: 0, message: 'Name is required.' };
    if (!input.email.trim()) return { status: 0, message: 'Email is required.' };

    const existing = await this.prisma.users.findFirst({ where: { user_email: input.email.trim(), deleted_at: null } });
    if (existing) return { status: 0, message: 'Email already exists.' };

    const now = new Date();
    await this.prisma.users.create({
      data: {
        name: input.name.trim(),
        user_email: input.email.trim(),
        email: input.email.trim(),
        phone: input.phone?.trim() || null,
        role_id: 3,
        status: input.status ?? 1,
        gender: '',
        dynamic_link: '',
        image: '',
        profile_picture: '',
        application_id: 0,
        created_at: now,
        updated_at: now,
      },
    });
    return { status: 1, message: 'Instructor added successfully.' };
  }

  async editInstructor(actorUserId: string, id: string, input: AddInstructorInput): Promise<Record<string, unknown>> {
    if (!input.name.trim()) return { status: 0, message: 'Name is required.' };
    const now = new Date();
    await this.prisma.users.updateMany({
      where: { id: toIntId(id), deleted_at: null },
      data: {
        name: input.name.trim(),
        phone: input.phone?.trim() || null,
        status: input.status ?? 1,
        updated_at: now,
      },
    });
    return { status: 1, message: 'Instructor updated successfully.' };
  }

  async deleteInstructor(actorUserId: string, id: string): Promise<Record<string, unknown>> {
    const now = new Date();
    await this.prisma.users.updateMany({ where: { id: toIntId(id), deleted_at: null }, data: { deleted_by: toIntId(actorUserId), deleted_at: now } });
    return { status: 1, message: 'Instructor deleted successfully.' };
  }

  async addUser(actorUserId: string, input: AddUserInput): Promise<Record<string, unknown>> {
    if (!input.name.trim()) return { status: 0, message: 'Name is required.' };
    if (!input.email.trim()) return { status: 0, message: 'Email is required.' };
    if (!input.password.trim()) return { status: 0, message: 'Password is required.' };

    const existing = await this.prisma.users.findFirst({ where: { user_email: input.email.trim(), deleted_at: null } });
    if (existing) return { status: 0, message: 'Email already exists.' };

    const now = new Date();
    await this.prisma.users.create({
      data: {
        name: input.name.trim(),
        user_email: input.email.trim(),
        email: input.email.trim(),
        phone: input.phone?.trim() || null,
        password: input.password,
        role_id: input.roleId,
        status: 1,
        gender: '',
        dynamic_link: '',
        image: '',
        profile_picture: '',
        application_id: 0,
        created_at: now,
        updated_at: now,
      },
    });
    return { status: 1, message: 'User created successfully.' };
  }

  async editUser(actorUserId: string, id: string, input: { name: string; phone?: string }): Promise<Record<string, unknown>> {
    if (!input.name.trim()) return { status: 0, message: 'Name is required.' };
    const now = new Date();
    await this.prisma.users.updateMany({
      where: { id: toIntId(id), deleted_at: null },
      data: { name: input.name.trim(), phone: input.phone?.trim() || null, updated_at: now },
    });
    return { status: 1, message: 'User updated successfully.' };
  }

  async deleteUser(actorUserId: string, id: string): Promise<Record<string, unknown>> {
    const now = new Date();
    await this.prisma.users.updateMany({ where: { id: toIntId(id), deleted_at: null }, data: { deleted_by: toIntId(actorUserId), deleted_at: now } });
    return { status: 1, message: 'User deleted successfully.' };
  }

  async addAssociate(actorUserId: string, input: AddAssociateInput): Promise<Record<string, unknown>> {
    if (!input.name.trim()) return { status: 0, message: 'Name is required.' };
    if (!input.email.trim()) return { status: 0, message: 'Email is required.' };

    const existing = await this.prisma.users.findFirst({ where: { user_email: input.email.trim(), deleted_at: null } });
    if (existing) return { status: 0, message: 'Email already exists.' };

    const now = new Date();
    await this.prisma.users.create({
      data: {
        name: input.name.trim(),
        user_email: input.email.trim(),
        email: input.email.trim(),
        phone: input.phone?.trim() || null,
        role_id: 10,
        status: input.status ?? 1,
        gender: '',
        dynamic_link: '',
        image: '',
        profile_picture: '',
        application_id: 0,
        created_at: now,
        updated_at: now,
      },
    });
    return { status: 1, message: 'Associate added successfully.' };
  }

  async addCounsellorTarget(actorUserId: string, input: AddTargetInput): Promise<Record<string, unknown>> {
    if (!input.userId) return { status: 0, message: 'Counsellor is required.' };
    const now = new Date();
    await this.prisma.counsellor_target.create({
      data: {
        counsellor_id: toIntId(input.userId),
        type: 1,
        from_date: new Date(input.periodFrom),
        to_date: new Date(input.periodTo),
        value: input.targetValue,
        created_by: toIntId(actorUserId),
        created_at: now,
        updated_at: now,
      },
    });
    return { status: 1, message: 'Target added successfully.' };
  }

  async editCounsellorTarget(actorUserId: string, id: string, input: AddTargetInput): Promise<Record<string, unknown>> {
    const now = new Date();
    await this.prisma.counsellor_target.updateMany({
      where: { counsellor_target_id: toIntId(id), deleted_at: null },
      data: {
        counsellor_id: toIntId(input.userId),
        type: 1,
        from_date: new Date(input.periodFrom),
        to_date: new Date(input.periodTo),
        value: input.targetValue,
        updated_by: toIntId(actorUserId),
        updated_at: now,
      },
    });
    return { status: 1, message: 'Target updated successfully.' };
  }

  async deleteCounsellorTarget(actorUserId: string, id: string): Promise<Record<string, unknown>> {
    const now = new Date();
    await this.prisma.counsellor_target.updateMany({ where: { counsellor_target_id: toIntId(id), deleted_at: null }, data: { deleted_by: toIntId(actorUserId), deleted_at: now } });
    return { status: 1, message: 'Target deleted successfully.' };
  }

  async addAssociateTarget(actorUserId: string, input: AddTargetInput): Promise<Record<string, unknown>> {
    if (!input.userId) return { status: 0, message: 'Associate is required.' };
    const now = new Date();
    await this.prisma.associates_target.create({
      data: {
        associate_id: toIntId(input.userId),
        type: 1,
        from_date: new Date(input.periodFrom),
        to_date: new Date(input.periodTo),
        value: input.targetValue,
        created_by: toIntId(actorUserId),
        created_at: now,
        updated_at: now,
      },
    });
    return { status: 1, message: 'Target added successfully.' };
  }

  async editAssociateTarget(actorUserId: string, id: string, input: AddTargetInput): Promise<Record<string, unknown>> {
    const now = new Date();
    await this.prisma.associates_target.updateMany({
      where: { associate_target_id: toIntId(id), deleted_at: null },
      data: {
        associate_id: toIntId(input.userId),
        type: 1,
        from_date: new Date(input.periodFrom),
        to_date: new Date(input.periodTo),
        value: input.targetValue,
        updated_by: toIntId(actorUserId),
        updated_at: now,
      },
    });
    return { status: 1, message: 'Target updated successfully.' };
  }

  async deleteAssociateTarget(actorUserId: string, id: string): Promise<Record<string, unknown>> {
    const now = new Date();
    await this.prisma.associates_target.updateMany({ where: { associate_target_id: toIntId(id), deleted_at: null }, data: { deleted_by: toIntId(actorUserId), deleted_at: now } });
    return { status: 1, message: 'Target deleted successfully.' };
  }

  // ── Applications Phase B ────────────────────────────────────────────────────

  async getApplication(id: string): Promise<Record<string, unknown>> {
    if (!id) return { status: 0, message: 'Application ID is required.' };

    const app = await this.prisma.applications.findFirst({ where: { id: toIntId(id), deleted_at: null } });
    if (!app) return { status: 0, message: 'Application not found.' };

    // Resolve related records
    const [course, pipelineUser, centre, payments] = await Promise.all([
      app.course_id ? this.prisma.course.findFirst({ where: { id: app.course_id } }) : null,
      app.pipeline_user ? this.prisma.users.findFirst({ where: { id: app.pipeline_user }, select: { id: true, name: true } }) : null,
      app.added_under_centre ? this.prisma.centres.findFirst({ where: { id: app.added_under_centre }, select: { id: true, centre_name: true } }) : null,
      this.prisma.student_payments.findMany({ where: { user_id: toIntId(id), deleted_at: null }, orderBy: { id: 'desc' } }),
    ]);

    // Resolve batch
    const batch = app.batch_id ? await this.prisma.batch.findFirst({ where: { id: app.batch_id } }) : null;

    return {
      status: 1,
      application: {
        ...app,
        course_title: course?.title ?? null,
        pipeline_user_name: pipelineUser?.name ?? null,
        centre_name: centre?.centre_name ?? null,
        batch_title: batch?.title ?? null,
      },
      payments,
    };
  }

  async createApplication(actorUserId: string, input: AdminApplicationInput): Promise<Record<string, unknown>> {
    if (!input.firstName.trim()) return { status: 0, message: 'First name is required.' };
    if (!input.email.trim()) return { status: 0, message: 'Email is required.' };
    if (!input.phone.trim()) return { status: 0, message: 'Phone is required.' };

    const email = input.email.trim();
    const phone = input.phone.trim();

    const duplicate = await this.prisma.applications.findFirst({
      where: {
        deleted_at: null,
        OR: [
          { email: phone },
          { user_email: email },
          { phone },
        ],
      },
    });
    if (duplicate) return { status: 0, message: 'Application with same phone or email already exists.' };

    const now = new Date();
    const fullName = `${input.firstName.trim()} ${input.lastName?.trim() || ''}`.trim();

    // Auto-calculate age from DOB
    let age: number | null = null;
    if (input.dateOfBirth) {
      const dob = new Date(input.dateOfBirth);
      const ageDiff = now.getTime() - dob.getTime();
      age = Math.floor(ageDiff / (365.25 * 24 * 60 * 60 * 1000));
    }

    const created = await this.prisma.applications.create({
      data: {
        application_id: `APP-${Date.now()}`,
        name: fullName,
        phone,
        email: phone,
        user_email: email,
        country_code: '+91',
        date_of_birth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
        age,
        gender: input.gender || null,
        nationality: input.nationality || input.country || 'India',
        marital_status: input.maritalStatus || null,
        father_name: input.fatherName || null,
        mother_name: input.motherName || null,
        guardian_name: input.guardianName || null,
        aadhar_no: input.aadharNo || null,
        passport_no: input.passportNo || null,
        whatsapp_no: toIntId(input.whatsappNo),
        state: input.state || null,
        district: input.city || null,
        address: input.permanentAddress || (input.addressLine1 ? `${input.addressLine1}${input.addressLine2 ? ', ' + input.addressLine2 : ''}` : null),
        native_address: input.correspondenceAddress || null,
        second_code: 0,
        second_phone: input.alternatePhone || '',
        image: '',
        course_id: toNullableIntId(input.courseId),
        batch_id: toNullableIntId(input.batchId),
        enrollment_date: input.enrollmentDate || null,
        mode_of_study: input.modeOfStudy || null,
        preferred_language: input.language || null,
        marketing_source: input.leadSource || null,
        pipeline_user: toNullableIntId(input.pipelineUser),
        pipeline: input.pipeline || (input.pipelineUser ? '9' : null),
        status: (input.applicationStatus as any) || 'pending',
        added_under_centre: toNullableIntId(input.centreId),
        created_by: toIntId(actorUserId),
        updated_by: toIntId(actorUserId),
        created_at: now,
        updated_at: now,
      },
    });

    // Store qualification if provided
    if (input.highestQualification || input.institutionName || input.specialization) {
      await this.prisma.qualification.create({
        data: {
          user_id: created.id,
          qualification: input.highestQualification || null,
          percentage: input.percentageOrCgpa ? Number.parseInt(input.percentageOrCgpa, 10) || null : null,
          created_by: toIntId(actorUserId),
          created_at: now,
          updated_at: now,
        },
      });
    }

    return { status: 1, message: 'Application created successfully.', application_id: created.id };
  }

  async deleteApplication(actorUserId: string, id: string): Promise<Record<string, unknown>> {
    if (!id) return { status: 0, message: 'Application ID is required.' };
    const now = new Date();
    const result = await this.prisma.applications.updateMany({
      where: { id: toIntId(id), deleted_at: null },
      data: { deleted_by: toIntId(actorUserId), deleted_at: now },
    });
    if (result.count === 0) return { status: 0, message: 'Application not found.' };
    return { status: 1, message: 'Application deleted successfully.' };
  }

  async updateApplicationStatus(actorUserId: string, id: string, status: string, rejectReason?: string): Promise<Record<string, unknown>> {
    if (!id) return { status: 0, message: 'Application ID is required.' };
    if (!status) return { status: 0, message: 'Status is required.' };
    const now = new Date();
    const data: Record<string, unknown> = { status: status as any, updated_by: toIntId(actorUserId), updated_at: now };
    if (status === 'rejected' && rejectReason) {
      data.reject_reason = rejectReason;
    }
    const result = await this.prisma.applications.updateMany({
      where: { id: toIntId(id), deleted_at: null },
      data,
    });
    if (result.count === 0) return { status: 0, message: 'Application not found.' };
    return { status: 1, message: `Application ${status} successfully.` };
  }

  // ─── Phase C: Student Detail & Actions ──────────────────────────────────────

  async getStudentDetail(studentId: string): Promise<Record<string, unknown>> {
    if (!studentId) return { status: 0, message: 'Student ID is required.' };

    const user = await this.prisma.users.findFirst({
      where: { id: toIntId(studentId), role_id: 2, deleted_at: null },
    });
    if (!user) return { status: 0, message: 'Student not found.' };

    const enrolments = await this.prisma.enrol.findMany({
      where: { user_id: toIntId(studentId), deleted_at: null },
    });

    const courseIds = [...new Set(enrolments.map(e => e.course_id).filter((x): x is number => x !== null && x !== undefined))];
    const courses = courseIds.length > 0 ? await this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } }) : [];
    const courseMap = new Map(courses.map(c => [c.id, c]));

    const batchIds = [...new Set(enrolments.map(e => e.batch_id).filter((x): x is number => x !== null && x !== undefined))];
    const batches = batchIds.length > 0 ? await this.prisma.batch.findMany({ where: { id: { in: batchIds } }, select: { id: true, title: true } }) : [];
    const batchMap = new Map(batches.map(b => [b.id, b]));

    const payments = await this.prisma.payment_info.findMany({
      where: { user_id: toIntId(studentId), deleted_at: null },
      orderBy: { payment_date: 'desc' },
    });

    const studentFees: unknown[] = [];

    // LMS progress
    const videoProgress = await this.prisma.video_progress_status.findMany({
      where: { user_id: toIntId(studentId), deleted_at: null },
    });
    const materialProgress: unknown[] = [];
    const assignmentSubs = await this.prisma.assignment_submissions.findMany({
      where: { user_id: toIntId(studentId), deleted_at: null },
    });

    // Profile completion calc
    const profileFields = [user.name, user.user_email, user.phone, user.profile_picture];
    const filled = profileFields.filter(Boolean).length;
    const profileCompletion = Math.round((filled / profileFields.length) * 100);

    const enrichedEnrolments = enrolments.map(e => ({
      ...e,
      course_title: e.course_id ? courseMap.get(e.course_id)?.title ?? null : null,
      batch_title: e.batch_id ? batchMap.get(e.batch_id)?.title ?? null : null,
    }));

    return {
      status: 1,
      message: 'success',
      student: user,
      enrolments: enrichedEnrolments,
      payments,
      studentFees,
      videoProgress,
      materialProgress,
      assignmentSubmissions: assignmentSubs,
      profileCompletion,
    };
  }

  async changeStudentUsername(actorUserId: string, studentId: string, newUsername: string): Promise<Record<string, unknown>> {
    if (!studentId) return { status: 0, message: 'Student ID is required.' };
    if (!newUsername.trim()) return { status: 0, message: 'Username is required.' };

    const existing = await this.prisma.users.findFirst({ where: { username: newUsername.trim(), deleted_at: null, id: { not: toIntId(studentId) } } });
    if (existing) return { status: 0, message: 'Username already taken.' };

    const now = new Date();
    await this.prisma.users.updateMany({
      where: { id: toIntId(studentId), deleted_at: null },
      data: { username: newUsername.trim(), updated_by: toIntId(actorUserId), updated_at: now },
    });

    return { status: 1, message: 'Username updated successfully.' };
  }

  async changeStudentPassword(actorUserId: string, studentId: string, newPassword: string): Promise<Record<string, unknown>> {
    if (!studentId) return { status: 0, message: 'Student ID is required.' };
    if (!newPassword || newPassword.length < 6) return { status: 0, message: 'Password must be at least 6 characters.' };

    const hashed = await hashPassword(newPassword);
    const now = new Date();
    await this.prisma.users.updateMany({
      where: { id: toIntId(studentId), deleted_at: null },
      data: { password: hashed, updated_by: toIntId(actorUserId), updated_at: now },
    });

    return { status: 1, message: 'Password updated successfully.' };
  }

  async editStudentEnrollmentId(actorUserId: string, studentId: string, newEnrollmentId: string): Promise<Record<string, unknown>> {
    if (!studentId) return { status: 0, message: 'Student ID is required.' };
    if (!newEnrollmentId.trim()) return { status: 0, message: 'Enrollment ID is required.' };

    const now = new Date();
    const result = await this.prisma.enrol.updateMany({
      where: { user_id: toIntId(studentId), deleted_at: null },
      data: { enrollment_id: newEnrollmentId.trim(), updated_by: toIntId(actorUserId), updated_at: now },
    });

    if (result.count === 0) return { status: 0, message: 'No enrolment found for this student.' };
    return { status: 1, message: 'Enrollment ID updated successfully.' };
  }

  async editStudentInfo(actorUserId: string, studentId: string, name: string, phone: string): Promise<Record<string, unknown>> {
    if (!studentId) return { status: 0, message: 'Student ID is required.' };

    const now = new Date();
    await this.prisma.users.updateMany({
      where: { id: toIntId(studentId), deleted_at: null },
      data: { name: name.trim(), phone: phone.trim(), updated_by: toIntId(actorUserId), updated_at: now },
    });

    return { status: 1, message: 'Student info updated successfully.' };
  }

  async listBatchStudents(batchId: string): Promise<SqlRow[]> {
    if (!batchId) return [];

    const enrols = await this.prisma.enrol.findMany({
      where: { batch_id: toIntId(batchId), deleted_at: null },
      select: { user_id: true, course_id: true, enrollment_id: true },
    });

    const userIds = [...new Set(enrols.map(e => e.user_id).filter((x): x is number => x !== null && x !== undefined))];
    if (userIds.length === 0) return [];

    const users = await this.prisma.users.findMany({
      where: { id: { in: userIds }, deleted_at: null },
      select: { id: true, name: true, user_email: true, phone: true, student_id: true, status: true },
    });

    const statusLabels: Record<number, string> = { 0: 'Inactive', 1: 'Active', 2: 'Graduated', 3: 'Dropped' };
    const enrolMap = new Map(enrols.filter(e => e.user_id !== null && e.user_id !== undefined).map(e => [e.user_id as number, e]));

    return users.map(u => ({
      ...u,
      enrollment_id: enrolMap.get(u.id)?.enrollment_id ?? null,
      status_label: u.status !== null && u.status !== undefined ? statusLabels[u.status] ?? 'Unknown' : 'Unknown',
    })) as unknown as SqlRow[];
  }

  // ─── Phase D: Centres Feature ─────────────────────────────────────────────

  async getCentre(centreId: string): Promise<Record<string, unknown>> {
    const centre = await this.prisma.centres.findFirst({
      where: { id: toIntId(centreId), deleted_at: null },
    });

    if (!centre) {
      return { status: 0, message: 'Centre not found' };
    }

    const coursePlans = await this.prisma.centre_course_plans.findMany({
      where: { centre_id: toIntId(centreId), deleted_at: null },
    });

    const courseIds = [...new Set(coursePlans.map(cp => cp.course_id))];
    const courses = courseIds.length > 0
      ? await this.prisma.course.findMany({
          where: { id: { in: courseIds }, deleted_at: null },
          select: { id: true, title: true },
        })
      : [];
    const courseMap = new Map(courses.map(c => [c.id, c.title]));

    const fundRequestCount = await this.prisma.centre_fund_requests.count({
      where: { centre_id: toIntId(centreId), deleted_at: null },
    });

    const studentCount = centre.id
      ? await this.prisma.users.count({
          where: { added_under_centre: centre.id, role_id: { equals: 2 }, deleted_at: null },
        })
      : 0;

    return {
      status: 1,
      message: 'success',
      data: {
        centre: {
          ...centre,
          students_count: studentCount,
          fund_request_count: fundRequestCount,
        },
        course_plans: coursePlans.map(cp => ({
          ...cp,
          course_title: courseMap.get(cp.course_id) ?? null,
        })),
      },
    };
  }

  async updateCentre(actorUserId: string, centreId: string, input: UpdateCentreInput): Promise<Record<string, unknown>> {
    const now = new Date();

    const existing = await this.prisma.centres.findFirst({
      where: { id: toIntId(centreId), deleted_at: null },
    });
    if (!existing) {
      return { status: 0, message: 'Centre not found' };
    }

    await this.prisma.centres.update({
      where: { id: toIntId(centreId) },
      data: {
        ...(input.centreName ? { centre_name: input.centreName } : {}),
        ...(input.contactPerson !== undefined ? { contact_person: input.contactPerson } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.address !== undefined ? { address: input.address } : {}),
        ...(input.affiliationDocument !== undefined ? { affiliation_document: input.affiliationDocument } : {}),
        ...(input.registrationDate ? { date_of_registration: input.registrationDate } : {}),
        ...(input.expiryDate ? { date_of_expiry: input.expiryDate } : {}),
        updated_by: toIntId(actorUserId),
        updated_at: now,
      },
    });

    return { status: 1, message: 'Centre updated successfully.' };
  }

  async deleteCentre(actorUserId: string, centreId: string): Promise<Record<string, unknown>> {
    const now = new Date();

    const existing = await this.prisma.centres.findFirst({
      where: { id: toIntId(centreId), deleted_at: null },
    });
    if (!existing) {
      return { status: 0, message: 'Centre not found' };
    }

    await this.prisma.centres.update({
      where: { id: toIntId(centreId) },
      data: { deleted_at: now, deleted_by: toIntId(actorUserId), updated_at: now },
    });

    return { status: 1, message: 'Centre deleted successfully.' };
  }

  async approveFundRequest(actorUserId: string, requestId: string): Promise<Record<string, unknown>> {
    const now = new Date();

    const request = await this.prisma.centre_fund_requests.findFirst({
      where: { id: toIntId(requestId), deleted_at: null },
    });
    if (!request) {
      return { status: 0, message: 'Fund request not found' };
    }
    if (request.status !== 'pending') {
      return { status: 0, message: 'Fund request is already ' + request.status };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.centre_fund_requests.update({
        where: { id: toIntId(requestId) },
        data: { status: 'approved', updated_by: toIntId(actorUserId), updated_at: now },
      });

      await tx.wallet_transactions.create({
        data: {
          centre_id: request.centre_id,
          transaction_type: 'credit',
          amount: request.amount,
          remarks: `Fund request approved #${requestId}`,
          created_by: toIntId(actorUserId),
          created_at: now,
          updated_at: now,
        },
      });

      const centreRow = await tx.centres.findFirst({ where: { id: request.centre_id } });
      const currentBalance = Number(centreRow?.wallet_balance ?? '0') || 0;
      const addAmount = Number(request.amount) || 0;
      await tx.centres.update({
        where: { id: request.centre_id },
        data: {
          wallet_balance: String(currentBalance + addAmount),
          updated_by: toIntId(actorUserId),
          updated_at: now,
        },
      });
    });

    return { status: 1, message: 'Fund request approved and wallet credited.' };
  }

  async rejectFundRequest(actorUserId: string, requestId: string): Promise<Record<string, unknown>> {
    const now = new Date();

    const request = await this.prisma.centre_fund_requests.findFirst({
      where: { id: toIntId(requestId), deleted_at: null },
    });
    if (!request) {
      return { status: 0, message: 'Fund request not found' };
    }
    if (request.status !== 'pending') {
      return { status: 0, message: 'Fund request is already ' + request.status };
    }

    await this.prisma.centre_fund_requests.update({
      where: { id: toIntId(requestId) },
      data: { status: 'rejected', updated_by: toIntId(actorUserId), updated_at: now },
    });

    return { status: 1, message: 'Fund request rejected.' };
  }

  async getCohortDetail(cohortId: string): Promise<Record<string, unknown>> {
    const cohort = await this.prisma.cohorts.findFirst({
      where: { id: cohortId, deleted_at: null },
    });
    if (!cohort) {
      return { status: 0, message: 'Cohort not found' };
    }

    // Fetch related names
    const [course, subject, centre, instructor] = await Promise.all([
      cohort.course_id ? this.prisma.course.findFirst({ where: { id: cohort.course_id }, select: { id: true, title: true } }) : null,
      cohort.subject_id ? this.prisma.subject.findFirst({ where: { id: cohort.subject_id }, select: { id: true, title: true } }) : null,
      cohort.centre_id ? this.prisma.centres.findFirst({ where: { id: cohort.centre_id }, select: { id: true, centre_name: true } }) : null,
      cohort.instructor_id ? this.prisma.users.findFirst({ where: { id: cohort.instructor_id }, select: { id: true, name: true } }) : null,
    ]);

    // Learners
    const cohortStudents = await this.prisma.cohort_students.findMany({
      where: { cohort_id: cohortId, deleted_at: null },
    });
    const studentUserIds = cohortStudents.map(cs => cs.user_id);
    const studentUsers = studentUserIds.length > 0
      ? await this.prisma.users.findMany({
          where: { id: { in: studentUserIds }, deleted_at: null },
          select: { id: true, name: true, student_id: true, status: true },
        })
      : [];
    const statusLabels: Record<number, string> = { 0: 'Inactive', 1: 'Active', 2: 'Graduated', 3: 'Dropped' };
    const learners = studentUsers.map(u => ({
      ...u,
      enrollment_id: u.student_id,
      status_label: statusLabels[u.status] ?? 'Unknown',
    }));

    // Live sessions
    const liveSessions = await this.prisma.live_class.findMany({
      where: { cohort_id: cohortId, deleted_at: null },
      orderBy: { date: 'desc' },
    });

    // Assignments
    const assignments = await this.prisma.assignment.findMany({
      where: { cohort_id: cohortId, deleted_at: null },
      orderBy: { due_date: 'desc' },
    });
    const assignmentIds = assignments.map(a => a.id);
    const submissionCounts = assignmentIds.length > 0
      ? await this.prisma.assignment_submissions.groupBy({
          by: ['assignment_id'],
          where: { assignment_id: { in: assignmentIds }, deleted_at: null },
          _count: { id: true },
        })
      : [];
    const subCountMap = new Map(submissionCounts.map(sc => [sc.assignment_id, sc._count.id]));

    const assignmentsWithCounts = assignments.map(a => ({
      ...a,
      submissions_count: subCountMap.get(a.id) ?? 0,
    }));

    return {
      status: 1,
      message: 'success',
      data: {
        cohort: {
          ...cohort,
          course_title: course?.title ?? null,
          subject_title: subject?.title ?? null,
          centre_name: centre?.centre_name ?? null,
          instructor_name: instructor?.name ?? null,
        },
        learners,
        live_sessions: liveSessions,
        assignments: assignmentsWithCounts,
      },
    };
  }

  async deleteResource(actorUserId: string, resourceId: string, resourceType: 'file' | 'folder'): Promise<Record<string, unknown>> {
    const now = new Date();

    if (resourceType === 'folder') {
      await this.prisma.folder.updateMany({
        where: { id: resourceId, deleted_at: null },
        data: { deleted_at: now, deleted_by: actorUserId },
      });
    } else {
      await this.prisma.file.updateMany({
        where: { id: resourceId, deleted_at: null },
        data: { deleted_at: now, deleted_by: actorUserId },
      });
    }

    return { status: 1, message: `${resourceType === 'folder' ? 'Folder' : 'File'} deleted successfully.` };
  }

  async renameResource(actorUserId: string, resourceId: string, resourceType: 'file' | 'folder', newName: string): Promise<Record<string, unknown>> {
    const now = new Date();

    if (resourceType === 'folder') {
      await this.prisma.folder.updateMany({
        where: { id: resourceId, deleted_at: null },
        data: { name: newName, updated_by: actorUserId, updated_at: now },
      });
    } else {
      await this.prisma.file.updateMany({
        where: { id: resourceId, deleted_at: null },
        data: { name: newName, updated_by: actorUserId, updated_at: now },
      });
    }

    return { status: 1, message: `${resourceType === 'folder' ? 'Folder' : 'File'} renamed successfully.` };
  }

  async addTrainingVideo(actorUserId: string, input: TrainingVideoInput): Promise<Record<string, unknown>> {
    const now = new Date();

    await this.prisma.training_videos.create({
      data: {
        title: input.title,
        description: toNullableString(input.description),
        category: toNullableString(input.category),
        video_type: toNullableString(input.videoType),
        video_url: toNullableString(input.videoUrl),
        thumbnail: toNullableString(input.thumbnail),
        created_by: actorUserId,
        created_at: now,
        updated_at: now,
      },
    });

    return { status: 1, message: 'Training video added successfully.' };
  }

  async editTrainingVideo(actorUserId: string, videoId: string, input: TrainingVideoInput): Promise<Record<string, unknown>> {
    const now = new Date();

    await this.prisma.training_videos.updateMany({
      where: { id: videoId, deleted_at: null },
      data: {
        title: input.title,
        description: toNullableString(input.description),
        category: toNullableString(input.category),
        video_type: toNullableString(input.videoType),
        video_url: toNullableString(input.videoUrl),
        thumbnail: toNullableString(input.thumbnail),
        updated_by: actorUserId,
        updated_at: now,
      },
    });

    return { status: 1, message: 'Training video updated successfully.' };
  }

  async deleteTrainingVideo(actorUserId: string, videoId: string): Promise<Record<string, unknown>> {
    const now = new Date();

    await this.prisma.training_videos.updateMany({
      where: { id: videoId, deleted_at: null },
      data: { deleted_at: now, deleted_by: actorUserId, updated_at: now },
    });

    return { status: 1, message: 'Training video deleted successfully.' };
  }

  async editCentre(actorUserId: string, centreId: string, input: UpdateCentreInput): Promise<Record<string, unknown>> {
    return this.updateCentre(actorUserId, centreId, input);
  }

  // ── Phase F: Payment Actions ──────────────────────────────────

  async markInstallmentPaid(actorUserId: string, installmentId: string): Promise<Record<string, unknown>> {
    const now = new Date();
    await this.prisma.student_payments.updateMany({
      where: { id: installmentId, deleted_at: null },
      data: { status: 'Paid', paid_date: now, updated_by: actorUserId, updated_at: now },
    });
    return { status: 1, message: 'Installment marked as paid.' };
  }

  async sendPaymentReminder(actorUserId: string, installmentId: string): Promise<Record<string, unknown>> {
    const installment = await this.prisma.student_payments.findFirst({
      where: { id: installmentId, deleted_at: null },
    });
    if (!installment) {
      return { status: 0, message: 'Installment not found.' };
    }
    await this.prisma.payment_reminders.create({
      data: {
        user_id: installment.user_id,
        course_id: installment.course_id,
        reminder_type: 'manual',
        sent_at: new Date(),
        created_at: new Date(),
      },
    });
    return { status: 1, message: 'Payment reminder sent successfully.' };
  }

  // ── Phase F: Chat Support ─────────────────────────────────────

  async listAdminConversations(): Promise<Record<string, unknown>> {
    const groups = await this.prisma.support_chat.groupBy({
      by: ['chat_id'],
      where: { deleted_at: null },
      _count: { id: true },
      _max: { created_at: true },
      _min: { created_at: true },
      orderBy: { _max: { created_at: 'desc' } },
    });

    const chatIds = groups.map(g => g.chat_id).filter((x): x is number => x !== null && x !== undefined);
    if (chatIds.length === 0) return { conversations: [] };

    const lastMessages = await Promise.all(
      chatIds.map(chatId =>
        this.prisma.support_chat.findFirst({
          where: { chat_id: chatId, deleted_at: null },
          orderBy: { created_at: 'desc' },
          select: { message: true, sender_id: true, created_at: true },
        })
      )
    );
    const lastMsgMap = new Map<number, typeof lastMessages[number]>();
    chatIds.forEach((id, idx) => { lastMsgMap.set(id, lastMessages[idx] ?? null); });

    const users = await this.prisma.users.findMany({
      where: { id: { in: chatIds } },
      select: { id: true, name: true, user_email: true, role_id: true, profile_picture: true },
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    const conversations = groups.map(g => {
      const chatIdNum = g.chat_id;
      const user = chatIdNum !== null && chatIdNum !== undefined ? userMap.get(chatIdNum) : undefined;
      const lastMsg = chatIdNum !== null && chatIdNum !== undefined ? lastMsgMap.get(chatIdNum) : undefined;
      return {
        chat_id: g.chat_id,
        user_name: user?.name ?? 'Unknown',
        user_email: user?.user_email ?? null,
        user_photo: user?.profile_picture ?? null,
        role_id: user?.role_id ?? null,
        message_count: g._count.id,
        last_message: lastMsg?.message ?? null,
        last_message_at: g._max.created_at,
        first_message_at: g._min.created_at,
      };
    });

    return { conversations };
  }

  async getConversationMessages(chatId: string): Promise<Record<string, unknown>> {
    const chatIdNum = toIntId(chatId);
    const messages = await this.prisma.support_chat.findMany({
      where: { chat_id: chatIdNum, deleted_at: null },
      orderBy: { created_at: 'asc' },
      select: { id: true, sender_id: true, message: true, created_at: true },
    });

    const senderIds = [...new Set(messages.map(m => m.sender_id).filter((x): x is number => x !== null && x !== undefined))];
    const senders = senderIds.length > 0
      ? await this.prisma.users.findMany({ where: { id: { in: senderIds } }, select: { id: true, name: true, profile_picture: true } })
      : [];
    const senderMap = new Map(senders.map(s => [s.id, s]));

    return {
      messages: messages.map(m => ({
        id: m.id,
        sender_id: m.sender_id,
        sender_name: m.sender_id !== null && m.sender_id !== undefined ? senderMap.get(m.sender_id)?.name ?? 'Unknown' : 'Unknown',
        sender_photo: m.sender_id !== null && m.sender_id !== undefined ? senderMap.get(m.sender_id)?.profile_picture ?? null : null,
        message: m.message,
        created_at: m.created_at,
        is_admin: m.sender_id !== chatIdNum,
      })),
    };
  }

  async sendAdminMessage(actorUserId: string, chatId: string, messageText: string): Promise<Record<string, unknown>> {
    const now = new Date();
    await this.prisma.support_chat.create({
      data: {
        chat_id: toNullableIntId(chatId),
        sender_id: toNullableIntId(actorUserId),
        message: messageText,
        created_by: toIntId(actorUserId),
        created_at: now,
        updated_at: now,
      },
    });
    return { status: 1, message: 'Message sent.' };
  }

  // ── Counsellor CRUD ─────────────────────────────────────────────

  async addCounsellor(actorUserId: string, input: AddAssociateInput): Promise<Record<string, unknown>> {
    if (!input.name.trim()) return { status: 0, message: 'Name is required.' };
    if (!input.email.trim()) return { status: 0, message: 'Email is required.' };

    const existing = await this.prisma.users.findFirst({ where: { user_email: input.email.trim(), deleted_at: null } });
    if (existing) return { status: 0, message: 'Email already exists.' };

    const now = new Date();
    await this.prisma.users.create({
      data: {
        name: input.name.trim(),
        user_email: input.email.trim(),
        email: input.email.trim(),
        phone: input.phone?.trim() || null,
        role_id: 9,
        status: input.status ?? 1,
        gender: '',
        dynamic_link: '',
        image: '',
        profile_picture: '',
        application_id: 0,
        created_at: now,
        updated_at: now,
      },
    });
    return { status: 1, message: 'Counsellor added successfully.' };
  }

  async editCounsellor(actorUserId: string, id: string, input: { name: string; phone?: string; status?: number }): Promise<Record<string, unknown>> {
    if (!input.name.trim()) return { status: 0, message: 'Name is required.' };
    const now = new Date();
    const data: Record<string, unknown> = { name: input.name.trim(), phone: input.phone?.trim() || null, updated_at: now };
    if (input.status !== undefined) data.status = input.status;
    await this.prisma.users.updateMany({ where: { id: toIntId(id), deleted_at: null }, data });
    return { status: 1, message: 'Counsellor updated successfully.' };
  }

  async deleteCounsellor(actorUserId: string, id: string): Promise<Record<string, unknown>> {
    const now = new Date();
    await this.prisma.users.updateMany({ where: { id: toIntId(id), deleted_at: null }, data: { deleted_by: toIntId(actorUserId), deleted_at: now } });
    return { status: 1, message: 'Counsellor deleted successfully.' };
  }

  // ── Associate Edit/Delete ───────────────────────────────────────

  async editAssociate(actorUserId: string, id: string, input: { name: string; phone?: string; status?: number }): Promise<Record<string, unknown>> {
    if (!input.name.trim()) return { status: 0, message: 'Name is required.' };
    const now = new Date();
    const data: Record<string, unknown> = { name: input.name.trim(), phone: input.phone?.trim() || null, updated_at: now };
    if (input.status !== undefined) data.status = input.status;
    await this.prisma.users.updateMany({ where: { id: toIntId(id), deleted_at: null }, data });
    return { status: 1, message: 'Associate updated successfully.' };
  }

  async deleteAssociate(actorUserId: string, id: string): Promise<Record<string, unknown>> {
    const now = new Date();
    await this.prisma.users.updateMany({ where: { id: toIntId(id), deleted_at: null }, data: { deleted_by: toIntId(actorUserId), deleted_at: now } });
    return { status: 1, message: 'Associate deleted successfully.' };
  }
}
