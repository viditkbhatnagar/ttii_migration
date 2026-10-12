import { useCallback } from 'react';
import { toast } from 'sonner';
import { useConfirm } from '@/components/confirm-dialog';
import type { AdminPortalApi } from '../../admin-portal-api.js';
import { messageFromError } from '../../shared/utils/admin-data-utils.js';

// Destructive actions of Teams and Groups, shared by the lists and the
// profiles: every one asks first, then toasts the server's own message.
// Each resolves true when the change went through (the caller reloads/leaves).

export function useOrgActions(api: AdminPortalApi, token: string) {
  const confirm = useConfirm();

  const run = useCallback(async (ask: Parameters<typeof confirm>[0], call: () => Promise<string>): Promise<boolean> => {
    if (!(await confirm(ask))) return false;
    try {
      toast.success(await call());
      return true;
    } catch (err) {
      toast.error(messageFromError(err));
      return false;
    }
  }, [confirm]);

  const deleteTeam = useCallback((team: { id: string; name: string; members: number }) => run({
    title: `Delete team "${team.name}"?`,
    description: team.members > 0
      ? `Its ${team.members} counsellor${team.members === 1 ? '' : 's'} will be released (no team). Their applications and logins are not affected.`
      : 'The team will be removed. This cannot be undone from the admin panel.',
    confirmText: 'Delete',
    variant: 'destructive',
  }, () => api.deleteCounsellorTeam(token, team.id)), [api, token, run]);

  const deleteGroup = useCallback((group: { id: string; name: string }) => run({
    title: `Delete group "${group.name}"?`,
    description: 'A group that still has teams cannot be deleted. Move or remove its teams first.',
    confirmText: 'Delete',
    variant: 'destructive',
  }, () => api.deleteCounsellorGroup(token, group.id)), [api, token, run]);

  const removeMember = useCallback((teamId: string, member: { id: string; name: string }) => run({
    title: `Remove ${member.name} from this team?`,
    description: 'They stay a counsellor with all their applications; they just leave the team.',
    confirmText: 'Remove',
    variant: 'destructive',
  }, () => api.removeCounsellorTeamMember(token, teamId, member.id)), [api, token, run]);

  const removeTeam = useCallback((groupId: string, team: { id: string; name: string }) => run({
    title: `Remove ${team.name} from this group?`,
    description: 'The team and its members stay as they are; it just has no group.',
    confirmText: 'Remove',
    variant: 'destructive',
  }, () => api.removeCounsellorGroupTeam(token, groupId, team.id)), [api, token, run]);

  return { deleteTeam, deleteGroup, removeMember, removeTeam };
}
