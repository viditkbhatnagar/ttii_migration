export const LEGACY_ROLE = {
  ADMIN: 1,
  STUDENT: 2,
  INSTRUCTOR: 3,
  TEAM_LEAD: 4,
  CENTRE: 7,
  SUBADMIN: 8,
  COUNSELLOR: 9,
  ASSOCIATE: 10,
} as const;

/**
 * Roles allowed to call /admin/* data endpoints (applications, students,
 * targets, etc.). Counsellors share this surface — endpoint handlers scope
 * results by role_id internally so a counsellor can only see their own
 * applicants/students. Use a separate constant (ADMIN_PORTAL_SURFACE_ROLES)
 * for portal-shell guards that should NOT admit counsellors.
 */
export const ADMIN_PORTAL_ROLES = [
  LEGACY_ROLE.ADMIN,
  LEGACY_ROLE.SUBADMIN,
  LEGACY_ROLE.COUNSELLOR,
] as const;

/**
 * Roles allowed to render the admin portal shell at /admin. Counsellors are
 * routed to their own /counsellor portal (2026-05-01) so they're excluded
 * here even though they can still hit /admin/* data endpoints with their
 * scoped view.
 */
export const ADMIN_PORTAL_SURFACE_ROLES = [
  LEGACY_ROLE.ADMIN,
  LEGACY_ROLE.SUBADMIN,
] as const;

export const CENTRE_PORTAL_ROLES = [
  LEGACY_ROLE.CENTRE,
  LEGACY_ROLE.ASSOCIATE,
] as const;

export const INSTRUCTOR_PORTAL_ROLES = [
  LEGACY_ROLE.INSTRUCTOR,
] as const;

export const COUNSELLOR_PORTAL_ROLES = [
  LEGACY_ROLE.COUNSELLOR,
] as const;

const adminPortalRoleSet = new Set<number>(ADMIN_PORTAL_ROLES);
const centrePortalRoleSet = new Set<number>(CENTRE_PORTAL_ROLES);
const instructorPortalRoleSet = new Set<number>(INSTRUCTOR_PORTAL_ROLES);
const counsellorPortalRoleSet = new Set<number>(COUNSELLOR_PORTAL_ROLES);

export function resolveLegacyPortalPath(roleId: number | null | undefined): string {
  if (centrePortalRoleSet.has(roleId ?? -1)) {
    return '/centre/dashboard/index';
  }

  if (instructorPortalRoleSet.has(roleId ?? -1)) {
    return '/instructor/dashboard';
  }

  if (counsellorPortalRoleSet.has(roleId ?? -1)) {
    return '/counsellor/dashboard';
  }

  if (adminPortalRoleSet.has(roleId ?? -1)) {
    return '/admin/dashboard/index';
  }

  return '/app/dashboard/index';
}
