import type { PrismaClient, Prisma } from '@prisma/client';

import { getPrismaClient } from '../data/prisma-client.js';
import { env } from '../env.js';

const DEFAULT_COURSE_BENEFITS = [
  {
    id: 1,
    title: 'Achieve greater focus and inner calm.',
  },
  {
    id: 2,
    title: 'Reduce stress and anxiety through daily practice.',
  },
  {
    id: 3,
    title: 'Improve emotional regulation and self-awareness.',
  },
] as const;

const DATE_FLOOR = '1970-01-01';

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

function idString(id: string | number | null | undefined): string {
  if (id === null || id === undefined) return '';
  return String(id);
}

function timeColumnToString(value: Date | string | null | undefined): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  // Prisma returns @db.Time(0) values as Date anchored to 1970-01-01 UTC
  const h = String(value.getUTCHours()).padStart(2, '0');
  const m = String(value.getUTCMinutes()).padStart(2, '0');
  const s = String(value.getUTCSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function timeStringToDate(value: string): Date {
  const seconds = (() => {
    const parts = value.trim().split(':').map((s) => Number.parseInt(s, 10));
    if (parts.some((p) => Number.isNaN(p))) return 0;
    if (parts.length === 3) return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
    if (parts.length === 2) return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
    return parts[0] ?? 0;
  })();
  return new Date(seconds * 1000);
}

function toDbNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'bigint') {
    return Number(value);
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function toStringValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value);
  }

  return '';
}

function toNullableString(value: unknown): string | null {
  const normalized = toStringValue(value).trim();
  return normalized === '' ? null : normalized;
}

// Ishfaq UAT 2026-05-22 — lesson_files.languages has a json_valid CHECK
// constraint on the MySQL side (legacy PHP LMS quirk). Accept either a
// single string ("English") or an array; write a JSON array string or
// NULL so the DB never rejects the insert.
function toLanguagesJson(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    const cleaned = value
      .map((v) => toStringValue(v).trim())
      .filter((v) => v !== '');
    return cleaned.length === 0 ? null : JSON.stringify(cleaned);
  }
  const normalized = toStringValue(value).trim();
  if (normalized === '') return null;
  // Accept a value already JSON-encoded (e.g. '["English"]') — round-trip
  // through parse+stringify so we never end up with double-encoded strings.
  if (normalized.startsWith('[') && normalized.endsWith(']')) {
    try {
      const parsed = JSON.parse(normalized) as unknown;
      if (Array.isArray(parsed)) {
        const cleaned = parsed.map((v) => toStringValue(v).trim()).filter((v) => v !== '');
        return cleaned.length === 0 ? null : JSON.stringify(cleaned);
      }
    } catch {
      // fall through and treat as a plain string
    }
  }
  return JSON.stringify([normalized]);
}

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '').trim();
}

function toShortDescription(value: string): string {
  if (value.length <= 60) {
    return value;
  }

  return `${value.slice(0, 60)}...`;
}

function capitalize(value: string): string {
  if (value === '') {
    return value;
  }

  return `${value[0]?.toUpperCase() ?? ''}${value.slice(1)}`;
}

function normalizeAttachmentType(value: string): string {
  if (value === 'url') {
    return 'video';
  }

  return value;
}

function parseTimeToSeconds(value: string): number {
  const normalized = value.trim();
  if (normalized === '') {
    return 0;
  }

  const parts = normalized.split(':').map((segment) => Number.parseInt(segment, 10));
  if (parts.some((segment) => Number.isNaN(segment) || segment < 0)) {
    return 0;
  }

  if (parts.length === 3) {
    return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
  }

  if (parts.length === 2) {
    return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
  }

  if (parts.length === 1) {
    return parts[0] ?? 0;
  }

  return 0;
}

function formatLegacyDate(value: unknown): string {
  const raw = toNullableString(value);
  if (!raw) {
    return '';
  }

  const parsedDate = new Date(raw);
  if (Number.isNaN(parsedDate.getTime())) {
    return '';
  }

  const day = String(parsedDate.getDate()).padStart(2, '0');
  const month = parsedDate.toLocaleString('en-US', { month: 'short' });
  const year = parsedDate.getFullYear();
  return `${day} ${month} ${year}`;
}

function toDateStringOrFallback(value: string | undefined, fallback: string): string {
  if (!value || value.trim() === '') {
    return fallback;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }

  return parsed.toISOString().slice(0, 10);
}

type RatingRow = { rating: number; rating_count: number };

function toRatingDistribution(rows: RatingRow[]): Record<string, number> {
  const distribution: Record<string, number> = {
    '5_star': 0,
    '4_star': 0,
    '3_star': 0,
    '2_star': 0,
    '1_star': 0,
  };

  const totalReviews = rows.reduce((acc, row) => acc + row.rating_count, 0);
  if (totalReviews <= 0) {
    return distribution;
  }

  for (const row of rows) {
    const rating = Math.trunc(row.rating);
    const count = row.rating_count;
    const percentage = Math.round((count / totalReviews) * 100);

    switch (rating) {
      case 5:
        distribution['5_star'] = percentage;
        break;
      case 4:
        distribution['4_star'] = percentage;
        break;
      case 3:
        distribution['3_star'] = percentage;
        break;
      case 2:
        distribution['2_star'] = percentage;
        break;
      case 1:
        distribution['1_star'] = percentage;
        break;
      default:
        break;
    }
  }

  return distribution;
}

function parseFeatureList(features: string): Array<{ id: number; title: string }> {
  const matches = [...features.matchAll(/<li>(.*?)<\/li>/gis)];
  if (matches.length === 0) {
    return DEFAULT_COURSE_BENEFITS.map((entry) => ({ ...entry }));
  }

  const parsed = matches
    .map((match, index) => {
      const title = stripHtml(match[1] ?? '').trim();
      return {
        id: index + 1,
        title,
      };
    })
    .filter((entry) => entry.title !== '');

  if (parsed.length === 0) {
    return DEFAULT_COURSE_BENEFITS.map((entry) => ({ ...entry }));
  }

  return parsed;
}

function parseWhoShouldEnrol(features: string): unknown[] {
  if (features.trim() === '') {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(features);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // Legacy behavior allows non-JSON features content.
  }

  return [];
}

export interface SaveVideoProgressInput {
  courseId?: string;
  lessonFileId: string;
  lessonDuration: string;
  userProgress: string;
}

export interface SaveMaterialProgressInput {
  courseId: string;
  lessonFileId: string;
  attachmentType: string;
}

export type AdminCourseInput = {
  title: string;
  course_code?: string | undefined;
  short_name?: string | undefined;
  category_id?: string | undefined;
  description?: string | undefined;
  duration?: string | undefined;
  thumbnail?: string | undefined;
  is_free_course?: boolean | undefined;
  price?: number | undefined;
  sale_price?: number | undefined;
  features?: string | undefined;
  label?: string | undefined;
  status?: string | undefined;
  visibility?: string | undefined;
  // QA Correction2 additions — map to existing + new course columns.
  level?: string | undefined;
  version?: string | undefined;
  total_learning_hours?: number | undefined;
  outcomes?: string | undefined;        // learning outcomes
  requirements?: string | undefined;    // prerequisites
  language?: string | undefined;
  // Course hierarchy structure (Naji 2026-06-23): 1 = Subject-wise (default),
  // 2 = Lesson-wise (no subjects). See course.structure_type.
  structure_type?: number | undefined;
  // Marketing tags shown on the student Recommended cards (Best Seller /
  // Trending / New / Recommended / Placement Support). Stored as a JSON array
  // in the otherwise-unused `meta_keywords` column (Naji 2026-06-08).
  tags?: string[] | undefined;
};

export type AdminSubjectInput = {
  course_id: string;
  title: string;
  description?: string | undefined;
  order?: number | undefined;
  subject_id?: string | undefined; // for linking existing subject to course
  // QA Correction2 additions
  subject_code?: string | undefined;
  short_name?: string | undefined;
  subject_type?: string | undefined;  // 'core' | 'elective'
  duration_hours?: number | undefined;
  version?: string | undefined;
  learning_outcomes?: string | undefined;
  skills_covered?: string | undefined;
  assignment_max_marks?: number | undefined;
  assignment_pass_marks?: number | undefined;
  examination_max_marks?: number | undefined;
  examination_pass_marks?: number | undefined;
  project_max_marks?: number | undefined;
  project_pass_marks?: number | undefined;
  viva_max_marks?: number | undefined;
  viva_pass_marks?: number | undefined;
  status?: string | undefined; // 'draft' | 'active' | 'archived'
};

export type AdminLessonInput = {
  course_id?: string | undefined; // derived from subject when subject-wise; REQUIRED when lesson-wise
  // Optional: omitted/empty for Lesson-wise courses (lesson attaches directly
  // to the course, subject_id NULL). Required for Subject-wise courses.
  subject_id?: string | undefined;
  title: string;
  summary?: string | undefined;
  free?: boolean | undefined;
  order?: number | undefined;
};

export type AdminLessonFileInput = {
  lesson_id: string;
  title?: string | undefined;
  summary?: string | undefined;
  duration?: string | undefined;
  lesson_type?: string | undefined;
  video_url?: string | undefined;
  attachment?: string | undefined;
  audio_file?: string | undefined;
  thumbnail?: string | undefined;
  language?: string | undefined;
  free?: boolean | undefined;
};

export interface LessonMaterialFilter {
  lessonId?: string;
  subjectId?: string;
  courseId?: string;
}

export class ContentService {
  // Production env still has APP_BASE_URL=https://api.teachersindia.in
  // — a host with no DNS record on the new infra. Every URL built with
  // appBaseUrl was 404'ing (PDFs, quiz_link, practice_link, dummy_user
  // image). Rewrite once at construction time so every consumer is
  // safe; toFileUrl also applies the same rewrite for absolute paths
  // already baked into the database. Naji 2026-05-05.
  private readonly appBaseUrl = env.APP_BASE_URL
    .replace(/\/$/, '')
    .replace(/^https?:\/\/api\.teachersindia\.in/i, 'https://lms.teachersindia.in');

  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  private toFileUrl(path: unknown): string {
    const normalized = toNullableString(path);
    if (!normalized) {
      return '';
    }

    // Naji 2026-05-05: production prefixes paths with APP_BASE_URL,
    // which legacy data set to https://api.teachersindia.in — a host
    // that has no DNS record on the new infra. Real uploads are
    // served from https://lms.teachersindia.in/uploads/... Rewrite
    // both absolute legacy URLs AND newly-built URLs through the
    // alive host so PDFs / images render.
    const rewriteDeadHost = (url: string) =>
      url.replace(/^https?:\/\/api\.teachersindia\.in/i, 'https://lms.teachersindia.in');

    if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
      return rewriteDeadHost(normalized);
    }

    return rewriteDeadHost(`${this.appBaseUrl}/${normalized.replace(/^\/+/, '')}`);
  }

  private async getUserById(userId: string) {
    return this.prisma.users.findFirst({
      where: {
        id: toIntId(userId),
        deleted_at: null,
      },
      select: {
        id: true,
        student_id: true,
        name: true,
        email: true,
        user_email: true,
        phone: true,
        role_id: true,
        course_id: true,
        status: true,
        device_id: true,
        image: true,
        premium: true,
      },
    });
  }

  private async getCourseById(courseId: string) {
    return this.prisma.course.findFirst({
      where: {
        id: toIntId(courseId),
        deleted_at: null,
      },
    });
  }

  /** Subject IDs linked to the given course via the course_subject pivot,
   * preserving pivot.position then subject.id for ordering. Returns [] for
   * an invalid courseId or a course with no linked subjects. */
  private async loadSubjectIdsForCourse(courseId: string): Promise<number[]> {
    const courseIdInt = toNullableIntId(courseId);
    if (courseIdInt === null) return [];

    const links = await this.prisma.course_subject.findMany({
      where: { course_id: courseIdInt, deleted_at: null },
      select: { subject_id: true, position: true },
      orderBy: [{ position: 'asc' }, { subject_id: 'asc' }],
    });

    return links.map((l) => l.subject_id);
  }

  /** Count of active subjects linked to a course via course_subject. */
  private async countSubjectsForCourse(courseId: string): Promise<number> {
    const courseIdInt = toNullableIntId(courseId);
    if (courseIdInt === null) return 0;

    const links = await this.prisma.course_subject.findMany({
      where: { course_id: courseIdInt, deleted_at: null },
      select: { subject_id: true },
    });

    if (links.length === 0) return 0;

    return this.prisma.subject.count({
      where: { id: { in: links.map((l) => l.subject_id) }, deleted_at: null },
    });
  }

  private async isUserEnrolled(userId: string, courseId: string): Promise<boolean> {
    const total = await this.prisma.enrol.count({
      where: {
        user_id: toIntId(userId),
        course_id: toIntId(courseId),
        deleted_at: null,
      },
    });

    return total > 0;
  }

  private async averageRatingByCourse(courseId: string): Promise<string> {
    const result = await this.prisma.review.aggregate({
      where: {
        course_id: toIntId(courseId),
        rating: { not: null },
        deleted_at: null,
      },
      _avg: {
        rating: true,
      },
    });

    const average = result._avg?.rating ?? 0;
    return average.toFixed(2);
  }

  private async totalReviewsByCourse(courseId: string): Promise<number> {
    return this.prisma.review.count({
      where: {
        course_id: toIntId(courseId),
        deleted_at: null,
      },
    });
  }

  private async ratingDistributionByCourse(courseId: string): Promise<Record<string, number>> {
    const groups = await this.prisma.review.groupBy({
      by: ['rating'],
      where: {
        course_id: toIntId(courseId),
        rating: { not: null },
        deleted_at: null,
      },
      _count: {
        rating: true,
      },
    });

    const rows: RatingRow[] = groups.map((g) => ({
      rating: g.rating ?? 0,
      rating_count: g._count?.rating ?? 0,
    }));

    return toRatingDistribution(rows);
  }

  private async getCourseLessonIds(courseId: string): Promise<number[]> {
    // course_subjects junction does not exist in MySQL; lesson.course_id
    // is populated directly by the PHP app (dual-write pattern).
    const courseIdInt = toNullableIntId(courseId);
    if (courseIdInt === null) return [];
    const rows = await this.prisma.lesson.findMany({
      where: {
        course_id: courseIdInt,
        deleted_at: null,
      },
      select: { id: true },
      orderBy: { id: 'asc' },
    });

    return rows.map((row) => row.id);
  }

  private async getSubjectLessonIds(subjectId: string): Promise<number[]> {
    const rows = await this.prisma.lesson.findMany({
      where: {
        subject_id: toNullableIntId(subjectId),
        deleted_at: null,
      },
      select: { id: true },
      orderBy: { id: 'asc' },
    });

    return rows.map((row) => row.id);
  }

  private async getLessonFilesForLesson(lessonId: string) {
    return this.prisma.lesson_files.findMany({
      where: {
        lesson_id: toIntId(lessonId),
        deleted_at: null,
      },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
    });
  }

  // Resolve a subject's display title (used to tag-match legacy content_asset
  // rows that were tagged by name but never FK-linked to a lesson).
  private async getSubjectTitleById(subjectId: unknown): Promise<string> {
    const sid = toNullableIntId(toStringValue(subjectId));
    if (sid === null) return '';
    const subject = await this.prisma.subject.findUnique({
      where: { id: sid },
      select: { title: true },
    });
    return subject?.title ?? '';
  }

  // Content Library assets (content_asset) that belong to a lesson — surfaced
  // to the student player so library content is no longer admin-only. Matched
  // by the FK lesson_id when set, OR by the legacy text lesson_tag + subject_tag
  // for older assets that were tagged by name but never FK-linked. Each row is
  // mapped to the EXACT lesson-file shape so both the web and Flutter players
  // render it as ordinary lesson content. Quizzes are excluded (content_asset
  // quizzes use a different question store than the lesson-file quiz flow).
  private async getContentAssetFilesForLesson(
    lessonId: string,
    lessonTitle: string,
    subjectTitle: string,
  ): Promise<Record<string, unknown>[]> {
    const lid = toNullableIntId(lessonId);
    if (lid === null) return [];

    const or: Record<string, unknown>[] = [{ lesson_id: lid }];
    const lt = lessonTitle.trim();
    const st = subjectTitle.trim();
    if (lt !== '' && st !== '') {
      // Only tag-match UNLINKED assets so an asset FK-linked to another lesson
      // can never leak in here via a name collision.
      or.push({ lesson_id: null, lesson_tag: lt, subject_tag: st });
    }

    const assets = await this.prisma.content_asset.findMany({
      where: { deleted_at: null, asset_type: { not: 'quiz' }, OR: or },
      orderBy: [{ sort_order: 'asc' }, { id: 'asc' }],
    });

    return assets.map((a) => this.mapContentAssetToLessonFile(a, lid));
  }

  // Map one content_asset row onto the lesson-file shape produced by
  // buildLessonFileData (every field present + correctly typed so the strict
  // Flutter model never crashes). Ids are offset by 1e9 so they never collide
  // with real lesson_files ids inside the same lesson.
  private mapContentAssetToLessonFile(
    a: Record<string, unknown>,
    lessonIdInt: number,
  ): Record<string, unknown> {
    const assetType = toStringValue(a.asset_type).trim().toLowerCase();
    const videoUrl = toStringValue(a.video_url);
    let lessonType = assetType;
    let attachmentType = '';
    let lessonProvider = toStringValue(a.provider).trim().toLowerCase();

    if (assetType === 'video') {
      lessonType = 'video';
      if (lessonProvider === '') {
        lessonProvider = /youtu/i.test(videoUrl) ? 'youtube' : /vimeo/i.test(videoUrl) ? 'vimeo' : '';
      }
    } else if (assetType === 'audio') {
      lessonType = 'audio';
      attachmentType = 'audio';
    } else if (assetType === 'article') {
      lessonType = 'article';
      attachmentType = 'article';
    } else if (assetType === 'document') {
      lessonType = 'document';
      attachmentType = /\.pdf($|\?)/i.test(toStringValue(a.attachment)) ? 'pdf' : 'document';
    }

    const resolvedType = this.resolveLessonType({
      lesson_type: lessonType,
      lesson_provider: lessonProvider,
      attachment_type: attachmentType,
    });
    const downloadUrl = toNullableString(a.download_url);

    return {
      id: 1_000_000_000 + toDbNumber(a.id),
      sub_title: '',
      title: toStringValue(a.title),
      lesson_id: lessonIdInt,
      parent_file_id: 0,
      description: toStringValue(a.summary),
      duration: toStringValue(a.duration),
      lesson_provider: lessonProvider,
      video_type: '',
      video_url: videoUrl,
      is_downloadable: downloadUrl ? 1 : 0,
      download_url: downloadUrl ?? '',
      lesson_type: lessonType,
      attachment_type: attachmentType,
      attachment_url: this.toFileUrl(a.attachment),
      audio_url: this.toFileUrl(a.audio_file),
      video_url_id: '',
      video_files: [] as unknown[],
      quiz_link: '',
      practice_link: '',
      progress: 0,
      vimeo_access_token: '',
      is_completed: 0,
      contact_number: '',
      type: resolvedType,
    };
  }

  private async getFileProgress(userId: string, lessonFileId: string, lessonType: string): Promise<number> {
    if (lessonType === 'youtube_video' || lessonType === 'vimeo_video' || lessonType === 'audio') {
      const progressRow = await this.prisma.video_progress_status.findFirst({
        where: {
          user_id: toNullableIntId(userId),
          lesson_file_id: toNullableIntId(lessonFileId),
          deleted_at: null,
        },
        select: {
          total_duration: true,
          user_progress: true,
          status: true,
        },
        orderBy: { id: 'desc' },
      });

      if (!progressRow) {
        return 0;
      }

      if (progressRow.status === 1) {
        return 100;
      }

      const totalDuration = parseTimeToSeconds(timeColumnToString(progressRow.total_duration));
      const userProgress = parseTimeToSeconds(timeColumnToString(progressRow.user_progress));
      if (totalDuration <= 0) {
        return 0;
      }

      return Math.min(100, Math.round((userProgress / totalDuration) * 100));
    }

    if (lessonType === 'document' || lessonType === 'article') {
      // material_progress table does not exist in MySQL schema; treat
      // document/article materials as "not completed" until we wire a
      // replacement store.
      return 0;
    }

    if (lessonType === 'quiz') {
      const completed = await this.prisma.practice_attempt.count({
        where: {
          user_id: toNullableIntId(userId),
          lesson_file_id: lessonFileId,
          submit_status: true,
          deleted_at: null,
        },
      });

      return completed > 0 ? 100 : 0;
    }

    return 0;
  }

  private async getCompletedFilesForLesson(
    lessonId: string,
    userId: string,
    courseId?: string,
  ): Promise<number> {
    const lessonFiles = await this.getLessonFilesForLesson(lessonId);
    if (lessonFiles.length === 0) {
      return 0;
    }

    const videoIds: number[] = [];
    const quizIds: string[] = [];

    for (const file of lessonFiles) {
      const attachmentType = (file.attachment_type ?? '').trim().toLowerCase();

      if (attachmentType === 'url' || attachmentType === 'audio') {
        videoIds.push(file.id);
      }

      if (attachmentType === 'quiz') {
        quizIds.push(String(file.id));
      }
    }

    let videoCompleted = 0;
    if (videoIds.length > 0) {
      const videoProgressRows = await this.prisma.video_progress_status.findMany({
        where: {
          user_id: toNullableIntId(userId),
          status: 1,
          lesson_file_id: { in: videoIds },
          ...(courseId ? { course_id: toNullableIntId(courseId) } : {}),
          deleted_at: null,
        },
        select: { lesson_file_id: true },
        distinct: ['lesson_file_id'],
      });
      videoCompleted = videoProgressRows.length;
    }

    // material_progress table does not exist in MySQL; material completion
    // is not currently tracked.

    let quizCompleted = 0;
    if (quizIds.length > 0) {
      const quizAttemptRows = await this.prisma.practice_attempt.findMany({
        where: {
          user_id: toNullableIntId(userId),
          submit_status: true,
          lesson_file_id: { in: quizIds },
          deleted_at: null,
        },
        select: { lesson_file_id: true },
        distinct: ['lesson_file_id'],
      });
      quizCompleted = quizAttemptRows.length;
    }

    return videoCompleted + quizCompleted;
  }

  private async getUserPurchaseStatus(userId: string, courseId: string): Promise<'on' | 'off'> {
    const user = await this.getUserById(userId);
    if (!user) {
      return 'off';
    }

    if (user.role_id === 3) {
      return 'on';
    }

    if (user.premium === 1) {
      return 'on';
    }

    const course = await this.getCourseById(courseId);
    if (!course) {
      return 'off';
    }

    if (course.is_free_course === 1) {
      return 'on';
    }

    const now = new Date();
    const activePaymentCount = await this.prisma.payment_info.count({
      where: {
        user_id: toNullableIntId(userId),
        course_id: toNullableIntId(courseId),
        deleted_at: null,
        expiry_date: {
          not: null,
          gte: now,
        },
      },
    });

    return activePaymentCount > 0 ? 'on' : 'off';
  }

  private resolveLessonType(file: Record<string, unknown>): string {
    const lessonType = toStringValue(file.lesson_type).trim().toLowerCase();
    const lessonProvider = toStringValue(file.lesson_provider).trim().toLowerCase();
    const attachmentType = toStringValue(file.attachment_type).trim().toLowerCase();

    if (lessonType === 'video' && lessonProvider === 'youtube') {
      return 'youtube_video';
    }

    if (lessonType === 'video' && lessonProvider === 'vimeo') {
      return 'vimeo_video';
    }

    if (attachmentType === 'audio') {
      return 'audio';
    }

    if (attachmentType === 'article') {
      return 'article';
    }

    if (attachmentType === 'pdf') {
      return 'document';
    }

    if (attachmentType === 'quiz') {
      return 'quiz';
    }

    return capitalize(lessonType);
  }

  private async buildLessonFileData(
    file: Record<string, unknown>,
    lessonId: string,
    userId: string,
    courseId: string,
  ): Promise<Record<string, unknown>> {
    const fileId = toStringValue(file.id);
    const resolvedType = this.resolveLessonType(file);
    const progress = await this.getFileProgress(userId, fileId, resolvedType);

    const quizCount = await this.prisma.quiz.count({
      where: {
        lesson_file_id: toIntId(fileId),
        deleted_at: null,
      },
    });

    const videoFileRows = await this.prisma.vimeo_videolinks.findMany({
      where: {
        lesson_file_id: toNullableIntId(fileId),
        deleted_at: null,
      },
      select: {
        id: true,
        quality: true,
        rendition: true,
        height: true,
        width: true,
        type: true,
        link: true,
        fps: true,
        size: true,
        public_name: true,
        size_short: true,
        download_link: true,
      },
      orderBy: { id: 'asc' },
    });
    // Null-safe the numeric dims — Flutter types height/width as int, so a
    // null (videos without stored dimensions) crashes the player model.
    const videoFiles = videoFileRows.map((v) => ({ ...v, height: v.height ?? 0, width: v.width ?? 0 }));

    const downloadUrl = toNullableString(file.download_url);
    const attachmentType = toStringValue(file.attachment_type);

    // Ansaba UAT 2026-05-22 — Flutter LessonFile model types id /
    // lesson_id / parent_file_id as int. Same reasoning as the sibling
    // Video/Material builders (commit ba2ecc9d).
    return {
      id: toNullableIntId(fileId) ?? 0,
      sub_title: toStringValue(file.sub_title),
      title: toStringValue(file.title),
      lesson_id: toNullableIntId(lessonId) ?? 0,
      parent_file_id: toNullableIntId(toStringValue(file.parent_file_id)) ?? 0,
      description: toStringValue(file.summary),
      duration: toStringValue(file.duration),
      lesson_provider: toStringValue(file.lesson_provider),
      video_type: toStringValue(file.video_type),
      video_url: toStringValue(file.video_url),
      is_downloadable: downloadUrl ? 1 : 0,
      download_url: downloadUrl ?? '',
      lesson_type: toStringValue(file.lesson_type),
      attachment_type: attachmentType,
      attachment_url: this.toFileUrl(file.attachment),
      audio_url: this.toFileUrl(file.audio_file),
      video_url_id: '',
      video_files: videoFiles,
      quiz_link:
        attachmentType === 'quiz'
          ? `${this.appBaseUrl}/exam/practice_web_view_new/${userId}/${courseId}?lesson_file_id=${fileId}&question_no=${quizCount}`
          : '',
      practice_link:
        attachmentType === 'practice' ? `${this.appBaseUrl}/practice/index/${userId}/${fileId}` : '',
      progress,
      vimeo_access_token: '',
      is_completed: progress === 100 ? 1 : 0,
      contact_number: '',
      type: resolvedType,
    };
  }

  private async calculateUserProgress(
    userId: string,
    courseId = '',
    subjectId = '',
  ): Promise<{
    progress: number;
    totalVideos: number;
    completedVideos: number;
    totalMaterials: number;
    completedMaterials: number;
    totalPractice: number;
    attemptedPractices: number;
  }> {
    const lessonIds = subjectId !== '' ? await this.getSubjectLessonIds(subjectId) : await this.getCourseLessonIds(courseId);

    if (lessonIds.length === 0) {
      return {
        progress: 0,
        totalVideos: 0,
        completedVideos: 0,
        totalMaterials: 0,
        completedMaterials: 0,
        totalPractice: 0,
        attemptedPractices: 0,
      };
    }

    const lessonFiles = await this.prisma.lesson_files.findMany({
      where: {
        lesson_id: { in: lessonIds },
        deleted_at: null,
      },
      select: {
        id: true,
        lesson_type: true,
        attachment_type: true,
      },
    });

    const videoIds: number[] = [];
    const materialIds: number[] = [];

    for (const lessonFile of lessonFiles) {
      const attachmentType = (lessonFile.attachment_type ?? '').trim().toLowerCase();
      const lessonType = (lessonFile.lesson_type ?? '').trim().toLowerCase();

      if (lessonType === 'video') {
        videoIds.push(lessonFile.id);
      }

      if (attachmentType === 'pdf' || attachmentType === 'article') {
        materialIds.push(lessonFile.id);
      }
    }

    const totalVideos = videoIds.length;
    const totalMaterials = materialIds.length;

    let completedVideos = 0;
    if (videoIds.length > 0) {
      const completedVideoRows = await this.prisma.video_progress_status.findMany({
        where: {
          user_id: toNullableIntId(userId),
          status: 1,
          lesson_file_id: { in: videoIds },
          deleted_at: null,
        },
        select: { lesson_file_id: true },
        distinct: ['lesson_file_id'],
      });
      completedVideos = completedVideoRows.length;
    }

    // material_progress table does not exist in MySQL schema.
    const completedMaterials = 0;

    const lessonIdsStr = lessonIds.map((id) => String(id));
    const totalPractice = await this.prisma.practice_attempt.count({
      where: {
        user_id: toNullableIntId(userId),
        lesson_id: { in: lessonIdsStr },
        deleted_at: null,
      },
    });

    const attemptedPracticeRows = await this.prisma.practice_attempt.findMany({
      where: {
        user_id: toNullableIntId(userId),
        lesson_id: { in: lessonIdsStr },
        submit_status: true,
        deleted_at: null,
      },
      select: { id: true },
      distinct: ['id'],
    });
    const attemptedPractices = attemptedPracticeRows.length;

    const totalActivities = totalVideos + totalMaterials + totalPractice;
    const completedActivities = completedVideos + completedMaterials + attemptedPractices;
    const progress = totalActivities > 0 ? (completedActivities / totalActivities) * 100 : 0;

    return {
      progress,
      totalVideos,
      completedVideos,
      totalMaterials,
      completedMaterials,
      totalPractice,
      attemptedPractices,
    };
  }

  private async buildCourseData(course: Record<string, unknown>, userId: string): Promise<Record<string, unknown>> {
    const courseId = toStringValue(course.id);
    const description = stripHtml(toStringValue(course.description));

    const enrolments = await this.prisma.enrol.count({
      where: {
        course_id: toNullableIntId(courseId),
        deleted_at: null,
      },
    });

    const lessonsCount = await this.prisma.lesson.count({
      where: {
        course_id: toNullableIntId(courseId),
        deleted_at: null,
      },
    });

    // Lesson-wise courses (structure_type=2) have no subjects (Naji 2026-06-23).
    const structureType = Number(course.structure_type) === 2 ? 2 : 1;
    const subjectCount = structureType === 2 ? 0 : await this.countSubjectsForCourse(courseId);

    const totalReviews = await this.totalReviewsByCourse(courseId);
    const totalRating = await this.averageRatingByCourse(courseId);
    const isEnrolled = await this.isUserEnrolled(userId, courseId);

    const featuresRaw = toStringValue(course.features);

    // Ansaba UAT 2026-05-22 — Flutter Course model types `id` as int.
    // Sibling builders (buildLessonVideoData / buildLessonMaterialData)
    // were also converted in commit ba2ecc9d for the same reason. Web
    // consumers wrap reads with asString() so int/string is transparent.
    const courseIdInt = toNullableIntId(courseId) ?? 0;
    // Ansaba UAT 2026-05-27 — Flutter Course model also types
    // `subjects`, `lessons`, and `progress` as int. Previously we only
    // exposed `subject_count` / `lessons_count` (PHP-snake-case) and
    // never sent `progress` — Flutter's null-safety threw "type 'Null'
    // is not a subtype of type 'int'" the moment those fields were
    // read on the My Course / Home Ongoing Courses cards. Add the
    // mobile aliases as native ints. Web consumers reading the legacy
    // *_count names keep working unchanged.
    const progressPct = isEnrolled
      ? (await this.calculateUserProgress(userId, courseId)).progress
      : 0;
    return {
      id: courseIdInt,
      title: toStringValue(course.title),
      code: toStringValue(course.course_code) || toStringValue(course.code),
      tags: this.parseCourseTags(course.meta_keywords),
      label: toStringValue(course.label),
      status: toStringValue(course.status),
      price: toStringValue(course.price),
      offer_price: toStringValue(course.sale_price),
      description,
      short_description: toShortDescription(description),
      duration: toStringValue(course.duration),
      thumbnail: this.toFileUrl(course.thumbnail),
      cover_image: this.toFileUrl(course.course_icon),
      enrolments,
      features: parseFeatureList(featuresRaw),
      who_should_enrol: parseWhoShouldEnrol(featuresRaw),
      is_enrolled: isEnrolled ? 1 : 0,
      lessons_count: lessonsCount,
      subject_count: subjectCount,
      // 1 = Subject-wise, 2 = Lesson-wise (Course→Lesson→Content, no subjects).
      structure_type: structureType,
      // Mobile-app aliases (Flutter Dart types these as int).
      lessons: lessonsCount,
      subjects: subjectCount,
      progress: Math.round(progressPct),
      total_reviews: totalReviews,
      total_rating: totalRating,
    };
  }

  async listCategories(): Promise<Record<string, unknown>[]> {
    const rows = await this.prisma.category.findMany({
      where: {
        deleted_at: null,
      },
      select: {
        id: true,
        code: true,
        name: true,
        parent: true,
        slug: true,
        description: true,
        short_description: true,
        video_type: true,
        video_url: true,
        font_awesome_class: true,
        thumbnail: true,
        category_icon: true,
      },
      orderBy: { id: 'asc' },
    });

    return rows.map((row) => ({
      id: row.id,
      code: row.code ?? '',
      name: row.name ?? '',
      parent: row.parent ?? '',
      slug: row.slug ?? '',
      description: row.description ?? '',
      short_description: row.short_description ?? '',
      video_type: row.video_type ?? '',
      video_url: row.video_url ?? '',
      font_awesome_class: row.font_awesome_class ?? '',
      thumbnail: this.toFileUrl(row.thumbnail),
      icon: this.toFileUrl(row.category_icon),
    }));
  }

  async getCategoryDetails(categoryId: string): Promise<Record<string, unknown> | null> {
    const category = await this.prisma.category.findFirst({
      where: {
        id: toIntId(categoryId),
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        thumbnail: true,
        video_url: true,
      },
    });

    if (!category) {
      return null;
    }

    const courses = await this.prisma.course.findMany({
      where: {
        category_id: toNullableIntId(categoryId),
        deleted_at: null,
      },
      orderBy: { id: 'asc' },
    });

    let enrolCount = 0;
    const courseData: Record<string, unknown>[] = [];

    for (const course of courses) {
      const courseEnrolCount = await this.prisma.enrol.count({
        where: {
          course_id: course.id,
          deleted_at: null,
        },
      });
      enrolCount += courseEnrolCount;

      courseData.push({
        ...course,
        thumbnail: this.toFileUrl(course.thumbnail),
        course_icon: this.toFileUrl(course.course_icon),
        total_reviews: await this.totalReviewsByCourse(String(course.id)),
        total_rating: await this.averageRatingByCourse(String(course.id)),
      });
    }

    return {
      category_name: category.name ?? '',
      category_description: category.description ?? '',
      thumbnail: this.toFileUrl(category.thumbnail),
      video_url: category.video_url ?? '',
      enroll_count: enrolCount,
      courses: courseData,
    };
  }

  async listCourses(
    userId: string,
    options?: { enrolledOnly?: boolean },
  ): Promise<Record<string, unknown>[]> {
    let courseIdFilter: number[] | undefined;

    if (options?.enrolledOnly) {
      const userIntId = toNullableIntId(userId);
      if (userIntId === null) {
        return [];
      }

      const enrolments = await this.prisma.enrol.findMany({
        where: {
          user_id: userIntId,
          deleted_at: null,
        },
        select: { course_id: true },
      });

      courseIdFilter = [
        ...new Set(
          enrolments
            .map((e) => e.course_id)
            .filter((id): id is number => id !== null && id !== undefined),
        ),
      ];

      if (courseIdFilter.length === 0) {
        return [];
      }
    }

    const rows = await this.prisma.course.findMany({
      where: {
        deleted_at: null,
        ...(courseIdFilter !== undefined ? { id: { in: courseIdFilter } } : {}),
      },
      orderBy: { id: 'asc' },
    });

    const result: Record<string, unknown>[] = [];
    for (const row of rows) {
      result.push(await this.buildCourseData(row as unknown as Record<string, unknown>, userId));
    }

    return result;
  }

  async getCourseDetails(userId: string, courseId: string): Promise<Record<string, unknown> | null> {
    const course = await this.getCourseById(courseId);
    if (!course) {
      return null;
    }

    const user = await this.getUserById(userId);
    const courseData = await this.buildCourseData(course as unknown as Record<string, unknown>, userId);

    const subjectIdsForCourse = await this.loadSubjectIdsForCourse(courseId);
    const subjects = subjectIdsForCourse.length === 0
      ? []
      : await this.prisma.subject.findMany({
          where: {
            id: { in: subjectIdsForCourse },
            deleted_at: null,
          },
          select: {
            id: true,
            title: true,
            thumbnail: true,
          },
        });
    // Preserve pivot ordering (loadSubjectIdsForCourse orders by position).
    const subjectByIdForDetails = new Map(subjects.map((s) => [s.id, s]));
    const orderedSubjectsForDetails = subjectIdsForCourse
      .map((id) => subjectByIdForDetails.get(id))
      .filter((s): s is NonNullable<typeof s> => s !== undefined);

    const subjectData = orderedSubjectsForDetails.map((subject) => ({
      id: subject.id,
      title: subject.title,
      thumbnail: this.toFileUrl(subject.thumbnail),
    }));

    const demoVideos = await this.prisma.demo_video.findMany({
      where: {
        course_id: toNullableIntId(courseId),
        deleted_at: null,
      },
      select: {
        id: true,
        title: true,
        video_type: true,
        video_url: true,
        thumbnail: true,
      },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
    });

    const demoVideoData = demoVideos.map((video) => ({
      id: video.id,
      title: video.title ?? '',
      video_type: video.video_type ?? '',
      video_url: video.video_url ?? '',
      thumbnail: this.toFileUrl(video.thumbnail),
    }));

    // Reviews: separate queries instead of JOIN
    const reviewRows = await this.prisma.review.findMany({
      where: {
        course_id: toNullableIntId(courseId),
        deleted_at: null,
      },
      orderBy: { id: 'asc' },
    });

    // Batch fetch related courses and users for reviews
    const reviewCourseIds = [...new Set(reviewRows.map((r) => r.course_id).filter((v): v is number => v !== null))];
    const reviewUserIds = [...new Set(reviewRows.map((r) => r.user_id).filter((v): v is number => v !== null))];

    const [reviewCourses, reviewUsers] = await Promise.all([
      reviewCourseIds.length > 0
        ? this.prisma.course.findMany({
            where: { id: { in: reviewCourseIds } },
            select: { id: true, title: true },
          })
        : [],
      reviewUserIds.length > 0
        ? this.prisma.users.findMany({
            where: { id: { in: reviewUserIds } },
            select: { id: true, name: true, image: true },
          })
        : [],
    ]);

    const courseMap = new Map(reviewCourses.map((c) => [c.id, c]));
    const userMap = new Map(reviewUsers.map((u) => [u.id, u]));

    const reviewData: Record<string, unknown>[] = [];
    for (const review of reviewRows) {
      const reviewLikeCount = await this.prisma.review_like.count({
        where: {
          review_id: review.id,
          deleted_at: null,
        },
      });

      const isLikedByUser = await this.prisma.review_like.count({
        where: {
          review_id: review.id,
          user_id: toIntId(userId),
          deleted_at: null,
        },
      });

      const reviewCourse = review.course_id !== null ? courseMap.get(review.course_id) : null;
      const reviewUser = review.user_id !== null ? userMap.get(review.user_id) : null;

      reviewData.push({
        id: review.id,
        rating: review.rating ?? 0,
        user_id: review.user_id ?? '',
        course_id: review.course_id ?? '',
        review: review.review ?? '',
        date: formatLegacyDate(review.created_at),
        course: reviewCourse?.title ?? '',
        user: reviewUser?.name ?? '',
        like_count: reviewLikeCount,
        is_liked: isLikedByUser > 0 ? 1 : 0,
        image: this.toFileUrl(reviewUser?.image) || `${this.appBaseUrl}/uploads/dummy_user.jpg`,
      });
    }

    // Instructor: separate queries instead of JOIN
    const instructorEnrol = await this.prisma.instructor_enrol.findFirst({
      where: {
        course_id: toNullableIntId(courseId),
        deleted_at: null,
      },
      select: {
        instructor_id: true,
      },
    });

    let instructorData: Record<string, unknown> = {};
    if (instructorEnrol && instructorEnrol.instructor_id !== null) {
      const instructorUser = await this.prisma.users.findFirst({
        where: { id: instructorEnrol.instructor_id },
        select: { id: true, name: true, image: true },
      });

      if (instructorUser) {
        instructorData = {
          id: instructorUser.id,
          name: instructorUser.name ?? '',
          image: this.toFileUrl(instructorUser.image) || `${this.appBaseUrl}/uploads/dummy_user.jpg`,
        };
      }
    }

    const isEnrolled = await this.isUserEnrolled(userId, courseId);
    const purchaseStatus = await this.getUserPurchaseStatus(userId, courseId);

    return {
      user_data: {
        user_id: userId,
        student_id: user?.student_id ?? '',
        user_name: user?.name ?? '',
        role_id: user?.role_id ?? 0,
        course_id: user?.course_id ?? '',
        user_email: user?.user_email || user?.email || '',
        user_phone: user?.phone ?? '',
        device_id: user?.device_id ?? '',
        status: user?.status ?? 0,
        user_image: this.toFileUrl(user?.image),
      },
      course: courseData,
      subjects: subjectData,
      average_rating: await this.averageRatingByCourse(courseId),
      total_reviews: await this.totalReviewsByCourse(courseId),
      rating_data: await this.ratingDistributionByCourse(courseId),
      review: reviewData,
      instructor: instructorData,
      demo_videos: demoVideoData,
      call_us: '+91',
      whatsapp: '+91',
      is_enrolled: isEnrolled ? 1 : 0,
      is_purchased: purchaseStatus === 'on' ? 1 : 0,
      razorpay_api_key: env.PAYMENT_RAZORPAY_KEY_ID ?? '',
    };
  }

  private async getCohortIdForSubject(userId: string, subject: Record<string, unknown>): Promise<string | null> {
    const subjectIdInt = toNullableIntId(toStringValue(subject.id));
    if (subjectIdInt === null) return null;

    // cohort_students.cohort_id stores the stringified `cohorts.id`
    // (auto-increment int) — NOT the `cohorts.cohort_id` text code.
    // Verified by the centre add-students flow at
    // operations-service.ts:1657 which writes `String(input.cohortId)`
    // (the row id), and by the cohort listing at line 1534 which groups
    // student counts by `String(c.id)`.
    const cohortStudents = await this.prisma.cohort_students.findMany({
      where: {
        user_id: toNullableIntId(userId),
        deleted_at: null,
      },
      select: { cohort_id: true },
    });

    if (cohortStudents.length === 0) {
      return null;
    }

    // Production has TWO populations of cohort_students.cohort_id values:
    // (a) the stringified cohorts.id (e.g. "5", "1014") written by the
    //     new add-students flows at operations-service.ts:1657, and
    // (b) the legacy text code (e.g. "MMJAN26", "COH-1734...") inherited
    //     from the PHP LMS pre-migration.
    // Naji 2026-05-04 was still seeing locked subjects because the
    // initial fix only handled (a). We now query both shapes in one
    // round-trip and union the results.
    const rawCohortRefs = cohortStudents
      .map((cs) => (cs.cohort_id == null ? '' : String(cs.cohort_id).trim()))
      .filter((s) => s.length > 0);

    const cohortRowIds: number[] = [];
    const cohortTextCodes: string[] = [];
    for (const ref of rawCohortRefs) {
      const n = Number(ref);
      if (Number.isFinite(n) && n > 0 && /^\d+$/.test(ref)) {
        cohortRowIds.push(n);
      } else {
        cohortTextCodes.push(ref);
      }
    }

    if (cohortRowIds.length === 0 && cohortTextCodes.length === 0) return null;

    // Match a cohort the student is enrolled in for this subject. We
    // accept either a direct subject_id match or a course-level cohort
    // whose course covers this subject (course_id match with subject_id
    // null) — both forms count as "cohort assigned for that subject"
    // per the release rule.
    const subjectRow = await this.prisma.subject.findFirst({
      where: { id: subjectIdInt, deleted_at: null },
      select: { id: true, course_id: true, master_subject_id: true },
    });
    const subjectCourseId = subjectRow?.course_id ?? null;

    const cohortWhereOr: Prisma.cohortsWhereInput[] = [];
    if (cohortRowIds.length > 0) cohortWhereOr.push({ id: { in: cohortRowIds } });
    if (cohortTextCodes.length > 0) cohortWhereOr.push({ cohort_id: { in: cohortTextCodes } });

    const cohorts = await this.prisma.cohorts.findMany({
      where: {
        OR: cohortWhereOr,
        deleted_at: null,
      },
      select: { id: true, cohort_id: true, subject_id: true, course_id: true },
    });

    if (cohorts.length === 0) {
      return null;
    }

    // Direct subject match
    for (const cohort of cohorts) {
      if (cohort.subject_id === subjectIdInt) {
        return idString(cohort.cohort_id ?? cohort.id);
      }
    }

    // Course-level cohort with no specific subject_id
    if (subjectCourseId !== null) {
      for (const cohort of cohorts) {
        if (cohort.subject_id === null && cohort.course_id === subjectCourseId) {
          return idString(cohort.cohort_id ?? cohort.id);
        }
      }
    }

    // Reverse master fallback: the cohort points to a master subject and
    // we're viewing one of its children. Check if any cohort.subject_id
    // matches our subject's master_subject_id.
    const ownMasterId = subjectRow?.master_subject_id ?? null;
    if (ownMasterId !== null) {
      for (const cohort of cohorts) {
        if (cohort.subject_id === ownMasterId) {
          return idString(cohort.cohort_id ?? cohort.id);
        }
      }
    }

    // Legacy fallback: check master_subject_id for cohort subjects that point to this subject
    const cohortSubjectIds = cohorts
      .map((c) => c.subject_id)
      .filter((v): v is number => v !== null);

    if (cohortSubjectIds.length === 0) return null;

    const subjects = await this.prisma.subject.findMany({
      where: {
        id: { in: cohortSubjectIds },
        deleted_at: null,
      },
      select: { id: true, master_subject_id: true },
    });

    for (const cohort of cohorts) {
      if (cohort.subject_id === null) continue;
      const subjectRow = subjects.find((s) => s.id === cohort.subject_id);
      if (!subjectRow) continue;
      const effectiveId = subjectRow.master_subject_id ?? subjectRow.id;
      if (effectiveId === subjectIdInt) {
        return idString(cohort.cohort_id ?? cohort.id);
      }
    }

    return null;
  }

  async getSubjects(userId: string, courseId: string): Promise<Record<string, unknown>[]> {
    const subjectIds = await this.loadSubjectIdsForCourse(courseId);
    if (subjectIds.length === 0) return [];

    const rows = await this.prisma.subject.findMany({
      where: {
        id: { in: subjectIds },
        deleted_at: null,
      },
      select: {
        id: true,
        title: true,
        description: true,
        thumbnail: true,
      },
    });
    // Preserve pivot ordering (subjectIds is already ordered by position, then id).
    const subjectMap = new Map(rows.map((s) => [s.id, s]));
    const subjects = subjectIds
      .map((id) => subjectMap.get(id))
      .filter((s): s is NonNullable<typeof s> => s !== undefined);

    const subjectData: Record<string, unknown>[] = [];

    for (const subject of subjects) {
      const cohortId = await this.getCohortIdForSubject(userId, subject as unknown as Record<string, unknown>);
      const totalLessons = await this.prisma.lesson.count({
        where: {
          subject_id: subject.id,
          deleted_at: null,
        },
      });
      const progress = await this.calculateUserProgress(userId, courseId, String(subject.id));

      subjectData.push({
        id: subject.id,
        title: subject.title,
        description: subject.description ?? '',
        thumbnail: this.toFileUrl(subject.thumbnail),
        total_lessons: totalLessons,
        progress: Math.round(progress.progress),
        cohort_id: cohortId ?? 0,
        is_locked: cohortId === null,
      });
    }

    return subjectData;
  }

  private async buildLessonData(
    lesson: Record<string, unknown>,
    userId: string,
    purchaseStatus: 'on' | 'off',
    lessonIndex: number,
    courseId: string,
  ): Promise<Record<string, unknown>> {
    const lessonId = toStringValue(lesson.id);
    const lessonFiles = await this.getLessonFilesForLesson(lessonId);

    const lessonFileData: Record<string, unknown>[] = [];
    for (const lessonFile of lessonFiles) {
      lessonFileData.push(await this.buildLessonFileData(lessonFile as unknown as Record<string, unknown>, lessonId, userId, courseId));
    }

    // Also surface Content Library assets attached to this lesson (FK or legacy
    // tag) so library content reaches students. Supplementary: completion and
    // locking below stay driven by the real lesson_files count.
    const subjectTitle = await this.getSubjectTitleById(lesson.subject_id);
    const assetFiles = await this.getContentAssetFilesForLesson(
      lessonId,
      toStringValue(lesson.title),
      subjectTitle,
    );
    lessonFileData.push(...assetFiles);

    const totalLessonFiles = lessonFiles.length;
    const completedLessonFiles = await this.getCompletedFilesForLesson(lessonId, userId, courseId);
    const completedPercentage = totalLessonFiles > 0
      ? Math.round((completedLessonFiles / totalLessonFiles) * 100)
      : 0;

    const isCompleted = totalLessonFiles > 0
      ? completedLessonFiles >= totalLessonFiles
      : lessonIndex === 0;

    const videoCount = await this.prisma.lesson_files.count({
      where: {
        lesson_id: toIntId(lessonId),
        lesson_type: 'video',
        deleted_at: null,
      },
    });

    const lessonCourseId = toStringValue(lesson.course_id);

    // Ansaba UAT 2026-05-22 — Flutter Lesson model types id /
    // course_id / subject_id as int. Same reasoning as buildCourseData
    // and the sibling Video/Material builders.
    return {
      id: toNullableIntId(lessonId) ?? 0,
      title: toStringValue(lesson.title),
      course_id: toNullableIntId(lessonCourseId) ?? 0,
      subject_id: toNullableIntId(toStringValue(lesson.subject_id)) ?? 0,
      summary: toStringValue(lesson.summary),
      free: toStringValue(lesson.free) === 'on' ? 'on' : purchaseStatus,
      thumbnail: this.toFileUrl(lesson.thumbnail),
      video_count: videoCount,
      practice_link: `${this.appBaseUrl}/exam/practice_web_view/${userId}/${lessonCourseId}`,
      lesson_files_count: totalLessonFiles,
      completed_lesson_files: completedLessonFiles,
      completed_percentage: completedPercentage,
      lock: lessonIndex === 0 ? 0 : 1,
      lock_message: lessonIndex === 0 ? '' : 'Please complete the previous lesson',
      is_completed: isCompleted ? 1 : 0,
      lesson_files: lessonFileData,
    };
  }

  async getLessons(userId: string, subjectId: string): Promise<Record<string, unknown>[]> {
    const subject = await this.prisma.subject.findFirst({
      where: {
        id: toIntId(subjectId),
        deleted_at: null,
      },
      select: {
        id: true,
        course_id: true,
      },
    });

    if (!subject) {
      return [];
    }

    const courseId = idString(subject.course_id ?? '');

    const lessons = await this.prisma.lesson.findMany({
      where: {
        subject_id: toNullableIntId(subjectId),
        deleted_at: null,
      },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
    });

    const lessonsData: Record<string, unknown>[] = [];

    for (let index = 0; index < lessons.length; index += 1) {
      const lesson = lessons[index];
      if (!lesson) {
        continue;
      }

      const lessonCourseId = lesson.course_id !== null ? String(lesson.course_id) : courseId;
      const purchaseStatus = await this.getUserPurchaseStatus(userId, lessonCourseId);
      lessonsData.push(await this.buildLessonData(lesson as unknown as Record<string, unknown>, userId, purchaseStatus, index, courseId));
    }

    // Naji's release rule: if the student is enrolled in a cohort that
    // covers this subject, every lesson + every file in that subject is
    // unlocked. Otherwise we fall back to the legacy sequential gating.
    const cohortIdForSubject = await this.getCohortIdForSubject(userId, subject as unknown as Record<string, unknown>);
    const cohortUnlocks = cohortIdForSubject !== null;

    if (cohortUnlocks) {
      this.unlockAllLessons(lessonsData);
      return lessonsData;
    }

    this.applyLessonSequentialGating(lessonsData);
    return lessonsData;
  }

  // Bulk-unlock every lesson + file (Naji's cohort release rule).
  private unlockAllLessons(lessonsData: Record<string, unknown>[]): void {
    for (const lessonData of lessonsData) {
      lessonData.lock = 0;
      lessonData.lock_message = '';
      const files = Array.isArray(lessonData.lesson_files)
        ? (lessonData.lesson_files as Record<string, unknown>[])
        : [];
      for (const file of files) file.lock = 0;
    }
  }

  // Legacy sequential gating fallback: a lesson unlocks only once the previous
  // one is complete; within a lesson, files unlock in order. Shared by
  // getLessons (subject-wise) and getLessonsForCourse (lesson-wise).
  private applyLessonSequentialGating(lessonsData: Record<string, unknown>[]): void {
    let previousLessonCompleted = true;
    for (const lessonData of lessonsData) {
      if (toDbNumber(lessonData.is_completed) === 1) {
        previousLessonCompleted = true;
        continue;
      }

      lessonData.lock = previousLessonCompleted ? 0 : 1;
      lessonData.lock_message = previousLessonCompleted ? '' : 'Please complete the previous lesson';

      const files = Array.isArray(lessonData.lesson_files)
        ? (lessonData.lesson_files as Record<string, unknown>[])
        : [];

      if (toDbNumber(lessonData.lock) === 1) {
        for (const file of files) {
          file.lock = 1;
        }
        previousLessonCompleted = false;
        continue;
      }

      let previousFileCompleted = true;
      for (const file of files) {
        file.lock = previousFileCompleted ? 0 : 1;
        previousFileCompleted = toDbNumber(file.progress) === 100;
      }

      previousLessonCompleted = toDbNumber(lessonData.completed_percentage) === 100;
    }
  }

  // Lesson-wise courses (structure_type=2): lessons attach directly to the
  // course (subject_id NULL), so there is no subject layer. Mirrors getLessons
  // but keyed by course_id (Naji 2026-06-23).
  async getLessonsForCourse(userId: string, courseId: string): Promise<Record<string, unknown>[]> {
    const course = await this.prisma.course.findFirst({
      where: { id: toIntId(courseId), deleted_at: null },
      select: { id: true },
    });
    if (!course) {
      return [];
    }

    const lessons = await this.prisma.lesson.findMany({
      where: { course_id: toNullableIntId(courseId), subject_id: null, deleted_at: null },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
    });

    const lessonsData: Record<string, unknown>[] = [];
    for (let index = 0; index < lessons.length; index += 1) {
      const lesson = lessons[index];
      if (!lesson) {
        continue;
      }
      const purchaseStatus = await this.getUserPurchaseStatus(userId, courseId);
      lessonsData.push(
        await this.buildLessonData(lesson as unknown as Record<string, unknown>, userId, purchaseStatus, index, courseId),
      );
    }

    // No subject → cohort bulk-unlock (which is subject-keyed) doesn't apply;
    // use the sequential gating fallback.
    this.applyLessonSequentialGating(lessonsData);
    return lessonsData;
  }

  async getLessonIndex(userId: string, subjectId: string): Promise<Record<string, unknown>[]> {
    const lessons = await this.prisma.lesson.findMany({
      where: {
        subject_id: toNullableIntId(subjectId),
        deleted_at: null,
      },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
    });

    const lessonData: Record<string, unknown>[] = [];

    for (let index = 0; index < lessons.length; index += 1) {
      const lesson = lessons[index];
      if (!lesson) {
        continue;
      }

      const lessonCourseId = idString(lesson.course_id);
      const purchaseStatus = await this.getUserPurchaseStatus(userId, lessonCourseId);
      lessonData.push(
        await this.buildLessonData(
          lesson as unknown as Record<string, unknown>,
          userId,
          purchaseStatus,
          index,
          lessonCourseId,
        ),
      );
    }

    return lessonData;
  }

  async getLessonFileGroupedIndex(userId: string, lessonId: string): Promise<Record<string, unknown>[]> {
    const lesson = await this.prisma.lesson.findFirst({
      where: {
        id: toIntId(lessonId),
        deleted_at: null,
      },
      select: {
        id: true,
        course_id: true,
      },
    });

    if (!lesson) {
      return [];
    }

    const courseId = idString(lesson.course_id);
    const lessonFiles = await this.getLessonFilesForLesson(lessonId);
    // Student timeline (Naji 2026-05-04): articles, quizzes, audio etc.
    // are first-class lesson items — they should appear as siblings to
    // videos, not be hidden behind a video parent. Files WITH a
    // parent_file_id still nest under the parent video; files WITHOUT
    // one (orphan article / quiz / standalone audio) surface at the
    // top level.
    const videosById = new Map<string, Record<string, unknown>>();
    const topLevelNonVideos: Record<string, unknown>[] = [];
    const pendingRelatedFiles: Record<string, unknown>[] = [];
    const fileOrder: string[] = [];

    for (const lessonFile of lessonFiles) {
      const fileId = String(lessonFile.id);
      const attachmentType = normalizeAttachmentType((lessonFile.attachment_type ?? '').toLowerCase());
      const lessonType = toStringValue(lessonFile.lesson_type).toLowerCase();
      const isVideo = attachmentType === 'video' || lessonType === 'video';
      const parentFileId = toNullableString(lessonFile.parent_file_id);

      if (isVideo) {
        const fileData = await this.buildLessonFileData(lessonFile as unknown as Record<string, unknown>, lessonId, userId, courseId);
        fileData.sub_title = 'Video';
        fileData.related_files = [];
        videosById.set(fileId, fileData);
        fileOrder.push(`v:${fileId}`);
      } else if (parentFileId) {
        pendingRelatedFiles.push(lessonFile as unknown as Record<string, unknown>);
      } else {
        const fileData = await this.buildLessonFileData(lessonFile as unknown as Record<string, unknown>, lessonId, userId, courseId);
        fileData.sub_title = capitalize(attachmentType || lessonType || 'file');
        topLevelNonVideos.push(fileData);
        fileOrder.push(`n:${fileId}`);
      }
    }

    for (const relatedFile of pendingRelatedFiles) {
      const parentFileId = toNullableString(relatedFile.parent_file_id);
      if (!parentFileId) continue;
      const parentVideo = videosById.get(parentFileId);
      if (!parentVideo) continue;

      const relatedFileData = await this.buildLessonFileData(relatedFile, lessonId, userId, courseId);
      const attachmentType = toStringValue(relatedFile.attachment_type).toLowerCase();
      relatedFileData.sub_title = capitalize(attachmentType);

      const currentRelated = Array.isArray(parentVideo.related_files)
        ? (parentVideo.related_files as Record<string, unknown>[])
        : [];
      currentRelated.push(relatedFileData);
      parentVideo.related_files = currentRelated;
    }

    // Preserve original DB order across both buckets so the timeline
    // shows lesson items in the same sequence the admin authored them.
    const topLevelById = new Map(
      topLevelNonVideos.map((f) => [String(f.id), f]),
    );
    const ordered: Record<string, unknown>[] = [];
    for (const key of fileOrder) {
      const [kind, id] = key.split(':') as ['v' | 'n', string];
      const row = kind === 'v' ? videosById.get(id) : topLevelById.get(id);
      if (row) ordered.push(row);
    }
    return ordered;
  }

  private async buildLessonVideoData(video: Record<string, unknown>, userId: string): Promise<Record<string, unknown>> {
    const lessonId = toStringValue(video.lesson_id);

    const lesson = await this.prisma.lesson.findFirst({
      where: {
        id: toIntId(lessonId),
        deleted_at: null,
      },
      select: {
        id: true,
        course_id: true,
      },
    });

    if (!lesson) {
      return {};
    }

    const courseId = idString(lesson.course_id);
    const purchaseStatus = await this.getUserPurchaseStatus(userId, courseId);

    // lesson_files_report does not exist in MySQL schema — report upload
    // gating is disabled until that feature is rewired.
    const free = purchaseStatus;
    const lockMessage = '';

    const attachment = await this.prisma.lesson_files.findFirst({
      where: {
        lesson_id: toIntId(lessonId),
        attachment_type: 'pdf',
        deleted_at: null,
      },
      select: { attachment: true },
      orderBy: { id: 'asc' },
    });

    const currentVideoId = toStringValue(video.id);

    // Naji UAT 2026-05-22 follow-up — buildLessonVideoData still emitted
    // `id` and `lesson_id` as strings; Flutter LessonVideo model expects
    // both as int and crashes with "type 'String' is not a subtype of
    // type 'int' of 'index'" when it indexes by id. Match the int shape
    // used elsewhere in this file (buildLessonData / buildLessonFileData).
    return {
      id: toNullableIntId(currentVideoId) ?? 0,
      title: toStringValue(video.title),
      lesson_id: toNullableIntId(lessonId) ?? 0,
      description: toStringValue(video.summary),
      duration: toStringValue(video.duration),
      video_type: toStringValue(video.video_type),
      video_url: toStringValue(video.video_url),
      download_url: toStringValue(video.download_url),
      thumbnail: this.toFileUrl(video.thumbnail),
      lesson_type: toStringValue(video.lesson_type),
      attachment_type: toStringValue(video.attachment_type),
      free,
      attachment_url: this.toFileUrl(attachment?.attachment),
      vimeo_access_token: '',
      is_submitted: '0',
      report_file: '',
      file_type: '',
      lock_message: lockMessage,
    };
  }

  async getLessonVideos(userId: string, lessonId: string): Promise<Record<string, unknown>[]> {
    const videos = await this.prisma.lesson_files.findMany({
      where: {
        lesson_id: toIntId(lessonId),
        attachment_type: 'url',
        deleted_at: null,
      },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
    });

    const response: Record<string, unknown>[] = [];
    for (const video of videos) {
      response.push(await this.buildLessonVideoData(video as unknown as Record<string, unknown>, userId));
    }

    return response;
  }

  private async buildLessonMaterialData(material: Record<string, unknown>, userId: string): Promise<Record<string, unknown>> {
    const lessonId = toStringValue(material.lesson_id);

    const lesson = await this.prisma.lesson.findFirst({
      where: {
        id: toIntId(lessonId),
        deleted_at: null,
      },
      select: { course_id: true },
    });

    const courseId = idString(lesson?.course_id);
    const purchaseStatus = courseId ? await this.getUserPurchaseStatus(userId, courseId) : 'off';

    // Naji UAT 2026-05-22 follow-up — same int-id fix for the material
    // builder so /lesson_file/index and friends do not crash the Flutter
    // mobile client.
    return {
      id: toNullableIntId(toStringValue(material.id)) ?? 0,
      title: toStringValue(material.title),
      lesson_id: toNullableIntId(lessonId) ?? 0,
      attachment: this.toFileUrl(material.attachment),
      thumbnail: this.toFileUrl(material.thumbnail),
      lesson_type: toStringValue(material.lesson_type),
      attachment_type: toStringValue(material.attachment_type),
      free: toStringValue(material.free) === 'on' ? 'on' : purchaseStatus,
    };
  }

  async getLessonMaterials(userId: string, filter: LessonMaterialFilter): Promise<Record<string, unknown>[]> {
    const lessonId = filter.lessonId ?? '';
    const subjectId = filter.subjectId ?? '';
    const courseId = filter.courseId ?? '';

    let lessonIds: number[] = [];
    if (lessonId !== '') {
      lessonIds = [toIntId(lessonId)];
    } else if (subjectId !== '') {
      lessonIds = await this.getSubjectLessonIds(subjectId);
    } else if (courseId !== '') {
      lessonIds = await this.getCourseLessonIds(courseId);
    }

    if (lessonIds.length === 0) {
      return [];
    }

    const materials = await this.prisma.lesson_files.findMany({
      where: {
        lesson_id: { in: lessonIds },
        attachment_type: 'pdf',
        deleted_at: null,
      },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
    });

    const materialData: Record<string, unknown>[] = [];
    for (const material of materials) {
      materialData.push(await this.buildLessonMaterialData(material as unknown as Record<string, unknown>, userId));
    }

    return materialData;
  }

  private async resolveCourseIdForLessonFile(lessonFileId: string): Promise<string | null> {
    const lessonFile = await this.prisma.lesson_files.findFirst({
      where: {
        id: toIntId(lessonFileId),
        deleted_at: null,
      },
      select: { lesson_id: true },
    });

    if (!lessonFile) {
      return null;
    }

    const lesson = await this.prisma.lesson.findFirst({
      where: {
        id: lessonFile.lesson_id,
        deleted_at: null,
      },
      select: { course_id: true },
    });

    return lesson?.course_id !== null && lesson?.course_id !== undefined ? String(lesson.course_id) : null;
  }

  // The student's most recently watched lesson file (powers "Resume Learning"
  // and deep-linking straight into the last video they were on). Optionally
  // scoped to one course. Returns null when there is no saved progress.
  async getLastWatchedLessonFile(
    userId: string,
    courseId?: string,
  ): Promise<{ courseId: string; lessonFileId: string; lessonId: string; title: string } | null> {
    const userIdInt = toNullableIntId(userId);
    if (userIdInt === null) return null;
    const courseIdInt = courseId ? toNullableIntId(courseId) : null;

    const row = await this.prisma.video_progress_status.findFirst({
      where: {
        user_id: userIdInt,
        deleted_at: null,
        lesson_file_id: { not: null },
        // We need a course to deep-link into; skip legacy null-course rows.
        course_id: courseIdInt !== null ? courseIdInt : { not: null },
      },
      // updated_at can be NULL on older create-only rows, so fall back to
      // created_at / id to pick the genuinely most-recent activity.
      orderBy: [{ updated_at: 'desc' }, { created_at: 'desc' }, { id: 'desc' }],
      select: { course_id: true, lesson_file_id: true },
    });
    if (!row || row.lesson_file_id === null) return null;

    const file = await this.prisma.lesson_files.findUnique({
      where: { id: row.lesson_file_id },
      select: { lesson_id: true, title: true },
    });

    return {
      courseId: row.course_id !== null ? String(row.course_id) : courseId ?? '',
      lessonFileId: String(row.lesson_file_id),
      lessonId: file?.lesson_id !== null && file?.lesson_id !== undefined ? String(file.lesson_id) : '',
      title: file?.title ?? '',
    };
  }

  async saveVideoProgress(userId: string, input: SaveVideoProgressInput): Promise<void> {
    const lessonFileId = input.lessonFileId;
    if (!lessonFileId) {
      return;
    }

    let courseId = input.courseId ?? '';
    if (!courseId) {
      const resolvedCourseId = await this.resolveCourseIdForLessonFile(lessonFileId);
      courseId = resolvedCourseId ?? '';
    }

    if (!courseId) {
      return;
    }

    const now = new Date();
    const userIdInt = toNullableIntId(userId);
    const courseIdInt = toNullableIntId(courseId);
    const lessonFileIdInt = toNullableIntId(lessonFileId);

    const existingProgress = await this.prisma.video_progress_status.findFirst({
      where: {
        user_id: userIdInt,
        lesson_file_id: lessonFileIdInt,
        course_id: courseIdInt,
        deleted_at: null,
      },
      select: {
        id: true,
        user_progress: true,
      },
      orderBy: { id: 'desc' },
    });

    const requestedProgressSeconds = parseTimeToSeconds(input.userProgress);
    const totalDurationSeconds = parseTimeToSeconds(input.lessonDuration);
    const graceSeconds = 5;
    const completed = requestedProgressSeconds + graceSeconds >= totalDurationSeconds;

    if (existingProgress) {
      const existingProgressSeconds = parseTimeToSeconds(timeColumnToString(existingProgress.user_progress));
      if (requestedProgressSeconds + graceSeconds > existingProgressSeconds) {
        await this.prisma.video_progress_status.update({
          where: { id: existingProgress.id },
          data: {
            total_duration: timeStringToDate(input.lessonDuration),
            user_progress: timeStringToDate(input.userProgress),
            status: completed ? 1 : 0,
            updated_by: toNullableIntId(userId),
            updated_at: now,
          },
        });
      }

      return;
    }

    await this.prisma.video_progress_status.create({
      data: {
        user_id: userIdInt,
        course_id: courseIdInt,
        lesson_file_id: lessonFileIdInt,
        total_duration: timeStringToDate(input.lessonDuration),
        user_progress: timeStringToDate(input.userProgress),
        status: completed ? 1 : 0,
        created_by: toNullableIntId(userId),
        created_at: now,
        // Set updated_at on create too so "last watched" ordering is reliable
        // (otherwise create-only rows have NULL updated_at and sort wrong).
        updated_at: now,
      },
    });
  }

  async saveMaterialProgress(_userId: string, _input: SaveMaterialProgressInput): Promise<void> {
    // material_progress table does not exist in MySQL schema — no-op
    // until a replacement store is wired. Kept for API/route compatibility.
  }

  async getStreakData(userId: string, fromDate?: string, toDate?: string): Promise<Record<string, number> | null> {
    const user = await this.getUserById(userId);
    if (!user) {
      return null;
    }

    const courseId = user.course_id;
    if (!courseId) {
      return {
        total_streak: 0,
        current_streak: 0,
      };
    }

    const lessonIds = await this.getCourseLessonIds(String(courseId));
    if (lessonIds.length === 0) {
      return {
        total_streak: 0,
        current_streak: 0,
      };
    }

    const lessonVideoRows = await this.prisma.lesson_files.findMany({
      where: {
        lesson_id: { in: lessonIds },
        attachment_type: 'url',
        deleted_at: null,
      },
      select: { id: true },
    });

    const lessonVideoIds = lessonVideoRows.map((row) => row.id);

    if (lessonVideoIds.length === 0) {
      return {
        total_streak: 0,
        current_streak: 0,
      };
    }

    const from = toDateStringOrFallback(fromDate, DATE_FLOOR);
    const to = toDateStringOrFallback(toDate, DATE_FLOOR);
    const fromDateObj = new Date(from);
    const toDateObj = new Date(`${to}T23:59:59.999Z`);
    const todayStart = new Date(new Date().toISOString().slice(0, 10));
    const todayEnd = new Date(`${new Date().toISOString().slice(0, 10)}T23:59:59.999Z`);

    // Total streak: completed videos within the date range
    const totalStreakRows = await this.prisma.video_progress_status.findMany({
      where: {
        lesson_file_id: { in: lessonVideoIds },
        status: 1,
        deleted_at: null,
        OR: [
          {
            created_at: {
              gte: fromDateObj,
              lte: toDateObj,
            },
          },
          {
            updated_at: {
              gte: fromDateObj,
              lte: toDateObj,
            },
          },
        ],
      },
      select: { id: true },
    });
    const totalStreakCount = totalStreakRows.length;

    // Current streak: completed videos today
    const currentStreakRows = await this.prisma.video_progress_status.findMany({
      where: {
        lesson_file_id: { in: lessonVideoIds },
        status: 1,
        deleted_at: null,
        OR: [
          {
            created_at: {
              gte: todayStart,
              lte: todayEnd,
            },
          },
          {
            updated_at: {
              gte: todayStart,
              lte: todayEnd,
            },
          },
        ],
      },
      select: { id: true },
    });
    const currentStreakCount = currentStreakRows.length;

    return {
      total_streak: totalStreakCount * 10,
      current_streak: currentStreakCount * 10,
    };
  }

  // ── Admin Course CRUD ─────────────────────────────────────────────

  async listCoursesAdmin(): Promise<Record<string, unknown>[]> {
    const courses = await this.prisma.course.findMany({
      where: { deleted_at: null },
      orderBy: { created_at: 'desc' },
    });

    const courseIds = courses.map((c) => c.id);

    // Batch counts: subjects per course (via direct subject.course_id)
    const subjectCounts = courseIds.length > 0
      ? await this.prisma.subject.groupBy({
          by: ['course_id'],
          where: { course_id: { in: courseIds }, deleted_at: null },
          _count: { id: true },
        })
      : [];
    const subjectCountMap = new Map(
      subjectCounts.map((s) => [s.course_id, s._count?.id ?? 0] as const),
    );

    // Batch counts: enrolled students per course
    const enrolCounts = courseIds.length > 0
      ? await this.prisma.enrol.groupBy({
          by: ['course_id'],
          where: { course_id: { in: courseIds }, deleted_at: null },
          _count: { id: true },
        })
      : [];
    const enrolCountMap = new Map(
      enrolCounts.map((e) => [e.course_id, e._count?.id ?? 0] as const),
    );

    // Batch fetch categories
    const categoryIds = [...new Set(courses.map((c) => c.category_id).filter((v): v is number => v !== null))];
    const categories = categoryIds.length > 0
      ? await this.prisma.category.findMany({ where: { id: { in: categoryIds } }, select: { id: true, name: true } })
      : [];
    const categoryMap = new Map(categories.map((c) => [c.id, c.name ?? '']));

    return courses.map((course) => ({
      id: course.id,
      title: course.title,
      course_code: course.course_code ?? '',
      short_name: course.short_name ?? '',
      category_id: course.category_id ?? '',
      category_name: course.category_id !== null ? (categoryMap.get(course.category_id) ?? '') : '',
      status: course.status ?? 'active',
      price: course.price ?? 0,
      sale_price: course.sale_price ?? 0,
      duration: course.duration ?? '',
      level: course.level ?? '',
      version: course.version ?? '',
      total_learning_hours: course.total_learning_hours ?? null,
      language: course.language ?? '',
      is_free_course: course.is_free_course,
      thumbnail: this.toFileUrl(course.thumbnail),
      subject_count: subjectCountMap.get(course.id) ?? 0,
      enrolled_students: enrolCountMap.get(course.id) ?? 0,
      visibility: course.visibility ?? 'public',
      created_at: course.created_at?.toISOString() ?? '',
    }));
  }

  async getCourseAdmin(courseId: string): Promise<Record<string, unknown> | null> {
    const course = await this.prisma.course.findFirst({
      where: { id: toIntId(courseId), deleted_at: null },
    });

    if (!course) {
      return null;
    }

    return {
      id: course.id,
      title: course.title,
      course_code: course.course_code ?? '',
      short_name: course.short_name ?? '',
      label: course.label ?? '',
      category_id: course.category_id ?? '',
      status: course.status ?? 'active',
      price: course.price ?? 0,
      sale_price: course.sale_price ?? 0,
      total_amount: course.total_amount ?? 0,
      description: course.description ?? '',
      duration: course.duration ?? '',
      level: course.level ?? '',
      version: course.version ?? '',
      total_learning_hours: course.total_learning_hours ?? null,
      outcomes: course.outcomes ?? '',
      requirements: course.requirements ?? '',
      language: course.language ?? '',
      thumbnail: this.toFileUrl(course.thumbnail),
      course_icon: this.toFileUrl(course.course_icon),
      features: course.features ?? '',
      tags: this.parseCourseTags(course.meta_keywords),
      is_free_course: course.is_free_course,
      visibility: course.visibility ?? 'public',
      structure_type: course.structure_type ?? 1,
    };
  }

  // Marketing tags are stored as a JSON array in the legacy `meta_keywords`
  // column; tolerate a plain comma-separated string too (Naji 2026-06-08).
  private parseCourseTags(raw: unknown): string[] {
    const s = typeof raw === 'string' ? raw.trim() : '';
    if (!s) return [];
    try {
      const arr: unknown = JSON.parse(s);
      if (Array.isArray(arr)) return arr.map((t) => String(t).trim()).filter((t) => t !== '');
    } catch {
      return s.split(',').map((t) => t.trim()).filter((t) => t !== '');
    }
    return [];
  }

  async createCourse(actorUserId: string, input: AdminCourseInput): Promise<Record<string, unknown>> {
    const visibilityInt = toNullableIntId(input.visibility);
    const course = await this.prisma.course.create({
      data: {
        title: input.title,
        course_code: toNullableString(input.course_code),
        short_name: toNullableString(input.short_name),
        category_id: toNullableIntId(input.category_id),
        description: toNullableString(input.description),
        duration: toNullableString(input.duration),
        level: toNullableString(input.level),
        version: toNullableString(input.version),
        total_learning_hours: input.total_learning_hours ?? null,
        outcomes: toNullableString(input.outcomes),
        requirements: toNullableString(input.requirements),
        language: toNullableString(input.language),
        thumbnail: toNullableString(input.thumbnail),
        is_free_course: input.is_free_course ? 1 : 0,
        price: input.price ?? null,
        sale_price: input.sale_price ?? null,
        features: toNullableString(input.features),
        // Marketing tags → JSON in meta_keywords (unused legacy SEO column).
        meta_keywords: input.tags && input.tags.length > 0 ? JSON.stringify(input.tags) : null,
        label: toNullableString(input.label),
        status: input.status ?? 'active',
        visibility: visibilityInt,
        structure_type: input.structure_type === 2 ? 2 : 1,
        created_by: toNullableIntId(actorUserId),
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });

    return { id: course.id };
  }

  async updateCourse(actorUserId: string, courseId: string, input: AdminCourseInput): Promise<Record<string, unknown>> {
    const visibilityInt = toNullableIntId(input.visibility);
    await this.prisma.course.update({
      where: { id: toIntId(courseId) },
      data: {
        title: input.title,
        course_code: toNullableString(input.course_code),
        short_name: toNullableString(input.short_name),
        category_id: toNullableIntId(input.category_id),
        description: toNullableString(input.description),
        duration: toNullableString(input.duration),
        level: toNullableString(input.level),
        version: toNullableString(input.version),
        total_learning_hours: input.total_learning_hours ?? null,
        outcomes: toNullableString(input.outcomes),
        requirements: toNullableString(input.requirements),
        language: toNullableString(input.language),
        thumbnail: toNullableString(input.thumbnail),
        is_free_course: input.is_free_course ? 1 : 0,
        price: input.price ?? null,
        sale_price: input.sale_price ?? null,
        features: toNullableString(input.features),
        // Marketing tags → JSON in meta_keywords (unused legacy SEO column).
        meta_keywords: input.tags && input.tags.length > 0 ? JSON.stringify(input.tags) : null,
        label: toNullableString(input.label),
        status: input.status ?? 'active',
        visibility: visibilityInt,
        // Only touch structure_type when explicitly provided, so other callers
        // don't accidentally reset a Lesson-wise course to Subject-wise.
        ...(input.structure_type !== undefined ? { structure_type: input.structure_type === 2 ? 2 : 1 } : {}),
        updated_by: toNullableIntId(actorUserId),
        updated_at: new Date(),
      },
    });

    return { id: courseId };
  }

  async archiveCourse(actorUserId: string, courseId: string): Promise<void> {
    await this.prisma.course.update({
      where: { id: toIntId(courseId) },
      data: {
        status: 'archived',
        updated_by: toNullableIntId(actorUserId),
        updated_at: new Date(),
      },
    });
  }

  // ── Admin Subject CRUD ────────────────────────────────────────────

  async listCourseSubjectsAdmin(courseId: string): Promise<Record<string, unknown>[]> {
    const subjectIds = await this.loadSubjectIdsForCourse(courseId);
    if (subjectIds.length === 0) return [];

    const subjectRows = await this.prisma.subject.findMany({
      where: { id: { in: subjectIds }, deleted_at: null },
    });
    // Preserve pivot ordering.
    const subjectMap = new Map(subjectRows.map((s) => [s.id, s]));
    const subjects = subjectIds
      .map((id) => subjectMap.get(id))
      .filter((s): s is NonNullable<typeof s> => s !== undefined);

    const lessonCounts = await this.prisma.lesson.groupBy({
      by: ['subject_id'],
      where: { subject_id: { in: subjectIds }, deleted_at: null },
      _count: { id: true },
    });
    const lessonCountMap = new Map(
      lessonCounts.map((l) => [l.subject_id, l._count?.id ?? 0] as const),
    );

    // Count how many courses each subject is currently linked to via the
    // pivot, so the per-row "Remove" confirmation in the admin UI can say
    // "this is also linked to N other courses" instead of always
    // "permanently delete" (which was misleading after the M:N migration).
    const courseLinkCounts = await this.prisma.course_subject.groupBy({
      by: ['subject_id'],
      where: { subject_id: { in: subjectIds }, deleted_at: null },
      _count: { course_id: true },
    });
    const courseCountMap = new Map(
      courseLinkCounts.map((c) => [c.subject_id, c._count?.course_id ?? 0] as const),
    );

    return subjects.map((s) => ({
      id: s.id,
      title: s.title,
      subject_code: s.subject_code ?? '',
      short_name: s.short_name ?? '',
      subject_type: s.subject_type ?? '',
      duration_hours: s.duration_hours ?? null,
      version: s.version ?? '',
      description: s.description ?? '',
      learning_outcomes: s.learning_outcomes ?? '',
      skills_covered: s.skills_covered ?? '',
      assignment_max_marks: s.assignment_max_marks ?? null,
      assignment_pass_marks: s.assignment_pass_marks ?? null,
      examination_max_marks: s.examination_max_marks ?? null,
      examination_pass_marks: s.examination_pass_marks ?? null,
      project_max_marks: s.project_max_marks ?? null,
      project_pass_marks: s.project_pass_marks ?? null,
      viva_max_marks: s.viva_max_marks ?? null,
      viva_pass_marks: s.viva_pass_marks ?? null,
      status: s.status ?? 'draft',
      thumbnail: this.toFileUrl(s.thumbnail),
      order: s.order ?? 0,
      lesson_count: lessonCountMap.get(s.id) ?? 0,
      total_lessons: lessonCountMap.get(s.id) ?? 0, // QA spec alias
      course_count: courseCountMap.get(s.id) ?? 1,
    }));
  }

  async listAllSubjects(): Promise<Record<string, unknown>[]> {
    const subjects = await this.prisma.subject.findMany({
      where: { deleted_at: null },
      orderBy: { title: 'asc' },
    });

    if (subjects.length === 0) return [];

    const subjectIds = subjects.map((s) => s.id);
    const links = await this.prisma.course_subject.findMany({
      where: { subject_id: { in: subjectIds }, deleted_at: null },
      select: { course_id: true, subject_id: true, position: true },
    });

    const courseIds = [...new Set(links.map((l: { course_id: number }) => l.course_id))];
    const courses = courseIds.length
      ? await this.prisma.course.findMany({
          where: { id: { in: courseIds } },
          select: { id: true, title: true, deleted_at: true },
        })
      : [];
    const courseMap = new Map(courses.map((c) => [c.id, c]));

    // Group active courses by subject_id.
    const linksBySubject = new Map<number, Array<{ id: number; title: string }>>();
    for (const link of links) {
      const course = courseMap.get(link.course_id);
      if (!course || course.deleted_at !== null) continue;
      const list = linksBySubject.get(link.subject_id) ?? [];
      list.push({ id: course.id, title: course.title ?? '' });
      linksBySubject.set(link.subject_id, list);
    }

    // Naji UAT 2026-05-22 — previously we filtered out any subject that
    // wasn't linked to at least one course. That hid freshly-created
    // subjects (created via Admin > Subjects without picking a course)
    // even though the create succeeded — "Foundations of AI" and
    // "Generative AI for Lesson Design" both ghosted this way. Surface
    // every live subject; the courses column shows "—" until the admin
    // links them via Course > Add Subject.
    return subjects
      .map((s) => {
        const linked = linksBySubject.get(s.id) ?? [];
        const primary = linked[0];
        return {
          id: s.id,
          title: s.title,
          subject_code: s.subject_code,
          short_name: s.short_name,
          subject_type: s.subject_type,
          duration_hours: s.duration_hours,
          version: s.version,
          description: s.description ?? '',
          learning_outcomes: s.learning_outcomes,
          skills_covered: s.skills_covered,
          assignment_max_marks: s.assignment_max_marks,
          assignment_pass_marks: s.assignment_pass_marks,
          examination_max_marks: s.examination_max_marks,
          examination_pass_marks: s.examination_pass_marks,
          project_max_marks: s.project_max_marks,
          project_pass_marks: s.project_pass_marks,
          viva_max_marks: s.viva_max_marks,
          viva_pass_marks: s.viva_pass_marks,
          status: s.status,
          course_id: primary?.id ?? null,
          course_title: primary?.title ?? null,
          courses: linked,
          course_count: linked.length,
        };
      });
  }

  async addSubjectAdmin(actorUserId: string, input: AdminSubjectInput): Promise<Record<string, unknown>> {
    const courseIdInt = toIntId(input.course_id);

    // Reject duplicate titles (case-insensitive, ignoring leading/trailing
    // whitespace). Subjects are globally unique by title — if a subject
    // already exists, the admin should "Link existing" instead of creating
    // a clone. The error includes the existing id so the UI can offer that.
    const trimmedTitle = input.title.trim();
    if (trimmedTitle) {
      const existing = await this.prisma.subject.findFirst({
        where: {
          deleted_at: null,
          title: { equals: trimmedTitle },
        },
        select: { id: true, title: true },
      });
      if (existing) {
        const err = new Error(
          `A subject titled "${existing.title}" already exists. Use "Link Existing Subject" to add it to this course instead.`,
        ) as Error & { existingSubjectId?: number };
        err.existingSubjectId = existing.id;
        throw err;
      }
    }

    const maxOrder = await this.prisma.subject.aggregate({
      where: { course_id: courseIdInt, deleted_at: null },
      _max: { order: true },
    });
    const nextOrder = (maxOrder._max?.order ?? 0) + 1;

    const subject = await this.prisma.subject.create({
      data: {
        course_id: courseIdInt,
        title: input.title,
        subject_code: toNullableString(input.subject_code),
        short_name: toNullableString(input.short_name),
        subject_type: toNullableString(input.subject_type),
        duration_hours: input.duration_hours ?? null,
        version: toNullableString(input.version),
        description: toNullableString(input.description),
        learning_outcomes: toNullableString(input.learning_outcomes),
        skills_covered: toNullableString(input.skills_covered),
        assignment_max_marks: input.assignment_max_marks ?? null,
        assignment_pass_marks: input.assignment_pass_marks ?? null,
        examination_max_marks: input.examination_max_marks ?? null,
        examination_pass_marks: input.examination_pass_marks ?? null,
        project_max_marks: input.project_max_marks ?? null,
        project_pass_marks: input.project_pass_marks ?? null,
        viva_max_marks: input.viva_max_marks ?? null,
        viva_pass_marks: input.viva_pass_marks ?? null,
        status: input.status ?? 'draft',
        order: nextOrder,
        free: 'off',
        created_by: toNullableIntId(actorUserId),
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });

    // Mirror into the course_subject pivot so reads through the M:N
    // model see the new subject immediately. Naji UAT 2026-05-22 —
    // skip the pivot write when no course was supplied (courseIdInt=0
    // because the admin Subjects page doesn't require a course). The
    // standalone subject row is still created; admin links it to a
    // course separately via Course > Add Subject.
    if (courseIdInt > 0) {
    await this.prisma.course_subject.upsert({
      where: { course_id_subject_id: { course_id: courseIdInt, subject_id: subject.id } },
      create: {
        course_id: courseIdInt,
        subject_id: subject.id,
        position: nextOrder,
        created_by: toNullableIntId(actorUserId),
        created_at: new Date(),
      },
      update: {
        position: nextOrder,
        deleted_at: null,
        updated_by: toNullableIntId(actorUserId),
        updated_at: new Date(),
      },
    });
    }

    return { id: subject.id };
  }

  /** Link an existing subject to a course. Writes the link to the
   * course_subject pivot (M:N), and keeps subject.course_id in sync as a
   * denormalised "primary owner" pointer for any callers still reading it. */
  async linkSubjectToCourse(actorUserId: string, courseId: string, subjectId: string): Promise<Record<string, unknown>> {
    const courseIdInt = toIntId(courseId);
    const subjectIdInt = toIntId(subjectId);

    // Use the next position within the target course.
    const maxPos = await this.prisma.course_subject.aggregate({
      where: { course_id: courseIdInt, deleted_at: null },
      _max: { position: true },
    });
    const nextPos = (maxPos._max?.position ?? 0) + 1;

    await this.prisma.course_subject.upsert({
      where: { course_id_subject_id: { course_id: courseIdInt, subject_id: subjectIdInt } },
      create: {
        course_id: courseIdInt,
        subject_id: subjectIdInt,
        position: nextPos,
        created_by: toNullableIntId(actorUserId),
        created_at: new Date(),
      },
      update: {
        deleted_at: null,
        position: nextPos,
        updated_by: toNullableIntId(actorUserId),
        updated_at: new Date(),
      },
    });

    // Dual-write subject.course_id only when it's currently null/unset, to
    // avoid stomping a primary owner that other links depend on.
    const current = await this.prisma.subject.findUnique({
      where: { id: subjectIdInt },
      select: { course_id: true },
    });
    if (current && (current.course_id === null || current.course_id === undefined)) {
      await this.prisma.subject.update({
        where: { id: subjectIdInt },
        data: {
          course_id: courseIdInt,
          updated_by: toNullableIntId(actorUserId),
          updated_at: new Date(),
        },
      });
    }

    return { id: subjectId };
  }

  /** Unlink a subject from a course. Soft-deletes the pivot row; clears
   * subject.course_id only if that was its primary-owner course (so other
   * pivot links to the same subject remain intact). */
  async unlinkSubjectFromCourse(actorUserId: string, courseId: string, subjectId: string): Promise<void> {
    const courseIdInt = toIntId(courseId);
    const subjectIdInt = toIntId(subjectId);

    await this.prisma.course_subject.update({
      where: { course_id_subject_id: { course_id: courseIdInt, subject_id: subjectIdInt } },
      data: {
        deleted_at: new Date(),
        updated_by: toNullableIntId(actorUserId),
        updated_at: new Date(),
      },
    });

    const current = await this.prisma.subject.findUnique({
      where: { id: subjectIdInt },
      select: { course_id: true },
    });
    if (current && current.course_id === courseIdInt) {
      // Repoint to any remaining linked course, else clear.
      const remaining = await this.prisma.course_subject.findFirst({
        where: { subject_id: subjectIdInt, deleted_at: null },
        orderBy: { position: 'asc' },
        select: { course_id: true },
      });
      await this.prisma.subject.update({
        where: { id: subjectIdInt },
        data: {
          course_id: remaining?.course_id ?? null,
          updated_by: toNullableIntId(actorUserId),
          updated_at: new Date(),
        },
      });
    }
  }

  async editSubjectAdmin(actorUserId: string, subjectId: string, input: AdminSubjectInput): Promise<void> {
    const subjectIdInt = toIntId(subjectId);

    // Prevent renaming a subject to a title another active subject already
    // uses (case-insensitive, trimmed). Same intent as addSubjectAdmin's
    // uniqueness check.
    const trimmedTitle = input.title.trim();
    if (trimmedTitle) {
      const collision = await this.prisma.subject.findFirst({
        where: {
          deleted_at: null,
          id: { not: subjectIdInt },
          title: { equals: trimmedTitle },
        },
        select: { id: true, title: true },
      });
      if (collision) {
        throw new Error(
          `Another subject is already titled "${collision.title}". Pick a different name or merge the two manually.`,
        );
      }
    }

    await this.prisma.subject.update({
      where: { id: subjectIdInt },
      data: {
        title: input.title,
        subject_code: toNullableString(input.subject_code),
        short_name: toNullableString(input.short_name),
        subject_type: toNullableString(input.subject_type),
        duration_hours: input.duration_hours ?? null,
        version: toNullableString(input.version),
        description: toNullableString(input.description),
        learning_outcomes: toNullableString(input.learning_outcomes),
        skills_covered: toNullableString(input.skills_covered),
        assignment_max_marks: input.assignment_max_marks ?? null,
        assignment_pass_marks: input.assignment_pass_marks ?? null,
        examination_max_marks: input.examination_max_marks ?? null,
        examination_pass_marks: input.examination_pass_marks ?? null,
        project_max_marks: input.project_max_marks ?? null,
        project_pass_marks: input.project_pass_marks ?? null,
        viva_max_marks: input.viva_max_marks ?? null,
        viva_pass_marks: input.viva_pass_marks ?? null,
        ...(input.status ? { status: input.status } : {}),
        ...(input.order != null ? { order: input.order } : {}),
        updated_by: toNullableIntId(actorUserId),
        updated_at: new Date(),
      },
    });
  }

  async deleteSubjectAdmin(actorUserId: string, subjectId: string, courseId?: string): Promise<void> {
    const subjectIdInt = toIntId(subjectId);
    const now = new Date();

    // When invoked from a per-course Subjects page, courseId is supplied —
    // we only unlink that specific course/subject pivot. If the subject is
    // still linked to other active courses we leave its global record
    // alone (Naji 2026-04-30: removing a subject from one course must not
    // delete it from the others). Only when no other links remain do we
    // soft-delete the subject row.
    const courseIdInt = courseId ? toNullableIntId(courseId) : null;

    if (courseIdInt !== null) {
      await this.prisma.course_subject.updateMany({
        where: {
          course_id: courseIdInt,
          subject_id: subjectIdInt,
          deleted_at: null,
        },
        data: {
          deleted_at: now,
          updated_by: toNullableIntId(actorUserId),
          updated_at: now,
        },
      });

      const remainingLinks = await this.prisma.course_subject.count({
        where: { subject_id: subjectIdInt, deleted_at: null },
      });

      // Keep subject.course_id in sync with the remaining canonical owner
      // so callers that still read the legacy column see something valid.
      const remaining = remainingLinks > 0
        ? await this.prisma.course_subject.findFirst({
            where: { subject_id: subjectIdInt, deleted_at: null },
            orderBy: { position: 'asc' },
            select: { course_id: true },
          })
        : null;

      await this.prisma.subject.update({
        where: { id: subjectIdInt },
        data: {
          course_id: remaining?.course_id ?? null,
          updated_by: toNullableIntId(actorUserId),
          updated_at: now,
          ...(remainingLinks === 0 ? { deleted_by: toNullableIntId(actorUserId), deleted_at: now } : {}),
        },
      });
      return;
    }

    // No courseId supplied (global delete from the standalone Subjects
    // page): soft-delete the subject and all its pivot rows.
    await this.prisma.$transaction([
      this.prisma.course_subject.updateMany({
        where: { subject_id: subjectIdInt, deleted_at: null },
        data: { deleted_at: now, updated_by: toNullableIntId(actorUserId), updated_at: now },
      }),
      this.prisma.subject.update({
        where: { id: subjectIdInt },
        data: {
          deleted_by: toNullableIntId(actorUserId),
          deleted_at: now,
        },
      }),
    ]);
  }

  // ── Admin Lesson CRUD ─────────────────────────────────────────────

  /** Flat list of every active lesson with course + subject + file-count
   * denormalised for the new Lessons table view (Naji 2026-04-30 — wants
   * the Lessons section to look like Subjects + Content Library, not the
   * step-by-step builder). Filters out lessons whose parent subject or
   * parent course has been soft-deleted. */
  async listAllLessonsAdmin(): Promise<Record<string, unknown>[]> {
    const lessons = await this.prisma.lesson.findMany({
      where: { deleted_at: null },
      orderBy: [{ updated_at: 'desc' }, { id: 'desc' }],
    });
    if (lessons.length === 0) return [];

    const subjectIds = [
      ...new Set(lessons.map((l) => l.subject_id).filter((id): id is number => id !== null && id !== undefined)),
    ];
    const lessonIds = lessons.map((l) => l.id);

    // Pull every active course_subject pivot row for the lessons' parent
    // subjects in one go. After the M:N migration a single subject is
    // linked to multiple courses, so the same lesson effectively appears
    // in every linked course (Naji 2026-04-30 — wants this to be visible
    // in the Lessons list).
    const [subjects, pivotRows, fileCounts] = await Promise.all([
      subjectIds.length
        ? this.prisma.subject.findMany({
            where: { id: { in: subjectIds } },
            select: { id: true, title: true, deleted_at: true },
          })
        : Promise.resolve([] as Array<{ id: number; title: string | null; deleted_at: Date | null }>),
      subjectIds.length
        ? this.prisma.course_subject.findMany({
            where: { subject_id: { in: subjectIds }, deleted_at: null },
            select: { subject_id: true, course_id: true, position: true },
          })
        : Promise.resolve([] as Array<{ subject_id: number; course_id: number; position: number | null }>),
      this.prisma.lesson_files.groupBy({
        by: ['lesson_id'],
        where: { lesson_id: { in: lessonIds }, deleted_at: null },
        _count: { id: true },
      }),
    ]);

    const allCourseIds = [...new Set(pivotRows.map((p) => p.course_id))];
    const courses = allCourseIds.length
      ? await this.prisma.course.findMany({
          where: { id: { in: allCourseIds } },
          select: { id: true, title: true, deleted_at: true },
        })
      : [];

    const subjectMap = new Map(subjects.map((s) => [s.id, s]));
    const courseMap = new Map(courses.map((c) => [c.id, c]));
    const fileCountMap = new Map(
      fileCounts.map((f) => [f.lesson_id, f._count?.id ?? 0] as const),
    );

    // Group every active course (pivot → course) by subject_id, skipping
    // courses that are themselves soft-deleted.
    const coursesBySubject = new Map<number, Array<{ id: number; title: string }>>();
    for (const p of pivotRows) {
      const c = courseMap.get(p.course_id);
      if (!c || c.deleted_at !== null) continue;
      const list = coursesBySubject.get(p.subject_id) ?? [];
      list.push({ id: c.id, title: c.title ?? '' });
      coursesBySubject.set(p.subject_id, list);
    }

    return lessons
      .filter((l) => {
        const sub = l.subject_id !== null && l.subject_id !== undefined ? subjectMap.get(l.subject_id) : undefined;
        // A lesson must have a non-deleted parent subject AND that subject
        // must be linked to at least one active course; otherwise the
        // lesson is unreachable.
        if (!sub || sub.deleted_at !== null) return false;
        return (coursesBySubject.get(sub.id)?.length ?? 0) > 0;
      })
      .map((l) => {
        const sub = subjectMap.get(l.subject_id!);
        const linkedCourses = coursesBySubject.get(l.subject_id!) ?? [];
        const primary = linkedCourses[0];
        return {
          id: l.id,
          title: l.title,
          summary: l.summary ?? '',
          thumbnail: this.toFileUrl(l.thumbnail),
          order: l.order ?? 0,
          free: l.free ?? 'off',
          // Keep course_id / course_title for back-compat (first linked
          // course); courses[] is the M:N truth.
          course_id: primary?.id ?? null,
          course_title: primary?.title ?? '',
          courses: linkedCourses,
          course_count: linkedCourses.length,
          subject_id: l.subject_id,
          subject_title: sub?.title ?? '',
          files_count: fileCountMap.get(l.id) ?? 0,
          created_at: l.created_at,
          updated_at: l.updated_at,
        };
      });
  }

  async listLessonsAdmin(subjectId: string): Promise<Record<string, unknown>[]> {
    const lessons = await this.prisma.lesson.findMany({
      where: { subject_id: toNullableIntId(subjectId), deleted_at: null },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
    });

    const lessonIds = lessons.map((l) => l.id);
    const fileCounts = lessonIds.length > 0
      ? await this.prisma.lesson_files.groupBy({
          by: ['lesson_id'],
          where: { lesson_id: { in: lessonIds }, deleted_at: null },
          _count: { id: true },
        })
      : [];
    const fileCountMap = new Map(
      fileCounts.map((f) => [f.lesson_id, f._count?.id ?? 0] as const),
    );

    return lessons.map((l) => ({
      id: l.id,
      title: l.title,
      summary: l.summary ?? '',
      free: l.free ?? 'off',
      thumbnail: this.toFileUrl(l.thumbnail),
      order: l.order ?? 0,
      course_id: l.course_id,
      subject_id: l.subject_id,
      files_count: fileCountMap.get(l.id) ?? 0,
    }));
  }

  async addLessonAdmin(actorUserId: string, input: AdminLessonInput): Promise<Record<string, unknown>> {
    // Subject-wise: subject_id set (course derived from the subject).
    // Lesson-wise: subject_id omitted → lesson attaches directly to course_id.
    const subjectIdInt = input.subject_id ? toNullableIntId(input.subject_id) : null;

    let courseId = toNullableIntId(input.course_id);
    if (courseId === null && subjectIdInt !== null) {
      // Derive course_id from the subject itself (subject owns the course_id).
      const subjectRow = await this.prisma.subject.findFirst({
        where: { id: subjectIdInt, deleted_at: null },
        select: { course_id: true },
      });
      courseId = subjectRow?.course_id ?? null;
    }
    if (courseId === null) {
      throw new Error('A course (or subject) is required to add a lesson.');
    }

    // Next display order — within the subject (subject-wise) or within the
    // course's subjectless lessons (lesson-wise).
    const maxOrder = await this.prisma.lesson.aggregate({
      where: subjectIdInt !== null
        ? { subject_id: subjectIdInt, deleted_at: null }
        : { course_id: courseId, subject_id: null, deleted_at: null },
      _max: { order: true },
    });

    const lesson = await this.prisma.lesson.create({
      data: {
        course_id: courseId,
        subject_id: subjectIdInt,
        title: input.title,
        summary: toNullableString(input.summary),
        free: input.free ? 'on' : 'off',
        order: (maxOrder._max?.order ?? 0) + 1,
        created_by: toNullableIntId(actorUserId),
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    return { id: lesson.id };
  }

  // Lesson-wise admin builder: lessons attached directly to a course
  // (subject_id NULL). Mirror of listLessonsAdmin keyed by course_id.
  async listLessonsByCourse(courseId: string): Promise<Record<string, unknown>[]> {
    const lessons = await this.prisma.lesson.findMany({
      where: { course_id: toNullableIntId(courseId), subject_id: null, deleted_at: null },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
    });

    const lessonIds = lessons.map((l) => l.id);
    const fileCounts = lessonIds.length > 0
      ? await this.prisma.lesson_files.groupBy({
          by: ['lesson_id'],
          where: { lesson_id: { in: lessonIds }, deleted_at: null },
          _count: { id: true },
        })
      : [];
    const fileCountMap = new Map(fileCounts.map((f) => [f.lesson_id, f._count?.id ?? 0] as const));

    // Content Library items (content_asset) attached to a lesson also count as
    // content — without this the row badge shows "empty" after an admin tags
    // library items into a lesson-wise lesson (Naji 2026-06-24).
    const assetCounts = lessonIds.length > 0
      ? await this.prisma.content_asset.groupBy({
          by: ['lesson_id'],
          where: { lesson_id: { in: lessonIds }, deleted_at: null },
          _count: { id: true },
        })
      : [];
    const assetCountMap = new Map<number, number>();
    for (const a of assetCounts) {
      if (a.lesson_id != null) assetCountMap.set(a.lesson_id, a._count?.id ?? 0);
    }

    return lessons.map((l) => ({
      id: l.id,
      title: l.title,
      summary: l.summary ?? '',
      free: l.free ?? 'off',
      thumbnail: this.toFileUrl(l.thumbnail),
      order: l.order ?? 0,
      course_id: l.course_id,
      subject_id: l.subject_id,
      files_count: (fileCountMap.get(l.id) ?? 0) + (assetCountMap.get(l.id) ?? 0),
    }));
  }

  async editLessonAdmin(actorUserId: string, lessonId: string, input: AdminLessonInput): Promise<void> {
    await this.prisma.lesson.update({
      where: { id: toIntId(lessonId) },
      data: {
        title: input.title,
        summary: toNullableString(input.summary),
        free: input.free ? 'on' : 'off',
        ...(input.order != null ? { order: input.order } : {}),
        updated_by: toNullableIntId(actorUserId),
        updated_at: new Date(),
      },
    });
  }

  async deleteLessonAdmin(actorUserId: string, lessonId: string): Promise<void> {
    const lessonIdInt = toIntId(lessonId);
    await this.prisma.lesson.update({
      where: { id: lessonIdInt },
      data: {
        deleted_by: toNullableIntId(actorUserId),
        deleted_at: new Date(),
      },
    });
    // Release any Content Library items attached to this lesson so they return
    // to the library and can be re-attached elsewhere — otherwise they keep a
    // lesson_id pointing at a deleted lesson (Naji 2026-06-24).
    await this.prisma.content_asset.updateMany({
      where: { lesson_id: lessonIdInt, deleted_at: null },
      data: { lesson_id: null, sort_order: null, updated_at: new Date() },
    });
  }

  async reorderLessonsAdmin(lessonIds: string[]): Promise<void> {
    const updates = lessonIds.map((id, index) =>
      this.prisma.lesson.update({
        where: { id: toIntId(id) },
        data: { order: index + 1, updated_at: new Date() },
      }),
    );
    await this.prisma.$transaction(updates);
  }

  /** Reorder the subjects within a single course by writing new
   * course_subject.position values in the order provided. Each subject_id
   * must be linked to the given course (other links are left alone). */
  async reorderCourseSubjectsAdmin(courseId: string, subjectIds: string[]): Promise<void> {
    const courseIdInt = toIntId(courseId);
    const now = new Date();
    const updates = subjectIds.map((sid, index) =>
      this.prisma.course_subject.updateMany({
        where: {
          course_id: courseIdInt,
          subject_id: toIntId(sid),
          deleted_at: null,
        },
        data: { position: index + 1, updated_at: now },
      }),
    );
    await this.prisma.$transaction(updates);
  }

  /** Reorder lesson_files within a single lesson by writing new `order`
   * values in the order provided. */
  async reorderLessonFilesAdmin(lessonId: string, fileIds: string[]): Promise<void> {
    const lessonIdInt = toIntId(lessonId);
    const updates = fileIds.map((fid, index) =>
      this.prisma.lesson_files.updateMany({
        where: { id: toIntId(fid), lesson_id: lessonIdInt, deleted_at: null },
        data: { order: index + 1, updated_at: new Date() },
      }),
    );
    await this.prisma.$transaction(updates);
  }

  // ── Admin Lesson File CRUD ────────────────────────────────────────

  async listLessonFilesAdmin(lessonId: string): Promise<Record<string, unknown>[]> {
    const files = await this.prisma.lesson_files.findMany({
      where: { lesson_id: toIntId(lessonId), deleted_at: null },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
    });

    return files.map((f) => {
      // `languages` is stored as a JSON array (e.g. '["English"]'); the edit
      // form expects a single plain string, so surface the first entry.
      let language = '';
      const rawLang = typeof f.languages === 'string' ? f.languages.trim() : '';
      if (rawLang) {
        if (rawLang.startsWith('[')) {
          try {
            const arr = JSON.parse(rawLang) as unknown;
            if (Array.isArray(arr) && arr.length > 0) language = String(arr[0] ?? '').trim();
          } catch { language = rawLang; }
        } else {
          language = rawLang;
        }
      }
      return {
        id: f.id,
        lesson_id: f.lesson_id,
        title: f.title ?? '',
        summary: f.summary ?? '',
        duration: f.duration ?? '',
        lesson_type: f.lesson_type ?? '',
        video_url: f.video_url ?? '',
        attachment: f.attachment ?? '',
        // Full, viewable URLs so the admin can open the uploaded document / audio
        // — the raw `attachment` / `audio_file` are bare storage paths, not URLs.
        attachment_url: this.toFileUrl(f.attachment),
        audio_file: f.audio_file ?? '',
        audio_url: this.toFileUrl(f.audio_file),
        // thumbnail + language were previously omitted, so the edit form
        // populated them blank and Update silently wiped the saved values
        // (Naji 2026-06-24). Round-trip them through the edit dialog.
        thumbnail: f.thumbnail ?? '',
        language,
        free: f.free ?? 'off',
        order: f.order ?? 0,
        attachment_type: f.attachment_type ?? '',
      };
    });
  }

  async addLessonFileAdmin(actorUserId: string, input: AdminLessonFileInput): Promise<Record<string, unknown>> {
    const lessonIdInt = toIntId(input.lesson_id);
    const maxOrder = await this.prisma.lesson_files.aggregate({
      where: { lesson_id: lessonIdInt, deleted_at: null },
      _max: { order: true },
    });

    // Ishfaq UAT 2026-05-22 — lesson_files.languages has a MySQL CHECK
    // constraint (json_valid(languages)) at the DB level — the schema
    // column is LongText so Prisma can't enforce it, but any insert
    // with a plain string blows up with MySQL error 4025. Wrap the
    // form's single-language value in a JSON array, matching the
    // legacy PHP LMS behaviour. Same pattern as practice_attempt
    // lesson_id / question_id columns elsewhere in the codebase.
    const file = await this.prisma.lesson_files.create({
      data: {
        lesson_id: lessonIdInt,
        title: input.title ?? null,
        summary: toNullableString(input.summary),
        duration: toNullableString(input.duration),
        lesson_type: input.lesson_type ?? null,
        video_url: toNullableString(input.video_url),
        attachment: toNullableString(input.attachment),
        audio_file: toNullableString(input.audio_file),
        thumbnail: toNullableString(input.thumbnail) ?? '',
        languages: toLanguagesJson(input.language),
        free: input.free ? 'on' : 'off',
        order: (maxOrder._max?.order ?? 0) + 1,
        lesson_provider: '',
        created_by: toNullableIntId(actorUserId),
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    return { id: file.id };
  }

  async editLessonFileAdmin(actorUserId: string, fileId: string, input: AdminLessonFileInput): Promise<void> {
    const data: Record<string, unknown> = {
      title: input.title ?? null,
      summary: toNullableString(input.summary),
      duration: toNullableString(input.duration),
      lesson_type: input.lesson_type ?? null,
      video_url: toNullableString(input.video_url),
      attachment: toNullableString(input.attachment),
      audio_file: toNullableString(input.audio_file),
      free: input.free ? 'on' : 'off',
      updated_by: toNullableIntId(actorUserId),
      updated_at: new Date(),
    };
    if (input.thumbnail !== undefined) data.thumbnail = input.thumbnail;
    // Ishfaq UAT 2026-05-22 — same json_valid(languages) CHECK as create.
    if (input.language !== undefined) data.languages = toLanguagesJson(input.language);
    await this.prisma.lesson_files.update({
      where: { id: toIntId(fileId) },
      data,
    });
  }

  async deleteLessonFileAdmin(actorUserId: string, fileId: string): Promise<void> {
    await this.prisma.lesson_files.update({
      where: { id: toIntId(fileId) },
      data: {
        deleted_by: toNullableIntId(actorUserId),
        deleted_at: new Date(),
      },
    });
  }

  // ── Quiz questions for lesson_files (lesson_type='quiz') ──────────────────

  /**
   * Returns the questions stored against a lesson_file. Output shape mirrors
   * what the lesson-builder dialog expects (question + 4 options + correct
   * letter A-D), parsed out of the legacy `quiz` table's JSON-encoded
   * `answers` column.
   *
   * answer_id is 0-based in the legacy DB (verified against prod 2026-05-01:
   * `["A","B","C","D"]` with answer_id=2 means option C). We surface
   * 'A'..'D'.
   */
  async listLessonQuizQuestions(lessonFileId: string): Promise<Record<string, unknown>[]> {
    const id = toIntId(lessonFileId);
    const rows = await this.prisma.quiz.findMany({
      where: { lesson_file_id: id, deleted_at: null },
      orderBy: { id: 'asc' },
    });
    return rows.map((r) => {
      let options: string[] = [];
      try {
        const parsed: unknown = r.answers ? JSON.parse(r.answers) : [];
        options = Array.isArray(parsed) ? parsed.map((x) => (typeof x === 'string' ? x : '')) : [];
      } catch {
        options = [];
      }
      while (options.length < 4) options.push('');
      const answerIdx = r.answer_id ?? 0;
      const correct = ['A', 'B', 'C', 'D'][Math.max(0, Math.min(3, answerIdx))] ?? 'A';
      return {
        id: String(r.id),
        question: r.question ?? '',
        option_a: options[0] ?? '',
        option_b: options[1] ?? '',
        option_c: options[2] ?? '',
        option_d: options[3] ?? '',
        correct_answer: correct,
      };
    });
  }

  /**
   * Atomically replaces all quiz questions for a lesson_file. Soft-deletes
   * existing rows, inserts the new set. Used by the lesson-builder dialog's
   * Save action and the bulk CSV import.
   */
  async replaceLessonQuizQuestions(
    actorUserId: string,
    lessonFileId: string,
    questions: ReadonlyArray<{
      question: string;
      option_a?: string;
      option_b?: string;
      option_c?: string;
      option_d?: string;
      correct_answer: string;
    }>,
  ): Promise<void> {
    const id = toIntId(lessonFileId);
    const actor = toNullableIntId(actorUserId);
    const now = new Date();
    // answer_id is stored 0-based in the legacy `quiz` table.
    const letterToIdx = (letter: string): number => {
      const i = ['A', 'B', 'C', 'D'].indexOf((letter || 'A').toUpperCase());
      return i >= 0 ? i : 0;
    };
    await this.prisma.$transaction(async (tx) => {
      // Soft-delete existing rows so attempt history can still resolve them.
      await tx.quiz.updateMany({
        where: { lesson_file_id: id, deleted_at: null },
        data: { deleted_at: now, deleted_by: actor },
      });
      if (questions.length === 0) return;
      await tx.quiz.createMany({
        data: questions.map((q) => ({
          lesson_file_id: id,
          question: q.question,
          question_type: 0,
          answer_id: letterToIdx(q.correct_answer),
          answers: JSON.stringify([q.option_a ?? '', q.option_b ?? '', q.option_c ?? '', q.option_d ?? '']),
          created_by: actor,
          created_at: now,
          updated_at: now,
        })),
      });
    });
  }

  // ─── Document Types (settings master list) ─────────────────────────────
  async listDocumentTypes(): Promise<Record<string, unknown>[]> {
    return this.prisma.document_types.findMany({
      where: { deleted_at: null },
      orderBy: [{ position: 'asc' }, { id: 'asc' }],
    }) as Promise<Record<string, unknown>[]>;
  }

  async createDocumentType(actorUserId: string, label: string): Promise<Record<string, unknown>> {
    if (!label.trim()) return { status: 0, message: 'Label is required.' };
    const now = new Date();
    const created = await this.prisma.document_types.create({
      data: {
        label: label.trim(),
        position: 0,
        created_by: toNullableIntId(actorUserId),
        created_at: now,
        updated_at: now,
      },
    });
    return { status: 1, message: 'Document type added.', id: created.id };
  }

  async updateDocumentType(actorUserId: string, id: string, label: string): Promise<Record<string, unknown>> {
    if (!label.trim()) return { status: 0, message: 'Label is required.' };
    const now = new Date();
    await this.prisma.document_types.updateMany({
      where: { id: toIntId(id), deleted_at: null },
      data: { label: label.trim(), updated_by: toNullableIntId(actorUserId), updated_at: now },
    });
    return { status: 1, message: 'Document type updated.' };
  }

  async deleteDocumentType(actorUserId: string, id: string): Promise<Record<string, unknown>> {
    const now = new Date();
    await this.prisma.document_types.updateMany({
      where: { id: toIntId(id), deleted_at: null },
      data: { deleted_by: toNullableIntId(actorUserId), deleted_at: now },
    });
    // Also clear from any course pivots so courses stop referencing it.
    await this.prisma.course_required_documents.updateMany({
      where: { document_type_id: toIntId(id), deleted_at: null },
      data: { deleted_by: toNullableIntId(actorUserId), deleted_at: now },
    });
    return { status: 1, message: 'Document type removed.' };
  }

  async listCourseRequiredDocuments(courseId: string): Promise<Record<string, unknown>[]> {
    const cid = toNullableIntId(courseId);
    if (!cid) return [];
    const links = await this.prisma.course_required_documents.findMany({
      where: { course_id: cid, deleted_at: null },
      orderBy: [{ position: 'asc' }, { document_type_id: 'asc' }],
    });
    if (links.length === 0) return [];
    const docTypeIds = links.map((l) => l.document_type_id);
    const types = await this.prisma.document_types.findMany({
      where: { id: { in: docTypeIds }, deleted_at: null },
    });
    const typeMap = new Map(types.map((t) => [t.id, t]));
    return links.map((l) => {
      const t = typeMap.get(l.document_type_id);
      return {
        course_id: l.course_id,
        document_type_id: l.document_type_id,
        label: t?.label ?? `#${l.document_type_id}`,
        is_mandatory: l.is_mandatory,
        position: l.position ?? 0,
      };
    });
  }

  async setCourseRequiredDocuments(
    actorUserId: string,
    courseId: string,
    documentTypeIds: string[],
  ): Promise<Record<string, unknown>> {
    const cid = toNullableIntId(courseId);
    if (!cid) return { status: 0, message: 'Invalid course id.' };
    const now = new Date();
    const actor = toNullableIntId(actorUserId);
    const wantedIds = documentTypeIds
      .map((d) => toNullableIntId(d))
      .filter((n): n is number => n !== null && n !== undefined);

    await this.prisma.$transaction(async (tx) => {
      // Soft-delete any existing pivot rows not in the new set.
      await tx.course_required_documents.updateMany({
        where: {
          course_id: cid,
          deleted_at: null,
          ...(wantedIds.length > 0 ? { document_type_id: { notIn: wantedIds } } : {}),
        },
        data: { deleted_by: actor, deleted_at: now },
      });
      for (let i = 0; i < wantedIds.length; i++) {
        const docTypeId = wantedIds[i] as number;
        await tx.course_required_documents.upsert({
          where: { course_id_document_type_id: { course_id: cid, document_type_id: docTypeId } },
          create: {
            course_id: cid, document_type_id: docTypeId,
            position: i, is_mandatory: true,
            created_by: actor, created_at: now, updated_at: now,
          },
          update: {
            position: i, is_mandatory: true, deleted_at: null, deleted_by: null,
            updated_by: actor, updated_at: now,
          },
        });
      }
    });

    return { status: 1, message: 'Required documents updated.' };
  }
}
