import Fastify from 'fastify';
import { describe, expect, test, vi } from 'vitest';

import { registerOperationsRoutes } from '../../src/routes/operations.js';
import type { CentreDashboardService } from '../../src/operations/centre-dashboard-service.js';
import type { OperationsService } from '../../src/operations/operations-service.js';

// Centre money is Admin (1) / Subadmin (8) only: counsellors (9) reach most
// /admin/* reads, but not the Centre Dashboard or the Wallet & Payment tabs.

const USERS: Record<string, { id: number; role_id: number }> = {
  admin: { id: 1, role_id: 1 },
  subadmin: { id: 8, role_id: 8 },
  counsellor: { id: 10, role_id: 9 },
  centre: { id: 700, role_id: 7 },
};

function makeApp(fail = false, operationsService?: OperationsService) {
  const authService = {
    authenticateAuthToken: (token: string) => {
      const user = USERS[token];
      return Promise.resolve(user ? { user: { ...user, name: token } } : null);
    },
    logAuthDenied: () => Promise.resolve(),
    logRbacDenied: () => Promise.resolve(),
  };
  const service = {
    dashboard: vi.fn().mockImplementation(() => (fail ? Promise.reject(new Error('db down')) : Promise.resolve({ period: 'month' }))),
    affiliationFees: vi.fn().mockResolvedValue({ ready: false, message: 'Affiliation records are not set up yet.', rows: [] }),
    applicationPayments: vi.fn().mockResolvedValue({ rows: [] }),
  };
  const app = Fastify({ logger: false });
  registerOperationsRoutes(app, {
    authService: authService as never,
    centreDashboardService: service as unknown as CentreDashboardService,
    ...(operationsService ? { operationsService } : {}),
  });
  return { app, service };
}

const PATHS = ['/admin/centres/dashboard', '/admin/centres/affiliation_fees', '/admin/centres/application_payments'];

describe('centre dashboard routes', () => {
  test('counsellors, centres and anonymous callers are refused; nothing reaches the service', async () => {
    const { app, service } = makeApp();
    for (const path of PATHS) {
      for (const token of ['counsellor', 'centre']) {
        const res = await app.inject({ method: 'GET', url: `${path}?auth_token=${token}` });
        expect(res.statusCode).toBe(403);
      }
      expect((await app.inject({ method: 'GET', url: path })).statusCode).toBe(401);
    }
    expect(service.dashboard).not.toHaveBeenCalled();
    expect(service.affiliationFees).not.toHaveBeenCalled();
    expect(service.applicationPayments).not.toHaveBeenCalled();
    await app.close();
  });

  test('admin and subadmin read; period and centre_id reach the service', async () => {
    const { app, service } = makeApp();
    for (const token of ['admin', 'subadmin']) {
      const res = await app.inject({ method: 'GET', url: `/admin/centres/dashboard?period=month&centre_id=28&auth_token=${token}` });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ status: 1, message: 'success', data: { period: 'month' } });
    }
    expect(service.dashboard).toHaveBeenLastCalledWith({ period: 'month', centreId: '28' });
    const fees = await app.inject({ method: 'GET', url: '/admin/centres/affiliation_fees?auth_token=admin' });
    expect(fees.json()).toMatchObject({ status: 1, data: { ready: false, rows: [] } });
    const payments = await app.inject({ method: 'GET', url: '/admin/centres/application_payments?auth_token=admin' });
    expect(payments.json()).toMatchObject({ status: 1, data: { rows: [] } });
    await app.close();
  });

  test('an unexpected failure is a generic 500, not the error text', async () => {
    const { app } = makeApp(true);
    const res = await app.inject({ method: 'GET', url: '/admin/centres/dashboard?auth_token=admin' });
    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({ status: 0, message: 'Something went wrong. Please try again.', data: {} });
    await app.close();
  });
});

describe('existing centre money routes are Admin / Subadmin only too', () => {
  const ops = () => ({
    listAdminCentrePayments: vi.fn().mockResolvedValue({ fund_requests: [], wallet_transactions: [] }),
    listAdminWalletStatus: vi.fn().mockResolvedValue([]),
    approveFundRequest: vi.fn().mockResolvedValue({ status: 1, message: 'Fund request approved and wallet credited.' }),
    rejectFundRequest: vi.fn().mockResolvedValue({ status: 1, message: 'Fund request rejected.' }),
  });
  const ROUTES: Array<{ method: 'GET' | 'POST'; url: string }> = [
    { method: 'GET', url: '/admin/centres/centre_payments' },
    { method: 'GET', url: '/admin/wallet/index' },
    { method: 'POST', url: '/admin/centres/fund_request/approve' },
    { method: 'POST', url: '/admin/centres/fund_request/reject' },
  ];
  const send = (app: ReturnType<typeof makeApp>['app'], r: { method: 'GET' | 'POST'; url: string }, token: string) => (
    r.method === 'GET'
      ? app.inject({ method: 'GET', url: `${r.url}?auth_token=${token}` })
      : app.inject({ method: 'POST', url: r.url, payload: { id: '7', auth_token: token } })
  );

  test('counsellors and centre logins are refused; nothing is read or credited', async () => {
    const fake = ops();
    const { app } = makeApp(false, fake as unknown as OperationsService);
    for (const r of ROUTES) {
      for (const token of ['counsellor', 'centre']) expect((await send(app, r, token)).statusCode).toBe(403);
    }
    expect(fake.listAdminCentrePayments).not.toHaveBeenCalled();
    expect(fake.listAdminWalletStatus).not.toHaveBeenCalled();
    expect(fake.approveFundRequest).not.toHaveBeenCalled();
    expect(fake.rejectFundRequest).not.toHaveBeenCalled();
    await app.close();
  });

  test('admin and subadmin still read, approve and reject', async () => {
    const fake = ops();
    const { app } = makeApp(false, fake as unknown as OperationsService);
    for (const r of ROUTES) {
      for (const token of ['admin', 'subadmin']) expect((await send(app, r, token)).statusCode).toBe(200);
    }
    expect(fake.approveFundRequest).toHaveBeenCalledTimes(2);
    expect(fake.rejectFundRequest).toHaveBeenCalledTimes(2);
    await app.close();
  });
});
