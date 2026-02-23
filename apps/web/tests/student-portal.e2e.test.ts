/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { copyFile, rm } from 'node:fs/promises';

import { LegacyApiClient, LegacyAuthApi, type AuthSession } from '@ttii/frontend-core';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { StudentPortalApi } from '../src/student/student-portal-api';
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

const seededStudent: SeededUser = {
  email: 'student.phase12@example.test',
  password: 'StudentPass#Phase12',
  roleId: 2,
};

const COURSE_ID = 5201;
const CATEGORY_ID = 5202;
const SUBJECT_ID = 5203;
const LESSON_ID = 5204;
const LESSON_VIDEO_ID = 5205;
const LESSON_QUIZ_FILE_ID = 5206;
const LESSON_PDF_ID = 5207;
const EXAM_ID = 5208;
const QUESTION_ID = 5209;
const COHORT_ID = 5210;
const ASSIGNMENT_ID = 5211;
const PACKAGE_ID = 5212;
const COUPON_ID = 5213;
const NOTIFICATION_ID = 5214;

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

function dayOffset(offset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

describe('Phase 12 student portal e2e', () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = resolve(currentFile, '../../../..');
  const baseTestDbPath = resolve(repoRoot, 'apps/api/prisma/test.db');
  const isolatedTestDbPath = resolve(repoRoot, 'apps/api/prisma/test-phase12.db');
  const host = '127.0.0.1';
  const port = 4312;

  let app: FastifyAppPort;
  let authApi: LegacyAuthApi;
  let studentApi: StudentPortalApi;
  let prisma: PrismaPort;
  let resetParityTables: () => Promise<void>;
  let hashPassword: (value: string) => Promise<string>;

  async function loginAs(user: SeededUser): Promise<AuthSession> {
    return authApi.login({
      email: user.email,
      password: user.password,
      roleId: user.roleId,
    });
  }

  async function seedStudentPortalFixture(): Promise<void> {
    const passwordHash = await hashPassword(seededStudent.password);
    const now = new Date().toISOString();

    const student = await prisma.users.create({
      data: {
        name: 'Phase12 Student',
        email: seededStudent.email,
        user_email: seededStudent.email,
        phone: '8880001111',
        role_id: seededStudent.roleId,
        password: passwordHash,
        status: 1,
        course_id: COURSE_ID,
        student_id: 'TTS12001',
      },
    });

    const instructor = await prisma.users.create({
      data: {
        name: 'Phase12 Instructor',
        email: 'instructor.phase12@example.test',
        user_email: 'instructor.phase12@example.test',
        phone: '8880002222',
        role_id: 4,
        password: passwordHash,
        status: 1,
      },
    });

    const supportAgent = await prisma.users.create({
      data: {
        name: 'Phase12 Support',
        email: 'support.phase12@example.test',
        user_email: 'support.phase12@example.test',
        phone: '8880003333',
        role_id: 1,
        password: passwordHash,
        status: 1,
      },
    });

    await prisma.$executeRaw`
      UPDATE users
      SET image = 'uploads/users/student-phase12.png'
      WHERE id = ${student.id}
    `;

    await prisma.$executeRaw`
      UPDATE users
      SET image = 'uploads/users/instructor-phase12.png'
      WHERE id = ${instructor.id}
    `;

    await prisma.$executeRaw`
      INSERT INTO category (
        id,
        code,
        name,
        description,
        short_description,
        thumbnail,
        category_icon,
        video_type,
        video_url,
        created_at
      ) VALUES (
        ${CATEGORY_ID},
        ${'student-port'},
        ${'Student Category'},
        ${'Student category'},
        ${'Student short'},
        ${'uploads/category/student.png'},
        ${'uploads/category/student-icon.png'},
        ${'youtube'},
        ${'https://video.example/student'},
        ${now}
      )
    `;

    await prisma.$executeRaw`
      INSERT INTO course (
        id,
        category_id,
        title,
        label,
        status,
        price,
        sale_price,
        total_amount,
        description,
        duration,
        thumbnail,
        course_icon,
        features,
        is_free_course,
        created_at
      ) VALUES (
        ${COURSE_ID},
        ${CATEGORY_ID},
        ${'Phase 12 Student Course'},
        ${'Core'},
        ${'active'},
        3000,
        1800,
        2200,
        ${'<p>Course for student portal parity tests.</p>'},
        ${'45 days'},
        ${'uploads/course/student-course.png'},
        ${'uploads/course/student-cover.png'},
        ${'<li>Recorded class</li><li>Quiz</li>'},
        0,
        ${now}
      )
    `;

    await prisma.$executeRaw`
      INSERT INTO subject (id, course_id, master_subject_id, title, description, thumbnail, "order", created_at)
      VALUES (${SUBJECT_ID}, ${COURSE_ID}, NULL, ${'Phase 12 Subject'}, ${'Subject for tests'}, ${'uploads/subject/phase12.png'}, 1, ${now})
    `;

    await prisma.$executeRaw`
      INSERT INTO lesson (id, course_id, subject_id, title, summary, free, "order", created_at)
      VALUES (${LESSON_ID}, ${COURSE_ID}, ${SUBJECT_ID}, ${'Phase 12 Lesson'}, ${'Lesson summary'}, ${'off'}, 1, ${now})
    `;

    await prisma.$executeRaw`
      INSERT INTO lesson_files (
        id,
        lesson_id,
        parent_file_id,
        sub_title,
        title,
        summary,
        duration,
        lesson_provider,
        video_type,
        video_url,
        download_url,
        lesson_type,
        attachment_type,
        attachment,
        thumbnail,
        free,
        "order",
        created_at
      ) VALUES
      (
        ${LESSON_VIDEO_ID},
        ${LESSON_ID},
        NULL,
        ${'Video'},
        ${'Lesson Video'},
        ${'Primary lesson video'},
        ${'00:10:00'},
        ${'youtube'},
        ${'youtube'},
        ${'https://video.example/phase12-video'},
        ${''},
        ${'video'},
        ${'url'},
        NULL,
        ${'uploads/lesson/video-phase12.png'},
        ${'off'},
        1,
        ${now}
      ),
      (
        ${LESSON_QUIZ_FILE_ID},
        ${LESSON_ID},
        ${LESSON_VIDEO_ID},
        ${'Quiz'},
        ${'Lesson Quiz'},
        ${'Quiz file'},
        ${'00:04:00'},
        ${''},
        ${''},
        ${''},
        ${''},
        ${'other'},
        ${'quiz'},
        NULL,
        ${'uploads/lesson/quiz-phase12.png'},
        ${'off'},
        2,
        ${now}
      ),
      (
        ${LESSON_PDF_ID},
        ${LESSON_ID},
        ${LESSON_VIDEO_ID},
        ${'Worksheet'},
        ${'Lesson PDF'},
        ${'PDF file'},
        ${'00:02:00'},
        ${''},
        ${''},
        ${''},
        ${''},
        ${'other'},
        ${'pdf'},
        ${'uploads/materials/phase12.pdf'},
        ${'uploads/lesson/pdf-phase12.png'},
        ${'off'},
        3,
        ${now}
      )
    `;

    await prisma.$executeRaw`
      INSERT INTO quiz (id, lesson_file_id, question, question_type, answer_id, answer_ids, answers, created_at)
      VALUES
      (6101, ${LESSON_QUIZ_FILE_ID}, ${'Quiz Q1'}, 0, ${'0'}, NULL, ${'["A","B","C"]'}, ${now}),
      (6102, ${LESSON_QUIZ_FILE_ID}, ${'Quiz Q2'}, 1, NULL, ${'["0","1"]'}, ${'["A","B","C"]'}, ${now})
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
        ${EXAM_ID},
        ${'Phase 12 Exam'},
        ${'Exam description'},
        20,
        ${'01:00'},
        ${dayOffset(-1)},
        ${dayOffset(-1)},
        ${'09:00:00'},
        ${'10:00:00'},
        ${COURSE_ID},
        ${SUBJECT_ID},
        ${LESSON_ID},
        ${'1'},
        ${now}
      )
    `;

    await prisma.$executeRaw`
      INSERT INTO question_bank (id, lesson_id, subject_id, course_id, title, options, correct_answers, created_at)
      VALUES (${QUESTION_ID}, ${LESSON_ID}, ${SUBJECT_ID}, ${COURSE_ID}, ${'Exam Question'}, ${'["A","B"]'}, ${'["0"]'}, ${now})
    `;

    await prisma.$executeRaw`
      INSERT INTO exam_questions (exam_id, question_id, question_no, mark, negative_mark, created_at)
      VALUES (${EXAM_ID}, ${QUESTION_ID}, 1, 4, 1, ${now})
    `;

    await prisma.$executeRaw`
      INSERT INTO cohorts (id, subject_id, course_id, cohort_id, title, start_date, end_date, instructor_id, created_at)
      VALUES (${COHORT_ID}, ${SUBJECT_ID}, ${COURSE_ID}, ${'COH-PHASE12'}, ${'Phase12 Cohort'}, ${dayOffset(-5)}, ${dayOffset(25)}, ${instructor.id}, ${now})
    `;

    await prisma.$executeRaw`
      INSERT INTO cohort_students (cohort_id, user_id, created_at)
      VALUES (${COHORT_ID}, ${student.id}, ${now})
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
        ${ASSIGNMENT_ID},
        ${'Phase 12 Assignment'},
        ${'Assignment details'},
        20,
        ${dayOffset(0)},
        ${'10:00:00'},
        ${'12:00:00'},
        ${'<li>Submit notes</li>'},
        ${'uploads/assignment/phase12.pdf'},
        ${COURSE_ID},
        ${COHORT_ID},
        ${instructor.id},
        ${now}
      )
    `;

    await prisma.$executeRaw`
      INSERT INTO package (
        id,
        title,
        description,
        type,
        category_id,
        course_id,
        amount,
        discount,
        is_free,
        package_type,
        remarks,
        offline,
        start_date,
        end_date,
        duration,
        created_at
      ) VALUES (
        ${PACKAGE_ID},
        ${'Phase 12 Package'},
        ${'<li>Live support</li><li>Mentor review</li>'},
        1,
        ${CATEGORY_ID},
        ${COURSE_ID},
        2200,
        200,
        0,
        ${'online'},
        ${'phase12'},
        0,
        ${dayOffset(-2)},
        ${dayOffset(12)},
        30,
        ${now}
      )
    `;

    await prisma.$executeRaw`
      INSERT INTO coupon_code (
        id,
        code,
        package_id,
        user_id,
        discount_perc,
        total_no,
        per_user_no,
        validity,
        start_date,
        end_date,
        created_at
      ) VALUES (
        ${COUPON_ID},
        ${'PHASE12SAVE'},
        ${PACKAGE_ID},
        0,
        20,
        5,
        2,
        1,
        ${dayOffset(-1)},
        ${dayOffset(7)},
        ${now}
      )
    `;

    await prisma.$executeRaw`
      INSERT INTO enrol (
        user_id,
        course_id,
        enrollment_date,
        enrollment_status,
        mode_of_study,
        discount_perc,
        created_by,
        created_at
      ) VALUES (
        ${student.id},
        ${COURSE_ID},
        ${dayOffset(-3)},
        ${'Active'},
        ${'Online'},
        10,
        ${student.id},
        ${now}
      )
    `;

    await prisma.$executeRaw`
      INSERT INTO student_fee (user_id, course_id, amount, due_date, status, created_at)
      VALUES
      (${student.id}, ${COURSE_ID}, 800, ${dayOffset(-5)}, ${'Paid'}, ${now}),
      (${student.id}, ${COURSE_ID}, 700, ${dayOffset(-2)}, ${'Pending'}, ${now})
    `;

    await prisma.$executeRaw`
      INSERT INTO payment_info (user_id, course_id, amount_paid, expiry_date, payment_date, created_at)
      VALUES (${student.id}, ${COURSE_ID}, 800, ${dayOffset(30)}, ${now}, ${now})
    `;

    await prisma.$executeRaw`
      INSERT INTO notification (id, title, description, course_id, created_at)
      VALUES
      (${NOTIFICATION_ID}, ${'Phase 12 Global'}, ${'<b>System notice</b>'}, 0, ${now}),
      (5215, ${'Phase 12 Course'}, ${'Course notification'}, ${COURSE_ID}, ${now})
    `;

    await prisma.$executeRaw`
      INSERT INTO support_chat (chat_id, sender_id, message, created_at, created_by, updated_at, updated_by)
      VALUES (${student.id}, ${supportAgent.id}, ${'Welcome to support'}, ${now}, ${supportAgent.id}, ${now}, ${supportAgent.id})
    `;

    await prisma.$executeRaw`
      INSERT INTO video_progress_status (
        user_id,
        course_id,
        lesson_file_id,
        total_duration,
        user_progress,
        status,
        created_by,
        created_at,
        updated_by,
        updated_at
      ) VALUES (
        ${student.id},
        ${COURSE_ID},
        ${LESSON_VIDEO_ID},
        ${'00:10:00'},
        ${'00:10:00'},
        1,
        ${student.id},
        ${now},
        ${student.id},
        ${now}
      )
    `;
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
    studentApi = new StudentPortalApi(apiClient);
  });

  beforeEach(async () => {
    await resetParityTables();
    await seedStudentPortalFixture();
  });

  afterAll(async () => {
    await app.close();
    await rm(isolatedTestDbPath, { force: true });
  });

  it('loads student subroutes and snapshot sections for P0 and P1 paths', async () => {
    const session = await loginAs(seededStudent);

    const routeResult = await loadRoleShellForPath('/student/dashboard', session, authApi);
    expect(routeResult).not.toBeNull();
    expect(routeResult?.route.surface).toBe('student');
    expect(routeResult?.access.status).toBe('ready');

    const dashboard = await studentApi.loadDashboard(session.token);
    expect(dashboard.coursesCount).toBeGreaterThan(0);
    expect(dashboard.currentAssignments).toBeGreaterThan(0);
    expect(dashboard.notificationsCount).toBeGreaterThan(0);

    const learning = await studentApi.loadLearning(session.token);
    expect(learning.courses.length).toBeGreaterThan(0);
    expect(learning.subjects.length).toBeGreaterThan(0);
    expect(learning.lessons.length).toBeGreaterThan(0);
    expect(learning.lessonFiles.length).toBeGreaterThan(0);

    const assessments = await studentApi.loadAssessments(session.token);
    expect(assessments.assignments.current.length).toBeGreaterThan(0);
    expect(assessments.exams.expired.length).toBeGreaterThan(0);
    expect(asNumber(assessments.examCalendar.total_days)).toBeGreaterThan(0);

    const payments = await studentApi.loadPayments(session.token);
    expect(payments.studentCourses.length).toBeGreaterThan(0);
    expect(payments.packages.length).toBeGreaterThan(0);

    const notifications = await studentApi.loadNotifications(session.token);
    expect(notifications.notifications.length).toBeGreaterThan(0);
    expect(notifications.notificationList.length).toBeGreaterThan(0);

    const support = await studentApi.loadSupport(session.token);
    expect(support.messages.length).toBeGreaterThan(0);
  });

  it('executes assessment, payment, notification, and support workflows from student portal api', async () => {
    const session = await loginAs(seededStudent);

    const learning = await studentApi.loadLearning(session.token);
    expect(learning.selectedCourseId).toBe(COURSE_ID);

    await studentApi.saveVideoProgress(session.token, {
      courseId: COURSE_ID,
      lessonFileId: LESSON_VIDEO_ID,
      lessonDuration: '00:10:00',
      userProgress: '00:10:00',
    });

    const assessments = await studentApi.loadAssessments(session.token);

    const currentAssignment = assessments.assignments.current[0] ?? {};
    const assignmentId = StudentPortalApi.getAssignmentId(currentAssignment);
    expect(assignmentId).toBeGreaterThan(0);

    await studentApi.toggleSavedAssignment(session.token, assignmentId);
    await studentApi.submitAssignment(session.token, assignmentId, ['uploads/submissions/phase12-answer.txt']);

    const savedAssignmentRows = await prisma.$queryRaw<Array<{ count: number | bigint }>>`
      SELECT COUNT(*) AS count
      FROM saved_assignments
      WHERE assignment_id = ${assignmentId}
        AND deleted_at IS NULL
    `;
    expect(asNumber(savedAssignmentRows[0]?.count)).toBe(1);

    const submissionRows = await prisma.$queryRaw<Array<{ count: number | bigint }>>`
      SELECT COUNT(*) AS count
      FROM assignment_submissions
      WHERE assignment_id = ${assignmentId}
        AND deleted_at IS NULL
    `;
    expect(asNumber(submissionRows[0]?.count)).toBe(1);

    const examId = StudentPortalApi.getExamId(assessments.exams.expired[0] ?? {});
    const examAttemptId = await studentApi.startExamAttempt(session.token, examId);
    expect(examAttemptId).toBeGreaterThan(0);

    await studentApi.submitExamAttempt(session.token, examAttemptId, []);

    const examAttemptRows = await prisma.$queryRaw<Array<{ submit_status: number }>>`
      SELECT submit_status
      FROM exam_attempt
      WHERE id = ${examAttemptId}
      LIMIT 1
    `;
    expect(asNumber(examAttemptRows[0]?.submit_status)).toBe(1);

    expect(assessments.quizLessonFileId).toBeGreaterThan(0);

    const quizAttemptId = await studentApi.startQuizAttempt(session.token, assessments.quizLessonFileId);
    expect(quizAttemptId).toBeGreaterThan(0);

    await studentApi.submitQuizAttempt(session.token, {
      attemptId: quizAttemptId,
      lessonFileId: assessments.quizLessonFileId,
      userAnswers: [],
    });

    const practiceAttemptId = await studentApi.startPracticeAttempt(session.token, {
      lessonId: assessments.quizLessonId,
      lessonFileId: assessments.quizLessonFileId,
      questionNo: 1,
    });
    expect(practiceAttemptId).toBeGreaterThan(0);

    await studentApi.submitPracticeAttempt(session.token, practiceAttemptId, []);

    const practiceAttemptRows = await prisma.$queryRaw<Array<{ submit_status: number }>>`
      SELECT submit_status
      FROM practice_attempt
      WHERE id = ${practiceAttemptId}
      LIMIT 1
    `;
    expect(asNumber(practiceAttemptRows[0]?.submit_status)).toBe(1);

    const payments = await studentApi.loadPayments(session.token);
    const couponResponse = await studentApi.applyCoupon(session.token, {
      courseId: payments.selectedCourseId,
      packageId: payments.selectedPackageId,
      couponCode: 'PHASE12SAVE',
    });

    expect(asNumber(couponResponse.valid)).toBe(1);

    const orderResponse = await studentApi.createOrder(session.token, payments.selectedCourseId);
    expect(asNumber(orderResponse.amount)).toBeGreaterThan(0);
    expect(typeof orderResponse.order_id).toBe('string');

    const notifications = await studentApi.loadNotifications(session.token);
    const notificationId = StudentPortalApi.getNotificationId(notifications.notifications[0] ?? {});
    await studentApi.markNotificationAsRead(session.token, notificationId);
    await studentApi.saveNotificationToken(session.token, 'phase12-token');

    const readRows = await prisma.$queryRaw<Array<{ count: number | bigint }>>`
      SELECT COUNT(*) AS count
      FROM notification_read
      WHERE notification_id = ${notificationId}
        AND deleted_at IS NULL
    `;
    expect(asNumber(readRows[0]?.count)).toBe(1);

    const tokenRows = await prisma.$queryRaw<Array<{ notification_token: string }>>`
      SELECT notification_token
      FROM users
      WHERE email = ${seededStudent.email}
      LIMIT 1
    `;
    expect(tokenRows[0]?.notification_token).toBe('phase12-token');

    const supportBefore = await studentApi.loadSupport(session.token);
    await studentApi.submitSupportMessage(session.token, 'Phase 12 support workflow message');
    const supportAfter = await studentApi.loadSupport(session.token);

    expect(supportAfter.messages.length).toBeGreaterThan(supportBefore.messages.length);
  });
});
