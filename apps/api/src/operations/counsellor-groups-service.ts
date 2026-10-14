import type { PrismaClient } from '@prisma/client';

import { getPrismaClient } from '../data/prisma-client.js';
import { loadApplications, loadKpis, loadPeople, loadTrend, type OrgApplication } from './counsellor-org-reads.js';
import {
  EMPTY_KPIS, MEMBER_BATCH_MAX, NOT_SET_UP_MESSAGE, WRITE_CONFLICT_MESSAGE, isWriteConflict,
  canLead, fail, iso, isLiveCounsellor, isMissingTable, isNameClash, isUniqueViolation, orgCode, parseGroupInput, personName, sumKpis,
  type GroupInput, type Kpis, type OrgStatus, type Outcome, type PersonRow, type TrendPoint,
} from './counsellor-teams-model.js';
import { claimLiveGroup, nameTaken } from './counsellor-teams-service.js';
import {
  DIRECT_NOT_SET_UP_MESSAGE, JoinedTeamError, PLACE_DIRECT_TX, checkDirectCandidates, directMembersReady, loadDirectLinks, placeDirect,
} from './counsellor-group-members.js';

// Counsellor Management → Groups (Naji 2026-10-12, GroupsModule / GroupProfile).
// A group has a manager (admin, subadmin or counsellor) and holds teams
// (counsellor_teams.group_id). ORGANISATIONAL ONLY.
//
// A group that still has teams cannot be deleted. Delete claims the group row
// first and counts its teams inside the same transaction; adding a team claims
// the same row (claimLiveGroup), so the two cannot interleave into a team filed
// under a deleted group.
//
// Direct counsellors (Naji 2026-10-14): counsellors in no team can be filed
// straight under a group (counsellor_group_members; rules and race notes in
// counsellor-group-members.ts). A group's counsellors, counts, KPIs and trend
// are its team members ∪ its direct members, deduped. Deleting a group with
// only direct counsellors releases them in the same transaction.

export interface GroupTeamRow {
  id: number;
  code: string;
  name: string;
  status: OrgStatus;
  leaderName: string;
  members: number;
  kpis: Kpis;
}

export interface GroupListRow {
  id: number;
  code: string;
  name: string;
  description: string;
  status: OrgStatus;
  managerId: number | null;
  managerName: string;
  teams: number;
  /** Live counsellors under the group: team members ∪ direct members. */
  counsellors: number;
  /** Of which filed directly (not through a team). */
  direct: number;
  kpis: Kpis;
  createdAt: string;
}

export interface DirectMemberRow {
  id: number;
  name: string;
  email: string;
  phone: string;
  /** A live counsellor; false when the account was deleted or changed role. */
  current: boolean;
  loginDisabled: boolean;
  joinedAt: string;
  kpis: Kpis;
}

export interface GroupList {
  ready: boolean;
  message: string;
  groups: GroupListRow[];
  totals: { groups: number; active: number; teams: number; counsellors: number };
}

export interface GroupDetail {
  group: GroupListRow & { createdBy: string; updatedAt: string };
  teams: GroupTeamRow[];
  direct: DirectMemberRow[];
  /** Direct members can be added (the 2026-10-14 table exists). */
  directReady: boolean;
  kpis: Kpis;
  trend: TrendPoint[];
  applications: OrgApplication[];
}

const groupSelect = {
  id: true, code: true, name: true, description: true, status: true, manager_user_id: true,
  created_by: true, created_at: true, updated_at: true,
} as const;

interface GroupMembers {
  teams: Array<{ id: number; code: string; name: string; status: string; group_id: number | null; leader_user_id: number | null }>;
  people: Map<number, PersonRow>;
  /** team id → its live counsellors */
  membersByTeam: Map<number, number[]>;
  /** Direct links of the groups (live or not — the profile lists stale ones for removal). */
  direct: Array<{ group_id: number; user_id: number; joined_at: Date | null }>;
  kpis: Map<number, Kpis>;
}

/** Live counsellors of one group: its teams' members ∪ its direct members, deduped. */
export function groupCounsellorIds(groupId: number, m: Pick<GroupMembers, 'teams' | 'membersByTeam' | 'direct' | 'people'>): number[] {
  const ids = new Set<number>();
  for (const t of m.teams) {
    if (t.group_id !== groupId) continue;
    for (const u of m.membersByTeam.get(t.id) ?? []) ids.add(u);
  }
  for (const d of m.direct) {
    if (d.group_id === groupId && isLiveCounsellor(m.people.get(d.user_id))) ids.add(d.user_id);
  }
  return [...ids];
}

const asStatus = (s: string | null): OrgStatus => (s === 'inactive' ? 'inactive' : 'active');

function refuseIfMissing(error: unknown): Outcome<never> {
  if (isMissingTable(error)) return fail(NOT_SET_UP_MESSAGE);
  if (isWriteConflict(error)) return fail(WRITE_CONFLICT_MESSAGE);
  throw error;
}

/** Edits to a group's direct counsellors: explicit adds and removes, nothing implied. */
export interface DirectChanges { add: number[]; remove: number[] }

class GroupHasTeamsError extends Error {
  constructor(readonly teams: number) { super('group has teams'); }
}

class GroupGoneError extends Error {}

/** A direct-membership write lost a race: a clear refusal, or null when it is another error. */
function directRace(error: unknown): string | null {
  if (error instanceof JoinedTeamError) {
    return "One of these counsellors just joined a team, so they belong to the team's group. Reload and try again.";
  }
  if (isUniqueViolation(error) && !isNameClash(error)) {
    return 'One of these counsellors was just added to another group by someone else. Reload and try again.';
  }
  return null;
}

const plural = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`;

export class CounsellorGroupsService {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  /** Teams and direct counsellors of the given groups, with KPIs for every live counsellor. */
  private async membersOf(groupIds: number[]): Promise<GroupMembers> {
    if (groupIds.length === 0) return { teams: [], people: new Map(), membersByTeam: new Map(), direct: [], kpis: new Map() };
    const [teams, direct] = await Promise.all([
      this.prisma.counsellor_teams.findMany({
        where: { group_id: { in: groupIds }, deleted_at: null },
        select: { id: true, code: true, name: true, status: true, group_id: true, leader_user_id: true },
        orderBy: { name: 'asc' },
      }),
      loadDirectLinks(this.prisma, { groupIds }),
    ]);
    const links = teams.length > 0
      ? await this.prisma.counsellor_team_members.findMany({ where: { team_id: { in: teams.map((t) => t.id) } }, select: { team_id: true, user_id: true } })
      : [];
    const people = await loadPeople(this.prisma, [...links.map((l) => l.user_id), ...direct.map((d) => d.user_id), ...teams.map((t) => t.leader_user_id ?? 0)]);
    const membersByTeam = new Map<number, number[]>();
    for (const l of links) {
      if (!isLiveCounsellor(people.get(l.user_id))) continue;
      membersByTeam.set(l.team_id, [...(membersByTeam.get(l.team_id) ?? []), l.user_id]);
    }
    const liveDirect = direct.map((d) => d.user_id).filter((u) => isLiveCounsellor(people.get(u)));
    const kpis = await loadKpis(this.prisma, [...new Set([...[...membersByTeam.values()].flat(), ...liveDirect])]);
    return { teams, people, membersByTeam, direct, kpis };
  }

  async list(): Promise<GroupList> {
    try {
      const groups = await this.prisma.counsellor_groups.findMany({ where: { deleted_at: null }, select: groupSelect, orderBy: { id: 'asc' } });
      const members = await this.membersOf(groups.map((g) => g.id));
      const { teams, kpis } = members;
      const managers = await loadPeople(this.prisma, groups.map((g) => g.manager_user_id ?? 0));
      const rows: GroupListRow[] = groups.map((g) => {
        const own = teams.filter((t) => t.group_id === g.id);
        const memberIds = groupCounsellorIds(g.id, members);
        const direct = members.direct.filter((d) => d.group_id === g.id && isLiveCounsellor(members.people.get(d.user_id))).length;
        return {
          id: g.id,
          code: g.code || orgCode('GRP', g.id),
          name: g.name,
          description: g.description ?? '',
          status: asStatus(g.status),
          managerId: g.manager_user_id,
          managerName: g.manager_user_id == null ? '' : personName(managers.get(g.manager_user_id) ?? { id: g.manager_user_id, name: null }),
          teams: own.length,
          counsellors: memberIds.length,
          direct,
          kpis: sumKpis(memberIds, kpis),
          createdAt: iso(g.created_at),
        };
      });
      return {
        ready: true,
        message: 'success',
        groups: rows,
        totals: {
          groups: rows.length,
          active: rows.filter((r) => r.status === 'active').length,
          teams: teams.length,
          counsellors: rows.reduce((s, r) => s + r.counsellors, 0),
        },
      };
    } catch (error: unknown) {
      if (!isMissingTable(error)) throw error;
      return { ready: false, message: NOT_SET_UP_MESSAGE, groups: [], totals: { groups: 0, active: 0, teams: 0, counsellors: 0 } };
    }
  }

  async detail(id: number, now: Date = new Date()): Promise<Outcome<GroupDetail>> {
    try {
      const g = id > 0 ? await this.prisma.counsellor_groups.findFirst({ where: { id, deleted_at: null }, select: groupSelect }) : null;
      if (!g) return fail('Group not found.');
      const members = await this.membersOf([id]);
      const { teams, people, membersByTeam, kpis } = members;
      const memberIds = groupCounsellorIds(id, members);
      const extra = await loadPeople(this.prisma, [g.manager_user_id ?? 0, g.created_by ?? 0]);
      const everyone = new Map([...people, ...extra]);
      const [trend, applications] = await Promise.all([
        loadTrend(this.prisma, memberIds, now),
        loadApplications(this.prisma, memberIds, everyone),
      ]);
      const total = sumKpis(memberIds, kpis);
      const teamRows: GroupTeamRow[] = teams.map((t) => {
        const ids = membersByTeam.get(t.id) ?? [];
        return {
          id: t.id,
          code: t.code || orgCode('TEAM', t.id),
          name: t.name,
          status: asStatus(t.status),
          leaderName: t.leader_user_id == null ? '' : personName(everyone.get(t.leader_user_id) ?? { id: t.leader_user_id, name: null }),
          members: ids.length,
          kpis: sumKpis(ids, kpis),
        };
      });
      const name = (uid: number | null) => (uid == null ? '' : personName(everyone.get(uid) ?? { id: uid, name: null }));
      const direct: DirectMemberRow[] = members.direct.map((d) => {
        const p = everyone.get(d.user_id);
        return {
          id: d.user_id,
          name: name(d.user_id),
          email: (p?.email ?? '').trim(),
          phone: (p?.phone ?? '').trim(),
          current: isLiveCounsellor(p),
          loginDisabled: !!p?.disabled_at,
          joinedAt: iso(d.joined_at),
          kpis: kpis.get(d.user_id) ?? { ...EMPTY_KPIS },
        };
      });
      const directReady = await directMembersReady(this.prisma);
      return {
        status: 1,
        message: 'success',
        data: {
          group: {
            id: g.id,
            code: g.code || orgCode('GRP', g.id),
            name: g.name,
            description: g.description ?? '',
            status: asStatus(g.status),
            managerId: g.manager_user_id,
            managerName: name(g.manager_user_id),
            teams: teamRows.length,
            counsellors: memberIds.length,
            direct: direct.filter((d) => d.current).length,
            kpis: total,
            createdAt: iso(g.created_at),
            createdBy: name(g.created_by),
            updatedAt: iso(g.updated_at),
          },
          teams: teamRows,
          direct,
          directReady,
          kpis: total,
          trend,
          applications,
        },
      };
    } catch (error: unknown) {
      return refuseIfMissing(error);
    }
  }

  private async validate(input: GroupInput, excludeId: number): Promise<string> {
    const [manager, clash] = await Promise.all([
      this.prisma.users.findFirst({
        where: { id: input.managerUserId },
        select: { id: true, name: true, email: true, phone: true, role_id: true, deleted_at: true, disabled_at: true },
      }),
      this.prisma.counsellor_groups.findFirst({
        where: { name: input.name, deleted_at: null, ...(excludeId > 0 ? { NOT: { id: excludeId } } : {}) },
        select: { id: true },
      }),
    ]);
    if (!canLead(manager)) return 'The group manager must be an active counsellor or admin.';
    if (clash) return `A group named "${input.name}" already exists.`;
    return '';
  }

  private async liveTeams(teamIds: number[]): Promise<{ ids: number[]; error: string }> {
    if (teamIds.length > MEMBER_BATCH_MAX) return { ids: [], error: `Assign at most ${MEMBER_BATCH_MAX} teams at a time.` };
    if (teamIds.length === 0) return { ids: [], error: '' };
    const found = await this.prisma.counsellor_teams.findMany({ where: { id: { in: teamIds }, deleted_at: null }, select: { id: true } });
    if (found.length !== teamIds.length) return { ids: [], error: 'One of the selected teams no longer exists. Reload and try again.' };
    return { ids: teamIds, error: '' };
  }

  /** Refusal for counsellors about to be filed directly ('' when fine). */
  private async directGate(userIds: number[]): Promise<string> {
    if (userIds.length === 0) return '';
    if (!(await directMembersReady(this.prisma))) return DIRECT_NOT_SET_UP_MESSAGE;
    return checkDirectCandidates(this.prisma, userIds);
  }

  async create(actor: number | null, raw: Record<string, unknown>, teamIds: number[], counsellorIds: number[] = []): Promise<Outcome<{ id: number }>> {
    try {
      const input = parseGroupInput(raw);
      if (typeof input === 'string') return fail(input);
      const invalid = await this.validate(input, 0);
      if (invalid) return fail(invalid);
      const teams = await this.liveTeams(teamIds);
      if (teams.error) return fail(teams.error);
      const directError = await this.directGate(counsellorIds);
      if (directError) return fail(directError);
      const result = await this.prisma.$transaction(async (tx) => {
        const created = await tx.counsellor_groups.create({
          data: { name: input.name, live_name: input.name, description: input.description, manager_user_id: input.managerUserId, status: input.status, created_by: actor, created_at: new Date() },
          select: { id: true },
        });
        await tx.counsellor_groups.update({ where: { id: created.id }, data: { code: orgCode('GRP', created.id) } });
        if (teams.ids.length > 0) {
          await tx.counsellor_teams.updateMany({
            where: { id: { in: teams.ids }, deleted_at: null },
            data: { group_id: created.id, updated_by: actor, updated_at: new Date() },
          });
        }
        const placed = await placeDirect(tx, created.id, counsellorIds, actor);
        return { id: created.id, ...placed };
      }, PLACE_DIRECT_TX);
      const { id, added, moved } = result;
      const parts = [
        ...(teams.ids.length > 0 ? [plural(teams.ids.length, 'team')] : []),
        ...(added > 0 ? [`${plural(added, 'counsellor')}${moved > 0 ? ` (${moved} moved from another group)` : ''}`] : []),
      ];
      return { status: 1, message: `${input.name} created${parts.length > 0 ? ` with ${parts.join(' and ')}` : ''}.`, data: { id } };
    } catch (error: unknown) {
      if (isNameClash(error)) return fail(nameTaken('group', raw));
      const race = directRace(error);
      if (race) return fail(race);
      return refuseIfMissing(error);
    }
  }

  /**
   * Direct counsellors change ONLY through explicit `changes`: `add` (checked,
   * moved in) and `remove` (released). Nothing is implied from a full list, so
   * a counsellor another admin added meanwhile, or a direct row whose account
   * is no longer a live counsellor, is never released by an unrelated save.
   */
  async update(actor: number | null, id: number, raw: Record<string, unknown>, changes: DirectChanges = { add: [], remove: [] }): Promise<Outcome> {
    try {
      if (!(id > 0)) return fail('Group not found.');
      const input = parseGroupInput(raw);
      if (typeof input === 'string') return fail(input);
      const invalid = await this.validate(input, id);
      if (invalid) return fail(invalid);
      // A counsellor named in both lists is ambiguous: leave them alone.
      const add = changes.add.filter((u) => !changes.remove.includes(u));
      const remove = changes.remove.filter((u) => !changes.add.includes(u));
      if (remove.length > MEMBER_BATCH_MAX) return fail(`Remove at most ${MEMBER_BATCH_MAX} counsellors at a time.`);
      const directError = await this.directGate(add);
      if (directError) return fail(directError);
      if (remove.length > 0 && !(await directMembersReady(this.prisma))) return fail(DIRECT_NOT_SET_UP_MESSAGE);
      const result = await this.prisma.$transaction(async (tx) => {
        const res = await tx.counsellor_groups.updateMany({
          where: { id, deleted_at: null },
          data: { name: input.name, live_name: input.name, description: input.description, manager_user_id: input.managerUserId, status: input.status, updated_by: actor, updated_at: new Date() },
        });
        if (res.count === 0) return null;
        const released = remove.length > 0
          ? (await tx.counsellor_group_members.deleteMany({ where: { group_id: id, user_id: { in: remove } } })).count
          : 0;
        const placed = await placeDirect(tx, id, add, actor);
        return { released, ...placed };
      }, PLACE_DIRECT_TX);
      if (!result) return fail('Group not found.');
      const parts = [
        ...(result.added > 0 ? [`${plural(result.added, 'counsellor')} added${result.moved > 0 ? ` (${result.moved} moved from another group)` : ''}`] : []),
        ...(result.released > 0 ? [`${plural(result.released, 'counsellor')} removed`] : []),
      ];
      return { status: 1, message: `${input.name} updated${parts.length > 0 ? `; ${parts.join(', ')}` : ''}.` };
    } catch (error: unknown) {
      if (isNameClash(error)) return fail(nameTaken('group', raw));
      const race = directRace(error);
      if (race) return fail(race);
      return refuseIfMissing(error);
    }
  }

  /** Refused while the group still has teams (move or remove them first). */
  async remove(actor: number | null, id: number): Promise<Outcome> {
    try {
      if (!(id > 0)) return fail('Group not found.');
      const directReady = await directMembersReady(this.prisma);
      const released = await this.prisma.$transaction(async (tx) => {
        const res = await tx.counsellor_groups.updateMany({ where: { id, deleted_at: null }, data: { deleted_at: new Date(), deleted_by: actor, live_name: null } });
        if (res.count === 0) return -1;
        const teams = await tx.counsellor_teams.count({ where: { group_id: id, deleted_at: null } });
        // Throwing rolls the soft delete back.
        if (teams > 0) throw new GroupHasTeamsError(teams);
        // Direct counsellors are released with the group (like a team's members).
        if (!directReady) return 0;
        const freed = await tx.counsellor_group_members.deleteMany({ where: { group_id: id } });
        return freed.count;
      });
      if (released < 0) return fail('Group not found or already deleted.');
      return { status: 1, message: `Group deleted${released > 0 ? `; ${plural(released, 'counsellor')} released` : ''}.` };
    } catch (error: unknown) {
      if (error instanceof GroupHasTeamsError) {
        return fail(`This group still has ${error.teams} team${error.teams === 1 ? '' : 's'}. Move or remove them before deleting the group.`);
      }
      return refuseIfMissing(error);
    }
  }

  /** Files teams under this group (a team in another group moves here). */
  async addTeams(actor: number | null, groupId: number, teamIds: number[]): Promise<Outcome<{ added: number }>> {
    try {
      if (!(groupId > 0)) return fail('Group not found.');
      if (teamIds.length === 0) return fail('Select at least one team.');
      const teams = await this.liveTeams(teamIds);
      if (teams.error) return fail(teams.error);
      const moved = await this.prisma.$transaction(async (tx) => {
        if (!(await claimLiveGroup(tx, groupId, actor))) return -1;
        const res = await tx.counsellor_teams.updateMany({
          where: { id: { in: teams.ids }, deleted_at: null },
          data: { group_id: groupId, updated_by: actor, updated_at: new Date() },
        });
        return res.count;
      });
      if (moved < 0) return fail('Group not found.');
      return { status: 1, message: `${moved} team${moved === 1 ? '' : 's'} assigned to the group.`, data: { added: moved } };
    } catch (error: unknown) {
      return refuseIfMissing(error);
    }
  }

  /** Files counsellors in no team directly under the group (a direct member of another group moves here). */
  async addCounsellors(actor: number | null, groupId: number, userIds: number[]): Promise<Outcome<{ added: number }>> {
    try {
      if (!(groupId > 0)) return fail('Group not found.');
      if (userIds.length === 0) return fail('Select at least one counsellor.');
      if (!(await directMembersReady(this.prisma))) return fail(DIRECT_NOT_SET_UP_MESSAGE);
      const existing = await loadDirectLinks(this.prisma, { userIds });
      const here = new Set(existing.filter((d) => d.group_id === groupId).map((d) => d.user_id));
      const toAdd = userIds.filter((u) => !here.has(u));
      if (toAdd.length === 0) return fail('Those counsellors are already in this group.');
      const directError = await checkDirectCandidates(this.prisma, toAdd);
      if (directError) return fail(directError);
      // Counts come from inside the transaction, not from the read above.
      const placed = await this.prisma.$transaction(async (tx) => {
        if (!(await claimLiveGroup(tx, groupId, actor))) throw new GroupGoneError();
        return placeDirect(tx, groupId, toAdd, actor);
      }, PLACE_DIRECT_TX);
      if (placed.added === 0) return fail('Those counsellors are already in this group.');
      const moved = placed.moved > 0 ? ` ${placed.moved} moved from another group.` : '';
      return { status: 1, message: `${plural(placed.added, 'counsellor')} added to the group.${moved}`, data: { added: placed.added } };
    } catch (error: unknown) {
      if (error instanceof GroupGoneError) return fail('Group not found.');
      const race = directRace(error);
      if (race) return fail(race);
      return refuseIfMissing(error);
    }
  }

  async removeCounsellor(groupId: number, userId: number): Promise<Outcome> {
    try {
      if (!(groupId > 0) || !(userId > 0)) return fail('Counsellor not found.');
      if (!(await directMembersReady(this.prisma))) return fail(DIRECT_NOT_SET_UP_MESSAGE);
      const removed = await this.prisma.$transaction(async (tx) => {
        // Refuse on a deleted group (and serialise with a concurrent delete).
        if (!(await claimLiveGroup(tx, groupId, null))) throw new GroupGoneError();
        const res = await tx.counsellor_group_members.deleteMany({ where: { group_id: groupId, user_id: userId } });
        return res.count;
      });
      if (removed === 0) return fail('That counsellor is not a direct member of this group.');
      return { status: 1, message: 'Counsellor removed from the group.' };
    } catch (error: unknown) {
      if (error instanceof GroupGoneError) return fail('This group no longer exists (it was deleted).');
      return refuseIfMissing(error);
    }
  }

  async removeTeam(actor: number | null, groupId: number, teamId: number): Promise<Outcome> {
    try {
      if (!(groupId > 0) || !(teamId > 0)) return fail('Team not found.');
      const res = await this.prisma.counsellor_teams.updateMany({
        where: { id: teamId, group_id: groupId, deleted_at: null },
        data: { group_id: null, updated_by: actor, updated_at: new Date() },
      });
      if (res.count === 0) return fail('That team is not in this group.');
      return { status: 1, message: 'Team removed from the group.' };
    } catch (error: unknown) {
      return refuseIfMissing(error);
    }
  }
}
