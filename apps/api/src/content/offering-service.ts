import type { PrismaClient, offerings } from '@prisma/client';
import { getPrismaClient } from '../data/prisma-client.js';

export type OfferingInput = {
  course_id: string;
  program_id?: string | undefined;
  centre_id?: string | undefined;
  title?: string | undefined;
  offering_code?: string | undefined;
  delivery_mode?: string | undefined;
  academic_year?: string | undefined;
  start_date?: string | undefined;
  end_date?: string | undefined;
  enrollment_start?: string | undefined;
  enrollment_end?: string | undefined;
  max_enrollment?: number | undefined;
  pricing_amount?: number | undefined;
  language_id?: string | undefined;
  status?: string | undefined;
  fee_category?: string | undefined;
  base_fee?: number | undefined;
  discount?: number | undefined;
  offered_fee?: number | undefined;
  course_expiry_days?: number | undefined;
  content_release_strategy?: string | undefined;
  completion_policy_id?: string | undefined;
  certificate_template_id?: string | undefined;
  publish_type?: string | undefined;
};

export type OfferingListFilters = {
  courseId?: string;
  centreId?: string;
  programId?: string;
  status?: string;
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

function toNullableDecimal(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return Number.isFinite(value) ? value : null;
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function decimalToNumber(value: offerings['pricing_amount']): number | null {
  if (value === null || value === undefined) return null;
  return Number(value);
}

export class OfferingService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  private async enrich(rows: offerings[]): Promise<Record<string, unknown>[]> {
    if (rows.length === 0) return [];

    const courseIds = Array.from(new Set(rows.map((r) => r.course_id)));
    const policyIds = Array.from(
      new Set(rows.map((r) => r.completion_policy_id).filter((v): v is number => typeof v === 'number')),
    );
    const templateIds = Array.from(
      new Set(rows.map((r) => r.certificate_template_id).filter((v): v is number => typeof v === 'number')),
    );
    const languageIds = Array.from(
      new Set(rows.map((r) => r.language_id).filter((v): v is number => typeof v === 'number')),
    );
    const offeringIds = rows.map((r) => r.id);

    const [courses, policies, templates, languages, cohortCounts] = await Promise.all([
      courseIds.length
        ? this.prisma.course.findMany({
            where: { id: { in: courseIds } },
            select: { id: true, title: true },
          })
        : Promise.resolve([]),
      policyIds.length
        ? this.prisma.completion_policies.findMany({
            where: { id: { in: policyIds } },
            select: { id: true, title: true },
          })
        : Promise.resolve([]),
      templateIds.length
        ? this.prisma.certificate_templates.findMany({
            where: { id: { in: templateIds } },
            select: { id: true, title: true },
          })
        : Promise.resolve([]),
      languageIds.length
        ? this.prisma.languages.findMany({
            where: { id: { in: languageIds } },
            select: { id: true, title: true },
          })
        : Promise.resolve([]),
      offeringIds.length
        ? this.prisma.cohort_offerings.groupBy({
            by: ['offering_id'],
            where: { offering_id: { in: offeringIds } },
            _count: { offering_id: true },
          })
        : Promise.resolve([] as { offering_id: number; _count: { offering_id: number } }[]),
    ]);

    const courseMap = new Map<number, string>();
    for (const c of courses) courseMap.set(c.id, c.title ?? '');
    const policyMap = new Map<number, string>();
    for (const p of policies) policyMap.set(p.id, p.title ?? '');
    const templateMap = new Map<number, string>();
    for (const t of templates) templateMap.set(t.id, t.title ?? '');
    const languageMap = new Map<number, string>();
    for (const l of languages) languageMap.set(l.id, l.title ?? '');
    const cohortCountMap = new Map<number, number>();
    for (const c of cohortCounts) cohortCountMap.set(c.offering_id, c._count.offering_id);

    return rows.map((r) => this.serialize(r, {
      course_title: courseMap.get(r.course_id) ?? '',
      completion_policy_title: r.completion_policy_id ? policyMap.get(r.completion_policy_id) ?? '' : '',
      certificate_template_title: r.certificate_template_id ? templateMap.get(r.certificate_template_id) ?? '' : '',
      language_title: r.language_id ? languageMap.get(r.language_id) ?? '' : '',
      cohort_count: cohortCountMap.get(r.id) ?? 0,
    }));
  }

  private serialize(
    row: offerings,
    joined: { course_title: string; completion_policy_title: string; certificate_template_title: string; language_title: string; cohort_count: number },
  ): Record<string, unknown> {
    return {
      id: String(row.id),
      course_id: String(row.course_id),
      course_title: joined.course_title,
      title: row.title ?? '',
      offering_code: row.offering_code ?? '',
      delivery_mode: row.delivery_mode,
      academic_year: row.academic_year ?? '',
      start_date: row.start_date,
      end_date: row.end_date,
      enrollment_start: row.enrollment_start,
      enrollment_end: row.enrollment_end,
      max_enrollment: row.max_enrollment,
      pricing_amount: decimalToNumber(row.pricing_amount),
      language_id: row.language_id ? String(row.language_id) : '',
      language_title: joined.language_title,
      status: row.status,
      fee_category: row.fee_category ?? 'paid',
      base_fee: decimalToNumber(row.base_fee),
      discount: decimalToNumber(row.discount),
      offered_fee: decimalToNumber(row.offered_fee),
      course_expiry_days: row.course_expiry_days,
      content_release_strategy: row.content_release_strategy ?? 'full',
      completion_policy_id: row.completion_policy_id ? String(row.completion_policy_id) : '',
      completion_policy_title: joined.completion_policy_title,
      certificate_template_id: row.certificate_template_id ? String(row.certificate_template_id) : '',
      certificate_template_title: joined.certificate_template_title,
      publish_type: row.publish_type ?? 'public',
      enrolled_count: 0,
      cohort_count: joined.cohort_count,
      created_at: row.created_at,
    };
  }

  async listOfferings(filters?: OfferingListFilters): Promise<Record<string, unknown>[]> {
    const where: Record<string, unknown> = { deleted_at: null };
    if (filters?.courseId) where.course_id = toIntId(filters.courseId);
    if (filters?.status) where.status = filters.status;
    const rows = await this.prisma.offerings.findMany({
      where,
      orderBy: { id: 'desc' },
    });
    return this.enrich(rows);
  }

  async getOffering(offeringId: string): Promise<Record<string, unknown> | null> {
    const id = toIntId(offeringId);
    if (!id) return null;
    const row = await this.prisma.offerings.findFirst({ where: { id, deleted_at: null } });
    if (!row) return null;
    const enriched = await this.enrich([row]);
    return enriched[0] ?? null;
  }

  async createOffering(actorUserId: string, input: OfferingInput): Promise<Record<string, unknown>> {
    const courseId = toIntId(input.course_id);
    if (!courseId) throw new Error('course_id is required');
    const actor = toNullableIntId(actorUserId);

    const created = await this.prisma.offerings.create({
      data: {
        course_id: courseId,
        title: input.title ?? null,
        offering_code: input.offering_code ?? null,
        delivery_mode: input.delivery_mode || 'cohort',
        academic_year: input.academic_year ?? null,
        start_date: parseDate(input.start_date),
        end_date: parseDate(input.end_date),
        enrollment_start: parseDate(input.enrollment_start),
        enrollment_end: parseDate(input.enrollment_end),
        max_enrollment: input.max_enrollment ?? null,
        pricing_amount: toNullableDecimal(input.pricing_amount),
        language_id: toNullableIntId(input.language_id),
        status: input.status || 'draft',
        fee_category: input.fee_category ?? 'paid',
        base_fee: toNullableDecimal(input.base_fee),
        discount: toNullableDecimal(input.discount),
        offered_fee: toNullableDecimal(input.offered_fee),
        course_expiry_days: input.course_expiry_days ?? null,
        content_release_strategy: input.content_release_strategy ?? 'full',
        completion_policy_id: toNullableIntId(input.completion_policy_id),
        certificate_template_id: toNullableIntId(input.certificate_template_id),
        publish_type: input.publish_type ?? 'public',
        created_by: actor,
        updated_by: actor,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    const enriched = await this.enrich([created]);
    return enriched[0] ?? { id: String(created.id) };
  }

  async updateOffering(actorUserId: string, offeringId: string, input: OfferingInput): Promise<void> {
    const id = toIntId(offeringId);
    if (!id) throw new Error('Invalid offering id');
    const actor = toNullableIntId(actorUserId);
    const courseIdNum = toIntId(input.course_id);
    await this.prisma.offerings.update({
      where: { id },
      data: {
        ...(courseIdNum ? { course_id: courseIdNum } : {}),
        title: input.title ?? null,
        offering_code: input.offering_code ?? null,
        ...(input.delivery_mode ? { delivery_mode: input.delivery_mode } : {}),
        academic_year: input.academic_year ?? null,
        start_date: parseDate(input.start_date),
        end_date: parseDate(input.end_date),
        enrollment_start: parseDate(input.enrollment_start),
        enrollment_end: parseDate(input.enrollment_end),
        max_enrollment: input.max_enrollment ?? null,
        pricing_amount: toNullableDecimal(input.pricing_amount),
        language_id: toNullableIntId(input.language_id),
        ...(input.status ? { status: input.status } : {}),
        fee_category: input.fee_category ?? 'paid',
        base_fee: toNullableDecimal(input.base_fee),
        discount: toNullableDecimal(input.discount),
        offered_fee: toNullableDecimal(input.offered_fee),
        course_expiry_days: input.course_expiry_days ?? null,
        content_release_strategy: input.content_release_strategy ?? 'full',
        completion_policy_id: toNullableIntId(input.completion_policy_id),
        certificate_template_id: toNullableIntId(input.certificate_template_id),
        publish_type: input.publish_type ?? 'public',
        updated_by: actor,
        updated_at: new Date(),
      },
    });
  }

  async deleteOffering(actorUserId: string, offeringId: string): Promise<void> {
    const id = toIntId(offeringId);
    if (!id) throw new Error('Invalid offering id');
    await this.prisma.offerings.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        deleted_by: toNullableIntId(actorUserId),
      },
    });
  }
}
