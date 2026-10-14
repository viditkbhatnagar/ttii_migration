import { describe, expect, test } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import { CounsellorGroupsService, groupCounsellorIds } from '../../src/operations/counsellor-groups-service.js';
import { DIRECT_NOT_SET_UP_MESSAGE } from '../../src/operations/counsellor-group-members.js';
import { WRITE_CONFLICT_MESSAGE } from '../../src/operations/counsellor-teams-model.js';
import { CounsellorTeamsService } from '../../src/operations/counsellor-teams-service.js';

// Counsellors filed DIRECTLY under a group (Naji 2026-10-14): one group per
// counsellor (through their team, or directly), moves between groups,
// joining a team ends the direct membership, delete releases, P2021, and
// group KPIs over team ∪ direct members.

type Row = Record<string, unknown>;
const missingTable = Object.assign(new Error('The table `counsellor_group_members` does not exist'), { code: 'P2021' });
const uniqueUser = Object.assign(new Error('Unique constraint failed'), { code: 'P2002', meta: { target: 'uq_counsellor_group_members_user' } });

/** Minimal Prisma `where` matching: equality, { in }, { not }, { gte }, NOT, OR. */
function matches(row: Row, where: Row | undefined): boolean {
  if (!where) return true;
  return Object.entries(where).every(([key, cond]) => {
    if (key === 'NOT') return !matches(row, cond as Row);
    if (key === 'OR') return (cond as Row[]).some((c) => matches(row, c));
    const value = row[key];
    if (cond !== null && typeof cond === 'object' && !(cond instanceof Date)) {
      const c = cond as { in?: unknown[]; not?: unknown; gte?: Date };
      if (c.in) return c.in.includes(value);
      if ('not' in c) return value !== c.not;
      if (c.gte) return value instanceof Date && value >= c.gte;
      return true;
    }
    if (key === 'name' && typeof value === 'string' && typeof cond === 'string') return value.toLowerCase() === cond.toLowerCase();
    return value === cond;
  });
}

interface WorldOptions {
  /** counsellor_group_members does not exist yet (P2021). */
  directMissing?: boolean;
  /** The direct insert loses a UNIQUE(user_id) race. */
  directRace?: boolean;
  /** Someone adds this user to team 1 while we place them directly. */
  joinsTeamMeanwhile?: number;
  /** A deadlock / serialization failure on this write. */
  conflictOn?: 'groupUpdate' | 'teamInsert';
  /** applications.groupBy rows: [pipeline_user, is_converted, count]. */
  apps?: Array<[number, number, number]>;
}

function world(opts: WorldOptions = {}) {
  const NOW = new Date('2026-10-14T06:00:00Z');
  const tables: Record<string, Row[]> = {
    users: [
      { id: 1, name: 'Admin', role_id: 1, deleted_at: null, disabled_at: null, email: null, phone: null },
      { id: 10, name: 'Asha', role_id: 9, deleted_at: null, disabled_at: null, email: 'a@x.in', phone: null },
      { id: 11, name: 'Ravi', role_id: 9, deleted_at: null, disabled_at: null, email: null, phone: null },
      { id: 12, name: 'Mira', role_id: 9, deleted_at: null, disabled_at: null, email: null, phone: null },
      { id: 13, name: 'Off', role_id: 9, deleted_at: null, disabled_at: NOW, email: null, phone: null },
      { id: 20, name: 'Student', role_id: 2, deleted_at: null, disabled_at: null, email: null, phone: null },
    ],
    counsellor_groups: [
      { id: 5, name: 'North', code: 'GRP-005', status: 'active', manager_user_id: 1, deleted_at: null, description: null, created_by: null, created_at: NOW, updated_at: null },
      { id: 6, name: 'South', code: 'GRP-006', status: 'active', manager_user_id: 1, deleted_at: null, description: null, created_by: null, created_at: NOW, updated_at: null },
    ],
    counsellor_teams: [
      { id: 1, name: 'Phoenix', code: 'TEAM-001', group_id: 5, leader_user_id: 1, status: 'active', deleted_at: null, description: null, created_by: null, created_at: NOW, updated_at: null },
    ],
    counsellor_team_members: [{ team_id: 1, user_id: 10, joined_at: NOW, created_by: null }],
    counsellor_group_members: [{ group_id: 6, user_id: 11, joined_at: NOW, created_by: null }],
  };
  const isolation: unknown[] = [];

  function model(name: string) {
    const rows = () => tables[name] as Row[];
    const guard = () => (name === 'counsellor_group_members' && opts.directMissing ? Promise.reject(missingTable) : null);
    return {
      findMany: (args: { where?: Row } = {}) => guard() ?? Promise.resolve(rows().filter((r) => matches(r, args.where)).map((r) => ({ ...r }))),
      findFirst: (args: { where?: Row } = {}) => guard() ?? Promise.resolve(rows().find((r) => matches(r, args.where)) ?? null),
      count: (args: { where?: Row } = {}) => guard() ?? Promise.resolve(rows().filter((r) => matches(r, args.where)).length),
      create: ({ data }: { data: Row }) => {
        const row = { ...data, id: rows().length + 100, deleted_at: null };
        rows().push(row);
        return Promise.resolve({ id: row.id });
      },
      update: ({ where, data }: { where: Row; data: Row }) => {
        const r = rows().find((x) => matches(x, where));
        if (r) Object.assign(r, data);
        return Promise.resolve(r);
      },
      updateMany: ({ where, data }: { where: Row; data: Row }) => {
        if (name === 'counsellor_groups' && opts.conflictOn === 'groupUpdate' && 'name' in data) {
          return Promise.reject(Object.assign(new Error('Transaction failed due to a write conflict or a deadlock'), { code: 'P2034' }));
        }
        const hit = rows().filter((r) => matches(r, where));
        hit.forEach((r) => Object.assign(r, data));
        return Promise.resolve({ count: hit.length });
      },
      createMany: ({ data }: { data: Row[] }) => {
        if (name === 'counsellor_team_members' && opts.conflictOn === 'teamInsert') {
          return Promise.reject(new Error('Deadlock found when trying to get lock; try restarting transaction'));
        }
        const blocked = guard();
        if (blocked) return blocked;
        if (name === 'counsellor_group_members') {
          if (opts.directRace) return Promise.reject(uniqueUser);
          if (opts.joinsTeamMeanwhile) tables.counsellor_team_members?.push({ team_id: 1, user_id: opts.joinsTeamMeanwhile, joined_at: NOW });
        }
        for (const d of data) {
          if (rows().some((r) => r.user_id === d.user_id)) return Promise.reject(uniqueUser);
        }
        rows().push(...data);
        return Promise.resolve({ count: data.length });
      },
      deleteMany: ({ where }: { where: Row }) => {
        const blocked = guard();
        if (blocked) return blocked;
        const keep = rows().filter((r) => !matches(r, where));
        const count = rows().length - keep.length;
        tables[name] = keep;
        return Promise.resolve({ count });
      },
    };
  }

  const tx = {
    users: model('users'),
    counsellor_groups: model('counsellor_groups'),
    counsellor_teams: model('counsellor_teams'),
    counsellor_team_members: model('counsellor_team_members'),
    counsellor_group_members: model('counsellor_group_members'),
    applications: {
      groupBy: ({ where }: { where: { pipeline_user: { in: number[] } } }) => Promise.resolve((opts.apps ?? [])
        .filter(([u]) => where.pipeline_user.in.includes(u))
        .map(([pipeline_user, is_converted, count]) => ({ pipeline_user, stage: 'lead', is_converted, _count: { id: count } }))),
      findMany: () => Promise.resolve([]),
    },
    course: { findMany: () => Promise.resolve([]) },
  };
  const prisma = {
    ...tx,
    // Rolls every table back when the callback throws, like a real transaction.
    $transaction: async <T>(fn: (t: typeof tx) => Promise<T>, options?: unknown) => {
      isolation.push(options);
      const saved = Object.fromEntries(Object.entries(tables).map(([k, v]) => [k, v.map((r) => ({ ...r }))]));
      try {
        return await fn(tx);
      } catch (err) {
        Object.assign(tables, saved);
        throw err;
      }
    },
  } as unknown as PrismaClient;
  const direct = () => (tables.counsellor_group_members ?? []).map((r) => [r.group_id, r.user_id]);
  const teamLinks = () => (tables.counsellor_team_members ?? []).map((r) => [r.team_id, r.user_id]);
  return { groups: new CounsellorGroupsService(prisma), teams: new CounsellorTeamsService(prisma), tables, direct, teamLinks, isolation };
}

describe('one group per counsellor', () => {
  test('only live, enabled counsellors in no team can be filed directly', async () => {
    const w = world();
    expect((await w.groups.addCounsellors(1, 5, [10])).message)
      .toBe("Already in a team, so they belong to the team's group: Asha (Phoenix).");
    expect((await w.groups.addCounsellors(1, 5, [13])).message).toMatch(/login is enabled.*Off/);
    expect((await w.groups.addCounsellors(1, 5, [20])).status).toBe(0);
    expect(await w.groups.addCounsellors(1, 5, [12])).toEqual({ status: 1, message: '1 counsellor added to the group.', data: { added: 1 } });
    expect(w.direct()).toContainEqual([5, 12]);
    expect((await w.groups.addCounsellors(1, 5, [12])).message).toBe('Those counsellors are already in this group.');
  });

  test('a direct member of another group moves here in one transaction', async () => {
    const w = world();
    const res = await w.groups.addCounsellors(1, 5, [11]);
    expect(res).toEqual({ status: 1, message: '1 counsellor added to the group. 1 moved from another group.', data: { added: 1 } });
    expect(w.direct()).toEqual([[5, 11]]);
    // Placement runs READ COMMITTED (see counsellor-group-members.ts).
    expect(w.isolation.at(-1)).toEqual({ isolationLevel: 'ReadCommitted' });
  });

  test('a lost UNIQUE race is a clear refusal and the old group is kept', async () => {
    const w = world({ directRace: true });
    const res = await w.groups.addCounsellors(1, 5, [11]);
    expect(res).toEqual({ status: 0, message: 'One of these counsellors was just added to another group by someone else. Reload and try again.' });
    expect(w.direct()).toEqual([[6, 11]]);
  });

  test('joining a team while being placed rolls the placement back', async () => {
    const w = world({ joinsTeamMeanwhile: 12 });
    const res = await w.groups.addCounsellors(1, 5, [12]);
    expect(res.message).toBe("One of these counsellors just joined a team, so they belong to the team's group. Reload and try again.");
    expect(w.direct()).toEqual([[6, 11]]);
  });

  test('joining a team ends the direct membership in the same transaction', async () => {
    const w = world();
    const res = await w.teams.addMembers(1, 1, [11]);
    expect(res.status).toBe(1);
    expect(res.message).toContain("1 left their direct group and now sit under the team's group.");
    expect(w.direct()).toEqual([]);
    expect(w.teamLinks()).toContainEqual([1, 11]);
  });

  test('creating a team with a direct member also ends it', async () => {
    const w = world();
    const res = await w.teams.create(1, { name: 'Falcon', leader_user_id: 1 }, [11]);
    expect(res.status).toBe(1);
    expect(w.direct()).toEqual([]);
  });
});

describe('group create / update / delete', () => {
  test('create files teams and direct counsellors together', async () => {
    const w = world();
    const res = await w.groups.create(1, { name: 'East', manager_user_id: 1 }, [1], [11, 12]);
    expect(res.message).toBe('East created with 1 team and 2 counsellors (1 moved from another group).');
    const id = res.data?.id;
    expect(w.direct()).toEqual([[id, 11], [id, 12]]);
    expect(w.tables.counsellor_teams?.[0]?.group_id).toBe(id);
  });

  test('create refuses a counsellor who is in a team', async () => {
    const w = world();
    const res = await w.groups.create(1, { name: 'East', manager_user_id: 1 }, [], [10]);
    expect(res.status).toBe(0);
    expect(w.tables.counsellor_groups).toHaveLength(2);
  });

  const south = { name: 'South', manager_user_id: 1 };

  test('update applies only explicit adds and removes', async () => {
    const w = world();
    expect(await w.groups.update(1, 6, south)).toEqual({ status: 1, message: 'South updated.' });
    expect(w.direct()).toEqual([[6, 11]]);
    expect(await w.groups.update(1, 6, south, { add: [12], remove: [11] }))
      .toEqual({ status: 1, message: 'South updated; 1 counsellor added, 1 counsellor removed.' });
    expect(w.direct()).toEqual([[6, 12]]);
    // Named in both lists: ambiguous, left alone.
    await w.groups.update(1, 6, south, { add: [12], remove: [12] });
    expect(w.direct()).toEqual([[6, 12]]);
    // Adding someone already here keeps their row (no re-insert).
    expect(await w.groups.update(1, 6, south, { add: [12], remove: [] })).toEqual({ status: 1, message: 'South updated.' });
  });

  test('a counsellor another admin added meanwhile survives an unchanged save', async () => {
    const w = world();
    // The dialog loaded [Ravi]; meanwhile another admin adds Mira.
    expect((await w.groups.addCounsellors(1, 6, [12])).status).toBe(1);
    // The dialog is saved unchanged: no adds, no removes.
    expect((await w.groups.update(1, 6, south, { add: [], remove: [] })).status).toBe(1);
    expect(w.direct()).toEqual([[6, 11], [6, 12]]);
  });

  test('direct rows of accounts that are no longer live counsellors survive a save', async () => {
    const w = world();
    // User 20 is not a live counsellor (so the dialog never listed them).
    w.tables.counsellor_group_members?.push({ group_id: 6, user_id: 20, joined_at: null });
    expect((await w.groups.update(1, 6, south, { add: [12], remove: [11] })).status).toBe(1);
    expect(w.direct()).toEqual([[6, 20], [6, 12]]);
  });

  test('deadlocks and serialization failures read as a clear retry message', async () => {
    expect(await world({ conflictOn: 'groupUpdate' }).groups.update(1, 6, south, { add: [12], remove: [] }))
      .toEqual({ status: 0, message: WRITE_CONFLICT_MESSAGE });
    expect(await world({ conflictOn: 'teamInsert' }).teams.addMembers(1, 1, [12]))
      .toEqual({ status: 0, message: WRITE_CONFLICT_MESSAGE });
  });

  test('delete is refused while the group has teams; direct-only groups release their counsellors', async () => {
    const w = world();
    w.tables.counsellor_group_members?.push({ group_id: 5, user_id: 12, joined_at: null });
    expect((await w.groups.remove(1, 5)).message).toMatch(/still has 1 team/);
    expect(w.direct()).toContainEqual([5, 12]);
    expect(await w.groups.remove(1, 6)).toEqual({ status: 1, message: 'Group deleted; 1 counsellor released.' });
    expect(w.direct()).toEqual([[5, 12]]);
  });

  test('remove a direct counsellor', async () => {
    const w = world();
    expect(await w.groups.removeCounsellor(6, 11)).toEqual({ status: 1, message: 'Counsellor removed from the group.' });
    expect(await w.groups.removeCounsellor(6, 11)).toEqual({ status: 0, message: 'That counsellor is not a direct member of this group.' });
  });

  test('removing from a deleted group is refused', async () => {
    const w = world();
    const g = w.tables.counsellor_groups?.find((r) => r.id === 6);
    if (g) g.deleted_at = new Date();
    expect(await w.groups.removeCounsellor(6, 11)).toEqual({ status: 0, message: 'This group no longer exists (it was deleted).' });
    expect(w.direct()).toEqual([[6, 11]]);
  });
});

describe('reads', () => {
  test('group KPIs and counts cover team ∪ direct members, deduped', async () => {
    const w = world({ apps: [[10, 1, 2], [10, 0, 3], [11, 1, 1], [12, 0, 4]] });
    // Asha is in team Phoenix (group 5) AND, as bad data, a direct row of group 5: counted once.
    w.tables.counsellor_group_members?.push({ group_id: 5, user_id: 12, joined_at: null }, { group_id: 5, user_id: 10, joined_at: null });
    const list = await w.groups.list();
    const north = list.groups.find((g) => g.id === 5);
    expect(north).toMatchObject({ counsellors: 2, direct: 2, kpis: { applications: 9, enrolled: 2 } });
    const south = list.groups.find((g) => g.id === 6);
    expect(south).toMatchObject({ counsellors: 1, direct: 1, kpis: { applications: 1, enrolled: 1 } });
  });

  test('groupCounsellorIds dedupes and skips non-live direct rows', () => {
    const people = new Map([10, 11, 13].map((id) => [id, { id, name: 'x', email: null, phone: null, role_id: 9, deleted_at: id === 13 ? new Date() : null }]));
    const ids = groupCounsellorIds(5, {
      teams: [{ id: 1, code: '', name: 'T', status: 'active', group_id: 5, leader_user_id: null }],
      membersByTeam: new Map([[1, [10]]]),
      direct: [{ group_id: 5, user_id: 10, joined_at: null }, { group_id: 5, user_id: 11, joined_at: null }, { group_id: 5, user_id: 13, joined_at: null }],
      people,
    });
    expect(ids.sort()).toEqual([10, 11]);
  });

  test('detail lists direct members; options and the profile line know the direct group', async () => {
    const w = world();
    const d = await w.groups.detail(6);
    expect(d.data?.direct.map((m) => [m.id, m.name, m.current])).toEqual([[11, 'Ravi', true]]);
    expect(d.data?.directReady).toBe(true);
    expect(d.data?.group.counsellors).toBe(1);
    const options = await w.teams.options();
    expect(options.directReady).toBe(true);
    expect(options.counsellors.find((c) => c.id === 11)).toMatchObject({ directGroupId: 6, directGroupName: 'South', teamId: null });
    expect(options.counsellors.find((c) => c.id === 10)).toMatchObject({ teamName: 'Phoenix', directGroupId: null });
    expect(options.counsellors.find((c) => c.id === 13)).toMatchObject({ disabled: true });
    expect(await w.teams.membershipOf(11)).toEqual({ team: null, group: { id: 6, code: 'GRP-006', name: 'South' }, direct: true });
    expect(await w.teams.membershipOf(10)).toMatchObject({ team: { name: 'Phoenix' }, group: { name: 'North' }, direct: false });
  });
});

describe('before the 2026-10-14 migration (P2021)', () => {
  test('everything works as before, with no direct members', async () => {
    const w = world({ directMissing: true });
    const list = await w.groups.list();
    expect(list.ready).toBe(true);
    expect(list.groups.find((g) => g.id === 6)).toMatchObject({ counsellors: 0, direct: 0 });
    const d = await w.groups.detail(6);
    expect(d.data).toMatchObject({ direct: [], directReady: false });
    expect((await w.teams.options()).directReady).toBe(false);
    expect(await w.teams.membershipOf(11)).toEqual({ team: null, group: null, direct: false });
    // Joining a team still works (nothing to release).
    expect((await w.teams.addMembers(1, 1, [12])).status).toBe(1);
    // Groups without counsellors can still be created, updated and deleted.
    expect((await w.groups.create(1, { name: 'East', manager_user_id: 1 }, [], [])).status).toBe(1);
    expect((await w.groups.update(1, 6, { name: 'South', manager_user_id: 1 }, { add: [], remove: [] })).status).toBe(1);
    // Removing needs the table.
    expect(await w.groups.update(1, 6, { name: 'South', manager_user_id: 1 }, { add: [], remove: [11] })).toEqual({ status: 0, message: DIRECT_NOT_SET_UP_MESSAGE });
    expect((await w.groups.remove(1, 6)).status).toBe(1);
  });

  test('adding direct members answers "not set up yet"', async () => {
    const w = world({ directMissing: true });
    expect(await w.groups.addCounsellors(1, 5, [12])).toEqual({ status: 0, message: DIRECT_NOT_SET_UP_MESSAGE });
    expect(await w.groups.create(1, { name: 'East', manager_user_id: 1 }, [], [12])).toEqual({ status: 0, message: DIRECT_NOT_SET_UP_MESSAGE });
    expect(await w.groups.removeCounsellor(5, 12)).toEqual({ status: 0, message: DIRECT_NOT_SET_UP_MESSAGE });
  });
});
