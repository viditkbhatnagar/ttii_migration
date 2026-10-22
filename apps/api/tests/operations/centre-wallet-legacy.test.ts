import Fastify from 'fastify';
import { describe, expect, test, vi } from 'vitest';

import { OperationsService } from '../../src/operations/operations-service.js';
import { registerOperationsRoutes } from '../../src/routes/operations.js';
import { memoryPrisma } from './support/memory-prisma.js';

// expect.stringContaining is typed any; keep the assertions lint-clean.
const has = (text: string): string => expect.stringContaining(text) as string;

vi.hoisted(() => {
  process.env.STORAGE_PROVIDER = 's3';
  process.env.S3_PUBLIC_BASE_URL = 'https://ttii.blr1.digitaloceanspaces.com';
});

// Security review 2026-10-22: the legacy wallet / courses routes are the Centre
// login's alone, and a fund request is bounded and may only attach a /centre/upload file.

const UPLOAD = 'https://ttii.blr1.digitaloceanspaces.com/public/uploads/1761112345678-ab12cd.pdf';
const request = (over: Record<string, unknown> = {}) => ({ amount: 5000, date: '2026-10-22', transactionReceipt: 'UTR1', description: '', attachmentFile: UPLOAD, ...over });

function ops() {
  const db = memoryPrisma({ users: [{ id: 700, role_id: 7, centre_id: '1', deleted_at: null }], centre_fund_requests: [] });
  return { db, service: new OperationsService(db.prisma) };
}

describe('addCentreFundRequest', () => {
  test('amount must be positive, finite and at most 10,00,000', async () => {
    const { db, service } = ops();
    for (const amount of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(await service.addCentreFundRequest('700', request({ amount }))).toMatchObject({ status: 0, message: 'Amount is required' });
    }
    expect(await service.addCentreFundRequest('700', request({ amount: 1_000_001 }))).toMatchObject({ status: 0, message: has('at most 10,00,000') });
    expect(await db.prisma.centre_fund_requests.findMany({})).toHaveLength(0);
    expect(await service.addCentreFundRequest('700', request({ amount: 1_000_000 }))).toMatchObject({ status: 1 });
  });

  test('an attachment must be a file /centre/upload stored; none is fine', async () => {
    const { db, service } = ops();
    for (const attachmentFile of ['javascript:alert(1)', 'https://evil.example/public/uploads/1761112345678-ab12cd.pdf', 'proof.pdf', 'file:///etc/passwd']) {
      expect(await service.addCentreFundRequest('700', request({ attachmentFile }))).toMatchObject({ status: 0, message: has('attached file link is invalid') });
    }
    expect(await db.prisma.centre_fund_requests.findMany({})).toHaveLength(0);
    expect(await service.addCentreFundRequest('700', request({ attachmentFile: '' }))).toMatchObject({ status: 1 });
    expect(await service.addCentreFundRequest('700', request())).toMatchObject({ status: 1 });
    const rows = (await db.prisma.centre_fund_requests.findMany({})) as Array<{ attachment_file: string | null }>;
    expect(rows.map((r) => r.attachment_file)).toEqual([null, UPLOAD]);
  });
});

describe('legacy centre money routes are Centre-login (7) only', () => {
  const USERS: Record<string, { id: number; role_id: number }> = { centre: { id: 700, role_id: 7 }, associate: { id: 701, role_id: 10 } };
  function makeApp() {
    const authService = {
      authenticateAuthToken: (t: string) => Promise.resolve(USERS[t] ? { user: { ...USERS[t], name: t } } : null),
      logAuthDenied: () => Promise.resolve(),
      logRbacDenied: () => Promise.resolve(),
    };
    const operationsService = {
      getCentreWallet: vi.fn().mockResolvedValue({}),
      addCentreFundRequest: vi.fn().mockResolvedValue({ status: 1, message: 'ok' }),
      listCentreCourses: vi.fn().mockResolvedValue([]),
    };
    const app = Fastify({ logger: false });
    registerOperationsRoutes(app, { authService: authService as never, operationsService: operationsService as never });
    return { app, operationsService };
  }

  test('an associate gets 403 and nothing reaches the service; the centre login is served', async () => {
    const { app, operationsService } = makeApp();
    expect((await app.inject({ method: 'GET', url: '/centre/wallet/index?auth_token=associate' })).statusCode).toBe(403);
    expect((await app.inject({ method: 'GET', url: '/centre/courses/index?auth_token=associate' })).statusCode).toBe(403);
    expect((await app.inject({ method: 'POST', url: '/centre/wallet/add', payload: { auth_token: 'associate', amount: 10 } })).statusCode).toBe(403);
    expect(operationsService.getCentreWallet).not.toHaveBeenCalled();
    expect(operationsService.listCentreCourses).not.toHaveBeenCalled();
    expect(operationsService.addCentreFundRequest).not.toHaveBeenCalled();

    expect((await app.inject({ method: 'GET', url: '/centre/wallet/index?auth_token=centre' })).statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: '/centre/courses/index?auth_token=centre' })).statusCode).toBe(200);
    expect((await app.inject({ method: 'POST', url: '/centre/wallet/add', payload: { auth_token: 'centre', amount: 10 } })).statusCode).toBe(200);
    await app.close();
  });
});
