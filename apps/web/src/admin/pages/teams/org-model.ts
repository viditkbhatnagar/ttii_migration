import { asNumber, asRecord, asString, toRecords } from '../../shared/utils/admin-data-utils.js';
import type { Tone } from '../../shared/components/ui-tones.js';

// Counsellor Management → Teams and Groups (Naji 2026-10-12). Pure
// normalisation of /admin/teams/* and /admin/groups/* plus list filtering,
// sorting, CSV rows and picker logic. Organisational only.

export type OrgStatus = 'active' | 'inactive';

export interface OrgKpis { applications: number; enrolled: number; pending: number; rejected: number; conversion: number }

export interface TeamRow {
  id: string;
  code: string;
  name: string;
  description: string;
  status: OrgStatus;
  groupId: string;
  groupName: string;
  leaderId: string;
  leaderName: string;
  members: number;
  kpis: OrgKpis;
  createdAt: string;
}

export interface GroupRow {
  id: string;
  code: string;
  name: string;
  description: string;
  status: OrgStatus;
  managerId: string;
  managerName: string;
  teams: number;
  /** Live counsellors under the group: team members plus direct members. */
  counsellors: number;
  /** Of which filed directly (not through a team). */
  direct: number;
  kpis: OrgKpis;
  createdAt: string;
}

export interface TeamList { ready: boolean; message: string; teams: TeamRow[]; totals: { teams: number; active: number; counsellors: number; inTeams: number; leaders: number } }
export interface GroupList { ready: boolean; message: string; groups: GroupRow[]; totals: { groups: number; active: number; teams: number; counsellors: number } }

export interface TrendPoint { month: string; label: string; applications: number; enrollments: number }

export interface OrgApplication {
  id: string;
  applicationId: string;
  name: string;
  phone: string;
  course: string;
  counsellorId: string;
  counsellor: string;
  stage: string;
  enrolled: boolean;
  created: string;
  converted: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  current: boolean;
  loginDisabled: boolean;
  joinedAt: string;
  kpis: OrgKpis;
}

export interface OrgActivity { id: string; type: string; title: string; detail: string; at: string }

export interface TeamDetail {
  team: TeamRow & { createdBy: string; updatedAt: string };
  members: TeamMember[];
  kpis: OrgKpis;
  trend: TrendPoint[];
  applications: OrgApplication[];
  activity: OrgActivity[];
}

export interface GroupTeam { id: string; code: string; name: string; status: OrgStatus; leaderName: string; members: number; kpis: OrgKpis }

export interface GroupDetail {
  group: GroupRow & { createdBy: string; updatedAt: string };
  teams: GroupTeam[];
  /** Counsellors filed directly under the group (not through a team). */
  direct: TeamMember[];
  /** Direct members can be added (the 2026-10-14 migration has run). */
  directReady: boolean;
  kpis: OrgKpis;
  trend: TrendPoint[];
  applications: OrgApplication[];
}

export interface OrgOptions {
  ready: boolean;
  message: string;
  /** Direct group members can be added (the 2026-10-14 migration has run). */
  directReady: boolean;
  counsellors: Array<{
    id: string; name: string; email: string; disabled: boolean; teamId: string; teamName: string;
    /** The group this counsellor is filed under DIRECTLY ('' when none). */
    directGroupId: string; directGroupName: string;
  }>;
  leaders: Array<{ id: string; name: string; roleId: number }>;
  groups: Array<{ id: string; code: string; name: string; status: OrgStatus }>;
  teams: Array<{ id: string; code: string; name: string; groupId: string; groupName: string; members: number; status: OrgStatus }>;
}

export interface Membership {
  team: { id: string; code: string; name: string } | null;
  group: { id: string; code: string; name: string } | null;
  /** The group is a direct membership, not through the team. */
  direct: boolean;
}

const id = (v: unknown): string => {
  const s = asString(v);
  return s === '0' ? '' : s;
};
const status = (v: unknown): OrgStatus => (asString(v) === 'inactive' ? 'inactive' : 'active');

export function toKpis(raw: unknown): OrgKpis {
  const k = asRecord(raw) ?? {};
  return {
    applications: asNumber(k.applications),
    enrolled: asNumber(k.enrolled),
    pending: asNumber(k.pending),
    rejected: asNumber(k.rejected),
    conversion: asNumber(k.conversion),
  };
}

export function toTeamRow(r: Record<string, unknown>): TeamRow {
  return {
    id: id(r.id),
    code: asString(r.code),
    name: asString(r.name),
    description: asString(r.description),
    status: status(r.status),
    groupId: id(r.groupId),
    groupName: asString(r.groupName),
    leaderId: id(r.leaderId),
    leaderName: asString(r.leaderName),
    members: asNumber(r.members),
    kpis: toKpis(r.kpis),
    createdAt: asString(r.createdAt),
  };
}

export function toGroupRow(r: Record<string, unknown>): GroupRow {
  return {
    id: id(r.id),
    code: asString(r.code),
    name: asString(r.name),
    description: asString(r.description),
    status: status(r.status),
    managerId: id(r.managerId),
    managerName: asString(r.managerName),
    teams: asNumber(r.teams),
    counsellors: asNumber(r.counsellors),
    direct: asNumber(r.direct),
    kpis: toKpis(r.kpis),
    createdAt: asString(r.createdAt),
  };
}

const readyOf = (r: Record<string, unknown>) => ({ ready: r.ready !== false, message: r.ready === false ? asString(r.message) : '' });

export function toTeamList(raw: unknown): TeamList {
  const r = asRecord(raw) ?? {};
  const t = asRecord(r.totals) ?? {};
  return {
    ...readyOf(r),
    teams: toRecords(r.teams).map(toTeamRow),
    totals: { teams: asNumber(t.teams), active: asNumber(t.active), counsellors: asNumber(t.counsellors), inTeams: asNumber(t.inTeams), leaders: asNumber(t.leaders) },
  };
}

export function toGroupList(raw: unknown): GroupList {
  const r = asRecord(raw) ?? {};
  const t = asRecord(r.totals) ?? {};
  return {
    ...readyOf(r),
    groups: toRecords(r.groups).map(toGroupRow),
    totals: { groups: asNumber(t.groups), active: asNumber(t.active), teams: asNumber(t.teams), counsellors: asNumber(t.counsellors) },
  };
}

function toTrend(raw: unknown): TrendPoint[] {
  return toRecords(raw).map((t) => ({ month: asString(t.month), label: asString(t.label), applications: asNumber(t.applications), enrollments: asNumber(t.enrollments) }));
}

function toApplications(raw: unknown): OrgApplication[] {
  return toRecords(raw).map((a) => ({
    id: asString(a.id),
    applicationId: asString(a.applicationId),
    name: asString(a.name),
    phone: asString(a.phone),
    course: asString(a.course),
    counsellorId: asString(a.counsellorId),
    counsellor: asString(a.counsellor),
    stage: asString(a.stage) || 'lead',
    enrolled: a.enrolled === true,
    created: asString(a.created),
    converted: asString(a.converted),
  }));
}

function toMember(m: Record<string, unknown>): TeamMember {
  return {
    id: asString(m.id),
    name: asString(m.name),
    email: asString(m.email),
    phone: asString(m.phone),
    current: m.current !== false,
    loginDisabled: m.loginDisabled === true,
    joinedAt: asString(m.joinedAt),
    kpis: toKpis(m.kpis),
  };
}

export function toTeamDetail(raw: unknown): TeamDetail {
  const r = asRecord(raw) ?? {};
  const t = asRecord(r.team) ?? {};
  return {
    team: { ...toTeamRow(t), createdBy: asString(t.createdBy), updatedAt: asString(t.updatedAt) },
    members: toRecords(r.members).map(toMember),
    kpis: toKpis(r.kpis),
    trend: toTrend(r.trend),
    applications: toApplications(r.applications),
    activity: toRecords(r.activity).map((a) => ({ id: asString(a.id), type: asString(a.type), title: asString(a.title), detail: asString(a.detail), at: asString(a.at) })),
  };
}

export function toGroupDetail(raw: unknown): GroupDetail {
  const r = asRecord(raw) ?? {};
  const g = asRecord(r.group) ?? {};
  return {
    group: { ...toGroupRow(g), createdBy: asString(g.createdBy), updatedAt: asString(g.updatedAt) },
    teams: toRecords(r.teams).map((t) => ({
      id: asString(t.id), code: asString(t.code), name: asString(t.name), status: status(t.status),
      leaderName: asString(t.leaderName), members: asNumber(t.members), kpis: toKpis(t.kpis),
    })),
    direct: toRecords(r.direct).map(toMember),
    directReady: r.directReady === true,
    kpis: toKpis(r.kpis),
    trend: toTrend(r.trend),
    applications: toApplications(r.applications),
  };
}

export function toOrgOptions(raw: unknown): OrgOptions {
  const r = asRecord(raw) ?? {};
  return {
    ...readyOf(r),
    directReady: r.directReady === true,
    counsellors: toRecords(r.counsellors).map((c) => ({
      id: id(c.id), name: asString(c.name), email: asString(c.email), disabled: c.disabled === true,
      teamId: id(c.teamId), teamName: asString(c.teamName), directGroupId: id(c.directGroupId), directGroupName: asString(c.directGroupName),
    })),
    leaders: toRecords(r.leaders).map((l) => ({ id: id(l.id), name: asString(l.name), roleId: asNumber(l.roleId) })),
    groups: toRecords(r.groups).map((g) => ({ id: id(g.id), code: asString(g.code), name: asString(g.name), status: status(g.status) })),
    teams: toRecords(r.teams).map((t) => ({
      id: id(t.id), code: asString(t.code), name: asString(t.name), groupId: id(t.groupId), groupName: asString(t.groupName),
      members: asNumber(t.members), status: status(t.status),
    })),
  };
}

export function toMembership(raw: unknown): Membership {
  const r = asRecord(raw) ?? {};
  const pick = (v: unknown) => {
    const x = asRecord(v);
    return x ? { id: id(x.id), code: asString(x.code), name: asString(x.name) } : null;
  };
  return { team: pick(r.team), group: pick(r.group), direct: r.direct === true };
}

// ─── Display ────────────────────────────────────────────────────────────

export const STATUS_LABEL: Record<OrgStatus, string> = { active: 'Active', inactive: 'Inactive' };
export const STATUS_TONE: Record<OrgStatus, Tone> = { active: 'emerald', inactive: 'rose' };

export function roleLabel(roleId: number): string {
  if (roleId === 9) return 'Counsellor';
  if (roleId === 8) return 'Subadmin';
  if (roleId === 1) return 'Admin';
  return '';
}

/** A short bar label: the first word (people) or the whole name, capped at 14 characters. */
export function chartLabel(name: string, firstWord: boolean): string {
  const label = firstWord ? (name.trim().split(/\s+/)[0] ?? name) : name.trim();
  return label.length > 14 ? `${label.slice(0, 13)}…` : label;
}

/** Highest enrolled first, then most applications, then name. */
export function rankByEnrolled<T extends { name: string; kpis: OrgKpis }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => b.kpis.enrolled - a.kpis.enrolled || b.kpis.applications - a.kpis.applications || a.name.localeCompare(b.name));
}

/** Top and lowest performers (no overlap when there are fewer than 2 * n). */
export function topAndLowest<T extends { name: string; kpis: OrgKpis }>(rows: T[], n = 3): { top: T[]; lowest: T[] } {
  const ranked = rankByEnrolled(rows);
  const top = ranked.slice(0, n);
  const lowest = ranked.slice(Math.max(n, ranked.length - n)).reverse();
  return { top, lowest };
}

// ─── Lists ──────────────────────────────────────────────────────────────

export interface OrgFilters { search: string; status: '' | OrgStatus; /** group id (teams) or manager id (groups) */ owner: string }
export const EMPTY_ORG_FILTERS: OrgFilters = { search: '', status: '', owner: '' };

export type TeamSortKey = 'code' | 'name' | 'leader' | 'group' | 'members' | 'applications' | 'enrolled' | 'status';
export type GroupSortKey = 'code' | 'name' | 'manager' | 'teams' | 'counsellors' | 'applications' | 'enrolled' | 'status';

const has = (q: string, ...values: string[]) => values.some((v) => v.toLowerCase().includes(q));

export function filterTeams(rows: TeamRow[], f: OrgFilters): TeamRow[] {
  const q = f.search.trim().toLowerCase();
  return rows.filter((r) => {
    if (f.status && r.status !== f.status) return false;
    if (f.owner === 'none' ? r.groupId !== '' : f.owner && r.groupId !== f.owner) return false;
    return !q || has(q, r.name, r.code, r.leaderName, r.groupName);
  });
}

export function filterGroups(rows: GroupRow[], f: OrgFilters): GroupRow[] {
  const q = f.search.trim().toLowerCase();
  return rows.filter((r) => {
    if (f.status && r.status !== f.status) return false;
    if (f.owner && r.managerId !== f.owner) return false;
    return !q || has(q, r.name, r.code, r.managerName);
  });
}

const cmp = (a: string | number, b: string | number) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), undefined, { numeric: true }));

export function sortTeams(rows: TeamRow[], key: TeamSortKey, dir: 'asc' | 'desc'): TeamRow[] {
  const value = (r: TeamRow): string | number => {
    switch (key) {
      case 'code': return Number(r.id) || 0;
      case 'name': return r.name.toLowerCase();
      case 'leader': return r.leaderName.toLowerCase();
      case 'group': return r.groupName.toLowerCase();
      case 'members': return r.members;
      case 'applications': return r.kpis.applications;
      case 'enrolled': return r.kpis.enrolled;
      case 'status': return r.status;
    }
  };
  const sign = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => sign * cmp(value(a), value(b)) || cmp(Number(a.id) || 0, Number(b.id) || 0));
}

export function sortGroups(rows: GroupRow[], key: GroupSortKey, dir: 'asc' | 'desc'): GroupRow[] {
  const value = (r: GroupRow): string | number => {
    switch (key) {
      case 'code': return Number(r.id) || 0;
      case 'name': return r.name.toLowerCase();
      case 'manager': return r.managerName.toLowerCase();
      case 'teams': return r.teams;
      case 'counsellors': return r.counsellors;
      case 'applications': return r.kpis.applications;
      case 'enrolled': return r.kpis.enrolled;
      case 'status': return r.status;
    }
  };
  const sign = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => sign * cmp(value(a), value(b)) || cmp(Number(a.id) || 0, Number(b.id) || 0));
}

export function teamCsvRows(rows: TeamRow[]): Array<Array<string | number>> {
  return [
    ['Team ID', 'Team Name', 'Team Leader', 'Group', 'Counsellors', 'Applications', 'Enrolled', 'Conversion %', 'Status'],
    ...rows.map((r) => [r.code, r.name, r.leaderName, r.groupName, r.members, r.kpis.applications, r.kpis.enrolled, r.kpis.conversion, STATUS_LABEL[r.status]]),
  ];
}

export function groupCsvRows(rows: GroupRow[]): Array<Array<string | number>> {
  return [
    ['Group ID', 'Group Name', 'Manager', 'Teams', 'Counsellors', 'Of Which Direct', 'Applications', 'Enrolled', 'Conversion %', 'Status'],
    ...rows.map((r) => [r.code, r.name, r.managerName, r.teams, r.counsellors, r.direct, r.kpis.applications, r.kpis.enrolled, r.kpis.conversion, STATUS_LABEL[r.status]]),
  ];
}

/** Distinct options from rows, sorted by label. */
export function ownerOptions<T>(rows: T[], pick: (r: T) => { value: string; label: string }): Array<{ value: string; label: string }> {
  const seen = new Map<string, string>();
  for (const r of rows) {
    const o = pick(r);
    if (o.value && !seen.has(o.value)) seen.set(o.value, o.label || o.value);
  }
  return [...seen].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
}

// ─── Forms and pickers ──────────────────────────────────────────────────

export const ORG_NAME_MAX = 120;
export const ORG_DESCRIPTION_MAX = 1000;

export interface OrgFormErrors { name?: string; owner?: string; description?: string }

/** Client-side mirror of the server rules (the server re-checks everything). */
export function validateOrgForm(noun: 'Team' | 'Group', name: string, ownerId: string, description: string): OrgFormErrors {
  const errors: OrgFormErrors = {};
  const n = name.trim();
  if (!n) errors.name = `${noun} name is required.`;
  else if (n.length > ORG_NAME_MAX) errors.name = `${noun} name must be ${ORG_NAME_MAX} characters or fewer.`;
  if (!ownerId) errors.owner = noun === 'Team' ? 'Team leader is required.' : 'Group manager is required.';
  if (description.trim().length > ORG_DESCRIPTION_MAX) errors.description = `Description must be ${ORG_DESCRIPTION_MAX} characters or fewer.`;
  return errors;
}

export interface PickerItem {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  disabled: boolean;
  /** A longer explanation under the row (why it is locked, what saving will do). */
  note?: string;
}

/**
 * Counsellors for a team's member picker. A counsellor is in at most one
 * team: anyone already in ANOTHER team is shown but cannot be ticked (remove
 * them there first); members of THIS team are left out.
 */
export function counsellorPickerItems(options: OrgOptions, teamId: string): PickerItem[] {
  return options.counsellors
    .filter((c) => !teamId || c.teamId !== teamId)
    .map((c) => ({
      id: c.id,
      title: c.name,
      subtitle: c.email || `#${c.id}`,
      badge: c.teamId ? `In ${c.teamName || 'another team'}` : c.directGroupId ? `Direct: ${c.directGroupName || 'a group'}` : 'No team',
      disabled: c.teamId !== '',
      ...(!c.teamId && c.directGroupId
        ? { note: `Direct member of ${c.directGroupName || 'a group'}; joining a team moves them under the team's group.` }
        : {}),
    }));
}

/**
 * Counsellors for a group's "Assign Counsellors" picker (Naji 2026-10-14). A
 * counsellor belongs to at most one group, through their team or directly:
 *   - in a team: shown, locked (the team decides their group);
 *   - direct member of ANOTHER group: selectable, moves here on save;
 *   - direct member of THIS group: selectable (pre-ticked when editing);
 *   - login disabled: left out, unless already a direct member here.
 */
export function groupCounsellorPickerItems(options: OrgOptions, groupId: string): PickerItem[] {
  return options.counsellors
    .filter((c) => !c.disabled || (groupId !== '' && c.directGroupId === groupId))
    .map((c) => {
      const base = { id: c.id, title: c.name, subtitle: c.email || `#${c.id}` };
      if (c.teamId) {
        const team = c.teamName || 'another team';
        return { ...base, badge: `In ${team}`, disabled: true, note: `In team ${team}; added through the team.` };
      }
      if (groupId !== '' && c.directGroupId === groupId) {
        return { ...base, badge: c.disabled ? 'This group · login disabled' : 'This group', disabled: false };
      }
      if (c.directGroupId) {
        const group = c.directGroupName || 'another group';
        return { ...base, badge: `In ${group}`, disabled: false, note: `Currently in ${group}; will move here.` };
      }
      return { ...base, badge: 'No team', disabled: false };
    });
}

/**
 * The direct-counsellor part of a Create / Edit Group request. Create sends
 * the ticked list; Edit sends ONLY the diff against what the dialog loaded
 * (add_counsellor_ids / remove_counsellor_ids, omitted when empty), never a
 * full list — a full list would release counsellors added elsewhere meanwhile.
 */
export function directMemberPayload(isEdit: boolean, loaded: string[], selected: Set<string>): Record<string, string[]> {
  if (!isEdit) return { counsellor_ids: [...selected] };
  const add = [...selected].filter((idValue) => !loaded.includes(idValue));
  const remove = loaded.filter((idValue) => !selected.has(idValue));
  return {
    ...(add.length > 0 ? { add_counsellor_ids: add } : {}),
    ...(remove.length > 0 ? { remove_counsellor_ids: remove } : {}),
  };
}

/** The group's current direct members, from the picker options. */
export function directMemberIds(options: OrgOptions, groupId: string): string[] {
  return groupId ? options.counsellors.filter((c) => c.directGroupId === groupId).map((c) => c.id) : [];
}

/** Teams for a group's picker: teams of THIS group are left out; others move here. */
export function teamPickerItems(options: OrgOptions, groupId: string): PickerItem[] {
  return options.teams
    .filter((t) => !groupId || t.groupId !== groupId)
    .map((t) => ({
      id: t.id,
      title: t.name,
      subtitle: `${t.code} · ${t.members} counsellor${t.members === 1 ? '' : 's'}`,
      badge: t.groupId ? `Moves from ${t.groupName || 'another group'}` : 'No group',
      disabled: false,
    }));
}

export function filterPicker(items: PickerItem[], search: string): PickerItem[] {
  const q = search.trim().toLowerCase();
  return q ? items.filter((i) => has(q, i.title, i.subtitle, i.badge, i.note ?? '')) : items;
}
