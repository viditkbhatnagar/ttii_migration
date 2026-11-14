import type { FastifyInstance, FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';

import { PERMISSION_KEYS, requirePermission } from '../auth/permissions.js';
import type { StorageProvider } from '../integrations/contracts.js';
import { CredentialEligibilityService } from '../operations/credential-eligibility-service.js';
import { CredentialIssueService } from '../operations/credential-issue-service.js';
import { CredentialIssuedReadService } from '../operations/credential-issued-read-service.js';
import { CredentialPublicService } from '../operations/credential-public-service.js';
import { NOT_SET_UP_EMPTY, type Outcome } from '../operations/credential-common.js';
import { isMissingTable, NOT_SET_UP_MESSAGE } from '../operations/credential-types.js';
import { FixedWindowRateLimiter } from '../auth/rate-limit.js';
import { clientIp } from './centre-onboarding-routes.js';

// Credential Manager — Ready to Issue, issuing, Issued, public verification and the learner's
// "My Certificates" (Naji 2026-11-14). Admin routes: requireAuth + requirePermission (role 1
// always, role 8 with the grant). Refusals answer 200 with status 0; a missing table answers
// the "not set up" message, never a 500.

export interface CredentialIssueRouteDeps {
  requireAuth: preHandlerAsyncHookHandler;
  requireStudentRole: preHandlerAsyncHookHandler;
  storage?: StorageProvider | undefined;
  eligibility?: CredentialEligibilityService;
  issue?: CredentialIssueService;
  issued?: CredentialIssuedReadService;
  publicService?: CredentialPublicService;
}

/** 30 lookups per minute per client IP (brief). */
export const PUBLIC_LOOKUP_LIMIT = 30;
const PUBLIC_WINDOW_MS = 60_000;

function payloadOf(request: FastifyRequest): Record<string, unknown> {
  const source = request.method === 'GET' ? request.query : request.body;
  return source && typeof source === 'object' && !Array.isArray(source) ? (source as Record<string, unknown>) : {};
}
const intOf = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number.parseInt(typeof v === 'string' ? v : '', 10);
  return Number.isInteger(n) && n > 0 ? n : 0;
};
const textOf = (v: unknown): string => (typeof v === 'string' ? v : '');
const intList = (v: unknown): number[] => (Array.isArray(v) ? v.map(intOf).filter((n) => n > 0) : []);
const strList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
const actorOf = (request: FastifyRequest): number | null => intOf(request.authContext?.user.id) || null;

function sendError(reply: FastifyReply, error: unknown): void {
  if (isMissingTable(error)) {
    reply.code(200).send({ status: 0, message: NOT_SET_UP_MESSAGE, data: NOT_SET_UP_EMPTY });
    return;
  }
  reply.log.error({ err: error }, 'credential request failed');
  reply.code(500).send({ status: 0, message: 'Something went wrong. Please try again.', data: {} });
}
function sendOutcome<T>(reply: FastifyReply, o: Outcome<T>): void {
  reply.code(200).send({ status: o.status, message: o.message, data: o.data ?? {} });
}
function sendPdf(reply: FastifyReply, file: { bytes: Buffer; fileName: string }): void {
  reply
    .header('content-type', 'application/pdf')
    .header('content-disposition', `attachment; filename="${file.fileName.replace(/"/g, '')}"`)
    .header('cache-control', 'private, no-store')
    .code(200)
    .send(file.bytes);
}

export function registerCredentialIssueRoutes(app: FastifyInstance, deps: CredentialIssueRouteDeps): void {
  const eligibility = deps.eligibility ?? new CredentialEligibilityService();
  const issue = deps.issue ?? new CredentialIssueService(undefined, { ...(deps.storage ? { storage: deps.storage } : {}), eligibility });
  const issued = deps.issued ?? new CredentialIssuedReadService(undefined, eligibility);
  const publicService = deps.publicService ?? new CredentialPublicService();

  const access = { preHandler: [deps.requireAuth, requirePermission(PERMISSION_KEYS.CREDENTIALS_ACCESS)] };
  const revokeGuard = { preHandler: [deps.requireAuth, requirePermission(PERMISSION_KEYS.CREDENTIALS_REVOKE)] };
  const overrideGuard = { preHandler: [deps.requireAuth, requirePermission(PERMISSION_KEYS.CREDENTIALS_OVERRIDE)] };
  const student = { preHandler: [deps.requireAuth, deps.requireStudentRole] };

  const handle = <T>(fn: (p: Record<string, unknown>, actor: number | null) => Promise<Outcome<T>>) =>
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try { sendOutcome(reply, await fn(payloadOf(request), actorOf(request))); } catch (error: unknown) { sendError(reply, error); }
    };

  // ── Ready to Issue ────────────────────────────────────────────────────────
  app.get('/admin/credentials/ready/index', access, handle(() => eligibility.list()));
  app.get('/admin/credentials/ready/detail', access, handle((p) => eligibility.detail(intOf(p.enrol_id))));
  app.post('/admin/credentials/ready/place_hold', access, handle((p, a) => eligibility.placeHold(a, intOf(p.enrol_id), textOf(p.reason), textOf(p.remarks))));
  app.post('/admin/credentials/ready/release_hold', access, handle((p, a) => eligibility.releaseHold(a, intOf(p.enrol_id), textOf(p.reason), textOf(p.remarks))));
  app.post('/admin/credentials/ready/override', overrideGuard, handle((p, a) => eligibility.override(a, intOf(p.enrol_id), textOf(p.reason), textOf(p.remarks))));
  app.post('/admin/credentials/ready/issue', access, handle((p, a) => issue.issue(a, intList(p.enrol_ids), strList(p.doc_types))));

  // ── Issued ────────────────────────────────────────────────────────────────
  app.get('/admin/credentials/issued/index', access, handle(() => issued.list()));
  app.get('/admin/credentials/issued/detail', access, handle((p) => issued.detail(intOf(p.id))));
  app.post('/admin/credentials/issued/duplicate', access, handle((p, a) => issue.recordCopy(a, intOf(p.id), 'duplicate', textOf(p.reason))));
  app.post('/admin/credentials/issued/print', access, handle((p, a) => issue.recordCopy(a, intOf(p.id), 'print', textOf(p.reason))));
  app.post('/admin/credentials/issued/correction', access, handle((p, a) => issue.correction(a, intOf(p.id), textOf(p.reason), textOf(p.corrected_name))));
  app.post('/admin/credentials/issued/resend', access, handle((p, a) => issue.resend(a, intOf(p.id))));
  app.post('/admin/credentials/issued/regenerate', access, handle((p, a) => issue.regenerate(a, intOf(p.id))));
  app.post('/admin/credentials/issued/revoke', revokeGuard, handle((p, a) => issue.revoke(a, intOf(p.id), textOf(p.reason))));
  app.post('/admin/credentials/issued/restore', revokeGuard, handle((p, a) => issue.restore(a, intOf(p.id), textOf(p.reason))));

  // PDF stream: ?id=<version>; &event=<duplicate event> renders the DUPLICATE copy; &log=0 skips the Download event.
  app.get('/admin/credentials/issued/pdf', access, async (request, reply) => {
    try {
      const q = payloadOf(request);
      const id = intOf(q.id);
      const eventId = intOf(q.event);
      if (!(await issued.isVisible(id))) { sendOutcome(reply, { status: 0, message: 'Document not found.' }); return; }
      const file = eventId > 0 ? await issue.duplicatePdf(id, eventId) : await issue.pdfBytes(id);
      if (!file) { sendOutcome(reply, { status: 0, message: 'The PDF is not available. Use Regenerate PDF.' }); return; }
      if (eventId === 0 && textOf(q.log) !== '0') await issue.logDownload(actorOf(request), id);
      sendPdf(reply, file);
    } catch (error: unknown) { sendError(reply, error); }
  });

  // ── Public verification (no login; rate limited per client IP) ─────────────
  const lookupLimiter = new FixedWindowRateLimiter(PUBLIC_WINDOW_MS);
  app.get('/credentials/public/verify', async (request, reply) => {
    const limit = lookupLimiter.consume(clientIp(request), PUBLIC_LOOKUP_LIMIT);
    if (!limit.allowed) {
      reply.header('retry-after', String(limit.retryAfterSeconds));
      reply.code(429).send({ status: 0, message: 'Too many lookups. Please wait a minute and try again.', data: {} });
      return;
    }
    try {
      const q = payloadOf(request);
      const ua = request.headers['user-agent'];
      const outcome = await publicService.lookup(textOf(q.id), {
        method: textOf(q.method) === 'manual' ? 'manual' : 'qr', ip: clientIp(request), userAgent: typeof ua === 'string' ? ua : '',
      });
      reply.header('x-robots-tag', 'noindex, nofollow').header('cache-control', 'no-store');
      sendOutcome(reply, outcome);
    } catch (error: unknown) { sendError(reply, error); }
  });

  // ── Learner: My Certificates (own data only) ──────────────────────────────
  app.get('/student/certificates/index', student, handle((_p, actor) => issued.forLearner(actor ?? 0)));
  app.post('/student/certificates/confirm', student, handle((p, actor) => eligibility.confirmDetails(actor ?? 0, intOf(p.enrol_id), textOf(p.printed_name), textOf(p.address))));
  app.get('/student/certificates/pdf', student, async (request, reply) => {
    try {
      const actor = actorOf(request) ?? 0;
      const own = await issued.learnerDocument(actor, intOf(payloadOf(request).id));
      if (!own) { sendOutcome(reply, { status: 0, message: 'Document not found.' }); return; }
      const file = await issue.pdfBytes(own.id);
      if (!file) { sendOutcome(reply, { status: 0, message: 'The PDF is not available yet. Please try again later.' }); return; }
      await issued.markFirstDownload(own.id);
      await issue.logDownload(actor, own.id);
      sendPdf(reply, file);
    } catch (error: unknown) { sendError(reply, error); }
  });
}
