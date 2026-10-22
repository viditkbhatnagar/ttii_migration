import type { FastifyInstance, FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';

import type { AuthService } from '../auth/auth-service.js';
import { requireLegacyRoles } from '../auth/middleware.js';
import { LEGACY_ROLE } from '../auth/roles.js';
import type { PaymentStatusLoader } from '../operations/centre-application-payments.js';
import type { Outcome } from '../operations/centre-portal-money-model.js';
import { CentrePortalMoneyService } from '../operations/centre-portal-money-service.js';

// Centre portal → Wallet & Payment (Naji's centre login design, 2026-10-22).
// Centre logins (role 7) ONLY — associates (role 10) share the other /centre/*
// routes but never see centre money. Every read is scoped inside the service to
// the caller's own centre; no centre id is taken from the request. Read-only:
// top-ups are still raised through POST /centre/wallet/add.
// Refusals (no centre linked, a record of another centre) answer 200 with
// { status: 0, message, data: {} }, like the other centre portal reads.

export interface CentrePortalMoneyRouteDeps {
  requireAuth: preHandlerAsyncHookHandler;
  /** Builds the role-7-only guard (centre logins; associates are refused). */
  authService: AuthService;
  /** The Fees → Payment Status computation, narrowed to the centre's students and applications. */
  loadPaymentStatus: PaymentStatusLoader;
  service?: CentrePortalMoneyService;
}

function queryOf(request: FastifyRequest): Record<string, unknown> {
  const q = request.query;
  return q && typeof q === 'object' && !Array.isArray(q) ? (q as Record<string, unknown>) : {};
}

function actorOf(request: FastifyRequest): number | null {
  const id = Number(request.authContext?.user.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** Unexpected failures: logged in full server-side, a generic message to the client. */
function sendError(reply: FastifyReply, error: unknown): void {
  reply.log.error({ err: error }, 'centre portal wallet request failed');
  reply.code(500).send({ status: 0, message: 'Something went wrong. Please try again.', data: {} });
}

export function registerCentrePortalMoneyRoutes(app: FastifyInstance, deps: CentrePortalMoneyRouteDeps): void {
  const service = deps.service ?? new CentrePortalMoneyService({ loadPaymentStatus: deps.loadPaymentStatus });
  const requireCentreLogin = requireLegacyRoles(deps.authService, [LEGACY_ROLE.CENTRE]);
  const guard = { preHandler: [deps.requireAuth, requireCentreLogin] };

  const read = <T>(fn: (actor: number | null, q: Record<string, unknown>) => Promise<Outcome<T>>) =>
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        const outcome = await fn(actorOf(request), queryOf(request));
        reply.code(200).send({ status: outcome.status, message: outcome.message, data: outcome.data ?? {} });
      } catch (error: unknown) { sendError(reply, error); }
    };

  app.get('/centre/wallet/ledger', guard, read((actor) => service.ledger(actor)));
  app.get('/centre/wallet/collections', guard, read((actor) => service.collections(actor)));
  // ?key=app-12 | user-5-9 (a row key from /centre/wallet/collections)
  app.get('/centre/wallet/collections/view', guard, read((actor, q) => service.collectionDetail(actor, typeof q.key === 'string' ? q.key.trim() : '')));
}
