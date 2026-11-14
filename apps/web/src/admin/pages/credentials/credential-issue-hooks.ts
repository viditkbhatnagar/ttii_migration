import { useEffect, useState } from 'react';
import type { AdminPortalApi } from '../../admin-portal-api.js';
import { loadCredentialPermissions } from './use-credential-permissions.js';

export interface CredentialGrants { loaded: boolean; access: boolean; revoke: boolean; override: boolean }

// THE permission seam: pages render their data components only once `access` is known true
// (a 401/403 from a data call would pop the "session expired" dialog). At merge with the
// settings branch, replace the body with useCredentialPermissions(...) from
// ./use-credential-permissions. Revoke / Override actions show only when granted; the server
// enforces regardless.
export function useCredentialGrants(api: AdminPortalApi, token: string): CredentialGrants {
  const [grants, setGrants] = useState<CredentialGrants>({ loaded: false, access: false, revoke: false, override: false });
  useEffect(() => {
    let live = true;
    loadCredentialPermissions(api, token)
      .then((p) => { if (live) setGrants({ loaded: true, access: p.access, revoke: p.revoke, override: p.override }); })
      .catch(() => { if (live) setGrants({ loaded: true, access: false, revoke: false, override: false }); });
    return () => { live = false; };
  }, [api, token]);
  return grants;
}

/** Saves a blob as a file download. */
export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Opens a blob (PDF) in a new tab. */
export function openBlob(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export const pdfFileName = (documentNo: string, suffix = ''): string =>
  `${documentNo.replace(/[^A-Za-z0-9._-]+/g, '-')}${suffix}.pdf`;
