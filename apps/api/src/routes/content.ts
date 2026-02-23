import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { AuthService } from '../auth/auth-service.js';
import { requireLegacyAuth } from '../auth/middleware.js';
import {
  ContentService,
  type LessonMaterialFilter,
  type SaveMaterialProgressInput,
  type SaveVideoProgressInput,
} from '../content/content-service.js';

interface RegisterContentRoutesOptions {
  authService?: AuthService;
  contentService?: ContentService;
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

function requestUserId(request: FastifyRequest): number {
  return request.authContext?.user.id ?? 0;
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
      const categoryId = toInteger(payload.category_id);

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
      const courseId = toInteger(payload.course_id);

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
      const courseId = toInteger(payload.course_id);

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
      const subjectId = toInteger(payload.subject_id);
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
      const subjectId = toInteger(payload.subject_id);
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
      const lessonId = toInteger(payload.lesson_id);
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
      const lessonId = toInteger(payload.lesson_id);
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
        lessonId: toInteger(payload.lesson_id),
        subjectId: toInteger(payload.subject_id),
        courseId: toInteger(payload.course_id),
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
        courseId: toInteger(payload.course_id),
        lessonFileId: toInteger(payload.lesson_file_id),
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
        courseId: toInteger(payload.course_id),
        lessonFileId: toInteger(payload.lesson_file_id),
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
}
