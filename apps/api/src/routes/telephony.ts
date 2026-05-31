import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { env } from '../env.js';
import { AuthService } from '../auth/auth-service.js';
import { requireLegacyAuth, requireLegacyRoles } from '../auth/middleware.js';
import { ADMIN_PORTAL_ROLES } from '../auth/roles.js';
import {
  AinvoxError,
  type AinvoxService,
  type AinvoxCallLogQuery,
  createAinvoxService,
} from '../integrations/ainvox-provider.js';

interface RegisterTelephonyRoutesOptions {
  authService?: AuthService;
  ainvoxService?: AinvoxService | null;
  [key: string]: unknown;
}

function queryValue(request: FastifyRequest, key: string): string {
  const query = (request.query as Record<string, unknown>) ?? {};
  const value = query[key];
  return typeof value === 'string' ? value.trim() : '';
}

function sendAinvoxError(reply: FastifyReply, error: unknown): void {
  if (error instanceof AinvoxError) {
    const statusByCode: Record<AinvoxError['code'], number> = {
      not_configured: 503,
      unauthorized: 502, // their auth failed, not the caller's — surface as upstream error
      bad_request: 400,
      not_found: 404,
      network: 502,
      unknown: 502,
    };
    reply.code(statusByCode[error.code]).send({ status: 0, message: error.message });
    return;
  }
  reply.code(500).send({ status: 0, message: 'Unexpected error while contacting the calling provider.' });
}

/**
 * Admin-only telephony routes (Ainvox). Outbound calls are placed from the
 * browser Dialer SDK; these endpoints surface the resulting call logs +
 * recordings inside the LMS so an admin sees a student's call history
 * without leaving the portal. The Ainvox secret key stays server-side.
 */
export function registerTelephonyRoutes(app: FastifyInstance, options: RegisterTelephonyRoutesOptions = {}): void {
  const authService = options.authService ?? new AuthService();
  const ainvox = options.ainvoxService ?? createAinvoxService();
  const requireAuth = requireLegacyAuth(authService);
  const requireAdminRole = requireLegacyRoles(authService, ADMIN_PORTAL_ROLES);

  // GET /api/admin/calls/log?phone=&direction=&page=&perPage=
  // Returns the Ainvox call log, optionally filtered to one student's number.
  app.get('/admin/calls/log', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      if (!ainvox) {
        reply.code(503).send({ status: 0, message: 'Calling provider is not configured yet.' });
        return;
      }
      const phone = queryValue(request, 'phone');
      const directionRaw = queryValue(request, 'direction');
      const pageNumber = Number(queryValue(request, 'page')) || 1;
      const perPage = Number(queryValue(request, 'perPage')) || 20;

      // Build conditionally — exactOptionalPropertyTypes forbids explicit undefined.
      const query: AinvoxCallLogQuery = { pageNumber, perPage };
      if (phone) query.phoneNumber = phone;
      if (directionRaw === 'inbound' || directionRaw === 'outbound') query.direction = directionRaw;

      const result = await ainvox.listCallLogs(query);
      reply.code(200).send({ status: 1, message: 'success', data: result });
    } catch (error: unknown) {
      sendAinvoxError(reply, error);
    }
  });

  // GET /api/admin/calls/recording?path=...
  // Streams a recording file from Ainvox (Basic Auth proxied server-side so
  // the secret never reaches the browser). The frontend fetches this with the
  // admin JWT and plays it via an object URL.
  app.get('/admin/calls/recording', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      if (!ainvox) {
        reply.code(503).send({ status: 0, message: 'Calling provider is not configured yet.' });
        return;
      }
      const path = queryValue(request, 'path');
      if (!path) {
        reply.code(400).send({ status: 0, message: 'Missing recording path.' });
        return;
      }
      const stream = await ainvox.getRecordingStream(path);
      reply.header('Content-Type', stream.contentType);
      if (stream.contentLength != null) {
        reply.header('Content-Length', String(stream.contentLength));
      }
      return reply.send(stream.body);
    } catch (error: unknown) {
      sendAinvoxError(reply, error);
    }
  });

  // ── PUBLIC call-flow endpoint ─────────────────────────────────────────────
  // Ainvox POSTs here when a server-placed call is answered, to fetch the
  // call-control JSON. It can't carry our auth token, so it's guarded by an
  // unguessable token in the query string. Both key casings are emitted
  // because the Ainvox docs disagree (snake_case vs camelCase).
  const flowToken = env.AINVOX_FLOW_TOKEN;
  const flowBase = env.AINVOX_PUBLIC_BASE_URL.replace(/\/+$/, '');
  const hangupUrl = `${flowBase}/api/calls/flow/hangup`;

  app.route({
    method: ['GET', 'POST'],
    url: '/calls/flow',
    handler: (request: FastifyRequest, reply: FastifyReply) => {
      const token = queryValue(request, 'token');
      if (!flowToken || token !== flowToken) {
        reply.code(403).send({ action: 'hangup' });
        return;
      }
      const action = queryValue(request, 'action');
      if (action === 'record') {
        // Single-leg recording (proves capture works on an answered call).
        reply.send({
          action: 'record',
          maxLength: 60,
          max_length: 60,
          playBeep: true,
          play_beep: true,
          flowUrl: hangupUrl,
          flow_url: hangupUrl,
        });
        return;
      }
      if (action === 'dial') {
        // Connect the answered agent leg to the student, recording both sides.
        const to = queryValue(request, 'to');
        const callerId = env.AINVOX_VIRTUAL_NUMBER ?? '';
        reply.send({
          action: 'Dial',
          callerId,
          caller_id: callerId,
          numbers: to ? [to] : [],
          timeout: 30,
          record: 'true',
          recordStatusUrl: '',
          record_status_url: '',
          callStatusUrl: '',
          call_status_url: '',
          flowUrl: hangupUrl,
          flow_url: hangupUrl,
        });
        return;
      }
      reply.send({ action: 'hangup' });
    },
  });

  app.route({
    method: ['GET', 'POST'],
    url: '/calls/flow/hangup',
    handler: (_request: FastifyRequest, reply: FastifyReply) => {
      reply.send({ action: 'hangup' });
    },
  });
}
