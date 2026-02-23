import { Prisma } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { resetAuthRateLimitersForTests } from '../../src/auth/auth-service.js';
import { hashPassword } from '../../src/auth/password.js';
import { buildApp } from '../../src/app.js';
import { prisma, resetParityTables } from '../data/test-db.js';

const COURSE_ID = 1101;
const SUBJECT_ID = 1102;
const LESSON_ID = 1103;
const LESSON_FILE_QUIZ_ID = 1104;

const EXAM_EXPIRED_ID = 1201;
const EXAM_UPCOMING_ID = 1202;

const QUESTION_BANK_ID_ONE = 1301;
const QUESTION_BANK_ID_TWO = 1302;
const QUESTION_BANK_ID_THREE = 1303;

const QUIZ_QUESTION_ID_ONE = 1401;
const QUIZ_QUESTION_ID_TWO = 1402;
const QUIZ_QUESTION_ID_THREE = 1403;

const COHORT_ID = 1501;
const ASSIGNMENT_ID = 1601;

function dayOffset(offset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offset);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseJsonBody<T>(body: string): T {
  return JSON.parse(body) as unknown as T;
}

async function seedAssessmentFixture(
  app: ReturnType<typeof buildApp>,
): Promise<{ authToken: string; userId: number }> {
  const password = 'AssessPass#2026';
  const passwordHash = await hashPassword(password);

  const learner = await prisma.users.create({
    data: {
      name: 'Assessment Learner',
      email: 'assessment.learner@example.test',
      user_email: 'assessment.learner@example.test',
      role_id: 2,
      password: passwordHash,
      status: 1,
      course_id: COURSE_ID,
    },
  });

  const instructor = await prisma.users.create({
    data: {
      name: 'Assessment Instructor',
      email: 'assessment.instructor@example.test',
      user_email: 'assessment.instructor@example.test',
      role_id: 4,
      password: passwordHash,
      status: 1,
      course_id: COURSE_ID,
    },
  });

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO course (
      id,
      category_id,
      title,
      status,
      price,
      sale_price,
      description,
      duration,
      is_free_course,
      created_at
    ) VALUES (
      ${COURSE_ID},
      1,
      ${'Assessment Foundations'},
      ${'active'},
      ${2500},
      ${1200},
      ${'Assessment course'},
      ${'30 days'},
      0,
      ${new Date().toISOString()}
    )
  `);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO subject (id, course_id, master_subject_id, title, description, created_at)
    VALUES (${SUBJECT_ID}, ${COURSE_ID}, NULL, ${'Assessment Subject'}, ${'Subject details'}, ${new Date().toISOString()})
  `);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO lesson (id, course_id, subject_id, title, summary, created_at)
    VALUES (${LESSON_ID}, ${COURSE_ID}, ${SUBJECT_ID}, ${'Assessment Lesson'}, ${'Lesson summary'}, ${new Date().toISOString()})
  `);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO lesson_files (id, lesson_id, title, attachment_type, created_at)
    VALUES (${LESSON_FILE_QUIZ_ID}, ${LESSON_ID}, ${'Lesson Quiz'}, ${'quiz'}, ${new Date().toISOString()})
  `);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO quiz (id, lesson_file_id, question, question_type, answer_id, answer_ids, answers, created_at)
    VALUES
      (${QUIZ_QUESTION_ID_ONE}, ${LESSON_FILE_QUIZ_ID}, ${'Q1'}, 0, ${'0'}, NULL, ${'["A","B","C","D"]'}, ${new Date().toISOString()}),
      (${QUIZ_QUESTION_ID_TWO}, ${LESSON_FILE_QUIZ_ID}, ${'Q2'}, 1, NULL, ${'["1","2"]'}, ${'["A","B","C","D"]'}, ${new Date().toISOString()}),
      (${QUIZ_QUESTION_ID_THREE}, ${LESSON_FILE_QUIZ_ID}, ${'Q3'}, 0, ${'2'}, NULL, ${'["A","B","C","D"]'}, ${new Date().toISOString()})
  `);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO payment_info (user_id, course_id, expiry_date, payment_date, created_at)
    VALUES (${learner.id}, ${COURSE_ID}, ${'2099-12-31'}, ${new Date().toISOString()}, ${new Date().toISOString()})
  `);

  await prisma.$executeRaw(Prisma.sql`
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
    ) VALUES
      (
        ${EXAM_EXPIRED_ID},
        ${'Expired Exam'},
        ${'Past assessment'},
        20,
        ${'01:00'},
        ${dayOffset(-1)},
        ${dayOffset(-1)},
        ${'09:00:00'},
        ${'10:00:00'},
        ${COURSE_ID},
        ${SUBJECT_ID},
        ${LESSON_ID},
        ${'0'},
        ${new Date().toISOString()}
      ),
      (
        ${EXAM_UPCOMING_ID},
        ${'Upcoming Exam'},
        ${'Future assessment'},
        20,
        ${'01:00'},
        ${dayOffset(1)},
        ${dayOffset(1)},
        ${'09:00:00'},
        ${'10:00:00'},
        ${COURSE_ID},
        ${SUBJECT_ID},
        ${LESSON_ID},
        ${'1'},
        ${new Date().toISOString()}
      )
  `);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO question_bank (id, lesson_id, subject_id, course_id, title, options, correct_answers, created_at)
    VALUES
      (${QUESTION_BANK_ID_ONE}, ${LESSON_ID}, ${SUBJECT_ID}, ${COURSE_ID}, ${'Exam Q1'}, ${'["A","B","C","D"]'}, ${'["0"]'}, ${new Date().toISOString()}),
      (${QUESTION_BANK_ID_TWO}, ${LESSON_ID}, ${SUBJECT_ID}, ${COURSE_ID}, ${'Exam Q2'}, ${'["A","B","C","D"]'}, ${'["1"]'}, ${new Date().toISOString()}),
      (${QUESTION_BANK_ID_THREE}, ${LESSON_ID}, ${SUBJECT_ID}, ${COURSE_ID}, ${'Exam Q3'}, ${'["A","B","C","D"]'}, ${'["2"]'}, ${new Date().toISOString()})
  `);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO exam_questions (exam_id, question_id, question_no, mark, negative_mark, created_at)
    VALUES
      (${EXAM_EXPIRED_ID}, ${QUESTION_BANK_ID_ONE}, 1, 4, 1, ${new Date().toISOString()}),
      (${EXAM_EXPIRED_ID}, ${QUESTION_BANK_ID_TWO}, 2, 2, 0.5, ${new Date().toISOString()}),
      (${EXAM_EXPIRED_ID}, ${QUESTION_BANK_ID_THREE}, 3, 1, 1, ${new Date().toISOString()}),
      (${EXAM_UPCOMING_ID}, ${QUESTION_BANK_ID_ONE}, 1, 4, 1, ${new Date().toISOString()})
  `);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO cohorts (id, subject_id, cohort_id, title, start_date, end_date, instructor_id, created_at)
    VALUES (
      ${COHORT_ID},
      ${SUBJECT_ID},
      ${'COH-001'},
      ${'Assessment Cohort'},
      ${dayOffset(-3)},
      ${dayOffset(30)},
      ${instructor.id},
      ${new Date().toISOString()}
    )
  `);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO cohort_students (cohort_id, user_id, created_at)
    VALUES (${COHORT_ID}, ${learner.id}, ${new Date().toISOString()})
  `);

  await prisma.$executeRaw(Prisma.sql`
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
      ${'Assessment Assignment'},
      ${'Assignment details'},
      20,
      ${dayOffset(0)},
      ${'10:00:00'},
      ${'12:00:00'},
      ${'<li>Read chapter</li><p>Submit before EOD</p>'},
      ${'uploads/assignment/brief.pdf'},
      ${COURSE_ID},
      ${COHORT_ID},
      ${instructor.id},
      ${new Date().toISOString()}
    )
  `);

  const loginResponse = await app.inject({
    method: 'GET',
    url: '/api/login/index',
    query: {
      email: 'assessment.learner@example.test',
      password,
      role_id: '2',
    },
  });

  expect(loginResponse.statusCode).toBe(200);

  const authToken = parseJsonBody<{ userdata: { auth_token: string } }>(loginResponse.body).userdata
    .auth_token;
  return {
    authToken,
    userId: learner.id,
  };
}

describe('Phase 07 assessment parity contracts', () => {
  const app = buildApp();

  beforeEach(async () => {
    resetAuthRateLimitersForTests();
    await resetParityTables();
  });

  afterAll(async () => {
    await app.close();
  });

  it('keeps assessment routes auth-protected and returns exam listing/calendar parity data', async () => {
    const fixture = await seedAssessmentFixture(app);

    const unauthorized = await app.inject({
      method: 'GET',
      url: '/api/exams/index',
    });

    expect(unauthorized.statusCode).toBe(401);

    const examsResponse = await app.inject({
      method: 'GET',
      url: '/api/exams/index',
      query: {
        auth_token: fixture.authToken,
      },
    });

    expect(examsResponse.statusCode).toBe(200);
    const examsPayload = parseJsonBody<{
      status: number;
      data: {
        upcoming_exams: Array<{ id: number }>;
        expired_exams: Array<{ id: number }>;
      };
    }>(examsResponse.body);

    expect(examsPayload.status).toBe(1);
    expect(examsPayload.data.upcoming_exams[0]?.id).toBe(EXAM_UPCOMING_ID);
    expect(examsPayload.data.expired_exams[0]?.id).toBe(EXAM_EXPIRED_ID);

    const calendarResponse = await app.inject({
      method: 'GET',
      url: '/api/exams/exam_calendar',
      query: {
        auth_token: fixture.authToken,
      },
    });

    expect(calendarResponse.statusCode).toBe(200);
    const calendarPayload = parseJsonBody<{
      status: number;
      data: {
        title: string;
        total_days: number;
        date_array: Array<{ status: string }>;
      };
    }>(calendarResponse.body);

    expect(calendarPayload.status).toBe(1);
    expect(calendarPayload.data.title).toBe('Exam Schedule');
    expect(calendarPayload.data.total_days).toBeGreaterThanOrEqual(2);
    expect(calendarPayload.data.date_array.length).toBe(calendarPayload.data.total_days);
  });

  it('scores exam attempts with mark and negative-mark parity and persists attempt side effects', async () => {
    const fixture = await seedAssessmentFixture(app);

    const startResponse = await app.inject({
      method: 'POST',
      url: '/api/exams/exam_save_start',
      payload: {
        auth_token: fixture.authToken,
        exam_id: EXAM_EXPIRED_ID,
      },
    });

    expect(startResponse.statusCode).toBe(200);
    const startPayload = parseJsonBody<{ attempt_id: number }>(startResponse.body);
    expect(startPayload.attempt_id).toBeGreaterThan(0);

    const submitResponse = await app.inject({
      method: 'POST',
      url: '/api/exams/exam_save_result',
      payload: {
        auth_token: fixture.authToken,
        attempt_id: startPayload.attempt_id,
        user_answers: [
          { question_id: QUESTION_BANK_ID_ONE, answer: ['0'] },
          { question_id: QUESTION_BANK_ID_TWO, answer: ['0'] },
        ],
      },
    });

    expect(submitResponse.statusCode).toBe(200);

    const attemptRows = await prisma.$queryRaw<
      Array<{ correct: number; incorrect: number; skip: number; score: number; submit_status: number }>
    >(Prisma.sql`
      SELECT correct, incorrect, skip, score, submit_status
      FROM exam_attempt
      WHERE id = ${startPayload.attempt_id}
      LIMIT 1
    `);

    expect(attemptRows[0]?.correct).toBe(1);
    expect(attemptRows[0]?.incorrect).toBe(1);
    expect(attemptRows[0]?.skip).toBe(1);
    expect(attemptRows[0]?.score).toBe(3.5);
    expect(attemptRows[0]?.submit_status).toBe(1);

    const answerRows = await prisma.$queryRaw<Array<{ answer_status: number }>>(Prisma.sql`
      SELECT answer_status
      FROM exam_answer
      WHERE attempt_id = ${startPayload.attempt_id}
      ORDER BY id ASC
    `);

    expect(answerRows.map((row) => row.answer_status)).toEqual([1, 2, 3]);
  });

  it('scores quiz and practice attempts with their legacy formulas', async () => {
    const fixture = await seedAssessmentFixture(app);

    const startQuiz = await app.inject({
      method: 'POST',
      url: '/api/quiz/start_quiz',
      payload: {
        auth_token: fixture.authToken,
        exam_id: LESSON_FILE_QUIZ_ID,
      },
    });

    expect(startQuiz.statusCode).toBe(200);
    const quizAttemptId = parseJsonBody<{ attempt_id: number }>(startQuiz.body).attempt_id;
    expect(quizAttemptId).toBeGreaterThan(0);

    const saveQuiz = await app.inject({
      method: 'POST',
      url: '/api/quiz/save_quiz_result',
      payload: {
        auth_token: fixture.authToken,
        exam_id: LESSON_FILE_QUIZ_ID,
        attempt_id: quizAttemptId,
        user_answers: [
          { question_id: QUIZ_QUESTION_ID_ONE, answer: ['0'] },
          { question_id: QUIZ_QUESTION_ID_TWO, answer: ['2', '1'] },
        ],
      },
    });

    expect(saveQuiz.statusCode).toBe(200);

    const quizAttempt = await prisma.$queryRaw<Array<{ correct: number; incorrect: number; skip: number; score: number }>>(
      Prisma.sql`
        SELECT correct, incorrect, skip, score
        FROM exam_attempt
        WHERE id = ${quizAttemptId}
        LIMIT 1
      `,
    );

    expect(quizAttempt[0]?.correct).toBe(2);
    expect(quizAttempt[0]?.incorrect).toBe(0);
    expect(quizAttempt[0]?.skip).toBe(1);
    expect(quizAttempt[0]?.score).toBe(2);

    const quizAnswerRows = await prisma.$queryRaw<Array<{ answer_status: number }>>(Prisma.sql`
      SELECT answer_status
      FROM exam_answer
      WHERE attempt_id = ${quizAttemptId}
      ORDER BY id ASC
    `);

    expect(quizAnswerRows.map((row) => row.answer_status)).toEqual([1, 1, 3]);

    const startPractice = await app.inject({
      method: 'POST',
      url: '/api/practice/start_practice',
      payload: {
        auth_token: fixture.authToken,
        lesson_file_id: LESSON_FILE_QUIZ_ID,
      },
    });

    expect(startPractice.statusCode).toBe(200);
    const practiceAttemptId = parseJsonBody<{ data: { attempt_id: number } }>(startPractice.body).data
      .attempt_id;
    expect(practiceAttemptId).toBeGreaterThan(0);

    const savePractice = await app.inject({
      method: 'POST',
      url: '/api/practice/save_practice_result',
      payload: {
        auth_token: fixture.authToken,
        attempt_id: practiceAttemptId,
        user_answers: [
          { question_id: QUIZ_QUESTION_ID_ONE, answer: '0' },
          { question_id: QUIZ_QUESTION_ID_TWO, answer: ['1'] },
        ],
      },
    });

    expect(savePractice.statusCode).toBe(200);

    const practiceAttempt = await prisma.$queryRaw<
      Array<{ correct: number; incorrect: number; skip: number; score: number; submit_status: number }>
    >(Prisma.sql`
      SELECT correct, incorrect, skip, score, submit_status
      FROM practice_attempt
      WHERE id = ${practiceAttemptId}
      LIMIT 1
    `);

    expect(practiceAttempt[0]?.correct).toBe(1);
    expect(practiceAttempt[0]?.incorrect).toBe(1);
    expect(practiceAttempt[0]?.skip).toBe(1);
    expect(practiceAttempt[0]?.score).toBe(3);
    expect(practiceAttempt[0]?.submit_status).toBe(1);

    const practiceAnswerRows = await prisma.$queryRaw<Array<{ answer_status: number }>>(Prisma.sql`
      SELECT answer_status
      FROM practice_answer
      WHERE attempt_id = ${practiceAttemptId}
      ORDER BY id ASC
    `);

    expect(practiceAnswerRows.map((row) => row.answer_status)).toEqual([1, 2, 3]);
  });

  it('supports assignment listing, submission, review evaluation, and save toggle parity', async () => {
    const fixture = await seedAssessmentFixture(app);

    const assignmentListResponse = await app.inject({
      method: 'GET',
      url: '/api/assignment/index',
      query: {
        auth_token: fixture.authToken,
      },
    });

    expect(assignmentListResponse.statusCode).toBe(200);
    const assignmentListPayload = parseJsonBody<{
      status: number;
      data: { current: Array<{ id: number }>; completed: unknown[]; upcoming: unknown[] };
    }>(assignmentListResponse.body);

    expect(assignmentListPayload.status).toBe(1);
    expect(assignmentListPayload.data.current[0]?.id).toBe(ASSIGNMENT_ID);
    expect(assignmentListPayload.data.completed.length).toBe(0);

    const assignmentDetailsResponse = await app.inject({
      method: 'GET',
      url: '/api/assignment/get_assignment_details',
      query: {
        auth_token: fixture.authToken,
        assignment_id: ASSIGNMENT_ID,
      },
    });

    expect(assignmentDetailsResponse.statusCode).toBe(200);
    const assignmentDetailsPayload = parseJsonBody<{
      status: string;
      data: { is_submitted: number; is_reviewed: number; instruction: string[] };
    }>(assignmentDetailsResponse.body);

    expect(assignmentDetailsPayload.status).toBe('success');
    expect(assignmentDetailsPayload.data.is_submitted).toBe(0);
    expect(assignmentDetailsPayload.data.is_reviewed).toBe(0);
    expect(assignmentDetailsPayload.data.instruction.length).toBe(2);

    const submitAssignment = await app.inject({
      method: 'POST',
      url: '/api/assignment/submit_assignment',
      payload: {
        auth_token: fixture.authToken,
        assignment_id: ASSIGNMENT_ID,
        answer_file: ['uploads/assignment/answers/solution.pdf'],
      },
    });

    expect(submitAssignment.statusCode).toBe(200);
    const submitPayload = parseJsonBody<{ status: number; message: string }>(submitAssignment.body);
    expect(submitPayload.status).toBe(1);
    expect(submitPayload.message).toBe('success');

    const duplicateSubmit = await app.inject({
      method: 'POST',
      url: '/api/assignment/submit_assignment',
      payload: {
        auth_token: fixture.authToken,
        assignment_id: ASSIGNMENT_ID,
      },
    });

    const duplicatePayload = parseJsonBody<{ status: boolean; message: string }>(duplicateSubmit.body);
    expect(duplicatePayload.status).toBe(false);
    expect(duplicatePayload.message).toBe('Assignment already submitted');

    await prisma.$executeRaw(Prisma.sql`
      UPDATE assignment_submissions
      SET marks = ${'18'}, remarks = ${'Great work'}
      WHERE user_id = ${fixture.userId}
        AND assignment_id = ${ASSIGNMENT_ID}
    `);

    const evaluationResponse = await app.inject({
      method: 'GET',
      url: '/api/assignment/get_assignment_evaluation',
      query: {
        auth_token: fixture.authToken,
        assignment_id: ASSIGNMENT_ID,
      },
    });

    expect(evaluationResponse.statusCode).toBe(200);
    const evaluationPayload = parseJsonBody<{
      status: string;
      data: { is_reviewed: number; marks: string; remarks: string };
    }>(evaluationResponse.body);

    expect(evaluationPayload.status).toBe('success');
    expect(evaluationPayload.data.is_reviewed).toBe(1);
    expect(evaluationPayload.data.marks).toBe('18/20');
    expect(evaluationPayload.data.remarks).toBe('Great work');

    const saveResponse = await app.inject({
      method: 'GET',
      url: '/api/assignment/save_assignment',
      query: {
        auth_token: fixture.authToken,
        assignment_id: ASSIGNMENT_ID,
      },
    });

    expect(saveResponse.statusCode).toBe(200);
    const savePayload = parseJsonBody<{ status: string }>(saveResponse.body);
    expect(savePayload.status).toBe('Successfully Saved');

    const removeResponse = await app.inject({
      method: 'GET',
      url: '/api/assignment/save_assignment',
      query: {
        auth_token: fixture.authToken,
        assignment_id: ASSIGNMENT_ID,
      },
    });

    const removePayload = parseJsonBody<{ status: string }>(removeResponse.body);
    expect(removePayload.status).toBe('Successfully Removed from saved Assignments');

    const activeSavedRows = await prisma.$queryRaw<Array<{ count: number | bigint }>>(Prisma.sql`
      SELECT COUNT(*) AS count
      FROM saved_assignments
      WHERE user_id = ${fixture.userId}
        AND assignment_id = ${ASSIGNMENT_ID}
        AND deleted_at IS NULL
    `);

    expect(Number(activeSavedRows[0]?.count ?? 0)).toBe(0);
  });
});
