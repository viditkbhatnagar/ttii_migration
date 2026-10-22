import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import type { AuthService } from '../auth/auth-service.js';
import { requireLegacyAuth, requireLegacyRoles } from '../auth/middleware.js';
import { CENTRE_PORTAL_ROLES, LEGACY_ROLE } from '../auth/roles.js';
import { CentrePortalAppsService, type CentrePortalAppsOps } from '../operations/centre-portal-apps-service.js';

// Centre portal v2 (Naji 2026-10-22): Applications, Students, Courses & Fees.
//  - Applications + Students: Centre (7) and Associate (10), as every older
//    /centre/applications|students route — the service scopes each read and
//    write to the caller's own centre / own applications.
//  - Courses & Fees: Centre (7) only — it shows the centre's commercial terms
//    (centre_course_plans.assigned_amount) and associates never had the page.
// Convert and Reject keep their existing ownership-guarded endpoints
// (/centre/applications/convert, /centre/applications/update_status).

export interface CentrePortalAppsRouteDeps {
  authService: AuthService;
  operationsService: CentrePortalAppsOps;
  service?: CentrePortalAppsService;
}

function payloadOf(request: FastifyRequest): Record<string, unknown> {
  const source = request.method === 'GET' ? request.query : request.body;
  return source && typeof source === 'object' && !Array.isArray(source) ? (source as Record<string, unknown>) : {};
}

function actorOf(request: FastifyRequest): string {
  const id = request.authContext?.user.id;
  return id !== undefined && id !== null ? String(id) : '';
}

function paramId(request: FastifyRequest): string {
  const params = request.params as { id?: unknown } | undefined;
  return typeof params?.id === 'string' ? params.id : '';
}

/** Unexpected failures: logged in full server-side, a generic message to the client. */
function sendError(reply: FastifyReply, error: unknown): void {
  reply.log.error({ err: error }, 'centre portal request failed');
  reply.code(500).send({ status: 0, message: 'Something went wrong. Please try again.', data: {} });
}

export function registerCentrePortalAppsRoutes(app: FastifyInstance, deps: CentrePortalAppsRouteDeps): void {
  const service = deps.service ?? new CentrePortalAppsService({ ops: deps.operationsService });
  const requireAuth = requireLegacyAuth(deps.authService);
  const centreOrAssociate = { preHandler: [requireAuth, requireLegacyRoles(deps.authService, CENTRE_PORTAL_ROLES)] };
  const centreOnly = { preHandler: [requireAuth, requireLegacyRoles(deps.authService, [LEGACY_ROLE.CENTRE])] };

  const read = (fn: (request: FastifyRequest) => Promise<unknown>, notFound = 'Not found.') =>
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        const data = await fn(request);
        if (data === null) {
          // Existence-hiding: another centre's record answers exactly like a missing one.
          reply.code(404).send({ status: 0, message: notFound, data: {} });
          return;
        }
        reply.code(200).send({ status: 1, message: 'success', data });
      } catch (error: unknown) { sendError(reply, error); }
    };

  app.get('/centre/portal/applications', centreOrAssociate, read((r) => service.listApplications(actorOf(r))));
  app.get('/centre/portal/applications/options', centreOrAssociate, read((r) => service.applicationOptions(actorOf(r))));
  app.get('/centre/portal/applications/:id', centreOrAssociate, read((r) => service.getApplication(actorOf(r), paramId(r)), 'Application not found.'));
  app.post('/centre/portal/applications/add', centreOrAssociate, async (request, reply) => {
    try {
      // Refusals answer 200 { status: 0, message } so the dialog can show the reason.
      const result = await service.addApplication(actorOf(request), payloadOf(request));
      reply.code(200).send({ data: {}, ...result });
    } catch (error: unknown) { sendError(reply, error); }
  });

  app.get('/centre/portal/students', centreOrAssociate, read((r) => service.listStudents(actorOf(r))));
  app.get('/centre/portal/students/:id', centreOrAssociate, read((r) => service.getStudent(actorOf(r), paramId(r)), 'Student not found.'));

  app.get('/centre/portal/courses', centreOnly, read((r) => service.listCourses(actorOf(r))));
  app.get('/centre/portal/courses/:id', centreOnly, read((r) => service.getCourse(actorOf(r), paramId(r)), 'Course not found.'));
}
