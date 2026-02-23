import { Prisma, type PrismaClient } from '@prisma/client';

import { getPrismaClient } from '../data/prisma-client.js';
import { env } from '../env.js';

type SqlRow = Record<string, unknown>;

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

function toNullableInteger(value: unknown): number | null {
  const numberValue = toDbNumber(value);
  if (!Number.isFinite(numberValue) || numberValue === 0) {
    return null;
  }

  return Math.trunc(numberValue);
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

function toRatingDistribution(rows: SqlRow[]): Record<string, number> {
  const distribution = {
    '5_star': 0,
    '4_star': 0,
    '3_star': 0,
    '2_star': 0,
    '1_star': 0,
  };

  const totalReviews = rows.reduce((acc, row) => acc + toDbNumber(row.rating_count), 0);
  if (totalReviews <= 0) {
    return distribution;
  }

  for (const row of rows) {
    const rating = Math.trunc(toDbNumber(row.rating));
    const count = toDbNumber(row.rating_count);
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
  courseId?: number;
  lessonFileId: number;
  lessonDuration: string;
  userProgress: string;
}

export interface SaveMaterialProgressInput {
  courseId: number;
  lessonFileId: number;
  attachmentType: string;
}

export interface LessonMaterialFilter {
  lessonId?: number;
  subjectId?: number;
  courseId?: number;
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

  private async queryMany(sql: Prisma.Sql): Promise<SqlRow[]> {
    const rows = await this.prisma.$queryRaw<SqlRow[]>(sql);
    return rows;
  }

  private async queryOne(sql: Prisma.Sql): Promise<SqlRow | null> {
    const rows = await this.queryMany(sql);
    return rows[0] ?? null;
  }

  private async count(sql: Prisma.Sql): Promise<number> {
    const row = await this.queryOne(sql);
    return toDbNumber(row?.count);
  }

  private async getUserById(userId: number): Promise<SqlRow | null> {
    return this.queryOne(Prisma.sql`
      SELECT id, student_id, name, email, user_email, phone, role_id, course_id, status, device_id, image, premium
      FROM users
      WHERE id = ${userId} AND deleted_at IS NULL
      LIMIT 1
    `);
  }

  private async getCourseById(courseId: number): Promise<SqlRow | null> {
    return this.queryOne(Prisma.sql`
      SELECT *
      FROM course
      WHERE id = ${courseId} AND deleted_at IS NULL
      LIMIT 1
    `);
  }

  private async isUserEnrolled(userId: number, courseId: number): Promise<boolean> {
    const total = await this.count(Prisma.sql`
      SELECT COUNT(*) AS count
      FROM enrol
      WHERE user_id = ${userId}
        AND course_id = ${courseId}
        AND deleted_at IS NULL
    `);

    return total > 0;
  }

  private async averageRatingByCourse(courseId: number): Promise<string> {
    const row = await this.queryOne(Prisma.sql`
      SELECT AVG(rating) AS average_rating
      FROM review
      WHERE course_id = ${courseId}
        AND rating IS NOT NULL
        AND deleted_at IS NULL
    `);

    const average = toDbNumber(row?.average_rating);
    return average.toFixed(2);
  }

  private async totalReviewsByCourse(courseId: number): Promise<number> {
    return this.count(Prisma.sql`
      SELECT COUNT(*) AS count
      FROM review
      WHERE course_id = ${courseId}
        AND deleted_at IS NULL
    `);
  }

  private async ratingDistributionByCourse(courseId: number): Promise<Record<string, number>> {
    const rows = await this.queryMany(Prisma.sql`
      SELECT rating, COUNT(*) AS rating_count
      FROM review
      WHERE course_id = ${courseId}
        AND rating IS NOT NULL
        AND deleted_at IS NULL
      GROUP BY rating
    `);

    return toRatingDistribution(rows);
  }

  private async getCourseLessonIds(courseId: number): Promise<number[]> {
    const rows = await this.queryMany(Prisma.sql`
      SELECT id
      FROM lesson
      WHERE course_id = ${courseId}
        AND deleted_at IS NULL
      ORDER BY id ASC
    `);

    return rows.map((row) => Math.trunc(toDbNumber(row.id))).filter((id) => id > 0);
  }

  private async getSubjectLessonIds(subjectId: number): Promise<number[]> {
    const rows = await this.queryMany(Prisma.sql`
      SELECT id
      FROM lesson
      WHERE subject_id = ${subjectId}
        AND deleted_at IS NULL
      ORDER BY id ASC
    `);

    return rows.map((row) => Math.trunc(toDbNumber(row.id))).filter((id) => id > 0);
  }

  private async getLessonFilesForLesson(lessonId: number): Promise<SqlRow[]> {
    return this.queryMany(Prisma.sql`
      SELECT *
      FROM lesson_files
      WHERE lesson_id = ${lessonId}
        AND deleted_at IS NULL
      ORDER BY COALESCE("order", 0) ASC, id ASC
    `);
  }

  private async getFileProgress(userId: number, lessonFileId: number, lessonType: string): Promise<number> {
    if (lessonType === 'youtube_video' || lessonType === 'vimeo_video' || lessonType === 'audio') {
      const progressRow = await this.queryOne(Prisma.sql`
        SELECT total_duration, user_progress, status
        FROM video_progress_status
        WHERE user_id = ${userId}
          AND lesson_file_id = ${lessonFileId}
          AND deleted_at IS NULL
        ORDER BY id DESC
        LIMIT 1
      `);

      if (!progressRow) {
        return 0;
      }

      if (toDbNumber(progressRow.status) === 1) {
        return 100;
      }

      const totalDuration = parseTimeToSeconds(toStringValue(progressRow.total_duration));
      const userProgress = parseTimeToSeconds(toStringValue(progressRow.user_progress));
      if (totalDuration <= 0) {
        return 0;
      }

      return Math.min(100, Math.round((userProgress / totalDuration) * 100));
    }

    if (lessonType === 'document' || lessonType === 'article') {
      const completed = await this.count(Prisma.sql`
        SELECT COUNT(*) AS count
        FROM material_progress
        WHERE user_id = ${userId}
          AND lesson_file_id = ${lessonFileId}
          AND deleted_at IS NULL
      `);
      return completed > 0 ? 100 : 0;
    }

    if (lessonType === 'quiz') {
      const completed = await this.count(Prisma.sql`
        SELECT COUNT(*) AS count
        FROM practice_attempt
        WHERE user_id = ${userId}
          AND lesson_file_id = ${lessonFileId}
          AND submit_status = 1
          AND deleted_at IS NULL
      `);

      return completed > 0 ? 100 : 0;
    }

    return 0;
  }

  private async getCompletedFilesForLesson(
    lessonId: number,
    userId: number,
    courseId?: number,
  ): Promise<number> {
    const lessonFiles = await this.getLessonFilesForLesson(lessonId);
    if (lessonFiles.length === 0) {
      return 0;
    }

    const videoIds: number[] = [];
    const materialIds: number[] = [];
    const quizIds: number[] = [];

    for (const file of lessonFiles) {
      const fileId = Math.trunc(toDbNumber(file.id));
      const attachmentType = toStringValue(file.attachment_type).trim().toLowerCase();

      if (attachmentType === 'url' || attachmentType === 'audio') {
        videoIds.push(fileId);
      }

      if (attachmentType === 'pdf' || attachmentType === 'article') {
        materialIds.push(fileId);
      }

      if (attachmentType === 'quiz') {
        quizIds.push(fileId);
      }
    }

    let videoCompleted = 0;
    if (videoIds.length > 0) {
      const courseFilter = typeof courseId === 'number' && courseId > 0
        ? Prisma.sql`AND course_id = ${courseId}`
        : Prisma.empty;

      videoCompleted = await this.count(Prisma.sql`
        SELECT COUNT(DISTINCT lesson_file_id) AS count
        FROM video_progress_status
        WHERE user_id = ${userId}
          AND status = 1
          AND lesson_file_id IN (${Prisma.join(videoIds)})
          ${courseFilter}
          AND deleted_at IS NULL
      `);
    }

    let materialCompleted = 0;
    if (materialIds.length > 0) {
      materialCompleted = await this.count(Prisma.sql`
        SELECT COUNT(DISTINCT lesson_file_id) AS count
        FROM material_progress
        WHERE user_id = ${userId}
          AND lesson_file_id IN (${Prisma.join(materialIds)})
          AND deleted_at IS NULL
      `);
    }

    let quizCompleted = 0;
    if (quizIds.length > 0) {
      quizCompleted = await this.count(Prisma.sql`
        SELECT COUNT(DISTINCT lesson_file_id) AS count
        FROM practice_attempt
        WHERE user_id = ${userId}
          AND submit_status = 1
          AND lesson_file_id IN (${Prisma.join(quizIds)})
          AND deleted_at IS NULL
      `);
    }

    return videoCompleted + materialCompleted + quizCompleted;
  }

  private async getUserPurchaseStatus(userId: number, courseId: number): Promise<'on' | 'off'> {
    const user = await this.getUserById(userId);
    if (!user) {
      return 'off';
    }

    if (toDbNumber(user.role_id) === 3) {
      return 'on';
    }

    if (toDbNumber(user.premium) === 1) {
      return 'on';
    }

    const course = await this.getCourseById(courseId);
    if (!course) {
      return 'off';
    }

    if (toDbNumber(course.is_free_course) === 1) {
      return 'on';
    }

    const today = new Date().toISOString().slice(0, 10);
    const activePaymentCount = await this.count(Prisma.sql`
      SELECT COUNT(*) AS count
      FROM payment_info
      WHERE user_id = ${userId}
        AND course_id = ${courseId}
        AND deleted_at IS NULL
        AND expiry_date IS NOT NULL
        AND date(expiry_date) >= ${today}
    `);

    return activePaymentCount > 0 ? 'on' : 'off';
  }

  private resolveLessonType(file: SqlRow): string {
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
    file: SqlRow,
    lessonId: number,
    userId: number,
    courseId: number,
  ): Promise<Record<string, unknown>> {
    const fileId = Math.trunc(toDbNumber(file.id));
    const resolvedType = this.resolveLessonType(file);
    const progress = await this.getFileProgress(userId, fileId, resolvedType);

    const quizCount = await this.count(Prisma.sql`
      SELECT COUNT(*) AS count
      FROM quiz
      WHERE lesson_file_id = ${fileId}
        AND deleted_at IS NULL
    `);

    const videoFiles = await this.queryMany(Prisma.sql`
      SELECT id, quality, rendition, height, width, type, link, fps, size, public_name, size_short, download_link
      FROM vimeo_videolinks
      WHERE lesson_file_id = ${fileId}
        AND deleted_at IS NULL
      ORDER BY id ASC
    `);

    const downloadUrl = toNullableString(file.download_url);
    const attachmentType = toStringValue(file.attachment_type);

    return {
      id: fileId,
      sub_title: toStringValue(file.sub_title),
      title: toStringValue(file.title),
      lesson_id: lessonId,
      parent_file_id: toDbNumber(file.parent_file_id),
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
    userId: number,
    courseId = 0,
    subjectId = 0,
  ): Promise<{
    progress: number;
    totalVideos: number;
    completedVideos: number;
    totalMaterials: number;
    completedMaterials: number;
    totalPractice: number;
    attemptedPractices: number;
  }> {
    const lessonIds = subjectId > 0 ? await this.getSubjectLessonIds(subjectId) : await this.getCourseLessonIds(courseId);

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

    const lessonFiles = await this.queryMany(Prisma.sql`
      SELECT id, lesson_type, attachment_type
      FROM lesson_files
      WHERE lesson_id IN (${Prisma.join(lessonIds)})
        AND deleted_at IS NULL
    `);

    const videoIds: number[] = [];
    const materialIds: number[] = [];

    for (const lessonFile of lessonFiles) {
      const fileId = Math.trunc(toDbNumber(lessonFile.id));
      const attachmentType = toStringValue(lessonFile.attachment_type).trim().toLowerCase();
      const lessonType = toStringValue(lessonFile.lesson_type).trim().toLowerCase();

      if (lessonType === 'video') {
        videoIds.push(fileId);
      }

      if (attachmentType === 'pdf' || attachmentType === 'article') {
        materialIds.push(fileId);
      }
    }

    const totalVideos = videoIds.length;
    const totalMaterials = materialIds.length;

    const completedVideos = videoIds.length === 0
      ? 0
      : await this.count(Prisma.sql`
          SELECT COUNT(DISTINCT lesson_file_id) AS count
          FROM video_progress_status
          WHERE user_id = ${userId}
            AND status = 1
            AND lesson_file_id IN (${Prisma.join(videoIds)})
            AND deleted_at IS NULL
        `);

    const completedMaterials = materialIds.length === 0
      ? 0
      : await this.count(Prisma.sql`
          SELECT COUNT(DISTINCT lesson_file_id) AS count
          FROM material_progress
          WHERE user_id = ${userId}
            AND lesson_file_id IN (${Prisma.join(materialIds)})
            AND deleted_at IS NULL
        `);

    const totalPractice = await this.count(Prisma.sql`
      SELECT COUNT(*) AS count
      FROM practice_attempt
      WHERE user_id = ${userId}
        AND lesson_id IN (${Prisma.join(lessonIds)})
        AND deleted_at IS NULL
    `);

    const attemptedPractices = await this.count(Prisma.sql`
      SELECT COUNT(DISTINCT id) AS count
      FROM practice_attempt
      WHERE user_id = ${userId}
        AND lesson_id IN (${Prisma.join(lessonIds)})
        AND submit_status = 1
        AND deleted_at IS NULL
    `);

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

  private async buildCourseData(course: SqlRow, userId: number): Promise<Record<string, unknown>> {
    const courseId = Math.trunc(toDbNumber(course.id));
    const description = stripHtml(toStringValue(course.description));

    const enrolments = await this.count(Prisma.sql`
      SELECT COUNT(*) AS count
      FROM enrol
      WHERE course_id = ${courseId}
        AND deleted_at IS NULL
    `);

    const lessonsCount = await this.count(Prisma.sql`
      SELECT COUNT(*) AS count
      FROM lesson
      WHERE course_id = ${courseId}
        AND deleted_at IS NULL
    `);

    const subjectCount = await this.count(Prisma.sql`
      SELECT COUNT(*) AS count
      FROM subject
      WHERE course_id = ${courseId}
        AND deleted_at IS NULL
    `);

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
    const rows = await this.queryMany(Prisma.sql`
      SELECT id, code, name, parent, slug, description, short_description, video_type, video_url, font_awesome_class, thumbnail, category_icon
      FROM category
      WHERE deleted_at IS NULL
      ORDER BY id ASC
    `);

    return rows.map((row) => ({
      id: Math.trunc(toDbNumber(row.id)),
      code: toStringValue(row.code),
      name: toStringValue(row.name),
      parent: toStringValue(row.parent),
      slug: toStringValue(row.slug),
      description: toStringValue(row.description),
      short_description: toStringValue(row.short_description),
      video_type: toStringValue(row.video_type),
      video_url: toStringValue(row.video_url),
      font_awesome_class: toStringValue(row.font_awesome_class),
      thumbnail: this.toFileUrl(row.thumbnail),
      icon: this.toFileUrl(row.category_icon),
    }));
  }

  async getCategoryDetails(categoryId: number): Promise<Record<string, unknown> | null> {
    const category = await this.queryOne(Prisma.sql`
      SELECT id, name, description, thumbnail, video_url
      FROM category
      WHERE id = ${categoryId}
        AND deleted_at IS NULL
      LIMIT 1
    `);

    if (!category) {
      return null;
    }

    const courses = await this.queryMany(Prisma.sql`
      SELECT *
      FROM course
      WHERE category_id = ${categoryId}
        AND deleted_at IS NULL
      ORDER BY id ASC
    `);

    let enrolCount = 0;
    const courseData: Record<string, unknown>[] = [];

    for (const course of courses) {
      const courseRow = { ...course };
      const courseId = Math.trunc(toDbNumber(courseRow.id));
      const courseEnrolCount = await this.count(Prisma.sql`
        SELECT COUNT(*) AS count
        FROM enrol
        WHERE course_id = ${courseId}
          AND deleted_at IS NULL
      `);
      enrolCount += courseEnrolCount;

      courseData.push({
        ...courseRow,
        thumbnail: this.toFileUrl(courseRow.thumbnail),
        course_icon: this.toFileUrl(courseRow.course_icon),
        total_reviews: await this.totalReviewsByCourse(courseId),
        total_rating: await this.averageRatingByCourse(courseId),
      });
    }

    return {
      category_name: toStringValue(category.name),
      category_description: toStringValue(category.description),
      thumbnail: this.toFileUrl(category.thumbnail),
      video_url: toStringValue(category.video_url),
      enroll_count: enrolCount,
      courses: courseData,
    };
  }

  async listCourses(userId: number): Promise<Record<string, unknown>[]> {
    const rows = await this.queryMany(Prisma.sql`
      SELECT *
      FROM course
      WHERE deleted_at IS NULL
      ORDER BY id ASC
    `);

    const result: Record<string, unknown>[] = [];
    for (const row of rows) {
      result.push(await this.buildCourseData(row, userId));
    }

    return result;
  }

  async getCourseDetails(userId: number, courseId: number): Promise<Record<string, unknown> | null> {
    const course = await this.getCourseById(courseId);
    if (!course) {
      return null;
    }

    const user = await this.getUserById(userId);
    const courseData = await this.buildCourseData(course, userId);

    const subjects = await this.queryMany(Prisma.sql`
      SELECT id, title, thumbnail
      FROM subject
      WHERE course_id = ${courseId}
        AND deleted_at IS NULL
      ORDER BY COALESCE("order", 0) ASC, id ASC
    `);

    const subjectData = subjects.map((subject) => ({
      id: Math.trunc(toDbNumber(subject.id)),
      title: toStringValue(subject.title),
      thumbnail: this.toFileUrl(subject.thumbnail),
    }));

    const demoVideos = await this.queryMany(Prisma.sql`
      SELECT id, title, video_type, video_url, thumbnail
      FROM demo_video
      WHERE course_id = ${courseId}
        AND deleted_at IS NULL
      ORDER BY COALESCE("order", 0) ASC, id ASC
    `);

    const demoVideoData = demoVideos.map((video) => ({
      id: Math.trunc(toDbNumber(video.id)),
      title: toStringValue(video.title),
      video_type: toStringValue(video.video_type),
      video_url: toStringValue(video.video_url),
      thumbnail: this.toFileUrl(video.thumbnail),
    }));

    const reviews = await this.queryMany(Prisma.sql`
      SELECT review.id, review.rating, review.user_id, review.course_id, review.review, review.created_at AS date, course.title AS course, users.name AS user, users.image AS image
      FROM review
      LEFT JOIN course ON course.id = review.course_id
      LEFT JOIN users ON users.id = review.user_id
      WHERE review.course_id = ${courseId}
        AND review.deleted_at IS NULL
      ORDER BY review.id ASC
    `);

    const reviewData: Record<string, unknown>[] = [];
    for (const review of reviews) {
      const reviewId = Math.trunc(toDbNumber(review.id));
      const reviewLikeCount = await this.count(Prisma.sql`
        SELECT COUNT(*) AS count
        FROM review_like
        WHERE review_id = ${reviewId}
          AND deleted_at IS NULL
      `);

      const isLikedByUser = await this.count(Prisma.sql`
        SELECT COUNT(*) AS count
        FROM review_like
        WHERE review_id = ${reviewId}
          AND user_id = ${userId}
          AND deleted_at IS NULL
      `);

      reviewData.push({
        id: reviewId,
        rating: toDbNumber(review.rating),
        user_id: Math.trunc(toDbNumber(review.user_id)),
        course_id: Math.trunc(toDbNumber(review.course_id)),
        review: toStringValue(review.review),
        date: formatLegacyDate(review.date),
        course: toStringValue(review.course),
        user: toStringValue(review.user),
        like_count: reviewLikeCount,
        is_liked: isLikedByUser > 0 ? 1 : 0,
        image: this.toFileUrl(review.image) || `${this.appBaseUrl}/uploads/dummy_user.jpg`,
      });
    }

    const instructor = await this.queryOne(Prisma.sql`
      SELECT users.id AS instructor_id, users.name, users.image
      FROM users
      JOIN instructor_enrol ON instructor_enrol.instructor_id = users.id
      WHERE instructor_enrol.course_id = ${courseId}
        AND instructor_enrol.deleted_at IS NULL
      LIMIT 1
    `);

    const instructorData = instructor
      ? {
          id: Math.trunc(toDbNumber(instructor.instructor_id)),
          name: toStringValue(instructor.name),
          image: this.toFileUrl(instructor.image) || `${this.appBaseUrl}/uploads/dummy_user.jpg`,
        }
      : {};

    const isEnrolled = await this.isUserEnrolled(userId, courseId);
    const purchaseStatus = await this.getUserPurchaseStatus(userId, courseId);

    return {
      user_data: {
        user_id: userId,
        student_id: toStringValue(user?.student_id),
        user_name: toStringValue(user?.name),
        role_id: toDbNumber(user?.role_id),
        course_id: toDbNumber(user?.course_id),
        user_email: toStringValue(user?.user_email || user?.email),
        user_phone: toStringValue(user?.phone),
        device_id: toStringValue(user?.device_id),
        status: toDbNumber(user?.status),
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

  private async getCohortIdForSubject(userId: number, subject: SqlRow): Promise<number | null> {
    const masterSubjectId = toNullableInteger(subject.master_subject_id) ?? Math.trunc(toDbNumber(subject.id));

    const cohortRow = await this.queryOne(Prisma.sql`
      SELECT cs.cohort_id
      FROM cohort_students cs
      JOIN cohorts c ON c.id = cs.cohort_id AND c.deleted_at IS NULL
      JOIN subject s ON s.id = c.subject_id AND s.deleted_at IS NULL
      WHERE cs.user_id = ${userId}
        AND cs.deleted_at IS NULL
        AND COALESCE(s.master_subject_id, s.id) = ${masterSubjectId}
      LIMIT 1
    `);

    const cohortId = toNullableInteger(cohortRow?.cohort_id);
    return cohortId;
  }

  async getSubjects(userId: number, courseId: number): Promise<Record<string, unknown>[]> {
    const subjects = await this.queryMany(Prisma.sql`
      SELECT id, master_subject_id, title, description, thumbnail
      FROM subject
      WHERE course_id = ${courseId}
        AND deleted_at IS NULL
      ORDER BY COALESCE("order", 0) ASC, id ASC
    `);

    const subjectData: Record<string, unknown>[] = [];

    for (const subject of subjects) {
      const subjectId = Math.trunc(toDbNumber(subject.id));
      const masterSubjectId = toNullableInteger(subject.master_subject_id) ?? subjectId;
      const cohortId = await this.getCohortIdForSubject(userId, subject);
      const totalLessons = await this.count(Prisma.sql`
        SELECT COUNT(*) AS count
        FROM lesson
        WHERE subject_id = ${masterSubjectId}
          AND deleted_at IS NULL
      `);
      const progress = await this.calculateUserProgress(userId, courseId, masterSubjectId);

      subjectData.push({
        id: subjectId,
        master_subject_id: masterSubjectId,
        title: toStringValue(subject.title),
        description: toStringValue(subject.description),
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
    lesson: SqlRow,
    userId: number,
    purchaseStatus: 'on' | 'off',
    lessonIndex: number,
    courseId: number,
  ): Promise<Record<string, unknown>> {
    const lessonId = Math.trunc(toDbNumber(lesson.id));
    const lessonFiles = await this.getLessonFilesForLesson(lessonId);

    const lessonFileData: Record<string, unknown>[] = [];
    for (const lessonFile of lessonFiles) {
      lessonFileData.push(await this.buildLessonFileData(lessonFile, lessonId, userId, courseId));
    }

    const totalLessonFiles = lessonFiles.length;
    const completedLessonFiles = await this.getCompletedFilesForLesson(lessonId, userId, courseId);
    const completedPercentage = totalLessonFiles > 0
      ? Math.round((completedLessonFiles / totalLessonFiles) * 100)
      : 0;

    const isCompleted = totalLessonFiles > 0
      ? completedLessonFiles >= totalLessonFiles
      : lessonIndex === 0;

    const videoCount = await this.count(Prisma.sql`
      SELECT COUNT(*) AS count
      FROM lesson_files
      WHERE lesson_id = ${lessonId}
        AND lesson_type = 'video'
        AND deleted_at IS NULL
    `);

    return {
      id: lessonId,
      title: toStringValue(lesson.title),
      course_id: Math.trunc(toDbNumber(lesson.course_id)),
      subject_id: Math.trunc(toDbNumber(lesson.subject_id)),
      summary: toStringValue(lesson.summary),
      free: toStringValue(lesson.free) === 'on' ? 'on' : purchaseStatus,
      thumbnail: this.toFileUrl(lesson.thumbnail),
      video_count: videoCount,
      practice_link: `${this.appBaseUrl}/exam/practice_web_view/${userId}/${Math.trunc(toDbNumber(lesson.course_id))}`,
      lesson_files_count: totalLessonFiles,
      completed_lesson_files: completedLessonFiles,
      completed_percentage: completedPercentage,
      lock: lessonIndex === 0 ? 0 : 1,
      lock_message: lessonIndex === 0 ? '' : 'Please complete the previous lesson',
      is_completed: isCompleted ? 1 : 0,
      lesson_files: lessonFileData,
    };
  }

  async getLessons(userId: number, subjectId: number): Promise<Record<string, unknown>[]> {
    const subject = await this.queryOne(Prisma.sql`
      SELECT id, course_id, master_subject_id
      FROM subject
      WHERE id = ${subjectId}
        AND deleted_at IS NULL
      LIMIT 1
    `);

    if (!subject) {
      return [];
    }

    const courseId = Math.trunc(toDbNumber(subject.course_id));
    const lessonSubjectId = toNullableInteger(subject.master_subject_id) ?? subjectId;

    const lessons = await this.queryMany(Prisma.sql`
      SELECT *
      FROM lesson
      WHERE subject_id = ${lessonSubjectId}
        AND deleted_at IS NULL
      ORDER BY COALESCE("order", 0) ASC, id ASC
    `);

    const lessonsData: Record<string, unknown>[] = [];

    for (let index = 0; index < lessons.length; index += 1) {
      const lesson = lessons[index];
      if (!lesson) {
        continue;
      }

      const lessonCourseId = Math.trunc(toDbNumber(lesson.course_id));
      const purchaseStatus = await this.getUserPurchaseStatus(userId, lessonCourseId);
      lessonsData.push(await this.buildLessonData(lesson, userId, purchaseStatus, index, courseId));
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

  async getLessonIndex(userId: number, subjectId: number): Promise<Record<string, unknown>[]> {
    const lessons = await this.queryMany(Prisma.sql`
      SELECT *
      FROM lesson
      WHERE subject_id = ${subjectId}
        AND deleted_at IS NULL
      ORDER BY COALESCE("order", 0) ASC, id ASC
    `);

    const lessonData: Record<string, unknown>[] = [];

    for (let index = 0; index < lessons.length; index += 1) {
      const lesson = lessons[index];
      if (!lesson) {
        continue;
      }

      const purchaseStatus = await this.getUserPurchaseStatus(userId, Math.trunc(toDbNumber(lesson.course_id)));
      lessonData.push(
        await this.buildLessonData(
          lesson,
          userId,
          purchaseStatus,
          index,
          Math.trunc(toDbNumber(lesson.course_id)),
        ),
      );
    }

    return lessonData;
  }

  async getLessonFileGroupedIndex(userId: number, lessonId: number): Promise<Record<string, unknown>[]> {
    const lesson = await this.queryOne(Prisma.sql`
      SELECT id, course_id
      FROM lesson
      WHERE id = ${lessonId}
        AND deleted_at IS NULL
      LIMIT 1
    `);

    if (!lesson) {
      return [];
    }

    const courseId = Math.trunc(toDbNumber(lesson.course_id));
    const lessonFiles = await this.getLessonFilesForLesson(lessonId);
    const videosById = new Map<number, Record<string, unknown>>();
    const pendingRelatedFiles: SqlRow[] = [];

    for (const lessonFile of lessonFiles) {
      const fileId = Math.trunc(toDbNumber(lessonFile.id));
      const attachmentType = normalizeAttachmentType(toStringValue(lessonFile.attachment_type).toLowerCase());

      if (attachmentType === 'video') {
        const fileData = await this.buildLessonFileData(lessonFile, lessonId, userId, courseId);
        fileData.sub_title = 'Video';
        fileData.related_files = [];
        videosById.set(fileId, fileData);
      } else {
        pendingRelatedFiles.push(lessonFile);
      }
    }

    for (const relatedFile of pendingRelatedFiles) {
      const parentFileId = toNullableInteger(relatedFile.parent_file_id);
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

  private async buildLessonVideoData(video: SqlRow, userId: number): Promise<Record<string, unknown>> {
    const lessonId = Math.trunc(toDbNumber(video.lesson_id));
    const lesson = await this.queryOne(Prisma.sql`
      SELECT id, course_id
      FROM lesson
      WHERE id = ${lessonId}
        AND deleted_at IS NULL
      LIMIT 1
    `);

    if (!lesson) {
      return {};
    }

    const courseId = Math.trunc(toDbNumber(lesson.course_id));
    const purchaseStatus = await this.getUserPurchaseStatus(userId, courseId);

    const videos = await this.queryMany(Prisma.sql`
      SELECT id
      FROM lesson_files
      WHERE lesson_id = ${lessonId}
        AND attachment_type = 'url'
        AND deleted_at IS NULL
      ORDER BY COALESCE("order", 0) ASC, id ASC
    `);

    const orderedVideoIds = videos.map((entry) => Math.trunc(toDbNumber(entry.id)));
    const currentVideoId = Math.trunc(toDbNumber(video.id));
    const currentVideoIndex = orderedVideoIds.indexOf(currentVideoId);

    let free = purchaseStatus;
    let lockMessage = '';

    if (currentVideoIndex > 0) {
      const previousVideoId = orderedVideoIds[currentVideoIndex - 1] ?? 0;
      const previousReportCount = await this.count(Prisma.sql`
        SELECT COUNT(*) AS count
        FROM lesson_files_report
        WHERE lesson_file_id = ${previousVideoId}
          AND user_id = ${userId}
          AND deleted_at IS NULL
      `);

      if (previousReportCount > 0) {
        free = 'on';
      } else {
        free = 'off';
        lockMessage = 'Please upload report';
      }
    }

    const attachment = await this.queryOne(Prisma.sql`
      SELECT attachment
      FROM lesson_files
      WHERE lesson_id = ${lessonId}
        AND attachment_type = 'pdf'
        AND deleted_at IS NULL
      ORDER BY id ASC
      LIMIT 1
    `);

    const report = await this.queryOne(Prisma.sql`
      SELECT report_file, file_type
      FROM lesson_files_report
      WHERE lesson_file_id = ${currentVideoId}
        AND user_id = ${userId}
        AND deleted_at IS NULL
      ORDER BY id DESC
      LIMIT 1
    `);

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
      file_type: toStringValue(report?.file_type),
      lock_message: lockMessage,
    };
  }

  async getLessonVideos(userId: number, lessonId: number): Promise<Record<string, unknown>[]> {
    const videos = await this.queryMany(Prisma.sql`
      SELECT *
      FROM lesson_files
      WHERE lesson_id = ${lessonId}
        AND attachment_type = 'url'
        AND deleted_at IS NULL
      ORDER BY COALESCE("order", 0) ASC, id ASC
    `);

    const response: Record<string, unknown>[] = [];
    for (const video of videos) {
      response.push(await this.buildLessonVideoData(video, userId));
    }

    return response;
  }

  private async buildLessonMaterialData(material: SqlRow, userId: number): Promise<Record<string, unknown>> {
    const lessonId = Math.trunc(toDbNumber(material.lesson_id));
    const lesson = await this.queryOne(Prisma.sql`
      SELECT course_id
      FROM lesson
      WHERE id = ${lessonId}
        AND deleted_at IS NULL
      LIMIT 1
    `);

    const courseId = Math.trunc(toDbNumber(lesson?.course_id));
    const purchaseStatus = await this.getUserPurchaseStatus(userId, courseId);

    return {
      id: Math.trunc(toDbNumber(material.id)),
      title: toStringValue(material.title),
      lesson_id: lessonId,
      attachment: this.toFileUrl(material.attachment),
      thumbnail: this.toFileUrl(material.thumbnail),
      lesson_type: toStringValue(material.lesson_type),
      attachment_type: toStringValue(material.attachment_type),
      free: toStringValue(material.free) === 'on' ? 'on' : purchaseStatus,
    };
  }

  async getLessonMaterials(userId: number, filter: LessonMaterialFilter): Promise<Record<string, unknown>[]> {
    const lessonId = filter.lessonId ?? 0;
    const subjectId = filter.subjectId ?? 0;
    const courseId = filter.courseId ?? 0;

    let lessonIds: number[] = [];
    if (lessonId > 0) {
      lessonIds = [lessonId];
    } else if (subjectId > 0) {
      lessonIds = await this.getSubjectLessonIds(subjectId);
    } else if (courseId > 0) {
      lessonIds = await this.getCourseLessonIds(courseId);
    }

    if (lessonIds.length === 0) {
      return [];
    }

    const materials = await this.queryMany(Prisma.sql`
      SELECT *
      FROM lesson_files
      WHERE lesson_id IN (${Prisma.join(lessonIds)})
        AND attachment_type = 'pdf'
        AND deleted_at IS NULL
      ORDER BY COALESCE("order", 0) ASC, id ASC
    `);

    const materialData: Record<string, unknown>[] = [];
    for (const material of materials) {
      materialData.push(await this.buildLessonMaterialData(material, userId));
    }

    return materialData;
  }

  private async resolveCourseIdForLessonFile(lessonFileId: number): Promise<number | null> {
    const row = await this.queryOne(Prisma.sql`
      SELECT lesson.course_id
      FROM lesson_files
      JOIN lesson ON lesson.id = lesson_files.lesson_id
      WHERE lesson_files.id = ${lessonFileId}
        AND lesson_files.deleted_at IS NULL
        AND lesson.deleted_at IS NULL
      LIMIT 1
    `);

    const courseId = toNullableInteger(row?.course_id);
    return courseId;
  }

  async saveVideoProgress(userId: number, input: SaveVideoProgressInput): Promise<void> {
    const lessonFileId = input.lessonFileId;
    if (lessonFileId <= 0) {
      return;
    }

    let courseId = input.courseId ?? 0;
    if (courseId <= 0) {
      const resolvedCourseId = await this.resolveCourseIdForLessonFile(lessonFileId);
      courseId = resolvedCourseId ?? 0;
    }

    if (courseId <= 0) {
      return;
    }

    const now = new Date().toISOString();

    const existingProgress = await this.queryOne(Prisma.sql`
      SELECT id, user_progress
      FROM video_progress_status
      WHERE user_id = ${userId}
        AND lesson_file_id = ${lessonFileId}
        AND course_id = ${courseId}
        AND deleted_at IS NULL
      ORDER BY id DESC
      LIMIT 1
    `);

    const requestedProgressSeconds = parseTimeToSeconds(input.userProgress);
    const totalDurationSeconds = parseTimeToSeconds(input.lessonDuration);
    const graceSeconds = 5;
    const completed = requestedProgressSeconds + graceSeconds >= totalDurationSeconds;

    if (existingProgress) {
      const existingProgressSeconds = parseTimeToSeconds(toStringValue(existingProgress.user_progress));
      if (requestedProgressSeconds + graceSeconds > existingProgressSeconds) {
        await this.prisma.$executeRaw(Prisma.sql`
          UPDATE video_progress_status
          SET total_duration = ${input.lessonDuration},
              user_progress = ${input.userProgress},
              status = ${completed ? 1 : 0},
              updated_by = ${userId},
              updated_at = ${now}
          WHERE id = ${Math.trunc(toDbNumber(existingProgress.id))}
        `);
      }

      return;
    }

    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO video_progress_status (
        user_id,
        course_id,
        lesson_file_id,
        total_duration,
        user_progress,
        status,
        created_by,
        created_at
      ) VALUES (
        ${userId},
        ${courseId},
        ${lessonFileId},
        ${input.lessonDuration},
        ${input.userProgress},
        ${completed ? 1 : 0},
        ${userId},
        ${now}
      )
    `);
  }

  async saveMaterialProgress(userId: number, input: SaveMaterialProgressInput): Promise<void> {
    if (input.lessonFileId <= 0 || input.courseId <= 0) {
      return;
    }

    const existing = await this.count(Prisma.sql`
      SELECT COUNT(*) AS count
      FROM material_progress
      WHERE user_id = ${userId}
        AND lesson_file_id = ${input.lessonFileId}
        AND course_id = ${input.courseId}
        AND deleted_at IS NULL
    `);

    if (existing > 0) {
      return;
    }

    const now = new Date().toISOString();

    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO material_progress (
        user_id,
        course_id,
        lesson_file_id,
        attachment_type,
        created_by,
        created_at
      ) VALUES (
        ${userId},
        ${input.courseId},
        ${input.lessonFileId},
        ${input.attachmentType},
        ${userId},
        ${now}
      )
    `);
  }

  async getStreakData(userId: number, fromDate?: string, toDate?: string): Promise<Record<string, number> | null> {
    const user = await this.getUserById(userId);
    if (!user) {
      return null;
    }

    const courseId = Math.trunc(toDbNumber(user.course_id));
    if (courseId <= 0) {
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

    const lessonVideoRows = await this.queryMany(Prisma.sql`
      SELECT id
      FROM lesson_files
      WHERE lesson_id IN (${Prisma.join(lessonIds)})
        AND attachment_type = 'url'
        AND deleted_at IS NULL
    `);

    const lessonVideoIds = lessonVideoRows
      .map((row) => Math.trunc(toDbNumber(row.id)))
      .filter((id) => id > 0);

    if (lessonVideoIds.length === 0) {
      return {
        total_streak: 0,
        current_streak: 0,
      };
    }

    const from = toDateStringOrFallback(fromDate, DATE_FLOOR);
    const to = toDateStringOrFallback(toDate, DATE_FLOOR);
    const today = new Date().toISOString().slice(0, 10);

    const totalStreakCount = await this.count(Prisma.sql`
      SELECT COUNT(*) AS count
      FROM video_progress_status
      WHERE lesson_file_id IN (${Prisma.join(lessonVideoIds)})
        AND status = 1
        AND deleted_at IS NULL
        AND (
          (date(created_at) >= ${from} OR date(updated_at) >= ${from})
          AND
          (date(created_at) <= ${to} OR date(updated_at) <= ${to})
        )
    `);

    const currentStreakCount = await this.count(Prisma.sql`
      SELECT COUNT(*) AS count
      FROM video_progress_status
      WHERE lesson_file_id IN (${Prisma.join(lessonVideoIds)})
        AND status = 1
        AND deleted_at IS NULL
        AND (
          date(created_at) = ${today}
          OR date(updated_at) = ${today}
        )
    `);

    return {
      total_streak: totalStreakCount * 10,
      current_streak: currentStreakCount * 10,
    };
  }
}
