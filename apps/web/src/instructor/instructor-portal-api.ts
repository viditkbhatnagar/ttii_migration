import { type AuthSession, type LegacyApiClient, type QueryValue } from '@ttii/frontend-core';

/**
 * Instructor portal API client. Thin wrapper over the shared legacy API
 * client, exposing only the endpoints the instructor-facing UI needs.
 *
 * Kept separate from AdminPortalApi so the surface is small + obvious;
 * instructors don't need admin-level methods like "create cohort" or
 * "delete student".
 */

interface LegacyEnvelope<T> {
  data?: T;
  message?: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export interface InstructorProfileSnapshot {
  userId: string;
  roleId: number;
  name: string;
  email: string;
  phone: string;
  image: string;
}

export class InstructorPortalApi {
  private readonly apiClient: LegacyApiClient;

  constructor(apiClient: LegacyApiClient) {
    this.apiClient = apiClient;
  }

  private async get<T>(path: string, authToken: string, query?: Record<string, QueryValue>): Promise<T> {
    return this.apiClient.request<T>({
      method: 'GET',
      path,
      authToken,
      ...(query ? { query } : {}),
    });
  }

  private async post<T>(
    path: string,
    authToken: string,
    body?: Record<string, unknown>,
    query?: Record<string, QueryValue>,
  ): Promise<T> {
    return this.apiClient.request<T>({
      method: 'POST',
      path,
      authToken,
      ...(body ? { body } : {}),
      ...(query ? { query } : {}),
    });
  }

  /**
   * Loads the logged-in instructor's profile from the shared /profile/index
   * endpoint. Used by the layout context to render their name + initials in
   * the navbar + sidebar.
   */
  async loadProfile(authToken: string, session: AuthSession): Promise<InstructorProfileSnapshot> {
    try {
      const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>('/profile/index', authToken);
      const profile = asRecord(payload.data) ?? {};
      return {
        userId: asString(profile.id) || String(session.userId),
        roleId: typeof profile.role_id === 'number' ? profile.role_id : session.roleId,
        name: asString(profile.name),
        email: asString(profile.user_email) || asString(profile.email),
        phone: asString(profile.phone),
        image: asString(profile.image),
      };
    } catch {
      return {
        userId: String(session.userId),
        roleId: session.roleId,
        name: '',
        email: '',
        phone: '',
        image: '',
      };
    }
  }
}
