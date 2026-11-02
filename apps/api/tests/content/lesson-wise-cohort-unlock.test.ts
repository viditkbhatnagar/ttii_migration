import { describe, expect, test } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import { ContentService } from '../../src/content/content-service.js';

// TTII 2026-11-02 — "'Certification in AI course' students are unable to
// access lessons". Course 24 (Certification in Advanced Ai Educator) is
// LESSON-WISE; its October intake (offering 26) is "Cohort Based" and all its
// learners are in the intake's own course-wide cohort 105. On a subject-wise
// course that cohort opens the content, but the lesson-wise branch never looked
// at cohorts, so everyone was gated one lesson at a time (lesson 1 open, the
// rest padlocked). A course-wide cohort serving the course now opens it.

interface World {
  strategy: string;
  memberships: string[];
  cohorts: Array<{ id: number; cohort_id: string | null; subject_id: number | null; course_id: number | null }>;
  pivot?: Array<{ cohort_id: number; course_id: number }>;
}

const COURSE = 24;

function service(world: World): ContentService {
  const prisma = {
    course: { findFirst: () => Promise.resolve({ id: COURSE }) },
    lesson: {
      findMany: () => Promise.resolve([1, 2, 3].map((id) => ({ id, course_id: COURSE, subject_id: null, order: id }))),
    },
    users: { findFirst: () => Promise.resolve({ application_id: 278, student_id: 'TTS0122' }) },
    applications: { findFirst: () => Promise.resolve({ offering_id: 26, course_id: COURSE }) },
    offerings: { findFirst: () => Promise.resolve({ content_release_strategy: world.strategy }) },
    cohort_students: {
      findMany: () => Promise.resolve(world.memberships.map((cohort_id) => ({ cohort_id }))),
    },
    cohorts: {
      findMany: ({ where }: { where: { OR: Array<{ id?: { in: number[] }; cohort_id?: { in: string[] } }> } }) =>
        Promise.resolve(world.cohorts.filter((c) => where.OR.some((w) =>
          (w.id && w.id.in.includes(c.id)) || (w.cohort_id && c.cohort_id !== null && w.cohort_id.in.includes(c.cohort_id))))),
    },
    cohort_courses: {
      findMany: ({ where }: { where: { cohort_id: { in: number[] } } }) =>
        Promise.resolve((world.pivot ?? []).filter((r) => where.cohort_id.in.includes(r.cohort_id))),
    },
  } as unknown as PrismaClient;
  const svc = new ContentService(prisma);
  // The per-lesson payload (files, progress) is not under test: three
  // unfinished lessons, as a new learner sees them.
  const stubbed = svc as unknown as {
    getUserPurchaseStatus: () => Promise<number>;
    buildLessonData: (lesson: { id: number }) => Promise<Record<string, unknown>>;
  };
  stubbed.getUserPurchaseStatus = () => Promise.resolve(1);
  stubbed.buildLessonData = (lesson) => Promise.resolve({ id: lesson.id, is_completed: 0, lock: 1, lesson_files: [] });
  return svc;
}

const locks = async (svc: ContentService) => (await svc.getLessonsForCourse('357', String(COURSE))).map((l) => l.lock);

const COHORT_105 = { id: 105, cohort_id: 'CAIAEOCT26', subject_id: null, course_id: COURSE };

describe('lesson-wise course under "Cohort Based" release', () => {
  test("a learner in the intake's course-wide cohort gets every lesson open", async () => {
    expect(await locks(service({ strategy: 'cohort', memberships: ['105'], cohorts: [COHORT_105], pivot: [{ cohort_id: 105, course_id: COURSE }] }))).toEqual([0, 0, 0]);
  });

  test('membership stored as the legacy text code counts too', async () => {
    expect(await locks(service({ strategy: 'cohort', memberships: ['CAIAEOCT26'], cohorts: [COHORT_105] }))).toEqual([0, 0, 0]);
  });

  test('a cohort that serves the course only through the pivot counts', async () => {
    const shared = { id: 200, cohort_id: 'SHARED', subject_id: null, course_id: 99 };
    expect(await locks(service({ strategy: 'cohort', memberships: ['200'], cohorts: [shared], pivot: [{ cohort_id: 200, course_id: COURSE }] }))).toEqual([0, 0, 0]);
  });

  test('no cohort, a cohort of another course, or a subject cohort: still one lesson at a time', async () => {
    expect(await locks(service({ strategy: 'cohort', memberships: [], cohorts: [] }))).toEqual([0, 1, 1]);
    const other = { id: 106, cohort_id: 'CAIECEOCT26', subject_id: null, course_id: 25 };
    expect(await locks(service({ strategy: 'cohort', memberships: ['106'], cohorts: [other] }))).toEqual([0, 1, 1]);
    const subjectCohort = { id: 107, cohort_id: 'SUBJ', subject_id: 31, course_id: COURSE };
    expect(await locks(service({ strategy: 'cohort', memberships: ['107'], cohorts: [subjectCohort] }))).toEqual([0, 1, 1]);
  });

  test('"Subject Based" stays sequential even for a cohort member; "Full" opens everything', async () => {
    expect(await locks(service({ strategy: 'subject', memberships: ['105'], cohorts: [COHORT_105] }))).toEqual([0, 1, 1]);
    expect(await locks(service({ strategy: 'full', memberships: [], cohorts: [] }))).toEqual([0, 0, 0]);
  });
});
