import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { AuthService } from '../auth/auth-service.js';
import { requireLegacyAuth } from '../auth/middleware.js';
import {
  AssessmentService,
  type AssignmentFilterInput,
  type ExamFilterInput,
  type StartPracticeAttemptInput,
} from '../assessment/assessment-service.js';

interface RegisterAssessmentRoutesOptions {
  authService?: AuthService;
  assessmentService?: AssessmentService;
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

  app.get('/exams/index', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const filter: ExamFilterInput = {
        courseId: toInteger(payload.course_id),
        subjectId: toInteger(payload.subject_id),
        lessonId: toInteger(payload.lesson_id),
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
        toInteger(payload.course_id),
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
        examId: toInteger(payload.exam_id),
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
        attemptId: toInteger(payload.attempt_id),
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

  app.post('/quiz/start_quiz', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const startedAttempt = await assessmentService.startQuizAttempt(requestUserId(request), {
        examId: toInteger(payload.exam_id),
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
      const attemptId = toInteger(payload.attempt_id);
      const examId = toInteger(payload.exam_id);

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
        lessonId: toInteger(payload.lesson_id),
        lessonFileId: toInteger(payload.lesson_file_id),
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
        attemptId: toInteger(payload.attempt_id),
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
        subjectId: toInteger(payload.subject_id),
        cohortId: toInteger(payload.cohort_id),
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
      const assignmentId = toInteger(payload.assignment_id);

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
      const assignmentId = toInteger(payload.assignment_id);

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

  app.post('/assignment/submit_assignment', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const submission = await assessmentService.submitAssignment(requestUserId(request), {
        assignmentId: toInteger(payload.assignment_id),
        answerFiles: payload.answer_file,
      });

      reply.code(200).send(submission);
    } catch (error: unknown) {
      sendAssessmentError(reply, error);
    }
  });

  app.get('/assignment/save_assignment', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const result = await assessmentService.toggleSavedAssignment(
        requestUserId(request),
        toInteger(payload.assignment_id),
      );

      reply.code(200).send(result);
    } catch (error: unknown) {
      sendAssessmentError(reply, error);
    }
  });
}
