import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { AuthService } from '../auth/auth-service.js';
import { requireLegacyAuth, requireLegacyRoles } from '../auth/middleware.js';
import { ADMIN_PORTAL_ROLES, CENTRE_PORTAL_ROLES } from '../auth/roles.js';
import type { StorageProvider } from '../integrations/contracts.js';
import { verifyEmail } from '../integrations/email-verification.js';
import { AnnouncementService, type AnnouncementInput } from '../operations/announcement-service.js';
import {
  OperationsService,
  type AddAssociateInput,
  type AddCentreFundRequestInput,
  type AddInstructorInput,
  type AddLiveClassInput,
  type AddTargetInput,
  type AddUserInput,
  type AdminApplicationInput,
  type AdminAssignmentFilters,
  type AdminCohortInput,
  type AdminExamEvaluationFilters,
  type AdminExamFilters,
  type AdminExamResultFilters,
  type AdminReExamFilters,
  type AssignmentInput,
  type BannerInput,
  type BatchInput,
  type CentreApplicationInput,
  type CentreInput,
  type CohortInput,
  type EntranceExamInput,
  type ExamInput,
  type ExportReportInput,
  type FaqInput,
  type QuestionBankFilters,
  type QuestionBankInput,
  type TrainingVideoInput,
  type UpdateCentreInput,
  type UpdateSettingsInput,
} from '../operations/operations-service.js';

interface RegisterOperationsRoutesOptions {
  authService?: AuthService;
  operationsService?: OperationsService;
  storage?: StorageProvider;
  [key: string]: unknown;
}

function toInteger(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function toStringValue(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function toStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const output: Record<string, string> = {};

  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw === 'string') {
      output[key] = raw;
    }
  }

  return output;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => toStringValue(entry))
      .filter((entry) => entry !== '');
  }

  if (typeof value === 'string' && value.trim() !== '') {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        return parsed
          .map((entry) => toStringValue(entry))
          .filter((entry) => entry !== '');
      }
    } catch {
      return [];
    }
  }

  return [];
}

function requestPayload(request: FastifyRequest): Record<string, unknown> {
  if (request.method === 'GET') {
    return (request.query as Record<string, unknown>) ?? {};
  }

  if (request.body && typeof request.body === 'object') {
    return request.body as Record<string, unknown>;
  }

  return {};
}

function requestUserId(request: FastifyRequest): string {
  const id = request.authContext?.user.id;
  return id !== undefined && id !== null ? String(id) : '';
}

function toLiveEntries(value: unknown): AddLiveClassInput['entries'] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const row = entry as Record<string, unknown>;

      const repeatDates = Array.isArray(row.repeat_dates)
        ? row.repeat_dates.map((item) => toStringValue(item)).filter((item) => item !== '')
        : [];

      return {
        sessionId: toStringValue(row.session_id),
        title: toStringValue(row.title),
        date: toStringValue(row.date),
        fromTime: toStringValue(row.fromTime || row.from_time),
        toTime: toStringValue(row.toTime || row.to_time),
        isRepetitive: toInteger(row.is_repetitive),
        repeatDates,
      };
    })
    .filter((entry): entry is AddLiveClassInput['entries'][number] => entry !== null);
}

function sendOperationsError(reply: FastifyReply, error: unknown): void {
  const message = error instanceof Error ? error.message : 'Internal operations error.';

  reply.code(500).send({
    status: 0,
    message,
    data: {},
  });
}

function buildCohortInput(payload: Record<string, unknown>): AdminCohortInput {
  return {
    title: toStringValue(payload.title),
    cohortCode: toStringValue(payload.cohort_code),
    courseId: toStringValue(payload.course_id),
    subjectId: toStringValue(payload.subject_id),
    centreId: toStringValue(payload.centre_id),
    instructorId: toStringValue(payload.instructor_id),
    startDate: toStringValue(payload.start_date),
    endDate: toStringValue(payload.end_date),
    languageId: toStringValue(payload.language_id),
    offeringIds: toStringArray(payload.offering_ids),
  };
}

export function registerOperationsRoutes(
  app: FastifyInstance,
  options: RegisterOperationsRoutesOptions = {},
): void {
  const authService = options.authService ?? new AuthService();
  const operationsService = options.operationsService ?? new OperationsService();
  const announcementService = new AnnouncementService();

  const requireAuth = requireLegacyAuth(authService);
  const requireAdminRole = requireLegacyRoles(authService, ADMIN_PORTAL_ROLES);
  const requireCentreRole = requireLegacyRoles(authService, CENTRE_PORTAL_ROLES);

  app.get('/admin/applications/index', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const data = await operationsService.listAdminApplications({
        fromDate: toStringValue(payload.from_date),
        toDate: toStringValue(payload.to_date),
        pipelineRoleId: toInteger(payload.filter_pipeline),
        courseId: toStringValue(payload.course),
        listBy: toStringValue(payload.list_by),
        centreId: toStringValue(payload.centre_id),
        search: toStringValue(payload.search),
        status: toStringValue(payload.status),
      });

      reply.code(200).send({
        status: 1,
        message: 'success',
        data,
      });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.route({
    method: ['GET', 'POST'],
    url: '/admin/applications/convert',
    preHandler: [requireAuth, requireAdminRole],
    handler: async (request, reply) => {
      try {
        const payload = requestPayload(request);
        const result = await operationsService.convertApplication(requestUserId(request), toStringValue(payload.id || payload.application_id));

        reply.code(200).send(result);
      } catch (error: unknown) {
        sendOperationsError(reply, error);
      }
    },
  });

  app.route({
    method: ['GET', 'POST'],
    url: '/admin/applications/get_pipeline_users',
    preHandler: [requireAuth, requireAdminRole],
    handler: async (request, reply) => {
      try {
        const payload = requestPayload(request);
        const users = await operationsService.listPipelineUsers(toInteger(payload.role_id));
        reply.code(200).send(users);
      } catch (error: unknown) {
        sendOperationsError(reply, error);
      }
    },
  });

  app.get('/centre/applications/index', { preHandler: [requireAuth, requireCentreRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const data = await operationsService.listCentreApplications(requestUserId(request), toStringValue(payload.list_by));

      reply.code(200).send({
        status: 1,
        message: 'success',
        data,
      });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.post('/centre/applications/add', { preHandler: [requireAuth, requireCentreRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const input: CentreApplicationInput = {
        applicationId: toStringValue(payload.application_id),
        name: toStringValue(payload.name),
        countryCode: toStringValue(payload.code || payload.country_code),
        phone: toStringValue(payload.phone),
        email: toStringValue(payload.email),
        courseId: toStringValue(payload.course_id),
        pipeline: toStringValue(payload.pipeline),
        pipelineUser: toStringValue(payload.pipeline_user),
        status: toStringValue(payload.status) || 'pending',
      };

      const result = await operationsService.addCentreApplication(requestUserId(request), input);
      reply.code(200).send(result);
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.route({
    method: ['GET', 'POST'],
    url: '/centre/applications/convert',
    preHandler: [requireAuth, requireCentreRole],
    handler: async (request, reply) => {
      try {
        const payload = requestPayload(request);
        const result = await operationsService.convertApplication(requestUserId(request), toStringValue(payload.id || payload.application_id));

        reply.code(200).send(result);
      } catch (error: unknown) {
        sendOperationsError(reply, error);
      }
    },
  });

  app.route({
    method: ['GET', 'POST'],
    url: '/centre/applications/get_pipeline_users',
    preHandler: [requireAuth, requireCentreRole],
    handler: async (request, reply) => {
      try {
        const payload = requestPayload(request);
        const users = await operationsService.listPipelineUsers(toInteger(payload.role_id));
        reply.code(200).send(users);
      } catch (error: unknown) {
        sendOperationsError(reply, error);
      }
    },
  });

  app.get('/centre/dashboard/index', { preHandler: [requireAuth, requireCentreRole] }, async (request, reply) => {
    try {
      const data = await operationsService.getCentreDashboard(requestUserId(request));
      reply.code(200).send({
        status: 1,
        message: 'success',
        data,
      });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.get('/centre/courses/index', { preHandler: [requireAuth, requireCentreRole] }, async (request, reply) => {
    try {
      const courses = await operationsService.listCentreCourses(requestUserId(request));
      reply.code(200).send({
        status: 1,
        message: 'success',
        data: courses,
      });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.get('/centre/wallet/index', { preHandler: [requireAuth, requireCentreRole] }, async (request, reply) => {
    try {
      const data = await operationsService.getCentreWallet(requestUserId(request));
      reply.code(200).send({
        status: 1,
        message: 'success',
        data,
      });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.post('/centre/wallet/add', { preHandler: [requireAuth, requireCentreRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const input: AddCentreFundRequestInput = {
        amount: toNumber(payload.amount),
        date: toStringValue(payload.date),
        transactionReceipt: toStringValue(payload.transaction_no || payload.transaction_receipt),
        description: toStringValue(payload.description),
        attachmentFile: toStringValue(payload.uploadedFileName || payload.attachment_file),
      };

      const result = await operationsService.addCentreFundRequest(requestUserId(request), input);
      reply.code(200).send(result);
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.get('/centre/training_videos/index', { preHandler: [requireAuth, requireCentreRole] }, async (request, reply) => {
    try {
      const videos = await operationsService.listCentreTrainingVideos();
      reply.code(200).send({
        status: 1,
        message: 'success',
        data: videos,
      });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.get('/centre/support/get_messages', { preHandler: [requireAuth, requireCentreRole] }, async (request, reply) => {
    try {
      const messages = await operationsService.getCentreSupportMessages(requestUserId(request));
      reply.code(200).send({
        status: 1,
        message: 'success',
        data: messages,
      });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.post('/centre/support/submit_message', { preHandler: [requireAuth, requireCentreRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const result = await operationsService.submitCentreSupportMessage(
        requestUserId(request),
        toStringValue(payload.message),
      );
      reply.code(200).send(result);
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.get('/centre/chat_support/get_messages', { preHandler: [requireAuth, requireCentreRole] }, async (request, reply) => {
    try {
      const messages = await operationsService.getCentreSupportMessages(requestUserId(request));
      reply.code(200).send({
        status: 1,
        message: 'success',
        data: messages,
      });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.post('/centre/chat_support/submit_message', { preHandler: [requireAuth, requireCentreRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const result = await operationsService.submitCentreSupportMessage(
        requestUserId(request),
        toStringValue(payload.message),
      );
      reply.code(200).send(result);
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.get('/admin/students/index', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const students = await operationsService.listStudents('admin', requestUserId(request), {
        courseId: toStringValue(payload.course_id),
        centreId: toStringValue(payload.centre_id),
        batchId: toStringValue(payload.batch_id),
        search: toStringValue(payload.search),
        status: toStringValue(payload.status),
      });

      reply.code(200).send({
        status: 1,
        message: 'success',
        data: students,
      });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.get('/centre/students/index', { preHandler: [requireAuth, requireCentreRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const students = await operationsService.listStudents('centre', requestUserId(request), {
        courseId: toStringValue(payload.course_id),
      });

      reply.code(200).send({
        status: 1,
        message: 'success',
        data: students,
      });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.get('/admin/centres/index', { preHandler: [requireAuth, requireAdminRole] }, async (_request, reply) => {
    try {
      const centres = await operationsService.listCentres();
      reply.code(200).send({
        status: 1,
        message: 'success',
        data: centres,
      });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.post('/admin/centres/add', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const input: CentreInput = {
        centreName: toStringValue(payload.centre_name),
        contactPerson: toStringValue(payload.contact_person),
        countryCode: toStringValue(payload.code || payload.country_code),
        phone: toStringValue(payload.phone),
        email: toStringValue(payload.email),
        address: toStringValue(payload.address),
        registrationDate: toStringValue(payload.date_of_registration),
        expiryDate: toStringValue(payload.date_of_expiry),
        image: toStringValue(payload.image),
      };

      const result = await operationsService.addCentre(requestUserId(request), input);
      reply.code(200).send(result);
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.post('/admin/centres/save_assign_plan', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const result = await operationsService.assignCentrePlan(requestUserId(request), {
        centreId: toStringValue(payload.centre_id),
        courseId: toStringValue(payload.course_id),
        assignedAmount: toInteger(payload.assigned_amount),
        startDate: toStringValue(payload.start_date),
        endDate: toStringValue(payload.end_date),
      });

      reply.code(200).send(result);
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.get('/centre/cohorts/index', { preHandler: [requireAuth, requireCentreRole] }, async (request, reply) => {
    try {
      const cohorts = await operationsService.listCentreCohorts(requestUserId(request));
      reply.code(200).send({
        status: 1,
        message: 'success',
        data: cohorts,
      });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.post('/centre/cohorts/add', { preHandler: [requireAuth, requireCentreRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const input: CohortInput = {
        title: toStringValue(payload.title),
        cohortCode: toStringValue(payload.cohort_id),
        courseId: toStringValue(payload.course_id),
        subjectId: toStringValue(payload.subject_id),
        instructorId: toStringValue(payload.instructor_id),
        startDate: toStringValue(payload.start_date),
        endDate: toStringValue(payload.end_date),
      };

      const result = await operationsService.addCentreCohort(requestUserId(request), input);
      reply.code(200).send(result);
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.post('/centre/cohorts/add_cohort_students', { preHandler: [requireAuth, requireCentreRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const result = await operationsService.addCentreCohortStudents(requestUserId(request), {
        cohortId: toStringValue(payload.cohort_id),
        studentIds: toStringArray(payload.student_id),
      });

      reply.code(200).send(result);
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.get('/admin/live_class/index', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const lives = await operationsService.listLiveClasses('admin', requestUserId(request));
      reply.code(200).send({
        status: 1,
        message: 'success',
        data: lives,
      });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.post('/admin/live_class/add', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const platformRaw = toStringValue(payload.platform);
      const platform =
        platformRaw === 'teams' || platformRaw === 'zoom' || platformRaw === 'manual' || platformRaw === 'other'
          ? platformRaw
          : undefined;
      const input: AddLiveClassInput = {
        cohortId: toStringValue(payload.cohort_id),
        zoomId: toStringValue(payload.zoom_id),
        password: toStringValue(payload.password),
        entries: toLiveEntries(payload.entries),
        platform,
        teamsHostEmail: toStringValue(payload.teams_host_email) || undefined,
        manualJoinUrl: toStringValue(payload.manual_join_url) || undefined,
      };

      const result = await operationsService.addLiveClasses('admin', requestUserId(request), input);
      reply.code(200).send(result);
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  // ── Teams meeting hosts CRUD (admin) ──────────────────────────────

  app.get('/admin/teams_meeting_hosts/index', { preHandler: [requireAuth, requireAdminRole] }, async (_request, reply) => {
    try {
      const hosts = await operationsService.listTeamsMeetingHosts();
      reply.code(200).send({ status: 1, message: 'success', data: hosts });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.post('/admin/teams_meeting_hosts/add', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const result = await operationsService.addTeamsMeetingHost(requestUserId(request), {
        teamsEmail: toStringValue(payload.teams_email),
        displayName: toStringValue(payload.display_name) || undefined,
        userId: toStringValue(payload.user_id) || undefined,
        isActive: payload.is_active !== false && payload.is_active !== 0 && payload.is_active !== '0',
      });
      reply.code(200).send(result);
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.post('/admin/teams_meeting_hosts/edit', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const id = toStringValue(payload.id);
      const result = await operationsService.updateTeamsMeetingHost(requestUserId(request), id, {
        displayName: payload.display_name !== undefined ? toStringValue(payload.display_name) : undefined,
        isActive:
          payload.is_active === undefined
            ? undefined
            : payload.is_active === true || payload.is_active === 1 || payload.is_active === '1',
      });
      reply.code(200).send(result);
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.post('/admin/teams_meeting_hosts/delete', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const id = toStringValue(payload.id);
      const result = await operationsService.deleteTeamsMeetingHost(requestUserId(request), id);
      reply.code(200).send(result);
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.post('/admin/teams_meeting_hosts/test', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const id = toStringValue(payload.id);
      const result = await operationsService.testTeamsMeetingHost(id);
      reply.code(200).send(result);
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.get('/centre/live_class/index', { preHandler: [requireAuth, requireCentreRole] }, async (request, reply) => {
    try {
      const lives = await operationsService.listLiveClasses('centre', requestUserId(request));
      reply.code(200).send({
        status: 1,
        message: 'success',
        data: lives,
      });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.post('/centre/live_class/add', { preHandler: [requireAuth, requireCentreRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const platformRaw = toStringValue(payload.platform);
      const platform =
        platformRaw === 'teams' || platformRaw === 'zoom' || platformRaw === 'manual' || platformRaw === 'other'
          ? platformRaw
          : undefined;
      const input: AddLiveClassInput = {
        cohortId: toStringValue(payload.cohort_id),
        zoomId: toStringValue(payload.zoom_id),
        password: toStringValue(payload.password),
        entries: toLiveEntries(payload.entries),
        platform,
        teamsHostEmail: toStringValue(payload.teams_host_email) || undefined,
        manualJoinUrl: toStringValue(payload.manual_join_url) || undefined,
      };

      const result = await operationsService.addLiveClasses('centre', requestUserId(request), input);
      reply.code(200).send(result);
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.get('/admin/resources/index', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const data = await operationsService.listResources('admin', requestUserId(request), {
        folderId: toStringValue(payload.folder_id || payload.id),
        centreId: toStringValue(payload.centre_id),
      });

      reply.code(200).send({
        status: 1,
        message: 'success',
        data,
      });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.post('/admin/resources/add_folder', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const result = await operationsService.addFolder('admin', requestUserId(request), {
        parentId: toStringValue(payload.parent_id),
        name: toStringValue(payload.name),
        centreId: toStringValue(payload.centre_id),
      });

      reply.code(200).send(result);
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.post('/admin/resources/add_file', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const result = await operationsService.addFile('admin', requestUserId(request), {
        folderId: toStringValue(payload.folder_id),
        name: toStringValue(payload.name),
        fileType: toStringValue(payload.type),
        size: toInteger(payload.size),
        path: toStringValue(payload.path),
        centreId: toStringValue(payload.centre_id),
      });

      reply.code(200).send(result);
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.get('/centre/resources/index', { preHandler: [requireAuth, requireCentreRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const data = await operationsService.listResources('centre', requestUserId(request), {
        folderId: toStringValue(payload.folder_id || payload.id),
      });

      reply.code(200).send({
        status: 1,
        message: 'success',
        data,
      });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.post('/centre/resources/add_folder', { preHandler: [requireAuth, requireCentreRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const result = await operationsService.addFolder('centre', requestUserId(request), {
        parentId: toStringValue(payload.parent_id),
        name: toStringValue(payload.name),
      });

      reply.code(200).send(result);
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.post('/centre/resources/add_file', { preHandler: [requireAuth, requireCentreRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const result = await operationsService.addFile('centre', requestUserId(request), {
        folderId: toStringValue(payload.folder_id),
        name: toStringValue(payload.name),
        fileType: toStringValue(payload.type),
        size: toInteger(payload.size),
        path: toStringValue(payload.path),
      });

      reply.code(200).send(result);
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.get('/admin/settings/system_settings', { preHandler: [requireAuth, requireAdminRole] }, async (_request, reply) => {
    try {
      const data = await operationsService.getSystemSettings();
      reply.code(200).send({
        status: 1,
        message: 'success',
        data,
      });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.post('/admin/settings/system_settings', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const input: UpdateSettingsInput = {
        system: toStringRecord(payload.system),
        frontend: {},
      };

      await operationsService.updateSystemSettings(requestUserId(request), input);

      reply.code(200).send({
        status: 1,
        message: 'Settings Updated Successfully!',
      });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.post('/admin/settings/website_settings', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const input: UpdateSettingsInput = {
        system: {},
        frontend: toStringRecord(payload.frontend),
      };

      await operationsService.updateSystemSettings(requestUserId(request), input);

      reply.code(200).send({
        status: 1,
        message: 'Settings Updated Successfully!',
      });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.get('/admin/settings/app_version', { preHandler: [requireAuth, requireAdminRole] }, async (_request, reply) => {
    try {
      const settings = await operationsService.getSystemSettings();
      reply.code(200).send({
        status: 1,
        message: 'success',
        data: settings.app_version,
      });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.post('/admin/settings/edit_app_version', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      await operationsService.updateAppVersion(requestUserId(request), {
        appVersion: toStringValue(payload.app_version),
        appVersionIos: toStringValue(payload.app_version_ios),
      });

      reply.code(200).send({
        status: 1,
        message: 'Settings Updated Successfully!',
      });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.get('/admin/live_report/index', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const data = await operationsService.listLiveReport(
        toStringValue(payload.live_id),
        toStringValue(payload.date),
      );

      reply.code(200).send({
        status: 1,
        message: 'success',
        data,
      });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.get('/admin/global_calender/index', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const data = await operationsService.globalCalendar(
        toStringValue(payload.from_date),
        toStringValue(payload.to_date),
      );

      reply.code(200).send({
        status: 1,
        message: 'success',
        data,
      });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.get('/admin/reports/index', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const data = await operationsService.reportSummary({
        fromDate: toStringValue(payload.from_date),
        toDate: toStringValue(payload.to_date),
      });

      reply.code(200).send({
        status: 1,
        message: 'success',
        data,
      });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.get('/admin/reports/export', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const exportInput: ExportReportInput = {
        type: toStringValue(payload.type) === 'live_report' ? 'live_report' : 'summary',
        fromDate: toStringValue(payload.from_date),
        toDate: toStringValue(payload.to_date),
        liveId: toStringValue(payload.live_id),
        joinDate: toStringValue(payload.date),
      };

      const exported = await operationsService.exportReport(exportInput);
      const download = toStringValue(payload.download);

      if (download === '1' || download.toLowerCase() === 'true') {
        reply
          .header('content-type', 'text/csv; charset=utf-8')
          .header('content-disposition', `attachment; filename="${exported.filename}"`)
          .code(200)
          .send(exported.csv);
        return;
      }

      reply.code(200).send({
        status: 1,
        message: 'success',
        data: exported,
      });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  // ─── Phase 1: Admin Dashboard ────────────────────────────────────────────

  app.get('/admin/dashboard/index', { preHandler: [requireAuth, requireAdminRole] }, async (_request, reply) => {
    try {
      const data = await operationsService.getAdminDashboard();
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  // ─── Phase 1: Batches (Intake) ──────────────────────────────────────────

  app.get('/admin/batch/index', { preHandler: [requireAuth, requireAdminRole] }, async (_request, reply) => {
    try {
      const data = await operationsService.listBatches();
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.post('/admin/batch/add', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const input: BatchInput = {
        title: toStringValue(payload.title),
        description: toStringValue(payload.description),
        status: toStringValue(payload.status) || 'active',
      };

      const result = await operationsService.addBatch(requestUserId(request), input);
      reply.code(200).send(result);
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.post('/admin/batch/edit', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const input: BatchInput = {
        title: toStringValue(payload.title),
        description: toStringValue(payload.description),
        status: toStringValue(payload.status) || 'active',
      };

      const result = await operationsService.editBatch(requestUserId(request), toStringValue(payload.id), input);
      reply.code(200).send(result);
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.post('/admin/batch/delete', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const result = await operationsService.deleteBatch(requestUserId(request), toStringValue(payload.id));
      reply.code(200).send(result);
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  // ─── Phase 1: Payments ──────────────────────────────────────────────────

  app.get('/admin/payments/index', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const data = await operationsService.listPayments({
        fromDate: toStringValue(payload.from_date),
        toDate: toStringValue(payload.to_date),
        courseId: toStringValue(payload.course_id),
      });

      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  // ─── Phase 1: Admin Cohorts ─────────────────────────────────────────────

  app.get('/admin/centres/cohorts', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const data = await operationsService.listAdminCohorts({
        courseId: toStringValue(payload.course_id),
        subjectId: toStringValue(payload.subject_id),
        centreId: toStringValue(payload.centre_id),
        status: toStringValue(payload.status),
      });

      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  // ─── Phase 1: Admin Centre Payments ─────────────────────────────────────

  app.get('/admin/centres/centre_payments', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const data = await operationsService.listAdminCentrePayments({
        fromDate: toStringValue(payload.from_date),
        toDate: toStringValue(payload.to_date),
        status: toStringValue(payload.status),
        type: toStringValue(payload.type),
      });

      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  // ─── Phase 1: Admin Wallet Status ───────────────────────────────────────

  app.get('/admin/wallet/index', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const data = await operationsService.listAdminWalletStatus({
        centreId: toStringValue(payload.centre_id),
        centreName: toStringValue(payload.centre_name),
      });

      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  // ─── Phase 1: Notifications (admin) ─────────────────────────────────────

  app.get('/admin/notification/index', { preHandler: [requireAuth, requireAdminRole] }, async (_request, reply) => {
    try {
      const data = await operationsService.listAdminNotifications();
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  // ─── Phase 1: Banners ──────────────────────────────────────────────────

  app.get('/admin/banners/index', { preHandler: [requireAuth, requireAdminRole] }, async (_request, reply) => {
    try {
      const data = await operationsService.listBanners();
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.post('/admin/banners/add', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const input: BannerInput = {
        title: toStringValue(payload.title),
        image: toStringValue(payload.image),
        courseId: toStringValue(payload.course_id),
        status: toStringValue(payload.status) || 'active',
      };

      const result = await operationsService.addBanner(requestUserId(request), input);
      reply.code(200).send(result);
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  // ─── Phase 1: FAQ ──────────────────────────────────────────────────────

  app.get('/admin/faq/index', { preHandler: [requireAuth, requireAdminRole] }, async (_request, reply) => {
    try {
      const data = await operationsService.listFaqs();
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.post('/admin/faq/add', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const input: FaqInput = {
        question: toStringValue(payload.question),
        answer: toStringValue(payload.answer),
        status: toStringValue(payload.status) || 'active',
      };

      const result = await operationsService.addFaq(requestUserId(request), input);
      reply.code(200).send(result);
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  // ─── Phase 1: Contact Settings ──────────────────────────────────────────

  app.get('/admin/settings/contact_settings', { preHandler: [requireAuth, requireAdminRole] }, async (_request, reply) => {
    try {
      const data = await operationsService.getContactSettings();
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.post('/admin/settings/contact_settings', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      await operationsService.updateContactSettings(requestUserId(request), toStringRecord(payload.contact));

      reply.code(200).send({ status: 1, message: 'Contact Settings Updated Successfully!' });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  // ─── Phase 2: Question Bank ──────────────────────────────────────────────

  app.get('/admin/question_bank/index', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const filters: QuestionBankFilters = {
        courseId: toStringValue(payload.course_id),
        subjectId: toStringValue(payload.subject_id),
        lessonId: toStringValue(payload.lesson_id),
        ...(payload.q_type !== undefined ? { qType: toInteger(payload.q_type) } : {}),
      };
      const data = await operationsService.listQuestionBank(filters);
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.post('/admin/question_bank/add', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const input: QuestionBankInput = {
        courseId: toStringValue(payload.course_id),
        subjectId: toStringValue(payload.subject_id),
        lessonId: toStringValue(payload.lesson_id),
        categoryId: toStringValue(payload.category_id),
        type: toInteger(payload.type),
        qType: toInteger(payload.q_type),
        title: toStringValue(payload.title),
        titleFile: toStringValue(payload.title_file),
        hint: toStringValue(payload.hint),
        hintFile: toStringValue(payload.hint_file),
        solution: toStringValue(payload.solution),
        solutionFile: toStringValue(payload.solution_file),
        isEquation: toInteger(payload.is_equation),
        numberOfOptions: toInteger(payload.number_of_options) || 4,
        options: toStringValue(payload.options) || '[]',
        correctAnswers: toStringValue(payload.correct_answers) || '[]',
        rangeFrom: toStringValue(payload.range_from),
        rangeTo: toStringValue(payload.range_to),
      };
      const result = await operationsService.addQuestion(requestUserId(request), input);
      reply.code(200).send(result);
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.post('/admin/question_bank/edit', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const input: QuestionBankInput = {
        courseId: toStringValue(payload.course_id),
        subjectId: toStringValue(payload.subject_id),
        lessonId: toStringValue(payload.lesson_id),
        categoryId: toStringValue(payload.category_id),
        type: toInteger(payload.type),
        qType: toInteger(payload.q_type),
        title: toStringValue(payload.title),
        titleFile: toStringValue(payload.title_file),
        hint: toStringValue(payload.hint),
        hintFile: toStringValue(payload.hint_file),
        solution: toStringValue(payload.solution),
        solutionFile: toStringValue(payload.solution_file),
        isEquation: toInteger(payload.is_equation),
        numberOfOptions: toInteger(payload.number_of_options) || 4,
        options: toStringValue(payload.options) || '[]',
        correctAnswers: toStringValue(payload.correct_answers) || '[]',
        rangeFrom: toStringValue(payload.range_from),
        rangeTo: toStringValue(payload.range_to),
      };
      const result = await operationsService.editQuestion(requestUserId(request), toStringValue(payload.id), input);
      reply.code(200).send(result);
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.post('/admin/question_bank/delete', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const result = await operationsService.deleteQuestion(requestUserId(request), toStringValue(payload.id));
      reply.code(200).send(result);
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  // ─── Phase 2: Exams ─────────────────────────────────────────────────────

  app.get('/admin/exam/index', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const filters: AdminExamFilters = {
        courseId: toStringValue(payload.course_id),
        subjectId: toStringValue(payload.subject_id),
        batchId: toStringValue(payload.batch_id),
        status: toStringValue(payload.status),
      };
      const data = await operationsService.listAdminExams(filters);
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.post('/admin/exam/add', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const input: ExamInput = {
        title: toStringValue(payload.title),
        description: toStringValue(payload.description),
        mark: toNumber(payload.mark),
        duration: toStringValue(payload.duration),
        fromDate: toStringValue(payload.from_date),
        toDate: toStringValue(payload.to_date),
        fromTime: toStringValue(payload.from_time),
        toTime: toStringValue(payload.to_time),
        courseId: toStringValue(payload.course_id),
        subjectId: toStringValue(payload.subject_id),
        lessonId: toStringValue(payload.lesson_id),
        batchId: toStringValue(payload.batch_id),
        free: toStringValue(payload.free) || '0',
        publishResult: toInteger(payload.publish_result),
        isPractice: toInteger(payload.is_practice),
        questionIds: toStringArray(payload.question_ids),
      };
      const result = await operationsService.addExam(requestUserId(request), input);
      reply.code(200).send(result);
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.post('/admin/exam/edit', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const input: ExamInput = {
        title: toStringValue(payload.title),
        description: toStringValue(payload.description),
        mark: toNumber(payload.mark),
        duration: toStringValue(payload.duration),
        fromDate: toStringValue(payload.from_date),
        toDate: toStringValue(payload.to_date),
        fromTime: toStringValue(payload.from_time),
        toTime: toStringValue(payload.to_time),
        courseId: toStringValue(payload.course_id),
        subjectId: toStringValue(payload.subject_id),
        lessonId: toStringValue(payload.lesson_id),
        batchId: toStringValue(payload.batch_id),
        free: toStringValue(payload.free) || '0',
        publishResult: toInteger(payload.publish_result),
        isPractice: toInteger(payload.is_practice),
      };
      const result = await operationsService.editExam(requestUserId(request), toStringValue(payload.id), input);
      reply.code(200).send(result);
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.post('/admin/exam/delete', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const result = await operationsService.deleteExam(requestUserId(request), toStringValue(payload.id));
      reply.code(200).send(result);
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.post('/admin/exam/publish_result', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const result = await operationsService.publishExamResult(requestUserId(request), toStringValue(payload.id));
      reply.code(200).send(result);
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  // ─── Phase 2: Assignments ───────────────────────────────────────────────

  app.get('/admin/assignment/index', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const filters: AdminAssignmentFilters = {
        courseId: toStringValue(payload.course_id),
        cohortId: toStringValue(payload.cohort_id),
      };
      const data = await operationsService.listAdminAssignments(filters);
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.post('/admin/assignment/add', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const input: AssignmentInput = {
        title: toStringValue(payload.title),
        description: toStringValue(payload.description),
        totalMarks: toNumber(payload.total_marks),
        addedDate: toStringValue(payload.added_date),
        dueDate: toStringValue(payload.due_date),
        fromTime: toStringValue(payload.from_time),
        toTime: toStringValue(payload.to_time),
        instructions: toStringValue(payload.instructions),
        file: toStringValue(payload.file),
        courseId: toStringValue(payload.course_id),
        cohortId: toStringValue(payload.cohort_id),
      };
      const result = await operationsService.addAssignment(requestUserId(request), input);
      reply.code(200).send(result);
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.post('/admin/assignment/edit', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const input: AssignmentInput = {
        title: toStringValue(payload.title),
        description: toStringValue(payload.description),
        totalMarks: toNumber(payload.total_marks),
        dueDate: toStringValue(payload.due_date),
        fromTime: toStringValue(payload.from_time),
        toTime: toStringValue(payload.to_time),
        instructions: toStringValue(payload.instructions),
        file: toStringValue(payload.file),
        courseId: toStringValue(payload.course_id),
        cohortId: toStringValue(payload.cohort_id),
      };
      const result = await operationsService.editAssignment(requestUserId(request), toStringValue(payload.id), input);
      reply.code(200).send(result);
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.post('/admin/assignment/delete', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const result = await operationsService.deleteAssignment(requestUserId(request), toStringValue(payload.id));
      reply.code(200).send(result);
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.get('/admin/assignment/submissions', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const data = await operationsService.listAssignmentSubmissions(toStringValue(payload.assignment_id));
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.post('/admin/assignment/evaluate', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const result = await operationsService.evaluateSubmission(
        requestUserId(request),
        toStringValue(payload.id),
        toStringValue(payload.marks),
        toStringValue(payload.remarks),
      );
      reply.code(200).send(result);
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  // ─── Phase 2: Exam Results ──────────────────────────────────────────────

  app.get('/admin/Exam_result/index', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const filters: AdminExamResultFilters = {
        examId: toStringValue(payload.exam_id),
        courseId: toStringValue(payload.course_id),
        batchId: toStringValue(payload.batch_id),
      };
      const data = await operationsService.listAdminExamResults(filters);
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  // ─── Phase 2: Exam Evaluation ───────────────────────────────────────────

  app.get('/admin/Exam_evaluation/index', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const filters: AdminExamEvaluationFilters = {
        examId: toStringValue(payload.exam_id),
        courseId: toStringValue(payload.course_id),
      };
      const data = await operationsService.listExamEvaluations(filters);
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.post('/admin/Exam_evaluation/evaluate', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const result = await operationsService.evaluateExamAttempt(
        requestUserId(request),
        toStringValue(payload.attempt_id),
        toNumber(payload.score),
      );
      reply.code(200).send(result);
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  // ─── Phase 2: Re-Examination ────────────────────────────────────────────

  app.get('/admin/Re_exam/index', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const filters: AdminReExamFilters = {
        courseId: toStringValue(payload.course_id),
        batchId: toStringValue(payload.batch_id),
      };
      const data = await operationsService.listReExams(filters);
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.post('/admin/Re_exam/grant', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const result = await operationsService.grantReExam(
        requestUserId(request),
        toStringValue(payload.exam_id),
        toStringArray(payload.user_ids),
      );
      reply.code(200).send(result);
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  // ─── Phase 2: Entrance Exams ────────────────────────────────────────────

  app.get('/admin/entrance_exam/index', { preHandler: [requireAuth, requireAdminRole] }, async (_request, reply) => {
    try {
      const data = await operationsService.listEntranceExams();
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.post('/admin/entrance_exam/add', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const input: EntranceExamInput = {
        title: toStringValue(payload.title),
        description: toStringValue(payload.description),
        totalMarks: toNumber(payload.total_marks),
        duration: toStringValue(payload.duration),
        examDate: toStringValue(payload.exam_date),
        fromTime: toStringValue(payload.from_time),
        toTime: toStringValue(payload.to_time),
        courseId: toStringValue(payload.course_id),
        status: toStringValue(payload.status) || 'draft',
        questionIds: toStringValue(payload.question_ids) || '[]',
      };
      const result = await operationsService.addEntranceExam(requestUserId(request), input);
      reply.code(200).send(result);
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.post('/admin/entrance_exam/edit', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const input: EntranceExamInput = {
        title: toStringValue(payload.title),
        description: toStringValue(payload.description),
        totalMarks: toNumber(payload.total_marks),
        duration: toStringValue(payload.duration),
        examDate: toStringValue(payload.exam_date),
        fromTime: toStringValue(payload.from_time),
        toTime: toStringValue(payload.to_time),
        courseId: toStringValue(payload.course_id),
        status: toStringValue(payload.status) || 'draft',
        questionIds: toStringValue(payload.question_ids) || '[]',
      };
      const result = await operationsService.editEntranceExam(requestUserId(request), toStringValue(payload.id), input);
      reply.code(200).send(result);
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.post('/admin/entrance_exam/delete', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const result = await operationsService.deleteEntranceExam(requestUserId(request), toStringValue(payload.id));
      reply.code(200).send(result);
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.get('/admin/entrance_exam/registrations', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const data = await operationsService.listEntranceExamRegistrations(toStringValue(payload.exam_id));
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.get('/admin/entrance_exam/results', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const data = await operationsService.listEntranceExamResults(toStringValue(payload.exam_id));
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  // ─── Phase 3: Instructors ─────────────────────────────────────────────

  app.get('/admin/instructor/index', { preHandler: [requireAuth, requireAdminRole] }, async (_request, reply) => {
    try {
      const data = await operationsService.listInstructors();
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  // ─── Phase 3: Admin Users ─────────────────────────────────────────────

  app.get('/admin/admin/index', { preHandler: [requireAuth, requireAdminRole] }, async (_request, reply) => {
    try {
      const data = await operationsService.listUsersByRole(1);
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.get('/admin/sub_admin/index', { preHandler: [requireAuth, requireAdminRole] }, async (_request, reply) => {
    try {
      const data = await operationsService.listUsersByRole(8);
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  // ─── Phase 3: Add Cohort (Admin) ──────────────────────────────────────

  app.post('/admin/cohorts/add', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const input: AdminCohortInput = buildCohortInput(payload);

      const result = await operationsService.addAdminCohort(requestUserId(request), input);
      reply.code(200).send(result);
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.post('/admin/cohorts/edit', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const cohortId = toStringValue(payload.id);
      const input: AdminCohortInput = buildCohortInput(payload);
      const result = await operationsService.editAdminCohort(requestUserId(request), cohortId, input);
      reply.code(200).send(result);
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  // ─── Phase 3: Course Fees ─────────────────────────────────────────────

  app.get('/admin/course_fee/index', { preHandler: [requireAuth, requireAdminRole] }, async (_request, reply) => {
    try {
      const data = await operationsService.listCourseFees();
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  // ─── Phase 3: Fee Installments ────────────────────────────────────────

  app.get('/admin/fee_management/installments', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const data = await operationsService.listFeeInstallments({
        courseId: toStringValue(payload.course_id),
        status: toStringValue(payload.status),
        search: toStringValue(payload.search),
        centreId: toStringValue(payload.centre_id),
      });

      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  // ─── Phase 3: Payment Status ──────────────────────────────────────────

  app.get('/admin/fee_management/fee_summary', { preHandler: [requireAuth, requireAdminRole] }, async (_request, reply) => {
    try {
      const data = await operationsService.listFeeSummary();
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  app.get('/admin/fee_management/payment_status', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const data = await operationsService.listPaymentStatus({
        fromDate: toStringValue(payload.from_date),
        toDate: toStringValue(payload.to_date),
        courseId: toStringValue(payload.course_id),
        centreId: toStringValue(payload.centre_id),
        search: toStringValue(payload.search),
      });

      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  // ─── Phase 3: Cohort Attendance ───────────────────────────────────────

  app.get('/admin/cohorts/attendance', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const data = await operationsService.listCohortAttendance({
        cohortId: toStringValue(payload.cohort_id),
      });

      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  // ─── Phase 3: Scholarships ────────────────────────────────────────────

  app.get('/admin/scholarships/index', { preHandler: [requireAuth, requireAdminRole] }, async (_request, reply) => {
    try {
      const data = await operationsService.listScholarships();
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  // ─── Phase 4: CRM & Content ────────────────────────────────────────────

  app.get('/admin/counsellor/index', { preHandler: [requireAuth, requireAdminRole] }, async (_request, reply) => {
    try {
      const data = await operationsService.listCounsellors();
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.get('/admin/counsellor_target/index', { preHandler: [requireAuth, requireAdminRole] }, async (_request, reply) => {
    try {
      const data = await operationsService.listCounsellorTargets();
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.get('/admin/referrals/index', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      // Counsellors see only the rows they referred; admins/sub-admins see all.
      const callerRoleId = request.authContext?.user.role_id ?? null;
      const callerUserId = request.authContext?.user.id ?? null;
      const scopedToUserId = callerRoleId === 9 && callerUserId !== null ? callerUserId : null;
      const data = await operationsService.listReferrals(scopedToUserId);
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.get('/admin/associates/index', { preHandler: [requireAuth, requireAdminRole] }, async (_request, reply) => {
    try {
      const data = await operationsService.listAssociates();
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.get('/admin/associates_target/index', { preHandler: [requireAuth, requireAdminRole] }, async (_request, reply) => {
    try {
      const data = await operationsService.listAssociateTargets();
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.get('/admin/documents/requests', { preHandler: [requireAuth, requireAdminRole] }, async (_request, reply) => {
    try {
      const data = await operationsService.listDocumentRequests();
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.get('/admin/documents/issued', { preHandler: [requireAuth, requireAdminRole] }, async (_request, reply) => {
    try {
      const data = await operationsService.listDocumentsIssued();
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.get('/admin/documents/delivery', { preHandler: [requireAuth, requireAdminRole] }, async (_request, reply) => {
    try {
      const data = await operationsService.listDocumentsDelivery();
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.get('/admin/events/index', { preHandler: [requireAuth, requireAdminRole] }, async (_request, reply) => {
    try {
      const data = await operationsService.listAdminEvents();
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.get('/admin/circulars/index', { preHandler: [requireAuth, requireAdminRole] }, async (_request, reply) => {
    try {
      const data = await operationsService.listCirculars();
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.get('/admin/mentorship/history', { preHandler: [requireAuth, requireAdminRole] }, async (_request, reply) => {
    try {
      const data = await operationsService.listMentorshipHistory();
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.get('/admin/mentorship/analysis', { preHandler: [requireAuth, requireAdminRole] }, async (_request, reply) => {
    try {
      const data = await operationsService.mentorshipAnalysis();
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  // ── Phase 5: Integrations & Polish ──────────────────────────────

  app.get('/admin/chat_support', { preHandler: [requireAuth, requireAdminRole] }, async (_request, reply) => {
    try {
      const data = await operationsService.listAdminSupportChats();
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.get('/admin/training_videos', { preHandler: [requireAuth, requireAdminRole] }, async (_request, reply) => {
    try {
      const data = await operationsService.listAdminTrainingVideos();
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.get('/admin/enrol/index', { preHandler: [requireAuth, requireAdminRole] }, async (_request, reply) => {
    try {
      const data = await operationsService.listAdminEnrollments();
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.get('/admin/feed/index', { preHandler: [requireAuth, requireAdminRole] }, async (_request, reply) => {
    try {
      const data = await operationsService.listAdminFeeds();
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.get('/admin/integration/index', { preHandler: [requireAuth, requireAdminRole] }, async (_request, reply) => {
    try {
      const data = await operationsService.listIntegrationSettings();
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.get('/admin/review/index', { preHandler: [requireAuth, requireAdminRole] }, async (_request, reply) => {
    try {
      const data = await operationsService.listAdminReviews();
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.get('/admin/language/index', { preHandler: [requireAuth, requireAdminRole] }, async (_request, reply) => {
    try {
      const data = await operationsService.listLanguages();
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  // ─── Phase A: CRUD routes ─────────────────────────────────────────────────

  app.post('/admin/instructor/add', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const input: AddInstructorInput = {
        name: toStringValue(payload.name),
        email: toStringValue(payload.email),
        phone: toStringValue(payload.phone),
        bio: toStringValue(payload.bio),
        status: toInteger(payload.status),
        image: toStringValue(payload.image),
      };
      const result = await operationsService.addInstructor(requestUserId(request), input);
      reply.code(200).send(result);
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  app.post('/admin/instructor/edit', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const input: AddInstructorInput = {
        name: toStringValue(payload.name),
        email: toStringValue(payload.email),
        phone: toStringValue(payload.phone),
        bio: toStringValue(payload.bio),
        status: toInteger(payload.status),
      };
      const result = await operationsService.editInstructor(requestUserId(request), toStringValue(payload.id), input);
      reply.code(200).send(result);
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  app.post('/admin/instructor/delete', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const result = await operationsService.deleteInstructor(requestUserId(request), toStringValue(payload.id));
      reply.code(200).send(result);
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  app.post('/admin/user/add', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const input: AddUserInput = {
        name: toStringValue(payload.name),
        email: toStringValue(payload.email),
        phone: toStringValue(payload.phone),
        roleId: toInteger(payload.role_id),
        image: toStringValue(payload.image),
      };
      const result = await operationsService.addUser(requestUserId(request), input);
      reply.code(200).send(result);
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  app.post('/admin/user/edit', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const statusRaw = payload.status;
      const editInput: { name: string; phone?: string; status?: number; image?: string } = {
        name: toStringValue(payload.name),
        phone: toStringValue(payload.phone),
      };
      if (statusRaw !== undefined && statusRaw !== null && statusRaw !== '') {
        const parsed = Number(statusRaw);
        if (Number.isFinite(parsed)) editInput.status = parsed;
      }
      if (typeof payload.image === 'string') editInput.image = payload.image;
      const result = await operationsService.editUser(
        requestUserId(request),
        toStringValue(payload.id),
        editInput,
      );
      reply.code(200).send(result);
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  app.post('/admin/user/delete', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const result = await operationsService.deleteUser(requestUserId(request), toStringValue(payload.id));
      reply.code(200).send(result);
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  // ── Admin permissions (Track 3 of QA round 2026-04-30) ─────────────
  app.get('/admin/permissions/catalog', { preHandler: [requireAuth, requireAdminRole] }, async (_request, reply) => {
    try {
      const { listAdminPermissions } = await import('../auth/permissions.js');
      const rows = await listAdminPermissions();
      reply.code(200).send({ status: 1, message: 'success', data: rows });
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  app.get('/admin/permissions/user', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const userId = toInteger(payload.user_id);
      if (!userId) {
        reply.code(200).send({ status: 0, message: 'user_id is required', data: [] });
        return;
      }
      const { listUserGrantedPermissionIds } = await import('../auth/permissions.js');
      const ids = await listUserGrantedPermissionIds(userId);
      reply.code(200).send({ status: 1, message: 'success', data: ids });
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  app.post('/admin/permissions/user/set', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const targetUserId = toInteger(payload.user_id);
      if (!targetUserId) {
        reply.code(200).send({ status: 0, message: 'user_id is required', data: [] });
        return;
      }
      const idsRaw = Array.isArray(payload.permission_ids) ? payload.permission_ids : [];
      const ids = idsRaw.map((v) => toInteger(v)).filter((n): n is number => Number.isInteger(n) && n > 0);
      const actorUserId = toInteger(requestUserId(request));
      const { setUserPermissions } = await import('../auth/permissions.js');
      await setUserPermissions(actorUserId, targetUserId, ids);
      reply.code(200).send({ status: 1, message: 'Permissions updated.', data: { user_id: targetUserId, permission_ids: ids } });
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  app.post('/admin/associates/add', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const input: AddAssociateInput = {
        name: toStringValue(payload.name),
        email: toStringValue(payload.email),
        phone: toStringValue(payload.phone),
        status: toInteger(payload.status),
        image: toStringValue(payload.image),
      };
      const result = await operationsService.addAssociate(requestUserId(request), input);
      reply.code(200).send(result);
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  app.post('/admin/counsellor_target/add', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const input: AddTargetInput = {
        userId: toStringValue(payload.user_id),
        targetType: toStringValue(payload.target_type) || 'applications',
        targetValue: toInteger(payload.target_value),
        periodFrom: toStringValue(payload.period_from),
        periodTo: toStringValue(payload.period_to),
        remarks: toStringValue(payload.remarks),
      };
      const result = await operationsService.addCounsellorTarget(requestUserId(request), input);
      reply.code(200).send(result);
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  app.post('/admin/counsellor_target/edit', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const input: AddTargetInput = {
        userId: toStringValue(payload.user_id),
        targetType: toStringValue(payload.target_type) || 'applications',
        targetValue: toInteger(payload.target_value),
        periodFrom: toStringValue(payload.period_from),
        periodTo: toStringValue(payload.period_to),
        remarks: toStringValue(payload.remarks),
      };
      const result = await operationsService.editCounsellorTarget(requestUserId(request), toStringValue(payload.id), input);
      reply.code(200).send(result);
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  app.post('/admin/counsellor_target/delete', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const result = await operationsService.deleteCounsellorTarget(requestUserId(request), toStringValue(payload.id));
      reply.code(200).send(result);
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  app.post('/admin/associates_target/add', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const input: AddTargetInput = {
        userId: toStringValue(payload.user_id),
        targetType: toStringValue(payload.target_type) || 'applications',
        targetValue: toInteger(payload.target_value),
        periodFrom: toStringValue(payload.period_from),
        periodTo: toStringValue(payload.period_to),
        remarks: toStringValue(payload.remarks),
      };
      const result = await operationsService.addAssociateTarget(requestUserId(request), input);
      reply.code(200).send(result);
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  app.post('/admin/associates_target/edit', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const input: AddTargetInput = {
        userId: toStringValue(payload.user_id),
        targetType: toStringValue(payload.target_type) || 'applications',
        targetValue: toInteger(payload.target_value),
        periodFrom: toStringValue(payload.period_from),
        periodTo: toStringValue(payload.period_to),
        remarks: toStringValue(payload.remarks),
      };
      const result = await operationsService.editAssociateTarget(requestUserId(request), toStringValue(payload.id), input);
      reply.code(200).send(result);
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  app.post('/admin/associates_target/delete', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const result = await operationsService.deleteAssociateTarget(requestUserId(request), toStringValue(payload.id));
      reply.code(200).send(result);
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  // ── Applications Phase B ────────────────────────────────────────────────────

  app.get('/admin/applications/get', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const result = await operationsService.getApplication(toStringValue(payload.id));
      reply.code(200).send({ status: 1, message: 'success', data: result });
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  app.post('/admin/applications/add', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const input: AdminApplicationInput = {
        firstName: toStringValue(payload.first_name),
        lastName: toStringValue(payload.last_name),
        email: toStringValue(payload.email),
        phone: toStringValue(payload.phone),
        alternatePhone: toStringValue(payload.alternate_phone),
        dateOfBirth: toStringValue(payload.date_of_birth),
        gender: toStringValue(payload.gender),
        nationality: toStringValue(payload.nationality),
        maritalStatus: toStringValue(payload.marital_status),
        fatherName: toStringValue(payload.father_name),
        motherName: toStringValue(payload.mother_name),
        guardianName: toStringValue(payload.guardian_name),
        aadharNo: toStringValue(payload.aadhar_no),
        passportNo: toStringValue(payload.passport_no),
        whatsappNo: toStringValue(payload.whatsapp_no),
        addressLine1: toStringValue(payload.address_line_1),
        addressLine2: toStringValue(payload.address_line_2),
        city: toStringValue(payload.city),
        state: toStringValue(payload.state),
        pincode: toStringValue(payload.pincode),
        country: toStringValue(payload.country),
        permanentAddress: toStringValue(payload.permanent_address),
        correspondenceAddress: toStringValue(payload.correspondence_address),
        highestQualification: toStringValue(payload.highest_qualification),
        specialization: toStringValue(payload.specialization),
        institutionName: toStringValue(payload.institution_name),
        yearOfPassing: toStringValue(payload.year_of_passing),
        percentageOrCgpa: toStringValue(payload.percentage_or_cgpa),
        workExperience: toStringValue(payload.work_experience),
        currentOccupation: toStringValue(payload.current_occupation),
        employmentStatus: toStringValue(payload.employment_status),
        courseId: toStringValue(payload.course_id),
        centreId: toStringValue(payload.centre_id),
        batchId: toStringValue(payload.batch_id),
        offeringId: toStringValue(payload.offering_id),
        enrollmentDate: toStringValue(payload.enrollment_date),
        modeOfStudy: toStringValue(payload.mode_of_study),
        language: toStringValue(payload.language),
        pipeline: toStringValue(payload.pipeline),
        pipelineUser: toStringValue(payload.pipeline_user),
        discount: toStringValue(payload.discount),
        gstApplicability: toStringValue(payload.gst_applicability),
        leadSource: toStringValue(payload.lead_source),
        applicationStatus: toStringValue(payload.application_status) || 'pending',
        notes: toStringValue(payload.notes),
        crmTags: toStringValue(payload.crm_tags),
      };

      // Server-side email check (MX + disposable). Defense in depth — the
      // form does the same check on blur but we must not trust client.
      if (input.email) {
        const verification = await verifyEmail(input.email);
        if (!verification.valid) {
          reply.code(200).send({
            status: 0,
            message: verification.message ?? 'Email failed verification.',
            data: { reason: verification.reason },
          });
          return;
        }
      }

      const result = await operationsService.createApplication(requestUserId(request), input);
      reply.code(200).send(result);
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  // Public endpoint used by the Add Application form on email blur — runs
  // the same server-side check (MX + disposable) so the user gets early
  // feedback. Authenticated to limit abuse but available to any signed-in
  // staff role.
  app.get('/admin/email/verify', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const email = toStringValue(payload.email);
      const result = await verifyEmail(email);
      reply.code(200).send({ status: result.valid ? 1 : 0, message: result.message ?? 'OK', data: result });
    } catch (error: unknown) {
      sendOperationsError(reply, error);
    }
  });

  app.post('/admin/applications/delete', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const result = await operationsService.deleteApplication(requestUserId(request), toStringValue(payload.id));
      reply.code(200).send(result);
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  app.post('/admin/applications/update_status', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const result = await operationsService.updateApplicationStatus(requestUserId(request), toStringValue(payload.id), toStringValue(payload.status), toStringValue(payload.reject_reason));
      reply.code(200).send(result);
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  // ─── Phase C: Student Detail & Actions ──────────────────────────────────────

  app.get('/admin/students/view', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const data = await operationsService.getStudentDetail(toStringValue(payload.id));
      reply.code(200).send(data);
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  app.get('/admin/students/analytics', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const data = await operationsService.getStudentAnalytics(toStringValue(payload.id));
      reply.code(200).send(data);
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  app.post('/admin/students/change_username', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const result = await operationsService.changeStudentUsername(requestUserId(request), toStringValue(payload.id), toStringValue(payload.username));
      reply.code(200).send(result);
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  app.post('/admin/students/change_password', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const result = await operationsService.changeStudentPassword(requestUserId(request), toStringValue(payload.id), toStringValue(payload.password));
      reply.code(200).send(result);
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  app.post('/admin/students/edit_enrollment_id', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const result = await operationsService.editStudentEnrollmentId(requestUserId(request), toStringValue(payload.id), toStringValue(payload.enrollment_id));
      reply.code(200).send(result);
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  app.post('/admin/students/edit', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const result = await operationsService.editStudentInfo(requestUserId(request), toStringValue(payload.id), toStringValue(payload.name), toStringValue(payload.phone));
      reply.code(200).send(result);
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  app.get('/admin/batch/students', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const data = await operationsService.listBatchStudents(toStringValue(payload.batch_id));
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  // ─── Phase D: Centres Feature ───────────────────────────────────────────────

  app.get('/admin/centres/get', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const result = await operationsService.getCentre(toStringValue(payload.id));
      reply.code(200).send(result);
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  app.post('/admin/centres/edit', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const input: UpdateCentreInput = {
        centreName: toStringValue(payload.centre_name),
        contactPerson: toStringValue(payload.contact_person),
        phone: toStringValue(payload.phone),
        email: toStringValue(payload.email),
        address: toStringValue(payload.address),
        city: toStringValue(payload.city),
        state: toStringValue(payload.state),
        pincode: toStringValue(payload.pincode),
        googleMapsLink: toStringValue(payload.google_maps_link),
        affiliationNumber: toStringValue(payload.affiliation_number),
        affiliationDate: toStringValue(payload.affiliation_date),
        affiliationDocument: toStringValue(payload.affiliation_document),
        recognitionStatus: toStringValue(payload.recognition_status),
        description: toStringValue(payload.description),
        status: toStringValue(payload.status),
        logo: toStringValue(payload.logo),
        establishedDate: toStringValue(payload.established_date),
        registrationDate: toStringValue(payload.date_of_registration),
        expiryDate: toStringValue(payload.date_of_expiry),
      };
      const result = await operationsService.updateCentre(requestUserId(request), toStringValue(payload.id), input);
      reply.code(200).send(result);
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  app.post('/admin/centres/delete', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const result = await operationsService.deleteCentre(requestUserId(request), toStringValue(payload.id));
      reply.code(200).send(result);
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  app.post('/admin/centres/fund_request/approve', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const result = await operationsService.approveFundRequest(requestUserId(request), toStringValue(payload.id));
      reply.code(200).send(result);
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  app.post('/admin/centres/fund_request/reject', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const result = await operationsService.rejectFundRequest(requestUserId(request), toStringValue(payload.id));
      reply.code(200).send(result);
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  app.get('/admin/cohorts/view', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const result = await operationsService.getCohortDetail(toStringValue(payload.id));
      reply.code(200).send(result);
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  app.get('/admin/live_classes/attendance', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const result = await operationsService.getLiveSessionAttendance(toStringValue(payload.id));
      reply.code(200).send(result);
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  app.get('/admin/live_classes/recording-signed-url', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const liveClassId = toStringValue(payload.id);
      const key = await operationsService.getLiveSessionRecordingStorageKey(liveClassId);
      if (!key) {
        reply.code(404).send({ status: 0, message: 'Recording not available yet for this session.' });
        return;
      }
      const storage = options.storage;
      if (!storage) {
        reply.code(503).send({ status: 0, message: 'Storage provider not configured.' });
        return;
      }
      const expiresInSeconds = 3600; // 1 hour — generous so students can keep the tab open
      const url = await storage.createSignedDownloadUrl({ key, expiresInSeconds });
      reply.code(200).send({ status: 1, data: { url, expiresInSeconds } });
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  app.post('/admin/resources/delete', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const resourceType = toStringValue(payload.type) === 'folder' ? 'folder' as const : 'file' as const;
      const result = await operationsService.deleteResource(requestUserId(request), toStringValue(payload.id), resourceType);
      reply.code(200).send(result);
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  app.post('/admin/resources/rename', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const resourceType = toStringValue(payload.type) === 'folder' ? 'folder' as const : 'file' as const;
      const result = await operationsService.renameResource(requestUserId(request), toStringValue(payload.id), resourceType, toStringValue(payload.name));
      reply.code(200).send(result);
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  app.post('/admin/training_videos/add', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const input: TrainingVideoInput = {
        title: toStringValue(payload.title),
        category: toStringValue(payload.category),
        videoType: toStringValue(payload.video_type),
        videoUrl: toStringValue(payload.video_url),
        thumbnail: toStringValue(payload.thumbnail),
        description: toStringValue(payload.description),
        status: toStringValue(payload.status),
      };
      const result = await operationsService.addTrainingVideo(requestUserId(request), input);
      reply.code(200).send(result);
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  app.post('/admin/training_videos/edit', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const input: TrainingVideoInput = {
        title: toStringValue(payload.title),
        category: toStringValue(payload.category),
        videoType: toStringValue(payload.video_type),
        videoUrl: toStringValue(payload.video_url),
        thumbnail: toStringValue(payload.thumbnail),
        description: toStringValue(payload.description),
        status: toStringValue(payload.status),
      };
      const result = await operationsService.editTrainingVideo(requestUserId(request), toStringValue(payload.id), input);
      reply.code(200).send(result);
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  app.post('/admin/training_videos/delete', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const result = await operationsService.deleteTrainingVideo(requestUserId(request), toStringValue(payload.id));
      reply.code(200).send(result);
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  // ── Phase F: Payment Actions ──────────────────────────────────

  app.post('/admin/fee_management/mark_paid', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const result = await operationsService.markInstallmentPaid(requestUserId(request), toStringValue(payload.installment_id));
      reply.code(200).send(result);
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  app.post('/admin/fee_management/send_reminder', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const result = await operationsService.sendPaymentReminder(requestUserId(request), toStringValue(payload.installment_id));
      reply.code(200).send(result);
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  // ── Phase F: Chat Support ─────────────────────────────────────

  app.get('/admin/chat_support/conversations', { preHandler: [requireAuth, requireAdminRole] }, async (_request, reply) => {
    try {
      const data = await operationsService.listAdminConversations();
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  app.get('/admin/chat_support/messages', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const data = await operationsService.getConversationMessages(toStringValue(payload.chat_id));
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  app.post('/admin/chat_support/send', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const result = await operationsService.sendAdminMessage(
        requestUserId(request),
        toStringValue(payload.chat_id),
        toStringValue(payload.message),
      );
      reply.code(200).send(result);
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  // ── Counsellor CRUD ─────────────────────────────────────────────

  app.post('/admin/counsellor/add', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const input: AddAssociateInput = {
        name: toStringValue(payload.name),
        email: toStringValue(payload.email),
        phone: toStringValue(payload.phone),
        status: toInteger(payload.status),
        image: toStringValue(payload.image),
      };
      const result = await operationsService.addCounsellor(requestUserId(request), input);
      reply.code(200).send(result);
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  app.post('/admin/counsellor/edit', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const result = await operationsService.editCounsellor(
        requestUserId(request),
        toStringValue(payload.id),
        { name: toStringValue(payload.name), phone: toStringValue(payload.phone), status: toInteger(payload.status) },
      );
      reply.code(200).send(result);
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  app.post('/admin/counsellor/delete', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const result = await operationsService.deleteCounsellor(requestUserId(request), toStringValue(payload.id));
      reply.code(200).send(result);
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  // ── Associate Edit/Delete ───────────────────────────────────────

  app.post('/admin/associates/edit', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const result = await operationsService.editAssociate(
        requestUserId(request),
        toStringValue(payload.id),
        { name: toStringValue(payload.name), phone: toStringValue(payload.phone), status: toInteger(payload.status) },
      );
      reply.code(200).send(result);
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  app.post('/admin/associates/delete', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const result = await operationsService.deleteAssociate(requestUserId(request), toStringValue(payload.id));
      reply.code(200).send(result);
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  // ─── Cohort Announcements ────────────────────────────────────────
  // Per Naji's TTII LMS Correction_new_corrections doc — top-level admin
  // listing of announcements created via cohorts, with full CRUD.

  const buildAnnouncementInput = (p: Record<string, unknown>): AnnouncementInput => {
    const audienceType = toStringValue(p.audience_type);
    const channelsRaw = p.delivery_channels;
    const channels: string[] = Array.isArray(channelsRaw)
      ? channelsRaw.filter((x): x is string => typeof x === 'string')
      : typeof channelsRaw === 'string' && channelsRaw
        ? channelsRaw.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
    const userIdsRaw = p.audience_user_ids;
    const userIds: string[] = Array.isArray(userIdsRaw)
      ? userIdsRaw.map((u) => String(u))
      : typeof userIdsRaw === 'string' && userIdsRaw
        ? userIdsRaw.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
    return {
      cohort_id: toStringValue(p.cohort_id) || undefined,
      title: toStringValue(p.title),
      content: toStringValue(p.content),
      description: toStringValue(p.description) || undefined,
      audience_type: audienceType === 'selected' ? 'selected' : 'all',
      audience_user_ids: userIds.length > 0 ? userIds : undefined,
      delivery_channels: channels.length > 0 ? channels : undefined,
      attachment_url: toStringValue(p.attachment_url) || undefined,
      status: toStringValue(p.status) === 'sent' ? 'sent' : 'draft',
    };
  };

  app.get('/admin/announcements', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const q = (request.query as Record<string, unknown>) ?? {};
      const data = await announcementService.list({
        cohortId: toStringValue(q.cohort_id) || undefined,
        status: toStringValue(q.status) || undefined,
      });
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  app.get('/admin/announcements/:id', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const params = request.params as { id?: string };
      const data = await announcementService.get(toStringValue(params.id));
      if (!data) {
        reply.code(404).send({ status: 0, message: 'Announcement not found.', data: {} });
        return;
      }
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  app.post('/admin/announcements', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const input = buildAnnouncementInput(requestPayload(request));
      if (!input.title || !input.content) {
        reply.code(400).send({ status: 0, message: 'title and content are required.', data: {} });
        return;
      }
      const data = await announcementService.create(requestUserId(request), input);
      reply.code(200).send({ status: 1, message: 'Announcement created.', data });
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  app.post('/admin/announcements/:id/update', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const params = request.params as { id?: string };
      const input = buildAnnouncementInput(requestPayload(request));
      await announcementService.update(requestUserId(request), toStringValue(params.id), input);
      reply.code(200).send({ status: 1, message: 'Announcement updated.', data: {} });
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });

  app.post('/admin/announcements/:id/delete', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const params = request.params as { id?: string };
      await announcementService.delete(requestUserId(request), toStringValue(params.id));
      reply.code(200).send({ status: 1, message: 'Announcement deleted.', data: {} });
    } catch (error: unknown) { sendOperationsError(reply, error); }
  });
}
