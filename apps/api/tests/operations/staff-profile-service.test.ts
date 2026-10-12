import { describe, expect, test } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import {
  StaffProfileNotFoundError,
  StaffProfileService,
  buildStaffProfile,
  istMonthKeys,
  type StaffAppRow,
} from '../../src/operations/staff-profile-service.js';

// Counsellor / Associate profile (Naji's design): applications, converted
// students, trend and activity for one person — read-only.

const NOW = new Date('2026-10-12T06:00:00Z');

function app(over: Partial<StaffAppRow>): StaffAppRow {
  return {
    id: 1, application_id: null, name: 'Asha', phone: '9876543210', email: 'a@x.in', course_id: 5,
    stage: 'lead', is_converted: 0, enrollment_status: 'Active', payment_status: null, student_id: null,
    created_at: new Date('2026-10-01T05:00:00Z'), converted_at: null,
    ...over,
  };
}

describe('istMonthKeys', () => {
  test('ends with the IST month of now, oldest first', () => {
    expect(istMonthKeys(NOW, 3)).toEqual(['2026-08', '2026-09', '2026-10']);
    // 31 Oct 20:00 UTC is already 1 Nov in IST.
    expect(istMonthKeys(new Date('2026-10-31T20:00:00Z'), 2)).toEqual(['2026-10', '2026-11']);
    expect(istMonthKeys(new Date('2026-01-15T00:00:00Z'), 2)).toEqual(['2025-12', '2026-01']);
  });
});

describe('buildStaffProfile', () => {
  test('counts enrolled by stage OR is_converted, rejected, and the rest as pending', () => {
    const p = buildStaffProfile({
      apps: [
        app({ id: 1, stage: 'enrolled' }),
        app({ id: 2, stage: 'paid', is_converted: 1 }),
        app({ id: 3, stage: 'rejected' }),
        app({ id: 4, stage: 'form_sent' }),
        app({ id: 5, stage: null }),
      ],
      courses: [{ id: 5, title: 'Montessori' }],
      events: [],
      dropouts: 2,
      now: NOW,
    });
    expect(p.kpis).toEqual({ applications: 5, pending: 2, enrolled: 2, rejected: 1, dropouts: 2 });
    expect(p.applications.map((a) => a.enrolled)).toEqual([true, true, false, false, false]);
    expect(p.applications[4]?.stage).toBe('lead');
    expect(p.applications[0]?.course).toBe('Montessori');
  });

  test('labels missing ids and courses, and keeps enrolment fields for enrolled rows only', () => {
    const p = buildStaffProfile({
      apps: [
        app({ id: 9, application_id: ' ', course_id: 77, enrollment_status: 'Active', converted_at: new Date('2026-09-30T20:00:00Z') }),
        app({ id: 10, application_id: 'TTA001', stage: 'enrolled', student_id: 42, converted_at: new Date('2026-09-30T20:00:00Z') }),
      ],
      courses: [],
      events: [],
      dropouts: 0,
      now: NOW,
    });
    expect(p.applications[0]).toMatchObject({ applicationId: '#9', course: 'Course #77', enrollmentStatus: '', converted: '' });
    expect(p.applications[1]).toMatchObject({ applicationId: 'TTA001', studentId: '42', enrollmentStatus: 'Active', converted: '2026-10-01' });
  });

  test('buckets applications by IST created day and enrolments by converted day', () => {
    const p = buildStaffProfile({
      apps: [
        // Created 30 Sep 20:00 UTC = 1 Oct IST; converted in October.
        app({ id: 1, created_at: new Date('2026-09-30T20:00:00Z'), stage: 'enrolled', converted_at: new Date('2026-10-05T10:00:00Z') }),
        // Created in August, converted in September.
        app({ id: 2, created_at: new Date('2026-08-10T10:00:00Z'), is_converted: 1, converted_at: new Date('2026-09-02T10:00:00Z') }),
        // Enrolled with no converted_at → falls back to created_at.
        app({ id: 3, created_at: new Date('2026-09-15T10:00:00Z'), stage: 'enrolled' }),
        // Older than the 12-month window: ignored by the trend.
        app({ id: 4, created_at: new Date('2025-01-10T10:00:00Z') }),
      ],
      courses: [],
      events: [],
      dropouts: 0,
      now: NOW,
    });
    expect(p.trend).toHaveLength(12);
    const byMonth = Object.fromEntries(p.trend.map((t) => [t.month, [t.applications, t.enrollments]]));
    expect(byMonth['2026-10']).toEqual([1, 1]);
    expect(byMonth['2026-09']).toEqual([1, 2]);
    expect(byMonth['2026-08']).toEqual([1, 0]);
    expect(p.trend[11]?.label).toBe('Oct 26');
  });

  test('maps activity to the student name', () => {
    const p = buildStaffProfile({
      apps: [app({ id: 7, name: ' Ravi ' })],
      courses: [],
      events: [{ id: 3, application_id: 7, event_type: 'link_sent', description: '', created_at: new Date('2026-10-02T04:00:00Z') }],
      dropouts: 0,
      now: NOW,
    });
    expect(p.activity).toEqual([{ id: '3', type: 'link_sent', title: 'link_sent', student: 'Ravi', at: '2026-10-02T04:00:00.000Z' }]);
  });
});

describe('StaffProfileService', () => {
  function stub(person: unknown, apps: unknown[] = []) {
    const calls: Array<{ model: string; args: Record<string, unknown> }> = [];
    const rec = (model: string, result: unknown) => (args: Record<string, unknown>) => {
      calls.push({ model, args });
      return Promise.resolve(result);
    };
    const prisma = {
      users: { findFirst: rec('users.findFirst', person), count: rec('users.count', 0) },
      applications: { findMany: rec('applications', apps) },
      course: { findMany: rec('course', []) },
      application_events: { findMany: rec('events', []) },
    };
    return { service: new StaffProfileService(prisma as unknown as PrismaClient), calls };
  }

  test('refuses a user who is not a live person of that role', async () => {
    const { service, calls } = stub(null);
    await expect(service.profile(5, 9, NOW)).rejects.toBeInstanceOf(StaffProfileNotFoundError);
    expect(calls[0]?.args.where).toEqual({ id: 5, role_id: 9, deleted_at: null });
    await expect(service.profile(0, 10, NOW)).rejects.toThrow('Associate not found.');
  });

  test('reads only the person\'s live applications and skips empty lookups', async () => {
    const { service, calls } = stub({ id: 5 });
    const p = await service.profile(5, 9, NOW);
    expect(p.kpis.applications).toBe(0);
    const appsCall = calls.find((c) => c.model === 'applications');
    expect(appsCall?.args.where).toEqual({ pipeline_user: 5, deleted_at: null });
    expect(calls.some((c) => c.model === 'course' || c.model === 'events')).toBe(false);
  });
});
