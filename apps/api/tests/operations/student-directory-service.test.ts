import { describe, expect, test } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import {
  StudentDirectoryService,
  buildStudentDirectoryExtras,
  istYmd,
  normalizeStudentGender,
} from '../../src/operations/student-directory-service.js';

// Admin → Students (Naji's design): Gender / City / Offering / Owner / Joined
// per student, derived exactly as the Student View (getStudentDetail) does.

describe('normalizeStudentGender', () => {
  test('maps the legacy numeric codes and otherwise shows the value as stored', () => {
    expect(normalizeStudentGender('1')).toBe('Male');
    expect(normalizeStudentGender('2')).toBe('Female');
    expect(normalizeStudentGender('3')).toBe('Other');
    expect(normalizeStudentGender(' FEMALE ')).toBe('FEMALE');
    expect(normalizeStudentGender('  ')).toBe('');
    expect(normalizeStudentGender(null)).toBe('');
  });
});

describe('istYmd', () => {
  test('reads the stored instant as the IST calendar day', () => {
    expect(istYmd(new Date('2026-09-01T20:00:00Z'))).toBe('2026-09-02');
    expect(istYmd(new Date('2026-09-01T10:00:00Z'))).toBe('2026-09-01');
    expect(istYmd(null)).toBe('');
  });
});

const app = (over: Record<string, unknown>) => ({ id: 50, user_email: 'a@x.in', gender: null, district: null, pipeline_user: null, offering_id: null, ...over });
const user = (over: Record<string, unknown>) => ({ id: 1, gender: '', created_at: null, application_id: 0, user_email: null, ...over });

describe('buildStudentDirectoryExtras', () => {
  const owners = [{ id: 9, name: 'Asha' }, { id: 12, name: 'Ravi' }];

  test('application by id: gender falls back user → application → details; city keeps ?? semantics', () => {
    const [row] = buildStudentDirectoryExtras({
      users: [user({ application_id: 50 })],
      applicationsById: [app({ gender: 'female', district: '', pipeline_user: 9, offering_id: 3 })],
      applicationsByEmail: [],
      details: [{ user_id: 1, gender: 'Male', district: 'Pune', pipeline_user: 12 }],
      offerings: [{ id: 3, title: '', offering_code: 'DMT-MAY26' }],
      owners,
    });
    // '' district on the application is kept (?? does not skip empty strings).
    expect(row).toEqual({ id: '1', gender: 'female', city: '', offering: 'DMT-MAY26', owner: 'Asha', joined: '' });
  });

  test('no application_id: the newest live application with the same email', () => {
    const [row] = buildStudentDirectoryExtras({
      users: [user({ user_email: 'A@x.in' })],
      applicationsById: [],
      applicationsByEmail: [app({ id: 61, district: 'Kochi' }), app({ id: 60, district: 'Older' })],
      details: [],
      offerings: [],
      owners,
    });
    expect(row?.city).toBe('Kochi');
  });

  test('a set application_id that is deleted does NOT fall back to the email match', () => {
    const [row] = buildStudentDirectoryExtras({
      users: [user({ application_id: 50, user_email: 'a@x.in' })],
      applicationsById: [],
      applicationsByEmail: [app({ id: 61, district: 'Kochi', pipeline_user: 9 })],
      details: [{ user_id: 1, gender: '2', district: 'Pune', pipeline_user: 12 }],
      offerings: [],
      owners,
    });
    expect(row).toMatchObject({ gender: 'Female', city: 'Pune', owner: 'Ravi' });
  });

  test('owner falls back to user_details.pipeline_user, never to anything else', () => {
    const [row] = buildStudentDirectoryExtras({
      users: [user({ application_id: 50 })],
      applicationsById: [app({ pipeline_user: null })],
      applicationsByEmail: [],
      details: [{ user_id: 1, gender: null, district: null, pipeline_user: 12 }, { user_id: 1, gender: null, district: null, pipeline_user: 9 }],
      offerings: [],
      owners,
    });
    expect(row?.owner).toBe('Ravi');
  });
});

describe('StudentDirectoryService.extras', () => {
  test('reads live rows only and batches the email fallback in one query', async () => {
    const calls: Array<{ model: string; where: Record<string, unknown> }> = [];
    const prisma = {
      users: {
        findMany: (args: { where: Record<string, unknown> }) => {
          calls.push({ model: 'users', where: args.where });
          if ('role_id' in args.where) {
            return Promise.resolve([
              user({ id: 1, application_id: 50 }),
              user({ id: 2, user_email: 'b@x.in' }),
              user({ id: 3, user_email: 'c@x.in' }),
            ]);
          }
          return Promise.resolve([{ id: 9, name: 'Asha' }]);
        },
      },
      applications: {
        findMany: (args: { where: Record<string, unknown> }) => {
          calls.push({ model: 'applications', where: args.where });
          return Promise.resolve('id' in args.where
            ? [app({ id: 50, district: 'Kochi', pipeline_user: 9 })]
            : [app({ id: 70, user_email: 'c@x.in', district: 'Delhi' })]);
        },
      },
      user_details: { findMany: () => Promise.resolve([]) },
      offerings: { findMany: () => { calls.push({ model: 'offerings', where: {} }); return Promise.resolve([]); } },
    };
    const rows = await new StudentDirectoryService(prisma as unknown as PrismaClient).extras();
    expect(rows.map((r) => [r.id, r.city, r.owner])).toEqual([['1', 'Kochi', 'Asha'], ['2', '', ''], ['3', 'Delhi', '']]);

    const appCalls = calls.filter((c) => c.model === 'applications');
    expect(appCalls).toHaveLength(2);
    for (const c of appCalls) expect(c.where.deleted_at).toBeNull();
    expect(appCalls.find((c) => 'user_email' in c.where)!.where.user_email).toEqual({ in: ['b@x.in', 'c@x.in'] });
    expect(calls[0]!.where).toEqual({ deleted_at: null, role_id: 2 });
    expect(calls.some((c) => c.model === 'offerings')).toBe(false);
  });
});
