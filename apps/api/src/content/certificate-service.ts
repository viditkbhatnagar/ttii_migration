import type { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../data/prisma-client.js';

// Certificates, certificate templates, and completion policies are not
// present in the production MySQL schema. The service is retained as a
// stub so routes compile; implementations will be wired in a later
// session once a decision is made on certificate storage.

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

export class CertificateService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  async listPolicies(): Promise<Record<string, unknown>[]> {
    return [];
  }

  async createPolicy(
    _actorUserId: string,
    _input: CompletionPolicyInput,
  ): Promise<Record<string, unknown>> {
    throw new Error('completion_policy table not present in MySQL schema');
  }

  async updatePolicy(
    _actorUserId: string,
    _policyId: string,
    _input: CompletionPolicyInput,
  ): Promise<void> {
    throw new Error('completion_policy table not present in MySQL schema');
  }

  async deletePolicy(_actorUserId: string, _policyId: string): Promise<void> {
    throw new Error('completion_policy table not present in MySQL schema');
  }

  async listTemplates(): Promise<Record<string, unknown>[]> {
    return [];
  }

  async createTemplate(
    _actorUserId: string,
    _input: CertificateTemplateInput,
  ): Promise<Record<string, unknown>> {
    throw new Error('certificate_template table not present in MySQL schema');
  }

  async updateTemplate(
    _actorUserId: string,
    _templateId: string,
    _input: CertificateTemplateInput,
  ): Promise<void> {
    throw new Error('certificate_template table not present in MySQL schema');
  }

  async deleteTemplate(_actorUserId: string, _templateId: string): Promise<void> {
    throw new Error('certificate_template table not present in MySQL schema');
  }

  async listCertificates(_filters?: {
    userId?: string;
    courseId?: string;
    offeringId?: string;
  }): Promise<Record<string, unknown>[]> {
    return [];
  }

  async issueCertificate(
    _actorUserId: string,
    _input: IssueCertificateInput,
  ): Promise<Record<string, unknown>> {
    throw new Error('certificate table not present in MySQL schema');
  }

  async revokeCertificate(_actorUserId: string, _certId: string): Promise<void> {
    throw new Error('certificate table not present in MySQL schema');
  }
}
