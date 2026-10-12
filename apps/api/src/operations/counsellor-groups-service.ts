import type { PrismaClient } from '@prisma/client';

import { getPrismaClient } from '../data/prisma-client.js';
import { loadApplications, loadKpis, loadPeople, loadTrend, type OrgApplication } from './counsellor-org-reads.js';
import {
  MEMBER_BATCH_MAX, NOT_SET_UP_MESSAGE,
  canLead, fail, iso, isLiveCounsellor, isMissingTable, isNameClash, orgCode, parseGroupInput, personName, sumKpis,
  type GroupInput, type Kpis, type OrgStatus, type Outcome, type PersonRow, type TrendPoint,
} from './counsellor-teams-model.js';
import { claimLiveGroup, nameTaken } from './counsellor-teams-service.js';

// Counsellor Management → Groups (Naji 2026-10-12, GroupsModule / GroupProfile).
// A group has a manager (admin, subadmin or counsellor) and holds teams
// (counsellor_teams.group_id). ORGANISATIONAL ONLY.
//
// A group that still has teams cannot be deleted. Delete claims the group row
// first and counts its teams inside the same transaction; adding a team claims
// the same row (claimLiveGroup), so the two cannot interleave into a team filed
// under a deleted group.

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
  counsellors: number;
  kpis: Kpis;
  createdAt: string;
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
  kpis: Kpis;
  trend: TrendPoint[];
  applications: OrgApplication[];
}

const groupSelect = {
  id: true, code: true, name: true, description: true, status: true, manager_user_id: true,
  created_by: true, created_at: true, updated_at: true,
} as const;

interface GroupTeams {
  teams: Array<{ id: number; code: string; name: string; status: string; group_id: number | null; leader_user_id: number | null }>;
  people: Map<number, PersonRow>;
  /** team id → its live counsellors */
  membersByTeam: Map<number, number[]>;
  kpis: Map<number, Kpis>;
}

const asStatus = (s: string | null): OrgStatus => (s === 'inactive' ? 'inactive' : 'active');

function refuseIfMissing(error: unknown): Outcome<never> {
  if (isMissingTable(error)) return fail(NOT_SET_UP_MESSAGE);
  throw error;
}

class GroupHasTeamsError extends Error {
  constructor(readonly teams: number) { super('group has teams'); }
}

export class CounsellorGroupsService {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  /** Teams of the given groups with their live members and KPIs. */
  private async teamsOf(groupIds: number[]): Promise<GroupTeams> {
    if (groupIds.length === 0) return { teams: [], people: new Map(), membersByTeam: new Map(), kpis: new Map() };
    const teams = await this.prisma.counsellor_teams.findMany({
      where: { group_id: { in: groupIds }, deleted_at: null },
      select: { id: true, code: true, name: true, status: true, group_id: true, leader_user_id: true },
      orderBy: { name: 'asc' },
    });
    const links = teams.length > 0
      ? await this.prisma.counsellor_team_members.findMany({ where: { team_id: { in: teams.map((t) => t.id) } }, select: { team_id: true, user_id: true } })
      : [];
    const people = await loadPeople(this.prisma, [...links.map((l) => l.user_id), ...teams.map((t) => t.leader_user_id ?? 0)]);
    const membersByTeam = new Map<number, number[]>();
    for (const l of links) {
      if (!isLiveCounsellor(people.get(l.user_id))) continue;
      membersByTeam.set(l.team_id, [...(membersByTeam.get(l.team_id) ?? []), l.user_id]);
    }
    const kpis = await loadKpis(this.prisma, [...membersByTeam.values()].flat());
    return { teams, people, membersByTeam, kpis };
  }

  async list(): Promise<GroupList> {
    try {
      const groups = await this.prisma.counsellor_groups.findMany({ where: { deleted_at: null }, select: groupSelect, orderBy: { id: 'asc' } });
      const { teams, membersByTeam, kpis } = await this.teamsOf(groups.map((g) => g.id));
      const managers = await loadPeople(this.prisma, groups.map((g) => g.manager_user_id ?? 0));
      const rows: GroupListRow[] = groups.map((g) => {
        const own = teams.filter((t) => t.group_id === g.id);
        const memberIds = own.flatMap((t) => membersByTeam.get(t.id) ?? []);
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
      const { teams, people, membersByTeam, kpis } = await this.teamsOf([id]);
      const memberIds = [...membersByTeam.values()].flat();
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
            kpis: total,
            createdAt: iso(g.created_at),
            createdBy: name(g.created_by),
            updatedAt: iso(g.updated_at),
          },
          teams: teamRows,
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

  async create(actor: number | null, raw: Record<string, unknown>, teamIds: number[]): Promise<Outcome<{ id: number }>> {
    try {
      const input = parseGroupInput(raw);
      if (typeof input === 'string') return fail(input);
      const invalid = await this.validate(input, 0);
      if (invalid) return fail(invalid);
      const teams = await this.liveTeams(teamIds);
      if (teams.error) return fail(teams.error);
      const id = await this.prisma.$transaction(async (tx) => {
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
        return created.id;
      });
      const n = teams.ids.length;
      return { status: 1, message: `${input.name} created${n > 0 ? ` with ${n} team${n === 1 ? '' : 's'}` : ''}.`, data: { id } };
    } catch (error: unknown) {
      if (isNameClash(error)) return fail(nameTaken('group', raw));
      return refuseIfMissing(error);
    }
  }

  async update(actor: number | null, id: number, raw: Record<string, unknown>): Promise<Outcome> {
    try {
      if (!(id > 0)) return fail('Group not found.');
      const input = parseGroupInput(raw);
      if (typeof input === 'string') return fail(input);
      const invalid = await this.validate(input, id);
      if (invalid) return fail(invalid);
      const res = await this.prisma.counsellor_groups.updateMany({
        where: { id, deleted_at: null },
        data: { name: input.name, live_name: input.name, description: input.description, manager_user_id: input.managerUserId, status: input.status, updated_by: actor, updated_at: new Date() },
      });
      if (res.count === 0) return fail('Group not found.');
      return { status: 1, message: `${input.name} updated.` };
    } catch (error: unknown) {
      if (isNameClash(error)) return fail(nameTaken('group', raw));
      return refuseIfMissing(error);
    }
  }

  /** Refused while the group still has teams (move or remove them first). */
  async remove(actor: number | null, id: number): Promise<Outcome> {
    try {
      if (!(id > 0)) return fail('Group not found.');
      const deleted = await this.prisma.$transaction(async (tx) => {
        const res = await tx.counsellor_groups.updateMany({ where: { id, deleted_at: null }, data: { deleted_at: new Date(), deleted_by: actor, live_name: null } });
        if (res.count === 0) return false;
        const teams = await tx.counsellor_teams.count({ where: { group_id: id, deleted_at: null } });
        // Throwing rolls the soft delete back.
        if (teams > 0) throw new GroupHasTeamsError(teams);
        return true;
      });
      if (!deleted) return fail('Group not found or already deleted.');
      return { status: 1, message: 'Group deleted.' };
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
