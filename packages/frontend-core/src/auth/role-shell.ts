import type { PortalSurface } from '@ttii/shared-types';

import { toApiError } from '../api/api-error.js';
import type { AuthApi, AuthSession } from './auth-api.js';

export type RoleShellLoadStatus = 'ready' | 'unauthenticated' | 'forbidden' | 'error';

export interface RoleShellLoadResult {
  status: RoleShellLoadStatus;
  session: AuthSession | null;
  message: string;
}

export interface LoadRoleShellAccessOptions {
  requiredSurface: PortalSurface;
  session: AuthSession | null;
  authApi: AuthApi;
}

export async function loadRoleShellAccess(
  options: LoadRoleShellAccessOptions,
): Promise<RoleShellLoadResult> {
  if (!options.session) {
    return {
      status: 'unauthenticated',
      session: null,
      message: 'Session required. Please login first.',
    };
  }

  try {
    const currentUser = await options.authApi.getCurrentUser(options.session.token);
    const refreshedSession: AuthSession = {
      token: options.session.token,
      userId: currentUser.userId,
      roleId: currentUser.roleId,
    };

    await options.authApi.checkPortalAccess(options.requiredSurface, options.session.token);

    return {
      status: 'ready',
      session: refreshedSession,
      message: 'Role shell access granted.',
    };
  } catch (error: unknown) {
    const apiError = toApiError(error, `/auth/portal/${options.requiredSurface}`);

    if (apiError.statusCode === 401) {
      return {
        status: 'unauthenticated',
        session: null,
        message: 'Session expired. Please login again.',
      };
    }

    if (apiError.statusCode === 403) {
      return {
        status: 'forbidden',
        session: options.session,
        message: 'This account cannot access the requested portal.',
      };
    }

    return {
      status: 'error',
      session: options.session,
      message: apiError.message,
    };
  }
}
