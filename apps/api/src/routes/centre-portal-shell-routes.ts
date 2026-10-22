import type { FastifyInstance, FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';

import type { PaymentStatusLoader } from '../operations/centre-application-payments.js';
import { CentrePortalDashboardService } from '../operations/centre-portal-dashboard-service.js';
import type { CentreActor } from '../operations/centre-portal-model.js';
import { CentrePortalProfileService } from '../operations/centre-portal-profile-service.js';
import type { Outcome } from '../operations/centre-profile-model.js';

// Centre portal v2 (Naji 2026-10-22): the shell facts, the Centre Dashboard
// and the Profile of the centre's OWN login.
//  - /centre/portal/shell and /centre/portal/dashboard: Centre (7) and
//    Associate (10) — the service drops money and affiliation for role 10;
//  - /centre/portal/profile and /centre/portal/documents/add: Centre login (7)
//    ONLY (KYC / bank / agreements / a write).
// Every read and write is scoped to the caller's users.centre_id; no centre id
// is read from the request. Refusals answer 200 { status: 0, message }.

export interface CentrePortalShellRouteDeps {
  requireAuth: preHandlerAsyncHookHandler;
  /** Centre (7) + Associate (10). */
  requireCentreRole: preHandlerAsyncHookHandler;
  /** Centre login (7) only. */
  requireCentreOwnerRole: preHandlerAsyncHookHandler;
  /** The Fees → Payment Status computation, narrowed to the centre's students and applications. */
  loadPaymentStatus: PaymentStatusLoader;
  dashboardService?: CentrePortalDashboardService;
  profileService?: CentrePortalProfileService;
}

function actorOf(request: FastifyRequest): CentreActor {
  const user = request.authContext?.user;
  const userId = Number(user?.id ?? 0);
  return { userId: Number.isInteger(userId) && userId > 0 ? userId : 0, roleId: Number(user?.role_id ?? 0) };
}

function bodyOf(request: FastifyRequest): Record<string, unknown> {
  const body = request.body;
  return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
}

/** Unexpected failures: logged in full server-side, a generic message to the client. */
function sendError(reply: FastifyReply, error: unknown): void {
  reply.log.error({ err: error }, 'centre portal request failed');
  reply.code(500).send({ status: 0, message: 'Something went wrong. Please try again.', data: {} });
}

export function registerCentrePortalShellRoutes(app: FastifyInstance, deps: CentrePortalShellRouteDeps): void {
  const dashboard = deps.dashboardService ?? new CentrePortalDashboardService({ loadPaymentStatus: deps.loadPaymentStatus });
  const profile = deps.profileService ?? new CentrePortalProfileService();
  const shared = { preHandler: [deps.requireAuth, deps.requireCentreRole] };
  const ownerOnly = { preHandler: [deps.requireAuth, deps.requireCentreRole, deps.requireCentreOwnerRole] };

  const read = (fn: (actor: CentreActor) => Promise<unknown>) =>
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        reply.code(200).send({ status: 1, message: 'success', data: await fn(actorOf(request)) });
      } catch (error: unknown) { sendError(reply, error); }
    };

  const outcome = <T>(fn: (actor: CentreActor, body: Record<string, unknown>) => Promise<Outcome<T>>) =>
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        const out = await fn(actorOf(request), bodyOf(request));
        reply.code(200).send({ status: out.status, message: out.message, data: out.data ?? {} });
      } catch (error: unknown) { sendError(reply, error); }
    };

  app.get('/centre/portal/shell', shared, read((actor) => dashboard.shell(actor)));
  app.get('/centre/portal/dashboard', shared, read((actor) => dashboard.dashboard(actor)));
  app.get('/centre/portal/profile', ownerOnly, outcome((actor) => profile.profile(actor)));
  app.post('/centre/portal/documents/add', ownerOnly, outcome((actor, body) => profile.addDocument(actor, body)));
}
