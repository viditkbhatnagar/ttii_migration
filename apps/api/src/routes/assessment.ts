import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { AuthService } from '../auth/auth-service.js';
import { extractAuthToken, requireLegacyAuth } from '../auth/middleware.js';
import type { StorageProvider } from '../integrations/contracts.js';
import {
  AssessmentService,
  type AssignmentFilterInput,
  type ExamFilterInput,
  type StartPracticeAttemptInput,
} from '../assessment/assessment-service.js';
import { registerAssignmentUploadRoutes } from './assignment-upload.js';

interface RegisterAssessmentRoutesOptions {
  authService?: AuthService;
  assessmentService?: AssessmentService;
  storage?: StorageProvider;
  [key: string]: unknown;
}

function toStringId(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return String(value);
  }

  return '';
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

function sendAssessmentError(reply: FastifyReply, error: unknown): void {
  const message = error instanceof Error ? error.message : 'Internal assessment error.';

  reply.code(500).send({
    status: 0,
    message,
    data: {},
  });
}

export function registerAssessmentRoutes(
  app: FastifyInstance,
  options: RegisterAssessmentRoutesOptions = {},
): void {
  const authService = options.authService ?? new AuthService();
  const assessmentService = options.assessmentService ?? new AssessmentService();
  const requireAuth = requireLegacyAuth(authService);

  // Chunked/resumable assignment upload (TTII 2026-08-19). Additive: the
  // single-shot multipart route below stays exactly as it is for the shipped
  // Dart mobile app, which cannot be updated from here.
  registerAssignmentUploadRoutes(app, {
    authService,
    assessmentService,
    ...(options.storage ? { storage: options.storage } : {}),
  });

  app.get('/exams/index', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const filter: ExamFilterInput = {
        courseId: toStringId(payload.course_id),
        subjectId: toStringId(payload.subject_id),
        lessonId: toStringId(payload.lesson_id),
      };

      const exams = await assessmentService.listExams(requestUserId(request), filter);
      reply.code(200).send({
        status: 1,
        message: 'success',
        data: exams,
      });
    } catch (error: unknown) {
      sendAssessmentError(reply, error);
    }
  });

  app.get('/exams/exam_calendar', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const calendar = await assessmentService.getExamCalendar(
        requestUserId(request),
        toStringId(payload.course_id),
      );

      reply.code(200).send({
        status: 1,
        message: 'success',
        data: calendar,
      });
    } catch (error: unknown) {
      sendAssessmentError(reply, error);
    }
  });

  app.post('/exams/exam_save_start', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const startedAttempt = await assessmentService.startExamAttempt(requestUserId(request), {
        examId: toStringId(payload.exam_id),
      });

      reply.code(200).send({
        status: 1,
        message: 'Success',
        attempt_id: startedAttempt.attemptId,
      });
    } catch (error: unknown) {
      sendAssessmentError(reply, error);
    }
  });

  app.post('/exams/exam_save_result', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      await assessmentService.submitExamAttempt(requestUserId(request), {
        attemptId: toStringId(payload.attempt_id),
        userAnswers: payload.user_answers,
      });

      reply.code(200).send({
        status: 1,
        message: 'Success',
        data: [],
      });
    } catch (error: unknown) {
      sendAssessmentError(reply, error);
    }
  });

  // Naji UAT 2026-08-11 — exam answer autosave. Runs every ~25s per student
  // mid-exam, so it is deliberately cheap and idempotent: it parks the answer
  // sheet on exam_attempt.draft_answers and returns the SERVER's countdown, and
  // it scores nothing. Being an ordinary authenticated call it also slides the
  // session, which is what keeps the hard 1h expiry off a 75-minute paper.
  //
  // Always HTTP 200: a rejected save (someone else's attempt, an
  // already-submitted one) reports itself in the envelope's `status` rather
  // than as an error, because a 4xx/5xx here would surface as the "Session
  // Expired"/"User not authenticated!" modal on top of a live exam.
  app.post('/exams/exam_save_progress', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const result = await assessmentService.saveExamProgress(requestUserId(request), {
        attemptId: toStringId(payload.attempt_id),
        userAnswers: payload.user_answers,
        // Round 3 — the draft-writer token from /exams/exam_take, identifying
        // WHICH open tab this save came from. Absent for the Flutter client,
        // which coerces to '' and keeps the pre-token behaviour.
        draftToken: toStringId(payload.draft_token),
      });

      reply.code(200).send(result);
    } catch (error: unknown) {
      sendAssessmentError(reply, error);
    }
  });

  // Naji UAT 2026-06-01 — native in-portal exam taking. Returns the exam's
  // questions (no answer keys) for an eligible student and starts/resumes the
  // attempt. The service result already carries { status, message?, data? }.
  // The permanent practice exam for the student Exams tab. Returns
  // { status: 1, data: null } when none is configured so the button hides.
  app.get('/exams/practice', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const data = await assessmentService.getPracticeExam(requestUserId(request));
      reply.code(200).send({ status: 1, message: 'success', data });
    } catch (error: unknown) {
      sendAssessmentError(reply, error);
    }
  });

  app.post('/exams/exam_take', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const result = await assessmentService.getExamForTaking(
        requestUserId(request),
        toStringId(payload.exam_id),
      );
      reply.code(200).send(result);
    } catch (error: unknown) {
      sendAssessmentError(reply, error);
    }
  });

  app.post('/quiz/start_quiz', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const startedAttempt = await assessmentService.startQuizAttempt(requestUserId(request), {
        examId: toStringId(payload.exam_id),
      });

      reply.code(200).send({
        status: 1,
        message: 'Success',
        attempt_id: startedAttempt.attemptId,
        question_count: startedAttempt.questionNo,
      });
    } catch (error: unknown) {
      sendAssessmentError(reply, error);
    }
  });

  app.post('/quiz/save_quiz_result', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const attemptId = toStringId(payload.attempt_id);
      const examId = toStringId(payload.exam_id);

      await assessmentService.submitQuizAttempt(requestUserId(request), {
        attemptId,
        userAnswers: payload.user_answers,
      });

      reply.code(200).send({
        status: 1,
        message: 'Success',
        user_id: requestUserId(request),
        exam_id: examId,
        attempt_id: attemptId,
      });
    } catch (error: unknown) {
      sendAssessmentError(reply, error);
    }
  });

  app.post('/practice/start_practice', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const input: StartPracticeAttemptInput = {
        lessonId: toStringId(payload.lesson_id),
        lessonFileId: toStringId(payload.lesson_file_id),
        questionNo: toInteger(payload.question_no),
      };

      const startedAttempt = await assessmentService.startPracticeAttempt(requestUserId(request), input);

      reply.code(200).send({
        status: 1,
        message: 'Success',
        data: {
          attempt_id: startedAttempt.attemptId,
          question_count: startedAttempt.questionNo,
        },
      });
    } catch (error: unknown) {
      sendAssessmentError(reply, error);
    }
  });

  app.post('/practice/save_practice_result', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      await assessmentService.submitPracticeAttempt(requestUserId(request), {
        attemptId: toStringId(payload.attempt_id),
        userAnswers: payload.user_answers,
      });

      reply.code(200).send({
        status: 1,
        message: 'Success',
        data: [],
      });
    } catch (error: unknown) {
      sendAssessmentError(reply, error);
    }
  });

  app.get('/assignment/index', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const filter: AssignmentFilterInput = {
        subjectId: toStringId(payload.subject_id),
        cohortId: toStringId(payload.cohort_id),
      };

      const assignments = await assessmentService.listAssignments(requestUserId(request), filter);
      reply.code(200).send({
        status: 1,
        message: 'succesfully',
        data: assignments,
      });
    } catch (error: unknown) {
      sendAssessmentError(reply, error);
    }
  });

  app.get('/assignment/get_assignment_details', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const assignmentId = toStringId(payload.assignment_id);

      const assignment = await assessmentService.getAssignmentDetails(requestUserId(request), assignmentId);
      if (!assignment) {
        reply.code(200).send({
          status: 'error',
          message: 'Assignment not found',
        });
        return;
      }

      reply.code(200).send({
        status: 'success',
        data: assignment,
      });
    } catch (error: unknown) {
      sendAssessmentError(reply, error);
    }
  });

  app.get('/assignment/get_assignment_evaluation', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const assignmentId = toStringId(payload.assignment_id);

      const assignment = await assessmentService.getAssignmentDetails(requestUserId(request), assignmentId);
      if (!assignment) {
        reply.code(200).send({
          status: 'error',
          message: 'Assignment not found',
        });
        return;
      }

      reply.code(200).send({
        status: 'success',
        data: {
          is_submitted: assignment.is_submitted,
          is_reviewed: assignment.is_reviewed,
          marks: assignment.marks,
          remarks: assignment.remarks,
        },
      });
    } catch (error: unknown) {
      sendAssessmentError(reply, error);
    }
  });

  // Assignment submission from the mobile app: a multipart/form-data POST with
  // the PDF as `answer_file[]` and `auth_token` + `assignment_id` as form
  // fields. The token rides in the BODY (unlike our other endpoints), so the
  // requireAuth preHandler can't see it — so this route authenticates manually
  // after parsing, uploads the file to storage, then records the submission
  // with its URL. Still accepts a plain JSON body (answer_file = URLs, token in
  // query) for any non-mobile caller.
  app.post('/assignment/submit_assignment', async (request, reply) => {
    try {
      // Token from query/header first (cheap), else from the multipart body.
      let token = extractAuthToken(request) ?? '';
      let assignmentId = '';
      let jsonAnswerFiles: unknown;
      const pendingFiles: { filename: string; mimetype: string; body: Buffer }[] = [];

      if (request.isMultipart()) {
        for await (const part of request.parts()) {
          if (part.type === 'file') {
            const chunks: Buffer[] = [];
            for await (const chunk of part.file) chunks.push(Buffer.from(chunk as Uint8Array));
            const body = Buffer.concat(chunks);
            if (body.length > 0) {
              pendingFiles.push({
                filename: part.filename || 'submission.pdf',
                mimetype: part.mimetype || 'application/pdf',
                body,
              });
            }
          } else if (part.fieldname === 'auth_token') {
            if (!token && typeof part.value === 'string') token = part.value.trim();
          } else if (part.fieldname === 'assignment_id') {
            if (typeof part.value === 'string') assignmentId = part.value.trim();
          }
        }
      } else {
        const payload = requestPayload(request);
        assignmentId = toStringId(payload.assignment_id);
        jsonAnswerFiles = payload.answer_file;
      }

      const authContext = token ? await authService.authenticateAuthToken(token) : null;
      if (!authContext) {
        reply.code(401).send({ status: false, message: 'User not authenticated!', data: [] });
        return;
      }
      const userId = String(authContext.user.id);

      // Upload any submitted PDFs to storage; the service records their URLs.
      let answerFiles: unknown = jsonAnswerFiles;
      if (pendingFiles.length > 0) {
        const storage = options.storage;
        if (!storage) {
          reply.code(500).send({ status: 0, message: 'Storage not configured.', data: [] });
          return;
        }
        const urls: string[] = [];
        for (const file of pendingFiles) {
          const ext = (file.filename.split('.').pop() ?? 'pdf').toLowerCase();
          const key = `public/assignment-submissions/${userId}-${assignmentId || 'a'}-${Date.now()}-${urls.length}.${ext}`;
          const result = await storage.uploadObject({
            key,
            body: file.body,
            contentType: file.mimetype,
            publicRead: true,
          });
          urls.push(result.location);
        }
        answerFiles = urls;
      }

      const submission = await assessmentService.submitAssignment(userId, {
        assignmentId,
        answerFiles,
      });
      reply.code(200).send(submission);
    } catch (error: unknown) {
      // @fastify/multipart throws once a part passes the 200MB fileSize limit.
      // Flattening that to a 500 carrying the raw internal string was both
      // useless to the student and invisible to the client's 413 branch.
      const detail = error instanceof Error ? error.message : '';
      if (/file too large|request file too large/i.test(detail)) {
        reply.code(413).send({
          status: 0,
          message: 'That file is too large to upload. Please submit a smaller file.',
          data: [],
        });
        return;
      }
      request.log.error({ err: error }, 'assignment.submit_failed');
      sendAssessmentError(reply, error);
    }
  });

  app.get('/assignment/save_assignment', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const result = await assessmentService.toggleSavedAssignment(
        requestUserId(request),
        toStringId(payload.assignment_id),
      );

      reply.code(200).send(result);
    } catch (error: unknown) {
      sendAssessmentError(reply, error);
    }
  });

  // Native quiz player (Naji 2026-05-05): replaces the legacy PHP
  // practice_web_view iframe with a React UI that fills the right pane
  // properly. Three endpoints — index (questions only), start (creates
  // practice_attempt), submit (scores + closes attempt).
  app.get('/student/quiz/index', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const result = await assessmentService.getStudentQuizForLessonFile(
        requestUserId(request),
        toStringId(payload.lesson_file_id),
      );
      reply.code(200).send(result);
    } catch (error: unknown) { sendAssessmentError(reply, error); }
  });

  app.post('/student/quiz/start', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const result = await assessmentService.startStudentQuizAttempt(
        requestUserId(request),
        toStringId(payload.lesson_file_id),
      );
      reply.code(200).send(result);
    } catch (error: unknown) { sendAssessmentError(reply, error); }
  });

  app.post('/student/quiz/submit', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const rawAnswers = Array.isArray(payload.answers) ? payload.answers : [];
      const answers = rawAnswers
        .map((entry) => {
          if (typeof entry !== 'object' || entry === null) return null;
          const r = entry as Record<string, unknown>;
          const qid = Number(r.question_id);
          if (!Number.isFinite(qid)) return null;
          const selRaw = r.selected;
          const selected = selRaw === null || selRaw === undefined || selRaw === ''
            ? null
            : Number(selRaw);
          return { question_id: qid, selected: selected === null || Number.isFinite(selected) ? selected : null };
        })
        .filter((v): v is { question_id: number; selected: number | null } => v !== null);
      const result = await assessmentService.submitStudentQuizAttempt(requestUserId(request), {
        lessonFileId: toStringId(payload.lesson_file_id),
        attemptId: toStringId(payload.attempt_id),
        answers,
      });
      reply.code(200).send(result);
    } catch (error: unknown) { sendAssessmentError(reply, error); }
  });
}
