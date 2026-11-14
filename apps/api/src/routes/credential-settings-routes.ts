import { randomBytes } from 'node:crypto';

import type { FastifyInstance, FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';

import { requireAnyCredentialPermission, resolveCredentialPermissions, type PermissionLoader } from '../auth/permission-guards.js';
import type { StorageProvider } from '../integrations/contracts.js';
import { intId, sniffFileType, text } from '../operations/centre-onboarding-model.js';
import { SETTINGS_FILE_PREFIX, SETTINGS_IMAGE_MAX_BYTES } from '../operations/credential-settings-model.js';
import { CredentialSettingsService, isSettingCategory, type Outcome } from '../operations/credential-settings-service.js';

// Credential Manager → Settings, offering credential fields, permissions
// (spec §1.7, §1.12). Writes answer 200 + status 0 when refused. Everything
// is server-enforced: settings = credentials.settings; the lookup reads that
// other pages need (hold reasons, couriers, grading, signatories, number
// series, delivery settings) also admit credentials.access.

export interface CredentialSettingsRouteDeps {
  requireAuth: preHandlerAsyncHookHandler;
  /** Admin (1) / Subadmin (8) only: used for the offering-field read. */
  requireAdminOnlyRole: preHandlerAsyncHookHandler;
  storage?: StorageProvider | undefined;
  service?: CredentialSettingsService;
  permissionLoader?: PermissionLoader;
}

const SIGNED_URL_SECONDS = 300;
/** Categories whose rows other credential pages read (so credentials.access may read them). */
const SHARED_READ = new Set(['signatory', 'grading', 'hold_reason', 'courier']);

function payloadOf(request: FastifyRequest): Record<string, unknown> {
  const source = request.method === 'GET' ? request.query : request.body;
  return source && typeof source === 'object' && !Array.isArray(source) ? (source as Record<string, unknown>) : {};
}
function actorOf(request: FastifyRequest): number | null {
  const id = intId(request.authContext?.user.id);
  return id > 0 ? id : null;
}
function sendError(reply: FastifyReply, error: unknown): void {
  reply.log.error({ err: error }, 'credential settings request failed');
  reply.code(500).send({ status: 0, message: 'Something went wrong. Please try again.', data: {} });
}
function sendOutcome<T>(reply: FastifyReply, outcome: Outcome<T>): void {
  reply.code(200).send({ status: outcome.status, message: outcome.message, data: outcome.data ?? {} });
}

interface UploadedFile { filename: string; toBuffer: () => Promise<Buffer> }

async function readImage(request: FastifyRequest): Promise<{ name: string; body: Buffer } | string> {
  const tooLarge = 'Choose a PNG or JPG image under 5 MB';
  const fileFn = (request as unknown as { file?: (o?: { limits?: Record<string, number> }) => Promise<UploadedFile | undefined> }).file;
  if (typeof fileFn !== 'function' || !request.isMultipart()) return 'Choose a file to upload.';
  const file = await fileFn.call(request, { limits: { fileSize: SETTINGS_IMAGE_MAX_BYTES, files: 1, fields: 3, parts: 4, fieldSize: 1024 } });
  if (!file) return 'Choose a file to upload.';
  try {
    const body = await file.toBuffer();
    if (body.length > SETTINGS_IMAGE_MAX_BYTES || body.length === 0) return tooLarge;
    return { name: file.filename || 'image', body };
  } catch (error: unknown) {
    if ((error as { code?: string } | null)?.code === 'FST_REQ_FILE_TOO_LARGE') return tooLarge;
    throw error;
  }
}

export function registerCredentialSettingsRoutes(app: FastifyInstance, deps: CredentialSettingsRouteDeps): void {
  const service = deps.service ?? new CredentialSettingsService();
  const load = deps.permissionLoader;
  const settingsGuard = { preHandler: [deps.requireAuth, requireAnyCredentialPermission(['settings'], load)] };
  const sharedReadGuard = { preHandler: [deps.requireAuth, requireAnyCredentialPermission(['settings', 'access'], load)] };

  const safe = (fn: (request: FastifyRequest, reply: FastifyReply) => Promise<void>) =>
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try { await fn(request, reply); } catch (error: unknown) { sendError(reply, error); }
    };

  // ── Permissions for the signed-in admin (drives the sidebar and page gates) ─
  app.get('/admin/credentials/me/permissions', { preHandler: [deps.requireAuth] }, safe(async (request, reply) => {
    const perms = await resolveCredentialPermissions(request, load);
    reply.code(200).send({ status: 1, message: 'success', data: perms });
  }));

  // ── Lookups + lists ─────────────────────────────────────────────────────────
  app.get('/admin/credentials/settings/options', settingsGuard, safe(async (_request, reply) => {
    reply.code(200).send({ status: 1, message: 'success', data: await service.options() });
  }));

  app.get('/admin/credentials/settings/list', sharedReadGuard, safe(async (request, reply) => {
    const category = text(payloadOf(request).category);
    if (category === 'number_series') {
      reply.code(200).send({ status: 1, message: 'success', data: await service.listSeries() });
      return;
    }
    if (!isSettingCategory(category)) { sendOutcome(reply, { status: 0, message: 'Unknown settings tab.' }); return; }
    // Rules and templates are settings-only; the shared lookups are also readable with access.
    if (!SHARED_READ.has(category)) {
      const perms = await resolveCredentialPermissions(request, load);
      if (!perms.settings) { reply.code(403).send({ status: 0, message: 'You don\'t have the "credentials.settings" permission.', data: [] }); return; }
    }
    reply.code(200).send({ status: 1, message: 'success', data: await service.list(category) });
  }));

  app.post('/admin/credentials/settings/save', settingsGuard, safe(async (request, reply) => {
    const body = payloadOf(request);
    const category = text(body.category);
    if (category === 'number_series') { sendOutcome(reply, await service.saveSeries(actorOf(request), body)); return; }
    if (!isSettingCategory(category)) { sendOutcome(reply, { status: 0, message: 'Unknown settings tab.' }); return; }
    sendOutcome(reply, await service.save(actorOf(request), category, body));
  }));

  app.post('/admin/credentials/settings/delete', settingsGuard, safe(async (request, reply) => {
    const body = payloadOf(request);
    const category = text(body.category);
    if (category !== 'number_series' && !isSettingCategory(category)) { sendOutcome(reply, { status: 0, message: 'Unknown settings tab.' }); return; }
    sendOutcome(reply, await service.remove(actorOf(request), category as never, intId(body.id)));
  }));

  app.get('/admin/credentials/settings/audit', settingsGuard, safe(async (_request, reply) => {
    reply.code(200).send({ status: 1, message: 'success', data: await service.listAudit() });
  }));

  // ── Images (template background, signature): PNG/JPG, <= 5 MB, PRIVATE ──────
  app.post('/admin/credentials/settings/upload', settingsGuard, safe(async (request, reply) => {
    if (!deps.storage) { sendOutcome(reply, { status: 0, message: 'File storage is not configured on this server.' }); return; }
    const kind = text((request.query as Record<string, unknown> | undefined)?.kind) === 'signature' ? 'signature' : 'background';
    const upload = await readImage(request);
    if (typeof upload === 'string') { sendOutcome(reply, { status: 0, message: upload }); return; }
    const type = sniffFileType(upload.body.subarray(0, 8));
    if (type !== 'image/png' && type !== 'image/jpeg') { sendOutcome(reply, { status: 0, message: 'Choose a PNG or JPG image under 5 MB' }); return; }
    const key = `${SETTINGS_FILE_PREFIX}${kind}-${randomBytes(16).toString('hex')}.${type === 'image/png' ? 'png' : 'jpg'}`;
    await deps.storage.uploadObject({ key, body: upload.body, contentType: type });
    sendOutcome(reply, { status: 1, message: 'Uploaded', data: { key, name: upload.name.slice(0, 200) } });
  }));

  /** A short-lived signed URL so the editor can preview a private image. */
  app.get('/admin/credentials/settings/file_url', settingsGuard, safe(async (request, reply) => {
    const key = text(payloadOf(request).key);
    if (!deps.storage || !key.startsWith(SETTINGS_FILE_PREFIX) || key.includes('..')) { sendOutcome(reply, { status: 0, message: 'File not found.' }); return; }
    const url = await deps.storage.createSignedDownloadUrl({ key, expiresInSeconds: SIGNED_URL_SECONDS });
    sendOutcome(reply, { status: 1, message: 'success', data: { url, expiresInSeconds: SIGNED_URL_SECONDS } });
  }));

  // ── Delivery settings (the dialog the Delivery Tracking page mounts) ────────
  app.get('/admin/credentials/settings/delivery', sharedReadGuard, safe(async (_request, reply) => {
    reply.code(200).send({ status: 1, message: 'success', data: await service.getDelivery() });
  }));
  app.post('/admin/credentials/settings/delivery', settingsGuard, safe(async (request, reply) => {
    sendOutcome(reply, await service.saveDelivery(actorOf(request), payloadOf(request)));
  }));

  // ── Course Offering credential fields ───────────────────────────────────────
  app.get('/admin/credentials/offering-settings', { preHandler: [deps.requireAuth, deps.requireAdminOnlyRole] }, safe(async (_request, reply) => {
    reply.code(200).send({ status: 1, message: 'success', data: await service.listOfferingSettings() });
  }));
  app.post('/admin/credentials/offering-settings/save', settingsGuard, safe(async (request, reply) => {
    sendOutcome(reply, await service.saveOfferingSettings(actorOf(request), payloadOf(request)));
  }));
}
