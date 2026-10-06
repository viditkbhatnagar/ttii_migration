import { describe, expect, test } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import { AuthService } from '../../src/auth/auth-service.js';

// Majida 2026-10-05 — "Anyone who logs in using the Sign in with Google option
// is directly appearing in the enrollments list, without any manual or approved
// enrollment. This may expose unwanted users in our student records."
//
// First-time Google/Microsoft sign-in used to CREATE a role-2 student. On
// production that produced 6 live accounts (11 in total) in two months, none of
// which ever applied, enrolled, joined a cohort or paid — one was a trainer who
// signed in on the student site. Meanwhile existing students used Google
// sign-in 319 times, so that path must keep working exactly as before.

const EMAIL = 'someone@gmail.com';
const meta = { ipAddress: '127.0.0.1', userAgent: 'vitest' };

interface Recorder { created: number; audit: string[] }

function makeService(student: Record<string, unknown> | null): { service: AuthService; rec: Recorder } {
  const rec: Recorder = { created: 0, audit: [] };
  const prisma = {
    users: {
      findFirst: () => Promise.resolve(student),
      create: () => { rec.created += 1; return Promise.resolve({ id: 999 }); },
      updateMany: () => Promise.resolve({ count: 1 }),
    },
    auth_audit_log: {
      create: ({ data }: { data: { event: string } }) => { rec.audit.push(data.event); return Promise.resolve({}); },
    },
  } as unknown as PrismaClient;
  const service = new AuthService({
    prisma,
    integrations: { email: { sendEmail: () => Promise.resolve() }, otp: { sendOtp: () => Promise.resolve() } } as never,
  });
  // The session plumbing has its own tests; stub it so this file pins only the
  // decision of WHO may sign in.
  Object.assign(service as unknown as Record<string, unknown>, {
    computeLinkedUserIdsForVerifiedEmail: () => Promise.resolve([]),
    createSession: () => Promise.resolve({ token: 't', expiresAt: new Date('2026-10-06T10:00:00Z') }),
    toLegacyUserData: (u: { id: number }) => ({ user_id: String(u.id) }),
  });
  return { service, rec };
}

function finalize(service: AuthService): Promise<Record<string, unknown>> {
  return (service as unknown as {
    finalizeSsoLogin: (i: Record<string, unknown>) => Promise<Record<string, unknown>>;
  }).finalizeSsoLogin({ email: EMAIL, name: 'Someone', provider: 'google', requestMeta: meta });
}

describe('Sign in with Google / Microsoft', () => {
  test('does NOT create a student account for an email TTII has never enrolled', async () => {
    const { service, rec } = makeService(null);

    await expect(finalize(service)).rejects.toMatchObject({ statusCode: 403, code: 'SSO_NO_ACCOUNT' });
    expect(rec.created).toBe(0);
    expect(rec.audit).toEqual(['SSO_LOGIN_NO_ACCOUNT']);
  });

  test('tells the person which email it looked for and what to do', async () => {
    const { service } = makeService(null);
    await expect(finalize(service)).rejects.toThrow(/no TTII student account for someone@gmail\.com.*email address you used for your admission/);
  });

  test('still signs an existing student straight in', async () => {
    const { service, rec } = makeService({ id: 224, role_id: 2, status: 1, disabled_at: null, phone: '9847400222' });
    const res = await finalize(service);

    expect(res).toMatchObject({ userData: { user_id: '224' }, requiresProfileCompletion: false });
    expect(rec.created).toBe(0);
    expect(rec.audit).toEqual(['SSO_LOGIN_SUCCESS']);
  });

  test('refuses a student an admin has disabled (disabled_at), like the password login does', async () => {
    const { service, rec } = makeService({ id: 224, role_id: 2, status: 1, disabled_at: new Date('2026-09-01'), phone: '' });

    await expect(finalize(service)).rejects.toMatchObject({ statusCode: 403, code: 'ACCOUNT_INACTIVE' });
    expect(rec.audit).toEqual(['SSO_LOGIN_BLOCKED_INACTIVE']);
  });

  test('still refuses a deactivated (status 0) student', async () => {
    const { service } = makeService({ id: 224, role_id: 2, status: 0, disabled_at: null, phone: '' });
    await expect(finalize(service)).rejects.toMatchObject({ code: 'ACCOUNT_INACTIVE' });
  });
});
