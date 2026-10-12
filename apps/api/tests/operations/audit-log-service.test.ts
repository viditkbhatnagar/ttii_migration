import { describe, expect, test, vi } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import {
  AuditLogService,
  FAILED_SIGN_IN_EVENTS,
  MAX_PAGE_SIZE,
  MAX_SKIP,
  applicationWhere,
  authEventCategory,
  authEventLabel,
  authWhere,
  istDayStart,
  UNRECOGNISED_IDENTIFIER,
  applicationAfter,
  authAfter,
  displayIdentifier,
  formatCursor,
  parseCursor,
  mergeNewestFirst,
  parseAuditLogQuery,
  redactSecrets,
  safeAuthDetails,
  type AuditLogQuery,
} from '../../src/operations/audit-log-service.js';
import { SIGN_IN_EVENTS } from '../../src/operations/people-admin-service.js';

// Administration → Audit Logs: read-only view over auth_audit_log + application_events.

// 2026-10-12 10:00 IST
const NOW = new Date('2026-10-12T04:30:00Z');

function query(patch: Partial<AuditLogQuery> = {}): AuditLogQuery {
  return { ...parseAuditLogQuery({}, NOW), ...patch };
}

describe('parseAuditLogQuery', () => {
  test('defaults to the last 30 IST days, every source, page 1 of 25', () => {
    const q = parseAuditLogQuery({}, NOW);
    expect(q).toMatchObject({ from: '2026-09-13', to: '2026-10-12', source: 'all', outcome: 'all', event: '', userId: null, search: '', take: 25, skip: 0 });
  });

  test('uses the IST day, not the UTC one, for "today"', () => {
    // 20:00 UTC on the 11th is already 01:30 IST on the 12th.
    expect(parseAuditLogQuery({}, new Date('2026-10-11T20:00:00Z')).to).toBe('2026-10-12');
  });

  test('swaps a reversed range, rejects impossible dates and caps the span at 366 days', () => {
    expect(parseAuditLogQuery({ from: '2026-10-10', to: '2026-10-01' }, NOW)).toMatchObject({ from: '2026-10-01', to: '2026-10-10' });
    expect(parseAuditLogQuery({ from: '2026-02-31', to: '2026-10-12' }, NOW).from).toBe('2026-09-13');
    expect(parseAuditLogQuery({ from: '2020-01-01', to: '2026-10-12' }, NOW).from).toBe('2025-10-12');
  });

  test('clamps paging and ignores unknown enum values', () => {
    const q = parseAuditLogQuery({ take: '5000', skip: '99999999', source: 'everything', outcome: 'maybe' }, NOW);
    expect(q.take).toBe(MAX_PAGE_SIZE);
    expect(q.skip).toBe(MAX_SKIP);
    expect(q.source).toBe('all');
    expect(q.outcome).toBe('all');
    expect(parseAuditLogQuery({ take: '0', skip: '-3' }, NOW)).toMatchObject({ take: 1, skip: 0 });
  });

  test('accepts a user id and a plain event code only', () => {
    expect(parseAuditLogQuery({ user: '42', event: 'LOGIN_FAILED' }, NOW)).toMatchObject({ userId: 42, event: 'LOGIN_FAILED' });
    expect(parseAuditLogQuery({ user: 'abc', event: "x' OR 1=1" }, NOW)).toMatchObject({ userId: null, event: '' });
  });
});

describe('istDayStart', () => {
  test('an IST day starts at 18:30 UTC the evening before', () => {
    expect(istDayStart('2026-10-12').toISOString()).toBe('2026-10-11T18:30:00.000Z');
  });
});

describe('masking', () => {
  test('a sign-in name is shown only when it is exactly a real account login', () => {
    const known = new Set(['ravi@x.in', '9876543210', 'admin']);
    expect(displayIdentifier('Ravi@X.in', known, null)).toBe('Ravi@X.in');
    expect(displayIdentifier('9876543210', known, null)).toBe('9876543210');
    expect(displayIdentifier('admin', known, 3)).toBe('admin');
    // Typed passwords / PINs that merely LOOK like an id, phone or email stay hidden.
    for (const typed of ['admin123', 'ttii2024', '4821', '98765432100', 'pass@word.in', 'TTS0058']) {
      expect(displayIdentifier(typed, known, null)).toBe(UNRECOGNISED_IDENTIFIER);
    }
    // OTP rows record the user's own id as the identifier.
    expect(displayIdentifier('42', known, 42)).toBe('42');
    expect(displayIdentifier('42', known, 7)).toBe(UNRECOGNISED_IDENTIFIER);
    expect(displayIdentifier('  ', known, null)).toBe('');
    expect(displayIdentifier(null, known, null)).toBe('');
  });

  test('redacts key=value secrets in free text', () => {
    expect(redactSecrets('/api/x?token=abc123&page=2')).toBe('/api/x?token=[redacted]&page=2');
    expect(redactSecrets('password=hunter2 done')).toBe('password=[redacted] done');
    expect(redactSecrets('Payment approved by finance')).toBe('Payment approved by finance');
  });

  test('details keep only allow-listed keys, strip query strings and name roles', () => {
    const details = safeAuthDetails(JSON.stringify({
      role_id: 8,
      path: '/admin/x?token=secret',
      required_roles: [1, 8],
      challenge_id: 77,
      token: 'abc',
      otp: '123456',
      session_expires_at: '2026-10-12T00:00:00Z',
    }));
    expect(details).toEqual([
      { label: 'Role', value: 'Admin' },
      { label: 'Path', value: '/admin/x' },
      { label: 'Required roles', value: 'Super Admin, Admin' },
    ]);
    expect(safeAuthDetails('not json')).toEqual([]);
    expect(safeAuthDetails('[1,2]')).toEqual([]);
  });
});

describe('labels and categories', () => {
  test('known events get a readable label, unknown ones are humanised', () => {
    expect(authEventLabel('LOGIN_FAILED')).toBe('Failed sign-in');
    expect(authEventLabel('SOMETHING_NEW')).toBe('Something new');
  });

  test('every sign-in event is a Sign-in; the rest fall into their family', () => {
    for (const e of SIGN_IN_EVENTS) expect(authEventCategory(e)).toBe('Sign-in');
    for (const e of FAILED_SIGN_IN_EVENTS.filter((x) => !x.startsWith('OTP_'))) expect(authEventCategory(e)).toBe('Sign-in');
    expect(authEventCategory('ROLE_SWITCH_SUCCESS')).toBe('Role switch');
    expect(authEventCategory('FORGOT_PWD_OTP_VERIFIED')).toBe('Password');
    expect(authEventCategory('OTP_ISSUED')).toBe('OTP');
    expect(authEventCategory('RBAC_DENIED')).toBe('Access');
  });
});

describe('mergeNewestFirst', () => {
  test('interleaves both tables newest first with a stable tie-break', () => {
    const t = (iso: string) => new Date(iso);
    const merged = mergeNewestFirst(
      [{ id: 1, created_at: t('2026-10-12T03:00:00Z') }, { id: 2, created_at: t('2026-10-12T01:00:00Z') }],
      [{ id: 9, created_at: t('2026-10-12T02:00:00Z') }, { id: 8, created_at: t('2026-10-12T03:00:00Z') }],
    );
    expect(merged).toEqual([
      { source: 'auth', id: 1 },
      { source: 'application', id: 8 },
      { source: 'application', id: 9 },
      { source: 'auth', id: 2 },
    ]);
  });
});

describe('keyset cursor', () => {
  test('round-trips and rejects junk', () => {
    const c = { at: new Date('2026-10-12T04:00:00Z'), source: 'application' as const, id: 21 };
    expect(parseCursor(formatCursor(c))).toEqual(c);
    expect(parseCursor('2026-10-12T04:00:00Z|auth|0')).toBeNull();
    expect(parseCursor('yesterday|auth|5')).toBeNull();
    expect(parseCursor(5)).toBeNull();
  });

  test('continues the merged order exactly: auth sorts before application on a tie', () => {
    const at = new Date('2026-10-12T04:00:00Z');
    expect(authAfter({ at, source: 'auth', id: 11 })).toEqual({ OR: [{ created_at: { lt: at } }, { created_at: at, id: { lt: 11 } }] });
    expect(authAfter({ at, source: 'application', id: 21 })).toEqual({ created_at: { lt: at } });
    expect(applicationAfter({ at, source: 'auth', id: 11 })).toEqual({ created_at: { lte: at } });
    expect(applicationAfter({ at, source: 'application', id: 21 })).toEqual({ OR: [{ created_at: { lt: at } }, { created_at: at, id: { lt: 21 } }] });
  });
});

describe('where builders', () => {
  test('a source excludes the other table; failures exclude application events', () => {
    expect(authWhere(query({ source: 'application' }), null)).toBeNull();
    expect(authWhere(query({ source: 'payment' }), null)).toBeNull();
    expect(applicationWhere(query({ source: 'auth' }), null, null)).toBeNull();
    expect(applicationWhere(query({ outcome: 'failure' }), null, null)).toBeNull();
  });

  test('auth filter carries the IST range, event, user, outcome and search', () => {
    const where = authWhere(
      query({ from: '2026-10-01', to: '2026-10-12', event: 'LOGIN_FAILED', userId: 5, outcome: 'failure', search: 'ravi' }),
      { ids: [5, 6], logins: ['ravi@x.in'] },
    );
    expect(where).toEqual({
      AND: [
        { created_at: { gte: new Date('2026-09-30T18:30:00Z'), lt: new Date('2026-10-12T18:30:00Z') } },
        { event: 'LOGIN_FAILED' },
        { user_id: 5 },
        { success: 0 },
        { OR: [
          { ip_address: { contains: 'ravi' } },
          { event: { contains: 'ravi' } },
          { user_id: { in: [5, 6] } },
          { identifier: { in: ['ravi@x.in'] } },
        ] },
      ],
    });
  });

  test('search never does a substring match on raw sign-in names (no probing for typed passwords)', () => {
    const where = authWhere(query({ search: 'admin123' }), { ids: [], logins: [] });
    expect(JSON.stringify(where)).not.toContain('"identifier":{"contains"');
    expect(JSON.stringify(where)).not.toContain('identifier');
  });

  test('payment source narrows application events to payment_* / instalment_*', () => {
    const where = applicationWhere(query({ source: 'payment', search: 'TTII26' }), [], [31]);
    expect(where?.AND).toContainEqual({ OR: [{ event_type: { startsWith: 'payment_' } }, { event_type: { startsWith: 'instalment_' } }] });
    expect(where?.AND).toContainEqual({ OR: [
      { description: { contains: 'TTII26' } },
      { event_type: { contains: 'TTII26' } },
      { application_id: { in: [31] } },
    ] });
  });
});

function fakePrisma() {
  const at = (iso: string) => new Date(iso);
  const authLight = [{ id: 11, created_at: at('2026-10-12T04:00:00Z') }, { id: 10, created_at: at('2026-10-12T02:00:00Z') }];
  const appLight = [{ id: 21, created_at: at('2026-10-12T03:00:00Z') }];
  const prisma = {
    auth_audit_log: {
      count: vi.fn().mockResolvedValue(2),
      findMany: vi.fn().mockImplementation((args: { select: Record<string, boolean> }) =>
        Promise.resolve(args.select.event
          ? [
              { id: 11, user_id: 5, event: 'LOGIN_FAILED', identifier: 'mypassword1', success: 0, ip_address: '10.0.0.1', user_agent: 'UA', details: JSON.stringify({ token: 'x', reason: 'bad' }), created_at: authLight[0]!.created_at },
              { id: 10, user_id: null, event: 'OTP_ISSUED', identifier: 'a@b.in', success: 1, ip_address: null, user_agent: null, details: null, created_at: authLight[1]!.created_at },
            ]
          : authLight),
      ),
      groupBy: vi.fn().mockResolvedValue([{ event: 'LOGIN_FAILED', _count: { id: 3 } }]),
    },
    application_events: {
      count: vi.fn().mockResolvedValue(1),
      findMany: vi.fn().mockImplementation((args: { select: Record<string, boolean> }) =>
        Promise.resolve(args.select.event_type
          ? [{ id: 21, application_id: 31, event_type: 'payment_approved', description: 'Approved ref token=abc', actor_user_id: 6, actor_role_id: 8, created_at: appLight[0]!.created_at }]
          : appLight),
      ),
      groupBy: vi.fn().mockResolvedValue([{ event_type: 'payment_approved', _count: { id: 1 } }]),
    },
    users: {
      findMany: vi.fn().mockImplementation((args: { select: Record<string, boolean> }) =>
        Promise.resolve(args.select.username
          // The page's known-login lookup: only a@b.in is a real account's login.
          ? [{ user_email: 'A@B.in', email: null, phone: null, username: null }]
          : [
              { id: 5, name: 'Ravi', role_id: 2, user_email: 'ravi@x.in', email: null },
              { id: 6, name: 'Majida', role_id: 8, user_email: null, email: '9876543210' },
            ]),
      ),
      findFirst: vi.fn().mockResolvedValue({ id: 5, name: 'Ravi' }),
    },
    applications: {
      findMany: vi.fn().mockResolvedValue([{ id: 31, application_id: 'TTII260031', name: 'Anu' }]),
    },
  };
  return prisma;
}

describe('AuditLogService.list', () => {
  test('merges both sources newest first, resolves actors in one batch and masks secrets', async () => {
    const prisma = fakePrisma();
    const out = await new AuditLogService(prisma as unknown as PrismaClient).list(query({ take: 2, skip: 1, userId: 5 }), NOW);

    expect(out.total).toBe(3);
    // Page 2 of size 2 over [auth 11, app 21, auth 10] → app 21, auth 10.
    expect(out.rows.map((r) => r.key)).toEqual(['app-21', 'auth-10']);
    // Each table is asked for skip + take light rows only.
    expect((prisma.auth_audit_log.findMany.mock.calls[0]![0] as { take: number }).take).toBe(3);

    const app = out.rows[0]!;
    expect(app).toMatchObject({
      source: 'application', category: 'Payment', success: true, userName: 'Majida', userRole: 'Admin', userEmail: '',
      applicationId: '31', applicationCode: 'TTII260031', applicantName: 'Anu', description: 'Approved ref token=[redacted]',
    });
    expect(out.rows[1]).toMatchObject({ source: 'auth', userId: null, userName: '', identifier: 'a@b.in', ipAddress: '' });
    // One batch for actors, one for the page's sign-in names.
    expect(prisma.users.findMany).toHaveBeenCalledTimes(2);
    const loginLookup = prisma.users.findMany.mock.calls.find((c) => (c[0] as { select: Record<string, boolean> }).select.username)?.[0] as { where: { OR: unknown[] } };
    expect(loginLookup.where.OR).toContainEqual({ user_email: { in: ['mypassword1', 'a@b.in'] } });
    expect(out.user).toEqual({ id: '5', name: 'Ravi' });
    expect(out.eventTypes.map((e) => e.value)).toEqual(['payment_approved', 'LOGIN_FAILED']);
  });

  test('never selects the applications password column', async () => {
    const prisma = fakePrisma();
    await new AuditLogService(prisma as unknown as PrismaClient).list(query(), NOW);
    for (const call of prisma.applications.findMany.mock.calls) {
      expect(Object.keys((call[0] as { select: Record<string, boolean> }).select)).not.toContain('password');
    }
  });

  test('a failed sign-in with an unrecognised sign-in name hides it entirely and keeps only safe details', async () => {
    const prisma = fakePrisma();
    const out = await new AuditLogService(prisma as unknown as PrismaClient).list(query({ take: 1 }), NOW);
    expect(out.rows[0]).toMatchObject({
      key: 'auth-11', success: false, userName: 'Ravi', userRole: 'Student', identifier: UNRECOGNISED_IDENTIFIER,
      ipAddress: '10.0.0.1', userAgent: 'UA', details: [{ label: 'Reason', value: 'bad' }],
    });
    expect(JSON.stringify(out)).not.toContain('mypassword1');
  });

  test('KPIs are real counts: sign-ins since IST midnight, failed sign-ins 24h, application + payment actions 7d', async () => {
    const prisma = fakePrisma();
    await new AuditLogService(prisma as unknown as PrismaClient).list(query(), NOW);
    const authCounts = prisma.auth_audit_log.count.mock.calls.map((c) => (c[0] as { where: unknown }).where);
    expect(authCounts).toContainEqual({ event: { in: [...SIGN_IN_EVENTS] }, success: 1, created_at: { gte: new Date('2026-10-11T18:30:00Z') } });
    expect(authCounts).toContainEqual({ event: { in: [...FAILED_SIGN_IN_EVENTS] }, success: 0, created_at: { gte: new Date('2026-10-11T04:30:00Z') } });
    const appCounts = prisma.application_events.count.mock.calls.map((c) => (c[0] as { where: unknown }).where);
    expect(appCounts).toContainEqual({ created_at: { gte: new Date('2026-10-05T04:30:00Z') } });
  });

  test('meta=0 (Export paging) skips the KPI counts and the event list', async () => {
    const prisma = fakePrisma();
    const q = parseAuditLogQuery({ meta: '0' }, NOW);
    expect(q.withMeta).toBe(false);
    const out = await new AuditLogService(prisma as unknown as PrismaClient).list(q, NOW);
    expect(out.kpis).toBeNull();
    expect(out.eventTypes).toEqual([]);
    expect(prisma.auth_audit_log.groupBy).not.toHaveBeenCalled();
    // Only the two list totals were counted.
    expect(prisma.auth_audit_log.count).toHaveBeenCalledTimes(1);
  });

  test('keyset paging: `after` reads take rows per table past the cursor and returns the next cursor', async () => {
    const prisma = fakePrisma();
    const q = parseAuditLogQuery({ after: '2026-10-12T05:00:00.000Z|auth|99', take: '2', skip: '40' }, NOW);
    expect(q.cursor).toEqual({ at: new Date('2026-10-12T05:00:00Z'), source: 'auth', id: 99 });
    const out = await new AuditLogService(prisma as unknown as PrismaClient).list(q, NOW);
    const authArgs = prisma.auth_audit_log.findMany.mock.calls[0]![0] as { take: number; where: { AND: unknown[] } };
    expect(authArgs.take).toBe(2);
    expect(authArgs.where.AND[1]).toEqual(authAfter(q.cursor!));
    // The total ignores the cursor.
    expect((prisma.auth_audit_log.count.mock.calls[0]![0] as { where: unknown }).where).toEqual(authWhere(q, null));
    expect(out.skip).toBe(0);
    expect(out.rows.map((r) => r.key)).toEqual(['auth-11', 'app-21']);
    expect(out.nextCursor).toBe('2026-10-12T03:00:00.000Z|application|21');
  });

  test('a sign-in-only query never touches application_events rows', async () => {
    const prisma = fakePrisma();
    const out = await new AuditLogService(prisma as unknown as PrismaClient).list(query({ source: 'auth' }), NOW);
    expect(out.rows.every((r) => r.source === 'auth')).toBe(true);
    expect(out.total).toBe(2);
  });
});
