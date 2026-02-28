import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { AuthService } from '../auth/auth-service.js';
import { requireLegacyAuth } from '../auth/middleware.js';
import {
  EngagementService,
  type AddEventFeedbackInput,
  type AddReviewInput,
  type RegisterEventInput,
} from '../engagement/engagement-service.js';

interface RegisterEngagementRoutesOptions {
  authService?: AuthService;
  engagementService?: EngagementService;
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

function sendEngagementError(reply: FastifyReply, error: unknown): void {
  const message = error instanceof Error ? error.message : 'Internal engagement error.';

  reply.code(500).send({
    status: 0,
    message,
    data: {},
  });
}

export function registerEngagementRoutes(
  app: FastifyInstance,
  options: RegisterEngagementRoutesOptions = {},
): void {
  const authService = options.authService ?? new AuthService();
  const engagementService = options.engagementService ?? new EngagementService();
  const requireAuth = requireLegacyAuth(authService);

  app.get('/feed/index', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const data = await engagementService.listFeed(requestUserId(request));
      reply.code(200).send({
        status: 1,
        message: 'success',
        data,
      });
    } catch (error: unknown) {
      sendEngagementError(reply, error);
    }
  });

  app.get('/feed/feed_watched', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      await engagementService.markFeedWatched(requestUserId(request), toStringValue(payload.feed_id));
      reply.code(200).send({
        status: 1,
        message: 'success',
        data: [],
      });
    } catch (error: unknown) {
      sendEngagementError(reply, error);
    }
  });

  app.get('/feed/feed_like', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      await engagementService.toggleFeedLike(requestUserId(request), toStringValue(payload.feed_id));
      reply.code(200).send({
        status: 1,
        message: 'success',
        data: [],
      });
    } catch (error: unknown) {
      sendEngagementError(reply, error);
    }
  });

  app.get('/feed/add_feed_comment', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      await engagementService.addFeedComment(
        requestUserId(request),
        toStringValue(payload.feed_id),
        toStringValue(payload.comment),
      );
      reply.code(200).send({
        status: 1,
        message: 'success',
        data: [],
      });
    } catch (error: unknown) {
      sendEngagementError(reply, error);
    }
  });

  app.get('/feed/feed_comments', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const comments = await engagementService.listFeedComments(toStringValue(payload.feed_id));
      reply.code(200).send({
        status: 1,
        message: 'success',
        data: comments,
      });
    } catch (error: unknown) {
      sendEngagementError(reply, error);
    }
  });

  app.get('/review/add_review', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const input: AddReviewInput = {
        courseId: toStringValue(payload.course_id),
        rating: toNumber(payload.rating),
        review: toStringValue(payload.review),
      };

      await engagementService.addOrUpdateReview(requestUserId(request), input);

      reply.code(200).send({
        status: 1,
        message: 'success',
        data: [],
      });
    } catch (error: unknown) {
      sendEngagementError(reply, error);
    }
  });

  app.get('/review/get_user_review', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const review = await engagementService.getUserReview(requestUserId(request), toStringValue(payload.course_id));

      reply.code(200).send({
        status: 1,
        message: 'success',
        data: review,
      });
    } catch (error: unknown) {
      sendEngagementError(reply, error);
    }
  });

  app.get('/review/like_review', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      await engagementService.toggleReviewLike(requestUserId(request), toStringValue(payload.review_id));

      reply.code(200).send({
        status: 1,
        message: 'success',
        data: [],
      });
    } catch (error: unknown) {
      sendEngagementError(reply, error);
    }
  });

  app.get('/home/get_notification', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const notifications = await engagementService.getNotifications(requestUserId(request));
      reply.code(200).send({
        status: 1,
        message: 'Success',
        data: notifications,
      });
    } catch (error: unknown) {
      sendEngagementError(reply, error);
    }
  });

  app.get('/home/get_notification_list', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const notifications = await engagementService.getNotificationList();
      reply.code(200).send({
        status: true,
        message: 'Success',
        data: notifications,
      });
    } catch (error: unknown) {
      sendEngagementError(reply, error);
    }
  });

  app.get('/home/mark_notification_as_read', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const marked = await engagementService.markNotificationAsRead(
        requestUserId(request),
        toStringValue(payload.notification_id),
      );

      reply.code(200).send({
        status: marked ? 1 : 0,
        message: marked ? 'Success' : 'Something went wrong',
        data: [],
      });
    } catch (error: unknown) {
      sendEngagementError(reply, error);
    }
  });

  app.get('/home/save_notification_token', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const token = toStringValue(payload.notification_token);
      const saved = await engagementService.saveNotificationToken(requestUserId(request), token);

      reply.code(200).send({
        status: saved ? 1 : 0,
        message: saved ? 'Token saved successfully' : 'Token is empty',
        data: [],
      });
    } catch (error: unknown) {
      sendEngagementError(reply, error);
    }
  });

  app.get('/events/index', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const data = await engagementService.listEvents(requestUserId(request), toStringValue(payload.filter));
      reply.code(200).send({
        status: 1,
        message: 'succesfully',
        data,
      });
    } catch (error: unknown) {
      sendEngagementError(reply, error);
    }
  });

  app.get('/events/get_event_details', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const eventDetails = await engagementService.getEventDetails(requestUserId(request), toStringValue(payload.event_id));

      if (!eventDetails) {
        reply.code(200).send({
          status: 'error',
          message: 'Event not found',
        });
        return;
      }

      reply.code(200).send({
        status: 'success',
        data: eventDetails,
      });
    } catch (error: unknown) {
      sendEngagementError(reply, error);
    }
  });

  app.post('/events/register_event', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const input: RegisterEventInput = {
        eventId: toStringValue(payload.event_id),
        name: toStringValue(payload.name),
        phone: toStringValue(payload.phone),
        attendStatus: toStringValue(payload.attend_status),
      };

      const result = await engagementService.registerEvent(requestUserId(request), input);

      if (result.duplicate) {
        reply.code(200).send({
          status: false,
          message: 'You are already registered..!',
          data: [],
        });
        return;
      }

      reply.code(200).send({
        status: result.success ? 1 : false,
        message: result.success ? 'success' : 'Something Went Wrong',
        data: [],
      });
    } catch (error: unknown) {
      sendEngagementError(reply, error);
    }
  });

  app.get('/events/add_feedback', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const input: AddEventFeedbackInput = {
        eventId: toStringValue(payload.event_id),
        rating: toNumber(payload.rating),
        review: toStringValue(payload.review),
      };

      const created = await engagementService.addEventFeedback(requestUserId(request), input);

      reply.code(200).send({
        status: created ? 1 : 0,
        message: created ? 'succesfully' : 'Already Exist',
        data: [],
      });
    } catch (error: unknown) {
      sendEngagementError(reply, error);
    }
  });

  app.get('/my_task/index', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const data = await engagementService.getMyTask(requestUserId(request), toStringValue(payload.date));

      reply.code(200).send({
        status: 1,
        message: 'success',
        data,
      });
    } catch (error: unknown) {
      sendEngagementError(reply, error);
    }
  });

  app.get('/support/get_messages', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const messages = await engagementService.getSupportMessages(requestUserId(request));

      reply.code(200).send({
        status: 1,
        message: 'success',
        data: messages,
      });
    } catch (error: unknown) {
      sendEngagementError(reply, error);
    }
  });

  app.post('/support/submit_message', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const submitted = await engagementService.submitSupportMessage(
        requestUserId(request),
        toStringValue(payload.message),
      );

      reply.code(200).send({
        status: submitted ? 1 : 0,
        message: submitted ? 'message send successfully' : 'something went wrong!',
      });
    } catch (error: unknown) {
      sendEngagementError(reply, error);
    }
  });
}
