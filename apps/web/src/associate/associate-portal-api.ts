import {
  LegacyApiClient,
  type LegacyApiRequestOptions,
  type QueryValue,
} from '@ttii/frontend-core';
import { CounsellorPortalApi } from '../counsellor/counsellor-portal-api.js';
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

function toRecords(input: unknown): Record<string, unknown>[] {
  if (!Array.isArray(input)) return [];
  return input.filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x));
}

// Rewrites an `/admin/*` request path to the associate-safe `/centre*` route
// that backs it (all gated [requireAuth, requireCentreRole], scoped to the
// associate's own data or ownership-guarded per-record). Returns null for any
// admin path with no associate-safe equivalent, so the client rejects it
// clearly rather than ever hitting `/admin/*`.
function rewriteAdminPathToCentre(path: string): string | null {
  const exact: Record<string, string> = {
    // Core application/student list reads (associate-scoped in the service layer).
    '/admin/applications/index': '/centre/applications/index',
    '/admin/students/index': '/centre/students/index',
    // Core application reads/writes (associate-scoped in the service layer).
    '/admin/applications/get': '/centre/applications/get',
    '/admin/applications/add': '/centre/applications/add',
    '/admin/applications/convert': '/centre/applications/convert',
    '/admin/applications/update_status': '/centre/applications/update_status',
    '/admin/applications/get_pipeline_users': '/centre/applications/get_pipeline_users',
    // Per-application actions (ownership-guarded on the backend).
    '/admin/applications/edit': '/centre/associate/applications/edit',
    '/admin/applications/delete': '/centre/associate/applications/delete',
    '/admin/applications/verify': '/centre/associate/applications/verify',
    '/admin/applications/form-link/generate': '/centre/associate/applications/form-link/generate',
    '/admin/applications/payment-link/generate': '/centre/associate/applications/payment-link/generate',
    '/admin/applications/payment-plan/save': '/centre/associate/applications/payment-plan/save',
    '/admin/applications/mark-paid': '/centre/associate/applications/mark-paid',
    // Leads.
    '/admin/leads/add': '/centre/associate/leads/add',
    '/admin/leads/edit': '/centre/associate/leads/edit',
    '/admin/leads/duplicate-check': '/centre/associate/leads/duplicate-check',
    // Student detail (student-ownership-guarded).
    '/admin/students/view': '/centre/associate/students/view',
    '/admin/students/analytics': '/centre/associate/students/analytics',
    // Self-account edit (forced to caller's own id on the backend).
    '/admin/user/edit': '/centre/associate/user/edit',
    // Global catalog / reference reads (gate-only mirrors).
    '/admin/centres/index': '/centre/associate/centres',
    '/admin/batch/index': '/centre/associate/batches',
    '/admin/language/index': '/centre/associate/languages',
    '/admin/offerings': '/centre/offerings',
    '/admin/certificate_combinations': '/centre/certificate_combinations',
    '/admin/certification_partners': '/centre/certification_partners',
    '/admin/resources/index': '/centre/resources/index',
  };
  const hit = exact[path];
  if (hit) return hit;

  // Parameterised paths.
  let m: RegExpMatchArray | null;
  if ((m = path.match(/^\/admin\/offerings\/([^/]+)\/packages$/))) {
    return `/centre/offerings/${m[1] ?? ''}/packages`;
  }
  if ((m = path.match(/^\/admin\/certificate_combinations\/([^/]+)$/))) {
    return `/centre/certificate_combinations/${m[1] ?? ''}`;
  }
  if ((m = path.match(/^\/admin\/students\/([^/]+)\/add-enrolment$/))) {
    return `/centre/associate/students/${m[1] ?? ''}/add-enrolment`;
  }
  if ((m = path.match(/^\/admin\/courses\/([^/]+)\/required-documents$/))) {
    return `/centre/courses/${m[1] ?? ''}/required-documents`;
  }
  return null;
}

/**
 * A LegacyApiClient wrapper for the associate admin-bridge. Any `/admin/*`
 * request is transparently rewritten to its associate-safe `/centre*` route
 * (see rewriteAdminPathToCentre) and delegated to the real client — so every
 * inherited AdminPortalApi method automatically lands on the ownership-scoped
 * associate endpoint, response shape unchanged. Admin paths with no equivalent
 * reject clearly (never an actual /admin call). Non-admin paths pass through.
 */
class AssociateAdminApiClient extends LegacyApiClient {
  private readonly realClient: LegacyApiClient;

  constructor(realClient: LegacyApiClient) {
    super({ baseUrl: realClient.getBaseUrl() });
    this.realClient = realClient;
  }

  override async request<T>(options: LegacyApiRequestOptions): Promise<T> {
    if (options.path.startsWith('/admin/')) {
      const centrePath = rewriteAdminPathToCentre(options.path);
      if (!centrePath) {
        return Promise.reject(
          new Error(
            `[associate-portal] "${options.path}" has no associate-safe equivalent yet. ` +
              'A follow-up /centre or /centre/associate backend endpoint is required to back this action.',
          ),
        );
      }
      return this.realClient.request<T>({ ...options, path: centrePath });
    }
    return this.realClient.request<T>(options);
  }
}

/**
 * The `.admin`-shaped bridge the reused counsellor pages call through
 * (View/Edit Application, Add Lead, Generate Payment Link, Student detail, …).
 * It extends AdminPortalApi so it is 1:1 type-compatible; its underlying client
 * is an AssociateAdminApiClient that rewrites every `/admin/*` call to the
 * matching associate-safe `/centre*` route. The ONLY method overridden here is
 * uploadFile, which bypasses request() with a direct multipart fetch and so is
 * repointed to /centre/upload explicitly.
 */
class AssociateAdminBridge extends AdminPortalApi {
  private readonly centreClient: LegacyApiClient;

  constructor(realClient: LegacyApiClient) {
    super(new AssociateAdminApiClient(realClient));
    this.centreClient = realClient;
  }

  // Direct multipart fetch — repointed to the centre/associate upload route
  // (mirrors AdminPortalApi.uploadFile, which posts to /admin/upload).
  override async uploadFile(authToken: string, file: File): Promise<{ key: string; url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const url = `${this.centreClient.getBaseUrl()}centre/upload?auth_token=${encodeURIComponent(authToken)}`;
    const response = await fetch(url, { method: 'POST', body: formData });
    const contentType = response.headers.get('content-type') ?? '';
    if (!response.ok || !contentType.includes('application/json')) {
      if (response.status === 413) {
        throw new Error('File is too large to upload (max 200 MB). Please compress it or split it into smaller files.');
      }
      throw new Error(`Upload failed (${response.status}). The file may be too large or the server rejected it.`);
    }
    const payload = (await response.json()) as Record<string, unknown>;
    if (!payload || payload.status !== 1) {
      throw new Error((payload?.message as string) || 'Upload failed');
    }
    return payload.data as { key: string; url: string };
  }
}

/**
 * Associate portal API client. Extends CounsellorPortalApi so it is a drop-in
 * for the reused counsellor pages (identical public surface), but every read
 * that would hit an `/admin/*` counsellor endpoint is overridden to hit the
 * associate-scoped `/centre/*` and `/centre/associate/*` endpoints instead. The
 * inherited profile/course reads already target auth-only endpoints (`/profile/*`,
 * `/course/*`) that role 10 may call, so they are reused unchanged.
 */
export class AssociatePortalApi extends CounsellorPortalApi {
  private readonly client: LegacyApiClient;
  private _bridge: AssociateAdminBridge | null = null;

  constructor(apiClient: LegacyApiClient) {
    super(apiClient);
    this.client = apiClient;
  }

  private async assocGet<T>(path: string, authToken: string, query?: Record<string, QueryValue>): Promise<LegacyEnvelope<T>> {
    return this.client.request<LegacyEnvelope<T>>({
      method: 'GET',
      path,
      authToken,
      ...(query ? { query } : {}),
    });
  }

  private async assocPost<T>(path: string, authToken: string, body?: Record<string, unknown>): Promise<T> {
    return this.client.request<T>({
      method: 'POST',
      path,
      authToken,
      ...(body ? { body } : {}),
    });
  }

  override get admin(): AdminPortalApi {
    if (!this._bridge) this._bridge = new AssociateAdminBridge(this.client);
    return this._bridge;
  }

  // ── Applications / students (associate-scoped /centre reads) ──────────────
  override async loadApplications(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.assocGet<Record<string, unknown>>('/centre/applications/index', authToken);
    const data = asRecord(payload.data) ?? {};
    return toRecords(data.students);
  }

  override async loadStudents(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.assocGet<unknown[]>('/centre/students/index', authToken);
    return toRecords(payload.data);
  }

  override async getApplication(authToken: string, id: string): Promise<Record<string, unknown>> {
    const payload = await this.assocGet<Record<string, unknown>>('/centre/applications/get', authToken, { id });
    return asRecord(payload.data) ?? {};
  }

  override async createApplication(authToken: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.assocPost<Record<string, unknown>>('/centre/applications/add', authToken, input);
  }

  override async convertApplication(authToken: string, applicationId: string): Promise<Record<string, unknown>> {
    return this.assocPost<Record<string, unknown>>('/centre/applications/convert', authToken, { application_id: applicationId });
  }

  override async updateApplicationStatus(
    authToken: string,
    id: string,
    status: string,
    rejectReason?: string,
  ): Promise<Record<string, unknown>> {
    return this.assocPost<Record<string, unknown>>('/centre/applications/update_status', authToken, {
      id,
      status,
      reject_reason: rejectReason || '',
    });
  }

  // ── CRM reads (associate-scoped siblings of /admin/counsellor/*) ──────────
  override async loadCounsellorTargets(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.assocGet<unknown[]>('/centre/associate/targets', authToken);
    return toRecords(payload.data);
  }

  override async loadReferrals(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.assocGet<unknown[]>('/centre/associate/referrals', authToken);
    return toRecords(payload.data);
  }

  override async loadCounsellorDashboard(authToken: string): Promise<Record<string, unknown>> {
    const payload = await this.assocGet<Record<string, unknown>>('/centre/associate/dashboard', authToken);
    return asRecord(payload.data) ?? {};
  }

  override async loadCounsellorPayments(authToken: string): Promise<Record<string, unknown>> {
    const payload = await this.assocGet<Record<string, unknown>>('/centre/associate/payments', authToken);
    return asRecord(payload.data) ?? {};
  }

  override async loadCounsellorLeaderboard(authToken: string): Promise<Record<string, unknown>> {
    const payload = await this.assocGet<Record<string, unknown>>('/centre/associate/leaderboard', authToken);
    return asRecord(payload.data) ?? {};
  }

  override async loadTrainingVideos(authToken: string): Promise<Record<string, unknown>[]> {
    const payload = await this.assocGet<unknown[]>('/centre/training_videos/index', authToken);
    return toRecords(payload.data);
  }
}
