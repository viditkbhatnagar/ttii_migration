import type { FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';

import { loadUserPermissionKeys, PERMISSION_KEYS, type PermissionKey } from './permissions.js';

// Guards layered on the permission catalogue (permissions.ts is untouched).
// Super Admin (role 1) always passes; Admin (role 8) needs the grant; every
// other role is refused. The grant loader is injectable for tests.

export type PermissionLoader = (userId: number) => Promise<Set<string>>;

export interface CredentialPermissions { access: boolean; revoke: boolean; override: boolean; settings: boolean; reports: boolean }

const CREDENTIAL_KEYS: Record<keyof CredentialPermissions, PermissionKey> = {
  access: PERMISSION_KEYS.CREDENTIALS_ACCESS,
  revoke: PERMISSION_KEYS.CREDENTIALS_REVOKE,
  override: PERMISSION_KEYS.CREDENTIALS_OVERRIDE,
  settings: PERMISSION_KEYS.CREDENTIALS_SETTINGS,
  reports: PERMISSION_KEYS.CREDENTIALS_REPORTS,
};

function actorOf(request: FastifyRequest): { id: number; role: number } | null {
  const user = request.authContext?.user;
  if (!user) return null;
  const id = typeof user.id === 'number' ? user.id : Number(user.id);
  return Number.isFinite(id) && id > 0 ? { id, role: user.role_id ?? 0 } : null;
}

/** The five Credential Manager switches for the signed-in user. */
export async function resolveCredentialPermissions(request: FastifyRequest, load: PermissionLoader = loadUserPermissionKeys): Promise<CredentialPermissions> {
  const none: CredentialPermissions = { access: false, revoke: false, override: false, settings: false, reports: false };
  const actor = actorOf(request);
  if (!actor) return none;
  if (actor.role === 1) return { access: true, revoke: true, override: true, settings: true, reports: true };
  if (actor.role !== 8) return none;
  const grants = await load(actor.id);
  return {
    access: grants.has(CREDENTIAL_KEYS.access), revoke: grants.has(CREDENTIAL_KEYS.revoke), override: grants.has(CREDENTIAL_KEYS.override),
    settings: grants.has(CREDENTIAL_KEYS.settings), reports: grants.has(CREDENTIAL_KEYS.reports),
  };
}

/** Allows the request when the user holds ANY of the named credential switches. */
export function requireAnyCredentialPermission(keys: Array<keyof CredentialPermissions>, load: PermissionLoader = loadUserPermissionKeys): preHandlerAsyncHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!actorOf(request)) {
      reply.code(401).send({ status: 0, message: 'User not authenticated!', data: [] });
      return;
    }
    const perms = await resolveCredentialPermissions(request, load);
    if (keys.some((k) => perms[k])) return;
    const needed = keys.map((k) => CREDENTIAL_KEYS[k]).join(' or ');
    reply.code(403).send({ status: 0, message: `You don't have the "${needed}" permission. Ask a Super Admin to grant it under User Management.`, data: [] });
  };
}

/** Changing anyone's permission grants: Super Admin, or an Admin holding users.manage_admins (never a counsellor). */
export function requirePermissionManager(load: PermissionLoader = loadUserPermissionKeys): preHandlerAsyncHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const actor = actorOf(request);
    if (!actor) {
      reply.code(401).send({ status: 0, message: 'User not authenticated!', data: [] });
      return;
    }
    if (actor.role === 1) return;
    if (actor.role === 8 && (await load(actor.id)).has(PERMISSION_KEYS.USERS_MANAGE_ADMINS)) return;
    reply.code(403).send({ status: 0, message: 'Only a Super Admin or an admin who can manage admins may change permissions.', data: [] });
  };
}
