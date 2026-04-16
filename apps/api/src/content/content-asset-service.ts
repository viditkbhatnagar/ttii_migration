import type { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../data/prisma-client.js';

// The content_asset and lesson_content tables are not present in the
// production MySQL schema. Production uses lesson_files directly for
// per-lesson media. The service is retained as a stub so routes
// compile; a later session will either rewire the routes or introduce
// content_asset/lesson_content tables.

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

export class ContentAssetService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  listAssets(_filters?: {
    assetType?: string;
    search?: string;
  }): Promise<Record<string, unknown>[]> {
    return Promise.resolve([]);
  }

  getAsset(_assetId: string): Promise<Record<string, unknown> | null> {
    return Promise.resolve(null);
  }

  createAsset(
    _actorUserId: string,
    _input: ContentAssetInput,
  ): Promise<Record<string, unknown>> {
    return Promise.reject(new Error('content_asset table not present in MySQL schema'));
  }

  updateAsset(
    _actorUserId: string,
    _assetId: string,
    _input: ContentAssetInput,
  ): Promise<void> {
    return Promise.reject(new Error('content_asset table not present in MySQL schema'));
  }

  deleteAsset(_actorUserId: string, _assetId: string): Promise<void> {
    return Promise.reject(new Error('content_asset table not present in MySQL schema'));
  }

  listLessonAssets(_lessonId: string): Promise<Record<string, unknown>[]> {
    return Promise.resolve([]);
  }

  linkAssetToLesson(
    _actorUserId: string,
    _lessonId: string,
    _assetId: string,
  ): Promise<Record<string, unknown>> {
    return Promise.reject(new Error('lesson_content table not present in MySQL schema'));
  }

  unlinkAssetFromLesson(_lessonId: string, _assetId: string): Promise<void> {
    return Promise.reject(new Error('lesson_content table not present in MySQL schema'));
  }
}
