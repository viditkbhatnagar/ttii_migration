import { Prisma, type PrismaClient } from '@prisma/client';

import { getPrismaClient } from '../data/prisma-client.js';
import { env } from '../env.js';
import { createIntegrationRegistry } from '../integrations/registry.js';
import type { EmailProvider, IntegrationRegistry } from '../integrations/contracts.js';

type SqlRow = Record<string, unknown>;

function toDbNumber(value: unknown): number {
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

function toInteger(value: unknown): number {
  return Math.trunc(toDbNumber(value));
}

function toStringValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value);
  }

  return '';
}

function toNullableString(value: unknown): string | null {
  const normalized = toStringValue(value).trim();
  return normalized === '' ? null : normalized;
}

function parseDate(value: unknown): Date | null {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }

    return new Date(value.getTime());
  }

  const raw = toNullableString(value);
  if (!raw) {
    return null;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function formatTwoDigits(value: number): string {
  return String(value).padStart(2, '0');
}

function formatDateSlash(value: unknown): string {
  const parsed = parseDate(value);
  if (!parsed) {
    return '';
  }

  return `${formatTwoDigits(parsed.getDate())}/${formatTwoDigits(parsed.getMonth() + 1)}/${parsed.getFullYear()}`;
}

function formatDateDash(value: unknown): string {
  const parsed = parseDate(value);
  if (!parsed) {
    return '';
  }

  return `${formatTwoDigits(parsed.getDate())}-${formatTwoDigits(parsed.getMonth() + 1)}-${parsed.getFullYear()}`;
}

function formatDateMonth(value: unknown): string {
  const parsed = parseDate(value);
  if (!parsed) {
    return '';
  }

  const month = parsed.toLocaleString('en-US', { month: 'short' });
  return `${formatTwoDigits(parsed.getDate())} ${month} ${parsed.getFullYear()}`;
}

function combineDateAndTime(dateValue: unknown, timeValue: unknown): Date | null {
  let date = toNullableString(dateValue);
  if (dateValue instanceof Date) {
    date = dateValue.toISOString().slice(0, 10);
  }

  if (!date) {
    return null;
  }

  const time = toNullableString(timeValue) ?? '00:00:00';
  const isoParsed = new Date(`${date}T${time}`);
  if (!Number.isNaN(isoParsed.getTime())) {
    return isoParsed;
  }

  const fallback = new Date(`${date} ${time}`);
  if (Number.isNaN(fallback.getTime())) {
    return null;
  }

  return fallback;
}

function format12HourTime(value: unknown): string {
  const raw = toNullableString(value);
  if (!raw) {
    return '';
  }

  const timeOnly = raw.length > 8 ? raw.slice(-8) : raw;
  const parsed = new Date(`1970-01-01T${timeOnly}`);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return parsed.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatTimeRange(fromTime: unknown, toTime: unknown): string {
  const from = format12HourTime(fromTime);
  const to = format12HourTime(toTime);

  if (from === '' && to === '') {
    return '';
  }

  return `${from} to ${to}`.trim();
}

function toDateOnlyString(value: Date): string {
  return `${value.getFullYear()}-${formatTwoDigits(value.getMonth() + 1)}-${formatTwoDigits(value.getDate())}`;
}

function formatDurationFromSeconds(totalSeconds: number): string {
  const safeSeconds = Math.max(0, totalSeconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return `${formatTwoDigits(hours)}:${formatTwoDigits(minutes)}:${formatTwoDigits(seconds)}`;
}

function cleanHtmlText(value: string): string {
  return value.replace(/<[^>]*>/g, '').trim();
}

function extractInstructions(instructions: string): string[] {
  if (instructions.trim() === '') {
    return [];
  }

  const output: string[] = [];
  const listMatches = [...instructions.matchAll(/<li>(.*?)<\/li>/gis)];
  for (const match of listMatches) {
    const cleaned = cleanHtmlText(match[1] ?? '');
    if (cleaned !== '') {
      output.push(cleaned);
    }
  }

  const paragraphMatches = [...instructions.matchAll(/<p>(.*?)<\/p>/gis)];
  for (const match of paragraphMatches) {
    const cleaned = cleanHtmlText(match[1] ?? '');
    if (cleaned !== '') {
      output.push(cleaned);
    }
  }

  return output;
}

function parseUnknownArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      return [];
    }

    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return [trimmed];
    }

    return [trimmed];
  }

  return [];
}

function toNormalizedStringArray(value: unknown): string[] {
  const arrayValue = parseUnknownArray(value);
  const normalized = arrayValue
    .map((entry) => toStringValue(entry).trim())
    .filter((entry) => entry !== '');

  if (normalized.length > 0) {
    return normalized;
  }

  if (!Array.isArray(value) && value !== null && value !== undefined) {
    const scalar = toStringValue(value).trim();
    return scalar === '' ? [] : [scalar];
  }

  return [];
}

function sortedCopy(values: string[]): string[] {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function arraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((entry, index) => entry === right[index]);
}

function parseAnswerMap(userAnswers: unknown): Map<number, unknown> {
  const answerMap = new Map<number, unknown>();
  if (!Array.isArray(userAnswers)) {
    return answerMap;
  }

  for (const row of userAnswers) {
    if (!row || typeof row !== 'object') {
      continue;
    }

    const record = row as Record<string, unknown>;
    const questionId = toInteger(record.question_id);
    if (questionId <= 0) {
      continue;
    }

    answerMap.set(questionId, record.answer);
  }

  return answerMap;
}

interface AssessmentServiceDependencies {
  prisma?: PrismaClient;
  integrations?: Pick<IntegrationRegistry, 'email'>;
}

export interface ExamFilterInput {
  courseId?: number;
  subjectId?: number;
  lessonId?: number;
}

export interface StartExamAttemptInput {
  examId: number;
}

export interface SubmitAttemptInput {
  attemptId: number;
  userAnswers: unknown;
}

export interface StartQuizAttemptInput {
  examId: number;
}

export interface StartPracticeAttemptInput {
  lessonId?: number;
  lessonFileId?: number;
  questionNo?: number;
}

export interface AssignmentFilterInput {
  subjectId?: number;
  cohortId?: number;
}

export interface SubmitAssignmentInput {
  assignmentId: number;
  answerFiles?: unknown;
}

interface ScoredAttemptSummary {
  correct: number;
  incorrect: number;
  skip: number;
  score: number;
  timeTaken: string;
}

export class AssessmentService {
  private readonly appBaseUrl = env.APP_BASE_URL.replace(/\/$/, '');
  private readonly emailProvider: EmailProvider;

  constructor(dependencies: AssessmentServiceDependencies = {}) {
    this.prisma = dependencies.prisma ?? getPrismaClient();
    const integrations = dependencies.integrations ?? createIntegrationRegistry();
    this.emailProvider = integrations.email;
  }

  private readonly prisma: PrismaClient;

  private async queryMany(sql: Prisma.Sql): Promise<SqlRow[]> {
    return this.prisma.$queryRaw<SqlRow[]>(sql);
  }

  private async queryOne(sql: Prisma.Sql): Promise<SqlRow | null> {
    const rows = await this.queryMany(sql);
    return rows[0] ?? null;
  }

  private async count(sql: Prisma.Sql): Promise<number> {
    const row = await this.queryOne(sql);
    return toDbNumber(row?.count);
  }

  private toFileUrl(path: unknown): string {
    const normalized = toNullableString(path);
    if (!normalized) {
      return '';
    }

    if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
      return normalized;
    }

    return `${this.appBaseUrl}/${normalized.replace(/^\/+/, '')}`;
  }

  private async getUserById(userId: number): Promise<SqlRow | null> {
    if (userId <= 0) {
      return null;
    }

    return this.queryOne(Prisma.sql`
      SELECT id, name, email, user_email, role_id, course_id, premium
      FROM users
      WHERE id = ${userId}
        AND deleted_at IS NULL
      LIMIT 1
    `);
  }

  private async userPurchaseStatus(userId: number, courseId: number): Promise<'on' | 'off'> {
    if (userId <= 0 || courseId <= 0) {
      return 'off';
    }

    const user = await this.getUserById(userId);
    if (!user) {
      return 'off';
    }

    const roleId = toInteger(user.role_id);
    const premium = toInteger(user.premium);

    if (roleId === 3 || premium === 1) {
      return 'on';
    }

    const course = await this.queryOne(Prisma.sql`
      SELECT is_free_course
      FROM course
      WHERE id = ${courseId}
        AND deleted_at IS NULL
      LIMIT 1
    `);

    if (toInteger(course?.is_free_course) === 1) {
      return 'on';
    }

    const today = toDateOnlyString(new Date());
    const payments = await this.count(Prisma.sql`
      SELECT COUNT(*) AS count
      FROM payment_info
      WHERE user_id = ${userId}
        AND course_id = ${courseId}
        AND deleted_at IS NULL
        AND expiry_date IS NOT NULL
        AND expiry_date >= ${today}
    `);

    return payments > 0 ? 'on' : 'off';
  }

  private async toExamData(exam: SqlRow, userId: number): Promise<Record<string, unknown>> {
    const examId = toInteger(exam.id);
    const courseId = toInteger(exam.course_id);

    const [questionCount, isAttempted, purchaseStatus] = await Promise.all([
      this.count(Prisma.sql`
        SELECT COUNT(*) AS count
        FROM exam_questions
        WHERE exam_id = ${examId}
          AND deleted_at IS NULL
      `),
      this.count(Prisma.sql`
        SELECT COUNT(*) AS count
        FROM exam_attempt
        WHERE exam_id = ${examId}
          AND user_id = ${userId}
          AND submit_status = 1
          AND deleted_at IS NULL
      `),
      this.userPurchaseStatus(userId, courseId),
    ]);

    return {
      id: examId,
      title: toStringValue(exam.title),
      description: toStringValue(exam.description),
      total_mark: toDbNumber(exam.mark),
      duration: toStringValue(exam.duration),
      date: formatDateSlash(exam.from_date),
      free: toStringValue(exam.free) === '1' ? 'on' : purchaseStatus,
      questions_count: `${questionCount} Questions`,
      is_attempted: isAttempted > 0 ? 1 : 0,
      exam_link: `${this.appBaseUrl}/exam/exam_web_view/${examId}/${userId}`,
    };
  }

  async listExams(userId: number, filter: ExamFilterInput): Promise<Record<string, unknown>> {
    const user = await this.getUserById(userId);
    if (!user) {
      return {
        upcoming_exams: [],
        expired_exams: [],
      };
    }

    const resolvedCourseId = (filter.courseId ?? 0) > 0 ? filter.courseId ?? 0 : toInteger(user.course_id);
    if (resolvedCourseId <= 0) {
      return {
        upcoming_exams: [],
        expired_exams: [],
      };
    }

    let sql = 'SELECT * FROM exam WHERE course_id = ? AND deleted_at IS NULL';
    const params: number[] = [resolvedCourseId];

    if ((filter.subjectId ?? 0) > 0) {
      sql += ' AND subject_id = ?';
      params.push(filter.subjectId ?? 0);
    }

    if ((filter.lessonId ?? 0) > 0) {
      sql += ' AND lesson_id = ?';
      params.push(filter.lessonId ?? 0);
    }

    sql += ' ORDER BY from_date ASC, from_time ASC';
    const exams = await this.prisma.$queryRawUnsafe<SqlRow[]>(sql, ...params);

    const examData = await Promise.all(exams.map((exam) => this.toExamData(exam, userId)));

    const now = Date.now();
    const upcomingExams: Record<string, unknown>[] = [];
    const expiredExams: Record<string, unknown>[] = [];

    for (let index = 0; index < exams.length; index += 1) {
      const exam = exams[index];
      const examInfo = examData[index];
      if (!exam || !examInfo) {
        continue;
      }

      const examDateTime = combineDateAndTime(exam.from_date, exam.from_time);
      if (examDateTime && examDateTime.getTime() > now) {
        upcomingExams.push(examInfo);
      } else {
        expiredExams.push(examInfo);
      }
    }

    return {
      upcoming_exams: upcomingExams,
      expired_exams: expiredExams,
    };
  }

  async getExamCalendar(userId: number, courseId?: number): Promise<Record<string, unknown>> {
    const user = await this.getUserById(userId);
    const resolvedCourseId = (courseId ?? 0) > 0 ? courseId ?? 0 : toInteger(user?.course_id);

    if (resolvedCourseId <= 0) {
      return this.getEmptyExamCalendar();
    }

    const exams = await this.queryMany(Prisma.sql`
      SELECT id, from_date
      FROM exam
      WHERE course_id = ${resolvedCourseId}
        AND deleted_at IS NULL
      ORDER BY from_date ASC, id ASC
    `);

    if (exams.length === 0) {
      return this.getEmptyExamCalendar();
    }

    const firstExam = exams[0];
    const lastExam = exams[exams.length - 1];

    const startDate = parseDate(firstExam?.from_date);
    const endDate = parseDate(lastExam?.from_date);

    if (!startDate || !endDate) {
      return this.getEmptyExamCalendar();
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);

    const normalizedEndDate = new Date(endDate);
    normalizedEndDate.setHours(0, 0, 0, 0);

    const dateArray: Array<{ date: string; status: string }> = [];
    let completedExams = 0;
    let todayStatus = 0;

    while (currentDate.getTime() <= normalizedEndDate.getTime()) {
      const dayKey = toDateOnlyString(currentDate);
      const hasExam = exams.some((exam) => toNullableString(exam.from_date) === dayKey);

      let status = '0';
      if (hasExam) {
        status = '1';
      } else if (currentDate.getTime() < today.getTime()) {
        status = '2';
      }

      if (status === '1') {
        completedExams += 1;
      }

      if (dayKey === toDateOnlyString(today)) {
        todayStatus = status === '1' ? 1 : 0;
      }

      dateArray.push({
        date: formatDateDash(currentDate),
        status,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    const totalDays = dateArray.length;
    const progress = totalDays > 0 ? Math.round((completedExams / totalDays) * 100) : 0;

    return {
      id: 0,
      title: 'Exam Schedule',
      today_status: todayStatus,
      progress,
      completed_exams: completedExams,
      total_days: totalDays,
      start_date: formatDateDash(startDate),
      end_date: formatDateDash(endDate),
      date_array: dateArray,
    };
  }

  private getEmptyExamCalendar(): Record<string, unknown> {
    const today = new Date();
    const todayValue = formatDateDash(today);

    return {
      id: 0,
      title: 'Exam Schedule',
      today_status: 0,
      progress: 0,
      completed_exams: 0,
      total_days: 1,
      start_date: todayValue,
      end_date: todayValue,
      date_array: [
        {
          date: todayValue,
          status: '0',
        },
      ],
    };
  }

  async startExamAttempt(userId: number, input: StartExamAttemptInput): Promise<{ attemptId: number; questionNo: number }> {
    if (input.examId <= 0 || userId <= 0) {
      return { attemptId: 0, questionNo: 0 };
    }

    const questions = await this.queryMany(Prisma.sql`
      SELECT question_id
      FROM exam_questions
      WHERE exam_id = ${input.examId}
        AND deleted_at IS NULL
      ORDER BY COALESCE(question_no, id) ASC, id ASC
    `);

    const questionIds = questions.map((question) => toInteger(question.question_id)).filter((id) => id > 0);
    const now = new Date().toISOString();

    const inserted = await this.prisma.$queryRaw<Array<{ id: number }>>(Prisma.sql`
      INSERT INTO exam_attempt (
        user_id,
        exam_id,
        question_no,
        question_id,
        start_time,
        submit_status,
        created_by,
        created_at
      ) VALUES (
        ${userId},
        ${input.examId},
        ${questionIds.length},
        ${JSON.stringify(questionIds)},
        ${now},
        0,
        ${userId},
        ${now}
      )
      RETURNING id
    `);

    return {
      attemptId: toInteger(inserted[0]?.id),
      questionNo: questionIds.length,
    };
  }

  private async finalizeExamAttempt(
    attempt: SqlRow,
    userId: number,
    scored: ScoredAttemptSummary,
  ): Promise<void> {
    const attemptId = toInteger(attempt.id);
    const now = new Date().toISOString();

    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE exam_attempt
      SET
        end_time = ${now},
        time_taken = ${scored.timeTaken},
        correct = ${scored.correct},
        incorrect = ${scored.incorrect},
        skip = ${scored.skip},
        score = ${scored.score},
        submit_status = 1,
        updated_by = ${userId},
        updated_at = ${now}
      WHERE id = ${attemptId}
    `);
  }

  async submitExamAttempt(userId: number, input: SubmitAttemptInput): Promise<ScoredAttemptSummary> {
    const attempt = await this.queryOne(Prisma.sql`
      SELECT *
      FROM exam_attempt
      WHERE id = ${input.attemptId}
        AND user_id = ${userId}
        AND deleted_at IS NULL
      LIMIT 1
    `);

    if (!attempt) {
      return {
        correct: 0,
        incorrect: 0,
        skip: 0,
        score: 0,
        timeTaken: '00:00:00',
      };
    }

    const examId = toInteger(attempt.exam_id);
    const questionIds = toNormalizedStringArray(attempt.question_id)
      .map((id) => toInteger(id))
      .filter((id) => id > 0);

    const userAnswerMap = parseAnswerMap(input.userAnswers);

    const questions =
      questionIds.length > 0
        ? await this.queryMany(Prisma.sql`
            SELECT
              exam_questions.question_id,
              exam_questions.mark,
              exam_questions.negative_mark,
              question_bank.correct_answers
            FROM exam_questions
            JOIN question_bank ON question_bank.id = exam_questions.question_id
            WHERE exam_questions.exam_id = ${examId}
              AND exam_questions.question_id IN (${Prisma.join(questionIds)})
              AND exam_questions.deleted_at IS NULL
              AND question_bank.deleted_at IS NULL
            ORDER BY COALESCE(exam_questions.question_no, exam_questions.id) ASC, exam_questions.id ASC
          `)
        : [];

    await this.prisma.$executeRaw(Prisma.sql`
      DELETE FROM exam_answer
      WHERE attempt_id = ${toInteger(attempt.id)}
    `);

    let correct = 0;
    let incorrect = 0;
    let skip = 0;
    let score = 0;

    const now = new Date().toISOString();

    for (const question of questions) {
      const questionId = toInteger(question.question_id);
      const rawCorrect = toNormalizedStringArray(question.correct_answers);
      const normalizedCorrect = sortedCopy(rawCorrect);

      const hasAnswer = userAnswerMap.has(questionId);
      const rawUserAnswer = userAnswerMap.get(questionId);

      let status = 3;
      let submittedAnswers: string[] = [];

      if (hasAnswer) {
        const answerArray = toNormalizedStringArray(rawUserAnswer);
        if (answerArray.length > 0) {
          submittedAnswers = sortedCopy(answerArray);
          status = arraysEqual(submittedAnswers, normalizedCorrect) ? 1 : 2;
        }
      }

      if (status === 1) {
        correct += 1;
        score += toDbNumber(question.mark) || 4;
      } else if (status === 2) {
        incorrect += 1;
        const negativeMark = toDbNumber(question.negative_mark);
        score -= negativeMark > 0 ? negativeMark : 1;
      } else {
        skip += 1;
      }

      await this.prisma.$executeRaw(Prisma.sql`
        INSERT INTO exam_answer (
          user_id,
          exam_id,
          attempt_id,
          question_id,
          answer_correct,
          answer_submitted,
          answer_status,
          created_by,
          created_at
        ) VALUES (
          ${userId},
          ${examId},
          ${toInteger(attempt.id)},
          ${questionId},
          ${JSON.stringify(normalizedCorrect)},
          ${JSON.stringify(submittedAnswers)},
          ${status},
          ${userId},
          ${now}
        )
      `);
    }

    const startedAt = parseDate(attempt.start_time);
    const elapsedSeconds = startedAt ? Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 1000)) : 0;

    const summary: ScoredAttemptSummary = {
      correct,
      incorrect,
      skip,
      score: Math.round(score * 100) / 100,
      timeTaken: formatDurationFromSeconds(elapsedSeconds),
    };

    await this.finalizeExamAttempt(attempt, userId, summary);
    return summary;
  }

  async startQuizAttempt(userId: number, input: StartQuizAttemptInput): Promise<{ attemptId: number; questionNo: number }> {
    if (input.examId <= 0 || userId <= 0) {
      return { attemptId: 0, questionNo: 0 };
    }

    const questions = await this.queryMany(Prisma.sql`
      SELECT id
      FROM quiz
      WHERE lesson_file_id = ${input.examId}
        AND deleted_at IS NULL
      ORDER BY id ASC
    `);

    const questionIds = questions.map((question) => toInteger(question.id)).filter((id) => id > 0);
    const now = new Date().toISOString();

    const inserted = await this.prisma.$queryRaw<Array<{ id: number }>>(Prisma.sql`
      INSERT INTO exam_attempt (
        user_id,
        exam_id,
        question_no,
        question_id,
        start_time,
        submit_status,
        created_by,
        created_at
      ) VALUES (
        ${userId},
        ${input.examId},
        ${questionIds.length},
        ${JSON.stringify(questionIds)},
        ${now},
        0,
        ${userId},
        ${now}
      )
      RETURNING id
    `);

    return {
      attemptId: toInteger(inserted[0]?.id),
      questionNo: questionIds.length,
    };
  }

  async submitQuizAttempt(userId: number, input: SubmitAttemptInput): Promise<ScoredAttemptSummary> {
    const attempt = await this.queryOne(Prisma.sql`
      SELECT *
      FROM exam_attempt
      WHERE id = ${input.attemptId}
        AND user_id = ${userId}
        AND deleted_at IS NULL
      LIMIT 1
    `);

    if (!attempt) {
      return {
        correct: 0,
        incorrect: 0,
        skip: 0,
        score: 0,
        timeTaken: '00:00:00',
      };
    }

    const quizId = toInteger(attempt.exam_id);
    const questionIds = toNormalizedStringArray(attempt.question_id)
      .map((id) => toInteger(id))
      .filter((id) => id > 0);

    const questions =
      questionIds.length > 0
        ? await this.queryMany(Prisma.sql`
            SELECT id, question_type, answer_id, answer_ids
            FROM quiz
            WHERE id IN (${Prisma.join(questionIds)})
              AND lesson_file_id = ${quizId}
              AND deleted_at IS NULL
            ORDER BY id ASC
          `)
        : [];

    const userAnswerMap = parseAnswerMap(input.userAnswers);

    await this.prisma.$executeRaw(Prisma.sql`
      DELETE FROM exam_answer
      WHERE attempt_id = ${toInteger(attempt.id)}
    `);

    let correct = 0;
    let incorrect = 0;
    let skip = 0;

    const now = new Date().toISOString();

    for (const question of questions) {
      const questionId = toInteger(question.id);
      const questionType = toInteger(question.question_type);

      const correctAnswers =
        questionType === 0
          ? toNormalizedStringArray([question.answer_id])
          : sortedCopy(toNormalizedStringArray(question.answer_ids));

      const hasAnswer = userAnswerMap.has(questionId);
      const rawSubmitted = userAnswerMap.get(questionId);

      let status = 3;
      let submittedAnswers: string[] = [];

      if (hasAnswer) {
        const submitted = toNormalizedStringArray(rawSubmitted);
        if (submitted.length > 0) {
          submittedAnswers = questionType === 0 ? [submitted[0] ?? ''] : sortedCopy(submitted);

          const isCorrect =
            questionType === 0
              ? submittedAnswers[0] === (correctAnswers[0] ?? '')
              : arraysEqual(submittedAnswers, correctAnswers);

          status = isCorrect ? 1 : 2;
        }
      }

      if (status === 1) {
        correct += 1;
      } else if (status === 2) {
        incorrect += 1;
      } else {
        skip += 1;
      }

      await this.prisma.$executeRaw(Prisma.sql`
        INSERT INTO exam_answer (
          user_id,
          exam_id,
          attempt_id,
          question_id,
          answer_correct,
          answer_submitted,
          answer_status,
          created_by,
          created_at
        ) VALUES (
          ${userId},
          ${quizId},
          ${toInteger(attempt.id)},
          ${questionId},
          ${JSON.stringify(correctAnswers)},
          ${JSON.stringify(submittedAnswers)},
          ${status},
          ${userId},
          ${now}
        )
      `);
    }

    const startedAt = parseDate(attempt.start_time);
    const elapsedSeconds = startedAt ? Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 1000)) : 0;

    const summary: ScoredAttemptSummary = {
      correct,
      incorrect,
      skip,
      score: correct,
      timeTaken: formatDurationFromSeconds(elapsedSeconds),
    };

    await this.finalizeExamAttempt(attempt, userId, summary);
    return summary;
  }

  async startPracticeAttempt(
    userId: number,
    input: StartPracticeAttemptInput,
  ): Promise<{ attemptId: number; questionNo: number }> {
    if (userId <= 0) {
      return { attemptId: 0, questionNo: 0 };
    }

    const lessonFileId = input.lessonFileId ?? 0;
    const lessonId = input.lessonId ?? 0;

    let questionRows: SqlRow[] = [];
    let lessonIds: number[] = [];

    if (lessonFileId > 0) {
      questionRows = await this.queryMany(Prisma.sql`
        SELECT id
        FROM quiz
        WHERE lesson_file_id = ${lessonFileId}
          AND deleted_at IS NULL
        ORDER BY id ASC
      `);

      const lessonFile = await this.queryOne(Prisma.sql`
        SELECT lesson_id
        FROM lesson_files
        WHERE id = ${lessonFileId}
          AND deleted_at IS NULL
        LIMIT 1
      `);

      const resolvedLessonId = toInteger(lessonFile?.lesson_id);
      if (resolvedLessonId > 0) {
        lessonIds = [resolvedLessonId];
      }
    } else if (lessonId > 0) {
      questionRows = await this.queryMany(Prisma.sql`
        SELECT quiz.id
        FROM quiz
        JOIN lesson_files ON lesson_files.id = quiz.lesson_file_id
        WHERE lesson_files.lesson_id = ${lessonId}
          AND quiz.deleted_at IS NULL
          AND lesson_files.deleted_at IS NULL
        ORDER BY quiz.id ASC
      `);
      lessonIds = [lessonId];
    }

    let questionIds = questionRows.map((question) => toInteger(question.id)).filter((id) => id > 0);

    const questionNo = input.questionNo ?? 0;
    if (questionNo > 0 && questionNo < questionIds.length) {
      questionIds = questionIds.slice(0, questionNo);
    }

    const now = new Date().toISOString();

    const inserted = await this.prisma.$queryRaw<Array<{ id: number }>>(Prisma.sql`
      INSERT INTO practice_attempt (
        user_id,
        lesson_id,
        lesson_file_id,
        question_no,
        question_id,
        start_time,
        submit_status,
        created_by,
        created_at
      ) VALUES (
        ${userId},
        ${JSON.stringify(lessonIds)},
        ${lessonFileId > 0 ? lessonFileId : null},
        ${questionIds.length},
        ${JSON.stringify(questionIds)},
        ${now},
        0,
        ${userId},
        ${now}
      )
      RETURNING id
    `);

    return {
      attemptId: toInteger(inserted[0]?.id),
      questionNo: questionIds.length,
    };
  }

  async submitPracticeAttempt(userId: number, input: SubmitAttemptInput): Promise<ScoredAttemptSummary> {
    const attempt = await this.queryOne(Prisma.sql`
      SELECT *
      FROM practice_attempt
      WHERE id = ${input.attemptId}
        AND user_id = ${userId}
        AND deleted_at IS NULL
      LIMIT 1
    `);

    if (!attempt) {
      return {
        correct: 0,
        incorrect: 0,
        skip: 0,
        score: 0,
        timeTaken: '00:00:00',
      };
    }

    const questionIds = toNormalizedStringArray(attempt.question_id)
      .map((id) => toInteger(id))
      .filter((id) => id > 0);

    const questions =
      questionIds.length > 0
        ? await this.queryMany(Prisma.sql`
            SELECT id, answer_id, answer_ids
            FROM quiz
            WHERE id IN (${Prisma.join(questionIds)})
              AND deleted_at IS NULL
            ORDER BY id ASC
          `)
        : [];

    const userAnswerMap = parseAnswerMap(input.userAnswers);

    await this.prisma.$executeRaw(Prisma.sql`
      DELETE FROM practice_answer
      WHERE attempt_id = ${toInteger(attempt.id)}
    `);

    let correct = 0;
    let incorrect = 0;
    let skip = 0;

    const now = new Date().toISOString();

    for (const question of questions) {
      const questionId = toInteger(question.id);
      const parsedAnswerIds = sortedCopy(toNormalizedStringArray(question.answer_ids));
      const correctAnswers = parsedAnswerIds.length > 0 ? parsedAnswerIds : toNormalizedStringArray([question.answer_id]);

      const hasUserAnswer = userAnswerMap.has(questionId);
      const userAnswer = userAnswerMap.get(questionId);

      let submittedAnswers: string[] = [];
      let status = 3;

      if (hasUserAnswer) {
        if (Array.isArray(userAnswer)) {
          if (userAnswer.length > 0) {
            submittedAnswers = sortedCopy(toNormalizedStringArray(userAnswer));
          }
        } else if (userAnswer !== null && userAnswer !== '') {
          submittedAnswers = sortedCopy(toNormalizedStringArray(userAnswer));
        }

        if (submittedAnswers.length > 0) {
          status = arraysEqual(submittedAnswers, sortedCopy(correctAnswers)) ? 1 : 2;
        }
      }

      if (status === 1) {
        correct += 1;
      } else if (status === 2) {
        incorrect += 1;
      } else {
        skip += 1;
      }

      await this.prisma.$executeRaw(Prisma.sql`
        INSERT INTO practice_answer (
          user_id,
          attempt_id,
          question_id,
          answer_correct,
          answer_submitted,
          answer_status,
          created_by,
          created_at
        ) VALUES (
          ${userId},
          ${toInteger(attempt.id)},
          ${questionId},
          ${JSON.stringify(sortedCopy(correctAnswers))},
          ${JSON.stringify(submittedAnswers)},
          ${status},
          ${userId},
          ${now}
        )
      `);
    }

    const startedAt = parseDate(attempt.start_time);
    const elapsedSeconds = startedAt ? Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 1000)) : 0;

    const score = correct * 4 - incorrect;

    const summary: ScoredAttemptSummary = {
      correct,
      incorrect,
      skip,
      score,
      timeTaken: formatDurationFromSeconds(elapsedSeconds),
    };

    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE practice_attempt
      SET
        end_time = ${now},
        time_taken = ${summary.timeTaken},
        correct = ${correct},
        incorrect = ${incorrect},
        skip = ${skip},
        score = ${score},
        submit_status = 1,
        updated_by = ${userId},
        updated_at = ${now}
      WHERE id = ${toInteger(attempt.id)}
    `);

    return summary;
  }

  private async getAssignmentsForCohort(cohortId: number, userId: number): Promise<Record<string, unknown>[]> {
    const assignments = await this.queryMany(Prisma.sql`
      SELECT *
      FROM assignment
      WHERE cohort_id = ${cohortId}
        AND deleted_at IS NULL
      ORDER BY due_date ASC, from_time ASC, id ASC
    `);

    const assignmentData = await Promise.all(
      assignments.map((assignment) => this.toAssignmentData(assignment, userId)),
    );

    return assignmentData;
  }

  private async toAssignmentData(assignment: SqlRow, userId: number): Promise<Record<string, unknown>> {
    const assignmentId = toInteger(assignment.id);

    const [savedCount, submissionCount, submission] = await Promise.all([
      this.count(Prisma.sql`
        SELECT COUNT(*) AS count
        FROM saved_assignments
        WHERE user_id = ${userId}
          AND assignment_id = ${assignmentId}
          AND deleted_at IS NULL
      `),
      this.count(Prisma.sql`
        SELECT COUNT(*) AS count
        FROM assignment_submissions
        WHERE user_id = ${userId}
          AND assignment_id = ${assignmentId}
          AND deleted_at IS NULL
      `),
      this.queryOne(Prisma.sql`
        SELECT assignment_files, marks, remarks, created_at
        FROM assignment_submissions
        WHERE user_id = ${userId}
          AND assignment_id = ${assignmentId}
          AND deleted_at IS NULL
        ORDER BY id DESC
        LIMIT 1
      `),
    ]);

    const status = submissionCount > 0 ? 'Completed' : 'Current';
    const reviewed =
      toNullableString(submission?.marks) !== null && toNullableString(submission?.remarks) !== null ? 1 : 0;

    const submittedFilePaths = parseUnknownArray(submission?.assignment_files)
      .map((file) => toStringValue(file).trim())
      .filter((file) => file !== '');

    const submittedFiles = submittedFilePaths.map((file) => ({
      file: this.toFileUrl(file),
      date: formatDateDash(submission?.created_at),
    }));

    const totalMarks = toStringValue(assignment.total_marks);
    const marksValue = toNullableString(submission?.marks) ?? '';

    return {
      id: assignmentId,
      title: toStringValue(assignment.title),
      description: toStringValue(assignment.description),
      total_marks: assignment.total_marks ?? '',
      instruction: extractInstructions(toStringValue(assignment.instructions)),
      date: formatDateDash(assignment.due_date),
      formatted_date: formatDateMonth(assignment.due_date),
      time: formatTimeRange(assignment.from_time, assignment.to_time),
      file: this.toFileUrl(assignment.file),
      status,
      is_saved: savedCount,
      is_submitted: submissionCount,
      is_reviewed: reviewed,
      remarks: toNullableString(submission?.remarks) ?? '',
      marks: `${marksValue}/${totalMarks === '' ? '0' : totalMarks}`,
      submitted_file: submittedFiles,
    };
  }

  async listAssignments(userId: number, filter: AssignmentFilterInput): Promise<Record<string, unknown>> {
    const current: Record<string, unknown>[] = [];
    const upcoming: Record<string, unknown>[] = [];
    const completed: Record<string, unknown>[] = [];

    if ((filter.cohortId ?? 0) > 0) {
      const assignments = await this.getAssignmentsForCohort(filter.cohortId ?? 0, userId);
      for (const assignment of assignments) {
        const status = toStringValue(assignment.status);
        if (status.includes('Current')) {
          current.push(assignment);
        } else if (status.includes('Upcoming')) {
          upcoming.push(assignment);
        } else {
          completed.push(assignment);
        }
      }

      return {
        completed,
        current,
        upcoming,
      };
    }

    let cohorts = await this.queryMany(Prisma.sql`
      SELECT
        cohort_students.cohort_id AS cohort_id,
        cohorts.title AS cohort_title,
        cohorts.cohort_id AS cohort_code,
        cohorts.start_date AS cohort_start_date,
        cohorts.end_date AS cohort_end_date,
        cohorts.subject_id AS subject_id
      FROM cohort_students
      JOIN cohorts ON cohorts.id = cohort_students.cohort_id
      WHERE cohort_students.user_id = ${userId}
        AND cohort_students.deleted_at IS NULL
        AND cohorts.deleted_at IS NULL
    `);

    if ((filter.subjectId ?? 0) > 0) {
      const subject = await this.queryOne(Prisma.sql`
        SELECT id, master_subject_id
        FROM subject
        WHERE id = ${filter.subjectId ?? 0}
          AND deleted_at IS NULL
        LIMIT 1
      `);

      const masterSubjectId = toInteger(subject?.master_subject_id);
      const realSubjectId = masterSubjectId > 0 ? masterSubjectId : filter.subjectId ?? 0;

      cohorts = cohorts.filter((cohort) => toInteger(cohort.subject_id) === realSubjectId);
    }

    for (const cohort of cohorts) {
      const cohortId = toInteger(cohort.cohort_id);
      if (cohortId <= 0) {
        continue;
      }

      const assignments = await this.getAssignmentsForCohort(cohortId, userId);
      for (const assignment of assignments) {
        const status = toStringValue(assignment.status);
        if (status.includes('Current')) {
          current.push(assignment);
        } else if (status.includes('Upcoming')) {
          upcoming.push(assignment);
        } else {
          completed.push(assignment);
        }
      }
    }

    return {
      completed,
      current,
      upcoming,
    };
  }

  async getAssignmentDetails(userId: number, assignmentId: number): Promise<Record<string, unknown> | null> {
    if (assignmentId <= 0) {
      return null;
    }

    const assignment = await this.queryOne(Prisma.sql`
      SELECT *
      FROM assignment
      WHERE id = ${assignmentId}
        AND deleted_at IS NULL
      LIMIT 1
    `);

    if (!assignment) {
      return null;
    }

    return this.toAssignmentData(assignment, userId);
  }

  private normalizeSubmittedAssignmentFiles(value: unknown): string[] {
    if (value === null || value === undefined) {
      return [];
    }

    if (Array.isArray(value)) {
      return value
        .map((entry) => {
          if (typeof entry === 'string') {
            return entry.trim();
          }

          if (entry && typeof entry === 'object') {
            const file = toNullableString((entry as Record<string, unknown>).file);
            return file ?? '';
          }

          return '';
        })
        .filter((entry) => entry !== '');
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed === '' ? [] : [trimmed];
    }

    return [];
  }

  private async sendAssignmentSubmissionEmails(
    userId: number,
    assignmentId: number,
    assignmentTitle: string,
    courseTitle: string,
  ): Promise<void> {
    const student = await this.getUserById(userId);
    if (!student) {
      return;
    }

    const assignment = await this.queryOne(Prisma.sql`
      SELECT created_by
      FROM assignment
      WHERE id = ${assignmentId}
        AND deleted_at IS NULL
      LIMIT 1
    `);

    const instructorId = toInteger(assignment?.created_by);
    const instructor = instructorId > 0 ? await this.getUserById(instructorId) : null;

    const studentTo = toNullableString(student.user_email) ?? toNullableString(student.email);
    if (studentTo) {
      try {
        await this.emailProvider.sendEmail({
          to: studentTo,
          subject: `Assignment Submission Successful – ${assignmentTitle}`,
          text: `We have successfully received your assignment submission for ${assignmentTitle}.`,
        });
      } catch {
        // Delivery failures should not break assignment submission parity behavior.
      }
    }

    const instructorTo = toNullableString(instructor?.user_email) ?? toNullableString(instructor?.email);
    if (instructorTo) {
      try {
        await this.emailProvider.sendEmail({
          to: instructorTo,
          subject: `Assignment Submitted by Learner – ${assignmentTitle}`,
          text: `A learner submitted assignment ${assignmentTitle} for ${courseTitle}.`,
        });
      } catch {
        // Delivery failures should not break assignment submission parity behavior.
      }
    }
  }

  async submitAssignment(userId: number, input: SubmitAssignmentInput): Promise<Record<string, unknown>> {
    if (input.assignmentId <= 0) {
      return {
        status: 0,
        message: 'Missing Assignment id.',
        data: [],
      };
    }

    const existing = await this.count(Prisma.sql`
      SELECT COUNT(*) AS count
      FROM assignment_submissions
      WHERE user_id = ${userId}
        AND assignment_id = ${input.assignmentId}
        AND deleted_at IS NULL
    `);

    if (existing > 0) {
      return {
        status: false,
        message: 'Assignment already submitted',
        data: [],
      };
    }

    const assignment = await this.queryOne(Prisma.sql`
      SELECT id, cohort_id, course_id, title
      FROM assignment
      WHERE id = ${input.assignmentId}
        AND deleted_at IS NULL
      LIMIT 1
    `);

    if (!assignment) {
      return {
        status: 0,
        message: 'Missing required fields.',
        data: [],
      };
    }

    const assignmentId = toInteger(assignment.id);
    const cohortId = toInteger(assignment.cohort_id);
    const courseId = toInteger(assignment.course_id);

    if (assignmentId <= 0 || userId <= 0) {
      return {
        status: 0,
        message: 'Missing required fields.',
        data: [],
      };
    }

    const files = this.normalizeSubmittedAssignmentFiles(input.answerFiles);
    const now = new Date().toISOString();

    const inserted = await this.prisma.$queryRaw<Array<{ id: number }>>(Prisma.sql`
      INSERT INTO assignment_submissions (
        user_id,
        cohort_id,
        assignment_id,
        course_id,
        assignment_files,
        created_by,
        created_at
      ) VALUES (
        ${userId},
        ${cohortId > 0 ? cohortId : null},
        ${assignmentId},
        ${courseId > 0 ? courseId : null},
        ${files.length > 0 ? JSON.stringify(files) : null},
        ${userId},
        ${now}
      )
      RETURNING id
    `);

    const submissionId = toInteger(inserted[0]?.id);
    if (submissionId <= 0) {
      return {
        status: false,
        message: 'Something Went Wrong',
        data: [],
      };
    }

    const course = await this.queryOne(Prisma.sql`
      SELECT title
      FROM course
      WHERE id = ${courseId}
        AND deleted_at IS NULL
      LIMIT 1
    `);

    await this.sendAssignmentSubmissionEmails(
      userId,
      assignmentId,
      toStringValue(assignment.title),
      toStringValue(course?.title),
    );

    return {
      status: 1,
      message: 'success',
      data: [],
    };
  }

  async toggleSavedAssignment(userId: number, assignmentId: number): Promise<Record<string, unknown>> {
    if (assignmentId <= 0) {
      return {
        status: 'Successfully Saved',
        data: [],
      };
    }

    const existing = await this.queryOne(Prisma.sql`
      SELECT id
      FROM saved_assignments
      WHERE user_id = ${userId}
        AND assignment_id = ${assignmentId}
        AND deleted_at IS NULL
      LIMIT 1
    `);

    if (existing) {
      const now = new Date().toISOString();
      await this.prisma.$executeRaw(Prisma.sql`
        UPDATE saved_assignments
        SET deleted_at = ${now}, deleted_by = ${userId}
        WHERE id = ${toInteger(existing.id)}
      `);

      return {
        status: 'Successfully Removed from saved Assignments',
        data: [],
      };
    }

    const now = new Date().toISOString();
    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO saved_assignments (
        user_id,
        assignment_id,
        created_by,
        created_at
      ) VALUES (
        ${userId},
        ${assignmentId},
        ${userId},
        ${now}
      )
    `);

    return {
      status: 'Successfully Saved',
      data: [],
    };
  }
}
