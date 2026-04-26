import type { PrismaClient, certification_partners } from '@prisma/client';
import { getPrismaClient } from '../data/prisma-client.js';

export type CertificationPartnerInput = {
  partner_code: string;
  name: string;
  short_name?: string | undefined;
  country?: string | undefined;
  description?: string | undefined;
  logo?: string | undefined;
  status?: string | undefined;
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

function serialize(row: certification_partners): Record<string, unknown> {
  return {
    id: String(row.id),
    partner_code: row.partner_code,
    name: row.name,
    short_name: row.short_name ?? '',
    country: row.country ?? '',
    description: row.description ?? '',
    logo: row.logo ?? '',
    status: row.status,
    created_at: row.created_at,
  };
}

export class CertificationPartnerService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  async list(): Promise<Record<string, unknown>[]> {
    const rows = await this.prisma.certification_partners.findMany({
      where: { deleted_at: null },
      orderBy: { id: 'desc' },
    });
    return rows.map(serialize);
  }

  async get(partnerId: string): Promise<Record<string, unknown> | null> {
    const id = toIntId(partnerId);
    if (!id) return null;
    const row = await this.prisma.certification_partners.findFirst({
      where: { id, deleted_at: null },
    });
    return row ? serialize(row) : null;
  }

  async create(actorUserId: string, input: CertificationPartnerInput): Promise<Record<string, unknown>> {
    const actor = toNullableIntId(actorUserId);
    const created = await this.prisma.certification_partners.create({
      data: {
        partner_code: input.partner_code.trim(),
        name: input.name.trim(),
        short_name: input.short_name?.trim() || null,
        country: input.country?.trim() || null,
        description: input.description?.trim() || null,
        logo: input.logo?.trim() || null,
        status: input.status?.trim() || 'active',
        created_by: actor,
        updated_by: actor,
      },
    });
    return serialize(created);
  }

  async update(actorUserId: string, partnerId: string, input: CertificationPartnerInput): Promise<void> {
    const id = toIntId(partnerId);
    if (!id) throw new Error('Invalid partner id');
    await this.prisma.certification_partners.update({
      where: { id },
      data: {
        partner_code: input.partner_code.trim(),
        name: input.name.trim(),
        short_name: input.short_name?.trim() || null,
        country: input.country?.trim() || null,
        description: input.description?.trim() || null,
        logo: input.logo?.trim() || null,
        status: input.status?.trim() || 'active',
        updated_by: toNullableIntId(actorUserId),
        updated_at: new Date(),
      },
    });
  }

  async delete(actorUserId: string, partnerId: string): Promise<void> {
    const id = toIntId(partnerId);
    if (!id) throw new Error('Invalid partner id');
    await this.prisma.certification_partners.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        deleted_by: toNullableIntId(actorUserId),
      },
    });
  }
}
