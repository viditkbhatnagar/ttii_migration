import type { FastifyInstance, FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';

import { CentreDashboardService, type PaymentStatusLoader } from '../operations/centre-dashboard-service.js';

// Centres v2 (Naji 2026-10-22): the Centre Dashboard and the Wallet & Payment
// tabs that have no older endpoint. Admin / Subadmin only (counsellors never
// see centre money). Read-only. Top-up requests and centre wallets keep their
// existing endpoints (/admin/centres/centre_payments, /admin/wallet/index) and
// approvals keep the claim-first /admin/centres/fund_request/approve|reject.

export interface CentreDashboardRouteDeps {
  requireAuth: preHandlerAsyncHookHandler;
  requireAdminOnlyRole: preHandlerAsyncHookHandler;
  /** The Fees → Payment Status computation, reused for Application Payments. */
  loadPaymentStatus: PaymentStatusLoader;
  service?: CentreDashboardService;
}

function queryOf(request: FastifyRequest): Record<string, unknown> {
  const q = request.query;
  return q && typeof q === 'object' && !Array.isArray(q) ? (q as Record<string, unknown>) : {};
}

/** Unexpected failures: logged in full server-side, a generic message to the client. */
function sendError(reply: FastifyReply, error: unknown): void {
  reply.log.error({ err: error }, 'centre dashboard request failed');
  reply.code(500).send({ status: 0, message: 'Something went wrong. Please try again.', data: {} });
}

export function registerCentreDashboardRoutes(app: FastifyInstance, deps: CentreDashboardRouteDeps): void {
  const service = deps.service ?? new CentreDashboardService({ loadPaymentStatus: deps.loadPaymentStatus });
  const guard = { preHandler: [deps.requireAuth, deps.requireAdminOnlyRole] };

  const read = (fn: (q: Record<string, unknown>) => Promise<unknown>) =>
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        const data = await fn(queryOf(request));
        reply.code(200).send({ status: 1, message: 'success', data });
      } catch (error: unknown) { sendError(reply, error); }
    };

  // ?period=month|quarter|year (rolling 31 / 92 / 366 IST days, default year) &centre_id=<centres.id>
  app.get('/admin/centres/dashboard', guard, read((q) => service.dashboard({ period: q.period, centreId: q.centre_id })));
  // Affiliation Fee Records: { ready, message, rows } — ready=false (200, empty) until the centre_agreements migration runs.
  app.get('/admin/centres/affiliation_fees', guard, read(() => service.affiliationFees()));
  app.get('/admin/centres/application_payments', guard, read(() => service.applicationPayments()));
}
