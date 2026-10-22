import type { FastifyInstance, FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';

import type { AuthService } from '../auth/auth-service.js';
import { requireLegacyRoles } from '../auth/middleware.js';
import { LEGACY_ROLE } from '../auth/roles.js';
import { CentrePortalCohortService } from '../operations/centre-portal-cohort-service.js';
import type { Outcome } from '../operations/centre-portal-money-model.js';

// Centre portal → Cohorts (Naji's centre login design, 2026-10-22): the Add
// Cohort pick lists and the cohort detail view. Centre logins (role 7) only —
// Cohorts is not on the associate (role 10) menu. Read-only; cohorts, learners
// and live classes are still written through the existing /centre/cohorts/add,
// /centre/cohorts/add_cohort_students and /centre/live_class/add. Every read is
// scoped inside the service to the caller's own centre.

export interface CentrePortalCohortRouteDeps {
  requireAuth: preHandlerAsyncHookHandler;
  /** Builds the role-7-only guard (centre logins; associates are refused). */
  authService: AuthService;
  service?: CentrePortalCohortService;
}

function queryOf(request: FastifyRequest): Record<string, unknown> {
  const q = request.query;
  return q && typeof q === 'object' && !Array.isArray(q) ? (q as Record<string, unknown>) : {};
}

function actorOf(request: FastifyRequest): number | null {
  const id = Number(request.authContext?.user.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function sendError(reply: FastifyReply, error: unknown): void {
  reply.log.error({ err: error }, 'centre portal cohort request failed');
  reply.code(500).send({ status: 0, message: 'Something went wrong. Please try again.', data: {} });
}

export function registerCentrePortalCohortRoutes(app: FastifyInstance, deps: CentrePortalCohortRouteDeps): void {
  const service = deps.service ?? new CentrePortalCohortService();
  const requireCentreLogin = requireLegacyRoles(deps.authService, [LEGACY_ROLE.CENTRE]);
  const guard = { preHandler: [deps.requireAuth, requireCentreLogin] };

  const read = <T>(fn: (actor: number | null, q: Record<string, unknown>) => Promise<Outcome<T>>) =>
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        const outcome = await fn(actorOf(request), queryOf(request));
        reply.code(200).send({ status: outcome.status, message: outcome.message, data: outcome.data ?? {} });
      } catch (error: unknown) { sendError(reply, error); }
    };

  app.get('/centre/cohorts/options', guard, read((actor) => service.options(actor)));
  // ?id=<cohorts.id>
  app.get('/centre/cohorts/view', guard, read((actor, q) => service.view(actor, q.id)));
}
