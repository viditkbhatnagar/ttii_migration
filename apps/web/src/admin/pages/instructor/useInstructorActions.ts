import { useCallback } from 'react';
import { toast } from 'sonner';
import { useConfirm } from '@/components/confirm-dialog';
import type { AdminPortalApi } from '../../admin-portal-api.js';

// The row actions of the Instructors Directory, shared by the list and the
// detail page so both keep the SAME endpoints, confirms and toasts the old
// page had (Resend Login Email, Enable / Disable, Delete, Change Device).

export interface InstructorRef {
  id: string;
  name: string;
  /** users.disabled_at is set. */
  isDisabled: boolean;
}

export function useInstructorActions(api: AdminPortalApi, token: string, onChanged: () => void) {
  const confirm = useConfirm();

  const resendLogin = useCallback(async (row: InstructorRef) => {
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

  const toggleLogin = useCallback(async (row: InstructorRef) => {
    if (!row.id) return;
    const name = row.name || 'this instructor';
    if (!row.isDisabled && !(await confirm({
      title: `Disable ${name}?`,
      description: 'They will be blocked from logging in until you re-enable them.',
      confirmText: 'Disable',
      variant: 'destructive',
    }))) return;
    try {
      await api.toggleUserStatus(token, row.id, row.isDisabled);
      toast.success(row.isDisabled ? 'Instructor enabled.' : 'Instructor disabled.');
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    }
  }, [api, token, confirm, onChanged]);

  /** Resolves true when the instructor was deleted (the detail page then leaves). */
  const remove = useCallback(async (row: InstructorRef): Promise<boolean> => {
    if (!(await confirm({
      title: `Delete instructor "${row.name}"?`,
      description: 'This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive',
    }))) return false;
    try {
      await api.deleteInstructor(token, row.id);
      onChanged();
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete instructor');
      return false;
    }
  }, [api, token, confirm, onChanged]);

  const changeDevice = useCallback(async (row: InstructorRef) => {
    if (!(await confirm({
      title: 'Reset device binding for this instructor?',
      confirmText: 'Reset',
      variant: 'default',
    }))) return;
    window.location.href = `/admin/instructor/change_device/${row.id}`;
  }, [confirm]);

  return { resendLogin, toggleLogin, remove, changeDevice };
}
