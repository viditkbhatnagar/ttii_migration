import type { PrismaClient, Prisma } from '@prisma/client';

import { getPrismaClient } from '../data/prisma-client.js';
import { env } from '../env.js';

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

function timeColumnToString(value: Date | string | null | undefined): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  const h = String(value.getUTCHours()).padStart(2, '0');
  const m = String(value.getUTCMinutes()).padStart(2, '0');
  const s = String(value.getUTCSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
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
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return {
      year: value.getFullYear(),
      month: value.getMonth() + 1,
      day: value.getDate(),
    };
  }

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
  if (typeof value === 'string') {
    const raw = value.trim();
    if (raw === '') {
      return null;
    }
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  }
  // If already parsed (e.g. MongoDB returns JSON natively), return as-is
  if (value !== null && value !== undefined) {
    return value;
  }
  return null;
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

/** Convert a YYYY-MM-DD string to a Date at start of that day (UTC). */
function dateStringToStartOfDay(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

/** Convert a YYYY-MM-DD string to a Date at end of that day (UTC). */
function dateStringToEndOfDay(dateStr: string): Date {
  return new Date(`${dateStr}T23:59:59.999Z`);
}

export interface AddReviewInput {
  courseId: string;
  rating: number;
  review: string;
}

export interface RegisterEventInput {
  eventId: string;
  name: string;
  phone: string;
  attendStatus: string;
}

export interface AddEventFeedbackInput {
  eventId: string;
  rating: number;
  review: string;
}

type EventRow = {
  id: number;
  title: string | null;
  description: string | null;
  event_date: Date | null;
  from_time: Date | null;
  to_time: Date | null;
  image: string | null;
  objectives: string | null;
  duration: string | null;
  is_recording_available: number | null;
  instructor_id: number | null;
  [key: string]: unknown;
};

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

  private async getUserById(userId: string) {
    if (!userId) {
      return null;
    }

    return this.prisma.users.findFirst({
      where: {
        id: toIntId(userId),
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
        image: true,
        course_id: true,
      },
    });
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

  private filterEventsByWindow(events: EventRow[], filter?: string): EventRow[] {
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

  private async toEventPayload(userId: string, eventRow: EventRow): Promise<Record<string, unknown>> {
    const eventId = eventRow.id;
    const instructorId = eventRow.instructor_id;

    const instructor =
      instructorId
        ? await this.prisma.users.findFirst({
            where: {
              id: instructorId,
              deleted_at: null,
            },
            select: {
              id: true,
              name: true,
              image: true,
            },
          })
        : null;

    const recordings = await this.prisma.recorded_events.findMany({
      where: {
        event_id: eventId,
        deleted_at: null,
      },
      orderBy: { id: 'asc' },
      select: {
        id: true,
        title: true,
        video_url: true,
        duration: true,
        summary: true,
      },
    });

    const isRegistered = await this.prisma.event_registration.count({
      where: {
        event_id: eventId,
        user_id: toIntId(userId),
        deleted_at: null,
      },
    });

    const fromTime = timeColumnToString(eventRow.from_time);
    const toTime = timeColumnToString(eventRow.to_time);

    return {
      id: eventId,
      title: toStringValue(eventRow.title),
      description: toStringValue(eventRow.description),
      date: formatLegacyDateDmy(eventRow.event_date),
      formatted_date: formatLegacyDateShortMonth(eventRow.event_date),
      time: `${formatLegacyTime(fromTime)} - ${formatLegacyTime(toTime)}`,
      image: this.toFileUrl(eventRow.image) || `${this.appBaseUrl}/uploads/dummy.jpg`,
      objectives: parseObjectives(eventRow.objectives),
      duration: toStringValue(eventRow.duration),
      recording_status: eventRow.is_recording_available === 1 ? 'Available' : 'Not available',
      recordings,
      status: this.eventStatus(eventRow.event_date, fromTime, toTime),
      is_registered: isRegistered,
      instructor_name: toStringValue(instructor?.name),
      instructor_image: this.toFileUrl(instructor?.image) || `${this.appBaseUrl}/uploads/dummy.jpg`,
    };
  }

  async listFeed(userId: string): Promise<{ feed: Record<string, unknown>[] }> {
    const user = await this.getUserById(userId);
    if (!user) {
      return {
        feed: [],
      };
    }

    const courseId = user.course_id;

    // Fetch feeds that match the user's course or apply to all courses (course_id = null)
    const feedRows = await this.prisma.feed.findMany({
      where: {
        deleted_at: null,
        OR: [
          ...(courseId ? [{ course_id: courseId }] : []),
          { course_id: null },
        ],
      },
      orderBy: { id: 'asc' },
    });

    // Collect instructor IDs to batch-fetch users
    const instructorIds = [...new Set(feedRows.map((f) => f.instructor_id).filter((v): v is number => v !== null))];
    const instructors = instructorIds.length > 0
      ? await this.prisma.users.findMany({
          where: {
            id: { in: instructorIds },
            deleted_at: null,
          },
          select: { id: true, name: true, image: true },
        })
      : [];
    const instructorMap = new Map(instructors.map((u) => [u.id, u]));

    // Collect feed IDs for batch count queries
    const feedIds = feedRows.map((f) => f.id);

    // Batch fetch: all likes for these feeds by this user
    const userLikes = await this.prisma.feed_likes.findMany({
      where: {
        feed_id: { in: feedIds },
        user_id: toIntId(userId),
        deleted_at: null,
      },
      select: { feed_id: true },
    });
    const userLikedFeedIds = new Set(userLikes.map((l) => l.feed_id));

    // Batch fetch: total like counts per feed
    const allLikes = await this.prisma.feed_likes.groupBy({
      by: ['feed_id'],
      where: {
        feed_id: { in: feedIds },
        deleted_at: null,
      },
      _count: { feed_id: true },
    });
    const likesCountMap = new Map(allLikes.map((l) => [l.feed_id, l._count.feed_id]));

    const output: Record<string, unknown>[] = [];

    for (const row of feedRows) {
      const instructor = row.instructor_id ? instructorMap.get(row.instructor_id) : null;

      output.push({
        id: row.id,
        title: toStringValue(row.title),
        content: toStringValue(row.content),
        feed_category_id: row.feed_category_id ?? '',
        course_id: row.course_id ?? '',
        image: this.toFileUrl(row.image),
        date: formatLegacyDateDmy(row.created_at),
        instructor_id: row.instructor_id ?? '',
        instructor_name: toStringValue(instructor?.name),
        instructor_image: this.toFileUrl(instructor?.image) || `${this.appBaseUrl}/uploads/dummy.jpg`,
        is_liked: userLikedFeedIds.has(row.id) ? 1 : 0,
        likes: likesCountMap.get(row.id) ?? 0,
      });
    }

    return {
      feed: output,
    };
  }

  async markFeedWatched(userId: string, feedId: string): Promise<void> {
    if (!userId || !feedId) {
      return;
    }

    const watched = await this.prisma.feed_watched.count({
      where: {
        feed_id: toNullableIntId(feedId),
        user_id: toNullableIntId(userId),
        deleted_at: null,
      },
    });

    if (watched > 0) {
      return;
    }

    const now = new Date();

    await this.prisma.feed_watched.create({
      data: {
        feed_id: toNullableIntId(feedId),
        user_id: toNullableIntId(userId),
        created_by: toNullableIntId(userId),
        created_at: now,
      },
    });
  }

  async toggleFeedLike(userId: string, feedId: string): Promise<void> {
    if (!userId || !feedId) {
      return;
    }

    const existing = await this.prisma.feed_likes.findFirst({
      where: {
        feed_id: toNullableIntId(feedId),
        user_id: toNullableIntId(userId),
        deleted_at: null,
      },
      select: { id: true },
    });

    const now = new Date();

    if (existing) {
      await this.prisma.feed_likes.update({
        where: { id: existing.id },
        data: {
          deleted_at: now,
          deleted_by: toNullableIntId(userId),
        },
      });
      return;
    }

    await this.prisma.feed_likes.create({
      data: {
        feed_id: toNullableIntId(feedId),
        user_id: toNullableIntId(userId),
        created_by: toNullableIntId(userId),
        created_at: now,
      },
    });
  }

  async addFeedComment(userId: string, feedId: string, comment: string): Promise<void> {
    if (!userId || !feedId) {
      return;
    }

    const now = new Date();

    await this.prisma.feed_comments.create({
      data: {
        user_id: toNullableIntId(userId),
        feed_id: toNullableIntId(feedId),
        comment,
        created_by: toNullableIntId(userId),
        created_at: now,
      },
    });
  }

  async listFeedComments(feedId: string): Promise<Record<string, unknown>[]> {
    if (!feedId) {
      return [];
    }

    // Fetch comments
    const comments = await this.prisma.feed_comments.findMany({
      where: {
        feed_id: toNullableIntId(feedId),
        deleted_at: null,
      },
      orderBy: { id: 'asc' },
    });

    if (comments.length === 0) {
      return [];
    }

    // Fetch the feed for this feedId
    const feedRow = await this.prisma.feed.findFirst({
      where: {
        id: toIntId(feedId),
        deleted_at: null,
      },
      select: { title: true, content: true },
    });

    // Collect user IDs and batch-fetch
    const userIds = [...new Set(comments.map((c) => c.user_id).filter((v): v is number => v !== null))];
    const users = await this.prisma.users.findMany({
      where: {
        id: { in: userIds },
        deleted_at: null,
      },
      select: { id: true, name: true, image: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return comments.map((row) => {
      const user = row.user_id !== null ? userMap.get(row.user_id) : undefined;
      return {
        feed_id: row.feed_id,
        feed_title: toStringValue(feedRow?.title),
        content: toStringValue(feedRow?.content),
        comment_id: row.id,
        comment: toStringValue(row.comment),
        date: formatLegacyDateDmy(row.created_at),
        user_id: row.user_id,
        user_name: toStringValue(user?.name),
        profile: this.toFileUrl(user?.image),
      };
    });
  }

  async addOrUpdateReview(userId: string, input: AddReviewInput): Promise<void> {
    const now = new Date();

    const existing = await this.prisma.review.findFirst({
      where: {
        course_id: toNullableIntId(input.courseId),
        user_id: toNullableIntId(userId),
        deleted_at: null,
      },
      select: { id: true },
    });

    if (existing) {
      await this.prisma.review.update({
        where: { id: existing.id },
        data: {
          rating: input.rating,
          review: input.review,
          updated_by: toNullableIntId(userId),
          updated_at: now,
        },
      });
      return;
    }

    await this.prisma.review.create({
      data: {
        user_id: toNullableIntId(userId),
        course_id: toNullableIntId(input.courseId),
        rating: input.rating,
        review: input.review,
        created_by: toNullableIntId(userId),
        created_at: now,
      },
    });
  }

  async getUserReview(userId: string, courseId: string): Promise<Record<string, unknown> | null> {
    const row = await this.prisma.review.findFirst({
      where: {
        course_id: toNullableIntId(courseId),
        user_id: toNullableIntId(userId),
        deleted_at: null,
      },
      select: {
        id: true,
        course_id: true,
        user_id: true,
        rating: true,
        review: true,
      },
    });

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      course_id: row.course_id ?? '',
      user_id: row.user_id ?? '',
      rating: row.rating ?? 0,
      review: toStringValue(row.review),
    };
  }

  async toggleReviewLike(userId: string, reviewId: string): Promise<void> {
    if (!userId || !reviewId) {
      return;
    }

    const existing = await this.prisma.review_like.findFirst({
      where: {
        review_id: toIntId(reviewId),
        user_id: toIntId(userId),
        deleted_at: null,
      },
      select: { id: true },
    });

    const now = new Date();

    if (existing) {
      await this.prisma.review_like.update({
        where: { id: existing.id },
        data: {
          deleted_at: now,
          deleted_by: toIntId(userId),
        },
      });
      return;
    }

    await this.prisma.review_like.create({
      data: {
        review_id: toIntId(reviewId),
        user_id: toIntId(userId),
        created_by: toIntId(userId),
        updated_by: 0,
        deleted_by: 0,
        created_at: now,
      },
    });
  }

  async getNotifications(userId: string): Promise<Record<string, unknown>[]> {
    const user = await this.getUserById(userId);
    if (!user) {
      return [];
    }

    const rows = await this.prisma.notification.findMany({
      where: {
        deleted_at: null,
      },
      orderBy: { id: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
      },
    });

    return rows.map((row) => ({
      id: row.id,
      title: toStringValue(row.title),
      description: stripHtml(toStringValue(row.description)),
    }));
  }

  async getNotificationList(): Promise<Record<string, unknown>[]> {
    const rows = await this.prisma.notification.findMany({
      where: {
        deleted_at: null,
      },
      orderBy: { id: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
      },
    });

    return rows.map((row) => ({
      id: row.id,
      title: toStringValue(row.title),
      description: stripHtml(decodeHtmlEntities(toStringValue(row.description))),
    }));
  }

  async markNotificationAsRead(userId: string, notificationId: string): Promise<boolean> {
    if (!userId || !notificationId) {
      return false;
    }

    const existing = await this.prisma.notification_read.count({
      where: {
        user_id: toIntId(userId),
        notification_id: toIntId(notificationId),
        deleted_at: null,
      },
    });

    if (existing > 0) {
      return true;
    }

    const now = new Date();

    await this.prisma.notification_read.create({
      data: {
        notification_id: toIntId(notificationId),
        user_id: toIntId(userId),
        status: 1,
        created_by: toIntId(userId),
        created_at: now,
      },
    });

    return true;
  }

  async saveNotificationToken(userId: string, token: string): Promise<boolean> {
    if (token.trim() === '' || !userId) {
      return false;
    }

    const now = new Date();

    const result = await this.prisma.users.updateMany({
      where: {
        id: toIntId(userId),
        deleted_at: null,
      },
      data: {
        notification_token: token,
        updated_at: now,
        updated_by: toNullableIntId(userId),
      },
    });

    return result.count > 0;
  }

  async listEvents(userId: string, filter?: string): Promise<{ expired: unknown[]; live: unknown[]; upcoming: unknown[] }> {
    const rows = await this.prisma.events.findMany({
      where: {
        deleted_at: null,
      },
      orderBy: { id: 'asc' },
    });

    const filtered = this.filterEventsByWindow(rows as unknown as EventRow[], filter);

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

  async getEventDetails(userId: string, eventId: string): Promise<Record<string, unknown> | null> {
    if (!eventId) {
      return null;
    }

    const event = await this.prisma.events.findFirst({
      where: {
        id: toIntId(eventId),
        deleted_at: null,
      },
    });

    if (!event) {
      return null;
    }

    return this.toEventPayload(userId, event as unknown as EventRow);
  }

  async registerEvent(
    userId: string,
    input: RegisterEventInput,
  ): Promise<{ success: boolean; duplicate: boolean }> {
    if (!userId || !input.eventId) {
      return {
        success: false,
        duplicate: false,
      };
    }

    const existing = await this.prisma.event_registration.count({
      where: {
        event_id: toNullableIntId(input.eventId),
        user_id: toIntId(userId),
        deleted_at: null,
      },
    });

    if (existing > 0) {
      return {
        success: false,
        duplicate: true,
      };
    }

    const now = new Date();

    await this.prisma.event_registration.create({
      data: {
        user_id: toIntId(userId),
        name: input.name,
        phone: input.phone,
        event_id: toNullableIntId(input.eventId),
        attend_status: toNullableIntId(input.attendStatus),
        created_by: toNullableIntId(userId),
        created_at: now,
      },
    });

    return {
      success: true,
      duplicate: false,
    };
  }

  async addEventFeedback(userId: string, input: AddEventFeedbackInput): Promise<boolean> {
    if (!userId || !input.eventId) {
      return false;
    }

    const existing = await this.prisma.review.count({
      where: {
        user_id: toNullableIntId(userId),
        event_id: toNullableIntId(input.eventId),
        deleted_at: null,
      },
    });

    if (existing > 0) {
      return false;
    }

    const now = new Date();

    await this.prisma.review.create({
      data: {
        rating: input.rating,
        user_id: toNullableIntId(userId),
        event_id: toNullableIntId(input.eventId),
        review: input.review,
        item_type: 2,
        created_by: toNullableIntId(userId),
        created_at: now,
      },
    });

    return true;
  }

  async getMyTask(userId: string, dateInput: string | undefined): Promise<Record<string, unknown>> {
    const date = normalizeDateInput(dateInput);
    const dateStart = dateStringToStartOfDay(date);
    const dateEnd = dateStringToEndOfDay(date);

    // Find the user's cohort via cohort_students + cohorts. The
    // cohort_students.cohort_id column carries the stringified cohorts.id
    // (numeric) for new rows, or the legacy cohorts.cohort_id text code
    // for old rows — match both so My Task picks the right cohort.
    const cohortStudent = await this.prisma.cohort_students.findFirst({
      where: {
        user_id: toNullableIntId(userId),
        deleted_at: null,
      },
      select: {
        cohort_id: true,
      },
    });

    let cohort: {
      id: number;
      title: string | null;
      cohort_id: string | null;
      course_id: number | null;
      instructor_id: number | null;
      start_date: Date | null;
      end_date: Date | null;
    } | null = null;

    if (cohortStudent && cohortStudent.cohort_id) {
      const ref = String(cohortStudent.cohort_id).trim();
      const refNum = Number(ref);
      const cohortWhere = Number.isFinite(refNum) && refNum > 0 && /^\d+$/.test(ref)
        ? { id: refNum, deleted_at: null }
        : { cohort_id: ref, deleted_at: null };
      cohort = await this.prisma.cohorts.findFirst({
        where: cohortWhere,
        select: {
          id: true,
          title: true,
          cohort_id: true,
          course_id: true,
          instructor_id: true,
          start_date: true,
          end_date: true,
        },
      });
    }

    const scheduledLiveClasses: Record<string, unknown>[] = [];
    const overdueLiveClasses: Record<string, unknown>[] = [];
    const scheduledAssignments: Record<string, unknown>[] = [];
    const overdueAssignments: Record<string, unknown>[] = [];

    if (cohort) {
      const cohortId = cohort.id;

      const liveClasses = await this.prisma.live_class.findMany({
        where: {
          cohort_id: toNullableIntId(cohortId),
          date: {
            gte: dateStart,
            lte: dateEnd,
          },
          deleted_at: null,
        },
        orderBy: { id: 'asc' },
        select: {
          id: true,
          session_id: true,
          title: true,
          fromTime: true,
          toTime: true,
          date: true,
          repeat_dates: true,
          zoom_id: true,
          password: true,
          video_url: true,
        },
      });

      for (const liveClass of liveClasses) {
        const payload = {
          id: liveClass.id,
          session_id: toStringValue(liveClass.session_id),
          title: toStringValue(liveClass.title),
          fromTime: toStringValue(liveClass.fromTime),
          toTime: toStringValue(liveClass.toTime),
          date: toDateOnly(liveClass.date),
          repeat_dates: toStringValue(liveClass.repeat_dates),
          zoom_id: toStringValue(liveClass.zoom_id),
          password: toStringValue(liveClass.password),
          video_url: toStringValue(liveClass.video_url),
          instructor_id: cohort.instructor_id ?? '',
          fromDate: toDateOnly(liveClass.date),
          toDate: toDateOnly(liveClass.date),
          course_id: cohort.course_id ?? '',
          type: 'Live',
        };

        if (toDateOnly(liveClass.date) === date) {
          scheduledLiveClasses.push(payload);
        } else if (toDateOnly(liveClass.date) < date) {
          overdueLiveClasses.push(payload);
        }
      }

      const assignments = await this.prisma.assignment.findMany({
        where: {
          cohort_id: toNullableIntId(cohortId),
          due_date: {
            gte: dateStart,
            lte: dateEnd,
          },
          deleted_at: null,
        },
        orderBy: { id: 'asc' },
        select: {
          id: true,
          title: true,
          description: true,
          added_date: true,
          due_date: true,
          from_time: true,
          to_time: true,
          instructions: true,
        },
      });

      for (const assignment of assignments) {
        const payload = {
          id: assignment.id,
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
            cohort_id: cohort.id,
            cohort_title: toStringValue(cohort.title),
            cohort_code: toStringValue(cohort.cohort_id),
            course_id: cohort.course_id ?? '',
            cohort_instructor: cohort.instructor_id ?? '',
            cohort_start_date: toDateOnly(cohort.start_date),
            cohort_end_date: toDateOnly(cohort.end_date),
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

  // Naji 2026-05-04: student detail view needs a Live Classes tab.
  // Returns every live_class scheduled for any cohort the student is
  // enrolled in, optionally filtered to a specific course. Each row is
  // tagged with `status` (upcoming / today / past) so the UI can group
  // them without re-doing the date math client-side.
  async listStudentLiveClasses(
    userId: string,
    options?: { courseId?: string },
  ): Promise<Record<string, unknown>[]> {
    const userIdInt = toNullableIntId(userId);
    if (userIdInt === null) return [];

    const cohortStudents = await this.prisma.cohort_students.findMany({
      where: { user_id: userIdInt, deleted_at: null },
      select: { cohort_id: true },
    });

    const rawRefs = cohortStudents
      .map((cs) => (cs.cohort_id == null ? '' : String(cs.cohort_id).trim()))
      .filter((s) => s.length > 0);
    const numericRefs: number[] = [];
    const textRefs: string[] = [];
    for (const ref of rawRefs) {
      const n = Number(ref);
      if (Number.isFinite(n) && n > 0 && /^\d+$/.test(ref)) numericRefs.push(n);
      else textRefs.push(ref);
    }

    const cohortWhereOr: Prisma.cohortsWhereInput[] = [];
    if (numericRefs.length > 0) cohortWhereOr.push({ id: { in: numericRefs } });
    if (textRefs.length > 0) cohortWhereOr.push({ cohort_id: { in: textRefs } });
    if (cohortWhereOr.length === 0) return [];

    const courseIdInt = options?.courseId ? toNullableIntId(options.courseId) : null;

    const cohorts = await this.prisma.cohorts.findMany({
      where: {
        OR: cohortWhereOr,
        deleted_at: null,
        ...(courseIdInt !== null ? { course_id: courseIdInt } : {}),
      },
      select: {
        id: true,
        title: true,
        cohort_id: true,
        course_id: true,
        subject_id: true,
        instructor_id: true,
      },
    });
    if (cohorts.length === 0) return [];

    const cohortIds = cohorts.map((c) => c.id);
    const cohortById = new Map(cohorts.map((c) => [c.id, c]));

    const liveClasses = await this.prisma.live_class.findMany({
      where: { cohort_id: { in: cohortIds }, deleted_at: null },
      orderBy: [{ date: 'asc' }, { fromTime: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        cohort_id: true,
        title: true,
        session_id: true,
        zoom_id: true,
        password: true,
        join_url: true,
        platform: true,
        date: true,
        fromTime: true,
        toTime: true,
        recording_url: true,
        recording_storage_key: true,
        video_url: true,
      },
    });

    const subjectIds = [...new Set(cohorts.map((c) => c.subject_id).filter((v): v is number => v !== null))];
    const subjects = subjectIds.length > 0
      ? await this.prisma.subject.findMany({ where: { id: { in: subjectIds } }, select: { id: true, title: true } })
      : [];
    const subjectMap = new Map(subjects.map((s) => [s.id, s.title]));

    const instructorIds = [...new Set(cohorts.map((c) => c.instructor_id).filter((v): v is number => v !== null))];
    const instructors = instructorIds.length > 0
      ? await this.prisma.users.findMany({ where: { id: { in: instructorIds } }, select: { id: true, name: true } })
      : [];
    const instructorMap = new Map(instructors.map((u) => [u.id, u.name]));

    const todayMs = new Date().setHours(0, 0, 0, 0);
    return liveClasses.map((lc) => {
      const cohort = lc.cohort_id !== null ? cohortById.get(lc.cohort_id) ?? null : null;
      const dateMs = lc.date ? new Date(lc.date).setHours(0, 0, 0, 0) : null;
      let status: 'upcoming' | 'today' | 'past' = 'upcoming';
      if (dateMs === null) status = 'upcoming';
      else if (dateMs < todayMs) status = 'past';
      else if (dateMs === todayMs) status = 'today';
      const hasRecording = Boolean(lc.recording_url || lc.recording_storage_key || lc.video_url);
      return {
        id: lc.id,
        title: lc.title,
        date: toDateOnly(lc.date),
        // Naji 2026-05-04: from_time / to_time were going out as
        // "1970-01-01T19:30:00.000Z" because Prisma reads MySQL TIME as
        // a Date anchored at the unix epoch and toStringValue called
        // toISOString. Use timeColumnToString to get "HH:MM:SS".
        from_time: timeColumnToString(lc.fromTime),
        to_time: timeColumnToString(lc.toTime),
        platform: toStringValue(lc.platform),
        join_url: toStringValue(lc.join_url),
        zoom_id: toStringValue(lc.zoom_id),
        password: toStringValue(lc.password),
        cohort_id: cohort?.id ?? null,
        cohort_title: cohort?.title ?? null,
        cohort_code: cohort?.cohort_id ?? null,
        course_id: cohort?.course_id ?? null,
        subject_id: cohort?.subject_id ?? null,
        subject_title: cohort?.subject_id ? subjectMap.get(cohort.subject_id) ?? null : null,
        instructor_name: cohort?.instructor_id ? instructorMap.get(cohort.instructor_id) ?? null : null,
        has_recording: hasRecording,
        recording_url: toStringValue(lc.recording_url || lc.video_url),
        status,
      };
    });
  }

  // Resolve the recording target for a live class IF the calling student
  // is enrolled in that cohort. Returns the same shape the admin route
  // returns: { kind: 'key', key } for storage-backed recordings,
  // { kind: 'url', url } for external links, or null when nothing's
  // available.
  async getStudentLiveRecordingTarget(
    userId: string,
    liveClassId: string,
  ): Promise<{ kind: 'key'; key: string } | { kind: 'url'; url: string } | null> {
    const userIdInt = toNullableIntId(userId);
    const liveIdInt = toNullableIntId(liveClassId);
    if (userIdInt === null || liveIdInt === null) return null;

    const live = await this.prisma.live_class.findFirst({
      where: { id: liveIdInt, deleted_at: null },
      select: {
        cohort_id: true,
        recording_storage_key: true,
        recording_url: true,
        video_url: true,
      },
    });
    if (!live || live.cohort_id === null) return null;

    // Verify enrolment — either numeric id match OR legacy text-code match
    // (mirrors the dual-format lookup used elsewhere).
    const cohortIdNumStr = String(live.cohort_id);
    const cohortRow = await this.prisma.cohorts.findFirst({
      where: { id: live.cohort_id, deleted_at: null },
      select: { id: true, cohort_id: true },
    });
    const cohortRefs = [cohortIdNumStr];
    if (cohortRow?.cohort_id) cohortRefs.push(cohortRow.cohort_id);
    const enrolment = await this.prisma.cohort_students.findFirst({
      where: { user_id: userIdInt, cohort_id: { in: cohortRefs }, deleted_at: null },
      select: { id: true },
    });
    if (!enrolment) return null;

    if (live.recording_storage_key) return { kind: 'key', key: live.recording_storage_key };
    const fallback = live.recording_url || live.video_url;
    if (fallback && /^https?:\/\//i.test(fallback)) return { kind: 'url', url: fallback };
    return null;
  }

  async getSupportMessages(userId: string): Promise<Record<string, unknown>[]> {
    if (!userId) {
      return [];
    }

    const rows = await this.prisma.support_chat.findMany({
      where: {
        chat_id: toNullableIntId(userId),
        deleted_at: null,
      },
      orderBy: { id: 'asc' },
      select: {
        id: true,
        chat_id: true,
        sender_id: true,
        message: true,
        created_at: true,
        updated_at: true,
      },
    });

    return rows.map((row) => ({
      id: row.id,
      chat_id: row.chat_id,
      sender_id: row.sender_id,
      message: toStringValue(row.message),
      created_at: toStringValue(row.created_at),
      updated_at: toStringValue(row.updated_at),
    }));
  }

  async submitSupportMessage(userId: string, message: string): Promise<boolean> {
    if (!userId || message.trim() === '') {
      return false;
    }

    const now = new Date();

    await this.prisma.support_chat.create({
      data: {
        chat_id: toNullableIntId(userId),
        sender_id: toNullableIntId(userId),
        message,
        created_at: now,
        created_by: toNullableIntId(userId),
        updated_at: now,
        updated_by: toNullableIntId(userId),
      },
    });

    return true;
  }
}
