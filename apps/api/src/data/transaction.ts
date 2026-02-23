import type { Prisma, PrismaClient } from '@prisma/client';

import { toDataLayerError } from './errors.js';

export async function withTransaction<T>(
  prisma: PrismaClient,
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  try {
    return await prisma.$transaction(async (tx) => callback(tx));
  } catch (error: unknown) {
    throw toDataLayerError(error, 'transaction');
  }
}
