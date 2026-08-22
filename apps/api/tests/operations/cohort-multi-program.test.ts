import { describe, expect, test } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import { OperationsService } from '../../src/operations/operations-service.js';
import { cohortCourseIdMap, cohortIdsForCourse } from '../../src/data/cohort-courses.js';

// Naji 2026-08-19 — "we want to create common cohorts for both PG and Diploma
// students... multiple programs in one cohort".
//
// A cohort carried a single cohorts.course_id, so ticking two programs created
// TWO cohort rows sharing a title, code and dates: two schedules, two
// attendance sheets, the class split in half. One cohort now carries many
// courses via the cohort_courses pivot, with cohorts.course_id kept as the
// PRIMARY so the ~40 readers still on that column keep working.
//
// While building it we also found live data loss: getCohortDetail never
// returned offering_ids, so the edit form posted an empty list and
// editAdminCohort's unconditional deleteMany wiped a cohort's offerings on
// every save. That has no deleted_at — it was permanent.
//
// Hand-rolled Prisma stubs, as in result-publication-gate.test.ts: the
// database-backed suites are skipped in CI, so these are the assertions that
// actually hold the line.

const COHORT_ID = 77;
const PG_COURSE = 16;
const DIPLOMA_COURSE = 18;

interface Recorder {
  cohortCreates: Record<string, unknown>[];
  cohortCourseCreates: Record<string, unknown>[];
  cohortCourseDeletes: unknown[];
  offeringDeletes: unknown[];
  offeringCreates: Record<string, unknown>[];
}

function makeService(opts: {
  pivotRows?: { cohort_id: number; course_id: number }[];
  cohort?: Record<string, unknown>;
} = {}): { service: OperationsService; rec: Recorder } {
  const rec: Recorder = {
    cohortCreates: [],
    cohortCourseCreates: [],
    cohortCourseDeletes: [],
    offeringDeletes: [],
    offeringCreates: [],
  };
  const pivotRows = opts.pivotRows ?? [];

  const prisma = {
    cohorts: {
      create: ({ data }: { data: Record<string, unknown> }) => {
        rec.cohortCreates.push(data);
        return Promise.resolve({ ...data, id: COHORT_ID });
      },
      update: () => Promise.resolve({ id: COHORT_ID }),
      findFirst: () => Promise.resolve(opts.cohort ?? null),
      findMany: () => Promise.resolve([]),
    },
    cohort_courses: {
      createMany: ({ data }: { data: Record<string, unknown>[] }) => {
        rec.cohortCourseCreates.push(...data);
        return Promise.resolve({ count: data.length });
      },
      deleteMany: (args: unknown) => {
        rec.cohortCourseDeletes.push(args);
        return Promise.resolve({ count: 0 });
      },
      findMany: ({ where }: { where: Record<string, unknown> }) => {
        const cohortFilter = where.cohort_id as { in?: number[] } | number | undefined;
        const courseFilter = where.course_id as number | undefined;
        let rows = pivotRows;
        if (typeof courseFilter === 'number') rows = rows.filter((r) => r.course_id === courseFilter);
        if (typeof cohortFilter === 'number') rows = rows.filter((r) => r.cohort_id === cohortFilter);
        else if (cohortFilter && Array.isArray(cohortFilter.in)) {
          rows = rows.filter((r) => cohortFilter.in!.includes(r.cohort_id));
        }
        return Promise.resolve(rows);
      },
    },
    cohort_offerings: {
      createMany: ({ data }: { data: Record<string, unknown>[] }) => {
        rec.offeringCreates.push(...data);
        return Promise.resolve({ count: data.length });
      },
      deleteMany: (args: unknown) => {
        rec.offeringDeletes.push(args);
        return Promise.resolve({ count: 0 });
      },
      findMany: () => Promise.resolve([]),
    },
    course: { findMany: () => Promise.resolve([]), findFirst: () => Promise.resolve(null) },
  } as unknown as PrismaClient;

  return { service: new OperationsService(prisma), rec };
}

const baseInput = {
  title: 'Communicative English in Teaching - September 2026',
  cohortCode: 'CETSEP26',
  subjectId: '28',
  centreId: '',
  instructorId: '5',
  languageId: '2',
  startDate: '2026-09-01',
  endDate: '2026-09-30',
};

describe('creating a cohort that serves several programs', () => {
  test('one cohort row is written, carrying every ticked program', async () => {
    const { service, rec } = makeService();

    await service.addAdminCohort('1', {
      ...baseInput,
      courseId: String(PG_COURSE),
      courseIds: [String(PG_COURSE), String(DIPLOMA_COURSE)],
    });

    // ONE cohort, not one per course — this is the whole ask.
    expect(rec.cohortCreates).toHaveLength(1);
    // The scalar keeps the PRIMARY course, so untouched readers stay correct.
    expect(rec.cohortCreates[0]?.course_id).toBe(PG_COURSE);
    // ...and the pivot carries both.
    expect(rec.cohortCourseCreates.map((r) => r.course_id).sort()).toEqual([PG_COURSE, DIPLOMA_COURSE].sort());
  });

  test('a single-program cohort still gets a pivot row, so the pivot is a superset', async () => {
    const { service, rec } = makeService();

    await service.addAdminCohort('1', { ...baseInput, courseId: String(PG_COURSE) });

    expect(rec.cohortCreates).toHaveLength(1);
    expect(rec.cohortCourseCreates).toHaveLength(1);
    expect(rec.cohortCourseCreates[0]?.course_id).toBe(PG_COURSE);
  });
});

describe('editing a cohort no longer destroys its links', () => {
  test('omitting offeringIds LEAVES the offerings alone', async () => {
    const { service, rec } = makeService();

    // Exactly what the edit form used to post: no offering_ids at all.
    await service.editAdminCohort('1', String(COHORT_ID), {
      ...baseInput,
      courseId: String(PG_COURSE),
    });

    // The load-bearing assertion. This deleteMany running unconditionally is
    // what silently wiped every cohort's offerings on save.
    expect(rec.offeringDeletes).toHaveLength(0);
    expect(rec.cohortCourseDeletes).toHaveLength(0);
  });

  test('sending offeringIds still replaces them', async () => {
    const { service, rec } = makeService();

    await service.editAdminCohort('1', String(COHORT_ID), {
      ...baseInput,
      courseId: String(PG_COURSE),
      offeringIds: ['4'],
    });

    expect(rec.offeringDeletes).toHaveLength(1);
    expect(rec.offeringCreates.map((r) => r.offering_id)).toEqual([4]);
  });

  test('sending courseIds replaces the program set', async () => {
    const { service, rec } = makeService();

    await service.editAdminCohort('1', String(COHORT_ID), {
      ...baseInput,
      courseId: String(PG_COURSE),
      courseIds: [String(PG_COURSE), String(DIPLOMA_COURSE)],
    });

    expect(rec.cohortCourseDeletes).toHaveLength(1);
    expect(rec.cohortCourseCreates.map((r) => r.course_id).sort()).toEqual([PG_COURSE, DIPLOMA_COURSE].sort());
  });
});

describe('resolving which programs a cohort serves', () => {
  test('the pivot wins when it has rows', async () => {
    const { service } = makeService({
      pivotRows: [
        { cohort_id: COHORT_ID, course_id: PG_COURSE },
        { cohort_id: COHORT_ID, course_id: DIPLOMA_COURSE },
      ],
    });
    const prisma = (service as unknown as { prisma: PrismaClient }).prisma;

    const map = await cohortCourseIdMap(prisma, [{ id: COHORT_ID, course_id: PG_COURSE }]);
    expect(map.get(COHORT_ID)?.sort()).toEqual([PG_COURSE, DIPLOMA_COURSE].sort());
  });

  test('a cohort predating the pivot still reports its one program', async () => {
    const { service } = makeService({ pivotRows: [] });
    const prisma = (service as unknown as { prisma: PrismaClient }).prisma;

    // Nothing in cohort_courses yet — must fall back to cohorts.course_id
    // rather than reporting no programs at all.
    const map = await cohortCourseIdMap(prisma, [{ id: COHORT_ID, course_id: PG_COURSE }]);
    expect(map.get(COHORT_ID)).toEqual([PG_COURSE]);
  });

  test('cohortIdsForCourse finds a cohort by its NON-primary program', async () => {
    const { service } = makeService({
      pivotRows: [
        { cohort_id: COHORT_ID, course_id: PG_COURSE },
        { cohort_id: COHORT_ID, course_id: DIPLOMA_COURSE },
      ],
    });
    const prisma = (service as unknown as { prisma: PrismaClient }).prisma;

    // Filtering by Diploma must still surface a cohort whose primary is PG —
    // otherwise an admin thinks it was never created and makes a duplicate.
    expect(await cohortIdsForCourse(prisma, DIPLOMA_COURSE)).toEqual([COHORT_ID]);
  });

  test('no course to filter on means no pivot lookup', async () => {
    const { service } = makeService({ pivotRows: [{ cohort_id: COHORT_ID, course_id: PG_COURSE }] });
    const prisma = (service as unknown as { prisma: PrismaClient }).prisma;

    expect(await cohortIdsForCourse(prisma, null)).toEqual([]);
    expect(await cohortIdsForCourse(prisma, 0)).toEqual([]);
  });
});
