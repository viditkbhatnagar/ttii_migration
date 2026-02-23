import { beforeEach, describe, expect, it } from 'vitest';

import { NotificationRepository } from '../../src/data/repositories/notification.repository.js';
import { UsersRepository } from '../../src/data/repositories/users.repository.js';
import { prisma, resetParityTables } from './test-db.js';

describe('NotificationRepository parity semantics', () => {
  const usersRepository = new UsersRepository(prisma.users);
  const notificationRepository = new NotificationRepository(prisma.notification, prisma.notification_read, prisma);

  beforeEach(async () => {
    await resetParityTables();
  });

  it('counts unread rows using legacy notification + notification_read logic', async () => {
    const user = await usersRepository.create({
      name: 'Notifier',
      email: 'notifier@example.test',
      course_id: 456,
    });

    const global = await notificationRepository.create({
      title: 'Global',
      description: 'Global notification',
      course_id: 0,
    });
    await notificationRepository.create({
      title: 'Scoped',
      description: 'Scoped notification',
      course_id: 456,
    });
    await notificationRepository.create({
      title: 'Other',
      description: 'Different course notification',
      course_id: 999,
    });

    expect(await notificationRepository.getUnreadCount(user.id, 456)).toBe(2);

    await notificationRepository.markRead(user.id, global.id);

    expect(await notificationRepository.getUnreadCount(user.id, 456)).toBe(1);
  });
});
