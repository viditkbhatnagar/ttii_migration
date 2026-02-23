import type { users } from '@prisma/client';

export interface AuthContext {
  sessionId: number;
  tokenHash: string;
  user: users;
}

export interface RequestMeta {
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}

export interface LegacyUserData {
  user_id: number;
  student_id: string;
  user_name: string;
  role_id: number | '';
  course_id: number | '';
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
