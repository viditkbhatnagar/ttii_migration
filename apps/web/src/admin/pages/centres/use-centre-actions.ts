import { useCallback } from 'react';
import { toast } from 'sonner';
import { useConfirm } from '@/components/confirm-dialog';
import type { AdminPortalApi } from '../../admin-portal-api.js';
import { asString } from '../../shared/utils/admin-data-utils.js';
import type { CentreStatus } from './centre-list-model.js';

// Row / hero actions shared by the Centre Directory and the Centre Profile:
// Activate / Deactivate (centres.status only — the centre login is untouched),
// Resend Login Email (the existing resendLoginCredentials path) and Delete
// (the existing soft delete). Every one asks first.

export interface CentreActionTarget {
  id: string;
  name: string;
  status: CentreStatus;
  /** The role-7 login ('' when none is wired). */
  loginUserId: string;
  loginEmail: string;
}

export interface CentreActions {
  toggleStatus: (c: CentreActionTarget) => Promise<CentreStatus | null>;
  resendLogin: (c: CentreActionTarget) => Promise<void>;
  remove: (c: CentreActionTarget) => Promise<boolean>;
}

export function useCentreActions(api: AdminPortalApi, token: string): CentreActions {
  const confirm = useConfirm();

  const toggleStatus = useCallback(async (c: CentreActionTarget): Promise<CentreStatus | null> => {
    const next: CentreStatus = c.status === 'active' ? 'inactive' : 'active';
    const name = c.name || 'this centre';
    const ok = await confirm(next === 'inactive'
      ? {
          title: `Deactivate "${name}"?`,
          description: 'The centre is marked Inactive in the directory. Its login, students and wallet are not changed.',
          confirmText: 'Deactivate',
        }
      : { title: `Activate "${name}"?`, description: 'The centre is marked Active again.', confirmText: 'Activate' });
    if (!ok) return null;
    try {
      const res = await api.setCentreStatus(token, c.id, next);
      if (!res.ok) { toast.error(res.message); return null; }
      toast.success(res.message);
      return next;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not change the status.');
      return null;
    }
  }, [api, token, confirm]);

  // Naji UAT 2026-05-15 — Resend Login Email, same as every other user directory.
  const resendLogin = useCallback(async (c: CentreActionTarget): Promise<void> => {
    const name = c.name || 'this centre';
    if (!c.loginUserId) {
      toast.error(`No login is wired for ${name}.`);
      return;
    }
    const ok = await confirm({
      title: `Resend login email to "${name}"?`,
      description: `A new temporary password will be generated and emailed to ${c.loginEmail || 'the centre'}. The previous password will stop working.`,
      confirmText: 'Resend',
    });
    if (!ok) return;
    try {
      const res = await api.resendLoginCredentials(token, c.loginUserId);
      const message = asString(res.message) || 'Login email sent.';
      if (res.status === 1) toast.success(message);
      else toast.error(message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send login email');
    }
  }, [api, token, confirm]);

  const remove = useCallback(async (c: CentreActionTarget): Promise<boolean> => {
    const ok = await confirm({
      title: 'Delete Centre',
      description: `Are you sure you want to delete ${c.name || 'this centre'}? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (!ok) return false;
    try {
      const res = await api.deleteCentre(token, c.id);
      const message = asString(res.message);
      if (res.status === 0) { toast.error(message || 'Failed to delete centre'); return false; }
      toast.success(message || 'Centre deleted.');
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete centre');
      return false;
    }
  }, [api, token, confirm]);

  return { toggleStatus, resendLogin, remove };
}
