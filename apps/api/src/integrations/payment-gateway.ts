import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

import type {
  IntegrationLogger,
  PaymentGateway,
  PaymentLinkRequest,
  PaymentLinkResult,
  PaymentOrder,
  PaymentOrderRequest,
  PaymentSignatureVerificationInput,
  PaymentWebhookVerificationInput,
} from './contracts.js';

function normalizeHex(value: string): string {
  return value.trim().toLowerCase();
}

function safeEqualText(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function hmacSha256Hex(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

export class MockPaymentGateway implements PaymentGateway {
  readonly name = 'mock-payment';

  createOrder(input: PaymentOrderRequest): Promise<PaymentOrder> {
    return Promise.resolve({
      orderId: `order_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      amountMinor: input.amountMinor,
      currency: input.currency.toUpperCase(),
      receipt: input.receipt,
      providerPayload: {
        notes: input.notes,
      },
    });
  }

  verifyPaymentSignature(input: PaymentSignatureVerificationInput): boolean {
    void input;
    return true;
  }

  verifyWebhookSignature(input: PaymentWebhookVerificationInput): boolean {
    void input;
    return true;
  }
}

export interface RazorpayPaymentGatewayConfig {
  apiKeyId: string;
  apiKeySecret: string;
  webhookSecret: string | undefined;
  apiBaseUrl: string;
}

export class RazorpayPaymentGateway implements PaymentGateway {
  readonly name = 'razorpay';

  constructor(
    private readonly config: RazorpayPaymentGatewayConfig,
    private readonly logger: IntegrationLogger,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async createOrder(input: PaymentOrderRequest): Promise<PaymentOrder> {
    const requestPayload = {
      amount: input.amountMinor,
      currency: input.currency.toUpperCase(),
      receipt: input.receipt,
      notes: input.notes,
    };

    const basicAuth = Buffer.from(`${this.config.apiKeyId}:${this.config.apiKeySecret}`).toString('base64');
    const response = await this.fetchImpl(`${this.config.apiBaseUrl.replace(/\/+$/, '')}/orders`, {
      method: 'POST',
      headers: {
        authorization: `Basic ${basicAuth}`,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      const responseBody = await response.text();
      throw new Error(`Razorpay create order failed (${response.status}): ${responseBody.slice(0, 256)}`);
    }

    const body = (await response.json()) as {
      id: string;
      amount: number;
      currency: string;
      receipt: string;
      status?: string;
    };

    this.logger.info('integration.payment.order_created', {
      provider: this.name,
      order_id: body.id,
      amount_minor: body.amount,
      currency: body.currency,
      status: body.status,
    });

    return {
      orderId: body.id,
      amountMinor: body.amount,
      currency: body.currency,
      receipt: body.receipt,
      providerPayload: {
        status: body.status,
      },
    };
  }

  verifyPaymentSignature(input: PaymentSignatureVerificationInput): boolean {
    const expected = hmacSha256Hex(this.config.apiKeySecret, `${input.orderId}|${input.paymentId}`);
    return safeEqualText(normalizeHex(expected), normalizeHex(input.signature));
  }

  verifyWebhookSignature(input: PaymentWebhookVerificationInput): boolean {
    const secret = this.config.webhookSecret ?? this.config.apiKeySecret;
    const expected = hmacSha256Hex(secret, input.payload);
    return safeEqualText(normalizeHex(expected), normalizeHex(input.signature));
  }

  // Razorpay Payment Links API. Naji 2026-05-05: lead → payment step
  // sends a link that customer can pay via Razorpay's hosted page.
  // Webhook event `payment_link.paid` flips the application to stage=paid.
  async createPaymentLink(input: PaymentLinkRequest): Promise<PaymentLinkResult> {
    const basicAuth = Buffer.from(`${this.config.apiKeyId}:${this.config.apiKeySecret}`).toString('base64');
    const requestPayload: Record<string, unknown> = {
      amount: input.amountMinor,
      currency: input.currency.toUpperCase(),
      description: input.description.slice(0, 240),
      customer: {
        name: input.customer.name,
        email: input.customer.email,
        ...(input.customer.phone ? { contact: input.customer.phone } : {}),
      },
      notify: { email: true, sms: Boolean(input.customer.phone) },
      reminder_enable: true,
      ...(input.expireBy ? { expire_by: input.expireBy } : {}),
      ...(input.notes ? { notes: input.notes } : {}),
    };
    const response = await this.fetchImpl(`${this.config.apiBaseUrl.replace(/\/+$/, '')}/payment_links`, {
      method: 'POST',
      headers: {
        authorization: `Basic ${basicAuth}`,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(requestPayload),
    });
    if (!response.ok) {
      const responseBody = await response.text();
      throw new Error(`Razorpay create payment link failed (${response.status}): ${responseBody.slice(0, 256)}`);
    }
    const body = (await response.json()) as Record<string, unknown>;
    const paymentLinkId = typeof body.id === 'string' ? body.id : '';
    const shortUrl = typeof body.short_url === 'string' ? body.short_url : '';
    const status = typeof body.status === 'string' ? body.status : '';
    const expireBy = typeof body.expire_by === 'number' ? body.expire_by : undefined;
    this.logger.info('integration.payment.link_created', {
      provider: this.name,
      payment_link_id: paymentLinkId,
      amount_minor: input.amountMinor,
      currency: input.currency,
      status,
    });
    return {
      paymentLinkId,
      shortUrl,
      status,
      ...(expireBy ? { expireBy } : {}),
      providerPayload: body,
    };
  }
}
