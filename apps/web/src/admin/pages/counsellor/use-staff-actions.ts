import { useCallback } from 'react';
import { toast } from 'sonner';
import { useConfirm } from '@/components/confirm-dialog';
import type { AdminPortalApi } from '../../admin-portal-api.js';
import { serverResult } from '../students/student-view/student-view-model.js';
import type { StaffKind } from './StaffFormDialog.js';
import type { StaffRow } from './staff-model.js';

// The row actions the old Counsellors / Associates pages had, unchanged in
// behaviour (same endpoints, same confirms, same wording), shared by the list
// "…" menu and the profile header: Resend Login Email, Enable / Disable login,
// Delete.

export interface StaffActions {
  resendCredentials: (row: StaffRow) => Promise<void>;
  toggleLogin: (row: StaffRow) => Promise<void>;
  /** Resolves true when the person was deleted. */
  remove: (row: StaffRow) => Promise<boolean>;
}

export function useStaffActions(kind: StaffKind, api: AdminPortalApi, token: string, reload: () => void): StaffActions {
  const confirm = useConfirm();
  const noun = kind === 'counsellor' ? 'counsellor' : 'associate';
  const Noun = kind === 'counsellor' ? 'Counsellor' : 'Associate';

  const resendCredentials = useCallback(async (row: StaffRow) => {
    if (!(await confirm({
      title: `Resend login email to "${row.name}"?`,
      description: 'A new temporary password will be generated and emailed. The user’s previous password will stop working.',
      confirmText: 'Resend',
      variant: 'default',
    }))) return;
    try {
      const res = await api.resendLoginCredentials(token, row.id);
      const message = typeof res.message === 'string' ? res.message : 'Login email sent.';
      if (res.status === 1) toast.success(message);
      else toast.error(message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send login email');
    }
  }, [api, token, confirm]);

  const toggleLogin = useCallback(async (row: StaffRow) => {
    if (!row.id) return;
    const isDisabled = row.loginDisabled;
    const name = row.name || `this ${noun}`;
    if (!isDisabled && !(await confirm({
      title: `Disable ${name}?`,
      description: 'They will be blocked from logging in until you re-enable them.',
      confirmText: 'Disable',
      variant: 'destructive',
    }))) return;
    try {
      const res = await api.toggleUserStatus(token, row.id, isDisabled);
      const { ok, message } = serverResult(res, isDisabled ? `${Noun} enabled.` : `${Noun} disabled.`, 'Failed to update status');
      if (!ok) { toast.error(message); return; }
      toast.success(isDisabled ? `${Noun} enabled.` : `${Noun} disabled.`);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    }
  }, [api, token, confirm, reload, noun, Noun]);

  const remove = useCallback(async (row: StaffRow) => {
    if (!(await confirm({
      title: `Delete "${row.name}"?`,
      description: 'This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive',
    }))) return false;
    try {
      const res = kind === 'counsellor'
        ? await api.deleteCounsellor(token, row.id)
        : await api.deleteAssociate(token, row.id);
      const { ok, message } = serverResult(res, `${Noun} deleted.`, `Failed to delete ${noun}`);
      if (!ok) { toast.error(message); return false; }
      toast.success(message);
      reload();
      return true;
    } catch (err) {
      toast.error(`Failed to delete ${noun}: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }, [api, token, confirm, reload, kind, noun, Noun]);

  return { resendCredentials, toggleLogin, remove };
}
