import type { PrismaClient } from '@prisma/client';

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
  course_id?: string | undefined; // deprecated: derived from subject via course_subjects
  subject_id: string;
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
  free?: boolean | undefined;
};

export interface LessonMaterialFilter {
  lessonId?: string;
  subjectId?: string;
  courseId?: string;
}

export class ContentService {
  private readonly appBaseUrl = env.APP_BASE_URL.replace(/\/$/, '');

  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  private toFileUrl(path: unknown): string {
    const normalized = toNullableString(path);
    if (!normalized) {
      return '';
    }

    if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
      return normalized;
    }

    return `${this.appBaseUrl}/${normalized.replace(/^\/+/, '')}`;
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

    const videoFiles = await this.prisma.vimeo_videolinks.findMany({
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

    const downloadUrl = toNullableString(file.download_url);
    const attachmentType = toStringValue(file.attachment_type);

    return {
      id: fileId,
      sub_title: toStringValue(file.sub_title),
      title: toStringValue(file.title),
      lesson_id: lessonId,
      parent_file_id: toStringValue(file.parent_file_id),
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

    const subjectCount = await this.prisma.subject.count({
      where: {
        course_id: toNullableIntId(courseId),
        deleted_at: null,
      },
    });

    const totalReviews = await this.totalReviewsByCourse(courseId);
    const totalRating = await this.averageRatingByCourse(courseId);
    const isEnrolled = await this.isUserEnrolled(userId, courseId);

    const featuresRaw = toStringValue(course.features);

    return {
      id: courseId,
      title: toStringValue(course.title),
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

    const subjects = await this.prisma.subject.findMany({
      where: {
        course_id: toNullableIntId(courseId),
        deleted_at: null,
      },
      select: {
        id: true,
        title: true,
        thumbnail: true,
      },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
    });

    const subjectData = subjects.map((subject) => ({
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

    // Find cohort_students for this user. cohort_students.cohort_id
    // references cohorts.cohort_id (String identifier), not cohorts.id.
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

    const cohortIds = cohortStudents
      .map((cs) => cs.cohort_id)
      .filter((v): v is string => typeof v === 'string' && v !== '');

    if (cohortIds.length === 0) return null;

    const cohorts = await this.prisma.cohorts.findMany({
      where: {
        cohort_id: { in: cohortIds },
        deleted_at: null,
        subject_id: { not: null },
      },
      select: { id: true, cohort_id: true, subject_id: true },
    });

    if (cohorts.length === 0) {
      return null;
    }

    // Direct match first
    for (const cohort of cohorts) {
      if (cohort.subject_id === subjectIdInt) {
        return idString(cohort.cohort_id ?? cohort.id);
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
    // course_subjects junction does not exist in MySQL; filter subjects
    // by their direct subject.course_id column instead.
    const subjects = await this.prisma.subject.findMany({
      where: {
        course_id: toNullableIntId(courseId),
        deleted_at: null,
      },
      select: {
        id: true,
        title: true,
        description: true,
        thumbnail: true,
        order: true,
      },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
    });

    if (subjects.length === 0) return [];

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
        cohort_id: cohortId,
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

    return {
      id: lessonId,
      title: toStringValue(lesson.title),
      course_id: lessonCourseId,
      subject_id: toStringValue(lesson.subject_id),
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

    // course_subjects junction does not exist in MySQL — rely on
    // subject.course_id directly.
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
    const videosById = new Map<string, Record<string, unknown>>();
    const pendingRelatedFiles: Record<string, unknown>[] = [];

    for (const lessonFile of lessonFiles) {
      const fileId = String(lessonFile.id);
      const attachmentType = normalizeAttachmentType((lessonFile.attachment_type ?? '').toLowerCase());

      if (attachmentType === 'video') {
        const fileData = await this.buildLessonFileData(lessonFile as unknown as Record<string, unknown>, lessonId, userId, courseId);
        fileData.sub_title = 'Video';
        fileData.related_files = [];
        videosById.set(fileId, fileData);
      } else {
        pendingRelatedFiles.push(lessonFile as unknown as Record<string, unknown>);
      }
    }

    for (const relatedFile of pendingRelatedFiles) {
      const parentFileId = toNullableString(relatedFile.parent_file_id);
      if (!parentFileId) {
        continue;
      }

      const parentVideo = videosById.get(parentFileId);
      if (!parentVideo) {
        continue;
      }

      const relatedFileData = await this.buildLessonFileData(relatedFile, lessonId, userId, courseId);
      const attachmentType = toStringValue(relatedFile.attachment_type).toLowerCase();
      relatedFileData.sub_title = capitalize(attachmentType);

      const currentRelated = Array.isArray(parentVideo.related_files)
        ? (parentVideo.related_files as Record<string, unknown>[])
        : [];
      currentRelated.push(relatedFileData);
      parentVideo.related_files = currentRelated;
    }

    return [...videosById.values()];
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

    return {
      id: currentVideoId,
      title: toStringValue(video.title),
      lesson_id: lessonId,
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

    return {
      id: toStringValue(material.id),
      title: toStringValue(material.title),
      lesson_id: lessonId,
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
      is_free_course: course.is_free_course,
      visibility: course.visibility ?? 'public',
    };
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
        label: toNullableString(input.label),
        status: input.status ?? 'active',
        visibility: visibilityInt,
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
        label: toNullableString(input.label),
        status: input.status ?? 'active',
        visibility: visibilityInt,
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
    // course_subjects junction does not exist in MySQL — use direct
    // subject.course_id column instead.
    const subjects = await this.prisma.subject.findMany({
      where: { course_id: toNullableIntId(courseId), deleted_at: null },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
    });
    if (subjects.length === 0) return [];

    const subjectIds = subjects.map((s) => s.id);

    const lessonCounts = await this.prisma.lesson.groupBy({
      by: ['subject_id'],
      where: { subject_id: { in: subjectIds }, deleted_at: null },
      _count: { id: true },
    });
    const lessonCountMap = new Map(
      lessonCounts.map((l) => [l.subject_id, l._count?.id ?? 0] as const),
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
      course_count: 1, // single-owner model in MySQL (no M:N reuse)
    }));
  }

  async listAllSubjects(): Promise<Record<string, unknown>[]> {
    const subjects = await this.prisma.subject.findMany({
      where: { deleted_at: null },
      select: { id: true, title: true, description: true, course_id: true },
      orderBy: { title: 'asc' },
    });

    return subjects.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description ?? '',
      course_count: s.course_id !== null ? 1 : 0,
    }));
  }

  async addSubjectAdmin(actorUserId: string, input: AdminSubjectInput): Promise<Record<string, unknown>> {
    const courseIdInt = toIntId(input.course_id);
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

    return { id: subject.id };
  }

  /** Link an existing subject to a course — MySQL has no junction table,
   * so we overwrite subject.course_id. */
  async linkSubjectToCourse(actorUserId: string, courseId: string, subjectId: string): Promise<Record<string, unknown>> {
    await this.prisma.subject.update({
      where: { id: toIntId(subjectId) },
      data: {
        course_id: toIntId(courseId),
        updated_by: toNullableIntId(actorUserId),
        updated_at: new Date(),
      },
    });

    return { id: subjectId };
  }

  /** Unlink a subject from a course — clears subject.course_id. */
  async unlinkSubjectFromCourse(actorUserId: string, _courseId: string, subjectId: string): Promise<void> {
    await this.prisma.subject.update({
      where: { id: toIntId(subjectId) },
      data: {
        course_id: null,
        updated_by: toNullableIntId(actorUserId),
        updated_at: new Date(),
      },
    });
  }

  async editSubjectAdmin(actorUserId: string, subjectId: string, input: AdminSubjectInput): Promise<void> {
    await this.prisma.subject.update({
      where: { id: toIntId(subjectId) },
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

  async deleteSubjectAdmin(actorUserId: string, subjectId: string, _courseId?: string): Promise<void> {
    await this.prisma.subject.update({
      where: { id: toIntId(subjectId) },
      data: {
        deleted_by: toNullableIntId(actorUserId),
        deleted_at: new Date(),
      },
    });
  }

  // ── Admin Lesson CRUD ─────────────────────────────────────────────

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
    const subjectIdInt = toIntId(input.subject_id);
    const maxOrder = await this.prisma.lesson.aggregate({
      where: { subject_id: subjectIdInt, deleted_at: null },
      _max: { order: true },
    });

    // Derive course_id from the subject itself if not provided (MySQL has
    // no course_subjects junction — subject owns the course_id).
    let courseId = toNullableIntId(input.course_id);
    if (courseId === null) {
      const subjectRow = await this.prisma.subject.findFirst({
        where: { id: subjectIdInt, deleted_at: null },
        select: { course_id: true },
      });
      courseId = subjectRow?.course_id ?? null;
    }

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
    await this.prisma.lesson.update({
      where: { id: toIntId(lessonId) },
      data: {
        deleted_by: toNullableIntId(actorUserId),
        deleted_at: new Date(),
      },
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

  // ── Admin Lesson File CRUD ────────────────────────────────────────

  async listLessonFilesAdmin(lessonId: string): Promise<Record<string, unknown>[]> {
    const files = await this.prisma.lesson_files.findMany({
      where: { lesson_id: toIntId(lessonId), deleted_at: null },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
    });

    return files.map((f) => ({
      id: f.id,
      lesson_id: f.lesson_id,
      title: f.title ?? '',
      summary: f.summary ?? '',
      duration: f.duration ?? '',
      lesson_type: f.lesson_type ?? '',
      video_url: f.video_url ?? '',
      attachment: f.attachment ?? '',
      audio_file: f.audio_file ?? '',
      free: f.free ?? 'off',
      order: f.order ?? 0,
      attachment_type: f.attachment_type ?? '',
    }));
  }

  async addLessonFileAdmin(actorUserId: string, input: AdminLessonFileInput): Promise<Record<string, unknown>> {
    const lessonIdInt = toIntId(input.lesson_id);
    const maxOrder = await this.prisma.lesson_files.aggregate({
      where: { lesson_id: lessonIdInt, deleted_at: null },
      _max: { order: true },
    });

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
        free: input.free ? 'on' : 'off',
        order: (maxOrder._max?.order ?? 0) + 1,
        lesson_provider: '',
        thumbnail: '',
        created_by: toNullableIntId(actorUserId),
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    return { id: file.id };
  }

  async editLessonFileAdmin(actorUserId: string, fileId: string, input: AdminLessonFileInput): Promise<void> {
    await this.prisma.lesson_files.update({
      where: { id: toIntId(fileId) },
      data: {
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
      },
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
}
