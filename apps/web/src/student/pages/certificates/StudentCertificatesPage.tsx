import { Award, BookOpen, Download, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageLoader } from '@/components/ui/page-loader';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asString, asNumber, formatDate } from '../../../admin/shared/utils/admin-data-utils.js';
import type { StudentPageProps } from '../../routing/student-routes.js';

const COURSES_ROUTE = '/student/courses';
const COMPLETE_THRESHOLD = 100;

// A single enrolled course distilled down to the bits the certificates
// view cares about. Courses arrive from loadLearning() as untyped
// Record<string, unknown> (the legacy /course/all_course shape), so we
// coerce defensively with asString / asNumber.
interface CourseSummary {
  id: string;
  title: string;
  progress: number;
  issuedDate: string;
}

function toCourseSummary(course: Record<string, unknown>): CourseSummary {
  return {
    id: asString(course.id),
    // buildCourseData always sends `title`; fall back so a blank title
    // never renders an empty card heading.
    title: asString(course.title) || 'Untitled Course',
    // `progress` is a server-rounded 0–100 int (Math.round of
    // calculateUserProgress); clamp in case of stray data.
    progress: Math.max(0, Math.min(100, asNumber(course.progress))),
    // The course payload carries no per-user completion date, so we read
    // best-effort enrolment/start fields and omit the line when absent.
    // We do NOT invent a date.
    issuedDate:
      asString(course.completion_date) ||
      asString(course.enrollment_date) ||
      asString(course.start_date),
  };
}

// Deterministic, human-readable reference derived from the course id.
// This is a display label only — it is NOT a verified or blockchain-backed
// credential, and we don't claim it is.
function buildReferenceId(courseId: string): string {
  const year = new Date().getFullYear();
  const digits = courseId.replace(/\D/g, '');
  const short = (digits || '0').padStart(4, '0').slice(-4);
  return `TTII-${year}-${short}`;
}

function CertificateCard({
  course,
  onViewCourse,
}: {
  course: CourseSummary;
  onViewCourse: () => void;
}) {
  const reference = buildReferenceId(course.id);
  const issued = course.issuedDate ? formatDate(course.issuedDate) : '';

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Brand gradient banner — our colours only, no purple. */}
      <div className="relative flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-student-primary to-student-accent px-6 py-8 text-center">
        <Badge className="absolute right-3 top-3 border-emerald-200 bg-emerald-100 text-emerald-700">
          Earned
        </Badge>
        <span className="flex size-12 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/30">
          <Award aria-hidden="true" className="size-6 text-white" />
        </span>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/90">
          Certificate of Completion
        </p>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-semibold leading-snug text-student-text">{course.title}</h3>
        {issued ? (
          <p className="mt-1 text-xs text-student-muted">Completed {issued}</p>
        ) : null}
        <p className="mt-2 font-mono text-xs text-slate-400">Ref {reference}</p>

        {/* Actions */}
        <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4">
          {/* No student certificate-PDF endpoint exists yet, so this stays
              disabled rather than wiring a fake download. */}
          <Button
            type="button"
            size="sm"
            disabled
            title="Certificate PDF coming soon"
            aria-disabled="true"
            className="flex-1 rounded-xl bg-student-primary text-white hover:bg-student-primary/90"
          >
            <Download aria-hidden="true" className="size-4" />
            Download PDF
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onViewCourse}
            className="rounded-xl"
          >
            View course
          </Button>
        </div>
      </div>
    </article>
  );
}

function InProgressRow({ course }: { course: CourseSummary }) {
  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-student-primary/10">
          <BookOpen aria-hidden="true" className="size-4 text-student-primary" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-student-text">{course.title}</p>
          <p className="text-xs text-student-muted">
            Complete this course to earn your certificate
          </p>
        </div>
        <span className="shrink-0 text-sm font-semibold text-student-text">
          {course.progress}%
        </span>
      </div>
      <div
        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuenow={course.progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${course.title} progress`}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-student-primary to-student-accent transition-[width]"
          style={{ width: `${course.progress}%` }}
        />
      </div>
    </li>
  );
}

export default function StudentCertificatesPage({ api, session, onNavigate }: StudentPageProps) {
  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadLearning(session.token),
    [api, session.token],
  );

  if (loading) {
    return <PageLoader label="Loading your certificates..." />;
  }

  const header = (
    <div>
      <h1 className="text-2xl font-bold text-student-text">Certificates</h1>
      <p className="mt-1 text-sm text-student-muted">Certificates you&apos;ve earned at TTII</p>
    </div>
  );

  if (error) {
    return (
      <div className="space-y-6">
        {header}
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <Button variant="outline" className="mt-4" onClick={reload}>Retry</Button>
        </div>
      </div>
    );
  }

  const courses = (data?.courses ?? []).map(toCourseSummary);
  // Treat any 100%-complete course as an earned certificate.
  const earned = courses.filter((c) => c.progress >= COMPLETE_THRESHOLD);
  const inProgress = courses.filter((c) => c.progress > 0 && c.progress < COMPLETE_THRESHOLD);
  const goToCourses = () => onNavigate(COURSES_ROUTE);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        {header}
        <Button variant="outline" size="sm" onClick={reload} className="rounded-xl">Refresh</Button>
      </div>

      {courses.length === 0 ? (
        <div role="status" aria-live="polite" className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <GraduationCap aria-hidden="true" className="mx-auto mb-4 size-12 text-slate-300" />
          <p className="text-sm text-slate-500">
            No certificates yet — complete a course to earn your first certificate.
          </p>
        </div>
      ) : (
        <>
          {earned.length > 0 ? (
            <section aria-labelledby="earned-heading" className="space-y-4">
              <div className="flex items-center gap-2">
                <h2 id="earned-heading" className="text-sm font-semibold uppercase tracking-wide text-student-muted">
                  Earned
                </h2>
                <Badge className="border-emerald-200 bg-emerald-100 text-emerald-700">{earned.length}</Badge>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {earned.map((course) => (
                  <CertificateCard key={course.id} course={course} onViewCourse={goToCourses} />
                ))}
              </div>
            </section>
          ) : (
            <div role="status" className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <GraduationCap aria-hidden="true" className="mx-auto mb-3 size-10 text-slate-300" />
              <p className="text-sm text-slate-500">
                No certificates yet — complete a course to earn your first certificate.
              </p>
            </div>
          )}

          {inProgress.length > 0 ? (
            <section aria-labelledby="in-progress-heading" className="space-y-4">
              <h2 id="in-progress-heading" className="text-sm font-semibold uppercase tracking-wide text-student-muted">
                In progress
              </h2>
              <ul className="space-y-3">
                {inProgress.map((course) => (
                  <InProgressRow key={course.id} course={course} />
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
