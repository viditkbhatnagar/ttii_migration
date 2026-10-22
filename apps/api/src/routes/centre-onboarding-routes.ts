import { randomBytes } from 'node:crypto';

import type { FastifyInstance, FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';

import { AGREEMENT_FILE_MAX_BYTES, CENTRE_FORM_UPLOAD_MAX_BYTES } from '@ttii/shared-types';

import { FixedWindowRateLimiter } from '../auth/rate-limit.js';
import type { StorageProvider } from '../integrations/contracts.js';
import { CentreAffiliationService } from '../operations/centre-affiliation-service.js';
import { CentreFormPublicService } from '../operations/centre-form-public-service.js';
import {
  agreementUploadFolder, formUploadFolder, intId, safeFileName, sniffFileType, text, type Outcome,
} from '../operations/centre-onboarding-model.js';
import { CentreOnboardingService } from '../operations/centre-onboarding-service.js';

// Centres v2 (Naji 2026-10-22): Centre Onboarding, Affiliation & Agreements
// and the public centre application form.
//
// /admin/centres/onboarding/* and /admin/centres/affiliation/*: Admin (1) and
// Subadmin (8) only. Refusals answer 200 { status: 0, message } so the page can
// toast the reason; reads answer ready:false with empty data until the
// 2026-10-22 migration runs.
//
// /centre-form/:token*: PUBLIC (no login, the token is the credential),
// rate-limited per client IP. Uploads accept PDF /
// PNG / JPEG up to 5 MB, checked by content, not by the name.

export interface CentreOnboardingRouteDeps {
  requireAuth: preHandlerAsyncHookHandler;
  requireAdminOnlyRole: preHandlerAsyncHookHandler;
  storage?: StorageProvider | undefined;
  onboardingService?: CentreOnboardingService;
  affiliationService?: CentreAffiliationService;
  publicFormService?: CentreFormPublicService;
}

const RATE_WINDOW_MS = 15 * 60 * 1000;
const PUBLIC_READ_LIMIT = 60;
const PUBLIC_UPLOAD_LIMIT = 40;
const PUBLIC_SUBMIT_LIMIT = 10;
const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

function payloadOf(request: FastifyRequest): Record<string, unknown> {
  const source = request.method === 'GET' ? request.query : request.body;
  return source && typeof source === 'object' && !Array.isArray(source) ? (source as Record<string, unknown>) : {};
}

function actorOf(request: FastifyRequest): number | null {
  const id = intId(request.authContext?.user.id);
  return id > 0 ? id : null;
}

/** Behind nginx every request comes from loopback; nginx sets X-Real-IP to the client (it overwrites any client value). */
export function clientIp(request: FastifyRequest): string {
  const ip = request.ip || '';
  const real = request.headers['x-real-ip'];
  if (LOOPBACK.has(ip) && typeof real === 'string' && real.trim() !== '') return real.trim();
  return ip || 'unknown';
}

function sendError(reply: FastifyReply, error: unknown): void {
  reply.log.error({ err: error }, 'centre onboarding request failed');
  reply.code(500).send({ status: 0, message: 'Something went wrong. Please try again.', data: {} });
}

function sendOutcome<T>(reply: FastifyReply, outcome: Outcome<T>): void {
  reply.code(200).send({ status: outcome.status, message: outcome.message, data: outcome.data ?? {} });
}

interface UploadedFile { filename: string; mimetype: string; toBuffer: () => Promise<Buffer> }

/** Read the single multipart file with a hard size cap. A string is a refusal message. */
async function readUpload(request: FastifyRequest, maxBytes: number, tooLarge: string): Promise<{ name: string; body: Buffer } | string> {
  const fileFn = (request as unknown as { file?: (opts?: { limits?: { fileSize?: number } }) => Promise<UploadedFile | undefined> }).file;
  if (typeof fileFn !== 'function' || !request.isMultipart()) return 'Choose a file to upload.';
  const file = await fileFn.call(request, { limits: { fileSize: maxBytes } });
  if (!file) return 'Choose a file to upload.';
  try {
    const body = await file.toBuffer();
    if (body.length > maxBytes) return tooLarge;
    if (body.length === 0) return 'The file is empty.';
    return { name: file.filename || 'file', body };
  } catch (error: unknown) {
    if ((error as { code?: string } | null)?.code === 'FST_REQ_FILE_TOO_LARGE') return tooLarge;
    throw error;
  }
}

export function registerCentreOnboardingRoutes(app: FastifyInstance, deps: CentreOnboardingRouteDeps): void {
  const onboarding = deps.onboardingService ?? new CentreOnboardingService();
  const affiliation = deps.affiliationService ?? new CentreAffiliationService(deps.storage ? { storage: deps.storage } : {});
  const publicForm = deps.publicFormService ?? new CentreFormPublicService();
  const guard = { preHandler: [deps.requireAuth, deps.requireAdminOnlyRole] };
  const readLimiter = new FixedWindowRateLimiter(RATE_WINDOW_MS);
  const uploadLimiter = new FixedWindowRateLimiter(RATE_WINDOW_MS);
  const submitLimiter = new FixedWindowRateLimiter(RATE_WINDOW_MS);

  const read = (fn: (p: Record<string, unknown>) => Promise<unknown>) =>
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        reply.code(200).send({ status: 1, message: 'success', data: await fn(payloadOf(request)) });
      } catch (error: unknown) { sendError(reply, error); }
    };
  const write = <T>(fn: (p: Record<string, unknown>, actor: number | null) => Promise<Outcome<T>>) =>
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        sendOutcome(reply, await fn(payloadOf(request), actorOf(request)));
      } catch (error: unknown) { sendError(reply, error); }
    };

  // ── Admin: Centre Onboarding ──────────────────────────────────────────────
  app.get('/admin/centres/onboarding/index', guard, read(() => onboarding.list()));
  app.get('/admin/centres/onboarding/view', guard, write((p) => onboarding.detail(intId(p.id))));
  app.get('/admin/centres/onboarding/duplicates', guard, read((p) => onboarding.duplicatesFor(text(p.email), text(p.mobile), intId(p.exclude_id))));
  app.get('/admin/centres/onboarding/next_numbers', guard, read(() => affiliation.nextNumbers()));
  app.post('/admin/centres/onboarding/create', guard, write((p, actor) => onboarding.createLead(actor, p)));
  app.post('/admin/centres/onboarding/update', guard, write((p, actor) => onboarding.updateLead(actor, intId(p.id), p)));
  app.post('/admin/centres/onboarding/send_link', guard, write((p, actor) => onboarding.sendLink(actor, intId(p.id), text(p.via) === 'email' ? 'email' : 'copy')));
  app.post('/admin/centres/onboarding/expire_link', guard, write((p, actor) => onboarding.expireLink(actor, intId(p.id))));
  app.post('/admin/centres/onboarding/verify', guard, write((p, actor) => onboarding.setVerification(actor, intId(p.id), text(p.section), text(p.state))));
  app.post('/admin/centres/onboarding/approve', guard, write((p, actor) => onboarding.approve(actor, intId(p.id))));
  app.post('/admin/centres/onboarding/request_changes', guard, write((p, actor) => onboarding.requestChanges(actor, intId(p.id), p.remarks)));
  app.post('/admin/centres/onboarding/reject', guard, write((p, actor) => onboarding.reject(actor, intId(p.id), p.reason)));
  app.post('/admin/centres/onboarding/reopen', guard, write((p, actor) => onboarding.reopen(actor, intId(p.id))));
  app.post('/admin/centres/onboarding/upload_agreement', guard, write((p, actor) => affiliation.uploadAgreement(actor, p)));
  app.post('/admin/centres/onboarding/complete', guard, write((p, actor) => affiliation.completeOnboarding(actor, intId(p.id))));

  // The signed agreement PDF (max 10 MB), stored under centre-agreements/{id}/.
  app.post('/admin/centres/onboarding/agreement_file', guard, async (request, reply) => {
    try {
      const id = intId((request.query as Record<string, unknown> | undefined)?.id);
      if (!deps.storage) { sendOutcome(reply, { status: 0, message: 'File storage is not configured on this server.' }); return; }
      const allowed = await affiliation.canUploadAgreement(id);
      if (allowed.status !== 1) { sendOutcome(reply, allowed); return; }
      const upload = await readUpload(request, AGREEMENT_FILE_MAX_BYTES, 'Max 10 MB');
      if (typeof upload === 'string') { sendOutcome(reply, { status: 0, message: upload }); return; }
      if (sniffFileType(upload.body.subarray(0, 8)) !== 'application/pdf') { sendOutcome(reply, { status: 0, message: 'PDF only' }); return; }
      const key = `${agreementUploadFolder(id)}${randomBytes(16).toString('hex')}-${safeFileName(upload.name)}`;
      const stored = await deps.storage.uploadObject({ key, body: upload.body, contentType: 'application/pdf', publicRead: true });
      sendOutcome(reply, { status: 1, message: 'Uploaded', data: { url: stored.location, name: upload.name, sig: affiliation.signAgreementUpload(id, stored.location) } });
    } catch (error: unknown) { sendError(reply, error); }
  });

  // ── Admin: Affiliation & Agreements ───────────────────────────────────────
  app.get('/admin/centres/affiliation/index', guard, read(() => affiliation.list()));
  app.post('/admin/centres/affiliation/mark_fee_paid', guard, write((p, actor) => affiliation.markFeePaid(actor, intId(p.agreement_id), p.paid_on)));
  app.post('/admin/centres/affiliation/regenerate_pdf', guard, write((p, actor) => affiliation.regenerateCertificatePdf(actor, intId(p.certificate_id))));

  // ── Public: the centre application form ───────────────────────────────────
  const limited = (limiter: FixedWindowRateLimiter, key: string, limit: number, reply: FastifyReply): boolean => {
    const result = limiter.consume(key, limit);
    if (result.allowed) return false;
    reply.header('retry-after', String(result.retryAfterSeconds));
    reply.code(429).send({ status: 0, message: 'Too many requests. Please wait a few minutes and try again.', data: {} });
    return true;
  };
  const tokenOf = (request: FastifyRequest): string => text((request.params as { token?: unknown }).token);

  app.get('/centre-form/:token', async (request, reply) => {
    if (limited(readLimiter, clientIp(request), PUBLIC_READ_LIMIT, reply)) return;
    try {
      reply.code(200).send({ status: 1, message: 'success', data: await publicForm.open(tokenOf(request)) });
    } catch (error: unknown) { sendError(reply, error); }
  });

  app.post('/centre-form/:token/upload', async (request, reply) => {
    const token = tokenOf(request);
    // Keyed on the client alone: a key built from the (attacker-chosen) token
    // would let random tokens grow the limiter's map without bound.
    if (limited(uploadLimiter, clientIp(request), PUBLIC_UPLOAD_LIMIT, reply)) return;
    try {
      const target = await publicForm.uploadTarget(token);
      if (target.status !== 1 || !target.data) { sendOutcome(reply, target); return; }
      if (!deps.storage) { sendOutcome(reply, { status: 0, message: 'Uploads are not available right now. Please try again later.' }); return; }
      const upload = await readUpload(request, CENTRE_FORM_UPLOAD_MAX_BYTES, 'File must be under 5 MB');
      if (typeof upload === 'string') { sendOutcome(reply, { status: 0, message: upload }); return; }
      const type = sniffFileType(upload.body.subarray(0, 8));
      if (!type) { sendOutcome(reply, { status: 0, message: 'Choose a PDF, JPG or PNG file' }); return; }
      const key = `${formUploadFolder(target.data.onboardingId)}${randomBytes(16).toString('hex')}-${safeFileName(upload.name)}`;
      const stored = await deps.storage.uploadObject({ key, body: upload.body, contentType: type, publicRead: true });
      const sig = publicForm.signUpload(target.data.onboardingId, stored.location);
      sendOutcome(reply, { status: 1, message: 'Uploaded', data: { url: stored.location, name: upload.name.slice(0, 200), sig } });
    } catch (error: unknown) { sendError(reply, error); }
  });

  app.post('/centre-form/:token/submit', async (request, reply) => {
    const token = tokenOf(request);
    if (limited(submitLimiter, clientIp(request), PUBLIC_SUBMIT_LIMIT, reply)) return;
    try {
      sendOutcome(reply, await publicForm.submit(token, payloadOf(request)));
    } catch (error: unknown) { sendError(reply, error); }
  });
}
