/**
 * Resolves the test `DATABASE_URL` and whether it points at a usable database.
 *
 * Kept free of any `vitest` import so that it can also be loaded from
 * `tests/global-setup.ts`, which runs outside the test worker context.
 */

const configuredDatabaseUrl = process.env.DATABASE_URL;

export const testDatabaseUrl = configuredDatabaseUrl ?? 'file:./prisma/test.db';

/**
 * True only when a real MySQL/MariaDB instance is configured.
 *
 * `prisma/schema.prisma` declares `provider = "mysql"`, so Prisma rejects any
 * other URL at query time with:
 *   `Error validating datasource 'db': the URL must start with the protocol 'mysql://'.`
 * That is the exact reason the database-backed parity suites cannot run in CI,
 * which has no MySQL service.
 */
export const hasTestDatabase = configuredDatabaseUrl?.startsWith('mysql://') ?? false;
