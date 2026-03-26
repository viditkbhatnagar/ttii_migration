import type { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../data/prisma-client.js';

export type ContentAssetInput = {
  title: string;
  summary?: string | undefined;
  asset_type: string;
  duration?: string | undefined;
  provider?: string | undefined;
  video_url?: string | undefined;
  download_url?: string | undefined;
  attachment?: string | undefined;
  audio_file?: string | undefined;
  thumbnail?: string | undefined;
  tags?: string | undefined;
};

function requireId(value: string, name: string): void {
  if (!value || !value.trim()) throw new Error(`${name} is required`);
}

export class ContentAssetService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  // ── Asset CRUD ───────────────────────────────────────────────────

  async listAssets(filters?: { assetType?: string; search?: string }): Promise<Record<string, unknown>[]> {
    const where: Record<string, unknown> = { deleted_at: null };
    if (filters?.assetType) where.asset_type = filters.assetType;
    if (filters?.search) where.title = { contains: filters.search, mode: 'insensitive' };

    const assets = await this.prisma.content_asset.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });

    // Count how many lessons use each asset
    const assetIds = assets.map((a) => a.id);
    const usageCounts = assetIds.length > 0
      ? await this.prisma.lesson_content.groupBy({
          by: ['asset_id'],
          where: { asset_id: { in: assetIds }, deleted_at: null },
          _count: { id: true },
        })
      : [];
    const usageMap = new Map(usageCounts.map((u) => [u.asset_id, u._count.id]));

    return assets.map((a) => ({
      id: a.id,
      title: a.title,
      summary: a.summary ?? '',
      asset_type: a.asset_type,
      duration: a.duration ?? '',
      provider: a.provider ?? '',
      video_url: a.video_url ?? '',
      download_url: a.download_url ?? '',
      attachment: a.attachment ?? '',
      audio_file: a.audio_file ?? '',
      thumbnail: a.thumbnail ?? '',
      tags: a.tags ?? '',
      lesson_count: usageMap.get(a.id) ?? 0,
      created_at: a.created_at?.toISOString() ?? '',
    }));
  }

  async getAsset(assetId: string): Promise<Record<string, unknown> | null> {
    const a = await this.prisma.content_asset.findFirst({
      where: { id: assetId, deleted_at: null },
    });
    if (!a) return null;

    return {
      id: a.id,
      title: a.title,
      summary: a.summary ?? '',
      asset_type: a.asset_type,
      duration: a.duration ?? '',
      provider: a.provider ?? '',
      video_url: a.video_url ?? '',
      download_url: a.download_url ?? '',
      attachment: a.attachment ?? '',
      audio_file: a.audio_file ?? '',
      thumbnail: a.thumbnail ?? '',
      tags: a.tags ?? '',
      created_at: a.created_at?.toISOString() ?? '',
    };
  }

  async createAsset(actorUserId: string, input: ContentAssetInput): Promise<Record<string, unknown>> {
    const asset = await this.prisma.content_asset.create({
      data: {
        title: input.title,
        summary: input.summary ?? null,
        asset_type: input.asset_type,
        duration: input.duration ?? null,
        provider: input.provider ?? null,
        video_url: input.video_url ?? null,
        download_url: input.download_url ?? null,
        attachment: input.attachment ?? null,
        audio_file: input.audio_file ?? null,
        thumbnail: input.thumbnail ?? null,
        tags: input.tags ?? null,
        created_by: actorUserId,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
    return { id: asset.id };
  }

  async updateAsset(actorUserId: string, assetId: string, input: ContentAssetInput): Promise<void> {
    await this.prisma.content_asset.update({
      where: { id: assetId },
      data: {
        title: input.title,
        summary: input.summary ?? null,
        asset_type: input.asset_type,
        duration: input.duration ?? null,
        provider: input.provider ?? null,
        video_url: input.video_url ?? null,
        download_url: input.download_url ?? null,
        attachment: input.attachment ?? null,
        audio_file: input.audio_file ?? null,
        thumbnail: input.thumbnail ?? null,
        tags: input.tags ?? null,
        updated_by: actorUserId,
        updated_at: new Date(),
      },
    });
  }

  async deleteAsset(actorUserId: string, assetId: string): Promise<void> {
    await this.prisma.content_asset.update({
      where: { id: assetId },
      data: { deleted_by: actorUserId, deleted_at: new Date() },
    });
  }

  // ── Lesson ↔ Asset Linking ───────────────────────────────────────

  async listLessonAssets(lessonId: string): Promise<Record<string, unknown>[]> {
    const junctions = await this.prisma.lesson_content.findMany({
      where: { lesson_id: lessonId, deleted_at: null },
      orderBy: { order: 'asc' },
    });
    if (junctions.length === 0) return [];

    const assetIds = junctions.map((j) => j.asset_id);
    const assets = await this.prisma.content_asset.findMany({
      where: { id: { in: assetIds }, deleted_at: null },
    });
    const assetMap = new Map(assets.map((a) => [a.id, a]));

    return junctions
      .map((j) => {
        const a = assetMap.get(j.asset_id);
        if (!a) return null;
        return {
          id: a.id,
          title: a.title,
          summary: a.summary ?? '',
          asset_type: a.asset_type,
          duration: a.duration ?? '',
          video_url: a.video_url ?? '',
          attachment: a.attachment ?? '',
          audio_file: a.audio_file ?? '',
          order: j.order,
          free: j.free ?? 'off',
          junction_id: j.id,
        };
      })
      .filter(Boolean) as Record<string, unknown>[];
  }

  async linkAssetToLesson(actorUserId: string, lessonId: string, assetId: string): Promise<Record<string, unknown>> {
    const existing = await this.prisma.lesson_content.findFirst({
      where: { lesson_id: lessonId, asset_id: assetId, deleted_at: null },
    });
    if (existing) return { id: existing.id, already_linked: true };

    const last = await this.prisma.lesson_content.findMany({
      where: { lesson_id: lessonId, deleted_at: null },
      select: { order: true },
      orderBy: { order: 'desc' },
      take: 1,
    });

    const junction = await this.prisma.lesson_content.create({
      data: {
        lesson_id: lessonId,
        asset_id: assetId,
        order: (last[0]?.order ?? 0) + 1,
        created_by: actorUserId,
        created_at: new Date(),
        deleted_at: null,
      },
    });
    return { id: junction.id };
  }

  async unlinkAssetFromLesson(lessonId: string, assetId: string): Promise<void> {
    const junction = await this.prisma.lesson_content.findFirst({
      where: { lesson_id: lessonId, asset_id: assetId, deleted_at: null },
    });
    if (junction) {
      await this.prisma.lesson_content.update({
        where: { id: junction.id },
        data: { deleted_at: new Date() },
      });
    }
  }
}
