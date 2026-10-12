import type { PrismaClient } from '@prisma/client';

import { AUTO_SUBMIT_GRACE_MS, examWindowCloseInstant, examWindowOpenInstant } from '../assessment/assessment-service.js';
import { findActiveReExamsForExams, withReExamWindow } from '../assessment/re-exam-window.js';
import { isExamPaper, lessonQuizIds } from './exam-paper.js';
import { papersWithWrittenAnswers } from './written-answers.js';
import { getPrismaClient } from '../data/prisma-client.js';
import type { EmailProvider } from '../integrations/contracts.js';
import {
  computeExamResults,
  type ExamResultSheet,
  type ResultAttempt,
  type ResultReExam,
  type ResultSitting,
  type ResultStudent,
} from './exam-results.js';

// Exam → Result (TTII 2026-10-08). Loads one exam's sittings, students and
// attempts, hands them to computeExamResults, and owns the ONE publish action.
//
// Publishing used to have two live paths that wrote different columns and only
// one of which emailed: the Exams table's row action (publish_result, cascaded,
// silent, no confirm) and Evaluation's button (result_published_at on a single
// sitting, emailing a link to a page that does not exist). Both routes now come
// here: the whole exam is published at once — every sitting, both columns — and
// each student is emailed once.

const STUDENT_ROLE = 2;

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
  result_published_by: true,
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
  result_published_by: number | null;
}

export type ExamResultsStatus = 'in_progress' | 'ready' | 'published';

export interface ExamResultsHeader {
  examId: number;
  examCode: string;
  title: string;
  courses: string[];
  fromDate: string;
  toDate: string;
  status: ExamResultsStatus;
  publishedAt: string | null;
  publishedBy: string | null;
}

export interface ExamResultsListRow extends ExamResultsHeader {
  subjects: number;
  totals: ExamResultSheet['totals'];
}

export interface ExamResultsDetail extends ExamResultsHeader {
  sheet: ExamResultSheet;
  sittings: ResultSitting[];
  /** Submitted papers holding written answers not yet marked; publishing waits for them. */
  awaitingMarking: number;
}

/** One exam's result sheet for Exam → Dashboard. */
export interface ExamSheetBundle {
  examId: number;
  title: string;
  status: ExamResultsStatus;
  /** Each sitting's IST window as instants (null = no start / never closes). */
  sittings: Array<{ examId: number; openMs: number | null; closeMs: number | null }>;
  sheet: ExamResultSheet;
  /** Allocated students' papers (submitted or not), legacy quiz rows dropped. */
  attempts: ResultAttempt[];
}

export interface PublishOutcome {
  status: 0 | 1;
  message: string;
  notified?: number;
}

function ymd(value: Date | null | undefined): string {
  return value instanceof Date && !Number.isNaN(value.getTime()) ? value.toISOString().slice(0, 10) : '';
}

function positiveOrNull(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function isPublished(exam: Pick<ExamRow, 'publish_result' | 'result_published_at'>): boolean {
  return exam.publish_result === true || exam.result_published_at !== null;
}

function resultStatus(top: ExamRow, sheet: ExamResultSheet): ExamResultsStatus {
  if (isPublished(top)) return 'published';
  return sheet.allSittingsClosed ? 'ready' : 'in_progress';
}

/** HH:MM from a @db.Time column (an IST wall clock read with UTC getters). */
function hhmm(value: Date): string {
  return `${String(value.getUTCHours()).padStart(2, '0')}:${String(value.getUTCMinutes()).padStart(2, '0')}`;
}

function firstName(name: string | null): string {
  return (name ?? '').trim().split(/\s+/)[0] ?? '';
}

interface LoadedExam {
  top: ExamRow;
  sittingRows: ExamRow[];
  sittings: ResultSitting[];
  students: ResultStudent[];
  studentEmails: Map<number, string>;
  attempts: ResultAttempt[];
  reExams: ResultReExam[];
  courses: string[];
}

export class ExamResultsService {
  private emailProvider: EmailProvider | null;
  private readonly now: () => Date;

  constructor(
    private readonly prisma: PrismaClient = getPrismaClient(),
    options: { email?: EmailProvider; now?: () => Date } = {},
  ) {
    this.emailProvider = options.email ?? null;
    this.now = options.now ?? (() => new Date());
  }

  /** Every real exam a result can be produced for: published, not practice, top level. */
  async listExams(): Promise<ExamResultsListRow[]> {
    const tops = await this.prisma.exam.findMany({
      where: { deleted_at: null, status: 'published', is_practice: 0, parent_exam_id: null },
      select: examSelect,
      orderBy: [{ from_date: 'desc' }, { id: 'desc' }],
    });
    const rows: ExamResultsListRow[] = [];
    for (const loaded of await this.loadMany(tops)) {
      const sheet = computeExamResults(loaded.sittings, loaded.students, loaded.attempts, loaded.reExams);
      rows.push({ ...(await this.header(loaded, sheet)), subjects: loaded.sittings.length, totals: sheet.totals });
    }
    return rows;
  }

  /**
   * TTII 2026-10-12 — Exam → Dashboard: the result sheet of every exam the
   * Result list shows, with each sitting's window and the papers behind it,
   * loaded in one batch. Status is the same in_progress / ready / published
   * the Result page shows.
   */
  async dashboardSheets(): Promise<ExamSheetBundle[]> {
    const tops = await this.prisma.exam.findMany({
      where: { deleted_at: null, status: 'published', is_practice: 0, parent_exam_id: null },
      select: examSelect,
    });
    return (await this.loadMany(tops)).map((loaded) => {
      const sheet = computeExamResults(loaded.sittings, loaded.students, loaded.attempts, loaded.reExams);
      return {
        examId: loaded.top.id,
        title: (loaded.top.title ?? '').trim() || `Exam ${loaded.top.id}`,
        status: resultStatus(loaded.top, sheet),
        sittings: loaded.sittingRows.map((row) => ({
          examId: row.id,
          openMs: examWindowOpenInstant(row)?.getTime() ?? null,
          closeMs: examWindowCloseInstant(row)?.getTime() ?? null,
        })),
        sheet,
        attempts: loaded.attempts,
      };
    });
  }

  async getExamResults(examId: number): Promise<ExamResultsDetail | null> {
    const top = await this.resolveTop(examId);
    if (!top) return null;
    const loaded = await this.load(top);
    const sheet = computeExamResults(loaded.sittings, loaded.students, loaded.attempts, loaded.reExams);
    return {
      ...(await this.header(loaded, sheet)),
      sheet,
      sittings: loaded.sittings,
      awaitingMarking: await this.papersAwaitingMarking(loaded),
    };
  }

  /**
   * TTII 2026-10-12 — submitted papers that contain an answered DESCRIPTIVE
   * question. The scorer never marks those (they score 0 until graded), and
   * graded marks are not yet added to exam_attempt.score, so publishing such an
   * exam would hand students an MCQ-only result as final. Until the Evaluation
   * workflow writes the marked total, any such paper holds publishing back.
   * The rule lives in written-answers.ts, shared with Exam → Dashboard.
   */
  private async papersAwaitingMarking(loaded: LoadedExam): Promise<number> {
    const paperIds = loaded.attempts.filter((a) => a.submitted).map((a) => a.attemptId);
    return (await papersWithWrittenAnswers(this.prisma, paperIds)).size;
  }

  async publish(actorUserId: number | null, examId: number): Promise<PublishOutcome> {
    const top = await this.resolveTop(examId);
    if (!top || top.status !== 'published' || top.is_practice === 1) {
      return { status: 0, message: 'Exam not found.' };
    }
    if (isPublished(top)) {
      return { status: 0, message: 'Results for this exam are already published.' };
    }
    const loaded = await this.load(top);
    const sheet = computeExamResults(loaded.sittings, loaded.students, loaded.attempts, loaded.reExams);
    if (!sheet.allSittingsClosed) {
      const lastDate = loaded.sittings.map((s) => s.date).filter(Boolean).sort().at(-1) ?? '';
      return {
        status: 0,
        message: `Results can be published after the last sitting${lastDate ? ` (${lastDate})` : ''} has closed.`,
      };
    }
    const awaiting = await this.papersAwaitingMarking(loaded);
    if (awaiting > 0) {
      return {
        status: 0,
        message: `${awaiting} paper${awaiting === 1 ? ' has' : 's have'} written (descriptive) answers. Marking written answers is not available yet, so these results would be MCQ-only and cannot be published until it is.`,
      };
    }

    const now = this.now();
    const published = {
      publish_result: true,
      result_published_at: now,
      result_published_by: actorUserId,
      updated_at: now,
      updated_by: actorUserId,
    };
    // Claim the exam first, guarded on "not yet published", so a double-click
    // or two admins at once publish (and email) exactly once.
    const claimed = await this.prisma.exam.updateMany({
      where: { id: top.id, publish_result: false, result_published_at: null, deleted_at: null },
      data: published,
    });
    if (claimed.count === 0) {
      return { status: 0, message: 'Results for this exam are already published.' };
    }
    await this.prisma.exam.updateMany({
      where: { parent_exam_id: top.id, deleted_at: null },
      data: published,
    });

    const notified = await this.notifyStudents(loaded);
    const sittings = loaded.sittingRows.length;
    return {
      status: 1,
      message: `Results published for ${sittings} subject sitting${sittings === 1 ? '' : 's'}. ${notified} student${notified === 1 ? '' : 's'} notified by email.`,
      notified,
    };
  }

  /** A sitting id resolves to its exam; results are always per whole exam. */
  private async resolveTop(examId: number): Promise<ExamRow | null> {
    if (!Number.isInteger(examId) || examId <= 0) return null;
    const row = await this.prisma.exam.findFirst({ where: { id: examId, deleted_at: null }, select: examSelect });
    if (!row) return null;
    if (row.parent_exam_id === null) return row;
    return this.prisma.exam.findFirst({ where: { id: row.parent_exam_id, deleted_at: null }, select: examSelect });
  }

  private async load(top: ExamRow): Promise<LoadedExam> {
    const [loaded] = await this.loadMany([top]);
    if (!loaded) throw new Error(`Exam ${top.id} could not be loaded.`);
    return loaded;
  }

  /**
   * Sittings, students, papers and re-exams for many exams in one batch of
   * queries (TTII 2026-10-12): the Result list and Exam → Dashboard read every
   * exam at once, which was one load() — about ten queries — per exam.
   */
  private async loadMany(tops: ExamRow[]): Promise<LoadedExam[]> {
    if (tops.length === 0) return [];
    const topIds = tops.map((t) => t.id);
    const children = await this.prisma.exam.findMany({
      where: { parent_exam_id: { in: topIds }, deleted_at: null },
      select: examSelect,
      orderBy: [{ from_date: 'asc' }, { from_time: 'asc' }, { id: 'asc' }],
    });
    const childrenOf = new Map<number, ExamRow[]>();
    for (const c of children) {
      if (c.parent_exam_id === null) continue;
      childrenOf.set(c.parent_exam_id, [...(childrenOf.get(c.parent_exam_id) ?? []), c]);
    }
    const childlessIds = topIds.filter((id) => !childrenOf.has(id));
    const childSubjectIds = children.map((c) => c.exam_subject_id).filter((v): v is number => v !== null);
    // Every exam row (a top or one of its sittings) → the exam it belongs to.
    const topOf = new Map<number, number>(topIds.map((id) => [id, id]));
    for (const c of children) if (c.parent_exam_id !== null) topOf.set(c.id, c.parent_exam_id);

    const scheduleSelect = { id: true, exam_id: true, subject_title: true, total_marks: true, pass_marks: true } as const;
    const [childSchedules, ownSchedules, allocations, courseLinks] = await Promise.all([
      childSubjectIds.length > 0
        ? this.prisma.exam_subjects.findMany({ where: { id: { in: childSubjectIds } }, select: scheduleSelect })
        : Promise.resolve([]),
      childlessIds.length > 0
        ? this.prisma.exam_subjects.findMany({ where: { exam_id: { in: childlessIds } }, select: scheduleSelect })
        : Promise.resolve([]),
      this.prisma.exam_student_allocations.findMany({
        where: { exam_id: { in: [...topOf.keys()] } },
        select: { exam_id: true, user_id: true },
      }),
      this.prisma.exam_courses.findMany({ where: { exam_id: { in: topIds } }, select: { exam_id: true, course_id: true } }),
    ]);

    const scheduleById = new Map(childSchedules.map((s) => [s.id, s]));
    const ownSchedulesOf = new Map<number, typeof ownSchedules>();
    for (const s of ownSchedules) ownSchedulesOf.set(s.exam_id, [...(ownSchedulesOf.get(s.exam_id) ?? []), s]);
    const allocatedOf = new Map<number, Set<number>>();
    for (const a of allocations) {
      const topId = topOf.get(a.exam_id);
      if (topId === undefined) continue;
      const set = allocatedOf.get(topId) ?? new Set<number>();
      set.add(a.user_id);
      allocatedOf.set(topId, set);
    }

    const allocatedIds = [...new Set(allocations.map((a) => a.user_id))];
    const users = allocatedIds.length > 0
      ? await this.prisma.users.findMany({
          // Results are for students: a staff account (role other than 2)
          // allocated to an exam to try it out must not count as absent.
          where: { id: { in: allocatedIds }, deleted_at: null, role_id: STUDENT_ROLE },
          select: { id: true, name: true, student_id: true, user_email: true, email: true },
        })
      : [];
    const studentEmails = new Map(
      users.map((u) => [u.id, (u.user_email ?? '').trim() || (u.email ?? '').trim()]),
    );

    const sittingRowsOf = new Map(tops.map((t) => [t.id, childrenOf.get(t.id) ?? [t]]));
    const allSittingIds = [...sittingRowsOf.values()].flat().map((s) => s.id);
    const courseIdsAll = [...new Set([
      ...courseLinks.map((c) => c.course_id),
      ...tops.flatMap((t) => (t.course_id ? [t.course_id] : [])),
    ])];
    const [attemptRows, quizIds, activeReExams, courseRows] = await Promise.all([
      users.length > 0
        ? this.prisma.exam_attempt.findMany({
            where: { exam_id: { in: allSittingIds }, user_id: { in: users.map((u) => u.id) }, deleted_at: null },
            select: { id: true, exam_id: true, user_id: true, score: true, question_no: true, skip: true, submit_status: true, start_time: true, end_time: true, created_at: true, question_id: true },
          })
        : Promise.resolve([]),
      // Lesson-quiz attempts share exam_attempt and its id space; keep papers only (exam-paper.ts).
      lessonQuizIds(this.prisma, allSittingIds),
      // The re-exam governing each (student, sitting), with its own window.
      findActiveReExamsForExams(this.prisma, allSittingIds),
      courseIdsAll.length > 0
        ? this.prisma.course.findMany({ where: { id: { in: courseIdsAll } }, select: { id: true, title: true } })
        : Promise.resolve([]),
    ]);
    const courseTitle = new Map(courseRows.map((c) => [c.id, (c.title ?? '').trim()]));
    const nowMs = this.now().getTime();

    return tops.map((top): LoadedExam => {
      const sittingRows = sittingRowsOf.get(top.id) ?? [top];
      const hasChildren = childrenOf.has(top.id);
      const own = ownSchedulesOf.get(top.id) ?? [];
      // A child-less exam has no per-sitting schedule row to read a pass mark
      // from; it can only borrow one when its wizard held exactly one subject.
      const soleSchedule = !hasChildren && own.length === 1 ? own[0] : undefined;
      const sittings: ResultSitting[] = sittingRows.map((row) => {
        const schedule = hasChildren && row.exam_subject_id !== null ? scheduleById.get(row.exam_subject_id) : soleSchedule;
        // A sitting counts as over only once the server's own auto-submit has had
        // its chance: a paper still running at the window close is finalised up
        // to AUTO_SUBMIT_GRACE_MS later, and publishing before then would seal a
        // result ("absent") that the finalised paper then contradicts. A sitting
        // with no closing date has no window to wait for.
        const closeAt = examWindowCloseInstant(row);
        const closed = closeAt === null || closeAt.getTime() + AUTO_SUBMIT_GRACE_MS < nowMs;
        return {
          examId: row.id,
          subjectTitle: (schedule?.subject_title ?? '').trim() || (row.title ?? '').trim() || `Exam ${row.id}`,
          date: ymd(row.from_date),
          totalMarks: positiveOrNull(row.mark) ?? positiveOrNull(schedule?.total_marks) ?? 0,
          passMarks: positiveOrNull(schedule?.pass_marks),
          closed,
        };
      });

      const allocated = allocatedOf.get(top.id) ?? new Set<number>();
      const students: ResultStudent[] = users
        .filter((u) => allocated.has(u.id))
        .map((u) => ({ userId: u.id, name: (u.name ?? '').trim(), studentCode: u.student_id ?? '' }))
        .sort((a, b) => a.name.localeCompare(b.name));
      const sittingIdSet = new Set(sittingRows.map((s) => s.id));
      const attempts: ResultAttempt[] = attemptRows
        .filter((a) => a.exam_id !== null && a.user_id !== null)
        .filter((a) => sittingIdSet.has(a.exam_id as number) && allocated.has(a.user_id as number))
        .filter((a) => isExamPaper(a.question_id, quizIds.get(a.exam_id as number)))
        .map((a) => ({
          attemptId: a.id,
          examId: a.exam_id as number,
          userId: a.user_id as number,
          score: a.score ?? 0,
          questionCount: a.question_no ?? 0,
          skipped: a.skip ?? 0,
          submitted: a.submit_status === true,
          startTime: a.start_time,
          endTime: a.end_time,
          createdAt: a.created_at,
        }));

      const rowById = new Map(sittingRows.map((r) => [r.id, r]));
      const reExams: ResultReExam[] = [];
      for (const re of activeReExams.values()) {
        const row = rowById.get(re.examId);
        if (!row) continue;
        const closeAt = examWindowCloseInstant(withReExamWindow(row, re));
        reExams.push({
          id: re.id,
          examId: re.examId,
          userId: re.userId,
          scheduledAt: re.scheduledAt,
          date: ymd(re.date),
          startTime: hhmm(re.startTime),
          endTime: hhmm(re.endTime),
          closed: closeAt !== null && closeAt.getTime() + AUTO_SUBMIT_GRACE_MS < nowMs,
        });
      }

      const courseIds = [...new Set([
        ...courseLinks.filter((c) => c.exam_id === top.id).map((c) => c.course_id),
        ...(top.course_id ? [top.course_id] : []),
      ])];
      return {
        top,
        sittingRows,
        sittings,
        students,
        studentEmails,
        attempts,
        reExams,
        courses: courseIds.map((id) => courseTitle.get(id) ?? '').filter(Boolean),
      };
    });
  }

  private async header(loaded: LoadedExam, sheet: ExamResultSheet): Promise<ExamResultsHeader> {
    const { top, sittings } = loaded;
    const dates = sittings.map((s) => s.date).filter(Boolean).sort();
    const published = isPublished(top);
    let publishedBy: string | null = null;
    if (published && top.result_published_by) {
      const by = await this.prisma.users.findFirst({ where: { id: top.result_published_by }, select: { name: true } });
      publishedBy = (by?.name ?? '').trim() || null;
    }
    return {
      examId: top.id,
      examCode: top.exam_code ?? '',
      title: (top.title ?? '').trim() || `Exam ${top.id}`,
      courses: loaded.courses,
      fromDate: dates[0] ?? '',
      toDate: dates.at(-1) ?? '',
      status: resultStatus(top, sheet),
      publishedAt: top.result_published_at ? top.result_published_at.toISOString() : null,
      publishedBy,
    };
  }

  private async email(): Promise<EmailProvider> {
    if (!this.emailProvider) {
      const { createIntegrationRegistry } = await import('../integrations/registry.js');
      this.emailProvider = createIntegrationRegistry().email;
    }
    return this.emailProvider;
  }

  /** Best-effort: a failed email never un-publishes a result. */
  private async notifyStudents(loaded: LoadedExam): Promise<number> {
    const { renderExamResultsPublishedEmail, EXAM_EMAIL_SUBJECTS } = await import('../integrations/exam-emails.js');
    const examName = (loaded.top.title ?? '').trim() || 'your examination';
    const provider = await this.email();
    let sent = 0;
    for (const student of loaded.students) {
      const to = loaded.studentEmails.get(student.userId) ?? '';
      // users.email often holds a phone number on legacy rows — never mail it.
      if (!to.includes('@')) continue;
      try {
        await provider.sendEmail({
          to,
          subject: EXAM_EMAIL_SUBJECTS.resultsPublished(examName),
          html: renderExamResultsPublishedEmail({ studentFirstName: firstName(student.name), examName }),
        });
        sent += 1;
      } catch {
        /* best-effort — the result is published either way */
      }
    }
    return sent;
  }
}
