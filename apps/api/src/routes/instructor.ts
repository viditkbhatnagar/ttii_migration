import type { FastifyInstance, FastifyReply } from 'fastify';

import { AuthService } from '../auth/auth-service.js';
import { requireLegacyAuth, requireLegacyRoles } from '../auth/middleware.js';
import { INSTRUCTOR_PORTAL_ROLES } from '../auth/roles.js';
import { InstructorService } from '../instructor/instructor-service.js';

interface RegisterInstructorRoutesOptions {
  authService?: AuthService;
  instructorService?: InstructorService;
  [key: string]: unknown;
}

function sendInstructorError(reply: FastifyReply, error: unknown): void {
  const message = error instanceof Error ? error.message : 'Internal instructor error.';
  reply.code(500).send({
    status: 0,
    message,
    data: {},
  });
}

export function registerInstructorRoutes(
  app: FastifyInstance,
  options: RegisterInstructorRoutesOptions = {},
): void {
  const authService = options.authService ?? new AuthService();
  const instructorService = options.instructorService ?? new InstructorService();
  const requireAuth = requireLegacyAuth(authService);
  const requireInstructor = requireLegacyRoles(authService, INSTRUCTOR_PORTAL_ROLES);

  app.get(
    '/instructor/dashboard',
    { preHandler: [requireAuth, requireInstructor] },
    async (request, reply) => {
      try {
        const userId = request.authContext?.user.id;
        if (typeof userId !== 'number') {
          reply.code(401).send({ status: 0, message: 'Not authenticated.', data: {} });
          return;
        }

        const data = await instructorService.getDashboard(userId);
        reply.code(200).send({ status: 1, message: 'success', data });
      } catch (error: unknown) {
        sendInstructorError(reply, error);
      }
    },
  );
}
