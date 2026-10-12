import type { Prisma, PrismaClient } from '@prisma/client';

import { getPrismaClient } from '../data/prisma-client.js';
import {
  loadApplications, loadKpis, loadLiveCounsellors, loadPeople, loadTrend, type OrgApplication,
} from './counsellor-org-reads.js';
import {
  EMPTY_KPIS, MEMBER_BATCH_MAX, NOT_SET_UP_MESSAGE,
  canLead, fail, iso, isLiveCounsellor, isMissingTable, isUniqueViolation, orgCode, parseTeamInput, personName, sumKpis,
  type Kpis, type OrgStatus, type Outcome, type PersonRow, type TeamInput, type TrendPoint,
} from './counsellor-teams-model.js';

// Counsellor Management → Teams (Naji 2026-10-12, TeamsModule / TeamProfile).
// A team has a leader (admin, subadmin or counsellor), optionally sits in one
// group, and holds counsellors. ORGANISATIONAL ONLY — nothing here changes
// what a counsellor can see in the counsellor portal.
//
// Membership is claim-safe: UNIQUE(user_id) on counsellor_team_members means
// the database, not a read-then-write check, decides who wins when two admins
// add the same counsellor at once; the loser gets a clear message.
// Before the migration runs (P2021) reads return empty and writes refuse with
// NOT_SET_UP_MESSAGE instead of a 500.

export interface TeamListRow {
  id: number;
  code: string;
  name: string;
  description: string;
  status: OrgStatus;
  groupId: number | null;
  groupName: string;
  leaderId: number | null;
  leaderName: string;
  members: number;
  kpis: Kpis;
  createdAt: string;
}

export interface TeamList {
  ready: boolean;
  message: string;
  teams: TeamListRow[];
  totals: { teams: number; active: number; counsellors: number; inTeams: number; leaders: number };
}

export interface TeamMemberRow {
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

export interface TeamActivity { id: string; type: 'created' | 'joined' | 'updated'; title: string; detail: string; at: string }

export interface TeamDetail {
  team: TeamListRow & { createdBy: string; updatedAt: string };
  members: TeamMemberRow[];
  kpis: Kpis;
  trend: TrendPoint[];
  applications: OrgApplication[];
  activity: TeamActivity[];
}

export interface OrgOptions {
  ready: boolean;
  message: string;
  counsellors: Array<{ id: number; name: string; email: string; teamId: number | null; teamName: string }>;
  leaders: Array<{ id: number; name: string; roleId: number }>;
  groups: Array<{ id: number; code: string; name: string; status: OrgStatus }>;
  teams: Array<{ id: number; code: string; name: string; groupId: number | null; groupName: string; members: number; status: OrgStatus }>;
}

export interface Membership {
  team: { id: number; code: string; name: string } | null;
  group: { id: number; code: string; name: string } | null;
}

const teamSelect = {
  id: true, code: true, name: true, description: true, status: true, group_id: true, leader_user_id: true,
  created_by: true, created_at: true, updated_at: true,
} as const;

type TeamRecord = Prisma.counsellor_teamsGetPayload<{ select: typeof teamSelect }>;
type Tx = Prisma.TransactionClient;

const asStatus = (s: string | null): OrgStatus => (s === 'inactive' ? 'inactive' : 'active');

/** Refuses / re-throws: maps "table missing" to a clear refusal. */
function refuseIfMissing(error: unknown): Outcome<never> {
  if (isMissingTable(error)) return fail(NOT_SET_UP_MESSAGE);
  throw error;
}

/**
 * Touches a live group row inside the transaction (a row lock). A concurrent
 * group delete waits on it, and this sees a delete that committed first — so a
 * team can never be filed under a group that is being deleted.
 */
export async function claimLiveGroup(tx: Tx, groupId: number, actor: number | null): Promise<boolean> {
  const res = await tx.counsellor_groups.updateMany({
    where: { id: groupId, deleted_at: null },
    data: { updated_at: new Date(), updated_by: actor },
  });
  return res.count === 1;
}

export class CounsellorTeamsService {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  private toRow(t: TeamRecord, groups: Map<number, string>, people: Map<number, PersonRow>, members: number, kpis: Kpis): TeamListRow {
    return {
      id: t.id,
      code: t.code || orgCode('TEAM', t.id),
      name: t.name,
      description: t.description ?? '',
      status: asStatus(t.status),
      groupId: t.group_id,
      groupName: t.group_id == null ? '' : groups.get(t.group_id) ?? '',
      leaderId: t.leader_user_id,
      leaderName: t.leader_user_id == null ? '' : personName(people.get(t.leader_user_id) ?? { id: t.leader_user_id, name: null }),
      members,
      kpis,
      createdAt: iso(t.created_at),
    };
  }

  async list(): Promise<TeamList> {
    try {
      const [teams, links, counsellorCount] = await Promise.all([
        this.prisma.counsellor_teams.findMany({ where: { deleted_at: null }, select: teamSelect, orderBy: { id: 'asc' } }),
        this.prisma.counsellor_team_members.findMany({ select: { team_id: true, user_id: true } }),
        this.prisma.users.count({ where: { role_id: 9, deleted_at: null } }),
      ]);
      const groupIds = [...new Set(teams.map((t) => t.group_id).filter((x): x is number => x != null))];
      const people = await loadPeople(this.prisma, [
        ...links.map((l) => l.user_id),
        ...teams.map((t) => t.leader_user_id ?? 0),
      ]);
      const live = links.filter((l) => isLiveCounsellor(people.get(l.user_id)));
      const [groups, kpis] = await Promise.all([
        groupIds.length > 0
          ? this.prisma.counsellor_groups.findMany({ where: { id: { in: groupIds }, deleted_at: null }, select: { id: true, name: true } })
          : Promise.resolve([]),
        loadKpis(this.prisma, live.map((l) => l.user_id)),
      ]);
      const groupName = new Map(groups.map((g) => [g.id, g.name]));
      const byTeam = new Map<number, number[]>();
      for (const l of live) byTeam.set(l.team_id, [...(byTeam.get(l.team_id) ?? []), l.user_id]);
      const rows = teams.map((t) => {
        const ids = byTeam.get(t.id) ?? [];
        return this.toRow(t, groupName, people, ids.length, sumKpis(ids, kpis));
      });
      const teamIds = new Set(teams.map((t) => t.id));
      return {
        ready: true,
        message: 'success',
        teams: rows,
        totals: {
          teams: rows.length,
          active: rows.filter((r) => r.status === 'active').length,
          counsellors: counsellorCount,
          inTeams: live.filter((l) => teamIds.has(l.team_id)).length,
          leaders: new Set(rows.map((r) => r.leaderId).filter((x) => x != null)).size,
        },
      };
    } catch (error: unknown) {
      if (!isMissingTable(error)) throw error;
      return { ready: false, message: NOT_SET_UP_MESSAGE, teams: [], totals: { teams: 0, active: 0, counsellors: 0, inTeams: 0, leaders: 0 } };
    }
  }

  async detail(id: number, now: Date = new Date()): Promise<Outcome<TeamDetail>> {
    try {
      const team = id > 0
        ? await this.prisma.counsellor_teams.findFirst({ where: { id, deleted_at: null }, select: teamSelect })
        : null;
      if (!team) return fail('Team not found.');
      const links = await this.prisma.counsellor_team_members.findMany({
        where: { team_id: id }, select: { user_id: true, joined_at: true }, orderBy: { joined_at: 'asc' },
      });
      const people = await loadPeople(this.prisma, [...links.map((l) => l.user_id), team.leader_user_id ?? 0, team.created_by ?? 0]);
      const liveIds = links.map((l) => l.user_id).filter((u) => isLiveCounsellor(people.get(u)));
      const [group, kpis, trend, applications] = await Promise.all([
        team.group_id == null
          ? Promise.resolve(null)
          : this.prisma.counsellor_groups.findFirst({ where: { id: team.group_id, deleted_at: null }, select: { id: true, name: true } }),
        loadKpis(this.prisma, liveIds),
        loadTrend(this.prisma, liveIds, now),
        loadApplications(this.prisma, liveIds, people),
      ]);
      const groups = new Map(group ? [[group.id, group.name]] : []);
      const members: TeamMemberRow[] = links.map((l) => {
        const p = people.get(l.user_id);
        return {
          id: l.user_id,
          name: personName(p ?? { id: l.user_id, name: null }),
          email: (p?.email ?? '').trim(),
          phone: (p?.phone ?? '').trim(),
          current: isLiveCounsellor(p),
          loginDisabled: !!p?.disabled_at,
          joinedAt: iso(l.joined_at),
          kpis: kpis.get(l.user_id) ?? { ...EMPTY_KPIS },
        };
      });
      const total = sumKpis(liveIds, kpis);
      const row = this.toRow(team, groups, people, liveIds.length, total);
      const createdBy = team.created_by == null ? '' : personName(people.get(team.created_by) ?? { id: team.created_by, name: null });
      const activity: TeamActivity[] = [
        { id: 'created', type: 'created' as const, title: 'Team created', detail: createdBy ? `By ${createdBy}` : '', at: iso(team.created_at) },
        ...links.map((l) => ({
          id: `joined-${l.user_id}`,
          type: 'joined' as const,
          title: `${personName(people.get(l.user_id) ?? { id: l.user_id, name: null })} joined the team`,
          detail: '',
          at: iso(l.joined_at),
        })),
      ].filter((a) => a.at).sort((a, b) => b.at.localeCompare(a.at));
      return {
        status: 1,
        message: 'success',
        data: { team: { ...row, createdBy, updatedAt: iso(team.updated_at) }, members, kpis: total, trend, applications, activity },
      };
    } catch (error: unknown) {
      return refuseIfMissing(error);
    }
  }

  /** Pickers for the Team / Group dialogs. Counsellors are listed even before the migration. */
  async options(): Promise<OrgOptions> {
    const counsellors = await loadLiveCounsellors(this.prisma);
    const leaderRows = await this.prisma.users.findMany({
      where: { role_id: { in: [1, 8, 9] }, deleted_at: null },
      select: { id: true, name: true, role_id: true },
      orderBy: { name: 'asc' },
    });
    const leaders = leaderRows.map((u) => ({ id: u.id, name: personName(u), roleId: u.role_id ?? 0 }));
    const base = (teamOf: Map<number, { id: number; name: string }>) => counsellors.map((c) => {
      const t = teamOf.get(c.id);
      return { id: c.id, name: personName(c), email: (c.email ?? '').trim(), teamId: t?.id ?? null, teamName: t?.name ?? '' };
    });
    try {
      const [teams, groups, links] = await Promise.all([
        this.prisma.counsellor_teams.findMany({ where: { deleted_at: null }, select: { id: true, code: true, name: true, group_id: true, status: true }, orderBy: { name: 'asc' } }),
        this.prisma.counsellor_groups.findMany({ where: { deleted_at: null }, select: { id: true, code: true, name: true, status: true }, orderBy: { name: 'asc' } }),
        this.prisma.counsellor_team_members.findMany({ select: { team_id: true, user_id: true } }),
      ]);
      const teamById = new Map(teams.map((t) => [t.id, t]));
      const groupName = new Map(groups.map((g) => [g.id, g.name]));
      const liveCounsellors = new Set(counsellors.map((c) => c.id));
      const teamOf = new Map<number, { id: number; name: string }>();
      const memberCount = new Map<number, number>();
      for (const l of links) {
        const t = teamById.get(l.team_id);
        if (!t) continue;
        teamOf.set(l.user_id, { id: t.id, name: t.name });
        if (liveCounsellors.has(l.user_id)) memberCount.set(t.id, (memberCount.get(t.id) ?? 0) + 1);
      }
      return {
        ready: true,
        message: 'success',
        counsellors: base(teamOf),
        leaders,
        groups: groups.map((g) => ({ id: g.id, code: g.code || orgCode('GRP', g.id), name: g.name, status: asStatus(g.status) })),
        teams: teams.map((t) => ({
          id: t.id,
          code: t.code || orgCode('TEAM', t.id),
          name: t.name,
          groupId: t.group_id,
          groupName: t.group_id == null ? '' : groupName.get(t.group_id) ?? '',
          members: memberCount.get(t.id) ?? 0,
          status: asStatus(t.status),
        })),
      };
    } catch (error: unknown) {
      if (!isMissingTable(error)) throw error;
      return { ready: false, message: NOT_SET_UP_MESSAGE, counsellors: base(new Map()), leaders, groups: [], teams: [] };
    }
  }

  /** The counsellor profile's read-only "Team / Group" line. */
  async membershipOf(userId: number): Promise<Membership> {
    const none: Membership = { team: null, group: null };
    if (!(userId > 0)) return none;
    try {
      const link = await this.prisma.counsellor_team_members.findFirst({ where: { user_id: userId }, select: { team_id: true } });
      if (!link) return none;
      const team = await this.prisma.counsellor_teams.findFirst({
        where: { id: link.team_id, deleted_at: null }, select: { id: true, code: true, name: true, group_id: true },
      });
      if (!team) return none;
      const group = team.group_id == null
        ? null
        : await this.prisma.counsellor_groups.findFirst({ where: { id: team.group_id, deleted_at: null }, select: { id: true, code: true, name: true } });
      return {
        team: { id: team.id, code: team.code || orgCode('TEAM', team.id), name: team.name },
        group: group ? { id: group.id, code: group.code || orgCode('GRP', group.id), name: group.name } : null,
      };
    } catch (error: unknown) {
      if (isMissingTable(error)) return none;
      throw error;
    }
  }

  // ─── Writes ───────────────────────────────────────────────────────────

  private async validate(input: TeamInput, excludeId: number): Promise<string> {
    const [leader, clash, group] = await Promise.all([
      this.prisma.users.findFirst({
        where: { id: input.leaderUserId },
        select: { id: true, name: true, email: true, phone: true, role_id: true, deleted_at: true },
      }),
      this.prisma.counsellor_teams.findFirst({
        // MySQL's default collation compares names case-insensitively.
        where: { name: input.name, deleted_at: null, ...(excludeId > 0 ? { NOT: { id: excludeId } } : {}) },
        select: { id: true },
      }),
      input.groupId == null
        ? Promise.resolve({ id: 0 })
        : this.prisma.counsellor_groups.findFirst({ where: { id: input.groupId, deleted_at: null }, select: { id: true } }),
    ]);
    if (!canLead(leader)) return 'The team leader must be an active counsellor or admin.';
    if (clash) return `A team named "${input.name}" already exists.`;
    if (!group) return 'The selected group no longer exists.';
    return '';
  }

  /** Live counsellors among `userIds`, and a refusal message for any that are not. */
  private async checkCounsellors(userIds: number[]): Promise<{ ok: number[]; error: string }> {
    if (userIds.length > MEMBER_BATCH_MAX) return { ok: [], error: `Add at most ${MEMBER_BATCH_MAX} counsellors at a time.` };
    const people = await loadPeople(this.prisma, userIds);
    const bad = userIds.filter((u) => !isLiveCounsellor(people.get(u)));
    if (bad.length > 0) return { ok: [], error: `Only active counsellors can be team members (not: ${bad.map((u) => personName(people.get(u) ?? { id: u, name: null })).join(', ')}).` };
    return { ok: userIds, error: '' };
  }

  /** Who among `userIds` is already in a team (any team), as "Name (Team)". */
  private async alreadyPlaced(userIds: number[]): Promise<string[]> {
    if (userIds.length === 0) return [];
    const links = await this.prisma.counsellor_team_members.findMany({ where: { user_id: { in: userIds } }, select: { team_id: true, user_id: true } });
    if (links.length === 0) return [];
    const [teams, people] = await Promise.all([
      this.prisma.counsellor_teams.findMany({ where: { id: { in: [...new Set(links.map((l) => l.team_id))] } }, select: { id: true, name: true } }),
      loadPeople(this.prisma, links.map((l) => l.user_id)),
    ]);
    const teamName = new Map(teams.map((t) => [t.id, t.name]));
    return links.map((l) => `${personName(people.get(l.user_id) ?? { id: l.user_id, name: null })} (${teamName.get(l.team_id) ?? `team #${l.team_id}`})`);
  }

  private async insertMembers(tx: Tx, teamId: number, userIds: number[], actor: number | null): Promise<void> {
    if (userIds.length === 0) return;
    const joined = new Date();
    await tx.counsellor_team_members.createMany({
      data: userIds.map((user_id) => ({ team_id: teamId, user_id, joined_at: joined, created_by: actor })),
    });
  }

  async create(actor: number | null, raw: Record<string, unknown>, memberIds: number[]): Promise<Outcome<{ id: number }>> {
    try {
      const input = parseTeamInput(raw);
      if (typeof input === 'string') return fail(input);
      const invalid = await this.validate(input, 0);
      if (invalid) return fail(invalid);
      const members = await this.checkCounsellors(memberIds);
      if (members.error) return fail(members.error);
      const placed = await this.alreadyPlaced(members.ok);
      if (placed.length > 0) return fail(`Already in a team: ${placed.join(', ')}. Remove them from that team first.`);

      const id = await this.prisma.$transaction(async (tx) => {
        if (input.groupId != null && !(await claimLiveGroup(tx, input.groupId, actor))) throw new GroupGoneError();
        const created = await tx.counsellor_teams.create({
          data: {
            name: input.name, description: input.description, group_id: input.groupId, leader_user_id: input.leaderUserId,
            status: input.status, created_by: actor, created_at: new Date(),
          },
          select: { id: true },
        });
        await tx.counsellor_teams.update({ where: { id: created.id }, data: { code: orgCode('TEAM', created.id) } });
        await this.insertMembers(tx, created.id, members.ok, actor);
        return created.id;
      });
      const n = members.ok.length;
      return { status: 1, message: `${input.name} created${n > 0 ? ` with ${n} member${n === 1 ? '' : 's'}` : ''}.`, data: { id } };
    } catch (error: unknown) {
      if (error instanceof GroupGoneError) return fail('The selected group no longer exists.');
      if (isUniqueViolation(error)) return fail('One of these counsellors was just added to another team. Reload and try again.');
      return refuseIfMissing(error);
    }
  }

  async update(actor: number | null, id: number, raw: Record<string, unknown>): Promise<Outcome> {
    try {
      if (!(id > 0)) return fail('Team not found.');
      const input = parseTeamInput(raw);
      if (typeof input === 'string') return fail(input);
      const invalid = await this.validate(input, id);
      if (invalid) return fail(invalid);
      const updated = await this.prisma.$transaction(async (tx) => {
        if (input.groupId != null && !(await claimLiveGroup(tx, input.groupId, actor))) throw new GroupGoneError();
        const res = await tx.counsellor_teams.updateMany({
          where: { id, deleted_at: null },
          data: {
            name: input.name, description: input.description, group_id: input.groupId, leader_user_id: input.leaderUserId,
            status: input.status, updated_by: actor, updated_at: new Date(),
          },
        });
        return res.count;
      });
      if (updated === 0) return fail('Team not found.');
      return { status: 1, message: `${input.name} updated.` };
    } catch (error: unknown) {
      if (error instanceof GroupGoneError) return fail('The selected group no longer exists.');
      return refuseIfMissing(error);
    }
  }

  /** Soft-deletes the team and releases its counsellors (they can join another team). */
  async remove(actor: number | null, id: number): Promise<Outcome> {
    try {
      if (!(id > 0)) return fail('Team not found.');
      const released = await this.prisma.$transaction(async (tx) => {
        const res = await tx.counsellor_teams.updateMany({
          where: { id, deleted_at: null },
          data: { deleted_at: new Date(), deleted_by: actor },
        });
        if (res.count === 0) return -1;
        const freed = await tx.counsellor_team_members.deleteMany({ where: { team_id: id } });
        return freed.count;
      });
      if (released < 0) return fail('Team not found or already deleted.');
      return { status: 1, message: `Team deleted${released > 0 ? `; ${released} counsellor${released === 1 ? '' : 's'} released` : ''}.` };
    } catch (error: unknown) {
      return refuseIfMissing(error);
    }
  }

  async addMembers(actor: number | null, teamId: number, userIds: number[]): Promise<Outcome<{ added: number }>> {
    try {
      if (!(teamId > 0)) return fail('Team not found.');
      if (userIds.length === 0) return fail('Select at least one counsellor.');
      const members = await this.checkCounsellors(userIds);
      if (members.error) return fail(members.error);
      const placed = await this.alreadyPlaced(members.ok);
      if (placed.length > 0) return fail(`Already in a team: ${placed.join(', ')}. Remove them from that team first.`);
      const ok = await this.prisma.$transaction(async (tx) => {
        // Lock the live team row so a concurrent delete cannot strand members.
        const live = await tx.counsellor_teams.updateMany({ where: { id: teamId, deleted_at: null }, data: { updated_at: new Date(), updated_by: actor } });
        if (live.count === 0) return false;
        await this.insertMembers(tx, teamId, members.ok, actor);
        return true;
      });
      if (!ok) return fail('Team not found.');
      const n = members.ok.length;
      return { status: 1, message: `${n} counsellor${n === 1 ? '' : 's'} added.`, data: { added: n } };
    } catch (error: unknown) {
      if (isUniqueViolation(error)) return fail('One of these counsellors was just added to a team by someone else. Reload and try again.');
      return refuseIfMissing(error);
    }
  }

  async removeMember(teamId: number, userId: number): Promise<Outcome> {
    try {
      if (!(teamId > 0) || !(userId > 0)) return fail('Member not found.');
      const res = await this.prisma.counsellor_team_members.deleteMany({ where: { team_id: teamId, user_id: userId } });
      if (res.count === 0) return fail('That counsellor is not in this team.');
      return { status: 1, message: 'Counsellor removed from the team.' };
    } catch (error: unknown) {
      return refuseIfMissing(error);
    }
  }
}

class GroupGoneError extends Error {}
