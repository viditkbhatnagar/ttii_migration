import { Award, BarChart3, ClipboardList, FileText, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/page-loader';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asNumber, asString, formatDate } from '../../../admin/shared/utils/admin-data-utils.js';
import type { StudentPageProps } from '../../routing/student-routes.js';

// A single graded piece of work, normalised from a backend assessment row.
interface GradedItem {
  id: string;
  title: string;
  subject: string;
  marks: number;
  totalMarks: number;
  pct: number;
  grade: string;
  date: string;
  kind: 'assignment' | 'exam';
}

const RING_CIRCUMFERENCE = 2 * Math.PI * 52; // r=52 in the 120x120 viewBox

// Honest letter-grade derivation from a percentage only. No GPA-out-of-4,
// no rank, no percentile — we have no data for those.
function letterGrade(pct: number): string {
  if (pct >= 90) return 'A+';
  if (pct >= 85) return 'A';
  if (pct >= 80) return 'A-';
  if (pct >= 75) return 'B+';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  return 'D';
}

// Build a normalised graded item from a raw row, or null when it lacks the
// numeric marks needed to score it.
function toGradedItem(
  row: Record<string, unknown>,
  kind: GradedItem['kind'],
): GradedItem | null {
  const totalMarks = asNumber(row.total_marks);
  if (totalMarks <= 0) return null;

  const rawMarks = row.marks;
  // Distinguish "graded with 0" from "never graded" (empty/undefined field).
  if (rawMarks == null || (typeof rawMarks === 'string' && rawMarks.trim() === '')) {
    return null;
  }
  const marks = asNumber(rawMarks);

  const id = asString(row.id) || `${kind}-${asString(row.title)}`;
  const title = asString(row.title) || (kind === 'exam' ? 'Exam' : 'Assignment');
  const subject = asString(row.subject) || asString(row.subject_name);
  const date = asString(row.date) || asString(row.submitted_date) || asString(row.end_date);
  const pct = Math.max(0, Math.min(100, Math.round((marks / totalMarks) * 100)));

  return { id, title, subject, marks, totalMarks, pct, grade: letterGrade(pct), date, kind };
}

// Map a percentage to one of our allowed status tones (no new colors).
function pctTone(pct: number): { bar: string; text: string } {
  if (pct >= 80) return { bar: 'bg-emerald-500', text: 'text-emerald-600' };
  if (pct >= 60) return { bar: 'bg-blue-500', text: 'text-blue-600' };
  if (pct >= 40) return { bar: 'bg-amber-500', text: 'text-amber-600' };
  return { bar: 'bg-red-500', text: 'text-red-600' };
}

const CARD = 'rounded-2xl border border-slate-200 bg-white shadow-sm';

export default function StudentGradesPage({ api, session }: StudentPageProps) {
  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadAssessments(session.token),
    [api, session.token],
  );

  if (loading) {
    return <PageLoader label="Loading your grades..." />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-student-text">Grades &amp; Performance</h1>
        <div role="alert" className={`${CARD} p-8 text-center`}>
          <p className="text-sm text-red-600">{error}</p>
          <Button variant="outline" className="mt-4" onClick={reload}>Retry</Button>
        </div>
      </div>
    );
  }

  const graded: GradedItem[] = [
    ...(data?.assignments.completed ?? []).map((row) => toGradedItem(row, 'assignment')),
    ...(data?.exams.expired ?? []).map((row) => toGradedItem(row, 'exam')),
  ].filter((item): item is GradedItem => item !== null);

  const header = (
    <header>
      <h1 className="text-2xl font-bold text-student-text">Grades &amp; Performance</h1>
      <p className="mt-1 text-sm text-student-muted">Your academic progress at a glance.</p>
    </header>
  );

  if (graded.length === 0) {
    return (
      <div className="space-y-6">
        {header}
        <div role="status" aria-live="polite" className={`${CARD} p-12 text-center`}>
          <Award aria-hidden="true" className="mx-auto mb-4 size-12 text-slate-300" />
          <p className="text-sm text-slate-500">
            No graded work yet — your scores will appear here once assignments/exams are graded.
          </p>
        </div>
      </div>
    );
  }

  const totalPct = graded.reduce((sum, item) => sum + item.pct, 0);
  const averagePct = Math.round(totalPct / graded.length);
  const averageGrade = letterGrade(averagePct);
  const highest = graded.reduce((best, item) => (item.pct > best ? item.pct : best), 0);
  const dashOffset = RING_CIRCUMFERENCE * (1 - averagePct / 100);
  const averageTone = pctTone(averagePct);

  return (
    <div className="space-y-6">
      {header}

      {/* Top row: Overall Average ring + per-item Performance bars */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className={`${CARD} p-6`} aria-labelledby="overall-heading">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-student-primary/10">
              <Award aria-hidden="true" className="size-4 text-student-primary" />
            </span>
            <h2 id="overall-heading" className="font-bold text-student-text">Overall Average</h2>
          </div>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
            <div className="relative size-36 shrink-0">
              <svg
                viewBox="0 0 120 120"
                className="size-full -rotate-90"
                role="img"
                aria-label={`Overall average ${averagePct} percent, grade ${averageGrade}`}
              >
                <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="12" className="text-slate-100" />
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
                <span className="text-3xl font-bold leading-none text-student-text">{averagePct}%</span>
                <span className="mt-1 text-sm font-semibold text-student-primary">{averageGrade}</span>
              </div>
            </div>

            <dl className="grid w-full grid-cols-2 gap-3 sm:flex-1">
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="text-xs text-student-muted">Items graded</dt>
                <dd className="mt-0.5 text-lg font-bold text-student-text">{graded.length}</dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="text-xs text-student-muted">Highest score</dt>
                <dd className={`mt-0.5 text-lg font-bold ${pctTone(highest).text}`}>{highest}%</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className={`${CARD} p-6`} aria-labelledby="performance-heading">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-student-accent/10">
              <BarChart3 aria-hidden="true" className="size-4 text-student-accent" />
            </span>
            <h2 id="performance-heading" className="font-bold text-student-text">Performance</h2>
          </div>

          <ul className="space-y-3">
            {graded.map((item) => {
              const label = item.subject || item.title;
              return (
                <li key={item.id}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                    <span className="truncate font-medium text-student-text">{label}</span>
                    <span className="shrink-0 font-semibold text-student-muted">{item.pct}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100" role="presentation">
                    <div
                      className="h-full rounded-full bg-student-primary transition-[width] duration-700"
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {/* Subject Breakdown */}
      <section className={`${CARD} p-6`} aria-labelledby="breakdown-heading">
        <h2 id="breakdown-heading" className="mb-4 font-bold text-student-text">Subject Breakdown</h2>
        <ul className="divide-y divide-slate-100">
          {graded.map((item) => {
            const Icon = item.kind === 'exam' ? FileText : ClipboardList;
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
                  <div className="flex items-center gap-2">
                    <Icon aria-hidden="true" className="size-3.5 shrink-0 text-student-muted" />
                    <p className="truncate font-medium text-student-text">{item.title}</p>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-student-muted">
                    {item.subject ? `${item.subject} · ` : ''}
                    {item.marks}/{item.totalMarks}
                    {item.date ? ` · ${formatDate(item.date)}` : ''}
                  </p>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100" role="presentation">
                    <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
                <span className={`w-12 shrink-0 text-right text-sm font-bold ${tone.text}`}>{item.pct}%</span>
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
          <h2 id="stats-heading" className="font-bold text-student-text">Quick Stats</h2>
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
            <dt className="text-xs text-student-muted">Average %</dt>
            <dd className={`mt-1 text-2xl font-bold ${averageTone.text}`}>{averagePct}%</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
