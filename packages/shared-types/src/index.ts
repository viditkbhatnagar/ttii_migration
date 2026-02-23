export interface ApiHealthPayload {
  status: 'ok';
  service: 'api';
  timestamp: string;
}

export interface ApiEnvelope<T> {
  data: T;
  message?: string;
}

export type UiTheme = 'light' | 'dark';

export const LEGACY_ROLE_ID = {
  ADMIN: 1,
  STUDENT: 2,
  INSTRUCTOR: 3,
  TEAM_LEAD: 4,
  CENTRE: 7,
  SUBADMIN: 8,
  COUNSELLOR: 9,
  ASSOCIATE: 10,
} as const;

export type LegacyRoleId = (typeof LEGACY_ROLE_ID)[keyof typeof LEGACY_ROLE_ID];

export type PortalSurface = 'admin' | 'centre' | 'student';

export interface LegacyAuthUserData {
  user_id: number;
  role_id: number;
  auth_token: string;
  user_name?: string;
}

export interface LegacyAuthLoginResponse {
  status: number | boolean | string;
  message?: string;
  userdata: LegacyAuthUserData;
  data?: {
    redirect_path?: string;
    session_expires_at?: string;
  };
}

export interface LegacyAuthMeResponse {
  status: number | boolean | string;
  message?: string;
  data: {
    user_id: number;
    role_id: number;
  };
}
