import { describe, expect, test, vi } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import {
  buildTopPerformers, classifyApplication, conversionPct, countByOwner, displayEmail, istMonthWindow,
  istYmd, tabCounts, toPositiveInt, trendMonthWhere, trendMonths,
} from '../../src/operations/associate-admin-model.js';
import { AssociateAdminService, STUDENT_EXPORT_CAP, tabWhere } from '../../src/operations/associate-admin-service.js';
import { SIGN_IN_EVENTS } from '../../src/operations/people-admin-service.js';

// Admin → Associate Management (Naji's design): Dashboard, Associate Students,
// Onboarding and the Commissions basis. Read-only, scoped by pipeline_user.

const NOW = new Date('2026-10-12T06:00:00Z'); // 11:30 IST, 12 Oct 2026

describe('associate-admin-model', () => {
  test('istYmd shifts to the IST calendar day', () => {
    expect(istYmd(new Date('2026-09-30T19:00:00Z'))).toBe('2026-10-01');
    expect(istYmd(new Date('2026-09-30T18:00:00Z'))).toBe('2026-09-30');
    expect(istYmd(null)).toBe('');
  });

  test('istMonthWindow is IST midnight on the 1st through the next 1st', () => {
    expect(istMonthWindow('2026-10')).toEqual({
      gte: new Date('2026-09-30T18:30:00.000Z'),
      lt: new Date('2026-10-31T18:30:00.000Z'),
    });
    expect(istMonthWindow('2026-12')?.lt).toEqual(new Date('2026-12-31T18:30:00.000Z'));
    expect(istMonthWindow('2026-13')).toBeNull();
    expect(istMonthWindow('bad')).toBeNull();
  });

  test('classifyApplication: converted wins; blank stage is a lead; rejected; everything else applied', () => {
    expect(classifyApplication('approval_waiting', 1)).toBe('enrolled');
    expect(classifyApplication(null, 0)).toBe('lead');
    expect(classifyApplication('', null)).toBe('lead');
    expect(classifyApplication('lead', 0)).toBe('lead');
    expect(classifyApplication('rejected', 0)).toBe('rejected');
    expect(classifyApplication('payment_pending', 0)).toBe('applied');
    // stage 'enrolled' without is_converted is NOT an enrolment (directory rule).
    expect(classifyApplication('enrolled', 0)).toBe('applied');
  });

  test('tabCounts sums grouped counts into the tabs', () => {
    expect(tabCounts([
      { stage: 'lead', is_converted: 0, count: 4 },
      { stage: null, is_converted: 0, count: 1 },
      { stage: 'paid', is_converted: 0, count: 2 },
      { stage: 'approval_waiting', is_converted: 1, count: 3 },
      { stage: 'rejected', is_converted: 0, count: 1 },
    ])).toEqual({ all: 11, lead: 5, applied: 2, enrolled: 3, rejected: 1 });
  });

  test('trendMonths: six IST months, oldest first, with IST-midnight windows', () => {
    const months = trendMonths(NOW);
    expect(months.map((t) => t.month)).toEqual(['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']);
    expect(months[5]).toEqual({
      month: '2026-10', label: 'Oct 26', gte: new Date('2026-09-30T18:30:00.000Z'), lt: new Date('2026-10-31T18:30:00.000Z'),
    });
  });

  test('trendMonthWhere: leads by created_at; enrolments by converted_at, else created_at', () => {
    const m = trendMonths(NOW)[5]!;
    const window = { gte: m.gte, lt: m.lt };
    expect(trendMonthWhere(m)).toEqual({
      leads: { created_at: window },
      enrolments: { is_converted: 1, OR: [{ converted_at: window }, { converted_at: null, created_at: window }] },
    });
  });

  test('buildTopPerformers: only people with leads, most enrolments first, then conversion', () => {
    const top = buildTopPerformers(
      [{ id: 1, name: 'Asha', photo: '' }, { id: 2, name: 'Binu', photo: '' }, { id: 3, name: 'Chitra', photo: '' }, { id: 4, name: 'Dev', photo: '' }],
      new Map([[1, 10], [2, 4], [3, 8]]),
      new Map([[1, 2], [2, 2], [3, 5]]),
    );
    expect(top.map((p) => p.id)).toEqual([3, 2, 1]);
    expect(top[1]).toMatchObject({ applications: 4, enrolled: 2, conversion: 50 });
  });

  test('small helpers', () => {
    expect(conversionPct(1, 3)).toBe(33);
    expect(conversionPct(0, 0)).toBe(0);
    expect(countByOwner([{ pipeline_user: 7, _count: { id: 3 } }, { pipeline_user: null, _count: { id: 9 } }])).toEqual(new Map([[7, 3]]));
    expect(displayEmail('', '919800000000')).toBe('');
    expect(displayEmail(' a@x.in ', null)).toBe('a@x.in');
    expect(toPositiveInt('12')).toBe(12);
    expect(toPositiveInt(' 0 ')).toBe(0);
    expect(toPositiveInt('1.5')).toBe(0);
    expect(toPositiveInt(undefined)).toBe(0);
  });
});

describe('tabWhere', () => {
  test('enrolled is is_converted = 1; the others exclude converted rows (nulls included)', () => {
    expect(tabWhere('enrolled')).toEqual({ is_converted: 1 });
    expect(tabWhere('all')).toEqual({});
    expect(JSON.stringify(tabWhere('lead'))).toContain('"is_converted":null');
    expect(JSON.stringify(tabWhere('rejected'))).toContain('"stage":"rejected"');
  });
});

const ASSOCIATES = [
  { id: 21, name: 'Asha', status: 1, image: 'uploads/a.png', profile_picture: '' },
  { id: 22, name: 'Binu', status: 0, image: '', profile_picture: '' },
];

describe('AssociateAdminService.dashboard', () => {
  test('KPIs, trend and top performers from pipeline_user-scoped applications', async () => {
    const groupBy = vi.fn()
      .mockResolvedValueOnce([{ pipeline_user: 21, _count: { id: 5 } }, { pipeline_user: 22, _count: { id: 2 } }])
      .mockResolvedValueOnce([{ pipeline_user: 21, _count: { id: 2 } }]);
    // count() is called per month as (leads, enrolments); October is the last pair.
    const count = vi.fn().mockImplementation((args: { where: { AND: Array<Record<string, unknown>> } }) => {
      const cond = args.where.AND[1] ?? {};
      const oct = JSON.stringify(cond).includes('"gte":"2026-09-30T18:30:00.000Z"');
      if (!oct) return Promise.resolve(0);
      return Promise.resolve('is_converted' in cond ? 1 : 2);
    });
    const findMany = vi.fn();
    const prisma = {
      users: { findMany: vi.fn().mockResolvedValue(ASSOCIATES) },
      applications: { groupBy, count, findMany },
    } as unknown as PrismaClient;
    const out = await new AssociateAdminService(prisma).dashboard(NOW);
    expect(out.kpis).toEqual({ total: 2, active: 1, leadsThisMonth: 2, enrolments: 2, enrolmentsThisMonth: 1 });
    expect(groupBy.mock.calls[0]?.[0]).toMatchObject({ where: { pipeline_user: { in: [21, 22] }, deleted_at: null } });
    expect(groupBy.mock.calls[1]?.[0]).toMatchObject({ where: { is_converted: 1 } });
    // Aggregated in the database: 2 counts per month, no application rows loaded.
    expect(count).toHaveBeenCalledTimes(12);
    expect(findMany).not.toHaveBeenCalled();
    expect((count.mock.calls[0]?.[0] as { where: { AND: unknown[] } }).where.AND[0]).toEqual({ pipeline_user: { in: [21, 22] }, deleted_at: null });
    expect(out.trend).toHaveLength(6);
    expect(out.trend[5]).toEqual({ month: '2026-10', label: 'Oct 26', leads: 2, enrolments: 1 });
    expect(out.top.map((t) => t.id)).toEqual([21, 22]);
    expect(out.top[0]).toMatchObject({ conversion: 40, photo: 'https://lms.teachersindia.in/uploads/a.png' });
  });

  test('no associates → zeros, no application reads', async () => {
    const groupBy = vi.fn();
    const prisma = { users: { findMany: vi.fn().mockResolvedValue([]) }, applications: { groupBy } } as unknown as PrismaClient;
    const out = await new AssociateAdminService(prisma).dashboard(NOW);
    expect(out.kpis.total).toBe(0);
    expect(out.top).toEqual([]);
    expect(groupBy).not.toHaveBeenCalled();
  });
});

function studentsPrisma(apps: unknown[] = []) {
  const findMany = vi.fn().mockResolvedValue(apps);
  const count = vi.fn().mockResolvedValue(apps.length);
  const groupBy = vi.fn()
    .mockResolvedValueOnce([{ stage: 'lead', is_converted: 0, _count: { id: 3 } }, { stage: 'paid', is_converted: 1, _count: { id: 1 } }])
    .mockResolvedValueOnce([{ course_id: 9, _count: { id: 4 } }]);
  const prisma = {
    users: { findMany: vi.fn().mockResolvedValue(ASSOCIATES) },
    applications: { findMany, count, groupBy },
    course: { findMany: vi.fn().mockResolvedValue([{ id: 9, title: ' Diploma ' }]) },
  } as unknown as PrismaClient;
  return { prisma, findMany, count, groupBy };
}

describe('AssociateAdminService.students', () => {
  test('maps rows, counts tabs and pages server-side', async () => {
    const { prisma, findMany } = studentsPrisma([{
      id: 501, application_id: 'APP-501', name: ' Riya ', phone: '9800000000', email: '9800000000', user_email: 'riya@x.in',
      pipeline_user: 21, course_id: 9, stage: 'paid', is_converted: 1, enrollment_status: 'Active',
      created_at: new Date('2026-09-30T19:00:00Z'), converted_at: new Date('2026-10-02T05:00:00Z'),
      application_final_fee: '45000.00', payment_status: 'paid', student_id: 77,
    }]);
    const out = await new AssociateAdminService(prisma).students({ tab: 'enrolled', page: 2, pageSize: 10 });
    expect(out.rows[0]).toEqual({
      id: 501, applicationId: 'APP-501', name: 'Riya', phone: '9800000000', email: 'riya@x.in', associateId: 21,
      associateName: 'Asha', course: 'Diploma', stage: 'paid', enrolled: true, enrollmentStatus: 'Active',
      leadDate: '2026-10-01', enrolledDate: '2026-10-02', fee: 45000, paymentStatus: 'paid', studentUserId: 77,
    });
    expect(out.counts).toEqual({ all: 4, lead: 3, applied: 0, enrolled: 1, rejected: 0 });
    expect(out.options.courses).toEqual([{ id: 9, title: 'Diploma' }]);
    expect(out.options.associates).toEqual([{ id: 21, name: 'Asha' }, { id: 22, name: 'Binu' }]);
    const args = findMany.mock.calls[0]?.[0] as { skip: number; take: number; where: { AND: unknown[] } };
    expect(args.skip).toBe(10);
    expect(args.take).toBe(10);
    expect(args.where.AND).toContainEqual({ deleted_at: null, pipeline_user: { in: [21, 22] } });
    expect(args.where.AND).toContainEqual({ is_converted: 1 });
  });

  test('associate / course / month / search filters narrow the query; export takes the cap', async () => {
    const { prisma, findMany } = studentsPrisma();
    await new AssociateAdminService(prisma).students({ associateId: 22, courseId: 9, month: '2026-10', search: 'riya', all: true });
    const args = findMany.mock.calls[0]?.[0] as { skip: number; take: number; where: { AND: unknown[] } };
    expect(args.take).toBe(STUDENT_EXPORT_CAP);
    expect(args.skip).toBe(0);
    expect(args.where.AND).toContainEqual({ deleted_at: null, pipeline_user: 22 });
    expect(args.where.AND).toContainEqual({ course_id: 9 });
    expect(args.where.AND).toContainEqual({ created_at: { gte: new Date('2026-09-30T18:30:00.000Z'), lt: new Date('2026-10-31T18:30:00.000Z') } });
    expect(JSON.stringify(args.where.AND)).toContain('"contains":"riya"');
  });

  test('monthBy enrolled filters on converted_at (the Commissions basis)', async () => {
    const { prisma, findMany } = studentsPrisma();
    await new AssociateAdminService(prisma).students({ tab: 'enrolled', month: '2026-10', monthBy: 'enrolled' });
    const args = findMany.mock.calls[0]?.[0] as { where: { AND: unknown[] } };
    expect(args.where.AND).toContainEqual({ converted_at: { gte: new Date('2026-09-30T18:30:00.000Z'), lt: new Date('2026-10-31T18:30:00.000Z') } });
  });

  test('an id that is not a live associate returns nothing rather than widening the scope', async () => {
    const { prisma, findMany } = studentsPrisma();
    const out = await new AssociateAdminService(prisma).students({ associateId: 999 });
    expect(out.rows).toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });
});

describe('AssociateAdminService.onboarding', () => {
  test('creation day, status and first / latest real sign-in per associate', async () => {
    const auditGroupBy = vi.fn().mockResolvedValue([
      { user_id: 21, _min: { created_at: new Date('2026-05-01T04:00:00Z') }, _max: { created_at: new Date('2026-10-10T04:00:00Z') } },
    ]);
    const prisma = {
      users: {
        findMany: vi.fn().mockResolvedValue([
          { id: 21, name: 'Asha', user_email: '', email: 'asha@x.in', phone: '98', centre_id: '4', status: 1, disabled_at: null, created_at: new Date('2026-04-30T20:00:00Z') },
          { id: 22, name: 'Binu', user_email: 'b@x.in', email: '', phone: '', centre_id: '', status: 0, disabled_at: new Date(), created_at: null },
        ]),
      },
      auth_audit_log: { groupBy: auditGroupBy },
      centres: { findMany: vi.fn().mockResolvedValue([{ id: 4, centre_name: 'Kochi' }]) },
    } as unknown as PrismaClient;
    const out = await new AssociateAdminService(prisma).onboarding();
    expect(out[0]).toEqual({
      id: 21, name: 'Asha', email: 'asha@x.in', phone: '98', centre: 'Kochi', createdAt: '2026-05-01', isActive: true,
      loginDisabled: false, firstSignIn: '2026-05-01T04:00:00.000Z', lastSignIn: '2026-10-10T04:00:00.000Z',
    });
    expect(out[1]).toMatchObject({ isActive: false, loginDisabled: true, firstSignIn: '', createdAt: '' });
    const where = (auditGroupBy.mock.calls[0] as [{ where: { event: { in: string[] }; success: number } }])[0].where;
    expect(where.event.in).toEqual([...SIGN_IN_EVENTS]);
    expect(where.success).toBe(1);
  });
});
