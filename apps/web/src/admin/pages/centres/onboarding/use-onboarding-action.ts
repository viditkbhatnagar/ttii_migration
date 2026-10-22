import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { AdminPortalApi } from '../../../admin-portal-api.js';
import { messageFromError } from '../../../shared/utils/admin-data-utils.js';

type Action = Parameters<AdminPortalApi['centreOnboardingAction']>[1];

/**
 * Run one onboarding action: toast the server's own message (success or the
 * refusal reason) and resolve to the response data, or null when refused.
 */
export function useOnboardingAction(api: AdminPortalApi, token: string) {
  const [busy, setBusy] = useState(false);
  const run = useCallback(async (action: Action, body: Record<string, unknown>, opts: { quiet?: boolean } = {}): Promise<Record<string, unknown> | null> => {
    setBusy(true);
    try {
      const res = await api.centreOnboardingAction(token, action, body);
      if (!opts.quiet) toast.success(res.message);
      return res.data;
    } catch (err: unknown) {
      toast.error(messageFromError(err));
      return null;
    } finally {
      setBusy(false);
    }
  }, [api, token]);
  return { run, busy };
}

/** Copy text to the clipboard; false when the browser refuses (insecure context, permissions). */
export async function copyText(value: string): Promise<boolean> {
  try {
    if (!navigator.clipboard) return false;
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}
