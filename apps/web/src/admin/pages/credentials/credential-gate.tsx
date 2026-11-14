import { useEffect, useState, type ReactNode } from 'react';
import type { AdminPortalApi } from '../../admin-portal-api.js';
import { loadCredentialPermissions } from './use-credential-permissions.js';

// THE permission seam for the credential pages I own. useAdminPageData treats a
// 401/403 as "session expired", so a page must know it is allowed BEFORE it
// loads any data: children mount (and fetch) only once the check passes.
// Shares the per-token cache with the sidebar (use-credential-permissions.ts).

export type CredentialNeed = 'access' | 'revoke' | 'override' | 'settings' | 'reports';

export function CredentialGate({ api, token, need, children }: { api: AdminPortalApi; token: string; need: CredentialNeed; children: ReactNode }) {
  const [state, setState] = useState<'loading' | 'allowed' | 'denied'>('loading');
  useEffect(() => {
    let cancelled = false;
    void loadCredentialPermissions(api, token)
      .then((p) => { if (!cancelled) setState(p[need] ? 'allowed' : 'denied'); })
      .catch(() => { if (!cancelled) setState('denied'); });
    return () => { cancelled = true; };
  }, [api, token, need]);
  if (state === 'loading') return <p className="p-12 text-center text-sm text-muted-foreground">Loading...</p>;
  if (state === 'denied') {
    return (
      <div role="status" className="m-6 rounded-2xl border border-border bg-card p-10 text-center">
        <h1 className="text-lg font-semibold">Access unavailable</h1>
        <p className="mt-1 text-sm text-muted-foreground">You do not have permission to open this page. Ask a Super Admin to grant it under User Management.</p>
      </div>
    );
  }
  return <>{children}</>;
}
