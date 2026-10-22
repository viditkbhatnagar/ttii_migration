import Fastify from 'fastify';
import { describe, expect, test, vi } from 'vitest';

import { registerOperationsRoutes } from '../../src/routes/operations.js';
import type { CentrePortalDashboardService } from '../../src/operations/centre-portal-dashboard-service.js';
import type { CentrePortalProfileService } from '../../src/operations/centre-portal-profile-service.js';

// Centre portal v2: the shell + dashboard are open to the centre surface
// (Centre 7, Associate 10); the Profile and the document upload are the
// Centre login's alone. The actor always comes from the session.

const USERS: Record<string, { id: number; role_id: number }> = {
  centre: { id: 700, role_id: 7 },
  associate: { id: 701, role_id: 10 },
  admin: { id: 1, role_id: 1 },
  student: { id: 5, role_id: 2 },
};

function makeApp(fail = false) {
  const authService = {
    authenticateAuthToken: (token: string) => {
      const user = USERS[token];
      return Promise.resolve(user ? { user: { ...user, name: token } } : null);
    },
    logAuthDenied: () => Promise.resolve(),
    logRbacDenied: () => Promise.resolve(),
  };
  const dashboard = {
    shell: vi.fn().mockResolvedValue({ centre: null, userName: '', wallet: null, affiliation: null }),
    dashboard: vi.fn().mockImplementation(() => (fail ? Promise.reject(new Error('db down: secret detail')) : Promise.resolve({ money: null }))),
  };
  const profile = {
    profile: vi.fn().mockResolvedValue({ status: 1, message: 'success', data: { kycReady: true } }),
    addDocument: vi.fn().mockResolvedValue({ status: 1, message: 'Document uploaded', data: { id: 3 } }),
  };
  const app = Fastify({ logger: false });
  registerOperationsRoutes(app, {
    authService: authService as never,
    centrePortalDashboardService: dashboard as unknown as CentrePortalDashboardService,
    centrePortalProfileService: profile as unknown as CentrePortalProfileService,
  });
  return { app, dashboard, profile };
}

describe('centre portal shell routes', () => {
  test('anonymous callers get 401 everywhere', async () => {
    const { app } = makeApp();
    for (const url of ['/centre/portal/shell', '/centre/portal/dashboard', '/centre/portal/profile']) {
      expect((await app.inject({ method: 'GET', url })).statusCode).toBe(401);
    }
    expect((await app.inject({ method: 'POST', url: '/centre/portal/documents/add', payload: {} })).statusCode).toBe(401);
    await app.close();
  });

  test('admins and students are not on the centre surface', async () => {
    const { app, dashboard, profile } = makeApp();
    for (const token of ['admin', 'student']) {
      expect((await app.inject({ method: 'GET', url: `/centre/portal/dashboard?auth_token=${token}` })).statusCode).toBe(403);
      expect((await app.inject({ method: 'GET', url: `/centre/portal/profile?auth_token=${token}` })).statusCode).toBe(403);
    }
    expect(dashboard.dashboard).not.toHaveBeenCalled();
    expect(profile.profile).not.toHaveBeenCalled();
    await app.close();
  });

  test('the Centre login and an Associate both read the shell and dashboard, as themselves', async () => {
    const { app, dashboard } = makeApp();
    expect((await app.inject({ method: 'GET', url: '/centre/portal/shell?auth_token=centre' })).json()).toMatchObject({ status: 1 });
    expect(dashboard.shell).toHaveBeenLastCalledWith({ userId: 700, roleId: 7 });
    const res = await app.inject({ method: 'GET', url: '/centre/portal/dashboard?auth_token=associate&centre_id=29' });
    expect(res.statusCode).toBe(200);
    // The service is told who is asking; a centre_id in the query is never passed on.
    expect(dashboard.dashboard).toHaveBeenLastCalledWith({ userId: 701, roleId: 10 });
    await app.close();
  });

  test('an Associate is refused the Profile and the document upload; nothing reaches the service', async () => {
    const { app, profile } = makeApp();
    expect((await app.inject({ method: 'GET', url: '/centre/portal/profile?auth_token=associate' })).statusCode).toBe(403);
    const add = await app.inject({ method: 'POST', url: '/centre/portal/documents/add', payload: { auth_token: 'associate', doc_type: 'PAN Card' } });
    expect(add.statusCode).toBe(403);
    expect(profile.profile).not.toHaveBeenCalled();
    expect(profile.addDocument).not.toHaveBeenCalled();
    await app.close();
  });

  test('the Centre login reads its profile and files a document', async () => {
    const { app, profile } = makeApp();
    expect((await app.inject({ method: 'GET', url: '/centre/portal/profile?auth_token=centre' })).json()).toEqual({ status: 1, message: 'success', data: { kycReady: true } });
    expect(profile.profile).toHaveBeenCalledWith({ userId: 700, roleId: 7 });
    const body = { auth_token: 'centre', doc_type: 'PAN Card', file_url: 'https://x/public/uploads/1761112345678-ab.pdf', centre_id: 29 };
    const add = await app.inject({ method: 'POST', url: '/centre/portal/documents/add', payload: body });
    expect(add.json()).toEqual({ status: 1, message: 'Document uploaded', data: { id: 3 } });
    expect(profile.addDocument).toHaveBeenCalledWith({ userId: 700, roleId: 7 }, body);
    await app.close();
  });

  test('an unexpected failure is a generic 500, not the error text', async () => {
    const { app } = makeApp(true);
    const res = await app.inject({ method: 'GET', url: '/centre/portal/dashboard?auth_token=centre' });
    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({ status: 0, message: 'Something went wrong. Please try again.', data: {} });
    await app.close();
  });
});
