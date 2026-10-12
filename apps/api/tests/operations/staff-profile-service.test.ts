import { describe, expect, test } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import {
  STAFF_PROFILE_APPLICATION_LIMIT,
  StaffProfileNotFoundError,
  StaffProfileService,
  buildStaffProfile,
  istMonthKeys,
  trendWindowStart,
  type StaffAppRow,
} from '../../src/operations/staff-profile-service.js';

// Counsellor / Associate profile (Naji's design): applications, converted
// students, trend and activity for one person — read-only.

const NOW = new Date('2026-10-12T06:00:00Z');

function app(over: Partial<StaffAppRow>): StaffAppRow {
  return {
    id: 1, application_id: null, name: 'Asha', phone: '9876543210', email: 'a@x.in', course_id: 5,
    stage: 'lead', is_converted: 0, enrollment_status: 'Active', payment_status: null,
    created_at: new Date('2026-10-01T05:00:00Z'), converted_at: null,
    ...over,
  };
}

const base = { apps: [], stageCounts: [], courseCounts: [], trendRows: [], courses: [], events: [], eventNames: [], dropouts: 0, now: NOW };

describe('istMonthKeys / trendWindowStart', () => {
  test('ends with the IST month of now, oldest first', () => {
    expect(istMonthKeys(NOW, 3)).toEqual(['2026-08', '2026-09', '2026-10']);
    // 31 Oct 20:00 UTC is already 1 Nov in IST.
    expect(istMonthKeys(new Date('2026-10-31T20:00:00Z'), 2)).toEqual(['2026-10', '2026-11']);
    expect(istMonthKeys(new Date('2026-01-15T00:00:00Z'), 2)).toEqual(['2025-12', '2026-01']);
  });

  test('the window opens at IST midnight on the oldest month', () => {
    expect(trendWindowStart(NOW, 3).toISOString()).toBe('2026-07-31T18:30:00.000Z');
  });
});

describe('buildStaffProfile', () => {
  test('enrolled is is_converted = 1 only (the directory rule); rejected excludes converted rows', () => {
    const p = buildStaffProfile({
      ...base,
      stageCounts: [
        { stage: 'enrolled', is_converted: 0, count: 2 }, // stage alone does NOT count as enrolled
        { stage: 'paid', is_converted: 1, count: 3 },
        { stage: 'rejected', is_converted: 0, count: 1 },
        { stage: 'rejected', is_converted: 1, count: 1 },
        { stage: null, is_converted: null, count: 4 },
      ],
      dropouts: 2,
    });
    expect(p.kpis).toEqual({ applications: 11, pending: 6, enrolled: 4, rejected: 1, dropouts: 2 });
  });

  test('list rows: labels missing ids and courses; enrolment fields only for converted rows', () => {
    const p = buildStaffProfile({
      ...base,
      apps: [
        app({ id: 9, application_id: ' ', course_id: 77, stage: 'enrolled', converted_at: new Date('2026-09-30T20:00:00Z') }),
        app({ id: 10, application_id: 'TTA001', is_converted: 1, converted_at: new Date('2026-09-30T20:00:00Z') }),
        app({ id: 11, stage: null, course_id: 5 }),
      ],
      courses: [{ id: 5, title: 'Montessori' }],
    });
    expect(p.applications[0]).toMatchObject({ applicationId: '#9', course: 'Course #77', enrolled: false, enrollmentStatus: '', converted: '' });
    expect(p.applications[1]).toMatchObject({ applicationId: 'TTA001', enrolled: true, enrollmentStatus: 'Active', converted: '2026-10-01' });
    expect(p.applications[2]).toMatchObject({ stage: 'lead', course: 'Montessori' });
    expect(Object.keys(p.applications[0] ?? {})).not.toContain('studentId');
  });

  test('course mix from grouped counts, merged by title and capped', () => {
    const p = buildStaffProfile({
      ...base,
      courseCounts: [
        { course_id: 5, is_converted: 0, count: 3 },
        { course_id: 5, is_converted: 1, count: 2 },
        { course_id: null, is_converted: 0, count: 1 },
      ],
      courses: [{ id: 5, title: 'Montessori' }],
    });
    expect(p.courseMix).toEqual([
      { course: 'Montessori', applications: 5, enrolled: 2 },
      { course: 'No course', applications: 1, enrolled: 0 },
    ]);
  });

  test('buckets applications by IST created day and enrolments (is_converted) by converted day', () => {
    const p = buildStaffProfile({
      ...base,
      trendRows: [
        // Created 30 Sep 20:00 UTC = 1 Oct IST; converted in October.
        { is_converted: 1, created_at: new Date('2026-09-30T20:00:00Z'), converted_at: new Date('2026-10-05T10:00:00Z') },
        // Created in August, converted in September.
        { is_converted: 1, created_at: new Date('2026-08-10T10:00:00Z'), converted_at: new Date('2026-09-02T10:00:00Z') },
        // Converted with no converted_at → falls back to created_at.
        { is_converted: 1, created_at: new Date('2026-09-15T10:00:00Z'), converted_at: null },
        // Not converted → no enrolment, even with a stray converted_at.
        { is_converted: 0, created_at: new Date('2026-09-20T10:00:00Z'), converted_at: new Date('2026-09-21T10:00:00Z') },
        // Older than the window: ignored.
        { is_converted: 0, created_at: new Date('2025-01-10T10:00:00Z'), converted_at: null },
      ],
    });
    expect(p.trend).toHaveLength(12);
    const byMonth = Object.fromEntries(p.trend.map((t) => [t.month, [t.applications, t.enrollments]]));
    expect(byMonth['2026-10']).toEqual([1, 1]);
    expect(byMonth['2026-09']).toEqual([2, 2]);
    expect(byMonth['2026-08']).toEqual([1, 0]);
    expect(p.trend[11]?.label).toBe('Oct 26');
  });

  test('maps activity to the student name', () => {
    const p = buildStaffProfile({
      ...base,
      events: [{ id: 3, application_id: 7, event_type: 'link_sent', description: '', created_at: new Date('2026-10-02T04:00:00Z') }],
      eventNames: [{ id: 7, name: ' Ravi ' }],
    });
    expect(p.activity).toEqual([{ id: '3', type: 'link_sent', title: 'link_sent', student: 'Ravi', at: '2026-10-02T04:00:00.000Z' }]);
  });
});

describe('StaffProfileService', () => {
  function stub(person: unknown) {
    const calls: Array<{ model: string; args: Record<string, unknown> }> = [];
    const rec = (model: string, result: unknown) => (args: Record<string, unknown>) => {
      calls.push({ model, args });
      return Promise.resolve(result);
    };
    const prisma = {
      users: { findFirst: rec('users.findFirst', person), count: rec('users.count', 0) },
      applications: { findMany: rec('applications.findMany', []), groupBy: rec('applications.groupBy', []) },
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

  test('scopes every read to the person, caps the list, counts by groupBy and skips empty lookups', async () => {
    const { service, calls } = stub({ id: 5 });
    const p = await service.profile(5, 9, NOW);
    expect(p.kpis.applications).toBe(0);
    const appCalls = calls.filter((c) => c.model.startsWith('applications'));
    for (const c of appCalls) expect(c.args.where).toMatchObject({ pipeline_user: 5, deleted_at: null });
    const list = appCalls.find((c) => c.args.take !== undefined);
    expect(list?.args.take).toBe(STAFF_PROFILE_APPLICATION_LIMIT);
    expect(list?.args.orderBy).toEqual({ id: 'desc' });
    expect(appCalls.filter((c) => c.model === 'applications.groupBy')).toHaveLength(2);
    expect(calls.some((c) => c.model === 'course' || c.model === 'events')).toBe(false);
  });
});
