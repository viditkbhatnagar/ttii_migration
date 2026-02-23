import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

import type { Prisma, PrismaClient, users } from '@prisma/client';

import { getPrismaClient } from '../data/prisma-client.js';
import { env } from '../env.js';
import { createIntegrationRegistry } from '../integrations/registry.js';
import type { EmailProvider, IntegrationRegistry, OtpProvider } from '../integrations/contracts.js';
import { hashPassword, verifyPassword } from './password.js';
import { FixedWindowRateLimiter } from './rate-limit.js';
import { createSignedPasswordResetToken, validateSignedPasswordResetToken } from './reset-token.js';
import { resolveLegacyPortalPath } from './roles.js';
import { generateOpaqueAuthToken, sha256Hex } from './session-token.js';
import type { AuthContext, LegacyUserData, RequestMeta } from './types.js';
import { AuthError as AuthErrorClass } from './types.js';

const rateLimitWindowMs = env.AUTH_RATE_LIMIT_WINDOW_SECONDS * 1000;
const loginRateLimiter = new FixedWindowRateLimiter(rateLimitWindowMs);
const passwordResetRateLimiter = new FixedWindowRateLimiter(rateLimitWindowMs);
const otpRequestRateLimiter = new FixedWindowRateLimiter(rateLimitWindowMs);
const otpVerifyRateLimiter = new FixedWindowRateLimiter(rateLimitWindowMs);

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizePhone(value: string): string {
  return value.trim();
}

function toRateLimitKey(prefix: string, identifier: string, ipAddress?: string): string {
  return `${prefix}:${ipAddress ?? 'unknown'}:${identifier}`;
}

function isTruthyString(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function hexToBuffer(value: string): Buffer {
  return Buffer.from(value, 'hex');
}

function safeHexEqual(left: string, right: string): boolean {
  const leftBuffer = hexToBuffer(left);
  const rightBuffer = hexToBuffer(right);

  if (leftBuffer.length === 0 || rightBuffer.length === 0 || leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function toLegacyPasswordResetError(): AuthErrorClass {
  return new AuthErrorClass(400, 'Password reset link is invalid or has expired.', 'INVALID_RESET_TOKEN');
}

function toLegacyInvalidCredentialsError(): AuthErrorClass {
  return new AuthErrorClass(401, 'Invalid credentials.', 'INVALID_CREDENTIALS');
}

export function resetAuthRateLimitersForTests(): void {
  loginRateLimiter.clear();
  passwordResetRateLimiter.clear();
  otpRequestRateLimiter.clear();
  otpVerifyRateLimiter.clear();
}

export interface LoginInput extends RequestMeta {
  email?: string | undefined;
  phone?: string | undefined;
  countryCode?: string | undefined;
  password: string;
  roleId?: number | undefined;
  deviceId?: string | undefined;
}

export interface RegisterInput extends RequestMeta {
  phone: string;
  countryCode?: string | undefined;
  name: string;
  password: string;
}

export interface VerifyOtpInput extends RequestMeta {
  userId: number;
  otp: string;
  deviceId?: string | undefined;
  purpose?: string | undefined;
}

interface OtpIssueResult {
  userId: number;
  challengeId: number;
  otp?: string | undefined;
}

export interface AuthServiceDependencies {
  prisma?: PrismaClient;
  integrations?: Pick<IntegrationRegistry, 'email' | 'otp'>;
}

export class AuthService {
  private readonly prisma: PrismaClient;
  private readonly emailProvider: EmailProvider;
  private readonly otpProvider: OtpProvider;

  constructor(dependencies: AuthServiceDependencies = {}) {
    this.prisma = dependencies.prisma ?? getPrismaClient();

    const integrations = dependencies.integrations ?? createIntegrationRegistry();
    this.emailProvider = integrations.email;
    this.otpProvider = integrations.otp;
  }

  async authenticateAuthToken(token: string): Promise<AuthContext | null> {
    const tokenHash = sha256Hex(token);
    const now = new Date();

    const session = await this.prisma.auth_session.findFirst({
      where: {
        token_hash: tokenHash,
        revoked_at: null,
        expires_at: {
          gt: now,
        },
      },
      include: {
        users: true,
      },
    });

    if (!session) {
      return null;
    }

    if (session.users.deleted_at) {
      return null;
    }

    return {
      sessionId: session.id,
      tokenHash,
      user: session.users,
    };
  }

  async login(input: LoginInput): Promise<{
    userData: LegacyUserData;
    redirectPath: string;
    expiresAt: Date;
  }> {
    const identifier = isTruthyString(input.phone)
      ? normalizePhone(input.phone)
      : normalizeEmail(input.email ?? '');

    if (!identifier || !isTruthyString(input.password)) {
      throw new AuthErrorClass(400, 'Missing login credentials.', 'VALIDATION_ERROR');
    }

    const rateLimitKey = toRateLimitKey('login', identifier, input.ipAddress);
    const rateLimitResult = loginRateLimiter.consume(rateLimitKey, env.AUTH_LOGIN_RATE_LIMIT_MAX);
    if (!rateLimitResult.allowed) {
      await this.writeAuditLog({
        event: 'LOGIN_RATE_LIMITED',
        success: false,
        identifier,
        userId: null,
        requestMeta: input,
        details: {
          retry_after_seconds: rateLimitResult.retryAfterSeconds,
        },
      });

      throw new AuthErrorClass(429, 'Too many login attempts. Try again later.', 'RATE_LIMITED', {
        retry_after_seconds: rateLimitResult.retryAfterSeconds,
      });
    }

    const user = await this.findUserForLogin(input);
    if (!user || !isTruthyString(user.password)) {
      await this.writeAuditLog({
        event: 'LOGIN_FAILED',
        success: false,
        identifier,
        userId: user?.id ?? null,
        requestMeta: input,
      });
      throw toLegacyInvalidCredentialsError();
    }

    const passwordOk = await verifyPassword(input.password, user.password);
    if (!passwordOk) {
      await this.writeAuditLog({
        event: 'LOGIN_FAILED',
        success: false,
        identifier,
        userId: user.id,
        requestMeta: input,
      });
      throw toLegacyInvalidCredentialsError();
    }

    const now = new Date();
    const shouldUpdateDevice = isTruthyString(input.deviceId) && input.deviceId !== user.device_id;
    const shouldActivateUser = user.status === 0;

    if (shouldUpdateDevice || shouldActivateUser) {
      const updateData: Prisma.usersUpdateManyMutationInput = {
        updated_at: now,
      };

      if (shouldUpdateDevice) {
        updateData.device_id = input.deviceId ?? null;
      }

      if (shouldActivateUser) {
        updateData.status = 1;
      }

      await this.prisma.users.updateMany({
        where: {
          id: user.id,
          deleted_at: null,
        },
        data: updateData,
      });
    }

    const latestUser = (await this.prisma.users.findFirst({
      where: {
        id: user.id,
        deleted_at: null,
      },
    })) ?? user;

    const issuedSession = await this.createSession(latestUser.id, input);
    const userData = this.toLegacyUserData(latestUser, issuedSession.token);

    await this.writeAuditLog({
      event: 'LOGIN_SUCCESS',
      success: true,
      identifier,
      userId: latestUser.id,
      requestMeta: input,
      details: {
        role_id: latestUser.role_id,
        session_expires_at: issuedSession.expiresAt.toISOString(),
      },
    });

    return {
      userData,
      redirectPath: resolveLegacyPortalPath(latestUser.role_id),
      expiresAt: issuedSession.expiresAt,
    };
  }

  async logout(authToken: string | null | undefined, requestMeta: RequestMeta): Promise<void> {
    if (!isTruthyString(authToken)) {
      return;
    }

    const tokenHash = sha256Hex(authToken);
    const session = await this.prisma.auth_session.findFirst({
      where: {
        token_hash: tokenHash,
      },
      select: {
        user_id: true,
      },
    });

    const now = new Date();
    const updated = await this.prisma.auth_session.updateMany({
      where: {
        token_hash: tokenHash,
        revoked_at: null,
      },
      data: {
        revoked_at: now,
        revoked_reason: 'logout',
        updated_at: now,
      },
    });

    await this.writeAuditLog({
      event: 'LOGOUT',
      success: updated.count > 0,
      identifier: null,
      userId: session?.user_id ?? null,
      requestMeta,
    });
  }

  async requestPasswordReset(email: string, requestMeta: RequestMeta): Promise<{ token?: string }> {
    const normalizedEmail = normalizeEmail(email);
    if (!isTruthyString(normalizedEmail)) {
      throw new AuthErrorClass(400, 'Please enter your email.', 'VALIDATION_ERROR');
    }

    const rateLimitKey = toRateLimitKey('password_reset', normalizedEmail, requestMeta.ipAddress);
    const rateLimitResult = passwordResetRateLimiter.consume(
      rateLimitKey,
      env.AUTH_PASSWORD_RESET_RATE_LIMIT_MAX,
    );
    if (!rateLimitResult.allowed) {
      await this.writeAuditLog({
        event: 'PASSWORD_RESET_RATE_LIMITED',
        success: false,
        identifier: normalizedEmail,
        userId: null,
        requestMeta,
        details: {
          retry_after_seconds: rateLimitResult.retryAfterSeconds,
        },
      });

      throw new AuthErrorClass(429, 'Too many reset requests. Try again later.', 'RATE_LIMITED', {
        retry_after_seconds: rateLimitResult.retryAfterSeconds,
      });
    }

    const user = await this.prisma.users.findFirst({
      where: {
        deleted_at: null,
        OR: [{ email: normalizedEmail }, { user_email: normalizedEmail }],
      },
    });

    if (!user || !isTruthyString(user.password)) {
      await this.writeAuditLog({
        event: 'PASSWORD_RESET_REQUESTED',
        success: false,
        identifier: normalizedEmail,
        userId: user?.id ?? null,
        requestMeta,
      });

      return {};
    }

    const canonicalEmail = this.getCanonicalUserEmail(user);
    if (!isTruthyString(canonicalEmail)) {
      await this.writeAuditLog({
        event: 'PASSWORD_RESET_REQUESTED',
        success: false,
        identifier: normalizedEmail,
        userId: user.id,
        requestMeta,
      });

      return {};
    }

    const generated = createSignedPasswordResetToken({
      userId: user.id,
      email: canonicalEmail,
      currentPasswordHash: user.password,
      signingKey: env.PASSWORD_RESET_TOKEN_KEY,
      ttlSeconds: env.PASSWORD_RESET_TOKEN_TTL_SECONDS,
    });

    const now = new Date();
    await this.prisma.password_reset_token.create({
      data: {
        user_id: user.id,
        token_hash: sha256Hex(generated.token),
        created_at: now,
        updated_at: now,
        expires_at: generated.expiresAt,
        requested_ip: requestMeta.ipAddress ?? null,
        requested_user_agent: requestMeta.userAgent ?? null,
      },
    });

    try {
      await this.emailProvider.sendEmail({
        to: canonicalEmail,
        subject: 'TTII Password Reset Link',
        text: `Reset your password using this link: ${this.buildPasswordResetUrl(user.id, generated.token)}`,
      });
    } catch {
      await this.writeAuditLog({
        event: 'PASSWORD_RESET_DELIVERY_FAILED',
        success: false,
        identifier: normalizedEmail,
        userId: user.id,
        requestMeta,
      });

      throw new AuthErrorClass(
        502,
        'Unable to send password reset link at the moment. Please try again later.',
        'INTEGRATION_ERROR',
      );
    }

    await this.writeAuditLog({
      event: 'PASSWORD_RESET_REQUESTED',
      success: true,
      identifier: normalizedEmail,
      userId: user.id,
      requestMeta,
      details: {
        expires_at: generated.expiresAt.toISOString(),
      },
    });

    return env.NODE_ENV === 'production' ? {} : { token: generated.token };
  }

  async validatePasswordResetToken(userId: number, token: string): Promise<{ email: string }> {
    const state = await this.getValidPasswordResetState(userId, token);
    return {
      email: state.canonicalEmail,
    };
  }

  async updatePasswordWithResetToken(input: {
    userId: number;
    email: string;
    token: string;
    password: string;
    confirmPassword: string;
    requestMeta: RequestMeta;
  }): Promise<void> {
    if (!isTruthyString(input.password) || input.password.length < 8) {
      throw new AuthErrorClass(400, 'Password must be at least 8 characters long.', 'VALIDATION_ERROR');
    }

    if (input.password !== input.confirmPassword) {
      throw new AuthErrorClass(400, 'Password confirmation does not match.', 'VALIDATION_ERROR');
    }

    const state = await this.getValidPasswordResetState(input.userId, input.token);
    if (normalizeEmail(input.email) !== normalizeEmail(state.canonicalEmail)) {
      throw toLegacyPasswordResetError();
    }

    const newPasswordHash = await hashPassword(input.password);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      const usedToken = await tx.password_reset_token.updateMany({
        where: {
          id: state.tokenRecord.id,
          used_at: null,
        },
        data: {
          used_at: now,
          updated_at: now,
        },
      });

      if (usedToken.count !== 1) {
        throw toLegacyPasswordResetError();
      }

      await tx.users.updateMany({
        where: {
          id: state.user.id,
          deleted_at: null,
        },
        data: {
          password: newPasswordHash,
          updated_at: now,
        },
      });

      await tx.auth_session.updateMany({
        where: {
          user_id: state.user.id,
          revoked_at: null,
        },
        data: {
          revoked_at: now,
          revoked_reason: 'password_reset',
          updated_at: now,
        },
      });
    });

    await this.writeAuditLog({
      event: 'PASSWORD_RESET_COMPLETED',
      success: true,
      identifier: state.canonicalEmail,
      userId: state.user.id,
      requestMeta: input.requestMeta,
    });
  }

  async registerStudent(input: RegisterInput): Promise<{
    userId: number;
    studentId: string;
    otp?: string | undefined;
  }> {
    const normalizedPhone = normalizePhone(input.phone);
    const normalizedCountryCode = normalizePhone(input.countryCode ?? '');
    const normalizedName = input.name.trim();

    if (!isTruthyString(normalizedPhone)) {
      throw new AuthErrorClass(400, 'Phone number field is empty.', 'VALIDATION_ERROR');
    }

    if (!isTruthyString(normalizedName)) {
      throw new AuthErrorClass(400, 'Name field is empty.', 'VALIDATION_ERROR');
    }

    if (!isTruthyString(input.password) || input.password.length < 8) {
      throw new AuthErrorClass(400, 'Password must be at least 8 characters long.', 'VALIDATION_ERROR');
    }

    const phoneCandidates = this.phoneCandidates(normalizedPhone, normalizedCountryCode);
    const existing = await this.prisma.users.findFirst({
      where: {
        deleted_at: null,
        phone: {
          in: phoneCandidates,
        },
      },
    });

    if (existing) {
      throw new AuthErrorClass(409, 'Phone number Already Exist!', 'CONFLICT');
    }

    const now = new Date();
    const passwordHash = await hashPassword(input.password);
    const emailValue = `${normalizedCountryCode}${normalizedPhone}`.trim();

    const created = await this.prisma.users.create({
      data: {
        country_code: normalizedCountryCode || null,
        phone: normalizedPhone,
        email: isTruthyString(emailValue) ? emailValue : null,
        name: normalizedName,
        password: passwordHash,
        role_id: 2,
        status: 0,
        created_at: now,
        updated_at: now,
      },
    });

    const studentId = `TT0000${created.id}`;
    await this.prisma.users.updateMany({
      where: {
        id: created.id,
      },
      data: {
        student_id: studentId,
        updated_at: now,
      },
    });

    const otp = await this.issueOtpForUser(created, 'login', input);
    await this.writeAuditLog({
      event: 'REGISTER_SUCCESS',
      success: true,
      identifier: normalizedPhone,
      userId: created.id,
      requestMeta: input,
      details: {
        student_id: studentId,
        challenge_id: otp.challengeId,
      },
    });

    const response: {
      userId: number;
      studentId: string;
      otp?: string | undefined;
    } = {
      userId: created.id,
      studentId,
    };

    if (otp.otp) {
      response.otp = otp.otp;
    }

    return response;
  }

  async requestOtpForPhone(input: {
    phone: string;
    countryCode?: string | undefined;
    purpose?: string | undefined;
    requestMeta: RequestMeta;
  }): Promise<OtpIssueResult> {
    const normalizedPhone = normalizePhone(input.phone);
    const normalizedCountryCode = normalizePhone(input.countryCode ?? '');
    const purpose = input.purpose?.trim() || 'login';

    if (!isTruthyString(normalizedPhone)) {
      throw new AuthErrorClass(400, 'Phone number field is empty.', 'VALIDATION_ERROR');
    }

    const phoneCandidates = this.phoneCandidates(normalizedPhone, normalizedCountryCode);
    const limiterKey = toRateLimitKey('otp_request', phoneCandidates.join('|'), input.requestMeta.ipAddress);
    const rateLimitResult = otpRequestRateLimiter.consume(limiterKey, env.AUTH_OTP_REQUEST_RATE_LIMIT_MAX);
    if (!rateLimitResult.allowed) {
      await this.writeAuditLog({
        event: 'OTP_REQUEST_RATE_LIMITED',
        success: false,
        identifier: normalizedPhone,
        userId: null,
        requestMeta: input.requestMeta,
        details: {
          retry_after_seconds: rateLimitResult.retryAfterSeconds,
        },
      });

      throw new AuthErrorClass(429, 'Too many OTP requests. Try again later.', 'RATE_LIMITED', {
        retry_after_seconds: rateLimitResult.retryAfterSeconds,
      });
    }

    const user = await this.prisma.users.findFirst({
      where: {
        deleted_at: null,
        phone: {
          in: phoneCandidates,
        },
      },
    });

    if (!user) {
      await this.writeAuditLog({
        event: 'OTP_REQUEST_FAILED',
        success: false,
        identifier: normalizedPhone,
        userId: null,
        requestMeta: input.requestMeta,
      });
      throw new AuthErrorClass(404, 'User not found!', 'NOT_FOUND');
    }

    return this.issueOtpForUser(user, purpose, input.requestMeta);
  }

  async resendOtpForUser(userId: number, requestMeta: RequestMeta): Promise<OtpIssueResult> {
    const user = await this.prisma.users.findFirst({
      where: {
        id: userId,
        deleted_at: null,
      },
    });

    if (!user) {
      throw new AuthErrorClass(404, 'User not found!', 'NOT_FOUND');
    }

    return this.issueOtpForUser(user, 'login', requestMeta);
  }

  async verifyOtp(input: VerifyOtpInput): Promise<{ userData: LegacyUserData; redirectPath: string }> {
    const purpose = input.purpose?.trim() || 'login';
    const normalizedOtp = input.otp.trim();

    if (!Number.isInteger(input.userId) || input.userId <= 0 || !isTruthyString(normalizedOtp)) {
      throw new AuthErrorClass(400, 'Invalid OTP request.', 'VALIDATION_ERROR');
    }

    const rateLimitKey = toRateLimitKey('otp_verify', `${input.userId}:${purpose}`, input.ipAddress);
    const rateLimitResult = otpVerifyRateLimiter.consume(rateLimitKey, env.AUTH_OTP_VERIFY_RATE_LIMIT_MAX);
    if (!rateLimitResult.allowed) {
      await this.writeAuditLog({
        event: 'OTP_VERIFY_RATE_LIMITED',
        success: false,
        identifier: String(input.userId),
        userId: input.userId,
        requestMeta: input,
        details: {
          retry_after_seconds: rateLimitResult.retryAfterSeconds,
        },
      });

      throw new AuthErrorClass(429, 'Too many OTP verification attempts. Try again later.', 'RATE_LIMITED', {
        retry_after_seconds: rateLimitResult.retryAfterSeconds,
      });
    }

    const challenge = await this.prisma.otp_challenge.findFirst({
      where: {
        user_id: input.userId,
        purpose,
        used_at: null,
      },
      orderBy: {
        id: 'desc',
      },
    });

    if (!challenge || challenge.expires_at <= new Date()) {
      await this.writeAuditLog({
        event: 'OTP_VERIFY_FAILED',
        success: false,
        identifier: String(input.userId),
        userId: input.userId,
        requestMeta: input,
      });
      throw new AuthErrorClass(400, 'Invalid OTP!', 'INVALID_OTP');
    }

    if (challenge.attempt_count >= challenge.max_attempts) {
      await this.writeAuditLog({
        event: 'OTP_VERIFY_FAILED',
        success: false,
        identifier: String(input.userId),
        userId: input.userId,
        requestMeta: input,
      });
      throw new AuthErrorClass(429, 'OTP attempts exceeded.', 'OTP_ATTEMPTS_EXCEEDED');
    }

    const expectedOtpHash = this.hashOtp(challenge.user_id, challenge.purpose, normalizedOtp);
    if (!safeHexEqual(expectedOtpHash, challenge.otp_hash)) {
      await this.prisma.otp_challenge.updateMany({
        where: {
          id: challenge.id,
          used_at: null,
        },
        data: {
          attempt_count: challenge.attempt_count + 1,
          updated_at: new Date(),
        },
      });

      await this.writeAuditLog({
        event: 'OTP_VERIFY_FAILED',
        success: false,
        identifier: String(input.userId),
        userId: input.userId,
        requestMeta: input,
      });
      throw new AuthErrorClass(401, 'Invalid OTP!', 'INVALID_OTP');
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.otp_challenge.updateMany({
        where: {
          id: challenge.id,
          used_at: null,
        },
        data: {
          used_at: now,
          updated_at: now,
          attempt_count: challenge.attempt_count + 1,
        },
      });

      await tx.users.updateMany({
        where: {
          id: input.userId,
          deleted_at: null,
        },
        data: {
          ...(isTruthyString(input.deviceId) ? { device_id: input.deviceId } : {}),
          status: 1,
          updated_at: now,
        },
      });
    });

    const user = await this.prisma.users.findFirst({
      where: {
        id: input.userId,
        deleted_at: null,
      },
    });

    if (!user) {
      throw new AuthErrorClass(404, 'User not found!', 'NOT_FOUND');
    }

    const issuedSession = await this.createSession(user.id, input);
    const userData = this.toLegacyUserData(user, issuedSession.token);

    await this.writeAuditLog({
      event: 'OTP_VERIFY_SUCCESS',
      success: true,
      identifier: String(input.userId),
      userId: input.userId,
      requestMeta: input,
      details: {
        challenge_id: challenge.id,
      },
    });

    return {
      userData,
      redirectPath: resolveLegacyPortalPath(user.role_id),
    };
  }

  async logRbacDenied(input: {
    userId: number | null;
    requiredRoles: readonly number[];
    requestMeta: RequestMeta;
    path: string;
  }): Promise<void> {
    await this.writeAuditLog({
      event: 'RBAC_DENIED',
      success: false,
      identifier: null,
      userId: input.userId,
      requestMeta: input.requestMeta,
      details: {
        required_roles: input.requiredRoles,
        path: input.path,
      },
    });
  }

  async logAuthDenied(input: { requestMeta: RequestMeta; path: string; reason: string }): Promise<void> {
    await this.writeAuditLog({
      event: 'AUTH_DENIED',
      success: false,
      identifier: null,
      userId: null,
      requestMeta: input.requestMeta,
      details: {
        path: input.path,
        reason: input.reason,
      },
    });
  }

  private async findUserForLogin(input: LoginInput): Promise<users | null> {
    if (isTruthyString(input.phone)) {
      const phoneCandidates = this.phoneCandidates(input.phone, input.countryCode);
      return this.prisma.users.findFirst({
        where: {
          deleted_at: null,
          phone: {
            in: phoneCandidates,
          },
          ...(typeof input.roleId === 'number' ? { role_id: input.roleId } : {}),
        },
      });
    }

    const normalizedEmail = normalizeEmail(input.email ?? '');
    if (!isTruthyString(normalizedEmail)) {
      return null;
    }

    return this.prisma.users.findFirst({
      where: {
        deleted_at: null,
        OR: [{ email: normalizedEmail }, { user_email: normalizedEmail }],
        ...(typeof input.roleId === 'number' ? { role_id: input.roleId } : {}),
      },
    });
  }

  private async createSession(userId: number, requestMeta: RequestMeta): Promise<{ token: string; expiresAt: Date }> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + env.AUTH_SESSION_TTL_SECONDS * 1000);
    const token = generateOpaqueAuthToken();

    await this.prisma.auth_session.create({
      data: {
        user_id: userId,
        token_hash: sha256Hex(token),
        created_at: now,
        updated_at: now,
        expires_at: expiresAt,
        ip_address: requestMeta.ipAddress ?? null,
        user_agent: requestMeta.userAgent ?? null,
      },
    });

    return {
      token,
      expiresAt,
    };
  }

  private toLegacyUserData(user: users, authToken: string): LegacyUserData {
    return {
      user_id: user.id,
      student_id: user.student_id ?? '',
      user_name: user.name ?? '',
      role_id: user.role_id ?? '',
      course_id: user.course_id ?? '',
      auth_token: authToken,
      user_email: this.getCanonicalUserEmail(user),
      user_phone: user.phone ?? '',
      device_id: user.device_id ?? '',
      course_name: '',
      status: user.status,
      academic_year: '',
      user_image: '',
      privacy_policy: '/home/privacy_policy',
    };
  }

  private getCanonicalUserEmail(user: users): string {
    if (isTruthyString(user.user_email)) {
      return normalizeEmail(user.user_email);
    }

    if (isTruthyString(user.email)) {
      return normalizeEmail(user.email);
    }

    return '';
  }

  private async getValidPasswordResetState(
    userId: number,
    token: string,
  ): Promise<{ user: users; tokenRecord: { id: number }; canonicalEmail: string }> {
    if (!isTruthyString(token)) {
      throw toLegacyPasswordResetError();
    }

    const user = await this.prisma.users.findFirst({
      where: {
        id: userId,
        deleted_at: null,
      },
    });

    if (!user || !isTruthyString(user.password)) {
      throw toLegacyPasswordResetError();
    }

    const canonicalEmail = this.getCanonicalUserEmail(user);
    if (!isTruthyString(canonicalEmail)) {
      throw toLegacyPasswordResetError();
    }

    const validation = validateSignedPasswordResetToken({
      token,
      expectedUserId: user.id,
      expectedEmail: canonicalEmail,
      currentPasswordHash: user.password,
      signingKey: env.PASSWORD_RESET_TOKEN_KEY,
    });

    if (!validation.valid) {
      throw toLegacyPasswordResetError();
    }

    const tokenHash = sha256Hex(token);
    const tokenRecord = await this.prisma.password_reset_token.findFirst({
      where: {
        user_id: user.id,
        token_hash: tokenHash,
        used_at: null,
        expires_at: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
      },
    });

    if (!tokenRecord) {
      throw toLegacyPasswordResetError();
    }

    return {
      user,
      tokenRecord,
      canonicalEmail,
    };
  }

  private phoneCandidates(phone: string, countryCode?: string): string[] {
    const normalizedPhone = normalizePhone(phone);
    const normalizedCountryCode = normalizePhone(countryCode ?? '');
    const combined = `${normalizedCountryCode}${normalizedPhone}`.trim();
    const candidates = new Set<string>([normalizedPhone]);

    if (isTruthyString(combined)) {
      candidates.add(combined);
    }

    return Array.from(candidates);
  }

  private async issueOtpForUser(user: users, purpose: string, requestMeta: RequestMeta): Promise<OtpIssueResult> {
    const otp = this.generateOtp(env.OTP_LENGTH);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + env.OTP_TTL_SECONDS * 1000);

    const created = await this.prisma.otp_challenge.create({
      data: {
        user_id: user.id,
        purpose,
        delivery_target: (user.phone ?? this.getCanonicalUserEmail(user)) || null,
        otp_hash: this.hashOtp(user.id, purpose, otp),
        created_at: now,
        updated_at: now,
        expires_at: expiresAt,
        max_attempts: env.OTP_MAX_ATTEMPTS,
        requested_ip: requestMeta.ipAddress ?? null,
        requested_user_agent: requestMeta.userAgent ?? null,
      },
    });

    const deliveryTarget = created.delivery_target ?? user.phone ?? this.getCanonicalUserEmail(user);
    if (!isTruthyString(deliveryTarget)) {
      await this.prisma.otp_challenge.deleteMany({
        where: {
          id: created.id,
          used_at: null,
        },
      });

      await this.writeAuditLog({
        event: 'OTP_DELIVERY_FAILED',
        success: false,
        identifier: String(user.id),
        userId: user.id,
        requestMeta,
        details: {
          challenge_id: created.id,
          purpose,
          reason: 'missing_delivery_target',
        },
      });

      throw new AuthErrorClass(500, 'Unable to deliver OTP right now. Please try again.', 'INTEGRATION_ERROR');
    }

    try {
      await this.otpProvider.sendOtp({
        userId: user.id,
        target: deliveryTarget,
        otp,
        purpose,
        expiresAt,
      });
    } catch {
      await this.prisma.otp_challenge.deleteMany({
        where: {
          id: created.id,
          used_at: null,
        },
      });

      await this.writeAuditLog({
        event: 'OTP_DELIVERY_FAILED',
        success: false,
        identifier: deliveryTarget,
        userId: user.id,
        requestMeta,
        details: {
          challenge_id: created.id,
          purpose,
        },
      });

      throw new AuthErrorClass(502, 'Unable to deliver OTP right now. Please try again.', 'INTEGRATION_ERROR');
    }

    await this.writeAuditLog({
      event: 'OTP_ISSUED',
      success: true,
      identifier: deliveryTarget,
      userId: user.id,
      requestMeta,
      details: {
        challenge_id: created.id,
        purpose,
        expires_at: expiresAt.toISOString(),
      },
    });

    const response: OtpIssueResult = {
      userId: user.id,
      challengeId: created.id,
    };

    if (env.NODE_ENV !== 'production') {
      response.otp = otp;
    }

    return response;
  }

  private generateOtp(length: number): string {
    let otp = '';
    for (let i = 0; i < length; i += 1) {
      otp += String(randomInt(0, 10));
    }
    return otp;
  }

  private hashOtp(userId: number, purpose: string, otp: string): string {
    return createHmac('sha256', env.OTP_SIGNING_KEY)
      .update(`${userId}:${purpose}:${otp}`)
      .digest('hex');
  }

  private buildPasswordResetUrl(userId: number, token: string): string {
    const baseUrl = env.APP_BASE_URL.replace(/\/+$/, '');
    const encodedToken = encodeURIComponent(token);
    return `${baseUrl}/api/login/reset_password/${userId}?token=${encodedToken}`;
  }

  private async writeAuditLog(input: {
    event: string;
    success: boolean;
    userId: number | null;
    identifier: string | null;
    requestMeta: RequestMeta;
    details?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await this.prisma.auth_audit_log.create({
        data: {
          event: input.event,
          success: input.success ? 1 : 0,
          user_id: input.userId,
          identifier: input.identifier,
          ip_address: input.requestMeta.ipAddress ?? null,
          user_agent: input.requestMeta.userAgent ?? null,
          details: input.details ? JSON.stringify(input.details) : null,
          created_at: new Date(),
        },
      });
    } catch {
      // Audit logging must never block auth control paths.
    }
  }
}
