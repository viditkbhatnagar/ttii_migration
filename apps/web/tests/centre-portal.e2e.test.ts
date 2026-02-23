/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { copyFile, rm } from 'node:fs/promises';

import { LegacyApiClient, LegacyAuthApi, type AuthSession } from '@ttii/frontend-core';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { CentrePortalApi } from '../src/centre/centre-portal-api';
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

const seededCentre: SeededUser = {
  email: 'centre.phase13@example.test',
  password: 'CentrePass#Phase13',
  roleId: 7,
};

const COURSE_ID = 5301;
const CATEGORY_ID = 5302;
const CENTRE_DB_ID = 5303;
const SUBJECT_ID = 5304;
const SUBJECT_TWO_ID = 5305;
const EXISTING_APPLICATION_ID = 5306;
const EXISTING_COHORT_ID = 5307;
const EXISTING_LIVE_CLASS_ID = 5308;

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

describe('Phase 13 centre portal e2e', () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = resolve(currentFile, '../../../..');
  const baseTestDbPath = resolve(repoRoot, 'apps/api/prisma/test.db');
  const isolatedTestDbPath = resolve(repoRoot, 'apps/api/prisma/test-phase13.db');
  const host = '127.0.0.1';
  const port = 4313;

  let app: FastifyAppPort;
  let authApi: LegacyAuthApi;
  let centreApi: CentrePortalApi;
  let prisma: PrismaPort;
  let resetParityTables: () => Promise<void>;
  let hashPassword: (value: string) => Promise<string>;
  let seededCentreStudentId = 0;
  let seededInstructorId = 0;

  async function loginAs(user: SeededUser): Promise<AuthSession> {
    return authApi.login({
      email: user.email,
      password: user.password,
      roleId: user.roleId,
    });
  }

  async function seedCentrePortalFixture(): Promise<{ centreStudentId: number; instructorId: number }> {
    const passwordHash = await hashPassword(seededCentre.password);
    const now = new Date().toISOString();

    const adminUser = await prisma.users.create({
      data: {
        name: 'Phase13 Admin',
        email: 'admin.phase13@example.test',
        user_email: 'admin.phase13@example.test',
        phone: '9001300131',
        role_id: 1,
        password: passwordHash,
        status: 1,
      },
    });

    const centreUser = await prisma.users.create({
      data: {
        name: 'Phase13 Centre',
        email: seededCentre.email,
        user_email: seededCentre.email,
        phone: '9001300130',
        role_id: seededCentre.roleId,
        password: passwordHash,
        status: 1,
      },
    });

    const instructor = await prisma.users.create({
      data: {
        name: 'Phase13 Instructor',
        email: 'instructor.phase13@example.test',
        user_email: 'instructor.phase13@example.test',
        phone: '9001300132',
        role_id: 3,
        password: passwordHash,
        status: 1,
      },
    });

    const centreStudent = await prisma.users.create({
      data: {
        name: 'Phase13 Student',
        email: 'student.phase13@example.test',
        user_email: 'student.phase13@example.test',
        phone: '9001300133',
        role_id: 2,
        password: passwordHash,
        status: 1,
        student_id: 'TTS5301',
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
        53,
        ${'Phase13 Centre Campus'},
        ${'Centre Contact'},
        ${'+91'},
        ${'9001300130'},
        ${seededCentre.email},
        ${'Centre Street'},
        6400,
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
      WHERE id = ${centreStudent.id}
    `;

    await prisma.$executeRaw`
      INSERT INTO category (id, code, name, created_at)
      VALUES (${CATEGORY_ID}, ${'phase13-centre'}, ${'Phase13 Category'}, ${now})
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
        ${'Phase 13 Centre Operations'},
        ${'CEN13'},
        ${'published'},
        ${now}
      )
    `;

    await prisma.$executeRaw`
      INSERT INTO subject (id, course_id, title, created_at)
      VALUES
      (${SUBJECT_ID}, ${COURSE_ID}, ${'Centre Subject A'}, ${now}),
      (${SUBJECT_TWO_ID}, ${COURSE_ID}, ${'Centre Subject B'}, ${now})
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
        2200,
        ${dateOnly(-5)},
        ${dateOnly(30)},
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
        ${EXISTING_APPLICATION_ID},
        ${'APP-5306'},
        ${'Existing Applicant'},
        ${'+91'},
        ${'9001300999'},
        ${'+919001300999'},
        ${'existing.phase13.applicant@example.test'},
        ${COURSE_ID},
        ${'pending'},
        0,
        ${'1'},
        ${adminUser.id},
        ${CENTRE_DB_ID},
        ${centreUser.id},
        ${now},
        ${now}
      )
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
        ${'COH-PHASE13'},
        ${'Phase13 Existing Cohort'},
        ${dateOnly(-2)},
        ${dateOnly(25)},
        ${instructor.id},
        ${now},
        ${now}
      )
    `;

    await prisma.$executeRaw`
      INSERT INTO cohort_students (
        cohort_id,
        user_id,
        created_at,
        updated_at
      ) VALUES (
        ${EXISTING_COHORT_ID},
        ${centreStudent.id},
        ${now},
        ${now}
      )
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
        ${'phase13-live-session'},
        ${'Existing Live Session'},
        ${dateOnly(1)},
        ${'10:00:00'},
        ${'11:00:00'},
        ${'zoom-phase13'},
        ${'pass-phase13'},
        ${'[]'},
        0,
        ${now},
        ${now}
      )
    `;

    await prisma.$executeRaw`
      INSERT INTO wallet_transactions (
        centre_id,
        transaction_type,
        amount,
        remarks,
        reference_id,
        created_at,
        updated_at
      ) VALUES
      (${CENTRE_DB_ID}, ${'credit'}, 4000, ${'Initial wallet topup'}, ${'CR-5301'}, ${now}, ${now}),
      (${CENTRE_DB_ID}, ${'debit'}, 1200, ${'Cohort allocation'}, ${'DB-5301'}, ${now}, ${now})
    `;

    await prisma.$executeRaw`
      INSERT INTO centre_fundrequests (
        centre_id,
        user_id,
        amount,
        date,
        transaction_receipt,
        description,
        attachment_file,
        status,
        created_at,
        updated_at
      ) VALUES (
        ${CENTRE_DB_ID},
        ${centreUser.id},
        1500,
        ${dateOnly(-1)},
        ${'REC-5301'},
        ${'Need additional live class budget'},
        ${'uploads/fund/phase13-receipt.png'},
        ${'pending'},
        ${now},
        ${now}
      )
    `;

    await prisma.$executeRaw`
      INSERT INTO support_chat (
        chat_id,
        sender_id,
        message,
        created_at,
        created_by,
        updated_at,
        updated_by
      ) VALUES (
        ${centreUser.id},
        ${adminUser.id},
        ${'Welcome to centre support'},
        ${now},
        ${adminUser.id},
        ${now},
        ${adminUser.id}
      )
    `;

    await prisma.$executeRaw`
      INSERT INTO training_videos (
        title,
        description,
        category,
        video_type,
        video_url,
        thumbnail,
        created_at,
        updated_at
      ) VALUES (
        ${'Phase13 Training Video'},
        ${'Centre onboarding walkthrough'},
        ${'Lectures'},
        ${'youtube'},
        ${'https://video.example/phase13-training'},
        ${'uploads/training/phase13.png'},
        ${now},
        ${now}
      )
    `;

    return {
      centreStudentId: centreStudent.id,
      instructorId: instructor.id,
    };
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
    centreApi = new CentrePortalApi(apiClient);
  });

  beforeEach(async () => {
    await resetParityTables();
    const fixture = await seedCentrePortalFixture();
    seededCentreStudentId = fixture.centreStudentId;
    seededInstructorId = fixture.instructorId;
  });

  afterAll(async () => {
    await app.close();
    await rm(isolatedTestDbPath, { force: true });
  });

  it('loads centre subroutes and snapshot sections for P0 and P1 paths', async () => {
    const session = await loginAs(seededCentre);

    const routeResult = await loadRoleShellForPath('/centre/dashboard', session, authApi);
    expect(routeResult).not.toBeNull();
    expect(routeResult?.route.surface).toBe('centre');
    expect(routeResult?.access.status).toBe('ready');

    const dashboard = await centreApi.loadDashboard(session.token);
    expect(dashboard.students).toBeGreaterThan(0);
    expect(dashboard.walletBalance).toBeGreaterThan(0);
    expect(dashboard.pendingApplications).toBeGreaterThan(0);

    const applications = await centreApi.loadApplications(session.token);
    expect(applications.items.length).toBeGreaterThan(0);

    const students = await centreApi.loadStudents(session.token);
    expect(students.length).toBeGreaterThan(0);

    const courses = await centreApi.loadCourses(session.token);
    expect(courses.length).toBeGreaterThan(0);

    const cohorts = await centreApi.loadCohorts(session.token);
    expect(cohorts.length).toBeGreaterThan(0);

    const liveClasses = await centreApi.loadLiveClasses(session.token);
    expect(liveClasses.length).toBeGreaterThan(0);

    const resources = await centreApi.loadResources(session.token, 0);
    expect(asRecord(resources)).not.toBeNull();

    const wallet = await centreApi.loadWallet(session.token);
    expect(wallet.walletBalance).toBeGreaterThan(0);
    expect(wallet.fundRequests.length).toBeGreaterThan(0);

    const supportMessages = await centreApi.loadSupportMessages(session.token);
    expect(supportMessages.length).toBeGreaterThan(0);

    const trainingVideos = await centreApi.loadTrainingVideos(session.token);
    expect(trainingVideos.length).toBeGreaterThan(0);
  });

  it('executes centre workflow mutations for applications, cohorts, live, resources, wallet, and support', async () => {
    const session = await loginAs(seededCentre);

    const addApplicationResponse = await centreApi.addApplication(session.token, {
      name: 'Phase13 New Applicant',
      countryCode: '+91',
      phone: '9010019901',
      email: 'phase13.new.applicant@example.test',
      courseId: COURSE_ID,
      pipeline: '1',
      pipelineUser: seededInstructorId,
      status: 'pending',
    });

    expect(asNumber(addApplicationResponse.status)).toBe(1);
    const newApplicationId = asNumber(addApplicationResponse.application_id);
    expect(newApplicationId).toBeGreaterThan(0);

    const convertResponse = await centreApi.convertApplication(session.token, newApplicationId);
    expect(asNumber(convertResponse.status)).toBe(1);

    const convertedRows = await prisma.$queryRaw<Array<{ is_converted: number | bigint }>>`
      SELECT is_converted
      FROM applications
      WHERE id = ${newApplicationId}
      LIMIT 1
    `;
    expect(asNumber(convertedRows[0]?.is_converted)).toBe(1);

    const addCohortResponse = await centreApi.addCohort(session.token, {
      title: 'Phase 13 New Cohort',
      courseId: COURSE_ID,
      subjectId: SUBJECT_TWO_ID,
      instructorId: seededInstructorId,
      startDate: dateOnly(0),
      endDate: dateOnly(40),
    });

    expect(Boolean(addCohortResponse.success)).toBe(true);
    const addCohortData = asRecord(addCohortResponse.data) ?? {};
    const cohortId = asNumber(addCohortData.cohort_id);
    expect(cohortId).toBeGreaterThan(0);

    const addLearnerResponse = await centreApi.addCohortStudents(session.token, cohortId, [seededCentreStudentId]);
    expect(Boolean(addLearnerResponse.success)).toBe(true);

    const cohortStudentRows = await prisma.$queryRaw<Array<{ count: number | bigint }>>`
      SELECT COUNT(*) AS count
      FROM cohort_students
      WHERE cohort_id = ${cohortId}
        AND user_id = ${seededCentreStudentId}
        AND deleted_at IS NULL
    `;
    expect(asNumber(cohortStudentRows[0]?.count)).toBe(1);

    const addLiveResponse = await centreApi.addLiveClass(session.token, {
      cohortId,
      zoomId: 'zoom-phase13-centre-e2e',
      password: 'phase13-live',
      entries: [
        {
          sessionId: 'phase13-live-e2e',
          title: 'Phase13 Live Added',
          date: dateOnly(2),
          fromTime: '11:00:00',
          toTime: '12:00:00',
          isRepetitive: 0,
          repeatDates: [],
        },
      ],
    });
    expect(Boolean(addLiveResponse.success)).toBe(true);

    const liveRows = await prisma.$queryRaw<Array<{ count: number | bigint }>>`
      SELECT COUNT(*) AS count
      FROM live_class
      WHERE cohort_id = ${cohortId}
        AND title = ${'Phase13 Live Added'}
        AND deleted_at IS NULL
    `;
    expect(asNumber(liveRows[0]?.count)).toBe(1);

    const addFolderResponse = await centreApi.addFolder(session.token, 0, 'Phase13 Resource Folder');
    expect(asNumber(addFolderResponse.status)).toBe(1);
    const addFolderData = asRecord(addFolderResponse.data) ?? {};
    const folderId = asNumber(addFolderData.folder_id);
    expect(folderId).toBeGreaterThan(0);

    const addFileResponse = await centreApi.addFile(session.token, {
      folderId,
      name: 'phase13-resource.txt',
      type: 'text/plain',
      size: 512,
      path: 'uploads/resources/phase13-resource.txt',
    });
    expect(asNumber(addFileResponse.status)).toBe(1);

    const resourceSnapshot = await centreApi.loadResources(session.token, folderId);
    const resourceFiles = (asRecord(resourceSnapshot)?.files as unknown[]) ?? [];
    expect(resourceFiles.some((entry) => asRecord(entry)?.name === 'phase13-resource.txt')).toBe(true);

    const walletBefore = await centreApi.loadWallet(session.token);

    const addFundResponse = await centreApi.addFundRequest(session.token, {
      amount: 2100,
      transactionNo: 'REC-PHASE13-NEW',
      description: 'Additional support budget',
    });
    expect(asNumber(addFundResponse.status)).toBe(1);

    const walletAfter = await centreApi.loadWallet(session.token);
    expect(walletAfter.fundRequests.length).toBeGreaterThan(walletBefore.fundRequests.length);

    const supportBefore = await centreApi.loadSupportMessages(session.token);
    const supportSubmitResponse = await centreApi.submitSupportMessage(session.token, 'Phase13 support workflow message');
    expect(asNumber(supportSubmitResponse.status)).toBe(1);
    const supportAfter = await centreApi.loadSupportMessages(session.token);
    expect(supportAfter.length).toBeGreaterThan(supportBefore.length);
  });
});
