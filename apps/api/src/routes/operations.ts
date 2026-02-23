import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { AuthService } from '../auth/auth-service.js';
import { requireLegacyAuth, requireLegacyRoles } from '../auth/middleware.js';
import { ADMIN_PORTAL_ROLES, LEGACY_ROLE } from '../auth/roles.js';
import {
  OperationsService,
  type AddCentreFundRequestInput,
  type AddLiveClassInput,
  type CentreApplicationInput,
  type CentreInput,
  type CohortInput,
  type ExportReportInput,
  type UpdateSettingsInput,
} from '../operations/operations-service.js';

interface RegisterOperationsRoutesOptions {
  authService?: AuthService;
  operationsService?: OperationsService;
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

function toIntegerArray(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => toInteger(entry))
      .filter((entry) => entry > 0);
  }

  if (typeof value === 'string' && value.trim() !== '') {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        return parsed
          .map((entry) => toInteger(entry))
          .filter((entry) => entry > 0);
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

function requestUserId(request: FastifyRequest): number {
  return request.authContext?.user.id ?? 0;
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

export function registerOperationsRoutes(
  app: FastifyInstance,
  options: RegisterOperationsRoutesOptions = {},
): void {
  const authService = options.authService ?? new AuthService();
  const operationsService = options.operationsService ?? new OperationsService();

  const requireAuth = requireLegacyAuth(authService);
  const requireAdminRole = requireLegacyRoles(authService, ADMIN_PORTAL_ROLES);
  const requireCentreRole = requireLegacyRoles(authService, [LEGACY_ROLE.CENTRE]);

  app.get('/admin/applications/index', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const data = await operationsService.listAdminApplications({
        fromDate: toStringValue(payload.from_date),
        toDate: toStringValue(payload.to_date),
        pipelineRoleId: toInteger(payload.filter_pipeline),
        courseId: toInteger(payload.course),
        listBy: toStringValue(payload.list_by),
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
        const result = await operationsService.convertApplication(requestUserId(request), toInteger(payload.id || payload.application_id));

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
        courseId: toInteger(payload.course_id),
        pipeline: toStringValue(payload.pipeline),
        pipelineUser: toInteger(payload.pipeline_user),
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
        const result = await operationsService.convertApplication(requestUserId(request), toInteger(payload.id || payload.application_id));

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
        courseId: toInteger(payload.course_id),
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
        courseId: toInteger(payload.course_id),
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
        password: toStringValue(payload.password),
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
        centreId: toInteger(payload.centre_id),
        courseId: toInteger(payload.course_id),
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
        courseId: toInteger(payload.course_id),
        subjectId: toInteger(payload.subject_id),
        instructorId: toInteger(payload.instructor_id),
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
        cohortId: toInteger(payload.cohort_id),
        studentIds: toIntegerArray(payload.student_id),
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
      const input: AddLiveClassInput = {
        cohortId: toInteger(payload.cohort_id),
        zoomId: toStringValue(payload.zoom_id),
        password: toStringValue(payload.password),
        entries: toLiveEntries(payload.entries),
      };

      const result = await operationsService.addLiveClasses('admin', requestUserId(request), input);
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
      const input: AddLiveClassInput = {
        cohortId: toInteger(payload.cohort_id),
        zoomId: toStringValue(payload.zoom_id),
        password: toStringValue(payload.password),
        entries: toLiveEntries(payload.entries),
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
        folderId: toInteger(payload.folder_id || payload.id),
        centreId: toInteger(payload.centre_id),
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
        parentId: toInteger(payload.parent_id),
        name: toStringValue(payload.name),
        centreId: toInteger(payload.centre_id),
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
        folderId: toInteger(payload.folder_id),
        name: toStringValue(payload.name),
        fileType: toStringValue(payload.type),
        size: toInteger(payload.size),
        path: toStringValue(payload.path),
        centreId: toInteger(payload.centre_id),
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
        folderId: toInteger(payload.folder_id || payload.id),
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
        parentId: toInteger(payload.parent_id),
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
        folderId: toInteger(payload.folder_id),
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
        toInteger(payload.live_id),
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
        liveId: toInteger(payload.live_id),
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
}
