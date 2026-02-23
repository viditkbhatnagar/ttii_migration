import { createHmac } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { RazorpayPaymentGateway } from '../../src/integrations/payment-gateway.js';
import type { IntegrationLogger } from '../../src/integrations/contracts.js';

const logger: IntegrationLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

describe('payment gateway integrations', () => {
  it('verifies Razorpay payment signatures using shared secret', () => {
    const gateway = new RazorpayPaymentGateway(
      {
        apiKeyId: 'rzp_test_key',
        apiKeySecret: 'rzp_test_secret',
        apiBaseUrl: 'https://api.razorpay.com/v1',
      },
      logger,
    );

    const orderId = 'order_ABC123';
    const paymentId = 'pay_DEF456';
    const signature = createHmac('sha256', 'rzp_test_secret')
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    expect(
      gateway.verifyPaymentSignature({
        orderId,
        paymentId,
        signature,
      }),
    ).toBe(true);

    expect(
      gateway.verifyPaymentSignature({
        orderId,
        paymentId,
        signature: 'invalid-signature',
      }),
    ).toBe(false);
  });

  it('verifies webhook signatures with dedicated webhook secret when present', () => {
    const gateway = new RazorpayPaymentGateway(
      {
        apiKeyId: 'rzp_test_key',
        apiKeySecret: 'rzp_test_secret',
        webhookSecret: 'webhook_secret',
        apiBaseUrl: 'https://api.razorpay.com/v1',
      },
      logger,
    );

    const payload = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_1' } } } });
    const signature = createHmac('sha256', 'webhook_secret').update(payload).digest('hex');

    expect(
      gateway.verifyWebhookSignature({
        payload,
        signature,
      }),
    ).toBe(true);

    expect(
      gateway.verifyWebhookSignature({
        payload,
        signature: 'wrong',
      }),
    ).toBe(false);
  });
});
