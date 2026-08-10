// Naji UAT 2026-08-08 — the live-class join window is shared by the API and the
// student portal so the two can never disagree about when a class opens.
export {
  IST_OFFSET_MS,
  LIVE_CLASS_JOIN_LEAD_MINUTES,
  LIVE_CLASS_JOIN_GRACE_MINUTES,
  formatIstTimeOfDay,
  isLiveClassJoinOpen,
  liveClassJoinOpensLabel,
  liveClassJoinState,
  liveClassJoinWindow,
  liveClassJoinWindowFromColumns,
  liveClassJoinWindowFromStrings,
  liveClassScheduleFromColumns,
  liveClassScheduleFromStrings,
  type LiveClassJoinState,
  type LiveClassJoinWindow,
  type LiveClassScheduleParts,
} from './live-class-window.js';

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

export type PortalSurface = 'admin' | 'centre' | 'student' | 'instructor' | 'counsellor' | 'associate';

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
