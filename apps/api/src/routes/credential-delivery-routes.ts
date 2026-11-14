import { randomBytes } from 'node:crypto';

import type { FastifyInstance, FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';

import type { AuthService } from '../auth/auth-service.js';
import { requireLegacyRoles } from '../auth/middleware.js';
import { PERMISSION_KEYS, requirePermission } from '../auth/permissions.js';
import { LEGACY_ROLE } from '../auth/roles.js';
import type { StorageProvider } from '../integrations/contracts.js';
import { safeFileName, sniffFileType } from '../operations/centre-onboarding-model.js';
import { CredentialDeliveryService, type Outcome } from '../operations/credential-delivery-service.js';
import { CredentialInsightsService } from '../operations/credential-insights-service.js';
import { CredentialNoticeFeed } from '../operations/credential-notifications.js';
import { CredentialScansService } from '../operations/credential-scans-service.js';
import { NOT_SET_UP_MESSAGE, isMissingTable } from '../operations/credential-types.js';

// Credential Manager — Delivery Tracking, Scan History, notifications, Dashboard,
// Reports (admin) and Centre Certificates (centre portal). Every admin route is
// permission-guarded server-side (credentials.access / credentials.reports);
// every centre route is role 7 only and scoped to the caller's own centre
// (users.centre_id) — a client-sent centre id is never read.

export interface CredentialDeliveryRouteDeps {
  requireAuth: preHandlerAsyncHookHandler;
  authService: AuthService;
  storage?: StorageProvider | undefined;
  deliveryService?: CredentialDeliveryService;
  scansService?: CredentialScansService;
  insightsService?: CredentialInsightsService;
  noticeFeed?: CredentialNoticeFeed;
}

const PROOF_MAX_BYTES = 5 * 1024 * 1024;

function payloadOf(request: FastifyRequest): Record<string, unknown> {
  const source = request.method === 'GET' ? request.query : request.body;
  return source && typeof source === 'object' && !Array.isArray(source) ? (source as Record<string, unknown>) : {};
}

const int = (value: unknown): number => {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(n) && n > 0 ? n : 0;
};
const str = (value: unknown): string => (typeof value === 'string' ? value : '');
const ids = (value: unknown): number[] => (Array.isArray(value) ? value.map(int).filter(Boolean) : []);
const paramId = (request: FastifyRequest): number => int((request.params as { id?: unknown } | undefined)?.id);

function actorOf(request: FastifyRequest): number | null {
  const id = int(request.authContext?.user.id);
  return id > 0 ? id : null;
}

function sendError(reply: FastifyReply, error: unknown): void {
  if (isMissingTable(error)) {
    reply.code(200).send({ status: 0, message: NOT_SET_UP_MESSAGE, data: {} });
    return;
  }
  reply.log.error({ err: error }, 'credential delivery request failed');
  reply.code(500).send({ status: 0, message: 'Something went wrong. Please try again.', data: {} });
}

function sendOutcome<T>(reply: FastifyReply, outcome: Outcome<T>): void {
  reply.code(200).send({ status: outcome.status, message: outcome.message, data: outcome.data ?? {} });
}

interface UploadedFile { filename: string; toBuffer: () => Promise<Buffer> }

/** The single proof file (PDF / PNG / JPEG, 5 MB), checked by content, stored privately. A string is a refusal. */
async function storeProof(request: FastifyRequest, storage: StorageProvider | undefined): Promise<{ key: string; name: string } | string> {
  if (!storage) return 'File storage is not configured on this server.';
  const fileFn = (request as unknown as { file?: (opts?: { limits?: { fileSize?: number; files?: number; fields?: number; parts?: number } }) => Promise<UploadedFile | undefined> }).file;
  if (typeof fileFn !== 'function' || !request.isMultipart()) return 'Choose a file to upload.';
  const file = await fileFn.call(request, { limits: { fileSize: PROOF_MAX_BYTES, files: 1, fields: 3, parts: 4 } });
  if (!file) return 'Choose a file to upload.';
  let body: Buffer;
  try {
    body = await file.toBuffer();
  } catch (error: unknown) {
    if ((error as { code?: string } | null)?.code === 'FST_REQ_FILE_TOO_LARGE') return 'File must be under 5 MB.';
    throw error;
  }
  if (body.length === 0) return 'The file is empty.';
  if (body.length > PROOF_MAX_BYTES) return 'File must be under 5 MB.';
  const type = sniffFileType(body.subarray(0, 8));
  if (!type) return 'Choose a PDF, JPG or PNG file.';
  const name = file.filename || 'proof';
  const key = `credentials/delivery-proof/${randomBytes(16).toString('hex')}-${safeFileName(name)}`;
  await storage.uploadObject({ key, body, contentType: type });
  return { key, name: name.slice(0, 200) };
}

export function registerCredentialDeliveryRoutes(app: FastifyInstance, deps: CredentialDeliveryRouteDeps): void {
  const delivery = deps.deliveryService ?? new CredentialDeliveryService({ storage: deps.storage });
  const scans = deps.scansService ?? new CredentialScansService();
  const insights = deps.insightsService ?? new CredentialInsightsService();
  const feed = deps.noticeFeed ?? new CredentialNoticeFeed();
  const access = { preHandler: [deps.requireAuth, requirePermission(PERMISSION_KEYS.CREDENTIALS_ACCESS)] };
  const reports = { preHandler: [deps.requireAuth, requirePermission(PERMISSION_KEYS.CREDENTIALS_REPORTS)] };
  const centre = { preHandler: [deps.requireAuth, requireLegacyRoles(deps.authService, [LEGACY_ROLE.CENTRE])] };

  const run = <T>(fn: (request: FastifyRequest) => Promise<Outcome<T>>) =>
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try { sendOutcome(reply, await fn(request)); } catch (error: unknown) { sendError(reply, error); }
    };

  // ── Delivery Tracking (credentials.access) ──────────────────────────────
  app.get('/admin/credentials/delivery/overview', access, run(() => delivery.overview()));
  app.post('/admin/credentials/delivery/print', access, run((r) => {
    const p = payloadOf(r);
    const serials = p.serials && typeof p.serials === 'object' && !Array.isArray(p.serials) ? p.serials as Record<string, unknown> : {};
    return delivery.printItems(actorOf(r), ids(p.item_ids), Object.fromEntries(Object.entries(serials).map(([k, v]) => [k, str(v)])));
  }));
  app.post('/admin/credentials/delivery/batches/create', access, run((r) => {
    const p = payloadOf(r);
    return delivery.createBatch(actorOf(r), {
      itemIds: ids(p.item_ids), type: str(p.type), centreId: int(p.centre_id), address: str(p.address), courierId: int(p.courier_id), awbNo: str(p.awb_no),
    });
  }));
  app.get('/admin/credentials/delivery/batches/:id', access, run((r) => delivery.batchDetail(paramId(r))));
  app.post('/admin/credentials/delivery/batches/:id/packing-list', access, run((r) => delivery.generatePackingList(actorOf(r), paramId(r))));
  app.get('/admin/credentials/delivery/batches/:id/packing-list', access, run((r) => delivery.packingListUrl(paramId(r))));
  app.post('/admin/credentials/delivery/batches/:id/dispatch', access, run((r) => delivery.dispatchBatch(actorOf(r), paramId(r))));
  app.post('/admin/credentials/delivery/items/:id/update', access, run((r) => {
    const p = payloadOf(r);
    return delivery.updateItem(actorOf(r), paramId(r), { status: str(p.status), receiverName: str(p.receiver_name), proofKey: str(p.proof_key) || null, remarks: str(p.remarks) });
  }));
  app.post('/admin/credentials/delivery/items/:id/duplicate', access, run((r) => delivery.duplicateLostItem(actorOf(r), paramId(r), str(payloadOf(r).reason))));
  app.get('/admin/credentials/delivery/items/:id/proof', access, run((r) => delivery.itemProofUrl(paramId(r))));
  app.get('/admin/credentials/delivery/documents/:id/file', access, run((r) => delivery.documentFileUrl(paramId(r))));
  app.post('/admin/credentials/delivery/proof', access, async (request, reply) => {
    try {
      const stored = await storeProof(request, deps.storage);
      sendOutcome(reply, typeof stored === 'string' ? { status: 0, message: stored } : { status: 1, message: 'Uploaded', data: stored });
    } catch (error: unknown) { sendError(reply, error); }
  });

  // ── Scan History (credentials.access) ───────────────────────────────────
  app.get('/admin/credentials/scans', access, run((r) => {
    const p = payloadOf(r);
    const day = (v: unknown, endOfDay: boolean): Date | null => {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str(v));
      return m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + (endOfDay ? 1 : 0)) - 330 * 60 * 1000) : null;
    };
    return scans.overview({ from: day(p.from, false), to: day(p.to, true) });
  }));
  app.post('/admin/credentials/scans/alerts/:id/review', access, run((r) => scans.review(actorOf(r), paramId(r), str(payloadOf(r).note))));

  // ── Notifications bell (credentials.access) ─────────────────────────────
  app.get('/admin/credentials/notifications', access, run(async () => ({ status: 1, message: 'success', data: await feed.adminFeed() })));
  app.post('/admin/credentials/notifications/read', access, run(async (r) => {
    const p = payloadOf(r);
    const count = await feed.markAdminRead(p.all === true ? 'all' : ids(p.ids));
    return { status: 1, message: 'success', data: { count } };
  }));

  // ── Dashboard (credentials.access) and Reports (credentials.reports) ────
  app.get('/admin/credentials/dashboard', access, run(() => insights.dashboard()));
  app.get('/admin/credentials/reports', reports, run(async () => ({ status: 1, message: 'success', data: { reports: insights.reportList() } })));
  app.get('/admin/credentials/reports/:key', reports, run((r) => {
    const p = payloadOf(r);
    return insights.report(str((r.params as { key?: unknown }).key), { from: str(p.from) || null, to: str(p.to) || null });
  }));

  // ── Centre Certificates (centre role 7, own centre only) ────────────────
  const callerOf = (r: FastifyRequest): number => int(r.authContext?.user.id);
  app.get('/centre/portal/credentials', centre, run((r) => delivery.centreOverview(callerOf(r))));
  app.post('/centre/portal/credentials/parcels/:id/acknowledge', centre, run((r) => delivery.acknowledgeParcel(callerOf(r), paramId(r), str(payloadOf(r).receiver_name))));
  app.post('/centre/portal/credentials/items/:id/handover', centre, run((r) => {
    const p = payloadOf(r);
    return delivery.handOver(callerOf(r), paramId(r), str(p.receiver_name), str(p.proof_key) || null);
  }));
  app.post('/centre/portal/credentials/proof', centre, async (request, reply) => {
    try {
      const stored = await storeProof(request, deps.storage);
      sendOutcome(reply, typeof stored === 'string' ? { status: 0, message: stored } : { status: 1, message: 'Uploaded', data: stored });
    } catch (error: unknown) { sendError(reply, error); }
  });
  app.get('/centre/portal/credentials/documents/:id/file', centre, run(async (r) => {
    const centreId = await delivery.callerCentre(callerOf(r));
    return centreId ? delivery.documentFileUrl(paramId(r), centreId) : { status: 0 as const, message: 'Your centre could not be found.' };
  }));
  app.get('/centre/portal/credentials/items/:id/proof', centre, run(async (r) => {
    const centreId = await delivery.callerCentre(callerOf(r));
    return centreId ? delivery.itemProofUrl(paramId(r), centreId) : { status: 0 as const, message: 'Your centre could not be found.' };
  }));
}
