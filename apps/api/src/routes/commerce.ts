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

function sendCommerceError(reply: FastifyReply, error: unknown): void {
  const message = error instanceof Error ? error.message : 'Internal commerce error.';

  reply.code(500).send({
    status: 0,
    message,
    data: {},
  });
}

/**
 * Pull the order and payment ids out of a Razorpay webhook.
 *
 * The two events we act on nest them differently: `order.paid` carries the
 * order under payload.order.entity, while `payment.captured` only has the
 * payment, whose order_id points back. Read both shapes so whichever arrives
 * first is usable.
 */
export function extractRazorpayOrderPayment(parsed: Record<string, unknown>): {
  orderId: string;
  paymentId: string;
} {
  const payload = (parsed.payload ?? {}) as Record<string, unknown>;
  const entityOf = (key: string): Record<string, unknown> => {
    const node = (payload[key] ?? {}) as Record<string, unknown>;
    return (node.entity ?? {}) as Record<string, unknown>;
  };

  const paymentEntity = entityOf('payment');
  const orderEntity = entityOf('order');

  const asId = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

  return {
    orderId: asId(orderEntity.id) || asId(paymentEntity.order_id),
    paymentId: asId(paymentEntity.id),
  };
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
      const packageData = await commerceService.listPackages(requestUserId(request), toStringValue(payload.course_id));
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
        packageId: toStringValue(payload.package_id),
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
        courseId: toStringValue(payload.course_id),
        receipt: toStringValue(payload.receipt) || `receipt_${Date.now()}`,
        currency: toStringValue(payload.currency) || 'INR',
      };

      if (!input.courseId) {
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
      courseId: toStringValue(payload.course_id),
      razorpayOrderId: toStringValue(payload.razorpay_order_id),
      razorpayPaymentId: toStringValue(payload.razorpay_payment_id),
      razorpaySignature: toStringValue(payload.razorpay_signature),
    };

    if (
      !input.courseId ||
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

  // Razorpay webhook receiver. Razorpay POSTs a JSON event with an
  // X-Razorpay-Signature header. We verify the HMAC against the raw body
  // before trusting any of the contents.
  //
  // For now this is a no-op acknowledger — the synchronous /payment/complete_order
  // path already marks orders paid when the user finishes checkout in the
  // browser. Webhooks are the authoritative async path Razorpay uses to
  // tell us about payments that happened OUT-OF-BAND (e.g. mobile app, UPI
  // delayed capture). When we wire those flows we'll handle the events
  // here. Today we just verify+log so we have an audit trail.
  //
  // The webhook receives JSON with text/plain content-type from Razorpay's
  // dashboard test sender, but application/json from real events. We accept
  // both via a string parser so we always have the raw body for HMAC.
  app.post('/webhooks/razorpay', async (request, reply) => {
    const signature = request.headers['x-razorpay-signature'];
    const sigStr = Array.isArray(signature) ? signature[0] : signature;
    // request.body comes in already-parsed via Fastify's default JSON parser.
    // We re-stringify with no whitespace — Razorpay's webhook payloads are
    // canonical JSON with no extra whitespace, so the round-trip preserves
    // bytes for HMAC verification. If verification ever flakes we'll switch
    // to fastify-raw-body for byte-perfect raw capture.
    const rawBody = typeof request.body === 'string'
      ? request.body
      : JSON.stringify(request.body ?? {});

    const gateway = options.integrations?.payment;
    if (!gateway || typeof sigStr !== 'string') {
      reply.code(400).send({ status: 0, message: 'Missing signature or gateway.' });
      return;
    }

    const ok = gateway.verifyWebhookSignature({ payload: rawBody, signature: sigStr });
    if (!ok) {
      reply.code(400).send({ status: 0, message: 'Invalid signature.' });
      return;
    }

    // Dispatch `payment_link.paid` to the operations service so the
    // application stage transitions (Naji 2026-05-05). Best-effort —
    // we still ack 200 even if the dispatcher throws, because Razorpay
    // retries non-2xx for hours and the link state is recoverable
    // from the application list (admin can manually mark paid).
    try {
      const parsed = typeof request.body === 'string'
        ? (JSON.parse(request.body) as Record<string, unknown>)
        : ((request.body ?? {}) as Record<string, unknown>);
      const eventName = typeof parsed.event === 'string' ? parsed.event : '';

      if (eventName === 'payment_link.paid') {
        const { OperationsService } = await import('../operations/operations-service.js');
        const ops = new OperationsService();
        await ops.handleRazorpayWebhook(eventName, parsed);
      }

      // TTII 2026-09-01 — "the payment status of enrolled students (Installment
      // payment) has not been updated in the LMS despite the payments having
      // been successfully made through the platform."
      //
      // Checkout payments were recorded ONLY by /payment/complete_order, which
      // the student's BROWSER calls after paying. A closed tab, a dropped
      // connection or a missing redirect meant the money moved and nothing was
      // written — 72 of 90 orders sat 'pending', with students retrying because
      // the portal still showed them as unpaid. This handler was a deliberate
      // no-op ("when we wire those flows we'll handle the events here"); those
      // flows are live, so it is wired now.
      //
      // Both events are handled because either can arrive first, and Razorpay
      // retries for hours. Reconciliation is idempotent, so duplicates are safe.
      if (eventName === 'order.paid' || eventName === 'payment.captured') {
        const { orderId, paymentId } = extractRazorpayOrderPayment(parsed);
        const outcome = await commerceService.reconcileWebhookOrderPayment(orderId, paymentId);
        request.log.info(
          {
            event: 'razorpay.webhook.reconcile',
            razorpay_event: eventName,
            order_id: orderId,
            payment_id: paymentId,
            reconciled: outcome.reconciled,
            reason: outcome.reason,
          },
          'razorpay webhook reconciliation',
        );
      } else {
        // The audit trail this handler always claimed to keep but never wrote.
        request.log.info(
          { event: 'razorpay.webhook.ignored', razorpay_event: eventName },
          'razorpay webhook received',
        );
      }
    } catch (error: unknown) {
      // Still ack — Razorpay retries non-2xx for hours — but never silently.
      request.log.error({ err: error, event: 'razorpay.webhook.failed' }, 'razorpay webhook handling failed');
    }

    // Acknowledge fast — Razorpay retries non-2xx for hours.
    reply.code(200).send({ status: 1, message: 'received' });
  });

  app.get('/payment/apply_coupon', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const input: ApplyCouponInput = {
        courseId: toStringValue(payload.course_id),
        packageId: toStringValue(payload.package_id),
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
      const data = await commerceService.getPaymentDetails(requestUserId(request), toStringValue(payload.course_id));
      reply.code(200).send({
        status: 1,
        message: 'Payment success!',
        data,
      });
    } catch (error: unknown) {
      sendCommerceError(reply, error);
    }
  });

  app.get('/payment/get_payment_history', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const data = await commerceService.getPaymentHistory(requestUserId(request), toStringValue(payload.course_id) || undefined);
      reply.code(200).send({
        status: 1,
        message: 'success',
        data,
      });
    } catch (error: unknown) {
      sendCommerceError(reply, error);
    }
  });

  app.get('/payment/get_installments', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const data = await commerceService.getStudentInstallments(requestUserId(request), toStringValue(payload.course_id) || undefined);
      reply.code(200).send({
        status: 1,
        message: 'success',
        data,
      });
    } catch (error: unknown) {
      sendCommerceError(reply, error);
    }
  });
}
