import type { PrismaClient } from '@prisma/client';

import { getPrismaClient } from '../data/prisma-client.js';
import { ExamAdminService } from './exam-admin-service.js';
import { ExamCalendarService, type CalendarItem } from './exam-calendar-service.js';
import {
  DAY_MS,
  addDaysYmd,
  allocationPending,
  awaitingMarking,
  batchByDay,
  conductNow,
  istYmd,
  monthlyTrend,
  participation,
  readyToPublish,
  recentActivity,
  reExamNeeds,
  reExamsScheduled,
  statusCounts,
  unpublishedPaperIds,
  type ActivityEvent,
  type ActivityKind,
  type ExamRef,
  type Participation,
  type StatusCounts,
  type TrendRow,
} from './exam-dashboard.js';
import { ExamResultsService } from './exam-results-service.js';
import { papersWithWrittenAnswers } from './written-answers.js';

// Exam → Dashboard (TTII 2026-10-12, Naji's ExamDashboardModule). One read-only
// summary of the whole exam section, built from the same services the pages
// behind each tile use: the Exams list (phase from the IST sitting windows),
// the Result sheets (ready / published, absent, flagged, re-exams), the Exam
// Calendar (the next 30 days) and the written-answer rule that holds publishing
// back. There is no audit log: "Recent activity" is read from the timestamp
// and by-user columns the exam tables already keep.

const UPCOMING_DAYS = 30;
const TREND_MONTHS = 6;
const ACTIVITY_DAYS = 30;
const ACTIVITY_LIMIT = 10;
// The summary reads every exam's result sheet, so repeat views within a
// minute share one build (and concurrent requests share one in-flight build).
const SUMMARY_TTL_MS = 60_000;

export interface ActivityItem {
  kind: ActivityKind;
  at: string;
  actor: string;
  examId: number | null;
  title: string;
  count: number;
}

export interface ExamDashboardSummary {
  generatedAt: string;
  status: StatusCounts;
  reExamsScheduled: number;
  questionBank: { total: number; mcq: number; descriptive: number; other: number; subjects: number; addedLast30Days: number };
  conduct: { openSittings: number; papersInProgress: number };
  allocationPending: ExamRef[];
  awaitingMarking: { papers: number; exams: ExamRef[] };
  readyToPublish: ExamRef[];
  reExamNeeds: { papers: number; students: number; exams: ExamRef[] };
  upcoming: CalendarItem[];
  trend: TrendRow[];
  participation: Participation;
  activity: ActivityItem[];
}

function ms(value: Date | null | undefined): number | null {
  return value instanceof Date && !Number.isNaN(value.getTime()) ? value.getTime() : null;
}

export class ExamDashboardService {
  private readonly now: () => Date;
  private readonly admin: ExamAdminService;
  private readonly results: ExamResultsService;
  private readonly calendar: ExamCalendarService;
  private cached: { at: number; value: Promise<ExamDashboardSummary> } | null = null;

  constructor(
    private readonly prisma: PrismaClient = getPrismaClient(),
    options: { now?: () => Date; admin?: ExamAdminService; results?: ExamResultsService; calendar?: ExamCalendarService } = {},
  ) {
    this.now = options.now ?? (() => new Date());
    this.admin = options.admin ?? new ExamAdminService(prisma, { now: this.now });
    this.results = options.results ?? new ExamResultsService(prisma, { now: this.now });
    this.calendar = options.calendar ?? new ExamCalendarService(prisma, { now: this.now });
  }

  summary(): Promise<ExamDashboardSummary> {
    const nowMs = this.now().getTime();
    if (this.cached && nowMs - this.cached.at < SUMMARY_TTL_MS) return this.cached.value;
    const value = this.build(nowMs);
    const entry = { at: nowMs, value };
    this.cached = entry;
    // A failed build is not cached: the next request tries again.
    value.catch(() => { if (this.cached === entry) this.cached = null; });
    return value;
  }

  private async build(nowMs: number): Promise<ExamDashboardSummary> {
    const today = istYmd(nowMs);
    const [{ rows }, bundles, upcomingItems, questionBank, activityRows] = await Promise.all([
      this.admin.list(),
      this.results.dashboardSheets(),
      this.calendar.range(today, addDaysYmd(today, UPCOMING_DAYS)),
      this.questionBankMix(nowMs),
      this.activityRows(nowMs),
    ]);

    const resultStatusOf = new Map(bundles.map((b) => [b.examId, b.status]));
    const written = await papersWithWrittenAnswers(this.prisma, unpublishedPaperIds(bundles));

    return {
      generatedAt: new Date(nowMs).toISOString(),
      status: statusCounts(rows, resultStatusOf),
      reExamsScheduled: reExamsScheduled(bundles),
      questionBank,
      conduct: conductNow(bundles, nowMs),
      allocationPending: allocationPending(rows),
      awaitingMarking: awaitingMarking(bundles, written),
      readyToPublish: readyToPublish(bundles),
      reExamNeeds: reExamNeeds(bundles),
      // What is still to happen: a sitting that already finished today is history.
      upcoming: upcomingItems.filter((i) => i.status !== 'completed'),
      trend: monthlyTrend(nowMs, TREND_MONTHS, {
        createdMs: activityRows.exams.map((e) => ms(e.created_at)).filter((v): v is number => v !== null),
        heldMs: bundles.flatMap((b) => b.sittings.map((s) => s.openMs)).filter((v): v is number => v !== null),
        publishedMs: activityRows.exams.map((e) => ms(e.result_published_at)).filter((v): v is number => v !== null),
      }),
      participation: participation(bundles, nowMs),
      activity: await this.activity(activityRows, nowMs),
    };
  }

  private async questionBankMix(nowMs: number): Promise<ExamDashboardSummary['questionBank']> {
    const live = { deleted_at: null };
    const [byType, bySubject, added] = await Promise.all([
      this.prisma.question_bank.groupBy({ by: ['q_type'], where: live, _count: { id: true } }),
      this.prisma.question_bank.groupBy({ by: ['subject_id'], where: { ...live, subject_id: { not: null } }, _count: { id: true } }),
      this.prisma.question_bank.count({ where: { ...live, created_at: { gte: new Date(nowMs - ACTIVITY_DAYS * DAY_MS) } } }),
    ]);
    const of = (type: number): number => byType.find((g) => g.q_type === type)?._count.id ?? 0;
    const total = byType.reduce((n, g) => n + g._count.id, 0);
    const mcq = of(0);
    const descriptive = of(1);
    return { total, mcq, descriptive, other: total - mcq - descriptive, subjects: bySubject.length, addedLast30Days: added };
  }

  private async activityRows(nowMs: number) {
    const since = new Date(nowMs - ACTIVITY_DAYS * DAY_MS);
    const [exams, reExams, questions] = await Promise.all([
      this.prisma.exam.findMany({
        where: { deleted_at: null, parent_exam_id: null, is_practice: 0 },
        select: {
          id: true, title: true, created_at: true, created_by: true, published_at: true, published_by: true,
          result_published_at: true, result_published_by: true,
        },
      }),
      this.prisma.exam_re_examinations.findMany({
        where: { created_at: { gte: since } },
        select: { exam_id: true, created_at: true, created_by: true },
      }),
      this.prisma.question_bank.findMany({
        where: { deleted_at: null, created_at: { gte: since } },
        select: { created_at: true, created_by: true },
      }),
    ]);
    return { exams, reExams, questions };
  }

  private async activity(input: Awaited<ReturnType<ExamDashboardService['activityRows']>>, nowMs: number): Promise<ActivityItem[]> {
    const title = (t: string | null, id: number): string => (t ?? '').trim() || `Exam ${id}`;
    const titleOf = new Map(input.exams.map((e) => [e.id, title(e.title, e.id)]));
    const events: ActivityEvent[] = [];
    for (const e of input.exams) {
      const created = ms(e.created_at);
      const published = ms(e.published_at);
      const results = ms(e.result_published_at);
      const base = { examId: e.id, title: title(e.title, e.id), count: 1 };
      if (created !== null) events.push({ kind: 'exam_created', atMs: created, actorId: e.created_by, ...base });
      if (published !== null) events.push({ kind: 'exam_published', atMs: published, actorId: e.published_by, ...base });
      if (results !== null) events.push({ kind: 'results_published', atMs: results, actorId: e.result_published_by, ...base });
    }

    // A re-exam re-opens one SITTING; the feed names the exam it belongs to.
    const sittingIds = [...new Set(input.reExams.map((r) => r.exam_id))];
    const sittings = sittingIds.length > 0
      ? await this.prisma.exam.findMany({ where: { id: { in: sittingIds } }, select: { id: true, parent_exam_id: true, title: true } })
      : [];
    const topOf = new Map(sittings.map((s) => [s.id, s.parent_exam_id ?? s.id]));
    const sittingTitle = new Map(sittings.map((s) => [s.id, title(s.title, s.id)]));
    events.push(...batchByDay('reexam_scheduled', input.reExams.flatMap((r) => {
      const at = ms(r.created_at);
      if (at === null) return [];
      const topId = topOf.get(r.exam_id) ?? r.exam_id;
      return [{ atMs: at, actorId: r.created_by, examId: topId, title: titleOf.get(topId) ?? sittingTitle.get(r.exam_id) ?? `Exam ${topId}` }];
    })));
    events.push(...batchByDay('questions_added', input.questions.flatMap((q) => {
      const at = ms(q.created_at);
      return at === null ? [] : [{ atMs: at, actorId: q.created_by, examId: null, title: '' }];
    })));

    const recent = recentActivity(events, nowMs, ACTIVITY_LIMIT);
    const actorIds = [...new Set(recent.map((e) => e.actorId).filter((v): v is number => v !== null && v > 0))];
    const users = actorIds.length > 0
      ? await this.prisma.users.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } })
      : [];
    const nameOf = new Map(users.map((u) => [u.id, (u.name ?? '').trim()]));
    return recent.map((e) => ({
      kind: e.kind,
      at: new Date(e.atMs).toISOString(),
      actor: (e.actorId !== null ? nameOf.get(e.actorId) : '') || 'Someone',
      examId: e.examId,
      title: e.title,
      count: e.count,
    }));
  }
}
