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
}
