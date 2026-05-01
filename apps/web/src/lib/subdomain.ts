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
  instructor: '/instructor',
  counsellor: '/counsellor',
};

const ALL_PORTAL_PREFIXES = Object.values(PORTAL_PATH_PREFIX);

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
 * Given a detected portal surface, ensures the current path lands inside a
 * valid portal. Returns the corrected path or null if already on a portal.
 *
 * If the user is already on ANY known portal prefix (/admin, /student,
 * /centre, /instructor), we leave them alone — their role-based login routing
 * has already placed them on the correct portal, and we don't want the
 * subdomain to yank them somewhere else. This matters for instructors, who
 * log in via the admin subdomain but belong on /instructor.
 */
export function getSubdomainRedirectPath(portal: PortalSurface, pathname: string): string | null {
  if (ALL_PORTAL_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null;
  }
  return PORTAL_PATH_PREFIX[portal];
}
