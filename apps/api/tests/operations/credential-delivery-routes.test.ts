import multipart from '@fastify/multipart';
import Fastify from 'fastify';
import { describe, expect, test } from 'vitest';

import { requireLegacyAuth } from '../../src/auth/middleware.js';
import type { CredentialDeliveryService } from '../../src/operations/credential-delivery-service.js';
import type { CredentialInsightsService } from '../../src/operations/credential-insights-service.js';
import type { CredentialNoticeFeed } from '../../src/operations/credential-notifications.js';
import type { CredentialScansService } from '../../src/operations/credential-scans-service.js';
import { registerCredentialDeliveryRoutes } from '../../src/routes/credential-delivery-routes.js';

// Admin credential routes: role 1 passes, every other non-grant role is refused
// before the service runs. Centre routes: role 7 only, and the centre id the
// service sees comes from the session, never from the request.

const USERS: Record<string, { id: number; role_id: number }> = {
  admin: { id: 1, role_id: 1 }, counsellor: { id: 10, role_id: 9 }, centre: { id: 50, role_id: 7 }, learner: { id: 2, role_id: 2 }, associate: { id: 11, role_id: 10 },
};

function makeApp() {
  const authService = {
    authenticateAuthToken: (token: string) => Promise.resolve(USERS[token] ? { user: { ...USERS[token], name: token } } : null),
    logAuthDenied: () => Promise.resolve(), logRbacDenied: () => Promise.resolve(),
  } as never;
  const calls: string[] = [];
  const done = (name: string) => (...args: unknown[]) => { calls.push(`${name}:${args.join(',')}`); return Promise.resolve({ status: 1, message: 'ok', data: {} }); };
  const deliveryService = {
    overview: done('overview'), centreOverview: done('centreOverview'), acknowledgeParcel: done('ack'), handOver: done('handOver'),
    printItems: done('print'), callerCentre: () => Promise.resolve(5), documentFileUrl: done('docFile'),
  } as unknown as CredentialDeliveryService;
  const scansService = { overview: done('scans'), review: done('review') } as unknown as CredentialScansService;
  const insightsService = { dashboard: done('dashboard'), report: done('report'), reportList: () => [] } as unknown as CredentialInsightsService;
  const noticeFeed = { adminFeed: () => Promise.resolve({ rows: [], unread: 0 }), markAdminRead: () => Promise.resolve(0) } as unknown as CredentialNoticeFeed;
  const app = Fastify({ logger: false });
  void app.register(multipart);
  void app.register((scope, _o, next) => {
    registerCredentialDeliveryRoutes(scope, { requireAuth: requireLegacyAuth(authService), authService, deliveryService, scansService, insightsService, noticeFeed });
    next();
  });
  return { app, calls };
}

const ADMIN_ROUTES: Array<[string, string]> = [
  ['GET', '/admin/credentials/delivery/overview'], ['POST', '/admin/credentials/delivery/print'], ['GET', '/admin/credentials/scans'],
  ['POST', '/admin/credentials/scans/alerts/1/review'], ['GET', '/admin/credentials/notifications'], ['GET', '/admin/credentials/dashboard'],
  ['GET', '/admin/credentials/reports/issuance'], ['GET', '/admin/credentials/delivery/documents/1/file'],
];

describe('admin credential routes', () => {
  test.each(ADMIN_ROUTES)('%s %s refuses counsellors, centres, learners and anonymous callers', async (method, url) => {
    const { app, calls } = makeApp();
    for (const token of ['counsellor', 'centre', 'learner', 'associate']) {
      const res = await app.inject({ method: method as 'GET' | 'POST', url: `${url}?auth_token=${token}`, ...(method === 'POST' ? { payload: {} } : {}) });
      expect(res.statusCode, token).toBe(403);
    }
    const anon = await app.inject({ method: method as 'GET' | 'POST', url, ...(method === 'POST' ? { payload: {} } : {}) });
    expect(anon.statusCode).toBe(401);
    expect(calls).toEqual([]);
  });

  test('a super admin reaches the services', async () => {
    const { app, calls } = makeApp();
    for (const [method, url] of ADMIN_ROUTES) {
      const res = await app.inject({ method: method as 'GET' | 'POST', url: `${url}?auth_token=admin`, ...(method === 'POST' ? { payload: { note: 'n' } } : {}) });
      expect(res.statusCode, url).toBe(200);
    }
    expect(calls.length).toBeGreaterThanOrEqual(6);
  });
});

describe('centre credential routes', () => {
  test('only role 7 may call them (admins, learners and associates are refused)', async () => {
    const { app, calls } = makeApp();
    for (const token of ['admin', 'learner', 'associate', 'counsellor']) {
      const res = await app.inject({ method: 'GET', url: `/centre/portal/credentials?auth_token=${token}` });
      expect(res.statusCode, token).toBe(403);
    }
    expect(calls).toEqual([]);
    const ok = await app.inject({ method: 'GET', url: '/centre/portal/credentials?auth_token=centre' });
    expect(ok.statusCode).toBe(200);
  });

  test('a client-sent centre id is ignored: the service gets the session user only', async () => {
    const { app, calls } = makeApp();
    await app.inject({ method: 'POST', url: '/centre/portal/credentials/parcels/7/acknowledge?auth_token=centre', payload: { receiver_name: 'R', centre_id: 99 } });
    expect(calls).toEqual(['ack:50,7,R']);
    await app.inject({ method: 'POST', url: '/centre/portal/credentials/items/3/handover?auth_token=centre', payload: { receiver_name: 'R', proof_key: 'k', centre_id: 99 } });
    expect(calls[1]).toBe('handOver:50,3,R,k');
  });
});
