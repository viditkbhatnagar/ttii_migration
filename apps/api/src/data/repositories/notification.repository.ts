import { Prisma } from '@prisma/client';
import type { notification, notification_read, PrismaClient } from '@prisma/client';

import { getPrismaClient } from '../prisma-client.js';
import { toDataLayerError } from '../errors.js';

type NotificationDelegate = PrismaClient['notification'];
type NotificationReadDelegate = PrismaClient['notification_read'];
type QueryRawDelegate = Pick<PrismaClient, '$queryRaw'>;

export class NotificationRepository {
  constructor(
    private readonly notificationModel: NotificationDelegate = getPrismaClient().notification,
    private readonly notificationReadModel: NotificationReadDelegate = getPrismaClient().notification_read,
    private readonly queryRawClient: QueryRawDelegate = getPrismaClient(),
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

  async markRead(userId: number, notificationId: number): Promise<notification_read> {
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

  async getUnreadCount(userId: number, courseId: number | null): Promise<number> {
    const scopedCourseId = courseId ?? 0;

    try {
      const result = await this.queryRawClient.$queryRaw<Array<{ unread_count: number }>>(
        Prisma.sql`
          SELECT COUNT(n.id) AS unread_count
          FROM notification AS n
          LEFT JOIN notification_read AS nr
            ON n.id = nr.notification_id
            AND nr.user_id = ${userId}
            AND nr.deleted_at IS NULL
          WHERE nr.notification_id IS NULL
            AND n.deleted_at IS NULL
            AND n.course_id IN (${scopedCourseId}, 0)
        `,
      );

      const firstRow = result.at(0);

      if (!firstRow) {
        return 0;
      }

      return Number(firstRow.unread_count ?? 0);
    } catch (error: unknown) {
      throw toDataLayerError(error, 'notification.getUnreadCount');
    }
  }
}
