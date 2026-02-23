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
  LEGACY_ROLE_ID.INSTRUCTOR,
  LEGACY_ROLE_ID.COUNSELLOR,
  LEGACY_ROLE_ID.ASSOCIATE,
]);

export interface AuthSession {
  token: string;
  userId: number;
  roleId: number;
}

export interface LoginInput {
  email: string;
  password: string;
  roleId?: number;
}

export interface AuthApi {
  login(input: LoginInput): Promise<AuthSession>;
  getCurrentUser(authToken: string): Promise<{ userId: number; roleId: number }>;
  checkPortalAccess(surface: PortalSurface, authToken: string): Promise<void>;
  logout(authToken: string): Promise<void>;
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
    const userId = asNumber(response.userdata.user_id);
    const roleId = asNumber(response.userdata.role_id);

    if (!token || userId === null || roleId === null) {
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

  async getCurrentUser(authToken: string): Promise<{ userId: number; roleId: number }> {
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

    const userId = asNumber(response.data.user_id);
    const roleId = asNumber(response.data.role_id);

    if (userId === null || roleId === null) {
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
}

export function resolvePortalSurfaceForRole(roleId: number): PortalSurface {
  if (roleId === LEGACY_ROLE_ID.CENTRE) {
    return 'centre';
  }

  if (adminPortalRoles.has(roleId)) {
    return 'admin';
  }

  return 'student';
}

export function resolveShellPathForRole(roleId: number): '/admin' | '/centre' | '/student' {
  const surface = resolvePortalSurfaceForRole(roleId);

  if (surface === 'admin') {
    return '/admin';
  }

  if (surface === 'centre') {
    return '/centre';
  }

  return '/student';
}
