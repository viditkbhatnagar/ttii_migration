import type { PrismaClient, Prisma } from '@prisma/client';

import { getPrismaClient } from '../data/prisma-client.js';
import { env } from '../env.js';
import { createIntegrationRegistry } from '../integrations/registry.js';
import type { EmailProvider, IntegrationRegistry } from '../integrations/contracts.js';

function toIntId(id: string | number | null | undefined): number {
  if (typeof id === 'number') return id;
  if (!id) return 0;
  const n = parseInt(String(id), 10);
  return Number.isFinite(n) ? n : 0;
}

function toNullableIntId(id: string | number | null | undefined): number | null {
  if (id === null || id === undefined || id === '') return null;
  if (typeof id === 'number') return id;
  const n = parseInt(String(id), 10);
  return Number.isFinite(n) ? n : null;
}

function idString(id: string | number | null | undefined): string {
  if (id === null || id === undefined) return '';
  return String(id);
}

function toIntArray(ids: Array<string | number | null | undefined>): number[] {
  const out: number[] = [];
  for (const id of ids) {
    const n = toNullableIntId(id);
    if (n !== null) out.push(n);
  }
  return out;
}

function timeStringToDate(value: string): Date {
  const seconds = (() => {
    const parts = value.trim().split(':').map((s) => Number.parseInt(s, 10));
    if (parts.some((p) => Number.isNaN(p))) return 0;
    if (parts.length === 3) return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
    if (parts.length === 2) return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
    return parts[0] ?? 0;
  })();
  return new Date(seconds * 1000);
}

function examStatusToBool(status: number): boolean | null {
  if (status === 1) return true;
  if (status === 2) return false;
  return null;
}

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

// End of the given calendar day (23:59:59). Exam `to_date` is a DATE column
// with no time, so an exam is open through the end of its closing day.
function endOfDay(dateValue: unknown): Date | null {
  return combineDateAndTime(dateValue, '23:59:59');
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
        id: toIntId(userId),
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
        id: toIntId(courseId),
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
        user_id: toNullableIntId(userId),
        course_id: toNullableIntId(courseId),
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

    // Count only questions that still resolve to a live question_bank row.
    // A question removed from the bank after being added to the exam leaves a
    // dangling exam_questions link; counting those would wrongly mark a broken
    // exam "available" with questions the student can never actually see.
    const examQuestionRows = await this.prisma.exam_questions.findMany({
      where: { exam_id: toNullableIntId(examId), deleted_at: null },
      select: { question_id: true },
    });
    const questionBankIds = [
      ...new Set(
        examQuestionRows
          .map((row) => row.question_id)
          .filter((id): id is number => id !== null && id !== undefined),
      ),
    ];

    const [questionCount, isAttempted, allocationCount, purchaseStatus] = await Promise.all([
      questionBankIds.length > 0
        ? this.prisma.question_bank.count({ where: { id: { in: questionBankIds }, deleted_at: null } })
        : Promise.resolve(0),
      this.prisma.exam_attempt.count({
        where: {
          exam_id: toNullableIntId(examId),
          user_id: toNullableIntId(userId),
          submit_status: true,
          deleted_at: null,
        },
      }),
      this.prisma.exam_student_allocations.count({
        where: {
          exam_id: toNullableIntId(examId) ?? 0,
          user_id: toNullableIntId(userId) ?? 0,
        },
      }),
      this.userPurchaseStatus(userId, courseId),
    ]);

    // Naji UAT 2026-06-01 — native in-portal exam taking. Derive a single
    // `state` the student UI can switch on, plus the window timestamps it
    // needs to render "starts on"/"closed". These fields are ADDITIVE: the
    // mobile app keeps reading the legacy fields below untouched.
    const isSubmitted = isAttempted > 0;
    const isAllocated = allocationCount > 0;
    const status = toStringValue(exam.status);
    const start = combineDateAndTime(exam.from_date, exam.from_time);
    const end = endOfDay(exam.to_date);
    const nowMs = Date.now();
    let state: 'submitted' | 'available' | 'upcoming' | 'closed';
    if (isSubmitted) {
      state = 'submitted';
    } else if (status !== 'published' || !isAllocated || questionCount === 0) {
      state = 'closed';
    } else if (start && nowMs < start.getTime()) {
      state = 'upcoming';
    } else if (end && nowMs > end.getTime()) {
      state = 'closed';
    } else {
      state = 'available';
    }

    // Ansaba UAT 2026-05-22 — Flutter Exam model types `id` as int.
    // Send the raw int so Map<int,Exam> indexing doesn't crash.
    return {
      id: toNullableIntId(examId) ?? 0,
      title: toStringValue(exam.title),
      description: toStringValue(exam.description),
      total_mark: toDbNumber(exam.mark),
      duration: toStringValue(exam.duration),
      date: formatDateSlash(exam.from_date),
      free: toStringValue(exam.free) === '1' ? 'on' : purchaseStatus,
      questions_count: `${questionCount} Questions`,
      total_questions: questionCount,
      is_attempted: isSubmitted ? 1 : 0,
      // Native exam-taking metadata (web portal).
      status,
      state,
      is_allocated: isAllocated ? 1 : 0,
      is_submitted: isSubmitted ? 1 : 0,
      start_datetime: start ? start.toISOString() : '',
      end_datetime: end ? end.toISOString() : '',
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
      course_id: toNullableIntId(resolvedCourseId),
      deleted_at: null,
    };

    if (filter.subjectId) {
      whereClause.subject_id = toNullableIntId(filter.subjectId);
    }

    if (filter.lessonId) {
      whereClause.lesson_id = toNullableIntId(filter.lessonId);
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
        course_id: toNullableIntId(resolvedCourseId),
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

    // Risha UAT 2026-05-27 — when exam.shuffle_questions is ON, randomize
    // the question order per student. The order is then locked into
    // exam_attempt.question_id as a JSON array, so resuming preserves
    // the same shuffled sequence for the same student.
    const examIdInt = toNullableIntId(input.examId);
    const examRow = examIdInt
      ? await this.prisma.exam.findFirst({
          where: { id: examIdInt, deleted_at: null },
          select: { shuffle_questions: true },
        })
      : null;
    const shuffle = examRow?.shuffle_questions === true;

    const questions = await this.prisma.exam_questions.findMany({
      where: {
        exam_id: examIdInt,
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

    let questionIds = questions
      .map((q) => toStringValue(q.question_id).trim())
      .filter((id) => id !== '');
    if (shuffle && questionIds.length > 1) {
      // Fisher–Yates shuffle. Each student's attempt gets a fresh order;
      // resuming reads it back from exam_attempt.question_id so the
      // same student sees the same order across sessions.
      const arr = questionIds.slice();
      for (let i = arr.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = arr[i] as string;
        arr[i] = arr[j] as string;
        arr[j] = tmp;
      }
      questionIds = arr;
    }

    const now = new Date();

    const created = await this.prisma.exam_attempt.create({
      data: {
        user_id: toNullableIntId(userId),
        exam_id: toNullableIntId(input.examId),
        question_no: questionIds.length,
        question_id: JSON.stringify(questionIds),
        start_time: now,
        submit_status: false,
        created_by: toNullableIntId(userId),
        created_at: now,
      },
    });

    return {
      attemptId: idString(created.id),
      questionNo: questionIds.length,
    };
  }

  /**
   * Naji UAT 2026-06-01 — serve a formal exam for native in-portal taking.
   * Validates the student is allowed to take it (published + assigned +
   * inside the open window + not already submitted), starts or resumes the
   * attempt (so the locked/shuffled question order is preserved), and
   * returns the questions WITHOUT correct answers. Mirrors the quiz player's
   * contract so the frontend can reuse the same UI shape.
   */
  async getExamForTaking(
    userId: string,
    examId: string,
  ): Promise<{ status: number; message?: string; data?: Record<string, unknown> }> {
    const userIdInt = toNullableIntId(userId);
    const examIdInt = toNullableIntId(examId);
    if (!userIdInt || !examIdInt) {
      return { status: 0, message: 'Invalid request.' };
    }

    const exam = await this.prisma.exam.findFirst({
      where: { id: examIdInt, deleted_at: null },
      select: {
        id: true, title: true, duration: true, mark: true,
        from_date: true, from_time: true, to_date: true, status: true,
      },
    });
    if (!exam) {
      return { status: 0, message: 'Exam not found.' };
    }
    if (toStringValue(exam.status) !== 'published') {
      return { status: 0, message: 'This exam is not open yet.' };
    }

    const allocated = await this.prisma.exam_student_allocations.count({
      where: { exam_id: examIdInt, user_id: userIdInt },
    });
    if (allocated === 0) {
      return { status: 0, message: 'You are not assigned to this exam.' };
    }

    const nowMs = Date.now();
    const start = combineDateAndTime(exam.from_date, exam.from_time);
    const end = endOfDay(exam.to_date);
    if (start && nowMs < start.getTime()) {
      return { status: 0, message: 'This exam has not started yet.' };
    }
    if (end && nowMs > end.getTime()) {
      return { status: 0, message: 'This exam has closed.' };
    }

    const submitted = await this.prisma.exam_attempt.count({
      where: { exam_id: examIdInt, user_id: userIdInt, submit_status: true, deleted_at: null },
    });
    if (submitted > 0) {
      return { status: 0, message: 'You have already submitted this exam.' };
    }

    // Resume an in-progress attempt (preserving its locked order). If the
    // resumed attempt's locked questions no longer resolve to live
    // question_bank rows — e.g. an admin edited the exam after the student
    // started — abandon it and start a fresh attempt against the current
    // questions, rather than stranding the student in an empty exam.
    let attempt = await this.prisma.exam_attempt.findFirst({
      where: { exam_id: examIdInt, user_id: userIdInt, submit_status: false, deleted_at: null },
      orderBy: { id: 'desc' },
      select: { id: true, question_id: true },
    });
    let questions = attempt ? await this.buildExamQuestions(attempt.question_id) : [];

    if (attempt && questions.length === 0) {
      await this.prisma.exam_attempt.update({
        where: { id: attempt.id },
        data: { deleted_at: new Date(), updated_at: new Date() },
      });
      attempt = null;
    }

    if (!attempt) {
      const started = await this.startExamAttempt(userId, { examId });
      if (started.attemptId) {
        attempt = await this.prisma.exam_attempt.findFirst({
          where: { id: toIntId(started.attemptId) },
          select: { id: true, question_id: true },
        });
        questions = attempt ? await this.buildExamQuestions(attempt.question_id) : [];
      }
    }

    // No live questions exist for this exam (all deleted, or none added yet).
    if (!attempt || questions.length === 0) {
      return { status: 0, message: 'This exam has no questions available yet. Please contact your institute.' };
    }

    return {
      status: 1,
      data: {
        attempt_id: idString(attempt.id),
        exam_id: idString(exam.id),
        title: toStringValue(exam.title),
        duration: toStringValue(exam.duration),
        total_mark: toDbNumber(exam.mark),
        total_questions: questions.length,
        questions,
      },
    };
  }

  /**
   * Resolve an attempt's locked question_id list to renderable questions
   * (text + options, NO answer keys), dropping any that point at a deleted
   * question_bank row. Order follows the locked/shuffled sequence.
   */
  private async buildExamQuestions(
    questionIdJson: unknown,
  ): Promise<Array<{ question_id: string; q_type: number; question: string; options: string[] }>> {
    const orderedIds = toNormalizedStringArray(questionIdJson)
      .map((id) => id.trim())
      .filter((id) => id !== '');
    const qbIdInts = toIntArray(orderedIds);
    if (qbIdInts.length === 0) {
      return [];
    }

    const qbRows = await this.prisma.question_bank.findMany({
      where: { id: { in: qbIdInts }, deleted_at: null },
      select: { id: true, title: true, q_type: true, number_of_options: true, options: true },
    });
    const qbMap = new Map<string, (typeof qbRows)[number]>();
    for (const row of qbRows) {
      qbMap.set(idString(row.id), row);
    }

    return orderedIds
      .map((qid) => {
        const row = qbMap.get(qid);
        let options: string[] = [];
        if (row?.options) {
          try {
            const parsed: unknown = JSON.parse(row.options);
            if (Array.isArray(parsed)) options = parsed.map((o) => String(o));
          } catch {
            options = [];
          }
        }
        return {
          question_id: qid,
          q_type: row?.q_type ?? 1,
          question: toStringValue(row?.title),
          options,
        };
      })
      .filter((q) => q.question !== '' || q.options.length > 0);
  }

  private async finalizeExamAttempt(
    attemptId: string,
    userId: string,
    scored: ScoredAttemptSummary,
  ): Promise<void> {
    const now = new Date();

    await this.prisma.exam_attempt.update({
      where: { id: toIntId(attemptId) },
      data: {
        end_time: now,
        time_taken: timeStringToDate(scored.timeTaken),
        correct: scored.correct,
        incorrect: scored.incorrect,
        skip: scored.skip,
        score: scored.score,
        submit_status: true,
        updated_by: toNullableIntId(userId),
        updated_at: now,
      },
    });
  }

  async submitExamAttempt(userId: string, input: SubmitAttemptInput): Promise<ScoredAttemptSummary> {
    const attempt = await this.prisma.exam_attempt.findFirst({
      where: {
        id: toIntId(input.attemptId),
        user_id: toNullableIntId(userId),
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
    const questionIdInts = toIntArray(questionIds);

    const userAnswerMap = parseAnswerMap(input.userAnswers);

    // Fetch exam_questions and question_bank separately (no JOIN in MongoDB)
    let examQuestions: Array<{ question_id: string; mark: number | null; negative_mark: number | null }> = [];
    if (questionIdInts.length > 0) {
      const rows = await this.prisma.exam_questions.findMany({
        where: {
          exam_id: examId,
          question_id: { in: questionIdInts },
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
      examQuestions = rows.map((r) => ({
        question_id: idString(r.question_id),
        mark: r.mark,
        negative_mark: r.negative_mark,
      }));
    }

    // Fetch correct answers from question_bank
    const qbIds = toIntArray(examQuestions.map((eq) => eq.question_id));
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
      qbMap.set(idString(qb.id), qb.correct_answers);
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
          user_id: toNullableIntId(userId),
          exam_id: examId,
          attempt_id: attempt.id,
          question_id: toNullableIntId(questionId),
          answer_correct: JSON.stringify(normalizedCorrect),
          answer_submitted: JSON.stringify(submittedAnswers),
          answer_status: examStatusToBool(status),
          created_by: toNullableIntId(userId),
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

    await this.finalizeExamAttempt(idString(attempt.id), userId, summary);
    return summary;
  }

  async startQuizAttempt(userId: string, input: StartQuizAttemptInput): Promise<{ attemptId: string; questionNo: number }> {
    if (!input.examId || !userId) {
      return { attemptId: '', questionNo: 0 };
    }

    const questions = await this.prisma.quiz.findMany({
      where: {
        lesson_file_id: toIntId(input.examId),
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
        user_id: toNullableIntId(userId),
        exam_id: toNullableIntId(input.examId),
        question_no: questionIds.length,
        question_id: JSON.stringify(questionIds),
        start_time: now,
        submit_status: false,
        created_by: toNullableIntId(userId),
        created_at: now,
      },
    });

    return {
      attemptId: idString(created.id),
      questionNo: questionIds.length,
    };
  }

  async submitQuizAttempt(userId: string, input: SubmitAttemptInput): Promise<ScoredAttemptSummary> {
    const attempt = await this.prisma.exam_attempt.findFirst({
      where: {
        id: toIntId(input.attemptId),
        user_id: toNullableIntId(userId),
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
    const questionIdStrs = toNormalizedStringArray(attempt.question_id)
      .map((id) => id.trim())
      .filter((id) => id !== '');
    const questionIds = toIntArray(questionIdStrs);

    const questions =
      questionIds.length > 0 && quizId !== null
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
      const questionIdStr = idString(questionId);
      const questionType = toInteger(question.question_type);

      const correctAnswers =
        questionType === 0
          ? toNormalizedStringArray([question.answer_id])
          : sortedCopy(toNormalizedStringArray(question.answer_ids));

      const hasAnswer = userAnswerMap.has(questionIdStr);
      const rawSubmitted = userAnswerMap.get(questionIdStr);

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
          user_id: toNullableIntId(userId),
          exam_id: quizId,
          attempt_id: attempt.id,
          question_id: questionId,
          answer_correct: JSON.stringify(correctAnswers),
          answer_submitted: JSON.stringify(submittedAnswers),
          answer_status: examStatusToBool(status),
          created_by: toNullableIntId(userId),
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

    await this.finalizeExamAttempt(idString(attempt.id), userId, summary);
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

    let questionRows: Array<{ id: number }> = [];
    let lessonIds: string[] = [];

    if (lessonFileId) {
      questionRows = await this.prisma.quiz.findMany({
        where: {
          lesson_file_id: toIntId(lessonFileId),
          deleted_at: null,
        },
        select: { id: true },
        orderBy: { id: 'asc' },
      });

      const lessonFile = await this.prisma.lesson_files.findFirst({
        where: {
          id: toIntId(lessonFileId),
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
          lesson_id: toIntId(lessonId),
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
        user_id: toNullableIntId(userId),
        lesson_id: JSON.stringify(lessonIds),
        lesson_file_id: lessonFileId || null,
        question_no: questionIds.length,
        question_id: JSON.stringify(questionIds),
        start_time: now,
        submit_status: false,
        created_by: toNullableIntId(userId),
        created_at: now,
      },
    });

    return {
      attemptId: idString(created.id),
      questionNo: questionIds.length,
    };
  }

  async submitPracticeAttempt(userId: string, input: SubmitAttemptInput): Promise<ScoredAttemptSummary> {
    const attempt = await this.prisma.practice_attempt.findFirst({
      where: {
        id: toIntId(input.attemptId),
        user_id: toNullableIntId(userId),
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

    const questionIdStrs = toNormalizedStringArray(attempt.question_id)
      .map((id) => id.trim())
      .filter((id) => id !== '');
    const questionIds = toIntArray(questionIdStrs);

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
      const questionIdStr = idString(questionId);
      const parsedAnswerIds = sortedCopy(toNormalizedStringArray(question.answer_ids));
      const correctAnswers = parsedAnswerIds.length > 0 ? parsedAnswerIds : toNormalizedStringArray([question.answer_id]);

      const hasUserAnswer = userAnswerMap.has(questionIdStr);
      const userAnswer = userAnswerMap.get(questionIdStr);

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
          user_id: toNullableIntId(userId),
          attempt_id: attempt.id,
          question_id: questionId,
          answer_correct: JSON.stringify(sortedCopy(correctAnswers)),
          answer_submitted: JSON.stringify(submittedAnswers),
          answer_status: status,
          created_by: toNullableIntId(userId),
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
        time_taken: timeStringToDate(summary.timeTaken),
        correct,
        incorrect,
        skip,
        score,
        submit_status: true,
        updated_by: toNullableIntId(userId),
        updated_at: now,
      },
    });

    return summary;
  }

  private async getAssignmentsForCohort(cohortId: string, userId: string): Promise<Record<string, unknown>[]> {
    const assignments = await this.prisma.assignment.findMany({
      where: {
        cohort_id: toNullableIntId(cohortId),
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
          user_id: toNullableIntId(userId),
          assignment_id: toNullableIntId(assignmentId),
          deleted_at: null,
        },
      }),
      this.prisma.assignment_submissions.count({
        where: {
          user_id: toNullableIntId(userId),
          assignment_id: toNullableIntId(assignmentId),
          deleted_at: null,
        },
      }),
      this.prisma.assignment_submissions.findFirst({
        where: {
          user_id: toNullableIntId(userId),
          assignment_id: toNullableIntId(assignmentId),
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

    // Ansaba UAT 2026-05-22 — Flutter Assignment model types `id` as int.
    return {
      id: toNullableIntId(assignmentId) ?? 0,
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

    // cohort_students.cohort_id is the stringified cohorts.id (auto-int)
    // for cohort assignments created by the new flows, but legacy rows
    // imported from the PHP LMS used the cohorts.cohort_id text code.
    // Match both shapes so assignments still surface for both populations.
    // Same pattern as content-service.ts:getCohortIdForSubject.
    const cohortStudents = await this.prisma.cohort_students.findMany({
      where: {
        user_id: toNullableIntId(userId),
        deleted_at: null,
      },
      select: {
        cohort_id: true,
      },
    });

    const rawCohortRefs = cohortStudents
      .map((cs) => toStringValue(cs.cohort_id).trim())
      .filter((v) => v !== '');

    const cohortRowIds: number[] = [];
    const cohortTextCodes: string[] = [];
    for (const ref of rawCohortRefs) {
      const n = Number(ref);
      if (Number.isFinite(n) && n > 0 && /^\d+$/.test(ref)) {
        cohortRowIds.push(n);
      } else {
        cohortTextCodes.push(ref);
      }
    }

    const cohortWhereOr: Prisma.cohortsWhereInput[] = [];
    if (cohortRowIds.length > 0) cohortWhereOr.push({ id: { in: cohortRowIds } });
    if (cohortTextCodes.length > 0) cohortWhereOr.push({ cohort_id: { in: cohortTextCodes } });

    let cohortRows = cohortWhereOr.length > 0
      ? await this.prisma.cohorts.findMany({
          where: {
            OR: cohortWhereOr,
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
          id: toIntId(filter.subjectId),
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

      const assignments = await this.getAssignmentsForCohort(idString(cohortId), userId);
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
        id: toIntId(assignmentId),
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
        id: toIntId(assignmentId),
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
        user_id: toNullableIntId(userId),
        assignment_id: toNullableIntId(input.assignmentId),
        deleted_at: null,
      },
    });

    if (existing > 0) {
      return {
        status: 0,
        message: 'Assignment already submitted',
        data: [],
      };
    }

    const assignment = await this.prisma.assignment.findFirst({
      where: {
        id: toIntId(input.assignmentId),
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
        user_id: toNullableIntId(userId),
        cohort_id: cohortId ?? null,
        assignment_id: assignmentId,
        course_id: courseId ?? null,
        assignment_files: files.length > 0 ? JSON.stringify(files) : null,
        created_by: toNullableIntId(userId),
        created_at: now,
      },
    });

    if (!created.id) {
      return {
        status: 0,
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
      idString(assignmentId),
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
        user_id: toNullableIntId(userId),
        assignment_id: toNullableIntId(assignmentId),
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
          deleted_by: toNullableIntId(userId),
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
        user_id: toNullableIntId(userId),
        assignment_id: toNullableIntId(assignmentId),
        created_by: toNullableIntId(userId),
        created_at: now,
      },
    });

    return {
      status: 'Successfully Saved',
      data: [],
    };
  }

  // ─── Native quiz player (Naji 2026-05-05) ─────────────────────────
  // Replaces the iframe-into-legacy-PHP practice player with a React
  // component on the new LMS. Reads questions from the production
  // `quiz` table where `lesson_file_id` links the question to a
  // lesson_files row of attachment_type='quiz'.

  async getStudentQuizForLessonFile(
    userId: string,
    lessonFileId: string,
  ): Promise<{
    status: number;
    message?: string;
    data?: Record<string, unknown>;
  }> {
    const lessonFileIdInt = toNullableIntId(lessonFileId);
    if (!lessonFileIdInt) {
      return { status: 0, message: 'Invalid lesson file id.' };
    }
    const lessonFile = await this.prisma.lesson_files.findFirst({
      where: { id: lessonFileIdInt, deleted_at: null },
      select: { id: true, lesson_id: true, title: true, attachment_type: true, summary: true },
    });
    if (!lessonFile) {
      return { status: 0, message: 'Quiz not found.' };
    }
    // Pull the question rows. Question text + options (JSON array of
    // strings). Correct answers are intentionally NOT returned to the
    // client — they're only used in submit() to score.
    const questions = await this.prisma.quiz.findMany({
      where: { lesson_file_id: lessonFileIdInt, deleted_at: null },
      orderBy: [{ id: 'asc' }],
      select: {
        id: true,
        question: true,
        question_type: true,
        answers: true,
      },
    });
    const sanitized = questions.map((q) => {
      let options: string[] = [];
      try {
        const parsed: unknown = q.answers ? JSON.parse(q.answers) : [];
        if (Array.isArray(parsed)) options = parsed.map((s) => String(s));
      } catch {
        options = [];
      }
      return {
        id: q.id,
        question: toStringValue(q.question),
        question_type: q.question_type ?? 0,
        options,
      };
    });
    return {
      status: 1,
      data: {
        lesson_file_id: lessonFile.id,
        title: toStringValue(lessonFile.title) || 'Quiz',
        description: toStringValue(lessonFile.summary),
        total_questions: sanitized.length,
        questions: sanitized,
      },
    };
  }

  async startStudentQuizAttempt(
    userId: string,
    lessonFileId: string,
  ): Promise<{ status: number; message?: string; data?: Record<string, unknown> }> {
    const userIdInt = toNullableIntId(userId);
    const lessonFileIdInt = toNullableIntId(lessonFileId);
    if (!userIdInt || !lessonFileIdInt) {
      return { status: 0, message: 'Invalid input.' };
    }
    const lessonFile = await this.prisma.lesson_files.findFirst({
      where: { id: lessonFileIdInt, deleted_at: null },
      select: { id: true, lesson_id: true },
    });
    if (!lessonFile) {
      return { status: 0, message: 'Quiz not found.' };
    }
    const total = await this.prisma.quiz.count({
      where: { lesson_file_id: lessonFileIdInt, deleted_at: null },
    });
    const now = new Date();
    // practice_attempt.lesson_id and .question_id are LONGTEXT columns
    // with a CHECK (json_valid(...)) constraint — they must hold JSON,
    // not raw values. Legacy data: lesson_id = '["23"]', question_id =
    // '["10","11","12"]'. Mirror that shape.
    const created = await this.prisma.practice_attempt.create({
      data: {
        user_id: userIdInt,
        lesson_id: lessonFile.lesson_id !== null ? JSON.stringify([String(lessonFile.lesson_id)]) : null,
        lesson_file_id: String(lessonFileIdInt),
        question_no: total,
        start_time: now,
        submit_status: false,
        created_by: userIdInt,
        created_at: now,
        updated_at: now,
      },
    });
    return { status: 1, data: { attempt_id: created.id, started_at: now.toISOString() } };
  }

  async submitStudentQuizAttempt(
    userId: string,
    input: { lessonFileId: string; attemptId: string; answers: Array<{ question_id: number; selected: number | null }> },
  ): Promise<{ status: number; message?: string; data?: Record<string, unknown> }> {
    const userIdInt = toNullableIntId(userId);
    const lessonFileIdInt = toNullableIntId(input.lessonFileId);
    const attemptIdInt = toNullableIntId(input.attemptId);
    if (!userIdInt || !lessonFileIdInt || !attemptIdInt) {
      return { status: 0, message: 'Invalid input.' };
    }
    const attempt = await this.prisma.practice_attempt.findFirst({
      where: { id: attemptIdInt, user_id: userIdInt, deleted_at: null },
      select: { id: true, submit_status: true },
    });
    if (!attempt) return { status: 0, message: 'Attempt not found.' };
    if (attempt.submit_status === true) {
      return { status: 0, message: 'Attempt already submitted.' };
    }

    const questions = await this.prisma.quiz.findMany({
      where: { lesson_file_id: lessonFileIdInt, deleted_at: null },
      select: { id: true, answer_id: true, answer_ids: true },
    });
    const correctByQuestionId = new Map<number, Set<number>>();
    for (const q of questions) {
      const set = new Set<number>();
      // answer_id is 1-indexed; convert to 0-index for client-compat.
      if (q.answer_id !== null && q.answer_id > 0) set.add(q.answer_id - 1);
      if (q.answer_ids) {
        try {
          const parsed: unknown = JSON.parse(q.answer_ids);
          if (Array.isArray(parsed)) {
            for (const v of parsed) {
              const n = Number(v);
              if (Number.isFinite(n) && n >= 0) set.add(n);
            }
          }
        } catch {
          // ignore malformed JSON
        }
      }
      correctByQuestionId.set(q.id, set);
    }

    const answeredById = new Map<number, number | null>();
    for (const a of input.answers) {
      const qid = Number(a.question_id);
      if (Number.isFinite(qid)) {
        answeredById.set(qid, a.selected === null ? null : Number(a.selected));
      }
    }

    let correct = 0;
    let incorrect = 0;
    let skip = 0;
    const review: Array<{ question_id: number; selected: number | null; correct: number[]; isCorrect: boolean | null }> = [];
    for (const q of questions) {
      const selected = answeredById.has(q.id) ? answeredById.get(q.id)! : null;
      const correctSet = correctByQuestionId.get(q.id) ?? new Set<number>();
      let isCorrect: boolean | null = null;
      if (selected === null) {
        skip += 1;
      } else if (correctSet.size === 0) {
        // Question has no key in the DB → ungradable. Don't penalise.
        isCorrect = null;
      } else if (correctSet.has(selected)) {
        correct += 1;
        isCorrect = true;
      } else {
        incorrect += 1;
        isCorrect = false;
      }
      review.push({ question_id: q.id, selected, correct: [...correctSet], isCorrect });
    }
    const total = questions.length;
    const gradable = total - review.filter((r) => r.isCorrect === null && answeredById.get(r.question_id) !== null).length;
    const score = gradable > 0 ? Math.round((correct / gradable) * 100) : 0;

    const now = new Date();
    await this.prisma.practice_attempt.update({
      where: { id: attemptIdInt },
      data: {
        end_time: now,
        correct,
        incorrect,
        skip,
        score,
        submit_status: true,
        updated_at: now,
        updated_by: userIdInt,
        // CHECK (json_valid(question_id)) — must be a JSON array.
        question_id: JSON.stringify(input.answers.map((a) => String(a.question_id))),
      },
    });

    return {
      status: 1,
      data: {
        attempt_id: attemptIdInt,
        total_questions: total,
        correct,
        incorrect,
        skip,
        score,
        review,
      },
    };
  }
}
