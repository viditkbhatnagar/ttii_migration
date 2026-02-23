import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { hashPassword } from '../../src/auth/password.js';
import { resetAuthRateLimitersForTests } from '../../src/auth/auth-service.js';
import { buildApp } from '../../src/app.js';
import { prisma, resetParityTables } from '../data/test-db.js';

describe('Phase 04 auth + RBAC + security parity', () => {
  const app = buildApp();

  beforeEach(async () => {
    resetAuthRateLimitersForTests();
    await resetParityTables();
  });

  afterAll(async () => {
    await app.close();
  });

  it('authenticates login, issues auth token, and resolves legacy role redirect', async () => {
    const passwordHash = await hashPassword('AdminPass#2026');

    await prisma.users.create({
      data: {
        name: 'Admin User',
        email: 'admin@example.test',
        role_id: 1,
        password: passwordHash,
        status: 0,
      },
    });

    const loginResponse = await app.inject({
      method: 'GET',
      url: '/api/login/index',
      query: {
        email: 'admin@example.test',
        password: 'AdminPass#2026',
        role_id: '1',
      },
    });

    const loginBody = loginResponse.json<{
      status: number;
      message: string;
      userdata: {
        auth_token: string;
      };
      data: {
        redirect_path: string;
      };
    }>();

    expect(loginResponse.statusCode).toBe(200);
    expect(loginBody.status).toBe(1);
    expect(loginBody.data.redirect_path).toBe('/admin/dashboard/index');
    expect(loginBody.userdata.auth_token.length).toBeGreaterThan(20);

    const meResponse = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      query: {
        auth_token: loginBody.userdata.auth_token,
      },
    });

    const meBody = meResponse.json<{ status: number; data: { role_id: number } }>();
    expect(meResponse.statusCode).toBe(200);
    expect(meBody.status).toBe(1);
    expect(meBody.data.role_id).toBe(1);
  });

  it('enforces legacy RBAC role boundaries and audits denied access', async () => {
    const passwordHash = await hashPassword('StudentPass#2026');

    await prisma.users.create({
      data: {
        name: 'Student User',
        user_email: 'student@example.test',
        role_id: 2,
        password: passwordHash,
        status: 1,
      },
    });

    const loginResponse = await app.inject({
      method: 'GET',
      url: '/api/login/index',
      query: {
        email: 'student@example.test',
        password: 'StudentPass#2026',
        role_id: '2',
      },
    });

    const token = loginResponse.json<{ userdata: { auth_token: string } }>().userdata.auth_token;

    const studentPortal = await app.inject({
      method: 'GET',
      url: '/api/auth/portal/student',
      query: { auth_token: token },
    });
    expect(studentPortal.statusCode).toBe(200);

    const adminPortal = await app.inject({
      method: 'GET',
      url: '/api/auth/portal/admin',
      query: { auth_token: token },
    });
    expect(adminPortal.statusCode).toBe(403);

    const deniedAudit = await prisma.auth_audit_log.findFirst({
      where: {
        event: 'RBAC_DENIED',
      },
      orderBy: {
        id: 'desc',
      },
    });

    expect(deniedAudit).not.toBeNull();
    expect(deniedAudit?.user_id).toBeGreaterThan(0);
  });

  it('uses signed, expiring, one-time password reset tokens and invalidates sessions after reset', async () => {
    const oldPassword = 'LegacyPass#2026';
    const newPassword = 'NewSecurePass#2026';
    const passwordHash = await hashPassword(oldPassword);

    const user = await prisma.users.create({
      data: {
        name: 'Reset User',
        user_email: 'reset@example.test',
        role_id: 2,
        password: passwordHash,
        status: 1,
      },
    });

    const forgotResponse = await app.inject({
      method: 'POST',
      url: '/api/login/forgot_password',
      payload: {
        email: 'reset@example.test',
      },
    });

    const forgotBody = forgotResponse.json<{ status: number; data: { reset_token?: string } }>();
    const resetToken = forgotBody.data.reset_token;

    expect(forgotResponse.statusCode).toBe(200);
    expect(forgotBody.status).toBe(1);
    expect(resetToken).toBeTruthy();

    const validateResponse = await app.inject({
      method: 'GET',
      url: `/api/login/reset_password/${user.id}`,
      query: {
        token: resetToken,
      },
    });
    expect(validateResponse.statusCode).toBe(200);

    const tamperedResponse = await app.inject({
      method: 'GET',
      url: `/api/login/reset_password/${user.id}`,
      query: {
        token: `${resetToken}tampered`,
      },
    });
    expect(tamperedResponse.statusCode).toBe(400);

    const updateResponse = await app.inject({
      method: 'POST',
      url: '/api/login/update_password',
      payload: {
        user_id: user.id,
        email: 'reset@example.test',
        reset_token: resetToken,
        password: newPassword,
        confirm_password: newPassword,
      },
    });

    expect(updateResponse.statusCode).toBe(200);

    const replayResponse = await app.inject({
      method: 'POST',
      url: '/api/login/update_password',
      payload: {
        user_id: user.id,
        email: 'reset@example.test',
        reset_token: resetToken,
        password: 'AnotherPass#2026',
        confirm_password: 'AnotherPass#2026',
      },
    });
    expect(replayResponse.statusCode).toBe(400);

    const oldLogin = await app.inject({
      method: 'GET',
      url: '/api/login/index',
      query: {
        email: 'reset@example.test',
        password: oldPassword,
      },
    });
    expect(oldLogin.statusCode).toBe(401);

    const newLogin = await app.inject({
      method: 'GET',
      url: '/api/login/index',
      query: {
        email: 'reset@example.test',
        password: newPassword,
      },
    });
    expect(newLogin.statusCode).toBe(200);

    const consumedToken = await prisma.password_reset_token.findFirst({
      where: {
        user_id: user.id,
      },
      orderBy: {
        id: 'desc',
      },
    });
    expect(consumedToken?.used_at).not.toBeNull();
  });

  it('issues OTP challenges and rejects bypass/invalid OTP attempts', async () => {
    const passwordHash = await hashPassword('OtpPass#2026');
    const user = await prisma.users.create({
      data: {
        name: 'OTP User',
        phone: '9990001111',
        role_id: 2,
        password: passwordHash,
        status: 0,
      },
    });

    const issueOtpResponse = await app.inject({
      method: 'GET',
      url: '/api/login/request_otp',
      query: {
        phone: '9990001111',
      },
    });

    const issueOtpBody = issueOtpResponse.json<{
      status: number;
      data: {
        otp?: string;
      };
    }>();

    expect(issueOtpResponse.statusCode).toBe(200);
    expect(issueOtpBody.status).toBe(1);
    expect(issueOtpBody.data.otp).toBeTruthy();

    const issuedOtp = issueOtpBody.data.otp ?? '';
    const wrongOtp = issuedOtp === '000000' ? '999999' : '000000';

    const wrongOtpResponse = await app.inject({
      method: 'GET',
      url: '/api/login/verify_otp',
      query: {
        user_id: String(user.id),
        otp: wrongOtp,
      },
    });
    expect(wrongOtpResponse.statusCode).toBe(401);

    const successResponse = await app.inject({
      method: 'GET',
      url: '/api/login/verify_otp',
      query: {
        user_id: String(user.id),
        otp: issuedOtp,
      },
    });
    expect(successResponse.statusCode).toBe(200);

    const replayResponse = await app.inject({
      method: 'GET',
      url: '/api/login/verify_otp',
      query: {
        user_id: String(user.id),
        otp: issuedOtp,
      },
    });
    expect(replayResponse.statusCode).toBe(400);

    const bypassOtpResponse = await app.inject({
      method: 'GET',
      url: '/api/login/verify_otp',
      query: {
        user_id: String(user.id),
        otp: '123456',
      },
    });
    expect(bypassOtpResponse.statusCode).toBe(400);
  });

  it('rate limits repeated failed login attempts and records auth audit trail', async () => {
    const passwordHash = await hashPassword('RateLimitPass#2026');

    await prisma.users.create({
      data: {
        name: 'Rate User',
        user_email: 'ratelimit@example.test',
        role_id: 2,
        password: passwordHash,
        status: 1,
      },
    });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await app.inject({
        method: 'GET',
        url: '/api/login/index',
        query: {
          email: 'ratelimit@example.test',
          password: 'WrongPass#2026',
        },
      });
      expect(response.statusCode).toBe(401);
    }

    const limitedResponse = await app.inject({
      method: 'GET',
      url: '/api/login/index',
      query: {
        email: 'ratelimit@example.test',
        password: 'WrongPass#2026',
      },
    });
    expect(limitedResponse.statusCode).toBe(429);

    const auditEntry = await prisma.auth_audit_log.findFirst({
      where: {
        event: 'LOGIN_RATE_LIMITED',
      },
      orderBy: {
        id: 'desc',
      },
    });

    expect(auditEntry).not.toBeNull();
    expect(auditEntry?.success).toBe(0);
  });

  it('supports both users.email and users.user_email identity fields for parity login', async () => {
    const adminPasswordHash = await hashPassword('EmailFieldPass#2026');
    const studentPasswordHash = await hashPassword('UserEmailFieldPass#2026');

    await prisma.users.create({
      data: {
        name: 'Admin Email Field',
        email: 'admin-field@example.test',
        role_id: 1,
        password: adminPasswordHash,
        status: 1,
      },
    });

    await prisma.users.create({
      data: {
        name: 'Student User Email Field',
        user_email: 'student-field@example.test',
        role_id: 2,
        password: studentPasswordHash,
        status: 1,
      },
    });

    const adminLogin = await app.inject({
      method: 'GET',
      url: '/api/login/index',
      query: {
        email: 'admin-field@example.test',
        password: 'EmailFieldPass#2026',
        role_id: '1',
      },
    });
    expect(adminLogin.statusCode).toBe(200);

    const studentLogin = await app.inject({
      method: 'GET',
      url: '/api/login/index',
      query: {
        email: 'student-field@example.test',
        password: 'UserEmailFieldPass#2026',
        role_id: '2',
      },
    });
    expect(studentLogin.statusCode).toBe(200);
  });
});
