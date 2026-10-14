import Fastify from 'fastify';
import { describe, expect, test } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import { CounsellorGroupsService } from '../../src/operations/counsellor-groups-service.js';
import {
  NOT_SET_UP_MESSAGE, buildTrend, canLead, isLiveCounsellor, isNameClash, kpisByCounsellor, orgCode, parseGroupInput, parseTeamInput,
  sumKpis, toIdList,
} from '../../src/operations/counsellor-teams-model.js';
import { CounsellorTeamsService } from '../../src/operations/counsellor-teams-service.js';
import { registerCounsellorTeamsRoutes } from '../../src/routes/counsellor-teams-routes.js';

// Counsellor Management → Teams and Groups (Naji 2026-10-12): organisational
// only, real KPIs, claim-safe membership, graceful before the migration.

const NOW = new Date('2026-10-12T06:00:00Z');
const missingTable = Object.assign(new Error('The table `counsellor_teams` does not exist'), { code: 'P2021' });
const duplicate = Object.assign(new Error('Unique constraint failed'), { code: 'P2002', meta: { target: 'uq_counsellor_team_members_user' } });
const nameClash = Object.assign(new Error('Unique constraint failed'), { code: 'P2002', meta: { target: 'uq_counsellor_teams_live_name' } });

interface User { id: number; name: string; role_id: number; deleted_at: Date | null }
interface Team { id: number; name: string; code: string; group_id: number | null; leader_user_id: number | null; status: string; deleted_at: Date | null; description: null; created_by: null; created_at: Date; updated_at: null }
interface Link { team_id: number; user_id: number; joined_at: Date }

/** A tiny in-memory Prisma for the membership rules. */
function world(opts: { users?: User[]; teams?: Team[]; links?: Link[]; groups?: Array<{ id: number; name: string; deleted_at: Date | null }>; raceOnInsert?: boolean; raceOnName?: boolean } = {}) {
  const users = opts.users ?? [
    { id: 1, name: 'Admin', role_id: 1, deleted_at: null },
    { id: 10, name: 'Asha', role_id: 9, deleted_at: null },
    { id: 11, name: 'Ravi', role_id: 9, deleted_at: null },
    { id: 12, name: 'Gone', role_id: 9, deleted_at: new Date() },
    { id: 20, name: 'Student', role_id: 2, deleted_at: null },
  ];
  const teams: Team[] = opts.teams ?? [
    { id: 1, name: 'Phoenix', code: 'TEAM-001', group_id: null, leader_user_id: 1, status: 'active', deleted_at: null, description: null, created_by: null, created_at: NOW, updated_at: null },
  ];
  const links: Link[] = opts.links ?? [];
  const groups = opts.groups ?? [{ id: 5, name: 'North', deleted_at: null }];
  const pick = <T extends object>(row: T) => ({ ...row, email: null, phone: null, disabled_at: null });
  const matchIn = (v: number, w: unknown) => (typeof w === 'object' && w !== null && 'in' in w ? (w as { in: number[] }).in.includes(v) : v === w);

  const tx = {
    counsellor_teams: {
      findFirst: ({ where }: { where: { id?: number; name?: string; deleted_at: null; NOT?: { id: number } } }) =>
        Promise.resolve(teams.find((t) => !t.deleted_at && (where.id === undefined || t.id === where.id)
          && (where.name === undefined || t.name.toLowerCase() === where.name.toLowerCase())
          && (!where.NOT || t.id !== where.NOT.id)) ?? null),
      findMany: ({ where }: { where?: { id?: unknown } } = {}) =>
        Promise.resolve(teams.filter((t) => where?.id === undefined || matchIn(t.id, where.id))),
      create: ({ data }: { data: Partial<Team> }) => {
        if (opts.raceOnName) return Promise.reject(nameClash);
        const row = { ...teams[0]!, ...data, id: teams.length + 1, code: '', deleted_at: null } as Team;
        teams.push(row);
        return Promise.resolve({ id: row.id });
      },
      update: ({ where, data }: { where: { id: number }; data: Partial<Team> }) => {
        const t = teams.find((x) => x.id === where.id);
        if (t) Object.assign(t, data);
        return Promise.resolve(t);
      },
      updateMany: ({ where, data }: { where: { id: number; deleted_at: null }; data: Partial<Team> }) => {
        const t = teams.find((x) => x.id === where.id && !x.deleted_at);
        if (t) Object.assign(t, data);
        return Promise.resolve({ count: t ? 1 : 0 });
      },
      count: () => Promise.resolve(0),
    },
    counsellor_team_members: {
      findMany: ({ where }: { where?: { user_id?: unknown; team_id?: unknown } } = {}) =>
        Promise.resolve(links.filter((l) => (where?.user_id === undefined || matchIn(l.user_id, where.user_id))
          && (where?.team_id === undefined || matchIn(l.team_id, where.team_id)))),
      createMany: ({ data }: { data: Link[] }) => {
        if (opts.raceOnInsert) return Promise.reject(duplicate);
        for (const d of data) {
          if (links.some((l) => l.user_id === d.user_id)) return Promise.reject(duplicate);
        }
        links.push(...data);
        return Promise.resolve({ count: data.length });
      },
      deleteMany: ({ where }: { where: { team_id: number; user_id?: number } }) => {
        const keep = links.filter((l) => !(l.team_id === where.team_id && (where.user_id === undefined || l.user_id === where.user_id)));
        const count = links.length - keep.length;
        links.splice(0, links.length, ...keep);
        return Promise.resolve({ count });
      },
    },
    counsellor_groups: {
      findFirst: ({ where }: { where: { id?: number; deleted_at: null } }) =>
        Promise.resolve(groups.find((g) => !g.deleted_at && g.id === where.id) ?? null),
      findMany: () => Promise.resolve(groups),
      updateMany: ({ where }: { where: { id: number } }) => Promise.resolve({ count: groups.some((g) => g.id === where.id && !g.deleted_at) ? 1 : 0 }),
    },
    users: {
      findFirst: ({ where }: { where: { id: number } }) => Promise.resolve(users.find((u) => u.id === where.id) ?? null),
      findMany: ({ where }: { where: { id?: unknown } }) =>
        Promise.resolve(users.filter((u) => where.id === undefined || matchIn(u.id, where.id)).map(pick)),
      count: () => Promise.resolve(users.filter((u) => u.role_id === 9 && !u.deleted_at).length),
    },
    // Direct group members (2026-10-14): none here; covered in counsellor-group-members.test.ts.
    counsellor_group_members: { findFirst: () => Promise.resolve(null), findMany: () => Promise.resolve([]), deleteMany: () => Promise.resolve({ count: 0 }) },
    applications: { groupBy: () => Promise.resolve([]), findMany: () => Promise.resolve([]) },
    course: { findMany: () => Promise.resolve([]) },
  };
  const prisma = {
    ...tx,
    $transaction: async <T>(fn: (t: typeof tx) => Promise<T>) => {
      const saved = { teams: teams.map((t) => ({ ...t })), links: links.map((l) => ({ ...l })) };
      try {
        return await fn(tx);
      } catch (err) {
        teams.splice(0, teams.length, ...saved.teams);
        links.splice(0, links.length, ...saved.links);
        throw err;
      }
    },
  } as unknown as PrismaClient;
  return { service: new CounsellorTeamsService(prisma), teams, links };
}

describe('input rules', () => {
  test('team: name, leader required; status and group normalised', () => {
    expect(parseTeamInput({ name: ' ', leader_user_id: 3 })).toBe('Team name is required.');
    expect(parseTeamInput({ name: 'Phoenix' })).toBe('Team leader is required.');
    expect(parseTeamInput({ name: 'x'.repeat(121), leader_user_id: 3 })).toMatch(/120 characters/);
    expect(parseTeamInput({ name: 'A', leader_user_id: 3, status: 'paused' })).toBe('Status must be Active or Inactive.');
    expect(parseTeamInput({ name: '  Team   Phoenix ', leader_user_id: '3', group_id: '0', status: 'Inactive' }))
      .toEqual({ name: 'Team Phoenix', description: null, groupId: null, leaderUserId: 3, status: 'inactive' });
  });

  test('group: manager required', () => {
    expect(parseGroupInput({ name: 'North' })).toBe('Group manager is required.');
    expect(parseGroupInput({ name: 'North', manager_user_id: 1, description: ' South zone ' }))
      .toEqual({ name: 'North', description: 'South zone', managerUserId: 1, status: 'active' });
  });

  test('ids, codes and roles', () => {
    expect(toIdList(['3', 3, 'x', -1, 0, 4])).toEqual([3, 4]);
    expect(toIdList('3')).toEqual([]);
    expect(orgCode('TEAM', 7)).toBe('TEAM-007');
    expect(orgCode('GRP', 1234)).toBe('GRP-1234');
    const u = (role_id: number, deleted_at: Date | null = null) => ({ id: 1, name: 'x', email: null, phone: null, role_id, deleted_at });
    expect([1, 8, 9, 2, 10].map((r) => canLead(u(r)))).toEqual([true, true, true, false, false]);
    expect(canLead(u(9, new Date()))).toBe(false);
    // A disabled login cannot lead or manage.
    expect(canLead({ ...u(1), disabled_at: new Date() })).toBe(false);
    expect(isNameClash(nameClash)).toBe(true);
    expect(isNameClash(duplicate)).toBe(false);
    expect(isNameClash(new Error('x'))).toBe(false);
    expect([9, 1].map((r) => isLiveCounsellor(u(r)))).toEqual([true, false]);
  });
});

describe('KPIs', () => {
  test('enrolled = is_converted 1; rejected excludes converted; per counsellor and summed', () => {
    const by = kpisByCounsellor([
      { pipeline_user: 10, stage: 'lead', is_converted: 0, count: 4 },
      { pipeline_user: 10, stage: 'enrolled', is_converted: 0, count: 1 }, // stage alone is not enrolled
      { pipeline_user: 10, stage: 'paid', is_converted: 1, count: 3 },
      { pipeline_user: 10, stage: 'rejected', is_converted: 1, count: 1 },
      { pipeline_user: 11, stage: 'rejected', is_converted: 0, count: 2 },
      { pipeline_user: null, stage: 'lead', is_converted: 1, count: 9 },
    ]);
    expect(by.get(10)).toEqual({ applications: 9, enrolled: 4, pending: 5, rejected: 0, conversion: 44 });
    expect(by.get(11)).toEqual({ applications: 2, enrolled: 0, pending: 0, rejected: 2, conversion: 0 });
    expect(sumKpis([10, 11, 99], by)).toEqual({ applications: 11, enrolled: 4, pending: 5, rejected: 2, conversion: 36 });
  });

  test('trend buckets by IST month', () => {
    const t = buildTrend([
      // 30 Sep 20:00 UTC is 1 Oct IST.
      { is_converted: 1, created_at: new Date('2026-09-30T20:00:00Z'), converted_at: new Date('2026-10-02T05:00:00Z') },
      { is_converted: 1, created_at: new Date('2026-08-10T05:00:00Z'), converted_at: null },
      { is_converted: 0, created_at: new Date('2024-01-01T05:00:00Z'), converted_at: null },
    ], NOW);
    expect(t).toHaveLength(12);
    const by = Object.fromEntries(t.map((p) => [p.month, [p.applications, p.enrollments]]));
    expect(by['2026-10']).toEqual([1, 1]);
    expect(by['2026-08']).toEqual([1, 1]);
    expect(t[11]?.label).toBe('Oct 26');
  });
});

describe('before the migration (P2021)', () => {
  const broken = () => Promise.reject(missingTable);
  const prisma = {
    counsellor_teams: { findMany: broken, findFirst: broken },
    counsellor_groups: { findMany: broken, findFirst: broken },
    counsellor_team_members: { findMany: broken, findFirst: broken, deleteMany: broken },
    counsellor_group_members: { findMany: broken, findFirst: broken, deleteMany: broken },
    users: { count: () => Promise.resolve(3), findMany: () => Promise.resolve([{ id: 10, name: 'Asha', email: null, phone: null, role_id: 9, deleted_at: null, disabled_at: null }]) },
  } as unknown as PrismaClient;

  test('lists answer empty with a clear message instead of throwing', async () => {
    const teams = await new CounsellorTeamsService(prisma).list();
    expect(teams).toMatchObject({ ready: false, message: NOT_SET_UP_MESSAGE, teams: [] });
    const groups = await new CounsellorGroupsService(prisma).list();
    expect(groups).toMatchObject({ ready: false, message: NOT_SET_UP_MESSAGE, groups: [] });
  });

  test('options still list counsellors; membership is empty; writes refuse', async () => {
    const service = new CounsellorTeamsService(prisma);
    const options = await service.options();
    expect(options.ready).toBe(false);
    expect(options.counsellors).toEqual([{ id: 10, name: 'Asha', email: '', disabled: false, teamId: null, teamName: '', directGroupId: null, directGroupName: '' }]);
    expect(options.directReady).toBe(false);
    expect(await service.membershipOf(10)).toEqual({ team: null, group: null, direct: false });
    expect(await service.detail(1)).toEqual({ status: 0, message: NOT_SET_UP_MESSAGE });
    expect(await service.removeMember(1, 10)).toEqual({ status: 0, message: NOT_SET_UP_MESSAGE });
  });
});

describe('team membership', () => {
  test('only live counsellors can be added', async () => {
    const { service, links } = world();
    expect((await service.addMembers(1, 1, [10, 12])).message).toMatch(/Only active counsellors.*Gone/);
    expect((await service.addMembers(1, 1, [20])).status).toBe(0);
    expect(links).toHaveLength(0);
    expect(await service.addMembers(1, 1, [10, 11])).toMatchObject({ status: 1, data: { added: 2 } });
    expect(links.map((l) => l.user_id)).toEqual([10, 11]);
  });

  test('a counsellor already in a team is refused with the team name', async () => {
    const { service } = world({ links: [{ team_id: 1, user_id: 10, joined_at: NOW }] });
    const res = await service.addMembers(1, 1, [10]);
    expect(res).toEqual({ status: 0, message: 'Already in a team: Asha (Phoenix). Remove them from that team first.' });
  });

  test('a race lost at the UNIQUE index is a clear refusal, nothing half-written', async () => {
    const { service, links } = world({ raceOnInsert: true });
    const res = await service.addMembers(1, 1, [10, 11]);
    expect(res.status).toBe(0);
    expect(res.message).toMatch(/just added to a team by someone else/);
    expect(links).toHaveLength(0);
  });

  test('cannot add to a deleted team; remove reports a non-member', async () => {
    const { service, teams } = world();
    teams[0]!.deleted_at = new Date();
    expect(await service.addMembers(1, 1, [10])).toEqual({ status: 0, message: 'Team not found.' });
    expect(await service.removeMember(1, 10)).toEqual({ status: 0, message: 'That counsellor is not in this team.' });
  });

  test('deleting a team releases its counsellors', async () => {
    const { service, links, teams } = world({ links: [{ team_id: 1, user_id: 10, joined_at: NOW }, { team_id: 1, user_id: 11, joined_at: NOW }] });
    expect(await service.remove(1, 1)).toEqual({ status: 1, message: 'Team deleted; 2 counsellors released.' });
    expect(links).toHaveLength(0);
    expect(teams[0]?.deleted_at).toBeInstanceOf(Date);
    expect(await service.remove(1, 1)).toEqual({ status: 0, message: 'Team not found or already deleted.' });
  });
});

describe('team create / update', () => {
  test('validates leader, unique name and group; codes from the id', async () => {
    const { service, teams, links } = world();
    expect((await service.create(1, { name: 'Falcon', leader_user_id: 20 }, [])).message).toBe('The team leader must be an active counsellor or admin.');
    expect((await service.create(1, { name: 'phoenix', leader_user_id: 1 }, [])).message).toBe('A team named "phoenix" already exists.');
    expect((await service.create(1, { name: 'Falcon', leader_user_id: 1, group_id: 99 }, [])).message).toBe('The selected group no longer exists.');
    const ok = await service.create(1, { name: 'Falcon', leader_user_id: 10, group_id: 5 }, [11]);
    expect(ok).toEqual({ status: 1, message: 'Falcon created with 1 member.', data: { id: 2 } });
    expect(teams[1]).toMatchObject({ code: 'TEAM-002', group_id: 5, leader_user_id: 10 });
    expect(links).toEqual([expect.objectContaining({ team_id: 2, user_id: 11 })]);
  });

  test('update keeps its own name and refuses a missing team', async () => {
    const { service } = world();
    expect(await service.update(1, 1, { name: 'Phoenix', leader_user_id: 1, status: 'inactive' })).toEqual({ status: 1, message: 'Phoenix updated.' });
    expect(await service.update(1, 9, { name: 'Other', leader_user_id: 1 })).toEqual({ status: 0, message: 'Team not found.' });
  });
});

describe('duplicate names', () => {
  test('a live-name race lost at UNIQUE(live_name) reads as a duplicate name, nothing written', async () => {
    const { service, teams, links } = world({ raceOnName: true });
    const res = await service.create(1, { name: 'Falcon', leader_user_id: 1 }, [10]);
    expect(res).toEqual({ status: 0, message: 'A team named "Falcon" already exists.' });
    expect(teams).toHaveLength(1);
    expect(links).toHaveLength(0);
  });

  test('create stores live_name; delete frees it', async () => {
    const { service, teams } = world();
    await service.create(1, { name: 'Falcon', leader_user_id: 1 }, []);
    expect(teams[1]).toMatchObject({ name: 'Falcon', live_name: 'Falcon' });
    await service.remove(1, 2);
    expect(teams[1]).toMatchObject({ live_name: null });
  });
});

describe('group delete', () => {
  function groupWorld(teamCount: number) {
    const groups = [{ id: 5, deleted_at: null as Date | null }];
    const tx = {
      counsellor_groups: {
        updateMany: ({ where, data }: { where: { id: number }; data: { deleted_at: Date } }) => {
          const g = groups.find((x) => x.id === where.id && !x.deleted_at);
          if (g) g.deleted_at = data.deleted_at;
          return Promise.resolve({ count: g ? 1 : 0 });
        },
      },
      counsellor_teams: { count: () => Promise.resolve(teamCount) },
      counsellor_group_members: { findFirst: () => Promise.resolve(null), deleteMany: () => Promise.resolve({ count: 0 }) },
    };
    const prisma = {
      ...tx,
      $transaction: async <T>(fn: (t: typeof tx) => Promise<T>) => {
        const saved = groups.map((g) => ({ ...g }));
        try { return await fn(tx); } catch (err) { groups.splice(0, groups.length, ...saved); throw err; }
      },
    } as unknown as PrismaClient;
    return { service: new CounsellorGroupsService(prisma), groups };
  }

  test('refused (and rolled back) while it still has teams', async () => {
    const { service, groups } = groupWorld(2);
    expect(await service.remove(1, 5)).toEqual({ status: 0, message: 'This group still has 2 teams. Move or remove them before deleting the group.' });
    expect(groups[0]?.deleted_at).toBeNull();
  });

  test('an empty group is soft-deleted once', async () => {
    const { service, groups } = groupWorld(0);
    expect(await service.remove(1, 5)).toEqual({ status: 1, message: 'Group deleted.' });
    expect(groups[0]?.deleted_at).toBeInstanceOf(Date);
    expect((await service.remove(1, 5)).status).toBe(0);
  });
});

describe('routes', () => {
  test('admin-only guard runs first; lists answer 200 even before the migration', async () => {
    const app = Fastify();
    const denied: string[] = [];
    const prisma = {
      counsellor_teams: { findMany: () => Promise.reject(missingTable) },
      counsellor_team_members: { findMany: () => Promise.reject(missingTable) },
      users: { count: () => Promise.resolve(0) },
    } as unknown as PrismaClient;
    registerCounsellorTeamsRoutes(app, {
      requireAuth: async () => {},
      requireAdminOnlyRole: async (request, reply) => {
        if (request.headers['x-role'] !== 'admin') {
          denied.push(request.url);
          await reply.code(403).send({ status: 0, message: 'Forbidden' });
        }
      },
      teamsService: new CounsellorTeamsService(prisma),
      groupsService: new CounsellorGroupsService(prisma),
    });
    const forbidden = await app.inject({ method: 'POST', url: '/admin/teams/add_members', payload: { team_id: 1, user_ids: [10] } });
    expect(forbidden.statusCode).toBe(403);
    expect(denied).toEqual(['/admin/teams/add_members']);
    const list = await app.inject({ method: 'GET', url: '/admin/teams/index', headers: { 'x-role': 'admin' } });
    expect(list.statusCode).toBe(200);
    expect(list.json()).toMatchObject({ status: 1, data: { ready: false, message: NOT_SET_UP_MESSAGE, teams: [] } });
    await app.close();
  });

  test('an unexpected failure is a generic 500, not the raw error', async () => {
    const app = Fastify({ logger: false });
    const prisma = { counsellor_teams: { findMany: () => Promise.reject(new Error('Access denied for user lms@10.0.0.5')) }, counsellor_team_members: { findMany: () => Promise.resolve([]) }, users: { count: () => Promise.resolve(0) } } as unknown as PrismaClient;
    registerCounsellorTeamsRoutes(app, {
      requireAuth: async () => {},
      requireAdminOnlyRole: async () => {},
      teamsService: new CounsellorTeamsService(prisma),
      groupsService: new CounsellorGroupsService(prisma),
    });
    const res = await app.inject({ method: 'GET', url: '/admin/teams/index' });
    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({ status: 0, message: 'Something went wrong. Please try again.', data: {} });
    await app.close();
  });
});
