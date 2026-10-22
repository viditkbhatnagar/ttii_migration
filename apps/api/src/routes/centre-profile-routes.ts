import type { FastifyInstance, FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';

import { intOf, text, type Outcome } from '../operations/centre-profile-model.js';
import { CentreProfileService, type CentreProfileDeps } from '../operations/centre-profile-service.js';

// Centre Directory + Centre Profile 360 (Naji 2026-10-22). Admin / Subadmin
// only: the profile carries Aadhaar / PAN / bank details, so counsellors
// (who share the other /admin/centres/* reads) never reach these routes.
// Refusals (validation, a code clash, the 2026-10-22 tables not migrated yet)
// answer 200 with { status: 0, message, data } so the page can show the reason.

export interface CentreProfileRouteDeps {
  requireAuth: preHandlerAsyncHookHandler;
  requireAdminOnlyRole: preHandlerAsyncHookHandler;
  service?: CentreProfileService;
  /** Used only when no service is injected. */
  loadCohorts?: CentreProfileDeps['loadCohorts'];
}

function payloadOf(request: FastifyRequest): Record<string, unknown> {
  const source = request.method === 'GET' ? request.query : request.body;
  return source && typeof source === 'object' && !Array.isArray(source) ? (source as Record<string, unknown>) : {};
}

function actorOf(request: FastifyRequest): number | null {
  const id = intOf(request.authContext?.user.id);
  return id > 0 ? id : null;
}

/** Unexpected failures: logged in full server-side, a generic message to the client. */
function sendError(reply: FastifyReply, error: unknown): void {
  reply.log.error({ err: error }, 'centre profile request failed');
  reply.code(500).send({ status: 0, message: 'Something went wrong. Please try again.', data: {} });
}

export function registerCentreProfileRoutes(app: FastifyInstance, deps: CentreProfileRouteDeps): void {
  const service = deps.service ?? new CentreProfileService(undefined, deps.loadCohorts ? { loadCohorts: deps.loadCohorts } : {});
  const guard = { preHandler: [deps.requireAuth, deps.requireAdminOnlyRole] };

  const handle = <T>(fn: (p: Record<string, unknown>, actor: number | null) => Promise<Outcome<T>>) =>
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        const outcome = await fn(payloadOf(request), actorOf(request));
        reply.code(200).send({ status: outcome.status, message: outcome.message, data: outcome.data ?? {} });
      } catch (error: unknown) { sendError(reply, error); }
    };

  app.get('/admin/centres/profile', guard, handle((p) => service.profile(intOf(p.id))));
  app.get('/admin/centres/next_code', guard, handle(async () => ({ status: 1 as const, message: 'success', data: await service.nextCode() })));
  app.post('/admin/centres/save', guard, handle((p, actor) => service.save(actor, p)));
  app.post('/admin/centres/status', guard, handle((p, actor) => service.setStatus(actor, intOf(p.id), text(p.status))));
  app.post('/admin/centres/documents/add', guard, handle((p, actor) => service.addDocument(actor, p)));
  app.post('/admin/centres/documents/delete', guard, handle((p, actor) => service.deleteDocument(actor, intOf(p.id), intOf(p.centre_id))));
  app.post('/admin/centres/logo', guard, handle((p, actor) => service.setLogo(actor, intOf(p.centre_id), text(p.url))));
}
