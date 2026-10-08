import type { PrismaClient } from '@prisma/client';

import { examWindowCloseInstant } from '../assessment/assessment-service.js';
import { getPrismaClient } from '../data/prisma-client.js';
import type { EmailProvider } from '../integrations/contracts.js';
import {
  computeExamResults,
  type ExamResultSheet,
  type ResultAttempt,
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
    for (const top of tops) {
      const loaded = await this.load(top);
      const sheet = computeExamResults(loaded.sittings, loaded.students, loaded.attempts);
      rows.push({ ...(await this.header(loaded, sheet)), subjects: loaded.sittings.length, totals: sheet.totals });
    }
    return rows;
  }

  async getExamResults(examId: number): Promise<ExamResultsDetail | null> {
    const top = await this.resolveTop(examId);
    if (!top) return null;
    const loaded = await this.load(top);
    const sheet = computeExamResults(loaded.sittings, loaded.students, loaded.attempts);
    return { ...(await this.header(loaded, sheet)), sheet, sittings: loaded.sittings };
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
    const sheet = computeExamResults(loaded.sittings, loaded.students, loaded.attempts);
    if (!sheet.allSittingsClosed) {
      const lastDate = loaded.sittings.map((s) => s.date).filter(Boolean).sort().at(-1) ?? '';
      return {
        status: 0,
        message: `Results can be published after the last sitting${lastDate ? ` (${lastDate})` : ''} has closed.`,
      };
    }

    const now = this.now();
    await this.prisma.exam.updateMany({
      where: { OR: [{ id: top.id }, { parent_exam_id: top.id }], deleted_at: null },
      data: {
        publish_result: true,
        result_published_at: now,
        result_published_by: actorUserId,
        updated_at: now,
        updated_by: actorUserId,
      },
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
    const children = await this.prisma.exam.findMany({
      where: { parent_exam_id: top.id, deleted_at: null },
      select: examSelect,
      orderBy: [{ from_date: 'asc' }, { from_time: 'asc' }, { id: 'asc' }],
    });
    const sittingRows = children.length > 0 ? children : [top];
    const sittingIds = sittingRows.map((s) => s.id);

    const [scheduleRows, allocations, courseLinks] = await Promise.all([
      children.length > 0
        ? this.prisma.exam_subjects.findMany({
            where: { id: { in: children.map((c) => c.exam_subject_id).filter((v): v is number => v !== null) } },
            select: { id: true, subject_title: true, total_marks: true, pass_marks: true },
          })
        : this.prisma.exam_subjects.findMany({
            where: { exam_id: top.id },
            select: { id: true, subject_title: true, total_marks: true, pass_marks: true },
          }),
      this.prisma.exam_student_allocations.findMany({
        where: { exam_id: { in: [top.id, ...children.map((c) => c.id)] } },
        select: { user_id: true },
      }),
      this.prisma.exam_courses.findMany({ where: { exam_id: top.id }, select: { course_id: true } }),
    ]);

    const scheduleById = new Map(scheduleRows.map((s) => [s.id, s]));
    // A child-less exam has no per-sitting schedule row to read a pass mark
    // from; it can only borrow one when its wizard held exactly one subject.
    const soleSchedule = children.length === 0 && scheduleRows.length === 1 ? scheduleRows[0] : undefined;
    const nowMs = this.now().getTime();
    const sittings: ResultSitting[] = sittingRows.map((row) => {
      const schedule = row.exam_subject_id !== null ? scheduleById.get(row.exam_subject_id) : soleSchedule;
      const closeAt = examWindowCloseInstant(row);
      return {
        examId: row.id,
        subjectTitle: (schedule?.subject_title ?? '').trim() || (row.title ?? '').trim() || `Exam ${row.id}`,
        date: ymd(row.from_date),
        totalMarks: positiveOrNull(row.mark) ?? positiveOrNull(schedule?.total_marks) ?? 0,
        passMarks: positiveOrNull(schedule?.pass_marks),
        closed: closeAt !== null && closeAt.getTime() < nowMs,
      };
    });

    const allocatedIds = [...new Set(allocations.map((a) => a.user_id))];
    const users = allocatedIds.length > 0
      ? await this.prisma.users.findMany({
          // Results are for students: a staff account (role other than 2)
          // allocated to an exam to try it out must not count as absent.
          where: { id: { in: allocatedIds }, deleted_at: null, role_id: STUDENT_ROLE },
          select: { id: true, name: true, student_id: true, user_email: true, email: true },
        })
      : [];
    const students: ResultStudent[] = users
      .map((u) => ({ userId: u.id, name: (u.name ?? '').trim(), studentCode: u.student_id ?? '' }))
      .sort((a, b) => a.name.localeCompare(b.name));
    const studentEmails = new Map(
      users.map((u) => [u.id, (u.user_email ?? '').trim() || (u.email ?? '').trim()]),
    );

    const attemptRows = students.length > 0
      ? await this.prisma.exam_attempt.findMany({
          where: { exam_id: { in: sittingIds }, user_id: { in: students.map((s) => s.userId) }, deleted_at: null },
          select: { id: true, exam_id: true, user_id: true, score: true, question_no: true, skip: true, submit_status: true, start_time: true, end_time: true },
        })
      : [];
    const attempts: ResultAttempt[] = attemptRows
      .filter((a) => a.exam_id !== null && a.user_id !== null)
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
      }));

    const courseIds = [...new Set([...courseLinks.map((c) => c.course_id), ...(top.course_id ? [top.course_id] : [])])];
    const courseRows = courseIds.length > 0
      ? await this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { title: true } })
      : [];

    return {
      top,
      sittingRows,
      sittings,
      students,
      studentEmails,
      attempts,
      courses: courseRows.map((c) => (c.title ?? '').trim()).filter(Boolean),
    };
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
      status: published ? 'published' : sheet.allSittingsClosed ? 'ready' : 'in_progress',
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
