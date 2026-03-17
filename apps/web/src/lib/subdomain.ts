import type { PortalSurface } from '@ttii/shared-types';

const SUBDOMAIN_PORTAL_MAP: Record<string, PortalSurface> = {
  admin: 'admin',
  learn: 'student',
  admissions: 'centre',
};

const PORTAL_PATH_PREFIX: Record<PortalSurface, string> = {
  admin: '/admin',
  student: '/student',
  centre: '/centre',
};

/**
 * Detects which portal to serve based on the current hostname subdomain.
 * Returns null if no subdomain match (falls back to path-based routing).
 */
export function detectPortalFromSubdomain(): PortalSurface | null {
  if (typeof window === 'undefined') return null;

  const baseDomain = import.meta.env.VITE_BASE_DOMAIN as string | undefined;
  if (!baseDomain) return null;

  const hostname = window.location.hostname;
  if (!hostname.endsWith(baseDomain)) return null;

  const prefix = hostname.slice(0, -(baseDomain.length + 1)); // strip ".teachersindia.in"
  return SUBDOMAIN_PORTAL_MAP[prefix] ?? null;
}

/**
 * Given a detected portal surface, ensures the current path starts with the
 * correct portal prefix. Returns the corrected path or null if already correct.
 */
export function getSubdomainRedirectPath(portal: PortalSurface, pathname: string): string | null {
  const prefix = PORTAL_PATH_PREFIX[portal];
  if (pathname === '/' || !pathname.startsWith(prefix)) {
    return prefix;
  }
  return null;
}
