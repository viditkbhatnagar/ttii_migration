import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { AuthService } from '../auth/auth-service.js';
import { extractAuthToken, requireLegacyAuth, requireLegacyRoles } from '../auth/middleware.js';
import { ADMIN_PORTAL_ROLES, LEGACY_ROLE } from '../auth/roles.js';
import { AuthError, type RequestMeta } from '../auth/types.js';

interface RegisterAuthRoutesOptions {
  authService?: AuthService;
  [key: string]: unknown;
}

function requestMeta(request: FastifyRequest): RequestMeta {
  const meta: RequestMeta = {
    ipAddress: request.ip,
  };

  if (typeof request.headers['user-agent'] === 'string') {
    meta.userAgent = request.headers['user-agent'];
  }

  return meta;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function toStringValue(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
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

function sendAuthError(reply: FastifyReply, error: unknown): void {
  if (error instanceof AuthError) {
    reply.code(error.statusCode).send({
      status: 0,
      message: error.message,
      data: error.data,
    });
    return;
  }

  reply.code(500).send({
    status: 0,
    message: 'Internal auth error.',
    data: {},
  });
}

export function registerAuthRoutes(app: FastifyInstance, options: RegisterAuthRoutesOptions = {}): void {
  const authService = options.authService ?? new AuthService();
  const requireAuth = requireLegacyAuth(authService);

  app.route({
    method: ['GET', 'POST'],
    url: '/login/index',
    handler: async (request, reply) => {
      const payload = requestPayload(request);

      try {
        const result = await authService.login({
          email: toStringValue(payload.email),
          phone: toStringValue(payload.phone),
          countryCode: toStringValue(payload.code) ?? toStringValue(payload.country_code),
          password: toStringValue(payload.password) ?? '',
          roleId: toNumber(payload.role_id),
          deviceId: toStringValue(payload.device_id),
          ...requestMeta(request),
        });

        reply.code(200).send({
          status: 1,
          message: 'Login Successfully!',
          userdata: result.userData,
          data: {
            redirect_path: result.redirectPath,
            session_expires_at: result.expiresAt.toISOString(),
          },
        });
      } catch (error: unknown) {
        sendAuthError(reply, error);
      }
    },
  });

  app.route({
    method: ['GET', 'POST'],
    url: '/login/logout',
    handler: async (request, reply) => {
      try {
        await authService.logout(extractAuthToken(request), requestMeta(request));
        reply.code(200).send({
          status: 1,
          message: 'Logout successful.',
          data: {
            log_out_link: '/login/index',
          },
        });
      } catch (error: unknown) {
        sendAuthError(reply, error);
      }
    },
  });

  app.post('/login/forgot_password', async (request, reply) => {
    const payload = requestPayload(request);
    const email = toStringValue(payload.email) ?? '';

    try {
      const result = await authService.requestPasswordReset(email, requestMeta(request));
      reply.code(200).send({
        status: 1,
        message: 'If the account exists, a reset link has been issued.',
        data: {
          ...(result.token ? { reset_token: result.token } : {}),
        },
      });
    } catch (error: unknown) {
      sendAuthError(reply, error);
    }
  });

  app.get('/login/reset_password/:userId', async (request, reply) => {
    const params = request.params as { userId?: string };
    const query = request.query as { token?: string };
    const userId = toNumber(params.userId);
    const token = toStringValue(query.token);

    try {
      if (!userId || !token) {
        throw new AuthError(400, 'Password reset link is invalid or has expired.', 'INVALID_RESET_TOKEN');
      }

      const result = await authService.validatePasswordResetToken(userId, token);
      reply.code(200).send({
        status: 1,
        message: 'Password reset link is valid.',
        data: {
          user_id: userId,
          email: result.email,
          reset_token: token,
        },
      });
    } catch (error: unknown) {
      sendAuthError(reply, error);
    }
  });

  app.post('/login/update_password', async (request, reply) => {
    const payload = requestPayload(request);

    try {
      const userId = toNumber(payload.user_id);
      if (!userId) {
        throw new AuthError(400, 'Unable to update password.', 'VALIDATION_ERROR');
      }

      await authService.updatePasswordWithResetToken({
        userId,
        email: toStringValue(payload.email) ?? '',
        token: toStringValue(payload.reset_token) ?? '',
        password: toStringValue(payload.password) ?? '',
        confirmPassword: toStringValue(payload.confirm_password) ?? '',
        requestMeta: requestMeta(request),
      });

      reply.code(200).send({
        status: 1,
        message: 'Password updated successfully',
        data: {},
      });
    } catch (error: unknown) {
      sendAuthError(reply, error);
    }
  });

  app.get('/login/register', async (request, reply) => {
    const payload = requestPayload(request);

    try {
      const result = await authService.registerStudent({
        phone: toStringValue(payload.phone) ?? '',
        countryCode: toStringValue(payload.code),
        name: toStringValue(payload.name) ?? '',
        password: toStringValue(payload.password) ?? '',
        ...requestMeta(request),
      });

      reply.code(200).send({
        status: 1,
        message: 'User Registered',
        data: {
          user_id: result.userId,
          student_id: result.studentId,
          ...(result.otp ? { otp: result.otp } : {}),
        },
      });
    } catch (error: unknown) {
      sendAuthError(reply, error);
    }
  });

  app.route({
    method: ['GET', 'POST'],
    url: '/login/request_otp',
    handler: async (request, reply) => {
      const payload = requestPayload(request);

      try {
        const issued = await authService.requestOtpForPhone({
          phone: toStringValue(payload.phone) ?? '',
          countryCode: toStringValue(payload.code) ?? toStringValue(payload.country_code),
          purpose: toStringValue(payload.purpose),
          requestMeta: requestMeta(request),
        });

        reply.code(200).send({
          status: 1,
          message: 'OTP Send Successfully!',
          data: {
            user_id: issued.userId,
            challenge_id: issued.challengeId,
            ...(issued.otp ? { otp: issued.otp } : {}),
          },
        });
      } catch (error: unknown) {
        sendAuthError(reply, error);
      }
    },
  });

  app.get('/login/resend_otp', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const authContext = request.authContext;
      if (!authContext) {
        throw new AuthError(401, 'User not authenticated!', 'UNAUTHORIZED');
      }

      const issued = await authService.resendOtpForUser(authContext.user.id, requestMeta(request));
      reply.code(200).send({
        status: 1,
        message: 'OTP Send Successfully!',
        data: {
          user_id: issued.userId,
          challenge_id: issued.challengeId,
          ...(issued.otp ? { otp: issued.otp } : {}),
        },
      });
    } catch (error: unknown) {
      sendAuthError(reply, error);
    }
  });

  app.get('/login/verify_otp', async (request, reply) => {
    const payload = requestPayload(request);

    try {
      const userId = toNumber(payload.user_id);
      if (!userId) {
        throw new AuthError(400, 'Invalid OTP request.', 'VALIDATION_ERROR');
      }

      const result = await authService.verifyOtp({
        userId,
        otp: toStringValue(payload.otp) ?? '',
        deviceId: toStringValue(payload.device_id),
        purpose: toStringValue(payload.purpose),
        ...requestMeta(request),
      });

      reply.code(200).send({
        status: 1,
        message: 'OTP Verified Successfully!',
        userdata: result.userData,
        data: {
          redirect_path: result.redirectPath,
        },
      });
    } catch (error: unknown) {
      sendAuthError(reply, error);
    }
  });

  app.get('/auth/me', { preHandler: [requireAuth] }, async (request, reply) => {
    const authContext = request.authContext;
    if (!authContext) {
      throw new AuthError(401, 'User not authenticated!', 'UNAUTHORIZED');
    }

    const user = authContext.user;
    reply.code(200).send({
      status: 1,
      message: 'success',
      data: {
        user_id: user.id,
        role_id: user.role_id,
      },
    });
  });

  app.get(
    '/auth/portal/admin',
    {
      preHandler: [requireAuth, requireLegacyRoles(authService, ADMIN_PORTAL_ROLES)],
    },
    async (_request, reply) => {
      reply.code(200).send({
        status: 1,
        message: 'Admin surface access granted.',
        data: {},
      });
    },
  );

  app.get(
    '/auth/portal/centre',
    {
      preHandler: [requireAuth, requireLegacyRoles(authService, [LEGACY_ROLE.CENTRE])],
    },
    async (_request, reply) => {
      reply.code(200).send({
        status: 1,
        message: 'Centre surface access granted.',
        data: {},
      });
    },
  );

  app.get(
    '/auth/portal/student',
    {
      preHandler: [requireAuth, requireLegacyRoles(authService, [LEGACY_ROLE.STUDENT])],
    },
    async (_request, reply) => {
      reply.code(200).send({
        status: 1,
        message: 'Student surface access granted.',
        data: {},
      });
    },
  );
}
