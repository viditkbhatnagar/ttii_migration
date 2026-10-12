import { useEffect, useState } from 'react';
import type { AdminPortalApi } from '../../admin-portal-api.js';
import { messageFromError } from '../../shared/utils/admin-data-utils.js';
import { toOrgOptions, type OrgOptions } from './org-model.js';

/** Loads the pickers (counsellors, leaders, groups, teams) whenever a dialog opens. */
export function useOrgOptions(api: AdminPortalApi, token: string, open: boolean): { options: OrgOptions | null; error: string } {
  const [options, setOptions] = useState<OrgOptions | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open) return undefined;
    let live = true;
    setOptions(null);
    setError('');
    api.loadCounsellorOrgOptions(token)
      .then((raw) => { if (live) setOptions(toOrgOptions(raw)); })
      .catch((err: unknown) => { if (live) setError(messageFromError(err)); });
    return () => { live = false; };
  }, [api, token, open]);
  return { options, error };
}
