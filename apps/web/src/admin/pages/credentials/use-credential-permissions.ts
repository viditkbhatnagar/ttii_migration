import { useEffect, useState } from 'react';
import type { AdminPortalApi } from '../../admin-portal-api.js';
import { ALL_CREDENTIAL_PERMISSIONS, NO_CREDENTIAL_PERMISSIONS, toCredentialPermissions, type CredentialPermissions } from './credential-permissions.js';

// Cached per session token, so the sidebar and every credential page share one request.
const cache = new Map<string, Promise<CredentialPermissions>>();

export function loadCredentialPermissions(api: AdminPortalApi, token: string): Promise<CredentialPermissions> {
  let pending = cache.get(token);
  if (!pending) {
    pending = api.loadCredentialPermissions(token).then(toCredentialPermissions).catch((): CredentialPermissions => {
      cache.delete(token); // retry next time; fail closed for now
      return NO_CREDENTIAL_PERMISSIONS;
    });
    cache.set(token, pending);
  }
  return pending;
}

/** Call after a Super Admin changes grants so the next read is fresh. */
export function resetCredentialPermissionsCache(): void { cache.clear(); }

/** null while loading. Super Admin (role 1) resolves immediately without a request. */
export function useCredentialPermissions(api: AdminPortalApi, token: string, roleId: number): CredentialPermissions | null {
  const [perms, setPerms] = useState<CredentialPermissions | null>(roleId === 1 ? ALL_CREDENTIAL_PERMISSIONS : null);
  useEffect(() => {
    if (roleId === 1) { setPerms(ALL_CREDENTIAL_PERMISSIONS); return undefined; }
    let live = true;
    void loadCredentialPermissions(api, token).then((p) => { if (live) setPerms(p); });
    return () => { live = false; };
  }, [api, token, roleId]);
  return perms;
}
