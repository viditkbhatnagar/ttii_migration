import { Prisma } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { resetAuthRateLimitersForTests } from '../../src/auth/auth-service.js';
import { hashPassword } from '../../src/auth/password.js';
import { buildApp } from '../../src/app.js';
import { prisma, resetParityTables } from '../data/test-db.js';

const COURSE_ID = 5101;
const SUBJECT_ID = 5102;
const SUBJECT_TWO_ID = 5107;
const CENTRE_DB_ID = 5103;
const APPLICATION_ID = 5104;
const EXISTING_COHORT_ID = 5105;
const EXISTING_LIVE_CLASS_ID = 5106;

function parseJsonBody<T>(body: string): T {
  return JSON.parse(body) as T;
}

function localDate(offsetDays = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function loginToken(
  app: ReturnType<typeof buildApp>,
  email: string,
  password: string,
  roleId: number,
): Promise<string> {
  const loginResponse = await app.inject({
    method: 'GET',
    url: '/api/login/index',
    query: {
      email,
      password,
      role_id: String(roleId),
    },
  });

  expect(loginResponse.statusCode).toBe(200);

  return parseJsonBody<{ userdata: { auth_token: string } }>(loginResponse.body).userdata.auth_token;
}

async function seedOperationsFixture(app: ReturnType<typeof buildApp>): Promise<{
  adminToken: string;
  centreToken: string;
  adminUserId: number;
  centreUserId: number;
  centreStudentId: number;
}> {
  const password = 'OpsPass#2026';
  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();
  const today = localDate();

  const adminUser = await prisma.users.create({
    data: {
      name: 'Phase10 Admin',
      email: 'phase10.admin@example.test',
      user_email: 'phase10.admin@example.test',
      phone: '9000111100',
      role_id: 1,
      password: passwordHash,
      status: 1,
    },
  });

  const centreUser = await prisma.users.create({
    data: {
      name: 'Phase10 Centre',
      email: 'phase10.centre@example.test',
      user_email: 'phase10.centre@example.test',
      phone: '9000111101',
      role_id: 7,
      password: passwordHash,
      status: 1,
    },
  });

  const instructor = await prisma.users.create({
    data: {
      name: 'Phase10 Instructor',
      email: 'phase10.instructor@example.test',
      user_email: 'phase10.instructor@example.test',
      phone: '9000111102',
      role_id: 3,
      password: passwordHash,
      status: 1,
    },
  });

  const centreStudent = await prisma.users.create({
    data: {
      name: 'Centre Learner',
      email: 'phase10.student@example.test',
      user_email: 'phase10.student@example.test',
      phone: '9000111103',
      role_id: 2,
      password: passwordHash,
      status: 1,
      student_id: 'TTS0001',
    },
  });

  await prisma.$executeRaw(Prisma.sql`
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
      1,
      ${'North Campus Centre'},
      ${'Centre Contact'},
      ${'+91'},
      ${'9000111101'},
      ${'phase10.centre@example.test'},
      ${'City Road'},
      5000,
      ${now},
      ${now}
    )
  `);

  await prisma.$executeRaw(Prisma.sql`
    UPDATE users
    SET centre_id = ${CENTRE_DB_ID}
    WHERE id = ${centreUser.id}
  `);

  await prisma.$executeRaw(Prisma.sql`
    UPDATE users
    SET added_under_centre = ${CENTRE_DB_ID}
    WHERE id = ${centreStudent.id}
  `);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO course (id, category_id, title, short_name, status, created_at)
    VALUES (${COURSE_ID}, 1, ${'Admin Operations Course'}, ${'AOC'}, ${'published'}, ${now})
  `);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO subject (id, course_id, title, created_at)
    VALUES (${SUBJECT_ID}, ${COURSE_ID}, ${'Foundations'}, ${now})
  `);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO subject (id, course_id, title, created_at)
    VALUES (${SUBJECT_TWO_ID}, ${COURSE_ID}, ${'Advanced Foundations'}, ${now})
  `);

  await prisma.$executeRaw(Prisma.sql`
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
      added_under_centre,
      created_by,
      created_at,
      updated_at
    ) VALUES (
      ${APPLICATION_ID},
      ${'APP-5104'},
      ${'Converted Applicant'},
      ${'+91'},
      ${'9000111199'},
      ${'+919000111199'},
      ${'phase10.applicant@example.test'},
      ${COURSE_ID},
      ${'pending'},
      0,
      ${CENTRE_DB_ID},
      ${centreUser.id},
      ${now},
      ${now}
    )
  `);

  await prisma.$executeRaw(Prisma.sql`
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
      ${'COH-EXIST-01'},
      ${'Existing Cohort'},
      ${today},
      ${localDate(30)},
      ${instructor.id},
      ${now},
      ${now}
    )
  `);

  await prisma.$executeRaw(Prisma.sql`
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
      ${'sess-phase10'},
      ${'Existing Live Session'},
      ${today},
      ${'10:00:00'},
      ${'11:00:00'},
      ${'zoom-phase10'},
      ${'pass-phase10'},
      ${'[]'},
      0,
      ${now},
      ${now}
    )
  `);

  await prisma.$executeRaw(Prisma.sql`
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
      ${centreStudent.id},
      ${EXISTING_LIVE_CLASS_ID},
      ${today},
      ${'10:01:00'},
      ${'10:53:00'},
      ${'00:52:00'},
      ${now},
      ${now}
    )
  `);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO settings ("key", value, created_at, updated_at)
    VALUES (${ 'system_name' }, ${'TTII'}, ${now}, ${now})
  `);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO frontend_settings ("key", value, created_at, updated_at)
    VALUES (${ 'banner_title' }, ${'Welcome'}, ${now}, ${now})
  `);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO app_version (id, app_version, app_version_ios, created_at, updated_at)
    VALUES (1, ${'1.0.0'}, ${'1.0.0'}, ${now}, ${now})
  `);

  const adminToken = await loginToken(app, 'phase10.admin@example.test', password, 1);
  const centreToken = await loginToken(app, 'phase10.centre@example.test', password, 7);

  return {
    adminToken,
    centreToken,
    adminUserId: adminUser.id,
    centreUserId: centreUser.id,
    centreStudentId: centreStudent.id,
  };
}

describe('Phase 10 admin and centre operations parity contracts', () => {
  const app = buildApp();

  beforeEach(async () => {
    resetAuthRateLimitersForTests();
    await resetParityTables();
  });

  afterAll(async () => {
    await app.close();
  });

  it('enforces admin and centre role gates and converts applications into students', async () => {
    const fixture = await seedOperationsFixture(app);

    const unauthorized = await app.inject({
      method: 'GET',
      url: '/api/admin/applications/index',
    });
    expect(unauthorized.statusCode).toBe(401);

    const forbidden = await app.inject({
      method: 'GET',
      url: '/api/admin/applications/index',
      query: {
        auth_token: fixture.centreToken,
      },
    });
    expect(forbidden.statusCode).toBe(403);

    const adminApplications = await app.inject({
      method: 'GET',
      url: '/api/admin/applications/index',
      query: {
        auth_token: fixture.adminToken,
      },
    });

    const adminApplicationsPayload = parseJsonBody<{
      status: number;
      data: { students: Array<{ id: number; status: string }> };
    }>(adminApplications.body);

    expect(adminApplicationsPayload.status).toBe(1);
    expect(adminApplicationsPayload.data.students.some((item) => item.id === APPLICATION_ID)).toBe(true);

    const centreApplications = await app.inject({
      method: 'GET',
      url: '/api/centre/applications/index',
      query: {
        auth_token: fixture.centreToken,
      },
    });

    const centreApplicationsPayload = parseJsonBody<{
      status: number;
      data: { students: Array<{ id: number }> };
    }>(centreApplications.body);
    expect(centreApplicationsPayload.status).toBe(1);
    expect(centreApplicationsPayload.data.students.some((item) => item.id === APPLICATION_ID)).toBe(true);

    const converted = await app.inject({
      method: 'POST',
      url: '/api/admin/applications/convert',
      payload: {
        auth_token: fixture.adminToken,
        application_id: APPLICATION_ID,
      },
    });

    const convertedPayload = parseJsonBody<{
      status: number;
      data: { student_user_id: number; student_id: string };
    }>(converted.body);

    expect(convertedPayload.status).toBe(1);
    expect(convertedPayload.data.student_user_id).toBeGreaterThan(0);
    expect(convertedPayload.data.student_id.startsWith('TTS')).toBe(true);

    const convertedAppRows = await prisma.$queryRaw<Array<{ is_converted: number }>>(Prisma.sql`
      SELECT is_converted
      FROM applications
      WHERE id = ${APPLICATION_ID}
    `);
    expect(Number(convertedAppRows[0]?.is_converted ?? 0)).toBe(1);

    const enrolRows = await prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
      SELECT COUNT(*) AS count
      FROM enrol
      WHERE user_id = ${convertedPayload.data.student_user_id}
        AND course_id = ${COURSE_ID}
    `);
    expect(Number(enrolRows[0]?.count ?? 0)).toBe(1);

    const adminStudents = await app.inject({
      method: 'GET',
      url: '/api/admin/students/index',
      query: {
        auth_token: fixture.adminToken,
      },
    });

    const adminStudentsPayload = parseJsonBody<{
      status: number;
      data: Array<{ id: number; course_id: number }>;
    }>(adminStudents.body);

    expect(adminStudentsPayload.status).toBe(1);
    expect(adminStudentsPayload.data.some((entry) => entry.id === convertedPayload.data.student_user_id)).toBe(true);

    const centreStudents = await app.inject({
      method: 'GET',
      url: '/api/centre/students/index',
      query: {
        auth_token: fixture.centreToken,
      },
    });

    const centreStudentsPayload = parseJsonBody<{
      status: number;
      data: Array<{ id: number }>;
    }>(centreStudents.body);

    expect(centreStudentsPayload.status).toBe(1);
    expect(centreStudentsPayload.data.some((entry) => entry.id === convertedPayload.data.student_user_id)).toBe(true);
  });

  it('supports centre cohort, live class, and resource operations', async () => {
    const fixture = await seedOperationsFixture(app);

    const addCohort = await app.inject({
      method: 'POST',
      url: '/api/centre/cohorts/add',
      payload: {
        auth_token: fixture.centreToken,
        title: 'Phase 10 New Cohort',
        course_id: COURSE_ID,
        subject_id: SUBJECT_TWO_ID,
        instructor_id: fixture.adminUserId,
        start_date: localDate(),
        end_date: localDate(45),
      },
    });

    const addCohortPayload = parseJsonBody<{
      success: boolean;
      data: { cohort_id: number };
    }>(addCohort.body);

    expect(addCohortPayload.success).toBe(true);
    const cohortId = addCohortPayload.data.cohort_id;

    const addStudents = await app.inject({
      method: 'POST',
      url: '/api/centre/cohorts/add_cohort_students',
      payload: {
        auth_token: fixture.centreToken,
        cohort_id: cohortId,
        student_id: [fixture.centreStudentId],
      },
    });

    const addStudentsPayload = parseJsonBody<{ success: boolean; added_count: number }>(addStudents.body);
    expect(addStudentsPayload.success).toBe(true);
    expect(addStudentsPayload.added_count).toBe(1);

    const addLiveClass = await app.inject({
      method: 'POST',
      url: '/api/centre/live_class/add',
      payload: {
        auth_token: fixture.centreToken,
        cohort_id: cohortId,
        zoom_id: 'zoom-centre-001',
        password: 'live-pass-001',
        entries: [
          {
            session_id: 'session-centre-001',
            title: 'Live Practice Session',
            date: localDate(1),
            fromTime: '09:00:00',
            toTime: '10:00:00',
            is_repetitive: 0,
            repeat_dates: [],
          },
        ],
      },
    });

    const addLiveClassPayload = parseJsonBody<{ success: boolean; message: string }>(addLiveClass.body);
    expect(addLiveClassPayload.success).toBe(true);
    expect(addLiveClassPayload.message.includes('added successfully')).toBe(true);

    const liveIndex = await app.inject({
      method: 'GET',
      url: '/api/centre/live_class/index',
      query: {
        auth_token: fixture.centreToken,
      },
    });

    const liveIndexPayload = parseJsonBody<{ status: number; data: Array<{ cohort_id: number }> }>(liveIndex.body);
    expect(liveIndexPayload.status).toBe(1);
    expect(liveIndexPayload.data.some((entry) => entry.cohort_id === cohortId)).toBe(true);

    const addFolder = await app.inject({
      method: 'POST',
      url: '/api/centre/resources/add_folder',
      payload: {
        auth_token: fixture.centreToken,
        parent_id: 0,
        name: 'Centre Materials',
      },
    });

    const addFolderPayload = parseJsonBody<{ status: number; data: { folder_id: number } }>(addFolder.body);
    expect(addFolderPayload.status).toBe(1);

    const folderId = addFolderPayload.data.folder_id;

    const addFile = await app.inject({
      method: 'POST',
      url: '/api/centre/resources/add_file',
      payload: {
        auth_token: fixture.centreToken,
        folder_id: folderId,
        name: 'lesson-plan.pdf',
        type: 'application/pdf',
        size: 2048,
        path: 'uploads/resources/lesson-plan.pdf',
      },
    });

    expect(parseJsonBody<{ status: number }>(addFile.body).status).toBe(1);

    const listResources = await app.inject({
      method: 'GET',
      url: '/api/centre/resources/index',
      query: {
        auth_token: fixture.centreToken,
        folder_id: folderId,
      },
    });

    const resourcesPayload = parseJsonBody<{
      status: number;
      data: { files: Array<{ name: string }> };
    }>(listResources.body);

    expect(resourcesPayload.status).toBe(1);
    expect(resourcesPayload.data.files.some((item) => item.name === 'lesson-plan.pdf')).toBe(true);
  });

  it('supports admin centre management, settings updates, reports, exports, and live-report parity', async () => {
    const fixture = await seedOperationsFixture(app);

    const addCentre = await app.inject({
      method: 'POST',
      url: '/api/admin/centres/add',
      payload: {
        auth_token: fixture.adminToken,
        centre_name: 'South Campus Centre',
        contact_person: 'South Contact',
        code: '+91',
        phone: '9000555500',
        email: 'south.centre@example.test',
        address: 'South City',
        date_of_registration: localDate(),
        date_of_expiry: localDate(365),
        password: 'SouthPass#2026',
      },
    });

    const addCentrePayload = parseJsonBody<{
      status: number;
      data: { centre_id: number; centre_code: string };
    }>(addCentre.body);

    expect(addCentrePayload.status).toBe(1);
    expect(addCentrePayload.data.centre_id).toBeGreaterThan(0);

    const assignPlan = await app.inject({
      method: 'POST',
      url: '/api/admin/centres/save_assign_plan',
      payload: {
        auth_token: fixture.adminToken,
        centre_id: addCentrePayload.data.centre_id,
        course_id: COURSE_ID,
        assigned_amount: 1500,
        start_date: localDate(),
        end_date: localDate(60),
      },
    });

    expect(parseJsonBody<{ status: number }>(assignPlan.body).status).toBe(1);

    const addFolder = await app.inject({
      method: 'POST',
      url: '/api/admin/resources/add_folder',
      payload: {
        auth_token: fixture.adminToken,
        parent_id: 0,
        centre_id: addCentrePayload.data.centre_id,
        name: 'Admin Shared',
      },
    });
    const adminFolderPayload = parseJsonBody<{ status: number; data: { folder_id: number } }>(addFolder.body);
    expect(adminFolderPayload.status).toBe(1);

    const addFile = await app.inject({
      method: 'POST',
      url: '/api/admin/resources/add_file',
      payload: {
        auth_token: fixture.adminToken,
        folder_id: adminFolderPayload.data.folder_id,
        centre_id: addCentrePayload.data.centre_id,
        name: 'ops-guideline.txt',
        type: 'text/plain',
        size: 300,
        path: 'uploads/resources/ops-guideline.txt',
      },
    });
    expect(parseJsonBody<{ status: number }>(addFile.body).status).toBe(1);

    const listResources = await app.inject({
      method: 'GET',
      url: '/api/admin/resources/index',
      query: {
        auth_token: fixture.adminToken,
        folder_id: adminFolderPayload.data.folder_id,
        centre_id: addCentrePayload.data.centre_id,
      },
    });

    const listResourcesPayload = parseJsonBody<{
      status: number;
      data: { files: Array<{ name: string }> };
    }>(listResources.body);
    expect(listResourcesPayload.status).toBe(1);
    expect(listResourcesPayload.data.files.some((item) => item.name === 'ops-guideline.txt')).toBe(true);

    const settingsGet = await app.inject({
      method: 'GET',
      url: '/api/admin/settings/system_settings',
      query: {
        auth_token: fixture.adminToken,
      },
    });
    expect(parseJsonBody<{ status: number }>(settingsGet.body).status).toBe(1);

    const settingsUpdate = await app.inject({
      method: 'POST',
      url: '/api/admin/settings/system_settings',
      payload: {
        auth_token: fixture.adminToken,
        system: {
          system_name: 'TTII Operations',
          system_email: 'ops@ttii.example.test',
        },
      },
    });
    expect(parseJsonBody<{ status: number }>(settingsUpdate.body).status).toBe(1);

    const websiteUpdate = await app.inject({
      method: 'POST',
      url: '/api/admin/settings/website_settings',
      payload: {
        auth_token: fixture.adminToken,
        frontend: {
          banner_title: 'Phase 10 Banner',
          about_us: 'Phase 10 summary',
        },
      },
    });
    expect(parseJsonBody<{ status: number }>(websiteUpdate.body).status).toBe(1);

    const appVersionUpdate = await app.inject({
      method: 'POST',
      url: '/api/admin/settings/edit_app_version',
      payload: {
        auth_token: fixture.adminToken,
        app_version: '2.0.0',
        app_version_ios: '2.0.1',
      },
    });
    expect(parseJsonBody<{ status: number }>(appVersionUpdate.body).status).toBe(1);

    const appVersionGet = await app.inject({
      method: 'GET',
      url: '/api/admin/settings/app_version',
      query: {
        auth_token: fixture.adminToken,
      },
    });

    const appVersionPayload = parseJsonBody<{ status: number; data: { app_version: string; app_version_ios: string } }>(
      appVersionGet.body,
    );
    expect(appVersionPayload.status).toBe(1);
    expect(appVersionPayload.data.app_version).toBe('2.0.0');
    expect(appVersionPayload.data.app_version_ios).toBe('2.0.1');

    const reports = await app.inject({
      method: 'GET',
      url: '/api/admin/reports/index',
      query: {
        auth_token: fixture.adminToken,
        from_date: localDate(-1),
        to_date: localDate(1),
      },
    });

    const reportsPayload = parseJsonBody<{
      status: number;
      data: { centres_total: number; applications_total: number };
    }>(reports.body);
    expect(reportsPayload.status).toBe(1);
    expect(reportsPayload.data.centres_total).toBeGreaterThanOrEqual(2);
    expect(reportsPayload.data.applications_total).toBeGreaterThanOrEqual(1);

    const exportSummary = await app.inject({
      method: 'GET',
      url: '/api/admin/reports/export',
      query: {
        auth_token: fixture.adminToken,
        type: 'summary',
      },
    });

    const exportSummaryPayload = parseJsonBody<{ status: number; data: { csv: string } }>(exportSummary.body);
    expect(exportSummaryPayload.status).toBe(1);
    expect(exportSummaryPayload.data.csv.includes('applications_total')).toBe(true);

    const liveReport = await app.inject({
      method: 'GET',
      url: '/api/admin/live_report/index',
      query: {
        auth_token: fixture.adminToken,
        live_id: EXISTING_LIVE_CLASS_ID,
        date: localDate(),
      },
    });

    const liveReportPayload = parseJsonBody<{
      status: number;
      data: { list_items: Array<{ live_id: number }> };
    }>(liveReport.body);

    expect(liveReportPayload.status).toBe(1);
    expect(liveReportPayload.data.list_items.some((item) => item.live_id === EXISTING_LIVE_CLASS_ID)).toBe(true);

    const exportLiveReport = await app.inject({
      method: 'GET',
      url: '/api/admin/reports/export',
      query: {
        auth_token: fixture.adminToken,
        type: 'live_report',
        live_id: EXISTING_LIVE_CLASS_ID,
        date: localDate(),
      },
    });

    const exportLivePayload = parseJsonBody<{ status: number; data: { csv: string } }>(exportLiveReport.body);
    expect(exportLivePayload.status).toBe(1);
    expect(exportLivePayload.data.csv.includes('live_id')).toBe(true);

    const globalCalendar = await app.inject({
      method: 'GET',
      url: '/api/admin/global_calender/index',
      query: {
        auth_token: fixture.adminToken,
        from_date: localDate(-2),
        to_date: localDate(2),
      },
    });

    const globalCalendarPayload = parseJsonBody<{ status: number; data: Array<{ event_type: string }> }>(globalCalendar.body);
    expect(globalCalendarPayload.status).toBe(1);
    expect(globalCalendarPayload.data.some((item) => item.event_type === 'live_class')).toBe(true);
  });
});
