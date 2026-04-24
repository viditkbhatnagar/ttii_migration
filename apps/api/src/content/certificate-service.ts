import type { PrismaClient, completion_policies, certificate_templates } from '@prisma/client';
import { getPrismaClient } from '../data/prisma-client.js';

// Completion policies and certificate templates are now backed by real
// tables (session 11, phase H). `certificates` issuance is not yet backed
// — kept as an empty list until a later session adds that table.

export type CompletionPolicyInput = {
  title: string;
  course_id?: string | undefined;
  offering_id?: string | undefined;
  min_progress_pct?: number | undefined;
  min_exam_score_pct?: number | undefined;
  require_all_assignments?: number | undefined;
  require_all_exams?: number | undefined;
  min_attendance_pct?: number | undefined;
  require_manual_approval?: number | undefined;
};

export type CertificateTemplateInput = {
  title: string;
  description?: string | undefined;
  template?: string | undefined;
  signatory?: string | undefined;
  course_id?: string | undefined;
  program_id?: string | undefined;
};

export type IssueCertificateInput = {
  user_id: string;
  offering_id?: string | undefined;
  course_id?: string | undefined;
  program_id?: string | undefined;
  template_id?: string | undefined;
  policy_id?: string | undefined;
  result_snapshot?: string | undefined;
};

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

function serializePolicy(row: completion_policies): Record<string, unknown> {
  return {
    id: String(row.id),
    title: row.title,
    course_id: row.course_id ? String(row.course_id) : '',
    offering_id: row.offering_id ? String(row.offering_id) : '',
    min_progress_pct: row.min_progress_pct,
    min_exam_score_pct: row.min_exam_score_pct,
    require_all_assignments: row.require_all_assignments ?? 0,
    require_all_exams: row.require_all_exams ?? 0,
    min_attendance_pct: row.min_attendance_pct,
    require_manual_approval: row.require_manual_approval ?? 0,
    created_at: row.created_at,
  };
}

function serializeTemplate(row: certificate_templates): Record<string, unknown> {
  return {
    id: String(row.id),
    title: row.title,
    description: row.description ?? '',
    template: row.template ?? '',
    signatory: row.signatory ?? '',
    course_id: row.course_id ? String(row.course_id) : '',
    program_id: row.program_id ? String(row.program_id) : '',
    created_at: row.created_at,
  };
}

export class CertificateService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  async listPolicies(): Promise<Record<string, unknown>[]> {
    const rows = await this.prisma.completion_policies.findMany({
      where: { deleted_at: null },
      orderBy: { id: 'desc' },
    });
    return rows.map(serializePolicy);
  }

  async createPolicy(actorUserId: string, input: CompletionPolicyInput): Promise<Record<string, unknown>> {
    const actor = toNullableIntId(actorUserId);
    const created = await this.prisma.completion_policies.create({
      data: {
        title: input.title,
        course_id: toNullableIntId(input.course_id),
        offering_id: toNullableIntId(input.offering_id),
        min_progress_pct: input.min_progress_pct ?? null,
        min_exam_score_pct: input.min_exam_score_pct ?? null,
        require_all_assignments: input.require_all_assignments ?? 0,
        require_all_exams: input.require_all_exams ?? 0,
        min_attendance_pct: input.min_attendance_pct ?? null,
        require_manual_approval: input.require_manual_approval ?? 0,
        created_by: actor,
        updated_by: actor,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    return serializePolicy(created);
  }

  async updatePolicy(actorUserId: string, policyId: string, input: CompletionPolicyInput): Promise<void> {
    const id = toIntId(policyId);
    if (!id) throw new Error('Invalid policy id');
    await this.prisma.completion_policies.update({
      where: { id },
      data: {
        title: input.title,
        course_id: toNullableIntId(input.course_id),
        offering_id: toNullableIntId(input.offering_id),
        min_progress_pct: input.min_progress_pct ?? null,
        min_exam_score_pct: input.min_exam_score_pct ?? null,
        require_all_assignments: input.require_all_assignments ?? 0,
        require_all_exams: input.require_all_exams ?? 0,
        min_attendance_pct: input.min_attendance_pct ?? null,
        require_manual_approval: input.require_manual_approval ?? 0,
        updated_by: toNullableIntId(actorUserId),
        updated_at: new Date(),
      },
    });
  }

  async deletePolicy(actorUserId: string, policyId: string): Promise<void> {
    const id = toIntId(policyId);
    if (!id) throw new Error('Invalid policy id');
    await this.prisma.completion_policies.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        deleted_by: toNullableIntId(actorUserId),
      },
    });
  }

  async listTemplates(): Promise<Record<string, unknown>[]> {
    const rows = await this.prisma.certificate_templates.findMany({
      where: { deleted_at: null },
      orderBy: { id: 'desc' },
    });
    return rows.map(serializeTemplate);
  }

  async createTemplate(actorUserId: string, input: CertificateTemplateInput): Promise<Record<string, unknown>> {
    const actor = toNullableIntId(actorUserId);
    const created = await this.prisma.certificate_templates.create({
      data: {
        title: input.title,
        description: input.description ?? null,
        template: input.template ?? null,
        signatory: input.signatory ?? null,
        course_id: toNullableIntId(input.course_id),
        program_id: toNullableIntId(input.program_id),
        created_by: actor,
        updated_by: actor,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    return serializeTemplate(created);
  }

  async updateTemplate(actorUserId: string, templateId: string, input: CertificateTemplateInput): Promise<void> {
    const id = toIntId(templateId);
    if (!id) throw new Error('Invalid template id');
    await this.prisma.certificate_templates.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description ?? null,
        template: input.template ?? null,
        signatory: input.signatory ?? null,
        course_id: toNullableIntId(input.course_id),
        program_id: toNullableIntId(input.program_id),
        updated_by: toNullableIntId(actorUserId),
        updated_at: new Date(),
      },
    });
  }

  async deleteTemplate(actorUserId: string, templateId: string): Promise<void> {
    const id = toIntId(templateId);
    if (!id) throw new Error('Invalid template id');
    await this.prisma.certificate_templates.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        deleted_by: toNullableIntId(actorUserId),
      },
    });
  }

  listCertificates(_filters?: {
    userId?: string;
    courseId?: string;
    offeringId?: string;
  }): Promise<Record<string, unknown>[]> {
    // certificates table not yet created — returns empty list (Phase J empty-state)
    return Promise.resolve([]);
  }

  issueCertificate(
    _actorUserId: string,
    _input: IssueCertificateInput,
  ): Promise<Record<string, unknown>> {
    return Promise.reject(new Error('certificate table not present in MySQL schema'));
  }

  revokeCertificate(_actorUserId: string, _certId: string): Promise<void> {
    return Promise.reject(new Error('certificate table not present in MySQL schema'));
  }

  /**
   * Aggregates a student's attendance across the cohort's synced Teams live
   * sessions. Used to evaluate `completion_policies.min_attendance_pct` when
   * issuing certificates.
   *
   * "Synced" means the cron has successfully fetched attendance from Graph
   * for that session (attendance_fetched_at IS NOT NULL). Sessions that are
   * scheduled but haven't ended yet — or whose attendance hasn't been
   * processed yet — are excluded from both numerator and denominator.
   *
   * Matching strategy: `live_class_attendance` rows are keyed by lowercase
   * email. For each session we look for a row matching either the student's
   * user_id (when the sync matched during upsert) OR the student's
   * user_email (case-insensitive). Graceful when the student didn't join at
   * all — that session contributes 0% to the average.
   */
  async aggregateStudentCohortAttendance(
    userId: number,
    cohortId: number,
  ): Promise<{
    sessionsTotal: number;
    sessionsAttended: number;
    averagePercent: number;
    userEmail: string | null;
  }> {
    const user = await this.prisma.users.findFirst({
      where: { id: userId, deleted_at: null },
      select: { id: true, user_email: true, email: true },
    });
    const emailLower = (user?.user_email || user?.email || '').trim().toLowerCase();

    const syncedSessions = await this.prisma.live_class.findMany({
      where: {
        cohort_id: cohortId,
        platform: 'teams',
        attendance_fetched_at: { not: null },
        deleted_at: null,
      },
      select: { id: true },
    });

    if (syncedSessions.length === 0) {
      return { sessionsTotal: 0, sessionsAttended: 0, averagePercent: 0, userEmail: emailLower || null };
    }

    const liveClassIds = syncedSessions.map((s) => s.id);
    const attendanceRows = await this.prisma.live_class_attendance.findMany({
      where: {
        live_class_id: { in: liveClassIds },
        OR: [
          { user_id: userId },
          ...(emailLower ? [{ email: emailLower }] : []),
        ],
      },
      select: {
        live_class_id: true,
        total_seconds: true,
        percent_attended: true,
      },
    });

    const attendedByLiveClass = new Map<number, number>(); // session id → percent_attended (0-100)
    for (const row of attendanceRows) {
      const pct = row.percent_attended === null ? 0 : Number(row.percent_attended);
      // If the student shows up more than once for a session (shouldn't happen
      // due to the uniq_meeting_email constraint, but defensive), keep the
      // max. total_seconds > 0 counts as "attended" even if percent is null.
      const prev = attendedByLiveClass.get(row.live_class_id) ?? 0;
      attendedByLiveClass.set(row.live_class_id, Math.max(prev, pct));
    }

    const percents = liveClassIds.map((id) => attendedByLiveClass.get(id) ?? 0);
    const sessionsAttended = percents.filter((p) => p > 0).length;
    const averagePercent =
      percents.length > 0 ? Math.round((percents.reduce((a, b) => a + b, 0) / percents.length) * 100) / 100 : 0;

    return {
      sessionsTotal: syncedSessions.length,
      sessionsAttended,
      averagePercent,
      userEmail: emailLower || null,
    };
  }

  /**
   * Checks a student's attendance against the `min_attendance_pct` field of
   * a completion policy. Returns whether the policy is met + the underlying
   * numbers for admin-facing messaging.
   *
   * When the policy has no `min_attendance_pct` set (field is null), the
   * check is vacuously satisfied — we return `meets: true, required: null`.
   */
  async evaluateAttendanceAgainstPolicy(
    userId: number,
    cohortId: number,
    policyId: number,
  ): Promise<{
    meets: boolean;
    required: number | null;
    actualPercent: number;
    sessionsTotal: number;
    sessionsAttended: number;
  }> {
    const policy = await this.prisma.completion_policies.findFirst({
      where: { id: policyId },
      select: { min_attendance_pct: true },
    });
    const required = policy?.min_attendance_pct ?? null;

    const agg = await this.aggregateStudentCohortAttendance(userId, cohortId);

    return {
      meets: required === null ? true : agg.averagePercent >= required,
      required,
      actualPercent: agg.averagePercent,
      sessionsTotal: agg.sessionsTotal,
      sessionsAttended: agg.sessionsAttended,
    };
  }
}
