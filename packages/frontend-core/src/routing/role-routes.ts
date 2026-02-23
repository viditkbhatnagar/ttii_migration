import type { PortalSurface } from '@ttii/shared-types';

export interface RoleRouteDefinition {
  path: '/admin' | '/centre' | '/student';
  surface: PortalSurface;
  label: string;
}

export const ROLE_ROUTES: readonly RoleRouteDefinition[] = [
  {
    path: '/student',
    surface: 'student',
    label: 'Student',
  },
  {
    path: '/centre',
    surface: 'centre',
    label: 'Centre',
  },
  {
    path: '/admin',
    surface: 'admin',
    label: 'Admin',
  },
] as const;

export function normalizePathname(pathname: string): string {
  const trimmed = pathname.trim();

  if (trimmed === '' || trimmed === '/') {
    return '/';
  }

  if (!trimmed.startsWith('/')) {
    return normalizePathname(`/${trimmed}`);
  }

  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

export function findRoleRoute(pathname: string): RoleRouteDefinition | undefined {
  const normalizedPath = normalizePathname(pathname);
  return ROLE_ROUTES.find((route) => route.path === normalizedPath);
}
