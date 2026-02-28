import type { PrismaClient } from '@prisma/client';

import { getPrismaClient } from '../data/prisma-client.js';
import { env } from '../env.js';
import { createIntegrationRegistry } from '../integrations/registry.js';
import type { EmailProvider, IntegrationRegistry } from '../integrations/contracts.js';

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

function parseAnswerMap(userAnswers: unknown): Map<string, unknown> {
  const answerMap = new Map<string, unknown>();
  if (!Array.isArray(userAnswers)) {
    return answerMap;
  }

  for (const row of userAnswers) {
    if (!row || typeof row !== 'object') {
      continue;
    }

    const record = row as Record<string, unknown>;
    const questionId = toStringValue(record.question_id).trim();
    if (questionId === '') {
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
  courseId?: string;
  subjectId?: string;
  lessonId?: string;
}

export interface StartExamAttemptInput {
  examId: string;
}

export interface SubmitAttemptInput {
  attemptId: string;
  userAnswers: unknown;
}

export interface StartQuizAttemptInput {
  examId: string;
}

export interface StartPracticeAttemptInput {
  lessonId?: string;
  lessonFileId?: string;
  questionNo?: number;
}

export interface AssignmentFilterInput {
  subjectId?: string;
  cohortId?: string;
}

export interface SubmitAssignmentInput {
  assignmentId: string;
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

  private async getUserById(userId: string): Promise<Record<string, unknown> | null> {
    if (!userId) {
      return null;
    }

    const user = await this.prisma.users.findFirst({
      where: {
        id: userId,
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        user_email: true,
        role_id: true,
        course_id: true,
        premium: true,
      },
    });

    return user as Record<string, unknown> | null;
  }

  private async userPurchaseStatus(userId: string, courseId: string): Promise<'on' | 'off'> {
    if (!userId || !courseId) {
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

    const course = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        deleted_at: null,
      },
      select: {
        is_free_course: true,
      },
    });

    if (toInteger(course?.is_free_course) === 1) {
      return 'on';
    }

    const now = new Date();
    const payments = await this.prisma.payment_info.count({
      where: {
        user_id: userId,
        course_id: courseId,
        deleted_at: null,
        expiry_date: {
          not: null,
          gte: now,
        },
      },
    });

    return payments > 0 ? 'on' : 'off';
  }

  private async toExamData(exam: Record<string, unknown>, userId: string): Promise<Record<string, unknown>> {
    const examId = toStringValue(exam.id);
    const courseId = toStringValue(exam.course_id);

    const [questionCount, isAttempted, purchaseStatus] = await Promise.all([
      this.prisma.exam_questions.count({
        where: {
          exam_id: examId,
          deleted_at: null,
        },
      }),
      this.prisma.exam_attempt.count({
        where: {
          exam_id: examId,
          user_id: userId,
          submit_status: 1,
          deleted_at: null,
        },
      }),
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

  async listExams(userId: string, filter: ExamFilterInput): Promise<Record<string, unknown>> {
    const user = await this.getUserById(userId);
    if (!user) {
      return {
        upcoming_exams: [],
        expired_exams: [],
      };
    }

    const resolvedCourseId = filter.courseId || toStringValue(user.course_id);
    if (!resolvedCourseId) {
      return {
        upcoming_exams: [],
        expired_exams: [],
      };
    }

    const whereClause: Record<string, unknown> = {
      course_id: resolvedCourseId,
      deleted_at: null,
    };

    if (filter.subjectId) {
      whereClause.subject_id = filter.subjectId;
    }

    if (filter.lessonId) {
      whereClause.lesson_id = filter.lessonId;
    }

    const exams = await this.prisma.exam.findMany({
      where: whereClause,
      orderBy: [
        { from_date: 'asc' },
        { from_time: 'asc' },
      ],
    });

    const examData = await Promise.all(
      exams.map((exam) => this.toExamData(exam as unknown as Record<string, unknown>, userId)),
    );

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

  async getExamCalendar(userId: string, courseId?: string): Promise<Record<string, unknown>> {
    const user = await this.getUserById(userId);
    const resolvedCourseId = courseId || toStringValue(user?.course_id);

    if (!resolvedCourseId) {
      return this.getEmptyExamCalendar();
    }

    const exams = await this.prisma.exam.findMany({
      where: {
        course_id: resolvedCourseId,
        deleted_at: null,
      },
      select: {
        id: true,
        from_date: true,
      },
      orderBy: [
        { from_date: 'asc' },
        { id: 'asc' },
      ],
    });

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

    // Build a set of exam date strings for efficient lookup
    const examDateSet = new Set<string>();
    for (const exam of exams) {
      const d = parseDate(exam.from_date);
      if (d) {
        examDateSet.add(toDateOnlyString(d));
      }
    }

    while (currentDate.getTime() <= normalizedEndDate.getTime()) {
      const dayKey = toDateOnlyString(currentDate);
      const hasExam = examDateSet.has(dayKey);

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

  async startExamAttempt(userId: string, input: StartExamAttemptInput): Promise<{ attemptId: string; questionNo: number }> {
    if (!input.examId || !userId) {
      return { attemptId: '', questionNo: 0 };
    }

    const questions = await this.prisma.exam_questions.findMany({
      where: {
        exam_id: input.examId,
        deleted_at: null,
      },
      select: {
        id: true,
        question_id: true,
        question_no: true,
      },
      orderBy: [
        { question_no: 'asc' },
        { id: 'asc' },
      ],
    });

    const questionIds = questions
      .map((q) => toStringValue(q.question_id).trim())
      .filter((id) => id !== '');

    const now = new Date();

    const created = await this.prisma.exam_attempt.create({
      data: {
        user_id: userId,
        exam_id: input.examId,
        question_no: questionIds.length,
        question_id: JSON.stringify(questionIds),
        start_time: now,
        submit_status: 0,
        created_by: userId,
        created_at: now,
      },
    });

    return {
      attemptId: created.id,
      questionNo: questionIds.length,
    };
  }

  private async finalizeExamAttempt(
    attemptId: string,
    userId: string,
    scored: ScoredAttemptSummary,
  ): Promise<void> {
    const now = new Date();

    await this.prisma.exam_attempt.update({
      where: { id: attemptId },
      data: {
        end_time: now,
        time_taken: scored.timeTaken,
        correct: scored.correct,
        incorrect: scored.incorrect,
        skip: scored.skip,
        score: scored.score,
        submit_status: 1,
        updated_by: userId,
        updated_at: now,
      },
    });
  }

  async submitExamAttempt(userId: string, input: SubmitAttemptInput): Promise<ScoredAttemptSummary> {
    const attempt = await this.prisma.exam_attempt.findFirst({
      where: {
        id: input.attemptId,
        user_id: userId,
        deleted_at: null,
      },
    });

    if (!attempt) {
      return {
        correct: 0,
        incorrect: 0,
        skip: 0,
        score: 0,
        timeTaken: '00:00:00',
      };
    }

    const examId = attempt.exam_id;
    const questionIds = toNormalizedStringArray(attempt.question_id)
      .map((id) => id.trim())
      .filter((id) => id !== '');

    const userAnswerMap = parseAnswerMap(input.userAnswers);

    // Fetch exam_questions and question_bank separately (no JOIN in MongoDB)
    let examQuestions: Array<{ question_id: string; mark: number | null; negative_mark: number | null }> = [];
    if (questionIds.length > 0) {
      examQuestions = await this.prisma.exam_questions.findMany({
        where: {
          exam_id: examId,
          question_id: { in: questionIds },
          deleted_at: null,
        },
        select: {
          id: true,
          question_id: true,
          question_no: true,
          mark: true,
          negative_mark: true,
        },
        orderBy: [
          { question_no: 'asc' },
          { id: 'asc' },
        ],
      });
    }

    // Fetch correct answers from question_bank
    const qbIds = examQuestions.map((eq) => eq.question_id);
    const questionBankRows = qbIds.length > 0
      ? await this.prisma.question_bank.findMany({
          where: {
            id: { in: qbIds },
            deleted_at: null,
          },
          select: {
            id: true,
            correct_answers: true,
          },
        })
      : [];

    const qbMap = new Map<string, string | null>();
    for (const qb of questionBankRows) {
      qbMap.set(qb.id, qb.correct_answers);
    }

    // Delete old answers for this attempt
    await this.prisma.exam_answer.deleteMany({
      where: { attempt_id: attempt.id },
    });

    let correct = 0;
    let incorrect = 0;
    let skip = 0;
    let score = 0;

    const now = new Date();

    for (const eqRow of examQuestions) {
      const questionId = eqRow.question_id;
      const rawCorrect = toNormalizedStringArray(qbMap.get(questionId));
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
        score += toDbNumber(eqRow.mark) || 4;
      } else if (status === 2) {
        incorrect += 1;
        const negativeMark = toDbNumber(eqRow.negative_mark);
        score -= negativeMark > 0 ? negativeMark : 1;
      } else {
        skip += 1;
      }

      await this.prisma.exam_answer.create({
        data: {
          user_id: userId,
          exam_id: examId,
          attempt_id: attempt.id,
          question_id: questionId,
          answer_correct: JSON.stringify(normalizedCorrect),
          answer_submitted: JSON.stringify(submittedAnswers),
          answer_status: status,
          created_by: userId,
          created_at: now,
        },
      });
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

    await this.finalizeExamAttempt(attempt.id, userId, summary);
    return summary;
  }

  async startQuizAttempt(userId: string, input: StartQuizAttemptInput): Promise<{ attemptId: string; questionNo: number }> {
    if (!input.examId || !userId) {
      return { attemptId: '', questionNo: 0 };
    }

    const questions = await this.prisma.quiz.findMany({
      where: {
        lesson_file_id: input.examId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
      orderBy: { id: 'asc' },
    });

    const questionIds = questions.map((q) => q.id);
    const now = new Date();

    const created = await this.prisma.exam_attempt.create({
      data: {
        user_id: userId,
        exam_id: input.examId,
        question_no: questionIds.length,
        question_id: JSON.stringify(questionIds),
        start_time: now,
        submit_status: 0,
        created_by: userId,
        created_at: now,
      },
    });

    return {
      attemptId: created.id,
      questionNo: questionIds.length,
    };
  }

  async submitQuizAttempt(userId: string, input: SubmitAttemptInput): Promise<ScoredAttemptSummary> {
    const attempt = await this.prisma.exam_attempt.findFirst({
      where: {
        id: input.attemptId,
        user_id: userId,
        deleted_at: null,
      },
    });

    if (!attempt) {
      return {
        correct: 0,
        incorrect: 0,
        skip: 0,
        score: 0,
        timeTaken: '00:00:00',
      };
    }

    const quizId = attempt.exam_id;
    const questionIds = toNormalizedStringArray(attempt.question_id)
      .map((id) => id.trim())
      .filter((id) => id !== '');

    const questions =
      questionIds.length > 0
        ? await this.prisma.quiz.findMany({
            where: {
              id: { in: questionIds },
              lesson_file_id: quizId,
              deleted_at: null,
            },
            select: {
              id: true,
              question_type: true,
              answer_id: true,
              answer_ids: true,
            },
            orderBy: { id: 'asc' },
          })
        : [];

    const userAnswerMap = parseAnswerMap(input.userAnswers);

    // Delete old answers for this attempt
    await this.prisma.exam_answer.deleteMany({
      where: { attempt_id: attempt.id },
    });

    let correct = 0;
    let incorrect = 0;
    let skip = 0;

    const now = new Date();

    for (const question of questions) {
      const questionId = question.id;
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

      await this.prisma.exam_answer.create({
        data: {
          user_id: userId,
          exam_id: quizId,
          attempt_id: attempt.id,
          question_id: questionId,
          answer_correct: JSON.stringify(correctAnswers),
          answer_submitted: JSON.stringify(submittedAnswers),
          answer_status: status,
          created_by: userId,
          created_at: now,
        },
      });
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

    await this.finalizeExamAttempt(attempt.id, userId, summary);
    return summary;
  }

  async startPracticeAttempt(
    userId: string,
    input: StartPracticeAttemptInput,
  ): Promise<{ attemptId: string; questionNo: number }> {
    if (!userId) {
      return { attemptId: '', questionNo: 0 };
    }

    const lessonFileId = input.lessonFileId ?? '';
    const lessonId = input.lessonId ?? '';

    let questionRows: Array<{ id: string }> = [];
    let lessonIds: string[] = [];

    if (lessonFileId) {
      questionRows = await this.prisma.quiz.findMany({
        where: {
          lesson_file_id: lessonFileId,
          deleted_at: null,
        },
        select: { id: true },
        orderBy: { id: 'asc' },
      });

      const lessonFile = await this.prisma.lesson_files.findFirst({
        where: {
          id: lessonFileId,
          deleted_at: null,
        },
        select: { lesson_id: true },
      });

      const resolvedLessonId = toStringValue(lessonFile?.lesson_id).trim();
      if (resolvedLessonId) {
        lessonIds = [resolvedLessonId];
      }
    } else if (lessonId) {
      // Find all lesson_files for this lesson, then find quizzes
      const lessonFiles = await this.prisma.lesson_files.findMany({
        where: {
          lesson_id: lessonId,
          deleted_at: null,
        },
        select: { id: true },
      });

      const lessonFileIds = lessonFiles.map((lf) => lf.id);
      if (lessonFileIds.length > 0) {
        questionRows = await this.prisma.quiz.findMany({
          where: {
            lesson_file_id: { in: lessonFileIds },
            deleted_at: null,
          },
          select: { id: true },
          orderBy: { id: 'asc' },
        });
      }
      lessonIds = [lessonId];
    }

    let questionIds = questionRows.map((q) => q.id);

    const questionNo = input.questionNo ?? 0;
    if (questionNo > 0 && questionNo < questionIds.length) {
      questionIds = questionIds.slice(0, questionNo);
    }

    const now = new Date();

    const created = await this.prisma.practice_attempt.create({
      data: {
        user_id: userId,
        lesson_id: JSON.stringify(lessonIds),
        lesson_file_id: lessonFileId || null,
        question_no: questionIds.length,
        question_id: JSON.stringify(questionIds),
        start_time: now,
        submit_status: 0,
        created_by: userId,
        created_at: now,
      },
    });

    return {
      attemptId: created.id,
      questionNo: questionIds.length,
    };
  }

  async submitPracticeAttempt(userId: string, input: SubmitAttemptInput): Promise<ScoredAttemptSummary> {
    const attempt = await this.prisma.practice_attempt.findFirst({
      where: {
        id: input.attemptId,
        user_id: userId,
        deleted_at: null,
      },
    });

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
      .map((id) => id.trim())
      .filter((id) => id !== '');

    const questions =
      questionIds.length > 0
        ? await this.prisma.quiz.findMany({
            where: {
              id: { in: questionIds },
              deleted_at: null,
            },
            select: {
              id: true,
              answer_id: true,
              answer_ids: true,
            },
            orderBy: { id: 'asc' },
          })
        : [];

    const userAnswerMap = parseAnswerMap(input.userAnswers);

    // Delete old answers for this attempt
    await this.prisma.practice_answer.deleteMany({
      where: { attempt_id: attempt.id },
    });

    let correct = 0;
    let incorrect = 0;
    let skip = 0;

    const now = new Date();

    for (const question of questions) {
      const questionId = question.id;
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

      await this.prisma.practice_answer.create({
        data: {
          user_id: userId,
          attempt_id: attempt.id,
          question_id: questionId,
          answer_correct: JSON.stringify(sortedCopy(correctAnswers)),
          answer_submitted: JSON.stringify(submittedAnswers),
          answer_status: status,
          created_by: userId,
          created_at: now,
        },
      });
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

    await this.prisma.practice_attempt.update({
      where: { id: attempt.id },
      data: {
        end_time: now,
        time_taken: summary.timeTaken,
        correct,
        incorrect,
        skip,
        score,
        submit_status: 1,
        updated_by: userId,
        updated_at: now,
      },
    });

    return summary;
  }

  private async getAssignmentsForCohort(cohortId: string, userId: string): Promise<Record<string, unknown>[]> {
    const assignments = await this.prisma.assignment.findMany({
      where: {
        cohort_id: cohortId,
        deleted_at: null,
      },
      orderBy: [
        { due_date: 'asc' },
        { from_time: 'asc' },
        { id: 'asc' },
      ],
    });

    const assignmentData = await Promise.all(
      assignments.map((assignment) =>
        this.toAssignmentData(assignment as unknown as Record<string, unknown>, userId),
      ),
    );

    return assignmentData;
  }

  private async toAssignmentData(assignment: Record<string, unknown>, userId: string): Promise<Record<string, unknown>> {
    const assignmentId = toStringValue(assignment.id);

    const [savedCount, submissionCount, submission] = await Promise.all([
      this.prisma.saved_assignments.count({
        where: {
          user_id: userId,
          assignment_id: assignmentId,
          deleted_at: null,
        },
      }),
      this.prisma.assignment_submissions.count({
        where: {
          user_id: userId,
          assignment_id: assignmentId,
          deleted_at: null,
        },
      }),
      this.prisma.assignment_submissions.findFirst({
        where: {
          user_id: userId,
          assignment_id: assignmentId,
          deleted_at: null,
        },
        select: {
          assignment_files: true,
          marks: true,
          remarks: true,
          created_at: true,
        },
        orderBy: { id: 'desc' },
      }),
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

  async listAssignments(userId: string, filter: AssignmentFilterInput): Promise<Record<string, unknown>> {
    const current: Record<string, unknown>[] = [];
    const upcoming: Record<string, unknown>[] = [];
    const completed: Record<string, unknown>[] = [];

    if (filter.cohortId) {
      const assignments = await this.getAssignmentsForCohort(filter.cohortId, userId);
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

    // Fetch cohort_students joined with cohorts (separate queries for MongoDB)
    const cohortStudents = await this.prisma.cohort_students.findMany({
      where: {
        user_id: userId,
        deleted_at: null,
      },
      select: {
        cohort_id: true,
      },
    });

    const cohortIds = cohortStudents.map((cs) => cs.cohort_id);

    let cohortRows = cohortIds.length > 0
      ? await this.prisma.cohorts.findMany({
          where: {
            id: { in: cohortIds },
            deleted_at: null,
          },
          select: {
            id: true,
            title: true,
            cohort_id: true,
            start_date: true,
            end_date: true,
            subject_id: true,
          },
        })
      : [];

    if (filter.subjectId) {
      const subjectRow = await this.prisma.subject.findFirst({
        where: {
          id: filter.subjectId,
          deleted_at: null,
        },
        select: {
          id: true,
          master_subject_id: true,
        },
      });

      const masterSubjectId = toStringValue(subjectRow?.master_subject_id).trim();
      const realSubjectId = masterSubjectId || filter.subjectId;

      cohortRows = cohortRows.filter((cohort) => toStringValue(cohort.subject_id) === realSubjectId);
    }

    for (const cohort of cohortRows) {
      const cohortId = cohort.id;
      if (!cohortId) {
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

  async getAssignmentDetails(userId: string, assignmentId: string): Promise<Record<string, unknown> | null> {
    if (!assignmentId) {
      return null;
    }

    const assignment = await this.prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        deleted_at: null,
      },
    });

    if (!assignment) {
      return null;
    }

    return this.toAssignmentData(assignment as unknown as Record<string, unknown>, userId);
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
    userId: string,
    assignmentId: string,
    assignmentTitle: string,
    courseTitle: string,
  ): Promise<void> {
    const student = await this.getUserById(userId);
    if (!student) {
      return;
    }

    const assignment = await this.prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        deleted_at: null,
      },
      select: { created_by: true },
    });

    const instructorId = toStringValue(assignment?.created_by).trim();
    const instructor = instructorId ? await this.getUserById(instructorId) : null;

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

  async submitAssignment(userId: string, input: SubmitAssignmentInput): Promise<Record<string, unknown>> {
    if (!input.assignmentId) {
      return {
        status: 0,
        message: 'Missing Assignment id.',
        data: [],
      };
    }

    const existing = await this.prisma.assignment_submissions.count({
      where: {
        user_id: userId,
        assignment_id: input.assignmentId,
        deleted_at: null,
      },
    });

    if (existing > 0) {
      return {
        status: false,
        message: 'Assignment already submitted',
        data: [],
      };
    }

    const assignment = await this.prisma.assignment.findFirst({
      where: {
        id: input.assignmentId,
        deleted_at: null,
      },
      select: {
        id: true,
        cohort_id: true,
        course_id: true,
        title: true,
      },
    });

    if (!assignment) {
      return {
        status: 0,
        message: 'Missing required fields.',
        data: [],
      };
    }

    const assignmentId = assignment.id;
    const cohortId = assignment.cohort_id;
    const courseId = assignment.course_id;

    if (!assignmentId || !userId) {
      return {
        status: 0,
        message: 'Missing required fields.',
        data: [],
      };
    }

    const files = this.normalizeSubmittedAssignmentFiles(input.answerFiles);
    const now = new Date();

    const created = await this.prisma.assignment_submissions.create({
      data: {
        user_id: userId,
        cohort_id: cohortId || null,
        assignment_id: assignmentId,
        course_id: courseId || null,
        assignment_files: files.length > 0 ? JSON.stringify(files) : null,
        created_by: userId,
        created_at: now,
      },
    });

    if (!created.id) {
      return {
        status: false,
        message: 'Something Went Wrong',
        data: [],
      };
    }

    let courseTitle = '';
    if (courseId) {
      const course = await this.prisma.course.findFirst({
        where: {
          id: courseId,
          deleted_at: null,
        },
        select: { title: true },
      });
      courseTitle = toStringValue(course?.title);
    }

    await this.sendAssignmentSubmissionEmails(
      userId,
      assignmentId,
      toStringValue(assignment.title),
      courseTitle,
    );

    return {
      status: 1,
      message: 'success',
      data: [],
    };
  }

  async toggleSavedAssignment(userId: string, assignmentId: string): Promise<Record<string, unknown>> {
    if (!assignmentId) {
      return {
        status: 'Successfully Saved',
        data: [],
      };
    }

    const existing = await this.prisma.saved_assignments.findFirst({
      where: {
        user_id: userId,
        assignment_id: assignmentId,
        deleted_at: null,
      },
      select: { id: true },
    });

    if (existing) {
      const now = new Date();
      await this.prisma.saved_assignments.update({
        where: { id: existing.id },
        data: {
          deleted_at: now,
          deleted_by: userId,
        },
      });

      return {
        status: 'Successfully Removed from saved Assignments',
        data: [],
      };
    }

    const now = new Date();
    await this.prisma.saved_assignments.create({
      data: {
        user_id: userId,
        assignment_id: assignmentId,
        created_by: userId,
        created_at: now,
      },
    });

    return {
      status: 'Successfully Saved',
      data: [],
    };
  }
}
