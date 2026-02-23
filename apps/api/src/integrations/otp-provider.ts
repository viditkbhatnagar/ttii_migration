import type { IntegrationDeliveryResult, IntegrationLogger, OtpDispatchRequest, OtpProvider } from './contracts.js';

function maskPhone(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 4) {
    return '*'.repeat(trimmed.length);
  }

  return `${'*'.repeat(trimmed.length - 4)}${trimmed.slice(-4)}`;
}

export class NoopOtpProvider implements OtpProvider {
  readonly name = 'noop-otp';

  sendOtp(input: OtpDispatchRequest): Promise<IntegrationDeliveryResult> {
    void input;
    return Promise.resolve({
      accepted: true,
      provider: this.name,
    });
  }
}

export class ConsoleOtpProvider implements OtpProvider {
  readonly name = 'console-otp';

  constructor(private readonly logger: IntegrationLogger) {}

  sendOtp(input: OtpDispatchRequest): Promise<IntegrationDeliveryResult> {
    this.logger.info('integration.otp.send', {
      provider: this.name,
      user_id: input.userId,
      purpose: input.purpose,
      target: maskPhone(input.target),
      expires_at: input.expiresAt.toISOString(),
    });

    return Promise.resolve({
      accepted: true,
      provider: this.name,
      providerMessageId: `console-otp-${Date.now()}`,
    });
  }
}

export interface HttpOtpProviderConfig {
  endpoint: string;
  authToken: string | undefined;
  senderId: string | undefined;
  timeoutMs: number;
}

export class HttpOtpProvider implements OtpProvider {
  readonly name = 'http-otp';

  constructor(
    private readonly config: HttpOtpProviderConfig,
    private readonly logger: IntegrationLogger,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async sendOtp(input: OtpDispatchRequest): Promise<IntegrationDeliveryResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const message = `Your TTII OTP is ${input.otp}. It expires at ${input.expiresAt.toISOString()}.`;
      const response = await this.fetchImpl(this.config.endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(this.config.authToken ? { authorization: `Bearer ${this.config.authToken}` } : {}),
        },
        body: JSON.stringify({
          target: input.target,
          otp: input.otp,
          purpose: input.purpose,
          message,
          sender_id: this.config.senderId,
          expires_at: input.expiresAt.toISOString(),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const responseBody = await response.text();
        this.logger.error('integration.otp.send_failed', {
          provider: this.name,
          status: response.status,
          user_id: input.userId,
          target: maskPhone(input.target),
        });
        throw new Error(`OTP dispatch failed (${response.status}): ${responseBody.slice(0, 256)}`);
      }

      const body = (await response.json()) as { message_id?: string };

      this.logger.info('integration.otp.send', {
        provider: this.name,
        user_id: input.userId,
        target: maskPhone(input.target),
        message_id: body.message_id,
      });

      return {
        accepted: true,
        provider: this.name,
        ...(body.message_id ? { providerMessageId: body.message_id } : {}),
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
