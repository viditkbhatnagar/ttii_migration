import { Network, UsersRound } from 'lucide-react';
import type { AdminPortalApi } from '../../admin-portal-api.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { toMembership } from './org-model.js';

// Read-only "Team · Group" line on the counsellor profile. Organisational
// only; a failed lookup (or tables not migrated yet) simply shows nothing.

export function CounsellorOrgLine({ api, token, userId, onNavigate }: {
  api: AdminPortalApi; token: string; userId: string; onNavigate: (href: string) => void;
}) {
  const { data } = useAdminPageData(() => api.loadCounsellorMembership(token, userId), [userId]);
  if (!data) return null;
  const { team, group, direct } = toMembership(data);
  const link = 'inline-flex items-center gap-1 font-medium text-foreground hover:text-primary hover:underline';
  return (
    <>
      <span className="inline-flex items-center gap-1">
        <UsersRound aria-hidden="true" className="size-3.5" /> Team:{' '}
        {team ? <button type="button" className={link} onClick={() => onNavigate(`/admin/teams/view/${team.id}`)}>{team.name}</button> : 'None'}
      </span>
      {group ? (
        <span className="inline-flex items-center gap-1">
          <Network aria-hidden="true" className="size-3.5" /> Group:{' '}
          <button type="button" className={link} onClick={() => onNavigate(`/admin/groups/view/${group.id}`)}>{group.name}</button>
          {direct ? <span>(direct)</span> : null}
        </span>
      ) : null}
    </>
  );
}
