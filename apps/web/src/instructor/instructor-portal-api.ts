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

export interface InstructorDashboardLiveClass {
  id: number;
  title: string;
  date: string | null;
  fromTime: string | null;
  toTime: string | null;
  status: string;
  cohortId: number | null;
  cohortTitle: string | null;
  joinUrl: string | null;
  recordingUrl: string | null;
  recordingStorageKey: string | null;
}

export interface InstructorDashboardSnapshot {
  profile: {
    id: number;
    name: string;
    email: string;
    image: string | null;
  } | null;
  upcomingLiveClasses: InstructorDashboardLiveClass[];
  pastLiveClasses: InstructorDashboardLiveClass[];
  cohortCount: number;
}

export type InstructorLiveClassFilter = 'upcoming' | 'past' | 'all';

export interface InstructorLiveClassRow extends InstructorDashboardLiveClass {
  recordingFetchedAt: string | null;
  attendanceFetchedAt: string | null;
}

export interface InstructorAttendanceRow {
  id: number;
  email: string | null;
  displayName: string | null;
  role: string | null;
  totalSeconds: number | null;
  percentAttended: number | null;
  firstJoinedAt: string | null;
  lastLeftAt: string | null;
  userId: number | null;
  userName: string | null;
  studentId: string | null;
}

export interface InstructorAttendanceSnapshot {
  liveClassId: number;
  title: string;
  date: string | null;
  attendance: InstructorAttendanceRow[];
}

function asNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function asLiveClassRow(input: unknown): InstructorDashboardLiveClass {
  const row = asRecord(input) ?? {};
  return {
    id: asNumber(row.id),
    title: asString(row.title),
    date: asNullableString(row.date),
    fromTime: asNullableString(row.fromTime),
    toTime: asNullableString(row.toTime),
    status: asString(row.status),
    cohortId: row.cohortId == null ? null : asNumber(row.cohortId),
    cohortTitle: asNullableString(row.cohortTitle),
    joinUrl: asNullableString(row.joinUrl),
    recordingUrl: asNullableString(row.recordingUrl),
    recordingStorageKey: asNullableString(row.recordingStorageKey),
  };
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

  async loadLiveClasses(
    authToken: string,
    filter: InstructorLiveClassFilter = 'all',
  ): Promise<InstructorLiveClassRow[]> {
    const payload = await this.get<LegacyEnvelope<unknown>>(
      '/instructor/live-classes',
      authToken,
      { filter },
    );
    const list = Array.isArray(payload.data) ? payload.data : [];
    return list.map((item) => {
      const row = asRecord(item) ?? {};
      return {
        ...asLiveClassRow(row),
        recordingFetchedAt: asNullableString(row.recordingFetchedAt),
        attendanceFetchedAt: asNullableString(row.attendanceFetchedAt),
      };
    });
  }

  async loadLiveClassAttendance(
    authToken: string,
    liveClassId: number,
  ): Promise<InstructorAttendanceSnapshot | null> {
    try {
      const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>(
        `/instructor/live-classes/${liveClassId}/attendance`,
        authToken,
      );
      const data = asRecord(payload.data) ?? {};
      const list = Array.isArray(data.attendance) ? data.attendance : [];
      return {
        liveClassId: asNumber(data.liveClassId),
        title: asString(data.title),
        date: asNullableString(data.date),
        attendance: list.map((item) => {
          const row = asRecord(item) ?? {};
          return {
            id: asNumber(row.id),
            email: asNullableString(row.email),
            displayName: asNullableString(row.displayName),
            role: asNullableString(row.role),
            totalSeconds: row.totalSeconds == null ? null : asNumber(row.totalSeconds),
            percentAttended: row.percentAttended == null ? null : asNumber(row.percentAttended),
            firstJoinedAt: asNullableString(row.firstJoinedAt),
            lastLeftAt: asNullableString(row.lastLeftAt),
            userId: row.userId == null ? null : asNumber(row.userId),
            userName: asNullableString(row.userName),
            studentId: asNullableString(row.studentId),
          };
        }),
      };
    } catch {
      return null;
    }
  }

  async loadRecordingUrl(authToken: string, liveClassId: number): Promise<string | null> {
    try {
      const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>(
        `/instructor/live-classes/${liveClassId}/recording-url`,
        authToken,
      );
      const data = asRecord(payload.data) ?? {};
      return asNullableString(data.url);
    } catch {
      return null;
    }
  }

  async loadDashboard(authToken: string): Promise<InstructorDashboardSnapshot> {
    const payload = await this.get<LegacyEnvelope<Record<string, unknown>>>(
      '/instructor/dashboard',
      authToken,
    );
    const data = asRecord(payload.data) ?? {};
    const profile = asRecord(data.profile);
    const upcoming = Array.isArray(data.upcomingLiveClasses) ? data.upcomingLiveClasses : [];
    const past = Array.isArray(data.pastLiveClasses) ? data.pastLiveClasses : [];

    return {
      profile: profile
        ? {
            id: asNumber(profile.id),
            name: asString(profile.name),
            email: asString(profile.email),
            image: asNullableString(profile.image),
          }
        : null,
      upcomingLiveClasses: upcoming.map(asLiveClassRow),
      pastLiveClasses: past.map(asLiveClassRow),
      cohortCount: asNumber(data.cohortCount),
    };
  }
}
