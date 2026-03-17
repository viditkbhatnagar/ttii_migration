import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { AuthService } from '../auth/auth-service.js';
import { requireLegacyAuth, requireLegacyRoles } from '../auth/middleware.js';
import { ADMIN_PORTAL_ROLES } from '../auth/roles.js';
import {
  ContentService,
  type AdminCourseInput,
  type AdminLessonFileInput,
  type AdminLessonInput,
  type AdminSubjectInput,
  type LessonMaterialFilter,
  type SaveMaterialProgressInput,
  type SaveVideoProgressInput,
} from '../content/content-service.js';

interface RegisterContentRoutesOptions {
  authService?: AuthService;
  contentService?: ContentService;
  [key: string]: unknown;
}

function toStringValue(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
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
  return request.authContext?.user.id ?? '';
}

function sendContentError(reply: FastifyReply, error: unknown): void {
  const message = error instanceof Error ? error.message : 'Internal content error.';

  reply.code(500).send({
    status: 0,
    message,
    data: {},
  });
}

export function registerContentRoutes(
  app: FastifyInstance,
  options: RegisterContentRoutesOptions = {},
): void {
  const authService = options.authService ?? new AuthService();
  const contentService = options.contentService ?? new ContentService();
  const requireAuth = requireLegacyAuth(authService);

  app.get('/category/index', async (_request, reply) => {
    try {
      const categories = await contentService.listCategories();
      reply.code(200).send({
        status: 1,
        message: 'success',
        data: categories,
      });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  app.get('/category/get_category_details', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const categoryId = toStringValue(payload.category_id);

      const categoryDetails = await contentService.getCategoryDetails(categoryId);
      if (!categoryDetails) {
        reply.code(200).send({
          status: 'error',
          message: 'Category not found',
        });
        return;
      }

      reply.code(200).send({
        status: 'success',
        data: categoryDetails,
      });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  app.get('/course/all_course', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const courses = await contentService.listCourses(requestUserId(request));
      reply.code(200).send({
        status: 1,
        message: 'success',
        data: courses,
      });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  app.get('/course/get_course_details', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const courseId = toStringValue(payload.course_id);

      const courseDetails = await contentService.getCourseDetails(requestUserId(request), courseId);
      reply.code(200).send({
        status: 1,
        message: 'success',
        data: courseDetails ?? [],
      });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  app.get('/course/get_subjects', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const courseId = toStringValue(payload.course_id);

      const subjects = await contentService.getSubjects(requestUserId(request), courseId);
      if (subjects.length > 0) {
        reply.code(200).send({
          status: 1,
          message: 'success',
          data: subjects,
        });
        return;
      }

      reply.code(200).send({
        status: 0,
        message: 'user not found',
        data: [],
      });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  app.get('/course/get_lessons', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const subjectId = toStringValue(payload.subject_id);
      const lessons = await contentService.getLessons(requestUserId(request), subjectId);

      reply.code(200).send({
        status: 1,
        message: 'success',
        data: lessons,
      });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  app.get('/lesson/index', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const subjectId = toStringValue(payload.subject_id);
      const lessons = await contentService.getLessonIndex(requestUserId(request), subjectId);

      reply.code(200).send({
        status: 1,
        message: 'success',
        data: {
          lesson: lessons,
        },
      });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  app.get('/lesson_file/index', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const lessonId = toStringValue(payload.lesson_id);
      const lessonFiles = await contentService.getLessonFileGroupedIndex(requestUserId(request), lessonId);

      reply.code(200).send({
        status: 1,
        message: 'success',
        data: lessonFiles,
      });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  app.get('/lesson_file/videos', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const lessonId = toStringValue(payload.lesson_id);
      const videos = await contentService.getLessonVideos(requestUserId(request), lessonId);

      reply.code(200).send({
        status: 1,
        message: 'success',
        data: {
          video_list: videos,
        },
      });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  app.get('/lesson_file/materials', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const filter: LessonMaterialFilter = {
        lessonId: toStringValue(payload.lesson_id),
        subjectId: toStringValue(payload.subject_id),
        courseId: toStringValue(payload.course_id),
      };

      const materials = await contentService.getLessonMaterials(requestUserId(request), filter);

      reply.code(200).send({
        status: 1,
        message: 'success',
        data: {
          material_list: materials,
        },
      });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  app.get('/lesson_file/save_video_progress', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const input: SaveVideoProgressInput = {
        courseId: toStringValue(payload.course_id),
        lessonFileId: toStringValue(payload.lesson_file_id),
        lessonDuration: toStringValue(payload.lesson_duration),
        userProgress: toStringValue(payload.user_progress),
      };

      await contentService.saveVideoProgress(requestUserId(request), input);

      reply.code(200).send({
        status: 1,
        message: 'success',
        data: {},
      });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  app.get('/lesson_file/save_material_progress', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const input: SaveMaterialProgressInput = {
        courseId: toStringValue(payload.course_id),
        lessonFileId: toStringValue(payload.lesson_file_id),
        attachmentType: toStringValue(payload.attachment_type),
      };

      await contentService.saveMaterialProgress(requestUserId(request), input);

      reply.code(200).send({
        status: 1,
        message: 'success',
        data: [],
      });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  app.get('/lesson_file/streak_data', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const streakData = await contentService.getStreakData(
        requestUserId(request),
        toStringValue(payload.from_date),
        toStringValue(payload.to_date),
      );

      if (!streakData) {
        reply.code(200).send({
          status: 0,
          message: 'user not found',
          data: '',
        });
        return;
      }

      reply.code(200).send({
        status: 1,
        message: 'success',
        data: streakData,
      });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  // ── Admin Course CRUD routes ────────────────────────────────────

  const requireAdminRole = requireLegacyRoles(authService, ADMIN_PORTAL_ROLES);

  function toNumber(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return 0;
  }

  app.get('/admin/course/index', { preHandler: [requireAuth, requireAdminRole] }, async (_request, reply) => {
    try {
      const courses = await contentService.listCoursesAdmin();
      reply.code(200).send({ status: 1, message: 'success', data: courses });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  app.get('/admin/course/get', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const courseId = toStringValue(payload.id);
      const course = await contentService.getCourseAdmin(courseId);
      if (!course) {
        reply.code(200).send({ status: 0, message: 'Course not found', data: {} });
        return;
      }
      reply.code(200).send({ status: 1, message: 'success', data: course });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  app.post('/admin/course/add', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const input: AdminCourseInput = {
        title: toStringValue(payload.title),
        short_name: toStringValue(payload.short_name),
        category_id: toStringValue(payload.category_id),
        description: toStringValue(payload.description),
        duration: toStringValue(payload.duration),
        thumbnail: toStringValue(payload.thumbnail),
        is_free_course: payload.is_free_course === true || payload.is_free_course === 'true' || payload.is_free_course === 1,
        price: toNumber(payload.price),
        sale_price: toNumber(payload.sale_price),
        features: toStringValue(payload.features),
        label: toStringValue(payload.label),
        status: toStringValue(payload.status) || 'active',
      };
      const result = await contentService.createCourse(requestUserId(request), input);
      reply.code(200).send({ status: 1, message: 'Course created', data: result });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  app.post('/admin/course/edit', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const courseId = toStringValue(payload.id);
      const input: AdminCourseInput = {
        title: toStringValue(payload.title),
        short_name: toStringValue(payload.short_name),
        category_id: toStringValue(payload.category_id),
        description: toStringValue(payload.description),
        duration: toStringValue(payload.duration),
        thumbnail: toStringValue(payload.thumbnail),
        is_free_course: payload.is_free_course === true || payload.is_free_course === 'true' || payload.is_free_course === 1,
        price: toNumber(payload.price),
        sale_price: toNumber(payload.sale_price),
        features: toStringValue(payload.features),
        label: toStringValue(payload.label),
        status: toStringValue(payload.status) || 'active',
      };
      const result = await contentService.updateCourse(requestUserId(request), courseId, input);
      reply.code(200).send({ status: 1, message: 'Course updated', data: result });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  app.post('/admin/course/archive', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const courseId = toStringValue(payload.id);
      await contentService.archiveCourse(requestUserId(request), courseId);
      reply.code(200).send({ status: 1, message: 'Course archived', data: {} });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  // ── Admin Subject CRUD routes ───────────────────────────────────

  app.get('/admin/course/subjects', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const courseId = toStringValue(payload.course_id);
      const subjects = await contentService.listCourseSubjectsAdmin(courseId);
      reply.code(200).send({ status: 1, message: 'success', data: subjects });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  app.get('/admin/course/subjects/all', { preHandler: [requireAuth, requireAdminRole] }, async (_request, reply) => {
    try {
      const subjects = await contentService.listAllSubjects();
      reply.code(200).send({ status: 1, message: 'success', data: subjects });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  app.post('/admin/course/subjects/add', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const input: AdminSubjectInput = {
        course_id: toStringValue(payload.course_id),
        title: toStringValue(payload.title),
        description: toStringValue(payload.description),
        order: payload.order != null ? toNumber(payload.order) : undefined,
      };
      const result = await contentService.addSubjectAdmin(requestUserId(request), input);
      reply.code(200).send({ status: 1, message: 'Subject added', data: result });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  app.post('/admin/course/subjects/edit', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const subjectId = toStringValue(payload.id);
      const input: AdminSubjectInput = {
        course_id: toStringValue(payload.course_id),
        title: toStringValue(payload.title),
        description: toStringValue(payload.description),
        order: payload.order != null ? toNumber(payload.order) : undefined,
      };
      await contentService.editSubjectAdmin(requestUserId(request), subjectId, input);
      reply.code(200).send({ status: 1, message: 'Subject updated', data: {} });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  app.post('/admin/course/subjects/delete', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const subjectId = toStringValue(payload.id);
      await contentService.deleteSubjectAdmin(requestUserId(request), subjectId);
      reply.code(200).send({ status: 1, message: 'Subject deleted', data: {} });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  // ── Admin Lesson CRUD routes ────────────────────────────────────

  app.get('/admin/course/lessons', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const subjectId = toStringValue(payload.subject_id);
      const lessons = await contentService.listLessonsAdmin(subjectId);
      reply.code(200).send({ status: 1, message: 'success', data: lessons });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  app.post('/admin/course/lessons/add', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const input: AdminLessonInput = {
        course_id: toStringValue(payload.course_id),
        subject_id: toStringValue(payload.subject_id),
        title: toStringValue(payload.title),
        summary: toStringValue(payload.summary),
        free: payload.free === true || payload.free === 'true' || payload.free === 'on',
      };
      const result = await contentService.addLessonAdmin(requestUserId(request), input);
      reply.code(200).send({ status: 1, message: 'Lesson added', data: result });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  app.post('/admin/course/lessons/edit', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const lessonId = toStringValue(payload.id);
      const input: AdminLessonInput = {
        course_id: toStringValue(payload.course_id),
        subject_id: toStringValue(payload.subject_id),
        title: toStringValue(payload.title),
        summary: toStringValue(payload.summary),
        free: payload.free === true || payload.free === 'true' || payload.free === 'on',
        order: payload.order != null ? toNumber(payload.order) : undefined,
      };
      await contentService.editLessonAdmin(requestUserId(request), lessonId, input);
      reply.code(200).send({ status: 1, message: 'Lesson updated', data: {} });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  app.post('/admin/course/lessons/delete', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const lessonId = toStringValue(payload.id);
      await contentService.deleteLessonAdmin(requestUserId(request), lessonId);
      reply.code(200).send({ status: 1, message: 'Lesson deleted', data: {} });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  app.post('/admin/course/lessons/reorder', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const lessonIds = Array.isArray(payload.lesson_ids) ? (payload.lesson_ids as string[]) : [];
      await contentService.reorderLessonsAdmin(lessonIds);
      reply.code(200).send({ status: 1, message: 'Lessons reordered', data: {} });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  // ── Admin Lesson File CRUD routes ───────────────────────────────

  app.get('/admin/course/lesson_files', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const lessonId = toStringValue(payload.lesson_id);
      const files = await contentService.listLessonFilesAdmin(lessonId);
      reply.code(200).send({ status: 1, message: 'success', data: files });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  app.post('/admin/course/lesson_files/add', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const input: AdminLessonFileInput = {
        lesson_id: toStringValue(payload.lesson_id),
        title: toStringValue(payload.title),
        summary: toStringValue(payload.summary),
        duration: toStringValue(payload.duration),
        lesson_type: toStringValue(payload.lesson_type),
        video_url: toStringValue(payload.video_url),
        attachment: toStringValue(payload.attachment),
        audio_file: toStringValue(payload.audio_file),
        free: payload.free === true || payload.free === 'true' || payload.free === 'on',
      };
      const result = await contentService.addLessonFileAdmin(requestUserId(request), input);
      reply.code(200).send({ status: 1, message: 'Lesson file added', data: result });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  app.post('/admin/course/lesson_files/edit', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const fileId = toStringValue(payload.id);
      const input: AdminLessonFileInput = {
        lesson_id: toStringValue(payload.lesson_id),
        title: toStringValue(payload.title),
        summary: toStringValue(payload.summary),
        duration: toStringValue(payload.duration),
        lesson_type: toStringValue(payload.lesson_type),
        video_url: toStringValue(payload.video_url),
        attachment: toStringValue(payload.attachment),
        audio_file: toStringValue(payload.audio_file),
        free: payload.free === true || payload.free === 'true' || payload.free === 'on',
      };
      await contentService.editLessonFileAdmin(requestUserId(request), fileId, input);
      reply.code(200).send({ status: 1, message: 'Lesson file updated', data: {} });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  app.post('/admin/course/lesson_files/delete', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const fileId = toStringValue(payload.id);
      await contentService.deleteLessonFileAdmin(requestUserId(request), fileId);
      reply.code(200).send({ status: 1, message: 'Lesson file deleted', data: {} });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });
}
