import { LEGACY_ROLE_ID } from '@ttii/shared-types';
import type { LegacyAuthLoginResponse, LegacyAuthMeResponse, PortalSurface } from '@ttii/shared-types';

import { ApiError } from '../api/api-error.js';
import type { LegacyApiClient } from '../api/legacy-api-client.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function asString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

const adminPortalRoles = new Set<number>([
  LEGACY_ROLE_ID.ADMIN,
  LEGACY_ROLE_ID.SUBADMIN,
  LEGACY_ROLE_ID.COUNSELLOR,
]);

const centrePortalRoles = new Set<number>([
  LEGACY_ROLE_ID.CENTRE,
  LEGACY_ROLE_ID.ASSOCIATE,
]);

const instructorPortalRoles = new Set<number>([
  LEGACY_ROLE_ID.INSTRUCTOR,
]);

export interface AuthSession {
  token: string;
  userId: string;
  roleId: number;
}

export interface LoginInput {
  email: string;
  password: string;
  roleId?: number;
}

export interface ForgotPasswordResult {
  message: string;
  maskedEmail?: string;
  expiresInSeconds?: number;
}

export interface VerifyOtpResult {
  message: string;
  resetToken: string;
}

export interface ResetPasswordResult {
  message: string;
}

export interface AuthApi {
  login(input: LoginInput): Promise<AuthSession>;
  getCurrentUser(authToken: string): Promise<{ userId: string; roleId: number }>;
  checkPortalAccess(surface: PortalSurface, authToken: string): Promise<void>;
  logout(authToken: string): Promise<void>;
  forgotPassword(email: string): Promise<ForgotPasswordResult>;
  verifyOtp(email: string, otp: string): Promise<VerifyOtpResult>;
  resetPassword(input: { email: string; resetToken: string; newPassword: string }): Promise<ResetPasswordResult>;
}

export class LegacyAuthApi implements AuthApi {
  private readonly apiClient: LegacyApiClient;

  constructor(apiClient: LegacyApiClient) {
    this.apiClient = apiClient;
  }

  async login(input: LoginInput): Promise<AuthSession> {
    const response = await this.apiClient.request<LegacyAuthLoginResponse | Record<string, unknown>>({
      method: 'GET',
      path: '/login/index',
      query: {
        email: input.email,
        password: input.password,
        role_id: input.roleId,
      },
    });

    if (!isRecord(response) || !isRecord(response.userdata)) {
      throw new ApiError('Invalid login response payload.', {
        statusCode: 500,
        payload: response,
        path: '/login/index',
      });
    }

    const token = asString(response.userdata.auth_token);
    const rawUserId = response.userdata.user_id;
    const userId = asString(rawUserId) ?? (typeof rawUserId === 'number' ? String(rawUserId) : '');
    const roleId = asNumber(response.userdata.role_id);

    if (!token || !userId || roleId === null) {
      throw new ApiError('Login response is missing required session fields.', {
        statusCode: 500,
        payload: response,
        path: '/login/index',
      });
    }

    return {
      token,
      userId,
      roleId,
    };
  }

  async getCurrentUser(authToken: string): Promise<{ userId: string; roleId: number }> {
    const response = await this.apiClient.request<LegacyAuthMeResponse | Record<string, unknown>>({
      method: 'GET',
      path: '/auth/me',
      authToken,
    });

    if (!isRecord(response) || !isRecord(response.data)) {
      throw new ApiError('Invalid auth/me response payload.', {
        statusCode: 500,
        payload: response,
        path: '/auth/me',
      });
    }

    const rawUserId = response.data.user_id;
    const userId = asString(rawUserId) ?? (typeof rawUserId === 'number' ? String(rawUserId) : '');
    const roleId = asNumber(response.data.role_id);

    if (!userId || roleId === null) {
      throw new ApiError('auth/me response is missing user identity fields.', {
        statusCode: 500,
        payload: response,
        path: '/auth/me',
      });
    }

    return {
      userId,
      roleId,
    };
  }

  async checkPortalAccess(surface: PortalSurface, authToken: string): Promise<void> {
    await this.apiClient.request({
      method: 'GET',
      path: `/auth/portal/${surface}`,
      authToken,
    });
  }

  async logout(authToken: string): Promise<void> {
    await this.apiClient.request({
      method: 'GET',
      path: '/login/logout',
      authToken,
    });
  }

  async forgotPassword(email: string): Promise<ForgotPasswordResult> {
    const response = await this.apiClient.request<Record<string, unknown>>({
      method: 'POST',
      path: '/auth/forgot_password',
      body: { email },
    });

    if (!isRecord(response)) {
      throw new ApiError('Invalid forgot password response.', {
        statusCode: 500,
        payload: response,
        path: '/auth/forgot_password',
      });
    }

    const data = isRecord(response.data) ? response.data : response;
    const maskedEmail = asString(data.masked_email);
    const expiresInSeconds = asNumber(data.expires_in);
    return {
      message: asString(response.message) ?? asString(data.message) ?? 'OTP sent to your email.',
      ...(maskedEmail ? { maskedEmail } : {}),
      ...(expiresInSeconds !== null ? { expiresInSeconds } : {}),
    };
  }

  async verifyOtp(email: string, otp: string): Promise<VerifyOtpResult> {
    const response = await this.apiClient.request<Record<string, unknown>>({
      method: 'POST',
      path: '/auth/verify_otp',
      body: { email, otp },
    });

    if (!isRecord(response)) {
      throw new ApiError('Invalid verify OTP response.', {
        statusCode: 500,
        payload: response,
        path: '/auth/verify_otp',
      });
    }

    const data = isRecord(response.data) ? response.data : response;
    const resetToken = asString(data.reset_token) ?? asString(data.token);

    if (!resetToken) {
      throw new ApiError('Verify OTP response is missing reset token.', {
        statusCode: 500,
        payload: response,
        path: '/auth/verify_otp',
      });
    }

    return {
      message: asString(response.message) ?? 'OTP verified successfully.',
      resetToken,
    };
  }

  async resetPassword(input: { email: string; resetToken: string; newPassword: string }): Promise<ResetPasswordResult> {
    const response = await this.apiClient.request<Record<string, unknown>>({
      method: 'POST',
      path: '/auth/reset_password',
      body: {
        email: input.email,
        reset_token: input.resetToken,
        new_password: input.newPassword,
      },
    });

    if (!isRecord(response)) {
      throw new ApiError('Invalid reset password response.', {
        statusCode: 500,
        payload: response,
        path: '/auth/reset_password',
      });
    }

    return {
      message: asString(response.message) ?? 'Password reset successfully.',
    };
  }
}

export function resolvePortalSurfaceForRole(roleId: number): PortalSurface {
  if (centrePortalRoles.has(roleId)) {
    return 'centre';
  }

  if (instructorPortalRoles.has(roleId)) {
    return 'instructor';
  }

  if (adminPortalRoles.has(roleId)) {
    return 'admin';
  }

  return 'student';
}

export function resolveShellPathForRole(roleId: number): '/admin' | '/centre' | '/student' | '/instructor' {
  const surface = resolvePortalSurfaceForRole(roleId);

  if (surface === 'admin') {
    return '/admin';
  }

  if (surface === 'centre') {
    return '/centre';
  }

  if (surface === 'instructor') {
    return '/instructor';
  }

  return '/student';
}
