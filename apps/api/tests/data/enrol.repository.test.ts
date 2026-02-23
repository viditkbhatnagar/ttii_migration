import { beforeEach, describe, expect, it } from 'vitest';

import { EnrolRepository } from '../../src/data/repositories/enrol.repository.js';
import { UsersRepository } from '../../src/data/repositories/users.repository.js';
import { prisma, resetParityTables } from './test-db.js';

describe('EnrolRepository parity semantics', () => {
  const usersRepository = new UsersRepository(prisma.users);
  const enrolRepository = new EnrolRepository(prisma.enrol);

  beforeEach(async () => {
    await resetParityTables();
  });

  it('treats soft-deleted enrolments as not enrolled', async () => {
    const user = await usersRepository.create({
      name: 'Learner',
      email: 'learner@example.test',
    });

    await enrolRepository.create({
      user_id: user.id,
      course_id: 123,
      created_by: user.id,
    });

    expect(await enrolRepository.isUserEnrolled(user.id, 123)).toBe(true);

    const deleted = await enrolRepository.softDeleteByUserAndCourse(user.id, 123, user.id);
    expect(deleted).toBe(1);

    expect(await enrolRepository.isUserEnrolled(user.id, 123)).toBe(false);

    const withDeleted = await enrolRepository.listUserEnrollments(user.id, true);
    expect(withDeleted).toHaveLength(1);
    expect(withDeleted[0]?.deleted_by).toBe(user.id);
  });
});
