import { describe, expect, it, vi } from 'vitest';

import { ApiError, loadRoleShellAccess, type AuthApi } from '../src/index';

describe('loadRoleShellAccess', () => {
  it('returns unauthenticated when no session is present', async () => {
    const authApi: AuthApi = {
      login: vi.fn(),
      getCurrentUser: vi.fn().mockResolvedValue({ userId: 0, roleId: 0 }),
      checkPortalAccess: vi.fn().mockResolvedValue(undefined),
      logout: vi.fn(),
    };

    const result = await loadRoleShellAccess({
      requiredSurface: 'student',
      session: null,
      authApi,
    });

    expect(result.status).toBe('unauthenticated');
    expect(result.session).toBeNull();
  });

  it('returns ready when role gate succeeds', async () => {
    const checkPortalAccess = vi.fn().mockResolvedValue(undefined);
    const authApi: AuthApi = {
      login: vi.fn(),
      getCurrentUser: vi.fn().mockResolvedValue({ userId: 41, roleId: 2 }),
      checkPortalAccess,
      logout: vi.fn(),
    };

    const result = await loadRoleShellAccess({
      requiredSurface: 'student',
      session: {
        token: 'student-token',
        userId: 41,
        roleId: 2,
      },
      authApi,
    });

    expect(result.status).toBe('ready');
    expect(result.session?.roleId).toBe(2);
    expect(checkPortalAccess).toHaveBeenCalledWith('student', 'student-token');
  });

  it('returns forbidden when portal access check fails with 403', async () => {
    const authApi: AuthApi = {
      login: vi.fn(),
      getCurrentUser: vi.fn().mockResolvedValue({ userId: 7, roleId: 7 }),
      checkPortalAccess: vi.fn().mockRejectedValue(
        new ApiError('Access denied.', {
          statusCode: 403,
          path: '/auth/portal/admin',
        }),
      ),
      logout: vi.fn(),
    };

    const result = await loadRoleShellAccess({
      requiredSurface: 'admin',
      session: {
        token: 'centre-token',
        userId: 7,
        roleId: 7,
      },
      authApi,
    });

    expect(result.status).toBe('forbidden');
    expect(result.message).toContain('cannot access');
  });
});
