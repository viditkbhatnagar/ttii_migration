import type { PrismaClient } from '@prisma/client';

import { examWindowCloseInstant, parseDurationMinutes } from '../assessment/assessment-service.js';
import {
  findActiveReExamsForExams,
  reExamKey,
  withReExamWindow,
  type ActiveReExam,
} from '../assessment/re-exam-window.js';
import { getPrismaClient } from '../data/prisma-client.js';
import { isExamPaper, lessonQuizIds } from './exam-paper.js';
import { loadDescriptiveGrades, loadDescriptiveProgress, type DescriptiveGrade, type DescriptiveProgress } from './exam-submissions-grading.js';

export type { DescriptiveGrade } from './exam-submissions-grading.js';
import {
  classifySubmission,
  countDraftAnswered,
  evaluationState,
  isPendingStatus,
  isSubmittedStatus,
  resultState,
  timeOfDaySeconds,
  type Activity,
  type AutoSubmitKind,
  type EvaluationState,
  type MissedReason,
  type ResultState,
  type SubmissionAttempt,
  type SubmissionStatus,
} from './exam-submissions.js';

// Exam → Exam Submissions (TTII 2026-10-12). Loads every allocated student on
// every sitting (a child sitting, or a single-sitting exam) in a date range,
// plus one row per active re-exam, and classifies each through the pure
// exam-submissions.ts. Every related table is batch-loaded once and joined in
// memory — no per-row query.

const STUDENT_ROLE = 2;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const DEFAULT_LOOKBACK_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const examSelect = {
  id: true,
  exam_code: true,
  title: true,
  course_id: true,
  parent_exam_id: true,
  exam_subject_id: true,
  status: true,
  is_practice: true,
  mark: true,
  duration: true,
  from_date: true,
  from_time: true,
  to_date: true,
  to_time: true,
  publish_result: true,
  result_published_at: true,
  deleted_at: true,
} as const;

interface ExamRow {
  id: number;
  exam_code: string | null;
  title: string | null;
  course_id: number | null;
  parent_exam_id: number | null;
  exam_subject_id: number | null;
  status: string | null;
  is_practice: number;
  mark: number | null;
  duration: string | null;
  from_date: Date | null;
  from_time: Date | null;
  to_date: Date | null;
  to_time: Date | null;
  publish_result: boolean;
  result_published_at: Date | null;
  deleted_at: Date | null;
}

export interface SubmissionRow {
  key: string;
  type: 'regular' | 'reexam';
  /** 1 for the regular sitting, 2 for its re-exam. */
  attemptNo: number;
  sittingId: number;
  /** The exam the admin created (the parent of a child sitting). */
  examId: number;
  examCode: string;
  examTitle: string;
  subject: string;
  courseIds: number[];
  courses: string[];
  userId: number;
  studentName: string;
  studentCode: string;
  /** IST wall clock of the window this row is judged by. */
  date: string;
  toDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  openAt: string | null;
  closeAt: string | null;
  status: SubmissionStatus;
  autoKind: AutoSubmitKind | null;
  missedReason: MissedReason | null;
  activity: Activity | null;
  attemptId: number | null;
  startedAt: string | null;
  submittedAt: string | null;
  lastSeenAt: string | null;
  deadlineAt: string | null;
  timeTakenSeconds: number | null;
  answered: number | null;
  questionCount: number | null;
  correct: number | null;
  incorrect: number | null;
  score: number | null;
  totalMarks: number | null;
  passMarks: number | null;
  evaluation: EvaluationState;
  descriptiveAnswered: number;
  descriptiveGraded: number;
  /** Sum of graded written-answer marks; NOT part of `score` yet. */
  descriptiveMarks: number;
  resultsPublished: boolean;
  resultPublishedAt: string | null;
  result: ResultState;
  /** When the re-exam was scheduled (re-exam rows), or the governing re-exam (regular rows). */
  reExamScheduledAt: string | null;
}

export interface SubmissionAttemptSummary {
  attemptId: number;
  type: 'regular' | 'reexam';
  createdAt: string | null;
  startedAt: string | null;
  submittedAt: string | null;
  submitted: boolean;
  score: number | null;
}


export interface SubmissionDetail {
  rows: SubmissionRow[];
  attempts: SubmissionAttemptSummary[];
  grades: DescriptiveGrade[];
  studentEmail: string;
  studentPhone: string;
}

export interface SubmissionListQuery {
  from?: string;
  to?: string;
  examId?: number;
  courseId?: number;
}

export interface SubmissionListResult {
  from: string;
  to: string;
  rows: SubmissionRow[];
}

interface AttemptRecord extends SubmissionAttempt {
  examId: number;
  userId: number;
  score: number | null;
  correct: number | null;
  incorrect: number | null;
}

interface Context {
  sittings: ExamRow[];
  topById: Map<number, ExamRow>;
  coursesOf: Map<number, number[]>;
  courseTitle: Map<number, string>;
  scheduleOf: Map<number, { subject: string; totalMarks: number | null; passMarks: number | null }>;
}

function ymd(value: Date | null | undefined): string {
  return value instanceof Date && !Number.isNaN(value.getTime()) ? value.toISOString().slice(0, 10) : '';
}

function hhmm(value: Date | null | undefined): string {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return '';
  return `${String(value.getUTCHours()).padStart(2, '0')}:${String(value.getUTCMinutes()).padStart(2, '0')}`;
}

function iso(value: Date | number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const d = typeof value === 'number' ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function positiveOrNull(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function istToday(nowMs: number): string {
  return new Date(nowMs + IST_OFFSET_MS).toISOString().slice(0, 10);
}

function isPublished(exam: Pick<ExamRow, 'publish_result' | 'result_published_at'> | undefined): boolean {
  return !!exam && (exam.publish_result === true || exam.result_published_at !== null);
}

export class ExamSubmissionsService {
  private readonly now: () => Date;

  constructor(private readonly prisma: PrismaClient = getPrismaClient(), options: { now?: () => Date } = {}) {
    this.now = options.now ?? (() => new Date());
  }

  /**
   * Rows for sittings whose window overlaps [from, to], and re-exams dated in
   * it. `from` defaults to 30 days ago (IST); an empty `to` means no upper
   * bound, so upcoming sittings are included.
   */
  async list(query: SubmissionListQuery = {}): Promise<SubmissionListResult> {
    const nowMs = this.now().getTime();
    const from = query.from && DATE_RE.test(query.from)
      ? query.from
      : istToday(nowMs - DEFAULT_LOOKBACK_DAYS * DAY_MS);
    const to = query.to && DATE_RE.test(query.to) ? query.to : '';
    if (to && to < from) return { from, to, rows: [] };
    const fromDate = new Date(`${from}T00:00:00Z`);
    const toDate = to ? new Date(`${to}T00:00:00Z`) : null;

    const [candidates, reExamsInRange] = await Promise.all([
      this.prisma.exam.findMany({
        where: {
          deleted_at: null,
          is_practice: 0,
          ...(toDate ? { from_date: { lte: toDate } } : { from_date: { not: null } }),
          // A sitting with no closing date stays open, so it is always current.
          OR: [{ to_date: { gte: fromDate } }, { to_date: null }],
        },
        select: examSelect,
      }),
      this.prisma.exam_re_examinations.findMany({
        where: {
          new_date: toDate ? { gte: fromDate, lte: toDate } : { gte: fromDate },
          OR: [{ status: null }, { status: { not: 'cancelled' } }],
        },
        select: { exam_id: true },
      }),
    ]);
    const regularIds = new Set(candidates.map((c) => c.id));
    const extraIds = [...new Set(reExamsInRange.map((r) => r.exam_id))].filter((id) => !regularIds.has(id));
    const extra = extraIds.length > 0
      ? await this.prisma.exam.findMany({ where: { id: { in: extraIds }, deleted_at: null, is_practice: 0 }, select: examSelect })
      : [];

    const ctx = await this.context([...candidates, ...extra]);
    const inRange = (date: string): boolean => date >= from && (!to || date <= to);
    let rows = await this.buildRows(ctx, {
      nowMs,
      regular: (s) => regularIds.has(s.id),
      reExam: (re) => inRange(ymd(re.date)),
    });
    if (query.examId && query.examId > 0) {
      rows = rows.filter((r) => r.examId === query.examId || r.sittingId === query.examId);
    }
    if (query.courseId && query.courseId > 0) {
      rows = rows.filter((r) => r.courseIds.includes(query.courseId as number));
    }
    return { from, to, rows };
  }

  /** Every row (regular + re-exam) for one student on one sitting, with history and grades. */
  async detail(sittingId: number, userId: number): Promise<SubmissionDetail | null> {
    if (!Number.isInteger(sittingId) || sittingId <= 0 || !Number.isInteger(userId) || userId <= 0) return null;
    const sitting = await this.prisma.exam.findFirst({ where: { id: sittingId, deleted_at: null, is_practice: 0 }, select: examSelect });
    if (!sitting) return null;
    const ctx = await this.context([sitting]);
    if (ctx.sittings.length === 0) return null;
    const attempts: AttemptRecord[] = [];
    const rows = await this.buildRows(ctx, {
      nowMs: this.now().getTime(),
      regular: () => true,
      reExam: () => true,
      userId,
      collect: attempts,
    });
    if (rows.length === 0) return null;

    const reExamFloor = rows.find((r) => r.type === 'reexam')?.reExamScheduledAt ?? null;
    const floorMs = reExamFloor ? new Date(reExamFloor).getTime() : null;
    const user = await this.prisma.users.findFirst({ where: { id: userId }, select: { user_email: true, email: true, phone: true } });
    return {
      rows,
      attempts: [...attempts].sort((a, b) => b.id - a.id).map((a) => ({
        attemptId: a.id,
        type: floorMs !== null && (a.createdAt?.getTime() ?? -Infinity) >= floorMs ? 'reexam' : 'regular',
        createdAt: iso(a.createdAt),
        startedAt: iso(a.startTime),
        submittedAt: a.submitted ? iso(a.endTime) : null,
        submitted: a.submitted,
        score: a.submitted ? a.score : null,
      })),
      grades: await loadDescriptiveGrades(this.prisma, attempts.filter((a) => a.submitted).map((a) => a.id)),
      studentEmail: (user?.user_email ?? '').trim() || ((user?.email ?? '').includes('@') ? (user?.email ?? '').trim() : ''),
      studentPhone: (user?.phone ?? '').trim(),
    };
  }

  /** Real sittings among `rows` (parents and unpublished/practice exams dropped) with their exam, courses and schedule. */
  private async context(rows: ExamRow[]): Promise<Context> {
    const ids = rows.map((r) => r.id);
    const childLinks = ids.length > 0
      ? await this.prisma.exam.findMany({ where: { parent_exam_id: { in: ids }, deleted_at: null }, select: { parent_exam_id: true } })
      : [];
    const hasChildren = new Set(childLinks.map((c) => c.parent_exam_id));
    const sittingCandidates = rows.filter((r) => !hasChildren.has(r.id));

    const topIds = [...new Set(sittingCandidates.map((s) => s.parent_exam_id ?? s.id))];
    const parentIds = topIds.filter((id) => !sittingCandidates.some((s) => s.id === id));
    const parents = parentIds.length > 0
      ? await this.prisma.exam.findMany({ where: { id: { in: parentIds }, deleted_at: null }, select: examSelect })
      : [];
    const topById = new Map<number, ExamRow>([
      ...sittingCandidates.filter((s) => s.parent_exam_id === null).map((s) => [s.id, s] as const),
      ...parents.map((p) => [p.id, p] as const),
    ]);
    // Students only ever sit sittings of a published, non-practice exam.
    const sittings = sittingCandidates.filter((s) => {
      const top = topById.get(s.parent_exam_id ?? s.id);
      return !!top && top.status === 'published' && top.is_practice === 0 && top.deleted_at === null;
    });
    const liveTopIds = [...new Set(sittings.map((s) => s.parent_exam_id ?? s.id))];
    const subjectIds = sittings.map((s) => s.exam_subject_id).filter((v): v is number => v !== null);
    const soleTopIds = sittings.filter((s) => s.parent_exam_id === null).map((s) => s.id);

    const [courseLinks, scheduleRows] = await Promise.all([
      liveTopIds.length > 0
        ? this.prisma.exam_courses.findMany({ where: { exam_id: { in: liveTopIds } }, select: { exam_id: true, course_id: true } })
        : Promise.resolve([]),
      subjectIds.length > 0 || soleTopIds.length > 0
        ? this.prisma.exam_subjects.findMany({
            where: { OR: [{ id: { in: subjectIds } }, { exam_id: { in: soleTopIds } }] },
            select: { id: true, exam_id: true, subject_title: true, total_marks: true, pass_marks: true },
          })
        : Promise.resolve([]),
    ]);
    const coursesOf = new Map<number, number[]>();
    for (const id of liveTopIds) {
      const top = topById.get(id);
      coursesOf.set(id, top?.course_id ? [top.course_id] : []);
    }
    for (const l of courseLinks) {
      const list = coursesOf.get(l.exam_id) ?? [];
      if (!list.includes(l.course_id)) coursesOf.set(l.exam_id, [...list, l.course_id]);
    }
    const allCourseIds = [...new Set([...coursesOf.values()].flat())];
    const courseRows = allCourseIds.length > 0
      ? await this.prisma.course.findMany({ where: { id: { in: allCourseIds } }, select: { id: true, title: true } })
      : [];

    const scheduleById = new Map(scheduleRows.map((r) => [r.id, r]));
    const scheduleOf = new Map<number, { subject: string; totalMarks: number | null; passMarks: number | null }>();
    for (const s of sittings) {
      // A child-less exam can only borrow a pass mark when its wizard held exactly one subject.
      const sole = scheduleRows.filter((r) => r.exam_id === s.id);
      const row = s.exam_subject_id !== null ? scheduleById.get(s.exam_subject_id) : sole.length === 1 ? sole[0] : undefined;
      scheduleOf.set(s.id, {
        subject: (row?.subject_title ?? '').trim() || (s.title ?? '').trim() || `Exam ${s.id}`,
        totalMarks: positiveOrNull(s.mark) ?? positiveOrNull(row?.total_marks),
        passMarks: positiveOrNull(row?.pass_marks),
      });
    }

    return {
      sittings,
      topById,
      coursesOf,
      courseTitle: new Map(courseRows.map((c) => [c.id, (c.title ?? '').trim()])),
      scheduleOf,
    };
  }

  private async loadAttempts(sittingIds: number[], userIds: number[]): Promise<AttemptRecord[]> {
    if (sittingIds.length === 0 || userIds.length === 0) return [];
    const where = { exam_id: { in: sittingIds }, user_id: { in: userIds }, deleted_at: null };
    const common = {
      id: true, exam_id: true, user_id: true, question_id: true, question_no: true, skip: true, correct: true, incorrect: true,
      score: true, start_time: true, end_time: true, time_taken: true, created_at: true, last_seen_at: true,
    } as const;
    // The draft (LongText) is only read for papers still open.
    const [submitted, open] = await Promise.all([
      this.prisma.exam_attempt.findMany({ where: { ...where, submit_status: true }, select: common }),
      this.prisma.exam_attempt.findMany({
        where: { ...where, OR: [{ submit_status: false }, { submit_status: null }] },
        select: { ...common, draft_answers: true },
      }),
    ]);
    const quizIds = await lessonQuizIds(this.prisma, sittingIds);
    const rows = [
      ...submitted.map((a) => ({ ...a, submitted: true, draft: null as string | null })),
      ...open.map((a) => ({ ...a, submitted: false, draft: a.draft_answers })),
    ];
    return rows
      .filter((a) => a.exam_id !== null && a.user_id !== null)
      .filter((a) => isExamPaper(a.question_id, quizIds.get(a.exam_id as number)))
      .map((a) => ({
        id: a.id,
        examId: a.exam_id as number,
        userId: a.user_id as number,
        createdAt: a.created_at,
        startTime: a.start_time,
        endTime: a.end_time,
        timeTakenSeconds: timeOfDaySeconds(a.time_taken),
        submitted: a.submitted,
        questionCount: a.question_no ?? 0,
        skipped: a.skip ?? 0,
        draftAnswered: a.submitted ? 0 : countDraftAnswered(a.draft),
        lastSeenAt: a.last_seen_at,
        score: a.score,
        correct: a.correct,
        incorrect: a.incorrect,
      }));
  }

  private async buildRows(
    ctx: Context,
    scope: {
      nowMs: number;
      regular: (sitting: ExamRow) => boolean;
      reExam: (re: ActiveReExam) => boolean;
      userId?: number;
      collect?: AttemptRecord[];
    },
  ): Promise<SubmissionRow[]> {
    const sittingIds = ctx.sittings.map((s) => s.id);
    if (sittingIds.length === 0) return [];
    const allocations = await this.prisma.exam_student_allocations.findMany({
      where: { exam_id: { in: sittingIds }, ...(scope.userId ? { user_id: scope.userId } : {}) },
      select: { exam_id: true, user_id: true },
    });
    const allocatedIds = [...new Set(allocations.map((a) => a.user_id))];
    const [users, activeReExams] = await Promise.all([
      allocatedIds.length > 0
        ? this.prisma.users.findMany({
            where: { id: { in: allocatedIds }, deleted_at: null, role_id: STUDENT_ROLE },
            select: { id: true, name: true, student_id: true },
          })
        : Promise.resolve([]),
      findActiveReExamsForExams(this.prisma, sittingIds),
    ]);
    const userById = new Map(users.map((u) => [u.id, u]));
    const attempts = await this.loadAttempts(sittingIds, users.map((u) => u.id));
    scope.collect?.push(...attempts);
    const attemptsByKey = new Map<string, AttemptRecord[]>();
    for (const a of attempts) {
      const key = reExamKey(a.userId, a.examId);
      attemptsByKey.set(key, [...(attemptsByKey.get(key) ?? []), a]);
    }
    const descriptive = await loadDescriptiveProgress(this.prisma, attempts.filter((a) => a.submitted).map((a) => a.id));
    const sittingById = new Map(ctx.sittings.map((s) => [s.id, s]));

    const rows: SubmissionRow[] = [];
    for (const alloc of allocations) {
      const sitting = sittingById.get(alloc.exam_id);
      const user = userById.get(alloc.user_id);
      if (!sitting || !user) continue;
      const key = reExamKey(user.id, sitting.id);
      const reExam = activeReExams.get(key) ?? null;
      const all = attemptsByKey.get(key) ?? [];
      const floorMs = reExam ? reExam.scheduledAt.getTime() : null;
      const belongs = (a: AttemptRecord): boolean => floorMs !== null && (a.createdAt?.getTime() ?? -Infinity) >= floorMs;

      const common = { ctx, sitting, user, descriptive, nowMs: scope.nowMs };
      let reExamRow: SubmissionRow | null = null;
      if (reExam) {
        reExamRow = this.row({ ...common, attempts: all.filter(belongs), reExam, reExamPending: false });
      }
      if (scope.regular(sitting)) {
        rows.push(this.row({
          ...common,
          attempts: all.filter((a) => !belongs(a)),
          reExam: null,
          governingReExam: reExam,
          reExamPending: reExamRow !== null && isPendingStatus(reExamRow.status),
        }));
      }
      if (reExam && reExamRow && scope.reExam(reExam)) rows.push(reExamRow);
    }
    return rows;
  }

  private row(input: {
    ctx: Context;
    sitting: ExamRow;
    user: { id: number; name: string | null; student_id: string | null };
    descriptive: Map<number, DescriptiveProgress>;
    nowMs: number;
    attempts: AttemptRecord[];
    reExam: ActiveReExam | null;
    governingReExam?: ActiveReExam | null;
    reExamPending: boolean;
  }): SubmissionRow {
    const { ctx, sitting, user, reExam } = input;
    const topId = sitting.parent_exam_id ?? sitting.id;
    const top = ctx.topById.get(topId);
    const schedule = ctx.scheduleOf.get(sitting.id);
    const window = reExam ? withReExamWindow(sitting, reExam) : sitting;
    const c = classifySubmission({ window, attempts: input.attempts, reExamPending: input.reExamPending, nowMs: input.nowMs });
    const paper = c.attempt ? input.attempts.find((a) => a.id === c.attempt?.id) ?? null : null;
    const submitted = isSubmittedStatus(c.status);
    const desc = paper && submitted ? input.descriptive.get(paper.id) : undefined;
    const published = isPublished(top) || isPublished(sitting);
    const score = submitted && paper ? paper.score ?? 0 : null;
    const passMarks = schedule?.passMarks ?? null;
    const courseIds = ctx.coursesOf.get(topId) ?? [];
    const closeAt = examWindowCloseInstant(window);
    const governing = reExam ?? input.governingReExam ?? null;
    return {
      key: `${sitting.id}:${user.id}:${reExam ? `r${reExam.id}` : 'o'}`,
      type: reExam ? 'reexam' : 'regular',
      attemptNo: reExam ? 2 : 1,
      sittingId: sitting.id,
      examId: topId,
      examCode: (top?.exam_code ?? sitting.exam_code ?? '').trim(),
      examTitle: (top?.title ?? sitting.title ?? '').trim() || `Exam ${topId}`,
      subject: schedule?.subject ?? '',
      courseIds,
      courses: courseIds.map((id) => ctx.courseTitle.get(id) ?? '').filter(Boolean),
      userId: user.id,
      studentName: (user.name ?? '').trim(),
      studentCode: (user.student_id ?? '').trim(),
      date: ymd(window.from_date),
      toDate: ymd(window.to_date) || ymd(window.from_date),
      startTime: hhmm(window.from_time),
      endTime: hhmm(window.to_time),
      durationMinutes: parseDurationMinutes(sitting.duration),
      openAt: iso(c.openMs),
      closeAt: iso(closeAt),
      status: c.status,
      autoKind: c.autoKind,
      missedReason: c.missedReason,
      activity: c.activity,
      attemptId: paper?.id ?? null,
      startedAt: iso(paper?.startTime),
      submittedAt: submitted ? iso(paper?.endTime) : null,
      lastSeenAt: iso(paper?.lastSeenAt),
      deadlineAt: iso(c.deadlineMs),
      timeTakenSeconds: submitted ? paper?.timeTakenSeconds ?? null : null,
      answered: c.answered,
      questionCount: c.questionCount,
      correct: submitted ? paper?.correct ?? null : null,
      incorrect: submitted ? paper?.incorrect ?? null : null,
      score,
      totalMarks: schedule?.totalMarks ?? null,
      passMarks,
      evaluation: evaluationState(c.status, desc?.answered ?? 0, desc?.graded ?? 0),
      descriptiveAnswered: desc?.answered ?? 0,
      descriptiveGraded: desc?.graded ?? 0,
      descriptiveMarks: Math.round((desc?.marks ?? 0) * 100) / 100,
      resultsPublished: published,
      resultPublishedAt: iso(top?.result_published_at ?? sitting.result_published_at),
      result: resultState(c.status, score, passMarks, published),
      reExamScheduledAt: iso(governing?.scheduledAt),
    };
  }
}
