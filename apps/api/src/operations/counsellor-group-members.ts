import { Prisma, type PrismaClient } from '@prisma/client';

import { loadPeople } from './counsellor-org-reads.js';
import { MEMBER_BATCH_MAX, isMissingTable, isLiveCounsellor, personName } from './counsellor-teams-model.js';

// Counsellors filed DIRECTLY under a group (Naji 2026-10-14). The rule: a
// counsellor belongs to at most ONE group — through their team, or directly
// (counsellor_group_members, UNIQUE(user_id)). Only counsellors in no team
// can be direct members, and joining a team deletes the direct row in the
// same transaction as the team insert.
//
// Race safety, without raw SQL:
//   * the UNIQUE(user_id) index refuses a second direct group (P2002);
//   * placeDirect deletes then inserts, and only THEN reads team membership,
//     in a READ COMMITTED transaction (PLACE_DIRECT_TX) so that read sees
//     every team insert committed before it, whatever the transaction read
//     earlier. A team insert still in flight is covered from the other side:
//     the team transaction (default REPEATABLE READ) DELETEs the direct row
//     after its insert — that DELETE either waits on our new row and removes
//     it once we commit, or (no row yet) gap-locks the key so our insert
//     waits for it and our re-check then sees its team row. Either way the
//     counsellor ends up in one group.
//
// Before 2026-10-14-counsellor-group-members.sql runs (P2021) reads return no
// direct members and writes refuse with DIRECT_NOT_SET_UP_MESSAGE.

export const DIRECT_NOT_SET_UP_MESSAGE =
  'Adding counsellors directly to a group is not set up yet: the database migration 2026-10-14-counsellor-group-members.sql has not been run.';

type Db = PrismaClient | Prisma.TransactionClient;

export interface DirectLink { group_id: number; user_id: number; joined_at: Date | null }

/** False until the counsellor_group_members table exists. */
export async function directMembersReady(prisma: Db): Promise<boolean> {
  try {
    await prisma.counsellor_group_members.findFirst({ select: { user_id: true } });
    return true;
  } catch (error: unknown) {
    if (isMissingTable(error)) return false;
    throw error;
  }
}

/** Direct links (optionally of some groups or users); [] before the migration. */
export async function loadDirectLinks(prisma: Db, where: { groupIds?: number[]; userIds?: number[] } = {}): Promise<DirectLink[]> {
  if (where.groupIds?.length === 0 || where.userIds?.length === 0) return [];
  try {
    return await prisma.counsellor_group_members.findMany({
      where: {
        ...(where.groupIds ? { group_id: { in: where.groupIds } } : {}),
        ...(where.userIds ? { user_id: { in: where.userIds } } : {}),
      },
      select: { group_id: true, user_id: true, joined_at: true },
      orderBy: { joined_at: 'asc' },
    });
  } catch (error: unknown) {
    if (isMissingTable(error)) return [];
    throw error;
  }
}

/**
 * Checks counsellors about to be filed directly under a group: live role 9,
 * login not disabled, and in no team. Returns a refusal message or ''.
 */
export async function checkDirectCandidates(prisma: PrismaClient, userIds: number[]): Promise<string> {
  if (userIds.length > MEMBER_BATCH_MAX) return `Add at most ${MEMBER_BATCH_MAX} counsellors at a time.`;
  if (userIds.length === 0) return '';
  const [people, links] = await Promise.all([
    loadPeople(prisma, userIds),
    prisma.counsellor_team_members.findMany({ where: { user_id: { in: userIds } }, select: { team_id: true, user_id: true } }),
  ]);
  const name = (u: number) => personName(people.get(u) ?? { id: u, name: null });
  const bad = userIds.filter((u) => !isLiveCounsellor(people.get(u)) || !!people.get(u)?.disabled_at);
  if (bad.length > 0) return `Only active counsellors whose login is enabled can be added (not: ${bad.map(name).join(', ')}).`;
  if (links.length === 0) return '';
  const teams = await prisma.counsellor_teams.findMany({ where: { id: { in: [...new Set(links.map((l) => l.team_id))] } }, select: { id: true, name: true } });
  const teamName = new Map(teams.map((t) => [t.id, t.name]));
  const inTeams = links.map((l) => `${name(l.user_id)} (${teamName.get(l.team_id) ?? `team #${l.team_id}`})`);
  return `Already in a team, so they belong to the team's group: ${inTeams.join(', ')}.`;
}

/** Options for every transaction that calls placeDirect (see the header). */
export const PLACE_DIRECT_TX = { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted } as const;

/** Thrown inside a transaction when a counsellor joined a team meanwhile; rolls the write back. */
export class JoinedTeamError extends Error {}

/**
 * Files `userIds` directly under `groupId` inside the caller's transaction:
 * any direct row they have in ANOTHER group is deleted first (a move), then
 * they are inserted, then team membership is re-checked (see the header).
 * The caller passes only counsellors not already direct members of this group.
 */
export async function placeDirect(tx: Prisma.TransactionClient, groupId: number, userIds: number[], actor: number | null): Promise<void> {
  if (userIds.length === 0) return;
  await tx.counsellor_group_members.deleteMany({ where: { user_id: { in: userIds } } });
  const joined = new Date();
  await tx.counsellor_group_members.createMany({
    data: userIds.map((user_id) => ({ group_id: groupId, user_id, joined_at: joined, created_by: actor })),
  });
  const inTeam = await tx.counsellor_team_members.findMany({ where: { user_id: { in: userIds } }, select: { user_id: true } });
  if (inTeam.length > 0) throw new JoinedTeamError();
}

/** Joining a team: drop the counsellors' direct group rows (same transaction as the team insert). */
export async function releaseDirect(tx: Prisma.TransactionClient, userIds: number[]): Promise<number> {
  if (userIds.length === 0) return 0;
  const res = await tx.counsellor_group_members.deleteMany({ where: { user_id: { in: userIds } } });
  return res.count;
}
