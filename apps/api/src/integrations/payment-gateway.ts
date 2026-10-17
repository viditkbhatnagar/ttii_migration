import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

import type {
  IntegrationLogger,
  PaymentGateway,
  PaymentLinkRequest,
  PaymentLinkResult,
  PaymentLinkState,
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

/** A Razorpay payment link entity as PaymentLinkState. */
function toPaymentLinkState(body: Record<string, unknown>, fallbackId: string): PaymentLinkState {
  const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  return {
    paymentLinkId: typeof body.id === 'string' && body.id !== '' ? body.id : fallbackId,
    status: typeof body.status === 'string' ? body.status : '',
    amountMinor: num(body.amount),
    amountPaidMinor: num(body.amount_paid),
    paymentCount: Array.isArray(body.payments) ? body.payments.length : 0,
    providerPayload: body,
  };
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

  /** Link states for local development: every link is open until cancelled here. */
  private readonly linkStatuses = new Map<string, string>();

  fetchPaymentLink(paymentLinkId: string): Promise<PaymentLinkState> {
    return Promise.resolve({
      paymentLinkId,
      status: this.linkStatuses.get(paymentLinkId) ?? 'created',
      amountMinor: 0,
      amountPaidMinor: 0,
      paymentCount: 0,
    });
  }

  cancelPaymentLink(paymentLinkId: string): Promise<PaymentLinkState> {
    this.linkStatuses.set(paymentLinkId, 'cancelled');
    return this.fetchPaymentLink(paymentLinkId);
  }
}

export interface RazorpayPaymentGatewayConfig {
  apiKeyId: string;
  apiKeySecret: string;
  webhookSecret: string | undefined;
  apiBaseUrl: string;
}

/** TTII 2026-10-17 — a payment-link read or cancel that takes longer fails. */
export const PAYMENT_LINK_TIMEOUT_MS = 15_000;

export class RazorpayPaymentGateway implements PaymentGateway {
  readonly name = 'razorpay';

  constructor(
    private readonly config: RazorpayPaymentGatewayConfig,
    private readonly logger: IntegrationLogger,
    private readonly fetchImpl: typeof fetch = fetch,
    /** Fetch / cancel a payment link: give up after this long (nothing changes). */
    private readonly linkTimeoutMs: number = PAYMENT_LINK_TIMEOUT_MS,
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
      // Naji UAT 2026-05-31 — students were getting TWO emails: Razorpay's own
      // "Requesting payment of INR …" (no-reply@razorpay.com) plus our branded
      // TTII email that carries the plan summary. Suppress Razorpay's email +
      // reminder emails so only the TTII email goes out. SMS stays on (a
      // separate channel our email doesn't cover) when a phone is present.
      notify: { email: false, sms: Boolean(input.customer.phone) },
      reminder_enable: false,
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

  // TTII 2026-10-17 — read and cancel a payment link, so an open link can be
  // closed before a student's fee is planned or recorded another way.
  async fetchPaymentLink(paymentLinkId: string): Promise<PaymentLinkState> {
    const body = await this.paymentLinkRequest('GET', `/payment_links/${encodeURIComponent(paymentLinkId)}`, 'fetch payment link');
    return toPaymentLinkState(body, paymentLinkId);
  }

  async cancelPaymentLink(paymentLinkId: string): Promise<PaymentLinkState> {
    const body = await this.paymentLinkRequest('POST', `/payment_links/${encodeURIComponent(paymentLinkId)}/cancel`, 'cancel payment link');
    const state = toPaymentLinkState(body, paymentLinkId);
    this.logger.info('integration.payment.link_cancelled', {
      provider: this.name,
      payment_link_id: state.paymentLinkId,
      status: state.status,
    });
    return state;
  }

  private async paymentLinkRequest(method: 'GET' | 'POST', path: string, action: string): Promise<Record<string, unknown>> {
    const basicAuth = Buffer.from(`${this.config.apiKeyId}:${this.config.apiKeySecret}`).toString('base64');
    try {
      const response = await this.fetchImpl(`${this.config.apiBaseUrl.replace(/\/+$/, '')}${path}`, {
        method,
        headers: {
          authorization: `Basic ${basicAuth}`,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        ...(method === 'POST' ? { body: '{}' } : {}),
        signal: AbortSignal.timeout(this.linkTimeoutMs),
      });
      if (!response.ok) {
        const responseBody = await response.text();
        throw new Error(`Razorpay ${action} failed (${response.status}): ${responseBody.slice(0, 256)}`);
      }
      return (await response.json()) as Record<string, unknown>;
    } catch (err) {
      if (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
        throw new Error(`Razorpay ${action} timed out after ${Math.round(this.linkTimeoutMs / 1000)}s`);
      }
      throw err;
    }
  }
}
