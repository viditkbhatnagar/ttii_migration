/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { copyFile, rm } from 'node:fs/promises';

import { LegacyApiClient, LegacyAuthApi, type AuthSession } from '@ttii/frontend-core';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AdminPortalApi } from '../src/admin/admin-portal-api';
import { loadRoleShellForPath } from '../src/role-shell-loader';

interface SeededUser {
  email: string;
  password: string;
  roleId: number;
}

interface PrismaUsersPort {
  create: (args: { data: Record<string, unknown> }) => Promise<{ id: number }>;
}

interface PrismaPort {
  users: PrismaUsersPort;
  $executeRaw: (parts: TemplateStringsArray, ...values: unknown[]) => Promise<number>;
  $queryRaw: <T>(parts: TemplateStringsArray, ...values: unknown[]) => Promise<T>;
}

interface TestDbModule {
  prisma: PrismaPort;
  resetParityTables: () => Promise<void>;
}

interface PasswordModule {
  hashPassword: (value: string) => Promise<string>;
}

interface FastifyAppPort {
  listen: (options: { host: string; port: number }) => Promise<string>;
  close: () => Promise<void>;
}

interface AppModule {
  buildApp: () => FastifyAppPort;
}

const seededAdmin: SeededUser = {
  email: 'admin.phase14@example.test',
  password: 'AdminPass#Phase14',
  roleId: 1,
};

const CATEGORY_ID = 5401;
const COURSE_ID = 5402;
const SUBJECT_ID = 5403;
const LESSON_ID = 5404;
const CENTRE_DB_ID = 5405;
const APPLICATION_ID = 5406;
const EXISTING_COHORT_ID = 5407;
const EXISTING_LIVE_CLASS_ID = 5408;
const EXISTING_EXAM_ID = 5409;
const EXISTING_ASSIGNMENT_ID = 5410;

function asNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'bigint') {
    return Number(value);
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function dateOnly(offsetDays = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

describe('Phase 14 admin portal e2e', () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = resolve(currentFile, '../../../..');
  const baseTestDbPath = resolve(repoRoot, 'apps/api/prisma/test.db');
  const isolatedTestDbPath = resolve(repoRoot, 'apps/api/prisma/test-phase14.db');
  const host = '127.0.0.1';
  const port = 4314;

  let app: FastifyAppPort;
  let authApi: LegacyAuthApi;
  let adminApi: AdminPortalApi;
  let prisma: PrismaPort;
  let resetParityTables: () => Promise<void>;
  let hashPassword: (value: string) => Promise<string>;
  let seededCourseId = COURSE_ID;
  let seededSubjectId = SUBJECT_ID;
  let seededCohortId = EXISTING_COHORT_ID;
  let seededLiveId = EXISTING_LIVE_CLASS_ID;

  async function loginAs(user: SeededUser): Promise<AuthSession> {
    return authApi.login({
      email: user.email,
      password: user.password,
      roleId: user.roleId,
    });
  }

  async function seedAdminPortalFixture(): Promise<void> {
    const passwordHash = await hashPassword(seededAdmin.password);
    const now = new Date().toISOString();

    const adminUser = await prisma.users.create({
      data: {
        name: 'Phase14 Admin',
        email: seededAdmin.email,
        user_email: seededAdmin.email,
        phone: '9001400001',
        role_id: seededAdmin.roleId,
        password: passwordHash,
        status: 1,
        course_id: COURSE_ID,
      },
    });

    const pipelineUser = await prisma.users.create({
      data: {
        name: 'Phase14 Pipeline',
        email: 'pipeline.phase14@example.test',
        user_email: 'pipeline.phase14@example.test',
        phone: '9001400002',
        role_id: 1,
        password: passwordHash,
        status: 1,
      },
    });

    const instructorUser = await prisma.users.create({
      data: {
        name: 'Phase14 Instructor',
        email: 'instructor.phase14@example.test',
        user_email: 'instructor.phase14@example.test',
        phone: '9001400003',
        role_id: 3,
        password: passwordHash,
        status: 1,
      },
    });

    const studentUser = await prisma.users.create({
      data: {
        name: 'Phase14 Student',
        email: 'student.phase14@example.test',
        user_email: 'student.phase14@example.test',
        phone: '9001400004',
        role_id: 2,
        password: passwordHash,
        status: 1,
        student_id: 'TTS5401',
        course_id: COURSE_ID,
      },
    });

    const centreUser = await prisma.users.create({
      data: {
        name: 'Phase14 Centre',
        email: 'centre.phase14@example.test',
        user_email: 'centre.phase14@example.test',
        phone: '9001400005',
        role_id: 7,
        password: passwordHash,
        status: 1,
      },
    });

    await prisma.$executeRaw`
      INSERT INTO centres (
        id,
        centre_id,
        centre_name,
        contact_person,
        country_code,
        phone,
        email,
        address,
        wallet_balance,
        created_at,
        updated_at
      ) VALUES (
        ${CENTRE_DB_ID},
        54,
        ${'Phase14 Centre Campus'},
        ${'Centre Contact'},
        ${'+91'},
        ${'9001400005'},
        ${'centre.phase14@example.test'},
        ${'Phase14 Centre Street'},
        7200,
        ${now},
        ${now}
      )
    `;

    await prisma.$executeRaw`
      UPDATE users
      SET centre_id = ${CENTRE_DB_ID}
      WHERE id = ${centreUser.id}
    `;

    await prisma.$executeRaw`
      UPDATE users
      SET added_under_centre = ${CENTRE_DB_ID}
      WHERE id = ${studentUser.id}
    `;

    await prisma.$executeRaw`
      INSERT INTO category (id, code, name, created_at)
      VALUES (${CATEGORY_ID}, ${'phase14-admin'}, ${'Phase14 Category'}, ${now})
    `;

    await prisma.$executeRaw`
      INSERT INTO course (
        id,
        category_id,
        title,
        short_name,
        status,
        created_at
      ) VALUES (
        ${COURSE_ID},
        ${CATEGORY_ID},
        ${'Phase14 Admin Operations Course'},
        ${'ADM14'},
        ${'published'},
        ${now}
      )
    `;

    await prisma.$executeRaw`
      INSERT INTO subject (id, course_id, title, created_at)
      VALUES (${SUBJECT_ID}, ${COURSE_ID}, ${'Phase14 Admin Subject'}, ${now})
    `;

    await prisma.$executeRaw`
      INSERT INTO lesson (id, course_id, subject_id, title, summary, free, "order", created_at)
      VALUES (${LESSON_ID}, ${COURSE_ID}, ${SUBJECT_ID}, ${'Phase14 Lesson'}, ${'Admin lesson'}, ${'off'}, 1, ${now})
    `;

    await prisma.$executeRaw`
      INSERT INTO cohorts (
        id,
        subject_id,
        course_id,
        centre_id,
        cohort_id,
        title,
        start_date,
        end_date,
        instructor_id,
        created_at,
        updated_at
      ) VALUES (
        ${EXISTING_COHORT_ID},
        ${SUBJECT_ID},
        ${COURSE_ID},
        ${CENTRE_DB_ID},
        ${'COH-PHASE14'},
        ${'Phase14 Existing Cohort'},
        ${dateOnly(-2)},
        ${dateOnly(35)},
        ${instructorUser.id},
        ${now},
        ${now}
      )
    `;

    await prisma.$executeRaw`
      INSERT INTO cohort_students (cohort_id, user_id, created_at, updated_at)
      VALUES
      (${EXISTING_COHORT_ID}, ${studentUser.id}, ${now}, ${now}),
      (${EXISTING_COHORT_ID}, ${adminUser.id}, ${now}, ${now})
    `;

    await prisma.$executeRaw`
      INSERT INTO live_class (
        id,
        cohort_id,
        session_id,
        title,
        date,
        fromTime,
        toTime,
        zoom_id,
        password,
        repeat_dates,
        is_repetitive,
        created_at,
        updated_at
      ) VALUES (
        ${EXISTING_LIVE_CLASS_ID},
        ${EXISTING_COHORT_ID},
        ${'phase14-live-session'},
        ${'Phase14 Existing Live Session'},
        ${dateOnly(1)},
        ${'09:00:00'},
        ${'10:00:00'},
        ${'zoom-phase14'},
        ${'phase14-live-pass'},
        ${'[]'},
        0,
        ${now},
        ${now}
      )
    `;

    await prisma.$executeRaw`
      INSERT INTO zoom_history (
        user_id,
        live_id,
        join_date,
        join_time,
        leave_time,
        duration,
        created_at,
        updated_at
      ) VALUES (
        ${studentUser.id},
        ${EXISTING_LIVE_CLASS_ID},
        ${dateOnly(1)},
        ${'09:01:00'},
        ${'09:49:00'},
        ${'00:48:00'},
        ${now},
        ${now}
      )
    `;

    await prisma.$executeRaw`
      INSERT INTO applications (
        id,
        application_id,
        name,
        country_code,
        phone,
        email,
        user_email,
        course_id,
        status,
        is_converted,
        pipeline,
        pipeline_user,
        added_under_centre,
        created_by,
        created_at,
        updated_at
      ) VALUES (
        ${APPLICATION_ID},
        ${'APP-5406'},
        ${'Phase14 Applicant'},
        ${'+91'},
        ${'9001400999'},
        ${'+919001400999'},
        ${'phase14.applicant@example.test'},
        ${COURSE_ID},
        ${'pending'},
        0,
        ${'1'},
        ${pipelineUser.id},
        ${CENTRE_DB_ID},
        ${adminUser.id},
        ${now},
        ${now}
      )
    `;

    await prisma.$executeRaw`
      INSERT INTO exam (
        id,
        title,
        description,
        mark,
        duration,
        from_date,
        to_date,
        from_time,
        to_time,
        course_id,
        subject_id,
        lesson_id,
        free,
        created_at
      ) VALUES (
        ${EXISTING_EXAM_ID},
        ${'Phase14 Exam'},
        ${'Admin exam fixture'},
        20,
        ${'01:00'},
        ${dateOnly(1)},
        ${dateOnly(1)},
        ${'10:30:00'},
        ${'11:30:00'},
        ${COURSE_ID},
        ${SUBJECT_ID},
        ${LESSON_ID},
        ${'1'},
        ${now}
      )
    `;

    await prisma.$executeRaw`
      INSERT INTO assignment (
        id,
        title,
        description,
        total_marks,
        due_date,
        from_time,
        to_time,
        instructions,
        file,
        course_id,
        cohort_id,
        created_by,
        created_at
      ) VALUES (
        ${EXISTING_ASSIGNMENT_ID},
        ${'Phase14 Assignment'},
        ${'Admin assignment fixture'},
        25,
        ${dateOnly(1)},
        ${'11:00:00'},
        ${'13:00:00'},
        ${'<li>Submit assignment</li>'},
        ${'uploads/assignment/phase14.pdf'},
        ${COURSE_ID},
        ${EXISTING_COHORT_ID},
        ${instructorUser.id},
        ${now}
      )
    `;

    await prisma.$executeRaw`
      INSERT INTO settings ("key", value, created_at, updated_at)
      VALUES
      (${ 'system_name' }, ${'TTII Phase14'}, ${now}, ${now}),
      (${ 'system_email' }, ${'ops.phase14@example.test'}, ${now}, ${now})
    `;

    await prisma.$executeRaw`
      INSERT INTO frontend_settings ("key", value, created_at, updated_at)
      VALUES
      (${ 'banner_title' }, ${'Phase14 Banner'}, ${now}, ${now}),
      (${ 'about_us' }, ${'Phase14 About'}, ${now}, ${now})
    `;

    await prisma.$executeRaw`
      INSERT INTO app_version (id, app_version, app_version_ios, created_at, updated_at)
      VALUES (1, ${'3.0.0'}, ${'3.0.1'}, ${now}, ${now})
    `;

    await prisma.$executeRaw`
      INSERT INTO centre_course_plans (
        centre_id,
        course_id,
        assigned_amount,
        start_date,
        end_date,
        created_at,
        updated_at
      ) VALUES (
        ${CENTRE_DB_ID},
        ${COURSE_ID},
        2100,
        ${dateOnly(-3)},
        ${dateOnly(60)},
        ${now},
        ${now}
      )
    `;

    seededCourseId = COURSE_ID;
    seededSubjectId = SUBJECT_ID;
    seededCohortId = EXISTING_COHORT_ID;
    seededLiveId = EXISTING_LIVE_CLASS_ID;
  }

  beforeAll(async () => {
    await copyFile(baseTestDbPath, isolatedTestDbPath);

    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = `file:${isolatedTestDbPath}`;
    process.env.API_HOST = host;
    process.env.API_PORT = String(port);

    const [appModuleRaw, passwordModuleRaw, testDbModuleRaw] = await Promise.all([
      import('../../api/src/app'),
      import('../../api/src/auth/password'),
      import('../../api/tests/data/test-db'),
    ]);

    const appModule = appModuleRaw as unknown as AppModule;
    const passwordModule = passwordModuleRaw as unknown as PasswordModule;
    const testDbModule = testDbModuleRaw as unknown as TestDbModule;

    hashPassword = passwordModule.hashPassword;
    prisma = testDbModule.prisma;
    resetParityTables = testDbModule.resetParityTables;

    app = appModule.buildApp();
    await app.listen({ host, port });

    const apiClient = new LegacyApiClient({
      baseUrl: `http://${host}:${port}/api`,
    });

    authApi = new LegacyAuthApi(apiClient);
    adminApi = new AdminPortalApi(apiClient);
  });

  beforeEach(async () => {
    await resetParityTables();
    await seedAdminPortalFixture();
  });

  afterAll(async () => {
    await app.close();
    await rm(isolatedTestDbPath, { force: true });
  });

  it('loads admin subroutes and snapshot sections for P0 and P1 paths', async () => {
    const session = await loginAs(seededAdmin);

    const routeResult = await loadRoleShellForPath('/admin/dashboard', session, authApi);
    expect(routeResult).not.toBeNull();
    expect(routeResult?.route.surface).toBe('admin');
    expect(routeResult?.access.status).toBe('ready');

    const dashboard = await adminApi.loadDashboard(session.token);
    expect(dashboard.applicationsTotal).toBeGreaterThan(0);
    expect(dashboard.centresTotal).toBeGreaterThan(0);

    const applications = await adminApi.loadApplications(session.token);
    expect(applications.items.length).toBeGreaterThan(0);

    const students = await adminApi.loadStudents(session.token);
    expect(students.length).toBeGreaterThan(0);

    const centres = await adminApi.loadCentres(session.token);
    expect(centres.length).toBeGreaterThan(0);

    const courses = await adminApi.loadCourses(session.token);
    expect(courses.length).toBeGreaterThan(0);

    const subjects = await adminApi.loadSubjects(session.token, seededCourseId);
    expect(subjects.length).toBeGreaterThan(0);

    const lessons = await adminApi.loadLessons(session.token, seededSubjectId);
    expect(lessons.length).toBeGreaterThan(0);

    const resources = await adminApi.loadResources(session.token, 0, CENTRE_DB_ID);
    expect(asRecord(resources)).not.toBeNull();

    const assessments = await adminApi.loadAssessments(session.token, {
      courseId: seededCourseId,
      subjectId: seededSubjectId,
      cohortId: seededCohortId,
    });
    expect(Array.isArray(assessments.upcomingExams)).toBe(true);
    expect(Array.isArray(assessments.currentAssignments)).toBe(true);

    const reports = await adminApi.loadReports(session.token, {
      fromDate: dateOnly(-2),
      toDate: dateOnly(2),
    });
    expect(asNumber(reports.applications_total)).toBeGreaterThan(0);

    const liveReport = await adminApi.loadLiveReport(session.token, seededLiveId, dateOnly(1));
    expect(liveReport.listItems.length).toBeGreaterThan(0);

    const calendar = await adminApi.loadGlobalCalendar(session.token, dateOnly(-2), dateOnly(4));
    expect(calendar.some((entry) => String(entry.event_type) === 'live_class')).toBe(true);

    const settings = await adminApi.loadSettings(session.token);
    expect(settings.systemSettings.length).toBeGreaterThan(0);
    expect(settings.frontendSettings.length).toBeGreaterThan(0);
    expect(asNumber(settings.appVersion.id)).toBeGreaterThan(0);
  });

  it('executes admin workflow mutations for users, content, assessments, reports, and settings', async () => {
    const session = await loginAs(seededAdmin);

    const addCentreResponse = await adminApi.addCentre(session.token, {
      centreName: 'Phase14 New Centre',
      contactPerson: 'New Contact',
      countryCode: '+91',
      phone: '9001499999',
      email: 'phase14.new.centre@example.test',
      address: 'Phase14 New Street',
      registrationDate: dateOnly(0),
      expiryDate: dateOnly(365),
      password: 'Centre#Phase14New',
    });

    expect(asNumber(addCentreResponse.status)).toBe(1);
    const addCentreData = asRecord(addCentreResponse.data) ?? {};
    const newCentreId = asNumber(addCentreData.centre_id);
    expect(newCentreId).toBeGreaterThan(0);

    const assignPlanResponse = await adminApi.assignCentrePlan(session.token, {
      centreId: newCentreId,
      courseId: seededCourseId,
      assignedAmount: 3000,
      startDate: dateOnly(0),
      endDate: dateOnly(45),
    });
    expect(asNumber(assignPlanResponse.status)).toBe(1);

    const convertResponse = await adminApi.convertApplication(session.token, APPLICATION_ID);
    expect(asNumber(convertResponse.status)).toBe(1);

    const convertedRows = await prisma.$queryRaw<Array<{ is_converted: number | bigint }>>`
      SELECT is_converted
      FROM applications
      WHERE id = ${APPLICATION_ID}
      LIMIT 1
    `;
    expect(asNumber(convertedRows[0]?.is_converted)).toBe(1);

    const addFolderResponse = await adminApi.addResourceFolder(session.token, 0, 'Phase14 Admin Folder', newCentreId);
    expect(asNumber(addFolderResponse.status)).toBe(1);

    const addFolderData = asRecord(addFolderResponse.data) ?? {};
    const folderId = asNumber(addFolderData.folder_id);
    expect(folderId).toBeGreaterThan(0);

    const addFileResponse = await adminApi.addResourceFile(session.token, {
      folderId,
      centreId: newCentreId,
      name: 'phase14-admin-resource.txt',
      type: 'text/plain',
      size: 512,
      path: 'uploads/resources/phase14-admin-resource.txt',
    });
    expect(asNumber(addFileResponse.status)).toBe(1);

    const resourceSnapshot = await adminApi.loadResources(session.token, folderId, newCentreId);
    const resourceFiles = (asRecord(resourceSnapshot)?.files as unknown[]) ?? [];
    expect(resourceFiles.some((entry) => asRecord(entry)?.name === 'phase14-admin-resource.txt')).toBe(true);

    const addLiveResponse = await adminApi.addLiveClass(session.token, {
      cohortId: seededCohortId,
      zoomId: 'zoom-phase14-admin-e2e',
      password: 'phase14-live-password',
      entries: [
        {
          sessionId: 'phase14-live-e2e',
          title: 'Phase14 Admin Live Added',
          date: dateOnly(3),
          fromTime: '12:00:00',
          toTime: '13:00:00',
          isRepetitive: 0,
          repeatDates: [],
        },
      ],
    });
    expect(Boolean(addLiveResponse.success)).toBe(true);

    const liveRows = await prisma.$queryRaw<Array<{ count: number | bigint }>>`
      SELECT COUNT(*) AS count
      FROM live_class
      WHERE cohort_id = ${seededCohortId}
        AND title = ${'Phase14 Admin Live Added'}
        AND deleted_at IS NULL
    `;
    expect(asNumber(liveRows[0]?.count)).toBe(1);

    const systemSettingsResponse = await adminApi.updateSystemSettings(session.token, {
      system_name: 'TTII Phase14 Ops',
      system_email: 'phase14.ops@example.test',
    });
    expect(asNumber(systemSettingsResponse.status)).toBe(1);

    const websiteSettingsResponse = await adminApi.updateWebsiteSettings(session.token, {
      banner_title: 'Phase14 Updated Banner',
      about_us: 'Phase14 Updated About',
    });
    expect(asNumber(websiteSettingsResponse.status)).toBe(1);

    const appVersionResponse = await adminApi.updateAppVersion(session.token, {
      appVersion: '4.0.0',
      appVersionIos: '4.0.1',
    });
    expect(asNumber(appVersionResponse.status)).toBe(1);

    const settingsSnapshot = await adminApi.loadSettings(session.token);
    expect(asRecord(settingsSnapshot.appVersion)?.app_version).toBe('4.0.0');
    expect(asRecord(settingsSnapshot.appVersion)?.app_version_ios).toBe('4.0.1');

    const exportSummary = await adminApi.exportReport(session.token, {
      type: 'summary',
      fromDate: dateOnly(-5),
      toDate: dateOnly(5),
    });
    expect(exportSummary.csv.includes('applications_total')).toBe(true);

    const exportLive = await adminApi.exportReport(session.token, {
      type: 'live_report',
      liveId: seededLiveId,
      date: dateOnly(1),
    });
    expect(exportLive.csv.includes('live_id')).toBe(true);
  });
});
