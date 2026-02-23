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

export const ADMIN_PORTAL_ROLES = [
  LEGACY_ROLE.ADMIN,
  LEGACY_ROLE.SUBADMIN,
  LEGACY_ROLE.INSTRUCTOR,
  LEGACY_ROLE.COUNSELLOR,
  LEGACY_ROLE.ASSOCIATE,
] as const;

const adminPortalRoleSet = new Set<number>(ADMIN_PORTAL_ROLES);

export function resolveLegacyPortalPath(roleId: number | null | undefined): string {
  if (roleId === LEGACY_ROLE.CENTRE) {
    return '/centre/dashboard/index';
  }

  if (adminPortalRoleSet.has(roleId ?? -1)) {
    return '/admin/dashboard/index';
  }

  return '/app/dashboard/index';
}
