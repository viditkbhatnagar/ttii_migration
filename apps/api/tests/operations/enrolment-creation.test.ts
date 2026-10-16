import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { PrismaClient } from '@prisma/client';

// Two enrolment-creation fixes (TTII 2026-10-16):
//
// 1. Enrolment IDs. Add Enrolment and Admin Approve both numbered an enrolment
//    TIDMTT + YY + MM + users.id, so a second course in the same month reused
//    the first one's ID (Ansy Mol V K, user 353: TIDMTT26100353 twice). New IDs
//    take a -2, -3 ... suffix only when the base is already held.
//
// 2. Admin Approve & Enrol (the lead pipeline every new student goes through)
//    created the student with no TTS student_id, no created_by / updated_by and
//    no users.course_id, and the enrol row with no enrollment_status,
//    mode_of_study or created_by — 33 live students since May have no student
//    ID. It now allocates the code inside one transaction with the user insert,
//    exactly like convertApplication.
//
// 3. Credentials email (TTII 2026-10-17). Both paths used to email the temp
//    password BEFORE the transaction, so a double submit that lost the claim
//    still mailed a second password that was never saved. The password is now
//    generated first and emailed only after the commit, by the request that
//    created the student.

const credentialMocks = vi.hoisted(() => ({
  issueCredentials: vi.fn<() => Promise<{ tempPassword: string; hashedPassword: string }>>(),
  emailIssuedCredentials: vi.fn<(ctx: { name: string; email: string; roleLabel: string }, tempPassword: string) => Promise<{ emailDelivered: boolean }>>(),
}));
vi.mock('../../src/auth/credentials-issuer.js', () => ({
  issueCredentials: credentialMocks.issueCredentials,
  emailIssuedCredentials: credentialMocks.emailIssuedCredentials,
}));

const { OperationsService } = await import('../../src/operations/operations-service.js');
const { allocateEnrollmentId, baseEnrollmentId, pickUniqueEnrollmentId } = await import('../../src/operations/enrolment-id.js');
const { verifyPassword } = await import('../../src/auth/password.js');

const FIXED_NOW = new Date('2026-10-16T06:00:00.000Z');
const STUDENT_610_EMAIL = { name: 'Student 610', email: 'student610@example.com', roleLabel: 'Student' };

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(FIXED_NOW);
  credentialMocks.issueCredentials.mockReset().mockResolvedValue({ tempPassword: 'Temp-Secret-1', hashedPassword: 'hashed-secret' });
  credentialMocks.emailIssuedCredentials.mockReset().mockResolvedValue({ emailDelivered: true });
});
afterEach(() => {
  vi.useRealTimers();
});

describe('enrolment id helpers', () => {
  test('base format is unchanged: TIDMTT + YY + MM + users.id padded to 4', () => {
    expect(baseEnrollmentId(353, FIXED_NOW)).toBe('TIDMTT26100353');
    expect(baseEnrollmentId(12345, FIXED_NOW)).toBe('TIDMTT261012345');
  });

  test('the base is used when free; otherwise the smallest free suffix', () => {
    expect(pickUniqueEnrollmentId('TIDMTT26100353', new Set())).toBe('TIDMTT26100353');
    expect(pickUniqueEnrollmentId('TIDMTT26100353', new Set(['TIDMTT26100353']))).toBe('TIDMTT26100353-2');
    expect(pickUniqueEnrollmentId('TIDMTT26100353', new Set(['TIDMTT26100353', 'TIDMTT26100353-2', 'TIDMTT26100353-4']))).toBe('TIDMTT26100353-3');
  });

  test('allocation reads every row with the base (soft-deleted included) and ignores blanks', async () => {
    const findMany = vi.fn(() => Promise.resolve([{ enrollment_id: 'TIDMTT26100353 ' }, { enrollment_id: null }]));
    const id = await allocateEnrollmentId({ enrol: { findMany } } as never, 353, FIXED_NOW);
    expect(id).toBe('TIDMTT26100353-2');
    expect(findMany).toHaveBeenCalledWith({
      where: { enrollment_id: { startsWith: 'TIDMTT26100353' } },
      select: { enrollment_id: true },
    });
  });
});

type Row = Record<string, unknown>;

interface ApprovalWorld {
  apps: Map<number, Row>;
  existingStudent: { id: number; name: string; user_email: string } | null;
  takenIds: string[];
  /** Committed TTS codes (nextStudentCode scans them for the max). */
  tts: string[];
  /** The first N transaction attempts are rolled back as the deadlock victim. */
  deadlocks: number;
}

/**
 * A fake that behaves like InnoDB for these paths: transactions run one at a
 * time (the Serializable / row-lock outcome), writes commit only when the
 * transaction returns, and an attempt can be rolled back as a deadlock victim.
 */
function makeEnrolmentService(world: ApprovalWorld) {
  const committed = { users: [] as Row[], enrols: [] as Row[] };
  const txOptions: unknown[] = [];
  let attempts = 0;
  let nextUserId = 777;
  let queue: Promise<unknown> = Promise.resolve();
  let pauseBeforeCommit: { markReached: () => void; released: Promise<void> } | null = null;

  /** Hold the next transaction that reaches its commit until `release()`. */
  const pauseNextCommit = () => {
    let markReached: () => void = () => undefined;
    let release: () => void = () => undefined;
    const reached = new Promise<void>((resolve) => { markReached = resolve; });
    const released = new Promise<void>((resolve) => { release = resolve; });
    pauseBeforeCommit = { markReached, released };
    return { reached, release };
  };

  const prisma = {
    applications: { findFirst: ({ where }: { where: { id: number; is_converted?: number } }) => {
      const app = world.apps.get(where.id);
      if (!app || (where.is_converted !== undefined && app.is_converted !== where.is_converted)) return Promise.resolve(null);
      return Promise.resolve({ ...app });
    } },
    users: {
      // The actor's role (convert scope) or the existing-student lookup (approve).
      findFirst: ({ select }: { select?: { role_id?: boolean } }) => Promise.resolve(select?.role_id && !('user_email' in (select ?? {})) ? { role_id: 1 } : world.existingStudent),
    },
    $transaction: (fn: (tx: unknown) => Promise<unknown>, opts?: unknown) => {
      txOptions.push(opts);
      const run = async () => {
        attempts += 1;
        if (attempts <= world.deadlocks) throw new Error('Deadlock found when trying to get lock; try restarting transaction');
        const pending = { users: [] as Row[], enrols: [] as Row[], apps: new Map([...world.apps].map(([k, v]) => [k, { ...v }])) };
        const tx = {
          applications: {
            updateMany: ({ where, data }: { where: { id: number; stage?: { in: string[] }; is_converted?: number }; data: Row }) => {
              const app = pending.apps.get(where.id);
              const ok = app
                && (!where.stage || where.stage.in.includes(String(app.stage)))
                && (where.is_converted === undefined || app.is_converted === where.is_converted);
              if (!ok || !app) return Promise.resolve({ count: 0 });
              Object.assign(app, data);
              return Promise.resolve({ count: 1 });
            },
            update: ({ where, data }: { where: { id: number }; data: Row }) => {
              Object.assign(pending.apps.get(where.id) ?? {}, data);
              return Promise.resolve({ id: where.id });
            },
          },
          users: {
            findMany: () => Promise.resolve(world.tts.map((student_id) => ({ student_id }))),
            create: ({ data }: { data: Row }) => {
              pending.users.push(data);
              nextUserId += 1;
              return Promise.resolve({ id: nextUserId - 1, name: data.name, user_email: data.user_email });
            },
          },
          enrol: {
            findFirst: () => Promise.resolve(null),
            findMany: () => Promise.resolve(world.takenIds.map((enrollment_id) => ({ enrollment_id }))),
            create: ({ data }: { data: Row }) => { pending.enrols.push(data); return Promise.resolve({ id: 1 }); },
          },
        };
        const result = await fn(tx);
        if (pauseBeforeCommit) {
          const pause = pauseBeforeCommit;
          pauseBeforeCommit = null;
          pause.markReached();
          await pause.released;
        }
        world.apps = pending.apps;
        committed.users.push(...pending.users);
        committed.enrols.push(...pending.enrols);
        world.tts.push(...pending.users.map((u) => String(u.student_id)));
        return result;
      };
      const p = queue.then(run, run);
      queue = p.then(() => undefined, () => undefined);
      return p;
    },
  } as unknown as PrismaClient;

  const service = new OperationsService(prisma);
  vi.spyOn(service, 'recordEvent').mockResolvedValue();
  vi.spyOn(service as unknown as { notifyApplicationEvent: () => Promise<void> }, 'notifyApplicationEvent').mockResolvedValue();
  vi.spyOn(service, 'renderApplicationFormPdf').mockResolvedValue({ status: 0, message: 'skipped in test' } as never);
  const materialize = vi.spyOn(service as unknown as { materializePaymentPlanToStudentPayments: (...args: unknown[]) => Promise<unknown> }, 'materializePaymentPlanToStudentPayments')
    .mockResolvedValue({ created: 0, skipped: 'no-plan' });
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  return { service, committed, txOptions, materialize, world, pauseNextCommit };
}

/**
 * Two requests in flight together: `first` is held just before its commit,
 * `second` starts then (so its pre-checks read the uncommitted state and it
 * generates its own credentials), and `first` commits once `second` is
 * queued behind it — a double click, or two admins on the same application.
 *
 * Not a bare Promise.all: vitest's mocked dynamic import is not safe when two
 * imports of the same mocked module from one importer overlap — the second
 * falls through to the REAL module — so the requests must not reach
 * `await import('../auth/credentials-issuer.js')` at the same instant.
 */
async function overlapping<T>(
  fx: { pauseNextCommit: () => { reached: Promise<void>; release: () => void }; txOptions: unknown[] },
  first: () => Promise<T>,
  second: () => Promise<T>,
): Promise<[T, T]> {
  const hold = fx.pauseNextCommit();
  const a = first();
  await hold.reached;
  const queuedBefore = fx.txOptions.length;
  const b = second();
  await vi.waitFor(() => { expect(fx.txOptions.length).toBeGreaterThan(queuedBefore); });
  hold.release();
  return Promise.all([a, b]);
}

const approvalApp = (id: number, over: Row = {}): Row => ({
  id,
  application_id: `TTII26${id}`,
  stage: 'approval_waiting',
  is_converted: 0,
  name: `Student ${id}`,
  user_email: `student${id}@example.com`,
  email: `student${id}@example.com`,
  phone: '9800000001',
  country_code: '+91',
  added_under_centre: null,
  course_id: 16,
  biography: null,
  verification: JSON.stringify({ verified: ['basic', 'qualification', 'documents'] }),
  payment_plan: null,
  payment_status: null,
  payment_marked_paid_at: new Date('2026-10-10T09:00:00.000Z'),
  enrollment_status: null,
  mode_of_study: null,
  ...over,
});

const approvalWorld = (over: Partial<ApprovalWorld> = {}): ApprovalWorld => ({
  apps: new Map([[610, approvalApp(610)], [611, approvalApp(611)]]),
  existingStudent: null,
  takenIds: [],
  tts: ['TTS0124', 'TTS0131', 'TTS0009'],
  deadlocks: 0,
  ...over,
});

describe('Admin Approve & Enrol creates a complete student', () => {
  test('a new student gets the next TTS code, actor fields and course, in one Serializable transaction', async () => {
    const { service, committed, txOptions } = makeEnrolmentService(approvalWorld());
    const res = await service.adminApproveApplication('1', '610');
    expect(res.status).toBe(1);
    expect(txOptions[0]).toMatchObject({ isolationLevel: 'Serializable' });
    expect(committed.users).toHaveLength(1);
    expect(committed.users[0]).toMatchObject({
      student_id: 'TTS0132',
      name: 'Student 610',
      user_email: 'student610@example.com',
      email: 'student610@example.com',
      phone: '9800000001',
      password: 'hashed-secret',
      role_id: 2,
      status: 1,
      application_id: 610,
      course_id: 16,
      created_by: 1,
      updated_by: 1,
    });
    expect(committed.enrols[0]).toMatchObject({
      user_id: 777,
      course_id: 16,
      enrollment_id: 'TIDMTT26100777',
      enrollment_date: '2026-10-16',
      enrollment_status: 'Active',
      mode_of_study: 'Online',
      created_by: 1,
      updated_by: 1,
    });
  });

  test('the claim moves the application and links the student; materialisation gets settledAt', async () => {
    const { service, world, materialize } = makeEnrolmentService(approvalWorld());
    await service.adminApproveApplication('1', '610');
    expect(world.apps.get(610)).toMatchObject({ stage: 'enrolled', is_converted: 1, status: 'converted', student_id: 777, admin_approved_by: 1 });
    expect(materialize).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ studentUserId: 777, courseId: 16, settledAt: new Date('2026-10-10T09:00:00.000Z') }));
  });

  test("the application's own enrolment status and mode of study are kept, like convertApplication", async () => {
    const world = approvalWorld();
    world.apps.set(610, approvalApp(610, { enrollment_status: 'Active', mode_of_study: 'Offline' }));
    const { service, committed } = makeEnrolmentService(world);
    await service.adminApproveApplication('8', '610');
    expect(committed.enrols[0]).toMatchObject({ enrollment_status: 'Active', mode_of_study: 'Offline', created_by: 8 });
  });

  test('an existing student is reused untouched and a same-month second course gets a unique id', async () => {
    const { service, committed } = makeEnrolmentService(approvalWorld({
      existingStudent: { id: 353, name: 'Ansy Mol V K', user_email: 'ansy@example.com' },
      takenIds: ['TIDMTT26100353'],
    }));
    const res = await service.adminApproveApplication('1', '610');
    expect(res.status).toBe(1);
    expect(committed.users).toHaveLength(0);
    expect(committed.enrols[0]).toMatchObject({ user_id: 353, enrollment_id: 'TIDMTT26100353-2', enrollment_status: 'Active', mode_of_study: 'Online', created_by: 1 });
    // No new password for an existing student, so no credentials email (as before).
    expect(credentialMocks.issueCredentials).not.toHaveBeenCalled();
    expect(credentialMocks.emailIssuedCredentials).not.toHaveBeenCalled();
  });

  test('the credentials email goes to the new student once, only after the student is committed', async () => {
    const { service, committed } = makeEnrolmentService(approvalWorld());
    const usersCommittedWhenEmailed: number[] = [];
    credentialMocks.emailIssuedCredentials.mockImplementation(() => {
      usersCommittedWhenEmailed.push(committed.users.length);
      return Promise.resolve({ emailDelivered: true });
    });
    expect((await service.adminApproveApplication('1', '610')).status).toBe(1);
    expect(credentialMocks.emailIssuedCredentials).toHaveBeenCalledTimes(1);
    expect(credentialMocks.emailIssuedCredentials).toHaveBeenCalledWith(STUDENT_610_EMAIL, 'Temp-Secret-1');
    expect(usersCommittedWhenEmailed).toEqual([1]);
  });

  test('a double submit approves once: one student, one TTS code; the second is refused', async () => {
    const fx = makeEnrolmentService(approvalWorld());
    const [first, second] = await overlapping(fx, () => fx.service.adminApproveApplication('1', '610'), () => fx.service.adminApproveApplication('8', '610'));
    expect(first.status).toBe(1);
    expect(second).toEqual({ status: 0, message: 'This application has already been approved.' });
    expect(fx.committed.users).toHaveLength(1);
    expect(fx.committed.enrols).toHaveLength(1);
  });

  test('two concurrent approvals send exactly one credentials email, carrying the password that was saved', async () => {
    credentialMocks.issueCredentials
      .mockResolvedValueOnce({ tempPassword: 'Temp-Secret-A', hashedPassword: 'hash-A' })
      .mockResolvedValueOnce({ tempPassword: 'Temp-Secret-B', hashedPassword: 'hash-B' });
    const fx = makeEnrolmentService(approvalWorld());
    const [first, second] = await overlapping(fx, () => fx.service.adminApproveApplication('1', '610'), () => fx.service.adminApproveApplication('8', '610'));
    expect([first.status, second.status]).toEqual([1, 0]);
    // The loser passed its checks and generated a password before losing the
    // claim — and that password was never saved, so it is never mailed.
    expect(credentialMocks.issueCredentials).toHaveBeenCalledTimes(2);
    expect(fx.committed.users).toHaveLength(1);
    expect(fx.committed.users[0]?.password).toBe('hash-A');
    expect(credentialMocks.emailIssuedCredentials).toHaveBeenCalledTimes(1);
    expect(credentialMocks.emailIssuedCredentials).toHaveBeenCalledWith(STUDENT_610_EMAIL, 'Temp-Secret-A');
  });

  test('two DIFFERENT approvals at the same moment mint different TTS codes', async () => {
    const fx = makeEnrolmentService(approvalWorld());
    await overlapping(fx, () => fx.service.adminApproveApplication('1', '610'), () => fx.service.adminApproveApplication('1', '611'));
    expect(fx.committed.users.map((u) => u.student_id)).toEqual(['TTS0132', 'TTS0133']);
    // One credentials email per student actually created.
    expect(credentialMocks.emailIssuedCredentials.mock.calls.map(([ctx]) => ctx.email)).toEqual(['student610@example.com', 'student611@example.com']);
  });

  test('a deadlock victim is retried and succeeds; repeated contention gives a friendly refusal and writes nothing', async () => {
    const retried = makeEnrolmentService(approvalWorld({ deadlocks: 1 }));
    expect((await retried.service.adminApproveApplication('1', '610')).status).toBe(1);
    expect(retried.txOptions).toHaveLength(2);
    expect(retried.committed.users).toHaveLength(1);
    expect(credentialMocks.emailIssuedCredentials).toHaveBeenCalledTimes(1);

    const stuck = makeEnrolmentService(approvalWorld({ deadlocks: 9 }));
    expect(await stuck.service.adminApproveApplication('1', '610')).toEqual({
      status: 0, message: 'Another approval was being saved at the same moment. Nothing was changed; please try again.',
    });
    expect(stuck.txOptions).toHaveLength(3);
    expect(stuck.committed.users).toHaveLength(0);
    // Nothing was saved, so nothing more was emailed.
    expect(credentialMocks.emailIssuedCredentials).toHaveBeenCalledTimes(1);
  });
});

describe('Convert Application allocates the TTS code the same safe way', () => {
  test('Serializable, claim-first: a double submit converts once', async () => {
    const fx = makeEnrolmentService(approvalWorld());
    const [first, second] = await overlapping(fx, () => fx.service.convertApplication('1', '610'), () => fx.service.convertApplication('1', '610'));
    expect(fx.txOptions[0]).toMatchObject({ isolationLevel: 'Serializable' });
    expect(first.status).toBe(1);
    expect(second).toEqual({ status: 0, message: 'This application has already been converted.' });
    expect(fx.committed.users).toHaveLength(1);
    expect(fx.committed.users[0]).toMatchObject({ student_id: 'TTS0132', application_id: 610, course_id: 16, created_by: 1 });
  });

  test('a double submit sends exactly one credentials email, after the commit, with the saved password', async () => {
    credentialMocks.issueCredentials
      .mockResolvedValueOnce({ tempPassword: 'Temp-Secret-A', hashedPassword: 'hash-A' })
      .mockResolvedValueOnce({ tempPassword: 'Temp-Secret-B', hashedPassword: 'hash-B' });
    const fx = makeEnrolmentService(approvalWorld());
    const usersCommittedWhenEmailed: number[] = [];
    credentialMocks.emailIssuedCredentials.mockImplementation(() => {
      usersCommittedWhenEmailed.push(fx.committed.users.length);
      return Promise.resolve({ emailDelivered: true });
    });
    const [first, second] = await overlapping(fx, () => fx.service.convertApplication('1', '610'), () => fx.service.convertApplication('1', '610'));
    expect([first.status, second.status]).toEqual([1, 0]);
    expect(credentialMocks.issueCredentials).toHaveBeenCalledTimes(2);
    expect(fx.committed.users).toHaveLength(1);
    expect(fx.committed.users[0]?.password).toBe('hash-A');
    expect(credentialMocks.emailIssuedCredentials).toHaveBeenCalledTimes(1);
    expect(credentialMocks.emailIssuedCredentials).toHaveBeenCalledWith(STUDENT_610_EMAIL, 'Temp-Secret-A');
    expect(usersCommittedWhenEmailed).toEqual([1]);
  });

  test('no email on file: no credentials are issued or emailed and the default password is kept, as before', async () => {
    const world = approvalWorld();
    world.apps.set(610, approvalApp(610, { user_email: null, email: null }));
    const { service, committed } = makeEnrolmentService(world);
    expect((await service.convertApplication('1', '610')).status).toBe(1);
    expect(credentialMocks.issueCredentials).not.toHaveBeenCalled();
    expect(credentialMocks.emailIssuedCredentials).not.toHaveBeenCalled();
    expect(await verifyPassword('Temp@1234', String(committed.users[0]?.password))).toBe(true);
  });

  test('two different conversions mint different codes, and contention is retried', async () => {
    const fx = makeEnrolmentService(approvalWorld({ deadlocks: 1 }));
    const results = await overlapping(fx, () => fx.service.convertApplication('1', '610'), () => fx.service.convertApplication('1', '611'));
    expect(results.map((r) => r.status)).toEqual([1, 1]);
    expect(fx.committed.users.map((u) => u.student_id)).toEqual(['TTS0132', 'TTS0133']);
    // One credentials email per student actually created.
    expect(credentialMocks.emailIssuedCredentials.mock.calls.map(([ctx]) => ctx.email)).toEqual(['student610@example.com', 'student611@example.com']);
  });
});

describe('Add Enrolment gives a second course its own enrolment id', () => {
  test('admin path: base already held by the first enrolment -> -2 suffix', async () => {
    const enrolCreated: Array<Record<string, unknown>> = [];
    const prisma = {
      users: {
        findFirst: ({ where }: { where: { id: number } }) => Promise.resolve(
          where.id === 1
            ? { id: 1, role_id: 1, name: 'Admin' }
            : { id: 353, name: 'Ansy Mol V K', phone: '9800000353', user_email: 'ansy@example.com', country_code: '+91', image: '', profile_picture: '', application_id: 0 },
        ),
      },
      enrol: {
        findFirst: () => Promise.resolve(null),
        findMany: () => Promise.resolve([{ enrollment_id: 'TIDMTT26100353' }]),
        create: ({ data }: { data: Record<string, unknown> }) => {
          enrolCreated.push(data);
          return Promise.resolve({ id: 999, enrollment_id: data.enrollment_id });
        },
      },
      applications: {
        findMany: () => Promise.resolve([]),
        create: () => Promise.resolve({ id: 501, application_id: 'TTII260501' }),
      },
    } as unknown as PrismaClient;
    const service = new OperationsService(prisma);
    vi.spyOn(service, 'recordEvent').mockResolvedValue();

    const res = await service.addAdditionalEnrolment('1', '353', { courseId: '25', finalCourseFee: '15000', paymentMode: 'draft' });

    expect(res.status).toBe(1);
    expect(enrolCreated[0]?.enrollment_id).toBe('TIDMTT26100353-2');
    expect((res.data as { enrollment_id?: string }).enrollment_id).toBe('TIDMTT26100353-2');
  });
});
