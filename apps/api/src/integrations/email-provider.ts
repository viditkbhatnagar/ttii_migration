import type { EmailProvider, EmailSendRequest, IntegrationDeliveryResult, IntegrationLogger } from './contracts.js';

function maskEmail(value: string): string {
  const [localPart, domainPart] = value.split('@', 2);
  if (!localPart || !domainPart) {
    return 'invalid-email';
  }

  const visible = localPart.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(0, localPart.length - visible.length))}@${domainPart}`;
}

function ensureMessageContent(input: EmailSendRequest): void {
  const hasTemplate = typeof input.templateId === 'string' && input.templateId.trim() !== '';
  const hasHtml = typeof input.html === 'string' && input.html.trim() !== '';
  const hasText = typeof input.text === 'string' && input.text.trim() !== '';

  if (!hasTemplate && !hasHtml && !hasText) {
    throw new Error('Email request must include templateId, html, or text content.');
  }
}

export class NoopEmailProvider implements EmailProvider {
  readonly name = 'noop-email';

  sendEmail(input: EmailSendRequest): Promise<IntegrationDeliveryResult> {
    void input;
    return Promise.resolve({
      accepted: true,
      provider: this.name,
    });
  }
}

export class ConsoleEmailProvider implements EmailProvider {
  readonly name = 'console-email';

  constructor(private readonly logger: IntegrationLogger) {}

  sendEmail(input: EmailSendRequest): Promise<IntegrationDeliveryResult> {
    ensureMessageContent(input);

    this.logger.info('integration.email.send', {
      provider: this.name,
      to: maskEmail(input.to),
      subject: input.subject,
      template_id: input.templateId,
      has_html: typeof input.html === 'string' && input.html.trim() !== '',
      has_text: typeof input.text === 'string' && input.text.trim() !== '',
    });

    return Promise.resolve({
      accepted: true,
      provider: this.name,
      providerMessageId: `console-${Date.now()}`,
    });
  }
}

export interface BrevoEmailProviderConfig {
  apiKey: string;
  fromAddress: string;
  fromName: string;
  apiBaseUrl: string;
}

export class BrevoEmailProvider implements EmailProvider {
  readonly name = 'brevo';

  constructor(
    private readonly config: BrevoEmailProviderConfig,
    private readonly logger: IntegrationLogger,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async sendEmail(input: EmailSendRequest): Promise<IntegrationDeliveryResult> {
    ensureMessageContent(input);

    const payload: Record<string, unknown> = {
      sender: {
        email: this.config.fromAddress,
        name: this.config.fromName,
      },
      to: [{ email: input.to }],
      subject: input.subject,
      htmlContent: input.html,
      textContent: input.text,
      params: input.templateData,
      tags: input.tags,
    };

    if (typeof input.replyTo === 'string' && input.replyTo.trim() !== '') {
      payload.replyTo = { email: input.replyTo.trim() };
    }

    if (typeof input.templateId === 'string' && input.templateId.trim() !== '') {
      const parsedTemplateId = Number.parseInt(input.templateId, 10);
      if (Number.isFinite(parsedTemplateId)) {
        payload.templateId = parsedTemplateId;
      }
    }

    const response = await this.fetchImpl(`${this.config.apiBaseUrl.replace(/\/+$/, '')}/smtp/email`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        'api-key': this.config.apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const responseBody = await response.text();
      this.logger.error('integration.email.send_failed', {
        provider: this.name,
        status: response.status,
        to: maskEmail(input.to),
      });
      throw new Error(`Brevo email send failed (${response.status}): ${responseBody.slice(0, 256)}`);
    }

    const result = (await response.json()) as { messageId?: string };

    this.logger.info('integration.email.send', {
      provider: this.name,
      to: maskEmail(input.to),
      message_id: result.messageId,
    });

    return {
      accepted: true,
      provider: this.name,
      ...(result.messageId ? { providerMessageId: result.messageId } : {}),
    };
  }
}
