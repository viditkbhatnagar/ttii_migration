import { describe, expect, test } from 'vitest';

import {
  EMPTY_ORG_FILTERS, counsellorPickerItems, filterGroups, filterPicker, filterTeams, groupCsvRows, ownerOptions, sortTeams,
  teamCsvRows, teamPickerItems, toGroupList, toMembership, toOrgOptions, toTeamDetail, toTeamList, topAndLowest, validateOrgForm,
  type TeamRow,
} from '../src/admin/pages/teams/org-model';

// Counsellor Management → Teams and Groups (Naji 2026-10-12): pure list,
// detail and picker logic.

const kpis = (applications: number, enrolled: number) => ({ applications, enrolled, pending: applications - enrolled, rejected: 0, conversion: applications ? Math.round((enrolled / applications) * 100) : 0 });

function team(over: Partial<TeamRow>): TeamRow {
  return {
    id: '1', code: 'TEAM-001', name: 'Phoenix', description: '', status: 'active', groupId: '', groupName: '',
    leaderId: '3', leaderName: 'Leena', members: 2, kpis: kpis(10, 4), createdAt: '', ...over,
  };
}

describe('normalisation', () => {
  test('team list: ids as strings, empty group as "", not-ready message kept', () => {
    const list = toTeamList({
      ready: true,
      teams: [{ id: 7, code: 'TEAM-007', name: 'Falcon', status: 'inactive', groupId: null, leaderId: 3, leaderName: 'Leena', members: 3, kpis: { applications: 5, enrolled: 2, conversion: 40 } }],
      totals: { teams: 1, active: 0, counsellors: 12, inTeams: 3, leaders: 1 },
    });
    expect(list.ready).toBe(true);
    expect(list.teams[0]).toMatchObject({ id: '7', groupId: '', leaderId: '3', status: 'inactive', kpis: { applications: 5, enrolled: 2, conversion: 40, pending: 0 } });
    expect(list.totals.inTeams).toBe(3);
    expect(toTeamList({ ready: false, message: 'Not set up', teams: [] })).toMatchObject({ ready: false, message: 'Not set up', teams: [] });
    expect(toGroupList(null)).toMatchObject({ ready: true, groups: [] });
  });

  test('team detail and membership', () => {
    const d = toTeamDetail({
      team: { id: 2, name: 'Falcon', createdBy: 'Admin' },
      members: [{ id: 10, name: 'Asha', current: false, loginDisabled: true, kpis: { applications: 1 } }],
      applications: [{ id: 5, enrolled: true, stage: '' }],
    });
    expect(d.team).toMatchObject({ id: '2', createdBy: 'Admin', status: 'active' });
    expect(d.members[0]).toMatchObject({ id: '10', current: false, loginDisabled: true });
    expect(d.applications[0]).toMatchObject({ id: '5', enrolled: true, stage: 'lead' });
    expect(toMembership({ team: { id: 2, code: 'TEAM-002', name: 'Falcon' }, group: null })).toEqual({ team: { id: '2', code: 'TEAM-002', name: 'Falcon' }, group: null });
  });
});

describe('lists', () => {
  const rows = [
    team({ id: '1', name: 'Phoenix', groupId: '5', groupName: 'North', kpis: kpis(10, 4) }),
    team({ id: '2', name: 'Falcon', code: 'TEAM-002', status: 'inactive', leaderName: 'Ravi', kpis: kpis(3, 3) }),
    team({ id: '10', name: 'Eagle', code: 'TEAM-010', groupId: '6', groupName: 'South', kpis: kpis(0, 0) }),
  ];

  test('filters by search (name / code / leader / group), status and group ("none" = no group)', () => {
    expect(filterTeams(rows, { ...EMPTY_ORG_FILTERS, search: 'ravi' }).map((r) => r.id)).toEqual(['2']);
    expect(filterTeams(rows, { ...EMPTY_ORG_FILTERS, search: 'team-010' }).map((r) => r.id)).toEqual(['10']);
    expect(filterTeams(rows, { ...EMPTY_ORG_FILTERS, status: 'inactive' }).map((r) => r.id)).toEqual(['2']);
    expect(filterTeams(rows, { ...EMPTY_ORG_FILTERS, owner: 'none' }).map((r) => r.id)).toEqual(['2']);
    expect(filterTeams(rows, { ...EMPTY_ORG_FILTERS, owner: '6' }).map((r) => r.id)).toEqual(['10']);
  });

  test('sorts by code numerically and by KPI', () => {
    expect(sortTeams(rows, 'code', 'asc').map((r) => r.id)).toEqual(['1', '2', '10']);
    expect(sortTeams(rows, 'enrolled', 'desc').map((r) => r.id)).toEqual(['1', '2', '10']);
    expect(sortTeams(rows, 'applications', 'asc').map((r) => r.id)).toEqual(['10', '2', '1']);
  });

  test('csv rows and owner options', () => {
    expect(teamCsvRows([rows[0]!])).toEqual([
      ['Team ID', 'Team Name', 'Team Leader', 'Group', 'Counsellors', 'Applications', 'Enrolled', 'Conversion %', 'Status'],
      ['TEAM-001', 'Phoenix', 'Leena', 'North', 2, 10, 4, 40, 'Active'],
    ]);
    expect(groupCsvRows([])).toHaveLength(1);
    expect(ownerOptions(rows, (r) => ({ value: r.groupId, label: r.groupName }))).toEqual([{ value: '5', label: 'North' }, { value: '6', label: 'South' }]);
  });

  test('groups filter by manager', () => {
    const groups = toGroupList({ groups: [{ id: 1, name: 'North', managerId: 3, managerName: 'Leena' }, { id: 2, name: 'South', managerId: 4 }] }).groups;
    expect(filterGroups(groups, { ...EMPTY_ORG_FILTERS, owner: '4' }).map((g) => g.id)).toEqual(['2']);
    expect(filterGroups(groups, { ...EMPTY_ORG_FILTERS, search: 'leena' }).map((g) => g.id)).toEqual(['1']);
  });

  test('top and lowest performers do not overlap on a small team', () => {
    const r = topAndLowest(rows);
    expect(r.top.map((x) => x.id)).toEqual(['1', '2', '10']);
    expect(r.lowest).toEqual([]);
    const many = topAndLowest([...rows, team({ id: '4', name: 'Kite', kpis: kpis(1, 0) }), team({ id: '5', name: 'Owl', kpis: kpis(9, 9) })]);
    expect(many.top.map((x) => x.id)).toEqual(['5', '1', '2']);
    expect(many.lowest.map((x) => x.id)).toEqual(['10', '4']);
  });
});

describe('forms and pickers', () => {
  test('validation mirrors the server', () => {
    expect(validateOrgForm('Team', ' ', '', '')).toEqual({ name: 'Team name is required.', owner: 'Team leader is required.' });
    expect(validateOrgForm('Group', 'North', '', 'x'.repeat(1001))).toEqual({ owner: 'Group manager is required.', description: 'Description must be 1000 characters or fewer.' });
    expect(validateOrgForm('Team', 'Phoenix', '3', '')).toEqual({});
  });

  const options = toOrgOptions({
    ready: true,
    counsellors: [
      { id: 10, name: 'Asha', email: 'a@x.in', teamId: 1, teamName: 'Phoenix' },
      { id: 11, name: 'Ravi', email: '', teamId: null, teamName: '' },
      { id: 12, name: 'Mira', email: 'm@x.in', teamId: 2, teamName: 'Falcon' },
    ],
    teams: [
      { id: 1, code: 'TEAM-001', name: 'Phoenix', groupId: 5, groupName: 'North', members: 1 },
      { id: 2, code: 'TEAM-002', name: 'Falcon', groupId: null, members: 1 },
    ],
  });

  test('member picker: own members hidden, other teams locked', () => {
    const items = counsellorPickerItems(options, '1');
    expect(items.map((i) => [i.id, i.disabled, i.badge])).toEqual([['11', false, 'No team'], ['12', true, 'In Falcon']]);
    expect(counsellorPickerItems(options, '').filter((i) => !i.disabled).map((i) => i.id)).toEqual(['11']);
    expect(filterPicker(items, 'falcon').map((i) => i.id)).toEqual(['12']);
  });

  test('team picker: own teams hidden, teams of other groups say they move', () => {
    expect(teamPickerItems(options, '5').map((i) => [i.id, i.badge])).toEqual([['2', 'No group']]);
    expect(teamPickerItems(options, '9').map((i) => i.badge)).toEqual(['Moves from North', 'No group']);
  });
});
