import { beforeEach, describe, expect, it } from 'vitest';

import { UsersRepository } from '../../src/data/repositories/users.repository.js';
import { prisma, resetParityTables } from './test-db.js';

describe('UsersRepository parity semantics', () => {
  const repository = new UsersRepository(prisma.users);

  beforeEach(async () => {
    await resetParityTables();
  });

  it('creates rows with default timestamps', async () => {
    const created = await repository.create({
      name: 'Legacy User',
      email: 'legacy-user@example.test',
      role_id: 2,
    });

    expect(created.id).toBeGreaterThan(0);
    expect(created.created_at).toBeInstanceOf(Date);
    expect(created.updated_at).toBeInstanceOf(Date);
    expect(created.deleted_at).toBeNull();
  });

  it('hides soft-deleted rows by default and restores them', async () => {
    const user = await repository.create({
      name: 'Soft Delete Candidate',
      email: 'soft-delete@example.test',
    });

    const deletedCount = await repository.softDelete({ id: user.id }, 99);
    expect(deletedCount).toBe(1);

    const hidden = await repository.findById(user.id);
    expect(hidden).toBeNull();

    const withDeleted = await repository.findById(user.id, true);
    expect(withDeleted?.deleted_by).toBe(99);
    expect(withDeleted?.deleted_at).toBeInstanceOf(Date);

    const restored = await repository.restore(user.id);
    expect(restored).toBe(true);

    const activeAgain = await repository.findById(user.id);
    expect(activeAgain?.deleted_at).toBeNull();
    expect(activeAgain?.deleted_by).toBeNull();
  });
});
