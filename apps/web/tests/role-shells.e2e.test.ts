import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { LegacyApiClient, LegacyAuthApi, type AuthSession } from '@ttii/frontend-core';
import type { PortalSurface } from '@ttii/shared-types';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { loadRoleShellForPath } from '../src/role-shell-loader';

interface SeededUser {
  email: string;
  password: string;
  roleId: number;
}

interface SeededUsers {
  student: SeededUser;
  centre: SeededUser;
  admin: SeededUser;
}

interface PrismaUsersPort {
  create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
}

interface PrismaPort {
  users: PrismaUsersPort;
}

interface TestDbModule {
  prisma: PrismaPort;
  resetParityTables: () => Promise<void>;
}

interface PasswordModule {
  hashPassword: (value: string) => Promise<string>;
}

interface FastifyAppPort {
  listen: (options: { host: string; port: number }) => Promise<string>;
  close: () => Promise<void>;
}

interface AppModule {
  buildApp: () => FastifyAppPort;
}

const seededUsers: SeededUsers = {
  student: {
    email: 'student.phase11@example.test',
    password: 'StudentPass#2026',
    roleId: 2,
  },
  centre: {
    email: 'centre.phase11@example.test',
    password: 'CentrePass#2026',
    roleId: 7,
  },
  admin: {
    email: 'admin.phase11@example.test',
    password: 'AdminPass#2026',
    roleId: 1,
  },
};

describe('Phase 11 role shell auth e2e', () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = resolve(currentFile, '../../../..');
  const testDbPath = resolve(repoRoot, 'apps/api/prisma/test.db');
  const host = '127.0.0.1';
  const port = 4311;

  let app: FastifyAppPort;
  let authApi: LegacyAuthApi;
  let prisma: PrismaPort;
  let resetParityTables: () => Promise<void>;
  let hashPassword: (value: string) => Promise<string>;

  async function seedAuthUsers(): Promise<void> {
    const [studentHash, centreHash, adminHash] = await Promise.all([
      hashPassword(seededUsers.student.password),
      hashPassword(seededUsers.centre.password),
      hashPassword(seededUsers.admin.password),
    ]);

    await prisma.users.create({
      data: {
        name: 'Phase11 Student',
        email: seededUsers.student.email,
        role_id: seededUsers.student.roleId,
        password: studentHash,
        status: 1,
      },
    });

    await prisma.users.create({
      data: {
        name: 'Phase11 Centre',
        email: seededUsers.centre.email,
        role_id: seededUsers.centre.roleId,
        password: centreHash,
        status: 1,
      },
    });

    await prisma.users.create({
      data: {
        name: 'Phase11 Admin',
        email: seededUsers.admin.email,
        role_id: seededUsers.admin.roleId,
        password: adminHash,
        status: 1,
      },
    });
  }

  async function loginAs(user: SeededUser): Promise<AuthSession> {
    return authApi.login({
      email: user.email,
      password: user.password,
      roleId: user.roleId,
    });
  }

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = `file:${testDbPath}`;
    process.env.API_HOST = host;
    process.env.API_PORT = String(port);

    const [appModuleRaw, passwordModuleRaw, testDbModuleRaw] = await Promise.all([
      import('../../api/src/app'),
      import('../../api/src/auth/password'),
      import('../../api/tests/data/test-db'),
    ]);

    const appModule = appModuleRaw as unknown as AppModule;
    const passwordModule = passwordModuleRaw as unknown as PasswordModule;
    const testDbModule = testDbModuleRaw as unknown as TestDbModule;

    hashPassword = passwordModule.hashPassword;
    prisma = testDbModule.prisma;
    resetParityTables = testDbModule.resetParityTables;

    app = appModule.buildApp();
    await app.listen({ host, port });

    authApi = new LegacyAuthApi(
      new LegacyApiClient({
        baseUrl: `http://${host}:${port}/api`,
      }),
    );
  });

  beforeEach(async () => {
    await resetParityTables();
    await seedAuthUsers();
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([
    {
      label: 'student shell',
      shellPath: '/student',
      surface: 'student' as PortalSurface,
      user: seededUsers.student,
    },
    {
      label: 'centre shell',
      shellPath: '/centre',
      surface: 'centre' as PortalSurface,
      user: seededUsers.centre,
    },
    {
      label: 'admin shell',
      shellPath: '/admin',
      surface: 'admin' as PortalSurface,
      user: seededUsers.admin,
    },
  ])('loads %s through API auth guards', async ({ shellPath, surface, user }) => {
    const session = await loginAs(user);
    const result = await loadRoleShellForPath(shellPath, session, authApi);

    expect(result).not.toBeNull();
    expect(result?.route.surface).toBe(surface);
    expect(result?.access.status).toBe('ready');
  });

  it('returns forbidden when shell role does not match token role', async () => {
    const studentSession = await loginAs(seededUsers.student);

    const result = await loadRoleShellForPath('/admin', studentSession, authApi);

    expect(result).not.toBeNull();
    expect(result?.access.status).toBe('forbidden');
  });
});
