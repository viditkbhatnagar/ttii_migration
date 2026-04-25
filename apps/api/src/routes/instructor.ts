import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { AuthService } from '../auth/auth-service.js';
import { requireLegacyAuth, requireLegacyRoles } from '../auth/middleware.js';
import { INSTRUCTOR_PORTAL_ROLES } from '../auth/roles.js';
import type { StorageProvider } from '../integrations/index.js';
import {
  InstructorService,
  type LiveClassFilter,
} from '../instructor/instructor-service.js';

interface RegisterInstructorRoutesOptions {
  authService?: AuthService;
  instructorService?: InstructorService;
  storage?: StorageProvider;
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

function requireUserId(request: FastifyRequest, reply: FastifyReply): number | null {
  const userId = request.authContext?.user.id;
  if (typeof userId !== 'number') {
    reply.code(401).send({ status: 0, message: 'Not authenticated.', data: {} });
    return null;
  }
  return userId;
}

function toIntId(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string') {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function toFilter(value: unknown): LiveClassFilter {
  if (value === 'upcoming' || value === 'past' || value === 'all') return value;
  return 'all';
}

export function registerInstructorRoutes(
  app: FastifyInstance,
  options: RegisterInstructorRoutesOptions = {},
): void {
  const authService = options.authService ?? new AuthService();
  const instructorService = options.instructorService ?? new InstructorService();
  const storage = options.storage;
  const requireAuth = requireLegacyAuth(authService);
  const requireInstructor = requireLegacyRoles(authService, INSTRUCTOR_PORTAL_ROLES);
  const guards = { preHandler: [requireAuth, requireInstructor] };

  app.get('/instructor/dashboard', guards, async (request, reply) => {
    try {
      const userId = requireUserId(request, reply);
      if (userId === null) return;
      const data = await instructorService.getDashboard(userId);
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendInstructorError(reply, error);
    }
  });

  app.get('/instructor/live-classes', guards, async (request, reply) => {
    try {
      const userId = requireUserId(request, reply);
      if (userId === null) return;
      const query = (request.query as Record<string, unknown>) ?? {};
      const filter = toFilter(query.filter);
      const data = await instructorService.listLiveClasses(userId, filter);
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendInstructorError(reply, error);
    }
  });

  app.get('/instructor/live-classes/:id/attendance', guards, async (request, reply) => {
    try {
      const userId = requireUserId(request, reply);
      if (userId === null) return;
      const params = request.params as { id?: string };
      const liveClassId = toIntId(params.id);
      const result = await instructorService.getLiveClassAttendance(userId, liveClassId);
      if (!result) {
        reply.code(404).send({ status: 0, message: 'Live class not found or not yours.', data: {} });
        return;
      }
      reply.code(200).send({ status: 1, message: 'success', data: result });
    } catch (error: unknown) {
      sendInstructorError(reply, error);
    }
  });

  app.get('/instructor/assignments', guards, async (request, reply) => {
    try {
      const userId = requireUserId(request, reply);
      if (userId === null) return;
      const data = await instructorService.listAssignments(userId);
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendInstructorError(reply, error);
    }
  });

  app.get('/instructor/assignments/:id/submissions', guards, async (request, reply) => {
    try {
      const userId = requireUserId(request, reply);
      if (userId === null) return;
      const params = request.params as { id?: string };
      const assignmentId = toIntId(params.id);
      const data = await instructorService.getAssignmentDetail(userId, assignmentId);
      if (!data) {
        reply.code(404).send({ status: 0, message: 'Assignment not found or not yours.', data: {} });
        return;
      }
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendInstructorError(reply, error);
    }
  });

  app.post('/instructor/submissions/:id/grade', guards, async (request, reply) => {
    try {
      const userId = requireUserId(request, reply);
      if (userId === null) return;
      const params = request.params as { id?: string };
      const submissionId = toIntId(params.id);
      const body = (request.body as Record<string, unknown>) ?? {};
      const marks = typeof body.marks === 'string'
        ? body.marks
        : typeof body.marks === 'number'
          ? String(body.marks)
          : '';
      const remarks = typeof body.remarks === 'string' ? body.remarks : '';
      const data = await instructorService.gradeSubmission(userId, submissionId, { marks, remarks });
      if (!data) {
        reply.code(404).send({ status: 0, message: 'Submission not found or not yours.', data: {} });
        return;
      }
      reply.code(200).send({ status: 1, message: 'Submission graded successfully.', data });
    } catch (error: unknown) {
      sendInstructorError(reply, error);
    }
  });

  app.get('/instructor/cohorts', guards, async (request, reply) => {
    try {
      const userId = requireUserId(request, reply);
      if (userId === null) return;
      const data = await instructorService.listCohorts(userId);
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendInstructorError(reply, error);
    }
  });

  app.get('/instructor/cohorts/:id/learners', guards, async (request, reply) => {
    try {
      const userId = requireUserId(request, reply);
      if (userId === null) return;
      const params = request.params as { id?: string };
      const cohortId = toIntId(params.id);
      const data = await instructorService.getCohortDetail(userId, cohortId);
      if (!data) {
        reply.code(404).send({ status: 0, message: 'Cohort not found or not yours.', data: {} });
        return;
      }
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendInstructorError(reply, error);
    }
  });

  app.get('/instructor/live-classes/:id/recording-url', guards, async (request, reply) => {
    try {
      const userId = requireUserId(request, reply);
      if (userId === null) return;
      const params = request.params as { id?: string };
      const liveClassId = toIntId(params.id);
      const key = await instructorService.getRecordingStorageKey(userId, liveClassId);
      if (!key) {
        reply.code(404).send({ status: 0, message: 'Recording not available for this session.', data: {} });
        return;
      }
      if (!storage) {
        reply.code(503).send({ status: 0, message: 'Storage provider not configured.', data: {} });
        return;
      }
      const expiresInSeconds = 3600;
      const url = await storage.createSignedDownloadUrl({ key, expiresInSeconds });
      reply.code(200).send({ status: 1, message: 'success', data: { url, expiresInSeconds } });
    } catch (error: unknown) {
      sendInstructorError(reply, error);
    }
  });
}
