import type { PrismaClient } from '@prisma/client';
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
};

function toDateOrNull(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function requireId(value: string, name: string): void {
  if (!value || !value.trim()) throw new Error(`${name} is required`);
}

export class OfferingService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  async listOfferings(filters?: { courseId?: string; centreId?: string; programId?: string; status?: string }): Promise<Record<string, unknown>[]> {
    const where: Record<string, unknown> = { deleted_at: null };
    if (filters?.courseId) where.course_id = filters.courseId;
    if (filters?.centreId) where.centre_id = filters.centreId;
    if (filters?.programId) where.program_id = filters.programId;
    if (filters?.status) where.status = filters.status;

    const offerings = await this.prisma.course_offering.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });

    const courseIds = [...new Set(offerings.map((o) => o.course_id).filter(Boolean))];
    const programIds = [...new Set(offerings.map((o) => o.program_id).filter(Boolean))] as string[];
    const centreIds = [...new Set(offerings.map((o) => o.centre_id).filter(Boolean))] as string[];
    const offeringIds = offerings.map((o) => o.id);

    // Batch fetch related records
    const [courses, programs, centres, enrolCounts, cohortCounts] = await Promise.all([
      courseIds.length > 0
        ? this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } })
        : [],
      programIds.length > 0
        ? this.prisma.program.findMany({ where: { id: { in: programIds } }, select: { id: true, title: true } })
        : [],
      centreIds.length > 0
        ? this.prisma.centres.findMany({ where: { id: { in: centreIds } }, select: { id: true, centre_name: true } })
        : [],
      offeringIds.length > 0
        ? this.prisma.enrol.groupBy({
            by: ['offering_id'],
            where: { offering_id: { in: offeringIds }, deleted_at: null },
            _count: { id: true },
          })
        : [],
      offeringIds.length > 0
        ? this.prisma.cohorts.groupBy({
            by: ['offering_id'],
            where: { offering_id: { in: offeringIds }, deleted_at: null },
            _count: { id: true },
          })
        : [],
    ]);

    const courseMap = new Map(courses.map((c) => [c.id, c.title]));
    const programMap = new Map(programs.map((p) => [p.id, p.title]));
    const centreMap = new Map(centres.map((c) => [c.id, c.centre_name]));
    const enrolCountMap = new Map(enrolCounts.map((e) => [e.offering_id, e._count.id]));
    const cohortCountMap = new Map(cohortCounts.map((c) => [c.offering_id, c._count.id]));

    return offerings.map((o) => ({
      id: o.id,
      title: o.title ?? courseMap.get(o.course_id) ?? '',
      offering_code: o.offering_code ?? '',
      course_id: o.course_id,
      course_title: courseMap.get(o.course_id) ?? '',
      program_id: o.program_id ?? '',
      program_title: programMap.get(o.program_id ?? '') ?? '',
      centre_id: o.centre_id ?? '',
      centre_name: centreMap.get(o.centre_id ?? '') ?? '',
      delivery_mode: o.delivery_mode,
      academic_year: o.academic_year ?? '',
      start_date: o.start_date?.toISOString() ?? '',
      end_date: o.end_date?.toISOString() ?? '',
      enrollment_start: o.enrollment_start?.toISOString() ?? '',
      enrollment_end: o.enrollment_end?.toISOString() ?? '',
      max_enrollment: o.max_enrollment ?? 0,
      pricing_amount: o.pricing_amount ?? 0,
      status: o.status,
      enrolled_count: enrolCountMap.get(o.id) ?? 0,
      cohort_count: cohortCountMap.get(o.id) ?? 0,
      created_at: o.created_at?.toISOString() ?? '',
    }));
  }

  async getOffering(offeringId: string): Promise<Record<string, unknown> | null> {
    requireId(offeringId, 'offeringId');
    const o = await this.prisma.course_offering.findFirst({
      where: { id: offeringId, deleted_at: null },
    });
    if (!o) return null;

    // Fetch related names
    const course = await this.prisma.course.findFirst({ where: { id: o.course_id }, select: { title: true } });
    const program = o.program_id ? await this.prisma.program.findFirst({ where: { id: o.program_id }, select: { title: true } }) : null;
    const centre = o.centre_id ? await this.prisma.centres.findFirst({ where: { id: o.centre_id }, select: { centre_name: true } }) : null;

    return {
      id: o.id,
      title: o.title ?? '',
      offering_code: o.offering_code ?? '',
      course_id: o.course_id,
      course_title: course?.title ?? '',
      program_id: o.program_id ?? '',
      program_title: program?.title ?? '',
      centre_id: o.centre_id ?? '',
      centre_name: centre?.centre_name ?? '',
      delivery_mode: o.delivery_mode,
      academic_year: o.academic_year ?? '',
      start_date: o.start_date?.toISOString() ?? '',
      end_date: o.end_date?.toISOString() ?? '',
      enrollment_start: o.enrollment_start?.toISOString() ?? '',
      enrollment_end: o.enrollment_end?.toISOString() ?? '',
      max_enrollment: o.max_enrollment ?? 0,
      pricing_amount: o.pricing_amount ?? 0,
      language_id: o.language_id ?? '',
      status: o.status,
      created_at: o.created_at?.toISOString() ?? '',
    };
  }

  async createOffering(actorUserId: string, input: OfferingInput): Promise<Record<string, unknown>> {
    requireId(input.course_id, 'course_id');
    const offering = await this.prisma.course_offering.create({
      data: {
        course_id: input.course_id,
        program_id: input.program_id ?? null,
        centre_id: input.centre_id ?? null,
        title: input.title ?? null,
        offering_code: input.offering_code ?? null,
        delivery_mode: input.delivery_mode ?? 'cohort',
        academic_year: input.academic_year ?? null,
        start_date: toDateOrNull(input.start_date),
        end_date: toDateOrNull(input.end_date),
        enrollment_start: toDateOrNull(input.enrollment_start),
        enrollment_end: toDateOrNull(input.enrollment_end),
        max_enrollment: input.max_enrollment ?? null,
        pricing_amount: input.pricing_amount ?? null,
        language_id: input.language_id ?? null,
        status: input.status ?? 'draft',
        created_by: actorUserId,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
    return { id: offering.id };
  }

  async updateOffering(actorUserId: string, offeringId: string, input: OfferingInput): Promise<void> {
    requireId(offeringId, 'offeringId');
    requireId(input.course_id, 'course_id');
    await this.prisma.course_offering.update({
      where: { id: offeringId },
      data: {
        course_id: input.course_id,
        program_id: input.program_id ?? null,
        centre_id: input.centre_id ?? null,
        title: input.title ?? null,
        offering_code: input.offering_code ?? null,
        delivery_mode: input.delivery_mode ?? 'cohort',
        academic_year: input.academic_year ?? null,
        start_date: toDateOrNull(input.start_date),
        end_date: toDateOrNull(input.end_date),
        enrollment_start: toDateOrNull(input.enrollment_start),
        enrollment_end: toDateOrNull(input.enrollment_end),
        max_enrollment: input.max_enrollment ?? null,
        pricing_amount: input.pricing_amount ?? null,
        language_id: input.language_id ?? null,
        ...(input.status ? { status: input.status } : {}),
        updated_by: actorUserId,
        updated_at: new Date(),
      },
    });
  }

  async deleteOffering(actorUserId: string, offeringId: string): Promise<void> {
    requireId(offeringId, 'offeringId');
    await this.prisma.course_offering.update({
      where: { id: offeringId },
      data: {
        deleted_by: actorUserId,
        deleted_at: new Date(),
      },
    });
  }
}
