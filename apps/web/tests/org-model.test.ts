import { describe, expect, test } from 'vitest';

import {
  EMPTY_ORG_FILTERS, chartLabel, counsellorPickerItems, directMemberIds, directMemberPayload, groupCounsellorPickerItems, toGroupDetail, filterGroups, filterPicker, filterTeams, groupCsvRows, ownerOptions, sortTeams,
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
    expect(toMembership({ team: { id: 2, code: 'TEAM-002', name: 'Falcon' }, group: null })).toEqual({ team: { id: '2', code: 'TEAM-002', name: 'Falcon' }, group: null, direct: false });
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

  test('chart labels', () => {
    expect(chartLabel(' Asha  Menon ', true)).toBe('Asha');
    expect(chartLabel('Team Phoenix Rising', false)).toBe('Team Phoenix …');
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

describe('direct group counsellors (Naji 2026-10-14)', () => {
  const options = toOrgOptions({
    ready: true,
    directReady: true,
    counsellors: [
      { id: 10, name: 'Asha', teamId: 1, teamName: 'Phoenix' },
      { id: 11, name: 'Ravi', directGroupId: 6, directGroupName: 'South' },
      { id: 12, name: 'Mira' },
      { id: 13, name: 'Off', disabled: true },
      { id: 14, name: 'Lena', disabled: true, directGroupId: 5, directGroupName: 'North' },
      { id: 15, name: 'Kai', directGroupId: 5, directGroupName: 'North' },
    ],
  });

  test('group picker: team members locked, other-group members move, disabled left out', () => {
    const items = groupCounsellorPickerItems(options, '5');
    expect(items.map((i) => [i.id, i.disabled, i.badge, i.note ?? ''])).toEqual([
      ['10', true, 'In Phoenix', 'In team Phoenix; added through the team.'],
      ['11', false, 'In South', 'Currently in South; will move here.'],
      ['12', false, 'No team', ''],
      ['14', false, 'This group · login disabled', ''],
      ['15', false, 'This group', ''],
    ]);
    // Creating a group: no "this group", disabled counsellors left out.
    expect(groupCounsellorPickerItems(options, '').map((i) => i.id)).toEqual(['10', '11', '12', '15']);
    expect(directMemberIds(options, '5')).toEqual(['14', '15']);
    expect(directMemberIds(options, '')).toEqual([]);
  });

  test('edit sends only the diff against what was loaded; create sends the list', () => {
    expect(directMemberPayload(false, [], new Set(['11', '12']))).toEqual({ counsellor_ids: ['11', '12'] });
    expect(directMemberPayload(true, ['11', '15'], new Set(['11', '15']))).toEqual({});
    expect(directMemberPayload(true, ['11', '15'], new Set(['15', '12']))).toEqual({ add_counsellor_ids: ['12'], remove_counsellor_ids: ['11'] });
  });

  test('team picker warns that joining a team moves a direct member', () => {
    const item = counsellorPickerItems(options, '1').find((i) => i.id === '11');
    expect(item).toMatchObject({ badge: 'Direct: South', disabled: false, note: "Direct member of South; joining a team moves them under the team's group." });
  });

  test('group detail, list row and membership carry the direct members', () => {
    const d = toGroupDetail({ group: { id: 6, counsellors: 3, direct: 1 }, directReady: true, direct: [{ id: 11, name: 'Ravi', kpis: { applications: 2 } }] });
    expect(d.group).toMatchObject({ counsellors: 3, direct: 1 });
    expect(d.directReady).toBe(true);
    expect(d.direct[0]).toMatchObject({ id: '11', name: 'Ravi', current: true, kpis: { applications: 2 } });
    expect(toGroupDetail({}).directReady).toBe(false);
    expect(toMembership({ team: null, group: { id: 6, code: 'GRP-006', name: 'South' }, direct: true }).direct).toBe(true);
    expect(groupCsvRows(toGroupList({ groups: [{ id: 6, code: 'GRP-006', name: 'South', counsellors: 3, direct: 1 }] }).groups)[1]?.slice(0, 6))
      .toEqual(['GRP-006', 'South', '', 0, 3, 1]);
  });
});
