import { ConfidentialClientApplication } from '@azure/msal-node';
import nodemailer, { type Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport/index.js';

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

export interface SmtpEmailProviderConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromAddress: string;
  fromName: string;
}

/**
 * SMTP-based email provider compatible with Outlook / Microsoft 365 and any
 * standard SMTP server. Uses nodemailer under the hood.
 *
 * For Outlook / Office 365, use:
 *   host: smtp.office365.com
 *   port: 587
 *   secure: false  (STARTTLS will be negotiated automatically)
 */
export class SmtpEmailProvider implements EmailProvider {
  readonly name = 'smtp';
  private readonly transporter: Transporter;

  constructor(
    private readonly config: SmtpEmailProviderConfig,
    private readonly logger: IntegrationLogger,
  ) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.username,
        pass: config.password,
      },
    });
  }

  async sendEmail(input: EmailSendRequest): Promise<IntegrationDeliveryResult> {
    ensureMessageContent(input);

    const fromHeader = `"${this.config.fromName}" <${this.config.fromAddress}>`;

    try {
      const mailOptions: Parameters<Transporter['sendMail']>[0] = {
        from: fromHeader,
        to: input.to,
        subject: input.subject,
        ...(input.replyTo ? { replyTo: input.replyTo } : {}),
        ...(input.html ? { html: input.html } : {}),
        ...(input.text ? { text: input.text } : {}),
      };

      const info = (await this.transporter.sendMail(mailOptions)) as SMTPTransport.SentMessageInfo;
      const messageId: string | undefined = typeof info.messageId === 'string' ? info.messageId : undefined;

      this.logger.info('integration.email.send', {
        provider: this.name,
        to: maskEmail(input.to),
        subject: input.subject,
        message_id: messageId,
      });

      return {
        accepted: true,
        provider: this.name,
        ...(messageId ? { providerMessageId: messageId } : {}),
      };
    } catch (error) {
      this.logger.error('integration.email.send_failed', {
        provider: this.name,
        to: maskEmail(input.to),
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(
        `SMTP email send failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

export interface MsGraphEmailProviderConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  senderEmail: string;
}

/**
 * Microsoft Graph API email provider. Uses OAuth2 client-credentials flow
 * via @azure/msal-node to send email through Microsoft 365.
 *
 * Prerequisites (Azure portal):
 *   1. App Registration with Mail.Send application permission
 *   2. Admin consent granted for Mail.Send
 *   3. clientId, clientSecret, tenantId from the registration
 */
export class MsGraphEmailProvider implements EmailProvider {
  readonly name = 'msgraph';
  private readonly msalClient: ConfidentialClientApplication;

  constructor(
    private readonly config: MsGraphEmailProviderConfig,
    private readonly logger: IntegrationLogger,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    this.msalClient = new ConfidentialClientApplication({
      auth: {
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        authority: `https://login.microsoftonline.com/${config.tenantId}`,
      },
    });
  }

  private async getAccessToken(): Promise<string> {
    const result = await this.msalClient.acquireTokenByClientCredential({
      scopes: ['https://graph.microsoft.com/.default'],
    });

    if (!result?.accessToken) {
      throw new Error('Failed to acquire Microsoft Graph access token.');
    }

    return result.accessToken;
  }

  async sendEmail(input: EmailSendRequest): Promise<IntegrationDeliveryResult> {
    ensureMessageContent(input);

    const accessToken = await this.getAccessToken();

    const message: Record<string, unknown> = {
      subject: input.subject,
      toRecipients: [{ emailAddress: { address: input.to } }],
    };

    const body: Record<string, unknown> = {};
    if (input.html) {
      body.contentType = 'HTML';
      body.content = input.html;
    } else if (input.text) {
      body.contentType = 'Text';
      body.content = input.text;
    }
    message.body = body;

    if (input.replyTo) {
      message.replyTo = [{ emailAddress: { address: input.replyTo } }];
    }

    const response = await this.fetchImpl(
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(this.config.senderEmail)}/sendMail`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, saveToSentItems: false }),
      },
    );

    if (!response.ok) {
      const responseBody = await response.text();
      this.logger.error('integration.email.send_failed', {
        provider: this.name,
        status: response.status,
        to: maskEmail(input.to),
      });
      throw new Error(`Graph API email send failed (${response.status}): ${responseBody.slice(0, 256)}`);
    }

    this.logger.info('integration.email.send', {
      provider: this.name,
      to: maskEmail(input.to),
      subject: input.subject,
    });

    return {
      accepted: true,
      provider: this.name,
      providerMessageId: `msgraph-${Date.now()}`,
    };
  }
}
