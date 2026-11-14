import multipart from '@fastify/multipart';
import Fastify from 'fastify';
import { describe, expect, test } from 'vitest';

import { requireLegacyAuth, requireLegacyRoles } from '../../src/auth/middleware.js';
import { requirePermissionManager } from '../../src/auth/permission-guards.js';
import { ADMIN_PORTAL_SURFACE_ROLES } from '../../src/auth/roles.js';
import type { StorageProvider } from '../../src/integrations/contracts.js';
import type { CredentialSettingsService } from '../../src/operations/credential-settings-service.js';
import { registerCredentialSettingsRoutes } from '../../src/routes/credential-settings-routes.js';

// Route guards for the Credential Manager settings: counsellor 403, admin
// without the grant 403, super admin 200; credentials.access reads lookups only.

const USERS: Record<string, { id: number; role_id: number }> = {
  super: { id: 1, role_id: 1 },
  nogrant: { id: 8, role_id: 8 },
  settings: { id: 9, role_id: 8 },
  access: { id: 10, role_id: 8 },
  counsellor: { id: 20, role_id: 9 },
  manager: { id: 11, role_id: 8 },
};
const GRANTS: Record<number, string[]> = {
  9: ['credentials.settings'], 10: ['credentials.access'], 11: ['users.manage_admins'],
};
const loader = (userId: number) => Promise.resolve(new Set(GRANTS[userId] ?? []));

function authService() {
  return {
    authenticateAuthToken: (token: string) => {
      const user = USERS[token];
      return Promise.resolve(user ? { user: { ...user, name: token } } : null);
    },
    logAuthDenied: () => Promise.resolve(),
    logRbacDenied: () => Promise.resolve(),
  } as never;
}

function makeApp() {
  const calls: string[] = [];
  const stored: Array<{ key: string; publicRead?: boolean | undefined }> = [];
  const result = (name: string) => (...args: unknown[]) => { calls.push(`${name}:${String(args[0])}`); return Promise.resolve({ ready: true, message: '', rows: [], status: 1 }); };
  const service = {
    options: result('options'), list: result('list'), listSeries: result('listSeries'), save: result('save'), saveSeries: result('saveSeries'),
    remove: result('remove'), listAudit: result('audit'), getDelivery: result('getDelivery'), saveDelivery: result('saveDelivery'),
    listOfferingSettings: result('listOffering'), saveOfferingSettings: result('saveOffering'),
  } as unknown as CredentialSettingsService;
  const storage = {
    name: 'fake',
    uploadObject: (input: { key: string; publicRead?: boolean }) => { stored.push({ key: input.key, publicRead: input.publicRead }); return Promise.resolve({ key: input.key, provider: 'fake', location: input.key }); },
    createSignedDownloadUrl: (input: { key: string }) => Promise.resolve(`https://signed.example/${input.key}?sig=1`),
  } as unknown as StorageProvider;
  const app = Fastify({ logger: false });
  void app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } });
  void app.register((scope, _o, done) => {
    registerCredentialSettingsRoutes(scope, {
      requireAuth: requireLegacyAuth(authService()),
      requireAdminOnlyRole: requireLegacyRoles(authService(), ADMIN_PORTAL_SURFACE_ROLES),
      storage, service, permissionLoader: loader,
    });
    scope.post('/admin/permissions/user/set', { preHandler: [requireLegacyAuth(authService()), requireLegacyRoles(authService(), ADMIN_PORTAL_SURFACE_ROLES), requirePermissionManager(loader)] }, (_req, reply) => {
      calls.push('perm-set');
      return reply.send({ status: 1 });
    });
    done();
  });
  return { app, calls, stored };
}

function multipartBody(filename: string, content: Buffer, contentType: string) {
  const boundary = '----ttiiTest';
  const head = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`);
  return { payload: Buffer.concat([head, content, Buffer.from(`\r\n--${boundary}--\r\n`)]), headers: { 'content-type': `multipart/form-data; boundary=${boundary}` } };
}
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);

describe('settings routes need credentials.settings', () => {
  test('counsellor 403, admin without grant 403, anonymous 401, super admin 200', async () => {
    const { app, calls } = makeApp();
    for (const token of ['counsellor', 'nogrant', 'access']) {
      expect((await app.inject({ method: 'GET', url: `/admin/credentials/settings/options?auth_token=${token}` })).statusCode).toBe(403);
      expect((await app.inject({ method: 'POST', url: '/admin/credentials/settings/save', payload: { auth_token: token, category: 'rule' } })).statusCode).toBe(403);
      expect((await app.inject({ method: 'POST', url: '/admin/credentials/settings/delete', payload: { auth_token: token, category: 'rule', id: 1 } })).statusCode).toBe(403);
      expect((await app.inject({ method: 'POST', url: '/admin/credentials/offering-settings/save', payload: { auth_token: token } })).statusCode).toBe(403);
      expect((await app.inject({ method: 'POST', url: '/admin/credentials/settings/delivery', payload: { auth_token: token } })).statusCode).toBe(403);
    }
    expect((await app.inject({ method: 'GET', url: '/admin/credentials/settings/options' })).statusCode).toBe(401);
    expect(calls).toEqual([]);
    expect((await app.inject({ method: 'GET', url: '/admin/credentials/settings/options?auth_token=super' })).statusCode).toBe(200);
    expect((await app.inject({ method: 'POST', url: '/admin/credentials/settings/save', payload: { auth_token: 'settings', category: 'hold_reason', name: 'x' } })).statusCode).toBe(200);
    expect(calls).toEqual(['options:undefined', 'save:9']);
    await app.close();
  });

  test('credentials.access reads the shared lookups but not rules or templates', async () => {
    const { app, calls } = makeApp();
    for (const category of ['hold_reason', 'courier', 'grading', 'signatory', 'number_series']) {
      expect((await app.inject({ method: 'GET', url: `/admin/credentials/settings/list?category=${category}&auth_token=access` })).statusCode).toBe(200);
    }
    for (const category of ['rule', 'template']) {
      expect((await app.inject({ method: 'GET', url: `/admin/credentials/settings/list?category=${category}&auth_token=access` })).statusCode).toBe(403);
    }
    expect((await app.inject({ method: 'GET', url: '/admin/credentials/settings/delivery?auth_token=access' })).statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: '/admin/credentials/settings/list?category=hold_reason&auth_token=nogrant' })).statusCode).toBe(403);
    expect(calls).toHaveLength(6);
    await app.close();
  });

  test('offering credential fields: readable by admins, writable only with settings', async () => {
    const { app } = makeApp();
    expect((await app.inject({ method: 'GET', url: '/admin/credentials/offering-settings?auth_token=nogrant' })).statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: '/admin/credentials/offering-settings?auth_token=counsellor' })).statusCode).toBe(403);
    expect((await app.inject({ method: 'POST', url: '/admin/credentials/offering-settings/save', payload: { auth_token: 'settings' } })).statusCode).toBe(200);
    await app.close();
  });
});

describe('GET /admin/credentials/me/permissions', () => {
  test('super admin all true; admin its grants; counsellor and ungranted all false', async () => {
    const { app } = makeApp();
    const get = async (token: string) => (await app.inject({ method: 'GET', url: `/admin/credentials/me/permissions?auth_token=${token}` })).json<{ data: unknown }>().data;
    expect(await get('super')).toEqual({ access: true, revoke: true, override: true, settings: true, reports: true });
    expect(await get('access')).toEqual({ access: true, revoke: false, override: false, settings: false, reports: false });
    expect(await get('nogrant')).toEqual({ access: false, revoke: false, override: false, settings: false, reports: false });
    expect(await get('counsellor')).toEqual({ access: false, revoke: false, override: false, settings: false, reports: false });
    expect((await app.inject({ method: 'GET', url: '/admin/credentials/me/permissions' })).statusCode).toBe(401);
    await app.close();
  });
});

describe('image upload and signed preview', () => {
  test('PNG/JPG only, stored PRIVATE under credentials/settings/, preview by signed URL', async () => {
    const { app, stored } = makeApp();
    const good = await app.inject({ method: 'POST', url: '/admin/credentials/settings/upload?kind=signature&auth_token=super', ...multipartBody('sig.png', PNG, 'image/png') });
    const key = good.json<{ data: { key: string } }>().data.key;
    expect(good.json()).toMatchObject({ status: 1 });
    expect(key).toMatch(/^credentials\/settings\/signature-[0-9a-f]{32}\.png$/);
    expect(stored[0]?.publicRead).toBeUndefined();
    const pdf = await app.inject({ method: 'POST', url: '/admin/credentials/settings/upload?auth_token=super', ...multipartBody('x.png', Buffer.from('%PDF-1.7 abc'), 'image/png') });
    expect(pdf.json()).toMatchObject({ status: 0, message: 'Choose a PNG or JPG image under 5 MB' });
    const big = await app.inject({ method: 'POST', url: '/admin/credentials/settings/upload?auth_token=super', ...multipartBody('big.png', Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)]), 'image/png') });
    expect(big.json()).toMatchObject({ status: 0, message: 'Choose a PNG or JPG image under 5 MB' });
    expect((await app.inject({ method: 'POST', url: '/admin/credentials/settings/upload?auth_token=nogrant', ...multipartBody('sig.png', PNG, 'image/png') })).statusCode).toBe(403);
    const url = await app.inject({ method: 'GET', url: `/admin/credentials/settings/file_url?key=${encodeURIComponent(key)}&auth_token=super` });
    expect(url.json<{ data: { url: string } }>().data.url).toContain('signed.example');
    const bad = await app.inject({ method: 'GET', url: '/admin/credentials/settings/file_url?key=uploads/secret.png&auth_token=super' });
    expect(bad.json()).toMatchObject({ status: 0 });
    await app.close();
  });
});

describe('POST /admin/permissions/user/set guard', () => {
  test('counsellor and an admin without users.manage_admins are refused; super admin and a manager pass', async () => {
    const { app, calls } = makeApp();
    const set = async (token: string) => (await app.inject({ method: 'POST', url: '/admin/permissions/user/set', payload: { auth_token: token, user_id: 5 } })).statusCode;
    expect(await set('counsellor')).toBe(403);
    expect(await set('nogrant')).toBe(403);
    expect(calls).toEqual([]);
    expect(await set('super')).toBe(200);
    expect(await set('manager')).toBe(200);
    expect(calls).toEqual(['perm-set', 'perm-set']);
    await app.close();
  });
});
