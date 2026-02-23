import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { AuthService } from '../auth/auth-service.js';
import { requireLegacyAuth } from '../auth/middleware.js';
import {
  CommerceService,
  type ApplyCouponInput,
  type CompleteOrderInput,
  type CreateOrderInput,
  type GeneratePaymentLinkInput,
} from '../commerce/commerce-service.js';
import type { IntegrationRegistry } from '../integrations/contracts.js';

interface RegisterCommerceRoutesOptions {
  authService?: AuthService;
  commerceService?: CommerceService;
  integrations?: Pick<IntegrationRegistry, 'payment'>;
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

function sendCommerceError(reply: FastifyReply, error: unknown): void {
  const message = error instanceof Error ? error.message : 'Internal commerce error.';

  reply.code(500).send({
    status: 0,
    message,
    data: {},
  });
}

export function registerCommerceRoutes(
  app: FastifyInstance,
  options: RegisterCommerceRoutesOptions = {},
): void {
  const authService = options.authService ?? new AuthService();
  const commerceService = options.commerceService
    ?? new CommerceService(options.integrations ? { integrations: options.integrations } : {});
  const requireAuth = requireLegacyAuth(authService);

  app.get('/packages/index', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const packageData = await commerceService.listPackages(requestUserId(request), toInteger(payload.course_id));
      reply.code(200).send({
        status: 1,
        message: 'succesfully',
        data: packageData,
      });
    } catch (error: unknown) {
      sendCommerceError(reply, error);
    }
  });

  app.get('/payment/generate_payment', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const input: GeneratePaymentLinkInput = {
        packageId: toInteger(payload.package_id),
        subjects: payload.subjects,
        platform: 'app',
      };
      const paymentLink = await commerceService.generatePaymentLink(requestUserId(request), input);
      reply.code(200).send({
        status: 1,
        message: 'Successfully',
        data: paymentLink,
      });
    } catch (error: unknown) {
      sendCommerceError(reply, error);
    }
  });

  app.get('/payment/create_order', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const input: CreateOrderInput = {
        courseId: toInteger(payload.course_id),
        receipt: toStringValue(payload.receipt) || `receipt_${Date.now()}`,
        currency: toStringValue(payload.currency) || 'INR',
      };

      if (input.courseId <= 0) {
        reply.code(200).send({
          status: 0,
          message: 'Course ID is required',
        });
        return;
      }

      const data = await commerceService.createOrder(requestUserId(request), input);
      reply.code(200).send({
        status: 1,
        message: 'Order created successfully',
        data,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      reply.code(200).send({
        status: 0,
        message: `Failed to create order: ${message}`,
        data: [],
      });
    }
  });

  app.get('/payment/complete_order', { preHandler: [requireAuth] }, async (request, reply) => {
    const payload = requestPayload(request);
    const input: CompleteOrderInput = {
      courseId: toInteger(payload.course_id),
      razorpayOrderId: toStringValue(payload.razorpay_order_id),
      razorpayPaymentId: toStringValue(payload.razorpay_payment_id),
      razorpaySignature: toStringValue(payload.razorpay_signature),
    };

    if (
      input.courseId <= 0 ||
      input.razorpayOrderId === '' ||
      input.razorpayPaymentId === '' ||
      input.razorpaySignature === ''
    ) {
      reply.code(200).send({
        status: 'error',
        message:
          'Missing required parameters: course_id or razorpay_order_id or razorpay_payment_id or razorpay_signature',
      });
      return;
    }

    try {
      const completed = await commerceService.completeOrder(requestUserId(request), input);
      if (!completed) {
        reply.code(200).send({
          status: 0,
          message: 'Payment already processed or invalid.',
          data: [],
        });
        return;
      }

      reply.code(200).send({
        status: 1,
        message: 'Payment success!',
        data: [],
      });
    } catch {
      reply.code(200).send({
        status: 0,
        message: 'Payment verification failed.',
        data: [],
      });
    }
  });

  app.get('/payment/apply_coupon', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const input: ApplyCouponInput = {
        courseId: toInteger(payload.course_id),
        packageId: toInteger(payload.package_id),
        couponCode: toStringValue(payload.coupon_code),
      };

      const response = await commerceService.applyCoupon(requestUserId(request), input);
      reply.code(200).send({
        ...response,
        status: 'success',
      });
    } catch (error: unknown) {
      sendCommerceError(reply, error);
    }
  });

  app.get('/payment/get_student_courses', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const data = await commerceService.getStudentCourses(requestUserId(request));
      reply.code(200).send({
        status: 1,
        message: 'Payment success!',
        data,
      });
    } catch (error: unknown) {
      sendCommerceError(reply, error);
    }
  });

  app.get('/payment/get_payment_details', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const data = await commerceService.getPaymentDetails(requestUserId(request), toInteger(payload.course_id));
      reply.code(200).send({
        status: 1,
        message: 'Payment success!',
        data,
      });
    } catch (error: unknown) {
      sendCommerceError(reply, error);
    }
  });
}
