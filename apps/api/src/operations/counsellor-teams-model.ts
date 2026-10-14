import { istMonthKeys } from './staff-profile-service.js';

// Counsellor Management → Teams and Groups (Naji 2026-10-12). Pure rules and
// shaping, shared by counsellor-teams-service.ts and its tests.
//
// ORGANISATIONAL ONLY: nothing here decides what a counsellor can see.
// KPIs are REAL data, the same rules as the counsellor profile
// (staff-profile-service): an application belongs to the counsellor in
// applications.pipeline_user; "enrolled" is is_converted = 1; trend months are
// IST calendar months (applications by created_at, enrolments by
// converted_at, falling back to created_at).

export const COUNSELLOR_ROLE = 9;
/** Admin (1), Subadmin (8) and Counsellor (9) may lead a team or manage a group. */
export const LEAD_ROLES: readonly number[] = [1, 8, 9];
export const NAME_MAX = 120;
export const DESCRIPTION_MAX = 1000;
export const ORG_TREND_MONTHS = 12;
export const ORG_APPLICATION_LIMIT = 200;
export const MEMBER_BATCH_MAX = 200;

export const NOT_SET_UP_MESSAGE =
  'Teams and Groups are not set up yet: the database migration 2026-10-12-counsellor-teams-groups.sql has not been run.';

export type OrgStatus = 'active' | 'inactive';

export interface Outcome<T = undefined> {
  status: 0 | 1;
  message: string;
  data?: T;
}

export const fail = (message: string): Outcome<never> => ({ status: 0, message });

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const IST_OFFSET_MS = 330 * 60 * 1000;

function prismaCode(error: unknown): string {
  if (typeof error !== 'object' || error === null) return '';
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : '';
}

/** Prisma P2021: the table does not exist (the migration has not run yet). */
export function isMissingTable(error: unknown): boolean {
  return prismaCode(error) === 'P2021';
}

export const WRITE_CONFLICT_MESSAGE = 'Another change was saved at the same moment, please try again.';

/**
 * A deadlock / serialization failure / lock-wait timeout: Prisma P2034, or
 * MySQL 1213 (deadlock) / 1205 (lock wait timeout) surfacing another way.
 */
export function isWriteConflict(error: unknown): boolean {
  if (prismaCode(error) === 'P2034') return true;
  const metaCode = typeof error === 'object' && error !== null ? (error as { meta?: { code?: unknown } }).meta?.code : undefined;
  if (metaCode === '1213' || metaCode === '1205' || metaCode === 1213 || metaCode === 1205) return true;
  const text = error instanceof Error ? error.message : '';
  return /deadlock|lock wait timeout/i.test(text);
}

/** Prisma P2002: a unique index refused the row. */
export function isUniqueViolation(error: unknown): boolean {
  return prismaCode(error) === 'P2002';
}

/** P2002 raised by the live-name index (uq_counsellor_*_live_name), not by another unique key. */
export function isNameClash(error: unknown): boolean {
  if (!isUniqueViolation(error)) return false;
  const target = (error as { meta?: { target?: unknown } }).meta?.target;
  const text = Array.isArray(target) ? target.join(',') : typeof target === 'string' ? target : '';
  return text.includes('live_name');
}

export function orgCode(prefix: 'TEAM' | 'GRP', id: number): string {
  return `${prefix}-${String(id).padStart(3, '0')}`;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : '';
}

function positiveInt(value: unknown): number {
  const n = typeof value === 'number' ? value : Number.parseInt(text(value), 10);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

/** Distinct positive integer ids from a mixed array (strings or numbers). */
export function toIdList(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(positiveInt).filter((n) => n > 0))];
}

export interface TeamInput {
  name: string;
  description: string | null;
  groupId: number | null;
  leaderUserId: number;
  status: OrgStatus;
}

export interface GroupInput {
  name: string;
  description: string | null;
  managerUserId: number;
  status: OrgStatus;
}

function commonFields(raw: Record<string, unknown>, noun: 'Team' | 'Group'): { name: string; description: string | null; status: OrgStatus } | string {
  const name = text(raw.name).replace(/\s+/g, ' ');
  if (!name) return `${noun} name is required.`;
  if (name.length > NAME_MAX) return `${noun} name must be ${NAME_MAX} characters or fewer.`;
  const description = text(raw.description);
  if (description.length > DESCRIPTION_MAX) return `Description must be ${DESCRIPTION_MAX} characters or fewer.`;
  const rawStatus = text(raw.status).toLowerCase();
  if (rawStatus && rawStatus !== 'active' && rawStatus !== 'inactive') return 'Status must be Active or Inactive.';
  return { name, description: description || null, status: rawStatus === 'inactive' ? 'inactive' : 'active' };
}

export function parseTeamInput(raw: Record<string, unknown>): TeamInput | string {
  const common = commonFields(raw, 'Team');
  if (typeof common === 'string') return common;
  const leaderUserId = positiveInt(raw.leader_user_id);
  if (!leaderUserId) return 'Team leader is required.';
  const groupId = positiveInt(raw.group_id);
  return { ...common, leaderUserId, groupId: groupId || null };
}

export function parseGroupInput(raw: Record<string, unknown>): GroupInput | string {
  const common = commonFields(raw, 'Group');
  if (typeof common === 'string') return common;
  const managerUserId = positiveInt(raw.manager_user_id);
  if (!managerUserId) return 'Group manager is required.';
  return { ...common, managerUserId };
}

export interface PersonRow {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  role_id: number | null;
  deleted_at: Date | null;
  disabled_at?: Date | null;
}

/** A user that may lead / manage: live, login not disabled, and an admin, subadmin or counsellor. */
export function canLead(user: PersonRow | null | undefined): boolean {
  return !!user && user.deleted_at === null && !user.disabled_at && user.role_id !== null && LEAD_ROLES.includes(user.role_id);
}

/** A user that may be a team member: a live counsellor. */
export function isLiveCounsellor(user: PersonRow | null | undefined): boolean {
  return !!user && user.deleted_at === null && user.role_id === COUNSELLOR_ROLE;
}

export function personName(user: Pick<PersonRow, 'id' | 'name'> | null | undefined): string {
  if (!user) return '';
  return (user.name ?? '').trim() || `User #${user.id}`;
}

// ─── KPIs ───────────────────────────────────────────────────────────────

export interface AppCountRow { pipeline_user: number | null; stage?: string | null; is_converted: number | null; count: number }

export interface Kpis {
  applications: number;
  enrolled: number;
  pending: number;
  rejected: number;
  /** enrolled / applications, rounded percent. */
  conversion: number;
}

export const EMPTY_KPIS: Kpis = { applications: 0, enrolled: 0, pending: 0, rejected: 0, conversion: 0 };

export function conversionPct(enrolled: number, applications: number): number {
  return applications > 0 ? Math.round((enrolled / applications) * 100) : 0;
}

/** Grouped application counts → KPIs per counsellor (pipeline_user). */
export function kpisByCounsellor(rows: AppCountRow[]): Map<number, Kpis> {
  const out = new Map<number, Kpis>();
  for (const r of rows) {
    if (r.pipeline_user == null) continue;
    const cur = out.get(r.pipeline_user) ?? { ...EMPTY_KPIS };
    const enrolled = r.is_converted === 1;
    const rejected = !enrolled && r.stage === 'rejected';
    const next = {
      applications: cur.applications + r.count,
      enrolled: cur.enrolled + (enrolled ? r.count : 0),
      rejected: cur.rejected + (rejected ? r.count : 0),
      pending: cur.pending + (!enrolled && !rejected ? r.count : 0),
      conversion: 0,
    };
    out.set(r.pipeline_user, { ...next, conversion: conversionPct(next.enrolled, next.applications) });
  }
  return out;
}

/** Sums the KPIs of a set of counsellors. */
export function sumKpis(userIds: Iterable<number>, byUser: Map<number, Kpis>): Kpis {
  let applications = 0;
  let enrolled = 0;
  let pending = 0;
  let rejected = 0;
  for (const id of userIds) {
    const k = byUser.get(id);
    if (!k) continue;
    applications += k.applications;
    enrolled += k.enrolled;
    pending += k.pending;
    rejected += k.rejected;
  }
  return { applications, enrolled, pending, rejected, conversion: conversionPct(enrolled, applications) };
}

export interface TrendRow { is_converted: number | null; created_at: Date | null; converted_at: Date | null }
export interface TrendPoint { month: string; label: string; applications: number; enrollments: number }

function istMonth(value: Date | null): string {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return '';
  return new Date(value.getTime() + IST_OFFSET_MS).toISOString().slice(0, 7);
}

/** The last ORG_TREND_MONTHS IST months: applications created and enrolments converted. */
export function buildTrend(rows: TrendRow[], now: Date): TrendPoint[] {
  const keys = istMonthKeys(now, ORG_TREND_MONTHS);
  const index = new Map(keys.map((k, i) => [k, i]));
  const points = keys.map((month) => ({
    month,
    label: `${MONTH_LABELS[Number(month.slice(5, 7)) - 1] ?? ''} ${month.slice(2, 4)}`,
    applications: 0,
    enrollments: 0,
  }));
  for (const r of rows) {
    const created = index.get(istMonth(r.created_at));
    const point = created === undefined ? undefined : points[created];
    if (point) point.applications += 1;
    if (r.is_converted !== 1) continue;
    const enrolledAt = index.get(istMonth(r.converted_at ?? r.created_at));
    const ep = enrolledAt === undefined ? undefined : points[enrolledAt];
    if (ep) ep.enrollments += 1;
  }
  return points;
}

/** A stored instant as an ISO string, '' when unset. */
export function iso(value: Date | null | undefined): string {
  return value instanceof Date && !Number.isNaN(value.getTime()) ? value.toISOString() : '';
}

/** A stored instant as the IST calendar day (YYYY-MM-DD), '' when unset. */
export function istDay(value: Date | null | undefined): string {
  return value instanceof Date && !Number.isNaN(value.getTime())
    ? new Date(value.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10)
    : '';
}
