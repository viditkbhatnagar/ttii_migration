import { describe, expect, test } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import {
  StudentDirectoryService,
  buildStudentDirectoryExtras,
  istYmd,
  normalizeStudentGender,
} from '../../src/operations/student-directory-service.js';

// Admin → Students (Naji's design): Gender / City / Offering / Owner / Joined
// per student, resolved like the Student View.

describe('normalizeStudentGender', () => {
  test('maps the legacy numeric codes and tidies the case', () => {
    expect(normalizeStudentGender('1')).toBe('Male');
    expect(normalizeStudentGender('2')).toBe('Female');
    expect(normalizeStudentGender('3')).toBe('Other');
    expect(normalizeStudentGender('FEMALE')).toBe('Female');
    expect(normalizeStudentGender('  ')).toBe('');
    expect(normalizeStudentGender(null)).toBe('');
  });
});

describe('istYmd', () => {
  test('reads the stored instant as the IST calendar day', () => {
    // 20:00 UTC on 1 Sep is 01:30 IST on 2 Sep.
    expect(istYmd(new Date('2026-09-01T20:00:00Z'))).toBe('2026-09-02');
    expect(istYmd(new Date('2026-09-01T10:00:00Z'))).toBe('2026-09-01');
    expect(istYmd(null)).toBe('');
  });
});

describe('buildStudentDirectoryExtras', () => {
  const base = {
    applications: [{ id: 50, gender: 'Female', district: 'Kochi', pipeline_user: 9, offering_id: 3 }],
    details: [
      { user_id: 2, gender: 'Male', district: 'Pune' },
      { user_id: 2, gender: 'Female', district: 'Older row' },
    ],
    offerings: [{ id: 3, title: '', offering_code: 'DMT-MAY26' }],
    owners: [{ id: 9, name: 'Asha (Counsellor)' }, { id: 12, name: 'Ravi' }],
  };

  test('prefers the user row, then the application, then the latest user_details row', () => {
    const rows = buildStudentDirectoryExtras({
      ...base,
      users: [
        { id: 1, gender: '', created_at: null, application_id: 50, counsellor_id: 12 },
        { id: 2, gender: '1', created_at: null, application_id: 0, counsellor_id: null },
      ],
    });
    expect(rows[0]).toMatchObject({ id: '1', gender: 'Female', city: 'Kochi', offering: 'DMT-MAY26', owner: 'Asha (Counsellor)' });
    expect(rows[1]).toMatchObject({ id: '2', gender: 'Male', city: 'Pune', offering: '', owner: '' });
  });

  test('falls back to the counsellor when the application has no pipeline user', () => {
    const rows = buildStudentDirectoryExtras({
      ...base,
      applications: [{ id: 50, gender: null, district: null, pipeline_user: null, offering_id: null }],
      users: [{ id: 1, gender: 'male', created_at: new Date('2026-01-05T04:00:00Z'), application_id: 50, counsellor_id: 12 }],
    });
    expect(rows[0]).toEqual({ id: '1', gender: 'Male', city: '', offering: '', owner: 'Ravi', joined: '2026-01-05' });
  });
});

describe('StudentDirectoryService.extras', () => {
  test('reads only live students and batches every lookup', async () => {
    const calls: string[] = [];
    const prisma = {
      users: {
        findMany: (args: { where: Record<string, unknown> }) => {
          calls.push(`users:${JSON.stringify(args.where)}`);
          if ('role_id' in args.where) {
            return Promise.resolve([{ id: 1, gender: '', created_at: null, application_id: 50, counsellor_id: null }]);
          }
          return Promise.resolve([{ id: 9, name: 'Asha' }]);
        },
      },
      applications: { findMany: () => { calls.push('applications'); return Promise.resolve([{ id: 50, gender: 'Female', district: 'Kochi', pipeline_user: 9, offering_id: null }]); } },
      user_details: { findMany: () => { calls.push('user_details'); return Promise.resolve([]); } },
      offerings: { findMany: () => { calls.push('offerings'); return Promise.resolve([]); } },
    };
    const rows = await new StudentDirectoryService(prisma as unknown as PrismaClient).extras();
    expect(rows).toEqual([{ id: '1', gender: 'Female', city: 'Kochi', offering: '', owner: 'Asha', joined: '' }]);
    expect(calls[0]).toBe('users:{"deleted_at":null,"role_id":2}');
    // No offering ids → no offerings query.
    expect(calls).not.toContain('offerings');
  });
});
