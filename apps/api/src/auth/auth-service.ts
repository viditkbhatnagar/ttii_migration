import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

import { ConfidentialClientApplication } from '@azure/msal-node';
import type { Prisma, PrismaClient, users } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';

import { getPrismaClient } from '../data/prisma-client.js';
import { env } from '../env.js';
import { createIntegrationRegistry } from '../integrations/registry.js';
import type { EmailProvider, IntegrationRegistry, OtpProvider } from '../integrations/contracts.js';
import { hashPassword, verifyPassword } from './password.js';
import { FixedWindowRateLimiter } from './rate-limit.js';
import { createSignedPasswordResetToken, validateSignedPasswordResetToken } from './reset-token.js';
import { resolveLegacyPortalPath } from './roles.js';
import { nextSessionExpiry } from './session-sliding.js';
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

// Naji UAT 2026-05-21 — Adeeb's mobile-app harness POSTed an unrendered
// template to /login/register and we saved literal "$name" and "$phone"
// strings as a real student. Reject anything that smells like a template
// placeholder so future test calls fail loudly instead of leaving ghost
// users behind. Pattern matches `$foo`, `${foo}`, `{{foo}}`, `<foo>`,
// `[foo]`, `%foo%`, and anything containing those structural chars.
const TEMPLATE_PLACEHOLDER_REGEX = /[$<>{}[\]%`|\\]|^\s*\{\{.*\}\}\s*$/;

function looksLikeTemplate(value: string | null | undefined): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed === '') return false;
  return TEMPLATE_PLACEHOLDER_REGEX.test(trimmed);
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
  // Optional explicit user row id — the post-password picker uses this to
  // disambiguate when an email maps to multiple user rows (legacy schema
  // shares one email across separate student records for different
  // courses). When set, findUserForLogin targets that exact row.
  userId?: number | undefined;
  deviceId?: string | undefined;
}

export interface RegisterInput extends RequestMeta {
  phone: string;
  countryCode?: string | undefined;
  name: string;
  password: string;
}

export interface VerifyOtpInput extends RequestMeta {
  userId: string;
  otp: string;
  deviceId?: string | undefined;
  purpose?: string | undefined;
}

interface OtpIssueResult {
  userId: string;
  challengeId: string;
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
    });

    if (!session) {
      return null;
    }

    const user = await this.prisma.users.findUnique({
      where: { id: session.user_id },
    });

    if (!user || user.deleted_at) {
      return null;
    }

    await this.slideSessionExpiry(session.id, session.expires_at, now);

    return {
      sessionId: String(session.id),
      tokenHash,
      user,
      linkedUserIds: this.parseLinkedUserIds(session.linked_user_ids, user.id),
    };
  }

  /**
   * Naji UAT 2026-08-11 — an active session earns more time (see
   * session-sliding.ts for the full why). A student mid-exam autosaves every
   * ~25s, so their session now never reaches the hard 1h wall that 401ed two
   * of them fifteen minutes before their paper ended.
   *
   * Deliberately NOT a bump of AUTH_SESSION_TTL_SECONDS: that would weaken
   * every session in the product to fix one flow. An idle session still dies
   * on schedule; only a session that is being used stays alive.
   *
   * The WHERE clause re-asserts validity, so even if this row expired or was
   * revoked between the read above and this write, the update matches nothing
   * and the session stays dead. Best-effort: a failed extension must never
   * turn an otherwise-good request into a 401, so it is swallowed — the
   * session simply keeps its existing expiry.
   */
  private async slideSessionExpiry(
    sessionId: number,
    currentExpiresAt: Date,
    now: Date,
  ): Promise<void> {
    const extendedTo = nextSessionExpiry(currentExpiresAt, now, env.AUTH_SESSION_TTL_SECONDS);
    if (!extendedTo) {
      return;
    }

    try {
      await this.prisma.auth_session.updateMany({
        where: {
          id: sessionId,
          revoked_at: null,
          expires_at: { gt: now },
        },
        data: {
          expires_at: extendedTo,
          updated_at: now,
        },
      });
    } catch {
      /* best-effort — never fail authentication because the slide failed */
    }
  }

  // Parse the persisted JSON array of switchable user ids. Falls back to
  // `[fallbackUserId]` (the session's own user) when the column is null,
  // unparseable, empty, or doesn't already contain the current user — so
  // an old session (created before this column existed) can still at least
  // "switch" to itself and never gains access to a row it didn't earn.
  private parseLinkedUserIds(raw: string | null | undefined, fallbackUserId: number): number[] {
    const result = new Set<number>([fallbackUserId]);

    if (isTruthyString(raw)) {
      try {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const value of parsed) {
            if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
              result.add(value);
            }
          }
        }
      } catch {
        // Malformed JSON → fall back to the session's own user only.
      }
    }

    return Array.from(result);
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

    // Naji UAT 2026-05-13 — admin can toggle any user (Student / Admin /
    // Counsellor / Associate / Instructor / Centre) on or off. Disabled
    // accounts set users.disabled_at; the gate below blocks login
    // regardless of role. Separately, status=0 for non-students remains
    // a pre-existing "deactivated" flag (kept for backwards-compat).
    if (user.disabled_at) {
      await this.writeAuditLog({
        event: 'LOGIN_BLOCKED_DISABLED',
        success: false,
        identifier,
        userId: user.id,
        requestMeta: input,
      });
      throw new AuthErrorClass(
        403,
        'Your account has been disabled. Please contact your administrator.',
        'ACCOUNT_DISABLED',
      );
    }

    // Block sign-in for admin-side users explicitly deactivated (status=0)
    // by an admin via the user-management toggle (Naji 2026-04-30). Students
    // (role 2) keep the legacy "auto-activate on first login" semantics
    // since their onboarding flow uses status=0 as a "pending verification"
    // marker.
    if (user.status === 0 && user.role_id !== null && user.role_id !== 2) {
      await this.writeAuditLog({
        event: 'LOGIN_BLOCKED_INACTIVE',
        success: false,
        identifier,
        userId: user.id,
        requestMeta: input,
      });
      throw new AuthErrorClass(
        403,
        'Your account has been deactivated. Please contact your administrator.',
        'ACCOUNT_INACTIVE',
      );
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

    // Compute the switchable set from the SAME password the user just
    // proved. Only same-email rows whose password matches this plaintext
    // (and which pass the status gate) become switch targets — this is the
    // security boundary the role switcher is gated against.
    const canonicalEmail = this.getCanonicalUserEmail(latestUser);
    const linkedUserIds = isTruthyString(canonicalEmail)
      ? await this.computeLinkedUserIds(canonicalEmail, input.password, latestUser.id)
      : [latestUser.id];

    const issuedSession = await this.createSession(latestUser.id, input, linkedUserIds);
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

  private parseUserId(userId: string): number {
    const n = parseInt(userId, 10);
    if (!Number.isFinite(n) || n <= 0) {
      throw new AuthErrorClass(400, 'Invalid user id.', 'VALIDATION_ERROR');
    }
    return n;
  }

  async requestPasswordReset(email: string, requestMeta: RequestMeta, roleId?: number): Promise<{ token?: string }> {
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
        ...(typeof roleId === 'number' ? { role_id: roleId } : {}),
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
      userId: String(user.id),
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
        text: `Reset your password using this link: ${this.buildPasswordResetUrl(String(user.id), generated.token)}`,
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

  async validatePasswordResetToken(userId: string, token: string): Promise<{ email: string }> {
    const state = await this.getValidPasswordResetState(userId, token);
    return {
      email: state.canonicalEmail,
    };
  }

  /* ────────────────────────────────────────────────────────────────────
     OTP-based forgot password (used by Figma forgot-password flow)
     - sendForgotPasswordOtp(email): generates 6-digit OTP, stores hash in
       password_reset_token table, sends OTP via email
     - verifyForgotPasswordOtp(email, otp): validates OTP, returns a signed
       reset token (the same signed token format used for link-based reset)
     - resetPasswordWithToken(email, resetToken, newPassword): consumes the
       signed reset token and updates the password
     ──────────────────────────────────────────────────────────────────── */

  async sendForgotPasswordOtp(
    email: string,
    requestMeta: RequestMeta,
    roleId?: number,
  ): Promise<{ maskedEmail: string; expiresInSeconds: number }> {
    const normalizedEmail = normalizeEmail(email);
    if (!isTruthyString(normalizedEmail)) {
      throw new AuthErrorClass(400, 'Please enter your email.', 'VALIDATION_ERROR');
    }

    const rateLimitKey = toRateLimitKey('forgot_pwd_otp_request', normalizedEmail, requestMeta.ipAddress);
    const rateLimitResult = passwordResetRateLimiter.consume(
      rateLimitKey,
      env.AUTH_PASSWORD_RESET_RATE_LIMIT_MAX,
    );
    if (!rateLimitResult.allowed) {
      throw new AuthErrorClass(429, 'Too many OTP requests. Try again later.', 'RATE_LIMITED', {
        retry_after_seconds: rateLimitResult.retryAfterSeconds,
      });
    }

    // Scope by role_id when provided so multi-role users (same email, e.g.
    // Centre + Super Admin) hit the right account. Without this filter
    // findFirst can target a different role's row than the user is trying
    // to reset (Naji 2026-04-30 — operations@learnerseducation.com hit the
    // Centre row instead of his Super Admin row).
    let user = await this.prisma.users.findFirst({
      where: {
        deleted_at: null,
        OR: [{ email: normalizedEmail }, { user_email: normalizedEmail }],
        ...(typeof roleId === 'number' ? { role_id: roleId } : {}),
      },
    });
    // Naji 2026-05-08 — if the role-scoped lookup misses but the email
    // exists for some other role, fall back to that row. Otherwise the
    // OTP silently never sends (the route reports "if an account exists,
    // OTP sent" for security and the user is left waiting). Falling back
    // is safe because the OTP only resets that specific row's password.
    if (!user && typeof roleId === 'number') {
      user = await this.prisma.users.findFirst({
        where: {
          deleted_at: null,
          OR: [{ email: normalizedEmail }, { user_email: normalizedEmail }],
        },
        orderBy: { id: 'desc' },
      });
    }

    // Always return the same masked email shape — never reveal whether the
    // account exists. If the user is missing we still pretend success.
    const maskedEmail = this.maskEmail(normalizedEmail);
    const expiresInSeconds = 120;

    if (!user || !isTruthyString(user.password)) {
      await this.writeAuditLog({
        event: 'FORGOT_PWD_OTP_REQUESTED_NOT_FOUND',
        success: false,
        identifier: normalizedEmail,
        userId: null,
        requestMeta,
      });
      return { maskedEmail, expiresInSeconds };
    }

    const canonicalEmail = this.getCanonicalUserEmail(user);
    if (!isTruthyString(canonicalEmail)) {
      return { maskedEmail, expiresInSeconds };
    }

    const otp = this.generateOtp(6);
    const otpHash = sha256Hex(`forgot_pwd_otp:${user.id}:${otp}`);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresInSeconds * 1000);

    // Invalidate any prior unused OTPs for this user
    await this.prisma.password_reset_token.updateMany({
      where: { user_id: user.id, used_at: null },
      data: { used_at: now, updated_at: now },
    });

    await this.prisma.password_reset_token.create({
      data: {
        user_id: user.id,
        token_hash: otpHash,
        created_at: now,
        updated_at: now,
        expires_at: expiresAt,
        requested_ip: requestMeta.ipAddress ?? null,
        requested_user_agent: requestMeta.userAgent ?? null,
      },
    });

    const otpValidityMinutes = Math.max(1, Math.round(expiresInSeconds / 60));
    try {
      // Naji 2026-07-05 — the Lovable "Password Reset OTP" design (navy header,
      // big OTP block, validity + security notes). Replaces the purple wrapper.
      const { renderPasswordResetOtpEmail } = await import('../integrations/auth-emails.js');
      await this.emailProvider.sendEmail({
        to: canonicalEmail,
        subject: 'Password Reset Verification Code',
        html: renderPasswordResetOtpEmail({
          name: (user.name ?? '').trim() || 'there',
          otpCode: otp,
          otpValidityMinutes,
        }),
        text: `Your TTII password reset OTP is: ${otp}\n\nThis OTP expires in ${otpValidityMinutes} minute(s).\n\nIf you didn't request this, please ignore this email.`,
      });
    } catch {
      await this.writeAuditLog({
        event: 'FORGOT_PWD_OTP_DELIVERY_FAILED',
        success: false,
        identifier: normalizedEmail,
        userId: user.id,
        requestMeta,
      });
      throw new AuthErrorClass(
        502,
        'Unable to send OTP at the moment. Please try again later.',
        'INTEGRATION_ERROR',
      );
    }

    await this.writeAuditLog({
      event: 'FORGOT_PWD_OTP_REQUESTED',
      success: true,
      identifier: normalizedEmail,
      userId: user.id,
      requestMeta,
      details: { expires_at: expiresAt.toISOString() },
    });

    return { maskedEmail, expiresInSeconds };
  }

  async verifyForgotPasswordOtp(
    email: string,
    otp: string,
    requestMeta: RequestMeta,
    roleId?: number,
  ): Promise<{ resetToken: string }> {
    const normalizedEmail = normalizeEmail(email);
    const normalizedOtp = otp.trim();
    if (!isTruthyString(normalizedEmail) || !/^\d{6}$/.test(normalizedOtp)) {
      throw new AuthErrorClass(400, 'Invalid email or OTP.', 'VALIDATION_ERROR');
    }

    const rateLimitKey = toRateLimitKey('forgot_pwd_otp_verify', normalizedEmail, requestMeta.ipAddress);
    const rateLimitResult = otpVerifyRateLimiter.consume(rateLimitKey, env.AUTH_OTP_VERIFY_RATE_LIMIT_MAX);
    if (!rateLimitResult.allowed) {
      throw new AuthErrorClass(429, 'Too many verification attempts. Try again later.', 'RATE_LIMITED', {
        retry_after_seconds: rateLimitResult.retryAfterSeconds,
      });
    }

    let user = await this.prisma.users.findFirst({
      where: {
        deleted_at: null,
        OR: [{ email: normalizedEmail }, { user_email: normalizedEmail }],
        ...(typeof roleId === 'number' ? { role_id: roleId } : {}),
      },
    });
    // Match the fallback logic in sendForgotPasswordOtp so verify
    // succeeds when the OTP was issued against a different role row.
    if (!user && typeof roleId === 'number') {
      user = await this.prisma.users.findFirst({
        where: {
          deleted_at: null,
          OR: [{ email: normalizedEmail }, { user_email: normalizedEmail }],
        },
        orderBy: { id: 'desc' },
      });
    }

    if (!user || !isTruthyString(user.password)) {
      throw new AuthErrorClass(400, 'OTP is invalid or has expired.', 'INVALID_OTP');
    }

    const otpHash = sha256Hex(`forgot_pwd_otp:${user.id}:${normalizedOtp}`);
    const now = new Date();
    const tokenRecord = await this.prisma.password_reset_token.findFirst({
      where: {
        user_id: user.id,
        token_hash: otpHash,
        used_at: null,
        expires_at: { gt: now },
      },
    });

    if (!tokenRecord) {
      await this.writeAuditLog({
        event: 'FORGOT_PWD_OTP_VERIFY_FAILED',
        success: false,
        identifier: normalizedEmail,
        userId: user.id,
        requestMeta,
      });
      throw new AuthErrorClass(400, 'OTP is invalid or has expired.', 'INVALID_OTP');
    }

    // Mark OTP as consumed and issue a signed reset token
    await this.prisma.password_reset_token.update({
      where: { id: tokenRecord.id },
      data: { used_at: now, updated_at: now },
    });

    const canonicalEmail = this.getCanonicalUserEmail(user);
    const generated = createSignedPasswordResetToken({
      userId: String(user.id),
      email: canonicalEmail,
      currentPasswordHash: user.password,
      signingKey: env.PASSWORD_RESET_TOKEN_KEY,
      ttlSeconds: env.PASSWORD_RESET_TOKEN_TTL_SECONDS,
    });

    // Persist the new signed token so updatePasswordWithResetToken can find it
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

    await this.writeAuditLog({
      event: 'FORGOT_PWD_OTP_VERIFIED',
      success: true,
      identifier: normalizedEmail,
      userId: user.id,
      requestMeta,
    });

    return { resetToken: generated.token };
  }

  async resetPasswordWithSignedToken(input: {
    email: string;
    resetToken: string;
    newPassword: string;
    requestMeta: RequestMeta;
    roleId?: number;
  }): Promise<void> {
    const normalizedEmail = normalizeEmail(input.email);
    if (!isTruthyString(normalizedEmail) || !isTruthyString(input.resetToken)) {
      throw new AuthErrorClass(400, 'Invalid request.', 'VALIDATION_ERROR');
    }

    let user = await this.prisma.users.findFirst({
      where: {
        deleted_at: null,
        OR: [{ email: normalizedEmail }, { user_email: normalizedEmail }],
        ...(typeof input.roleId === 'number' ? { role_id: input.roleId } : {}),
      },
    });
    // Same fallback as the OTP send/verify path — multi-role emails
    // sometimes arrive without a matching role row, but we still want
    // the reset to land on the row the OTP was issued for.
    if (!user && typeof input.roleId === 'number') {
      user = await this.prisma.users.findFirst({
        where: {
          deleted_at: null,
          OR: [{ email: normalizedEmail }, { user_email: normalizedEmail }],
        },
        orderBy: { id: 'desc' },
      });
    }

    if (!user) {
      throw toLegacyPasswordResetError();
    }

    return this.updatePasswordWithResetToken({
      userId: String(user.id),
      email: this.getCanonicalUserEmail(user),
      token: input.resetToken,
      password: input.newPassword,
      confirmPassword: input.newPassword,
      requestMeta: input.requestMeta,
    });
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!local || !domain) return email;
    if (local.length <= 4) return `${local[0]}***@${domain}`;
    return `${local.slice(0, 4)}***@${domain}`;
  }

  async updatePasswordWithResetToken(input: {
    userId: string;
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

    // One-password-per-person: a reset applies to EVERY same-email role-row
    // (and revokes all their sessions), so a multi-role person's accounts stay
    // in sync and the role switcher keeps working from a single login.
    const resetEmail = normalizeEmail(state.canonicalEmail);
    const linkedRows = await this.prisma.users.findMany({
      where: { deleted_at: null, OR: [{ email: resetEmail }, { user_email: resetEmail }] },
      select: { id: true },
    });
    const linkedIds = Array.from(new Set([state.user.id, ...linkedRows.map((r) => r.id)]));

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
          id: { in: linkedIds },
          deleted_at: null,
        },
        data: {
          password: newPasswordHash,
          updated_at: now,
        },
      });

      await tx.auth_session.updateMany({
        where: {
          user_id: { in: linkedIds },
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
    userId: string;
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

    // Naji UAT 2026-05-21 — reject template-placeholder values so a
    // misconfigured client (e.g. unrendered $name / {{phone}} in a mobile-
    // app test harness) cannot create ghost student rows.
    if (looksLikeTemplate(normalizedName) || looksLikeTemplate(normalizedPhone) || looksLikeTemplate(normalizedCountryCode)) {
      throw new AuthErrorClass(400, 'Invalid name or phone: looks like an unfilled template placeholder.', 'VALIDATION_ERROR');
    }

    if (!/^\d{6,15}$/.test(normalizedPhone)) {
      throw new AuthErrorClass(400, 'Phone number must contain 6 to 15 digits.', 'VALIDATION_ERROR');
    }

    if (normalizedName.length < 2) {
      throw new AuthErrorClass(400, 'Name must be at least 2 characters.', 'VALIDATION_ERROR');
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
        gender: '',
        dynamic_link: '',
        image: '',
        profile_picture: '',
        application_id: 0,
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
      userId: string;
      studentId: string;
      otp?: string | undefined;
    } = {
      userId: String(created.id),
      studentId,
    };

    if (otp.otp) {
      response.otp = otp.otp;
    }

    return response;
  }

  /* ─── SSO (Sign in with Google / Microsoft) ─────────────────────
     Student-only per Naji 2026-05-06. New users are auto-provisioned
     as role_id=2. Phone is captured later via the
     "complete your profile" modal — `requiresProfileCompletion` is
     `true` when the user's phone is empty after lookup/create.
     ───────────────────────────────────────────────────────────── */

  // Lazy-init the Google + Microsoft clients so the service stays
  // usable when SSO env is unset (the routes return 503 instead).
  private googleClient: OAuth2Client | null = null;
  private microsoftClient: ConfidentialClientApplication | null = null;

  private getGoogleClient(): OAuth2Client {
    if (!isTruthyString(env.GOOGLE_OAUTH_CLIENT_ID)) {
      throw new AuthErrorClass(503, 'Google sign-in is not configured.', 'SSO_NOT_CONFIGURED');
    }
    if (!this.googleClient) {
      this.googleClient = new OAuth2Client(env.GOOGLE_OAUTH_CLIENT_ID);
    }
    return this.googleClient;
  }

  private getMicrosoftClient(): ConfidentialClientApplication {
    if (
      !isTruthyString(env.AZURE_AD_CLIENT_ID) ||
      !isTruthyString(env.AZURE_AD_CLIENT_SECRET) ||
      !isTruthyString(env.AZURE_AD_REDIRECT_URI)
    ) {
      throw new AuthErrorClass(503, 'Microsoft sign-in is not configured.', 'SSO_NOT_CONFIGURED');
    }
    if (!this.microsoftClient) {
      this.microsoftClient = new ConfidentialClientApplication({
        auth: {
          clientId: env.AZURE_AD_CLIENT_ID,
          clientSecret: env.AZURE_AD_CLIENT_SECRET,
          authority: `https://login.microsoftonline.com/${env.AZURE_AD_TENANT_ID}`,
        },
      });
    }
    return this.microsoftClient;
  }

  isSsoConfigured(): { google: boolean; microsoft: boolean } {
    return {
      google: isTruthyString(env.GOOGLE_OAUTH_CLIENT_ID),
      microsoft:
        isTruthyString(env.AZURE_AD_CLIENT_ID) &&
        isTruthyString(env.AZURE_AD_CLIENT_SECRET) &&
        isTruthyString(env.AZURE_AD_REDIRECT_URI),
    };
  }

  async loginWithGoogleIdToken(
    idToken: string,
    requestMeta: RequestMeta,
  ): Promise<{
    userData: LegacyUserData;
    redirectPath: string;
    expiresAt: Date;
    requiresProfileCompletion: boolean;
  }> {
    if (!isTruthyString(idToken)) {
      throw new AuthErrorClass(400, 'Missing Google ID token.', 'VALIDATION_ERROR');
    }
    const client = this.getGoogleClient();
    const audience = env.GOOGLE_OAUTH_CLIENT_ID;
    if (!isTruthyString(audience)) {
      throw new AuthErrorClass(503, 'Google sign-in is not configured.', 'SSO_NOT_CONFIGURED');
    }
    let payload;
    try {
      const ticket = await client.verifyIdToken({ idToken, audience });
      payload = ticket.getPayload();
    } catch {
      throw new AuthErrorClass(401, 'Could not verify Google sign-in.', 'SSO_VERIFICATION_FAILED');
    }
    const email = isTruthyString(payload?.email) ? normalizeEmail(payload.email) : '';
    const emailVerified = payload?.email_verified === true;
    if (!email) {
      throw new AuthErrorClass(401, 'Google account did not return an email.', 'SSO_NO_EMAIL');
    }
    if (!emailVerified) {
      throw new AuthErrorClass(401, 'Your Google email is not verified yet.', 'SSO_EMAIL_NOT_VERIFIED');
    }
    const fullName =
      [payload?.given_name, payload?.family_name].filter(isTruthyString).join(' ').trim() ||
      (isTruthyString(payload?.name) ? payload.name.trim() : '') ||
      email.split('@')[0] ||
      'Student';

    return this.finalizeSsoLogin({
      email,
      name: fullName,
      provider: 'google',
      requestMeta,
    });
  }

  async getMicrosoftAuthorizationUrl(): Promise<{ url: string; state: string }> {
    const client = this.getMicrosoftClient();
    const state = this.signSsoState();
    const url = await client.getAuthCodeUrl({
      scopes: ['openid', 'profile', 'email', 'User.Read'],
      redirectUri: env.AZURE_AD_REDIRECT_URI ?? '',
      state,
      prompt: 'select_account',
    });
    return { url, state };
  }

  async loginWithMicrosoftAuthCode(
    code: string,
    state: string,
    requestMeta: RequestMeta,
  ): Promise<{
    userData: LegacyUserData;
    redirectPath: string;
    expiresAt: Date;
    requiresProfileCompletion: boolean;
  }> {
    if (!isTruthyString(code)) {
      throw new AuthErrorClass(400, 'Missing Microsoft auth code.', 'VALIDATION_ERROR');
    }
    if (!this.verifySsoState(state)) {
      throw new AuthErrorClass(400, 'Invalid Microsoft sign-in state.', 'SSO_STATE_INVALID');
    }
    const client = this.getMicrosoftClient();
    let response;
    try {
      response = await client.acquireTokenByCode({
        code,
        scopes: ['openid', 'profile', 'email', 'User.Read'],
        redirectUri: env.AZURE_AD_REDIRECT_URI ?? '',
      });
    } catch {
      throw new AuthErrorClass(401, 'Could not verify Microsoft sign-in.', 'SSO_VERIFICATION_FAILED');
    }
    const account = response?.account;
    const idTokenClaims = (account?.idTokenClaims ?? {}) as Record<string, unknown>;
    const rawEmail =
      (typeof idTokenClaims.email === 'string' ? idTokenClaims.email : null) ??
      (typeof idTokenClaims.preferred_username === 'string' ? idTokenClaims.preferred_username : null) ??
      account?.username ??
      '';
    const email = isTruthyString(rawEmail) ? normalizeEmail(rawEmail) : '';
    if (!email) {
      throw new AuthErrorClass(401, 'Microsoft account did not return an email.', 'SSO_NO_EMAIL');
    }
    // Microsoft does not always emit `email_verified` for personal MSAs.
    // Treat the email as verified when the IdP issued it through the
    // "email" claim (work / school accounts always do). Personal MSAs
    // may surface `preferred_username` only — accept those as long as
    // the format is a real email; if it's a username (no @), reject.
    const looksLikeEmail = /.+@.+\..+/.test(email);
    if (!looksLikeEmail) {
      throw new AuthErrorClass(401, 'Your Microsoft email is not verified yet.', 'SSO_EMAIL_NOT_VERIFIED');
    }
    const fullName =
      (typeof idTokenClaims.name === 'string' ? idTokenClaims.name.trim() : '') ||
      account?.name?.trim() ||
      email.split('@')[0] ||
      'Student';

    return this.finalizeSsoLogin({
      email,
      name: fullName,
      provider: 'microsoft',
      requestMeta,
    });
  }

  // Stateless HMAC-signed CSRF state for the Microsoft redirect flow.
  // Format: `<random-32-hex>.<hmac>`. The random bytes give the value
  // entropy; the HMAC binds it to our signing key so an attacker can't
  // mint their own state to land on the callback.
  private signSsoState(): string {
    const nonce = randomBytes(16).toString('hex');
    const sig = createHmac('sha256', env.SSO_STATE_SIGNING_KEY).update(nonce).digest('hex');
    return `${nonce}.${sig}`;
  }

  private verifySsoState(state: string | undefined | null): boolean {
    if (!isTruthyString(state)) return false;
    const dot = state.indexOf('.');
    if (dot <= 0) return false;
    const nonce = state.slice(0, dot);
    const sig = state.slice(dot + 1);
    const expected = createHmac('sha256', env.SSO_STATE_SIGNING_KEY).update(nonce).digest('hex');
    return safeHexEqual(sig, expected);
  }

  // Look up an existing student by email, or auto-provision a new one.
  // Naji 2026-05-06: option (a) — we DO auto-create. Without it the
  // student would have to ask admissions to add them before they could
  // even browse courses, which contradicts the self-serve flow.
  private async findOrCreateStudentBySsoEmail(input: {
    email: string;
    name: string;
    provider: 'google' | 'microsoft';
  }): Promise<{ user: users; created: boolean }> {
    const existing = await this.prisma.users.findFirst({
      where: {
        deleted_at: null,
        role_id: 2,
        OR: [{ user_email: input.email }, { email: input.email }],
      },
    });
    if (existing) {
      return { user: existing, created: false };
    }

    const now = new Date();
    const created = await this.prisma.users.create({
      data: {
        country_code: null,
        phone: '',
        email: input.email,
        user_email: input.email,
        name: input.name,
        // SSO accounts have no password — leave the column empty so
        // email/password login can never succeed for them.
        password: '',
        role_id: 2,
        // Naji 2026-05-06: SSO email is verified by the IdP. Mark
        // active so the student lands on the dashboard immediately.
        status: 1,
        gender: '',
        dynamic_link: '',
        image: '',
        profile_picture: '',
        application_id: 0,
        created_at: now,
        updated_at: now,
      },
    });

    const studentId = `TT0000${created.id}`;
    await this.prisma.users.updateMany({
      where: { id: created.id },
      data: { student_id: studentId, updated_at: now },
    });

    const refetched = (await this.prisma.users.findFirst({
      where: { id: created.id, deleted_at: null },
    })) ?? created;

    return { user: refetched, created: true };
  }

  private async finalizeSsoLogin(input: {
    email: string;
    name: string;
    provider: 'google' | 'microsoft';
    requestMeta: RequestMeta;
  }): Promise<{
    userData: LegacyUserData;
    redirectPath: string;
    expiresAt: Date;
    requiresProfileCompletion: boolean;
  }> {
    const { user, created } = await this.findOrCreateStudentBySsoEmail({
      email: input.email,
      name: input.name,
      provider: input.provider,
    });

    // Per Naji 2026-05-06: blocked accounts (status=0 set by an admin)
    // see a "contact support" message rather than auto-reactivating.
    // The status=0 quirk for unverified students from the legacy phone-
    // OTP flow doesn't apply here because SSO accounts are created with
    // status=1 and existing student rows are already active.
    if (user.status === 0 && !created) {
      await this.writeAuditLog({
        event: 'SSO_LOGIN_BLOCKED_INACTIVE',
        success: false,
        identifier: input.email,
        userId: user.id,
        requestMeta: input.requestMeta,
        details: { provider: input.provider },
      });
      throw new AuthErrorClass(
        403,
        'Your account is currently disabled. Please contact admin support.',
        'ACCOUNT_INACTIVE',
      );
    }

    // SSO proves email ownership, so every same-email row passing the
    // status gate is legitimately this person's — no password to verify.
    const linkedUserIds = await this.computeLinkedUserIdsForVerifiedEmail(input.email, user.id);

    const issuedSession = await this.createSession(user.id, input.requestMeta, linkedUserIds);
    const userData = this.toLegacyUserData(user, issuedSession.token);

    await this.writeAuditLog({
      event: created ? 'SSO_REGISTER_SUCCESS' : 'SSO_LOGIN_SUCCESS',
      success: true,
      identifier: input.email,
      userId: user.id,
      requestMeta: input.requestMeta,
      details: {
        provider: input.provider,
        role_id: user.role_id,
      },
    });

    return {
      userData,
      redirectPath: resolveLegacyPortalPath(user.role_id),
      expiresAt: issuedSession.expiresAt,
      requiresProfileCompletion: !isTruthyString(user.phone),
    };
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

  async resendOtpForUser(userId: string, requestMeta: RequestMeta): Promise<OtpIssueResult> {
    const user = await this.prisma.users.findFirst({
      where: {
        id: this.parseUserId(userId),
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

    if (!isTruthyString(input.userId) || !isTruthyString(normalizedOtp)) {
      throw new AuthErrorClass(400, 'Invalid OTP request.', 'VALIDATION_ERROR');
    }

    const userIdInt = this.parseUserId(input.userId);

    const rateLimitKey = toRateLimitKey('otp_verify', `${input.userId}:${purpose}`, input.ipAddress);
    const rateLimitResult = otpVerifyRateLimiter.consume(rateLimitKey, env.AUTH_OTP_VERIFY_RATE_LIMIT_MAX);
    if (!rateLimitResult.allowed) {
      await this.writeAuditLog({
        event: 'OTP_VERIFY_RATE_LIMITED',
        success: false,
        identifier: String(input.userId),
        userId: userIdInt,
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
        user_id: userIdInt,
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
        userId: userIdInt,
        requestMeta: input,
      });
      throw new AuthErrorClass(400, 'Invalid OTP!', 'INVALID_OTP');
    }

    if (challenge.attempt_count >= challenge.max_attempts) {
      await this.writeAuditLog({
        event: 'OTP_VERIFY_FAILED',
        success: false,
        identifier: String(input.userId),
        userId: userIdInt,
        requestMeta: input,
      });
      throw new AuthErrorClass(429, 'OTP attempts exceeded.', 'OTP_ATTEMPTS_EXCEEDED');
    }

    const expectedOtpHash = this.hashOtp(String(challenge.user_id), challenge.purpose, normalizedOtp);
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
        userId: userIdInt,
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
          id: userIdInt,
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
        id: userIdInt,
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
      userId: userIdInt,
      requestMeta: input,
      details: {
        challenge_id: challenge.id,
      },
    });

    return {
      userData,
      redirectPath: resolveLegacyPortalPath(user.role_id ?? 0),
    };
  }

  async logRbacDenied(input: {
    userId: string | null;
    requiredRoles: readonly number[];
    requestMeta: RequestMeta;
    path: string;
  }): Promise<void> {
    await this.writeAuditLog({
      event: 'RBAC_DENIED',
      success: false,
      identifier: null,
      userId: input.userId != null ? this.parseUserId(input.userId) : null,
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

  // Returns the user records whose password matches, scoped to the given
  // email. The post-password picker calls this when the email has more
  // than one valid identity (different roles, or even multiple rows of
  // the same role — common on the legacy schema where one email is
  // shared across separate student rows for different courses). Audit
  // logging + rate limiting mirror a real login attempt.
  async resolveLoginCandidates(input: { email: string; password: string; ipAddress?: string; userAgent?: string }): Promise<Array<{ user_id: number; role_id: number; name: string; student_id: string }>> {
    const identifier = normalizeEmail(input.email ?? '');
    if (!identifier || !isTruthyString(input.password)) {
      throw new AuthErrorClass(400, 'Email and password are required.', 'VALIDATION_ERROR');
    }
    const rateLimitKey = toRateLimitKey('login', identifier, input.ipAddress);
    const rateLimitResult = loginRateLimiter.consume(rateLimitKey, env.AUTH_LOGIN_RATE_LIMIT_MAX);
    if (!rateLimitResult.allowed) {
      throw new AuthErrorClass(429, 'Too many login attempts. Try again later.', 'RATE_LIMITED', {
        retry_after_seconds: rateLimitResult.retryAfterSeconds,
      });
    }

    const candidates = await this.prisma.users.findMany({
      where: {
        deleted_at: null,
        OR: [{ email: identifier }, { user_email: identifier }],
      },
      select: { id: true, role_id: true, password: true, status: true, name: true, student_id: true },
      orderBy: [{ role_id: 'asc' }, { id: 'asc' }],
    });

    const matched: Array<{ user_id: number; role_id: number; name: string; student_id: string }> = [];
    for (const u of candidates) {
      if (!isTruthyString(u.password) || u.role_id === null) continue;
      if (u.status === 0 && u.role_id !== 2) continue;
      // eslint-disable-next-line no-await-in-loop
      const ok = await verifyPassword(input.password, u.password);
      if (ok) {
        matched.push({
          user_id: u.id,
          role_id: u.role_id,
          name: u.name ?? '',
          student_id: u.student_id ?? '',
        });
      }
    }

    return matched;
  }

  /* ─── Post-login role switcher ──────────────────────────────────────
     A user who proved (at login) ownership of several same-email `users`
     rows can switch between them WITHOUT re-entering their password. The
     allowed set is captured on the session as `linked_user_ids` and is the
     ONLY thing switchRole trusts — a target id outside that set is rejected.
     ──────────────────────────────────────────────────────────────────── */

  // List the roles this session may switch into. Loads only the linked
  // users (non-deleted) and returns id + role_id + name. The frontend
  // filters to same-subdomain surfaces; the backend returns ALL linked
  // roles so other clients can present the full set if they choose.
  async getSwitchableRoles(
    authContext: AuthContext,
  ): Promise<Array<{ user_id: number; role_id: number; name: string }>> {
    const ids = authContext.linkedUserIds.filter((id) => Number.isInteger(id) && id > 0);
    if (ids.length === 0) {
      return [];
    }

    const rows = await this.prisma.users.findMany({
      where: {
        id: { in: ids },
        deleted_at: null,
      },
      select: { id: true, role_id: true, name: true },
    });

    return rows
      .filter((row): row is { id: number; role_id: number; name: string | null } => row.role_id !== null)
      .map((row) => ({
        user_id: row.id,
        role_id: row.role_id,
        name: row.name ?? '',
      }));
  }

  // Switch the active session to another role the user already earned at
  // login. Issues a NEW session for the target user, carrying the SAME
  // linked set forward, and revokes the old session. The security gate is
  // (a) targetUserId MUST be in the persisted linked set, AND (b) the target
  // row MUST share the current user's canonical email (defense in depth).
  async switchRole(
    authContext: AuthContext,
    targetUserId: number,
    requestMeta: RequestMeta,
  ): Promise<{ token: string; expiresAt: Date; roleId: number; userData: LegacyUserData }> {
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      throw new AuthErrorClass(400, 'Invalid target role.', 'VALIDATION_ERROR');
    }

    // (a) Gate strictly against the persisted, login-verified set. A target
    // not in this set was never password-proven by this session → refuse.
    if (!authContext.linkedUserIds.includes(targetUserId)) {
      await this.writeAuditLog({
        event: 'ROLE_SWITCH_FORBIDDEN',
        success: false,
        identifier: this.getCanonicalUserEmail(authContext.user) || null,
        userId: authContext.user.id,
        requestMeta,
        details: { target_user_id: targetUserId },
      });
      throw new AuthErrorClass(403, 'Role not available for this account.', 'FORBIDDEN');
    }

    const targetUser = await this.prisma.users.findFirst({
      where: { id: targetUserId, deleted_at: null, disabled_at: null },
    });

    if (!targetUser || targetUser.role_id === null) {
      throw new AuthErrorClass(404, 'Target role not found.', 'NOT_FOUND');
    }

    // (b) Defense in depth — never trust the set alone. The target row must
    // share the current session user's canonical email. If the underlying
    // data shifted (email changed, row reassigned) since login, refuse.
    const currentEmail = this.getCanonicalUserEmail(authContext.user);
    const targetEmail = this.getCanonicalUserEmail(targetUser);
    if (!isTruthyString(currentEmail) || normalizeEmail(currentEmail) !== normalizeEmail(targetEmail)) {
      await this.writeAuditLog({
        event: 'ROLE_SWITCH_EMAIL_MISMATCH',
        success: false,
        identifier: currentEmail || null,
        userId: authContext.user.id,
        requestMeta,
        details: { target_user_id: targetUserId },
      });
      throw new AuthErrorClass(403, 'Role not available for this account.', 'FORBIDDEN');
    }

    // Mint the new session, carrying the SAME linked set forward so the user
    // can keep hopping between their roles without re-authenticating.
    const issuedSession = await this.createSession(
      targetUser.id,
      requestMeta,
      authContext.linkedUserIds,
    );

    // Revoke the old session so a single active token represents the user at
    // any time (and a stolen pre-switch token can't outlive the switch).
    const now = new Date();
    await this.prisma.auth_session.updateMany({
      where: { id: this.parseSessionId(authContext.sessionId), revoked_at: null },
      data: { revoked_at: now, revoked_reason: 'role_switch', updated_at: now },
    });

    const userData = this.toLegacyUserData(targetUser, issuedSession.token);

    await this.writeAuditLog({
      event: 'ROLE_SWITCH_SUCCESS',
      success: true,
      identifier: currentEmail,
      userId: targetUser.id,
      requestMeta,
      details: {
        from_user_id: authContext.user.id,
        to_user_id: targetUser.id,
        to_role_id: targetUser.role_id,
      },
    });

    return {
      token: issuedSession.token,
      expiresAt: issuedSession.expiresAt,
      roleId: targetUser.role_id,
      userData,
    };
  }

  private parseSessionId(sessionId: string): number {
    const n = parseInt(sessionId, 10);
    if (!Number.isFinite(n) || n <= 0) {
      throw new AuthErrorClass(400, 'Invalid session.', 'VALIDATION_ERROR');
    }
    return n;
  }

  private async findUserForLogin(input: LoginInput): Promise<users | null> {
    // When the picker disambiguates a multi-row email, the client sends the
    // exact user id alongside email + role.
    if (typeof input.userId === 'number' && Number.isFinite(input.userId)) {
      return this.prisma.users.findFirst({
        where: {
          id: input.userId,
          deleted_at: null,
          ...(typeof input.roleId === 'number' ? { role_id: input.roleId } : {}),
        },
      });
    }

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

  private async createSession(
    userId: number,
    requestMeta: RequestMeta,
    linkedUserIds?: number[],
  ): Promise<{ token: string; expiresAt: Date }> {
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
        revoked_at: null,
        ip_address: requestMeta.ipAddress ?? null,
        user_agent: requestMeta.userAgent ?? null,
        // Persist the switchable set as a JSON array. Null when not
        // supplied (e.g. OTP/phone login that doesn't compute a set) so
        // authenticateAuthToken falls back to [user_id] only.
        linked_user_ids: linkedUserIds && linkedUserIds.length > 0 ? JSON.stringify(linkedUserIds) : null,
      },
    });

    return {
      token,
      expiresAt,
    };
  }

  // Compute the set of user.id values a password login is allowed to switch
  // into: every non-deleted `users` row sharing this email (email OR
  // user_email) whose stored password verifies against the SAME plaintext,
  // and which passes the login status gate (status===0 && role!==2 blocked).
  // Mirrors resolveLoginCandidates exactly. The just-authenticated user's id
  // is always included even if some race changed its password mid-login.
  private async computeLinkedUserIds(email: string, password: string, currentUserId: number): Promise<number[]> {
    const identifier = normalizeEmail(email);
    const ids = new Set<number>([currentUserId]);

    if (!identifier || !isTruthyString(password)) {
      return Array.from(ids);
    }

    const candidates = await this.prisma.users.findMany({
      where: {
        deleted_at: null,
        disabled_at: null,
        OR: [{ email: identifier }, { user_email: identifier }],
      },
      select: { id: true, role_id: true, password: true, status: true },
    });

    for (const candidate of candidates) {
      if (!isTruthyString(candidate.password) || candidate.role_id === null) continue;
      // Same status gate the login path enforces: a deactivated admin-side
      // row (status 0, role !== student) can never be a switch target.
      if (candidate.status === 0 && candidate.role_id !== 2) continue;
      const ok = await verifyPassword(password, candidate.password);
      if (ok) {
        ids.add(candidate.id);
      }
    }

    return Array.from(ids);
  }

  // Email-verified variant (SSO): the IdP proved ownership of the email, so
  // every non-deleted same-email row passing the status gate is legitimately
  // this person's. No password check is possible (SSO rows have no password).
  private async computeLinkedUserIdsForVerifiedEmail(email: string, currentUserId: number): Promise<number[]> {
    const identifier = normalizeEmail(email);
    const ids = new Set<number>([currentUserId]);

    if (!identifier) {
      return Array.from(ids);
    }

    const candidates = await this.prisma.users.findMany({
      where: {
        deleted_at: null,
        disabled_at: null,
        OR: [{ email: identifier }, { user_email: identifier }],
      },
      select: { id: true, role_id: true, status: true },
    });

    for (const candidate of candidates) {
      if (candidate.role_id === null) continue;
      if (candidate.status === 0 && candidate.role_id !== 2) continue;
      ids.add(candidate.id);
    }

    return Array.from(ids);
  }

  private toLegacyUserData(user: users, authToken: string): LegacyUserData {
    return {
      user_id: String(user.id),
      student_id: user.student_id ?? '',
      user_name: user.name ?? '',
      role_id: user.role_id ?? '',
      course_id: user.course_id != null ? String(user.course_id) : '',
      auth_token: authToken,
      user_email: this.getCanonicalUserEmail(user),
      user_phone: user.phone ?? '',
      device_id: user.device_id ?? '',
      course_name: '',
      status: user.status ?? 0,
      academic_year: user.academic_year ?? '',
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
    userId: string,
    token: string,
  ): Promise<{ user: users; tokenRecord: { id: number }; canonicalEmail: string }> {
    if (!isTruthyString(token)) {
      throw toLegacyPasswordResetError();
    }

    const user = await this.prisma.users.findFirst({
      where: {
        id: this.parseUserId(userId),
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
      expectedUserId: String(user.id),
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
        otp_hash: this.hashOtp(String(user.id), purpose, otp),
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
        userId: String(user.id),
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
      userId: String(user.id),
      challengeId: String(created.id),
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

  private hashOtp(userId: string, purpose: string, otp: string): string {
    return createHmac('sha256', env.OTP_SIGNING_KEY)
      .update(`${userId}:${purpose}:${otp}`)
      .digest('hex');
  }

  private buildPasswordResetUrl(userId: string, token: string): string {
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
