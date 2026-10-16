import type { PrismaClient } from '@prisma/client';

import { examWindowCloseInstant, examWindowOpenInstant } from '../assessment/assessment-service.js';
import { NOT_CANCELLED, withReExamWindow } from '../assessment/re-exam-window.js';
import { getPrismaClient } from '../data/prisma-client.js';
import { examPhase, isNotDraftSitting, type ExamPhase } from './exam-phase.js';
import { supplementaryExamIds } from './supplementary-links.js';

// Exam Calendar (TTII 2026-10-12, Naji's ExamCalendarModule). Everything that
// happens on an exam day, for a date range:
//   - every SITTING (a child sitting, or a single-sitting exam), drawn on every
//     day its window covers — the global calendar filtered on from_date alone,
//     so an exam that began last month was missing and every exam showed only
//     on its first day;
//   - a DRAFT exam's planned subject dates (Step 2 of the wizard), before
//     publishing creates the sittings;
//   - RE-EXAMS, grouped per sitting and window with a student count.
// Practice exams have no date and are left out.

export interface CalendarItem {
  key: string;
  kind: 'sitting' | 'draft' | 'reexam';
  /** The exam the admin created (the parent of a sitting). */
  examId: number;
  title: string;
  subject: string;
  courses: string[];
  courseIds: number[];
  fromDate: string;
  toDate: string;
  startTime: string;
  endTime: string;
  status: ExamPhase;
  students: number;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function ymd(value: Date | null | undefined): string {
  return value instanceof Date && !Number.isNaN(value.getTime()) ? value.toISOString().slice(0, 10) : '';
}

function hhmm(value: Date | null | undefined): string {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return '';
  return `${String(value.getUTCHours()).padStart(2, '0')}:${String(value.getUTCMinutes()).padStart(2, '0')}`;
}

const sittingSelect = {
  id: true,
  title: true,
  parent_exam_id: true,
  exam_subject_id: true,
  status: true,
  is_practice: true,
  duration: true,
  from_date: true,
  from_time: true,
  to_date: true,
  to_time: true,
  course_id: true,
} as const;

export class ExamCalendarService {
  private readonly now: () => Date;

  constructor(private readonly prisma: PrismaClient = getPrismaClient(), options: { now?: () => Date } = {}) {
    this.now = options.now ?? (() => new Date());
  }

  async range(from: string, to: string): Promise<CalendarItem[]> {
    if (!DATE_RE.test(from) || !DATE_RE.test(to) || from > to) return [];
    const fromDate = new Date(`${from}T00:00:00Z`);
    const toDate = new Date(`${to}T00:00:00Z`);
    const nowMs = this.now().getTime();

    // Sittings overlapping the range: starts on/before its end, ends on/after its start.
    const candidates = await this.prisma.exam.findMany({
      where: {
        deleted_at: null,
        is_practice: 0,
        from_date: { lte: toDate },
        OR: [{ to_date: { gte: fromDate } }, { to_date: null }],
      },
      select: sittingSelect,
    });
    const candidateIds = candidates.map((c) => c.id);
    const [childLinks, plannedRows] = await Promise.all([
      candidateIds.length > 0
        ? this.prisma.exam.findMany({ where: { parent_exam_id: { in: candidateIds }, deleted_at: null }, select: { parent_exam_id: true } })
        : Promise.resolve([]),
      this.prisma.exam_subjects.findMany({ where: { exam_date: { gte: fromDate, lte: toDate } } }),
    ]);
    const hasChildren = new Set(childLinks.map((c) => c.parent_exam_id));

    // Draft parents are drawn from their planned subject rows instead.
    const draftParentIds = [...new Set(plannedRows.map((r) => r.exam_id))];
    const draftParents = draftParentIds.length > 0
      ? await this.prisma.exam.findMany({
          where: { id: { in: draftParentIds }, deleted_at: null, is_practice: 0, NOT: { status: 'published' } },
          select: sittingSelect,
        })
      : [];
    const draftParentSet = new Set(draftParents.map((d) => d.id));
    // A supplementary exam's sittings exist (as drafts) before it is published;
    // like any draft it is drawn from its planned subject rows instead.
    const sittings = candidates.filter((c) => !hasChildren.has(c.id) && !draftParentSet.has(c.id) && isNotDraftSitting(c));

    const topIds = [...new Set([...sittings.map((s) => s.parent_exam_id ?? s.id), ...draftParents.map((d) => d.id)])];
    // TTII 2026-10-16 — a supplementary exam's sittings each have their own
    // students, so each item counts its sitting's, not the whole exam's.
    const supplementaryTops = await supplementaryExamIds(this.prisma, topIds);
    const supplementarySittings = supplementaryTops.size > 0
      ? await this.prisma.exam.findMany({
          where: { parent_exam_id: { in: [...supplementaryTops] }, deleted_at: null },
          select: { id: true, exam_subject_id: true },
        })
      : [];
    const sittingOfRow = new Map(supplementarySittings.filter((s) => s.exam_subject_id !== null).map((s) => [s.exam_subject_id as number, s.id]));
    const countIds = [...topIds, ...supplementarySittings.map((s) => s.id)];
    const [tops, scheduleRows, courseLinks, allocations] = await Promise.all([
      topIds.length > 0
        ? this.prisma.exam.findMany({ where: { id: { in: topIds } }, select: { id: true, title: true, status: true, course_id: true } })
        : Promise.resolve([]),
      this.prisma.exam_subjects.findMany({
        where: { id: { in: sittings.map((s) => s.exam_subject_id).filter((v): v is number => v !== null) } },
        select: { id: true, subject_title: true },
      }),
      topIds.length > 0 ? this.prisma.exam_courses.findMany({ where: { exam_id: { in: topIds } }, select: { exam_id: true, course_id: true } }) : Promise.resolve([]),
      countIds.length > 0
        ? this.prisma.exam_student_allocations.groupBy({ by: ['exam_id'], where: { exam_id: { in: countIds } }, _count: { user_id: true } })
        : Promise.resolve([]),
    ]);
    const topById = new Map(tops.map((t) => [t.id, t]));
    const subjectOf = new Map(scheduleRows.map((r) => [r.id, (r.subject_title ?? '').trim()]));
    const coursesOf = new Map<number, number[]>();
    for (const t of tops) coursesOf.set(t.id, t.course_id ? [t.course_id] : []);
    for (const l of courseLinks) {
      const list = coursesOf.get(l.exam_id) ?? [];
      if (!list.includes(l.course_id)) list.push(l.course_id);
      coursesOf.set(l.exam_id, list);
    }
    const courseRows = await this.prisma.course.findMany({
      where: { id: { in: [...new Set([...coursesOf.values()].flat())] } },
      select: { id: true, title: true },
    });
    const courseTitle = new Map(courseRows.map((c) => [c.id, (c.title ?? '').trim()]));
    const allocatedBy = new Map(allocations.map((a) => [a.exam_id, a._count.user_id]));
    const coursesFor = (topId: number): { courses: string[]; courseIds: number[] } => {
      const ids = coursesOf.get(topId) ?? [];
      return { courseIds: ids, courses: ids.map((id) => courseTitle.get(id) ?? '').filter(Boolean) };
    };

    const items: CalendarItem[] = [];
    for (const s of sittings) {
      const topId = s.parent_exam_id ?? s.id;
      const top = topById.get(topId);
      const window = { openMs: examWindowOpenInstant(s)?.getTime() ?? null, closeMs: examWindowCloseInstant(s)?.getTime() ?? null };
      items.push({
        key: `s${s.id}`,
        kind: 'sitting',
        examId: topId,
        title: (top?.title ?? s.title ?? '').trim(),
        subject: s.exam_subject_id !== null ? subjectOf.get(s.exam_subject_id) ?? '' : '',
        ...coursesFor(topId),
        fromDate: ymd(s.from_date),
        toDate: ymd(s.to_date) || ymd(s.from_date),
        startTime: hhmm(s.from_time),
        endTime: hhmm(s.to_time),
        status: examPhase(top?.status ?? s.status, [window], nowMs),
        students: allocatedBy.get(supplementaryTops.has(topId) ? s.id : topId) ?? 0,
      });
    }
    for (const r of plannedRows) {
      if (!draftParentSet.has(r.exam_id)) continue;
      const top = topById.get(r.exam_id);
      items.push({
        key: `d${r.id}`,
        kind: 'draft',
        examId: r.exam_id,
        title: (top?.title ?? '').trim(),
        subject: (r.subject_title ?? '').trim(),
        ...coursesFor(r.exam_id),
        fromDate: ymd(r.exam_date),
        toDate: ymd(r.exam_date),
        startTime: hhmm(r.start_time),
        endTime: hhmm(r.end_time),
        status: 'draft',
        students: allocatedBy.get(supplementaryTops.has(r.exam_id) ? sittingOfRow.get(r.id) ?? 0 : r.exam_id) ?? 0,
      });
    }

    items.push(...(await this.reExamItems(fromDate, toDate, nowMs, coursesFor)));
    return items.sort((a, b) => (a.fromDate + a.startTime).localeCompare(b.fromDate + b.startTime));
  }

  /** Re-exams in range, one item per sitting + window, counting students. */
  private async reExamItems(
    fromDate: Date,
    toDate: Date,
    nowMs: number,
    coursesFor: (topId: number) => { courses: string[]; courseIds: number[] },
  ): Promise<CalendarItem[]> {
    const rows = await this.prisma.exam_re_examinations.findMany({
      where: { new_date: { gte: fromDate, lte: toDate }, ...NOT_CANCELLED },
      select: { id: true, exam_id: true, user_id: true, new_date: true, new_start_time: true, new_end_time: true, created_at: true },
    });
    if (rows.length === 0) return [];
    const sittings = await this.prisma.exam.findMany({
      where: { id: { in: [...new Set(rows.map((r) => r.exam_id))] }, deleted_at: null },
      select: sittingSelect,
    });
    const sittingById = new Map(sittings.map((s) => [s.id, s]));
    const topIds = [...new Set(sittings.map((s) => s.parent_exam_id ?? s.id))];
    const [tops, schedule] = await Promise.all([
      this.prisma.exam.findMany({ where: { id: { in: topIds } }, select: { id: true, title: true } }),
      this.prisma.exam_subjects.findMany({
        where: { id: { in: sittings.map((s) => s.exam_subject_id).filter((v): v is number => v !== null) } },
        select: { id: true, subject_title: true },
      }),
    ]);
    const topTitle = new Map(tops.map((t) => [t.id, (t.title ?? '').trim()]));
    const subjectOf = new Map(schedule.map((r) => [r.id, (r.subject_title ?? '').trim()]));

    const groups = new Map<string, { row: (typeof rows)[number]; students: Set<number> }>();
    for (const r of rows) {
      const key = `${r.exam_id}|${ymd(r.new_date)}|${hhmm(r.new_start_time)}|${hhmm(r.new_end_time)}`;
      const g = groups.get(key) ?? { row: r, students: new Set<number>() };
      g.students.add(r.user_id);
      groups.set(key, g);
    }
    const items: CalendarItem[] = [];
    for (const [key, { row, students }] of groups) {
      const sitting = sittingById.get(row.exam_id);
      if (!sitting || !row.new_date || !row.new_start_time || !row.new_end_time || !row.created_at) continue;
      const topId = sitting.parent_exam_id ?? sitting.id;
      const win = withReExamWindow(sitting, {
        id: row.id, examId: row.exam_id, userId: row.user_id, date: row.new_date,
        startTime: row.new_start_time, endTime: row.new_end_time, scheduledAt: row.created_at,
      });
      items.push({
        key: `r${key}`,
        kind: 'reexam',
        examId: topId,
        title: topTitle.get(topId) ?? '',
        subject: sitting.exam_subject_id !== null ? subjectOf.get(sitting.exam_subject_id) ?? '' : (sitting.title ?? '').trim(),
        ...coursesFor(topId),
        fromDate: ymd(row.new_date),
        toDate: ymd(row.new_date),
        startTime: hhmm(row.new_start_time),
        endTime: hhmm(row.new_end_time),
        status: examPhase('published', [{
          openMs: examWindowOpenInstant(win)?.getTime() ?? null,
          closeMs: examWindowCloseInstant(win)?.getTime() ?? null,
        }], nowMs),
        students: students.size,
      });
    }
    return items;
  }
}
