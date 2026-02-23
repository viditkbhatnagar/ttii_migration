import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { hashPassword } from '../../src/auth/password.js';
import { buildApp } from '../../src/app.js';
import { MockOpenAiProvider } from '../../src/integrations/openai-provider.js';
import { MockPaymentGateway } from '../../src/integrations/payment-gateway.js';
import { NoopZoomProvider } from '../../src/integrations/zoom-provider.js';
import type {
  EmailSendRequest,
  IntegrationRegistry,
  OtpDispatchRequest,
  StorageDeleteRequest,
  StorageSignedDownloadRequest,
  StorageUploadRequest,
  StorageUploadResult,
} from '../../src/integrations/contracts.js';
import { prisma, resetParityTables } from '../data/test-db.js';

const emailCalls: EmailSendRequest[] = [];
const otpCalls: OtpDispatchRequest[] = [];

const integrations: IntegrationRegistry = {
  email: {
    name: 'test-email',
    sendEmail(input) {
      emailCalls.push(input);
      return Promise.resolve({
        accepted: true,
        provider: 'test-email',
        providerMessageId: `email-${emailCalls.length}`,
      });
    },
  },
  otp: {
    name: 'test-otp',
    sendOtp(input) {
      otpCalls.push(input);
      return Promise.resolve({
        accepted: true,
        provider: 'test-otp',
        providerMessageId: `otp-${otpCalls.length}`,
      });
    },
  },
  storage: {
    name: 'test-storage',
    uploadObject(input: StorageUploadRequest): Promise<StorageUploadResult> {
      return Promise.resolve({
        key: input.key,
        provider: 'test-storage',
        location: `memory://objects/${encodeURIComponent(input.key)}`,
      });
    },
    deleteObject(input: StorageDeleteRequest): Promise<void> {
      void input;
      return Promise.resolve();
    },
    createSignedDownloadUrl(input: StorageSignedDownloadRequest): Promise<string> {
      return Promise.resolve(`memory://download/${encodeURIComponent(input.key)}?ttl=${input.expiresInSeconds}`);
    },
  },
  payment: new MockPaymentGateway(),
  zoom: new NoopZoomProvider(),
  openai: new MockOpenAiProvider(),
};

describe('auth integration wiring', () => {
  const app = buildApp({ integrations });

  beforeEach(async () => {
    emailCalls.length = 0;
    otpCalls.length = 0;
    await resetParityTables();
  });

  afterAll(async () => {
    await app.close();
  });

  it('routes forgot-password delivery through the email provider interface', async () => {
    const passwordHash = await hashPassword('ResetPass#2026');
    await prisma.users.create({
      data: {
        name: 'Reset Integration User',
        email: 'reset.integration@example.test',
        role_id: 2,
        password: passwordHash,
        status: 1,
      },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/login/forgot_password',
      payload: {
        email: 'reset.integration@example.test',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(emailCalls).toHaveLength(1);
    expect(emailCalls[0]?.to).toBe('reset.integration@example.test');
    expect(emailCalls[0]?.subject).toContain('Password Reset');
  });

  it('routes OTP dispatch through the OTP provider interface', async () => {
    const passwordHash = await hashPassword('OtpPass#2026');
    const user = await prisma.users.create({
      data: {
        name: 'OTP Integration User',
        phone: '9000011111',
        role_id: 2,
        password: passwordHash,
        status: 1,
      },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/login/request_otp',
      query: {
        phone: '9000011111',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(otpCalls).toHaveLength(1);
    expect(otpCalls[0]?.userId).toBe(user.id);
    expect(otpCalls[0]?.target).toBe('9000011111');
    expect(otpCalls[0]?.purpose).toBe('login');
  });
});
