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

vi.mock('../../src/auth/credentials-issuer.js', () => ({
  issueAndEmailCredentials: vi.fn(() => Promise.resolve({ tempPassword: 'Temp-Secret-1', hashedPassword: 'hashed-secret' })),
}));

const { OperationsService } = await import('../../src/operations/operations-service.js');
const { allocateEnrollmentId, baseEnrollmentId, pickUniqueEnrollmentId } = await import('../../src/operations/enrolment-id.js');

const FIXED_NOW = new Date('2026-10-16T06:00:00.000Z');

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(FIXED_NOW);
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

interface Captured {
  usersCreated: Array<Record<string, unknown>>;
  enrolCreated: Array<Record<string, unknown>>;
  appUpdates: Array<Record<string, unknown>>;
  txUsed: boolean;
}

function makeApproveService(opts: { existingStudent?: { id: number; name: string; user_email: string } | null; takenIds?: string[]; app?: Record<string, unknown> }) {
  const captured: Captured = { usersCreated: [], enrolCreated: [], appUpdates: [], txUsed: false };
  const app = {
    id: 610,
    stage: 'approval_waiting',
    name: 'New Student',
    user_email: 'new.student@example.com',
    phone: '9800000001',
    course_id: 16,
    biography: null,
    verification: JSON.stringify({ verified: ['basic', 'qualification', 'documents'] }),
    payment_plan: null,
    payment_status: null,
    payment_marked_paid_at: null,
    enrollment_status: null,
    mode_of_study: null,
    ...opts.app,
  };
  const tx = {
    users: {
      // nextStudentCode scans every TTS code for the max.
      findMany: () => Promise.resolve([{ student_id: 'TTS0124' }, { student_id: 'TTS0131' }, { student_id: 'TTS0009' }]),
      create: ({ data }: { data: Record<string, unknown> }) => {
        captured.usersCreated.push(data);
        return Promise.resolve({ id: 777, name: data.name, user_email: data.user_email });
      },
    },
    enrol: {
      findFirst: () => Promise.resolve(null),
      findMany: () => Promise.resolve((opts.takenIds ?? []).map((enrollment_id) => ({ enrollment_id }))),
      create: ({ data }: { data: Record<string, unknown> }) => { captured.enrolCreated.push(data); return Promise.resolve({ id: 1 }); },
    },
    applications: {
      update: ({ data }: { data: Record<string, unknown> }) => { captured.appUpdates.push(data); return Promise.resolve({ id: app.id }); },
    },
  };
  const prisma = {
    applications: { findFirst: () => Promise.resolve(app) },
    users: { findFirst: () => Promise.resolve(opts.existingStudent ?? null) },
    $transaction: (fn: (t: typeof tx) => Promise<unknown>) => { captured.txUsed = true; return fn(tx); },
  } as unknown as PrismaClient;
  const service = new OperationsService(prisma);
  vi.spyOn(service, 'recordEvent').mockResolvedValue();
  vi.spyOn(service as unknown as { notifyApplicationEvent: () => Promise<void> }, 'notifyApplicationEvent').mockResolvedValue();
  vi.spyOn(service, 'renderApplicationFormPdf').mockResolvedValue({ status: 0, message: 'skipped in test' } as never);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  return { service, captured };
}

describe('Admin Approve & Enrol creates a complete student', () => {
  test('a new student gets the next TTS code, actor fields and course, in one transaction', async () => {
    const { service, captured } = makeApproveService({});
    const res = await service.adminApproveApplication('1', '610');
    expect(res.status).toBe(1);
    expect(captured.txUsed).toBe(true);
    expect(captured.usersCreated).toHaveLength(1);
    expect(captured.usersCreated[0]).toMatchObject({
      student_id: 'TTS0132',
      name: 'New Student',
      user_email: 'new.student@example.com',
      email: 'new.student@example.com',
      phone: '9800000001',
      password: 'hashed-secret',
      role_id: 2,
      status: 1,
      application_id: 610,
      course_id: 16,
      created_by: 1,
      updated_by: 1,
    });
    expect(captured.enrolCreated).toHaveLength(1);
    expect(captured.enrolCreated[0]).toMatchObject({
      user_id: 777,
      course_id: 16,
      enrollment_id: 'TIDMTT26100777',
      enrollment_date: '2026-10-16',
      enrollment_status: 'Active',
      mode_of_study: 'Online',
      created_by: 1,
      updated_by: 1,
    });
    expect(captured.appUpdates[0]).toMatchObject({ stage: 'enrolled', student_id: 777, is_converted: 1 });
  });

  test("the application's own enrolment status and mode of study are kept, like convertApplication", async () => {
    const { service, captured } = makeApproveService({ app: { enrollment_status: 'Active', mode_of_study: 'Offline' } });
    await service.adminApproveApplication('8', '610');
    expect(captured.enrolCreated[0]).toMatchObject({ enrollment_status: 'Active', mode_of_study: 'Offline', created_by: 8 });
  });

  test('an existing student is reused untouched and a same-month second course gets a unique id', async () => {
    const { service, captured } = makeApproveService({
      existingStudent: { id: 353, name: 'Ansy Mol V K', user_email: 'ansy@example.com' },
      takenIds: ['TIDMTT26100353'],
    });
    const res = await service.adminApproveApplication('1', '610');
    expect(res.status).toBe(1);
    expect(captured.usersCreated).toHaveLength(0);
    expect(captured.enrolCreated[0]).toMatchObject({
      user_id: 353,
      enrollment_id: 'TIDMTT26100353-2',
      enrollment_status: 'Active',
      mode_of_study: 'Online',
      created_by: 1,
    });
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
