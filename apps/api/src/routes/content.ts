import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { AuthService } from '../auth/auth-service.js';
import { extractAuthToken, requireLegacyAuth, requireLegacyRoles } from '../auth/middleware.js';
import { buildLegacyUserData } from '../auth/legacy-user-data.js';
import { getPrismaClient } from '../data/prisma-client.js';
import { ADMIN_PORTAL_ROLES } from '../auth/roles.js';
import { ProgramService, type ProgramInput } from '../content/program-service.js';
import { OfferingService, type OfferingInput } from '../content/offering-service.js';
import { ContentAssetService, type ContentAssetInput, type QuizQuestionInput } from '../content/content-asset-service.js';
import { CertificateService, type CompletionPolicyInput, type CertificateTemplateInput, type IssueCertificateInput } from '../content/certificate-service.js';
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

import type { StorageProvider } from '../integrations/contracts.js';

interface RegisterContentRoutesOptions {
  authService?: AuthService;
  contentService?: ContentService;
  storage?: StorageProvider;
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
  const id = request.authContext?.user.id;
  return id !== undefined && id !== null ? String(id) : '';
}

function sendContentError(reply: FastifyReply, error: unknown): void {
  const message = error instanceof Error ? error.message : 'Internal content error.';

  reply.code(500).send({
    status: 0,
    message,
    data: {},
  });
}

function toOptionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function toOptionalBool(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const v = value.toLowerCase();
    return v === 'true' || v === '1' || v === 'yes';
  }
  return undefined;
}

function parseQuizQuestions(value: unknown): QuizQuestionInput[] | undefined {
  let arr: unknown = value;
  if (typeof arr === 'string') {
    const trimmed = arr.trim();
    if (!trimmed) return undefined;
    try {
      arr = JSON.parse(trimmed) as unknown;
    } catch {
      return undefined;
    }
  }
  if (!Array.isArray(arr)) return undefined;
  return arr
    .filter((q): q is Record<string, unknown> => typeof q === 'object' && q !== null)
    .map((q) => ({
      ...(typeof q.id === 'string' || typeof q.id === 'number' ? { id: String(q.id) } : {}),
      question: toStringValue(q.question),
      option_a: toStringValue(q.option_a) || undefined,
      option_b: toStringValue(q.option_b) || undefined,
      option_c: toStringValue(q.option_c) || undefined,
      option_d: toStringValue(q.option_d) || undefined,
      correct_answer: toStringValue(q.correct_answer) || 'A',
      ...(q.sort_order !== undefined && q.sort_order !== null ? { sort_order: Number(q.sort_order) } : {}),
    }))
    .filter((q) => q.question);
}

function buildContentAssetInput(payload: Record<string, unknown>): ContentAssetInput {
  return {
    title: toStringValue(payload.title),
    summary: toStringValue(payload.summary) || undefined,
    asset_type: toStringValue(payload.asset_type) || 'video',
    subject_tag: toStringValue(payload.subject_tag) || undefined,
    lesson_tag: toStringValue(payload.lesson_tag) || undefined,
    lesson_id: toOptionalNumber(payload.lesson_id) ?? null,
    language: toStringValue(payload.language) || undefined,
    duration: toStringValue(payload.duration) || undefined,
    provider: toStringValue(payload.provider) || undefined,
    video_url: toStringValue(payload.video_url) || undefined,
    download_url: toStringValue(payload.download_url) || undefined,
    attachment: toStringValue(payload.attachment) || undefined,
    audio_file: toStringValue(payload.audio_file) || undefined,
    thumbnail: toStringValue(payload.thumbnail) || undefined,
    tags: toStringValue(payload.tags) || undefined,
    time_limit_seconds: toOptionalNumber(payload.time_limit_seconds),
    attempts_allowed: toOptionalNumber(payload.attempts_allowed),
    pass_marks: toOptionalNumber(payload.pass_marks),
    shuffle_questions: toOptionalBool(payload.shuffle_questions),
    questions: parseQuizQuestions(payload.questions),
  };
}

function buildOfferingInput(payload: Record<string, unknown>): OfferingInput {
  return {
    course_id: toStringValue(payload.course_id),
    program_id: toStringValue(payload.program_id) || undefined,
    centre_id: toStringValue(payload.centre_id) || undefined,
    title: toStringValue(payload.title) || undefined,
    offering_code: toStringValue(payload.offering_code) || undefined,
    delivery_mode: toStringValue(payload.delivery_mode) || undefined,
    academic_year: toStringValue(payload.academic_year) || undefined,
    start_date: toStringValue(payload.start_date) || undefined,
    end_date: toStringValue(payload.end_date) || undefined,
    enrollment_start: toStringValue(payload.enrollment_start) || undefined,
    enrollment_end: toStringValue(payload.enrollment_end) || undefined,
    max_enrollment: toOptionalNumber(payload.max_enrollment),
    pricing_amount: toOptionalNumber(payload.pricing_amount),
    language_id: toStringValue(payload.language_id) || undefined,
    status: toStringValue(payload.status) || undefined,
    fee_category: toStringValue(payload.fee_category) || undefined,
    base_fee: toOptionalNumber(payload.base_fee),
    discount: toOptionalNumber(payload.discount),
    offered_fee: toOptionalNumber(payload.offered_fee),
    course_expiry_days: toOptionalNumber(payload.course_expiry_days),
    content_release_strategy: toStringValue(payload.content_release_strategy) || undefined,
    completion_policy_id: toStringValue(payload.completion_policy_id) || undefined,
    certificate_template_id: toStringValue(payload.certificate_template_id) || undefined,
    publish_type: toStringValue(payload.publish_type) || undefined,
  };
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
      const roleId = request.authContext?.user.role_id ?? null;
      const enrolledOnly = roleId === 2;
      const courses = await contentService.listCourses(requestUserId(request), { enrolledOnly });
      reply.code(200).send({
        status: 1,
        message: 'success',
        data: courses,
      });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  // Naji UAT 2026-05-18 / Ansaba UAT 2026-05-26 — Mobile app expects
  // /course/my_course in the legacy PHP shape:
  //   { status: 1, message, data: { userdata: {...}, course: {
  //       ongoing_course: [...], completed_course: [...] } } }
  // Flutter reads `data['userdata']['user_image']` and
  // `data['course']['ongoing_course']`, so the previous flat-array
  // response crashed with "String not subtype of int of index" because
  // it tried to index a List with a String key.
  app.get('/course/my_course', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const userId = requestUserId(request);
      const prisma = getPrismaClient();

      const userIdInt = Number.parseInt(userId, 10);
      const userRow = Number.isFinite(userIdInt)
        ? await prisma.users.findFirst({
            where: { id: userIdInt, deleted_at: null },
            select: {
              id: true, student_id: true, name: true, role_id: true,
              course_id: true, email: true, user_email: true, phone: true,
              device_id: true, status: true, academic_year: true, image: true,
              profile_picture: true, dob: true,
            },
          })
        : null;

      const userData = buildLegacyUserData(userRow as Record<string, unknown> | null, extractAuthToken(request) ?? '');

      // Pull enrolments so we can split courses into ongoing vs
      // completed by enrollment_status (legacy: NULL/Active/On Hold
      // count as ongoing; Completed/Graduated count as completed).
      const enrolments = Number.isFinite(userIdInt)
        ? await prisma.enrol.findMany({
            where: { user_id: userIdInt, deleted_at: null },
            select: { course_id: true, enrollment_status: true },
          })
        : [];
      const ongoingCourseIds = new Set<number>();
      const completedCourseIds = new Set<number>();
      for (const e of enrolments) {
        if (e.course_id == null) continue;
        const s = String(e.enrollment_status ?? '').trim().toLowerCase();
        if (s === 'completed' || s === 'graduated') completedCourseIds.add(e.course_id);
        else ongoingCourseIds.add(e.course_id);
      }

      const allEnrolledIds = new Set<number>([...ongoingCourseIds, ...completedCourseIds]);
      const allCourses = allEnrolledIds.size > 0
        ? await contentService.listCourses(userId, { enrolledOnly: true })
        : [];

      const courseIdOf = (c: Record<string, unknown>): number => {
        const raw = c.id;
        if (typeof raw === 'number') return raw;
        if (typeof raw === 'string') return Number.parseInt(raw, 10);
        return Number.NaN;
      };
      const ongoing = allCourses.filter((c) => {
        const id = courseIdOf(c);
        return Number.isFinite(id) && ongoingCourseIds.has(id);
      });
      const completed = allCourses.filter((c) => {
        const id = courseIdOf(c);
        return Number.isFinite(id) && completedCourseIds.has(id);
      });

      reply.code(200).send({
        status: 1,
        message: 'success',
        data: {
          userdata: userData,
          course: {
            ongoing_course: ongoing,
            completed_course: completed,
          },
        },
      });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  // Catalog view for students: returns ALL active courses with the
  // is_enrolled flag set, so the student "My Courses" page can split
  // them into Enrolled and All Other sections.
  app.get('/course/catalog', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const courses = await contentService.listCourses(requestUserId(request), { enrolledOnly: false });
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
      // Match the legacy PHP user_data block (15 keys incl. auth_token / dob /
      // academic_year / privacy_policy) — the same buildLegacyUserData block
      // my_course uses — instead of the trimmed inline block the service builds.
      if (courseDetails && typeof courseDetails === 'object' && !Array.isArray(courseDetails)) {
        const prisma = getPrismaClient();
        const userIdInt = Number.parseInt(requestUserId(request), 10);
        const userRow = Number.isFinite(userIdInt)
          ? await prisma.users.findFirst({
              where: { id: userIdInt, deleted_at: null },
              select: {
                id: true, student_id: true, name: true, role_id: true,
                course_id: true, email: true, user_email: true, phone: true,
                device_id: true, status: true, academic_year: true, image: true,
                profile_picture: true, dob: true,
              },
            })
          : null;
        courseDetails.user_data = buildLegacyUserData(
          userRow as Record<string, unknown> | null,
          extractAuthToken(request) ?? '',
        );
      }
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

  // Lesson-wise courses (structure_type=2): lessons attach directly to the
  // course with no subject layer (Naji 2026-06-23). The student client calls
  // this instead of get_subjects→get_lessons when course.structure_type===2.
  app.get('/course/get_lessons_direct', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const courseId = toStringValue(payload.course_id);
      const lessons = await contentService.getLessonsForCourse(requestUserId(request), courseId);
      reply.code(200).send({ status: 1, message: 'success', data: lessons });
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

  // Last lesson file the student watched (for the dashboard Resume button). An
  // optional course_id scopes it to one course; omit for the global last-watched.
  app.get('/student/last-watched-lesson', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const courseId = toStringValue(payload.course_id);
      const data = await contentService.getLastWatchedLessonFile(
        requestUserId(request),
        courseId || undefined,
      );
      reply.code(200).send({ status: 1, message: 'success', data });
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
        data: [],
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
        course_code: toStringValue(payload.course_code),
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
        visibility: toStringValue(payload.visibility) || 'public',
        level: toStringValue(payload.level),
        version: toStringValue(payload.version),
        total_learning_hours: toNumber(payload.total_learning_hours),
        outcomes: toStringValue(payload.outcomes),
        requirements: toStringValue(payload.requirements),
        language: toStringValue(payload.language),
        tags: Array.isArray(payload.tags) ? payload.tags.map((t) => toStringValue(t)).filter((t) => t !== '') : [],
        structure_type: toNumber(payload.structure_type) === 2 ? 2 : 1,
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
        course_code: toStringValue(payload.course_code),
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
        visibility: toStringValue(payload.visibility) || 'public',
        level: toStringValue(payload.level),
        version: toStringValue(payload.version),
        total_learning_hours: toNumber(payload.total_learning_hours),
        outcomes: toStringValue(payload.outcomes),
        requirements: toStringValue(payload.requirements),
        language: toStringValue(payload.language),
        tags: Array.isArray(payload.tags) ? payload.tags.map((t) => toStringValue(t)).filter((t) => t !== '') : [],
        structure_type: toNumber(payload.structure_type) === 2 ? 2 : 1,
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

  // ─── Document Types (settings) + per-course required docs ──────────────
  app.get('/admin/settings/document-types', { preHandler: [requireAuth, requireAdminRole] }, async (_request, reply) => {
    try {
      const data = await contentService.listDocumentTypes();
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) { sendContentError(reply, error); }
  });

  app.post('/admin/settings/document-types', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const result = await contentService.createDocumentType(requestUserId(request), toStringValue(payload.label));
      reply.code(200).send(result);
    } catch (error: unknown) { sendContentError(reply, error); }
  });

  app.post('/admin/settings/document-types/:id/update', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const id = toStringValue((request.params as { id?: string }).id);
      const payload = requestPayload(request);
      const result = await contentService.updateDocumentType(requestUserId(request), id, toStringValue(payload.label));
      reply.code(200).send(result);
    } catch (error: unknown) { sendContentError(reply, error); }
  });

  app.post('/admin/settings/document-types/:id/delete', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const id = toStringValue((request.params as { id?: string }).id);
      const result = await contentService.deleteDocumentType(requestUserId(request), id);
      reply.code(200).send(result);
    } catch (error: unknown) { sendContentError(reply, error); }
  });

  app.get('/admin/courses/:id/required-documents', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const id = toStringValue((request.params as { id?: string }).id);
      const data = await contentService.listCourseRequiredDocuments(id);
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) { sendContentError(reply, error); }
  });

  app.post('/admin/courses/:id/required-documents', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const id = toStringValue((request.params as { id?: string }).id);
      const payload = requestPayload(request);
      const ids = Array.isArray(payload.document_type_ids)
        ? (payload.document_type_ids as unknown[]).map((v) => toStringValue(v))
        : [];
      const result = await contentService.setCourseRequiredDocuments(requestUserId(request), id, ids);
      reply.code(200).send(result);
    } catch (error: unknown) { sendContentError(reply, error); }
  });

  app.post('/admin/course/subjects/add', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const input: AdminSubjectInput = {
        course_id: toStringValue(payload.course_id),
        title: toStringValue(payload.title),
        description: toStringValue(payload.description),
        order: payload.order != null ? toNumber(payload.order) : undefined,
        subject_code: toStringValue(payload.subject_code),
        short_name: toStringValue(payload.short_name),
        subject_type: toStringValue(payload.subject_type),
        duration_hours: toNumber(payload.duration_hours),
        version: toStringValue(payload.version),
        learning_outcomes: toStringValue(payload.learning_outcomes),
        skills_covered: toStringValue(payload.skills_covered),
        assignment_max_marks: toNumber(payload.assignment_max_marks),
        assignment_pass_marks: toNumber(payload.assignment_pass_marks),
        examination_max_marks: toNumber(payload.examination_max_marks),
        examination_pass_marks: toNumber(payload.examination_pass_marks),
        project_max_marks: toNumber(payload.project_max_marks),
        project_pass_marks: toNumber(payload.project_pass_marks),
        viva_max_marks: toNumber(payload.viva_max_marks),
        viva_pass_marks: toNumber(payload.viva_pass_marks),
        status: toStringValue(payload.status) || 'draft',
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
        subject_code: toStringValue(payload.subject_code),
        short_name: toStringValue(payload.short_name),
        subject_type: toStringValue(payload.subject_type),
        duration_hours: toNumber(payload.duration_hours),
        version: toStringValue(payload.version),
        learning_outcomes: toStringValue(payload.learning_outcomes),
        skills_covered: toStringValue(payload.skills_covered),
        assignment_max_marks: toNumber(payload.assignment_max_marks),
        assignment_pass_marks: toNumber(payload.assignment_pass_marks),
        examination_max_marks: toNumber(payload.examination_max_marks),
        examination_pass_marks: toNumber(payload.examination_pass_marks),
        project_max_marks: toNumber(payload.project_max_marks),
        project_pass_marks: toNumber(payload.project_pass_marks),
        viva_max_marks: toNumber(payload.viva_max_marks),
        viva_pass_marks: toNumber(payload.viva_pass_marks),
        status: toStringValue(payload.status),
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
      const courseId = payload.course_id ? toStringValue(payload.course_id) : undefined;
      await contentService.deleteSubjectAdmin(requestUserId(request), subjectId, courseId);
      reply.code(200).send({ status: 1, message: 'Subject deleted', data: {} });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  // Link existing subject to course (M:N reuse)
  app.post('/admin/course/subjects/link', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const courseId = toStringValue(payload.course_id);
      const subjectId = toStringValue(payload.subject_id);
      const result = await contentService.linkSubjectToCourse(requestUserId(request), courseId, subjectId);
      reply.code(200).send({ status: 1, message: 'Subject linked to course', data: result });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  // Unlink subject from course (does not delete subject)
  app.post('/admin/course/subjects/unlink', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const courseId = toStringValue(payload.course_id);
      const subjectId = toStringValue(payload.subject_id);
      await contentService.unlinkSubjectFromCourse(requestUserId(request), courseId, subjectId);
      reply.code(200).send({ status: 1, message: 'Subject unlinked from course', data: {} });
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

  // Lesson-wise courses: lessons attached directly to the course (no subject).
  app.get('/admin/course/lessons_by_course', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const courseId = toStringValue(payload.course_id);
      const lessons = await contentService.listLessonsByCourse(courseId);
      reply.code(200).send({ status: 1, message: 'success', data: lessons });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  app.get('/admin/course/lessons/all', { preHandler: [requireAuth, requireAdminRole] }, async (_request, reply) => {
    try {
      const lessons = await contentService.listAllLessonsAdmin();
      reply.code(200).send({ status: 1, message: 'success', data: lessons });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  app.post('/admin/course/lessons/add', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const input: AdminLessonInput = {
        course_id: payload.course_id ? toStringValue(payload.course_id) : undefined,
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
        course_id: payload.course_id ? toStringValue(payload.course_id) : undefined,
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

  app.post('/admin/course/subjects/reorder', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const courseId = toStringValue(payload.course_id);
      const subjectIds = Array.isArray(payload.subject_ids)
        ? payload.subject_ids.map(toStringValue).filter((s): s is string => !!s)
        : [];
      if (!courseId || subjectIds.length === 0) {
        reply.code(200).send({ status: 0, message: 'course_id + subject_ids required', data: {} });
        return;
      }
      await contentService.reorderCourseSubjectsAdmin(courseId, subjectIds);
      reply.code(200).send({ status: 1, message: 'Subjects reordered', data: {} });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  app.post('/admin/course/lesson_files/reorder', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const lessonId = toStringValue(payload.lesson_id);
      const fileIds = Array.isArray(payload.file_ids)
        ? payload.file_ids.map(toStringValue).filter((s): s is string => !!s)
        : [];
      if (!lessonId || fileIds.length === 0) {
        reply.code(200).send({ status: 0, message: 'lesson_id + file_ids required', data: {} });
        return;
      }
      await contentService.reorderLessonFilesAdmin(lessonId, fileIds);
      reply.code(200).send({ status: 1, message: 'Files reordered', data: {} });
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
        thumbnail: toStringValue(payload.thumbnail),
        language: toStringValue(payload.language),
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
        thumbnail: toStringValue(payload.thumbnail),
        language: toStringValue(payload.language),
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

  // List quiz questions stored against a lesson_file (lesson_type='quiz').
  app.get('/admin/course/lesson_files/quiz_questions', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const fileId = toStringValue(payload.id || payload.lesson_file_id);
      const questions = await contentService.listLessonQuizQuestions(fileId);
      reply.code(200).send({ status: 1, message: 'success', data: questions });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  // Replace all quiz questions for a lesson_file. Body: { id, questions: [{question, option_a..d, correct_answer}] }
  app.post('/admin/course/lesson_files/quiz_questions/replace', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const fileId = toStringValue(payload.id || payload.lesson_file_id);
      const rawQuestions = Array.isArray(payload.questions) ? payload.questions : [];
      const questions = rawQuestions
        .map((raw: unknown) => {
          const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
          const question = toStringValue(r.question).trim();
          if (!question) return null;
          return {
            question,
            option_a: toStringValue(r.option_a),
            option_b: toStringValue(r.option_b),
            option_c: toStringValue(r.option_c),
            option_d: toStringValue(r.option_d),
            correct_answer: toStringValue(r.correct_answer || 'A'),
          };
        })
        .filter((q): q is NonNullable<typeof q> => q !== null);
      await contentService.replaceLessonQuizQuestions(requestUserId(request), fileId, questions);
      reply.code(200).send({ status: 1, message: 'Saved', data: { count: questions.length } });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  // ── Admin Program CRUD routes ─────────────────────────────────────

  const programService = new ProgramService();

  app.get('/admin/programs', { preHandler: [requireAuth, requireAdminRole] }, async (_request, reply) => {
    try {
      const programs = await programService.listPrograms();
      reply.code(200).send({ status: 1, message: 'success', data: programs });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  app.get('/admin/programs/get', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const programId = toStringValue(payload.id);
      const program = await programService.getProgram(programId);
      reply.code(200).send({ status: 1, message: 'success', data: program });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  app.post('/admin/programs/add', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const input: ProgramInput = {
        title: toStringValue(payload.title),
        code: toStringValue(payload.code) || undefined,
        level: toStringValue(payload.level) || undefined,
        duration: toStringValue(payload.duration) || undefined,
        description: toStringValue(payload.description) || undefined,
        status: toStringValue(payload.status) || undefined,
      };
      const result = await programService.createProgram(requestUserId(request), input);
      reply.code(200).send({ status: 1, message: 'Program created', data: result });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  app.post('/admin/programs/edit', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const programId = toStringValue(payload.id);
      const input: ProgramInput = {
        title: toStringValue(payload.title),
        code: toStringValue(payload.code) || undefined,
        level: toStringValue(payload.level) || undefined,
        duration: toStringValue(payload.duration) || undefined,
        description: toStringValue(payload.description) || undefined,
        status: toStringValue(payload.status) || undefined,
      };
      await programService.updateProgram(requestUserId(request), programId, input);
      reply.code(200).send({ status: 1, message: 'Program updated', data: {} });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  app.post('/admin/programs/delete', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const programId = toStringValue(payload.id);
      await programService.deleteProgram(requestUserId(request), programId);
      reply.code(200).send({ status: 1, message: 'Program deleted', data: {} });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  // ── Program ↔ Course mapping routes ──────────────────────────────

  app.get('/admin/programs/courses', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const programId = toStringValue(payload.program_id);
      const courses = await programService.listProgramCourses(programId);
      reply.code(200).send({ status: 1, message: 'success', data: courses });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  app.post('/admin/programs/courses/add', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const programId = toStringValue(payload.program_id);
      const courseId = toStringValue(payload.course_id);
      const result = await programService.addCourseToProgram(requestUserId(request), programId, courseId);
      reply.code(200).send({ status: 1, message: 'Course added to program', data: result });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  app.post('/admin/programs/courses/remove', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const programId = toStringValue(payload.program_id);
      const courseId = toStringValue(payload.course_id);
      await programService.removeCourseFromProgram(programId, courseId);
      reply.code(200).send({ status: 1, message: 'Course removed from program', data: {} });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  // ── Admin Course Offering CRUD routes ─────────────────────────────

  const offeringService = new OfferingService();

  app.get('/admin/offerings', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const courseId = toStringValue(payload.course_id) || undefined;
      const centreId = toStringValue(payload.centre_id) || undefined;
      const programId = toStringValue(payload.program_id) || undefined;
      const statusFilter = toStringValue(payload.status) || undefined;
      const offerings = await offeringService.listOfferings({
        ...(courseId ? { courseId } : {}),
        ...(centreId ? { centreId } : {}),
        ...(programId ? { programId } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      });
      reply.code(200).send({ status: 1, message: 'success', data: offerings });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  app.get('/admin/offerings/get', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const offeringId = toStringValue(payload.id);
      const offering = await offeringService.getOffering(offeringId);
      reply.code(200).send({ status: 1, message: 'success', data: offering });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  app.post('/admin/offerings/add', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const input: OfferingInput = buildOfferingInput(payload);
      const result = await offeringService.createOffering(requestUserId(request), input);
      reply.code(200).send({ status: 1, message: 'Offering created', data: result });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  app.post('/admin/offerings/edit', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const offeringId = toStringValue(payload.id);
      const input: OfferingInput = buildOfferingInput(payload);
      await offeringService.updateOffering(requestUserId(request), offeringId, input);
      reply.code(200).send({ status: 1, message: 'Offering updated', data: {} });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  app.post('/admin/offerings/delete', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const offeringId = toStringValue(payload.id);
      await offeringService.deleteOffering(requestUserId(request), offeringId);
      reply.code(200).send({ status: 1, message: 'Offering deleted', data: {} });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  // ── Course Fee Structure (read-only, for the Fee Management section) ──
  app.get('/admin/fee_management/course_fee_structure', { preHandler: [requireAuth, requireAdminRole] }, async (_request, reply) => {
    try {
      const data = await offeringService.listCourseFeeStructure();
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  // ── Certificate Packages on an Offering ──────────────────────────
  app.get('/admin/offerings/:id/packages', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const params = request.params as { id?: string };
      const data = await offeringService.listOfferingPackages(toStringValue(params.id));
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  app.post('/admin/offerings/:id/packages/add', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const params = request.params as { id?: string };
      const p = requestPayload(request);
      const data = await offeringService.addOfferingPackage(requestUserId(request), toStringValue(params.id), {
        combination_id: toStringValue(p.combination_id),
        fee_category: toStringValue(p.fee_category) || undefined,
        base_fee: typeof p.base_fee === 'number' ? p.base_fee : (p.base_fee ? Number(p.base_fee) : undefined),
        discount: typeof p.discount === 'number' ? p.discount : (p.discount ? Number(p.discount) : undefined),
        offered_fee: typeof p.offered_fee === 'number' ? p.offered_fee : (p.offered_fee ? Number(p.offered_fee) : undefined),
        registration_fee: typeof p.registration_fee === 'number' ? p.registration_fee : (p.registration_fee ? Number(p.registration_fee) : undefined),
        gst_percent: typeof p.gst_percent === 'number' ? p.gst_percent : (p.gst_percent ? Number(p.gst_percent) : undefined),
        associated_point: typeof p.associated_point === 'number' ? p.associated_point : (p.associated_point ? Number(p.associated_point) : undefined),
        position: typeof p.position === 'number' ? p.position : 0,
      });
      reply.code(200).send({ status: 1, message: 'Package added.', data });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  app.post('/admin/offering_packages/:id/update', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const params = request.params as { id?: string };
      const p = requestPayload(request);
      await offeringService.updateOfferingPackage(requestUserId(request), toStringValue(params.id), {
        fee_category: toStringValue(p.fee_category) || undefined,
        base_fee: typeof p.base_fee === 'number' ? p.base_fee : (p.base_fee ? Number(p.base_fee) : undefined),
        discount: typeof p.discount === 'number' ? p.discount : (p.discount ? Number(p.discount) : undefined),
        offered_fee: typeof p.offered_fee === 'number' ? p.offered_fee : (p.offered_fee ? Number(p.offered_fee) : undefined),
        registration_fee: typeof p.registration_fee === 'number' ? p.registration_fee : (p.registration_fee ? Number(p.registration_fee) : undefined),
        gst_percent: typeof p.gst_percent === 'number' ? p.gst_percent : (p.gst_percent ? Number(p.gst_percent) : undefined),
        associated_point: typeof p.associated_point === 'number' ? p.associated_point : (p.associated_point ? Number(p.associated_point) : undefined),
        position: typeof p.position === 'number' ? p.position : 0,
      });
      reply.code(200).send({ status: 1, message: 'Package updated.', data: {} });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  app.post('/admin/offering_packages/:id/delete', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const params = request.params as { id?: string };
      await offeringService.deleteOfferingPackage(requestUserId(request), toStringValue(params.id));
      reply.code(200).send({ status: 1, message: 'Package deleted.', data: {} });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  // ── Admin Content Asset Library routes ────────────────────────────

  const contentAssetService = new ContentAssetService();

  app.get('/admin/content-assets', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const assetType = toStringValue(payload.asset_type) || undefined;
      const search = toStringValue(payload.search) || undefined;
      const subjectTag = toStringValue(payload.subject_tag) || undefined;
      const lessonTag = toStringValue(payload.lesson_tag) || undefined;
      const language = toStringValue(payload.language) || undefined;
      const assets = await contentAssetService.listAssets({
        ...(assetType ? { assetType } : {}),
        ...(search ? { search } : {}),
        ...(subjectTag ? { subjectTag } : {}),
        ...(lessonTag ? { lessonTag } : {}),
        ...(language ? { language } : {}),
      });
      reply.code(200).send({ status: 1, message: 'success', data: assets });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  app.get('/admin/content-assets/get', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const asset = await contentAssetService.getAsset(toStringValue(payload.id));
      reply.code(200).send({ status: 1, message: 'success', data: asset });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  app.post('/admin/content-assets/add', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const input: ContentAssetInput = buildContentAssetInput(payload);
      const result = await contentAssetService.createAsset(requestUserId(request), input);
      reply.code(200).send({ status: 1, message: 'Asset created', data: result });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  app.post('/admin/content-assets/edit', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const assetId = toStringValue(payload.id);
      const input: ContentAssetInput = buildContentAssetInput(payload);
      await contentAssetService.updateAsset(requestUserId(request), assetId, input);
      reply.code(200).send({ status: 1, message: 'Asset updated', data: {} });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  app.post('/admin/content-assets/delete', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      await contentAssetService.deleteAsset(requestUserId(request), toStringValue(payload.id));
      reply.code(200).send({ status: 1, message: 'Asset deleted', data: {} });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  // Lesson ↔ Asset linking
  app.get('/admin/content-assets/lesson', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const assets = await contentAssetService.listLessonAssets(toStringValue(payload.lesson_id));
      reply.code(200).send({ status: 1, message: 'success', data: assets });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  app.post('/admin/content-assets/lesson/link', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const result = await contentAssetService.linkAssetToLesson(
        requestUserId(request),
        toStringValue(payload.lesson_id),
        toStringValue(payload.asset_id),
      );
      reply.code(200).send({ status: 1, message: 'Asset linked to lesson', data: result });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  app.post('/admin/content-assets/lesson/unlink', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      await contentAssetService.unlinkAssetFromLesson(
        toStringValue(payload.lesson_id),
        toStringValue(payload.asset_id),
      );
      reply.code(200).send({ status: 1, message: 'Asset unlinked from lesson', data: {} });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  // Persist drag-to-sort order of content within a lesson.
  app.post('/admin/content-assets/lesson/reorder', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const assetIds = Array.isArray(payload.asset_ids) ? (payload.asset_ids as string[]) : [];
      await contentAssetService.reorderLessonAssets(toStringValue(payload.lesson_id), assetIds);
      reply.code(200).send({ status: 1, message: 'Content reordered', data: {} });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  // Subject Detail page — subject + its lessons + each lesson's linked content.
  app.get('/admin/subjects/content-tree', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const tree = await contentAssetService.getSubjectContentTree(toStringValue(payload.subject_id));
      reply.code(200).send({ status: 1, message: 'success', data: tree });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });

  // ── Admin Completion Policies & Certificates routes ───────────────

  const certificateService = new CertificateService();

  // Completion Policies
  app.get('/admin/completion-policies', { preHandler: [requireAuth, requireAdminRole] }, async (_request, reply) => {
    try {
      const policies = await certificateService.listPolicies();
      reply.code(200).send({ status: 1, message: 'success', data: policies });
    } catch (error: unknown) { sendContentError(reply, error); }
  });

  app.post('/admin/completion-policies/add', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const p = requestPayload(request);
      const input: CompletionPolicyInput = {
        title: toStringValue(p.title),
        course_id: toStringValue(p.course_id) || undefined,
        offering_id: toStringValue(p.offering_id) || undefined,
        min_progress_pct: p.min_progress_pct ? Number(p.min_progress_pct) : undefined,
        min_exam_score_pct: p.min_exam_score_pct ? Number(p.min_exam_score_pct) : undefined,
        require_all_assignments: p.require_all_assignments ? Number(p.require_all_assignments) : undefined,
        require_all_exams: p.require_all_exams ? Number(p.require_all_exams) : undefined,
        min_attendance_pct: p.min_attendance_pct ? Number(p.min_attendance_pct) : undefined,
        require_manual_approval: p.require_manual_approval ? Number(p.require_manual_approval) : undefined,
      };
      const result = await certificateService.createPolicy(requestUserId(request), input);
      reply.code(200).send({ status: 1, message: 'Policy created', data: result });
    } catch (error: unknown) { sendContentError(reply, error); }
  });

  app.post('/admin/completion-policies/edit', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const p = requestPayload(request);
      const policyId = toStringValue(p.id);
      const input: CompletionPolicyInput = {
        title: toStringValue(p.title),
        course_id: toStringValue(p.course_id) || undefined,
        offering_id: toStringValue(p.offering_id) || undefined,
        min_progress_pct: p.min_progress_pct ? Number(p.min_progress_pct) : undefined,
        min_exam_score_pct: p.min_exam_score_pct ? Number(p.min_exam_score_pct) : undefined,
        require_all_assignments: p.require_all_assignments ? Number(p.require_all_assignments) : undefined,
        require_all_exams: p.require_all_exams ? Number(p.require_all_exams) : undefined,
        min_attendance_pct: p.min_attendance_pct ? Number(p.min_attendance_pct) : undefined,
        require_manual_approval: p.require_manual_approval ? Number(p.require_manual_approval) : undefined,
      };
      await certificateService.updatePolicy(requestUserId(request), policyId, input);
      reply.code(200).send({ status: 1, message: 'Policy updated', data: {} });
    } catch (error: unknown) { sendContentError(reply, error); }
  });

  app.post('/admin/completion-policies/delete', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const p = requestPayload(request);
      await certificateService.deletePolicy(requestUserId(request), toStringValue(p.id));
      reply.code(200).send({ status: 1, message: 'Policy deleted', data: {} });
    } catch (error: unknown) { sendContentError(reply, error); }
  });

  // Certificate Templates
  app.get('/admin/certificate-templates', { preHandler: [requireAuth, requireAdminRole] }, async (_request, reply) => {
    try {
      const templates = await certificateService.listTemplates();
      reply.code(200).send({ status: 1, message: 'success', data: templates });
    } catch (error: unknown) { sendContentError(reply, error); }
  });

  app.post('/admin/certificate-templates/add', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const p = requestPayload(request);
      const input: CertificateTemplateInput = {
        title: toStringValue(p.title),
        description: toStringValue(p.description) || undefined,
        template: toStringValue(p.template) || undefined,
        signatory: toStringValue(p.signatory) || undefined,
        course_id: toStringValue(p.course_id) || undefined,
        program_id: toStringValue(p.program_id) || undefined,
      };
      const result = await certificateService.createTemplate(requestUserId(request), input);
      reply.code(200).send({ status: 1, message: 'Template created', data: result });
    } catch (error: unknown) { sendContentError(reply, error); }
  });

  app.post('/admin/certificate-templates/edit', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const p = requestPayload(request);
      const input: CertificateTemplateInput = {
        title: toStringValue(p.title),
        description: toStringValue(p.description) || undefined,
        template: toStringValue(p.template) || undefined,
        signatory: toStringValue(p.signatory) || undefined,
        course_id: toStringValue(p.course_id) || undefined,
        program_id: toStringValue(p.program_id) || undefined,
      };
      await certificateService.updateTemplate(requestUserId(request), toStringValue(p.id), input);
      reply.code(200).send({ status: 1, message: 'Template updated', data: {} });
    } catch (error: unknown) { sendContentError(reply, error); }
  });

  app.post('/admin/certificate-templates/delete', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const p = requestPayload(request);
      await certificateService.deleteTemplate(requestUserId(request), toStringValue(p.id));
      reply.code(200).send({ status: 1, message: 'Template deleted', data: {} });
    } catch (error: unknown) { sendContentError(reply, error); }
  });

  // Certificates (Issued)
  app.get('/admin/certificates', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const p = requestPayload(request);
      const userId = toStringValue(p.user_id) || undefined;
      const courseId = toStringValue(p.course_id) || undefined;
      const certs = await certificateService.listCertificates({
        ...(userId ? { userId } : {}),
        ...(courseId ? { courseId } : {}),
      });
      reply.code(200).send({ status: 1, message: 'success', data: certs });
    } catch (error: unknown) { sendContentError(reply, error); }
  });

  app.post('/admin/certificates/issue', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const p = requestPayload(request);
      const input: IssueCertificateInput = {
        user_id: toStringValue(p.user_id),
        offering_id: toStringValue(p.offering_id) || undefined,
        course_id: toStringValue(p.course_id) || undefined,
        program_id: toStringValue(p.program_id) || undefined,
        template_id: toStringValue(p.template_id) || undefined,
        policy_id: toStringValue(p.policy_id) || undefined,
        result_snapshot: toStringValue(p.result_snapshot) || undefined,
      };
      const result = await certificateService.issueCertificate(requestUserId(request), input);
      reply.code(200).send({ status: 1, message: 'Certificate issued', data: result });
    } catch (error: unknown) { sendContentError(reply, error); }
  });

  app.post('/admin/certificates/revoke', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    try {
      const p = requestPayload(request);
      await certificateService.revokeCertificate(requestUserId(request), toStringValue(p.id));
      reply.code(200).send({ status: 1, message: 'Certificate revoked', data: {} });
    } catch (error: unknown) { sendContentError(reply, error); }
  });

  // ── File Upload ───────────────────────────────────────────────────

  app.post('/admin/upload', { preHandler: [requireAuth, requireAdminRole] }, async (request, reply) => {
    const storage = options.storage;
    if (!storage) {
      return reply.code(500).send({ status: 0, message: 'Storage not configured' });
    }
    try {
      const file = await request.file();
      if (!file) {
        return reply.code(400).send({ status: 0, message: 'No file provided' });
      }
      const ext = file.filename.split('.').pop() ?? 'bin';
      const key = `public/uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const chunks: Buffer[] = [];
      for await (const chunk of file.file) {
        chunks.push(Buffer.from(chunk as Uint8Array));
      }
      const body = Buffer.concat(chunks);
      // Admin uploads here are brand assets (partner logos, course thumbnails,
      // banners) — they need to render in <img> tags in the admin UI, so we
      // mark them public-read. Recordings + other private content go through
      // the recording-specific upload paths and stay private.
      const result = await storage.uploadObject({
        key,
        body,
        contentType: file.mimetype,
        cacheControl: 'public, max-age=31536000, immutable',
        publicRead: true,
      });
      reply.code(200).send({
        status: 1,
        message: 'File uploaded',
        data: { key: result.key, url: result.location },
      });
    } catch (error: unknown) {
      sendContentError(reply, error);
    }
  });
}
