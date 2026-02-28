import { PrismaClient } from '@prisma/client';

import { env } from '../env.js';

let prismaClient: PrismaClient | undefined;

export function createPrismaClient(databaseUrl = env.DATABASE_URL): PrismaClient {
  return new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
}

export function getPrismaClient(): PrismaClient {
  if (!prismaClient) {
    prismaClient = createPrismaClient();
  }

  return prismaClient;
}
