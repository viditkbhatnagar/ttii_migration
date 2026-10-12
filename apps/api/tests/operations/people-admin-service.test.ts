import { describe, expect, test, vi } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import {
  PeopleAdminService,
  SUMMARY_ROLE_IDS,
  buildRoleCounts,
  displayEmail,
  joinPhone,
} from '../../src/operations/people-admin-service.js';

// Admin → Instructors / Admin Users / Roles (Naji's design): read-only side-cars.

describe('buildRoleCounts', () => {
  test('one row per summary role, zeros for roles nobody holds', () => {
    const rows = buildRoleCounts(
      [{ role_id: 1, _count: { id: 2 } }, { role_id: 3, _count: { id: 13 } }, { role_id: 99, _count: { id: 5 } }],
      [{ role_id: 3, _count: { id: 4 } }],
    );
    expect(rows.map((r) => r.roleId)).toEqual([...SUMMARY_ROLE_IDS]);
    expect(rows.find((r) => r.roleId === 1)).toEqual({ roleId: 1, total: 2, disabled: 0 });
    expect(rows.find((r) => r.roleId === 3)).toEqual({ roleId: 3, total: 13, disabled: 4 });
    expect(rows.find((r) => r.roleId === 8)).toEqual({ roleId: 8, total: 0, disabled: 0 });
  });
});

describe('displayEmail', () => {
  test('prefers user_email; legacy email column only when it is an email', () => {
    expect(displayEmail(' a@x.in ', 'b@x.in')).toBe('a@x.in');
    expect(displayEmail('', 'b@x.in')).toBe('b@x.in');
    expect(displayEmail(null, '919544125503')).toBe('');
  });
});

describe('joinPhone', () => {
  test('keeps a number that already carries its code, otherwise prefixes the stored code', () => {
    expect(joinPhone('91', '+91 9876543210')).toBe('+91 9876543210');
    expect(joinPhone('+971', '501234567')).toBe('+971 501234567');
    expect(joinPhone(null, '9876543210')).toBe('9876543210');
    expect(joinPhone('91', '  ')).toBe('');
  });
});

describe('PeopleAdminService', () => {
  test('lastSignIns keys the newest session per Super Admin / Admin', async () => {
    const groupBy = vi.fn().mockResolvedValue([
      { user_id: 5, _max: { created_at: new Date('2026-10-10T04:30:00Z') } },
      { user_id: 6, _max: { created_at: null } },
    ]);
    const findMany = vi.fn().mockResolvedValue([{ id: 5 }, { id: 6 }]);
    const prisma = { users: { findMany }, auth_session: { groupBy } } as unknown as PrismaClient;
    const out = await new PeopleAdminService(prisma).lastSignIns();
    expect(findMany.mock.calls[0]?.[0]).toMatchObject({ where: { deleted_at: null, role_id: { in: [1, 8] } } });
    expect(out).toEqual({ '5': '2026-10-10T04:30:00.000Z' });
  });

  test('instructorOverview refuses a bad id and a non-instructor without loading anything else', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const prisma = { users: { findFirst } } as unknown as PrismaClient;
    const svc = new PeopleAdminService(prisma);
    expect(await svc.instructorOverview(0)).toBeNull();
    expect(findFirst).not.toHaveBeenCalled();
    expect(await svc.instructorOverview(42)).toBeNull();
    expect(findFirst.mock.calls[0]?.[0]).toMatchObject({ where: { id: 42, role_id: 3, deleted_at: null } });
  });

  test('instructorOverview returns the profile with cohort data and drops join URLs', async () => {
    const user = {
      id: 42, name: ' Nayana R ', user_email: 'nayana@x.in', email: '919800000000', phone: '9847012345', country_code: '91',
      whatsapp_phone: null, whatsapp_code: null, highest_qualification: 'M.Sc', qualification: null,
      biography: '<p>Hi</p>', image: '', profile_picture: 'p.png', status: 1, disabled_at: null,
      created_at: new Date('2024-05-20T10:00:00Z'),
    };
    const prisma = {
      users: { findFirst: vi.fn().mockResolvedValue(user) },
      cohorts: { findMany: vi.fn().mockResolvedValue([]) },
    } as unknown as PrismaClient;
    const out = await new PeopleAdminService(prisma).instructorOverview(42);
    expect(out?.profile).toEqual({
      id: 42, name: 'Nayana R', email: 'nayana@x.in', phone: '+91 9847012345', whatsapp: '', qualification: 'M.Sc',
      biography: '<p>Hi</p>', image: 'p.png', status: 1, disabled: false, createdAt: '2024-05-20T10:00:00.000Z',
    });
    expect(out?.cohorts).toEqual([]);
    expect(out?.liveClasses).toEqual([]);
    expect(out?.assignments).toEqual([]);
  });
});
