import { Prisma, type PrismaClient } from '@prisma/client';

import { getPrismaClient } from '../data/prisma-client.js';
import { env } from '../env.js';

type SqlRow = Record<string, unknown>;

const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

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

function toInteger(value: unknown): number {
  return Math.trunc(toDbNumber(value));
}

function toStringValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
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

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&');
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, '');
}

function parseDateParts(value: unknown): { year: number; month: number; day: number } | null {
  const raw = toNullableString(value);
  if (!raw) {
    return null;
  }

  const directMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (directMatch) {
    const year = Number.parseInt(directMatch[1] ?? '0', 10);
    const month = Number.parseInt(directMatch[2] ?? '0', 10);
    const day = Number.parseInt(directMatch[3] ?? '0', 10);

    if (year > 0 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { year, month, day };
    }
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return {
    year: parsed.getFullYear(),
    month: parsed.getMonth() + 1,
    day: parsed.getDate(),
  };
}

function toDateOnly(value: unknown): string {
  const parts = parseDateParts(value);
  if (!parts) {
    return '';
  }

  const year = String(parts.year).padStart(4, '0');
  const month = String(parts.month).padStart(2, '0');
  const day = String(parts.day).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatLegacyDateDmy(value: unknown, separator = '-'): string {
  const parts = parseDateParts(value);
  if (!parts) {
    return '';
  }

  const day = String(parts.day).padStart(2, '0');
  const month = String(parts.month).padStart(2, '0');
  const year = String(parts.year).padStart(4, '0');
  return `${day}${separator}${month}${separator}${year}`;
}

function formatLegacyDateShortMonth(value: unknown): string {
  const parts = parseDateParts(value);
  if (!parts) {
    return '';
  }

  const monthLabel = MONTH_NAMES_SHORT[parts.month - 1] ?? '';
  const day = String(parts.day).padStart(2, '0');
  return `${day} ${monthLabel} ${parts.year}`;
}

function formatLegacyDateDayMonth(value: unknown): string {
  const parts = parseDateParts(value);
  if (!parts) {
    return '';
  }

  const monthLabel = MONTH_NAMES_LONG[parts.month - 1] ?? '';
  const day = String(parts.day).padStart(2, '0');
  return `${day} ${monthLabel}`;
}

function parseTimeParts(value: unknown): { hour: number; minute: number; second: number } | null {
  const raw = toNullableString(value);
  if (!raw) {
    return null;
  }

  const match = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) {
    return null;
  }

  const hour = Number.parseInt(match[1] ?? '0', 10);
  const minute = Number.parseInt(match[2] ?? '0', 10);
  const second = Number.parseInt(match[3] ?? '0', 10);

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) {
    return null;
  }

  return {
    hour,
    minute,
    second,
  };
}

function formatLegacyTime(value: unknown): string {
  const parts = parseTimeParts(value);
  if (!parts) {
    return '';
  }

  const suffix = parts.hour >= 12 ? 'PM' : 'AM';
  const hour12 = parts.hour % 12 || 12;
  const hour = String(hour12).padStart(2, '0');
  const minute = String(parts.minute).padStart(2, '0');
  return `${hour}:${minute} ${suffix}`;
}

function toDateTimeEpoch(dateValue: unknown, timeValue: unknown): number | null {
  const date = toDateOnly(dateValue);
  const timeParts = parseTimeParts(timeValue);
  if (!date || !timeParts) {
    return null;
  }

  const dateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateMatch) {
    return null;
  }

  const year = Number.parseInt(dateMatch[1] ?? '0', 10);
  const month = Number.parseInt(dateMatch[2] ?? '0', 10) - 1;
  const day = Number.parseInt(dateMatch[3] ?? '0', 10);

  const localDate = new Date(
    year,
    month,
    day,
    timeParts.hour,
    timeParts.minute,
    timeParts.second,
    0,
  );

  if (Number.isNaN(localDate.getTime())) {
    return null;
  }

  return localDate.getTime();
}

function parseObjectives(value: unknown): unknown {
  const raw = toNullableString(value);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function normalizeDateInput(value: string | undefined): string {
  const parsed = parseDateParts(value);
  if (!parsed) {
    return toDateOnly(new Date());
  }

  const year = String(parsed.year).padStart(4, '0');
  const month = String(parsed.month).padStart(2, '0');
  const day = String(parsed.day).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface AddReviewInput {
  courseId: number;
  rating: number;
  review: string;
}

export interface RegisterEventInput {
  eventId: number;
  name: string;
  phone: string;
  attendStatus: string;
}

export interface AddEventFeedbackInput {
  eventId: number;
  rating: number;
  review: string;
}

export class EngagementService {
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
    return this.prisma.$queryRaw<SqlRow[]>(sql);
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
    if (userId <= 0) {
      return null;
    }

    return this.queryOne(Prisma.sql`
      SELECT id, name, image, course_id
      FROM users
      WHERE id = ${userId}
        AND deleted_at IS NULL
      LIMIT 1
    `);
  }

  private eventStatus(eventDate: unknown, fromTime: unknown, toTime: unknown): string {
    const now = Date.now();
    const startsAt = toDateTimeEpoch(eventDate, fromTime);
    const endsAt = toDateTimeEpoch(eventDate, toTime);

    if (startsAt !== null && now < startsAt) {
      return `Next Event ${formatLegacyDateDayMonth(eventDate)} ${formatLegacyTime(fromTime)}`;
    }

    if (endsAt !== null && now > endsAt) {
      return 'Expired';
    }

    return 'Live Now';
  }

  private filterEventsByWindow(events: SqlRow[], filter?: string): SqlRow[] {
    if (filter !== 'weekly' && filter !== 'monthly') {
      return events;
    }

    const now = new Date();
    let start = '';
    let end = '';

    if (filter === 'weekly') {
      const startDate = new Date(now);
      startDate.setDate(now.getDate() - now.getDay());
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);

      start = toDateOnly(startDate);
      end = toDateOnly(endDate);
    }

    if (filter === 'monthly') {
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      start = toDateOnly(startDate);
      end = toDateOnly(endDate);
    }

    if (!start || !end) {
      return events;
    }

    return events.filter((eventRow) => {
      const date = toDateOnly(eventRow.event_date);
      return date >= start && date <= end;
    });
  }

  private async toEventPayload(userId: number, eventRow: SqlRow): Promise<Record<string, unknown>> {
    const eventId = toInteger(eventRow.id);
    const instructorId = toInteger(eventRow.instructor_id);

    const instructor =
      instructorId > 0
        ? await this.queryOne(Prisma.sql`
            SELECT id, name, image
            FROM users
            WHERE id = ${instructorId}
              AND deleted_at IS NULL
            LIMIT 1
          `)
        : null;

    const recordings = await this.queryMany(Prisma.sql`
      SELECT id, title, video_url, duration, summary
      FROM recorded_events
      WHERE event_id = ${eventId}
        AND deleted_at IS NULL
      ORDER BY id ASC
    `);

    const isRegistered = await this.count(Prisma.sql`
      SELECT COUNT(*) AS count
      FROM event_registration
      WHERE event_id = ${eventId}
        AND user_id = ${userId}
        AND deleted_at IS NULL
    `);

    return {
      id: eventId,
      title: toStringValue(eventRow.title),
      description: toStringValue(eventRow.description),
      date: formatLegacyDateDmy(eventRow.event_date),
      formatted_date: formatLegacyDateShortMonth(eventRow.event_date),
      time: `${formatLegacyTime(eventRow.from_time)} - ${formatLegacyTime(eventRow.to_time)}`,
      image: this.toFileUrl(eventRow.image) || `${this.appBaseUrl}/uploads/dummy.jpg`,
      objectives: parseObjectives(eventRow.objectives),
      duration: toStringValue(eventRow.duration),
      recording_status: toInteger(eventRow.is_recording_available) === 1 ? 'Available' : 'Not available',
      recordings,
      status: this.eventStatus(eventRow.event_date, eventRow.from_time, eventRow.to_time),
      is_registered: isRegistered,
      instructor_name: toStringValue(instructor?.name),
      instructor_image: this.toFileUrl(instructor?.image) || `${this.appBaseUrl}/uploads/dummy.jpg`,
    };
  }

  async listFeed(userId: number): Promise<{ feed: Record<string, unknown>[] }> {
    const user = await this.getUserById(userId);
    if (!user) {
      return {
        feed: [],
      };
    }

    const courseId = toInteger(user.course_id);

    const rows = await this.queryMany(Prisma.sql`
      SELECT
        feed.id,
        feed.title,
        feed.content,
        feed.feed_category_id,
        feed.course_id,
        feed.image,
        feed.created_at AS date,
        feed.instructor_id,
        users.name AS instructor_name,
        users.image AS instructor_image
      FROM feed
      LEFT JOIN users ON users.id = feed.instructor_id
        AND users.deleted_at IS NULL
      WHERE feed.deleted_at IS NULL
        AND (feed.course_id = ${courseId} OR feed.course_id = 0)
      ORDER BY feed.id ASC
    `);

    const output: Record<string, unknown>[] = [];

    for (const row of rows) {
      const feedId = toInteger(row.id);
      const isLiked = await this.count(Prisma.sql`
        SELECT COUNT(*) AS count
        FROM feed_like
        WHERE feed_id = ${feedId}
          AND user_id = ${userId}
          AND deleted_at IS NULL
      `);

      const likes = await this.count(Prisma.sql`
        SELECT COUNT(*) AS count
        FROM feed_like
        WHERE feed_id = ${feedId}
          AND deleted_at IS NULL
      `);

      output.push({
        id: feedId,
        title: toStringValue(row.title),
        content: toStringValue(row.content),
        feed_category_id: toInteger(row.feed_category_id),
        course_id: toInteger(row.course_id),
        image: this.toFileUrl(row.image),
        date: formatLegacyDateDmy(row.date),
        instructor_id: toInteger(row.instructor_id),
        instructor_name: toStringValue(row.instructor_name),
        instructor_image: this.toFileUrl(row.instructor_image) || `${this.appBaseUrl}/uploads/dummy.jpg`,
        is_liked: isLiked > 0 ? 1 : 0,
        likes,
      });
    }

    return {
      feed: output,
    };
  }

  async markFeedWatched(userId: number, feedId: number): Promise<void> {
    if (userId <= 0 || feedId <= 0) {
      return;
    }

    const watched = await this.count(Prisma.sql`
      SELECT COUNT(*) AS count
      FROM feed_watched
      WHERE feed_id = ${feedId}
        AND user_id = ${userId}
        AND deleted_at IS NULL
    `);

    if (watched > 0) {
      return;
    }

    const now = new Date().toISOString();

    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO feed_watched (feed_id, user_id, created_by, created_at)
      VALUES (${feedId}, ${userId}, ${userId}, ${now})
    `);
  }

  async toggleFeedLike(userId: number, feedId: number): Promise<void> {
    if (userId <= 0 || feedId <= 0) {
      return;
    }

    const existing = await this.queryOne(Prisma.sql`
      SELECT id
      FROM feed_like
      WHERE feed_id = ${feedId}
        AND user_id = ${userId}
        AND deleted_at IS NULL
      LIMIT 1
    `);

    const now = new Date().toISOString();

    if (existing) {
      await this.prisma.$executeRaw(Prisma.sql`
        UPDATE feed_like
        SET deleted_at = ${now},
            deleted_by = ${userId}
        WHERE id = ${toInteger(existing.id)}
      `);
      return;
    }

    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO feed_like (feed_id, user_id, created_by, created_at)
      VALUES (${feedId}, ${userId}, ${userId}, ${now})
    `);
  }

  async addFeedComment(userId: number, feedId: number, comment: string): Promise<void> {
    if (userId <= 0 || feedId <= 0) {
      return;
    }

    const now = new Date().toISOString();

    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO feed_comments (user_id, feed_id, comment, created_by, created_at)
      VALUES (${userId}, ${feedId}, ${comment}, ${userId}, ${now})
    `);
  }

  async listFeedComments(feedId: number): Promise<Record<string, unknown>[]> {
    if (feedId <= 0) {
      return [];
    }

    const rows = await this.queryMany(Prisma.sql`
      SELECT
        feed_comments.feed_id,
        feed.title AS feed_title,
        feed.content,
        feed_comments.id AS comment_id,
        feed_comments.comment,
        feed_comments.created_at AS date,
        feed_comments.user_id,
        users.name AS user_name,
        users.image AS profile
      FROM feed_comments
      LEFT JOIN users ON users.id = feed_comments.user_id
        AND users.deleted_at IS NULL
      LEFT JOIN feed ON feed.id = feed_comments.feed_id
        AND feed.deleted_at IS NULL
      WHERE feed_comments.feed_id = ${feedId}
        AND feed_comments.deleted_at IS NULL
      ORDER BY feed_comments.id ASC
    `);

    return rows.map((row) => ({
      feed_id: toInteger(row.feed_id),
      feed_title: toStringValue(row.feed_title),
      content: toStringValue(row.content),
      comment_id: toInteger(row.comment_id),
      comment: toStringValue(row.comment),
      date: formatLegacyDateDmy(row.date),
      user_id: toInteger(row.user_id),
      user_name: toStringValue(row.user_name),
      profile: this.toFileUrl(row.profile),
    }));
  }

  async addOrUpdateReview(userId: number, input: AddReviewInput): Promise<void> {
    const now = new Date().toISOString();

    const existing = await this.count(Prisma.sql`
      SELECT COUNT(*) AS count
      FROM review
      WHERE course_id = ${input.courseId}
        AND user_id = ${userId}
        AND deleted_at IS NULL
    `);

    if (existing > 0) {
      await this.prisma.$executeRaw(Prisma.sql`
        UPDATE review
        SET rating = ${input.rating},
            review = ${input.review},
            updated_by = ${userId},
            updated_at = ${now}
        WHERE course_id = ${input.courseId}
          AND user_id = ${userId}
          AND deleted_at IS NULL
      `);
      return;
    }

    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO review (user_id, course_id, rating, review, created_by, created_at)
      VALUES (${userId}, ${input.courseId}, ${input.rating}, ${input.review}, ${userId}, ${now})
    `);
  }

  async getUserReview(userId: number, courseId: number): Promise<Record<string, unknown> | null> {
    const row = await this.queryOne(Prisma.sql`
      SELECT id, course_id, user_id, rating, review
      FROM review
      WHERE course_id = ${courseId}
        AND user_id = ${userId}
        AND deleted_at IS NULL
      LIMIT 1
    `);

    if (!row) {
      return null;
    }

    return {
      id: toInteger(row.id),
      course_id: toInteger(row.course_id),
      user_id: toInteger(row.user_id),
      rating: toDbNumber(row.rating),
      review: toStringValue(row.review),
    };
  }

  async toggleReviewLike(userId: number, reviewId: number): Promise<void> {
    if (userId <= 0 || reviewId <= 0) {
      return;
    }

    const existing = await this.queryOne(Prisma.sql`
      SELECT id
      FROM review_like
      WHERE review_id = ${reviewId}
        AND user_id = ${userId}
        AND deleted_at IS NULL
      LIMIT 1
    `);

    const now = new Date().toISOString();

    if (existing) {
      await this.prisma.$executeRaw(Prisma.sql`
        UPDATE review_like
        SET deleted_at = ${now},
            deleted_by = ${userId}
        WHERE id = ${toInteger(existing.id)}
      `);
      return;
    }

    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO review_like (review_id, user_id, created_by, created_at)
      VALUES (${reviewId}, ${userId}, ${userId}, ${now})
    `);
  }

  async getNotifications(userId: number): Promise<Record<string, unknown>[]> {
    const user = await this.getUserById(userId);
    if (!user) {
      return [];
    }

    const courseId = toInteger(user.course_id);

    const rows = await this.queryMany(Prisma.sql`
      SELECT id, title, description
      FROM notification
      WHERE deleted_at IS NULL
        AND (course_id = ${courseId} OR course_id = 0)
      ORDER BY id DESC
    `);

    return rows.map((row) => ({
      id: toInteger(row.id),
      title: toStringValue(row.title),
      description: stripHtml(toStringValue(row.description)),
    }));
  }

  async getNotificationList(): Promise<Record<string, unknown>[]> {
    const rows = await this.queryMany(Prisma.sql`
      SELECT id, title, description
      FROM notification
      WHERE deleted_at IS NULL
      ORDER BY id ASC
    `);

    return rows.map((row) => ({
      id: toInteger(row.id),
      title: toStringValue(row.title),
      description: stripHtml(decodeHtmlEntities(toStringValue(row.description))),
    }));
  }

  async markNotificationAsRead(userId: number, notificationId: number): Promise<boolean> {
    if (userId <= 0 || notificationId <= 0) {
      return false;
    }

    const existing = await this.count(Prisma.sql`
      SELECT COUNT(*) AS count
      FROM notification_read
      WHERE user_id = ${userId}
        AND notification_id = ${notificationId}
        AND deleted_at IS NULL
    `);

    if (existing > 0) {
      return true;
    }

    const now = new Date().toISOString();

    const inserted = await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO notification_read (notification_id, user_id, status, created_by, created_at)
      VALUES (${notificationId}, ${userId}, 1, ${userId}, ${now})
    `);

    return inserted > 0;
  }

  async saveNotificationToken(userId: number, token: string): Promise<boolean> {
    if (token.trim() === '' || userId <= 0) {
      return false;
    }

    const now = new Date().toISOString();

    const updated = await this.prisma.$executeRaw(Prisma.sql`
      UPDATE users
      SET notification_token = ${token},
          updated_at = ${now},
          updated_by = ${userId}
      WHERE id = ${userId}
        AND deleted_at IS NULL
    `);

    return updated > 0;
  }

  async listEvents(userId: number, filter?: string): Promise<{ expired: unknown[]; live: unknown[]; upcoming: unknown[] }> {
    const rows = await this.queryMany(Prisma.sql`
      SELECT *
      FROM events
      WHERE deleted_at IS NULL
      ORDER BY id ASC
    `);

    const filtered = this.filterEventsByWindow(rows, filter);

    const expired: unknown[] = [];
    const live: unknown[] = [];
    const upcoming: unknown[] = [];

    for (const eventRow of filtered) {
      const payload = await this.toEventPayload(userId, eventRow);
      const status = toStringValue(payload.status);

      if (status.includes('Live Now')) {
        live.push(payload);
      } else if (status.includes('Next Live')) {
        upcoming.push(payload);
      } else {
        expired.push(payload);
      }
    }

    return {
      expired,
      live,
      upcoming,
    };
  }

  async getEventDetails(userId: number, eventId: number): Promise<Record<string, unknown> | null> {
    if (eventId <= 0) {
      return null;
    }

    const event = await this.queryOne(Prisma.sql`
      SELECT *
      FROM events
      WHERE id = ${eventId}
        AND deleted_at IS NULL
      LIMIT 1
    `);

    if (!event) {
      return null;
    }

    return this.toEventPayload(userId, event);
  }

  async registerEvent(
    userId: number,
    input: RegisterEventInput,
  ): Promise<{ success: boolean; duplicate: boolean }> {
    if (userId <= 0 || input.eventId <= 0) {
      return {
        success: false,
        duplicate: false,
      };
    }

    const existing = await this.count(Prisma.sql`
      SELECT COUNT(*) AS count
      FROM event_registration
      WHERE event_id = ${input.eventId}
        AND user_id = ${userId}
        AND deleted_at IS NULL
    `);

    if (existing > 0) {
      return {
        success: false,
        duplicate: true,
      };
    }

    const now = new Date().toISOString();

    const inserted = await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO event_registration (
        user_id,
        name,
        phone,
        event_id,
        attend_status,
        created_by,
        created_at
      ) VALUES (
        ${userId},
        ${input.name},
        ${input.phone},
        ${input.eventId},
        ${input.attendStatus},
        ${userId},
        ${now}
      )
    `);

    return {
      success: inserted > 0,
      duplicate: false,
    };
  }

  async addEventFeedback(userId: number, input: AddEventFeedbackInput): Promise<boolean> {
    if (userId <= 0 || input.eventId <= 0) {
      return false;
    }

    const existing = await this.count(Prisma.sql`
      SELECT COUNT(*) AS count
      FROM review
      WHERE user_id = ${userId}
        AND event_id = ${input.eventId}
        AND deleted_at IS NULL
    `);

    if (existing > 0) {
      return false;
    }

    const now = new Date().toISOString();

    const inserted = await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO review (rating, user_id, event_id, review, item_type, created_by, created_at)
      VALUES (${input.rating}, ${userId}, ${input.eventId}, ${input.review}, 2, ${userId}, ${now})
    `);

    return inserted > 0;
  }

  async getMyTask(userId: number, dateInput: string | undefined): Promise<Record<string, unknown>> {
    const date = normalizeDateInput(dateInput);

    const cohort = await this.queryOne(Prisma.sql`
      SELECT
        cohort_students.cohort_id AS cohort_id,
        cohorts.title AS cohort_title,
        cohorts.cohort_id AS cohort_code,
        cohorts.course_id AS course_id,
        cohorts.instructor_id AS cohort_instructor,
        cohorts.start_date AS cohort_start_date,
        cohorts.end_date AS cohort_end_date
      FROM cohort_students
      JOIN cohorts ON cohorts.id = cohort_students.cohort_id
      WHERE cohort_students.user_id = ${userId}
        AND cohort_students.deleted_at IS NULL
        AND cohorts.deleted_at IS NULL
      LIMIT 1
    `);

    const scheduledLiveClasses: Record<string, unknown>[] = [];
    const overdueLiveClasses: Record<string, unknown>[] = [];
    const scheduledAssignments: Record<string, unknown>[] = [];
    const overdueAssignments: Record<string, unknown>[] = [];

    if (cohort) {
      const cohortId = toInteger(cohort.cohort_id);

      const liveClasses = await this.queryMany(Prisma.sql`
        SELECT id, session_id, title, fromTime, toTime, date, repeat_dates, zoom_id, password, video_url
        FROM live_class
        WHERE cohort_id = ${cohortId}
          AND date = ${date}
          AND deleted_at IS NULL
        ORDER BY id ASC
      `);

      for (const liveClass of liveClasses) {
        const payload = {
          id: toInteger(liveClass.id),
          session_id: toStringValue(liveClass.session_id),
          title: toStringValue(liveClass.title),
          fromTime: toStringValue(liveClass.fromTime),
          toTime: toStringValue(liveClass.toTime),
          date: toDateOnly(liveClass.date),
          repeat_dates: toStringValue(liveClass.repeat_dates),
          zoom_id: toStringValue(liveClass.zoom_id),
          password: toStringValue(liveClass.password),
          video_url: toStringValue(liveClass.video_url),
          instructor_id: toInteger(cohort.cohort_instructor),
          fromDate: toDateOnly(liveClass.date),
          toDate: toDateOnly(liveClass.date),
          course_id: toInteger(cohort.course_id),
          type: 'Live',
        };

        if (toDateOnly(liveClass.date) === date) {
          scheduledLiveClasses.push(payload);
        } else if (toDateOnly(liveClass.date) < date) {
          overdueLiveClasses.push(payload);
        }
      }

      const assignments = await this.queryMany(Prisma.sql`
        SELECT id, title, description, added_date, due_date, from_time, to_time, instructions
        FROM assignment
        WHERE cohort_id = ${cohortId}
          AND due_date = ${date}
          AND deleted_at IS NULL
        ORDER BY id ASC
      `);

      for (const assignment of assignments) {
        const payload = {
          id: toInteger(assignment.id),
          title: toStringValue(assignment.title),
          description: toStringValue(assignment.description),
          added_date: toDateOnly(assignment.added_date),
          due_date: toDateOnly(assignment.due_date),
          from_time: toStringValue(assignment.from_time),
          to_time: toStringValue(assignment.to_time),
          instructions: toStringValue(assignment.instructions),
          type: 'Assignment',
        };

        if (toDateOnly(assignment.due_date) === date) {
          scheduledAssignments.push(payload);
        } else if (toDateOnly(assignment.due_date) < date) {
          overdueAssignments.push(payload);
        }
      }
    }

    return {
      cohort: cohort
        ? {
            cohort_id: toInteger(cohort.cohort_id),
            cohort_title: toStringValue(cohort.cohort_title),
            cohort_code: toStringValue(cohort.cohort_code),
            course_id: toInteger(cohort.course_id),
            cohort_instructor: toInteger(cohort.cohort_instructor),
            cohort_start_date: toDateOnly(cohort.cohort_start_date),
            cohort_end_date: toDateOnly(cohort.cohort_end_date),
          }
        : [],
      scheduled: {
        live_classes: scheduledLiveClasses,
        assignments: scheduledAssignments,
      },
      overdue: {
        live_classes: overdueLiveClasses,
        assignments: overdueAssignments,
      },
    };
  }

  async getSupportMessages(userId: number): Promise<Record<string, unknown>[]> {
    if (userId <= 0) {
      return [];
    }

    const rows = await this.queryMany(Prisma.sql`
      SELECT id, chat_id, sender_id, message, created_at, updated_at
      FROM support_chat
      WHERE chat_id = ${userId}
        AND deleted_at IS NULL
      ORDER BY id ASC
    `);

    return rows.map((row) => ({
      id: toInteger(row.id),
      chat_id: toInteger(row.chat_id),
      sender_id: toInteger(row.sender_id),
      message: toStringValue(row.message),
      created_at: toStringValue(row.created_at),
      updated_at: toStringValue(row.updated_at),
    }));
  }

  async submitSupportMessage(userId: number, message: string): Promise<boolean> {
    if (userId <= 0 || message.trim() === '') {
      return false;
    }

    const now = new Date().toISOString();

    const inserted = await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO support_chat (
        chat_id,
        sender_id,
        message,
        created_at,
        created_by,
        updated_at,
        updated_by
      ) VALUES (
        ${userId},
        ${userId},
        ${message},
        ${now},
        ${userId},
        ${now},
        ${userId}
      )
    `);

    return inserted > 0;
  }
}
