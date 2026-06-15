import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { AuthService } from '../auth/auth-service.js';
import { extractAuthToken, requireLegacyAuth, requireLegacyRoles } from '../auth/middleware.js';
import {
  ADMIN_PORTAL_SURFACE_ROLES,
  CENTRE_PORTAL_ROLES,
  COUNSELLOR_PORTAL_ROLES,
  INSTRUCTOR_PORTAL_ROLES,
  LEGACY_ROLE,
  resolveLegacyPortalPath,
} from '../auth/roles.js';
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
          userId: toNumber(payload.user_id),
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

  // After the upfront "Login As" dropdown was removed, the client posts
  // email + password here first. Server validates and returns the user
  // records that match (one per user row, so multi-account emails get
  // disambiguated by name in the picker too). The client either logs
  // straight in (single match) or shows a picker (multiple matches).
  app.post('/login/resolve_roles', async (request, reply) => {
    try {
      const payload = requestPayload(request);
      const email = toStringValue(payload.email) ?? '';
      const password = toStringValue(payload.password) ?? '';
      const meta = requestMeta(request);
      const candidates = await authService.resolveLoginCandidates({
        email, password,
        ...(meta.ipAddress ? { ipAddress: meta.ipAddress } : {}),
        ...(meta.userAgent ? { userAgent: meta.userAgent } : {}),
      });
      reply.code(200).send({
        status: 1,
        // Keep role_ids for backward-compat (older clients consume just this).
        role_ids: Array.from(new Set(candidates.map((c) => c.role_id))),
        candidates,
      });
    } catch (error: unknown) {
      sendAuthError(reply, error);
    }
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

  /* ──────────────────────────────────────────────────────────────────
     OTP-based forgot password (used by the new Figma flow on web)
     POST /auth/forgot_password   { email }            → send 6-digit OTP
     POST /auth/verify_otp        { email, otp }       → return reset token
     POST /auth/reset_password    { email, reset_token, new_password }
     ────────────────────────────────────────────────────────────────── */

  app.post('/auth/forgot_password', async (request, reply) => {
    const payload = requestPayload(request);
    const email = toStringValue(payload.email) ?? '';
    const roleIdRaw = Number(payload.role_id);
    const roleId = Number.isFinite(roleIdRaw) && roleIdRaw > 0 ? roleIdRaw : undefined;

    try {
      const result = await authService.sendForgotPasswordOtp(email, requestMeta(request), roleId);
      reply.code(200).send({
        status: 1,
        message: 'If an account exists for that email, an OTP has been sent.',
        data: {
          masked_email: result.maskedEmail,
          expires_in: result.expiresInSeconds,
        },
      });
    } catch (error: unknown) {
      sendAuthError(reply, error);
    }
  });

  app.post('/auth/verify_otp', async (request, reply) => {
    const payload = requestPayload(request);
    const email = toStringValue(payload.email) ?? '';
    const otp = toStringValue(payload.otp) ?? '';
    const roleIdRaw = Number(payload.role_id);
    const roleId = Number.isFinite(roleIdRaw) && roleIdRaw > 0 ? roleIdRaw : undefined;

    try {
      const result = await authService.verifyForgotPasswordOtp(email, otp, requestMeta(request), roleId);
      reply.code(200).send({
        status: 1,
        message: 'OTP verified successfully.',
        data: {
          reset_token: result.resetToken,
        },
      });
    } catch (error: unknown) {
      sendAuthError(reply, error);
    }
  });

  app.post('/auth/reset_password', async (request, reply) => {
    const payload = requestPayload(request);
    const email = toStringValue(payload.email) ?? '';
    const resetToken = toStringValue(payload.reset_token) ?? '';
    const newPassword = toStringValue(payload.new_password) ?? '';
    const roleIdRaw = Number(payload.role_id);
    const roleId = Number.isFinite(roleIdRaw) && roleIdRaw > 0 ? roleIdRaw : undefined;

    try {
      await authService.resetPasswordWithSignedToken({
        email,
        resetToken,
        newPassword,
        requestMeta: requestMeta(request),
        ...(roleId !== undefined ? { roleId } : {}),
      });
      reply.code(200).send({
        status: 1,
        message: 'Password reset successfully.',
        data: {},
      });
    } catch (error: unknown) {
      sendAuthError(reply, error);
    }
  });

  app.get('/login/reset_password/:userId', async (request, reply) => {
    const params = request.params as { userId?: string };
    const query = request.query as { token?: string };
    const userId = toStringValue(params.userId);
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
      const userId = toStringValue(payload.user_id);
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

      const issued = await authService.resendOtpForUser(String(authContext.user.id), requestMeta(request));
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
      const userId = toStringValue(payload.user_id);
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

  /* ─── SSO (Sign in with Google / Microsoft) ─────────────────────
     Student-only per Naji 2026-05-06. The frontend asks /auth/sso/config
     up front to know which buttons to render — keeps the buttons hidden
     when the IdP apps aren't registered yet.
     ───────────────────────────────────────────────────────────── */

  app.get('/auth/sso/config', async (_request, reply) => {
    const cfg = authService.isSsoConfigured();
    reply.code(200).send({
      status: 1,
      message: 'success',
      data: {
        google_enabled: cfg.google,
        microsoft_enabled: cfg.microsoft,
      },
    });
  });

  app.post('/auth/sso/google', async (request, reply) => {
    const payload = requestPayload(request);
    const idToken = toStringValue(payload.id_token) ?? toStringValue(payload.credential);
    try {
      const result = await authService.loginWithGoogleIdToken(idToken ?? '', requestMeta(request));
      reply.code(200).send({
        status: 1,
        message: 'Login Successfully!',
        userdata: result.userData,
        data: {
          redirect_path: result.redirectPath,
          session_expires_at: result.expiresAt.toISOString(),
          requires_profile_completion: result.requiresProfileCompletion,
        },
      });
    } catch (error: unknown) {
      sendAuthError(reply, error);
    }
  });

  app.get('/auth/sso/microsoft/start', async (request, reply) => {
    try {
      const { url } = await authService.getMicrosoftAuthorizationUrl();
      reply.redirect(url);
    } catch (error: unknown) {
      sendAuthError(reply, error);
    }
  });

  // After Microsoft authenticates, the IdP redirects back here with
  // ?code=… and ?state=…. We exchange the code for an ID token,
  // upsert the student, mint a legacy session, then 302 the browser
  // to the student portal root with ?auth_token=… so the React shell
  // can store it in localStorage and proceed. `requires_profile=1`
  // signals the post-signup phone-collection modal.
  app.get('/auth/sso/microsoft/callback', async (request, reply) => {
    const payload = requestPayload(request);
    const code = toStringValue(payload.code);
    const state = toStringValue(payload.state);
    const errorParam = toStringValue(payload.error);
    const errorDescription = toStringValue(payload.error_description);

    const portalRoot = 'https://learn.teachersindia.in/';
    if (errorParam) {
      const target = new URL(portalRoot);
      target.searchParams.set('sso_error', errorDescription ?? errorParam);
      reply.redirect(target.toString());
      return;
    }

    try {
      const result = await authService.loginWithMicrosoftAuthCode(
        code ?? '',
        state ?? '',
        requestMeta(request),
      );
      const target = new URL(portalRoot);
      target.searchParams.set('auth_token', result.userData.auth_token);
      target.searchParams.set('user_id', result.userData.user_id);
      target.searchParams.set('role_id', String(result.userData.role_id));
      if (result.requiresProfileCompletion) {
        target.searchParams.set('requires_profile', '1');
      }
      reply.redirect(target.toString());
    } catch (error: unknown) {
      const target = new URL(portalRoot);
      const message =
        error instanceof AuthError ? error.message : 'Microsoft sign-in failed.';
      target.searchParams.set('sso_error', message);
      reply.redirect(target.toString());
    }
  });

  app.get('/auth/me', { preHandler: [requireAuth] }, async (request, reply) => {
    const authContext = request.authContext;
    if (!authContext) {
      throw new AuthError(401, 'User not authenticated!', 'UNAUTHORIZED');
    }

    const user = authContext.user;
    // Surface display fields so the admin navbar can greet by name + role
    // without an extra round trip (Naji 2026-04-30).
    reply.code(200).send({
      status: 1,
      message: 'success',
      data: {
        user_id: user.id,
        role_id: user.role_id,
        name: user.name ?? '',
        email: user.user_email ?? user.email ?? '',
        image: user.image ?? user.profile_picture ?? '',
      },
    });
  });

  // ─── Post-login role switcher ──────────────────────────────────────
  // GET /auth/my_roles  → the roles this authenticated session may switch
  // into (the login-verified same-email set). The frontend filters these to
  // the current subdomain's surfaces and only renders a switcher when more
  // than one same-subdomain role exists.
  app.get('/auth/my_roles', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const authContext = request.authContext;
      if (!authContext) {
        throw new AuthError(401, 'User not authenticated!', 'UNAUTHORIZED');
      }

      const roles = await authService.getSwitchableRoles(authContext);
      reply.code(200).send({
        status: 1,
        message: 'success',
        data: { roles },
      });
    } catch (error: unknown) {
      sendAuthError(reply, error);
    }
  });

  // POST /auth/switch_role { user_id } → re-issue a session for the target
  // role (which MUST be in the session's login-verified set) and return a
  // login-shaped payload so the frontend reuses its session-persist logic.
  app.post('/auth/switch_role', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const authContext = request.authContext;
      if (!authContext) {
        throw new AuthError(401, 'User not authenticated!', 'UNAUTHORIZED');
      }

      const payload = requestPayload(request);
      const targetUserId = toNumber(payload.user_id);
      if (targetUserId === undefined) {
        throw new AuthError(400, 'Missing target role.', 'VALIDATION_ERROR');
      }

      const result = await authService.switchRole(authContext, targetUserId, requestMeta(request));
      reply.code(200).send({
        status: 1,
        message: 'Role switched',
        userdata: result.userData,
        data: {
          redirect_path: resolveLegacyPortalPath(result.roleId),
          session_expires_at: result.expiresAt.toISOString(),
        },
      });
    } catch (error: unknown) {
      sendAuthError(reply, error);
    }
  });

  app.get(
    '/auth/portal/admin',
    {
      preHandler: [requireAuth, requireLegacyRoles(authService, ADMIN_PORTAL_SURFACE_ROLES)],
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
      preHandler: [requireAuth, requireLegacyRoles(authService, CENTRE_PORTAL_ROLES)],
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

  app.get(
    '/auth/portal/instructor',
    {
      preHandler: [requireAuth, requireLegacyRoles(authService, INSTRUCTOR_PORTAL_ROLES)],
    },
    async (_request, reply) => {
      reply.code(200).send({
        status: 1,
        message: 'Instructor surface access granted.',
        data: {},
      });
    },
  );

  app.get(
    '/auth/portal/counsellor',
    {
      preHandler: [requireAuth, requireLegacyRoles(authService, COUNSELLOR_PORTAL_ROLES)],
    },
    async (_request, reply) => {
      reply.code(200).send({
        status: 1,
        message: 'Counsellor surface access granted.',
        data: {},
      });
    },
  );
}
