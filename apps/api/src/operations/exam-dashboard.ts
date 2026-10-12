import type { ExamPhase } from './exam-phase.js';
import type { ExamResultsStatus, ExamSheetBundle } from './exam-results-service.js';

// Exam → Dashboard, the pure part (TTII 2026-10-12, Naji's ExamDashboardModule).
// Every number the dashboard shows is aggregated here from rows the services
// already produce — the Exams list rows (phase from the real IST windows) and
// the Result sheets — so the rules are tested without a database and the
// dashboard can never disagree with the page a tile links to.

export const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;

/** The IST calendar day of an instant, YYYY-MM-DD. */
export function istYmd(ms: number): string {
  return new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** YYYY-MM-DD plus whole days (calendar arithmetic, no time zone involved). */
export function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + days)).toISOString().slice(0, 10);
}

/** The last `count` IST months as YYYY-MM, oldest first, ending with the current one. */
export function lastMonths(nowMs: number, count: number): string[] {
  const [y, m] = istYmd(nowMs).split('-').map(Number);
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    out.push(new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1 - i, 1)).toISOString().slice(0, 7));
  }
  return out;
}

// ─── Exam status ──────────────────────────────────────────────────────────

export interface DashboardExamRow {
  examId: number;
  title: string;
  isPractice: boolean;
  phase: ExamPhase;
  allocated: number;
  resultsPublished: boolean;
}

export interface StatusCounts {
  total: number;
  draft: number;
  upcoming: number;
  inProgress: number;
  /** Every sitting closed, results not yet published (the Result page's "ready"). */
  ready: number;
  published: number;
}

export type DashboardStatus = 'draft' | 'upcoming' | 'in_progress' | 'ready' | 'published';

/**
 * One bucket per real exam (practice exams left out), so the buckets add up to
 * the total. A completed exam inside the auto-submit grace after its last
 * sitting is not "ready" yet on the Result page, so it stays in progress here.
 */
export function examStatus(row: DashboardExamRow, resultStatus: ExamResultsStatus | undefined): DashboardStatus {
  if (row.phase === 'draft') return 'draft';
  if (row.resultsPublished || resultStatus === 'published') return 'published';
  if (resultStatus === 'ready') return 'ready';
  return row.phase === 'upcoming' ? 'upcoming' : 'in_progress';
}

export function statusCounts(rows: DashboardExamRow[], resultStatusOf: Map<number, ExamResultsStatus>): StatusCounts {
  const counts: StatusCounts = { total: 0, draft: 0, upcoming: 0, inProgress: 0, ready: 0, published: 0 };
  for (const row of rows) {
    if (row.isPractice) continue;
    counts.total += 1;
    const status = examStatus(row, resultStatusOf.get(row.examId));
    if (status === 'in_progress') counts.inProgress += 1;
    else counts[status] += 1;
  }
  return counts;
}

export interface ExamRef {
  examId: number;
  title: string;
  /** What is counted for this exam (papers, students…); 0 when not applicable. */
  count: number;
}

/** Real exams with no student allocated that can still be sat (drafts included). */
export function allocationPending(rows: DashboardExamRow[]): ExamRef[] {
  return rows
    .filter((r) => !r.isPractice && r.allocated === 0 && r.phase !== 'completed')
    .map((r) => ({ examId: r.examId, title: r.title, count: 0 }));
}

// ─── From the Result sheets ───────────────────────────────────────────────

function closedSittings(bundle: ExamSheetBundle): Set<number> {
  return new Set(bundle.sheet.subjects.filter((s) => s.closed).map((s) => s.examId));
}

export interface ReExamNeeds {
  /** (student, subject) papers. */
  papers: number;
  students: number;
  exams: ExamRef[];
}

/**
 * Papers that need a re-exam and have none scheduled: on a closed sitting, the
 * student was absent (a missed re-exam included) or the paper is flagged as a
 * likely technical failure. The same papers Exam → Result pre-ticks in its
 * Schedule Re-exam dialog; a genuine fail is TTII's call and is not counted.
 */
export function reExamNeeds(bundles: ExamSheetBundle[]): ReExamNeeds {
  const students = new Set<number>();
  const exams: ExamRef[] = [];
  let papers = 0;
  for (const b of bundles) {
    const closed = closedSittings(b);
    let count = 0;
    for (const s of b.sheet.students) {
      for (const c of s.sittings) {
        if (!closed.has(c.examId) || c.status === 'reexam') continue;
        if (c.status === 'absent' || c.flag !== null) {
          count += 1;
          students.add(s.userId);
        }
      }
    }
    if (count > 0) exams.push({ examId: b.examId, title: b.title, count });
    papers += count;
  }
  return { papers, students: students.size, exams: exams.sort((a, b) => b.count - a.count) };
}

/** Re-exams scheduled and not yet sat. */
export function reExamsScheduled(bundles: ExamSheetBundle[]): number {
  return bundles.reduce((n, b) => n + b.sheet.students.reduce(
    (m, s) => m + s.sittings.filter((c) => c.status === 'reexam').length, 0), 0);
}

function isOpen(window: { openMs: number | null; closeMs: number | null }, nowMs: number): boolean {
  return (window.openMs === null || window.openMs <= nowMs) && (window.closeMs === null || nowMs <= window.closeMs);
}

/** Sittings whose window is open now, and the papers students have started but not submitted in them. */
export function conductNow(bundles: ExamSheetBundle[], nowMs: number): { openSittings: number; papersInProgress: number } {
  let openSittings = 0;
  let papersInProgress = 0;
  for (const b of bundles) {
    const open = new Set(b.sittings.filter((s) => isOpen(s, nowMs)).map((s) => s.examId));
    openSittings += open.size;
    papersInProgress += b.attempts.filter((a) => !a.submitted && open.has(a.examId)).length;
  }
  return { openSittings, papersInProgress };
}

/** Submitted papers of exams whose results are not published — the ones marking can still hold back. */
export function unpublishedPaperIds(bundles: ExamSheetBundle[]): number[] {
  return bundles
    .filter((b) => b.status !== 'published')
    .flatMap((b) => b.attempts.filter((a) => a.submitted).map((a) => a.attemptId));
}

export function awaitingMarking(bundles: ExamSheetBundle[], writtenPapers: Set<number>): { papers: number; exams: ExamRef[] } {
  const exams: ExamRef[] = [];
  for (const b of bundles) {
    if (b.status === 'published') continue;
    const count = b.attempts.filter((a) => a.submitted && writtenPapers.has(a.attemptId)).length;
    if (count > 0) exams.push({ examId: b.examId, title: b.title, count });
  }
  return { papers: exams.reduce((n, e) => n + e.count, 0), exams: exams.sort((a, b) => b.count - a.count) };
}

export function readyToPublish(bundles: ExamSheetBundle[]): ExamRef[] {
  return bundles.filter((b) => b.status === 'ready').map((b) => ({ examId: b.examId, title: b.title, count: b.sheet.totals.students }));
}

export interface Participation {
  days: number;
  /** (student, subject) papers expected: allocated students × sittings held. */
  expected: number;
  appeared: number;
  absent: number;
  passed: number;
  failed: number;
}

/** Sittings that opened in the last `days` days and have closed. */
export function participation(bundles: ExamSheetBundle[], nowMs: number, days = 30): Participation {
  const out: Participation = { days, expected: 0, appeared: 0, absent: 0, passed: 0, failed: 0 };
  const since = nowMs - days * DAY_MS;
  for (const b of bundles) {
    const recent = new Set(b.sittings.filter((s) => s.openMs !== null && s.openMs >= since && s.openMs <= nowMs).map((s) => s.examId));
    const closed = closedSittings(b);
    for (const s of b.sheet.students) {
      for (const c of s.sittings) {
        if (!recent.has(c.examId) || !closed.has(c.examId)) continue;
        out.expected += 1;
        if (c.score !== null) out.appeared += 1;
        if (c.status === 'absent') out.absent += 1;
        if (c.status === 'pass') out.passed += 1;
        if (c.status === 'fail') out.failed += 1;
      }
    }
  }
  return out;
}

// ─── Trend ────────────────────────────────────────────────────────────────

export interface TrendRow {
  /** YYYY-MM (IST). */
  month: string;
  created: number;
  held: number;
  published: number;
}

/** Exams created, sittings held (opened) and results published per IST month. */
export function monthlyTrend(
  nowMs: number,
  months: number,
  input: { createdMs: number[]; heldMs: number[]; publishedMs: number[] },
): TrendRow[] {
  const rows = lastMonths(nowMs, months).map((month) => ({ month, created: 0, held: 0, published: 0 }));
  const byMonth = new Map(rows.map((r) => [r.month, r]));
  const add = (list: number[], key: 'created' | 'held' | 'published'): void => {
    for (const ms of list) {
      if (ms > nowMs) continue;
      const row = byMonth.get(istYmd(ms).slice(0, 7));
      if (row) row[key] += 1;
    }
  };
  add(input.createdMs, 'created');
  add(input.heldMs, 'held');
  add(input.publishedMs, 'published');
  return rows;
}

// ─── Recent activity ──────────────────────────────────────────────────────

export type ActivityKind = 'exam_created' | 'exam_published' | 'results_published' | 'reexam_scheduled' | 'questions_added';

export interface ActivityEvent {
  kind: ActivityKind;
  atMs: number;
  actorId: number | null;
  examId: number | null;
  title: string;
  /** Rows folded into this event (re-exams scheduled, questions added); 1 otherwise. */
  count: number;
}

export interface ActivityRow {
  atMs: number;
  actorId: number | null;
  examId: number | null;
  title: string;
}

/**
 * Bulk actions write many rows (a re-exam dialog schedules every ticked
 * student; a CSV upload adds hundreds of questions). One event per person, exam
 * and IST day keeps the feed readable; it carries the latest time and the count.
 */
export function batchByDay(kind: ActivityKind, rows: ActivityRow[]): ActivityEvent[] {
  const groups = new Map<string, ActivityEvent>();
  for (const r of rows) {
    const key = `${r.actorId ?? '-'}|${r.examId ?? '-'}|${istYmd(r.atMs)}`;
    const g = groups.get(key);
    if (g) {
      g.count += 1;
      if (r.atMs > g.atMs) g.atMs = r.atMs;
    } else {
      groups.set(key, { kind, atMs: r.atMs, actorId: r.actorId, examId: r.examId, title: r.title, count: 1 });
    }
  }
  return [...groups.values()];
}

/** Newest first, at most `limit`, never anything dated in the future. */
export function recentActivity(events: ActivityEvent[], nowMs: number, limit: number): ActivityEvent[] {
  return events
    .filter((e) => Number.isFinite(e.atMs) && e.atMs <= nowMs)
    .sort((a, b) => b.atMs - a.atMs)
    .slice(0, limit);
}
