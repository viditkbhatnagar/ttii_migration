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

// Answer status codes used across this file:
//   1 = correct, 2 = incorrect, 3 = skipped,
//   4 = answered descriptive question awaiting manual grading
//       (Risha UAT 2026-08-06 — see submitExamAttempt).
// exam_answer.answer_status is a NULLABLE BOOLEAN, so "not auto-scored" can
// only be expressed as NULL — the same value a skip carries. Status 4 must map
// to NULL and never to `false`: `false` is the incorrect marker and would make
// every pending descriptive answer read as wrong in the evaluation module. The
// two NULL cases are told apart by answer_submitted — a pending descriptive
// answer has the student's text, a skip has an empty array.
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

/**
 * Normalise anything that can hold a wall-clock time into "HH:MM:SS".
 *
 * Prisma maps a MySQL `@db.Time(0)` column to a JS Date anchored at the UNIX
 * epoch in UTC — 19:30 comes back as `1970-01-01T19:30:00.000Z` — so the time
 * of day has to be read with the UTC getters. The local getters shift it by the
 * process timezone, and stringifying the Date yields a 24-character timestamp
 * that is not a time at all. Two separate call sites in this file fell into
 * exactly that trap (see combineDateAndTime and format12HourTime below), which
 * is why every time value now goes through this one helper.
 *
 * Also tolerates a full ISO string (extracts the time part), "HH:MM" and
 * "HH:MM:SS". Returns null when there is no usable time.
 */
function toTimeOfDayString(value: unknown): string | null {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }

    return `${formatTwoDigits(value.getUTCHours())}:${formatTwoDigits(value.getUTCMinutes())}:${formatTwoDigits(value.getUTCSeconds())}`;
  }

  const raw = toNullableString(value);
  if (!raw) {
    return null;
  }

  // Anchored at the start ("19:30", "19:30:00") or straight after the date
  // separator of a full timestamp ("1970-01-01T19:30:00.000Z", and the
  // space-separated MySQL form). A date with no time part matches nothing.
  const parts = /(?:^|[T ])(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(raw.trim());
  if (!parts) {
    return null;
  }

  const hours = Number.parseInt(parts[1] ?? '', 10);
  const minutes = Number.parseInt(parts[2] ?? '', 10);
  const seconds = parts[3] === undefined ? 0 : Number.parseInt(parts[3], 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) {
    return null;
  }

  if (hours > 23 || minutes > 59 || seconds > 59) {
    return null;
  }

  return `${formatTwoDigits(hours)}:${formatTwoDigits(minutes)}:${formatTwoDigits(seconds)}`;
}

function combineDateAndTime(dateValue: unknown, timeValue: unknown): Date | null {
  let date = toNullableString(dateValue);
  if (dateValue instanceof Date) {
    date = dateValue.toISOString().slice(0, 10);
  } else if (date) {
    // A stringified date can arrive as a full timestamp; keep the calendar part.
    date = /^(\d{4}-\d{2}-\d{2})/.exec(date)?.[1] ?? date;
  }

  if (!date) {
    return null;
  }

  // Risha UAT 2026-08-06 — the time argument used to go through
  // toNullableString, which stringifies the Date Prisma returns for a
  // @db.Time column into a full ISO timestamp. That built
  // "2026-08-10T1970-01-01T19:30:00.000Z" -> Invalid Date -> null, so every
  // caller behaved as if the exam had no start time: the "upcoming" state was
  // unreachable, start_datetime shipped empty, and the "has not started yet"
  // gate never fired (an allocated student could sit a future exam today).
  const time = toTimeOfDayString(timeValue) ?? '00:00:00';

  // ...and the recombination must be pinned to IST. `from_date`/`from_time`
  // hold an IST WALL CLOCK (the admin typed 7:30 PM meaning 7:30 PM in Kochi),
  // but production runs UTC, so `new Date("2026-08-10T19:30:00")` — no offset —
  // would be parsed as 19:30 UTC, i.e. 1 AM IST the NEXT day. That 5h30m skew
  // matters now in a way it never did before: while this helper returned null
  // the window gate was dead code, so activating it with a skew would have
  // locked students out for the whole of their real 19:30–20:45 sitting and
  // opened it at 01:00 AM instead. jobs/exam-reminders.ts::examStartInstant
  // already does this conversion for the reminder emails — same arithmetic.
  const dateParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeParts = /^(\d{2}):(\d{2}):(\d{2})$/.exec(time);
  if (!dateParts || !timeParts) {
    return null;
  }
  const utcMs = Date.UTC(
    Number(dateParts[1]), Number(dateParts[2]) - 1, Number(dateParts[3]),
    Number(timeParts[1]), Number(timeParts[2]), Number(timeParts[3]),
  );
  if (Number.isNaN(utcMs)) {
    return null;
  }
  return new Date(utcMs - IST_OFFSET_MS);
}

// IST is UTC+5:30. Exam date/time columns store an IST wall clock; the server
// runs UTC. Mirrors jobs/exam-reminders.ts.
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

// End of the given calendar day (23:59:59). Exam `to_date` is a DATE column
// with no time, so an exam is open through the end of its closing day.
function endOfDay(dateValue: unknown): Date | null {
  return combineDateAndTime(dateValue, '23:59:59');
}

function format12HourTime(value: unknown): string {
  // Risha UAT 2026-08-06 — this used to take the LAST 8 characters of the
  // stringified value, which on the ISO timestamp a @db.Time Date produces
  // ("1970-01-01T19:30:00.000Z") sliced ":00.000Z" and rendered nothing.
  const timeOnly = toTimeOfDayString(value);
  if (!timeOnly) {
    return '';
  }

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

/** The exam columns the eligibility gate checks and its callers then render. */
interface ExamAttemptGateRow {
  id: number;
  title: string | null;
  duration: string | null;
  mark: number | null;
  from_date: Date | null;
  from_time: Date | null;
  to_date: Date | null;
  status: string | null;
  is_practice: number;
  shuffle_questions: boolean;
}

interface ScoredAttemptSummary {
  correct: number;
  incorrect: number;
  skip: number;
  score: number;
  timeTaken: string;
  // Risha UAT 2026-08-06 — answered descriptive questions, which are never
  // auto-scored. Optional because only the formal-exam path produces them
  // (quiz and practice attempts are MCQ-only), and because the exam_attempt
  // table has no column for it — it is a response-shape detail, not state.
  pendingReview?: number;
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
      exam_code: toStringValue(exam.exam_code),
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
      // Risha UAT 2026-08-06 — the student card's WINDOW column used to derive
      // its label from start_datetime/end_datetime, which for a single-day
      // sitting rendered the useless "10/08/2026 – 10/08/2026" (end_datetime is
      // end-of-CLOSING-DAY, not the exam's own finish time). What a student
      // actually needs is the sitting's clock window, so send it pre-formatted
      // in IST — the values in from_time/to_time are already an IST wall clock,
      // so no conversion is involved and no client can get the zone wrong.
      window_label: (() => {
        const fromLabel = format12HourTime(exam.from_time);
        const toLabel = format12HourTime(exam.to_time);
        if (fromLabel && toLabel) return `${fromLabel} – ${toLabel}`;
        return fromLabel || '';
      })(),
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

    // Risha UAT 2026-08-06 — an exam may reach this student either through its
    // own course_id or through the exam_courses pivot. A child exam built from
    // a subject that two courses share can only carry ONE course_id, so
    // matching on that column alone hid the sitting from every student of the
    // other course. Safe to widen: the allocation check in toExamData/the
    // eligibility gate still decides who may actually sit it.
    const courseIdInt = toNullableIntId(resolvedCourseId);
    const pivotRows = await this.prisma.exam_courses.findMany({
      where: { course_id: courseIdInt ?? 0 },
      select: { exam_id: true },
    });
    const pivotExamIds = [...new Set(pivotRows.map((row) => row.exam_id))];

    const courseMatch: Record<string, unknown>[] = [{ course_id: courseIdInt }];
    if (pivotExamIds.length > 0) {
      courseMatch.push({ id: { in: pivotExamIds } });
    }

    const whereClause: Record<string, unknown> = {
      OR: courseMatch,
      deleted_at: null,
    };

    // Risha UAT 2026-08-06 — these two filters used to set
    // `whereClause.subject_id` / `.lesson_id`, but the exam table has neither
    // column, so any student who actually used the Subject filter got a Prisma
    // validation error instead of a list. Subject now resolves properly: a
    // subject-wise sitting carries exam_subject_id, which points at the
    // exam_subjects row holding the real subject_id.
    if (filter.subjectId) {
      const subjectIdInt = toNullableIntId(filter.subjectId);
      const subjectRows = subjectIdInt
        ? await this.prisma.exam_subjects.findMany({
            where: { subject_id: subjectIdInt },
            select: { id: true },
          })
        : [];
      whereClause.exam_subject_id = { in: subjectRows.map((r) => r.id) };
    }

    // `lessonId` has no equivalent on the exam table at all — an exam is
    // scoped to a course and its subjects, never to a single lesson. Ignored
    // rather than crashing; the caller still gets the course's exams.
    void filter.lessonId;

    const candidateExams = await this.prisma.exam.findMany({
      where: whereClause,
      orderBy: [
        { from_date: 'asc' },
        { from_time: 'asc' },
      ],
    });

    // Risha UAT 2026-08-06 — a wizard exam scheduled subject-wise is only a
    // PARENT: it holds the pooled questions and the allocation, and publishing
    // materialises one child exam per subject sitting. Showing the parent gave
    // the student a single umbrella card with every subject's duration and
    // marks summed (5835 minutes / 167 marks). Students see children only.
    const parentExamIds = await this.findParentExamIds(candidateExams.map((exam) => exam.id));
    const exams = parentExamIds.size === 0
      ? candidateExams
      : candidateExams.filter((exam) => !parentExamIds.has(exam.id));

    const examData = await Promise.all(
      exams.map((exam) => this.toExamData(exam as unknown as Record<string, unknown>, userId)),
    );

    // The list is scoped to one course of this student's, so the course name is
    // constant across it — resolve it once and stamp every exam with it so the
    // student cards can show "exam · course".
    const courseRow = await this.prisma.course.findFirst({
      where: { id: courseIdInt ?? 0 },
      select: { title: true },
    });
    const courseTitle = toStringValue(courseRow?.title);

    // Risha UAT 2026-08-06 — a child exam already knows its subject: it was
    // materialised FROM an exam_subjects row, so read the title straight off
    // that row. The question-derived fallback below stays for legacy and
    // single-sitting exams, but for a child it is both unreliable (it guesses
    // from whichever question happens to come first) and wasted work.
    const examSubjectRowIds = [
      ...new Set(
        exams
          .map((e) => e.exam_subject_id)
          .filter((id): id is number => id !== null && id !== undefined),
      ),
    ];
    const scheduledSubjectRows = examSubjectRowIds.length > 0
      ? await this.prisma.exam_subjects.findMany({
          where: { id: { in: examSubjectRowIds } },
          select: { id: true, subject_title: true },
        })
      : [];
    const scheduledSubjectTitle = new Map(
      scheduledSubjectRows.map((row) => [row.id, toStringValue(row.subject_title).trim()]),
    );
    const directSubjectTitleFor = (examSubjectId: number | null): string => {
      if (examSubjectId === null || examSubjectId === undefined) return '';
      return scheduledSubjectTitle.get(examSubjectId) ?? '';
    };

    // Per-exam subject. The exam table has no subject column, but each exam's
    // questions come from the subject-tagged question_bank, so derive a primary
    // subject for the exam from its questions (batched — 3 queries, not N+1).
    // This powers the subject filter on the student Exams page.
    const examIds = exams
      .filter((e) => directSubjectTitleFor(e.exam_subject_id) === '')
      .map((e) => e.id)
      .filter((id): id is number => id !== null && id !== undefined);
    const examSubjectTitle = new Map<number, string>();
    if (examIds.length > 0) {
      const eqRows = await this.prisma.exam_questions.findMany({
        where: { exam_id: { in: examIds }, deleted_at: null },
        select: { exam_id: true, question_id: true },
      });
      const questionIds = [
        ...new Set(eqRows.map((r) => r.question_id).filter((id): id is number => id !== null && id !== undefined)),
      ];
      const questionRows = questionIds.length > 0
        ? await this.prisma.question_bank.findMany({
            where: { id: { in: questionIds }, deleted_at: null },
            select: { id: true, subject_id: true },
          })
        : [];
      const questionSubject = new Map<number, number>();
      for (const q of questionRows) {
        if (q.subject_id !== null && q.subject_id !== undefined) questionSubject.set(q.id, q.subject_id);
      }
      const subjectIds = [...new Set([...questionSubject.values()])];
      const subjectRows = subjectIds.length > 0
        ? await this.prisma.subject.findMany({
            where: { id: { in: subjectIds } },
            select: { id: true, title: true },
          })
        : [];
      const subjectTitleById = new Map(subjectRows.map((s) => [s.id, toStringValue(s.title)]));
      // First resolvable subject per exam (most exams are single-subject).
      for (const r of eqRows) {
        if (r.exam_id === null || r.exam_id === undefined || examSubjectTitle.has(r.exam_id)) continue;
        const sid = r.question_id !== null && r.question_id !== undefined ? questionSubject.get(r.question_id) : undefined;
        const title = sid !== undefined ? subjectTitleById.get(sid) : undefined;
        if (title) examSubjectTitle.set(r.exam_id, title);
      }
    }

    const now = Date.now();
    const upcomingExams: Record<string, unknown>[] = [];
    const expiredExams: Record<string, unknown>[] = [];

    for (let index = 0; index < exams.length; index += 1) {
      const exam = exams[index];
      const examInfo = examData[index];
      if (!exam || !examInfo) {
        continue;
      }

      const enriched = {
        ...examInfo,
        course_title: courseTitle,
        subject_title: directSubjectTitleFor(exam.exam_subject_id) || (examSubjectTitle.get(exam.id) ?? ''),
      };
      const examDateTime = combineDateAndTime(exam.from_date, exam.from_time);
      if (examDateTime && examDateTime.getTime() > now) {
        upcomingExams.push(enriched);
      } else {
        expiredExams.push(enriched);
      }
    }

    return {
      upcoming_exams: upcomingExams,
      expired_exams: expiredExams,
    };
  }

  /**
   * Risha UAT 2026-08-06 — the ids, out of the given list, that are PARENT
   * exams: a wizard exam whose subject-wise sittings were materialised as
   * child exam rows. Parents are templates, never sittings, so no
   * student-facing read may show one. Batched into a single query: the caller
   * passes every candidate id at once rather than probing per exam.
   */
  private async findParentExamIds(examIds: number[]): Promise<Set<number>> {
    const parentIds = new Set<number>();
    if (examIds.length === 0) {
      return parentIds;
    }

    const childRows = await this.prisma.exam.findMany({
      where: { parent_exam_id: { in: examIds }, deleted_at: null },
      select: { parent_exam_id: true },
    });

    for (const row of childRows) {
      if (row.parent_exam_id !== null && row.parent_exam_id !== undefined) {
        parentIds.add(row.parent_exam_id);
      }
    }

    return parentIds;
  }

  async getExamCalendar(userId: string, courseId?: string): Promise<Record<string, unknown>> {
    const user = await this.getUserById(userId);
    const resolvedCourseId = courseId || toStringValue(user?.course_id);

    if (!resolvedCourseId) {
      return this.getEmptyExamCalendar();
    }

    const candidateExams = await this.prisma.exam.findMany({
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

    // Parents carry the wizard's own (umbrella) dates, which are not sittings —
    // marking those days on the student's calendar invents exams that do not
    // exist. Only the materialised children are real sittings.
    const parentExamIds = await this.findParentExamIds(candidateExams.map((exam) => exam.id));
    const exams = parentExamIds.size === 0
      ? candidateExams
      : candidateExams.filter((exam) => !parentExamIds.has(exam.id));

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

  /**
   * Risha UAT 2026-08-06 — the single eligibility gate for sitting a formal
   * exam. It used to live inline in getExamForTaking only, so the legacy
   * POST /exams/exam_save_start path (the mobile app) could start an attempt on
   * an exam the student was never allocated, before it opened, or a second time
   * after submitting. Both entry points now go through here.
   *
   * Returns the exam row on success so the caller does not re-fetch it.
   */
  private async resolveExamForAttempt(
    userIdInt: number,
    examIdInt: number,
  ): Promise<{ ok: true; exam: ExamAttemptGateRow } | { ok: false; message: string }> {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examIdInt, deleted_at: null },
      select: {
        id: true, title: true, duration: true, mark: true,
        from_date: true, from_time: true, to_date: true, status: true,
        is_practice: true, shuffle_questions: true,
      },
    });
    if (!exam) {
      return { ok: false, message: 'Exam not found.' };
    }
    if (toStringValue(exam.status) !== 'published') {
      return { ok: false, message: 'This exam is not open yet.' };
    }

    // A parent is a template, not a sitting: its duration and marks are the sum
    // of every subject and its window spans them all. The student must open the
    // child exam for the subject they are sitting.
    const parentIds = await this.findParentExamIds([exam.id]);
    if (parentIds.has(exam.id)) {
      return { ok: false, message: 'This exam is scheduled subject-wise. Please open the subject you want to sit.' };
    }

    // Naji 2026-08-01 — a permanent practice section. `exam.is_practice` has
    // existed in the schema (and the wizard has written it) since May, but
    // nothing ever READ it, so a practice exam behaved exactly like a real one:
    // allocation-gated, window-gated, and one attempt only. That makes practice
    // useless — a student gets a single run and can never repeat it.
    //
    // For a practice exam we therefore skip all three gates:
    //   - no allocation: it is open to every enrolled student, permanently
    //   - no date window: "permanent" means always available
    //   - no already-submitted block: retakes are the entire point. The resume
    //     query in getExamForTaking only matches an UNSUBMITTED attempt, so once
    //     a run is submitted the next visit naturally starts a fresh attempt.
    if (toInteger(exam.is_practice) === 1) {
      return { ok: true, exam };
    }

    const allocated = await this.prisma.exam_student_allocations.count({
      where: { exam_id: examIdInt, user_id: userIdInt },
    });
    if (allocated === 0) {
      return { ok: false, message: 'You are not assigned to this exam.' };
    }

    const nowMs = Date.now();
    const start = combineDateAndTime(exam.from_date, exam.from_time);
    const end = endOfDay(exam.to_date);
    if (start && nowMs < start.getTime()) {
      return { ok: false, message: 'This exam has not started yet.' };
    }
    if (end && nowMs > end.getTime()) {
      return { ok: false, message: 'This exam has closed.' };
    }

    const submitted = await this.prisma.exam_attempt.count({
      where: { exam_id: examIdInt, user_id: userIdInt, submit_status: true, deleted_at: null },
    });
    if (submitted > 0) {
      return { ok: false, message: 'You have already submitted this exam.' };
    }

    return { ok: true, exam };
  }

  async startExamAttempt(userId: string, input: StartExamAttemptInput): Promise<{ attemptId: string; questionNo: number }> {
    const userIdInt = toNullableIntId(userId);
    const examIdInt = toNullableIntId(input.examId);
    if (!examIdInt || !userIdInt) {
      return { attemptId: '', questionNo: 0 };
    }

    // A rejected gate returns the same empty shape this method already returns
    // for an unknown exam, so the mobile app degrades the way it always has.
    const gate = await this.resolveExamForAttempt(userIdInt, examIdInt);
    if (!gate.ok) {
      return { attemptId: '', questionNo: 0 };
    }

    return this.createExamAttempt(userId, examIdInt, gate.exam.shuffle_questions === true);
  }

  /**
   * Issue a fresh exam_attempt for an already-eligible student. Callers own the
   * gate (see resolveExamForAttempt).
   *
   * Risha UAT 2026-05-27 — when exam.shuffle_questions is ON, randomize the
   * question order per student. The order is then locked into
   * exam_attempt.question_id as a JSON array, so resuming preserves the same
   * shuffled sequence for the same student.
   */
  private async createExamAttempt(
    userId: string,
    examIdInt: number,
    shuffle: boolean,
  ): Promise<{ attemptId: string; questionNo: number }> {
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
        exam_id: examIdInt,
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

    const gate = await this.resolveExamForAttempt(userIdInt, examIdInt);
    if (!gate.ok) {
      return { status: 0, message: gate.message };
    }
    const exam = gate.exam;

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
      // The gate above already passed, so create the attempt directly rather
      // than re-running it through the public startExamAttempt.
      const started = await this.createExamAttempt(userId, examIdInt, exam.shuffle_questions === true);
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
   * The permanent practice exam offered to every student on the Exams tab
   * (Naji 2026-08-01). Returns the newest published exam flagged is_practice=1
   * that actually has questions — an empty practice exam would drop the student
   * into a blank player. Null when none is configured, so the button hides
   * rather than erroring.
   *
   * Deliberately NOT allocation-scoped: practice is open to every student, and
   * that is what makes it "permanent" rather than something admins must assign
   * per cohort each time.
   */
  async getPracticeExam(userId: string): Promise<Record<string, unknown> | null> {
    if (!toNullableIntId(userId)) return null;

    const exams = await this.prisma.exam.findMany({
      where: { is_practice: 1, status: 'published', deleted_at: null },
      orderBy: { id: 'desc' },
      select: { id: true, title: true, duration: true, mark: true, description: true },
    });
    if (exams.length === 0) return null;

    for (const exam of exams) {
      const questionCount = await this.prisma.exam_questions.count({
        where: { exam_id: exam.id, deleted_at: null },
      });
      if (questionCount === 0) continue;
      return {
        id: idString(exam.id),
        title: toStringValue(exam.title),
        description: toStringValue(exam.description),
        duration: toStringValue(exam.duration),
        mark: exam.mark ?? 0,
        total_questions: questionCount,
      };
    }
    return null;
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
          // Risha UAT 2026-08-06 — q_type 0 = MCQ, 1 = Descriptive. This used
          // to default an unresolvable (or untagged) row to 1, i.e. it turned
          // an ordinary multiple-choice question into a descriptive one the
          // player renders with no options. MCQ is the correct default.
          question_id: qid,
          q_type: row?.q_type ?? 0,
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

    // Risha UAT 2026-08-06 — the exam's own negative-marking configuration.
    // `have_minus_mark`/`minus_mark` have always existed but were read nowhere,
    // so scoring applied a hard-coded -1 to every wrong answer no admin ever
    // asked for (and the wizard defaults a question to +1 mark, so that penalty
    // was 100% of the question). Loaded here with the fields the submission
    // receipt needs, so this stays one round trip, not two.
    const examRow = examId !== null && examId !== undefined
      ? await this.prisma.exam.findFirst({
          where: { id: examId },
          select: { title: true, is_practice: true, have_minus_mark: true, minus_mark: true },
        })
      : null;
    const examHasNegativeMarking = toInteger(examRow?.have_minus_mark) !== 0;
    const examNegativeMark = Math.max(0, toDbNumber(examRow?.minus_mark));

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

    // Fetch correct answers from question_bank. q_type comes along because a
    // descriptive question must never be auto-scored (see the loop below).
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
            q_type: true,
          },
        })
      : [];

    const qbMap = new Map<string, string | null>();
    const qbTypeMap = new Map<string, number>();
    for (const qb of questionBankRows) {
      qbMap.set(idString(qb.id), qb.correct_answers);
      // q_type 0 = MCQ, 1 = Descriptive; an untagged legacy row is an MCQ.
      qbTypeMap.set(idString(qb.id), toInteger(qb.q_type));
    }

    // Delete old answers for this attempt
    await this.prisma.exam_answer.deleteMany({
      where: { attempt_id: attempt.id },
    });

    let correct = 0;
    let incorrect = 0;
    let skip = 0;
    let pendingReview = 0;
    let score = 0;

    const now = new Date();

    for (const eqRow of examQuestions) {
      const questionId = eqRow.question_id;
      // Risha UAT 2026-08-06 — a descriptive answer is free text: there is no
      // key to compare it against, so string-matching it against
      // question_bank.correct_answers scored every one of them wrong (and, with
      // the old hard-coded penalty, took a mark off for writing an answer). It
      // goes to the admin evaluation module (exam_descriptive_grades) instead.
      const isDescriptive = (qbTypeMap.get(questionId) ?? 0) === 1;
      const rawCorrect = toNormalizedStringArray(qbMap.get(questionId));
      const normalizedCorrect = sortedCopy(rawCorrect);

      const hasAnswer = userAnswerMap.has(questionId);
      const rawUserAnswer = userAnswerMap.get(questionId);

      let status = 3;
      let submittedAnswers: string[] = [];

      if (hasAnswer) {
        const answerArray = toNormalizedStringArray(rawUserAnswer);
        if (answerArray.length > 0) {
          // Descriptive text keeps the student's own order; only option ids
          // are sorted, so that a multi-select answer compares set-wise.
          submittedAnswers = isDescriptive ? answerArray : sortedCopy(answerArray);
          if (isDescriptive) {
            status = 4;
          } else {
            status = arraysEqual(submittedAnswers, normalizedCorrect) ? 1 : 2;
          }
        }
      }

      if (status === 1) {
        correct += 1;
        // A stored 0 is a deliberate 0-mark question and must score 0. Only a
        // NULL mark — a legacy row the wizard never wrote — falls back to 4.
        score += eqRow.mark === null || eqRow.mark === undefined ? 4 : toDbNumber(eqRow.mark);
      } else if (status === 2) {
        incorrect += 1;
        // Penalty precedence: the question's own negative_mark, then the exam's
        // configured minus_mark, then NO penalty. Never an invented -1.
        const questionNegativeMark = toDbNumber(eqRow.negative_mark);
        if (questionNegativeMark > 0) {
          score -= questionNegativeMark;
        } else if (examHasNegativeMarking) {
          score -= examNegativeMark;
        }
      } else if (status === 4) {
        // Awaiting manual grading — not correct, not incorrect, no penalty, and
        // no marks until a faculty member grades it.
        pendingReview += 1;
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
      // exam_attempt.score is FLOAT (Risha UAT 2026-08-06), so the fractional
      // total is stored exactly — no rounding to an integer. The 2-decimal
      // clamp only trims IEEE-754 artefacts from summing 0.5-step marks.
      score: Math.round(score * 100) / 100,
      timeTaken: formatDurationFromSeconds(elapsedSeconds),
      pendingReview,
    };

    await this.finalizeExamAttempt(idString(attempt.id), userId, summary);
    await this.sendExamSubmittedEmail(examRow, userId, startedAt, now, summary.timeTaken);
    return summary;
  }

  /**
   * "Exam Submitted Successfully" receipt (Naji 2026-08-01). Best-effort: a mail
   * failure must never make a successful submission look failed to the student,
   * so everything here is inside a catch.
   *
   * Practice exams are skipped — unlimited retakes, not graded, so a receipt per
   * attempt would just be spam.
   */
  private async sendExamSubmittedEmail(
    // The caller already loaded the exam for its negative-marking config, so it
    // is passed in rather than re-fetched (Risha UAT 2026-08-06).
    exam: { title: string | null; is_practice: number } | null,
    userId: string,
    startedAt: Date | null,
    submittedAt: Date,
    timeTaken: string,
  ): Promise<void> {
    try {
      if (!exam || toInteger(exam.is_practice) === 1) return;

      const user = await this.prisma.users.findFirst({
        where: { id: toNullableIntId(userId) ?? -1 },
        select: { name: true, user_email: true, email: true },
      });
      const to = (user?.user_email ?? user?.email ?? '').trim();
      if (!to || !to.includes('@')) return;

      const IST = 'Asia/Kolkata';
      const dLabel = (d: Date | null): string => (d
        ? d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: IST })
        : '');
      const tLabel = (d: Date | null): string => (d
        ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: IST })
        : '');

      const { createIntegrationRegistry } = await import('../integrations/registry.js');
      const { renderExamSubmittedEmail, EXAM_EMAIL_SUBJECTS } = await import('../integrations/exam-emails.js');
      const registry = createIntegrationRegistry();
      const subjectName = toStringValue(exam.title) || 'your exam';

      await registry.email.sendEmail({
        to,
        subject: EXAM_EMAIL_SUBJECTS.submitted(subjectName),
        html: renderExamSubmittedEmail({
          studentFirstName: toStringValue(user?.name).trim().split(/\s+/)[0] ?? '',
          examName: toStringValue(exam.title),
          subjectName,
          examDateLabel: dLabel(submittedAt),
          startTimeLabel: tLabel(startedAt),
          submissionTimeLabel: tLabel(submittedAt),
          timeTakenLabel: timeTaken,
        }),
      });
    } catch {
      /* best-effort — never fail a submission because of email */
    }
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

    // Fetch each cohort's assignments concurrently instead of one cohort at a
    // time (a student is in only a handful of cohorts). Promise.all preserves
    // array order, so bucket ordering is identical to the serial version.
    // Perf 2026-07-04.
    const assignmentsByCohort = await Promise.all(
      cohortRows.map((cohort) =>
        cohort.id
          ? this.getAssignmentsForCohort(idString(cohort.id), userId)
          : Promise.resolve([] as Record<string, unknown>[]),
      ),
    );
    for (const assignments of assignmentsByCohort) {
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
