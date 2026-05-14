import type { PrismaClient, certificate_combinations } from '@prisma/client';
import { getPrismaClient } from '../data/prisma-client.js';

export type CertificateCombinationInput = {
  program_id?: string | undefined;
  course_id?: string | undefined;
  combination_code: string;
  gst_applicable?: boolean | undefined;
  gst_percent?: number | undefined;
  status?: string | undefined;
  partner_ids?: string[] | undefined;
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

// Naji UAT 2026-05-14 — the auto-generated combination code (e.g. partner
// short codes joined by `+`) was being stored with inconsistent spacing,
// so the dropdown showed "TTII + KHDA" and "TTII+KHDA" as separate
// options. Collapse any whitespace around `+` to a single ` + ` so all
// new rows are written in the canonical form. The prod backfill SQL
// applies the same regex to existing rows.
function normalizeCombinationCode(value: string): string {
  return value.trim().replace(/\s*\+\s*/g, ' + ');
}

function serialize(
  row: certificate_combinations,
  joined: {
    program_title: string;
    course_title: string;
    partners: { id: number; name: string; partner_code: string; logo: string | null }[];
  },
): Record<string, unknown> {
  return {
    id: String(row.id),
    program_id: row.program_id ? String(row.program_id) : '',
    program_title: joined.program_title,
    course_id: row.course_id ? String(row.course_id) : '',
    course_title: joined.course_title,
    combination_code: row.combination_code,
    gst_applicable: row.gst_applicable,
    gst_percent: row.gst_percent === null ? null : Number(row.gst_percent),
    status: row.status,
    partners: joined.partners.map((p) => ({
      id: String(p.id),
      name: p.name,
      partner_code: p.partner_code,
      logo: p.logo ?? '',
    })),
    partner_count: joined.partners.length,
    created_at: row.created_at,
  };
}

export class CertificateCombinationService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  private async enrich(rows: certificate_combinations[]): Promise<Record<string, unknown>[]> {
    if (rows.length === 0) return [];
    const programIds = Array.from(new Set(rows.map((r) => r.program_id).filter((v): v is number => typeof v === 'number')));
    const courseIds = Array.from(new Set(rows.map((r) => r.course_id).filter((v): v is number => typeof v === 'number')));
    const combinationIds = rows.map((r) => r.id);

    const [programs, courses, pivots] = await Promise.all([
      programIds.length
        ? this.prisma.category.findMany({ where: { id: { in: programIds } }, select: { id: true, name: true } })
        : Promise.resolve([] as { id: number; name: string | null }[]),
      courseIds.length
        ? this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } })
        : Promise.resolve([] as { id: number; title: string | null }[]),
      this.prisma.certificate_combination_partners.findMany({
        where: { combination_id: { in: combinationIds } },
      }),
    ]);

    const partnerIds = Array.from(new Set(pivots.map((p: { partner_id: number }) => p.partner_id)));
    const partners = partnerIds.length
      ? await this.prisma.certification_partners.findMany({
          where: { id: { in: partnerIds }, deleted_at: null },
          select: { id: true, name: true, partner_code: true, logo: true, position: true },
          orderBy: [{ position: 'asc' }, { id: 'asc' }],
        })
      : [];

    const programMap = new Map<number, string>();
    for (const p of programs) programMap.set(p.id, p.name ?? '');
    const courseMap = new Map<number, string>();
    for (const c of courses) courseMap.set(c.id, c.title ?? '');
    // partnerOrder follows the global custom position so badges + checkbox rows
    // render in the same TTII → MSU → KHDA → AGI sequence everywhere.
    const partnerOrder = new Map(partners.map((p, idx) => [p.id, idx]));
    const partnerMap = new Map(partners.map((p) => [p.id, p]));

    const partnersByCombo = new Map<number, typeof partners>();
    for (const piv of pivots) {
      const arr = partnersByCombo.get(piv.combination_id) ?? [];
      const partner = partnerMap.get(piv.partner_id);
      if (partner) arr.push(partner);
      partnersByCombo.set(piv.combination_id, arr);
    }
    for (const [comboId, list] of partnersByCombo) {
      list.sort((a, b) => (partnerOrder.get(a.id) ?? 0) - (partnerOrder.get(b.id) ?? 0));
      partnersByCombo.set(comboId, list);
    }

    return rows.map((r) =>
      serialize(r, {
        program_title: r.program_id ? programMap.get(r.program_id) ?? '' : '',
        course_title: r.course_id ? courseMap.get(r.course_id) ?? '' : '',
        partners: partnersByCombo.get(r.id) ?? [],
      }),
    );
  }

  async list(filters?: { courseId?: string; status?: string }): Promise<Record<string, unknown>[]> {
    const where: Record<string, unknown> = { deleted_at: null };
    const courseId = filters?.courseId ? toNullableIntId(filters.courseId) : null;
    if (courseId) where.course_id = courseId;
    if (filters?.status) where.status = filters.status;
    const rows = await this.prisma.certificate_combinations.findMany({
      where,
      orderBy: { id: 'desc' },
    });
    return this.enrich(rows);
  }

  async get(combinationId: string): Promise<Record<string, unknown> | null> {
    const id = toIntId(combinationId);
    if (!id) return null;
    const row = await this.prisma.certificate_combinations.findFirst({ where: { id, deleted_at: null } });
    if (!row) return null;
    const enriched = await this.enrich([row]);
    return enriched[0] ?? null;
  }

  async create(actorUserId: string, input: CertificateCombinationInput): Promise<Record<string, unknown>> {
    const actor = toNullableIntId(actorUserId);
    const created = await this.prisma.certificate_combinations.create({
      data: {
        program_id: toNullableIntId(input.program_id),
        course_id: toNullableIntId(input.course_id),
        combination_code: normalizeCombinationCode(input.combination_code),
        gst_applicable: input.gst_applicable ?? true,
        gst_percent: input.gst_percent ?? 18,
        status: input.status?.trim() || 'active',
        created_by: actor,
        updated_by: actor,
      },
    });
    if (input.partner_ids && input.partner_ids.length > 0) {
      await this.replacePartners(created.id, input.partner_ids, actor);
    }
    const enriched = await this.enrich([created]);
    return enriched[0] ?? serialize(created, { program_title: '', course_title: '', partners: [] });
  }

  async update(actorUserId: string, combinationId: string, input: CertificateCombinationInput): Promise<void> {
    const id = toIntId(combinationId);
    if (!id) throw new Error('Invalid combination id');
    const actor = toNullableIntId(actorUserId);
    await this.prisma.certificate_combinations.update({
      where: { id },
      data: {
        program_id: toNullableIntId(input.program_id),
        course_id: toNullableIntId(input.course_id),
        combination_code: normalizeCombinationCode(input.combination_code),
        gst_applicable: input.gst_applicable ?? true,
        gst_percent: input.gst_percent ?? 18,
        status: input.status?.trim() || 'active',
        updated_by: actor,
        updated_at: new Date(),
      },
    });
    if (input.partner_ids !== undefined) {
      await this.replacePartners(id, input.partner_ids, actor);
    }
  }

  async delete(actorUserId: string, combinationId: string): Promise<void> {
    const id = toIntId(combinationId);
    if (!id) throw new Error('Invalid combination id');
    await this.prisma.certificate_combinations.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        deleted_by: toNullableIntId(actorUserId),
      },
    });
  }

  private async replacePartners(combinationId: number, partnerIds: string[], actor: number | null): Promise<void> {
    const ids = partnerIds.map(toIntId).filter((n) => n > 0);
    await this.prisma.certificate_combination_partners.deleteMany({ where: { combination_id: combinationId } });
    if (ids.length === 0) return;
    await this.prisma.certificate_combination_partners.createMany({
      data: ids.map((partnerId) => ({
        combination_id: combinationId,
        partner_id: partnerId,
        created_by: actor,
      })),
    });
  }
}
