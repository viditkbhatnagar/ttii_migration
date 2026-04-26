import type { PrismaClient, cohort_announcements } from '@prisma/client';
import { getPrismaClient } from '../data/prisma-client.js';

export type AnnouncementInput = {
  cohort_id?: string | undefined;
  title: string;
  content: string;
  description?: string | undefined;
  audience_type?: 'all' | 'selected' | undefined;
  audience_user_ids?: string[] | undefined;
  delivery_channels?: string[] | undefined;
  attachment_url?: string | undefined;
  status?: 'draft' | 'sent' | undefined;
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

function parseDeliveryChannels(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseAudienceUserIds(value: string | null | undefined): number[] {
  if (!value) return [];
  try {
    const arr = JSON.parse(value) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.map((x) => toIntId(typeof x === 'string' || typeof x === 'number' ? x : 0)).filter((n) => n > 0);
  } catch {
    return [];
  }
}

function serialize(
  row: cohort_announcements,
  joined: { cohort_title: string },
): Record<string, unknown> {
  return {
    id: String(row.id),
    cohort_id: row.cohort_id ? String(row.cohort_id) : '',
    cohort_title: joined.cohort_title,
    title: row.title,
    content: row.content,
    description: row.description ?? '',
    audience_type: row.audience_type ?? 'all',
    audience_user_ids: parseAudienceUserIds(row.audience_user_ids),
    delivery_channels: parseDeliveryChannels(row.delivery_channels),
    attachment_url: row.attachment_url ?? '',
    status: row.status ?? 'draft',
    sent_at: row.sent_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export class AnnouncementService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  private async enrich(rows: cohort_announcements[]): Promise<Record<string, unknown>[]> {
    if (rows.length === 0) return [];
    const cohortIds = Array.from(
      new Set(rows.map((r) => r.cohort_id).filter((v): v is number => typeof v === 'number')),
    );
    const cohorts = cohortIds.length
      ? await this.prisma.cohorts.findMany({
          where: { id: { in: cohortIds } },
          select: { id: true, title: true },
        })
      : [];
    const cohortMap = new Map<number, string>();
    for (const c of cohorts) cohortMap.set(c.id, c.title ?? '');

    return rows.map((r) =>
      serialize(r, {
        cohort_title: r.cohort_id ? cohortMap.get(r.cohort_id) ?? '' : '',
      }),
    );
  }

  async list(filters?: { cohortId?: string | undefined; status?: string | undefined }): Promise<Record<string, unknown>[]> {
    const where: Record<string, unknown> = { deleted_at: null };
    if (filters?.cohortId) where.cohort_id = toIntId(filters.cohortId);
    if (filters?.status) where.status = filters.status;
    const rows = await this.prisma.cohort_announcements.findMany({
      where,
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    });
    return this.enrich(rows);
  }

  async get(announcementId: string): Promise<Record<string, unknown> | null> {
    const id = toIntId(announcementId);
    if (!id) return null;
    const row = await this.prisma.cohort_announcements.findFirst({
      where: { id, deleted_at: null },
    });
    if (!row) return null;
    const enriched = await this.enrich([row]);
    return enriched[0] ?? null;
  }

  async create(actorUserId: string, input: AnnouncementInput): Promise<Record<string, unknown>> {
    if (!input.title.trim()) throw new Error('title is required');
    if (!input.content.trim()) throw new Error('content is required');
    const actor = toNullableIntId(actorUserId);
    const audienceUserIdsJson =
      input.audience_type === 'selected' && input.audience_user_ids && input.audience_user_ids.length > 0
        ? JSON.stringify(input.audience_user_ids.map((id) => toIntId(id)).filter((n) => n > 0))
        : null;
    const deliveryStr = input.delivery_channels && input.delivery_channels.length > 0
      ? input.delivery_channels.join(',')
      : 'in_app';
    const status = input.status ?? 'draft';

    const created = await this.prisma.cohort_announcements.create({
      data: {
        cohort_id: toNullableIntId(input.cohort_id),
        title: input.title.trim(),
        content: input.content.trim(),
        description: input.description?.trim() || null,
        audience_type: input.audience_type ?? 'all',
        audience_user_ids: audienceUserIdsJson,
        delivery_channels: deliveryStr,
        attachment_url: input.attachment_url?.trim() || null,
        status,
        sent_at: status === 'sent' ? new Date() : null,
        created_by: actor,
        updated_by: actor,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    const enriched = await this.enrich([created]);
    return enriched[0] ?? serialize(created, { cohort_title: '' });
  }

  async update(actorUserId: string, announcementId: string, input: AnnouncementInput): Promise<void> {
    const id = toIntId(announcementId);
    if (!id) throw new Error('Invalid announcement id');
    const audienceUserIdsJson =
      input.audience_type === 'selected' && input.audience_user_ids && input.audience_user_ids.length > 0
        ? JSON.stringify(input.audience_user_ids.map((u) => toIntId(u)).filter((n) => n > 0))
        : null;
    const deliveryStr = input.delivery_channels && input.delivery_channels.length > 0
      ? input.delivery_channels.join(',')
      : 'in_app';
    const status = input.status ?? 'draft';

    const existing = await this.prisma.cohort_announcements.findFirst({ where: { id }, select: { sent_at: true, status: true } });
    const sent_at = status === 'sent' ? (existing?.sent_at ?? new Date()) : null;

    await this.prisma.cohort_announcements.update({
      where: { id },
      data: {
        cohort_id: toNullableIntId(input.cohort_id),
        title: input.title.trim(),
        content: input.content.trim(),
        description: input.description?.trim() || null,
        audience_type: input.audience_type ?? 'all',
        audience_user_ids: audienceUserIdsJson,
        delivery_channels: deliveryStr,
        attachment_url: input.attachment_url?.trim() || null,
        status,
        sent_at,
        updated_by: toNullableIntId(actorUserId),
        updated_at: new Date(),
      },
    });
  }

  async delete(actorUserId: string, announcementId: string): Promise<void> {
    const id = toIntId(announcementId);
    if (!id) throw new Error('Invalid announcement id');
    await this.prisma.cohort_announcements.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        deleted_by: toNullableIntId(actorUserId),
      },
    });
  }
}
