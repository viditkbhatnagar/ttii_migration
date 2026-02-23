import { beforeEach, describe, expect, it } from 'vitest';

import { withTransaction } from '../../src/data/transaction.js';
import { prisma, resetParityTables } from './test-db.js';

describe('Transaction parity patterns', () => {
  beforeEach(async () => {
    await resetParityTables();
  });

  it('rolls back all writes and returns mapped errors on failure', async () => {
    await prisma.users.create({
      data: {
        email: 'existing@example.test',
      },
    });

    await expect(
      withTransaction(prisma, async (tx) => {
        await tx.users.create({
          data: {
            email: 'new@example.test',
          },
        });

        await tx.users.create({
          data: {
            email: 'existing@example.test',
          },
        });
      }),
    ).rejects.toMatchObject({
      name: 'DataLayerError',
      code: 'CONFLICT',
    });

    const createdAfterRollback = await prisma.users.findFirst({
      where: {
        email: 'new@example.test',
      },
    });

    expect(createdAfterRollback).toBeNull();
  });
});
