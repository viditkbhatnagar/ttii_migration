import multipart from '@fastify/multipart';
import Fastify from 'fastify';
import { describe, expect, test } from 'vitest';

import { requireLegacyAuth, requireLegacyRoles } from '../../src/auth/middleware.js';
import { ADMIN_PORTAL_SURFACE_ROLES } from '../../src/auth/roles.js';
import type { StorageProvider } from '../../src/integrations/contracts.js';
import type { CentreAffiliationService } from '../../src/operations/centre-affiliation-service.js';
import type { CentreFormPublicService } from '../../src/operations/centre-form-public-service.js';
import type { CentreOnboardingService } from '../../src/operations/centre-onboarding-service.js';
import { registerCentreOnboardingRoutes } from '../../src/routes/centre-onboarding-routes.js';

// Centres v2 routes: the admin side is Admin (1) / Subadmin (8) only; the
// public form is open but rate-limited, and its upload checks the file by
// content (PDF / PNG / JPEG) and size (5 MB).

const USERS: Record<string, { id: number; role_id: number }> = {
  admin: { id: 1, role_id: 1 },
  subadmin: { id: 8, role_id: 8 },
  counsellor: { id: 10, role_id: 9 },
  centre: { id: 50, role_id: 7 },
};

const TOKEN = 'A'.repeat(43);

function makeApp() {
  const authService = {
    authenticateAuthToken: (token: string) => {
      const user = USERS[token];
      return Promise.resolve(user ? { user: { ...user, name: token } } : null);
    },
    logAuthDenied: () => Promise.resolve(),
    logRbacDenied: () => Promise.resolve(),
  } as never;
  const calls: string[] = [];
  const stored: Array<{ key: string; contentType?: string }> = [];
  const onboardingService = {
    list: () => { calls.push('list'); return Promise.resolve({ ready: true, message: '', today: '2026-10-22', records: [] }); },
    createLead: (actor: number | null) => { calls.push(`create:${actor}`); return Promise.resolve({ status: 1, message: 'Centre lead added', data: { id: 1, refNo: 'ONB-001' } }); },
  } as unknown as CentreOnboardingService;
  const affiliationService = {
    canUploadAgreement: () => Promise.resolve({ status: 1, message: 'ok' }),
    signAgreementUpload: () => 'agr-sig',
  } as unknown as CentreAffiliationService;
  const publicFormService = {
    open: () => Promise.resolve({ state: 'closed', reason: 'invalid', message: 'This link is not valid.' }),
    uploadTarget: () => Promise.resolve({ status: 1, message: 'ok', data: { onboardingId: 4 } }),
    signUpload: () => 'form-sig',
    submit: () => Promise.resolve({ status: 1, message: 'Application submitted', data: { ref: 'ONB-004' } }),
  } as unknown as CentreFormPublicService;
  const storage = {
    name: 'fake',
    uploadObject: (input: { key: string; contentType?: string }) => {
      stored.push(input.contentType === undefined ? { key: input.key } : { key: input.key, contentType: input.contentType });
      return Promise.resolve({ key: input.key, provider: 'fake', location: `https://cdn.example/${input.key}` });
    },
  } as unknown as StorageProvider;
  const app = Fastify({ logger: false });
  void app.register(multipart, { limits: { fileSize: 200 * 1024 * 1024 } });
  void app.register((scope, _opts, done) => {
    registerCentreOnboardingRoutes(scope, {
      requireAuth: requireLegacyAuth(authService),
      requireAdminOnlyRole: requireLegacyRoles(authService, ADMIN_PORTAL_SURFACE_ROLES),
      storage, onboardingService, affiliationService, publicFormService,
    });
    done();
  });
  return { app, calls, stored };
}

function multipartBody(filename: string, content: Buffer, contentType: string) {
  const boundary = '----ttiiTestBoundary';
  const head = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`);
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  return { payload: Buffer.concat([head, content, tail]), headers: { 'content-type': `multipart/form-data; boundary=${boundary}` } };
}

describe('admin routes are Admin / Subadmin only', () => {
  test('counsellors and centre logins get 403, anonymous 401; nothing reaches the service', async () => {
    const { app, calls } = makeApp();
    for (const token of ['counsellor', 'centre']) {
      expect((await app.inject({ method: 'GET', url: `/admin/centres/onboarding/index?auth_token=${token}` })).statusCode).toBe(403);
      expect((await app.inject({ method: 'POST', url: '/admin/centres/onboarding/create', payload: { auth_token: token } })).statusCode).toBe(403);
      expect((await app.inject({ method: 'GET', url: `/admin/centres/affiliation/index?auth_token=${token}` })).statusCode).toBe(403);
    }
    expect((await app.inject({ method: 'GET', url: '/admin/centres/onboarding/index' })).statusCode).toBe(401);
    expect(calls).toEqual([]);
    await app.close();
  });

  test('admin and subadmin reach the service with their user id as the actor', async () => {
    const { app, calls } = makeApp();
    const list = await app.inject({ method: 'GET', url: '/admin/centres/onboarding/index?auth_token=admin' });
    expect(list.json()).toMatchObject({ status: 1, data: { ready: true } });
    const created = await app.inject({ method: 'POST', url: '/admin/centres/onboarding/create', payload: { auth_token: 'subadmin' } });
    expect(created.json()).toEqual({ status: 1, message: 'Centre lead added', data: { id: 1, refNo: 'ONB-001' } });
    expect(calls).toEqual(['list', 'create:8']);
    await app.close();
  });

  test('the signed agreement upload takes PDFs only', async () => {
    const { app, stored } = makeApp();
    const png = multipartBody('signed.pdf', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 'application/pdf');
    const refused = await app.inject({ method: 'POST', url: '/admin/centres/onboarding/agreement_file?id=4&auth_token=admin', ...png });
    expect(refused.json()).toMatchObject({ status: 0, message: 'PDF only' });
    const pdf = multipartBody('Signed Agreement.pdf', Buffer.from('%PDF-1.7 body'), 'application/pdf');
    const okRes = await app.inject({ method: 'POST', url: '/admin/centres/onboarding/agreement_file?id=4&auth_token=admin', ...pdf });
    expect(okRes.json()).toMatchObject({ status: 1, data: { name: 'Signed Agreement.pdf', sig: 'agr-sig' } });
    expect(stored[0]?.key).toMatch(/^centre-agreements\/4\/[0-9a-f]{32}-Signed_Agreement\.pdf$/);
    await app.close();
  });
});

describe('public centre form', () => {
  test('is reachable without a login and answers only a status for an unknown token', async () => {
    const { app } = makeApp();
    const res = await app.inject({ method: 'GET', url: `/centre-form/${TOKEN}` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 1, message: 'success', data: { state: 'closed', reason: 'invalid', message: 'This link is not valid.' } });
    await app.close();
  });

  test('uploads are checked by content and size, and stored under the lead folder', async () => {
    const { app, stored } = makeApp();
    const html = multipartBody('aadhaar.pdf', Buffer.from('<html>not a pdf</html>'), 'application/pdf');
    expect((await app.inject({ method: 'POST', url: `/centre-form/${TOKEN}/upload`, ...html })).json()).toMatchObject({ status: 0, message: 'Choose a PDF, JPG or PNG file' });
    const big = multipartBody('big.pdf', Buffer.concat([Buffer.from('%PDF-'), Buffer.alloc(5 * 1024 * 1024)]), 'application/pdf');
    expect((await app.inject({ method: 'POST', url: `/centre-form/${TOKEN}/upload`, ...big })).json()).toMatchObject({ status: 0, message: 'File must be under 5 MB' });
    const jpeg = multipartBody('pan card.jpg', Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]), 'image/jpeg');
    const okRes = await app.inject({ method: 'POST', url: `/centre-form/${TOKEN}/upload`, ...jpeg });
    expect(okRes.json()).toMatchObject({ status: 1, data: { name: 'pan card.jpg', sig: 'form-sig' } });
    expect(stored).toHaveLength(1);
    expect(stored[0]?.key).toMatch(/^centre-onboarding\/4\/[0-9a-f]{32}-pan_card\.jpg$/);
    expect(stored[0]?.contentType).toBe('image/jpeg');
    await app.close();
  });

  test('reads are rate-limited per client (X-Real-IP behind nginx)', async () => {
    const { app } = makeApp();
    for (let i = 0; i < 60; i += 1) {
      const res = await app.inject({ method: 'GET', url: `/centre-form/${TOKEN}`, headers: { 'x-real-ip': '203.0.113.9' } });
      expect(res.statusCode).toBe(200);
    }
    const blocked = await app.inject({ method: 'GET', url: `/centre-form/${TOKEN}`, headers: { 'x-real-ip': '203.0.113.9' } });
    expect(blocked.statusCode).toBe(429);
    expect(blocked.headers['retry-after']).toBeDefined();
    const other = await app.inject({ method: 'GET', url: `/centre-form/${TOKEN}`, headers: { 'x-real-ip': '198.51.100.7' } });
    expect(other.statusCode).toBe(200);
    await app.close();
  });

  test('submits are rate-limited per client and token', async () => {
    const { app } = makeApp();
    for (let i = 0; i < 10; i += 1) {
      expect((await app.inject({ method: 'POST', url: `/centre-form/${TOKEN}/submit`, payload: {} })).statusCode).toBe(200);
    }
    expect((await app.inject({ method: 'POST', url: `/centre-form/${TOKEN}/submit`, payload: {} })).statusCode).toBe(429);
    await app.close();
  });
});

describe('public form over HTTP, on the real services', () => {
  test('open → upload → submit moves the lead to Under Review; the same link is then closed', async () => {
    const { onboardingDb } = await import('./support/onboarding-db.js');
    const { CentreOnboardingService } = await import('../../src/operations/centre-onboarding-service.js');
    const { CentreFormPublicService } = await import('../../src/operations/centre-form-public-service.js');
    const db = onboardingDb({ centres: [], users: [] });
    const secret = 'route-test-secret-0123456789';
    const now = () => new Date('2026-10-22T05:00:00.000Z');
    const onboarding = new CentreOnboardingService({ prisma: db.prisma, secret, now, sendEmail: () => Promise.resolve() });
    const publicFormService = new CentreFormPublicService({ prisma: db.prisma, secret, now });
    const lead = await onboarding.createLead(1, { centre_name: 'Kollam Early Years', contact_name: 'Arun S', email: 'arun@key.in', state: 'Kerala', source: 'Website' });
    const sent = await onboarding.sendLink(1, lead.data?.id ?? 0, 'copy');
    const token = (sent.data?.link ?? '').split('/').pop() ?? '';
    const stored: string[] = [];
    const app = Fastify({ logger: false });
    void app.register(multipart);
    void app.register((scope, _opts, done) => {
      registerCentreOnboardingRoutes(scope, {
        requireAuth: (_req, reply) => { void reply.code(401).send({}); return Promise.resolve(); },
        requireAdminOnlyRole: () => Promise.resolve(),
        storage: { name: 'fake', uploadObject: ({ key }: { key: string }) => { stored.push(key); return Promise.resolve({ key, provider: 'fake', location: `https://cdn.example/${key}` }); } } as unknown as StorageProvider,
        onboardingService: onboarding,
        affiliationService: {} as CentreAffiliationService,
        publicFormService,
      });
      done();
    });

    const open = (await app.inject({ method: 'GET', url: `/centre-form/${token}` })).json<{ data: { state: string; prefill: Record<string, unknown> } }>();
    expect(open.data.state).toBe('open');
    expect(open.data.prefill).toMatchObject({ centreName: 'Kollam Early Years', email: 'arun@key.in' });

    const upload = async (name: string) => (await app.inject({ method: 'POST', url: `/centre-form/${token}/upload`, ...multipartBody(name, Buffer.from('%PDF-1.7 x'), 'application/pdf') })).json<{ data: { url: string; name: string } }>().data;
    const idDoc = await upload('aadhaar.pdf');
    const panDoc = await upload('pan.pdf');
    expect(stored.every((k) => k.startsWith(`centre-onboarding/${lead.data?.id ?? 0}/`))).toBe(true);

    const form = {
      centreName: 'Kollam Early Years', legalEntity: 'KEY Trust', entityType: 'Trust', country: 'India', state: 'Kerala', district: 'Kollam',
      city: 'Kollam', pin: '691001', address1: 'Main Road', contactName: 'Arun S', designation: 'Director', mobile: '9746011122',
      email: 'arun@key.in', idNumber: '456712349876', pan: 'AABTK1234K', idDoc, panDoc,
    };
    const submit = await app.inject({ method: 'POST', url: `/centre-form/${token}/submit`, payload: { form, declaration: true } });
    expect(submit.json()).toEqual({ status: 1, message: 'Application submitted', data: { ref: 'ONB-001' } });
    expect(db.tables.centre_onboarding[0]?.stage).toBe('under_review');
    const again = (await app.inject({ method: 'GET', url: `/centre-form/${token}` })).json<{ data: { state: string; reason: string } }>();
    expect(again.data).toMatchObject({ state: 'closed', reason: 'submitted' });
    const lateUpload = await app.inject({ method: 'POST', url: `/centre-form/${token}/upload`, ...multipartBody('x.pdf', Buffer.from('%PDF-1.7 x'), 'application/pdf') });
    expect(lateUpload.json()).toMatchObject({ status: 0 });
    await app.close();
  });
});
