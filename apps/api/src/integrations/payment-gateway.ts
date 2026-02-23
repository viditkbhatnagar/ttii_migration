import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

import type {
  IntegrationLogger,
  PaymentGateway,
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
}
