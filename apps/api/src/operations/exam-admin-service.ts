import type { PrismaClient } from '@prisma/client';

import { examWindowCloseInstant, examWindowOpenInstant, parseDurationMinutes } from '../assessment/assessment-service.js';
import { getPrismaClient } from '../data/prisma-client.js';
import { examPhase, type ExamPhase, type SittingWindow } from './exam-phase.js';
import { linksForExams } from './supplementary-links.js';

// Exams list and View Exam (TTII 2026-10-12, Naji's design). One row per exam
// the admin created — a parent stands for its subject sittings — with every
// course it runs for, its phase from the real IST sitting windows, and the
// counts the list shows. The overview is the one read behind View Exam, which
// did not exist: before, the admin could only open the edit wizard.

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
  instructions: true,
  notify_email: true,
  notify_inapp: true,
  created_at: true,
} as const;

type ExamRow = {
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
  instructions: string | null;
  notify_email: number | null;
  notify_inapp: number | null;
  created_at: Date | null;
};

export interface ExamListRow {
  examId: number;
  examCode: string;
  title: string;
  courses: string[];
  courseIds: number[];
  isPractice: boolean;
  /** TTII 2026-10-16 — created from another exam's results for the students who failed. */
  isSupplementary: boolean;
  /** The exam a supplementary was created from; null otherwise. */
  sourceExamId: number | null;
  phase: ExamPhase;
  fromDate: string;
  toDate: string;
  subjects: number;
  allocated: number;
  submitted: number;
  resultsPublished: boolean;
}

export interface ExamScheduleRow {
  sittingId: number | null;
  subjectTitle: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMin: number;
  totalMarks: number;
  passMarks: number | null;
  questionsPlanned: number;
  questionsAssigned: number;
  submitted: number;
}

export interface ExamOverview extends ExamListRow {
  status: string;
  offerings: string[];
  schedule: ExamScheduleRow[];
  instructions: string;
  notifyEmail: boolean;
  notifyInapp: boolean;
  deletable: { ok: boolean; reason: string };
}

function ymd(value: Date | null | undefined): string {
  return value instanceof Date && !Number.isNaN(value.getTime()) ? value.toISOString().slice(0, 10) : '';
}

function hhmm(value: Date | null | undefined): string {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return '';
  return `${String(value.getUTCHours()).padStart(2, '0')}:${String(value.getUTCMinutes()).padStart(2, '0')}`;
}

function windowOf(row: ExamRow): SittingWindow {
  return {
    openMs: examWindowOpenInstant(row)?.getTime() ?? null,
    closeMs: examWindowCloseInstant(row)?.getTime() ?? null,
  };
}

function isPublished(row: Pick<ExamRow, 'publish_result' | 'result_published_at'>): boolean {
  return row.publish_result === true || row.result_published_at !== null;
}

export class ExamAdminService {
  private readonly now: () => Date;

  constructor(private readonly prisma: PrismaClient = getPrismaClient(), options: { now?: () => Date } = {}) {
    this.now = options.now ?? (() => new Date());
  }

  async list(filters: { courseId?: number } = {}): Promise<{ rows: ExamListRow[] }> {
    const tops = await this.prisma.exam.findMany({
      where: { deleted_at: null, parent_exam_id: null },
      select: examSelect,
      orderBy: { id: 'desc' },
    });
    return { rows: await this.buildRows(tops, filters.courseId) };
  }

  /** List rows for the given top-level exams (one exam for View Exam, all for the list). */
  private async buildRows(allTops: ExamRow[], courseFilter?: number): Promise<ExamListRow[]> {
    let tops = allTops;
    if (tops.length === 0) return [];
    const topIds = tops.map((t) => t.id);

    const courseLinks = await this.prisma.exam_courses.findMany({
      where: { exam_id: { in: topIds } },
      select: { exam_id: true, course_id: true },
    });
    const coursesOf = new Map<number, number[]>();
    for (const t of tops) coursesOf.set(t.id, t.course_id ? [t.course_id] : []);
    for (const l of courseLinks) {
      const list = coursesOf.get(l.exam_id) ?? [];
      if (!list.includes(l.course_id)) list.push(l.course_id);
      coursesOf.set(l.exam_id, list);
    }
    // A course filter matches ANY course the exam runs for, not just the one
    // stored on exam.course_id (multi-course exams were missed before).
    if (courseFilter) {
      tops = tops.filter((t) => (coursesOf.get(t.id) ?? []).includes(courseFilter));
    }
    const ids = tops.map((t) => t.id);
    if (ids.length === 0) return [];

    const [children, schedules, allocations, courseRows, supplementaryLinks] = await Promise.all([
      this.prisma.exam.findMany({ where: { parent_exam_id: { in: ids }, deleted_at: null }, select: examSelect }),
      this.prisma.exam_subjects.findMany({ where: { exam_id: { in: ids } }, select: { exam_id: true, exam_date: true } }),
      this.prisma.exam_student_allocations.groupBy({ by: ['exam_id'], where: { exam_id: { in: ids } }, _count: { user_id: true } }),
      this.prisma.course.findMany({
        where: { id: { in: [...new Set(ids.flatMap((id) => coursesOf.get(id) ?? []))] } },
        select: { id: true, title: true },
      }),
      linksForExams(this.prisma, ids),
    ]);
    const sourceOf = new Map(supplementaryLinks.map((l) => [l.examId, l.sourceExamId]));
    const sittingIds = [...ids, ...children.map((c) => c.id)];
    const submittedGroups = await this.prisma.exam_attempt.groupBy({
      by: ['exam_id'],
      where: { exam_id: { in: sittingIds }, submit_status: true, deleted_at: null },
      _count: { id: true },
    });
    const submittedBy = new Map(submittedGroups.map((g) => [g.exam_id ?? 0, g._count.id]));
    const childrenOf = new Map<number, ExamRow[]>();
    for (const c of children) {
      if (c.parent_exam_id === null) continue;
      const list = childrenOf.get(c.parent_exam_id) ?? [];
      list.push(c);
      childrenOf.set(c.parent_exam_id, list);
    }
    const scheduleDates = new Map<number, string[]>();
    for (const s of schedules) {
      const d = ymd(s.exam_date);
      if (!d) continue;
      scheduleDates.set(s.exam_id, [...(scheduleDates.get(s.exam_id) ?? []), d]);
    }
    const allocatedBy = new Map(allocations.map((a) => [a.exam_id, a._count.user_id]));
    const courseTitle = new Map(courseRows.map((c) => [c.id, (c.title ?? '').trim()]));
    const nowMs = this.now().getTime();

    return tops.map((t): ExamListRow => {
      // Sittings count once the exam is published. A draft has none, except a
      // supplementary exam's, created up front with their students: until it
      // is published its Step 2 schedule (below) is what the admin edits.
      const kids = t.status === 'published' ? childrenOf.get(t.id) ?? [] : [];
      const sittings = kids.length > 0 ? kids : [t];
      const dates = kids.length > 0
        ? kids.flatMap((k) => [ymd(k.from_date), ymd(k.to_date)])
        : (scheduleDates.get(t.id)?.length ? scheduleDates.get(t.id) ?? [] : [ymd(t.from_date), ymd(t.to_date)]);
      const sorted = dates.filter(Boolean).sort();
      const cIds = coursesOf.get(t.id) ?? [];
      return {
        examId: t.id,
        examCode: t.exam_code ?? '',
        title: (t.title ?? '').trim() || `Exam ${t.id}`,
        courses: cIds.map((id) => courseTitle.get(id) ?? '').filter(Boolean),
        courseIds: cIds,
        isPractice: t.is_practice === 1,
        isSupplementary: sourceOf.has(t.id),
        sourceExamId: sourceOf.get(t.id) ?? null,
        phase: examPhase(t.status, sittings.map(windowOf), nowMs),
        fromDate: sorted[0] ?? '',
        toDate: sorted.at(-1) ?? '',
        // A published exam with no subject schedule is one paper; a draft with
        // nothing scheduled yet has none.
        subjects: kids.length > 0
          ? kids.length
          : (scheduleDates.get(t.id)?.length ?? 0) || (t.status === 'published' ? 1 : 0),
        allocated: allocatedBy.get(t.id) ?? 0,
        submitted: sittings.reduce((n, s) => n + (submittedBy.get(s.id) ?? 0), 0),
        resultsPublished: isPublished(t),
      };
    });
  }

  async overview(examId: number): Promise<ExamOverview | null> {
    if (!Number.isInteger(examId) || examId <= 0) return null;
    const self = await this.prisma.exam.findFirst({ where: { id: examId, deleted_at: null }, select: examSelect });
    if (!self) return null;
    const top = self.parent_exam_id
      ? await this.prisma.exam.findFirst({ where: { id: self.parent_exam_id, deleted_at: null }, select: examSelect })
      : self;
    if (!top) return null;

    const [listed] = await this.buildRows([top]);
    if (!listed) return null;

    const [allChildren, schedules, offeringLinks] = await Promise.all([
      this.prisma.exam.findMany({ where: { parent_exam_id: top.id, deleted_at: null }, select: examSelect }),
      this.prisma.exam_subjects.findMany({ where: { exam_id: top.id }, orderBy: [{ position: 'asc' }, { id: 'asc' }] }),
      this.prisma.exam_offerings.findMany({ where: { exam_id: top.id }, select: { offering_id: true } }),
    ]);
    const offerings = offeringLinks.length > 0
      ? await this.prisma.offerings.findMany({ where: { id: { in: offeringLinks.map((o) => o.offering_id) } }, select: { title: true } })
      : [];
    // A draft's sittings are not live yet (only a supplementary exam has any):
    // read its Step 2 schedule and question pool, as for any draft.
    const children = top.status === 'published' ? allChildren : [];

    const components = schedules.length > 0
      ? await this.prisma.exam_subject_components.findMany({
          where: { exam_subject_id: { in: schedules.map((s) => s.id) } },
          select: { exam_subject_id: true, num_questions: true },
        })
      : [];
    const plannedBy = new Map<number, number>();
    for (const c of components) plannedBy.set(c.exam_subject_id, (plannedBy.get(c.exam_subject_id) ?? 0) + (c.num_questions ?? 0));

    // Questions on each sitting once published; on the parent (by the
    // question's subject) while it is still a draft.
    const sittingIds = children.map((c) => c.id);
    const [childQuestionCounts, parentQuestions, submittedGroups] = await Promise.all([
      sittingIds.length > 0
        ? this.prisma.exam_questions.groupBy({ by: ['exam_id'], where: { exam_id: { in: sittingIds }, deleted_at: null }, _count: { id: true } })
        : Promise.resolve([]),
      children.length === 0
        ? this.prisma.exam_questions.findMany({ where: { exam_id: top.id, deleted_at: null }, select: { question_id: true } })
        : Promise.resolve([]),
      this.prisma.exam_attempt.groupBy({
        by: ['exam_id'],
        where: { exam_id: { in: [top.id, ...sittingIds] }, submit_status: true, deleted_at: null },
        _count: { id: true },
      }),
    ]);
    const childQuestions = new Map(childQuestionCounts.map((g) => [g.exam_id ?? 0, g._count.id]));
    const submittedBy = new Map(submittedGroups.map((g) => [g.exam_id ?? 0, g._count.id]));
    const parentSubjectOf = new Map<number, number>();
    if (parentQuestions.length > 0) {
      const bank = await this.prisma.question_bank.findMany({
        where: { id: { in: parentQuestions.map((q) => q.question_id).filter((v): v is number => v !== null) } },
        select: { id: true, subject_id: true },
      });
      for (const b of bank) if (b.subject_id !== null) parentSubjectOf.set(b.id, b.subject_id);
    }
    const parentAssigned = (subjectId: number | null): number =>
      subjectId === null ? 0 : parentQuestions.filter((q) => q.question_id !== null && parentSubjectOf.get(q.question_id) === subjectId).length;

    const childBySchedule = new Map(children.filter((c) => c.exam_subject_id !== null).map((c) => [c.exam_subject_id as number, c]));
    const schedule: ExamScheduleRow[] = schedules.length > 0
      ? schedules.map((s) => {
          const child = childBySchedule.get(s.id);
          return {
            sittingId: child?.id ?? null,
            subjectTitle: (s.subject_title ?? '').trim(),
            date: ymd(child?.from_date ?? s.exam_date),
            startTime: hhmm(child?.from_time ?? s.start_time),
            endTime: hhmm(child?.to_time ?? s.end_time),
            durationMin: s.duration_minutes ?? parseDurationMinutes(child?.duration),
            totalMarks: s.total_marks ?? 0,
            passMarks: s.pass_marks && s.pass_marks > 0 ? s.pass_marks : null,
            questionsPlanned: plannedBy.get(s.id) ?? 0,
            questionsAssigned: child ? childQuestions.get(child.id) ?? 0 : parentAssigned(s.subject_id),
            submitted: child ? submittedBy.get(child.id) ?? 0 : 0,
          };
        })
      : [{
          sittingId: top.id,
          subjectTitle: (top.title ?? '').trim(),
          date: ymd(top.from_date),
          startTime: hhmm(top.from_time),
          endTime: hhmm(top.to_time),
          durationMin: parseDurationMinutes(top.duration),
          totalMarks: top.mark ?? 0,
          passMarks: null,
          questionsPlanned: 0,
          questionsAssigned: parentQuestions.length,
          submitted: submittedBy.get(top.id) ?? 0,
        }];

    // Same guard deleteExam enforces: a paper students have submitted keeps
    // its exam (deleting would strand their results).
    const submittedSittings = [top.id, ...sittingIds].filter((id) => (submittedBy.get(id) ?? 0) > 0).length;
    return {
      ...listed,
      status: top.status ?? 'draft',
      offerings: offerings.map((o) => (o.title ?? '').trim()).filter(Boolean),
      schedule,
      instructions: top.instructions ?? '',
      notifyEmail: (top.notify_email ?? 1) === 1,
      notifyInapp: (top.notify_inapp ?? 1) === 1,
      deletable: submittedSittings > 0
        ? { ok: false, reason: 'Students have submitted this exam, so it cannot be deleted — their results would no longer be reachable.' }
        : { ok: true, reason: '' },
    };
  }
}
