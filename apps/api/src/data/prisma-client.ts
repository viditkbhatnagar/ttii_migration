import { PrismaBetterSQLite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@prisma/client';

import { env } from '../env.js';

let prismaClient: PrismaClient | undefined;

function isSqliteUrl(databaseUrl: string): boolean {
  return databaseUrl === ':memory:' || databaseUrl.startsWith('file:');
}

function toSqlitePath(databaseUrl: string): string {
  if (databaseUrl === ':memory:') {
    return ':memory:';
  }

  return databaseUrl.replace(/^file:/, '');
}

export function createPrismaClient(databaseUrl = env.DATABASE_URL): PrismaClient {
  if (isSqliteUrl(databaseUrl)) {
    return new PrismaClient({
      adapter: new PrismaBetterSQLite3({
        url: toSqlitePath(databaseUrl),
      }),
    });
  }

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
