import { Prisma } from '@prisma/client';
import type { notification, notification_read, PrismaClient } from '@prisma/client';

import { getPrismaClient } from '../prisma-client.js';
import { toDataLayerError } from '../errors.js';

type NotificationDelegate = PrismaClient['notification'];
type NotificationReadDelegate = PrismaClient['notification_read'];

export class NotificationRepository {
  constructor(
    private readonly notificationModel: NotificationDelegate = getPrismaClient().notification,
    private readonly notificationReadModel: NotificationReadDelegate = getPrismaClient().notification_read,
  ) {}

  async create(data: Prisma.notificationUncheckedCreateInput): Promise<notification> {
    const now = new Date();

    try {
      return await this.notificationModel.create({
        data: {
          ...data,
          created_at: data.created_at ?? now,
          updated_at: data.updated_at ?? now,
        },
      });
    } catch (error: unknown) {
      throw toDataLayerError(error, 'notification.create');
    }
  }

  async markRead(userId: string, notificationId: string): Promise<notification_read> {
    try {
      const existing = await this.notificationReadModel.findFirst({
        where: {
          user_id: userId,
          notification_id: notificationId,
          deleted_at: null,
        },
      });

      if (existing) {
        return existing;
      }

      return await this.notificationReadModel.create({
        data: {
          user_id: userId,
          notification_id: notificationId,
          status: 1,
          created_by: userId,
          created_at: new Date(),
        },
      });
    } catch (error: unknown) {
      throw toDataLayerError(error, 'notification.markRead');
    }
  }

  async getUnreadCount(userId: string, courseId: string | null): Promise<number> {
    try {
      // Get IDs of notifications already read by this user
      const readRecords = await this.notificationReadModel.findMany({
        where: {
          user_id: userId,
          deleted_at: null,
        },
        select: {
          notification_id: true,
        },
      });

      const readNotificationIds = readRecords.map((r) => r.notification_id);

      // Build the course filter: match the given courseId or notifications with no course (null)
      const courseFilter: Prisma.notificationWhereInput['course_id'] = courseId
        ? { in: [courseId] }
        : undefined;

      // Count notifications that are not read and match course scope
      const unreadCount = await this.notificationModel.count({
        where: {
          deleted_at: null,
          ...(courseFilter ? { course_id: courseFilter } : {}),
          ...(readNotificationIds.length > 0
            ? { id: { notIn: readNotificationIds } }
            : {}),
        },
      });

      return unreadCount;
    } catch (error: unknown) {
      throw toDataLayerError(error, 'notification.getUnreadCount');
    }
  }
}
