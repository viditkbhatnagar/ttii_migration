import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import { OperationsService } from '../../src/operations/operations-service.js';

// TTII 2026-10-21 — AMINA C (TTS0125) was approved into the October 2026
// Early Years intake (offering 27), whose only cohort is the course-wide cohort
// 106, but approval never touched cohort_students: her Live Classes page was
// empty and the 18 Oct recording invisible. A student now joins the intake's
// cohort automatically — only when the intake has exactly ONE live course-wide
// cohort. Subject-wise Montessori cohorts stay a manual choice.

interface Cohort { id: number; cohort_id: string | null; subject_id: number | null; end_date: Date | null; title: string }

interface World {
  links: Array<{ offering_id: number; cohort_id: number }>;
  cohorts: Cohort[];
  members: Array<{ user_id: number; cohort_id: string }>;
  failOn?: 'links';
}

const NOW = new Date('2026-10-21T05:00:00.000Z'); // 10:30 IST
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(NOW); });
afterEach(() => { vi.useRealTimers(); });

const day = (s: string): Date => new Date(`${s}T00:00:00.000Z`);
const OCT_EARLY_YEARS: Cohort = { id: 106, cohort_id: 'CAIECEOCT26', subject_id: null, end_date: day('2026-11-30'), title: 'Certification in Ai - Early Childhood Educator - October 2026' };

function makeService(world: World) {
  const created: Array<Record<string, unknown>> = [];
  const events: Array<Record<string, unknown>> = [];
  const prisma = {
    cohort_offerings: {
      findMany: ({ where }: { where: { offering_id: number } }) => (world.failOn === 'links'
        ? Promise.reject(new Error('db down'))
        : Promise.resolve(world.links.filter((l) => l.offering_id === where.offering_id).map((l) => ({ cohort_id: l.cohort_id })))),
    },
    cohorts: {
      findMany: ({ where }: { where: { id: { in: number[] } } }) => Promise.resolve(world.cohorts.filter((c) => where.id.in.includes(c.id))),
    },
    cohort_students: {
      count: ({ where }: { where: { user_id: number; cohort_id: { in: string[] } } }) => Promise.resolve(
        world.members.filter((m) => m.user_id === where.user_id && where.cohort_id.in.includes(m.cohort_id)).length,
      ),
      create: ({ data }: { data: Record<string, unknown> }) => { created.push(data); return Promise.resolve(data); },
    },
    users: { findFirst: () => Promise.resolve({ role_id: 1 }) },
    application_events: { create: ({ data }: { data: Record<string, unknown> }) => { events.push(data); return Promise.resolve(data); } },
  } as unknown as PrismaClient;
  return { service: new OperationsService(prisma), created, events };
}

const amina = { userId: 361, offeringId: 27, applicationId: 340, actorUserId: '306' };

describe('joining the intake cohort on enrolment', () => {
  test("the intake's only course-wide live cohort is joined, in addCohortLearners' row shape, with an audit event", async () => {
    const { service, created, events } = makeService({ links: [{ offering_id: 27, cohort_id: 106 }], cohorts: [OCT_EARLY_YEARS], members: [] });
    const res = await service.autoAssignIntakeCohort(amina);
    expect(res).toEqual({ assigned: true, cohortId: 106 });
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ cohort_id: '106', user_id: 361, created_by: 306 });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ application_id: 340, event_type: 'cohort_assigned' });
  });

  test('an intake with several cohorts is left to the admin', async () => {
    const { service, created } = makeService({
      links: [{ offering_id: 17, cohort_id: 92 }, { offering_id: 17, cohort_id: 94 }],
      cohorts: [{ ...OCT_EARLY_YEARS, id: 92, subject_id: 5 }, { ...OCT_EARLY_YEARS, id: 94, subject_id: 6 }],
      members: [],
    });
    expect((await service.autoAssignIntakeCohort({ ...amina, offeringId: 17 })).assigned).toBe(false);
    expect(created).toHaveLength(0);
  });

  test('a single subject-wise cohort (Montessori) is never joined automatically', async () => {
    const { service, created } = makeService({ links: [{ offering_id: 24, cohort_id: 104 }], cohorts: [{ ...OCT_EARLY_YEARS, id: 104, subject_id: 31 }], members: [] });
    expect((await service.autoAssignIntakeCohort({ ...amina, offeringId: 24 })).assigned).toBe(false);
    expect(created).toHaveLength(0);
  });

  test('an ended cohort is not joined; one ending today still is (IST)', async () => {
    const ended = makeService({ links: [{ offering_id: 21, cohort_id: 95 }], cohorts: [{ ...OCT_EARLY_YEARS, id: 95, end_date: day('2026-10-20') }], members: [] });
    expect((await ended.service.autoAssignIntakeCohort({ ...amina, offeringId: 21 })).assigned).toBe(false);
    const today = makeService({ links: [{ offering_id: 21, cohort_id: 95 }], cohorts: [{ ...OCT_EARLY_YEARS, id: 95, end_date: day('2026-10-21') }], members: [] });
    expect((await today.service.autoAssignIntakeCohort({ ...amina, offeringId: 21 })).assigned).toBe(true);
  });

  test('a student already in the cohort (by pk or by text code) is not added twice', async () => {
    const byCode = makeService({ links: [{ offering_id: 27, cohort_id: 106 }], cohorts: [OCT_EARLY_YEARS], members: [{ user_id: 361, cohort_id: 'CAIECEOCT26' }] });
    expect((await byCode.service.autoAssignIntakeCohort(amina)).assigned).toBe(false);
    expect(byCode.created).toHaveLength(0);
    const byPk = makeService({ links: [{ offering_id: 27, cohort_id: 106 }], cohorts: [OCT_EARLY_YEARS], members: [{ user_id: 361, cohort_id: '106' }] });
    expect((await byPk.service.autoAssignIntakeCohort(amina)).assigned).toBe(false);
  });

  test('no intake, no cohort, or a database error: nothing happens and nothing throws', async () => {
    const none = makeService({ links: [], cohorts: [], members: [] });
    expect((await none.service.autoAssignIntakeCohort({ ...amina, offeringId: null })).assigned).toBe(false);
    expect((await none.service.autoAssignIntakeCohort(amina)).assigned).toBe(false);
    const broken = makeService({ links: [], cohorts: [], members: [], failOn: 'links' });
    await expect(broken.service.autoAssignIntakeCohort(amina)).resolves.toMatchObject({ assigned: false, reason: 'error' });
  });
});
