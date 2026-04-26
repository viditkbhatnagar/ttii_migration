import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { AuthService } from '../auth/auth-service.js';
import { requireLegacyAuth, requireLegacyRoles } from '../auth/middleware.js';
import { ADMIN_PORTAL_ROLES } from '../auth/roles.js';
import { CertificationPartnerService, type CertificationPartnerInput } from '../content/certification-partner-service.js';
import { CertificateCombinationService, type CertificateCombinationInput } from '../content/certificate-combination-service.js';

interface RegisterCertificationRoutesOptions {
  authService?: AuthService;
  partnerService?: CertificationPartnerService;
  combinationService?: CertificateCombinationService;
  [key: string]: unknown;
}

function sendError(reply: FastifyReply, error: unknown): void {
  const message = error instanceof Error ? error.message : 'Internal certification error.';
  reply.code(500).send({ status: 0, message, data: {} });
}

function requestUserId(request: FastifyRequest): string {
  const id = request.authContext?.user.id;
  return id !== undefined && id !== null ? String(id) : '';
}

function requestPayload(request: FastifyRequest): Record<string, unknown> {
  if (request.method === 'GET') return (request.query as Record<string, unknown>) ?? {};
  if (request.body && typeof request.body === 'object') return request.body as Record<string, unknown>;
  return {};
}

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toBool(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1' || value === 'true') return true;
  if (value === 0 || value === '0' || value === 'false') return false;
  return undefined;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number.parseFloat(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function toStringArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    return value.filter((x): x is string | number => typeof x === 'string' || typeof x === 'number').map((x) => String(x));
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return value.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return undefined;
}

export function registerCertificationRoutes(
  app: FastifyInstance,
  options: RegisterCertificationRoutesOptions = {},
): void {
  const authService = options.authService ?? new AuthService();
  const partners = options.partnerService ?? new CertificationPartnerService();
  const combos = options.combinationService ?? new CertificateCombinationService();
  const requireAuth = requireLegacyAuth(authService);
  const requireAdmin = requireLegacyRoles(authService, ADMIN_PORTAL_ROLES);
  const guards = { preHandler: [requireAuth, requireAdmin] };

  // ─── Certification Partners ──────────────────────────────────────────
  app.get('/admin/certification_partners', guards, async (_request, reply) => {
    try {
      reply.code(200).send({ status: 1, message: 'success', data: await partners.list() });
    } catch (e) { sendError(reply, e); }
  });

  app.get('/admin/certification_partners/:id', guards, async (request, reply) => {
    try {
      const params = request.params as { id?: string };
      const data = await partners.get(toStringValue(params.id));
      if (!data) {
        reply.code(404).send({ status: 0, message: 'Partner not found.', data: {} });
        return;
      }
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (e) { sendError(reply, e); }
  });

  app.post('/admin/certification_partners', guards, async (request, reply) => {
    try {
      const p = requestPayload(request);
      const input: CertificationPartnerInput = {
        partner_code: toStringValue(p.partner_code),
        name: toStringValue(p.name),
        short_name: toStringValue(p.short_name) || undefined,
        country: toStringValue(p.country) || undefined,
        description: toStringValue(p.description) || undefined,
        logo: toStringValue(p.logo) || undefined,
        status: toStringValue(p.status) || undefined,
      };
      if (!input.partner_code || !input.name) {
        reply.code(400).send({ status: 0, message: 'partner_code and name are required.', data: {} });
        return;
      }
      const data = await partners.create(requestUserId(request), input);
      reply.code(200).send({ status: 1, message: 'Partner created.', data });
    } catch (e) { sendError(reply, e); }
  });

  app.post('/admin/certification_partners/:id/update', guards, async (request, reply) => {
    try {
      const params = request.params as { id?: string };
      const p = requestPayload(request);
      const input: CertificationPartnerInput = {
        partner_code: toStringValue(p.partner_code),
        name: toStringValue(p.name),
        short_name: toStringValue(p.short_name) || undefined,
        country: toStringValue(p.country) || undefined,
        description: toStringValue(p.description) || undefined,
        logo: toStringValue(p.logo) || undefined,
        status: toStringValue(p.status) || undefined,
      };
      await partners.update(requestUserId(request), toStringValue(params.id), input);
      reply.code(200).send({ status: 1, message: 'Partner updated.', data: {} });
    } catch (e) { sendError(reply, e); }
  });

  app.post('/admin/certification_partners/:id/delete', guards, async (request, reply) => {
    try {
      const params = request.params as { id?: string };
      await partners.delete(requestUserId(request), toStringValue(params.id));
      reply.code(200).send({ status: 1, message: 'Partner deleted.', data: {} });
    } catch (e) { sendError(reply, e); }
  });

  // ─── Certificate Combinations ────────────────────────────────────────
  app.get('/admin/certificate_combinations', guards, async (_request, reply) => {
    try {
      reply.code(200).send({ status: 1, message: 'success', data: await combos.list() });
    } catch (e) { sendError(reply, e); }
  });

  app.get('/admin/certificate_combinations/:id', guards, async (request, reply) => {
    try {
      const params = request.params as { id?: string };
      const data = await combos.get(toStringValue(params.id));
      if (!data) {
        reply.code(404).send({ status: 0, message: 'Combination not found.', data: {} });
        return;
      }
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (e) { sendError(reply, e); }
  });

  app.post('/admin/certificate_combinations', guards, async (request, reply) => {
    try {
      const p = requestPayload(request);
      const input: CertificateCombinationInput = {
        combination_code: toStringValue(p.combination_code),
        program_id: toStringValue(p.program_id) || undefined,
        course_id: toStringValue(p.course_id) || undefined,
        gst_applicable: toBool(p.gst_applicable),
        gst_percent: toNumber(p.gst_percent),
        status: toStringValue(p.status) || undefined,
        partner_ids: toStringArray(p.partner_ids),
      };
      if (!input.combination_code) {
        reply.code(400).send({ status: 0, message: 'combination_code is required.', data: {} });
        return;
      }
      const data = await combos.create(requestUserId(request), input);
      reply.code(200).send({ status: 1, message: 'Combination created.', data });
    } catch (e) { sendError(reply, e); }
  });

  app.post('/admin/certificate_combinations/:id/update', guards, async (request, reply) => {
    try {
      const params = request.params as { id?: string };
      const p = requestPayload(request);
      const input: CertificateCombinationInput = {
        combination_code: toStringValue(p.combination_code),
        program_id: toStringValue(p.program_id) || undefined,
        course_id: toStringValue(p.course_id) || undefined,
        gst_applicable: toBool(p.gst_applicable),
        gst_percent: toNumber(p.gst_percent),
        status: toStringValue(p.status) || undefined,
        partner_ids: toStringArray(p.partner_ids),
      };
      await combos.update(requestUserId(request), toStringValue(params.id), input);
      reply.code(200).send({ status: 1, message: 'Combination updated.', data: {} });
    } catch (e) { sendError(reply, e); }
  });

  app.post('/admin/certificate_combinations/:id/delete', guards, async (request, reply) => {
    try {
      const params = request.params as { id?: string };
      await combos.delete(requestUserId(request), toStringValue(params.id));
      reply.code(200).send({ status: 1, message: 'Combination deleted.', data: {} });
    } catch (e) { sendError(reply, e); }
  });
}
