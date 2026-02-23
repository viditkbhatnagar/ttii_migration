import {
  ROLE_ROUTES,
  findRoleRoute,
  loadRoleShellAccess,
  normalizePathname,
  type AuthApi,
  type AuthSession,
  type RoleRouteDefinition,
  type RoleShellLoadResult,
} from '@ttii/frontend-core';

export interface LoadedRoleShell {
  route: RoleRouteDefinition;
  access: RoleShellLoadResult;
}

export async function loadRoleShellForPath(
  pathname: string,
  session: AuthSession | null,
  authApi: AuthApi,
): Promise<LoadedRoleShell | null> {
  const normalizedPath = normalizePathname(pathname);
  const route = findRoleRoute(normalizedPath) ?? ROLE_ROUTES.find((entry) => normalizedPath.startsWith(`${entry.path}/`));

  if (!route) {
    return null;
  }

  const access = await loadRoleShellAccess({
    requiredSurface: route.surface,
    session,
    authApi,
  });

  return {
    route,
    access,
  };
}
