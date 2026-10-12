import type { Prisma, PrismaClient } from '@prisma/client';

import { getPrismaClient } from '../data/prisma-client.js';
import { SIGN_IN_EVENTS, displayEmail } from './people-admin-service.js';

// Administration → Audit Logs in Naji's design (TTII 2026-10-12). READ-ONLY.
// Only two things are recorded today, so only two sources are read:
//   - auth_audit_log:      sign-ins, failed logins, OTP, SSO, role switches,
//                          password resets, access denials (auth-service).
//   - application_events:  application / payment / stage actions on a lead
//                          (OperationsService.recordEvent — the Lead History).
// Nothing else in the LMS writes an audit row (no before/after diffs, no
// edits on other modules), so the page says so instead of inventing them.
// Sensitive values never leave here: no password / token / OTP material
// (detail keys are allow-listed, query strings stripped, `key=value` secrets
// redacted, a sign-in name shown only when it is a real account's login, and
// search never probes raw sign-in names). IP and user agent are returned
// as recorded — the route is Admin / Super Admin only.

export const IST_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 86_400_000;
export const DEFAULT_RANGE_DAYS = 30;
export const MAX_RANGE_DAYS = 366;
export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;
/** Deepest offset served: paging merges two tables, so it reads skip+take ids from each. */
export const MAX_SKIP = 10_000;
const SEARCH_MAX_LENGTH = 100;
const SEARCH_MATCH_CAP = 200;

export type AuditSource = 'all' | 'auth' | 'application' | 'payment';
export type AuditOutcome = 'all' | 'success' | 'failure';
export type AuditCategory = 'Sign-in' | 'OTP' | 'Password' | 'Role switch' | 'Access' | 'Registration' | 'Security' | 'Application' | 'Payment';

/** Failed sign-in attempts of every kind (password, SSO, OTP); each is written with success = 0. */
export const FAILED_SIGN_IN_EVENTS = [
  'LOGIN_FAILED',
  'LOGIN_BLOCKED_DISABLED',
  'LOGIN_BLOCKED_INACTIVE',
  'LOGIN_RATE_LIMITED',
  'SSO_LOGIN_NO_ACCOUNT',
  'SSO_LOGIN_BLOCKED_INACTIVE',
  'OTP_VERIFY_FAILED',
  'OTP_VERIFY_RATE_LIMITED',
] as const;

/** application_events types that are about money (payment_*, instalment_*). */
export const PAYMENT_EVENT_PREFIXES = ['payment_', 'instalment_'] as const;

const ROLE_LABELS: Record<number, string> = {
  1: 'Super Admin', 2: 'Student', 3: 'Instructor', 4: 'Centre', 7: 'Centre', 8: 'Admin', 9: 'Counsellor', 10: 'Associate',
};

const AUTH_EVENT_LABELS: Record<string, string> = {
  LOGIN_SUCCESS: 'Signed in (password)',
  LOGIN_FAILED: 'Failed sign-in',
  LOGIN_BLOCKED_DISABLED: 'Sign-in blocked: account disabled',
  LOGIN_BLOCKED_INACTIVE: 'Sign-in blocked: account inactive',
  LOGIN_RATE_LIMITED: 'Sign-in rate limited',
  LOGOUT: 'Signed out',
  SSO_LOGIN_SUCCESS: 'Signed in (Google / Microsoft)',
  SSO_LOGIN_NO_ACCOUNT: 'SSO sign-in: no account',
  SSO_LOGIN_BLOCKED_INACTIVE: 'SSO sign-in blocked: account inactive',
  OTP_ISSUED: 'OTP sent',
  OTP_DELIVERY_FAILED: 'OTP delivery failed',
  OTP_REQUEST_FAILED: 'OTP request failed',
  OTP_REQUEST_RATE_LIMITED: 'OTP requests rate limited',
  OTP_VERIFY_SUCCESS: 'Signed in (OTP)',
  OTP_VERIFY_FAILED: 'OTP verification failed',
  OTP_VERIFY_RATE_LIMITED: 'OTP verification rate limited',
  ROLE_SWITCH_SUCCESS: 'Switched role',
  ROLE_SWITCH_FORBIDDEN: 'Role switch refused',
  ROLE_SWITCH_EMAIL_MISMATCH: 'Role switch refused: email mismatch',
  PASSWORD_RESET_REQUESTED: 'Password reset requested',
  PASSWORD_RESET_RATE_LIMITED: 'Password resets rate limited',
  PASSWORD_RESET_DELIVERY_FAILED: 'Password reset email failed',
  PASSWORD_RESET_COMPLETED: 'Password reset completed',
  FORGOT_PWD_OTP_REQUESTED: 'Forgot-password OTP sent',
  FORGOT_PWD_OTP_REQUESTED_NOT_FOUND: 'Forgot-password OTP: no account',
  FORGOT_PWD_OTP_DELIVERY_FAILED: 'Forgot-password OTP delivery failed',
  FORGOT_PWD_OTP_VERIFIED: 'Forgot-password OTP verified',
  FORGOT_PWD_OTP_VERIFY_FAILED: 'Forgot-password OTP failed',
  REGISTER_SUCCESS: 'Registered',
  RBAC_DENIED: 'Access denied: role not allowed',
  AUTH_DENIED: 'Access denied: not signed in',
};

/** auth_audit_log.details keys that are safe to show, with their labels. Everything else is dropped. */
const DETAIL_LABELS: Record<string, string> = {
  role_id: 'Role',
  to_role_id: 'Switched to role',
  provider: 'Provider',
  purpose: 'OTP purpose',
  reason: 'Reason',
  path: 'Path',
  required_roles: 'Required roles',
  retry_after_seconds: 'Retry after (seconds)',
  from_user_id: 'From user ID',
  to_user_id: 'To user ID',
  target_user_id: 'Target user ID',
  student_id: 'Student ID',
};
const ROLE_DETAIL_KEYS = new Set(['role_id', 'to_role_id']);

export interface AuditLogQuery {
  /** Inclusive IST calendar days, YYYY-MM-DD. */
  from: string;
  to: string;
  source: AuditSource;
  event: string;
  userId: number | null;
  outcome: AuditOutcome;
  search: string;
  take: number;
  skip: number;
  /** Keyset paging (`after`): rows strictly older than this one in merged order. Overrides skip. */
  cursor: AuditCursor | null;
  /** false (`meta=0`) skips the KPI counts and event list — Export pages through with it. */
  withMeta: boolean;
}

/** A position in the merged newest-first stream: (created_at, source, id). */
export interface AuditCursor {
  at: Date;
  source: 'auth' | 'application';
  id: number;
}

/** What the sign-in box held when it is not a real account's login (it may be a typed password). */
export const UNRECOGNISED_IDENTIFIER = 'Unrecognised sign-in name';

/** Search matches: users by name / email / phone, and the exact login strings of those users. */
export interface UserMatches {
  ids: number[];
  logins: string[];
}

export interface AuditDetail {
  label: string;
  value: string;
}

export interface AuditLogRow {
  key: string;
  source: 'auth' | 'application';
  at: string | null;
  event: string;
  action: string;
  category: AuditCategory;
  success: boolean;
  userId: string | null;
  userName: string;
  userRole: string;
  userEmail: string;
  identifier: string;
  ipAddress: string;
  userAgent: string;
  description: string;
  details: AuditDetail[];
  applicationId: string | null;
  applicationCode: string;
  applicantName: string;
}

export interface AuditEventOption {
  value: string;
  label: string;
  source: 'auth' | 'application';
  count: number;
}

export interface AuditLogPage {
  rows: AuditLogRow[];
  total: number;
  take: number;
  skip: number;
  range: { from: string; to: string };
  /** null when the request asked for rows only (meta=0). */
  kpis: { signInsToday: number; failedSignIns24h: number; applicationActions7d: number; paymentActions7d: number } | null;
  eventTypes: AuditEventOption[];
  user: { id: string; name: string } | null;
  /** Pass back as `after` for the next page; null when this page is the last. */
  nextCursor: string | null;
}

// ── Pure helpers (exported for tests) ────────────────────────────────────

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Today's IST calendar day. */
export function istToday(now: Date): string {
  return new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

function validYmd(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const m = YMD.exec(v.trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const ms = Date.UTC(y, mo - 1, d);
  const back = new Date(ms);
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) return null;
  return v.trim();
}

/** The instant an IST calendar day starts. */
export function istDayStart(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d) - IST_OFFSET_MS);
}

function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d) + days * DAY_MS).toISOString().slice(0, 10);
}

function intIn(v: unknown, fallback: number, min: number, max: number): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : Number.NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

/** Validates the raw query string. Defaults: the last 30 IST days, every source, 25 per page. */
export function parseAuditLogQuery(raw: Record<string, unknown>, now: Date = new Date()): AuditLogQuery {
  const today = istToday(now);
  let to = validYmd(raw.to) ?? today;
  let from = validYmd(raw.from) ?? addDays(to, -(DEFAULT_RANGE_DAYS - 1));
  if (from > to) [from, to] = [to, from];
  const earliest = addDays(to, -(MAX_RANGE_DAYS - 1));
  if (from < earliest) from = earliest;

  const event = typeof raw.event === 'string' ? raw.event.trim() : '';
  const userRaw = intIn(raw.user, 0, 0, Number.MAX_SAFE_INTEGER);
  return {
    from,
    to,
    source: oneOf(raw.source, ['all', 'auth', 'application', 'payment'] as const, 'all'),
    event: /^[A-Za-z0-9_.-]{1,100}$/.test(event) ? event : '',
    userId: userRaw > 0 ? userRaw : null,
    outcome: oneOf(raw.outcome, ['all', 'success', 'failure'] as const, 'all'),
    search: typeof raw.q === 'string' ? raw.q.trim().slice(0, SEARCH_MAX_LENGTH) : '',
    take: intIn(raw.take, DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE),
    skip: intIn(raw.skip, 0, 0, MAX_SKIP),
    cursor: parseCursor(raw.after),
    withMeta: raw.meta !== '0',
  };
}

/** "2026-10-12T04:00:00.000Z|auth|11" → a cursor; anything else → null. */
export function parseCursor(raw: unknown): AuditCursor | null {
  if (typeof raw !== 'string') return null;
  const m = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z)\|(auth|application)\|(\d{1,10})$/.exec(raw.trim());
  if (!m) return null;
  const at = new Date(m[1]!);
  const id = Number(m[3]);
  if (Number.isNaN(at.getTime()) || !Number.isInteger(id) || id <= 0) return null;
  return { at, source: m[2] as AuditCursor['source'], id };
}

export function formatCursor(c: AuditCursor): string {
  return `${c.at.toISOString()}|${c.source}|${c.id}`;
}

/** `token=…`, `password=…` and friends inside free text become `token=[redacted]`. */
export function redactSecrets(text: string): string {
  return text.replace(/\b(token|access_token|refresh_token|password|passwd|pwd|secret|otp|signature|key)=([^&\s]+)/gi, '$1=[redacted]');
}

/** Login strings compare case-insensitively (emails are stored and typed in mixed case). */
export function loginKey(v: string | null | undefined): string {
  return (v ?? '').trim().toLowerCase();
}

/**
 * What the person typed as their sign-in name, shown in full ONLY when it is
 * exactly a real account's login (email, user_email, phone or username, from
 * `knownLogins`) or the row's own user id (OTP rows record the id). Anything
 * else may be a password typed into the wrong box, so none of it is shown.
 */
export function displayIdentifier(raw: string | null | undefined, knownLogins: ReadonlySet<string>, userId: number | null): string {
  const v = (raw ?? '').trim();
  if (!v) return '';
  if (userId !== null && v === String(userId)) return v;
  return knownLogins.has(loginKey(v)) ? v : UNRECOGNISED_IDENTIFIER;
}

function roleLabel(id: unknown): string {
  const n = typeof id === 'number' ? id : Number(id);
  return Number.isInteger(n) ? ROLE_LABELS[n] ?? `Role ${n}` : '';
}

function detailValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  if (ROLE_DETAIL_KEYS.has(key)) return roleLabel(value);
  if (key === 'required_roles' && Array.isArray(value)) return value.map(roleLabel).filter(Boolean).join(', ');
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') return '';
  const text = String(value);
  return redactSecrets(key === 'path' ? text.split('?')[0] ?? '' : text);
}

/** auth_audit_log.details (JSON text) → only the allow-listed keys, labelled. Bad JSON → none. */
export function safeAuthDetails(details: string | null | undefined): AuditDetail[] {
  if (!details) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(details);
  } catch {
    return [];
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return [];
  const out: AuditDetail[] = [];
  for (const [key, label] of Object.entries(DETAIL_LABELS)) {
    const value = detailValue(key, (parsed as Record<string, unknown>)[key]);
    if (value) out.push({ label, value });
  }
  return out;
}

function humanise(code: string): string {
  const words = code.replace(/[_.-]+/g, ' ').trim().toLowerCase();
  return words ? words[0]!.toUpperCase() + words.slice(1) : '';
}

export function authEventLabel(event: string): string {
  return AUTH_EVENT_LABELS[event] ?? humanise(event);
}

export function applicationEventLabel(eventType: string): string {
  return humanise(eventType);
}

export function isPaymentEvent(eventType: string): boolean {
  return PAYMENT_EVENT_PREFIXES.some((p) => eventType.startsWith(p));
}

export function authEventCategory(event: string): AuditCategory {
  if ((SIGN_IN_EVENTS as readonly string[]).includes(event)) return 'Sign-in';
  if (event.startsWith('ROLE_SWITCH')) return 'Role switch';
  if (event.includes('PASSWORD') || event.startsWith('FORGOT_PWD')) return 'Password';
  if (event.startsWith('OTP_')) return 'OTP';
  if (event.startsWith('LOGIN') || event.startsWith('SSO_') || event === 'LOGOUT') return 'Sign-in';
  if (event === 'RBAC_DENIED' || event === 'AUTH_DENIED') return 'Access';
  if (event.startsWith('REGISTER')) return 'Registration';
  return 'Security';
}

/** Newest first across both tables; ties broken by source then id so paging is stable. */
export function mergeNewestFirst(
  auth: Array<{ id: number; created_at: Date | null }>,
  app: Array<{ id: number; created_at: Date | null }>,
): Array<{ source: 'auth' | 'application'; id: number }> {
  const ms = (d: Date | null) => (d instanceof Date ? d.getTime() : 0);
  return [
    ...auth.map((r) => ({ source: 'auth' as const, id: r.id, t: ms(r.created_at) })),
    ...app.map((r) => ({ source: 'application' as const, id: r.id, t: ms(r.created_at) })),
  ]
    .sort((a, b) => b.t - a.t || (a.source === b.source ? b.id - a.id : a.source === 'auth' ? -1 : 1))
    .map(({ source, id }) => ({ source, id }));
}

const paymentWhere = (): Prisma.application_eventsWhereInput => ({
  OR: PAYMENT_EVENT_PREFIXES.map((p) => ({ event_type: { startsWith: p } })),
});

/**
 * The auth_audit_log filter for a query, or null when the query's source
 * excludes that table. Search never looks inside the raw sign-in name (it can
 * hold a typed password): it matches IP, event code, matched users' ids and
 * the EXACT logins (email / phone / username) of matched real users.
 */
export function authWhere(q: AuditLogQuery, matched: UserMatches | null): Prisma.auth_audit_logWhereInput | null {
  if (q.source === 'application' || q.source === 'payment') return null;
  const and: Prisma.auth_audit_logWhereInput[] = [
    { created_at: { gte: istDayStart(q.from), lt: istDayStart(addDays(q.to, 1)) } },
  ];
  if (q.event) and.push({ event: q.event });
  if (q.userId !== null) and.push({ user_id: q.userId });
  if (q.outcome !== 'all') and.push({ success: q.outcome === 'success' ? 1 : 0 });
  if (q.search) {
    const or: Prisma.auth_audit_logWhereInput[] = [
      { ip_address: { contains: q.search } },
      { event: { contains: q.search } },
    ];
    if (matched && matched.ids.length > 0) or.push({ user_id: { in: matched.ids } });
    if (matched && matched.logins.length > 0) or.push({ identifier: { in: matched.logins } });
    and.push({ OR: or });
  }
  return { AND: and };
}

/** auth rows strictly after the cursor in merged order (auth sorts before application on a tie). */
export function authAfter(c: AuditCursor): Prisma.auth_audit_logWhereInput {
  if (c.source === 'application') return { created_at: { lt: c.at } };
  return { OR: [{ created_at: { lt: c.at } }, { created_at: c.at, id: { lt: c.id } }] };
}

/** application rows strictly after the cursor in merged order. */
export function applicationAfter(c: AuditCursor): Prisma.application_eventsWhereInput {
  if (c.source === 'auth') return { created_at: { lte: c.at } };
  return { OR: [{ created_at: { lt: c.at } }, { created_at: c.at, id: { lt: c.id } }] };
}

/** The application_events filter, or null when the query excludes that table (sign-in source, failures only). */
export function applicationWhere(
  q: AuditLogQuery,
  matchedUserIds: number[] | null,
  matchedApplicationIds: number[] | null,
): Prisma.application_eventsWhereInput | null {
  // Lead History rows are actions that happened; nothing there is a failure.
  if (q.source === 'auth' || q.outcome === 'failure') return null;
  const and: Prisma.application_eventsWhereInput[] = [
    { created_at: { gte: istDayStart(q.from), lt: istDayStart(addDays(q.to, 1)) } },
  ];
  if (q.source === 'payment') and.push(paymentWhere());
  if (q.event) and.push({ event_type: q.event });
  if (q.userId !== null) and.push({ actor_user_id: q.userId });
  if (q.search) {
    const or: Prisma.application_eventsWhereInput[] = [
      { description: { contains: q.search } },
      { event_type: { contains: q.search } },
    ];
    if (matchedUserIds && matchedUserIds.length > 0) or.push({ actor_user_id: { in: matchedUserIds } });
    if (matchedApplicationIds && matchedApplicationIds.length > 0) or.push({ application_id: { in: matchedApplicationIds } });
    and.push({ OR: or });
  }
  return { AND: and };
}

const ID_ORDER = [{ created_at: 'desc' as const }, { id: 'desc' as const }];

// ── Service ──────────────────────────────────────────────────────────────

export class AuditLogService {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async list(q: AuditLogQuery, now: Date = new Date()): Promise<AuditLogPage> {
    const [matchedUsers, matchedApplicationIds] = q.search
      ? await Promise.all([this.matchUsers(q.search), this.matchApplications(q.search)])
      : [null, null];
    const aWhere = authWhere(q, matchedUsers);
    const eWhere = applicationWhere(q, matchedUsers?.ids ?? null, matchedApplicationIds);
    // Keyset (cursor) pages read `take` rows per table; offset pages read skip + take.
    const offset = q.cursor ? 0 : q.skip;
    const window = offset + q.take;
    const aPage = aWhere && q.cursor ? { AND: [aWhere, authAfter(q.cursor)] } : aWhere;
    const ePage = eWhere && q.cursor ? { AND: [eWhere, applicationAfter(q.cursor)] } : eWhere;

    const [authTotal, appTotal, authIds, appIds, kpis, eventTypes, user] = await Promise.all([
      aWhere ? this.prisma.auth_audit_log.count({ where: aWhere }) : 0,
      eWhere ? this.prisma.application_events.count({ where: eWhere }) : 0,
      aPage ? this.prisma.auth_audit_log.findMany({ where: aPage, select: { id: true, created_at: true }, orderBy: ID_ORDER, take: window }) : [],
      ePage ? this.prisma.application_events.findMany({ where: ePage, select: { id: true, created_at: true }, orderBy: ID_ORDER, take: window }) : [],
      q.withMeta ? this.kpis(now) : null,
      q.withMeta ? this.eventTypes() : [],
      q.userId !== null ? this.prisma.users.findFirst({ where: { id: q.userId }, select: { id: true, name: true } }) : null,
    ]);

    const merged = mergeNewestFirst(authIds, appIds);
    const page = merged.slice(offset, offset + q.take);
    const rows = await this.hydrate(page);
    const last = page[page.length - 1];
    const lastAt = last ? (last.source === 'auth' ? authIds : appIds).find((r) => r.id === last.id)?.created_at ?? null : null;
    const hasMore = merged.length > offset + q.take || authIds.length === window || appIds.length === window;
    return {
      rows,
      total: authTotal + appTotal,
      take: q.take,
      skip: offset,
      range: { from: q.from, to: q.to },
      kpis,
      eventTypes,
      user: user ? { id: String(user.id), name: (user.name ?? '').trim() || `User ${user.id}` } : null,
      nextCursor: last && lastAt instanceof Date && hasMore ? formatCursor({ at: lastAt, source: last.source, id: last.id }) : null,
    };
  }

  /** Users whose name / email / phone contains the text, with their exact login strings. */
  private async matchUsers(search: string): Promise<UserMatches> {
    const rows = await this.prisma.users.findMany({
      where: {
        OR: [
          { name: { contains: search } },
          { user_email: { contains: search } },
          { email: { contains: search } },
          { phone: { contains: search } },
        ],
      },
      select: { id: true, user_email: true, email: true, phone: true },
      take: SEARCH_MATCH_CAP,
    });
    const logins = new Set<string>();
    for (const r of rows) {
      for (const v of [r.user_email, r.email, r.phone]) {
        const t = (v ?? '').trim();
        if (t) logins.add(t);
      }
    }
    return { ids: rows.map((r) => r.id), logins: Array.from(logins) };
  }

  /** The page's sign-in names that are exactly some account's login (one batch query). */
  private async knownLogins(identifiers: string[]): Promise<Set<string>> {
    const values = Array.from(new Set(identifiers.map((v) => v.trim()).filter(Boolean)));
    if (values.length === 0) return new Set();
    const users = await this.prisma.users.findMany({
      where: {
        OR: [
          { user_email: { in: values } },
          { email: { in: values } },
          { phone: { in: values } },
          { username: { in: values } },
        ],
      },
      select: { user_email: true, email: true, phone: true, username: true },
    });
    const known = new Set<string>();
    for (const u of users) {
      for (const v of [u.user_email, u.email, u.phone, u.username]) {
        const k = loginKey(v);
        if (k) known.add(k);
      }
    }
    return known;
  }

  private async matchApplications(search: string): Promise<number[]> {
    const rows = await this.prisma.applications.findMany({
      where: { OR: [{ application_id: { contains: search } }, { name: { contains: search } }] },
      select: { id: true },
      take: SEARCH_MATCH_CAP,
    });
    return rows.map((r) => r.id);
  }

  private async kpis(now: Date): Promise<AuditLogPage['kpis']> {
    const todayStart = istDayStart(istToday(now));
    const dayAgo = new Date(now.getTime() - DAY_MS);
    const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
    const [signInsToday, failedSignIns24h, applicationActions7d, paymentActions7d] = await Promise.all([
      this.prisma.auth_audit_log.count({ where: { event: { in: [...SIGN_IN_EVENTS] }, success: 1, created_at: { gte: todayStart } } }),
      this.prisma.auth_audit_log.count({ where: { event: { in: [...FAILED_SIGN_IN_EVENTS] }, success: 0, created_at: { gte: dayAgo } } }),
      this.prisma.application_events.count({ where: { created_at: { gte: weekAgo } } }),
      this.prisma.application_events.count({ where: { AND: [{ created_at: { gte: weekAgo } }, paymentWhere()] } }),
    ]);
    return { signInsToday, failedSignIns24h, applicationActions7d, paymentActions7d };
  }

  /** Every event type ever recorded, for the Event filter. */
  private async eventTypes(): Promise<AuditEventOption[]> {
    const [auth, app] = await Promise.all([
      this.prisma.auth_audit_log.groupBy({ by: ['event'], _count: { id: true } }),
      this.prisma.application_events.groupBy({ by: ['event_type'], _count: { id: true } }),
    ]);
    const options: AuditEventOption[] = [
      ...auth.map((r) => ({ value: r.event, label: authEventLabel(r.event), source: 'auth' as const, count: r._count.id })),
      ...app.map((r) => ({ value: r.event_type, label: applicationEventLabel(r.event_type), source: 'application' as const, count: r._count.id })),
    ];
    return options.filter((o) => o.value).sort((a, b) => a.source.localeCompare(b.source) || a.label.localeCompare(b.label));
  }

  private async hydrate(page: Array<{ source: 'auth' | 'application'; id: number }>): Promise<AuditLogRow[]> {
    const authIds = page.filter((p) => p.source === 'auth').map((p) => p.id);
    const appIds = page.filter((p) => p.source === 'application').map((p) => p.id);
    const [authRows, appRows] = await Promise.all([
      authIds.length > 0
        ? this.prisma.auth_audit_log.findMany({
            where: { id: { in: authIds } },
            select: { id: true, user_id: true, event: true, identifier: true, success: true, ip_address: true, user_agent: true, details: true, created_at: true },
          })
        : [],
      appIds.length > 0
        ? this.prisma.application_events.findMany({
            where: { id: { in: appIds } },
            select: { id: true, application_id: true, event_type: true, description: true, actor_user_id: true, actor_role_id: true, created_at: true },
          })
        : [],
    ]);

    const userIds = new Set<number>();
    authRows.forEach((r) => { if (r.user_id !== null) userIds.add(r.user_id); });
    appRows.forEach((r) => { if (r.actor_user_id !== null) userIds.add(r.actor_user_id); });
    const applicationIds = Array.from(new Set(appRows.map((r) => r.application_id)));
    const [users, applications, known] = await Promise.all([
      userIds.size > 0
        ? this.prisma.users.findMany({ where: { id: { in: Array.from(userIds) } }, select: { id: true, name: true, role_id: true, user_email: true, email: true } })
        : [],
      applicationIds.length > 0
        ? this.prisma.applications.findMany({ where: { id: { in: applicationIds } }, select: { id: true, application_id: true, name: true } })
        : [],
      this.knownLogins(authRows.map((r) => r.identifier ?? '')),
    ]);
    const userById = new Map(users.map((u) => [u.id, u]));
    const appById = new Map(applications.map((a) => [a.id, a]));
    const authById = new Map(authRows.map((r) => [r.id, r]));
    const eventById = new Map(appRows.map((r) => [r.id, r]));

    const actor = (id: number | null, fallbackRole: number | null) => {
      const u = id !== null ? userById.get(id) : undefined;
      return {
        userId: id !== null ? String(id) : null,
        userName: u ? (u.name ?? '').trim() || `User ${u.id}` : id !== null ? `User ${id}` : '',
        userRole: roleLabel(u?.role_id ?? fallbackRole),
        userEmail: u ? displayEmail(u.user_email, u.email) : '',
      };
    };
    const iso = (d: Date | null) => (d instanceof Date && !Number.isNaN(d.getTime()) ? d.toISOString() : null);

    const out: AuditLogRow[] = [];
    for (const p of page) {
      if (p.source === 'auth') {
        const r = authById.get(p.id);
        if (!r) continue;
        out.push({
          key: `auth-${r.id}`,
          source: 'auth',
          at: iso(r.created_at),
          event: r.event,
          action: authEventLabel(r.event),
          category: authEventCategory(r.event),
          success: r.success === 1,
          ...actor(r.user_id, null),
          identifier: displayIdentifier(r.identifier, known, r.user_id),
          ipAddress: r.ip_address ?? '',
          userAgent: r.user_agent ?? '',
          description: '',
          details: safeAuthDetails(r.details),
          applicationId: null,
          applicationCode: '',
          applicantName: '',
        });
      } else {
        const r = eventById.get(p.id);
        if (!r) continue;
        const app = appById.get(r.application_id);
        out.push({
          key: `app-${r.id}`,
          source: 'application',
          at: iso(r.created_at),
          event: r.event_type,
          action: applicationEventLabel(r.event_type),
          category: isPaymentEvent(r.event_type) ? 'Payment' : 'Application',
          success: true,
          ...actor(r.actor_user_id, r.actor_role_id),
          identifier: '',
          ipAddress: '',
          userAgent: '',
          description: redactSecrets(r.description ?? ''),
          details: [],
          applicationId: String(r.application_id),
          applicationCode: (app?.application_id ?? '').trim(),
          applicantName: (app?.name ?? '').trim(),
        });
      }
    }
    return out;
  }
}
