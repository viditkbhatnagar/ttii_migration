import type { Prisma, notification, notification_read, PrismaClient } from '@prisma/client';

import { getPrismaClient } from '../prisma-client.js';
import { toDataLayerError } from '../errors.js';

type NotificationDelegate = PrismaClient['notification'];
type NotificationReadDelegate = PrismaClient['notification_read'];

function toIntId(id: string | number | null | undefined): number {
  if (typeof id === 'number') return id;
  if (!id) return 0;
  const n = parseInt(String(id), 10);
  return Number.isFinite(n) ? n : 0;
}

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
          user_id: toIntId(userId),
          notification_id: toIntId(notificationId),
          deleted_at: null,
        },
      });

      if (existing) {
        return existing;
      }

      return await this.notificationReadModel.create({
        data: {
          user_id: toIntId(userId),
          notification_id: toIntId(notificationId),
          status: 1,
          created_by: toIntId(userId),
          created_at: new Date(),
        },
      });
    } catch (error: unknown) {
      throw toDataLayerError(error, 'notification.markRead');
    }
  }

  async getUnreadCount(userId: string, _courseId: string | null): Promise<number> {
    void _courseId;
    try {
      const readRecords = await this.notificationReadModel.findMany({
        where: {
          user_id: toIntId(userId),
          deleted_at: null,
        },
        select: {
          notification_id: true,
        },
      });

      const readNotificationIds = readRecords.map((r) => r.notification_id);

      const unreadCount = await this.notificationModel.count({
        where: {
          deleted_at: null,
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
