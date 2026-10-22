import Fastify from 'fastify';
import { describe, expect, test, vi } from 'vitest';

import { requireLegacyAuth } from '../../src/auth/middleware.js';
import {
  cohortStatus, hhmm, httpLink, istInstant, plainText, platformLabel, sessionState,
} from '../../src/operations/centre-portal-cohort-model.js';
import { CentrePortalCohortService } from '../../src/operations/centre-portal-cohort-service.js';
import { NO_CENTRE } from '../../src/operations/centre-portal-money-model.js';
import { OperationsService } from '../../src/operations/operations-service.js';
import { registerCentrePortalCohortRoutes } from '../../src/routes/centre-portal-cohort-routes.js';
import { memoryPrisma } from './support/memory-prisma.js';

// Centre portal → Cohorts (Naji's centre login design, 2026-10-22): IST
// statuses and times, reads scoped to the caller's centre, centre logins only,
// and the centre cohort writes that now refuse other centres' students.

const d = (iso: string) => new Date(iso);
const day = (ymd: string) => new Date(`${ymd}T00:00:00.000Z`);
const time = (hm: string) => new Date(`1970-01-01T${hm}:00.000Z`); // a @db.Time as Prisma returns it

describe('cohort model', () => {
  test('status on IST calendar days', () => {
    expect(cohortStatus('2026-11-01', '2027-03-01', '2026-10-22')).toBe('upcoming');
    expect(cohortStatus('2026-01-01', '2026-10-21', '2026-10-22')).toBe('completed');
    expect(cohortStatus('2026-10-22', '2026-10-22', '2026-10-22')).toBe('running');
    expect(cohortStatus('', '', '2026-10-22')).toBe('running');
  });

  test('times use UTC getters; a class completes after its IST end', () => {
    expect(hhmm(time('14:30'))).toBe('14:30');
    expect(hhmm(null)).toBe('');
    // 22 Oct 14:00 IST = 08:30 UTC.
    expect(istInstant('2026-10-22', '14:00')).toBe(Date.parse('2026-10-22T08:30:00Z'));
    expect(sessionState('2026-10-22', '15:15', '14:00', Date.parse('2026-10-22T09:00:00Z'))).toBe('scheduled');
    expect(sessionState('2026-10-22', '15:15', '14:00', Date.parse('2026-10-22T09:46:00Z'))).toBe('completed');
    expect(sessionState('', '15:15', '14:00', Date.now())).toBe('scheduled');
  });

  test('platform named from what is stored', () => {
    expect(platformLabel('teams', '')).toBe('Microsoft Teams');
    expect(platformLabel('manual', 'https://meet.google.com/abc')).toBe('Google Meet');
    expect(platformLabel('manual', 'https://us02web.zoom.us/j/1')).toBe('Zoom');
    expect(platformLabel('other', 'https://example.com/room')).toBe('Meeting link');
    expect(platformLabel(null, '')).toBe('Zoom');
    expect(httpLink('javascript:alert(1)')).toBe('');
    expect(plainText('<p>Hello&nbsp;<b>world</b></p>')).toBe('Hello world');
  });
});

function seed() {
  return {
    users: [
      { id: 700, role_id: 7, centre_id: '1', deleted_at: null },
      { id: 701, role_id: 10, centre_id: '1', deleted_at: null },
      { id: 702, role_id: 7, centre_id: '', deleted_at: null },
      { id: 30, role_id: 3, name: 'Dr. Laila Hassan', deleted_at: null, disabled_at: null },
      { id: 31, role_id: 3, name: 'Disabled Faculty', deleted_at: null, disabled_at: d('2026-01-01T00:00:00Z') },
      { id: 501, role_id: 2, name: 'Zara', student_id: 'TTS0101', added_under_centre: 1, deleted_at: null },
      { id: 502, role_id: 2, name: 'Anu', student_id: 'TTS0102', added_under_centre: 1, deleted_at: null },
      { id: 503, role_id: 2, name: 'Other centre', student_id: 'TTS0103', added_under_centre: 28, deleted_at: null },
    ],
    centres: [{ id: 1, centre_name: 'TTC Bepur svk', deleted_at: null }, { id: 28, centre_name: 'upCarrera', deleted_at: null }],
    centre_course_plans: [
      { id: 1, centre_id: 1, course_id: 16, deleted_at: null },
      { id: 2, centre_id: 28, course_id: 18, deleted_at: null },
    ],
    course: [{ id: 16, title: 'Diploma', deleted_at: null }, { id: 18, title: 'PG Diploma', deleted_at: null }],
    course_subject: [{ course_id: 16, subject_id: 40, deleted_at: null }, { course_id: 18, subject_id: 41, deleted_at: null }],
    subject: [
      { id: 40, title: 'Child Care and Health', course_id: null, deleted_at: null },
      { id: 41, title: 'PG only subject', course_id: 18, deleted_at: null },
      { id: 42, title: 'Legacy linked', course_id: 16, deleted_at: null },
    ],
    languages: [{ id: 1, title: 'Malayalam', deleted_at: null }, { id: 2, title: 'English', deleted_at: null }],
    cohorts: [
      { id: 75, cohort_id: 'CCHOCT26', title: 'Child Care – OCT26', course_id: 16, subject_id: 40, language_id: 1, instructor_id: 30, start_date: day('2026-10-01'), end_date: day('2027-03-31'), centre_id: 1, deleted_at: null },
      { id: 76, cohort_id: 'PGX', title: 'Other centre', course_id: 18, subject_id: 41, language_id: null, instructor_id: null, start_date: day('2026-10-01'), end_date: day('2027-03-31'), centre_id: 28, deleted_at: null },
    ],
    cohort_courses: [{ cohort_id: 75, course_id: 16 }, { cohort_id: 75, course_id: 18 }],
    cohort_students: [
      { id: 1, cohort_id: '75', user_id: 501, deleted_at: null },
      { id: 2, cohort_id: 'CCHOCT26', user_id: 502, deleted_at: null }, // legacy rows key on the cohort code
      { id: 3, cohort_id: '76', user_id: 503, deleted_at: null },
    ],
    live_class: [
      { id: 900, cohort_id: 75, title: 'Live Session', date: day('2026-10-22'), fromTime: time('14:00'), toTime: time('15:15'), platform: 'manual', join_url: 'https://meet.google.com/x', host_email: null, recording_url: null, deleted_at: null },
      { id: 901, cohort_id: 75, title: 'Chapter 1', date: day('2026-10-15'), fromTime: time('19:00'), toTime: time('20:00'), platform: 'teams', join_url: 'https://teams.microsoft.com/l/1', host_email: 'faculty@ttii.test', recording_url: 'https://cdn/rec.mp4', deleted_at: null },
      { id: 902, cohort_id: 76, title: 'Other centre class', date: day('2026-10-22'), fromTime: time('10:00'), toTime: time('11:00'), platform: 'zoom', join_url: null, host_email: null, recording_url: null, deleted_at: null },
    ],
    assignment: [{ id: 5, cohort_id: 75, title: 'Essay', description: '<p>Write</p>', total_marks: 50, due_date: day('2026-11-01'), deleted_at: null }],
    assignment_submissions: [{ id: 1, assignment_id: 5, deleted_at: null }, { id: 2, assignment_id: 5, deleted_at: null }],
    cohort_announcements: [
      { id: 1, cohort_id: 75, title: 'Welcome', content: 'Hello', status: 'sent', sent_at: d('2026-10-01T20:00:00Z'), created_at: d('2026-10-01T19:00:00Z'), deleted_at: null },
      { id: 2, cohort_id: 75, title: 'Draft', content: 'Not yet', status: 'draft', sent_at: null, created_at: d('2026-10-02T19:00:00Z'), deleted_at: null },
    ],
  };
}

const NOW = new Date('2026-10-22T09:00:00Z'); // 14:30 IST

function service() {
  const db = memoryPrisma(seed());
  return new CentrePortalCohortService({ prisma: db.prisma, now: () => NOW });
}

describe('CentrePortalCohortService', () => {
  test('options: the centre\'s own courses and their subjects, active instructors, languages', async () => {
    const out = await service().options(700);
    expect(out.data).toEqual({
      courses: [{ id: 16, title: 'Diploma' }],
      subjects: [{ id: 40, title: 'Child Care and Health', courseIds: [16] }, { id: 42, title: 'Legacy linked', courseIds: [16] }],
      instructors: [{ id: 30, title: 'Dr. Laila Hassan' }],
      languages: [{ id: 2, title: 'English' }, { id: 1, title: 'Malayalam' }],
    });
  });

  test('view: learners by id or code, IST session states, sent announcements only', async () => {
    const out = await service().view(700, '75');
    expect(out.status).toBe(1);
    expect(out.data?.cohort).toEqual({
      id: 75, cid: 'C75', code: 'CCHOCT26', title: 'Child Care – OCT26', courses: ['Diploma', 'PG Diploma'], subject: 'Child Care and Health',
      language: 'Malayalam', instructor: 'Dr. Laila Hassan', hasInstructor: true, startYmd: '2026-10-01', endYmd: '2027-03-31', status: 'running',
    });
    expect(out.data?.today).toBe('2026-10-22');
    expect(out.data?.learners).toEqual([{ id: 502, name: 'Anu', studentCode: 'TTS0102' }, { id: 501, name: 'Zara', studentCode: 'TTS0101' }]);
    expect(out.data?.liveClasses.map((l) => [l.id, l.dateYmd, l.from, l.to, l.platform, l.state, l.hasRecording])).toEqual([
      [901, '2026-10-15', '19:00', '20:00', 'Microsoft Teams', 'completed', true],
      [900, '2026-10-22', '14:00', '15:15', 'Google Meet', 'scheduled', false],
    ]);
    expect(out.data?.assignments).toEqual([{ id: 5, title: 'Essay', description: 'Write', totalMarks: 50, dueYmd: '2026-11-01', submissions: 2 }]);
    expect(out.data?.announcements).toEqual([{ id: 1, title: 'Welcome', content: 'Hello', sentYmd: '2026-10-02' }]);
  });

  test('another centre\'s cohort, a bad id, and callers without a centre get nothing', async () => {
    const svc = service();
    expect(await svc.view(700, '76')).toEqual({ status: 0, message: 'Cohort not found.' });
    expect(await svc.view(700, 'abc')).toEqual({ status: 0, message: 'Cohort not found.' });
    for (const actor of [701, 702, null]) {
      expect(await svc.view(actor, '75')).toEqual({ status: 0, message: NO_CENTRE });
      expect(await svc.options(actor)).toEqual({ status: 0, message: NO_CENTRE });
    }
  });
});

describe('centre cohort writes (existing endpoints)', () => {
  test('add_cohort_students only adds the centre\'s own students', async () => {
    const db = memoryPrisma(seed());
    const ops = new OperationsService(db.prisma);
    const res = await ops.addCentreCohortStudents('700', { cohortId: '75', studentIds: ['502', '503', '700', '30', 'x'] });
    expect(res).toMatchObject({ success: true, added_count: 1 });
    const rows = (await db.prisma.cohort_students.findMany({ where: { cohort_id: '75' } })) as Array<{ user_id: number }>;
    expect(rows.map((r) => r.user_id).sort()).toEqual([501, 502]);
  });

  test('add: a course-wide cohort stores a NULL subject and may repeat; language is saved', async () => {
    const db = memoryPrisma(seed());
    const ops = new OperationsService(db.prisma);
    const input = { title: 'Diploma – NOV26', courseId: '16', subjectId: '', instructorId: '30', startDate: '2026-11-01', endDate: '2027-04-30', languageId: '2' };
    expect(await ops.addCentreCohort('700', input)).toMatchObject({ success: true });
    expect(await ops.addCentreCohort('700', input)).toMatchObject({ success: true });
    const created = (await db.prisma.cohorts.findMany({ where: { title: 'Diploma – NOV26' } })) as Array<{ subject_id: unknown; language_id: unknown; centre_id: unknown }>;
    expect(created).toHaveLength(2);
    expect(created.every((c) => c.subject_id === null && c.language_id === 2 && c.centre_id === 1)).toBe(true);
    // A subject cohort still refuses a duplicate subject for the course.
    const dup = await ops.addCentreCohort('700', { ...input, subjectId: '40' });
    expect(dup).toMatchObject({ success: false, message: 'Cohort with this subject already exists for this course!' });
  });
});

describe('centre cohort security (review 2026-10-22)', () => {
  const base = { title: 'X – NOV26', courseId: '16', subjectId: '', instructorId: '30', startDate: '2026-11-01', endDate: '2027-04-30', languageId: '2' };

  test('view: a cohort code that equals another centre\'s cohort id leaks none of its learners', async () => {
    const data = seed();
    data.cohorts.push({ id: 80, cohort_id: '76', title: 'Mine named 76', course_id: 16, subject_id: null, language_id: 1, instructor_id: 30, start_date: day('2026-10-01'), end_date: day('2027-03-31'), centre_id: 1, deleted_at: null });
    const svc = new CentrePortalCohortService({ prisma: memoryPrisma(data).prisma, now: () => NOW });
    const out = await svc.view(700, '80');
    expect(out.data?.learners).toEqual([]); // student 503 (centre 28) is in cohort 76, not here
  });

  test('view: a non-student or another centre\'s user sitting in the cohort rows is not listed', async () => {
    const data = seed();
    data.cohort_students.push({ id: 9, cohort_id: '75', user_id: 503, deleted_at: null }, { id: 10, cohort_id: '75', user_id: 30, deleted_at: null });
    const svc = new CentrePortalCohortService({ prisma: memoryPrisma(data).prisma, now: () => NOW });
    const out = await svc.view(700, '75');
    expect(out.data?.learners.map((l) => l.id).sort()).toEqual([501, 502]);
  });

  test('add: refuses a purely numeric code and a code already used (case-insensitive on MySQL)', async () => {
    const ops = new OperationsService(memoryPrisma(seed()).prisma);
    expect(await ops.addCentreCohort('700', { ...base, cohortCode: '75' })).toMatchObject({ success: false, message: expect.stringContaining('only digits') });
    expect(await ops.addCentreCohort('700', { ...base, cohortCode: 'CCHOCT26' })).toMatchObject({ success: false, message: expect.stringContaining('already in use') });
    expect(await ops.addCentreCohort('700', { ...base, cohortCode: 'NEWCODE' })).toMatchObject({ success: true });
    expect(await ops.addCentreCohort('700', { ...base })).toMatchObject({ success: true }); // code stays optional
  });

  test('add: course must be assigned to the centre', async () => {
    const ops = new OperationsService(memoryPrisma(seed()).prisma);
    expect(await ops.addCentreCohort('700', { ...base, courseId: '18' })).toMatchObject({ success: false, message: 'This course is not assigned to your centre.' });
  });

  test('add: subject must belong to the course; instructor must be an active instructor; language must exist', async () => {
    const ops = new OperationsService(memoryPrisma(seed()).prisma);
    expect(await ops.addCentreCohort('700', { ...base, subjectId: '41' })).toMatchObject({ success: false, message: expect.stringContaining('subject') });
    expect(await ops.addCentreCohort('700', { ...base, subjectId: '42' })).toMatchObject({ success: true }); // legacy subject.course_id link
    // course_subject link passes the subject check (and then hits the one-cohort-per-subject rule).
    expect(await ops.addCentreCohort('700', { ...base, subjectId: '40' })).toMatchObject({ message: 'Cohort with this subject already exists for this course!' });
    for (const instructorId of ['501', '31', '999']) {
      expect(await ops.addCentreCohort('700', { ...base, instructorId })).toMatchObject({ success: false, message: 'Choose a valid instructor.' });
    }
    expect(await ops.addCentreCohort('700', { ...base, languageId: '99' })).toMatchObject({ success: false, message: 'Choose a valid language.' });
  });
});

const USERS: Record<string, { id: number; role_id: number }> = {
  centre: { id: 700, role_id: 7 },
  associate: { id: 701, role_id: 10 },
  admin: { id: 1, role_id: 1 },
};

describe('centre portal cohort routes', () => {
  function makeApp() {
    const authService = {
      authenticateAuthToken: (token: string) => Promise.resolve(USERS[token] ? { user: { ...USERS[token], name: token } } : null),
      logAuthDenied: () => Promise.resolve(),
      logRbacDenied: () => Promise.resolve(),
    };
    const svc = {
      options: vi.fn().mockResolvedValue({ status: 1, message: 'success', data: { courses: [] } }),
      view: vi.fn().mockResolvedValue({ status: 0, message: 'Cohort not found.' }),
    };
    const app = Fastify({ logger: false });
    registerCentrePortalCohortRoutes(app, {
      requireAuth: requireLegacyAuth(authService as never),
      authService: authService as never,
      service: svc as unknown as CentrePortalCohortService,
    });
    return { app, svc };
  }

  test('only centre logins read; the cohort id is passed through, the actor comes from the token', async () => {
    const { app, svc } = makeApp();
    for (const path of ['/centre/cohorts/options', '/centre/cohorts/view?id=75']) {
      for (const token of ['associate', 'admin']) {
        expect((await app.inject({ method: 'GET', url: `${path}${path.includes('?') ? '&' : '?'}auth_token=${token}` })).statusCode).toBe(403);
      }
    }
    expect(svc.options).not.toHaveBeenCalled();
    expect(svc.view).not.toHaveBeenCalled();
    expect((await app.inject({ method: 'GET', url: '/centre/cohorts/options?auth_token=centre' })).json()).toEqual({ status: 1, message: 'success', data: { courses: [] } });
    expect((await app.inject({ method: 'GET', url: '/centre/cohorts/view?id=76&auth_token=centre' })).json()).toEqual({ status: 0, message: 'Cohort not found.', data: {} });
    expect(svc.view).toHaveBeenCalledWith(700, '76');
    await app.close();
  });
});
