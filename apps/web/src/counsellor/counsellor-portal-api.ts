import { type AuthSession, type LegacyApiClient, type QueryValue } from '@ttii/frontend-core';
import { AdminPortalApi } from '../admin/admin-portal-api.js';

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

function toRecords(input: unknown): Record<string, unknown>[] {
  if (!Array.isArray(input)) return [];
  return input.filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x));
}

export interface CounsellorProfileSnapshot {
  userId: string;
  roleId: number;
  name: string;
  email: string;
  phone: string;
  countryCode: string;
  image: string;
}

export interface CounsellorProfileUpdateInput {
  name: string;
  email: string;
  phone: string;
  countryCode: string;
}

export interface CounsellorPasswordUpdateInput {
  password: string;
  confirmPassword: string;
}

/**
 * Counsellor portal API client. Counsellors hit the same legacy /admin/*
 * endpoints as admins — the backend already scopes results by role_id when
 * the caller is a counsellor. This wrapper exposes the small, stable subset
 * of endpoints the counsellor UI actually needs.
 */
export class CounsellorPortalApi {
  private readonly apiClient: LegacyApiClient;
  // Naji 2026-05-08 — counsellors get the same Add Lead / View
  // Application / Generate Payment Link UX as admins. Expose an
  // AdminPortalApi instance bound to the same legacy client so the
  // counsellor wrapper pages can mount the admin components directly.
  // Backend already scopes results by role_id when role_id=9.
  private _adminApi: AdminPortalApi | null = null;

  constructor(apiClient: LegacyApiClient) {
    this.apiClient = apiClient;
  }

  get admin(): AdminPortalApi {
    if (!this._adminApi) this._adminApi = new AdminPortalApi(this.apiClient);
    return this._adminApi;
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

  async loadProfile(authToken: string, session: AuthSession): Promise<CounsellorProfileSnapshot> {
    try {
      const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>('/profile/index', authToken);
      const profile = asRecord(payload.data) ?? {};
      return {
        userId: asString(profile.id) || String(session.userId),
        roleId: typeof profile.role_id === 'number' ? profile.role_id : session.roleId,
        name: asString(profile.name),
        email: asString(profile.user_email) || asString(profile.email),
        phone: asString(profile.phone),
        countryCode: asString(profile.country_code),
        image: asString(profile.image),
      };
    } catch {
      return {
        userId: String(session.userId),
        roleId: session.roleId,
        name: '',
        email: '',
        phone: '',
        countryCode: '',
        image: '',
      };
    }
  }

  async updateProfile(
    authToken: string,
    input: CounsellorProfileUpdateInput,
    session: AuthSession,
  ): Promise<CounsellorProfileSnapshot> {
    await this.post<LegacyEnvelope<Record<string, unknown>>>('/profile/update', authToken, {
      name: input.name,
      email: input.email,
      user_email: input.email,
      phone: input.phone,
      country_code: input.countryCode,
    });
    return this.loadProfile(authToken, session);
  }

  async changePassword(authToken: string, input: CounsellorPasswordUpdateInput): Promise<void> {
    const response = await this.post<LegacyEnvelope<Record<string, unknown>>>(
      '/profile/change_password',
      authToken,
      { password: input.password, confirm_password: input.confirmPassword },
    );
    if (response && typeof response === 'object' && 'status' in response) {
      const status = (response as { status?: unknown }).status;
      if (status === 0 || status === '0') {
        const message = typeof response.message === 'string' && response.message.trim() !== ''
          ? response.message
          : 'Could not change password.';
        throw new Error(message);
      }
    }
  }

  /** Applications scoped to this counsellor (server-side via role_id=9). */
  async loadApplications(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>('/admin/applications/index', authToken);
    const data = asRecord(payload.data) ?? {};
    return toRecords(data.students);
  }

  async loadStudents(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/students/index', authToken);
    return toRecords(payload.data);
  }

  async loadCounsellorTargets(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/counsellor_target/index', authToken);
    return toRecords(payload.data);
  }

  async loadReferrals(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/admin/referrals/index', authToken);
    return toRecords(payload.data);
  }

  // ── Applications CRUD (Phase 2) ────────────────────────────────────────────

  async getApplication(authToken: string, id: string): Promise<Record<string, unknown>> {
    const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>('/admin/applications/get', authToken, { id });
    return asRecord(payload.data) ?? {};
  }

  async createApplication(authToken: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/applications/add', authToken, input);
  }

  async convertApplication(authToken: string, applicationId: string): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/applications/convert', authToken, { application_id: applicationId });
  }

  async updateApplicationStatus(
    authToken: string,
    id: string,
    status: string,
    rejectReason?: string,
  ): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/admin/applications/update_status', authToken, {
      id,
      status,
      reject_reason: rejectReason || '',
    });
  }

  // Reference data the Add Application form needs.
  async loadCourses(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.get<LegacyEnvelope<unknown[]>>('/course/all_course', authToken);
    return toRecords(payload.data);
  }

  /** Quick numeric counts used by the dashboard skeleton. */
  async loadDashboardStats(authToken: string): Promise<{
    totalApplications: number;
    convertedApplications: number;
    activeTargets: number;
    referralsCount: number;
  }> {
    const [apps, targets, referrals] = await Promise.all([
      this.loadApplications(authToken),
      this.loadCounsellorTargets(authToken),
      this.loadReferrals(authToken),
    ]);
    const total = apps.length;
    const converted = apps.filter((a) => {
      const s = asString(a.status).toLowerCase();
      return s === 'converted' || s === 'enrolled';
    }).length;
    return {
      totalApplications: total,
      convertedApplications: converted,
      activeTargets: targets.length,
      referralsCount: referrals.length,
    };
  }
}
