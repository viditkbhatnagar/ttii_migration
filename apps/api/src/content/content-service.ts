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
        id: userId,
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
        id: courseId,
        deleted_at: null,
      },
    });
  }

  private async isUserEnrolled(userId: string, courseId: string): Promise<boolean> {
    const total = await this.prisma.enrol.count({
      where: {
        user_id: userId,
        course_id: courseId,
        deleted_at: null,
      },
    });

    return total > 0;
  }

  private async averageRatingByCourse(courseId: string): Promise<string> {
    const result = await this.prisma.review.aggregate({
      where: {
        course_id: courseId,
        rating: { not: null },
        deleted_at: null,
      },
      _avg: {
        rating: true,
      },
    });

    const average = result._avg.rating ?? 0;
    return average.toFixed(2);
  }

  private async totalReviewsByCourse(courseId: string): Promise<number> {
    return this.prisma.review.count({
      where: {
        course_id: courseId,
        deleted_at: null,
      },
    });
  }

  private async ratingDistributionByCourse(courseId: string): Promise<Record<string, number>> {
    const groups = await this.prisma.review.groupBy({
      by: ['rating'],
      where: {
        course_id: courseId,
        rating: { not: null },
        deleted_at: null,
      },
      _count: {
        rating: true,
      },
    });

    const rows: RatingRow[] = groups.map((g) => ({
      rating: g.rating ?? 0,
      rating_count: g._count.rating,
    }));

    return toRatingDistribution(rows);
  }

  private async getCourseLessonIds(courseId: string): Promise<string[]> {
    const rows = await this.prisma.lesson.findMany({
      where: {
        course_id: courseId,
        deleted_at: null,
      },
      select: { id: true },
      orderBy: { id: 'asc' },
    });

    return rows.map((row) => row.id);
  }

  private async getSubjectLessonIds(subjectId: string): Promise<string[]> {
    const rows = await this.prisma.lesson.findMany({
      where: {
        subject_id: subjectId,
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
        lesson_id: lessonId,
        deleted_at: null,
      },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
    });
  }

  private async getFileProgress(userId: string, lessonFileId: string, lessonType: string): Promise<number> {
    if (lessonType === 'youtube_video' || lessonType === 'vimeo_video' || lessonType === 'audio') {
      const progressRow = await this.prisma.video_progress_status.findFirst({
        where: {
          user_id: userId,
          lesson_file_id: lessonFileId,
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

      const totalDuration = parseTimeToSeconds(progressRow.total_duration ?? '');
      const userProgress = parseTimeToSeconds(progressRow.user_progress ?? '');
      if (totalDuration <= 0) {
        return 0;
      }

      return Math.min(100, Math.round((userProgress / totalDuration) * 100));
    }

    if (lessonType === 'document' || lessonType === 'article') {
      const completed = await this.prisma.material_progress.count({
        where: {
          user_id: userId,
          lesson_file_id: lessonFileId,
          deleted_at: null,
        },
      });
      return completed > 0 ? 100 : 0;
    }

    if (lessonType === 'quiz') {
      const completed = await this.prisma.practice_attempt.count({
        where: {
          user_id: userId,
          lesson_file_id: lessonFileId,
          submit_status: 1,
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

    const videoIds: string[] = [];
    const materialIds: string[] = [];
    const quizIds: string[] = [];

    for (const file of lessonFiles) {
      const attachmentType = (file.attachment_type ?? '').trim().toLowerCase();

      if (attachmentType === 'url' || attachmentType === 'audio') {
        videoIds.push(file.id);
      }

      if (attachmentType === 'pdf' || attachmentType === 'article') {
        materialIds.push(file.id);
      }

      if (attachmentType === 'quiz') {
        quizIds.push(file.id);
      }
    }

    let videoCompleted = 0;
    if (videoIds.length > 0) {
      const videoProgressRows = await this.prisma.video_progress_status.findMany({
        where: {
          user_id: userId,
          status: 1,
          lesson_file_id: { in: videoIds },
          ...(courseId ? { course_id: courseId } : {}),
          deleted_at: null,
        },
        select: { lesson_file_id: true },
        distinct: ['lesson_file_id'],
      });
      videoCompleted = videoProgressRows.length;
    }

    let materialCompleted = 0;
    if (materialIds.length > 0) {
      const materialProgressRows = await this.prisma.material_progress.findMany({
        where: {
          user_id: userId,
          lesson_file_id: { in: materialIds },
          deleted_at: null,
        },
        select: { lesson_file_id: true },
        distinct: ['lesson_file_id'],
      });
      materialCompleted = materialProgressRows.length;
    }

    let quizCompleted = 0;
    if (quizIds.length > 0) {
      const quizAttemptRows = await this.prisma.practice_attempt.findMany({
        where: {
          user_id: userId,
          submit_status: 1,
          lesson_file_id: { in: quizIds },
          deleted_at: null,
        },
        select: { lesson_file_id: true },
        distinct: ['lesson_file_id'],
      });
      quizCompleted = quizAttemptRows.length;
    }

    return videoCompleted + materialCompleted + quizCompleted;
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
        user_id: userId,
        course_id: courseId,
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
        lesson_file_id: fileId,
        deleted_at: null,
      },
    });

    const videoFiles = await this.prisma.vimeo_videolinks.findMany({
      where: {
        lesson_file_id: fileId,
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

    const videoIds: string[] = [];
    const materialIds: string[] = [];

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
          user_id: userId,
          status: 1,
          lesson_file_id: { in: videoIds },
          deleted_at: null,
        },
        select: { lesson_file_id: true },
        distinct: ['lesson_file_id'],
      });
      completedVideos = completedVideoRows.length;
    }

    let completedMaterials = 0;
    if (materialIds.length > 0) {
      const completedMaterialRows = await this.prisma.material_progress.findMany({
        where: {
          user_id: userId,
          lesson_file_id: { in: materialIds },
          deleted_at: null,
        },
        select: { lesson_file_id: true },
        distinct: ['lesson_file_id'],
      });
      completedMaterials = completedMaterialRows.length;
    }

    const totalPractice = await this.prisma.practice_attempt.count({
      where: {
        user_id: userId,
        lesson_id: { in: lessonIds },
        deleted_at: null,
      },
    });

    const attemptedPracticeRows = await this.prisma.practice_attempt.findMany({
      where: {
        user_id: userId,
        lesson_id: { in: lessonIds },
        submit_status: 1,
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
        course_id: courseId,
        deleted_at: null,
      },
    });

    const lessonsCount = await this.prisma.lesson.count({
      where: {
        course_id: courseId,
        deleted_at: null,
      },
    });

    const subjectCount = await this.prisma.subject.count({
      where: {
        course_id: courseId,
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
        id: categoryId,
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
        category_id: categoryId,
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
        total_reviews: await this.totalReviewsByCourse(course.id),
        total_rating: await this.averageRatingByCourse(course.id),
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

  async listCourses(userId: string): Promise<Record<string, unknown>[]> {
    const rows = await this.prisma.course.findMany({
      where: {
        deleted_at: null,
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
        course_id: courseId,
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
        course_id: courseId,
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
        course_id: courseId,
        deleted_at: null,
      },
      orderBy: { id: 'asc' },
    });

    // Batch fetch related courses and users for reviews
    const reviewCourseIds = [...new Set(reviewRows.map((r) => r.course_id).filter(Boolean))] as string[];
    const reviewUserIds = [...new Set(reviewRows.map((r) => r.user_id).filter(Boolean))] as string[];

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
          user_id: userId,
          deleted_at: null,
        },
      });

      const reviewCourse = review.course_id ? courseMap.get(review.course_id) : null;
      const reviewUser = review.user_id ? userMap.get(review.user_id) : null;

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
        course_id: courseId,
        deleted_at: null,
      },
      select: {
        instructor_id: true,
      },
    });

    let instructorData: Record<string, unknown> = {};
    if (instructorEnrol) {
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
    const masterSubjectId = toNullableString(subject.master_subject_id) ?? toStringValue(subject.id);

    // Find cohort_students for this user
    const cohortStudents = await this.prisma.cohort_students.findMany({
      where: {
        user_id: userId,
        deleted_at: null,
      },
      select: { cohort_id: true },
    });

    if (cohortStudents.length === 0) {
      return null;
    }

    const cohortIds = cohortStudents.map((cs) => cs.cohort_id);

    // Find cohorts that are active and have a subject matching the master_subject_id
    const cohorts = await this.prisma.cohorts.findMany({
      where: {
        id: { in: cohortIds },
        deleted_at: null,
        subject_id: { not: null },
      },
      select: { id: true, subject_id: true },
    });

    if (cohorts.length === 0) {
      return null;
    }

    // Get the subjects for these cohorts to check master_subject_id
    const cohortSubjectIds = cohorts.map((c) => c.subject_id).filter(Boolean) as string[];
    const subjects = await this.prisma.subject.findMany({
      where: {
        id: { in: cohortSubjectIds },
        deleted_at: null,
      },
      select: { id: true, master_subject_id: true },
    });

    const subjectMap = new Map(subjects.map((s) => [s.id, s]));

    for (const cohort of cohorts) {
      if (!cohort.subject_id) continue;
      const subjectRow = subjectMap.get(cohort.subject_id);
      if (!subjectRow) continue;

      const effectiveSubjectId = subjectRow.master_subject_id ?? subjectRow.id;
      if (effectiveSubjectId === masterSubjectId) {
        return cohort.id;
      }
    }

    return null;
  }

  async getSubjects(userId: string, courseId: string): Promise<Record<string, unknown>[]> {
    const subjects = await this.prisma.subject.findMany({
      where: {
        course_id: courseId,
        deleted_at: null,
      },
      select: {
        id: true,
        master_subject_id: true,
        title: true,
        description: true,
        thumbnail: true,
      },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
    });

    const subjectData: Record<string, unknown>[] = [];

    for (const subject of subjects) {
      const masterSubjectId = subject.master_subject_id ?? subject.id;
      const cohortId = await this.getCohortIdForSubject(userId, subject as unknown as Record<string, unknown>);
      const totalLessons = await this.prisma.lesson.count({
        where: {
          subject_id: masterSubjectId,
          deleted_at: null,
        },
      });
      const progress = await this.calculateUserProgress(userId, courseId, masterSubjectId);

      subjectData.push({
        id: subject.id,
        master_subject_id: masterSubjectId,
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
        lesson_id: lessonId,
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
        id: subjectId,
        deleted_at: null,
      },
      select: {
        id: true,
        course_id: true,
        master_subject_id: true,
      },
    });

    if (!subject) {
      return [];
    }

    const courseId = subject.course_id;
    const lessonSubjectId = subject.master_subject_id ?? subjectId;

    const lessons = await this.prisma.lesson.findMany({
      where: {
        subject_id: lessonSubjectId,
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

      const lessonCourseId = lesson.course_id;
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
        subject_id: subjectId,
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

      const purchaseStatus = await this.getUserPurchaseStatus(userId, lesson.course_id);
      lessonData.push(
        await this.buildLessonData(
          lesson as unknown as Record<string, unknown>,
          userId,
          purchaseStatus,
          index,
          lesson.course_id,
        ),
      );
    }

    return lessonData;
  }

  async getLessonFileGroupedIndex(userId: string, lessonId: string): Promise<Record<string, unknown>[]> {
    const lesson = await this.prisma.lesson.findFirst({
      where: {
        id: lessonId,
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

    const courseId = lesson.course_id;
    const lessonFiles = await this.getLessonFilesForLesson(lessonId);
    const videosById = new Map<string, Record<string, unknown>>();
    const pendingRelatedFiles: Record<string, unknown>[] = [];

    for (const lessonFile of lessonFiles) {
      const fileId = lessonFile.id;
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
        id: lessonId,
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

    const courseId = lesson.course_id;
    const purchaseStatus = await this.getUserPurchaseStatus(userId, courseId);

    const videos = await this.prisma.lesson_files.findMany({
      where: {
        lesson_id: lessonId,
        attachment_type: 'url',
        deleted_at: null,
      },
      select: { id: true },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
    });

    const orderedVideoIds = videos.map((entry) => entry.id);
    const currentVideoId = toStringValue(video.id);
    const currentVideoIndex = orderedVideoIds.indexOf(currentVideoId);

    let free = purchaseStatus;
    let lockMessage = '';

    if (currentVideoIndex > 0) {
      const previousVideoId = orderedVideoIds[currentVideoIndex - 1] ?? '';
      if (previousVideoId) {
        const previousReportCount = await this.prisma.lesson_files_report.count({
          where: {
            lesson_file_id: previousVideoId,
            user_id: userId,
            deleted_at: null,
          },
        });

        if (previousReportCount > 0) {
          free = 'on';
        } else {
          free = 'off';
          lockMessage = 'Please upload report';
        }
      }
    }

    const attachment = await this.prisma.lesson_files.findFirst({
      where: {
        lesson_id: lessonId,
        attachment_type: 'pdf',
        deleted_at: null,
      },
      select: { attachment: true },
      orderBy: { id: 'asc' },
    });

    const report = await this.prisma.lesson_files_report.findFirst({
      where: {
        lesson_file_id: currentVideoId,
        user_id: userId,
        deleted_at: null,
      },
      select: {
        report_file: true,
        file_type: true,
      },
      orderBy: { id: 'desc' },
    });

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
      is_submitted: report ? '1' : '0',
      report_file: this.toFileUrl(report?.report_file),
      file_type: report?.file_type ?? '',
      lock_message: lockMessage,
    };
  }

  async getLessonVideos(userId: string, lessonId: string): Promise<Record<string, unknown>[]> {
    const videos = await this.prisma.lesson_files.findMany({
      where: {
        lesson_id: lessonId,
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
        id: lessonId,
        deleted_at: null,
      },
      select: { course_id: true },
    });

    const courseId = lesson?.course_id ?? '';
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

    let lessonIds: string[] = [];
    if (lessonId !== '') {
      lessonIds = [lessonId];
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
        id: lessonFileId,
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

    return lesson?.course_id ?? null;
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

    const existingProgress = await this.prisma.video_progress_status.findFirst({
      where: {
        user_id: userId,
        lesson_file_id: lessonFileId,
        course_id: courseId,
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
      const existingProgressSeconds = parseTimeToSeconds(existingProgress.user_progress ?? '');
      if (requestedProgressSeconds + graceSeconds > existingProgressSeconds) {
        await this.prisma.video_progress_status.update({
          where: { id: existingProgress.id },
          data: {
            total_duration: input.lessonDuration,
            user_progress: input.userProgress,
            status: completed ? 1 : 0,
            updated_by: userId,
            updated_at: now,
          },
        });
      }

      return;
    }

    await this.prisma.video_progress_status.create({
      data: {
        user_id: userId,
        course_id: courseId,
        lesson_file_id: lessonFileId,
        total_duration: input.lessonDuration,
        user_progress: input.userProgress,
        status: completed ? 1 : 0,
        created_by: userId,
        created_at: now,
      },
    });
  }

  async saveMaterialProgress(userId: string, input: SaveMaterialProgressInput): Promise<void> {
    if (!input.lessonFileId || !input.courseId) {
      return;
    }

    const existing = await this.prisma.material_progress.count({
      where: {
        user_id: userId,
        lesson_file_id: input.lessonFileId,
        course_id: input.courseId,
        deleted_at: null,
      },
    });

    if (existing > 0) {
      return;
    }

    const now = new Date();

    await this.prisma.material_progress.create({
      data: {
        user_id: userId,
        course_id: input.courseId,
        lesson_file_id: input.lessonFileId,
        attachment_type: input.attachmentType,
        created_by: userId,
        created_at: now,
      },
    });
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

    const lessonIds = await this.getCourseLessonIds(courseId);
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
}
