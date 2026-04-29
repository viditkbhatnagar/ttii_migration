import type { FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';

import { getPrismaClient } from '../data/prisma-client.js';

/**
 * Admin permission system (Track 3 of Naji's QA round 2026-04-30).
 *
 * Today's admin gates use raw role_id checks (e.g.
 * requireLegacyRoles([1, 8])). Per Naji's product call we keep role_id 1
 * (Super Admin) and 8 (Admin) as legacy markers but layer fine-grained
 * permissions on top, so a single "Admin" role can have toggleable
 * capabilities ("Manage Courses", "Approve Refunds", etc.) instead of
 * everything-or-nothing.
 *
 * The permission catalogue lives in the legacy `permission` table (slug
 * column = our stable key) and grants live in `user_permission`. Both are
 * declared in prisma/schema.prisma. Existing Super Admin / Admin users
 * were backfilled with the full set on migration day so no one loses
 * access at deploy time.
 */

export const PERMISSION_KEYS = {
  LEARNERS_MANAGE: 'learners.manage',
  LEARNERS_EXPORT: 'learners.export',
  COURSES_MANAGE: 'courses.manage',
  COHORTS_MANAGE: 'cohorts.manage',
  CONTENT_LIBRARY_MANAGE: 'content_library.manage',
  ASSESSMENTS_MANAGE: 'assessments.manage',
  FEES_VIEW: 'fees.view',
  FEES_MANAGE: 'fees.manage',
  FEES_REFUND: 'fees.refund',
  CENTRES_MANAGE: 'centres.manage',
  USERS_MANAGE_ADMINS: 'users.manage_admins',
  USERS_MANAGE_COUNSELLORS: 'users.manage_counsellors',
  USERS_MANAGE_ASSOCIATES: 'users.manage_associates',
  USERS_MANAGE_INSTRUCTORS: 'users.manage_instructors',
  COMMUNICATIONS_MANAGE: 'communications.manage',
  REPORTS_VIEW: 'reports.view',
  SETTINGS_MANAGE: 'settings.manage',
} as const;

export type PermissionKey = typeof PERMISSION_KEYS[keyof typeof PERMISSION_KEYS];

const prisma = getPrismaClient();

/** Loads the active permission slugs granted to the user. Centre/Student
 * roles always return an empty set — this layer is admin-only. */
export async function loadUserPermissionKeys(userId: number): Promise<Set<string>> {
  const grants = await prisma.user_permission.findMany({
    where: { user_id: userId, deleted_at: null },
    select: { permission_id: true },
  });
  if (grants.length === 0) return new Set();
  const perms = await prisma.permission.findMany({
    where: { id: { in: grants.map((g) => g.permission_id) } },
    select: { slug: true },
  });
  return new Set(perms.map((p) => p.slug ?? '').filter(Boolean));
}

/** Fastify pre-handler that allows the request only when the user holds
 * the named permission. Use after requireLegacyAuth so authContext is
 * already populated. Super Admin (role_id=1) is always allowed —
 * permission grants act as filters for role_id=8 admins.
 */
export function requirePermission(key: PermissionKey): preHandlerAsyncHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const ctx = request.authContext;
    if (!ctx) {
      reply.code(401).send({ status: 0, message: 'User not authenticated!', data: [] });
      return;
    }
    const roleId = ctx.user.role_id ?? 0;

    // Super Admin always has every permission. Cheap escape hatch.
    if (roleId === 1) return;

    // For non-admin roles, the permission system isn't applicable — fall
    // back to existing role checks elsewhere in the route.
    if (roleId !== 8) {
      reply.code(403).send({ status: 0, message: 'Access denied.', data: [] });
      return;
    }

    const userIdRaw = ctx.user.id;
    const userId = typeof userIdRaw === 'number' ? userIdRaw : Number(userIdRaw);
    if (!Number.isFinite(userId) || userId <= 0) {
      reply.code(401).send({ status: 0, message: 'User not authenticated!', data: [] });
      return;
    }

    const grants = await loadUserPermissionKeys(userId);
    if (!grants.has(key)) {
      reply.code(403).send({
        status: 0,
        message: `You don't have the "${key}" permission. Ask a Super Admin to grant it under User Management.`,
        data: [],
      });
      return;
    }
  };
}

export type PermissionRow = {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  category: string | null;
};

/** All admin-app permissions (rows where category is non-null — legacy PHP
 * permissions don't have a category and aren't shown in our toggle UI). */
export async function listAdminPermissions(): Promise<PermissionRow[]> {
  const rows = await prisma.permission.findMany({
    where: { category: { not: null } },
    orderBy: [{ category: 'asc' }, { title: 'asc' }],
    select: { id: true, slug: true, title: true, description: true, category: true },
  });
  return rows
    .filter((r): r is { id: number; slug: string; title: string; description: string | null; category: string | null } => r.slug !== null && r.title !== null)
    .map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      description: r.description,
      category: r.category,
    }));
}

/** Returns the list of admin-app permission ids granted to a user. */
export async function listUserGrantedPermissionIds(userId: number): Promise<number[]> {
  const adminPerms = await prisma.permission.findMany({
    where: { category: { not: null } },
    select: { id: true },
  });
  if (adminPerms.length === 0) return [];

  const grants = await prisma.user_permission.findMany({
    where: {
      user_id: userId,
      deleted_at: null,
      permission_id: { in: adminPerms.map((p) => p.id) },
    },
    select: { permission_id: true },
  });
  return grants.map((g) => g.permission_id);
}

/** Replaces the user's admin-permission grant set. Adds missing grants,
 * soft-deletes removed ones, and leaves untouched anything outside the
 * admin catalogue (legacy PHP permissions). */
export async function setUserPermissions(
  actorUserId: number,
  targetUserId: number,
  grantedPermissionIds: number[],
): Promise<void> {
  const adminPerms = await prisma.permission.findMany({
    where: { category: { not: null } },
    select: { id: true },
  });
  const adminIdSet = new Set(adminPerms.map((p) => p.id));
  const desired = new Set(grantedPermissionIds.filter((id) => adminIdSet.has(id)));

  const existing = await prisma.user_permission.findMany({
    where: {
      user_id: targetUserId,
      permission_id: { in: [...adminIdSet] },
    },
    select: { permission_id: true, deleted_at: true },
  });

  const toGrant: number[] = [];
  const toRevoke: number[] = [];
  const toRestore: number[] = [];

  const existingByPerm = new Map(existing.map((e) => [e.permission_id, e.deleted_at]));

  for (const id of adminIdSet) {
    const wantsGrant = desired.has(id);
    const current = existingByPerm.get(id);
    if (wantsGrant) {
      if (current === undefined) toGrant.push(id);
      else if (current !== null) toRestore.push(id);
    } else {
      if (current !== undefined && current === null) toRevoke.push(id);
    }
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    if (toGrant.length > 0) {
      await tx.user_permission.createMany({
        data: toGrant.map((permission_id) => ({
          user_id: targetUserId,
          permission_id,
          granted_by: actorUserId,
          granted_at: now,
        })),
        skipDuplicates: true,
      });
    }
    if (toRestore.length > 0) {
      await tx.user_permission.updateMany({
        where: { user_id: targetUserId, permission_id: { in: toRestore } },
        data: { deleted_at: null, granted_at: now, granted_by: actorUserId },
      });
    }
    if (toRevoke.length > 0) {
      await tx.user_permission.updateMany({
        where: { user_id: targetUserId, permission_id: { in: toRevoke } },
        data: { deleted_at: now },
      });
    }
  });
}
