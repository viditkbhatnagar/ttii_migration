import type { users } from '@prisma/client';

export interface AuthContext {
  sessionId: string;
  tokenHash: string;
  user: users;
  /**
   * user.id values this session is permitted to switch into — the
   * same-email rows the person password-verified at login (or all
   * same-email rows for SSO). Always includes the current user's id.
   * Drives + gates the post-login role switcher.
   */
  linkedUserIds: number[];
}

export interface RequestMeta {
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}

export interface LegacyUserData {
  user_id: string;
  student_id: string;
  user_name: string;
  role_id: number | '';
  course_id: string;
  auth_token: string;
  user_email: string;
  user_phone: string;
  device_id: string;
  course_name: string;
  status: number;
  academic_year: string;
  user_image: string;
  privacy_policy: string;
}

export class AuthError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
    readonly code: string,
    readonly data: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'AuthError';
  }
}
