import { describe, expect, it, vi } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import { TeamsMeetingError, TeamsMeetingService } from '../../src/integrations/teams-meeting-service.js';
import {
  createTeamsMeetingOnFirstWorkingHost,
  isAppLevelTeamsFailure,
  isHostLevelTeamsFailure,
  pickAvailableTeamsHost,
} from '../../src/integrations/teams-scheduling.js';
import type { TeamsHostCandidate } from '../../src/integrations/teams-scheduling.js';
import { OperationsService } from '../../src/operations/operations-service.js';

/**
 * Production pool as of 2026-08-10 (teams_meeting_hosts). id 1 (info@) was
 * already deactivated by hand after a Graph 404; naji@ is the only account that
 * ever created a meeting, the three faculty.* rows are placeholders that were
 * never provable.
 */
function prodHosts() {
  return [
    { id: 2, teams_email: 'naji@teachersindia.in', display_name: 'Naji', policy_verified_at: new Date('2026-08-10T06:00:00Z') },
    { id: 3, teams_email: 'faculty.a@teachersindia.in', display_name: null, policy_verified_at: null },
    { id: 4, teams_email: 'faculty.b@teachersindia.in', display_name: null, policy_verified_at: null },
    { id: 5, teams_email: 'faculty.c@teachersindia.in', display_name: null, policy_verified_at: null },
  ];
}

const slot = { date: '2026-08-12', fromTime: '14:30', toTime: '15:30' };

/**
 * Prisma stub. `busy` lists host emails that already have an overlapping
 * live_class; `updates` captures every teams_meeting_hosts.updateMany so tests
 * can assert on last_error / policy_verified_at / quarantine writes.
 */
function makePrisma(hosts: Array<Record<string, unknown>>, busy: string[] = []) {
  const updates: Array<{ email: unknown; data: Record<string, unknown> }> = [];
  const prisma = {
    teams_meeting_hosts: {
      findMany: () => Promise.resolve(hosts),
      updateMany: (args: { where: { teams_email?: unknown }; data: Record<string, unknown> }) => {
        updates.push({ email: args.where.teams_email, data: args.data });
        return Promise.resolve({ count: 1 });
      },
    },
    live_class: {
      findFirst: (args: { where: { host_email?: unknown } }) =>
        Promise.resolve(busy.includes(String(args.where.host_email)) ? { id: 1 } : null),
    },
  } as unknown as PrismaClient;
  return { prisma, updates };
}

function candidate(email: string, id: number, proven = false): TeamsHostCandidate {
  return {
    id,
    teamsEmail: email,
    displayName: null,
    policyVerifiedAt: proven ? new Date('2026-08-10T06:00:00Z') : null,
  };
}

function meetingFor(hostEmail: string) {
  return { meetingId: `meeting-${hostEmail}`, joinUrl: `https://teams/${hostEmail}`, joinWebUrl: null };
}

describe('pickAvailableTeamsHost ordering', () => {
  it('returns every free host, proven accounts ahead of unproven ones', async () => {
    const { prisma } = makePrisma(prodHosts());

    const result = await pickAvailableTeamsHost(prisma, [slot]);

    expect(result.reason).toBeUndefined();
    expect(result.candidates.map((c) => c.teamsEmail)).toEqual([
      'naji@teachersindia.in',
      'faculty.a@teachersindia.in',
      'faculty.b@teachersindia.in',
      'faculty.c@teachersindia.in',
    ]);
  });

  it('keeps id ASC inside each group, so a proven host added later still beats an unproven id 1', async () => {
    // Regression guard: the fix must not become "newest verified wins" — within
    // the proven set the historical first-active-id pick has to be preserved.
    const { prisma } = makePrisma([
      { id: 1, teams_email: 'placeholder@teachersindia.in', display_name: null, policy_verified_at: null },
      { id: 7, teams_email: 'later@teachersindia.in', display_name: null, policy_verified_at: new Date('2026-08-09T00:00:00Z') },
      { id: 2, teams_email: 'naji@teachersindia.in', display_name: null, policy_verified_at: new Date('2026-06-06T00:00:00Z') },
    ]);

    const result = await pickAvailableTeamsHost(prisma, [slot]);

    expect(result.candidates.map((c) => c.teamsEmail)).toEqual([
      'naji@teachersindia.in',
      'later@teachersindia.in',
      'placeholder@teachersindia.in',
    ]);
  });

  it('never drops an unproven host — a trainer added five minutes ago must still be schedulable', async () => {
    const { prisma } = makePrisma([
      { id: 9, teams_email: 'brand.new@teachersindia.in', display_name: 'New Trainer', policy_verified_at: null },
    ]);

    const result = await pickAvailableTeamsHost(prisma, [slot]);

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.teamsEmail).toBe('brand.new@teachersindia.in');
  });

  it('skips a host that already has an overlapping live_class', async () => {
    const { prisma } = makePrisma(prodHosts(), ['naji@teachersindia.in', 'faculty.a@teachersindia.in']);

    const result = await pickAvailableTeamsHost(prisma, [slot]);

    expect(result.candidates.map((c) => c.teamsEmail)).toEqual([
      'faculty.b@teachersindia.in',
      'faculty.c@teachersindia.in',
    ]);
  });

  it('explains an empty pool rather than returning silently', async () => {
    const { prisma } = makePrisma([]);

    const result = await pickAvailableTeamsHost(prisma, [slot]);

    expect(result.candidates).toHaveLength(0);
    expect(result.reason).toContain('No Teams meeting hosts are configured');
  });

  it('explains a fully booked pool and counts the hosts it checked', async () => {
    const { prisma } = makePrisma(prodHosts(), prodHosts().map((h) => h.teams_email));

    const result = await pickAvailableTeamsHost(prisma, [slot]);

    expect(result.candidates).toHaveLength(0);
    expect(result.reason).toContain('All 4 Teams faculty accounts are already booked');
  });
});

describe('createTeamsMeetingOnFirstWorkingHost failover', () => {
  it('stops at the first host Graph accepts and stamps it verified', async () => {
    const { prisma, updates } = makePrisma(prodHosts());
    const createMeeting = vi.fn(({ hostEmail }: { hostEmail: string }) => Promise.resolve(meetingFor(hostEmail)));
    const now = new Date('2026-08-11T09:00:00Z');

    const result = await createTeamsMeetingOnFirstWorkingHost(
      prisma,
      { createMeeting },
      [candidate('naji@teachersindia.in', 2, true), candidate('faculty.a@teachersindia.in', 3)],
      { subject: 'Session 1', startDateTime: '2026-08-12T09:00:00Z', endDateTime: '2026-08-12T10:00:00Z' },
      now,
    );

    expect(result.ok).toBe(true);
    expect(result.ok && result.hostEmail).toBe('naji@teachersindia.in');
    expect(createMeeting).toHaveBeenCalledTimes(1);
    expect(updates).toEqual([
      { email: 'naji@teachersindia.in', data: { policy_verified_at: now, last_error: null, updated_at: now } },
    ]);
  });

  it('fails over when the mailbox does not exist, and quarantines that dead account', async () => {
    // The landmine: faculty.a@ is not a real mailbox, so the AAD lookup 404s
    // ('host_unknown'). Before this, the class was simply never created and the
    // admin got the raw Graph string.
    const { prisma, updates } = makePrisma(prodHosts());
    const createMeeting = vi.fn(({ hostEmail }: { hostEmail: string }) => {
      if (hostEmail === 'faculty.a@teachersindia.in') {
        return Promise.reject(
          new TeamsMeetingError('host_unknown', 'User faculty.a@teachersindia.in not found in the M365 tenant.', 404),
        );
      }
      return Promise.resolve(meetingFor(hostEmail));
    });
    const now = new Date('2026-08-11T09:00:00Z');

    const result = await createTeamsMeetingOnFirstWorkingHost(
      prisma,
      { createMeeting },
      [candidate('faculty.a@teachersindia.in', 3), candidate('faculty.b@teachersindia.in', 4)],
      { subject: 'Session 1', startDateTime: '2026-08-12T09:00:00Z', endDateTime: '2026-08-12T10:00:00Z' },
      now,
    );

    expect(result.ok).toBe(true);
    expect(result.ok && result.hostEmail).toBe('faculty.b@teachersindia.in');
    expect(createMeeting).toHaveBeenCalledTimes(2);
    // Dead host: error recorded AND deactivated so it cannot poison the next schedule.
    expect(updates[0]?.email).toBe('faculty.a@teachersindia.in');
    expect(updates[0]?.data.is_active).toBe(0);
    expect(updates[0]?.data.updated_at).toEqual(now);
    expect(String(updates[0]?.data.last_error)).toContain('not found in the M365 tenant');
    // Winner: verified, error cleared, still active.
    expect(updates[1]).toEqual({
      email: 'faculty.b@teachersindia.in',
      data: { policy_verified_at: now, last_error: null, updated_at: now },
    });
    // The caller needs to know which account is out, to skip it for the rest of a batch.
    expect(result.hardFailedHosts).toEqual(['faculty.a@teachersindia.in']);
  });

  it('fails over on a 403 policy rejection but does NOT deactivate the account', async () => {
    // A CsApplicationAccessPolicy that has not landed yet clears on its own —
    // deactivating the row would strand a trainer mid-onboarding.
    const { prisma, updates } = makePrisma(prodHosts());
    const createMeeting = vi.fn(({ hostEmail }: { hostEmail: string }) => {
      if (hostEmail === 'faculty.a@teachersindia.in') {
        return Promise.reject(new TeamsMeetingError('policy_missing', 'Graph online-meeting create failed (403)', 403));
      }
      return Promise.resolve(meetingFor(hostEmail));
    });

    const result = await createTeamsMeetingOnFirstWorkingHost(
      prisma,
      { createMeeting },
      [candidate('faculty.a@teachersindia.in', 3), candidate('faculty.b@teachersindia.in', 4)],
      { subject: 'Session 1', startDateTime: '2026-08-12T09:00:00Z', endDateTime: '2026-08-12T10:00:00Z' },
      new Date('2026-08-11T09:00:00Z'),
    );

    expect(result.ok).toBe(true);
    expect(updates[0]?.data.is_active).toBeUndefined();
    expect(String(updates[0]?.data.last_error)).toContain('403');
  });

  it('does NOT walk the pool on a 429 — throttling is not the host’s fault', async () => {
    const { prisma, updates } = makePrisma(prodHosts());
    const createMeeting = vi.fn(() =>
      Promise.reject(new TeamsMeetingError('unknown', 'Graph online-meeting create failed (429): throttled', 429)),
    );

    const result = await createTeamsMeetingOnFirstWorkingHost(
      prisma,
      { createMeeting },
      [candidate('naji@teachersindia.in', 2, true), candidate('faculty.a@teachersindia.in', 3), candidate('faculty.b@teachersindia.in', 4)],
      { subject: 'Session 1', startDateTime: '2026-08-12T09:00:00Z', endDateTime: '2026-08-12T10:00:00Z' },
      new Date('2026-08-11T09:00:00Z'),
    );

    expect(createMeeting).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.message).toContain('429');
    // No account is deactivated and none of the innocent hosts is touched.
    expect(updates).toHaveLength(1);
    expect(updates[0]?.data.is_active).toBeUndefined();
  });

  it('does NOT walk the pool on a 401 — that is our app registration, not the host', async () => {
    const { prisma, updates } = makePrisma(prodHosts());
    const createMeeting = vi.fn(() =>
      Promise.reject(new TeamsMeetingError('unauthorized', 'Failed to acquire Graph access token', 401)),
    );

    await createTeamsMeetingOnFirstWorkingHost(
      prisma,
      { createMeeting },
      [candidate('naji@teachersindia.in', 2, true), candidate('faculty.a@teachersindia.in', 3)],
      { subject: 'Session 1', startDateTime: '2026-08-12T09:00:00Z', endDateTime: '2026-08-12T10:00:00Z' },
      new Date('2026-08-11T09:00:00Z'),
    );

    expect(createMeeting).toHaveBeenCalledTimes(1);
    // App-level: no trainer row is written at all, not even the one we tried.
    expect(updates).toHaveLength(0);
  });

  it('names every account it tried when the whole pool rejects the meeting', async () => {
    const { prisma } = makePrisma(prodHosts());
    const createMeeting = vi.fn(({ hostEmail }: { hostEmail: string }) =>
      Promise.reject(new TeamsMeetingError('user_not_found', `Graph 404 for ${hostEmail}`, 404)),
    );

    const result = await createTeamsMeetingOnFirstWorkingHost(
      prisma,
      { createMeeting },
      [candidate('faculty.a@teachersindia.in', 3), candidate('faculty.b@teachersindia.in', 4)],
      { subject: 'Session 1', startDateTime: '2026-08-12T09:00:00Z', endDateTime: '2026-08-12T10:00:00Z' },
      new Date('2026-08-11T09:00:00Z'),
    );

    expect(createMeeting).toHaveBeenCalledTimes(2);
    expect(result.ok).toBe(false);
    const message = result.ok === false ? result.message : '';
    expect(message).toContain('Tried all 2 available Teams host account(s)');
    expect(message).toContain('faculty.a@teachersindia.in');
    expect(message).toContain('faculty.b@teachersindia.in');
    expect(message).toContain('Last error:');
  });
});

describe('isHostLevelTeamsFailure classification', () => {
  it('treats only per-account rejections as retryable elsewhere', () => {
    expect(isHostLevelTeamsFailure(new TeamsMeetingError('host_unknown', '404', 404))).toBe(true);
    expect(isHostLevelTeamsFailure(new TeamsMeetingError('user_not_found', '404', 404))).toBe(true);
    expect(isHostLevelTeamsFailure(new TeamsMeetingError('policy_missing', '403', 403))).toBe(true);
    expect(isHostLevelTeamsFailure(new TeamsMeetingError('unauthorized', '401', 401))).toBe(false);
    expect(isHostLevelTeamsFailure(new TeamsMeetingError('network', 'ECONNRESET'))).toBe(false);
    expect(isHostLevelTeamsFailure(new TeamsMeetingError('unknown', '500', 500))).toBe(false);
    expect(isHostLevelTeamsFailure(new Error('boom'))).toBe(false);
  });

  it('treats only our own app registration as app-level', () => {
    expect(isAppLevelTeamsFailure(new TeamsMeetingError('unauthorized', '401', 401))).toBe(true);
    expect(isAppLevelTeamsFailure(new TeamsMeetingError('host_unknown', '404', 404))).toBe(false);
    expect(isAppLevelTeamsFailure(new TeamsMeetingError('user_not_found', '404', 404))).toBe(false);
    expect(isAppLevelTeamsFailure(new TeamsMeetingError('policy_missing', '403', 403))).toBe(false);
    expect(isAppLevelTeamsFailure(new TeamsMeetingError('unknown', '429', 429))).toBe(false);
    expect(isAppLevelTeamsFailure(new Error('boom'))).toBe(false);
  });
});

/**
 * Defect 1 + 2 actually live in classifyError()/resolveObjectId(), so these
 * drive the real TeamsMeetingService against a stubbed Graph. Asserting on a
 * hand-built TeamsMeetingError would prove nothing about which 404 is which.
 */
function serviceWithGraphResponses(responses: Array<{ status: number; body: string }>) {
  const queue = [...responses];
  const fetchImpl = ((url: unknown) => {
    const next = queue.shift();
    if (!next) return Promise.reject(new Error(`unexpected Graph call: ${String(url)}`));
    return Promise.resolve({
      ok: next.status >= 200 && next.status < 300,
      status: next.status,
      text: () => Promise.resolve(next.body),
      json: () => Promise.resolve(JSON.parse(next.body)),
    } as unknown as Response);
  }) as unknown as typeof fetch;

  const service = new TeamsMeetingService({ clientId: 'c', clientSecret: 's', tenantId: 't' }, fetchImpl);
  // getAccessToken is private and would go out to MSAL; shadow it on the instance.
  (service as unknown as { getAccessToken: () => Promise<string> }).getAccessToken = () =>
    Promise.resolve('fake-token');
  return service;
}

const graphInput = {
  hostEmail: 'riya@teachersindia.in',
  subject: 'Session 1',
  startDateTime: '2026-08-12T09:00:00Z',
  endDateTime: '2026-08-12T10:00:00Z',
};

async function codeOfRejection(promise: Promise<unknown>): Promise<string> {
  const err = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(TeamsMeetingError);
  return (err as TeamsMeetingError).code;
}

describe('Graph error classification', () => {
  it('separates the AAD-lookup 404 from the onlineMeetings 404', async () => {
    // Lookup 404 — the mailbox genuinely is not in the tenant. Permanent.
    const gone = serviceWithGraphResponses([{ status: 404, body: '{"error":{"code":"Request_ResourceNotFound"}}' }]);
    expect(await codeOfRejection(gone.createMeeting(graphInput))).toBe('host_unknown');

    // Lookup fine, POST 404 — licence/policy still propagating. Transient.
    const propagating = serviceWithGraphResponses([
      { status: 200, body: '{"id":"obj-riya"}' },
      { status: 404, body: '{"error":{"code":"UnknownError"}}' },
    ]);
    expect(await codeOfRejection(propagating.createMeeting(graphInput))).toBe('user_not_found');
  });

  it('classifies 403 Authorization_RequestDenied as our app, not the host', async () => {
    const service = serviceWithGraphResponses([
      { status: 200, body: '{"id":"obj-riya"}' },
      {
        status: 403,
        body: '{"error":{"code":"Authorization_RequestDenied","message":"Insufficient privileges to complete the operation."}}',
      },
    ]);

    expect(await codeOfRejection(service.createMeeting(graphInput))).toBe('unauthorized');
  });

  it('still classifies the CsApplicationAccessPolicy 403 as host-level', async () => {
    const service = serviceWithGraphResponses([
      { status: 200, body: '{"id":"obj-riya"}' },
      {
        status: 403,
        body: '{"error":{"code":"Forbidden","message":"Application is not allowed to perform operations on behalf of this user."}}',
      },
    ]);

    expect(await codeOfRejection(service.createMeeting(graphInput))).toBe('policy_missing');
  });
});

describe('onboarding a new trainer (defect 1 end-to-end)', () => {
  it('fails over past a propagating policy WITHOUT disabling the new host', async () => {
    // riya@ was added minutes ago and Grant-CsApplicationAccessPolicy has not
    // propagated. naji@ is double-booked, so riya@ is the only free candidate.
    // Quarantining her here excluded her from the picker forever (it filters
    // is_active = 1) while the class quietly succeeded elsewhere — onboarding a
    // trainer became harder than before failover existed.
    const { prisma, updates } = makePrisma(prodHosts());
    const createMeeting = vi.fn(({ hostEmail }: { hostEmail: string }) => {
      if (hostEmail === 'riya@teachersindia.in') {
        return Promise.reject(
          new TeamsMeetingError(
            'user_not_found',
            'Graph online-meeting create failed (404): Likely missing Teams license or CsApplicationAccessPolicy propagation.',
            404,
          ),
        );
      }
      return Promise.resolve(meetingFor(hostEmail));
    });
    const now = new Date('2026-08-11T09:00:00Z');

    const result = await createTeamsMeetingOnFirstWorkingHost(
      prisma,
      { createMeeting },
      [candidate('riya@teachersindia.in', 6), candidate('faculty.b@teachersindia.in', 4)],
      { subject: 'Session 1', startDateTime: '2026-08-12T09:00:00Z', endDateTime: '2026-08-12T10:00:00Z' },
      now,
    );

    expect(result.ok).toBe(true);
    expect(result.ok && result.hostEmail).toBe('faculty.b@teachersindia.in');
    // riya@ keeps her row active — the error is recorded, nothing is disabled.
    expect(updates[0]?.email).toBe('riya@teachersindia.in');
    expect(updates[0]?.data.is_active).toBeUndefined();
    expect(String(updates[0]?.data.last_error)).toContain('propagation');
    expect(updates[0]?.data.updated_at).toEqual(now);
  });
});

describe('app-level rejection (defect 2)', () => {
  it('stops on the first host, touches no row, and blames the app registration', async () => {
    const { prisma, updates } = makePrisma(prodHosts());
    const createMeeting = vi.fn(() =>
      Promise.reject(
        new TeamsMeetingError(
          'unauthorized',
          'Graph online-meeting create failed (403): {"error":{"code":"Authorization_RequestDenied"}}',
          403,
        ),
      ),
    );

    const result = await createTeamsMeetingOnFirstWorkingHost(
      prisma,
      { createMeeting },
      [
        candidate('naji@teachersindia.in', 2, true),
        candidate('faculty.a@teachersindia.in', 3),
        candidate('faculty.b@teachersindia.in', 4),
        candidate('faculty.c@teachersindia.in', 5),
      ],
      { subject: 'Session 1', startDateTime: '2026-08-12T09:00:00Z', endDateTime: '2026-08-12T10:00:00Z' },
      new Date('2026-08-11T09:00:00Z'),
    );

    // One call, not four. No last_error on naji@ or anyone else.
    expect(createMeeting).toHaveBeenCalledTimes(1);
    expect(updates).toHaveLength(0);
    expect(result.ok).toBe(false);
    const message = result.ok === false ? result.message : '';
    expect(message).toContain('rejected our app registration');
    expect(message).toContain('OnlineMeetings.ReadWrite.All');
    // Must NOT read as "your four trainers are broken".
    expect(message).not.toContain('Tried all');
    expect(result.hardFailedHosts).toEqual([]);
  });
});

/**
 * Batch-level Prisma stub — everything addLiveClasses touches. `created`
 * captures live_class rows so we can prove the successful sessions still land.
 */
function makeBatchPrisma(hosts: Array<Record<string, unknown>>, busy: string[] = []) {
  const updates: Array<{ email: unknown; data: Record<string, unknown> }> = [];
  const created: Array<Record<string, unknown>> = [];
  const prisma = {
    cohorts: {
      findFirst: () => Promise.resolve({ id: 1, instructor_id: 5, centre_id: null, course_id: 7 }),
    },
    teams_meeting_hosts: {
      findMany: () => Promise.resolve(hosts),
      updateMany: (args: { where: { teams_email?: unknown }; data: Record<string, unknown> }) => {
        updates.push({ email: args.where.teams_email, data: args.data });
        return Promise.resolve({ count: 1 });
      },
    },
    live_class: {
      findFirst: (args: { where: { host_email?: unknown } }) =>
        Promise.resolve(busy.includes(String(args.where.host_email)) ? { id: 1 } : null),
      create: (args: { data: Record<string, unknown> }) => {
        created.push(args.data);
        return Promise.resolve({ id: created.length });
      },
    },
  } as unknown as PrismaClient;
  return { prisma, updates, created };
}

function cohortEntries(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    sessionId: String(i + 1),
    title: `Session ${i + 1}`,
    date: `2026-08-${String(12 + i).padStart(2, '0')}`,
    fromTime: '14:30',
    toTime: '15:30',
    isRepetitive: 0,
    repeatDates: [],
  }));
}

/**
 * Runs the REAL picker + failover helper inside addLiveClasses. Only
 * createTeamsService() is shadowed — it is private and would otherwise build a
 * live MSAL client off EMAIL_MSGRAPH_* env.
 */
function batchService(prisma: PrismaClient, createMeeting: (input: { hostEmail: string }) => Promise<unknown>) {
  const service = new OperationsService(prisma);
  (service as unknown as { createTeamsService: () => Promise<unknown> }).createTeamsService = () =>
    Promise.resolve({ createMeeting });
  return service;
}

describe('addLiveClasses batch failover (defect 3)', () => {
  it('never re-hits a host that already hard-failed earlier in the same batch', async () => {
    // naji@ is booked across the series — exactly what failover exists for.
    // faculty.a@ is not a real mailbox. Entry 1 gets past it only to hit a
    // throttle on faculty.b@, so it fails WITHOUT a winner: nothing gets
    // reordered, and only the pruning keeps faculty.a@ out of entry 2.
    const { prisma, created } = makeBatchPrisma(prodHosts(), ['naji@teachersindia.in']);
    let throttled = false;
    const createMeeting = vi.fn(({ hostEmail }: { hostEmail: string }) => {
      if (hostEmail === 'faculty.a@teachersindia.in') {
        return Promise.reject(new TeamsMeetingError('host_unknown', 'User faculty.a@ not found in the M365 tenant.', 404));
      }
      if (hostEmail === 'faculty.b@teachersindia.in' && !throttled) {
        throttled = true;
        return Promise.reject(new TeamsMeetingError('unknown', 'Graph create failed (429): throttled', 429));
      }
      return Promise.resolve(meetingFor(hostEmail));
    });

    const result = await batchService(prisma, createMeeting).addLiveClasses('admin', '1', {
      cohortId: '1',
      zoomId: '',
      password: '',
      platform: 'teams',
      entries: cohortEntries(3),
    });

    // Entries 2 and 3 land on faculty.b@; entry 1 is the throttled casualty.
    expect(result.success).toBe(true);
    expect(created).toHaveLength(2);
    // faculty.a@ is tried exactly once, on entry 1, and never again.
    const attemptsOnDeadHost = createMeeting.mock.calls.filter(
      ([arg]) => arg.hostEmail === 'faculty.a@teachersindia.in',
    );
    expect(attemptsOnDeadHost).toHaveLength(1);
    // 2 calls for entry 1 (a, then the throttled b), 1 each for entries 2 and 3.
    expect(createMeeting).toHaveBeenCalledTimes(4);
  });

  it('short-circuits the rest of the batch once every host has hard-failed', async () => {
    // The 12-session cohort from the review: 3 dead placeholders used to mean
    // 36 Graph calls, 36 last_error writes and 12 identical error strings.
    const { prisma, updates, created } = makeBatchPrisma(prodHosts(), ['naji@teachersindia.in']);
    const createMeeting = vi.fn(({ hostEmail }: { hostEmail: string }) =>
      Promise.reject(new TeamsMeetingError('host_unknown', `User ${hostEmail} not found in the M365 tenant.`, 404)),
    );

    const result = await batchService(prisma, createMeeting).addLiveClasses('admin', '1', {
      cohortId: '1',
      zoomId: '',
      password: '',
      platform: 'teams',
      entries: cohortEntries(12),
    });

    // Three candidates, one attempt each, then stop.
    expect(createMeeting).toHaveBeenCalledTimes(3);
    expect(updates).toHaveLength(3);
    expect(created).toHaveLength(0);
    expect(result.success).toBe(false);

    // One per-entry error plus one batch-level explanation — not twelve copies.
    const errors = result.errors as string[];
    expect(errors).toHaveLength(2);
    expect(errors[1]).toContain('remaining 11 session(s) were skipped');
  });
});
