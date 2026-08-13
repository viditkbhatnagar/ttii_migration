import { Award, BarChart3, GraduationCap, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StudentLoader as PageLoader } from '@/student/components/StudentLoader';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asNumber, asString, formatDate } from '../../../admin/shared/utils/admin-data-utils.js';
import type { StudentPageProps } from '../../routing/student-routes.js';

// A single graded assignment, normalised from a backend row.
//
// HONEST-DATA NOTES (verified against assessment-service.ts):
//  - Completed assignments expose `marks` as the combined string "obtained/total"
//    (e.g. "85/100"), NOT a numeric pair, plus `is_reviewed`. Naji UAT
//    2026-08-13 — `is_reviewed` means "an ADMIN has verified the evaluation",
//    not "an instructor typed a number": until then the API holds it at 0 and
//    sends marks as "/100", so nothing on this page — ring, bars, average,
//    letter grade, highest score — can surface an unpublished grade.
//  - Exam rows carry NO obtained-marks field at all (only `total_mark`, the max,
//    and `is_attempted`/`state`). The exam player deliberately never shows a score.
//    So exams cannot be scored and are intentionally EXCLUDED from grades.
//  - Assignment rows have NO subject field, so "subject-wise" charts key off the
//    assignment title — the only honest grouping unit we have. We do not fabricate
//    subjects, ranks, percentiles, or a 4-point GPA.
interface GradedItem {
  id: string;
  title: string;
  obtained: number;
  total: number;
  pct: number;
  grade: string;
  date: string;
}

const RING_CIRCUMFERENCE = 2 * Math.PI * 52; // r=52 in the 120x120 viewBox

// Honest letter-grade derivation from a percentage only.
function letterGrade(pct: number): string {
  if (pct >= 90) return 'A+';
  if (pct >= 85) return 'A';
  if (pct >= 80) return 'A-';
  if (pct >= 75) return 'B+';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  return 'D';
}

// Map a percentage to one of our allowed status tones (no new colors).
function pctTone(pct: number): { bar: string; text: string } {
  if (pct >= 80) return { bar: 'bg-emerald-500', text: 'text-emerald-600' };
  if (pct >= 60) return { bar: 'bg-sky-500', text: 'text-sky-600' };
  if (pct >= 40) return { bar: 'bg-amber-500', text: 'text-amber-600' };
  return { bar: 'bg-red-500', text: 'text-red-600' };
}

// Parse the backend "obtained/total" marks string into two numbers, or null
// when it isn't a usable graded score.
function parseMarks(value: unknown): { obtained: number; total: number } | null {
  const raw = asString(value);
  const slash = raw.indexOf('/');
  if (slash === -1) return null;

  const obtainedPart = raw.slice(0, slash).trim();
  const totalPart = raw.slice(slash + 1).trim();
  if (obtainedPart === '' || totalPart === '') return null;

  const obtained = asNumber(obtainedPart);
  const total = asNumber(totalPart);
  if (total <= 0) return null;
  if (!Number.isFinite(obtained)) return null;

  return { obtained, total };
}

// Build a normalised graded item from a completed-assignment row, or null when
// it hasn't actually been graded yet.
function toGradedItem(row: Record<string, unknown>): GradedItem | null {
  // Only count work whose result the institute has actually published.
  if (asNumber(row.is_reviewed) !== 1) return null;

  const parsed = parseMarks(row.marks);
  if (parsed === null) return null;

  const { obtained, total } = parsed;
  const pct = Math.max(0, Math.min(100, Math.round((obtained / total) * 100)));
  const id = asString(row.id) || `assignment-${asString(row.title)}`;
  const title = asString(row.title) || 'Assignment';
  const date = asString(row.date) || asString(row.formatted_date);

  return { id, title, obtained, total, pct, grade: letterGrade(pct), date };
}

const CARD = 'rounded-2xl border border-slate-200 bg-white shadow-sm';

// Evenly spaced reference gridlines for the bar chart (0–100 scale).
const CHART_GRIDLINES = [100, 75, 50, 25, 0] as const;

export default function StudentGradesPage({ api, session }: StudentPageProps) {
  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadAssessments(session.token),
    [api, session.token],
    `student:grades:${session.userId}`,
  );

  if (loading) {
    return <PageLoader label="Loading your grades..." />;
  }

  const header = (
    <header>
      <h1 className="text-2xl font-bold text-student-text">Grades &amp; Performance</h1>
      <p className="mt-1 text-sm text-student-muted">Your academic progress at a glance.</p>
    </header>
  );

  if (error) {
    return (
      <div className="space-y-6">
        {header}
        <div role="alert" className={`${CARD} p-8 text-center`}>
          <p className="text-sm text-red-600">{error}</p>
          <Button variant="outline" className="mt-4" onClick={reload}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Only completed assignments are gradable — exams expose no obtained marks.
  const graded: GradedItem[] = (data?.assignments.completed ?? [])
    .map((row) => toGradedItem(row))
    .filter((item): item is GradedItem => item !== null);

  if (graded.length === 0) {
    return (
      <div className="space-y-6">
        {header}
        <div role="status" aria-live="polite" className={`${CARD} p-12 text-center`}>
          <Award aria-hidden="true" className="mx-auto mb-4 size-12 text-slate-300" />
          <p className="text-sm font-medium text-student-text">No graded work yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-student-muted">
            Your scores will appear here once your submitted assignments have been graded.
          </p>
        </div>
      </div>
    );
  }

  const averagePct = Math.round(
    graded.reduce((sum, item) => sum + item.pct, 0) / graded.length,
  );
  const averageGrade = letterGrade(averagePct);
  const averageTone = pctTone(averagePct);
  const highest = graded.reduce((best, item) => (item.pct > best ? item.pct : best), 0);
  const dashOffset = RING_CIRCUMFERENCE * (1 - averagePct / 100);

  return (
    <div className="space-y-6">
      {header}

      {/* Top row: Overall-average ring + Subject-wise Scores bar chart */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        {/* Overall Average ring (left) */}
        <section className={`${CARD} p-6 lg:col-span-2`} aria-labelledby="overall-heading">
          <div className="mb-5 flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-student-primary/10">
              <GraduationCap aria-hidden="true" className="size-4 text-student-primary" />
            </span>
            <h2 id="overall-heading" className="font-bold text-student-text">
              Overall Average
            </h2>
          </div>

          <div className="flex flex-col items-center gap-6">
            <div className="relative size-40 shrink-0">
              <svg
                viewBox="0 0 120 120"
                className="size-full -rotate-90"
                role="img"
                aria-label={`Overall average ${averagePct} percent, grade ${averageGrade}`}
              >
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  className="text-slate-100"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={dashOffset}
                  className="text-student-primary transition-[stroke-dashoffset] duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold leading-none text-student-text">
                  {averagePct}%
                </span>
                <span className="mt-1 text-sm font-semibold text-student-primary">
                  {averageGrade}
                </span>
              </div>
            </div>

            {/*
              Rank / Batch size / Percentile from EduPulse §8 are intentionally
              shown as "—": we have no cohort-ranking data and will not fabricate
              it. They keep the layout faithful without inventing numbers.
            */}
            <dl className="grid w-full grid-cols-3 gap-3">
              <div className="rounded-xl bg-slate-50 p-3 text-center">
                <dt className="text-xs text-student-muted">Rank</dt>
                <dd className="mt-0.5 text-lg font-bold text-slate-400">—</dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-center">
                <dt className="text-xs text-student-muted">Batch</dt>
                <dd className="mt-0.5 text-lg font-bold text-slate-400">—</dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-center">
                <dt className="text-xs text-student-muted">Percentile</dt>
                <dd className="mt-0.5 text-lg font-bold text-slate-400">—</dd>
              </div>
            </dl>
          </div>
        </section>

        {/* Subject-wise Scores bar chart (right) */}
        <section className={`${CARD} p-6 lg:col-span-3`} aria-labelledby="scores-heading">
          <div className="mb-5 flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-student-primary/10">
              <BarChart3 aria-hidden="true" className="size-4 text-student-primary" />
            </span>
            <h2 id="scores-heading" className="font-bold text-student-text">
              Subject-wise Scores
            </h2>
          </div>

          <div className="flex gap-3">
            {/* 0–100 axis labels */}
            <div className="flex flex-col justify-between py-1 text-right text-[11px] font-medium text-student-muted">
              {CHART_GRIDLINES.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </div>

            {/* Plot area: horizontal gridlines + vertical CSS bars */}
            <div className="relative h-56 flex-1">
              <div aria-hidden="true" className="absolute inset-0 flex flex-col justify-between">
                {CHART_GRIDLINES.map((line) => (
                  <span key={line} className="block border-t border-dashed border-slate-100" />
                ))}
              </div>

              <ul className="relative flex h-full items-end gap-2 sm:gap-3">
                {graded.map((item) => (
                  <li
                    key={item.id}
                    className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end"
                  >
                    <span className="mb-1 text-[11px] font-semibold text-student-text">
                      {item.pct}%
                    </span>
                    <div
                      className="w-full max-w-[2.75rem] rounded-t-md bg-student-primary transition-[height] duration-700 group-hover:bg-student-primary/80"
                      style={{ height: `${item.pct}%` }}
                      title={`${item.title}: ${item.obtained}/${item.total} (${item.pct}%)`}
                      role="img"
                      aria-label={`${item.title}: ${item.pct} percent`}
                    />
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* X-axis labels under each bar */}
          <ul className="mt-2 flex gap-2 pl-7 sm:gap-3">
            {graded.map((item) => (
              <li
                key={item.id}
                className="min-w-0 flex-1 truncate text-center text-[11px] text-student-muted"
                title={item.title}
              >
                {item.title}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Subject Breakdown */}
      <section className={`${CARD} p-6`} aria-labelledby="breakdown-heading">
        <h2 id="breakdown-heading" className="mb-4 font-bold text-student-text">
          Subject Breakdown
        </h2>
        <ul className="divide-y divide-slate-100">
          {graded.map((item) => {
            const tone = pctTone(item.pct);
            return (
              <li key={item.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                <span
                  aria-hidden="true"
                  className="flex size-11 shrink-0 items-center justify-center rounded-full bg-student-primary/10 text-sm font-bold text-student-primary"
                >
                  {item.grade}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-student-text">{item.title}</p>
                  <p className="mt-0.5 truncate text-xs text-student-muted">
                    {item.obtained}/{item.total}
                    {item.date ? ` · ${formatDate(item.date)}` : ''}
                  </p>
                  <div
                    className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100"
                    role="presentation"
                  >
                    <div
                      className={`h-full rounded-full ${tone.bar} transition-[width] duration-700`}
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                </div>
                <span className={`w-12 shrink-0 text-right text-sm font-bold ${tone.text}`}>
                  {item.pct}%
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Quick Stats */}
      <section className={`${CARD} p-6`} aria-labelledby="stats-heading">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-student-primary/10">
            <Trophy aria-hidden="true" className="size-4 text-student-primary" />
          </span>
          <h2 id="stats-heading" className="font-bold text-student-text">
            Quick Stats
          </h2>
        </div>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-4">
            <dt className="text-xs text-student-muted">Highest Score</dt>
            <dd className={`mt-1 text-2xl font-bold ${pctTone(highest).text}`}>{highest}%</dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <dt className="text-xs text-student-muted">Items Graded</dt>
            <dd className="mt-1 text-2xl font-bold text-student-text">{graded.length}</dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <dt className="text-xs text-student-muted">Average</dt>
            <dd className={`mt-1 text-2xl font-bold ${averageTone.text}`}>{averagePct}%</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
