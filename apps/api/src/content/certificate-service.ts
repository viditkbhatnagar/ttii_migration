import type { PrismaClient } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { getPrismaClient } from '../data/prisma-client.js';

// ── Input Types ────────────────────────────────────────────────────

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

// ── Service ────────────────────────────────────────────────────────

function requireId(value: string, name: string): void {
  if (!value || !value.trim()) throw new Error(`${name} is required`);
}

export class CertificateService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  // ── Completion Policies ──────────────────────────────────────────

  async listPolicies(): Promise<Record<string, unknown>[]> {
    const policies = await this.prisma.completion_policy.findMany({
      where: { deleted_at: null },
      orderBy: { created_at: 'desc' },
    });

    const courseIds = [...new Set(policies.map((p) => p.course_id).filter(Boolean))] as string[];
    const courses = courseIds.length > 0
      ? await this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } })
      : [];
    const courseMap = new Map(courses.map((c) => [c.id, c.title]));

    return policies.map((p) => ({
      id: p.id,
      title: p.title,
      course_id: p.course_id ?? '',
      course_title: courseMap.get(p.course_id ?? '') ?? '',
      offering_id: p.offering_id ?? '',
      min_progress_pct: p.min_progress_pct,
      min_exam_score_pct: p.min_exam_score_pct ?? 0,
      require_all_assignments: p.require_all_assignments,
      require_all_exams: p.require_all_exams,
      min_attendance_pct: p.min_attendance_pct ?? 0,
      require_manual_approval: p.require_manual_approval,
      created_at: p.created_at?.toISOString() ?? '',
    }));
  }

  async createPolicy(actorUserId: string, input: CompletionPolicyInput): Promise<Record<string, unknown>> {
    const policy = await this.prisma.completion_policy.create({
      data: {
        title: input.title,
        course_id: input.course_id ?? null,
        offering_id: input.offering_id ?? null,
        min_progress_pct: input.min_progress_pct ?? 80,
        min_exam_score_pct: input.min_exam_score_pct ?? null,
        require_all_assignments: input.require_all_assignments ?? 0,
        require_all_exams: input.require_all_exams ?? 0,
        min_attendance_pct: input.min_attendance_pct ?? null,
        require_manual_approval: input.require_manual_approval ?? 0,
        created_by: actorUserId,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
    return { id: policy.id };
  }

  async updatePolicy(actorUserId: string, policyId: string, input: CompletionPolicyInput): Promise<void> {
    await this.prisma.completion_policy.update({
      where: { id: policyId },
      data: {
        title: input.title,
        course_id: input.course_id ?? null,
        offering_id: input.offering_id ?? null,
        min_progress_pct: input.min_progress_pct ?? 80,
        min_exam_score_pct: input.min_exam_score_pct ?? null,
        require_all_assignments: input.require_all_assignments ?? 0,
        require_all_exams: input.require_all_exams ?? 0,
        min_attendance_pct: input.min_attendance_pct ?? null,
        require_manual_approval: input.require_manual_approval ?? 0,
        updated_by: actorUserId,
        updated_at: new Date(),
      },
    });
  }

  async deletePolicy(actorUserId: string, policyId: string): Promise<void> {
    await this.prisma.completion_policy.update({
      where: { id: policyId },
      data: { deleted_at: new Date() },
    });
  }

  // ── Certificate Templates ────────────────────────────────────────

  async listTemplates(): Promise<Record<string, unknown>[]> {
    const templates = await this.prisma.certificate_template.findMany({
      where: { deleted_at: null },
      orderBy: { created_at: 'desc' },
    });

    return templates.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description ?? '',
      signatory: t.signatory ?? '',
      course_id: t.course_id ?? '',
      program_id: t.program_id ?? '',
      status: t.status,
      created_at: t.created_at?.toISOString() ?? '',
    }));
  }

  async createTemplate(actorUserId: string, input: CertificateTemplateInput): Promise<Record<string, unknown>> {
    const template = await this.prisma.certificate_template.create({
      data: {
        title: input.title,
        description: input.description ?? null,
        template: input.template ?? null,
        signatory: input.signatory ?? null,
        course_id: input.course_id ?? null,
        program_id: input.program_id ?? null,
        created_by: actorUserId,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
    return { id: template.id };
  }

  async updateTemplate(actorUserId: string, templateId: string, input: CertificateTemplateInput): Promise<void> {
    await this.prisma.certificate_template.update({
      where: { id: templateId },
      data: {
        title: input.title,
        description: input.description ?? null,
        template: input.template ?? null,
        signatory: input.signatory ?? null,
        course_id: input.course_id ?? null,
        program_id: input.program_id ?? null,
        updated_by: actorUserId,
        updated_at: new Date(),
      },
    });
  }

  async deleteTemplate(actorUserId: string, templateId: string): Promise<void> {
    await this.prisma.certificate_template.update({
      where: { id: templateId },
      data: { deleted_at: new Date() },
    });
  }

  // ── Certificates ─────────────────────────────────────────────────

  async listCertificates(filters?: { userId?: string; courseId?: string; offeringId?: string }): Promise<Record<string, unknown>[]> {
    const where: Record<string, unknown> = { deleted_at: null };
    if (filters?.userId) where.user_id = filters.userId;
    if (filters?.courseId) where.course_id = filters.courseId;
    if (filters?.offeringId) where.offering_id = filters.offeringId;

    const certs = await this.prisma.certificate.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });

    const userIds = [...new Set(certs.map((c) => c.user_id))];
    const courseIds = [...new Set(certs.map((c) => c.course_id).filter(Boolean))] as string[];

    const [users, courses] = await Promise.all([
      userIds.length > 0
        ? this.prisma.users.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } })
        : [],
      courseIds.length > 0
        ? this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } })
        : [],
    ]);

    const userMap = new Map(users.map((u) => [u.id, u]));
    const courseMap = new Map(courses.map((c) => [c.id, c.title]));

    return certs.map((c) => {
      const user = userMap.get(c.user_id);
      return {
        id: c.id,
        user_id: c.user_id,
        user_name: user?.name ?? '',
        user_email: user?.email ?? '',
        offering_id: c.offering_id ?? '',
        course_id: c.course_id ?? '',
        course_title: courseMap.get(c.course_id ?? '') ?? '',
        certificate_no: c.certificate_no ?? '',
        verification_code: c.verification_code ?? '',
        issued_date: c.issued_date?.toISOString() ?? '',
        status: c.status,
        pdf_url: c.pdf_url ?? '',
      };
    });
  }

  async issueCertificate(actorUserId: string, input: IssueCertificateInput): Promise<Record<string, unknown>> {
    const certNo = `TTII-${Date.now().toString(36).toUpperCase()}`;
    const verificationCode = randomBytes(12).toString('hex').toUpperCase();

    const cert = await this.prisma.certificate.create({
      data: {
        user_id: input.user_id,
        offering_id: input.offering_id ?? null,
        course_id: input.course_id ?? null,
        program_id: input.program_id ?? null,
        template_id: input.template_id ?? null,
        policy_id: input.policy_id ?? null,
        certificate_no: certNo,
        verification_code: verificationCode,
        issued_date: new Date(),
        status: 'issued',
        result_snapshot: input.result_snapshot ?? null,
        created_by: actorUserId,
        created_at: new Date(),
        deleted_at: null,
      },
    });

    return { id: cert.id, certificate_no: certNo, verification_code: verificationCode };
  }

  async revokeCertificate(actorUserId: string, certId: string): Promise<void> {
    await this.prisma.certificate.update({
      where: { id: certId },
      data: { status: 'revoked' },
    });
  }
}
